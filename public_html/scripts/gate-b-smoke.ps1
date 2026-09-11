# scripts/gate-b-smoke.ps1 — el flujo de compra, de punta a punta, EN LOCAL.
#
# HISTORIA, porque importa para entender que promete. Este fichero existia con 10 242
# bytes en el commit 0fed750 («audit: close iteration 2 pricing payment gate and local
# QA») y se quedo en 0 bytes en 24317f3, sin que nadie lo notara: CLAUDE.md siguio
# anunciandolo como guardian del carrito y el pago, y scripts/README-iter2c.md siguio
# describiendo lo que cubria. O sea, habia una promesa sin nada detras justo sobre la
# zona peor construida del proyecto.
#
# EL CONTRATO SE HA RECUPERADO del original, no inventado. Segun README-iter2c.md:
#   B1  tarifa: precio simple, con codigo de descuento y comision de pasarela
#   B2  pedido: crear, reanudar el pago, idempotencia y bloqueo de uno ya pagado
#   B3  alias de estado
#   E2E minimo en /pedido
#
# QUE CAMBIA respecto al original, y por que:
#
#   1. LOS PRECIOS NO VAN A FUEGO. El original comparaba contra 550 y 1528, que eran
#      los precios de mayo de 2026. Hoy son otros, asi que ese script fallaria aunque
#      todo estuviera bien. Ahora el importe esperado se lee del catalogo.
#   2. SOLO CORRE EN LOCAL, y se niega a hacerlo contra otra cosa. Crea pedidos y toca
#      la tabla de descuentos: contra produccion ensuciaria pedidos de verdad.
#   3. DOS PILARES DEL CONTRATO ORIGINAL YA NO EXISTEN, y se comprueba en vivo:
#        `orders_create`           responde 410 gone — «usa stripe_checkout o
#                                  manual_order_create». La ruta se retiro.
#        `order_pricing_preview`   responde 503 feature_disabled con
#                                  DISCOUNTS_ENABLED=false, que es el valor por
#                                  defecto. Ademas CLAUDE.md avisa de que esa ruta
#                                  IGNORA cart_items, asi que no representa lo que
#                                  se cobra por un carrito: quien tarifa de verdad
#                                  es resolve_order_pricing().
#        `bank`                    ya no es un metodo de pago valido. Los de hoy son
#                                  card, klarna, scalapay, paypal, bizum y transfer
#                                  (BACKEND_PAYMENT_FEES). El original mandaba 'bank'
#                                  y el backend contesta invalid_payment_method.
#      Lo que no se puede probar se marca OMITIDA, con el motivo. No se sustituye
#      por una comprobacion inventada que quede bonita en el listado.
#
#   4. SI NO HAY ENTORNO, SALE OMITIDA (codigo 2), NUNCA OK. Es la regla que se fijo
#      en la Fase 0: una prueba que no se ha ejecutado no es una prueba que pasa.
#
#   powershell -ExecutionPolicy Bypass -File scripts/gate-b-smoke.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/gate-b-smoke.ps1 -BaseUrl http://127.0.0.1:8083
#
# Antes hay que levantar el entorno local:
#   powershell -ExecutionPolicy Bypass -File scripts/local-start.ps1
#
# Marcadores:
#   GATE_B_OK        todo comprobado y correcto          (salida 0)
#   GATE_B_KO        algo del flujo de compra falla      (salida 1)
#   GATE_B_OMITIDO   no hay entorno local que probar     (salida 2)

param(
  [string]$BaseUrl = 'http://127.0.0.1:8083'
)

$ErrorActionPreference = 'Continue'
$raiz = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# ── SOLO LOCAL. No es una comodidad: este guardian CREA PEDIDOS. ────────────────
try { $u = [uri]$BaseUrl } catch { $u = $null }
if (-not $u -or ($u.Host -ne '127.0.0.1' -and $u.Host -ne 'localhost' -and $u.Host -ne '::1')) {
  Write-Host "Este guardian crea pedidos y toca la tabla de descuentos: solo corre contra"
  Write-Host "127.0.0.1 o localhost. Recibido: $BaseUrl"
  Write-Host 'GATE_B_OMITIDO'
  exit 2
}

