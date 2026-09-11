# Bump de la versión global de assets.
#
# POR DEFECTO NO TOCA LAS IMÁGENES, y es deliberado. Las fotos se sirven
# `immutable, max-age=1 año`, así que cambiarles el ?v= crea una URL nueva y el
# navegador se las vuelve a bajar ENTERAS. Medido en agosto de 2026 sobre la ficha
# del M41 Armored Dual: la página pesa 1652 KB, de los cuales 1554 KB son imágenes,
# y 39 de ellas (1146 KB) llevaban ?v=. O sea que un bump por 46 KB de CSS obligaba
# a rebajar 1,1 MB de fotos idénticas. Con caché la ficha pinta en 136 ms; sin ella,
# en 576 ms y con las fotos entrando a trozos — el parpadeo al abrir una ficha
# después de cada despliegue.
#
# Las fotos NO necesitan el ?v= global: viven en rutas estables y solo cambian
# cuando se sustituye el archivo. Para ese caso está -ConImagenes, que vuelve a
# versionarlas todas.
param(
  [string]$Root = (Get-Location).Path,
  [string]$Version,
  [switch]$ConImagenes
)

$ErrorActionPreference = 'Stop'

function Get-NextVersion {
  param([string]$Current)

  $today = Get-Date -Format 'yyyyMMdd'
  if (-not $Current -or $Current -notmatch '^(\d{8})-(\d+)$') {
    return "$today-1"
  }

  $datePart = $Matches[1]
  $numPart = [int]$Matches[2]

  if ($datePart -eq $today) {
    return "$today-$($numPart + 1)"
  }

  return "$today-1"
}

function Set-VersionQuery {
  param(
    [string]$Url,
    [string]$Ver
  )

  if (-not $Url) { return $Url }
  if ($Url -match '^(https?:)?//') { return $Url }
  if ($Url -match '^[a-zA-Z][a-zA-Z0-9+.-]*:') { return $Url }
  if ($Url -notmatch '^/') { return $Url }

  $parts = $Url -split '#', 2
  $base = $parts[0]
  $hash = if ($parts.Count -gt 1) { "#" + $parts[1] } else { '' }

  $q = ''
  $pathOnly = $base
  if ($base -match '\?') {
    $qParts = $base -split '\?', 2
    $pathOnly = $qParts[0]
    $q = $qParts[1]
  }

  $dict = @{}
  if ($q) {
    foreach ($pair in ($q -split '&')) {
      if (-not $pair) { continue }
      $kv = $pair -split '=', 2
      $k = [uri]::UnescapeDataString($kv[0])
      $v = if ($kv.Count -gt 1) { [uri]::UnescapeDataString($kv[1]) } else { '' }
      if ($k) { $dict[$k] = $v }
    }
  }

  $dict['v'] = $Ver

  $pairs = @()
  foreach ($k in $dict.Keys) {
    $pairs += ([uri]::EscapeDataString([string]$k) + '=' + [uri]::EscapeDataString([string]$dict[$k]))
  }

  $queryStr = if ($pairs.Count -gt 0) { '?' + ($pairs -join '&') } else { '' }
  return "$pathOnly$queryStr$hash"
}

function Should-SkipVersioning {
  param([string]$Url)

  if (-not $Url) { return $false }

  $clean = ($Url -split '[?#]', 2)[0]
  return $clean -in @(
    '/js/index-head.js',
    '/js/global-assets.js',
    '/js/asset-sync.js'
  )
}

