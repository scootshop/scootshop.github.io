#!/usr/bin/env python3
"""Borra un directorio remoto por FTP, recursivamente.

deploy.py solo sube; para retirar una ficha del servidor hace falta esto.
Reutiliza el mismo .env y la misma resolucion de credenciales que deploy.py.

Uso (SIEMPRE con --dry-run primero):
    python scripts/ftp-remove.py --host H --remote-base /domains/.../public_html \
        --path patinetes/series-n/e8 --env-files .env.local .env --dry-run
"""

import argparse
import os
import posixpath
import sys
from ftplib import FTP, error_perm

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_env(paths):
    for rel in paths:
        full = rel if os.path.isabs(rel) else os.path.join(ROOT, rel)
        if not os.path.isfile(full):
            continue
        with open(full, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key, value = key.strip(), value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value


def walk_remote(ftp, path):
    """Devuelve (ficheros, directorios) bajo path, en orden seguro para borrar."""
    files, dirs = [], []
    try:
        entries = list(ftp.mlsd(path))
    except Exception:
        # Servidores sin MLSD: caemos a NLST y probamos por tipo.
        entries = []
        for name in ftp.nlst(path):
            base = posixpath.basename(name)
            if base in (".", ".."):
                continue
            kind = "dir"
            try:
                ftp.cwd(posixpath.join(path, base))
                ftp.cwd("/")
            except error_perm:
                kind = "file"
            entries.append((base, {"type": kind}))

    for name, facts in entries:
        if name in (".", ".."):
            continue
        full = posixpath.join(path, name)
        if facts.get("type") == "dir":
            sub_files, sub_dirs = walk_remote(ftp, full)
            files.extend(sub_files)
            dirs.extend(sub_dirs)
            dirs.append(full)
        elif facts.get("type") == "file":
            files.append(full)
    return files, dirs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", required=True)
    ap.add_argument("--port", type=int, default=21)
    ap.add_argument("--remote-base", required=True)
    ap.add_argument("--path", required=True, help="Ruta relativa a remote-base")
    ap.add_argument("--env-files", nargs="*", default=[])
    # El simulacro es el comportamiento POR DEFECTO. Para borrar de verdad hay
    # que pedirlo dos veces: --execute y --yes-borrar-de-verdad.
    ap.add_argument("--execute", action="store_true", help="Borra de verdad (requiere --yes-borrar-de-verdad)")
    ap.add_argument("--yes-borrar-de-verdad", dest="confirm", action="store_true")
    args = ap.parse_args()

    args.dry_run = not (args.execute and args.confirm)
    if args.execute and not args.confirm:
        print("KO: --execute exige tambien --yes-borrar-de-verdad. No se ha borrado nada.")
        return 2

    # La ruta se valida ANTES que nada: es gratis y no necesita red ni secretos.
    rel = args.path.strip().strip("/")
    segments = [s for s in rel.split("/") if s]
    unsafe = (
        not rel
        or rel == "."
        or any(s in (".", "..") for s in segments)
        or args.path.strip().startswith("/")
        or "\\" in args.path
    )
    if unsafe or posixpath.join(args.remote_base, rel).rstrip("/") == args.remote_base.rstrip("/"):
        print(f"KO: ruta insegura, no se toca nada: {args.path!r}")
        return 2

    load_env(args.env_files)
    # Mismo orden de resolucion que deploy.py, incluido su usuario por defecto.
    user = (
        os.environ.get("SCOOTSHOP_FTP_USER")
        or os.environ.get("FTP_USER")
        or "u259476671"
    )
    password = os.environ.get("SCOOTSHOP_FTP_PASSWORD") or os.environ.get("FTP_PASSWORD")
    if not password:
        print("KO: falta SCOOTSHOP_FTP_PASSWORD en entorno/.env")
        return 2

    target = posixpath.join(args.remote_base, rel)

    ftp = FTP()
    ftp.connect(args.host, args.port, timeout=45)
    ftp.login(user, password)

    try:
        ftp.cwd(target)
    except error_perm as exc:
        print(f"El directorio remoto no existe (nada que borrar): {target}  [{exc}]")
        ftp.quit()
        return 0

    files, dirs = walk_remote(ftp, target)
    dirs.append(target)

    print(f"Objetivo: {target}")
    print(f"Ficheros: {len(files)} | Directorios: {len(dirs)}")
    for f in files:
        print(("[DRY-RUN] " if args.dry_run else "[DEL] ") + f)
    for d in dirs:
        print(("[DRY-RUN] " if args.dry_run else "[RMD] ") + d + "/")

    if args.dry_run:
        print("DRY-RUN OK (no se ha borrado nada).")
        print("Para borrar de verdad: --execute --yes-borrar-de-verdad")
        ftp.quit()
        return 0

    fallos = []
    for f in files:
        try:
            ftp.delete(f)
        except Exception as exc:
            fallos.append(f"fichero {f}: {exc}")
    for d in dirs:
        try:
            ftp.rmd(d)
        except Exception as exc:
            fallos.append(f"directorio {d}: {exc}")

    ftp.quit()

    if fallos:
        # Fallo parcial: hay que enterarse, no terminar en verde.
        print(f"BORRADO PARCIAL: {len(fallos)} fallo(s)")
        for f in fallos:
            print("  - " + f)
        return 1

    print(f"BORRADO OK ({len(files)} ficheros, {len(dirs)} directorios)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
