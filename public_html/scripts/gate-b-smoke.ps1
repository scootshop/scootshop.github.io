param(
  [string]$BaseUrl = 'http://127.0.0.1:8083',
  [switch]$RunE2E = $true
)

$ErrorActionPreference = 'Stop'

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

function Post-Json([string]$route, $payload, $webSession=$null){
  $uri = "$BaseUrl/api/index.php?route=$route"
  $json = $payload | ConvertTo-Json -Depth 20
  try {
    if($webSession){
      $resp = Invoke-WebRequest -WebSession $webSession -Uri $uri -Method Post -ContentType 'application/json' -Body $json -UseBasicParsing
    } else {
      $resp = Invoke-WebRequest -Uri $uri -Method Post -ContentType 'application/json' -Body $json -UseBasicParsing
    }
    $parsed = $null
    try { $parsed = $resp.Content | ConvertFrom-Json } catch { $parsed = [pscustomobject]@{ raw = $resp.Content } }
    return [pscustomobject]@{ status=[int]$resp.StatusCode; data=$parsed }
  } catch {
    if($_.Exception.Response){
      $r = $_.Exception.Response
      $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
      $body = $sr.ReadToEnd()
      $parsed = $null
      try { $parsed = $body | ConvertFrom-Json } catch { $parsed = [pscustomobject]@{ raw = $body } }
      return [pscustomobject]@{ status=[int]$r.StatusCode; data=$parsed }
    }
    return [pscustomobject]@{ status=-1; data=[pscustomobject]@{ error=$_.Exception.Message } }
  }
}

function Add-Result($name, [bool]$ok, [string]$detail){
  $script:results += [pscustomobject]@{ test=$name; ok=$ok; detail=$detail }
  if($ok){ Write-Host "OK  - $name - $detail" -ForegroundColor Green }
  else { Write-Host "KO  - $name - $detail" -ForegroundColor Red }
}

function To-Number($v){
  try { return [double]([string]$v).Replace(',','.') } catch { return [double]::NaN }
}

$results = @()
$envPath = '.env.local'
if(-not (Test-Path $envPath)){ Add-Result 'Precheck .env.local' $false '.env.local no existe'; Write-Host 'GATE_B_KO'; exit 1 }
$envMap = Read-DotEnv $envPath
$dbHost = [string]$envMap['DB_HOST']
$dbPort = [string]$envMap['DB_PORT']
$dbName = [string]$envMap['DB_NAME']
$dbUser = [string]$envMap['DB_USER']
$dbPass = [string]$envMap['DB_PASS']

if($envMap['APP_ENV'] -ne 'local'){
  Add-Result 'Precheck APP_ENV' $false "APP_ENV=$($envMap['APP_ENV'])"
  Write-Host 'GATE_B_KO'
  exit 1
}

$mariadbClient = 'C:\Program Files\MariaDB 12.2\bin\mariadb.exe'
if(-not (Test-Path $mariadbClient)){
  Add-Result 'Precheck MariaDB client' $false 'No se encontro mariadb.exe'
  Write-Host 'GATE_B_KO'
  exit 1
}

