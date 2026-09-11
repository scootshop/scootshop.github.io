# -*- coding: utf-8 -*-
"""scripts/optimiza-imagenes-fijas.py — el peso de las imagenes que NO son de producto.

Las fotos de producto viven en la carpeta de cada producto y las cuida
`convert-to-webp.py` + las variantes responsive. Este script es para las OTRAS: las
texturas de fondo y las fotos de las tarjetas de categoria, que no las mira nadie
porque no se dan de alta con un producto y por eso engordan sin que se note.

    python scripts/optimiza-imagenes-fijas.py            reescribe las que se pasan
    python scripts/optimiza-imagenes-fijas.py --check    falla si alguna se pasa

Cada entrada declara DE DONDE sale (el original en alta, cuando existe), a que
tamaño se sirve y con que calidad. El presupuesto no es un numero elegido a ojo:
es lo que da esa combinacion, medido, mas un margen del 8 % para que un reencode
distinto no haga saltar el guardian.
"""
import io
import os
import sys

try:
    from PIL import Image
except ImportError:
    print('hace falta Pillow:  pip install Pillow')
    sys.exit(1)

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# El fondo sobre el que se pinta el grafiti. Tiene que ser EXACTAMENTE el de
# `.home-featured` en css/index.css: de eso depende que quitarle el alfa no se
# note (ver la nota de abajo).
FONDO_OFERTA = (28, 28, 28)

TRABAJOS = [
    # --- Las texturas de la oferta de la semana -------------------------------
    # Pesaban 234 KB entre las dos, para una decoracion que se pinta al 17 % de
    # opacidad. Y no cedian recomprimiendo (7 % a lo sumo) porque lo que pesa en
    # ellas es el CANAL ALFA, no el dibujo.
    #
    # La salida es PRECOMPONERLAS sobre el color de la seccion y guardarlas sin
    # alfa. Se ve igual, y esto es aritmetica, no un apaño: el navegador pinta
    # `0,17*imagen + 0,83*fondo`; donde la imagen era transparente el resultado ya
    # era el fondo, y una imagen opaca de ese mismo color da exactamente lo mismo.
    # Donde habia tinta, la tinta precompuesta sobre el fondo es el mismo color que
    # componia el navegador. Sin alfa, el WebP baja un 85 %.
    #
    # LA CONDICION: si algun dia cambia el fondo de `.home-featured`, hay que
    # cambiar FONDO_OFERTA y regenerar, o apareceran dos rectangulos.
    {
        'destino': 'img/deco/grafiti-izquierda.webp',
        'origen': 'img/deco/grafiti-izquierda.webp',
        'aplanar': FONDO_OFERTA,
        'ancho': 358,
        'calidad': 72,
        'presupuesto': 17 * 1024,
        'porque': 'textura al 17 % sobre #1c1c1c; sin alfa',
    },
    {
        'destino': 'img/deco/grafiti-derecha.webp',
        'origen': 'img/deco/grafiti-derecha.webp',
        'aplanar': FONDO_OFERTA,
        'ancho': 581,
        'calidad': 72,
        'presupuesto': 26 * 1024,
        'porque': 'textura al 17 % sobre #1c1c1c; sin alfa',
    },

    # --- Las tres tarjetas de categoria ---------------------------------------
    # Se ven a 421x360 en escritorio y a ~343 de ancho en el movil. Estaban a
    # 860x750 —el doble justo del escritorio— y pesaban 262 KB entre las tres.
    # A 700 de ancho siguen siendo 2x en el movil (343*2 = 686), que es donde
    # mas duele el peso, y 1,66x en escritorio: de sobra para una foto oscura que
    # ademas lleva un velo encima.
    # Se rehacen desde el WebP que ya hay y NO desde el PNG original, aunque
    # recomprimir lo ya comprimido sea peor tecnicamente. El motivo: el original
    # es 1448x1086 (4:3) y el WebP de 860x750 (~7:6) es un RECORTE suyo, hecho a
    # mano y con un encuadre que nadie apunto. Partir del PNG cambia el encuadre
    # de las tres tarjetas — probado, y se nota. A esta escala la segunda pasada
    # de compresion no deja nada visible.
    {
        'destino': 'img/categorias/patinetes.webp',
        'origen': 'img/categorias/patinetes.webp',
        'ancho': 700,
        'calidad': 66,
        'presupuesto': 30 * 1024,
        'porque': 'tarjeta de categoria, 421x360 en pantalla',
    },
    {
        'destino': 'img/categorias/accesorios.webp',
        'origen': 'img/categorias/accesorios.webp',
        'ancho': 700,
        'calidad': 66,
        'presupuesto': 102 * 1024,
        'porque': 'tarjeta de categoria, 421x360 en pantalla',
    },
    {
        'destino': 'img/categorias/repuestos.webp',
        'origen': 'img/categorias/repuestos.webp',
        'ancho': 700,
        'calidad': 66,
        'presupuesto': 64 * 1024,
        'porque': 'tarjeta de categoria, 421x360 en pantalla',
    },

    # --- Los logotipos de marca ------------------------------------------------
    # Se pintan como MUCHO a 240 px de ancho (medido en las placas del riel a
    # 1920, 1440 y 390 px; el de KuKirin, a 132 en la chapa de la ficha). Los
    # ficheros venian a 1000-1561 px: entre cuatro y once veces lo que se ve.
    # A 500 siguen siendo el doble de lo que se pinta, que es lo que necesita una
    # pantalla de doble densidad, y ni uno llega a los 22 KB.
    # Conservan el alfa —son logos recortados sobre la placa— asi que aqui NO se
    # aplana: `generar()` solo convierte a RGB cuando no hay que aplanar, y para
    # estos se pide RGBA explicito.
    {
        'destino': 'img/marcas/ecoxtrem-logo.webp',
        'origen': 'img/marcas/ecoxtrem-logo.webp',
        'alfa': True,
        'ancho': 500,
        'calidad': 80,
        'presupuesto': 24 * 1024,
        'porque': 'placa de marca, 240 px como maximo',
    },
    {
        'destino': 'img/marcas/rovoron-logo.webp',
        'origen': 'img/marcas/rovoron-logo.webp',
        'alfa': True,
        'ancho': 500,
        'calidad': 80,
        'presupuesto': 16 * 1024,
        'porque': 'placa de marca, 240 px como maximo',
    },
    {
        'destino': 'img/marcas/dualtron-logo-v2.webp',
        'origen': 'img/marcas/dualtron-logo-v2.webp',
        'alfa': True,
        'ancho': 500,
        'calidad': 80,
        'presupuesto': 13 * 1024,
        'porque': 'placa de marca, 240 px como maximo',
    },
    {
        'destino': 'img/marcas/kukirin-logo.webp',
        'origen': 'img/marcas/kukirin-logo.webp',
        'alfa': True,
        'ancho': 280,
        'calidad': 84,
        'presupuesto': 23 * 1024,
        'porque': 'chapa de marca de la ficha, 132 px',
    },
]