function Update-HtmlAssetUrls {
  param(
    [string]$Html,
    [string]$Ver,
    [bool]$Imagenes = $false
  )

  $updated = $Html

  # Versionar JS locales en <script src="/...js">
  $updated = [regex]::Replace(
    $updated,
    '<script(\s+[^>]*?)?\s+src="(/[^"#?]+\.js(?:\?[^"#]*)?(?:#[^"]*)?)"([^>]*)>',
    {
      param($m)
      $pre = if ($m.Groups[1].Success) { $m.Groups[1].Value } else { '' }
      $src = $m.Groups[2].Value
      $post = $m.Groups[3].Value
      if (Should-SkipVersioning -Url $src) {
        return ('<script' + $pre + ' src="' + $src + '"' + $post + '>')
      }
      $newSrc = Set-VersionQuery -Url $src -Ver $Ver
      return ('<script' + $pre + ' src="' + $newSrc + '"' + $post + '>')
    },
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )

  # Versionar recursos locales en <link href="/...ext">. Las extensiones de imagen
  # solo entran con -ConImagenes: aquí caen el favicon y los preload de fotos, que
  # son de los recursos que más pesan al invalidarse.
  $extLink = if ($Imagenes) { 'css|webmanifest|ico|png|svg|webp|jpg|jpeg' } else { 'css|webmanifest' }
  $updated = [regex]::Replace(
    $updated,
    '<link(\s+[^>]*?)?\s+href="(/[^"#?]+\.(?:' + $extLink + ')(?:\?[^"#]*)?(?:#[^"]*)?)"([^>]*)>',
    {
      param($m)
      $pre = if ($m.Groups[1].Success) { $m.Groups[1].Value } else { '' }
      $href = $m.Groups[2].Value
      $post = $m.Groups[3].Value
      $newHref = Set-VersionQuery -Url $href -Ver $Ver
      return ('<link' + $pre + ' href="' + $newHref + '"' + $post + '>')
    },
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )

  # Versionar imágenes locales en <img src="/...ext">. Solo con -ConImagenes: es el
  # grueso del peso de una ficha y lo que hace que parpadee tras cada despliegue.
  if ($Imagenes) {
    $updated = [regex]::Replace(
      $updated,
      '<img(\s+[^>]*?)?\s+src="(/[^"#?]+\.(?:png|svg|webp|jpg|jpeg|gif|avif)(?:\?[^"#]*)?(?:#[^"]*)?)"([^>]*)>',
      {
        param($m)
        $pre = if ($m.Groups[1].Success) { $m.Groups[1].Value } else { '' }
        $src = $m.Groups[2].Value
        $post = $m.Groups[3].Value
        $newSrc = Set-VersionQuery -Url $src -Ver $Ver
        return ('<img' + $pre + ' src="' + $newSrc + '"' + $post + '>')
      },
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
  }

  # Versionar los candidatos de srcset / imagesrcset. Sin esto, un <img> responsive
  # quedaba con el src bumpeado y el srcset apuntando a la versión anterior: el
  # navegador elige del srcset, así que el bump no llegaba nunca a esas imágenes.
  # Va con el mismo interruptor que el <img src>: srcset son imágenes y nada más, y
  # si se bumpease aquí y no allí volvería justo el desajuste que este bloque evita.
  if ($Imagenes) {
    $updated = [regex]::Replace(
      $updated,
      '(?<attr>\b(?:image)?srcset)="(?<value>[^"]+)"',
      {
        param($m)
        $attr = $m.Groups['attr'].Value
        $parts = @()
        foreach ($candidate in ($m.Groups['value'].Value -split ',')) {
          $trimmed = $candidate.Trim()
          if (-not $trimmed) { continue }
          # "<url> <descriptor>" — el descriptor (400w, 2x…) es opcional.
          $bits = $trimmed -split '\s+', 2
          $newUrl = Set-VersionQuery -Url $bits[0] -Ver $Ver
          $parts += if ($bits.Count -gt 1) { "$newUrl $($bits[1])" } else { $newUrl }
        }
        return ($attr + '="' + ($parts -join ', ') + '"')
      },
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
  }

  return $updated
}

function Update-AssetMeta {
  param(
    [string]$Html,
    [string]$Ver
  )

  $metaPattern = '<meta\s+name="asset-version"\s+content="[^"]+"\s*/?>'
  if ([regex]::IsMatch($Html, $metaPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    return [regex]::Replace(
      $Html,
      $metaPattern,
      ('<meta name="asset-version" content="{0}" />' -f $Ver),
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
  }

  # Si no existe, insertar antes de </head>
  if ([regex]::IsMatch($Html, '</head>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    return [regex]::Replace(
      $Html,
      '</head>',
      ('  <meta name="asset-version" content="{0}" />' + [Environment]::NewLine + '</head>' -f $Ver),
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
  }

  return $Html
}

# Variantes responsive de las portadas de tarjeta, ANTES de versionar nada.
# Este es el enganche que evita tener que acordarse: toda publicacion pasa por
# aqui, y el generador solo trabaja si falta o esta obsoleta alguna variante
# (compara fechas contra el original), asi que en el caso normal no hace nada.
# Nunca aborta el bump: si Python no esta disponible solo avisa.
$cardShots = Join-Path $PSScriptRoot 'build-card-shots.py'
if (Test-Path $cardShots) {
  try {
    $shotsOut = & python $cardShots --quiet 2>&1
    $shotsCode = $LASTEXITCODE
    if ($shotsOut) { $shotsOut | ForEach-Object { Write-Output "  [card-shots] $_" } }
    if ($shotsCode -eq 2) {
      Write-Warning 'card-shots: hay portadas declaradas sin imagen valida (ver arriba). El srcset caera al original en esas tarjetas.'
    }
  } catch {
    Write-Warning "card-shots: no se pudo ejecutar ($($_.Exception.Message)). Ejecuta 'python scripts/build-card-shots.py' a mano."
  }
}

$assetPath = Join-Path $Root 'asset-version.json'

$htmlFiles = Get-ChildItem -Path $Root -Recurse -File -Filter '*.html'

if (-not (Test-Path $assetPath)) { throw "No se encontró asset-version.json en: $assetPath" }
if (-not $htmlFiles -or $htmlFiles.Count -eq 0) { throw "No se encontraron archivos HTML en: $Root" }

$assetRaw = Get-Content $assetPath -Raw -Encoding UTF8

$sampleHtml = Get-Content $htmlFiles[0].FullName -Raw -Encoding UTF8
$metaMatch = [regex]::Match($sampleHtml, '<meta\s+name="asset-version"\s+content="([^"]+)"\s*/?>')
$currentVersion = if ($metaMatch.Success) { $metaMatch.Groups[1].Value.Trim() } else { '' }

# ── La version de PRODUCCION manda si va por delante ─────────────────────────────
# Hay DOS escritores de asset-version.json: este script y `bump_asset_version()` del
# backend, que corre en CADA cambio de precio o de stock desde el panel. Si el panel ha
# bumpeado y aqui se parte del numero local, el bump sale HACIA ATRAS: se reutiliza una
# version ya servida con OTRO css, y como el css es `immutable` un anyo, quien tuviera
# esa version en cache se queda con la hoja vieja para siempre. Paso el 24-ago-2026.
function Compare-AssetVersion {
  param([string]$A, [string]$B)
  $ra = [regex]::Match($A, '^(\d{8})-(\d+)$')
  $rb = [regex]::Match($B, '^(\d{8})-(\d+)$')
  if (-not $ra.Success) { return -1 }
  if (-not $rb.Success) { return 1 }
  $da = [int]$ra.Groups[1].Value; $db = [int]$rb.Groups[1].Value
  if ($da -ne $db) { if ($da -gt $db) { return 1 } else { return -1 } }
  $na = [int]$ra.Groups[2].Value; $nb = [int]$rb.Groups[2].Value
  if ($na -gt $nb) { return 1 } elseif ($na -lt $nb) { return -1 } else { return 0 }
}

if (-not $Version) {
  try {
    $resp = Invoke-WebRequest -Uri 'https://scootshop.co/asset-version.json' -UseBasicParsing -TimeoutSec 8
    $viva = ([regex]::Match($resp.Content, '"v"\s*:\s*"([^"]+)"')).Groups[1].Value.Trim()
    if ($viva -and (Compare-AssetVersion -A $viva -B $currentVersion) -gt 0) {
      Write-Output "- produccion va por delante ($viva > $currentVersion): se parte de ahi"
      $currentVersion = $viva
    }
  } catch {
    Write-Warning "No se pudo leer la version de produccion ($($_.Exception.Message)). Se parte de la local: $currentVersion"
  }
}

$targetVersion = if ($Version) { $Version.Trim() } else { Get-NextVersion -Current $currentVersion }

if ($targetVersion -notmatch '^\d{8}-\d+$') {
  throw "Formato inválido de versión: '$targetVersion'. Usa YYYYMMDD-N"
}

foreach ($f in $htmlFiles) {
  $raw = Get-Content $f.FullName -Raw -Encoding UTF8
  $updated = Update-AssetMeta -Html $raw -Ver $targetVersion
  $updated = Update-HtmlAssetUrls -Html $updated -Ver $targetVersion -Imagenes:$ConImagenes.IsPresent

  if ($updated -ne $raw) {
    Set-Content -Path $f.FullName -Value $updated -Encoding UTF8
  }
}

$assetObj = $null
try {
  $assetObj = $assetRaw | ConvertFrom-Json
} catch {
  throw 'asset-version.json no tiene JSON válido'
}

$assetObj.v = $targetVersion
$assetUpdated = $assetObj | ConvertTo-Json -Depth 5

# SIN BOM, y no es un detalle de estilo: `Set-Content -Encoding UTF8` en Windows
# PowerShell 5.1 escribe BOM, y quien lee este fichero en el servidor es
# `bump_asset_version()` (api/index.php) con `json_decode`, que con BOM devuelve null.
# Entonces el patron `^(\d{8})-(\d+)$` no casa, la funcion cae en "$hoy-1" y la
# numeracion RETROCEDE: pasó de verdad el 24-ago-2026: el sitio estaba en 20260824-3,
# un cambio de precio desde el panel lo dejó en -1 y el siguiente en -2, reutilizando
# una version ya servida con OTRO css. Como el css es `immutable` por un año, quien ya
# tenia la -2 en cache se quedaba con la hoja vieja para siempre.
[System.IO.File]::WriteAllText($assetPath, $assetUpdated + "`n", (New-Object System.Text.UTF8Encoding($false)))

Write-Output "OK: asset-version actualizado a $targetVersion"
Write-Output "- HTML actualizados: $($htmlFiles.Count)"
Write-Output "- asset-version.json"
if ($ConImagenes.IsPresent) {
  Write-Output "- IMAGENES re-versionadas: los visitantes se las volveran a bajar todas."
  Write-Output "  OJO: el JS construye las URLs de foto SIN ?v= (del catalogo), asi que"
  Write-Output "  las fichas con variantes de color pediran la misma foto por dos URLs"
  Write-Output "  y parpadearan. Si no era lo que querias, limpia el ?v= de las imagenes."
} else {
  Write-Output "- imagenes intactas (lo normal: sus URLs no llevan version)"
}
