# -*- coding: utf-8 -*-
"""scripts/qa/panel-precio.js — EL CAMBIO DE PRECIO DESDE EL PANEL, DE VERDAD.

   python scripts/qa/panel-precio.py [base]

Marcador: PANEL_E2E_OK / PANEL_E2E_KO.

Cambia el precio de un producto por la MISMA ruta que usa el panel, comprueba que el
catálogo no se toca y que la web lo refleja, y lo devuelve a su valor original.
"""
import hashlib, io, json, os, sys, urllib.request

import os.path
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'https://scootshop.co').rstrip('/')
PRODUCTO = 'k-g2-pro'
# Un precio que sobreviva al formateo del backend: "1.111 €" se normaliza a "1,11 €"
# (punto como separador decimal) y la comprobación se vuelve tramposa. Aprendido a la
# mala: esa prueba dejó el G2 PRO a 1,11 € en producción durante un minuto.
PRUEBA = '777 €'

clave = ''
for nombre in ('.env', '.env.local'):
    ruta = os.path.join(RAIZ, nombre)
    if not os.path.isfile(ruta):
        continue
    for linea in io.open(ruta, encoding='utf-8', errors='replace'):
        if linea.strip().startswith('ADMIN_KEY='):
            clave = linea.strip().split('=', 1)[1].strip().strip('"').strip("'")
    if clave:
        break
if not clave:
    print('sin ADMIN_KEY'); sys.exit(1)


def pedir(url, datos=None, metodo='GET'):
    req = urllib.request.Request(url, data=(json.dumps(datos).encode() if datos else None),
                                 headers={'Content-Type': 'application/json', 'x-admin-key': clave,
                                          'Origin': BASE, 'Referer': BASE + '/admin/pedidos'},
                                 method=metodo)
    return urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')


def bajar(ruta):
    req = urllib.request.Request(BASE + ruta, headers={'Cache-Control': 'no-cache'})
    return urllib.request.urlopen(req, timeout=30).read()


fallos = 0
def check(nombre, ok, detalle=''):
    global fallos
    if not ok:
        fallos += 1
    print(('OK  ' if ok else 'FALLO ') + nombre.ljust(50) + detalle)


catalogo_antes = hashlib.md5(bajar('/data/products.js')).hexdigest()

listado = json.loads(pedir(BASE + '/api/index.php?route=admin_products_list'))
prod = next((p for p in listado.get('products', []) if p['id'] == PRODUCTO), None)
check('el panel lista productos', prod is not None, str(len(listado.get('products', []))) + ' productos')
if not prod:
    sys.exit(1)
precio_original = prod['priceText']
print('   precio original: ' + precio_original)

r = json.loads(pedir(BASE + '/api/index.php?route=admin_product_price',
                     {'id': PRODUCTO, 'priceText': PRUEBA}, 'POST'))
check('el panel cambia el precio', r.get('ok') is True, json.dumps(r)[:90])

overrides = bajar('/data/product-overrides.js').decode('utf-8', 'replace')
check('la capa operativa recoge el cambio', PRUEBA.split(' ')[0] in overrides, overrides.strip().splitlines()[-6:][0][:60])

catalogo_despues = hashlib.md5(bajar('/data/products.js')).hexdigest()
check('EL CATALOGO NO SE HA TOCADO', catalogo_antes == catalogo_despues, catalogo_antes[:10] + ' -> ' + catalogo_despues[:10])

listado2 = json.loads(pedir(BASE + '/api/index.php?route=admin_products_list'))
prod2 = next((p for p in listado2.get('products', []) if p['id'] == PRODUCTO), None)
check('el panel muestra el precio nuevo', prod2 and prod2['priceText'] == PRUEBA, prod2['priceText'] if prod2 else '?')

# Y de vuelta
r2 = json.loads(pedir(BASE + '/api/index.php?route=admin_product_price',
                      {'id': PRODUCTO, 'priceText': precio_original}, 'POST'))
check('devuelve el precio original', r2.get('ok') is True, precio_original)
listado3 = json.loads(pedir(BASE + '/api/index.php?route=admin_products_list'))
prod3 = next((p for p in listado3.get('products', []) if p['id'] == PRODUCTO), None)
check('el precio queda como estaba', prod3 and prod3['priceText'] == precio_original, prod3['priceText'] if prod3 else '?')

catalogo_final = hashlib.md5(bajar('/data/products.js')).hexdigest()
check('el catalogo sigue intacto al final', catalogo_antes == catalogo_final, catalogo_final[:10])

print('\n' + ('PANEL_E2E_KO (%d)' % fallos if fallos else 'PANEL_E2E_OK'))
sys.exit(1 if fallos else 0)
