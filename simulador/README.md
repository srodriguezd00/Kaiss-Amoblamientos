# Simulador con IA — cómo ponerlo en marcha

El simulador necesita una clave de la API de Gemini. Esa clave **no puede ir en
`index.html`**: cualquiera abre el código fuente de la página, la copia y te gasta
el saldo. Por eso hay este proxy: la clave vive acá y la web nunca la ve.

Mientras no hagas estos pasos, el bloque del simulador **no se muestra** y el
formulario sigue funcionando igual que siempre. No rompe nada.

---

## 1. Sacar la clave de Gemini (2 min)

1. Entrá a <https://aistudio.google.com/apikey>
2. **Create API key** → elegí el proyecto de Google Cloud donde tenés la facturación.
3. Copiá la clave. No la pegues en ningún archivo del repo.

## 2. Crear el Worker en Cloudflare (5 min)

1. Creá una cuenta gratis en <https://dash.cloudflare.com/sign-up>
2. En el panel: **Compute (Workers)** → **Create** → **Start from Hello World** → **Deploy**.
3. Entrá al Worker → **Edit code**, borrá todo y pegá el contenido de
   [`worker.js`](worker.js). **Deploy**.
4. Andá a **Settings → Variables and Secrets** y agregá:

   | Nombre           | Tipo   | Valor                                            |
   |------------------|--------|--------------------------------------------------|
   | `GEMINI_API_KEY` | Secret | la clave del paso 1                              |
   | `ORIGENES`       | Text   | `https://srodriguezd00.github.io`                |
   | `MODELO`         | Text   | `gemini-2.5-flash-image` *(opcional)*            |

   > Si más adelante ponés un dominio propio, agregalo a `ORIGENES` separado por coma.
   > `GEMINI_API_KEY` tiene que ser **Secret**, no Text.

5. Copiá la URL del Worker. Queda algo como
   `https://kaiss-simulador.TU-USUARIO.workers.dev`

## 3. Conectar la web

En `index.html`, buscá esta línea (está en el bloque `SIMULADOR CON IA`):

```js
var SIM_API = '';   /* <-- pegar aca la URL del Worker cuando este desplegado */
```

Pegá la URL del Worker entre las comillas:

```js
var SIM_API = 'https://kaiss-simulador.TU-USUARIO.workers.dev';
```

Listo. El bloque del simulador aparece solo.

---

## Costo

Cada simulación es **una** llamada a Gemini: alrededor de **USD 0,04**.
Cien simulaciones por mes ≈ USD 4. Cloudflare Workers en plan gratis aguanta
100.000 pedidos por día, así que por ahí no pagás nada.

## Cuidados

- **Ojo con `ORIGENES`.** Es lo único que impide que otro sitio use tu Worker
  (y tu saldo). Si lo dejás vacío o con `*`, cualquiera puede llamarlo.
- **Poné un límite de gasto** en Google Cloud → Billing → Budgets & alerts, para
  dormir tranquilo.
- El prompt se arma dentro del Worker a propósito: el navegador solo manda las
  fotos y las medidas. Así nadie puede usar tu clave para generar otra cosa.

## Si algo falla

Cloudflare → tu Worker → **Logs** → **Begin log stream**, y probá el simulador.
Ahí se ve el error real que devuelve Google.

| Síntoma                            | Causa habitual                                        |
|------------------------------------|-------------------------------------------------------|
| «Origen no permitido»              | Falta el dominio en `ORIGENES`                        |
| «El servidor no tiene la clave»    | `GEMINI_API_KEY` mal escrito o cargado como Text      |
| «El generador no pudo procesar…»   | Mirá los logs: suele ser la clave sin facturación     |
| «Hay muchos pedidos…»              | Límite de cuota de Google, esperá un minuto           |
| No se generó nada, pero sin error  | Verificá el nombre del modelo en `MODELO`             |
