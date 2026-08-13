# -*- coding: utf-8 -*-
"""scripts/subir-env.py — sube public_html/.env al servidor por FTP.

`deploy.py` excluye `.env` a propósito: no debe viajar en un despliegue normal ni
por descuido. Pero al rotar un secreto hay que actualizarlo en el servidor, y
hacerlo a mano por un cliente FTP es justo cuando se cometen errores.

Este script lo sube y NO imprime jamás el contenido: solo el tamaño, la fecha y una
huella (sha256 recortado) para poder comparar local y remoto sin ver nada.

    python scripts/subir-env.py

Comprueba antes que el fichero tiene pinta de .env válido (líneas CLAVE=valor) para
no subir un fichero a medio guardar.
"""
import ftplib
import hashlib
import io
import os
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ENV = os.path.join(RAIZ, '.env')
HOST = 'srv1049-files.hstgr.io'
REMOTO = '/domains/scootshop.co/public_html/.env'

sys.path.insert(0, RAIZ)
import deploy  # reutiliza la carga de .env y las credenciales


def main():
    if not os.path.isfile(ENV):
        print('no encuentro public_html/.env')
        return 2

    crudo = io.open(ENV, 'rb').read()
    texto = crudo.decode('utf-8', 'replace')
    lineas = [l for l in texto.split('\n') if l.strip() and not l.strip().startswith('#')]
    validas = [l for l in lineas if '=' in l]
    if not lineas or len(validas) != len(lineas):
        print('el .env no parece completo (%d líneas, %d con "="). No se sube.' % (len(lineas), len(validas)))
        return 1

    claves = sorted(l.split('=', 1)[0].strip() for l in validas)
    vacias = [l.split('=', 1)[0].strip() for l in validas if not l.split('=', 1)[1].strip()]
    print('%d variables: %s' % (len(claves), ', '.join(claves)))
    if vacias:
        print('AVISO — sin valor: ' + ', '.join(vacias))

    huella = hashlib.sha256(crudo).hexdigest()[:16]
    print('local: %d bytes · sha256 %s' % (len(crudo), huella))

    deploy.load_env_files(['.env.local', '.env'])
    user = os.environ.get('SCOOTSHOP_FTP_USER') or os.environ.get('FTP_USER') or 'u259476671'
    pwd = os.environ.get('SCOOTSHOP_FTP_PASSWORD') or os.environ.get('FTP_PASSWORD')
    if not pwd:
        print('falta SCOOTSHOP_FTP_PASSWORD')
        return 2

    ftp = ftplib.FTP()
    ftp.connect(HOST, 21, timeout=40)
    ftp.login(user, pwd)
    try:
        # Copia de seguridad de lo que hubiera antes.
        try:
            ftp.rename(REMOTO, REMOTO + '.anterior')
            print('respaldo remoto: .env.anterior')
        except ftplib.error_perm:
            print('(no había .env remoto que respaldar)')

        with io.open(ENV, 'rb') as f:
            ftp.storbinary('STOR ' + REMOTO, f)

        # Se descarga lo subido y se compara la huella: subida verificada sin leerla.
        trozos = []
        ftp.retrbinary('RETR ' + REMOTO, trozos.append)
        remoto = b''.join(trozos)
        igual = hashlib.sha256(remoto).hexdigest()[:16] == huella
        print('remoto: %d bytes · sha256 %s' % (len(remoto), hashlib.sha256(remoto).hexdigest()[:16]))
        print('ENV_SUBIDO_OK' if igual else 'ENV_SUBIDO_KO — la copia remota no coincide')
        return 0 if igual else 1
    finally:
        ftp.quit()


if __name__ == '__main__':
    sys.exit(main())
