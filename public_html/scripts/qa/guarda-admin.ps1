# scripts/qa/guarda-admin.ps1
#
# Que TODA ruta admin_* exija credencial, la escriba quien la escriba.
#
# POR QUE EXISTE: las 32 rutas admin_* repetian la misma comprobacion dentro de cada
# `case`. Las 32 la tenian, asi que no habia agujero — habia una disciplina. Este
# guardian comprueba la GARANTIA que la sustituye: el prelude del router
# (require_admin(), llamado antes del switch), que protege tambien a la ruta 33
# aunque su autor olvide la comprobacion interior.
#
# Levanta un PHP propio en un puerto libre. No necesita base de datos: las rutas que
# se prueban responden 401 antes de tocarla, y `health` no la usa. Tampoco necesita
# la ADMIN_KEY de verdad: se inventa una solo para este proceso.
#
#   powershell -ExecutionPolicy Bypass -File scripts/qa/guarda-admin.ps1
#
# Marcadores:
#   GUARDA_ADMIN_OK        todo comprobado y correcto     (salida 0)
#   GUARDA_ADMIN_KO        alguna comprobacion falla      (salida 1)
#   GUARDA_ADMIN_OMITIDO   no se pudo levantar PHP        (salida 2)

$ErrorActionPreference = 'Continue'
$qa    = Split-Path -Parent $MyInvocation.MyCommand.Path
$raiz  = Split-Path -Parent (Split-Path -Parent $qa)

$php = (Get-Command php -ErrorAction SilentlyContinue)
if (-not $php) {
  Write-Host 'PHP no esta en el PATH: no se puede levantar el backend.'
  Write-Host 'GUARDA_ADMIN_OMITIDO'
  exit 2
}

# Puerto libre, para no chocar con un servidor local ya levantado.
$puerto = 8099
for ($p = 8099; $p -lt 8130; $p++) {
  $usado = $null
  try { $usado = (New-Object Net.Sockets.TcpClient).ConnectAsync('127.0.0.1', $p).Wait(120) } catch {}
  if (-not $usado) { $puerto = $p; break }
}

# DOCROOT TEMPORAL, y esto NO es un capricho: api/index.php llama a load_env_file(),
# que hace putenv() incondicional, asi que el .env real PISA cualquier variable de
# entorno que se le pase. Si se sirviera desde el arbol de verdad, la unica forma de
# probar «con credencial buena» seria leer la ADMIN_KEY real, y este guardian no la
# toca. Se copia api/index.php a una carpeta nueva con un .env inventado al lado.
$clave = 'qa-' + [guid]::NewGuid().ToString('N')
$tmp = Join-Path $env:TEMP ("ss-guarda-admin-" + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path (Join-Path $tmp 'api') -Force | Out-Null
Copy-Item (Join-Path $raiz 'api/index.php') (Join-Path $tmp 'api/index.php') -Force
@(
  "APP_ENV=local",
  "ADMIN_KEY=$clave",
  "PUBLIC_BASE=http://127.0.0.1:$puerto",
  "DB_HOST=127.0.0.1",
  "DB_NAME=no-existe-a-proposito",
  "DB_USER=qa",
  "DB_PASS=qa"
) | Set-Content -Path (Join-Path $tmp '.env') -Encoding utf8

$salida = Join-Path $env:TEMP "ss-guarda-admin-$puerto.log"
$proc = Start-Process -FilePath $php.Source `
  -ArgumentList @('-S', "127.0.0.1:$puerto", '-t', ('"' + $tmp + '"')) `
  -WorkingDirectory $tmp -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput $salida -RedirectStandardError "$salida.err"

# OJO: aqui manda Windows PowerShell 5.1, que NO tiene -SkipHttpErrorCheck. Un 401
# llega como excepcion, asi que el codigo se saca de $_.Exception.Response y no del
# resultado. Con -SkipHttpErrorCheck la llamada falla al enlazar el parametro y
# devuelve 0 siempre, que se lee como «el servidor no responde».
function Pedir([string]$Ruta, [hashtable]$Cabeceras) {
  $url = "http://127.0.0.1:$puerto/api/index.php?route=$Ruta"
  try {
    $r = Invoke-WebRequest -Uri $url -Headers $Cabeceras -UseBasicParsing -TimeoutSec 10
    return [pscustomobject]@{ Code = [int]$r.StatusCode; Body = [string]$r.Content }
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp) { return [pscustomobject]@{ Code = [int]$resp.StatusCode; Body = '' } }
    return [pscustomobject]@{ Code = 0; Body = $_.Exception.Message }
  } catch {
    return [pscustomobject]@{ Code = 0; Body = $_.Exception.Message }
  }
}

