<?php
declare(strict_types=1);

/**
 * /api/index.php
 * Rutas por query: index.php?route=...
 *
 * REQUISITOS:
 * - .htaccess en /api/ (nombre EXACTO: .htaccess)
 * - mod_rewrite activo y AllowOverride All
 * - MySQL accesible
 */

error_reporting(E_ALL);
ini_set('display_errors', '0'); // en producción 0

function load_env_file(string $path): void {
  if (!is_file($path) || !is_readable($path)) {
    return;
  }

  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if (!is_array($lines)) {
    return;
  }

  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || $line[0] === '#') {
      continue;
    }

    [$key, $value] = explode('=', $line, 2) + ['', ''];
    $key = trim($key);
    $value = trim($value);

    if ($key === '') {
      continue;
    }

    if ((str_starts_with($value, '"') && str_ends_with($value, '"')) || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
      $value = substr($value, 1, -1);
    }

    putenv($key . '=' . $value);
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
  }
}

load_env_file(__DIR__ . '/../.env');
load_env_file(__DIR__ . '/../env');

// ---------------- CONFIG (edita esto) ----------------
$CFG = [
  // 'live' o 'sandbox'
  'paypal_env' => getenv('PAYPAL_ENV') ?: 'sandbox',

  // Email de tu cuenta PayPal Business (sandbox o real según env)
  'paypal_business_email' => getenv('PAYPAL_BUSINESS_EMAIL') ?: 'sb-hm42u48311727@business.example.com',

  // Client ID público para SDK de PayPal
  'paypal_client_id' => getenv('PAYPAL_CLIENT_ID') ?: '',

  // Proxy del backend de PayPal para evitar problemas CORS en previews/local
  'paypal_proxy_base' => getenv('PAYPAL_PROXY_BASE') ?: 'https://paypal-webhook-six.vercel.app/api/paypal',

  // URL pública que PayPal llamará (IPN)
  'public_base' => (getenv('PUBLIC_BASE') ?: 'https://scootshop.co'),

  // Admin key para /api/admin/...
  'admin_key' => getenv('ADMIN_KEY') ?: '',

  // Email "From" (de tu dominio)
  'mail_from' => getenv('MAIL_FROM') ?: 'noreply@scootshop.co',

  // Relay opcional de correos en Vercel
  'vercel_email_endpoint' => getenv('VERCEL_EMAIL_ENDPOINT') ?: '',
  'vercel_email_bearer_token' => getenv('VERCEL_EMAIL_BEARER_TOKEN') ?: '',
  'vercel_email_fallback_local' => strtolower((string)(getenv('VERCEL_EMAIL_FALLBACK_LOCAL') ?: 'true')) !== 'false',

  // Stripe
  'stripe_secret_key' => getenv('STRIPE_SECRET_KEY') ?: '',
  'stripe_publishable_key' => getenv('STRIPE_PUBLISHABLE_KEY') ?: '',
  'stripe_webhook_secret' => getenv('STRIPE_WEBHOOK_SECRET') ?: '',

  // DB (credenciales SOLO desde .env — nunca hardcodear)
  'db' => [
    'host' => getenv('DB_HOST') ?: '',
    'name' => getenv('DB_NAME') ?: '',
    'user' => getenv('DB_USER') ?: '',
    'pass' => getenv('DB_PASS') ?: '',
    'charset' => 'utf8mb4',
  ],
];

// helpers derivados
$CFG['paypal_action'] = ($CFG['paypal_env'] === 'sandbox')
  ? 'https://www.sandbox.paypal.com/cgi-bin/webscr'
  : 'https://www.paypal.com/cgi-bin/webscr';

$CFG['paypal_verify'] = ($CFG['paypal_env'] === 'sandbox')
  ? 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'
  : 'https://ipnpb.paypal.com/cgi-bin/webscr';

$CFG['notify_url'] = rtrim($CFG['public_base'], '/') . '/api/paypal/ipn';

// ---------------- UTIL ----------------
function json_out(array $data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function text_out(string $txt, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: text/plain; charset=utf-8');
  header('Cache-Control: no-store');
  echo $txt;
  exit;
}

function get_json_body(): array {
  $raw = file_get_contents('php://input') ?: '';
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}

function pdo_conn(array $CFG): PDO {
  $db = $CFG['db'];
  $dsn = "mysql:host={$db['host']};dbname={$db['name']};charset={$db['charset']}";
  $pdo = new PDO($dsn, $db['user'], $db['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}

function ensure_schema(PDO $pdo): void {
  // orders
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      token VARCHAR(64) NOT NULL,
      sku VARCHAR(64) NOT NULL,
      name VARCHAR(190) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency CHAR(3) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending_payment',
      payer_email VARCHAR(190) NULL,
      payer_name VARCHAR(190) NULL,
      txn_id VARCHAR(64) NULL,
      product_url VARCHAR(255) NULL,
      product_image_url VARCHAR(255) NULL,
      tracking VARCHAR(128) NULL,
      message TEXT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ");

  $orderColumns = [
    'id' => "VARCHAR(64) NOT NULL",
    'token' => "VARCHAR(64) NOT NULL DEFAULT ''",
    'sku' => "VARCHAR(64) NOT NULL DEFAULT ''",
    'name' => "VARCHAR(190) NOT NULL DEFAULT ''",
    'amount' => "DECIMAL(10,2) NOT NULL DEFAULT 0.00",
    'currency' => "CHAR(3) NOT NULL DEFAULT 'EUR'",
    'status' => "VARCHAR(32) NOT NULL DEFAULT 'pending_payment'",
    'payer_email' => "VARCHAR(190) NULL",
    'payer_name' => "VARCHAR(190) NULL",
    'txn_id' => "VARCHAR(64) NULL",
    'product_url' => "VARCHAR(255) NULL",
    'product_image_url' => "VARCHAR(255) NULL",
    'tracking' => "VARCHAR(128) NULL",
    'message' => "TEXT NULL",
    'ship_name' => "VARCHAR(190) NULL",
    'ship_email' => "VARCHAR(190) NULL",
    'ship_phone' => "VARCHAR(32) NULL",
    'ship_address' => "VARCHAR(255) NULL",
    'ship_address2' => "VARCHAR(255) NULL",
    'ship_city' => "VARCHAR(100) NULL",
    'ship_province' => "VARCHAR(100) NULL",
    'ship_postal' => "VARCHAR(16) NULL",
    'ship_country' => "VARCHAR(60) NULL",
    'created_at' => "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
    'updated_at' => "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
  ];

  $existingOrderColumns = [];
  foreach ($pdo->query("SHOW COLUMNS FROM orders") as $column) {
    $field = (string)($column['Field'] ?? '');
    if ($field !== '') {
      $existingOrderColumns[$field] = true;
    }
  }

  foreach ($orderColumns as $columnName => $definition) {
    if (!isset($existingOrderColumns[$columnName])) {
      $pdo->exec("ALTER TABLE orders ADD COLUMN {$columnName} {$definition}");
    }
  }

  // ipn_events
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS ipn_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(64) NULL,
      txn_id VARCHAR(64) NULL,
      payment_status VARCHAR(64) NULL,
      raw LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  ");
}

function new_order_id(): string {
  $date = date('Ymd');
  $rnd = strtoupper(bin2hex(random_bytes(3))); // 6 chars
  return "SS-{$date}-{$rnd}";
}

function new_token(): string {
  return bin2hex(random_bytes(16));
}

function header_get(string $name): string {
  $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
  return $_SERVER[$key] ?? '';
}

function absolute_url(string $base, string $value): string {
  $value = trim($value);
  if ($value === '') return rtrim($base, '/');
  if (preg_match('~^https?://~i', $value)) return $value;
  return rtrim($base, '/') . '/' . ltrim($value, '/');
}

function money_to_cents(string $amount): int {
  if (!preg_match('/^\d+(\.\d{1,2})?$/', $amount)) {
    throw new InvalidArgumentException('bad_amount');
  }

  [$whole, $fraction] = explode('.', $amount, 2) + ['', ''];
  $fraction = substr(str_pad($fraction, 2, '0'), 0, 2);

  return ((int)$whole * 100) + (int)$fraction;
}

function stripe_api_request(string $secretKey, string $path, array $payload = [], string $method = 'POST'): array {
  $method = strtoupper($method);
  $url = 'https://api.stripe.com/v1' . $path;
  if ($method === 'GET' && $payload) {
    $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($payload);
  }

  $ch = curl_init($url);
  $headers = [
    'Authorization: Bearer ' . $secretKey,
  ];

  if ($method !== 'GET') {
    $headers[] = 'Content-Type: application/x-www-form-urlencoded';
  }

  curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_POST => $method === 'POST',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => false,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 30,
  ]);

  if ($method !== 'GET') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
  }

  $body = curl_exec($ch);
  $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $error = curl_error($ch);
  curl_close($ch);

  if ($body === false) {
    throw new RuntimeException('stripe_curl_error: ' . $error);
  }

  $decoded = json_decode($body, true);
  if (!is_array($decoded)) {
    throw new RuntimeException('stripe_invalid_json');
  }

  return ['status' => $status, 'body' => $decoded];
}

function proxy_json_request(string $url, array $payload = [], string $method = 'POST'): array {
  $method = strtoupper($method);
  $ch = curl_init($url);
  $headers = [
    'Accept: application/json',
    'Content-Type: application/json',
  ];

  curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => false,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 30,
  ]);

  if ($method !== 'GET') {
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
      throw new RuntimeException('proxy_json_encode_failed');
    }
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
  }

  $body = curl_exec($ch);
  $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $error = curl_error($ch);
  curl_close($ch);

  if ($body === false) {
    throw new RuntimeException('proxy_curl_error: ' . $error);
  }

  $decoded = json_decode($body, true);
  if (!is_array($decoded)) {
    $decoded = [
      'ok' => $status < 400,
      'raw' => $body,
    ];
  }

  return ['status' => $status ?: 502, 'body' => $decoded];
}

