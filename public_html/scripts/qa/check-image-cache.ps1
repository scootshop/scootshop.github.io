# scripts/qa/check-image-cache.ps1
#
# GUARDIAN DE LA REGLA: las imagenes NO llevan version.
#
# Por que existe este fichero (agosto 2026). Las fotos se sirven
# `immutable, max-age=1 año`. Ponerles `?v=` las ata a la version global, y entonces
# pasan dos cosas, las dos medidas en produccion sobre la ficha del M41 Armored Dual:
#
#   1) Cada bump las invalida. La pagina pesa 1652 KB, de los cuales 1554 KB son
#      fotos: un bump por 46 KB de CSS obligaba a rebajar 1,1 MB de imagenes
#      identicas. Con cache la ficha pinta en 136 ms; sin ella, en 576 ms.
#
#   2) Aparecen DESCARGAS DUPLICADAS. El HTML y el catalogo no coinciden en la forma
#      de la URL (uno con `?v=`, otro sin el), asi que el navegador empieza a bajar
#      una, algo le reescribe el src, tira lo empezado y pide la otra. Entre las dos
#      la imagen se queda en blanco: eso es el parpadeo. Se llego a medir 25 fotos
#      bajadas dos veces en una sola ficha.
#
# La regla, por tanto, es una sola y vale para todo el sitio:
#   LAS URLS DE IMAGEN NO LLEVAN NUNCA `?v=`, ni en el HTML, ni escritas desde JS,
#   ni añadidas en tiempo de ejecucion.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/qa/check-image-cache.ps1
#
# Marcadores de salida: IMG_CACHE_OK / IMG_CACHE_KO (para engancharlo a un hook o CI).

param(
  [string]$Root = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = 'Stop'
$fallos = New-Object System.Collections.ArrayList

$EXT = 'webp|png|jpe?g|gif|avif|svg|ico'

# ── 1) HTML: ninguna URL de imagen con ?v= ────────────────────────────────────
$htmls = Get-ChildItem -Path $Root -Filter *.html -Recurse -File |
  Where-Object { $_.FullName -notmatch '_cleanup_quarantine' }

foreach ($f in $htmls) {
  $texto = Get-Content -Path $f.FullName -Raw
  $m = [regex]::Matches($texto, "\.($EXT)\?v=", 'IgnoreCase')
  if ($m.Count -gt 0) {
    $rel = $f.FullName.Substring($Root.Length).TrimStart('\', '/')
    [void]$fallos.Add("HTML  $rel : $($m.Count) imagen(es) con ?v=")
  }
}

# ── 2) JS: ninguna URL de imagen escrita ya versionada ────────────────────────
# Solo se busca el literal `/algo.webp?v=`. NO se intenta adivinar por analisis
# estatico si una linea "versiona una imagen": se probo y no discrimina — `script.src`
# y `link.href` SI deben llevar version por ser codigo, y salian como falsos
# positivos a decenas. Ese caso lo caza el otro guardian, check-image-dupes.js, que
# mira el trafico de verdad en un navegador y no se equivoca.
#
# Los comentarios se vacian ANTES de mirar (manteniendo los saltos de linea para que
# los numeros sigan cuadrando): esta misma base de codigo explica la regla en prosa,
# hablando de '?v=' y de imagenes, y sin esto se delataria a si misma.
function Remove-JsComments {
  param([string]$Texto)
  # Bloques /* ... */ -> se conservan solo sus saltos de linea.
  $sinBloques = [regex]::Replace($Texto, '(?s)/\*.*?\*/', {
    param($m) ($m.Value -replace '[^\r\n]', '')
  })
  # Linea // ... -> fuera. Se exige que no venga de un '://' (una URL).
  return [regex]::Replace($sinBloques, '(?m)(?<![:"''])//.*$', '')
}

$jsDir = Join-Path $Root 'js'
$jsRevisados = 0
if (Test-Path $jsDir) {
  foreach ($f in (Get-ChildItem -Path $jsDir -Filter *.js -File)) {
    $jsRevisados++
    $lineas = (Remove-JsComments (Get-Content -Path $f.FullName -Raw)) -split "`r?`n"
    for ($i = 0; $i -lt $lineas.Count; $i++) {
      $linea = $lineas[$i]
      if (-not $linea.Trim()) { continue }
      if ($linea -match "(?i)\.($EXT)\?v=") {
        $frag = $linea.Trim()
        if ($frag.Length -gt 78) { $frag = $frag.Substring(0, 78) + '…' }
        [void]$fallos.Add("JS    js/$($f.Name):$($i + 1) : URL de imagen versionada -> $frag")
      }
    }
  }
}

# ── Resultado ─────────────────────────────────────────────────────────────────
Write-Output "Revisados: $($htmls.Count) HTML y $jsRevisados JS"

if ($fallos.Count -eq 0) {
  Write-Output 'Ninguna URL de imagen lleva version.'
  Write-Output 'IMG_CACHE_OK'
  exit 0
}

Write-Output ''
Write-Output "SE HA ROTO LA REGLA en $($fallos.Count) sitio(s):"
foreach ($x in $fallos) { Write-Output "  - $x" }
Write-Output ''
Write-Output 'Consecuencia: las fotos se invalidan en cada despliegue y/o se bajan dos'
Write-Output 'veces, lo que se ve como parpadeo al abrir una ficha.'
Write-Output 'Arreglo: quitar el ?v= de esas URLs de imagen.'
Write-Output 'IMG_CACHE_KO'
exit 1
