# -*- coding: utf-8 -*-
"""
Genera las PAGINAS QUE COMPARTEN LA CABECERA DE LA PORTADA:
las tres de categoria (/patinetes, /accesorios, /repuestos) y /preguntas.

Por que un generador y no tres ficheros escritos a mano: la cabecera, el menu
movil, el panel de filtros y el pie son EXACTAMENTE los de la portada. Copiados
a mano, cada arreglo en index.html habria que repetirlo en cuatro sitios y el
cuarto se olvidaria. Aqui se leen de index.html, que sigue siendo el original.

Lo unico propio de cada pagina son sus textos y su clave de categoria; el
catalogo lo pinta el mismo js/index.js de siempre, que se cine a una sola
categoria cuando el root la declara (data-solo-categoria).

    python scripts/build-categorias.py            escribe las paginas
    python scripts/build-categorias.py --check    falla si estan desfasadas
"""
import io
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARCA = 'CATEGORIAS_OK'
NL = chr(10)


def leer(rel):
    return io.open(os.path.join(RAIZ, rel), encoding='utf-8').read()


def entre(texto, desde, hasta, que):
    """El trozo que va de un marcador a otro, los dos incluidos."""
    i = texto.find(desde)
    if i < 0:
        raise SystemExit('no encuentro el principio de %s en index.html' % que)
    j = texto.find(hasta, i + len(desde))
    if j < 0:
        raise SystemExit('no encuentro el final de %s en index.html' % que)
    return texto[i:j + len(hasta)]


# ---------------------------------------------------------------- categorias
CATEGORIAS = [
    {
        'carpeta': 'patinetes',
        'clave': 'electric-scooters',
        'nombre': 'Patinetes eléctricos',
        'h1': 'Patinetes eléctricos',
        'titulo': 'Patinetes eléctricos | SCOOT SHOP',
        'desc': 'Patinetes eléctricos homologados y de gran potencia. Envío 6–8 días, '
                'pago seguro y condiciones claras de entrega, devolución y garantía.',
    },
    {
        'carpeta': 'accesorios',
        'clave': 'accessories',
        'nombre': 'Accesorios',
        'h1': 'Accesorios para patinete eléctrico',
        'titulo': 'Accesorios para patinete eléctrico | SCOOT SHOP',
        'desc': 'Manillares, mandos limitadores, luces, soportes y bolsas para tu patinete '
                'eléctrico. Envío 6–8 días y pago seguro en SCOOT SHOP.',
    },
    {
        'carpeta': 'repuestos',
        'clave': 'spare-parts',
        'nombre': 'Repuestos',
        'h1': 'Repuestos y recambios',
        'titulo': 'Repuestos y recambios para patinete eléctrico | SCOOT SHOP',
        'desc': 'Neumáticos, cámaras y piezas de desgaste para patinete eléctrico. '
                'Envío 6–8 días y pago seguro en SCOOT SHOP.',
    },
]


# ----------------------------------------------------------------- preguntas
# Estaban en la portada, en una seccion de 742 px con ocho filas cerradas: no
# habia nada que leer hasta que alguien pulsaba. Y el schema FAQPage colgaba de
# `scootshop.co/#faq`, o sea de la portada, que es la URL que Google indexa — el
# ancla no. Aqui tienen pagina, titulo y canonical propios.
#
# Se declaran una sola vez y de aqui salen las dos cosas: el HTML visible y el
# JSON-LD. Escribirlas dos veces es garantizar que un dia digan cosas distintas.
PREGUNTAS = [
    ('¿Cuánto tarda el envío?',
     '6–8 días hábiles a toda España.'),
    ('¿Cuál es la garantía?',
     'Aplicamos la garantía legal de conformidad vigente en España para '
     'consumidores, además de soporte posventa por WhatsApp y email.'),
    ('¿Incluye accesorios?',
     'Sí, soporte móvil, candado y cargador según modelo.'),
    ('¿Dónde puedo verlo?',
     'En Silla y Catarroja (Valencia).'),
    ('¿Qué autonomía tienen los patinetes eléctricos?',
     'Depende del modelo, peso del conductor, terreno y modo de conducción; '
     'cada ficha técnica muestra su rango estimado.'),
    ('¿Qué métodos de pago aceptáis?',
     'Pagos online mediante Stripe, además de Bizum y transferencia bancaria.'),
    ('¿Me ayudáis a elegir el modelo ideal?',
     'Sí. Te asesoramos por WhatsApp según tu presupuesto, trayecto diario y '
     'potencia que necesitas.'),
    ('¿Puedo reservar un patinete antes de pagar?',
     'Sí, puedes reservar por WhatsApp y te guiamos paso a paso para cerrar tu '
     'compra.'),
]