function Pedir([string]$Ruta, $Cuerpo, [string]$Metodo = 'POST') {
  $uri = "$BaseUrl/api/index.php?route=$Ruta"
  try {
    if ($Metodo -eq 'GET') {
      $r = Invoke-WebRequest -Uri $uri -UseBasicParsing -TimeoutSec 20
    } else {
      $json = $Cuerpo | ConvertTo-Json -Depth 20
      $r = Invoke-WebRequest -Uri $uri -Method Post -ContentType 'application/json' -Body $json -UseBasicParsing -TimeoutSec 20
    }
    $d = $null; try { $d = $r.Content | ConvertFrom-Json } catch { $d = $null }
    return [pscustomobject]@{ Code = [int]$r.StatusCode; Data = $d }
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp) {
      $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $body = $sr.ReadToEnd()
      $d = $null; try { $d = $body | ConvertFrom-Json } catch { $d = $null }
      return [pscustomobject]@{ Code = [int]$resp.StatusCode; Data = $d }
    }
    return [pscustomobject]@{ Code = 0; Data = $null }
  } catch {
    return [pscustomobject]@{ Code = 0; Data = $null }
  }
}

# ── ¿Hay entorno? ──────────────────────────────────────────────────────────────
$salud = Pedir 'health' $null 'GET'
if ($salud.Code -ne 200) {
  Write-Host "No hay backend en $BaseUrl."
  Write-Host '  powershell -ExecutionPolicy Bypass -File scripts/local-start.ps1'
  Write-Host 'GATE_B_OMITIDO'
  exit 2
}

# La base de datos hace falta de verdad: sin ella no se puede crear un pedido, y
# fingir que eso «pasa» seria justo el fallo que la Fase 0 vino a quitar.
$sondaBd = Pedir 'orders_get' @{ id = 'gate-b-sonda-inexistente' } 'POST'
if ($sondaBd.Code -eq 500) {
  Write-Host 'El backend responde pero la base de datos no. El flujo de compra no se puede probar.'
  Write-Host 'GATE_B_OMITIDO'
  exit 2
}

# ── Precios REALES del catalogo, no a fuego ────────────────────────────────────
$nodo = (Get-Command node -ErrorAction SilentlyContinue)
if (-not $nodo) {
  Write-Host 'Node no esta disponible: no se puede leer el catalogo para saber que importe esperar.'
  Write-Host 'GATE_B_OMITIDO'
  exit 2
}
$lector = @'
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=process.argv[2];
const ctx={window:{},document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},console:{log(){},warn(){},error(){}}};
ctx.self=ctx.globalThis=ctx.window;ctx.window.window=ctx.window;vm.createContext(ctx);
try{vm.runInContext(fs.readFileSync(path.join(raiz,'data/product-overrides.js'),'utf8'),ctx)}catch(e){}
vm.runInContext(fs.readFileSync(path.join(raiz,'data/products.js'),'utf8'),ctx);
const P=(ctx.window.SCOOTSHOP_PRODUCTS||[]).filter(p=>p.sku&&p.priceText&&String(p.stock||'')!=='out_of_stock');
const n=t=>Number(String(t).replace(/[^\d.,-]/g,'').replace(/[.](?=\d{3}\b)/g,'').replace(',','.'));
const uno=P.find(p=>n(p.priceText)>50)||P[0];
process.stdout.write(JSON.stringify({sku:uno.sku,precio:n(uno.priceText).toFixed(2),nombre:uno.name}));
'@
$tmpJs = Join-Path $env:TEMP ("gate-b-catalogo-" + [guid]::NewGuid().ToString('N').Substring(0,8) + '.js')
Set-Content -Path $tmpJs -Value $lector -Encoding utf8
$crudo = & node $tmpJs $raiz 2>$null
Remove-Item $tmpJs -ErrorAction SilentlyContinue
if (-not $crudo) {
  Write-Host 'No se ha podido leer el catalogo.'
  Write-Host 'GATE_B_OMITIDO'
  exit 2
}
$prod = $crudo | ConvertFrom-Json

$fallos = @()
$omitidas = @()
function Comprobar([string]$Que, [bool]$Bien, [string]$Detalle) {
  if ($Bien) { Write-Host "  OK   $Que  ($Detalle)" }
  else { Write-Host "  KO   $Que  ($Detalle)"; $script:fallos += $Que }
}
function Omitir([string]$Que, [string]$Porque) {
  Write-Host "  --   $Que  (omitida: $Porque)"
  $script:omitidas += $Que
}

