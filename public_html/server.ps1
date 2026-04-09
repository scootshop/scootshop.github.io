<#
.SYNOPSIS
  Servidor HTTP local para probar el sitio con URLs limpias (/pago -> pago.html).
.DESCRIPTION
  Simula las reglas .htaccess de Apache. No necesita PHP, Node ni Python.
.EXAMPLE
  .\server.ps1            # puerto 8000
  .\server.ps1 -Port 3000 # puerto personalizado
#>
param([int]$Port = 8000)

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiProxyBase = 'https://scootshop.co'
$EnvFile = Join-Path $Root '.env'
if (Test-Path $EnvFile -PathType Leaf) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) { return }
        $parts = $line -split '=', 2
        if ($parts.Length -ne 2) { return }
        $envName = $parts[0].Trim()
        $envValue = $parts[1].Trim()
        if ($envValue.Length -ge 2 -and (($envValue.StartsWith('"') -and $envValue.EndsWith('"')) -or ($envValue.StartsWith("'") -and $envValue.EndsWith("'")))) {
            $envValue = $envValue.Substring(1, $envValue.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($envName, $envValue, 'Process')
    }
}
$StripeSecretKey = [System.Environment]::GetEnvironmentVariable('STRIPE_SECRET_KEY', 'Process')
$StripePublishableKey = [System.Environment]::GetEnvironmentVariable('STRIPE_PUBLISHABLE_KEY', 'Process')
$PublicBase = [System.Environment]::GetEnvironmentVariable('PUBLIC_BASE', 'Process')
if ([string]::IsNullOrWhiteSpace($PublicBase)) { $PublicBase = $ApiProxyBase }
$LocalPublicBase = "http://localhost:$Port"
$PaypalProxyOrigin = 'https://paypal-webhook-six.vercel.app'
Add-Type -AssemblyName System.Net.Http
$httpClientHandler = [System.Net.Http.HttpClientHandler]::new()
$httpClientHandler.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
$httpClient = [System.Net.Http.HttpClient]::new($httpClientHandler)
$httpClient.Timeout = [TimeSpan]::FromSeconds(90)

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host ""
Write-Host "  Servidor local en http://localhost:$Port" -ForegroundColor Green
Write-Host "  Raiz: $Root" -ForegroundColor DarkGray
Write-Host "  Ctrl+C para detener" -ForegroundColor DarkGray
Write-Host ""

$mimeTypes = @{
    '.html' = 'text/html; charset=UTF-8'
    '.css'  = 'text/css; charset=UTF-8'
    '.js'   = 'application/javascript; charset=UTF-8'
    '.json' = 'application/json; charset=UTF-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.webp' = 'image/webp'
    '.avif' = 'image/avif'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.ttf'  = 'font/ttf'
    '.otf'  = 'font/otf'
    '.webmanifest' = 'application/manifest+json'
    '.xml'  = 'application/xml'
    '.txt'  = 'text/plain; charset=UTF-8'
    '.map'  = 'application/json'
    '.php'  = 'text/html; charset=UTF-8'
    '.mp4'  = 'video/mp4'
    '.webm' = 'video/webm'
}

function Get-Mime([string]$ext) {
    if ($mimeTypes.ContainsKey($ext)) { return $mimeTypes[$ext] }
    return 'application/octet-stream'
}

function Send-Json([System.Net.HttpListenerResponse]$resp, $data, [int]$statusCode = 200) {
    $json = $data | ConvertTo-Json -Depth 10 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $resp.StatusCode = $statusCode
    $resp.ContentType = 'application/json; charset=UTF-8'
    $resp.ContentLength64 = $bytes.Length
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Resolve-AbsoluteUrl([string]$base, [string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return '' }
    if ($value -match '^[a-z]+://') { return $value }
    return $base.TrimEnd('/') + '/' + $value.TrimStart('/')
}

function New-LocalOrderId() {
    $stamp = Get-Date -Format 'yyyyMMdd'
    $alphabet = (48..57) + (65..90)
    $suffix = -join ($alphabet | Get-Random -Count 6 | ForEach-Object { [char]$_ })
    return "SS-$stamp-$suffix"
}

function Get-ObjectValue($obj, [string]$propertyName, $defaultValue = '') {
    if ($null -eq $obj) { return $defaultValue }
    $prop = $obj.PSObject.Properties[$propertyName]
    if ($null -eq $prop) { return $defaultValue }
    $value = $prop.Value
    if ($null -eq $value) { return $defaultValue }
    return [string]$value
}

function Invoke-StripeApi([string]$method, [string]$endpoint, [hashtable]$formData = $null) {
    if ([string]::IsNullOrWhiteSpace($StripeSecretKey)) {
        throw 'Stripe no está configurado en .env.'
    }

    $uri = if ($endpoint -match '^https?://') { $endpoint } else { "https://api.stripe.com$endpoint" }
    $message = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($method), $uri)
    $message.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $StripeSecretKey)

    if ($formData) {
        $pairs = New-Object 'System.Collections.Generic.List[System.Collections.Generic.KeyValuePair[string,string]]'
        foreach ($key in $formData.Keys) {
            $pairs.Add([System.Collections.Generic.KeyValuePair[string,string]]::new([string]$key, [string]$formData[$key]))
        }
        $message.Content = [System.Net.Http.FormUrlEncodedContent]::new($pairs)
    }

    $response = $httpClient.SendAsync($message).GetAwaiter().GetResult()
    $bodyText = if ($response.Content) { $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() } else { '' }
    $body = $null
    if (-not [string]::IsNullOrWhiteSpace($bodyText)) {
        try { $body = $bodyText | ConvertFrom-Json } catch { $body = $null }
    }

    return @{
        status = [int]$response.StatusCode
        body = $body
        raw = $bodyText
    }
}