function stripe_fetch_checkout_session(string $secretKey, string $sessionId): array {
  $response = stripe_api_request($secretKey, '/checkout/sessions/' . rawurlencode($sessionId), [
    'expand[]' => 'line_items',
    'expand[]' => 'payment_intent',
  ], 'GET');

  if ($response['status'] >= 400 || !is_array($response['body']) || empty($response['body']['id'])) {
    throw new RuntimeException((string)($response['body']['error']['message'] ?? 'stripe_session_fetch_error'));
  }

  return $response['body'];
}

function stripe_fetch_payment_intent(string $secretKey, string $paymentIntentId): array {
  $response = stripe_api_request($secretKey, '/payment_intents/' . rawurlencode($paymentIntentId), [
    'expand[]' => 'latest_charge',
    'expand[]' => 'charges.data.balance_transaction',
  ], 'GET');

  if ($response['status'] >= 400 || !is_array($response['body']) || empty($response['body']['id'])) {
    throw new RuntimeException((string)($response['body']['error']['message'] ?? 'stripe_payment_intent_fetch_error'));
  }

  return $response['body'];
}

function reconcile_paid_stripe_order(PDO $pdo, array $CFG, array $data): void {
  $orderId = trim((string)($data['orderId'] ?? ''));
  if ($orderId === '') {
    return;
  }

  $payerEmail = trim((string)($data['payerEmail'] ?? ''));
  $payerName = trim((string)($data['payerName'] ?? ''));
  $txnId = trim((string)($data['txnId'] ?? ''));
  $currency = strtoupper((string)($data['currency'] ?? 'EUR'));
  $amountTotal = (int)($data['amountTotal'] ?? 0);
  $provider = trim((string)($data['provider'] ?? 'stripe'));
  $paymentStatus = trim((string)($data['paymentStatus'] ?? 'paid'));
  $sourceId = trim((string)($data['sourceId'] ?? ''));
  $sourceType = trim((string)($data['sourceType'] ?? ''));
  $productNameInput = trim((string)($data['productName'] ?? ''));
  $productSkuInput = trim((string)($data['sku'] ?? ''));

  $stOrder = $pdo->prepare("SELECT status, payer_email, name, sku, product_url, product_image_url FROM orders WHERE id = :id LIMIT 1");
  $stOrder->execute([':id' => $orderId]);
  $existingOrder = $stOrder->fetch() ?: [];
  $previousStatus = (string)($existingOrder['status'] ?? '');
  $resolvedEmail = $payerEmail !== '' ? $payerEmail : (string)($existingOrder['payer_email'] ?? '');
  $productName = (string)($existingOrder['name'] ?? ($productNameInput !== '' ? $productNameInput : ($productSkuInput !== '' ? $productSkuInput : 'Pedido Scoot Shop')));
  $productSku = (string)($existingOrder['sku'] ?? $productSkuInput);
  $productUrl = trim((string)($existingOrder['product_url'] ?? ($data['productUrl'] ?? '')));
  $productImageUrl = trim((string)($existingOrder['product_image_url'] ?? ($data['productImageUrl'] ?? '')));

  $stUp = $pdo->prepare("\n    UPDATE orders\n    SET status = :status,\n        payer_email = COALESCE(NULLIF(:payer_email,''), payer_email),\n        payer_name = COALESCE(NULLIF(:payer_name,''), payer_name),\n        txn_id = COALESCE(NULLIF(:txn_id,''), txn_id),\n        product_url = COALESCE(NULLIF(:product_url,''), product_url),\n        product_image_url = COALESCE(NULLIF(:product_image_url,''), product_image_url),\n        message = :message,\n        updated_at = :updated_at\n    WHERE id = :id\n  ");
  $stUp->execute([
    ':status' => 'paid',
    ':payer_email' => $resolvedEmail,
    ':payer_name' => $payerName,
    ':txn_id' => $txnId,
    ':product_url' => $productUrl,
    ':product_image_url' => $productImageUrl,
    ':message' => 'Pago recibido. Pedido en preparación y será enviado lo más rápido posible.',
    ':updated_at' => date('Y-m-d H:i:s'),
    ':id' => $orderId,
  ]);

  if ($previousStatus !== 'paid' && $resolvedEmail !== '') {
    send_paid_email($CFG, $resolvedEmail, $orderId, [
      'provider' => $provider,
      'payerName' => $payerName,
      'txnId' => $txnId,
      'sourceId' => $sourceId,
      'sourceType' => $sourceType,
      'paymentStatus' => $paymentStatus,
      'amountTotal' => $amountTotal,
      'currency' => $currency,
      'orderStatus' => 'paid',
      'productName' => $productName,
      'sku' => $productSku,
      'orderUrl' => $productUrl,
      'productImageUrl' => $productImageUrl,
    ]);
  }
}

function stripe_session_order_id(array $session): string {
  return trim((string)($session['client_reference_id'] ?? ($session['metadata']['order_id'] ?? '')));
}

function stripe_session_payment_intent_id(array $session): string {
  $paymentIntent = $session['payment_intent'] ?? null;
  if (is_array($paymentIntent)) {
    return trim((string)($paymentIntent['id'] ?? ''));
  }

  return trim((string)$paymentIntent);
}

function stripe_session_payment_intent_receipt_email(array $session): string {
  $paymentIntent = $session['payment_intent'] ?? null;
  if (is_array($paymentIntent)) {
    return trim((string)($paymentIntent['receipt_email'] ?? ''));
  }

  return '';
}

function stripe_session_customer_email(array $session): string {
  return trim((string)(
    $session['customer_details']['email'] ??
    $session['customer_email'] ??
    stripe_session_payment_intent_receipt_email($session) ??
    ''
  ));
}

function stripe_session_customer_name(array $session): string {
  return trim((string)($session['customer_details']['name'] ?? ''));
}

function stripe_session_is_paid(array $session): bool {
  $paymentStatus = trim((string)($session['payment_status'] ?? ''));
  return $paymentStatus === 'paid' || $paymentStatus === 'no_payment_required';
}

function stripe_session_context_urls(array $session, string $publicBase): array {
  $productUrl = trim((string)($session['metadata']['product_url'] ?? ''));
  $productImageUrl = trim((string)($session['metadata']['product_image_url'] ?? ''));

  $returnUrl = trim((string)($session['return_url'] ?? ''));
  if ($returnUrl !== '') {
    $query = parse_url($returnUrl, PHP_URL_QUERY);
    if (is_string($query) && $query !== '') {
      parse_str($query, $params);
      if ($productUrl === '') {
        $productUrl = trim((string)($params['url'] ?? ''));
      }
      if ($productImageUrl === '') {
        $productImageUrl = trim((string)($params['image'] ?? ''));
      }
    }
  }

  return [
    'productUrl' => $productUrl !== '' ? absolute_url($publicBase, $productUrl) : '',
    'productImageUrl' => $productImageUrl !== '' ? absolute_url($publicBase, $productImageUrl) : '',
  ];
}

function reconcile_paid_stripe_session(PDO $pdo, array $CFG, array $session): void {
  $orderId = stripe_session_order_id($session);
  if ($orderId === '') {
    return;
  }

  $paymentStatus = trim((string)($session['payment_status'] ?? ''));
  $payerEmail = stripe_session_customer_email($session);
  $payerName = stripe_session_customer_name($session);
  $txnId = stripe_session_payment_intent_id($session);
  if ($txnId === '') {
    $txnId = trim((string)($session['id'] ?? ''));
  }
  $currency = strtoupper((string)($session['currency'] ?? 'EUR'));
  $amountTotal = (int)($session['amount_total'] ?? 0);
  $sessionUrls = stripe_session_context_urls($session, $CFG['public_base']);

  $stOrder = $pdo->prepare("SELECT status, payer_email, name, sku, product_url, product_image_url FROM orders WHERE id = :id LIMIT 1");
  $stOrder->execute([':id' => $orderId]);
  $existingOrder = $stOrder->fetch() ?: [];
  $previousStatus = (string)($existingOrder['status'] ?? '');
  $resolvedEmail = $payerEmail !== '' ? $payerEmail : (string)($existingOrder['payer_email'] ?? '');
  $productName = (string)($existingOrder['name'] ?? ($session['metadata']['sku'] ?? 'Pedido Scoot Shop'));
  $productSku = (string)($existingOrder['sku'] ?? ($session['metadata']['sku'] ?? ''));

  if (stripe_session_is_paid($session)) {
    reconcile_paid_stripe_order($pdo, $CFG, [
      'orderId' => $orderId,
      'payerEmail' => $resolvedEmail,
      'payerName' => $payerName,
      'txnId' => $txnId,
      'currency' => $currency,
      'amountTotal' => $amountTotal,
      'provider' => 'stripe',
      'paymentStatus' => $paymentStatus,
      'sourceId' => (string)($session['id'] ?? ''),
      'sourceType' => 'checkout.session',
      'productName' => $productName,
      'sku' => $productSku,
      'productUrl' => (string)($existingOrder['product_url'] ?? $sessionUrls['productUrl']),
      'productImageUrl' => (string)($existingOrder['product_image_url'] ?? $sessionUrls['productImageUrl']),
    ]);

    return;
  }

  $stUp = $pdo->prepare("\n    UPDATE orders\n    SET payer_email = COALESCE(NULLIF(:payer_email,''), payer_email),\n        payer_name = COALESCE(NULLIF(:payer_name,''), payer_name),\n        txn_id = COALESCE(NULLIF(:txn_id,''), txn_id),\n        message = :message,\n        updated_at = :updated_at\n    WHERE id = :id\n  ");
  $stUp->execute([
    ':payer_email' => $resolvedEmail,
    ':payer_name' => $payerName,
    ':txn_id' => $txnId,
    ':message' => 'Pago en verificación. Te avisaremos por correo cuando Stripe confirme el cobro.',
    ':updated_at' => date('Y-m-d H:i:s'),
    ':id' => $orderId,
  ]);
}

