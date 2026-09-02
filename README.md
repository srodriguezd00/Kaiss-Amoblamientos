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

### Cambiar el número de WhatsApp

Está en dos lugares: la constante `var WA = '...'` del script y los `href` de
`wa.me/...` en el HTML. Buscá y reemplazá `5492645413533`.

## 🚀 Publicar en GitHub Pages

1. Subí los cambios a la rama `main`.
2. **Settings → Pages → Source:** *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. Esperá 1-2 minutos.

> Si más adelante se compra un dominio propio, hay que actualizar la URL en:
> `<link rel="canonical">`, las etiquetas `og:`/`twitter:`, los dos bloques
> JSON-LD, `robots.txt`, `sitemap.xml` y `site.webmanifest`.

## 📞 Contacto del negocio

- **WhatsApp:** [+54 9 264 541-3533](https://wa.me/5492645413533)
- **Instagram:** [@kaiss_amoblamientos](https://www.instagram.com/kaiss_amoblamientos)
- **Facebook:** [Kaiss Amoblamientos](https://www.facebook.com/share/1Bv8Ax2yjY/)
- **Ubicación:** San Juan, Argentina

---

© 2026 Kaiss Amoblamientos. Todos los derechos reservados.