function Send-File([System.Net.HttpListenerResponse]$resp, [string]$filePath) {
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    $resp.ContentType = Get-Mime $ext
    $resp.StatusCode = 200
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $resp.ContentLength64 = $bytes.Length
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Send-Redirect([System.Net.HttpListenerResponse]$resp, [string]$location) {
    $resp.StatusCode = 301
    $resp.RedirectLocation = $location
}

function Send-404([System.Net.HttpListenerResponse]$resp) {
    $resp.StatusCode = 404
    $resp.ContentType = 'text/html; charset=UTF-8'
    $body = [System.Text.Encoding]::UTF8.GetBytes('<!DOCTYPE html><html><head><title>404</title></head><body><h1>404</h1><p><a href="/">Volver al inicio</a></p></body></html>')
    $resp.ContentLength64 = $body.Length
    $resp.OutputStream.Write($body, 0, $body.Length)
}

function Copy-RequestBody([System.Net.HttpListenerRequest]$req) {
    $ms = New-Object System.IO.MemoryStream
    $req.InputStream.CopyTo($ms)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    return $bytes
}

function Handle-LocalStripeConfig([System.Net.HttpListenerResponse]$resp) {
    if ([string]::IsNullOrWhiteSpace($StripePublishableKey)) {
        Send-Json $resp @{ ok = $false; error = 'stripe_not_configured' } 503
        return
    }

    Send-Json $resp @{
        ok = $true
        publishableKey = $StripePublishableKey
        currency = 'EUR'
    } 200
}

function Handle-LocalStripeCheckout([System.Net.HttpListenerRequest]$req, [System.Net.HttpListenerResponse]$resp) {
    if ([string]::IsNullOrWhiteSpace($StripeSecretKey) -or [string]::IsNullOrWhiteSpace($StripePublishableKey)) {
        Send-Json $resp @{ ok = $false; error = 'stripe_not_configured' } 503
        return
    }

    $rawBytes = if ($req.HasEntityBody) { Copy-RequestBody $req } else { @() }
    $jsonText = if ($rawBytes.Length -gt 0) { [System.Text.Encoding]::UTF8.GetString($rawBytes) } else { '{}' }

    try { $payloadIn = $jsonText | ConvertFrom-Json } catch { $payloadIn = $null }
    if (-not $payloadIn) { $payloadIn = [pscustomobject]@{} }

    $name = Get-ObjectValue $payloadIn 'name' ''
    $sku = Get-ObjectValue $payloadIn 'sku' ''
    $priceText = Get-ObjectValue $payloadIn 'price' ''
    $currency = Get-ObjectValue $payloadIn 'currency' 'EUR'
    $ref = Get-ObjectValue $payloadIn 'ref' ''
    $productUrl = Get-ObjectValue $payloadIn 'productUrl' ''
    $productImageUrl = Get-ObjectValue $payloadIn 'productImageUrl' ''
    $checkoutPath = Get-ObjectValue $payloadIn 'checkoutPath' ''
    $paymentMethodMode = Get-ObjectValue $payloadIn 'paymentMethodMode' 'dynamic'
    $paymentUiMode = Get-ObjectValue $payloadIn 'paymentUiMode' 'embedded'

    $amountValue = [decimal]0
    $style = [System.Globalization.NumberStyles]::AllowDecimalPoint
    $culture = [System.Globalization.CultureInfo]::InvariantCulture
    if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($sku) -or -not [decimal]::TryParse($priceText, $style, $culture, [ref]$amountValue)) {
        Send-Json $resp @{ ok = $false; error = 'bad_request' } 400
        return
    }

    $amountCents = [int][Math]::Round(($amountValue * 100), 0, [System.MidpointRounding]::AwayFromZero)
    $orderId = if (-not [string]::IsNullOrWhiteSpace($ref)) { $ref } else { New-LocalOrderId }
    $methodKey = if ($paymentMethodMode -eq 'klarna') { 'klarna' } elseif ($paymentMethodMode -eq 'paypal') { 'paypal' } else { 'card' }
    if ([string]::IsNullOrWhiteSpace($checkoutPath)) { $checkoutPath = "/pago?method=$methodKey" }

    $returnBase = $checkoutPath
    $returnGlue = if ($returnBase.Contains('?')) { '&' } else { '?' }
    if ($returnBase -notmatch '(^|[?&])method=') {
        $returnBase += $returnGlue + "method=$methodKey"
        $returnGlue = '&'
    }
    if ($returnBase -notmatch '(^|[?&])order=') {
        $returnBase += $returnGlue + 'order=' + [System.Uri]::EscapeDataString($orderId)
        $returnGlue = '&'
    }

    $payload = @{
        'mode' = 'payment'
        'locale' = 'es'
        'billing_address_collection' = 'auto'
        'phone_number_collection[enabled]' = 'true'
        'client_reference_id' = $orderId
        'metadata[order_id]' = $orderId
        'metadata[sku]' = $sku
        'metadata[ref]' = $ref
        'line_items[0][quantity]' = '1'
        'line_items[0][price_data][currency]' = $currency.ToLowerInvariant()
        'line_items[0][price_data][unit_amount]' = [string]$amountCents
        'line_items[0][price_data][product_data][name]' = $name
        'payment_intent_data[metadata][order_id]' = $orderId
        'payment_intent_data[metadata][sku]' = $sku
    }

    if ($paymentMethodMode -eq 'klarna') {
        $payload['payment_method_types[0]'] = 'klarna'
    } elseif ($paymentMethodMode -eq 'paypal') {
        $payload['payment_method_types[0]'] = 'paypal'
    } else {
        $payload['excluded_payment_method_types[0]'] = 'klarna'
        $payload['excluded_payment_method_types[1]'] = 'paypal'
    }

    if (-not [string]::IsNullOrWhiteSpace($productUrl)) {
        $payload['metadata[product_url]'] = Resolve-AbsoluteUrl $PublicBase $productUrl
    }
    if (-not [string]::IsNullOrWhiteSpace($productImageUrl)) {
        $payload['line_items[0][price_data][product_data][images][0]'] = Resolve-AbsoluteUrl $PublicBase $productImageUrl
    }

    if ($paymentUiMode -eq 'hosted') {
        $successBase = $returnBase
        $successGlue = if ($successBase.Contains('?')) { '&' } else { '?' }
        if ($successBase -notmatch '(^|[?&])session_id=') {
            $successBase += $successGlue + 'session_id={CHECKOUT_SESSION_ID}'
        }

        $cancelBase = $checkoutPath
        $cancelGlue = if ($cancelBase.Contains('?')) { '&' } else { '?' }
        if ($cancelBase -notmatch '(^|[?&])method=') {
            $cancelBase += $cancelGlue + "method=$methodKey"
            $cancelGlue = '&'
        }
        if ($cancelBase -notmatch '(^|[?&])order=') {
            $cancelBase += $cancelGlue + 'order=' + [System.Uri]::EscapeDataString($orderId)
            $cancelGlue = '&'
        }
        if ($cancelBase -notmatch '(^|[?&])cancelled=') {
            $cancelBase += $cancelGlue + 'cancelled=1'
        }

        $payload['success_url'] = Resolve-AbsoluteUrl $LocalPublicBase $successBase
        $payload['cancel_url'] = Resolve-AbsoluteUrl $LocalPublicBase $cancelBase
    } else {
        $payload['ui_mode'] = 'embedded'
        $payload['return_url'] = Resolve-AbsoluteUrl $LocalPublicBase ($returnBase + '&session_id={CHECKOUT_SESSION_ID}')
        $payload['redirect_on_completion'] = 'if_required'
    }

    try {
        $stripe = Invoke-StripeApi 'POST' '/v1/checkout/sessions' $payload
        if ($stripe.status -ge 400 -or -not $stripe.body -or -not $stripe.body.id) {
            $detail = if ($stripe.body -and $stripe.body.error -and $stripe.body.error.message) { [string]$stripe.body.error.message } else { 'stripe_checkout_error' }
            throw $detail
        }

        Send-Json $resp @{
            ok = $true
            orderId = $orderId
            sessionId = [string]$stripe.body.id
            clientSecret = Get-ObjectValue $stripe.body 'client_secret' ''
            checkoutUrl = Get-ObjectValue $stripe.body 'url' ''
            publishableKey = $StripePublishableKey
        } 200
    } catch {
        Send-Json $resp @{ ok = $false; error = 'stripe_checkout_failed'; detail = $_.Exception.Message } 502
    }
}

