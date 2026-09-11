#!/usr/bin/env python3
"""Cierra el alta de un producto a partir de las fotos que haya en su carpeta.

Un producto nuevo se da de alta en dos tiempos: primero se redacta (catalogo,
ficha, sitemap) y despues llegan las fotos. Este script hace el segundo tiempo
sin que haya que tocar nada a mano:

  1. Normaliza lo que haya en <carpeta>/img/ a 1.webp .. N.webp
     (maximo 1400 px de lado mayor, WebP q82; ver la memoria de optimizacion de
     imagenes). Acepta .png/.jpg/.jpeg/.webp y respeta el orden en que se
     subieron: 1,2,10 no se ordena 1,10,2, y la convencion de Windows
     "foto.png, foto (1).png, foto (2).png" sale en ese mismo orden.
  2. Reescribe la galeria del producto en data/products.js.
  3. Reescribe las miniaturas de la ficha y las imagenes del JSON-LD.

Lo que NO hace, a proposito:
  - No versiona ninguna URL de imagen (jamas `?v=`: provoca descarga doble y
    parpadeo; lo vigilan check-image-cache.ps1 y check-image-dupes.js).
  - No genera las medidas responsive de la portada: de eso ya se encarga
    scripts/build-card-shots.py, que lee el catalogo y es idempotente.

Uso:
    python scripts/completar-fotos.py patinetes/rovoron/s7
    python scripts/completar-fotos.py patinetes/rovoron/s7 --dry-run

Despues:
    python scripts/build-card-shots.py
    node scripts/qa/catalogo.js
    node scripts/build-attributes-index.js
"""

import os
import re
import sys
import pathlib

try:
    from PIL import Image