# ------------------------------------------------------------------ plantilla
def cabecera_adaptada(html, carpeta=None):
    """El menu de la portada, adaptado a otra pagina.

    Dos cosas: `#inicio` es una seccion de index.html y desde aqui no lleva a
    ningun sitio (el navegador se queda quieto y no pasa nada), asi que apunta a
    la portada; y «Inicio» deja de decir que es la pagina actual, porque no lo es
    — lo dice la categoria en la que estamos.
    """
    cambios = [
        ('<a href="#inicio" aria-current="page">', '<a href="/">'),
        ('<a href="#inicio" aria-label="Ir al inicio">', '<a href="/" aria-label="Ir al inicio">'),
    ]
    if carpeta:
        # Esta pagina ES esta categoria: el menu tiene que decirlo, y no solo de
        # boquilla — `aria-current` es lo que lo anuncia un lector de pantalla.
        # /preguntas no esta en el menu, asi que no marca ninguna.
        cambios.append(('<a href="/%s/">' % carpeta,
                        '<a href="/%s/" aria-current="page">' % carpeta))
    for viejo, nuevo in cambios:
        if viejo not in html:
            raise SystemExit('la cabecera de index.html ya no trae %r' % viejo)
        html = html.replace(viejo, nuevo)
    return html


def componer(cat, piezas, ver, rev_carrito):
    url = 'https://scootshop.co/%s/' % cat['carpeta']
    t = cat['titulo']
    d = cat['desc']

    ld = json.dumps({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'CollectionPage',
                '@id': url + '#webpage',
                'url': url,
                'name': t,
                'description': d,
                'isPartOf': {'@id': 'https://scootshop.co/#website'},
                'inLanguage': 'es-ES',
            },
            {
                '@type': 'BreadcrumbList',
                '@id': url + '#miga',
                'itemListElement': [
                    {'@type': 'ListItem', 'position': 1, 'name': 'Inicio',
                     'item': 'https://scootshop.co/'},
                    {'@type': 'ListItem', 'position': 2, 'name': cat['h1'], 'item': url},
                ],
            },
        ],
    }, ensure_ascii=False, indent=2)

    partes = []
    a = partes.append
    a('<!DOCTYPE html>')
    a('<html lang="es-ES">')
    a('<head>')
    a('  <meta charset="utf-8" />')
    a('  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />')
    a('')
    a('  <title>%s</title>' % t)
    a('  <meta name="description" content="%s" />' % d)
    a('  <meta name="robots" content="index,follow,max-image-preview:large" />')
    a('  <meta name="format-detection" content="telephone=no" />')
    a('  <meta name="theme-color" content="#ffffff" />')
    a('  <meta name="color-scheme" content="only light" />')
    a('')
    a('  <link rel="canonical" href="%s" />' % url)
    a('')
    a('  <meta name="asset-version" content="%s" />' % ver)
    a('')
    a('  <!-- Memoria de scroll: aqui solo lo que hay que decidir antes del primer')
    a('       pintado. Es LITERALMENTE el de la portada (lo copia')
    a('       scripts/build-categorias.py) porque el problema es el mismo: volver')
    a('       atras a una parrilla larga y caer donde tocaba. -->')
    a(piezas['estilo_scroll'])
    a(piezas['script_scroll'])
    a('')
    a(piezas['iconos'])
    a('  <link rel="alternate" href="%s" hreflang="es" />' % url)
    a('  <meta name="apple-mobile-web-app-title" content="SCOOT SHOP" />')
    a('  <meta name="application-name" content="SCOOT SHOP" />')
    a('')
    a('  <meta property="og:url" content="%s" />' % url)
    a('  <meta property="og:title" content="%s" />' % t)
    a('  <meta property="og:description" content="%s" />' % d)
    a('  <meta property="og:type" content="website" />')
    a('  <meta property="og:site_name" content="SCOOT SHOP" />')
    a('  <meta property="og:locale" content="es_ES" />')
    a('  <meta property="og:image" content="https://scootshop.co/img/0-removebg-preview.webp" />')
    a('  <meta property="og:image:width" content="400" />')
    a('  <meta property="og:image:height" content="400" />')
    a('  <meta property="og:image:type" content="image/webp" />')
    a('')
    a('  <meta name="twitter:card" content="summary_large_image" />')
    a('  <meta name="twitter:title" content="%s" />' % t)
    a('  <meta name="twitter:description" content="%s" />' % d)
    a('  <meta name="twitter:image" content="https://scootshop.co/img/0-removebg-preview.webp" />')
    a('')
    a('  <link rel="preload" as="font" type="font/woff2" href="/fonts/plus-jakarta-sans-latin.woff2" crossorigin />')
    a('  <link rel="preload" as="font" type="font/woff2" href="/fonts/russo-one-latin.woff2" crossorigin />')
    a('  <link rel="stylesheet" href="/css/fuentes.css?v=%s" />' % ver)
    a('  <link rel="stylesheet" href="/css/icons.css?v=%s" />' % ver)
    a('  <link rel="stylesheet" href="/css/main.css?v=%s" />' % ver)
    a('  <link rel="stylesheet" href="/css/partials.mobile-menu.css?v=%s" />' % ver)
    a('  <link rel="stylesheet" href="/css/index.css?v=%s" />' % ver)
    a('')
    a('  <!-- El mismo arranque que la portada: index-head.js trae el catalogo, el')
    a('       nucleo de atributos y js/index.js, que es quien pinta las tarjetas. -->')
    a('  <script src="/js/index-head.js?v=%s" defer></script>' % piezas['ver_head'])
    a('  <script src="/js/cart-runtime.js?r=%s&v=%s" defer></script>' % (rev_carrito, ver))
    a('  <script src="/js/scroll-memoria.js?v=%s" defer></script>' % ver)
    a('')
    a('  <script type="application/ld+json">')
    a(ld)
    a('  </script>')
    a('</head>')
    # `data-pagina`: de aqui cuelga el estilo propio de una pagina de categoria.
    # No vale colgarlo de `#comprar[data-solo-categoria]`: eso solo alcanza lo que
    # hay DENTRO del catalogo, y la barra de filtros no siempre entra ahi.
    a('<body data-pagina="categoria">')
    a('  <a href="#main-content" class="skip-link">Saltar al contenido principal</a>')
    a('')
    a(cabecera_adaptada(piezas['header'], cat['carpeta']))
    a('')
    a(piezas['menu'])
    a('')
    a('  <main id="main-content">')
    a('')
    a('    <!-- CABECERA DE CATEGORIA. Es lo que la portada no podia dar: un titular')
    a('         que dice de que va la pagina, una entradilla y una miga de pan. La')
    a('         portada llevaba <title>Patinetes electricos</title> y competia consigo')
    a('         misma para las cinco categorias a la vez. -->')
    a('    <nav class="cat-miga" aria-label="Ruta">')
    a('      <div class="container">')
    a('        <a href="/">Inicio</a>')
    a('        <span class="cat-miga-sep" aria-hidden="true">/</span>')
    a('        <span aria-current="page">%s</span>' % cat['h1'])
    a('      </div>')
    a('    </nav>')
    a('')
    a('    <!-- Un <div>, NO un <header>: en css/main.css el selector de elemento')
    a('         `header{ position:fixed; z-index:80 }` ES la cabecera del sitio, y')
    a('         convierte en barra fija cualquier <header> del documento. Con uno')
    a('         aqui, esta caja se pegaba arriba del todo y tapaba el boton de')
    a('         filtros —medido: el clic no llegaba nunca. -->')
    a('    <div class="cat-cabecera">')
    a('      <div class="container">')
    # El <span> es lo que se inclina: el skew necesita una caja propia, y ponerlo
    # en el <h1> arrastraria tambien su margen y su ancho de bloque.
    a('        <h1 class="cat-cabecera-tit"><span>%s</span></h1>' % cat['h1'])
    a('      </div>')
    a('    </div>')
    a('')
    a(piezas['filtros'])
    a('')
    a('    <div class="home-catalog-zone">')
    a('      <section class="home-catalog-head" aria-label="%s">' % cat['h1'])
    a('        <div class="container">')
    a('          <div class="home-catalog-barra">')
    a('            <!-- OCULTO A LA VISTA, no borrado: el titular lo dice dos dedos')
    a('                 mas arriba y cada placa del riel lleva su recuento, asi que')
    a('                 escrito aqui se repetia. Pero de este elemento sacan el')
    a('                 nombre el panel de filtros ([data-catalogo-nombre]) y el')
    a('                 recuento el catalogo ([data-home-catalog-total]), y un lector')
    a('                 de pantalla sigue oyendo sobre que lista esta. -->')
    a('            <p class="catalogo-quien sr-only">')
    a('              <span data-catalogo-nombre>%s</span>' % cat['nombre'])
    a('              <span class="home-catalog-total" data-home-catalog-total></span>')
    a('            </p>')
    a('')
    a('            <button class="filtros-btn" type="button" data-filtros-abrir')
    a('                    aria-haspopup="dialog" aria-controls="filtrosPanel"')
    a('                    aria-label="Abrir filtros" title="Filtros">')
    a('              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h18l-7 8v7l-4 2v-9L3 4z"/></svg>')
    a('              <span class="filtros-btn-txt">Filtros</span>')
    a('              <span class="filtros-btn-n" data-filtros-activos hidden>0</span>')
    a('            </button>')
    a('          </div>')
    a('        </div>')
    a('      </section>')
    a('')
    a('      <!-- data-solo-categoria: el motor pinta SOLO esta. Sin el atributo')
    a('           (la portada) las pinta todas, como siempre. -->')
    a('      <div id="comprar" data-home-catalog-root data-solo-categoria="%s"></div>' % cat['clave'])
    a('    </div>')
    a('')
    a(piezas['pie'])
    a('  </main>')
    a('</body>')
    a('</html>')
    return NL.join(partes) + NL


