#!/usr/bin/env python3
"""Simple FTP deploy script for scootshop.

Supports:
- --all-changed
- --files
- --file-list
- --dry-run
- --env-files
"""

from __future__ import annotations

import argparse
import os
import posixpath
import subprocess
import sys
from ftplib import FTP
from pathlib import Path
from typing import Iterable, List, Set


DEFAULT_EXCLUDES = (
    ".git/",
    ".vscode/",
    "tmp/",
    "node_modules/",
    "__pycache__/",
    ".env",
    ".env.local",
    ".env.example",
)


def load_env_files(paths: Iterable[str]) -> None:
    for raw in paths:
        path = Path(raw)
        if not path.exists() or not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def parse_files_arg(raw: str) -> List[str]:
    return [p.strip().replace("\\", "/") for p in raw.split(",") if p.strip()]


def read_file_list(path: str) -> List[str]:
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"No existe file-list: {path}")
    out: List[str] = []
    for line in file_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        out.append(line.replace("\\", "/"))
    return out


def git_changed_files() -> List[str]:
    # Restrict output to current working tree scope (public_html).
    cmd = ["git", "status", "--porcelain", "--untracked-files=all", "--", "."]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"git status fallo: {proc.stderr.strip()}")

    files: List[str] = []
    cwd_name = Path.cwd().name.replace("\\", "/") + "/"
    for line in proc.stdout.splitlines():
        if not line.strip():
            continue
        if len(line) < 4:
            continue
        payload = line[3:].strip()
        if " -> " in payload:
            payload = payload.split(" -> ", 1)[1].strip()
        payload = payload.replace("\\", "/")
        if payload.startswith("./"):
            payload = payload[2:]
        if payload.startswith(cwd_name):
            payload = payload[len(cwd_name) :]
        files.append(payload)
    return files


def is_excluded(path: str) -> bool:
    norm = path.strip().lstrip("./")
    if not norm:
        return True
    for ex in DEFAULT_EXCLUDES:
        if ex.endswith("/") and norm.startswith(ex):
            return True
        if norm == ex:
            return True
    return False


def sanitize_files(candidates: Iterable[str]) -> List[str]:
    seen: Set[str] = set()
    final: List[str] = []
    for c in candidates:
        norm = c.strip().replace("\\", "/").lstrip("./")
        if not norm or norm in seen:
            continue
        if is_excluded(norm):
            continue
        local_path = Path(norm)
        if not local_path.exists() or not local_path.is_file():
            continue
        seen.add(norm)
        final.append(norm)
    return sorted(final)


def ensure_remote_dir(ftp: FTP, remote_dir: str) -> None:
    # Create one segment at a time to avoid errors on nested mkd.
    parts = [p for p in remote_dir.split("/") if p]
    current = ""
    for part in parts:
        current = current + "/" + part
        try:
            ftp.mkd(current)
        except Exception:
            # Ignore if already exists.
            pass


def upload_files(
    ftp: FTP,
    files: List[str],
    remote_base: str,
    dry_run: bool,
) -> None:
    for rel in files:
        remote_path = posixpath.join(remote_base, rel).replace("\\", "/")
        remote_dir = posixpath.dirname(remote_path)
        if dry_run:
            print(f"[DRY-RUN] {rel} -> {remote_path}")
            continue
        ensure_remote_dir(ftp, remote_dir)
        with open(rel, "rb") as fh:
            ftp.storbinary(f"STOR {remote_path}", fh)
        print(f"[OK] {rel} -> {remote_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy files to FTP")
    parser.add_argument("--host", required=True, help="FTP host")
    parser.add_argument("--port", type=int, default=21, help="FTP port")
    parser.add_argument("--remote-base", required=True, help="Remote base folder")
    parser.add_argument("--all-changed", action="store_true", help="Deploy git changed files")
    parser.add_argument("--allow-bulk", action="store_true", help="Allow bulk deploy when using --all-changed")
    parser.add_argument("--files", help="Comma-separated file list")
    parser.add_argument("--file-list", help="Path to file containing files to deploy")
    parser.add_argument("--dry-run", action="store_true", help="Print actions only")
    parser.add_argument("--env-files", nargs="*", default=[], help="Env files to load")
    parser.add_argument("--no-prompt", action="store_true", help="Disable prompts")
    args = parser.parse_args()

    load_env_files(args.env_files)

    ftp_user = (
        os.environ.get("SCOOTSHOP_FTP_USER")
        or os.environ.get("FTP_USER")
        or "u259476671"
    )
    ftp_password = os.environ.get("SCOOTSHOP_FTP_PASSWORD") or os.environ.get("FTP_PASSWORD")

    if not ftp_password:
        print("ERROR: Falta SCOOTSHOP_FTP_PASSWORD en entorno/.env files", file=sys.stderr)
        return 2

    candidates: List[str] = []
    if args.files:
        candidates.extend(parse_files_arg(args.files))
    if args.file_list:
        candidates.extend(read_file_list(args.file_list))
    if args.all_changed:
        candidates.extend(git_changed_files())

    files = sanitize_files(candidates)
    if not files:
        print("No hay archivos para desplegar.")
        return 0

    if args.all_changed and not args.allow_bulk:
        print(
            "ERROR: --all-changed detectado sin --allow-bulk. "
            "Usa --files/--file-list para deploy selectivo o confirma con --allow-bulk.",
            file=sys.stderr,
        )
        return 3

    print(f"Host: {args.host}:{args.port}")
    print(f"Destino: {args.remote_base}")
    print(f"Archivos: {len(files)}")

    if args.dry_run:
        for f in files:
            print(f"- {f}")
        upload_files(None, files, args.remote_base, dry_run=True)  # type: ignore[arg-type]
        print("DRY-RUN OK")
        return 0

    ftp = FTP()
    ftp.connect(args.host, args.port, timeout=45)
    ftp.login(ftp_user, ftp_password)
    try:
        upload_files(ftp, files, args.remote_base, dry_run=False)
    finally:
        try:
            ftp.quit()
        except Exception:
            pass

    print("DEPLOY OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
