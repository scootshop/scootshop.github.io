# -*- coding: utf-8 -*-
"""scripts/build-web-fonts.py — sirve las fuentes de texto desde el propio dominio.

EL PROBLEMA
Cada página abría DOS orígenes más antes de poder pintar con su tipografía:
`fonts.googleapis.com` para la hoja de estilos y `fonts.gstatic.com` para los ficheros,
cada uno con su DNS y su TLS. Medido en la ficha del M41 Armored (móvil, red lenta):
la hoja tardaba 225→434 ms y los ficheros no arrancaban hasta los 528 ms — todo ello
por delante del momento en que el texto puede verse con la fuente real.

LO QUE HACE
Descarga los MISMOS ficheros .woff2 que sirve Google y reescribe sus `@font-face`
apuntando a `/fonts/`. Nada de recortar ni de sustituir por una fuente parecida: son
los mismos bytes, con los mismos `unicode-range`, así que el texto se pinta idéntico.

    python scripts/build-web-fonts.py           descarga y genera css/fuentes*.css
    python scripts/build-web-fonts.py --check   falla si falta algún fichero

CADA PÁGINA DECLARA LOS PESOS QUE DECLARA HOY
Por el sitio hay seis combinaciones distintas de pesos (las fichas piden 400;700;800,
`pago.html` pide 500;800, …). Puede parecer un descuido que unificar arreglaría, pero
unificar CAMBIA EL DISEÑO: si una página no declara el 500, el navegador pinta ese
texto con el 400; declararlo lo pintaría de verdad a 500, más grueso. Así que se
genera una hoja por combinación y cada página conserva la suya. Unificarlas es una
decisión de diseño, y entonces basta con dejar un solo conjunto en `CONJUNTOS`.

El fichero de Plus Jakarta Sans es una fuente VARIABLE: un mismo .woff2 sirve a todos
los pesos declarados, por eso ocho ficheros bastan para las seis combinaciones.
"""
import io
import json
import os
import re
import sys
import urllib.request

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DESTINO_FUENTES = os.path.join(RAIZ, 'fonts')
DESTINO_CSS = os.path.join(RAIZ, 'css')
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/126.0.0.0 Safari/537.36')

# Nombre de la hoja generada -> consulta tal cual la pide el HTML de hoy.
CONJUNTOS = {
    'fuentes': 'family=Russo+One&family=Tangerine:wght@700&family=Plus+Jakarta+Sans:wght@400;700;800&display=swap',
    'fuentes-500-800': 'family=Russo+One&family=Tangerine:wght@700&family=Plus+Jakarta+Sans:wght@500;800&display=swap',
    'fuentes-jakarta-500-700-800': 'family=Plus+Jakarta+Sans:wght@500;700;800&display=swap',
    'fuentes-500-700-800': 'family=Russo+One&family=Tangerine:wght@700&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap',
    'fuentes-400-500-700-800': 'family=Russo+One&family=Tangerine:wght@700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap',
    'fuentes-400-600-700-800': 'family=Russo+One&family=Tangerine:wght@700&family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap',
}

BLOQUE = re.compile(r'/\*\s*([a-z0-9\-\[\]]+)\s*\*/\s*(@font-face\s*\{.*?\})', re.S)
URL_WOFF = re.compile(r'url\((https://[^)]+\.woff2)\)')
FAMILIA = re.compile(r"font-family:\s*'([^']+)'")


def pedir(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, timeout=60).read()


def nombre_local(familia, subconjunto):
    """El .woff2 se identifica por familia y subconjunto: el peso NO entra porque el
    de Plus Jakarta Sans es variable y el mismo fichero sirve a todos los pesos."""
    return '%s-%s.woff2' % (familia.lower().replace(' ', '-'), subconjunto.replace('[', '').replace(']', ''))


def main():
    comprobar = '--check' in sys.argv
    os.makedirs(DESTINO_FUENTES, exist_ok=True)

    hojas = {}
    if comprobar:
        # Comprobar no debe depender de la red: se leen las hojas ya generadas.
        for slug in CONJUNTOS:
            ruta = os.path.join(DESTINO_CSS, slug + '.css')
            if not os.path.exists(ruta):
                print('FALTA la hoja css/%s.css' % slug)
                return 1
            hojas[slug] = io.open(ruta, encoding='utf-8').read()
        faltan = []
        for slug, css in hojas.items():
            for ref in re.findall(r'url\(/fonts/([^)]+)\)', css):
                if not os.path.exists(os.path.join(DESTINO_FUENTES, ref)):
                    faltan.append(ref)
        if faltan:
            print('FALTAN ficheros de fuente: ' + ', '.join(sorted(set(faltan))))
            return 1
        print('WEB_FONTS_OK — %d hojas, todas con sus .woff2' % len(hojas))
        return 0

    descargados = {}
    for slug, consulta in CONJUNTOS.items():
        css = pedir('https://fonts.googleapis.com/css2?' + consulta).decode('utf-8')
        bloques = []
        for subconjunto, bloque in BLOQUE.findall(css):
            familia = FAMILIA.search(bloque).group(1)
            remoto = URL_WOFF.search(bloque).group(1)
            local = nombre_local(familia, subconjunto)
            if remoto not in descargados:
                ruta = os.path.join(DESTINO_FUENTES, local)
                datos = pedir(remoto)
                io.open(ruta, 'wb').write(datos)
                descargados[remoto] = (local, len(datos))
            bloques.append('/* %s */\n%s' % (subconjunto, URL_WOFF.sub('url(/fonts/%s)' % local, bloque)))

        cabecera = (
            '/* GENERADO por scripts/build-web-fonts.py — no editar a mano.\n'
            '   Mismos .woff2 que sirve Google, servidos desde este dominio.\n'
            '   Conjunto de pesos: %s */\n\n' % consulta.replace('&display=swap', ''))
        io.open(os.path.join(DESTINO_CSS, slug + '.css'), 'w', encoding='utf-8', newline='').write(
            cabecera + '\n\n'.join(bloques) + '\n')

    print('hojas generadas: %d' % len(CONJUNTOS))
    total = 0
    for remoto, (local, tam) in sorted(descargados.items(), key=lambda x: x[1][0]):
        total += tam
        print('   %-40s %6.1f KB' % (local, tam / 1024.0))
    print('   %-40s %6.1f KB' % ('TOTAL', total / 1024.0))
    return 0


if __name__ == '__main__':
    sys.exit(main())