function post_json_request(string $url, array $payload, array $headers = []): array {
  $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) {
    throw new RuntimeException('json_encode_failed');
  }

  $ch = curl_init($url);
  $requestHeaders = array_merge([
    'Content-Type: application/json',
    'Accept: application/json',
  ], $headers);

  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $json,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => false,
    CURLOPT_HTTPHEADER => $requestHeaders,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 20,
  ]);

  $body = curl_exec($ch);
  $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $error = curl_error($ch);
  curl_close($ch);

  if ($body === false) {
    throw new RuntimeException('http_curl_error: ' . $error);
  }

  $decoded = json_decode($body, true);

  return [
    'status' => $status,
    'body' => is_array($decoded) ? $decoded : null,
    'raw' => $body,
  ];
}

function verify_stripe_signature(string $payload, string $signatureHeader, string $secret, int $tolerance = 300): bool {
  if ($payload === '' || $signatureHeader === '' || $secret === '') return false;

  $timestamp = null;
  $signatures = [];

  foreach (explode(',', $signatureHeader) as $part) {
    [$key, $value] = array_map('trim', explode('=', $part, 2) + ['', '']);
    if ($key === 't') $timestamp = $value;
    if ($key === 'v1' && $value !== '') $signatures[] = $value;
  }

  if ($timestamp === null || !$signatures) return false;
  if (abs(time() - (int)$timestamp) > $tolerance) return false;

  $signedPayload = $timestamp . '.' . $payload;
  $expected = hash_hmac('sha256', $signedPayload, $secret);

  foreach ($signatures as $signature) {
    if (hash_equals($expected, $signature)) return true;
  }

  return false;
}

function encode_mail_subject(string $subject): string {
  if (function_exists('mb_encode_mimeheader')) {
    return mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n");
  }

  return '=?UTF-8?B?' . base64_encode($subject) . '?=';
}

function order_status_event(string $status): string {
  if ($status === 'paid') {
    return 'payment.paid';
  }

  if ($status === 'payment_failed') {
    return 'payment.failed';
  }

  return 'order.' . $status;
}

function order_status_label(string $status): string {
  switch ($status) {
    case 'pending_payment':
      return 'pendiente de pago';
    case 'paid':
      return 'pagado';
    case 'preparing':
      return 'en preparación';
    case 'shipped':
      return 'enviado';
    case 'delivered':
      return 'entregado';
    case 'canceled':
      return 'cancelado';
    case 'refunded':
      return 'reembolsado';
    case 'dispute':
      return 'en disputa';
    case 'payment_failed':
      return 'pago fallido';
    default:
      return $status;
  }
}

