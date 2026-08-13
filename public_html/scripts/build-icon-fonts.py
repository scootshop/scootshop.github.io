# -*- coding: utf-8 -*-
"""scripts/build-icon-fonts.py — recorta las fuentes de iconos a lo que se usa.

EL PROBLEMA
`css/icons.css` ya era un subconjunto del CSS de Font Awesome, pero las FUENTES
seguían viniendo de cdnjs: 153 KB (solid) + 114 KB (brands) = 267 KB desde un tercer
origen, con su DNS y su TLS aparte. Medido en móvil con red lenta, esas dos peticiones
terminaban a los 7,7 y 7,9 segundos.

LO QUE HACE
Lee los glifos que icons.css declara de verdad (`content: "\\f015"`), descarga las
fuentes originales y las recorta a esos glifos con fonttools. El resultado se guarda
en `fonts/` y pesa un puñado de kilobytes en vez de 267.

    python scripts/build-icon-fonts.py            genera fonts/*.woff2
    python scripts/build-icon-fonts.py --check    falla si icons.css usa un glifo
                                                  que no está en la fuente recortada

El --check es el guardián: añadir un icono nuevo al CSS y olvidarse de regenerar
dejaría un hueco en blanco en la interfaz, que es exactamente lo que ya pasó una vez
con la flecha de volver del menú móvil.
"""
import io
import os
import re
import subprocess
import sys
import urllib.request

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CSS = os.path.join(RAIZ, 'css', 'icons.css')
DESTINO = os.path.join(RAIZ, 'fonts')

# Se prueban varios espejos: cdnjs cortaba la conexión desde aquí.
ORIGEN = {
    'fa-solid-900': [
        'https://use.fontawesome.com/releases/v6.5.0/webfonts/fa-solid-900.woff2',
        'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/webfonts/fa-solid-900.woff2',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/fa-solid-900.woff2',
    ],
    'fa-brands-400': [
        'https://use.fontawesome.com/releases/v6.5.0/webfonts/fa-brands-400.woff2',
        'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/webfonts/fa-brands-400.woff2',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/fa-brands-400.woff2',
    ],
}


def glifos_por_familia():
    """Los codepoints que declara icons.css, separados en solid y brands.
    La marca la da el bloque de comentario `=== Brand icons ===`."""
    texto = io.open(CSS, encoding='utf-8').read()
    corte = texto.lower().find('brand icons')
    if corte == -1:
        corte = len(texto)
    solid = set(re.findall(r'content:\s*"\\([0-9a-fA-F]{3,5})"', texto[:corte]))
    brands = set(re.findall(r'content:\s*"\\([0-9a-fA-F]{3,5})"', texto[corte:]))
    return {'fa-solid-900': solid, 'fa-brands-400': brands}


def descargar(urls, ruta):
    ultimo = None
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 scootshop-build'})
            datos = urllib.request.urlopen(req, timeout=60).read()
            if len(datos) < 1000:
                raise IOError('respuesta demasiado pequeña')
            io.open(ruta, 'wb').write(datos)
            return len(datos)
        except Exception as e:
            ultimo = '%s -> %s' % (url.split('/')[2], str(e)[:50])
    raise IOError('no se pudo descargar la fuente (' + str(ultimo) + ')')


def main():
    comprobar = '--check' in sys.argv
    familias = glifos_por_familia()
    os.makedirs(DESTINO, exist_ok=True)
    total_antes = 0
    total_despues = 0
    fallos = []

    for nombre, codes in familias.items():
        destino = os.path.join(DESTINO, nombre + '.woff2')
        if not codes:
            print('%-16s sin glifos declarados en icons.css' % nombre)
            continue

        if comprobar:
            if not os.path.isfile(destino):
                fallos.append(nombre + ': no está generada')
                continue
            try:
                from fontTools.ttLib import TTFont
                fuente = TTFont(destino)
                tiene = set()
                for tabla in fuente['cmap'].tables:
                    tiene |= set(tabla.cmap.keys())
                faltan = [c for c in codes if int(c, 16) not in tiene]
                print('%-16s %d glifos en el CSS · %d en la fuente · faltan %d'
                      % (nombre, len(codes), len(tiene), len(faltan)))
                if faltan:
                    fallos.append(nombre + ': faltan ' + ', '.join(sorted(faltan)))
            except Exception as e:
                fallos.append(nombre + ': no se pudo leer (' + str(e)[:60] + ')')
            continue

        original = os.path.join(DESTINO, nombre + '.original.woff2')
        tam = descargar(ORIGEN[nombre], original)
        total_antes += tam

        unicodes = ','.join('U+' + c.upper() for c in sorted(codes))
        subprocess.run([sys.executable, '-m', 'fontTools.subset', original,
                        '--unicodes=' + unicodes,
                        '--flavor=woff2',
                        '--layout-features=',
                        '--no-hinting',
                        '--desubroutinize',
                        '--output-file=' + destino], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        nuevo = os.path.getsize(destino)
        total_despues += nuevo
        os.remove(original)
        print('%-16s %d glifos · %d KB -> %d KB' % (nombre, len(codes), tam // 1024, nuevo // 1024))

    if comprobar:
        if fallos:
            for f in fallos:
                print('  ERROR: ' + f)
            print('ICONOS_KO — regenera con: python scripts/build-icon-fonts.py')
            return 1
        print('ICONOS_OK')
        return 0

    print('total: %d KB -> %d KB' % (total_antes // 1024, total_despues // 1024))
    print('ICONOS_OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
