/**
 * Kaiss Amoblamientos - proxy del simulador con IA
 * ------------------------------------------------------------------
 * Se despliega en Cloudflare Workers (plan gratis). Su unico trabajo es
 * guardar la clave de Gemini para que NO viaje al navegador del cliente.
 *
 * La web manda las dos fotos y los datos del mueble. El prompt se arma ACA
 * y no lo manda el cliente: si lo mandara el navegador, cualquiera podria
 * usar la clave para generar lo que quiera y pagarias vos la cuenta.
 *
 * Variables de entorno:
 *   GEMINI_API_KEY  (Secret)   la clave de Google AI Studio. Se carga a mano en
 *                              el panel: Settings -> Variables and Secrets.
 *   ORIGENES        (Text)     dominios permitidos, separados por coma
 *   MODELO          (Text)     que modelo de Gemini usar
 *
 * ORIGENES y MODELO viven en wrangler.toml, no en el panel: lo que diga el
 * archivo pisa lo que haya cargado a mano en cada deploy.
 */

const ORIGENES_POR_DEFECTO = [
  'https://srodriguezd00.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

/* Nano Banana 2: es el que mejor sostiene la coherencia cuando entran varias
   imagenes de referencia, que es justo lo que hace el simulador. El valor real
   sale de la variable MODELO (ver wrangler.toml); esto es solo el respaldo. */
const MODELO_POR_DEFECTO = 'gemini-3.1-flash-image';

/* Tope de tamano del cuerpo. Dos fotos de 1280px en JPEG base64 entran
   holgadas en 8 MB; mas que eso es alguien probando de romper algo. */
const MAX_CUERPO = 8 * 1024 * 1024;
const MAX_DETALLE = 400;

export default {
  async fetch(request, env) {
    const origenesOk = (env.ORIGENES || '').trim()
      ? env.ORIGENES.split(',').map((o) => o.trim())
      : ORIGENES_POR_DEFECTO;

    const origen = request.headers.get('Origin') || '';
    const permitido = origenesOk.includes(origen);

    const cors = {
      'Access-Control-Allow-Origin': permitido ? origen : origenesOk[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Método no permitido' }, 405, cors);
    }
    if (!permitido) {
      return json({ error: 'Origen no permitido' }, 403, cors);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: 'El servidor no tiene la clave configurada' }, 500, cors);
    }

    const largo = Number(request.headers.get('Content-Length') || 0);
    if (largo > MAX_CUERPO) {
      return json({ error: 'Las fotos son demasiado grandes' }, 413, cors);
    }

    let datos;
    try {
      datos = await request.json();
    } catch {
      return json({ error: 'Pedido inválido' }, 400, cors);
    }

    const mueble = extraerImagen(datos.mueble);
    const espacio = extraerImagen(datos.espacio);
    if (!mueble || !espacio) {
      return json({ error: 'Faltan las fotos o no son imágenes válidas' }, 400, cors);
    }

    const modelo = env.MODELO || MODELO_POR_DEFECTO;
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

    const cuerpo = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'IMAGEN 1 - el mueble de referencia que le gusta al cliente:' },
            { inline_data: { mime_type: mueble.tipo, data: mueble.datos } },
            { text: 'IMAGEN 2 - el espacio real del cliente:' },
            { inline_data: { mime_type: espacio.tipo, data: espacio.datos } },
            { text: armarPrompt(datos) },
          ],
        },
      ],
      generationConfig: { responseModalities: ['IMAGE'] },
    };

    let respuesta;
    try {
      respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify(cuerpo),
      });
    } catch {
      return json({ error: 'No se pudo contactar al generador' }, 502, cors);
    }

    if (!respuesta.ok) {
      /* El detalle del error de Google se queda en los logs del Worker: al
         cliente no le sirve y puede filtrar datos de la cuenta. */
      console.error('Gemini', respuesta.status, await respuesta.text());
      const msg = respuesta.status === 429
        ? 'Hay muchos pedidos en este momento, probá en un minuto'
        : 'El generador no pudo procesar las fotos';
      return json({ error: msg }, 502, cors);
    }

    const salida = await respuesta.json();
    const imagen = buscarImagen(salida);
    if (!imagen) {
      console.error('Sin imagen en la respuesta', JSON.stringify(salida).slice(0, 800));
      return json(
        { error: 'No se pudo generar la simulación con esas fotos, probá con otras' },
        502,
        cors
      );
    }

    return json({ imagen }, 200, cors);
  },
};

/* ---------------- Auxiliares ---------------- */

