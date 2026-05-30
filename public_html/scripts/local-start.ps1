param(
  [int]$DbPort = 3307,
  [int]$ApiPort = 8083,
  [string]$BindHost = '127.0.0.1',
  [string]$MariaDbConfig = 'scripts/qa/mariadb-local.cnf',
  [string]$ApiLog = 'tmp/local-api.log',
  [string]$DbLog = 'tmp/local-db.log'
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message){
  Write-Host "KO: $Message" -ForegroundColor Red
  exit 1
}

function Read-DotEnv([string]$Path){
  $map = @{}
  Get-Content -Path $Path | ForEach-Object {
    $line = [string]$_
    if([string]::IsNullOrWhiteSpace($line)){ return }
    if($line.TrimStart().StartsWith('#')){ return }
    $idx = $line.IndexOf('=')
    if($idx -lt 1){ return }
    $k = $line.Substring(0,$idx).Trim()
    $v = $line.Substring($idx+1).Trim().Trim('"').Trim("'")
    $map[$k] = $v
  }
  return $map
}

function Test-MariaDbHealth($clientExe, $envMap){
  $dbHost = [string]$envMap['DB_HOST']
  $dbPort = [string]$envMap['DB_PORT']
  $dbName = [string]$envMap['DB_NAME']
  $dbUser = [string]$envMap['DB_USER']
  $dbPass = [string]$envMap['DB_PASS']
  try {
    $null = & $clientExe "--host=$dbHost" "--port=$dbPort" "--user=$dbUser" "--password=$dbPass" "--database=$dbName" --batch --skip-column-names "--execute=SELECT 1;" 2>$null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Test-ApiHealth([string]$Base){
  try {
    $resp = Invoke-WebRequest -Uri "$Base/api/index.php?route=auth_status" -Method Post -ContentType 'application/json' -Body '{}' -UseBasicParsing -TimeoutSec 6
    return ([int]$resp.StatusCode -eq 200)
  } catch {
    return $false
  }
}

$envPath = '.env.local'
if(-not (Test-Path $envPath)){ Fail '.env.local no existe.' }

$phpCmd = Get-Command php -ErrorAction SilentlyContinue
if(-not $phpCmd){ Fail 'PHP no esta disponible en PATH.' }

$envMap = Read-DotEnv $envPath
$required = @('DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASS','APP_ENV','ALLOW_DEV_AUTH','ALLOW_PREVIEW_MODE','PUBLIC_BASE')
foreach($k in $required){
  if(-not $envMap.ContainsKey($k) -or [string]::IsNullOrWhiteSpace([string]$envMap[$k])){
    Fail "Falta variable requerida en .env.local: $k"
  }
}

if([int]$envMap['DB_PORT'] -ne $DbPort){
  Fail "DB_PORT en .env.local ($($envMap['DB_PORT'])) no coincide con puerto esperado ($DbPort)."
}

$mariadbdExe = 'C:\Program Files\MariaDB 12.2\bin\mariadbd.exe'
$mariadbClient = 'C:\Program Files\MariaDB 12.2\bin\mariadb.exe'
if(-not (Test-Path $mariadbdExe)){ Fail "No se encontro mariadbd.exe en: $mariadbdExe" }
if(-not (Test-Path $mariadbClient)){ Fail "No se encontro mariadb.exe en: $mariadbClient" }
if(-not (Test-Path $MariaDbConfig)){ Fail "No existe archivo de config MariaDB: $MariaDbConfig" }

$dbSocket = Get-NetTCPConnection -LocalPort $DbPort -ErrorAction SilentlyContinue
if($dbSocket){
  if(-not (Test-MariaDbHealth $mariadbClient $envMap)){
    Fail "Puerto $DbPort ocupado pero MariaDB no responde healthcheck."
  }
  Write-Host "DB OK (ya escuchando en $DbPort)." -ForegroundColor Green
} else {
  New-Item -ItemType Directory -Path 'tmp' -Force | Out-Null
  $dbProc = Start-Process -FilePath $mariadbdExe -ArgumentList "--defaults-file=$MariaDbConfig" -PassThru -WindowStyle Hidden -RedirectStandardOutput $DbLog -RedirectStandardError $DbLog
  if(-not $dbProc){ Fail 'No se pudo iniciar mariadbd.' }

  $ok = $false
  for($i=0; $i -lt 15; $i++){
    Start-Sleep -Milliseconds 500
    if(Test-MariaDbHealth $mariadbClient $envMap){ $ok = $true; break }
  }
  if(-not $ok){ Fail 'MariaDB no responde tras arranque.' }
  Write-Host "DB OK (iniciada en $DbPort, PID $($dbProc.Id))." -ForegroundColor Green
}

$base = "http://$BindHost`:$ApiPort"
$apiSocket = Get-NetTCPConnection -LocalPort $ApiPort -ErrorAction SilentlyContinue
if($apiSocket){
  if(-not (Test-ApiHealth $base)){
    Fail "Puerto $ApiPort ocupado pero API PHP no responde healthcheck."
  }
  Write-Host "API OK (ya escuchando en $ApiPort)." -ForegroundColor Green
} else {
  New-Item -ItemType Directory -Path 'tmp' -Force | Out-Null
  $apiProc = Start-Process -FilePath $phpCmd.Source -ArgumentList @('-S',"$BindHost`:$ApiPort",'-t','.') -PassThru -WindowStyle Hidden -RedirectStandardOutput $ApiLog -RedirectStandardError $ApiLog
  if(-not $apiProc){ Fail 'No se pudo iniciar API PHP.' }

  $okApi = $false
  for($i=0; $i -lt 15; $i++){
    Start-Sleep -Milliseconds 500
    if(Test-ApiHealth $base){ $okApi = $true; break }
  }
  if(-not $okApi){ Fail 'API PHP no responde tras arranque.' }
  Write-Host "API OK (iniciada en $ApiPort, PID $($apiProc.Id))." -ForegroundColor Green
}

if($envMap['APP_ENV'] -ne 'local'){ Fail "APP_ENV no es local (valor: $($envMap['APP_ENV']))." }

Write-Host "Variables clave: APP_ENV=$($envMap['APP_ENV']) ALLOW_DEV_AUTH=$($envMap['ALLOW_DEV_AUTH']) ALLOW_PREVIEW_MODE=$($envMap['ALLOW_PREVIEW_MODE']) PUBLIC_BASE=$($envMap['PUBLIC_BASE'])" -ForegroundColor Cyan
Write-Host 'LOCAL_START_OK' -ForegroundColor Green
