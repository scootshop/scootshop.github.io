"""
Convert all product images (.jpg, .jpeg, .png) to .webp format.
- Files already WEBP internally: just copy to .webp extension
- Real JPEG/PNG: convert via Pillow with quality 82
- Deletes originals after successful conversion
- Reports unknown formats
"""
import os, shutil, struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PRODUCT_DIRS = ["bicicletas", "motos", "patinetes"]
QUALITY = 82  # Good balance of quality vs size

def detect_format(filepath):
    with open(filepath, "rb") as f:
        header = f.read(12)
    if len(header) < 4:
        return "EMPTY"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "WEBP"
    if header[:3] == b"\xff\xd8\xff":
        return "JPEG"
    if header[:8] == b"\x89PNG\r\n\x1a\n":
        return "PNG"
    return f"UNKNOWN({header[:4].hex()})"

stats = {"converted": 0, "copied": 0, "deleted": 0, "skipped": 0, "errors": []}

for d in PRODUCT_DIRS:
    base = ROOT / d
    if not base.exists():
        continue
    for ext in ("*.jpg", "*.jpeg", "*.png"):
        for src in base.rglob(ext):
            webp_dest = src.with_suffix(".webp")
            fmt = detect_format(src)
            
            if fmt == "WEBP":
                # Already WEBP data, just copy/rename
                if not webp_dest.exists():
                    shutil.copy2(src, webp_dest)
                    print(f"COPY  {src.relative_to(ROOT)} -> {webp_dest.name}")
                else:
                    print(f"EXIST {webp_dest.relative_to(ROOT)} (already exists)")
                stats["copied"] += 1
                # Delete the old .jpg
                src.unlink()
                stats["deleted"] += 1
                print(f"  DEL {src.relative_to(ROOT)}")
                
            elif fmt in ("JPEG", "PNG"):
                # Real image, convert to WEBP
                try:
                    if webp_dest.exists():
                        print(f"EXIST {webp_dest.relative_to(ROOT)} (skip convert)")
                    else:
                        img = Image.open(src)
                        img.save(webp_dest, "WEBP", quality=QUALITY, method=4)
                        print(f"CONV  {src.relative_to(ROOT)} -> {webp_dest.name} ({src.stat().st_size:,} -> {webp_dest.stat().st_size:,})")
                    stats["converted"] += 1
                    # Delete original
                    src.unlink()
                    stats["deleted"] += 1
                    print(f"  DEL {src.relative_to(ROOT)}")
                except Exception as e:
                    stats["errors"].append(f"{src}: {e}")
                    print(f"ERROR {src.relative_to(ROOT)}: {e}")
                    
            else:
                # Unknown format - try to convert anyway
                try:
                    img = Image.open(src)
                    if not webp_dest.exists():
                        img.save(webp_dest, "WEBP", quality=QUALITY, method=4)
                        print(f"CONV? {src.relative_to(ROOT)} ({fmt}) -> {webp_dest.name}")
                    stats["converted"] += 1
                    src.unlink()
                    stats["deleted"] += 1
                    print(f"  DEL {src.relative_to(ROOT)}")
                except Exception as e:
                    stats["errors"].append(f"{src} ({fmt}): {e}")
                    print(f"SKIP  {src.relative_to(ROOT)} ({fmt}): {e}")
                    stats["skipped"] += 1

# Also handle .png files in bicicletas/gt900/img that have .png extension
# (already handled by the *.png glob above)

print("\n=== SUMMARY ===")
print(f"Converted: {stats['converted']}")
print(f"Copied (already WEBP): {stats['copied']}")
print(f"Deleted originals: {stats['deleted']}")
print(f"Skipped: {stats['skipped']}")
if stats["errors"]:
    print(f"Errors: {len(stats['errors'])}")
    for e in stats["errors"]:
        print(f"  - {e}")