function Handle-LocalStripeSessionStatus([System.Net.HttpListenerRequest]$req, [System.Net.HttpListenerResponse]$resp) {
    if ([string]::IsNullOrWhiteSpace($StripeSecretKey)) {
        Send-Json $resp @{ ok = $false; error = 'stripe_not_configured' } 503
        return
    }

    $sessionId = [string]$req.QueryString['session_id']
    if ([string]::IsNullOrWhiteSpace($sessionId)) {
        Send-Json $resp @{ ok = $false; error = 'missing_session_id' } 400
        return
    }

    try {
        $stripe = Invoke-StripeApi 'GET' ('/v1/checkout/sessions/' + [System.Uri]::EscapeDataString($sessionId))
        if ($stripe.status -ge 400 -or -not $stripe.body) {
            $detail = if ($stripe.body -and $stripe.body.error -and $stripe.body.error.message) { [string]$stripe.body.error.message } else { 'stripe_session_status_failed' }
            throw $detail
        }

        $orderId = Get-ObjectValue $stripe.body 'client_reference_id' ''
        if ([string]::IsNullOrWhiteSpace($orderId) -and $stripe.body.metadata) {
            $orderId = Get-ObjectValue $stripe.body.metadata 'order_id' ''
        }

        Send-Json $resp @{
            ok = $true
            id = Get-ObjectValue $stripe.body 'id' ''
            status = Get-ObjectValue $stripe.body 'status' ''
            payment_status = Get-ObjectValue $stripe.body 'payment_status' ''
            orderId = $orderId
        } 200
    } catch {
        Send-Json $resp @{ ok = $false; error = 'stripe_session_status_failed'; detail = $_.Exception.Message } 502
    }
}