def generar(t):
    im = Image.open(os.path.join(RAIZ, t['origen']))
    if t.get('aplanar'):
        im = im.convert('RGBA')
        plano = Image.new('RGB', im.size, t['aplanar'])
        plano.paste(im, (0, 0), im)
        im = plano
    elif t.get('alfa'):
        # Un logo recortado: si se pasa a RGB, lo transparente se vuelve negro y
        # la placa aparece con un rectangulo detras.
        im = im.convert('RGBA')
    else:
        im = im.convert('RGB')
    if t['ancho'] != im.width:
        alto = round(im.height * t['ancho'] / float(im.width))
        im = im.resize((t['ancho'], alto), Image.LANCZOS)
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=t['calidad'], method=6)
    return im.size, b.getvalue()


def main():
    comprobar = '--check' in sys.argv
    fallos = []
    antes = despues = 0

    for t in TRABAJOS:
        ruta = os.path.join(RAIZ, t['destino'])
        if not os.path.exists(os.path.join(RAIZ, t['origen'])):
            fallos.append('falta el origen %s' % t['origen'])
            continue

        actual = os.path.getsize(ruta) if os.path.exists(ruta) else 0
        antes += actual

        # IDEMPOTENCIA. Varios trabajos leen del mismo fichero que escriben, asi
        # que ejecutar el script dos veces recomprimiria sobre lo ya comprimido y
        # cada pasada degradaria un poco mas. Si el fichero ya esta hecho —el
        # tamaño que toca, sin alfa cuando toca aplanar— no se vuelve a tocar.
        if os.path.exists(ruta) and t['origen'] == t['destino']:
            hecho = Image.open(ruta)
            plano = 'A' not in hecho.mode
            if hecho.width == t['ancho'] and (plano or not t.get('aplanar')):
                print('   = %-36s %6.1f KB  (ya hecho)' % (t['destino'], actual / 1024.0))
                despues += actual
                continue

        if comprobar:
            # Comprobar mira el PRESUPUESTO, no los bytes exactos: reencodear con
            # otra version de Pillow da un fichero distinto y valido.
            despues += actual
            if actual > t['presupuesto']:
                fallos.append('%s pesa %.1f KB y su presupuesto es %.1f KB'
                              % (t['destino'], actual / 1024.0, t['presupuesto'] / 1024.0))
            print('   %-38s %6.1f KB  (tope %.0f KB)'
                  % (t['destino'], actual / 1024.0, t['presupuesto'] / 1024.0))
            continue

        medida, datos = generar(t)
        if len(datos) > t['presupuesto']:
            fallos.append('%s sale a %.1f KB y su presupuesto es %.1f KB'
                          % (t['destino'], len(datos) / 1024.0, t['presupuesto'] / 1024.0))
        if actual and len(datos) >= actual:
            print('   = %-36s %6.1f KB  (ya estaba mejor; no se toca)'
                  % (t['destino'], actual / 1024.0))
            despues += actual
            continue
        io.open(ruta, 'wb').write(datos)
        despues += len(datos)
        print('   + %-36s %6.1f -> %6.1f KB  %dx%d  %s'
              % (t['destino'], actual / 1024.0, len(datos) / 1024.0,
                 medida[0], medida[1], t['porque']))

    if not comprobar:
        print('   %-38s %6.1f -> %6.1f KB  (-%.0f KB)'
              % ('TOTAL', antes / 1024.0, despues / 1024.0, (antes - despues) / 1024.0))

    if fallos:
        for f in fallos:
            print(' KO ' + f)
        print('IMG_FIJAS_KO')
        return 1
    print('IMG_FIJAS_OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