def componer_preguntas(piezas, ver):
    """La pagina /preguntas: la cabecera y el pie de la portada, y poco mas.

    NO carga index-head.js ni el catalogo: aqui no hay ni una tarjeta de
    producto. El arranque es el de /checkout —asset-sync + global-assets—, que
    es el camino de una pagina del sitio que no vende nada por si misma pero si
    necesita cabecera, menu movil, carrito y sesion.
    """
    url = 'https://scootshop.co/preguntas/'
    t = 'Preguntas frecuentes | SCOOT SHOP'
    d = ('Envíos, garantía, formas de pago, autonomía y reservas: las dudas más '
         'habituales antes de comprar un patinete eléctrico en SCOOT SHOP.')

    ld = json.dumps({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'FAQPage',
                '@id': url + '#faq',
                'url': url,
                'name': t,
                'description': d,
                'isPartOf': {'@id': 'https://scootshop.co/#website'},
                'inLanguage': 'es-ES',
                'mainEntity': [
                    {'@type': 'Question', 'name': q,
                     'acceptedAnswer': {'@type': 'Answer', 'text': r}}
                    for q, r in PREGUNTAS
                ],
            },
            {
                '@type': 'BreadcrumbList',
                '@id': url + '#miga',
                'itemListElement': [
                    {'@type': 'ListItem', 'position': 1, 'name': 'Inicio',
                     'item': 'https://scootshop.co/'},
                    {'@type': 'ListItem', 'position': 2,
                     'name': 'Preguntas frecuentes', 'item': url},
                ],
            },
        ],
    }, ensure_ascii=False, indent=2)

    partes = []
    a = partes.append
    a('<!DOCTYPE html>')
    a('<html lang="es-ES">')
    a('<head>')
    a('  <meta charset="utf-8" />')
    a('  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />')
    a('')
    a('  <title>%s</title>' % t)
    a('  <meta name="description" content="%s" />' % d)
    a('  <meta name="robots" content="index,follow,max-image-preview:large" />')
    a('  <meta name="theme-color" content="#ffffff" />')
    a('  <meta name="color-scheme" content="only light" />')
    a('')
    a('  <link rel="canonical" href="%s" />' % url)
    a('  <link rel="alternate" href="%s" hreflang="es" />' % url)
    a('')
    a('  <meta name="asset-version" content="%s" />' % ver)
    a('')
    a(piezas['iconos'])
    a('  <meta name="apple-mobile-web-app-title" content="SCOOT SHOP" />')
    a('  <meta name="application-name" content="SCOOT SHOP" />')
    a('')
    a('  <meta property="og:url" content="%s" />' % url)
    a('  <meta property="og:title" content="%s" />' % t)
    a('  <meta property="og:description" content="%s" />' % d)
    a('  <meta property="og:type" content="website" />')
    a('  <meta property="og:site_name" content="SCOOT SHOP" />')
    a('  <meta property="og:locale" content="es_ES" />')
    a('  <meta property="og:image" content="https://scootshop.co/img/0-removebg-preview.webp" />')
    a('')
    a('  <link rel="preload" as="font" type="font/woff2" href="/fonts/plus-jakarta-sans-latin.woff2" crossorigin />')
    a('  <link rel="stylesheet" href="/css/fuentes.css?v=%s" />' % ver)
    a('  <link rel="stylesheet" href="/css/icons.css?v=%s" />' % ver)
    a('  <link rel="stylesheet" href="/css/main.css?v=%s" />' % ver)
    a('  <link rel="stylesheet" href="/css/partials.mobile-menu.css?v=%s" />' % ver)
    a('  <!-- index.css trae la lista de preguntas (.faq-*), la miga y el pie. -->')
    a('  <link rel="stylesheet" href="/css/index.css?v=%s" />' % ver)
    a('')
    a('  <script src="/js/asset-sync.js?v=%s" defer></script>' % piezas['ver_sync'])
    a('  <script src="/js/global-assets.js?v=%s" defer></script>' % piezas['ver_global'])
    a('  <script src="/js/scroll-memoria.js?v=%s" defer></script>' % ver)
    a('')
    a('  <script type="application/ld+json">')
    a(ld)
    a('  </script>')
    a('</head>')
    a('<body>')
    a('  <a href="#main-content" class="skip-link">Saltar al contenido principal</a>')
    a('')
    a(cabecera_adaptada(piezas['header']))
    a('')
    a(piezas['menu'])
    a('')
    a('  <main id="main-content">')
    a('')
    a('    <nav class="cat-miga" aria-label="Ruta">')
    a('      <div class="container">')
    a('        <a href="/">Inicio</a>')
    a('        <span class="cat-miga-sep" aria-hidden="true">/</span>')
    a('        <span aria-current="page">Preguntas frecuentes</span>')
    a('      </div>')
    a('    </nav>')
    a('')
    a('    <section id="faq" class="container">')
    a('      <div class="faq-block">')
    # «Ayuda» y no «Preguntas frecuentes»: la miga lo dice dos renglones mas
    # arriba y el titular justo debajo, y tres veces lo mismo no es enfasis.
    a('        <span class="faq-eyebrow">Ayuda</span>')
    a('        <h1>Resolvemos tus dudas.</h1>')
    a('        <p class="faq-lead">Si no encuentras tu respuesta, te ayudamos al momento por <a href="https://wa.me/34666318747" target="_blank" rel="noopener">WhatsApp</a>.</p>')
    a('')
    a('        <div class="faq-list-clean">')
    for q, r in PREGUNTAS:
        a('          <details><summary>%s</summary><p>%s</p></details>' % (q, r))
    a('        </div>')
    a('      </div>')
    a('    </section>')
    a('')
    a(piezas['pie'])
    a('  </main>')
    a('</body>')
    a('</html>')
    return NL.join(partes) + NL


