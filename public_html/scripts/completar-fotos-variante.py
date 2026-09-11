# -*- coding: utf-8 -*-
"""scripts/completar-fotos-variante.py — la medida pequeña de CADA foto de color.

`SCOOTSHOP_miniatura()` (data/products.js) pide la medida de 400 allí donde la foto
se ve pequeña: el cajón del carrito, la caja de accesorios compatibles y los
resúmenes de checkout y pago. Y lo hace por REGLA DE NOMBRE —`8.webp` ->
`8-400.webp`—, porque desde el navegador no se puede preguntar al disco.

Las portadas siempre la tienen (las genera el alta del producto). Las fotos de
COLOR no: son fotos sueltas de la galería, y en cuanto una variante llega al
carrito con su foto, la miniatura apuntaba a un fichero que no existe. Medido: 82
fotos de variante sin medida pequeña, y el carrito enseñaba el hueco roto en el
manillar dorado y en los cubre cables amarillos.

    python scripts/completar-fotos-variante.py            genera las que falten
    python scripts/completar-fotos-variante.py --check    falla si falta alguna

400 px y calidad 82: las mismas que ya tienen las portadas (comprobado sobre
`1-400.webp`, 400x400).
"""
import io
import json
import os
import re
import subprocess
import sys

try:
    from PIL import Image
except ImportError:
    print('hace falta Pillow:  pip install Pillow')
    sys.exit(1)

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
# Las CUATRO medidas que declara el `srcset` de la tarjeta, no solo la pequeña:
# con una sola, el navegador pide igualmente `-600`, `-800` y `-1000` y se lleva
# tres 404 por tarjeta. Son las mismas que ya tienen las portadas.
ANCHOS = (400, 600, 800, 1000)
CALIDAD = 82


def fotos_de_variante():
    """Toda foto que una opción de variante puede seleccionar.

    Se le pregunta al propio catálogo con node, que es quien sabe leer sus ejes;
    replicar aquí el formato sería tener dos lectores del mismo dato.
    OJO: `images` va en BASE 1 — `[12]` es la doceava foto de la galería.
    """
    guion = (
        "global.window={}; require('./data/products.js');"
        "var P=window.SCOOTSHOP_PRODUCTS||[], out=[];"
        "for (var i=0;i<P.length;i++){var p=P[i];"
        "  var g=(p.gallery||[]).map(function(x){return x.src||x;});"
        "  var ejes=p.attributes||[];"
        "  for (var e=0;e<ejes.length;e++){var op=ejes[e].options||[];"
        "    for (var o=0;o<op.length;o++){var s=op[o].photo;"
        "      if(!s && op[o].images && op[o].images.length) s=g[op[o].images[0]-1];"
        "      if(s) out.push(s);}}}"
        "console.log(JSON.stringify(out));"
    )
    salida = subprocess.check_output(['node', '-e', guion], cwd=RAIZ)
    return sorted(set(json.loads(salida.decode('utf-8'))))


def main():
    comprobar = '--check' in sys.argv
    faltan = []
    hechas = 0
    ya = 0

    for ruta in fotos_de_variante():
        if not ruta.lower().endswith('.webp'):
            continue
        if re.search(r'-\d{3,4}\.webp$', ruta):
            continue                                  # ya es una medida
        origen = os.path.join(RAIZ, ruta.lstrip('/').replace('/', os.sep))
        if not os.path.exists(origen):
            faltan.append('no existe el original ' + ruta)
            continue
        base = None
        for ancho in ANCHOS:
            destino = re.sub(r'\.webp$', '-%d.webp' % ancho, origen)
            if os.path.exists(destino):
                ya += 1
                continue
            if comprobar:
                faltan.append('falta ' + re.sub(r'\.webp$', '-%d.webp' % ancho, ruta))
                continue
            if base is None:
                base = Image.open(origen).convert('RGB')
            im = base
            if base.width > ancho:
                im = base.resize((ancho, round(base.height * ancho / float(base.width))),
                                 Image.LANCZOS)
            im.save(destino, 'WEBP', quality=CALIDAD, method=6)
            hechas += 1

    print('   medidas de variante: %d ya estaban, %d generadas' % (ya, hechas))
    if faltan:
        for f in faltan[:20]:
            print(' KO ' + f)
        if len(faltan) > 20:
            print(' KO ... y %d mas' % (len(faltan) - 20))
        print(' generalas con: python scripts/completar-fotos-variante.py')
        print('FOTOS_VAR_MINI_KO')
        return 1
    print('FOTOS_VAR_MINI_OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
