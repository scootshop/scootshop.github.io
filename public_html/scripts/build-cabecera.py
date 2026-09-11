# -*- coding: utf-8 -*-
u"""LA CABECERA, HORNEADA EN EL HTML DE CADA PAGINA.

91 de las 105 paginas traian `<div id="site-header-slot"></div>` VACIO y lo rellenaba
JavaScript tras pedir `/partials/site-header`. Medido contra produccion con la red a
900 kbps y 150 ms de latencia:

    primera visita a una ficha .......... la cabecera NO aparece en 4,5 s
    segunda visita (cache de sesion) .... 946 ms

O sea: quien entra por primera vez a un producto se queda sin menu durante segundos,
y al navegar de una pagina a otra la barra desaparece y vuelve. Este script mete el
parcial DENTRO del hueco, asi que la cabecera existe en el primer fotograma.

Por que esto SI compensa y hornear la parrilla de la portada NO (ver CLAUDE.md):
aquella eran 84 KB y 44 subarboles que le disputaban el ancho de banda a la foto de
portada, que es el LCP. Esta son 3,5 KB de marcado que ya se estaba pidiendo igual
—como una peticion aparte y mas tarde—, y ademas ahorra esa peticion.

EL PARCIAL SIGUE SIENDO LA UNICA FUENTE. Aqui no se escribe cabecera ninguna: se
copia `partials/site-header.html` tal cual. Cambiar la cabecera es cambiar el parcial
y volver a correr esto; `--check` falla si alguna pagina se quedo atras.

    python scripts/build-cabecera.py
    python scripts/build-cabecera.py --check
"""
import io
import os
import re
import sys
import glob

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARCIAL = os.path.join(RAIZ, 'partials', 'site-header.html')

# El hueco tiene DOS formas: vacio (como nacio la pagina) y ya horneado.
#
# El horneado se busca por su MARCA DE CIERRE y no por `</div>`, porque la cabecera
# lleva cinco `</div>` dentro: con una expresion no-avara el hueco se "cerraba" en el
# primero y --check daba por desfasadas las 91 paginas que se acababan de escribir.
MARCA = '<!-- /site-header-slot -->'
VACIO = re.compile(r'<div id="site-header-slot"\s*></div>')
HORNEADO = re.compile(r'<div id="site-header-slot"[^>]*>.*?' + re.escape(MARCA), re.S)
# Y una tercera, de rescate: horneado por una version de este script que aun no ponia
# la marca. Se cierra en `</header></div>`, que es inequivoco porque dentro del hueco
# solo hay UNA <header>.
SIN_MARCA = re.compile(r'<div id="site-header-slot"[^>]*>\s*<!--.*?</header>\s*</div>', re.S)


def hueco(texto):
    return HORNEADO.search(texto) or SIN_MARCA.search(texto) or VACIO.search(texto)


def paginas():
    for ruta in sorted(glob.glob(os.path.join(RAIZ, '**', '*.html'), recursive=True)):
        rel = os.path.relpath(ruta, RAIZ).replace('\\', '/')
        if rel.startswith(('node_modules/', 'scripts/', 'partials/')):
            continue
        yield ruta, rel


def main():
    comprobar = '--check' in sys.argv

    cabecera = io.open(PARCIAL, encoding='utf-8-sig').read().strip()
    if '<header' not in cabecera:
        raise SystemExit('el parcial no contiene una <header>: ' + PARCIAL)

    # `data-horneado` es la señal para el runtime: el hueco ya viene pintado desde el
    # servidor, asi que no hay que pedir el parcial ni repintarlo, solo hidratarlo.
    esperado = ('<div id="site-header-slot" data-horneado="1">\n'
                + cabecera + '\n      </div>\n  ' + MARCA)

    tocadas, desfasadas, raras = [], [], []

    for ruta, rel in paginas():
        s = io.open(ruta, encoding='utf-8', newline='').read()
        m = hueco(s)
        if not m:
            if 'site-header-slot' in s:
                raras.append(rel + ' (el hueco tiene otra forma)')
            continue
        if m.group(0) == esperado:
            continue
        if comprobar:
            desfasadas.append(rel)
            continue
        io.open(ruta, 'w', encoding='utf-8', newline='').write(
            s[:m.start()] + esperado + s[m.end():])
        tocadas.append(rel)

    for x in raras:
        print('  OJO  ' + x)

    if comprobar:
        if desfasadas:
            print('CABECERA_KO  %d paginas con la cabecera desfasada:' % len(desfasadas))
            for x in desfasadas[:10]:
                print('   ' + x)
            if len(desfasadas) > 10:
                print('   ... y %d mas' % (len(desfasadas) - 10))
            print('  arreglalo con: python scripts/build-cabecera.py')
            return 1
        print('CABECERA_OK  todas las paginas con hueco traen la cabecera al dia')
        return 0

    print('cabecera horneada en %d paginas (%d bytes cada una)' % (len(tocadas), len(cabecera)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
