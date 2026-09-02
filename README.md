# Kaiss Amoblamientos

Sitio web oficial de **Kaiss Amoblamientos** — diseño y fabricación de muebles a medida en MDF, en San Juan, Argentina.

🌐 **Sitio en vivo:** https://srodriguezd00.github.io/Kaiss-Amoblamientos/

---

## 🛠️ Tecnologías

- HTML5 semántico, una sola página, sin build ni dependencias
- CSS3 puro (variables CSS, grid, `clamp()`), mobile-first
- JavaScript vanilla (IntersectionObserver, sin librerías)
- Imágenes WebP con `srcset` + miniaturas
- Datos estructurados JSON-LD (`FurnitureStore` + `FAQPage`)

## 📁 Estructura

```
index.html            Toda la página (HTML + CSS + JS en un archivo)
favicon.ico
robots.txt            Permite indexar + apunta al sitemap
sitemap.xml           Sitemap para Google Search Console
site.webmanifest      Manifiesto PWA (icono al agregar a pantalla de inicio)
.nojekyll             Evita que GitHub Pages procese el sitio con Jekyll
img/                  Fotos y videos originales (1200 px de ancho)
img/thumbs/           Miniaturas a 600 px, las que se cargan en la grilla
```

## 📱 Secciones

| Sección | Descripción |
|---|---|
| **Hero** | Titular, doble CTA (presupuesto / trabajos) y foto destacada |
| **Barra de confianza** | Presupuesto sin cargo, financiación, materiales, instalación |
| **Servicios** | 6 rubros: cocinas, placards, dormitorio, escritorios, comercial, vanitories |
| **Trabajos** | 6 álbumes con visor de fotos y videos (teclado, swipe, CTA a WhatsApp) |
| **Proceso** | 5 pasos: visita técnica → 3D → presupuesto → fabricación → instalación |
| **Nosotros** | Historia y diferenciales |
| **Preguntas** | FAQ desplegable, marcada con `FAQPage` para Google |
| **Presupuesto** | Formulario que arma el mensaje y abre WhatsApp (sin backend) |
| **Contacto** | WhatsApp, Instagram y Facebook |

## ✏️ Cómo editar

### Agregar fotos a un álbum

1. Copiá la foto en `img/` (WebP, 1200 px de ancho).
2. Generá la miniatura con el **mismo nombre** en `img/thumbs/` (600 px de ancho).
3. Agregá una entrada al objeto `albumes`, cerca del final de `index.html`:

   ```js
   { src: 'IMG_1234.webp', alt: 'Descripción real de lo que se ve en la foto' }
   ```

   El texto `alt` importa: lo lee Google y los lectores de pantalla. Describí el
   mueble, el material y el ambiente, no pongas solo "mueble".

Para generar miniaturas en lote (requiere Python + Pillow):

```bash
python -c "
from PIL import Image; import glob, os
os.makedirs('img/thumbs', exist_ok=True)
for f in glob.glob('img/*.webp'):
    im = Image.open(f).convert('RGB'); w, h = im.size
    im.resize((600, round(h*600/w)), Image.LANCZOS).save(
        'img/thumbs/' + os.path.basename(f), 'WEBP', quality=78, method=6)
"
```

### Activar los testimonios

En `index.html` hay una sección de testimonios **comentada**, lista para usar.
Descomentala y reemplazá los datos por reseñas reales de clientes. No la
publiques con textos inventados: además de engañar al visitante, Google
penaliza el marcado de reseñas falsas.

### Comprimir un video nuevo

Los videos de celular vienen a ~3,5 MB por cada 9 segundos y con una pista de
audio que el sitio nunca reproduce (van en `muted`). Antes de subir uno:

```bash
pip install imageio-ffmpeg
FF=$(python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

# comprimir: quita el audio, ~80 % menos de peso, sin diferencia visible
"$FF" -i img/VID_XXXX.mp4 -an -c:v libx264 -crf 28 -preset slow \
      -profile:v main -pix_fmt yuv420p -movflags +faststart img/VID_XXXX_web.mp4

# sacar el poster (la imagen que se ve antes de darle play), del segundo 4
"$FF" -ss 4 -i img/VID_XXXX_web.mp4 -frames:v 1 poster.png
```

Después convertí `poster.png` a WebP (full + miniatura, igual que las fotos) y
referencialo en el álbum con `poster: 'nombre.webp'`.

`-movflags +faststart` es importante: mueve el índice del archivo al principio
para que el video empiece a reproducirse antes de terminar de descargarse.

### Cambiar el dominio