# Seed aliases (B3)
$seedSql = 'scripts/qa/seed_alias_orders.sql'
if(Test-Path $seedSql){
  & $mariadbClient "--host=$dbHost" "--port=$dbPort" "--user=$dbUser" "--password=$dbPass" "--database=$dbName" --batch --skip-column-names "--execute=$(Get-Content $seedSql -Raw)" | Out-Null
  Add-Result 'B3 seed aliases' ($LASTEXITCODE -eq 0) 'seed_alias_orders aplicado'
} else {
  Add-Result 'B3 seed aliases' $false 'Falta scripts/qa/seed_alias_orders.sql'
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = Post-Json 'auth_dev_login' @{ email='qa@example.com'; name='QA Runtime'; provider='dev' } $session
Add-Result 'Auth dev login' (($login.status -eq 200) -and $login.data.ok) "status=$($login.status)"

$skuMain = 'G2PRO'
$skuCart = 'KG2'

# B1 cases
$c1 = Post-Json 'order_pricing_preview' @{ sku=$skuMain; currency='EUR'; payment_method='bank'; discount_code=''; frontend_base_amount='550.00'; shipping_amount='0.00'; cart_items=@() }
$ok1 = $c1.status -eq 200 -and $c1.data.ok -and (To-Number $c1.data.total_amount) -eq 550
Add-Result 'B1 simple sin descuento' $ok1 ("total=" + [string]$c1.data.total_amount)

# Upsert QA10 en storage real de descuentos
$qa10Sql = @"
INSERT INTO discount_codes
(code,code_normalized,name,description,discount_type,discount_value,currency,active,starts_at,ends_at,max_redemptions,max_redemptions_per_email,min_order_amount,applies_to,stackable,deleted_at,created_at,updated_at)
VALUES
('QA10','QA10','QA 10%','QA smoke code','percent',10,'EUR',1,DATE_SUB(NOW(),INTERVAL 2 DAY),DATE_ADD(NOW(),INTERVAL 30 DAY),NULL,1,NULL,'all',0,NULL,NOW(),NOW())
ON DUPLICATE KEY UPDATE
code=VALUES(code),code_normalized='QA10',name=VALUES(name),description=VALUES(description),discount_type='percent',discount_value=10,currency='EUR',active=1,
starts_at=DATE_SUB(NOW(),INTERVAL 2 DAY),ends_at=DATE_ADD(NOW(),INTERVAL 30 DAY),max_redemptions=NULL,max_redemptions_per_email=1,min_order_amount=NULL,
applies_to='all',stackable=0,deleted_at=NULL,updated_at=NOW();
"@
& $mariadbClient "--host=$dbHost" "--port=$dbPort" "--user=$dbUser" "--password=$dbPass" "--database=$dbName" --batch --skip-column-names "--execute=$qa10Sql" | Out-Null
$qa10UpsertOk = ($LASTEXITCODE -eq 0)

$qa10CountSql = "SELECT COUNT(*) FROM discount_codes WHERE code_normalized='QA10' AND active=1 AND deleted_at IS NULL;"
$qa10CountRaw = & $mariadbClient "--host=$dbHost" "--port=$dbPort" "--user=$dbUser" "--password=$dbPass" "--database=$dbName" --batch --skip-column-names "--execute=$qa10CountSql"
$qa10Count = 0
try { $qa10Count = [int]([string]$qa10CountRaw).Trim() } catch { $qa10Count = 0 }
Add-Result 'B1 QA10 available' ($qa10UpsertOk -and $qa10Count -ge 1) "upsert=$qa10UpsertOk rows=$qa10Count"

$c2 = Post-Json 'order_pricing_preview' @{ sku=$skuMain; currency='EUR'; payment_method='card'; discount_code='QA10'; frontend_base_amount='550.00'; shipping_amount='0.00'; cart_items=@() }
$ok2 = $c2.status -eq 200 -and $c2.data.ok -and (To-Number $c2.data.discount_amount) -gt 0 -and (To-Number $c2.data.total_amount) -lt (To-Number $c2.data.subtotal_amount)
Add-Result 'B1 simple con QA10' $ok2 ("discount=" + [string]$c2.data.discount_amount)

$cart = @(@{sku=$skuMain;qty=1}, @{sku=$skuCart;qty=2})
$c3 = Post-Json 'order_pricing_preview' @{ sku=$skuMain; currency='EUR'; payment_method='bank'; discount_code=''; frontend_base_amount='1528.00'; shipping_amount='0.00'; cart_items=$cart }
$ok3 = $c3.status -eq 200 -and $c3.data.ok -and (To-Number $c3.data.total_amount) -eq 1528
Add-Result 'B1 carrito sin descuento' $ok3 ("total=" + [string]$c3.data.total_amount)

$c4 = Post-Json 'order_pricing_preview' @{ sku=$skuMain; currency='EUR'; payment_method='card'; discount_code='QA10'; frontend_base_amount='1528.00'; shipping_amount='0.00'; cart_items=$cart }
$ok4 = $c4.status -eq 200 -and $c4.data.ok -and (To-Number $c4.data.discount_amount) -gt 0 -and (To-Number $c4.data.total_amount) -lt (To-Number $c4.data.subtotal_amount)
Add-Result 'B1 carrito con QA10' $ok4 ("discount=" + [string]$c4.data.discount_amount)

$c5 = Post-Json 'order_pricing_preview' @{ sku=$skuMain; currency='EUR'; payment_method='card'; discount_code=''; frontend_base_amount='550.00'; shipping_amount='0.00'; cart_items=@() }
$ok5 = $c5.status -eq 200 -and $c5.data.ok -and (To-Number $c5.data.payment_fee_amount) -gt 0
Add-Result 'B1 metodo con comision' $ok5 ("fee=" + [string]$c5.data.payment_fee_amount)

# B2 resume + idempotency
$create1 = Post-Json 'manual_order_create' @{
  sku=$skuMain; name='KUKIRIN G2 PRO'; price='550.00'; currency='eur';
  paymentMethod='bank'; discount_code=''; frontend_base_amount='550.00'; shipping_amount='0.00';
  shipping=@{ fullName='QA Runtime'; email='qa@example.com'; phone='600000001'; addressLine1='Calle QA 1'; city='Valencia'; postalCode='46001'; country='Spain' }
} $session

$orderA = [string]$create1.data.orderId
$okCreate = ($create1.status -eq 200) -and $create1.data.ok -and -not [string]::IsNullOrWhiteSpace($orderA)
Add-Result 'B2 create pending order' $okCreate "order=$orderA"

$resume1 = Post-Json 'orders_resume_payment' @{ orderId=$orderA } $session
$resume2 = Post-Json 'orders_resume_payment' @{ orderId=$orderA } $session
$okResume1 = ($resume1.status -eq 200) -and $resume1.data.ok -and -not [string]::IsNullOrWhiteSpace([string]$resume1.data.paymentUrl)
$okResume2 = ($resume2.status -eq 200) -and $resume2.data.ok -and ([string]$resume2.data.orderId -eq $orderA)
Add-Result 'B2 resume payment' $okResume1 ("status=" + $resume1.status)
Add-Result 'B2 doble reintento/idempotencia' $okResume2 ("order1=$orderA order2=$($resume2.data.orderId)")

# Paid order cannot resume
$sqlPaid = "UPDATE orders SET status='paid', updated_at=NOW() WHERE id='${orderA}' LIMIT 1;"
& $mariadbClient "--host=$dbHost" "--port=$dbPort" "--user=$dbUser" "--password=$dbPass" "--database=$dbName" --batch --skip-column-names "--execute=$sqlPaid" | Out-Null

$resumePaid = Post-Json 'orders_resume_payment' @{ orderId=$orderA } $session
$rpErr = [string]$resumePaid.data.error
$okPaidBlock = (($resumePaid.status -eq 409) -or ($resumePaid.status -eq 200 -and -not $resumePaid.data.ok)) -and (($rpErr -match 'not_pending_payment') -or ($rpErr -match 'Order not pending payment'))
Add-Result 'B2 bloqueo pedido pagado' $okPaidBlock ("status=$($resumePaid.status) error=$rpErr")

# B3 aliases check
$sqlB3 = "SELECT COUNT(*) FROM orders WHERE id LIKE 'QA-ALIAS-%';"
$aliasCount = & $mariadbClient "--host=$dbHost" "--port=$dbPort" "--user=$dbUser" "--password=$dbPass" "--database=$dbName" --batch --skip-column-names "--execute=$sqlB3"
$aliasN = 0
try { $aliasN = [int]([string]$aliasCount).Trim() } catch { $aliasN = 0 }
Add-Result 'B3 aliases de estados' ($aliasN -ge 10) "rows=$aliasN"

# E2E minimo
if($RunE2E){
  try {
    $respPedido = Invoke-WebRequest -Uri "$BaseUrl/pedido/?order=QA-ALIAS-APPROVED" -UseBasicParsing -TimeoutSec 10
    $okE2E = ([int]$respPedido.StatusCode -eq 200)
    Add-Result 'E2E minimo pedido' $okE2E ("status=$($respPedido.StatusCode)")
  } catch {
    Add-Result 'E2E minimo pedido' $false $_.Exception.Message
  }
}

$blockingFailures = $results | Where-Object { -not $_.ok }
$allOk = -not $blockingFailures
$results | ConvertTo-Json -Depth 8 | Set-Content -Path 'tmp/gate-b-smoke-result.json' -Encoding UTF8

if($allOk){
  Write-Host 'GATE_B_OK' -ForegroundColor Green
  exit 0
}

Write-Host 'GATE_B_KO' -ForegroundColor Red
exit 1
