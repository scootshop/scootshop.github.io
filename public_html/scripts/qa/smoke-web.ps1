param(
  [string]$BaseUrl = 'http://127.0.0.1:8083',
  [int]$TimeoutSec = 12,
  [switch]$IncludeApiRoutes
)

$ErrorActionPreference = 'Stop'

function Normalize-BaseUrl([string]$Url) {
  $v = [string]$Url
  if ([string]::IsNullOrWhiteSpace($v)) { return 'http://127.0.0.1:8083' }
  return $v.TrimEnd('/')
}

function Invoke-Check([string]$Url, [int]$Timeout) {
  try {
    $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $Timeout
    return [pscustomobject]@{
      Url = $Url
      Status = [int]$resp.StatusCode
      Ok = ([int]$resp.StatusCode -ge 200 -and [int]$resp.StatusCode -lt 400)
      Error = ''
    }
  }
  catch {
    $code = 0
    try {
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $code = [int]$_.Exception.Response.StatusCode
      }
    } catch {}
    return [pscustomobject]@{
      Url = $Url
      Status = $code
      Ok = $false
      Error = [string]$_.Exception.Message
    }
  }
}

function Get-SitemapPaths([string]$Root, [int]$Timeout) {
  $smUrl = "$Root/sitemap.xml"
  $sm = Invoke-Check -Url $smUrl -Timeout $Timeout
  if (-not $sm.Ok) {
    throw "No se pudo leer sitemap: $smUrl (status=$($sm.Status))"
  }

  $raw = (Invoke-WebRequest -Uri $smUrl -UseBasicParsing -TimeoutSec $Timeout).Content
  $matches = [regex]::Matches($raw, '<loc>(.*?)</loc>')
  $paths = New-Object System.Collections.Generic.HashSet[string]

  foreach ($m in $matches) {
    $loc = [string]$m.Groups[1].Value
    if ([string]::IsNullOrWhiteSpace($loc)) { continue }
    try {
      $uri = [uri]$loc
      $path = $uri.AbsolutePath
      if (-not [string]::IsNullOrWhiteSpace($uri.Query)) { $path += $uri.Query }
      if (-not [string]::IsNullOrWhiteSpace($path)) { [void]$paths.Add($path) }
    } catch {}
  }

  return @($paths)
}

$root = Normalize-BaseUrl -Url $BaseUrl

$critical = @(
  '/',
  '/cuenta/',
  '/checkout/',
  '/pago.html',
  '/pedido/',
  '/admin/pedidos.html',
  '/asset-version.json',
  '/js/index-head.js',
  '/js/index.js',
  '/data/products.js'
)

if ($IncludeApiRoutes) {
  $critical += @(
    '/api/index.php?route=auth_config',
    '/api/index.php?route=auth_status'
  )
}

$sitemapPaths = Get-SitemapPaths -Root $root -Timeout $TimeoutSec
$allPaths = New-Object System.Collections.Generic.HashSet[string]
foreach ($p in $critical) { [void]$allPaths.Add($p) }
foreach ($p in $sitemapPaths) { [void]$allPaths.Add($p) }

$targets = @($allPaths)
[array]::Sort($targets)

$failures = @()
foreach ($path in $targets) {
  $url = "$root$path"
  $r = Invoke-Check -Url $url -Timeout $TimeoutSec
  if (-not $r.Ok) {
    $failures += $r
  }
}

Write-Host "SMOKE_WEB_BASE=$root"
Write-Host "SMOKE_WEB_TARGETS=$($targets.Count)"
Write-Host "SMOKE_WEB_SITEMAP_URLS=$($sitemapPaths.Count)"

if ($failures.Count -gt 0) {
  Write-Host "SMOKE_WEB_FAILS=$($failures.Count)" -ForegroundColor Red
  $failures | Select-Object Url, Status, Error | Format-Table -AutoSize
  Write-Host 'SMOKE_WEB_KO' -ForegroundColor Red
  exit 1
}

Write-Host 'SMOKE_WEB_OK' -ForegroundColor Green
exit 0