function email_html_escape(string $value): string {
  return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function build_order_status_email_html(array $CFG, string $orderId, string $title, string $statusLabel, array $paragraphs, array $context = []): string {
  $customerName = trim((string)($context['customerName'] ?? ($context['payerName'] ?? '')));
  $productName = trim((string)($context['productName'] ?? ''));
  $tracking = trim((string)($context['tracking'] ?? ''));
  $customMessage = trim((string)($context['message'] ?? ''));
  $status = trim((string)($context['orderStatus'] ?? ''));
  $productImageUrl = trim((string)($context['productImageUrl'] ?? ''));
  $orderUrl = trim((string)($context['orderUrl'] ?? ''));
  $logoUrl = absolute_url($CFG['public_base'], '/img/0-removebg-preview.webp');
  $siteUrl = rtrim((string)$CFG['public_base'], '/');
  $bg = '#f6f7f9';
  $surface = '#ffffff';
  $ink = '#111315';
  $muted = '#68707f';
  $line = '#e5eaf1';
  $accent = '#b91e1e';
  $accentSoft = '#f9e8ea';
  $segment = '<div style="width:48px;height:3px;border-radius:999px;background:' . $accent . ';"></div>';
  $miniSegment = '<div style="width:34px;height:2px;border-radius:999px;background:' . $accent . ';"></div>';

  if ($productImageUrl !== '') {
    $productImageUrl = absolute_url($CFG['public_base'], $productImageUrl);
  }

  if ($orderUrl !== '') {
    $orderUrl = absolute_url($CFG['public_base'], $orderUrl);
  }

  $ctaUrl = $orderUrl !== '' ? $orderUrl : $siteUrl;
  $ctaLabel = $orderUrl !== '' ? 'Ver producto' : 'Ir a SCOOT SHOP';
  $preheader = 'Tu pedido ' . $orderId . ' ahora está ' . $statusLabel . '.';
  if (!empty($paragraphs)) {
    $preheader .= ' ' . $paragraphs[0];
  }

  $pillBg = $accentSoft;
  $pillBorder = '#f0cfd4';
  $pillColor = $accent;
  if ($status === 'preparing') {
    $pillBg = '#eef4ff';
    $pillBorder = '#d9e5ff';
    $pillColor = '#2563eb';
  } elseif (in_array($status, ['shipped', 'delivered'], true)) {
    $pillBg = '#eaf8ef';
    $pillBorder = '#d4ebdd';
    $pillColor = '#1a8f4a';
  }

  $details = [
    'Pedido' => $orderId,
    'Estado' => $statusLabel,
  ];

  if ($productName !== '') {
    $details['Producto'] = $productName;
  }

  if ($tracking !== '') {
    $details['Seguimiento'] = $tracking;
  }

  $paragraphHtml = '';
  foreach ($paragraphs as $paragraph) {
    $paragraphHtml .= '<p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.72;color:' . $ink . ';">' . nl2br(email_html_escape($paragraph)) . '</p>';
  }

  $detailRows = '';
  $detailCount = count($details);
  $detailIndex = 0;
  foreach ($details as $label => $value) {
    $detailIndex++;
    $detailRows .= '<tr><td style="padding:0 0 10px 0;">'
      . '<p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;line-height:1.4;color:' . $muted . ';text-transform:uppercase;letter-spacing:.08em;">' . email_html_escape($label) . '</p>'
      . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.6;color:' . $ink . ';">' . email_html_escape($value) . '</p>'
      . '</td></tr>';
    if ($detailIndex < $detailCount) {
      $detailRows .= '<tr><td style="padding:0 0 10px 0;"><div style="width:28px;height:1px;background:' . $line . ';"></div></td></tr>';
    }
  }

  $productSectionHtml = '';
  if ($productName !== '' || $productImageUrl !== '') {
    $productSectionHtml = '<tr><td style="padding:2px 28px 18px 28px;">'
      . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;"><tr>';

    if ($productImageUrl !== '') {
      $productSectionHtml .= '<td width="100" style="width:100px;padding:0 14px 0 0;vertical-align:top;">'
        . '<div style="background:#ffffff;border:1px solid ' . $line . ';border-radius:16px;padding:8px;text-align:center;">'
        . '<img src="' . email_html_escape($productImageUrl) . '" alt="' . email_html_escape($productName !== '' ? $productName : 'Producto SCOOT SHOP') . '" width="78" style="display:block;margin:0 auto;width:78px;max-width:100%;height:auto;border:0;">'
        . '</div>'
        . '</td>';
    }

    $productSectionHtml .= '<td style="padding:0;vertical-align:top;">'
      . '<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;line-height:1.4;color:' . $muted . ';text-transform:uppercase;letter-spacing:.14em;">Producto</p>'
      . '<div style="margin:0 0 10px 0;">' . $miniSegment . '</div>'
      . '<p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;line-height:1.32;color:' . $ink . ';">' . email_html_escape($productName !== '' ? $productName : 'Pedido SCOOT SHOP') . '</p>'
      . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.62;color:' . $muted . ';">Seguimos trabajando para mantenerte informado en cada paso del proceso.</p>'
      . '</td>'
      . '</tr></table>'
      . '</td></tr>';
  }

  $messageSectionHtml = '';
  if ($customMessage !== '') {
    $messageSectionHtml = '<tr><td style="padding:0 28px 18px 28px;">'
      . '<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;line-height:1.4;color:' . $muted . ';text-transform:uppercase;letter-spacing:.14em;">Mensaje adicional</p>'
      . '<div style="margin:0 0 10px 0;">' . $miniSegment . '</div>'
      . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.72;color:' . $ink . ';">' . nl2br(email_html_escape($customMessage)) . '</p>'
      . '</td></tr>';
  }

  $greeting = $customerName !== '' ? 'Hola ' . email_html_escape($customerName) . ',' : 'Hola,';

  return '<!DOCTYPE html>'
    . '<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>'
    . '<body style="margin:0;padding:0;background:' . $bg . ';">'
    . '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' . email_html_escape($preheader) . '</div>'
    . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:' . $bg . ';padding:22px 12px;">'
    . '<tr><td align="center">'
    . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;background:' . $surface . ';border:1px solid ' . $line . ';border-radius:28px;overflow:hidden;">'
    . '<tr><td style="padding:24px 28px 18px 28px;">'
    . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;">'
    . '<tr><td style="vertical-align:top;">'
    . '<table role="presentation" cellspacing="0" cellpadding="0"><tr>'
    . '<td width="56" height="56" style="width:56px;height:56px;text-align:center;vertical-align:middle;">'
    . '<img src="' . email_html_escape($logoUrl) . '" alt="SCOOT SHOP" width="56" style="display:block;margin:0 auto;width:56px;height:56px;object-fit:contain;border:0;">'
    . '</td>'
    . '<td style="padding-left:12px;vertical-align:middle;">'
    . '<p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;line-height:1.4;color:' . $muted . ';text-transform:uppercase;letter-spacing:.18em;">SCOOT SHOP</p>'
    . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:' . $muted . ';">Actualización automática de tu pedido</p>'
    . '</td>'
    . '</tr></table>'
    . '</td></tr>'
    . '<tr><td style="padding-top:18px;">'
    . '<p style="margin:0 0 14px 0;"><span style="display:inline-block;background:' . $pillBg . ';color:' . $pillColor . ';border:1px solid ' . $pillBorder . ';border-radius:999px;padding:8px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;line-height:1.2;text-transform:uppercase;letter-spacing:.08em;">' . email_html_escape($statusLabel) . '</span></p>'
    . '<h1 style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;line-height:1.08;color:' . $ink . ';">' . email_html_escape($title) . '</h1>'
    . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.68;color:' . $muted . ';">Pedido ' . email_html_escape($orderId) . '</p>'
    . '<div style="padding-top:14px;">' . $segment . '</div>'
    . '</td></tr>'
    . '</table>'
    . '</td></tr>'
    . '<tr><td style="padding:6px 28px 0 28px;">'
    . '<p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;color:' . $ink . ';">' . $greeting . '</p>'
    . $paragraphHtml
    . '</td></tr>'
    . $productSectionHtml
    . '<tr><td style="padding:0 28px 18px 28px;">'
    . '<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;line-height:1.4;color:' . $muted . ';text-transform:uppercase;letter-spacing:.14em;">Detalle del estado</p>'
    . '<div style="margin:0 0 10px 0;">' . $miniSegment . '</div>'
    . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;">'
    . $detailRows
    . '</table>'
    . '</td></tr>'
    . $messageSectionHtml
    . '<tr><td align="left" style="padding:0 28px 14px 28px;">'
    . '<a href="' . email_html_escape($ctaUrl) . '" style="display:inline-block;background:#111315;border-radius:999px;padding:13px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;">' . email_html_escape($ctaLabel) . '</a>'
    . '</td></tr>'
    . '<tr><td style="padding:0 28px 26px 28px;">'
    . '<p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.72;color:' . $ink . ';">Gracias por confiar en SCOOT SHOP.</p>'
    . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.75;color:' . $muted . ';">Si necesitas ayuda, puedes responder directamente a este correo o visitar <a href="' . email_html_escape($siteUrl) . '" style="color:' . $ink . ';text-decoration:underline;">' . email_html_escape($siteUrl) . '</a>.</p>'
    . '</td></tr>'
    . '</table>'
    . '</td></tr>'
    . '</table>'
    . '</body></html>';
}

function build_order_status_email_content(array $CFG, string $orderId, string $status, array $context = []): array {
  $customerName = trim((string)($context['customerName'] ?? ($context['payerName'] ?? '')));
  $tracking = trim((string)($context['tracking'] ?? ''));
  $customMessage = trim((string)($context['message'] ?? ''));
  $greeting = $customerName !== '' ? "Hola {$customerName},\n\n" : "Hola,\n\n";
  $title = 'Actualización de pedido';
  $paragraphs = [];

  switch ($status) {
    case 'pending_payment':
      $subject = "SCOOT SHOP - Tu pedido {$orderId} está pendiente de pago";
      $title = 'Pedido pendiente de pago';
      $paragraphs[] = "Hemos recibido tu pedido ({$orderId}), pero el pago todavía no figura como completado.";
      $paragraphs[] = 'En cuanto el pago se confirme, recibirás una nueva actualización automática por correo.';
      break;

    case 'paid':
      $subject = "SCOOT SHOP - Hemos recibido el pago de tu pedido {$orderId}";
      $title = 'Pago confirmado';
      $paragraphs[] = "Ya hemos confirmado el pago de tu pedido ({$orderId}).";
      $paragraphs[] = 'Nuestro equipo ya ha iniciado la preparación para dejarlo listo lo antes posible.';
      break;

    case 'preparing':
      $subject = "SCOOT SHOP - Tu pedido {$orderId} ya está en preparación";
      $title = 'Pedido en preparación';
      $paragraphs[] = "Tu pedido ({$orderId}) ya está en preparación.";
      $paragraphs[] = 'Te avisaremos de nuevo en cuanto quede entregado al transportista.';
      break;

    case 'shipped':
      $subject = "SCOOT SHOP - Tu pedido {$orderId} ya ha sido enviado";
      $title = 'Pedido enviado';
      $paragraphs[] = "Tu pedido ({$orderId}) ya ha salido de nuestras instalaciones.";
      if ($tracking !== '') {
        $paragraphs[] = "Tu número de seguimiento es: {$tracking}";
      }
      $paragraphs[] = 'En breve deberías empezar a ver movimientos en el seguimiento del transporte.';
      break;

    case 'delivered':
      $subject = "SCOOT SHOP - Tu pedido {$orderId} figura como entregado";
      $title = 'Pedido entregado';
      $paragraphs[] = "La empresa de transporte marca tu pedido ({$orderId}) como entregado.";
      $paragraphs[] = 'Si todo está correcto, ya puedes disfrutarlo.';
      $paragraphs[] = 'Si detectas cualquier incidencia, responde a este correo y lo revisamos.';
      break;

    case 'canceled':
      $subject = "SCOOT SHOP - Tu pedido {$orderId} ha sido cancelado";
      $title = 'Pedido cancelado';
      $paragraphs[] = "El pedido ({$orderId}) ha sido cancelado.";
      $paragraphs[] = 'Si necesitas ayuda para tramitar uno nuevo o resolver una incidencia, contáctanos.';
      break;

    case 'refunded':
      $subject = "SCOOT SHOP - Tu pedido {$orderId} ha sido reembolsado";
      $title = 'Reembolso procesado';
      $paragraphs[] = "Hemos tramitado el reembolso de tu pedido ({$orderId}).";
      $paragraphs[] = 'El abono puede tardar unos días en reflejarse según tu banco o método de pago.';
      break;

    case 'dispute':
      $subject = "SCOOT SHOP - Estamos revisando tu pedido {$orderId}";
      $title = 'Pedido en revisión';
      $paragraphs[] = "Tu pedido ({$orderId}) ha pasado a revisión.";
      $paragraphs[] = 'Nuestro equipo lo revisará y te contactará si necesitamos más información.';
      break;

    case 'payment_failed':
      $subject = "SCOOT SHOP - No hemos podido confirmar el pago de tu pedido {$orderId}";
      $title = 'Pago no confirmado';
      $paragraphs[] = "No hemos podido confirmar el pago de tu pedido ({$orderId}).";
      $paragraphs[] = 'Si has intentado pagar recientemente, revisaremos la incidencia y te avisaremos si necesitamos algo más.';
      break;

    default:
      $subject = "SCOOT SHOP - Actualización de tu pedido {$orderId}";
      $title = 'Actualización de pedido';
      $paragraphs[] = "El estado de tu pedido ({$orderId}) ha cambiado a: " . order_status_label($status) . '.';
      break;
  }

  $body = $greeting;
  foreach ($paragraphs as $paragraph) {
    $body .= $paragraph . "\n\n";
  }
  if ($customMessage !== '') {
    $body .= "Mensaje adicional: {$customMessage}\n\n";
  }
  $body .= "Gracias,\nSCOOT SHOP\n";

  $context['orderStatus'] = $status;

  return [
    'event' => order_status_event($status),
    'subject' => $subject,
    'text' => $body,
    'html' => build_order_status_email_html($CFG, $orderId, $title, order_status_label($status), $paragraphs, $context),
  ];
}

function send_transactional_email(array $CFG, string $recipientEmail, string $event, string $orderId, string $subject, string $textBody, string $htmlBody = '', array $context = []): bool {
  if ($recipientEmail === '') {
    return false;
  }

  $usedVercelRelay = false;

  if ($CFG['vercel_email_endpoint'] !== '') {
    $headers = [];
    if ($CFG['vercel_email_bearer_token'] !== '') {
      $headers[] = 'Authorization: Bearer ' . $CFG['vercel_email_bearer_token'];
    }

    $payload = [
      'event' => $event,
      'orderId' => $orderId,
      'payerEmail' => $recipientEmail,
      'mailFrom' => $CFG['mail_from'],
      'publicBase' => $CFG['public_base'],
      'subject' => $subject,
      'text' => $textBody,
      'html' => $htmlBody,
      'context' => $context,
    ];

    try {
      $response = post_json_request($CFG['vercel_email_endpoint'], $payload, $headers);
      if ($response['status'] >= 200 && $response['status'] < 300) {
        $usedVercelRelay = true;
      } else {
        error_log('send_transactional_email relay failed for event ' . $event . ': HTTP ' . $response['status'] . ' body=' . substr((string)$response['raw'], 0, 1000));
      }
    } catch (Throwable $e) {
      error_log('send_transactional_email relay exception for event ' . $event . ': ' . $e->getMessage());
      $usedVercelRelay = false;
    }
  }

  if ($usedVercelRelay || !$CFG['vercel_email_fallback_local']) {
    return $usedVercelRelay;
  }

  $headers = "MIME-Version: 1.0\r\n".
             "From: SCOOT SHOP <{$CFG['mail_from']}>\r\n".
             "Reply-To: {$CFG['mail_from']}\r\n";

  if ($htmlBody !== '') {
    $boundary = '=_SCOOTSHOP_' . md5(uniqid((string)mt_rand(), true));
    $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";

    $message = "--{$boundary}\r\n".
      "Content-Type: text/plain; charset=UTF-8\r\n".
      "Content-Transfer-Encoding: 8bit\r\n\r\n".
      $textBody . "\r\n\r\n".
      "--{$boundary}\r\n".
      "Content-Type: text/html; charset=UTF-8\r\n".
      "Content-Transfer-Encoding: 8bit\r\n\r\n".
      $htmlBody . "\r\n\r\n".
      "--{$boundary}--\r\n";
  } else {
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $message = $textBody;
  }

  $sent = @mail($recipientEmail, encode_mail_subject($subject), $message, $headers);
  if (!$sent) {
    error_log('send_transactional_email local mail() failed for event ' . $event . ' order ' . $orderId . ' to ' . $recipientEmail);
  }

  return $sent;
}

function send_order_status_email(array $CFG, string $recipientEmail, string $orderId, string $status, array $context = []): bool {
  $context['logoUrl'] = absolute_url($CFG['public_base'], '/img/0-removebg-preview.webp');
  $content = build_order_status_email_content($CFG, $orderId, $status, $context);
  $context['orderStatus'] = $status;
  $context['statusLabel'] = order_status_label($status);

  return send_transactional_email(
    $CFG,
    $recipientEmail,
    $content['event'],
    $orderId,
    $content['subject'],
    $content['text'],
    $content['html'],
    $context
  );
}

function send_paid_email(array $CFG, string $payerEmail, string $orderId, array $context = []): void {
  send_order_status_email($CFG, $payerEmail, $orderId, 'paid', $context);
}

// ---------------- ROUTER ----------------
$route = $_GET['route'] ?? '';

// Lazy DB connection — only connect when a route needs it
$pdo = null;
function get_pdo(array $CFG): PDO {
  global $pdo;
  if ($pdo !== null) return $pdo;
  try {
    $pdo = pdo_conn($CFG);
    ensure_schema($pdo);
  } catch (Throwable $e) {
    error_log('get_pdo failed: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'db_error', 'detail' => $e->getMessage()], 500);
  }
  return $pdo;
}

switch ($route) {

  case 'health': {
    json_out([
      'ok' => true,
      'env' => $CFG['paypal_env'],
      'paypal_client_configured' => $CFG['paypal_client_id'] !== '',
      'stripe_configured' => $CFG['stripe_secret_key'] !== '',
      'stripe_publishable_configured' => $CFG['stripe_publishable_key'] !== '',
      'vercel_email_configured' => $CFG['vercel_email_endpoint'] !== '',
      'vercel_email_fallback_local' => $CFG['vercel_email_fallback_local'],
      'paypal_action' => $CFG['paypal_action'],
      'business_email' => $CFG['paypal_business_email'],
      'notify_url' => $CFG['notify_url'],
    ]);
  }

  case 'paypal_config': {
    if ($CFG['paypal_client_id'] === '') {
      json_out(['ok' => false, 'error' => 'paypal_client_not_configured'], 503);
    }

    json_out([
      'ok' => true,
      'clientId' => $CFG['paypal_client_id'],
      'env' => $CFG['paypal_env'],
      'currency' => 'EUR',
      'intent' => 'capture',
    ]);
  }

  case 'paypal_create_order': {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    try {
      $proxy = proxy_json_request(rtrim((string)$CFG['paypal_proxy_base'], '/') . '/create-order', get_json_body(), 'POST');
      json_out($proxy['body'], $proxy['status']);
    } catch (Throwable $e) {
      json_out(['ok' => false, 'error' => 'paypal_create_order_failed', 'detail' => $e->getMessage()], 502);
    }
  }

  case 'paypal_capture_order': {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    try {
      $proxy = proxy_json_request(rtrim((string)$CFG['paypal_proxy_base'], '/') . '/capture-order', get_json_body(), 'POST');
      json_out($proxy['body'], $proxy['status']);
    } catch (Throwable $e) {
      json_out(['ok' => false, 'error' => 'paypal_capture_order_failed', 'detail' => $e->getMessage()], 502);
    }
  }

  case 'stripe_config': {
    if ($CFG['stripe_publishable_key'] === '') {
      json_out(['ok' => false, 'error' => 'stripe_publishable_not_configured'], 503);
    }

    json_out([
      'ok' => true,
      'publishableKey' => $CFG['stripe_publishable_key'],
    ]);
  }

  case 'stripe_checkout': {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    if ($CFG['stripe_secret_key'] === '' || $CFG['stripe_publishable_key'] === '') {
      json_out(['ok' => false, 'error' => 'stripe_not_configured'], 503);
    }

    $b = get_json_body();

    $sku = trim((string)($b['sku'] ?? ''));
    $name = trim((string)($b['name'] ?? ''));
    $amount = trim((string)($b['price'] ?? $b['amount'] ?? ''));
    $currency = strtolower(trim((string)($b['currency'] ?? 'eur')));
    $ref = trim((string)($b['ref'] ?? ''));
    $productUrl = trim((string)($b['productUrl'] ?? ''));
    $productImageUrl = trim((string)($b['productImageUrl'] ?? ''));
    $checkoutPath = trim((string)($b['checkoutPath'] ?? '/pago?method=card'));
    $paymentMethodMode = strtolower(trim((string)($b['paymentMethodMode'] ?? 'dynamic')));
    $paymentUiMode = strtolower(trim((string)($b['paymentUiMode'] ?? 'embedded')));

    // Shipping data from checkout step
    $shipping = is_array($b['shipping'] ?? null) ? $b['shipping'] : [];
    $shipName     = mb_substr(trim((string)($shipping['fullName'] ?? '')), 0, 190);
    $shipEmail    = mb_substr(trim((string)($shipping['email'] ?? '')), 0, 190);
    $shipPhone    = mb_substr(trim((string)($shipping['phone'] ?? '')), 0, 32);
    $shipAddress  = mb_substr(trim((string)($shipping['addressLine1'] ?? '')), 0, 255);
    $shipAddress2 = mb_substr(trim((string)($shipping['addressLine2'] ?? '')), 0, 255);
    $shipCity     = mb_substr(trim((string)($shipping['city'] ?? '')), 0, 100);
    $shipProvince = mb_substr(trim((string)($shipping['province'] ?? '')), 0, 100);
    $shipPostal   = mb_substr(trim((string)($shipping['postalCode'] ?? '')), 0, 16);
    $shipCountry  = mb_substr(trim((string)($shipping['country'] ?? '')), 0, 60);

    if ($sku === '' || $name === '' || $amount === '' || !preg_match('/^\d+(\.\d{2})?$/', $amount)) {
      json_out(['ok' => false, 'error' => 'bad_request'], 400);
    }

    if (!preg_match('/^[a-z]{3}$/', $currency)) {
      json_out(['ok' => false, 'error' => 'bad_currency'], 400);
    }

    $orderId = new_order_id();
    $token = new_token();
    $now = date('Y-m-d H:i:s');
    $pdo = get_pdo($CFG);

    $st = $pdo->prepare("
      INSERT INTO orders (id, token, sku, name, amount, currency, status, product_url, product_image_url,
        ship_name, ship_email, ship_phone, ship_address, ship_address2, ship_city, ship_province, ship_postal, ship_country,
        created_at, updated_at)
      VALUES (:id, :token, :sku, :name, :amount, :currency, 'pending_payment', :product_url, :product_image_url,
        :ship_name, :ship_email, :ship_phone, :ship_address, :ship_address2, :ship_city, :ship_province, :ship_postal, :ship_country,
        :created_at, :updated_at)
    ");
    $st->execute([
      ':id' => $orderId,
      ':token' => $token,
      ':sku' => $sku,
      ':name' => $name,
      ':amount' => $amount,
      ':currency' => strtoupper($currency),
      ':product_url' => $productUrl !== '' ? absolute_url($CFG['public_base'], $productUrl) : null,
      ':product_image_url' => $productImageUrl !== '' ? absolute_url($CFG['public_base'], $productImageUrl) : null,
      ':ship_name' => $shipName !== '' ? $shipName : null,
      ':ship_email' => $shipEmail !== '' ? $shipEmail : null,
      ':ship_phone' => $shipPhone !== '' ? $shipPhone : null,
      ':ship_address' => $shipAddress !== '' ? $shipAddress : null,
      ':ship_address2' => $shipAddress2 !== '' ? $shipAddress2 : null,
      ':ship_city' => $shipCity !== '' ? $shipCity : null,
      ':ship_province' => $shipProvince !== '' ? $shipProvince : null,
      ':ship_postal' => $shipPostal !== '' ? $shipPostal : null,
      ':ship_country' => $shipCountry !== '' ? $shipCountry : null,
      ':created_at' => $now,
      ':updated_at' => $now,
    ]);

    try {
      $returnBase = $checkoutPath !== '' ? $checkoutPath : '/pago?method=card';
      $returnGlue = strpos($returnBase, '?') === false ? '?' : '&';
      if (strpos($returnBase, 'method=') === false) {
        $returnBase .= $returnGlue . 'method=card';
        $returnGlue = '&';
      }
      if (strpos($returnBase, 'order=') === false) {
        $returnBase .= $returnGlue . 'order=' . rawurlencode($orderId);
        $returnGlue = '&';
      }
      if (strpos($returnBase, 'session_id=') === false) {
        $returnBase .= $returnGlue . 'session_id={CHECKOUT_SESSION_ID}';
      }

      $payload = [
        'mode' => 'payment',
        'locale' => 'es',
        'billing_address_collection' => 'auto',
        'phone_number_collection[enabled]' => 'true',
        'customer_email' => $shipEmail !== '' ? $shipEmail : null,
        'client_reference_id' => $orderId,
        'metadata[order_id]' => $orderId,
        'metadata[sku]' => $sku,
        'metadata[ref]' => $ref,
        'metadata[ship_name]' => $shipName,
        'metadata[ship_address]' => implode(', ', array_filter([$shipAddress, $shipAddress2])),
        'metadata[ship_city]' => implode(' ', array_filter([$shipPostal, $shipCity])),
        'metadata[ship_province]' => $shipProvince,
        'metadata[ship_country]' => $shipCountry,
        'line_items[0][quantity]' => 1,
        'line_items[0][price_data][currency]' => $currency,
        'line_items[0][price_data][unit_amount]' => money_to_cents($amount),
        'line_items[0][price_data][product_data][name]' => $name,
        'payment_intent_data[metadata][order_id]' => $orderId,
        'payment_intent_data[metadata][sku]' => $sku,
      ];

      if ($paymentUiMode === 'hosted') {
        $methodKey = $paymentMethodMode === 'klarna' ? 'klarna' : ($paymentMethodMode === 'paypal' ? 'paypal' : 'card');
        $cancelBase = $checkoutPath !== '' ? $checkoutPath : '/pago?method=' . $methodKey;
        $cancelGlue = strpos($cancelBase, '?') === false ? '?' : '&';
        if (strpos($cancelBase, 'method=') === false) {
          $cancelBase .= $cancelGlue . 'method=' . $methodKey;
          $cancelGlue = '&';
        }
        if (strpos($cancelBase, 'order=') === false) {
          $cancelBase .= $cancelGlue . 'order=' . rawurlencode($orderId);
          $cancelGlue = '&';
        }
        if (strpos($cancelBase, 'cancelled=') === false) {
          $cancelBase .= $cancelGlue . 'cancelled=1';
        }

        $payload['success_url'] = absolute_url($CFG['public_base'], $returnBase);
        $payload['cancel_url'] = absolute_url($CFG['public_base'], $cancelBase);
      } else {
        $payload['ui_mode'] = 'embedded';
        $payload['return_url'] = absolute_url($CFG['public_base'], $returnBase);
        $payload['redirect_on_completion'] = 'if_required';
      }

      if ($paymentMethodMode === 'klarna') {
        $payload['payment_method_types[0]'] = 'klarna';
      } elseif ($paymentMethodMode === 'paypal') {
        $payload['payment_method_types[0]'] = 'paypal';
      } else {
        $payload['excluded_payment_method_types[0]'] = 'klarna';
        $payload['excluded_payment_method_types[1]'] = 'paypal';
      }

      if ($ref !== '') {
        $payload['payment_intent_data[description]'] = 'Pedido ' . $ref;
      }

      if ($productUrl !== '') {
        $payload['metadata[product_url]'] = absolute_url($CFG['public_base'], $productUrl);
      }

      if ($productImageUrl !== '') {
        $payload['line_items[0][price_data][product_data][images][0]'] = absolute_url($CFG['public_base'], $productImageUrl);
      }

      $stripe = stripe_api_request($CFG['stripe_secret_key'], '/checkout/sessions', $payload);
      $session = $stripe['body'];
      $expectsHostedUrl = ($paymentUiMode === 'hosted');
      $hasExpectedCheckoutTarget = $expectsHostedUrl ? !empty($session['url']) : !empty($session['client_secret']);

      if ($stripe['status'] >= 400 || empty($session['id']) || !$hasExpectedCheckoutTarget) {
        throw new RuntimeException((string)($session['error']['message'] ?? 'stripe_checkout_error'));
      }

      $st = $pdo->prepare("UPDATE orders SET txn_id = :txn_id, updated_at = :updated_at WHERE id = :id");
      $st->execute([
        ':txn_id' => (string)$session['id'],
        ':updated_at' => date('Y-m-d H:i:s'),
        ':id' => $orderId,
      ]);

      json_out([
        'ok' => true,
        'orderId' => $orderId,
        'sessionId' => (string)$session['id'],
        'clientSecret' => (string)($session['client_secret'] ?? ''),
        'checkoutUrl' => (string)($session['url'] ?? ''),
        'publishableKey' => $CFG['stripe_publishable_key'],
      ]);
    } catch (Throwable $e) {
      $pdo->prepare("DELETE FROM orders WHERE id = :id")->execute([':id' => $orderId]);
      json_out(['ok' => false, 'error' => 'stripe_checkout_failed', 'detail' => $e->getMessage()], 502);
    }
  }

  case 'stripe_session_status': {
    if ($CFG['stripe_secret_key'] === '') {
      json_out(['ok' => false, 'error' => 'stripe_not_configured'], 503);
    }

    $sessionId = trim((string)($_GET['session_id'] ?? ''));
    if ($sessionId === '') {
      json_out(['ok' => false, 'error' => 'missing_session_id'], 400);
    }

    try {
      $session = stripe_fetch_checkout_session($CFG['stripe_secret_key'], $sessionId);

      if (stripe_session_is_paid($session)) {
        reconcile_paid_stripe_session(get_pdo($CFG), $CFG, $session);
      }

      json_out([
        'ok' => true,
        'id' => (string)$session['id'],
        'status' => (string)($session['status'] ?? ''),
        'payment_status' => (string)($session['payment_status'] ?? ''),
        'orderId' => stripe_session_order_id($session),
      ]);
    } catch (Throwable $e) {
      json_out(['ok' => false, 'error' => 'stripe_session_status_failed', 'detail' => $e->getMessage()], 502);
    }
  }

  case 'stripe_webhook': {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      text_out('METHOD_NOT_ALLOWED', 405);
    }

    if ($CFG['stripe_webhook_secret'] === '') {
      text_out('STRIPE_NOT_CONFIGURED', 503);
    }

    $raw = file_get_contents('php://input') ?: '';
    $signature = header_get('stripe-signature');

    if (!verify_stripe_signature($raw, $signature, $CFG['stripe_webhook_secret'])) {
      text_out('INVALID_SIGNATURE', 400);
    }

    $event = json_decode($raw, true);
    if (!is_array($event)) {
      text_out('INVALID_PAYLOAD', 400);
    }

    try {
      $type = (string)($event['type'] ?? '');
      $object = $event['data']['object'] ?? [];

      if (($type === 'checkout.session.completed' || $type === 'checkout.session.async_payment_succeeded') && is_array($object)) {
        $sessionId = trim((string)($object['id'] ?? ''));
        $session = $object;

        if ($sessionId !== '') {
          try {
            $session = stripe_fetch_checkout_session($CFG['stripe_secret_key'], $sessionId);
          } catch (Throwable $e) {
            error_log('stripe_webhook session fetch fallback for ' . $sessionId . ': ' . $e->getMessage());
            $session = $object;
          }
        }

        if (stripe_session_order_id($session) !== '') {
          reconcile_paid_stripe_session(get_pdo($CFG), $CFG, $session);
        }
      }

      if (($type === 'charge.succeeded' || $type === 'charge.updated') && is_array($object)) {
        $chargeStatus = trim((string)($object['status'] ?? ''));
        $isPaidCharge = !empty($object['paid']) && $chargeStatus === 'succeeded';

        if ($isPaidCharge) {
          $orderId = trim((string)($object['metadata']['order_id'] ?? ''));
          if ($orderId !== '') {
            reconcile_paid_stripe_order(get_pdo($CFG), $CFG, [
              'orderId' => $orderId,
              'payerEmail' => trim((string)($object['billing_details']['email'] ?? $object['receipt_email'] ?? '')),
              'payerName' => trim((string)($object['billing_details']['name'] ?? '')),
              'txnId' => trim((string)($object['payment_intent'] ?? $object['id'] ?? '')),
              'currency' => strtoupper((string)($object['currency'] ?? 'EUR')),
              'amountTotal' => (int)($object['amount_captured'] ?? $object['amount'] ?? 0),
              'provider' => 'stripe',
              'paymentStatus' => $chargeStatus,
              'sourceId' => trim((string)($object['id'] ?? '')),
              'sourceType' => 'charge',
              'productName' => trim((string)($object['metadata']['sku'] ?? '')),
              'sku' => trim((string)($object['metadata']['sku'] ?? '')),
            ]);
          }
        }
      }

      if ($type === 'payment_intent.succeeded' && is_array($object)) {
        $paymentIntent = $object;
        $paymentIntentId = trim((string)($paymentIntent['id'] ?? ''));

        if ($paymentIntentId !== '') {
          try {
            $paymentIntent = stripe_fetch_payment_intent($CFG['stripe_secret_key'], $paymentIntentId);
          } catch (Throwable $e) {
            error_log('stripe_webhook payment_intent fetch fallback for ' . $paymentIntentId . ': ' . $e->getMessage());
            $paymentIntent = $object;
          }
        }

        $orderId = trim((string)($paymentIntent['metadata']['order_id'] ?? ''));
        if ($orderId !== '') {
          $latestCharge = [];
          if (isset($paymentIntent['latest_charge']) && is_array($paymentIntent['latest_charge'])) {
            $latestCharge = $paymentIntent['latest_charge'];
          } elseif (isset($paymentIntent['charges']['data'][0]) && is_array($paymentIntent['charges']['data'][0])) {
            $latestCharge = $paymentIntent['charges']['data'][0];
          }

          reconcile_paid_stripe_order(get_pdo($CFG), $CFG, [
            'orderId' => $orderId,
            'payerEmail' => trim((string)($paymentIntent['receipt_email'] ?? $latestCharge['billing_details']['email'] ?? '')),
            'payerName' => trim((string)($latestCharge['billing_details']['name'] ?? '')),
            'txnId' => $paymentIntentId,
            'currency' => strtoupper((string)($paymentIntent['currency'] ?? 'EUR')),
            'amountTotal' => (int)($paymentIntent['amount_received'] ?? $paymentIntent['amount'] ?? 0),
            'provider' => 'stripe',
            'paymentStatus' => trim((string)($paymentIntent['status'] ?? 'succeeded')),
            'sourceId' => $paymentIntentId,
            'sourceType' => 'payment_intent',
            'productName' => trim((string)($paymentIntent['metadata']['sku'] ?? '')),
            'sku' => trim((string)($paymentIntent['metadata']['sku'] ?? '')),
          ]);
        }
      }

      if (($type === 'checkout.session.expired' || $type === 'checkout.session.async_payment_failed') && is_array($object)) {
        $orderId = trim((string)($object['client_reference_id'] ?? ($object['metadata']['order_id'] ?? '')));
        if ($orderId !== '') {
          $stUp = get_pdo($CFG)->prepare("\n            UPDATE orders\n            SET status = 'canceled',\n                message = :message,\n                updated_at = :updated_at\n            WHERE id = :id AND status = 'pending_payment'\n          ");
          $stUp->execute([
            ':message' => 'El pago con Stripe no se completó. Puedes volver a intentarlo desde la página de pago.',
            ':updated_at' => date('Y-m-d H:i:s'),
            ':id' => $orderId,
          ]);
        }
      }

      text_out('OK', 200);
    } catch (Throwable $e) {
      error_log('stripe_webhook fatal: type=' . (string)($event['type'] ?? '') . ' message=' . $e->getMessage() . ' file=' . $e->getFile() . ':' . $e->getLine());
      text_out('WEBHOOK_ERROR: ' . $e->getMessage(), 500);
    }
  }

  case 'orders_create': {
    $b = get_json_body();

    $sku = trim((string)($b['sku'] ?? ''));
    $name = trim((string)($b['name'] ?? ''));
    $amount = trim((string)($b['amount'] ?? ''));
    $currency = strtoupper(trim((string)($b['currency'] ?? 'EUR')));

    if ($sku === '' || $name === '' || $amount === '' || !preg_match('/^\d+(\.\d{2})?$/', $amount)) {
      json_out(['ok'=>false,'error'=>'bad_request'], 400);
    }

    $orderId = new_order_id();
    $token = new_token();
    $now = date('Y-m-d H:i:s');

    $st = get_pdo($CFG)->prepare("
      INSERT INTO orders (id, token, sku, name, amount, currency, status, created_at, updated_at)
      VALUES (:id, :token, :sku, :name, :amount, :currency, 'pending_payment', :created_at, :updated_at)
    ");
    $st->execute([
      ':id' => $orderId,
      ':token' => $token,
      ':sku' => $sku,
      ':name' => $name,
      ':amount' => $amount,
      ':currency' => $currency,
      ':created_at' => $now,
      ':updated_at' => $now,
    ]);

    json_out(['ok'=>true, 'orderId'=>$orderId, 'token'=>$token]);
  }

  case 'orders_get': {
    $id = (string)($_GET['id'] ?? '');
    $token = (string)($_GET['token'] ?? '');

    if ($id === '' || $token === '') json_out(['ok'=>false,'error'=>'missing'], 400);

    $st = get_pdo($CFG)->prepare("SELECT * FROM orders WHERE id = :id LIMIT 1");
    $st->execute([':id'=>$id]);
    $o = $st->fetch();

    if (!$o) json_out(['ok'=>false,'error'=>'not_found'], 404);
    if (!hash_equals((string)$o['token'], $token)) json_out(['ok'=>false,'error'=>'forbidden'], 403);

    // Respuesta para /pedido
    json_out([
      'ok'=>true,
      'id'=>$o['id'],
      'status'=>$o['status'],
      'message'=>$o['message'] ?: '',
      'tracking'=>$o['tracking'] ?: '',
      'updated_at'=>$o['updated_at'],
      'shipping'=>[
        'name'=>$o['ship_name'] ?? '',
        'email'=>$o['ship_email'] ?? '',
        'phone'=>$o['ship_phone'] ?? '',
        'address'=>$o['ship_address'] ?? '',
        'address2'=>$o['ship_address2'] ?? '',
        'city'=>$o['ship_city'] ?? '',
        'province'=>$o['ship_province'] ?? '',
        'postal'=>$o['ship_postal'] ?? '',
        'country'=>$o['ship_country'] ?? '',
      ],
    ]);
  }

  case 'admin_status': {
    $key = header_get('x-admin-key');
    if (!hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $id = (string)($_GET['id'] ?? '');
    if ($id === '') json_out(['ok'=>false,'error'=>'missing_id'], 400);

    $pdo = get_pdo($CFG);
    $stOrder = $pdo->prepare("SELECT * FROM orders WHERE id = :id LIMIT 1");
    $stOrder->execute([':id' => $id]);
    $order = $stOrder->fetch();
    if (!$order) json_out(['ok'=>false,'error'=>'not_found'], 404);

    $previousStatus = trim((string)($order['status'] ?? ''));

    $b = get_json_body();
    $status = trim((string)($b['status'] ?? ''));
    $tracking = $b['tracking'] ?? null;
    $message = $b['message'] ?? null;

    $allowed = ['pending_payment','paid','preparing','shipped','delivered','canceled','refunded','dispute','payment_failed'];
    if (!in_array($status, $allowed, true)) json_out(['ok'=>false,'error'=>'bad_status'], 400);

    $now = date('Y-m-d H:i:s');
    $st = $pdo->prepare("
      UPDATE orders
      SET status=:status, tracking=:tracking, message=:message, updated_at=:updated_at
      WHERE id=:id
    ");
    $st->execute([
      ':status'=>$status,
      ':tracking'=>$tracking,
      ':message'=>$message,
      ':updated_at'=>$now,
      ':id'=>$id
    ]);

    $statusChanged = $previousStatus !== $status;
    $customerEmail = trim((string)($order['ship_email'] ?? ''));
    if ($customerEmail === '') {
      $customerEmail = trim((string)($order['payer_email'] ?? ''));
    }

    $customerName = trim((string)($order['ship_name'] ?? ''));
    if ($customerName === '') {
      $customerName = trim((string)($order['payer_name'] ?? ''));
    }

    $emailNotification = [
      'attempted' => false,
      'sent' => false,
      'email' => $customerEmail,
      'reason' => $statusChanged ? 'not_attempted' : 'status_unchanged',
    ];

    if ($statusChanged) {
      if ($customerEmail === '') {
        $emailNotification['reason'] = 'missing_customer_email';
      } else {
        $emailNotification['attempted'] = true;
        $emailNotification['sent'] = send_order_status_email($CFG, $customerEmail, $id, $status, [
          'customerName' => $customerName,
          'payerName' => trim((string)($order['payer_name'] ?? '')),
          'tracking' => trim((string)($tracking ?? '')),
          'message' => trim((string)($message ?? '')),
          'productName' => trim((string)($order['name'] ?? '')),
          'sku' => trim((string)($order['sku'] ?? '')),
          'orderUrl' => trim((string)($order['product_url'] ?? '')),
          'productImageUrl' => trim((string)($order['product_image_url'] ?? '')),
          'source' => 'admin',
          'previousStatus' => $previousStatus,
        ]);
        $emailNotification['reason'] = $emailNotification['sent'] ? 'sent' : 'send_failed';
      }
    }

    json_out([
      'ok' => true,
      'statusChanged' => $statusChanged,
      'previousStatus' => $previousStatus,
      'status' => $status,
      'emailNotification' => $emailNotification,
    ]);
  }

  case 'admin_order_detail': {
    $key = header_get('x-admin-key');
    if (!hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $id = (string)($_GET['id'] ?? '');
    if ($id === '') json_out(['ok'=>false,'error'=>'missing_id'], 400);

    $st = get_pdo($CFG)->prepare("SELECT * FROM orders WHERE id = :id LIMIT 1");
    $st->execute([':id'=>$id]);
    $o = $st->fetch();
    if (!$o) json_out(['ok'=>false,'error'=>'not_found'], 404);

    json_out([
      'ok'=>true,
      'order'=>[
        'id'=>$o['id'],
        'sku'=>$o['sku'] ?? '',
        'name'=>$o['name'] ?? '',
        'amount'=>$o['amount'] ?? '',
        'currency'=>$o['currency'] ?? 'EUR',
        'status'=>$o['status'] ?? '',
        'payer_email'=>$o['payer_email'] ?? '',
        'payer_name'=>$o['payer_name'] ?? '',
        'txn_id'=>$o['txn_id'] ?? '',
        'tracking'=>$o['tracking'] ?? '',
        'message'=>$o['message'] ?? '',
        'created_at'=>$o['created_at'] ?? '',
        'updated_at'=>$o['updated_at'] ?? '',
        'shipping'=>[
          'name'=>$o['ship_name'] ?? '',
          'email'=>$o['ship_email'] ?? '',
          'phone'=>$o['ship_phone'] ?? '',
          'address'=>$o['ship_address'] ?? '',
          'address2'=>$o['ship_address2'] ?? '',
          'city'=>$o['ship_city'] ?? '',
          'province'=>$o['ship_province'] ?? '',
          'postal'=>$o['ship_postal'] ?? '',
          'country'=>$o['ship_country'] ?? '',
        ],
      ],
    ]);
  }

  case 'admin_resend_paid_email': {
    $key = header_get('x-admin-key');
    if (!hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $orderId = trim((string)($_GET['id'] ?? ''));
    if ($orderId === '') {
      $b = get_json_body();
      $orderId = trim((string)($b['orderId'] ?? $b['id'] ?? ''));
    }

    if ($orderId === '') {
      json_out(['ok' => false, 'error' => 'missing_id'], 400);
    }

    $pdo = get_pdo($CFG);
    $st = $pdo->prepare("SELECT * FROM orders WHERE id = :id LIMIT 1");
    $st->execute([':id' => $orderId]);
    $order = $st->fetch();

    if (!$order) {
      json_out(['ok' => false, 'error' => 'not_found'], 404);
    }

    if (($order['status'] ?? '') !== 'paid' && $CFG['stripe_secret_key'] !== '') {
      $txnId = trim((string)($order['txn_id'] ?? ''));
      if ($txnId !== '' && str_starts_with($txnId, 'cs_')) {
        try {
          $session = stripe_fetch_checkout_session($CFG['stripe_secret_key'], $txnId);
          if (stripe_session_is_paid($session)) {
            reconcile_paid_stripe_session($pdo, $CFG, $session);
            $st->execute([':id' => $orderId]);
            $order = $st->fetch() ?: $order;
          }
        } catch (Throwable $e) {
          error_log('admin_resend_paid_email reconcile error: ' . $e->getMessage());
        }
      }
    }

    $payerEmail = trim((string)($order['payer_email'] ?? ''));
    if ($payerEmail === '') {
      json_out(['ok' => false, 'error' => 'missing_payer_email'], 409);
    }

    send_paid_email($CFG, $payerEmail, $orderId, [
      'provider' => 'stripe',
      'orderStatus' => (string)($order['status'] ?? ''),
      'productName' => (string)($order['name'] ?? 'Pedido Scoot Shop'),
      'sku' => (string)($order['sku'] ?? ''),
      'orderUrl' => (string)($order['product_url'] ?? ''),
      'productImageUrl' => (string)($order['product_image_url'] ?? ''),
      'manualResend' => true,
    ]);

    json_out([
      'ok' => true,
      'orderId' => $orderId,
      'payerEmail' => $payerEmail,
    ]);
  }

  case 'paypal_ipn': {
    // PayPal IPN (POST)
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') text_out('EMPTY', 400);

    // Validación con PayPal
    $verifyBody = 'cmd=_notify-validate&' . $raw;

    $ch = curl_init($CFG['paypal_verify']);
    curl_setopt_array($ch, [
      CURLOPT_POST => true,
      CURLOPT_POSTFIELDS => $verifyBody,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_HEADER => false,
      CURLOPT_SSL_VERIFYPEER => true,
      CURLOPT_SSL_VERIFYHOST => 2,
      CURLOPT_CONNECTTIMEOUT => 10,
      CURLOPT_TIMEOUT => 20,
    ]);
    $resp = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    // Log siempre
    parse_str($raw, $ipn);

    $invoice = (string)($ipn['invoice'] ?? '');
    $custom = (string)($ipn['custom'] ?? '');
    $payment_status = (string)($ipn['payment_status'] ?? '');
    $txn_id = (string)($ipn['txn_id'] ?? '');
    $receiver_email = strtolower((string)($ipn['receiver_email'] ?? $ipn['business'] ?? ''));

    $orderId = $invoice;
    if ($orderId === '' && $custom !== '') {
      $parts = explode('|', $custom);
      $orderId = $parts[0] ?? '';
    }

    $pdo = get_pdo($CFG);
    $stLog = $pdo->prepare("INSERT INTO ipn_events (order_id, txn_id, payment_status, raw, created_at) VALUES (:oid,:txn,:ps,:raw,:dt)");
    $stLog->execute([
      ':oid' => $orderId ?: null,
      ':txn' => $txn_id ?: null,
      ':ps'  => $payment_status ?: null,
      ':raw' => $raw,
      ':dt'  => date('Y-m-d H:i:s'),
    ]);

    if ($resp === false) {
      text_out('ERR ' . $curlErr, 200);
    }

    if (trim((string)$resp) !== 'VERIFIED') {
      // NO actualizamos pedidos si no es VERIFIED
      text_out('INVALID', 200);
    }

    // Seguridad: asegurar que el pago va a TU email
    if ($CFG['paypal_business_email'] !== 'TU_PAYPAL_BUSINESS_EMAIL_AQUI') {
      if (!hash_equals(strtolower($CFG['paypal_business_email']), $receiver_email)) {
        text_out('RECEIVER_MISMATCH', 200);
      }
    }

    // Map status
    $newStatus = null;
    $ps = strtoupper($payment_status);

    if ($ps === 'COMPLETED') $newStatus = 'paid';
    elseif ($ps === 'PENDING') $newStatus = 'pending_payment';
    elseif ($ps === 'REFUNDED' || $ps === 'REVERSED') $newStatus = 'refunded';
    elseif ($ps === 'DENIED' || $ps === 'FAILED') $newStatus = 'canceled';

    if ($orderId && $newStatus) {
      $payer_email = (string)($ipn['payer_email'] ?? '');
      $first = (string)($ipn['first_name'] ?? '');
      $last  = (string)($ipn['last_name'] ?? '');
      $payer_name = trim($first . ' ' . $last);

      $msg = ($newStatus === 'paid')
        ? 'Pago recibido. Pedido en preparación y será enviado lo más rápido posible.'
        : null;

      $stUp = $pdo->prepare("
        UPDATE orders
        SET status=:status,
            payer_email=COALESCE(NULLIF(:payer_email,''), payer_email),
            payer_name=COALESCE(NULLIF(:payer_name,''), payer_name),
            txn_id=COALESCE(NULLIF(:txn_id,''), txn_id),
            message=COALESCE(:message, message),
            updated_at=:updated_at
        WHERE id=:id
      ");
      $stUp->execute([
        ':status'=>$newStatus,
        ':payer_email'=>$payer_email,
        ':payer_name'=>$payer_name,
        ':txn_id'=>$txn_id,
        ':message'=>$msg,
        ':updated_at'=>date('Y-m-d H:i:s'),
        ':id'=>$orderId
      ]);

      if ($newStatus === 'paid' && $payer_email !== '') {
        send_paid_email($CFG, $payer_email, $orderId, [
          'provider' => 'paypal',
          'payerName' => $payer_name,
          'txnId' => $txn_id,
          'paymentStatus' => $payment_status,
          'currency' => (string)($ipn['mc_currency'] ?? 'EUR'),
          'grossAmount' => (string)($ipn['mc_gross'] ?? ''),
          'orderStatus' => 'paid',
        ]);
      }
    }

    text_out('OK', 200);
  }

  default:
    json_out(['ok'=>false,'error'=>'route_not_found'], 404);
}