def opciones_del_menu_movil(texto):
    """Las filas de la vista principal del menu movil, normalizadas.

    Existe porque el menu movil esta DOS VECES: la portada lo lleva en linea
    (`data-inline="true"`) y las demas paginas lo piden a partials/mobile-menu.html.
    Se cambio uno y no el otro, y la portada se quedo con el menu viejo mientras
    las fichas ya tenian el nuevo — sin que fallara nada.
    """
    i = texto.find('<div class="mm-view mm-view--main">')
    if i < 0:
        raise SystemExit('no encuentro la vista principal del menu movil')
    # Cierra en el pie, que es lo que hay despues en los dos ficheros. Antes
    # cerraba en `<div class="mm-view mm-view--products">`, la vista del cajon
    # de marcas; el dia que ese segundo nivel se quito, esta comprobacion se
    # quedaba sin marca de fin y abortaba.
    fin = texto.find('<div class="mm-foot">', i)
    if fin < 0:
        raise SystemExit('no encuentro el pie del menu movil')
    trozo = texto[i:fin]
    # Solo lo que importa: a donde va cada fila y que categoria abre.
    return re.findall(r'(?:href|data-mm-cat)="([^"]+)"', trozo)


def main():
    comprobar = '--check' in sys.argv

    home = leer('index.html')

    # Los dos menus moviles, el mismo
    a = opciones_del_menu_movil(home)
    b = opciones_del_menu_movil(leer('partials/mobile-menu.html'))
    if a != b:
        print('CATEGORIAS_KO  el menu movil de index.html y el de partials/ no coinciden')
        print('  index.html : %s' % a)
        print('  partials/  : %s' % b)
        raise SystemExit(1)
    ver = json.loads(leer('asset-version.json'))['v']

    m = re.search(r'cart-runtime[.]js[?]r=([0-9a-zA-Z-]+)', home)
    if not m:
        raise SystemExit('no encuentro el rev de cart-runtime.js en index.html')
    rev_carrito = m.group(1)

    m = re.search(r'index-head[.]js[?]v=([0-9a-zA-Z-]+)', home)
    ver_head = m.group(1) if m else ver

    # /preguntas no lleva catalogo, asi que arranca como /checkout. Las dos
    # revisiones se LEEN de ahi y no se escriben aqui: son bust localizado
    # (asset-sync.js y global-assets.js se sirven inmutables y su ?v se sube a
    # mano), y una copia en este fichero se quedaria atras el dia que se toque
    # cualquiera de los dos.
    checkout = leer('checkout/index.html')
    vers = {}
    for clave, fichero in (('ver_sync', 'asset-sync'), ('ver_global', 'global-assets')):
        m = re.search(fichero + r'[.]js[?]v=([0-9a-zA-Z-]+)', checkout)
        if not m:
            raise SystemExit('no encuentro el ?v de %s.js en checkout/index.html' % fichero)
        vers[clave] = m.group(1)

    fin_menu = NL + '    </nav>' + NL + '  </div>'
    fin_pie = NL + '    </section>' + NL

    piezas = {
        'ver_head': ver_head,
        'estilo_scroll': entre(home, '  <style>html.ss-volviendo', '</style>', 'estilo de scroll'),
        'script_scroll': entre(home, "  <script>(function(){try{if('scrollRestoration'",
                               '</script>', 'script de scroll'),
        'iconos': entre(home, '  <link rel="icon" href="/favicon.ico"',
                        'href="/apple-touch-icon.png" />', 'iconos'),
        # En crudo: la adapta `componer`, porque el enlace que hay que marcar
        # como actual depende de en que categoria estemos.
        'header': entre(home, '  <header id="siteHeader"', NL + '  </header>', 'cabecera'),
        'menu': entre(home, '  <div id="mobile-menu-slot"', fin_menu, 'menu movil'),
        # El panel ya no vive en index.html: la portada no filtra nada. Su dueno
        # es partials/, como el resto de lo que comparten varias paginas.
        'filtros': entre(leer('partials/filtros.html'),
                         '    <dialog class="filtros" id="filtrosPanel"',
                         NL + '    </dialog>', 'panel de filtros'),
        'pie': entre(home, '    <section class="payments deferred-section"', fin_pie, 'pie'),
    }
    piezas.update(vers)

    desfasadas = []
    for cat in CATEGORIAS:
        destino = os.path.join(RAIZ, cat['carpeta'], 'index.html')
        nuevo = componer(cat, piezas, ver, rev_carrito)
        viejo = io.open(destino, encoding='utf-8').read() if os.path.exists(destino) else None
        if viejo == nuevo:
            print('  = /%s/' % cat['carpeta'])
            continue
        if comprobar:
            desfasadas.append(cat['carpeta'])
            continue
        io.open(destino, 'w', encoding='utf-8', newline='').write(nuevo)
        print('  + /%s/  (%d bytes)' % (cat['carpeta'], len(nuevo)))

    # /preguntas: mismas piezas compartidas, sin catalogo.
    destino = os.path.join(RAIZ, 'preguntas', 'index.html')
    nuevo = componer_preguntas(piezas, ver)
    viejo = io.open(destino, encoding='utf-8').read() if os.path.exists(destino) else None
    if viejo == nuevo:
        print('  = /preguntas/')
    elif comprobar:
        desfasadas.append('preguntas')
    else:
        carpeta = os.path.dirname(destino)
        if not os.path.isdir(carpeta):
            os.makedirs(carpeta)
        io.open(destino, 'w', encoding='utf-8', newline='').write(nuevo)
        print('  + /preguntas/  (%d bytes)' % len(nuevo))

    if desfasadas:
        print('CATEGORIAS_KO  desfasadas: %s' % ', '.join(desfasadas))
        print('  arreglalo con: python scripts/build-categorias.py')
        raise SystemExit(1)

    print(MARCA)


if __name__ == '__main__':
    main()
