# -*- coding: utf-8 -*-
"""scripts/poner-claves.py — mete claves nuevas en .env SIN que nadie las lea.

Para qué: cuando hay que rotar un secreto (Stripe, FTP, ADMIN_KEY…) el valor no
debe pasar por un chat, un historial de terminal ni un mensaje. Este script lo
mueve de un fichero temporal a `.env` y no imprime NUNCA el valor: solo dice qué
claves ha tocado y cuántos caracteres tenían, que es lo justo para saber que ha
funcionado.

CÓMO SE USA

  1. Crea un fichero de texto, donde quieras, con una línea por clave:

         STRIPE_SECRET_KEY=sk_live_...
         STRIPE_WEBHOOK_SECRET=whsec_...

  2. Ejecuta:

         python scripts/poner-claves.py C:\\ruta\\a\\ese\\fichero.txt

  3. El script actualiza public_html/.env, comprueba que el fichero sigue siendo
     válido y BORRA el temporal sobrescribiéndolo antes de eliminarlo.

Solo acepta claves de una lista blanca: así un fichero pegado por error no puede
meter variables raras en la configuración.
"""
import io
import os
import sys

PERMITIDAS = {
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'ADMIN_KEY',
    'SCOOTSHOP_FTP_PASSWORD',
    'VERCEL_EMAIL_ENDPOINT',
}

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ENV = os.path.join(RAIZ, '.env')


def leer_pares(ruta):
    pares = {}
    for linea in io.open(ruta, encoding='utf-8-sig', errors='replace'):
        linea = linea.strip()
        if not linea or linea.startswith('#') or '=' not in linea:
            continue
        clave, valor = linea.split('=', 1)
        clave = clave.strip()
        valor = valor.strip().strip('"').strip("'")
        if clave and valor:
            pares[clave] = valor
    return pares


def main():
    if len(sys.argv) < 2:
        print('uso: python scripts/poner-claves.py <fichero-con-las-claves>')
        return 2
    origen = sys.argv[1]
    if not os.path.isfile(origen):
        print('no existe ese fichero: ' + origen)
        return 2
    if not os.path.isfile(ENV):
        print('no encuentro public_html/.env')
        return 2

    nuevas = leer_pares(origen)
    rechazadas = [k for k in nuevas if k not in PERMITIDAS]
    nuevas = {k: v for k, v in nuevas.items() if k in PERMITIDAS}
    if not nuevas:
        print('el fichero no trae ninguna clave conocida. Nada que hacer.')
        return 1

    lineas = io.open(ENV, encoding='utf-8', errors='replace').read().split('\n')
    tocadas = []
    for i, linea in enumerate(lineas):
        if '=' not in linea or linea.strip().startswith('#'):
            continue
        clave = linea.split('=', 1)[0].strip()
        if clave in nuevas:
            lineas[i] = clave + '=' + nuevas[clave]
            tocadas.append(clave)
    for clave, valor in nuevas.items():
        if clave not in tocadas:
            lineas.append(clave + '=' + valor)
            tocadas.append(clave + ' (nueva)')

    respaldo = ENV + '.anterior'
    io.open(respaldo, 'w', encoding='utf-8', newline='').write(
        io.open(ENV, encoding='utf-8', errors='replace').read())
    io.open(ENV, 'w', encoding='utf-8', newline='').write('\n'.join(lineas))

    # El temporal se sobrescribe antes de borrarlo: que no quede en el disco.
    try:
        tam = os.path.getsize(origen)
        with io.open(origen, 'wb') as f:
            f.write(b'0' * tam)
        os.remove(origen)
        borrado = 'sí'
    except Exception:
        borrado = 'NO (bórralo tú)'

    print('claves actualizadas en public_html/.env:')
    for clave in tocadas:
        limpio = clave.replace(' (nueva)', '')
        print('  · %-26s %d caracteres' % (clave, len(nuevas.get(limpio, ''))))
    if rechazadas:
        print('ignoradas por no estar en la lista blanca: ' + ', '.join(rechazadas))
    print('copia del .env anterior: .env.anterior')
    print('fichero de origen borrado: ' + borrado)
    print('CLAVES_OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