function Proxy-ApiRequest([System.Net.HttpListenerRequest]$req, [System.Net.HttpListenerResponse]$resp, [string]$path, [string]$query, [string]$baseUrl = $ApiProxyBase) {
    $targetUrl = $baseUrl.TrimEnd('/') + $path + $query
    $method = [System.Net.Http.HttpMethod]::new($req.HttpMethod)
    $message = [System.Net.Http.HttpRequestMessage]::new($method, $targetUrl)

    $bodyBytes = $null
    if ($req.HasEntityBody) {
        $bodyBytes = Copy-RequestBody $req
        $message.Content = [System.Net.Http.ByteArrayContent]::new($bodyBytes)
        if ($req.ContentType) {
            $message.Content.Headers.TryAddWithoutValidation('Content-Type', $req.ContentType) | Out-Null
        }
    }

    foreach ($headerKey in $req.Headers.AllKeys) {
        if ([string]::IsNullOrWhiteSpace($headerKey)) { continue }
        if ($headerKey -in @('Host', 'Connection', 'Content-Length', 'Content-Type')) { continue }

        $values = $req.Headers.GetValues($headerKey)
        if (-not $values) { continue }

        $copied = $message.Headers.TryAddWithoutValidation($headerKey, $values)
        if (-not $copied -and $message.Content) {
            $message.Content.Headers.TryAddWithoutValidation($headerKey, $values) | Out-Null
        }
    }

    $apiResp = $httpClient.SendAsync($message).GetAwaiter().GetResult()
    $resp.StatusCode = [int]$apiResp.StatusCode

    foreach ($header in $apiResp.Headers) {
        if ($header.Key -in @('Transfer-Encoding', 'Connection', 'Keep-Alive')) { continue }
        $resp.Headers[$header.Key] = [string]::Join(', ', $header.Value)
    }
    if ($apiResp.Content) {
        foreach ($header in $apiResp.Content.Headers) {
            if ($header.Key -eq 'Content-Type') {
                $resp.ContentType = [string]::Join(', ', $header.Value)
                continue
            }
            if ($header.Key -eq 'Content-Length') { continue }
            $resp.Headers[$header.Key] = [string]::Join(', ', $header.Value)
        }

        $bytes = $apiResp.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
        $resp.ContentLength64 = $bytes.Length
        if ($bytes.Length -gt 0) {
            $resp.OutputStream.Write($bytes, 0, $bytes.Length)
        }
    }
}