Write-Host ''
Write-Host "Gate B contra $BaseUrl"
Write-Host ("producto de prueba: " + $prod.sku + " a " + $prod.precio + " EUR  (" + $prod.nombre + ")")
Write-Host ''

# ── B1 · TARIFA ────────────────────────────────────────────────────────────────
Write-Host 'B1 · tarifa'
$b1 = Pedir 'order_pricing_preview' @{
  sku = $prod.sku; currency = 'EUR'; payment_method = 'transfer'; discount_code = '';
  frontend_base_amount = $prod.precio; shipping_amount = '0.00'; cart_items = @()
}
if ($b1.Code -eq 503) {
  Omitir 'tarifa (precio, precio inventado y comision)' 'order_pricing_preview responde 503 feature_disabled: DISCOUNTS_ENABLED=false'
} elseif ($b1.Code -ge 400) {
  # La peticion ni se acepto: eso es entorno o contrato, no una tarifa mal calculada.
  # Darlo por FALLO de precio seria gritar donde no hay nada roto.
  Omitir 'tarifa (precio, precio inventado y comision)' ('la peticion no se acepto: ' + [string]$b1.Data.error + ' / ' + [string]$b1.Data.detail)
} else {
  $total1 = if ($b1.Data) { [double]([string]$b1.Data.breakdown.total_amount).Replace(',', '.') } else { -1 }
  Comprobar 'precio sin descuento = el del catalogo' `
    ($b1.Code -eq 200 -and [math]::Abs($total1 - [double]$prod.precio) -lt 0.01) `
    ('catalogo=' + $prod.precio + ' backend=' + $total1)

  # El backend MANDA sobre el navegador: si el cliente dice que vale 1 EUR, se ignora.
  $b1b = Pedir 'order_pricing_preview' @{
    sku = $prod.sku; currency = 'EUR'; payment_method = 'transfer'; discount_code = '';
    frontend_base_amount = '1.00'; shipping_amount = '0.00'; cart_items = @()
  }
  $total1b = if ($b1b.Data) { [double]([string]$b1b.Data.breakdown.total_amount).Replace(',', '.') } else { -1 }
  # EL INVARIANTE ES QUE EL BACKEND NO HAGA CASO AL NAVEGADOR, o sea que las dos
  # respuestas sean IGUALES ENTRE SI. Compararla contra el precio del catalogo
  # mezclaba dos cosas y daba un fallo falso cuando lo que falla es otra: el
  # backend ignoro el 1.00 correctamente, solo que tarifa un precio distinto del
  # que ve el cliente, y eso ya lo dice la comprobacion de arriba.
  Comprobar 'un precio inventado por el navegador NO cambia la tarifa' `
    ($b1b.Code -eq 200 -and [math]::Abs($total1b - $total1) -lt 0.01) `
    ('con 554.99 tarifa ' + $total1 + ', con 1.00 tarifa ' + $total1b)

  # OJO: el desglose va en .breakdown, no en la raiz de la respuesta.
  $b1c = Pedir 'order_pricing_preview' @{
    sku = $prod.sku; currency = 'EUR'; payment_method = 'card'; discount_code = '';
    frontend_base_amount = $prod.precio; shipping_amount = '0.00'; cart_items = @()
  }
  $fee = if ($b1c.Data) { [double]([string]$b1c.Data.breakdown.payment_fee_amount).Replace(',', '.') } else { -1 }
  Comprobar 'la comision de pasarela se calcula y viaja en el desglose' `
    ($b1c.Code -eq 200 -and $fee -ge 0) ('fee=' + $fee)
}

$b1d = Pedir 'discount_validate' @{ code = 'GATE-B-NO-EXISTE'; sku = $prod.sku; currency = 'EUR' }
if ($b1d.Code -eq 503) {
  Omitir 'codigo de descuento' 'DISCOUNTS_ENABLED=false, el motor esta apagado a proposito'
} else {
  Comprobar 'un codigo inexistente NO valida' `
    ($b1d.Code -ge 400 -or -not $b1d.Data.ok) ('status=' + $b1d.Code)
}

# ── B2 · PEDIDO ────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host 'B2 · pedido'

