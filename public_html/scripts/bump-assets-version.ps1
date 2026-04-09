param(
  [string]$Root = (Get-Location).Path,
  [string]$Version
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
    [string]$Ver
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

  # Versionar recursos locales en <link href="/...ext">
  $updated = [regex]::Replace(
    $updated,
    '<link(\s+[^>]*?)?\s+href="(/[^"#?]+\.(?:css|webmanifest|ico|png|svg|webp|jpg|jpeg)(?:\?[^"#]*)?(?:#[^"]*)?)"([^>]*)>',
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

  # Versionar imágenes locales en <img src="/...ext">
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

$assetPath = Join-Path $Root 'asset-version.json'

$htmlFiles = Get-ChildItem -Path $Root -Recurse -File -Filter '*.html'

if (-not (Test-Path $assetPath)) { throw "No se encontró asset-version.json en: $assetPath" }
if (-not $htmlFiles -or $htmlFiles.Count -eq 0) { throw "No se encontraron archivos HTML en: $Root" }

$assetRaw = Get-Content $assetPath -Raw -Encoding UTF8

$sampleHtml = Get-Content $htmlFiles[0].FullName -Raw -Encoding UTF8
$metaMatch = [regex]::Match($sampleHtml, '<meta\s+name="asset-version"\s+content="([^"]+)"\s*/?>')
$currentVersion = if ($metaMatch.Success) { $metaMatch.Groups[1].Value.Trim() } else { '' }

$targetVersion = if ($Version) { $Version.Trim() } else { Get-NextVersion -Current $currentVersion }

if ($targetVersion -notmatch '^\d{8}-\d+$') {
  throw "Formato inválido de versión: '$targetVersion'. Usa YYYYMMDD-N"
}

foreach ($f in $htmlFiles) {
  $raw = Get-Content $f.FullName -Raw -Encoding UTF8
  $updated = Update-AssetMeta -Html $raw -Ver $targetVersion
  $updated = Update-HtmlAssetUrls -Html $updated -Ver $targetVersion

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

Set-Content -Path $assetPath -Value $assetUpdated -Encoding UTF8

Write-Output "OK: asset-version actualizado a $targetVersion"
Write-Output "- HTML actualizados: $($htmlFiles.Count)"
Write-Output "- asset-version.json"