# Esperar a que conteste
$vivo = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 250
  $h = Pedir 'health' @{}
  if ($h.Code -gt 0) { $vivo = $true; break }
}

if (-not $vivo) {
  Write-Host 'El PHP local no ha llegado a responder.'
  if (Test-Path "$salida.err") { Get-Content "$salida.err" -Tail 5 | ForEach-Object { Write-Host "  $_" } }
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host 'GUARDA_ADMIN_OMITIDO'
  exit 2
}

$fallos = @()
function Comprobar([string]$Que, [bool]$Bien, [string]$Visto) {
  if ($Bien) { Write-Host "  OK   $Que" }
  else { Write-Host "  MAL  $Que  -> $Visto"; $script:fallos += $Que }
}

Write-Host ''
Write-Host "PHP local en 127.0.0.1:$puerto"
Write-Host ''

# 1. Una ruta PUBLICA no pide credencial: se comporta igual que antes.
$r = Pedir 'health' @{}
Comprobar 'ruta publica (health) sin credencial responde 200' ($r.Code -eq 200) "$($r.Code)"

$r = Pedir 'auth_config' @{}
Comprobar 'ruta publica (auth_config) sin credencial responde 200' ($r.Code -eq 200) "$($r.Code)"

# 2. TODAS las rutas admin_* del switch, sin credencial -> 401. Se sacan del propio
#    PHP en vez de escribirlas a mano: asi una ruta nueva entra en la prueba sola.
$fuente = Get-Content (Join-Path $raiz 'api/index.php') -Raw
$rutasAdmin = [regex]::Matches($fuente, "case '(admin_[a-z0-9_]+)'") |
  ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
Write-Host ("  ... " + $rutasAdmin.Count + " rutas admin_* encontradas en el switch")
$sinGuarda = @()
foreach ($ruta in $rutasAdmin) {
  $r = Pedir $ruta @{}
  if ($r.Code -ne 401) { $sinGuarda += ($ruta + ' -> ' + $r.Code) }
}
Comprobar ("las " + $rutasAdmin.Count + " rutas admin_* SIN credencial responden 401") ($sinGuarda.Count -eq 0) ($sinGuarda -join ', ')

# 3. Ruta admin con credencial MALA -> 401
$r = Pedir 'admin_status' @{ 'x-admin-key' = 'clave-que-no-es' }
Comprobar 'admin_status con credencial MALA responde 401' ($r.Code -eq 401) "$($r.Code)"

# 4. Ruta admin con credencial BUENA -> pasa la autenticacion (ya no es 401)
$r = Pedir 'admin_status' @{ 'x-admin-key' = $clave }
Comprobar 'admin_status con credencial BUENA pasa la autenticacion (no 401)' ($r.Code -ne 401) "$($r.Code)"

# 5. LO IMPORTANTE: una ruta admin_* que NO EXISTE en el switch tambien queda
#    protegida. Es el caso de la «ruta 33»: si el prelude no estuviera, el switch
#    caeria en su `default` y contestaria otra cosa sin pedir nada.
$r = Pedir 'admin_ruta_que_no_existe_todavia' @{}
Comprobar 'ruta admin_* INEXISTENTE sin credencial responde 401 (la ruta 33)' ($r.Code -eq 401) "$($r.Code)"

$r = Pedir 'admin_ruta_que_no_existe_todavia' @{ 'x-admin-key' = $clave }
Comprobar 'ruta admin_* INEXISTENTE con credencial pasa la guarda' ($r.Code -ne 401) "$($r.Code)"

# 6. Una ruta que EMPIEZA parecido pero no es admin_ no debe quedar protegida.
$r = Pedir 'administrativo_falso' @{}
Comprobar 'ruta que no es admin_* no queda protegida por error' ($r.Code -ne 401) "$($r.Code)"

if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
Remove-Item $salida, "$salida.err" -ErrorAction SilentlyContinue
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ''
if ($fallos.Count -gt 0) {
  Write-Host ("GUARDA_ADMIN_KO  " + $fallos.Count + " fallo(s)")
  exit 1
}
Write-Host 'GUARDA_ADMIN_OK'
exit 0
