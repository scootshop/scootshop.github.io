$ErrorActionPreference='Stop'
$base='http://127.0.0.1:8083/api/index.php?route='
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Post-Json($route,$payload,$webSession=$null){
  $uri = $base + $route
  $json = $payload | ConvertTo-Json -Depth 12
  try {
    if($webSession){
      $resp = Invoke-WebRequest -WebSession $webSession -Uri $uri -Method Post -ContentType 'application/json' -Body $json -UseBasicParsing
    } else {
      $resp = Invoke-WebRequest -Uri $uri -Method Post -ContentType 'application/json' -Body $json -UseBasicParsing
    }
    [pscustomobject]@{ status=[int]$resp.StatusCode; data=($resp.Content | ConvertFrom-Json) }
  } catch {
    if($_.Exception.Response){
      $r = $_.Exception.Response
      $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
      $body = $sr.ReadToEnd()
      $parsed = $null
      try { $parsed = $body | ConvertFrom-Json } catch { $parsed = [pscustomobject]@{ raw=$body } }
      [pscustomobject]@{ status=[int]$r.StatusCode; data=$parsed }
    } else {
      [pscustomobject]@{ status=-1; data=[pscustomobject]@{ error=$_.Exception.Message } }
    }
  }
}

# Auth dev session
$login = Post-Json 'auth_dev_login' @{ email='qa@example.com'; name='QA Runtime'; picture=''; provider='dev' } $session

# B1 cases
$b1 = @()

$c1 = Post-Json 'order_pricing_preview' @{ sku='M41TANK'; currency='EUR'; payment_method='bank'; discount_code=''; frontend_base_amount='530.00'; shipping_amount='0.00'; cart_items=@() }
$exp1 = @{ subtotal='530.00'; discount='0.00'; shipping='0.00'; fee='0.00'; total='530.00' }
$b1 += [pscustomobject]@{ case='B1-1'; expected=$exp1; got=$c1.data }

$c2 = Post-Json 'order_pricing_preview' @{ sku='M41TANK'; currency='EUR'; payment_method='card'; discount_code='QA10'; frontend_base_amount='530.00'; shipping_amount='0.00'; cart_items=@() }
$exp2 = @{ subtotal='530.00'; discount='53.00'; shipping='0.00'; fee='4.54'; total='481.54' }
$b1 += [pscustomobject]@{ case='B1-2'; expected=$exp2; got=$c2.data }

$cartA = @(@{sku='M41TANK';qty=1}, @{sku='G2';qty=2})
$c3 = Post-Json 'order_pricing_preview' @{ sku='M41TANK'; currency='EUR'; payment_method='bank'; discount_code=''; frontend_base_amount='1290.00'; shipping_amount='0.00'; cart_items=$cartA }
$exp3 = @{ subtotal='1290.00'; discount='0.00'; shipping='0.00'; fee='0.00'; total='1290.00' }
$b1 += [pscustomobject]@{ case='B1-3'; expected=$exp3; got=$c3.data }

$c4 = Post-Json 'order_pricing_preview' @{ sku='M41TANK'; currency='EUR'; payment_method='card'; discount_code='QA10'; frontend_base_amount='1290.00'; shipping_amount='0.00'; cart_items=$cartA }
$exp4 = @{ subtotal='1290.00'; discount='129.00'; shipping='0.00'; fee='10.70'; total='1171.70' }
$b1 += [pscustomobject]@{ case='B1-4'; expected=$exp4; got=$c4.data }

$c5 = Post-Json 'order_pricing_preview' @{ sku='M41TANK'; currency='EUR'; payment_method='card'; discount_code=''; frontend_base_amount='530.00'; shipping_amount='0.00'; cart_items=@() }
$exp5 = @{ subtotal='530.00'; discount='0.00'; shipping='0.00'; fee='4.97'; total='534.97' }
$b1 += [pscustomobject]@{ case='B1-5'; expected=$exp5; got=$c5.data }

# B2 pending order create + resume idempotency
$create1 = Post-Json 'manual_order_create' @{
  sku='M41TANK'; name='M41 Tank Ultimate 1000W'; price='530.00'; currency='eur';
  paymentMethod='bank'; discount_code=''; frontend_base_amount='530.00'; shipping_amount='0.00';
  shipping=@{ fullName='QA Runtime'; email='qa@example.com'; phone='600000001'; addressLine1='Calle QA 1'; city='Valencia'; postalCode='46001'; country='Spain' }
} $session
$orderA = $create1.data.orderId
$resume1 = Post-Json 'orders_resume_payment' @{ orderId=$orderA } $session
$resume2 = Post-Json 'orders_resume_payment' @{ orderId=$orderA } $session

# cart pending order for cart=1 check
$createCart = Post-Json 'manual_order_create' @{
  sku='M41TANK'; name='Carrito SCOOT SHOP (3 articulos)'; price='1290.00'; currency='eur';
  paymentMethod='bank'; discount_code='QA10'; frontend_base_amount='1290.00'; shipping_amount='0.00';
  cart_items=@(@{sku='M41TANK';qty=1}, @{sku='G2';qty=2});
  shipping=@{ fullName='QA Runtime'; email='qa@example.com'; phone='600000001'; addressLine1='Calle QA 1'; city='Valencia'; postalCode='46001'; country='Spain' }
} $session
$orderCart = $createCart.data.orderId
$resumeCart = Post-Json 'orders_resume_payment' @{ orderId=$orderCart } $session

