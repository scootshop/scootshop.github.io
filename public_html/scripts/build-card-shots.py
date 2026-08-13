#!/usr/bin/env python3
"""Genera las variantes responsive de las portadas de tarjeta del catalogo.

La tarjeta del home (y la de "Tambien te puede interesar") muestra la foto a
~174 CSS px en movil y ~310 en escritorio, pero el catalogo guarda originales de
800-1500 px. Este script crea, junto a cada original, las variantes que consume
el srcset de .card-shot en js/index.js.

Convencion (la asume js/index.js): para `/ruta/1.webp` se generan
`/ruta/1-400.webp`, `/ruta/1-600.webp` y `/ruta/1-800.webp`.

Solo trabaja cuando hace falta: si la variante ya existe y es mas nueva que el
original, se deja como esta. Asi anadir o cambiar UNA foto no reprocesa las 35.

Se invoca solo desde:
  - scripts/new-series-product.ps1   (al dar de alta un producto)
  - scripts/bump-assets-version.ps1  (antes de cada publicacion)

Uso manual:
    python scripts/build-card-shots.py           # genera lo que falte o este obsoleto
    python scripts/build-card-shots.py --check   # solo informa; sale 1 si falta algo
    python scripts/build-card-shots.py --force   # regenera todo
    python scripts/build-card-shots.py --quiet   # solo el resumen

Cada ejecucion que escriba algo deja en scripts/.card-shots-pending.txt la lista
de ficheros creados, lista para pasarsela a deploy.py --file-list.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PENDING = os.path.join(ROOT, "scripts", ".card-shots-pending.txt")

# Anchos medidos con Playwright sobre el sitio real, no elegidos a ojo:
#   .card-shot  -> 174 css en movil  => DPR2 348 (400) y DPR3 522 (600)
#   #mainImage  -> 326 css en movil  => DPR2 652 (800) y DPR3 978 (1000)
# La portada de tarjeta y la foto inicial de la ficha son EL MISMO fichero
# (gallery[0]), por eso un solo juego de variantes sirve a los dos.
WIDTHS = (400, 600, 800, 1000)
QUALITY = 82

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.stderr.write(
        "ERROR: falta Pillow. Instalalo con:  python -m pip install Pillow\n"
    )
    raise SystemExit(2)


def declared_covers():
    """Todas las fotos que se sirven con srcset.

    Dos fuentes, porque no coinciden del todo:
      1. data/products.js -> gallery[0] e image: lo que pinta .card-shot.
      2. El #mainImage de cada ficha: normalmente es el mismo fichero, pero hay
         fichas fuera del catalogo (no listadas en products.js) cuya foto
         principal no saldria por la via 1 y quedaria sin variantes.
    """
    out = []

    def add(raw):
        clean = raw.split("?")[0].lstrip("/")
        if clean and clean not in out:
            out.append(clean)

    data = os.path.join(ROOT, "data", "products.js")
    if not os.path.isfile(data):
        sys.stderr.write(f"ERROR: no encuentro {data}\n")
        raise SystemExit(2)

    with open(data, encoding="utf-8") as fh:
        src = fh.read()
    for item in re.findall(r"gallery:\s*\[\s*\{\s*src:\s*'([^']+)'", src):
        add(item)
    for item in re.findall(r"^\s*image:\s*'([^']+)'", src, re.MULTILINE):
        add(item)

    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules", "scripts", "img")]
        for name in filenames:
            if not name.endswith(".html"):
                continue
            with open(os.path.join(dirpath, name), encoding="utf-8", errors="ignore") as fh:
                html = fh.read()
            if 'id="mainImage"' not in html:
                continue
            hit = re.search(r'<img\s+src="(/[^"?]+\.(?:webp|jpg|jpeg|png))[^>]*id="mainImage"', html)
            if hit:
                add(hit.group(1))

    return out


def declared_srcset_variants():
    """Toda variante citada en un srcset/imagesrcset del HTML: (origen, ancho).

    Invariante que garantiza esta funcion: si una URL aparece en un srcset,
    el fichero DEBE existir. El srcset no cae solo al src — un 404 deja la
    foto rota. Asi el hero (y cualquier srcset futuro) entra sin tocar nada.
    """
    wanted = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules", "scripts")]
        for name in filenames:
            if not name.endswith(".html"):
                continue
            with open(os.path.join(dirpath, name), encoding="utf-8", errors="ignore") as fh:
                html = fh.read()
            for block in re.findall(r'(?:image)?srcset="([^"]+)"', html):
                for cand in block.split(","):
                    url = cand.strip().split()[0].split("?")[0]
                    hit = re.match(r"^/(.+)-(\d+)\.webp$", url)
                    if not hit:
                        continue
                    stem, width = hit.group(1), int(hit.group(2))
                    for ext in (".webp", ".jpg", ".jpeg", ".png"):
                        if os.path.isfile(os.path.join(ROOT, stem + ext)):
                            wanted.setdefault(stem + ext, set()).add(width)
                            break
    return wanted


def variant_rel(rel, width):
    base, _ = os.path.splitext(rel)
    return f"{base}-{width}.webp"


def is_stale(abs_src, abs_out):
    """Obsoleta = no existe, o el original se ha tocado despues de generarla."""
    if not os.path.isfile(abs_out):
        return True
    return os.path.getmtime(abs_src) > os.path.getmtime(abs_out)


def main():
    force = "--force" in sys.argv
    check_only = "--check" in sys.argv
    quiet = "--quiet" in sys.argv

    covers = declared_covers()
    if not covers:
        sys.stderr.write("ERROR: no encontre ninguna portada en data/products.js\n")
        return 2

    # Cada origen con el juego de anchos que necesita: los estandar para las
    # portadas, mas cualquier ancho extra que un srcset del HTML ya este citando
    # (asi el hero, que usa 480/800/1200, se mantiene solo y sin duplicar logica).
    plan = {rel: set(WIDTHS) for rel in covers}
    for rel, extra in declared_srcset_variants().items():
        plan.setdefault(rel, set()).update(extra)
    covers = sorted(plan)

    missing_source = []   # declarada en products.js pero no esta en disco
    unreadable = []       # esta, pero Pillow no la puede abrir
    pending = []          # falta generar / regenerar
    written = []
    downgraded = []       # variante que habria pesado mas: se copio el original
    reused = 0

    for rel in covers:
        abs_src = os.path.join(ROOT, rel)

        if not os.path.isfile(abs_src):
            missing_source.append(rel)
            continue

        widths = sorted(plan[rel])
        todo = [w for w in widths if force or is_stale(abs_src, os.path.join(ROOT, variant_rel(rel, w)))]
        reused += len(widths) - len(todo)
        if not todo:
            continue

        if check_only:
            pending.extend(variant_rel(rel, w) for w in todo)
            continue

        try:
            with Image.open(abs_src) as im:
                im.load()
                if im.mode in ("P", "LA"):
                    im = im.convert("RGBA")
                src_bytes = os.path.getsize(abs_src)
                for width in todo:
                    # Nunca ampliamos: si el original es mas pequeno, se reencoda igual.
                    target = min(width, im.width)
                    height = max(1, round(im.height * target / im.width))
                    out_rel = variant_rel(rel, width)
                    abs_out = os.path.join(ROOT, out_rel)
                    im.resize((target, height), Image.LANCZOS).save(
                        abs_out, "WEBP", quality=QUALITY, method=6
                    )
                    # Regla "nunca peor que hoy": con originales ya pequenos, el
                    # reencodado a q82 puede pesar MAS que la foto de partida
                    # (medido: 4 de 35 portadas). En ese caso se copia el
                    # original tal cual, para que el candidato siga existiendo
                    # —el srcset se construye por convencion y un 404 dejaria la
                    # foto rota— pero sin descargar nunca mas bytes que antes.
                    if os.path.getsize(abs_out) >= src_bytes:
                        with open(abs_src, "rb") as fsrc, open(abs_out, "wb") as fdst:
                            fdst.write(fsrc.read())
                        downgraded.append(out_rel)
                    written.append(out_rel)
        except Exception as exc:  # imagen corrupta, formato inesperado, permisos...
            unreadable.append(f"{rel}  ({type(exc).__name__}: {exc})")

    # ---- informe -----------------------------------------------------------
    problems = bool(missing_source or unreadable)

    if missing_source:
        sys.stderr.write(
            "\nERROR: estas portadas estan declaradas en data/products.js pero NO existen en disco.\n"
            "       La tarjeta se veria rota. Coloca la foto real y vuelve a ejecutar.\n"
        )
        for m in missing_source:
            sys.stderr.write(f"       - {m}\n")

    if unreadable:
        sys.stderr.write(
            "\nERROR: no he podido leer estas imagenes (formato inesperado o fichero danado):\n"
        )
        for u in unreadable:
            sys.stderr.write(f"       - {u}\n")

    if check_only:
        for p in pending:
            print(f"FALTA  {p}")
        print(f"\nPortadas declaradas: {len(covers)} | variantes por generar: {len(pending)}"
              f" | originales ausentes: {len(missing_source)}")
        return 1 if (pending or problems) else 0

    if written:
        with open(PENDING, "w", encoding="ascii", newline="\n") as fh:
            fh.write("\n".join(written) + "\n")

    if not quiet or written or problems:
        print(f"Portadas declaradas : {len(covers)}")
        print(f"Variantes generadas : {len(written)} (al dia: {reused})")
        if written:
            total = sum(os.path.getsize(os.path.join(ROOT, w)) for w in written)
            print(f"Bytes escritos      : {total / 1024:.0f} KB")
            if downgraded:
                print(f"Copias del original : {len(downgraded)} (el reescalado pesaba mas)")
            print(f"Lista para deploy   : scripts/.card-shots-pending.txt")

    return 2 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