La URL del sitio está escrita en seis lugares (canonical, etiquetas `og:`/
`twitter:`, los dos bloques JSON-LD, `robots.txt`, `sitemap.xml` y
`site.webmanifest`). No puede ser una variable: los rastreadores leen esas
etiquetas del HTML tal cual, antes de ejecutar JavaScript. Para cambiarlas
todas de una vez:

```bash
python scripts/set-dominio.py https://kaissamoblamientos.com.ar --dry-run  # ver qué cambiaría
python scripts/set-dominio.py https://kaissamoblamientos.com.ar            # aplicarlo
```

El script crea el archivo `CNAME` y ajusta `start_url`/`scope` del manifiesto.
Después hay que configurarlo en **Settings → Pages → Custom domain** y reenviar
el sitemap en Search Console.

### Activar la analítica

Los eventos **ya están cableados**, pero no hay proveedor instalado: mientras
no lo haya, `track()` no envía nada a ningún lado (verificado: la página solo
contacta a Google Fonts).

Para activarla, descomentá una línea en el bloque `ANALITICA` del `<head>`.
Las dos opciones son sin cookies, así que no hace falta cartel de
consentimiento:

| Proveedor | Costo | Eventos con nombre |
|---|---|---|
| **Umami** (recomendado) | Plan gratuito | Sí |
| Plausible | ~10 USD/mes | Sí |

> Ojo: Cloudflare Web Analytics es gratis y sin cookies, pero **solo cuenta
> visitas**, no eventos. No serviría para saber qué CTA convierte.

Eventos que se registran:

| Evento | Datos |
|---|---|
| `cta_hero_presupuesto` · `cta_hero_trabajos` · `cta_menu_presupuesto` | — |
| `cta_contacto_whatsapp` · `cta_contacto_instagram` | — |
| `cta_social_whatsapp` · `cta_social_instagram` · `cta_social_facebook` | — |
| `cta_flotante_whatsapp` | — |
| `album_abierto` | qué álbum |
| `cta_visor_whatsapp` | desde qué álbum |
| `formulario_enviado` | tipo de mueble y plazo |

Con eso vas a poder responder dos preguntas: **qué CTA trae más consultas** y
**qué mueble piden más**. Para agregar un CTA nuevo alcanza con ponerle
`data-evento="nombre"` en el HTML; el listener ya lo recoge solo.

### Cambiar el número de WhatsApp

Está en dos lugares: la constante `var WA = '...'` del script y los `href` de
`wa.me/...` en el HTML. Buscá y reemplazá `5492645413533`.

## 🚀 Publicar en GitHub Pages

1. Subí los cambios a la rama `main`.
2. **Settings → Pages → Source:** *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. Esperá 1-2 minutos.

> Si más adelante se compra un dominio propio, no cambies las URLs a mano:
> usá `python scripts/set-dominio.py` (ver «Cambiar el dominio» más arriba).

## ✅ Pendientes del lado del negocio

Cosas que no dependen del código, en orden de impacto:

- [ ] **Perfil de Google Business.** Lo que más mueve la aguja en un negocio
      local: el mapa con tres fichas aparece *arriba* de todos los resultados
      web. Es gratis; pide verificación por correo postal, así que conviene
      empezarlo cuanto antes.
- [ ] **Testimonios reales.** La sección está escrita y comentada en
      `index.html`. Hacen falta tres o cuatro frases de clientes, con nombre y
      barrio. No la publiques con textos inventados.
- [ ] **Dirección y horarios** en el JSON-LD (`streetAddress` y
      `openingHoursSpecification`). Hoy declara solo ciudad y provincia.
- [ ] **Google Search Console:** verificar el sitio y enviar `sitemap.xml`.
- [ ] **Dos o tres fotos horizontales** con luz de día. Las 21 actuales son
      verticales de celular y obligan a recortar fuerte en el hero y en la
      imagen que se ve al compartir el link.
- [ ] **Analítica:** crear la cuenta (Umami tiene plan gratuito) y descomentar
      una línea en el `<head>`. El código ya está listo, ver «Activar la
      analítica» más arriba.

## 📞 Contacto del negocio

- **WhatsApp:** [+54 9 264 541-3533](https://wa.me/5492645413533)
- **Instagram:** [@kaiss_amoblamientos](https://www.instagram.com/kaiss_amoblamientos)
- **Facebook:** [Kaiss Amoblamientos](https://www.facebook.com/share/1Bv8Ax2yjY/)
- **Ubicación:** San Juan, Argentina

---

© 2026 Kaiss Amoblamientos. Todos los derechos reservados.