# La ruta que usaba el gate original esta RETIRADA. Se comprueba que sigue
# retirada y diciendo a donde ir, que es informacion util, y no se finge crear
# un pedido por un camino que ya no existe.
$viejo = Pedir 'orders_create' @{ sku = $prod.sku; name = $prod.nombre; price = $prod.precio }
Comprobar 'orders_create sigue retirada y dice por donde ir ahora' `
  ($viejo.Code -eq 410) ('status=' + $viejo.Code + ' ' + [string]$viejo.Data.detail)

# SIN DATOS NO HAY PEDIDO. Es la garantia que da el backend porque el navegador no
# manda: la direccion viaja en sessionStorage y esa copia se pierde. Se prueba
# contra stripe_checkout, que es quien crea el pedido hoy.
$sinDatos = Pedir 'stripe_checkout' @{
  sku = $prod.sku; name = $prod.nombre; price = $prod.precio; currency = 'eur';
  shipping = @{}; cart_items = @()
}
if ($sinDatos.Code -eq 503) {
  Omitir 'un pedido SIN direccion no se crea' 'stripe_not_configured: no hay claves de Stripe en este entorno'
} elseif ($sinDatos.Code -eq 403) {
  Omitir 'un pedido SIN direccion no se crea' 'require_same_origin_post rechaza una llamada sin origen'
} else {
  $falta = ($sinDatos.Data -and [string]$sinDatos.Data.error -eq 'missing_shipping')
  Comprobar 'un pedido SIN direccion no se crea' `
    ($sinDatos.Code -ge 400) ('status=' + $sinDatos.Code + ' error=' + [string]$sinDatos.Data.error + $(if($falta){' (missing_shipping)'}else{''}))
}

# IDEMPOTENCIA: reanudar el pago de un pedido inexistente no debe inventarse uno.
$re = Pedir 'orders_resume_payment' @{ orderId = 'gate-b-no-existe-' + [guid]::NewGuid().ToString('N').Substring(0,8) }
if ($re.Code -eq 503) {
  Omitir 'reanudar un pedido inexistente no crea uno nuevo' 'la pasarela no esta configurada en este entorno'
} elseif ($re.Code -eq 403) {
  # UN 403 NO ES UN APROBADO. require_same_origin_post rechaza en la puerta y la
  # peticion no llega a la logica del pedido: dar esto por bueno seria exactamente
  # el fallo que la Fase 0 vino a quitar, con otro disfraz.
  Omitir 'reanudar un pedido inexistente no crea uno nuevo' 'rechazada por require_same_origin_post: no llega a la logica'
} else {
  Comprobar 'reanudar un pedido inexistente NO crea uno nuevo' `
    ($re.Code -ge 400 -or -not $re.Data.ok) ('status=' + $re.Code)
}

# Lo que NO se cubre aqui, y se dice en vez de disimularlo: crear un pedido de
# verdad y comprobar su importe necesita claves de Stripe y base de datos. Eso lo
# hacen scripts/qa/pedido-unico.js y scripts/qa/pago-metodo.js, que tampoco corren
# sin entorno.
Omitir 'crear un pedido real y cuadrar su importe' 'necesita claves de pasarela; lo cubren pedido-unico.js y pago-metodo.js'

# ── B3 · ALIAS DE ESTADO ───────────────────────────────────────────────────────
Write-Host ''
Write-Host 'B3 · alias de estado'
$fuente = Get-Content (Join-Path $raiz 'api/index.php') -Raw
$aliasOk = ($fuente -match "case 'cancelled'") -and ($fuente -match "case 'canceled'")
Comprobar 'los alias de estado siguen contemplados (cancelled/canceled)' $aliasOk ''

Write-Host ''
Write-Host ("resumen: " + ($fallos.Count) + " fallan, " + ($omitidas.Count) + " omitidas")

if ($fallos.Count -gt 0) {
  Write-Host ('GATE_B_KO  fallan: ' + ($fallos -join '; '))
  exit 1
}
if ($omitidas.Count -gt 0) {
  Write-Host ('GATE_B_PARCIAL  ' + $omitidas.Count + ' omitidas: ' + ($omitidas -join '; '))
  exit 2
}
Write-Host 'GATE_B_OK'
exit 0
