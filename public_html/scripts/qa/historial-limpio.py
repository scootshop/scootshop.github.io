# -*- coding: utf-8 -*-
"""scripts/qa/historial-limpio.py — ¿queda algún secreto en el historial de git?

Antes de publicar el repositorio hay que estar seguro de que ningún valor del .env
aparece en ningún commit. Este script coge los valores REALES del .env y busca cada
uno en toda la historia, pero **nunca imprime el valor**: solo dice el nombre de la
variable y si aparece o no.

    python scripts/qa/historial-limpio.py

Marcador: HISTORIAL_LIMPIO_OK / HISTORIAL_LIMPIO_KO.
"""
import io
import os
import subprocess
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REPO = os.path.abspath(os.path.join(RAIZ, '..'))
ENV = os.path.join(RAIZ, '.env')

# Valores demasiado cortos o genéricos darían falsos positivos (p. ej. "true", "1").
MINIMO = 12
# Variables cuyo valor no es secreto aunque esté en el .env.
# El client ID de PayPal es PÚBLICO por diseño: viaja en la URL del SDK que carga el
# navegador, así que aparecer en pago.html no es una fuga.
PUBLICAS = {'STRIPE_PUBLISHABLE_KEY', 'PAYPAL_CLIENT_ID', 'PAYPAL_ENV', 'PAYPAL_BUSINESS_EMAIL',
            'DISCOUNTS_ENABLED', 'DISCOUNT_REDEMPTIONS_ENABLED', 'VERCEL_EMAIL_FALLBACK_LOCAL',
            'DB_HOST', 'DB_NAME', 'DB_USER', 'GOOGLE_CLIENT_ID', 'VERCEL_EMAIL_ENDPOINT'}


def main():
    if not os.path.isfile(ENV):
        print('no encuentro public_html/.env')
        return 2

    aparecen = []
    revisados = 0
    saltados = []

    for linea in io.open(ENV, encoding='utf-8', errors='replace'):
        linea = linea.strip()
        if not linea or linea.startswith('#') or '=' not in linea:
            continue
        clave, valor = linea.split('=', 1)
        clave, valor = clave.strip(), valor.strip().strip('"').strip("'")
        if clave in PUBLICAS:
            continue
        if len(valor) < MINIMO:
            saltados.append(clave)
            continue
        revisados += 1
        # -S busca commits donde ese texto entra o sale del contenido.
        r = subprocess.run(['git', 'log', '--all', '--oneline', '-S', valor],
                           cwd=REPO, capture_output=True, text=True)
        if r.stdout.strip():
            aparecen.append((clave, len(r.stdout.strip().split('\n'))))

    print('variables secretas revisadas: %d' % revisados)
    if saltados:
        print('demasiado cortas para buscarlas sin falsos positivos: ' + ', '.join(saltados))
    for clave, n in aparecen:
        print('  FUGA: %s aparece en %d commit(s) del historial' % (clave, n))

    if aparecen:
        print('HISTORIAL_LIMPIO_KO — NO publiques el repositorio todavía')
        return 1
    print('HISTORIAL_LIMPIO_OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
