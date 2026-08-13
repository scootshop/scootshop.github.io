# -*- coding: utf-8 -*-
"""scripts/qa/carga-no-bloqueante.py — que nadie vuelva a bloquear el primer pintado.

Un `<script src>` sin `defer` ni `async` detiene al parser, y con él al primer pintado,
hasta que el fichero se descarga Y se ejecuta. En las fichas eso costaba 1,5 segundos
(FCP 4 832 → 2 032 ms al ponerles `defer`), y es de esas cosas que se deshacen solas:
se copia una ficha para crear otra, o se añade un script nuevo "como los de al lado".

Comprueba dos cosas:
  1. Ninguna página carga bloqueando uno de los scripts pesados (`data/products.js`,
     `js/product-enhancements.js`, `js/pago.js`).
  2. En las fichas, el orden de los tres `defer` sigue siendo
     products → product-enhancements → global-assets. No es cosmético: con `defer` el
     orden de ejecución ES el orden del documento, y ese es el orden que tenían cuando
     los dos primeros eran síncronos.

    python scripts/qa/carga-no-bloqueante.py        imprime CARGA_OK o CARGA_KO
"""
import io
import os
import re
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OMITIR = ('scripts', 'node_modules', '.git', 'fonts', '__pycache__')

PESADOS = ('/data/products.js', '/js/product-enhancements.js', '/js/pago.js')
ORDEN_FICHA = ['/data/products.js', '/js/product-enhancements.js', '/js/global-assets.js']

ETIQUETA = re.compile(r'<script\b[^>]*\bsrc="([^"?]+)[^"]*"([^>]*)>')


def paginas():
    for dp, dn, fn in os.walk(RAIZ):
        dn[:] = [d for d in dn if d not in OMITIR]
        for f in fn:
            if f.endswith('.html'):
                yield os.path.join(dp, f)


def main():
    fallos = []
    fichas = 0
    for ruta in paginas():
        rel = os.path.relpath(ruta, RAIZ).replace(os.sep, '/')
        s = io.open(ruta, encoding='utf-8', errors='replace').read()
        etiquetas = [(m.group(1), m.group(2)) for m in ETIQUETA.finditer(s)]

        for src, atributos in etiquetas:
            if src in PESADOS and 'defer' not in atributos and 'async' not in atributos:
                fallos.append('%s carga %s bloqueando el pintado (le falta defer)' % (rel, src))

        presentes = [src for src, _ in etiquetas if src in ORDEN_FICHA]
        if len(presentes) == 3:
            fichas += 1
            if presentes != ORDEN_FICHA:
                fallos.append('%s tiene los scripts en otro orden: %s' % (rel, ' → '.join(presentes)))

    print('fichas comprobadas: %d' % fichas)
    if fallos:
        for f in fallos:
            print('  ✘ ' + f)
        print('\nCARGA_KO (%d)' % len(fallos))
        return 1
    print('\nCARGA_OK — nadie bloquea el primer pintado')
    return 0


if __name__ == '__main__':
    sys.exit(main())