try {
    while ($listener.IsListening) {
        $ctx  = $listener.GetContext()
        $req  = $ctx.Request
        $resp = $ctx.Response

        try {
            $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
            $query = $req.Url.Query  # incluye el ?

            if ($path -eq '/api/stripe/config') {
                Handle-LocalStripeConfig $resp
                Write-Host "  $($resp.StatusCode) $path -> local Stripe config" -ForegroundColor Cyan
                $resp.Close()
                continue
            }

            if ($path -eq '/api/stripe/checkout') {
                Handle-LocalStripeCheckout $req $resp
                Write-Host "  $($resp.StatusCode) $path -> local Stripe checkout" -ForegroundColor Cyan
                $resp.Close()
                continue
            }

            if ($path -eq '/api/stripe/session-status') {
                Handle-LocalStripeSessionStatus $req $resp
                Write-Host "  $($resp.StatusCode) $path -> local Stripe status" -ForegroundColor Cyan
                $resp.Close()
                continue
            }

            if ($path -eq '/api/paypal/create-order' -or $path -eq '/api/paypal/capture-order') {
                Proxy-ApiRequest $req $resp $path $query $PaypalProxyOrigin
                Write-Host "  $($resp.StatusCode) $path -> proxy PayPal" -ForegroundColor Cyan
                $resp.Close()
                continue
            }

            # --- Proxy API remota para PayPal y el resto del backend ---
            if ($path -match '^/api(?:/|$)') {
                Proxy-ApiRequest $req $resp $path $query
                Write-Host "  $($resp.StatusCode) $path -> proxy API" -ForegroundColor Cyan
                $resp.Close()
                continue
            }

            # --- Regla 1: /algo.html -> redirigir a /algo ---
            if ($path -match '\.html$' -and $path -ne '/index.html') {
                $clean = $path -replace '\.html$', ''
                Send-Redirect $resp ($clean + $query)
                $resp.Close()
                continue
            }

            # --- Regla 2: quitar barra final (excepto /) si no es directorio real ---
            if ($path -ne '/' -and $path.EndsWith('/')) {
                $dirCheck = Join-Path $Root ($path.TrimStart('/').TrimEnd('/'))
                $idxCheck = Join-Path $dirCheck 'index.html'
                if ((Test-Path $dirCheck -PathType Container) -and (Test-Path $idxCheck -PathType Leaf)) {
                    # Es directorio con index.html -> servir
                    Send-File $resp $idxCheck
                    Write-Host "  200 $path -> index.html" -ForegroundColor DarkGray
                    $resp.Close()
                    continue
                }
                # No es directorio valido -> quitar /
                Send-Redirect $resp ($path.TrimEnd('/') + $query)
                $resp.Close()
                continue
            }

            $filePath = Join-Path $Root ($path.TrimStart('/'))

            # --- Archivo existe tal cual -> servirlo ---
            if (Test-Path $filePath -PathType Leaf) {
                Send-File $resp $filePath
                Write-Host "  200 $path" -ForegroundColor DarkGray
                $resp.Close()
                continue
            }

            # --- URL limpia: /pago -> pago.html ---
            $htmlPath = $filePath + '.html'
            if (Test-Path $htmlPath -PathType Leaf) {
                Send-File $resp $htmlPath
                Write-Host "  200 $path -> $($path).html" -ForegroundColor Cyan
                $resp.Close()
                continue
            }

            # --- Directorio sin barra: /legal -> /legal/index.html ---
            if (Test-Path $filePath -PathType Container) {
                $idxPath = Join-Path $filePath 'index.html'
                if (Test-Path $idxPath -PathType Leaf) {
                    Send-File $resp $idxPath
                    Write-Host "  200 $path -> index.html" -ForegroundColor DarkGray
                    $resp.Close()
                    continue
                }
            }

            # --- Raiz ---
            if ($path -eq '/') {
                $idxRoot = Join-Path $Root 'index.html'
                if (Test-Path $idxRoot -PathType Leaf) {
                    Send-File $resp $idxRoot
                    Write-Host "  200 /" -ForegroundColor DarkGray
                    $resp.Close()
                    continue
                }
            }

            # --- 404 ---
            Send-404 $resp
            Write-Host "  404 $path" -ForegroundColor Red
            $resp.Close()

        } catch {
            try {
                $resp.StatusCode = 500
                $resp.Close()
            } catch {}
            Write-Host "  ERR $path : $_" -ForegroundColor Red
        }
    }
} finally {
    $listener.Stop()
    $httpClient.Dispose()
    $httpClientHandler.Dispose()
    Write-Host "`nServidor detenido." -ForegroundColor Yellow
}