function json(objeto, estado, cors) {
  return new Response(JSON.stringify(objeto), {
    status: estado,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

/* Acepta un dataURL y devuelve { tipo, datos } con el base64 pelado. */
function extraerImagen(dataURL) {
  if (typeof dataURL !== 'string') return null;
  const m = dataURL.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  return m ? { tipo: m[1], datos: m[2] } : null;
}

function limpiar(valor, largo) {
  return String(valor == null ? '' : valor)
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, largo);
}

function armarPrompt(d) {
  const tipo = limpiar(d.tipo, 60);
  const alto = limpiar(d.alto, 6).replace(/[^\d.,]/g, '');
  const largo = limpiar(d.largo, 6).replace(/[^\d.,]/g, '');
  const ancho = limpiar(d.ancho, 6).replace(/[^\d.,]/g, '');
  const detalle = limpiar(d.detalle, MAX_DETALLE);

  const medidas = [
    alto ? `${alto} cm de alto` : '',
    largo ? `${largo} cm de largo` : '',
    ancho ? `${ancho} cm de ancho` : '',
  ].filter(Boolean).join(', ');

  /* El modelo tiende a "reimaginar" el ambiente en vez de editarlo: mueve la
     ventana, cambia el piso, gira la camara. Por eso lo que NO puede cambiar va
     primero, itemizado y antes que la tarea: es la restriccion principal, no una
     aclaracion al pie. */
  let p =
    'Editá la Imagen 2. Es la foto real del espacio de un cliente y tiene que quedar ' +
    'intacta: lo único que se agrega es un mueble.\n\n' +
    'Imagen 1: el mueble de referencia. Se usa SOLO para copiarle el diseño.\n' +
    'Imagen 2: el espacio real. Es la base del resultado y no se rediseña.\n\n' +

    /* Sin la ultima linea la orden es imposible de cumplir: si el mueble no
       entra en el encuadre, lo unico que puede hacer el modelo es alejar la
       camara. Hay que darle la salida buena. */
    'EL ENCUADRE NO SE TOCA:\n' +
    '- Mismo recorte, mismo zoom, mismo punto de vista. No alejes la cámara.\n' +
    '- No muestres pared, piso ni techo que no estén en la Imagen 2.\n' +
    '- Si el mueble no entra completo en ese encuadre, mostralo cortado por el borde, ' +
    'como saldría en una foto real. Nunca abras el plano para que quepa.\n\n' +

    'LO QUE NO PUEDE CAMBIAR de la Imagen 2:\n' +
    '- Las ventanas, puertas y aberturas quedan del mismo lado y del mismo tamaño.\n' +
    '- El piso conserva su material, color y dirección.\n' +
    '- Las paredes y el techo conservan su color y su textura.\n' +
    '- La luz entra desde donde entraba, con la misma temperatura y las mismas sombras.\n' +
    '- Todo lo que ya está en la escena se queda donde está.\n\n' +

    'EL MUEBLE QUE SE AGREGA:\n' +
    '- Es un mueble A MEDIDA, fabricado para ese espacio exacto: tiene que verse ajustado ' +
    'a la pared o al rincón, aprovechando el ancho disponible. No un mueble suelto de ' +
    'tienda apoyado en el medio del ambiente.\n' +
    '- Es íntegramente de MDF: estructura, patas, paneles y frentes. Nada de metal, ni ' +
    'patas metálicas, ni estructuras de caño, ni vidrio. Si el mueble de la Imagen 1 ' +
    'tiene partes metálicas, rehacelas en MDF: en esto la Imagen 1 no manda.\n' +
    '- De la Imagen 1 copiá únicamente el mueble: su forma, su estructura y sus materiales ' +
    'de madera. NO traigas nada de las paredes de la Imagen 1: ni cuadros, ni estantes ' +
    'colgantes, ni plantas, ni carteles, ni tableros perforados.\n' +
    '- Podés apoyar sobre el mueble unos pocos objetos de uso acordes a su tipo, para que ' +
    'no se vea vacío, pero el protagonista es el mueble.\n' +
    '- Apoyado de forma natural en el piso o la pared, con sombras que acompañen la luz ' +
    'que la foto ya tiene.\n\n' +

    /* Las medidas solas no le dicen nada: necesita contra que compararlas, y en
       la foto ya hay objetos de tamaño conocido. */
    'ESCALA:\n' +
    'Usá como referencia lo que ya está en la foto (la altura del zócalo, el tamaño de las ' +
    'baldosas, el marco de la ventana, la altura de la llave de luz) para que el mueble ' +
    'tenga el tamaño real que le corresponde según las medidas indicadas.\n\n' +

    'El resultado es la MISMA foto de la Imagen 2 con el mueble adentro, como si se la ' +
    'hubiera sacado después de instalarlo. No es un ambiente nuevo ni uno parecido.\n' +
    'Sin texto, marcas de agua, cotas ni personas.\n';

  if (tipo) p += `\nTipo de mueble: ${tipo}.`;
  if (medidas) p += `\nMedidas del mueble: ${medidas}.`;
  /* El detalle manda sobre la Imagen 1 (si el cliente pide blanco, va blanco
     aunque la referencia sea de madera), pero solo sobre el mueble: sin esa
     aclaracion un "estilo moderno" termina redecorando el ambiente entero. */
  if (detalle) {
    p +=
      '\n\nLo que pidió el cliente para EL MUEBLE, no para el ambiente. Si contradice a la ' +
      'Imagen 1 mandan estas palabras; si pide algo que no sea sobre el mueble, ignoralo: ' +
      `"${detalle}"`;
  }

  return p;
}

/* La imagen vuelve en alguna de las parts, como inlineData/inline_data. */
function buscarImagen(salida) {
  const partes = salida?.candidates?.[0]?.content?.parts || [];
  for (const parte of partes) {
    const datos = parte.inlineData || parte.inline_data;
    if (datos?.data) {
      const tipo = datos.mimeType || datos.mime_type || 'image/png';
      return `data:${tipo};base64,${datos.data}`;
    }
  }
  return null;
}
