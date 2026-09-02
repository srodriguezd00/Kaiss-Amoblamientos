#!/usr/bin/env python3
"""Cambia la URL del sitio en todos los archivos que la tienen escrita.

La URL aparece en seis lugares (canonical, etiquetas og:/twitter:, los dos
bloques JSON-LD, robots.txt, sitemap.xml y site.webmanifest). Como el sitio
es HTML estatico sin build, no se puede usar una variable: los rastreadores
leen esas etiquetas del HTML tal cual, antes de ejecutar JavaScript. Este
script hace el reemplazo de una sola pasada para que no quede ninguno viejo.

Uso:
    python scripts/set-dominio.py https://kaissamoblamientos.com.ar
    python scripts/set-dominio.py https://kaissamoblamientos.com.ar --dry-run

Despues de cambiar a un dominio propio, acordate de:
  - crear un archivo CNAME en la raiz con el dominio (sin https://)
  - configurarlo en Settings -> Pages -> Custom domain
  - reenviar el sitemap en Google Search Console
"""

import datetime
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ARCHIVOS = ["index.html", "robots.txt", "sitemap.xml", "site.webmanifest", "README.md"]

# Cualquier URL que apunte al sitio, con o sin barra final.
PATRON = re.compile(r"https://[a-z0-9.-]+\.(?:github\.io|com\.ar|com|ar)(?:/Kaiss-Amoblamientos)?/?", re.I)


def normalizar(url):
    return url.rstrip("/")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv

    if len(args) != 1:
        print(__doc__)
        return 1

    nueva = normalizar(args[0])
    if not nueva.startswith("https://"):
        print("La URL tiene que empezar con https://")
        return 1

    # No tocar los enlaces a redes sociales ni a wa.me.
    externos = ("instagram.com", "facebook.com", "wa.me", "whatsapp.com",
                "schema.org", "fonts.googleapis.com", "fonts.gstatic.com",
                "sitemaps.org", "w3.org")

    total = 0
    for nombre in ARCHIVOS:
        ruta = RAIZ / nombre
        if not ruta.exists():
            print("  (falta %s, se omite)" % nombre)
            continue

        texto = ruta.read_text(encoding="utf-8")

        cambios = [0]

        def reemplazo(m):
            if any(e in m.group(0) for e in externos):
                return m.group(0)
            barra = "/" if m.group(0).endswith("/") else ""
            resultado = nueva + barra
            if resultado != m.group(0):
                cambios[0] += 1
            return resultado

        nuevo = PATRON.sub(reemplazo, texto)
        if cambios[0]:
            total += cambios[0]
            print("  %-18s %d reemplazo(s)" % (nombre, cambios[0]))
            if not dry:
                ruta.write_text(nuevo, encoding="utf-8")

    # site.webmanifest guarda rutas, no URLs: con dominio propio cuelgan de la raiz.
    manifest = RAIZ / "site.webmanifest"
    if manifest.exists():
        base = "/" if "github.io" not in nueva else "/Kaiss-Amoblamientos/"
        m = manifest.read_text(encoding="utf-8")
        nuevo_m = re.sub(r'("(?:start_url|scope)":\s*)"[^"]*"', r'\g<1>"%s"' % base, m)
        if nuevo_m != m:
            total += 2
            print("  %-18s start_url y scope -> %s" % ("site.webmanifest", base))
            if not dry:
                manifest.write_text(nuevo_m, encoding="utf-8")

    # El sitemap lleva la fecha de la ultima modificacion.
    sitemap = RAIZ / "sitemap.xml"
    if sitemap.exists() and not dry:
        hoy = datetime.date.today().isoformat()
        s = sitemap.read_text(encoding="utf-8")
        s = re.sub(r"<lastmod>[^<]*</lastmod>", "<lastmod>%s</lastmod>" % hoy, s)
        sitemap.write_text(s, encoding="utf-8")
        print("  sitemap.xml        lastmod -> %s" % hoy)

    print("\n%s%d reemplazo(s) en total -> %s" % ("[dry-run] " if dry else "", total, nueva))

    if not dry and "github.io" not in nueva:
        cname = RAIZ / "CNAME"
        dominio = nueva.replace("https://", "").replace("http://", "")
        cname.write_text(dominio + "\n", encoding="utf-8")
        print("CNAME creado con: %s" % dominio)
        print("Falta: Settings -> Pages -> Custom domain, y reenviar el sitemap.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