except ImportError:
    sys.exit("Falta Pillow: pip install Pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
LADO_MAX = 1400
CALIDAD = 82
EXTENSIONES = ('.png', '.jpg', '.jpeg', '.webp')


def orden_natural(nombre):
    """El orden en que se suben las fotos, tal cual.

    Dos convenciones, y la segunda es la que rompe un orden ingenuo:

      1.webp, 2.webp, 10.webp        -> 1, 2, 10 (no 1, 10, 2)
      S7.png, S7 (1).png, S7 (2).png -> la base primero y luego (1), (2)...

    Manda el SUFIJO y solo despues el nombre, porque la portada y el resto
    pueden venir de descargas distintas y llamarse de otra forma. Caso real del
    ROVORON S7:

        IMAGEN  1.png                     -> 1   (sin sufijo)
        ChatGPT Image ... (1).png         -> 2
        ChatGPT Image ... (2).png         -> 3   ...

    Ordenando primero por nombre, las "ChatGPT" irian delante de "IMAGEN" y la
    portada acabaria la ultima. Con el sufijo por delante, la que no lo lleva es
    la primera, que es la regla que se pidio.
    """
    m = re.match(r'^(.*?)\s*\((\d+)\)$', pathlib.Path(nombre).stem)
    tallo = m.group(1) if m else pathlib.Path(nombre).stem
    sufijo = int(m.group(2)) if m else 0
    natural = [int(t) if t.isdigit() else t.lower()
               for t in re.split(r'(\d+)', tallo)]
    return (sufijo, natural)


def normalizar_fotos(carpeta, seco):
    """Deja la carpeta con 1.webp .. N.webp y devuelve cuantas hay."""
    img = carpeta / 'img'
    if not img.is_dir():
        sys.exit('No existe %s' % img.relative_to(ROOT).as_posix())

    # Las medidas responsive de la portada (1-400.webp...) no son fotos de galeria.
    fuentes = [f for f in img.iterdir()
               if f.is_file()
               and f.suffix.lower() in EXTENSIONES
               and not re.match(r'^\d+-\d+$', f.stem)]
    if not fuentes:
        sys.exit('No hay fotos en %s' % img.relative_to(ROOT).as_posix())

    fuentes.sort(key=lambda f: orden_natural(f.name))
    print('%d fotos encontradas en %s' % (len(fuentes), img.relative_to(ROOT).as_posix()))

    # A un temporal primero: renombrar in situ pisa ficheros cuando la numeracion
    # de origen y la de destino se solapan (2.webp -> 1.webp con un 1.webp vivo).
    plan = []
    for i, f in enumerate(fuentes, 1):
        plan.append((f, img / ('%d.webp' % i)))

    for origen, destino in plan:
        with Image.open(origen) as im:
            im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
            w, h = im.size
            if max(w, h) > LADO_MAX:
                escala = LADO_MAX / max(w, h)
                im = im.resize((round(w * escala), round(h * escala)), Image.LANCZOS)
            if seco:
                print('  [seco] %-28s -> %-10s %dx%d' % (origen.name, destino.name, *im.size))
                continue
            tmp = img / ('.tmp-%s' % destino.name)
            im.save(tmp, format='WEBP', quality=CALIDAD, method=6)
        if not seco:
            plan_tmp = tmp
            print('  %-28s -> %-10s %6d B' % (origen.name, destino.name, plan_tmp.stat().st_size))

    if seco:
        return len(plan)

    for origen, _ in plan:
        origen.unlink(missing_ok=True)
    for _, destino in plan:
        tmp = destino.parent / ('.tmp-%s' % destino.name)
        tmp.replace(destino)

    return len(plan)


def rutas(carpeta, n):
    base = '/' + carpeta.relative_to(ROOT).as_posix() + '/img'
    return ['%s/%d.webp' % (base, i) for i in range(1, n + 1)]


def parchear_catalogo(href, nombre, urls, seco):
    p = ROOT / 'data' / 'products.js'
    s = p.read_text(encoding='utf-8')
    i = s.find("href: '%s'" % href)
    if i < 0:
        sys.exit('No encuentro href %s en data/products.js' % href)
    m = re.compile(r'gallery: \[\s*\n(?:.*?\n)*?      \]').search(s, i)
    if not m:
        sys.exit('No encuentro la galeria del producto en data/products.js')

    filas = ',\n'.join(
        "        { src: '%s', alt: '%s vista %d' }" % (u, nombre, k)
        for k, u in enumerate(urls, 1))
    nueva = 'gallery: [\n%s\n      ]' % filas
    if seco:
        print('  [seco] data/products.js: galeria de %d fotos' % len(urls))
        return
    p.write_text(s[:m.start()] + nueva + s[m.end():], encoding='utf-8')
    print('  data/products.js: galeria reescrita con %d fotos' % len(urls))


def parchear_ficha(carpeta, nombre, urls, seco):
    p = carpeta / 'index.html'
    if not p.exists():
        sys.exit('No existe %s' % p.relative_to(ROOT).as_posix())
    s = p.read_text(encoding='utf-8')

    # --- miniaturas ---
    m = re.search(r'(<div class="thumbs" aria-label="[^"]*">\n)(.*?)(\n?\s*</div>)', s, re.S)
    if not m:
        sys.exit('No encuentro el bloque de miniaturas en la ficha')
    filas = []
    for k, u in enumerate(urls, 1):
        activa = ' active' if k == 1 else ''
        filas.append(
            '              <button class="thumb%s" data-img="%s" type="button" aria-label="Ver imagen %d">\n'
            '                <img src="%s" alt="%s vista %d" loading="lazy" decoding="async">\n'
            '              </button>' % (activa, u, k, u, nombre, k))
    nuevas = '\n'.join(filas)

    # --- JSON-LD: hasta 4, que es lo que pide Google ---
    m2 = re.search(r'("image":\[\n)((?:\s*"https://[^"]*",?\n)+)(\s*\])', s)
    if not m2:
        sys.exit('No encuentro "image" en el JSON-LD de la ficha')
    sangria = re.match(r'\s*', m2.group(2)).group(0)
    ld = ',\n'.join('%s"https://scootshop.co%s"' % (sangria, u) for u in urls[:4])

    if seco:
        print('  [seco] ficha: %d miniaturas y %d imagenes en JSON-LD' % (len(urls), min(4, len(urls))))
        return
    s = s[:m.start(2)] + nuevas + s[m.end(2):]
    m2 = re.search(r'("image":\[\n)((?:\s*"https://[^"]*",?\n)+)(\s*\])', s)
    s = s[:m2.start(2)] + ld + '\n' + s[m2.end(2):]
    p.write_text(s, encoding='utf-8')
    print('  %s: %d miniaturas, %d imagenes en JSON-LD'
          % (p.relative_to(ROOT).as_posix(), len(urls), min(4, len(urls))))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    seco = '--dry-run' in sys.argv
    if len(args) != 1:
        sys.exit(__doc__)

    carpeta = (ROOT / args[0]).resolve()
    if not carpeta.is_dir():
        sys.exit('No existe la carpeta %s' % args[0])

    href = '/' + carpeta.relative_to(ROOT).as_posix() + '/'
    cat = (ROOT / 'data' / 'products.js').read_text(encoding='utf-8')
    i = cat.find("href: '%s'" % href)
    if i < 0:
        sys.exit('El catalogo no tiene ningun producto con href %s' % href)
    nombre = re.search(r"name: '([^']*)'", cat[max(0, i - 3000):i]).group(1)
    print('Producto: %s  (%s)%s\n' % (nombre, href, '   [SIN ESCRIBIR]' if seco else ''))

    n = normalizar_fotos(carpeta, seco)
    urls = rutas(carpeta, n)
    parchear_catalogo(href, nombre, urls, seco)
    parchear_ficha(carpeta, nombre, urls, seco)

    print('\nAhora:')
    print('  python scripts/build-card-shots.py')
    print('  node scripts/qa/catalogo.js && node scripts/build-attributes-index.js')
    print('  powershell -ExecutionPolicy Bypass -File scripts/qa/check-image-cache.ps1')


if __name__ == '__main__':
    main()