# method change without duplicate: reuse existingOrderId (bank -> bizum)
$createMethodReuse = Post-Json 'manual_order_create' @{
  sku='M41TANK'; name='M41 Tank Ultimate 1000W'; price='534.97'; currency='eur';
  paymentMethod='bizum'; discount_code=''; frontend_base_amount='530.00'; shipping_amount='0.00';
  existingOrderId=$orderA;
  shipping=@{ fullName='QA Runtime'; email='qa@example.com'; phone='600000001'; addressLine1='Calle QA 1'; city='Valencia'; postalCode='46001'; country='Spain' }
} $session

# paid order cannot resume
$envLines = Get-Content .env.local
$h=($envLines|Where-Object{$_ -match '^DB_HOST='}|Select-Object -First 1).Split('=')[1]
$p=($envLines|Where-Object{$_ -match '^DB_PORT='}|Select-Object -First 1).Split('=')[1]
$db=($envLines|Where-Object{$_ -match '^DB_NAME='}|Select-Object -First 1).Split('=')[1]
$u=($envLines|Where-Object{$_ -match '^DB_USER='}|Select-Object -First 1).Split('=')[1]
$pw=($envLines|Where-Object{$_ -match '^DB_PASS='}|Select-Object -First 1).Split('=')[1]
$sqlPaid = "UPDATE orders SET status='paid', updated_at=NOW() WHERE id='${orderA}' LIMIT 1; SELECT id,status,payment_method,total_amount FROM orders WHERE id='${orderA}' LIMIT 1;"
$paidState = & 'C:\Program Files\MariaDB 12.2\bin\mariadb.exe' --host=$h --port=$p --user=$u --password=$pw --database=$db --batch --skip-column-names --execute=$sqlPaid

$resumePaidStatus = $null
$resumePaidBody = $null
try {
  $rp = Invoke-WebRequest -WebSession $session -Uri ($base + 'orders_resume_payment') -Method Post -ContentType 'application/json' -Body (@{orderId=$orderA}|ConvertTo-Json) -UseBasicParsing
  $resumePaidStatus = [int]$rp.StatusCode
  $resumePaidBody = $rp.Content
} catch {
  if($_.Exception.Response){
    $r=$_.Exception.Response
    $sr=New-Object System.IO.StreamReader($r.GetResponseStream())
    $resumePaidStatus=[int]$r.StatusCode
    $resumePaidBody=$sr.ReadToEnd()
  } else {
    $resumePaidStatus=-1
    $resumePaidBody=$_.Exception.Message
  }
}

# Duplicate check in DB
$sqlDup = "SELECT id,payment_method,status,total_amount,updated_at FROM orders WHERE id IN ('${orderA}','${orderCart}') ORDER BY id; SELECT COUNT(*) AS rows_for_orderA FROM orders WHERE id='${orderA}';"
$dupOut = & 'C:\Program Files\MariaDB 12.2\bin\mariadb.exe' --host=$h --port=$p --user=$u --password=$pw --database=$db --batch --skip-column-names --execute=$sqlDup

# B3 normalization parity (account/pedido/admin)
function NormAccount($v){ $raw = ($v+'').Trim().ToLower(); if(@('paid','approved','complete','completed','pagado') -contains $raw){'paid'} elseif(@('pending','pending_payment') -contains $raw){'pending_payment'} elseif(@('processing','preparing') -contains $raw){'processing'} elseif(@('shipped','shipping') -contains $raw){'shipped'} elseif($raw -eq 'delivered'){'delivered'} elseif(@('cancelled','canceled','failed','denied') -contains $raw){'cancelled'} elseif($raw -eq 'error'){'error'} else { if($raw){$raw}else{'pending_payment'} } }
function NormPedido($v){ $raw = ($v+'').Trim().ToLower(); if(@('paid','approved','complete','completed','pagado') -contains $raw){'paid'} elseif(@('pending','pending_payment') -contains $raw){'pending_payment'} elseif(@('processing','preparing') -contains $raw){'processing'} elseif(@('shipped','shipping') -contains $raw){'shipped'} elseif($raw -eq 'delivered'){'delivered'} elseif(@('cancelled','canceled','failed','denied') -contains $raw){'cancelled'} else { if($raw){$raw}else{'pending_payment'} } }
function NormAdmin($v){ $raw = ($v+'').Trim().ToLower(); if(@('paid','approved','complete','completed','pagado') -contains $raw){'paid'} elseif(@('pending','pending_payment') -contains $raw){'pending_payment'} elseif(@('processing','preparing') -contains $raw){'preparing'} elseif(@('shipped','shipping') -contains $raw){'shipped'} elseif($raw -eq 'delivered'){'delivered'} elseif(@('cancelled','canceled','failed','denied') -contains $raw){'canceled'} else { if($raw){$raw}else{'pending_payment'} } }
$aliases=@('pending_payment','pending','paid','approved','completed','processing','preparing','shipped','delivered','cancelled','canceled')
$normRows = foreach($a in $aliases){ [pscustomobject]@{ received=$a; account=NormAccount $a; pedido=NormPedido $a; admin=NormAdmin $a } }

$result = [pscustomobject]@{
  login=$login
  B1=$b1
  B2=[pscustomobject]@{
    create1=$create1; resume1=$resume1; resume2=$resume2;
    createCart=$createCart; resumeCart=$resumeCart;
    createMethodReuse=$createMethodReuse;
    resumePaid=[pscustomobject]@{status=$resumePaidStatus; body=$resumePaidBody};
    paidState=$paidState; dupCheck=$dupOut
  }
  B3=$normRows
}
$result | ConvertTo-Json -Depth 18
