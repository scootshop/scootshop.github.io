# -*- coding: utf-8 -*-
"""scripts/comparar-env.py — compara el .env local con el del servidor SIN leer valores.

Motivo: al subir el .env local se puede PISAR una variable que solo existía en el
servidor. Pasó al rotar la clave de Stripe: el .env de producción tenía
GOOGLE_CLIENT_ID y el local no, así que el inicio de sesión con Google se quedó sin
configurar. Esta comparación lo habría dicho antes de subir.

    python scripts/comparar-env.py            compara con el .env remoto
    python scripts/comparar-env.py --anterior compara con el respaldo .env.anterior
    python scripts/comparar-env.py --recuperar  copia al local las variables que solo
                                                están en el remoto (sin enseñarlas)

Nunca imprime valores: solo nombres de variable y si coinciden o no.
"""
import ftplib
import hashlib
import io
import os
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ENV = os.path.join(RAIZ, '.env')
HOST = 'srv1049-files.hstgr.io'
BASE_REMOTA = '/domains/scootshop.co/public_html/'

sys.path.insert(0, RAIZ)
import deploy


def pares(texto):
    out = {}
    for linea in texto.split('\n'):
        linea = linea.strip()
        if not linea or linea.startswith('#') or '=' not in linea:
            continue
        clave, valor = linea.split('=', 1)
        out[clave.strip()] = valor.strip()
    return out


def bajar(ftp, nombre):
    trozos = []
    ftp.retrbinary('RETR ' + BASE_REMOTA + nombre, trozos.append)
    return b''.join(trozos).decode('utf-8', 'replace')


def main():
    nombre = '.env.anterior' if '--anterior' in sys.argv else '.env'
    recuperar = '--recuperar' in sys.argv

    deploy.load_env_files(['.env.local', '.env'])
    user = os.environ.get('SCOOTSHOP_FTP_USER') or os.environ.get('FTP_USER') or 'u259476671'
    pwd = os.environ.get('SCOOTSHOP_FTP_PASSWORD') or os.environ.get('FTP_PASSWORD')
    if not pwd:
        print('falta SCOOTSHOP_FTP_PASSWORD')
        return 2

    local = pares(io.open(ENV, encoding='utf-8', errors='replace').read())

    ftp = ftplib.FTP()
    ftp.connect(HOST, 21, timeout=40)
    ftp.login(user, pwd)
    try:
        remoto = pares(bajar(ftp, nombre))
    finally:
        ftp.quit()

    solo_remoto = sorted(set(remoto) - set(local))
    solo_local = sorted(set(local) - set(remoto))
    distintos = sorted(k for k in set(local) & set(remoto) if local[k] != remoto[k])

    print('local: %d variables · %s: %d variables' % (len(local), nombre, len(remoto)))
    print('solo en el servidor : ' + (', '.join(solo_remoto) or '—'))
    print('solo en local       : ' + (', '.join(solo_local) or '—'))
    print('con valor distinto  : ' + (', '.join(distintos) or '—'))

    if recuperar and solo_remoto:
        texto = io.open(ENV, encoding='utf-8', errors='replace').read().rstrip('\n')
        texto += '\n' + '\n'.join(k + '=' + remoto[k] for k in solo_remoto) + '\n'
        io.open(ENV, 'w', encoding='utf-8', newline='').write(texto)
        print('recuperadas al .env local: ' + ', '.join(solo_remoto))
    elif recuperar:
        print('nada que recuperar')

    print('ENV_COMPARADO_OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
