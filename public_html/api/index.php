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
load_env_file(__DIR__ . '/../.env.local');
load_env_file(__DIR__ . '/../env');
load_env_file(__DIR__ . '/../env.local');

// Local compatibility: some PHP setups do not have mbstring enabled.
if (!function_exists('mb_substr')) {
  function mb_substr(string $string, int $start, ?int $length = null, ?string $encoding = null): string {
    unset($encoding);
    return $length === null
      ? substr($string, $start)
      : substr($string, $start, $length);
  }
}

// ---------------- CONFIG (edita esto) ----------------
$CFG = [
  // 'live' o 'sandbox'
  'paypal_env' => getenv('PAYPAL_ENV') ?: 'sandbox',

  // Email de tu cuenta PayPal Business (sandbox o real según env)
  'paypal_business_email' => getenv('PAYPAL_BUSINESS_EMAIL') ?: 'sb-hm42u48311727@business.example.com',

  // Client ID público para SDK de PayPal
  'paypal_client_id' => getenv('PAYPAL_CLIENT_ID') ?: '',

  // Client ID de Google Sign-In (FASE 3A auth)
  'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',

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
    'port' => (int)(getenv('DB_PORT') ?: 3306),
    'name' => getenv('DB_NAME') ?: '',
    'user' => getenv('DB_USER') ?: '',
    'pass' => getenv('DB_PASS') ?: '',
    'charset' => 'utf8mb4',
  ],

  // ── Sistema de descuentos ──────────────────────────────────────────────────
  // DISCOUNTS_ENABLED=false por defecto. Requiere cambio explícito en .env.
  // Con false: todas las rutas de descuento devuelven 503 feature_disabled
  // y NO se tocan tablas ni columnas de BD.
  'discounts_enabled' => strtolower(trim((string)(getenv('DISCOUNTS_ENABLED') ?: 'false'))) === 'true',

  // Entorno y flags de seguridad (A1/A2)
  'app_env' => strtolower(trim((string)(getenv('APP_ENV') ?: 'production'))),
  'allow_dev_auth' => strtolower(trim((string)(getenv('ALLOW_DEV_AUTH') ?: 'false'))) === 'true',
  'allow_preview_mode' => strtolower(trim((string)(getenv('ALLOW_PREVIEW_MODE') ?: 'false'))) === 'true',
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
// Cabeceras de seguridad globales
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

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
  static $cached = null;
  if ($cached !== null) return $cached;
  $raw = file_get_contents('php://input') ?: '';
  $j = json_decode($raw, true);
  $cached = is_array($j) ? $j : [];
  return $cached;
}

function pdo_conn(array $CFG): PDO {
  $db = $CFG['db'];
  $port = (int)($db['port'] ?? 3306);
  $dsn = "mysql:host={$db['host']};port={$port};dbname={$db['name']};charset={$db['charset']}";
  $pdo = new PDO($dsn, $db['user'], $db['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}

function ensure_schema(PDO $pdo): void {
  $pdo->exec("\n    CREATE TABLE IF NOT EXISTS users (\n      id BIGINT AUTO_INCREMENT PRIMARY KEY,\n      google_sub VARCHAR(191) NOT NULL,\n      email VARCHAR(190) NOT NULL,\n      name VARCHAR(190) NULL,\n      picture VARCHAR(255) NULL,\n      locale VARCHAR(16) NULL,\n      last_login_at DATETIME NULL,\n      created_at DATETIME NOT NULL,\n      updated_at DATETIME NOT NULL,\n      UNIQUE KEY uq_users_google_sub (google_sub),\n      UNIQUE KEY uq_users_email (email),\n      INDEX idx_users_last_login (last_login_at)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n  ");

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
      user_id BIGINT NULL,
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
    'user_id' => "BIGINT NULL",
    'payer_email' => "VARCHAR(190) NULL",
    'payer_name' => "VARCHAR(190) NULL",
    'txn_id' => "VARCHAR(64) NULL",
    'product_url' => "VARCHAR(255) NULL",
    'product_image_url' => "VARCHAR(255) NULL",
    'product_color' => "VARCHAR(64) NULL",
    'product_color_label' => "VARCHAR(128) NULL",
    'cart_items_json' => "LONGTEXT NULL",
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
    'ship_notes' => "TEXT NULL",
    'payment_method' => "VARCHAR(32) NULL",
    'discount_code' => "VARCHAR(64) NULL",
    'discount_type' => "VARCHAR(24) NULL",
    'discount_value' => "DECIMAL(10,2) NULL",
    'discount_amount' => "DECIMAL(10,2) NULL",
    'subtotal_amount' => "DECIMAL(10,2) NULL",
    'total_amount' => "DECIMAL(10,2) NULL",
    'payment_fee_amount' => "DECIMAL(10,2) NULL",
    'shipping_amount' => "DECIMAL(10,2) NULL",
    'admin_notes' => "TEXT NULL",
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

  foreach ($orderColumns as $name => $ddl) {
    if (isset($existingOrderColumns[$name])) continue;
    $pdo->exec("ALTER TABLE orders ADD COLUMN `{$name}` {$ddl}");
  }

  $existingUserColumns = [];
  foreach ($pdo->query("SHOW COLUMNS FROM users") as $column) {
    $field = (string)($column['Field'] ?? '');
    if ($field !== '') {
      $existingUserColumns[$field] = true;
    }
  }

  $userColumns = [
    'google_sub' => "VARCHAR(191) NOT NULL",
    'email' => "VARCHAR(190) NOT NULL",
    'name' => "VARCHAR(190) NULL",
    'picture' => "VARCHAR(255) NULL",
    'locale' => "VARCHAR(16) NULL",
    'last_login_at' => "DATETIME NULL",
    'created_at' => "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
    'updated_at' => "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
  ];

  foreach ($userColumns as $name => $ddl) {
    if (isset($existingUserColumns[$name])) continue;
    $pdo->exec("ALTER TABLE users ADD COLUMN `{$name}` {$ddl}");
  }

  $existingOrderIndexes = [];
  foreach ($pdo->query("SHOW INDEX FROM orders") as $idx) {
    $name = (string)($idx['Key_name'] ?? '');
    if ($name !== '') {
      $existingOrderIndexes[$name] = true;
    }
  }
  if (!isset($existingOrderIndexes['idx_orders_user_id'])) {
    $pdo->exec("ALTER TABLE orders ADD INDEX idx_orders_user_id (user_id)");
  }

  $existingUserIndexes = [];
  foreach ($pdo->query("SHOW INDEX FROM users") as $idx) {
    $name = (string)($idx['Key_name'] ?? '');
    if ($name !== '') {
      $existingUserIndexes[$name] = true;
    }
  }
  if (!isset($existingUserIndexes['uq_users_google_sub'])) {
    $pdo->exec("ALTER TABLE users ADD UNIQUE INDEX uq_users_google_sub (google_sub)");
  }
  if (!isset($existingUserIndexes['uq_users_email'])) {
    $pdo->exec("ALTER TABLE users ADD UNIQUE INDEX uq_users_email (email)");
  }
  if (!isset($existingUserIndexes['idx_users_last_login'])) {
    $pdo->exec("ALTER TABLE users ADD INDEX idx_users_last_login (last_login_at)");
  }

  $pdo->exec("\n    CREATE TABLE IF NOT EXISTS failed_webhooks (\n      id VARCHAR(64) PRIMARY KEY,\n      source VARCHAR(32) NOT NULL DEFAULT 'unknown',\n      payload LONGTEXT NULL,\n      headers LONGTEXT NULL,\n      reason TEXT NULL,\n      status VARCHAR(32) NOT NULL DEFAULT 'new',\n      retries INT NOT NULL DEFAULT 0,\n      created_at DATETIME NOT NULL,\n      updated_at DATETIME NOT NULL\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n  ");

  $pdo->exec("\n    CREATE TABLE IF NOT EXISTS order_history (\n      id BIGINT AUTO_INCREMENT PRIMARY KEY,\n      order_id VARCHAR(64) NOT NULL,\n      field_name VARCHAR(64) NOT NULL,\n      old_value TEXT NULL,\n      new_value TEXT NULL,\n      changed_by VARCHAR(64) NULL,\n      created_at DATETIME NOT NULL,\n      INDEX idx_order_history_order (order_id),\n      INDEX idx_order_history_created (created_at)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n  ");

  $pdo->exec("\n    CREATE TABLE IF NOT EXISTS order_notes (\n      id BIGINT AUTO_INCREMENT PRIMARY KEY,\n      order_id VARCHAR(64) NOT NULL,\n      note TEXT NOT NULL,\n      changed_by VARCHAR(64) NULL,\n      created_at DATETIME NOT NULL,\n      INDEX idx_order_notes_order (order_id),\n      INDEX idx_order_notes_created (created_at)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n  ");
}

function customer_session_start(): void {
  if (session_status() === PHP_SESSION_ACTIVE) {
    return;
  }

  $isHttps = request_is_https();
  $cookieParams = session_get_cookie_params();
  $cookieDomain = customer_session_cookie_domain();
  @ini_set('session.use_strict_mode', '1');
  session_set_cookie_params([
    'lifetime' => 0,
    'path' => $cookieParams['path'] ?: '/',
    'domain' => $cookieDomain !== '' ? $cookieDomain : ($cookieParams['domain'] ?: ''),
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  session_name('scootshop_customer');
  session_start();
}

function customer_current_user(): array {
  customer_session_start();
  $user = $_SESSION['customer_user'] ?? null;
  return is_array($user) ? $user : [];
}

function customer_session_payload(array $user): array {
  return [
    'id' => (int)($user['id'] ?? 0),
    'name' => trim((string)($user['name'] ?? '')),
    'email' => strtolower(trim((string)($user['email'] ?? ''))),
    'picture' => trim((string)($user['picture'] ?? '')),
    'locale' => trim((string)($user['locale'] ?? '')),
    'google_sub' => trim((string)($user['google_sub'] ?? '')),
    'created_at' => trim((string)($user['created_at'] ?? '')),
    'updated_at' => trim((string)($user['updated_at'] ?? '')),
    'last_login_at' => trim((string)($user['last_login_at'] ?? '')),
  ];
}

function is_local_request(): bool {
  $remoteAddr = trim((string)($_SERVER['REMOTE_ADDR'] ?? ''));
  $serverName = strtolower(trim((string)($_SERVER['SERVER_NAME'] ?? '')));
  $httpHost = strtolower(trim((string)($_SERVER['HTTP_HOST'] ?? '')));
  $host = $httpHost !== '' ? preg_replace('/:\\d+$/', '', $httpHost) : $serverName;
  return in_array($remoteAddr, ['127.0.0.1', '::1'], true)
    || in_array($host, ['localhost', '127.0.0.1', '::1'], true);
}

function is_development_environment(array $CFG): bool {
  $env = strtolower(trim((string)($CFG['app_env'] ?? 'production')));
  return in_array($env, ['local', 'development', 'dev', 'test'], true);
}

function can_use_dev_auth(array $CFG): bool {
  if (empty($CFG['allow_dev_auth'])) return false;
  if (!is_development_environment($CFG)) return false;
  if (!is_local_request()) return false;
  return true;
}

function can_use_preview_mode(array $CFG): bool {
  if (empty($CFG['allow_preview_mode'])) return false;
  if (!is_development_environment($CFG)) return false;
  if (!is_local_request()) return false;
  return true;
}

function request_is_https(): bool {
  $https = strtolower(trim((string)($_SERVER['HTTPS'] ?? '')));
  $scheme = strtolower(trim((string)($_SERVER['REQUEST_SCHEME'] ?? '')));
  $forwardedProto = strtolower(trim((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')));
  $serverPort = (int)($_SERVER['SERVER_PORT'] ?? 0);

  if ($https === 'on' || $https === '1' || $serverPort === 443 || $scheme === 'https') {
    return true;
  }
  if ($forwardedProto !== '' && strpos($forwardedProto, 'https') !== false) {
    return true;
  }
  return false;
}

function request_host_without_port(): string {
  $host = trim((string)($_SERVER['HTTP_HOST'] ?? ''));
  if ($host === '') {
    $host = trim((string)($_SERVER['SERVER_NAME'] ?? ''));
  }
  $host = strtolower($host);
  if ($host === '') return '';
  return preg_replace('/:\\d+$/', '', $host) ?: '';
}

function customer_session_cookie_domain(): string {
  $host = request_host_without_port();
  if ($host === '' || is_local_request()) return '';
  if ($host === 'scootshop.co' || substr($host, -strlen('.scootshop.co')) === '.scootshop.co') {
    return '.scootshop.co';
  }
  return '';
}

function base64url_decode_str(string $value): string {
  $remainder = strlen($value) % 4;
  if ($remainder > 0) {
    $value .= str_repeat('=', 4 - $remainder);
  }
  $value = strtr($value, '-_', '+/');
  $decoded = base64_decode($value, true);
  return $decoded === false ? '' : $decoded;
}

function google_decode_id_token_unverified(string $idToken): array {
  $parts = explode('.', $idToken);
  if (count($parts) < 2) {
    throw new RuntimeException('google_id_token_bad_format');
  }
  $json = base64url_decode_str((string)$parts[1]);
  if ($json === '') {
    throw new RuntimeException('google_id_token_bad_payload');
  }
  $payload = json_decode($json, true);
  if (!is_array($payload)) {
    throw new RuntimeException('google_id_token_bad_json');
  }
  return $payload;
}

function google_tokeninfo_request(string $idToken): array {
  $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($idToken);
  $body = false;
  $status = 0;

  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_HEADER => false,
      CURLOPT_HTTPGET => true,
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
      throw new RuntimeException('google_tokeninfo_curl_error: ' . $error);
    }
  } else {
    $context = stream_context_create([
      'http' => [
        'method' => 'GET',
        'timeout' => 20,
        'ignore_errors' => true,
      ],
      'ssl' => [
        'verify_peer' => true,
        'verify_peer_name' => true,
      ],
    ]);

    $body = @file_get_contents($url, false, $context);
    $responseHeaders = $http_response_header ?? [];
    if (!empty($responseHeaders) && preg_match('/\s(\d{3})\s/', (string)$responseHeaders[0], $matches)) {
      $status = (int)$matches[1];
    }

    if ($body === false) {
      throw new RuntimeException('google_tokeninfo_stream_error');
    }
  }

  $decoded = json_decode($body, true);
  if (!is_array($decoded)) {
    throw new RuntimeException('google_tokeninfo_invalid_json');
  }

  return ['status' => $status, 'body' => $decoded];
}

function customer_upsert_google_user(PDO $pdo, array $profile): array {
  $googleSub = trim((string)($profile['sub'] ?? ''));
  $email = strtolower(trim((string)($profile['email'] ?? '')));
  if ($googleSub === '' || $email === '') {
    throw new RuntimeException('missing_google_identity');
  }

  $name = trim((string)($profile['name'] ?? ''));
  $picture = trim((string)($profile['picture'] ?? ''));
  $locale = trim((string)($profile['locale'] ?? ''));
  $now = date('Y-m-d H:i:s');

  $st = $pdo->prepare("SELECT * FROM users WHERE google_sub = :sub OR email = :email LIMIT 1");
  $st->execute([':sub' => $googleSub, ':email' => $email]);
  $existing = $st->fetch();

  if ($existing) {
    $userId = (int)($existing['id'] ?? 0);
      $upd = $pdo->prepare("\n      UPDATE users\n      SET google_sub = :google_sub,\n          email = :email,\n          name = :name,\n          picture = :picture,\n          locale = :locale,\n          last_login_at = :last_login_at,\n          updated_at = :updated_at\n      WHERE id = :id\n    ");
    $upd->execute([
      ':google_sub' => $googleSub,
      ':email' => $email,
      ':name' => $name !== '' ? $name : null,
      ':picture' => $picture !== '' ? $picture : null,
      ':locale' => $locale !== '' ? $locale : null,
      ':last_login_at' => $now,
      ':updated_at' => $now,
      ':id' => $userId,
    ]);
  } else {
    $ins = $pdo->prepare("\n      INSERT INTO users (google_sub, email, name, picture, locale, last_login_at, created_at, updated_at)\n      VALUES (:google_sub, :email, :name, :picture, :locale, :last_login_at, :created_at, :updated_at)\n    ");
    $ins->execute([
      ':google_sub' => $googleSub,
      ':email' => $email,
      ':name' => $name !== '' ? $name : null,
      ':picture' => $picture !== '' ? $picture : null,
      ':locale' => $locale !== '' ? $locale : null,
      ':last_login_at' => $now,
      ':created_at' => $now,
      ':updated_at' => $now,
    ]);
    $userId = (int)$pdo->lastInsertId();
  }

  $load = $pdo->prepare("SELECT id, google_sub, email, name, picture, locale, last_login_at, created_at, updated_at FROM users WHERE id = :id LIMIT 1");
  $load->execute([':id' => $userId]);
  $user = $load->fetch();
  if (!is_array($user)) {
    throw new RuntimeException('customer_user_load_failed');
  }

  return $user;
}

function customer_link_orders_by_email(PDO $pdo, int $userId, string $email): void {
  $email = strtolower(trim($email));
  if ($userId <= 0 || $email === '') {
    return;
  }

  $st = $pdo->prepare("\n    UPDATE orders\n    SET user_id = :user_id\n    WHERE user_id IS NULL\n      AND (LOWER(COALESCE(ship_email, '')) = :email OR LOWER(COALESCE(payer_email, '')) = :email)\n  ");
  $st->execute([
    ':user_id' => $userId,
    ':email' => $email,
  ]);
}

function customer_orders_for_identity(PDO $pdo, int $userId, string $email, int $limit = 50): array {
  $limit = max(1, min(200, $limit));
  $email = strtolower(trim($email));
  $baseSql = "SELECT id, sku, name, status, user_id, ship_name, ship_email, payer_name, payer_email, amount, currency, payment_method, tracking, product_url, product_image_url, product_color, product_color_label, discount_code, discount_type, discount_value, discount_amount, subtotal_amount, total_amount, payment_fee_amount, shipping_amount, updated_at, created_at FROM orders";
  $where = [];
  $params = [];

  if ($userId > 0) {
    $where[] = 'user_id = :user_id';
    $params[':user_id'] = $userId;
  }

  if ($email !== '') {
    $where[] = '(LOWER(COALESCE(ship_email, "")) = :email OR LOWER(COALESCE(payer_email, "")) = :email)';
    $params[':email'] = $email;
  }

  if (!$where) {
    return [];
  }

  $sql = $baseSql . ' WHERE ' . implode(' OR ', $where) . ' ORDER BY created_at DESC LIMIT :limit';
  $st = $pdo->prepare($sql);
  foreach ($params as $key => $value) {
    $st->bindValue($key, $value, PDO::PARAM_STR);
  }
  $st->bindValue(':limit', $limit, PDO::PARAM_INT);
  $st->execute();

  return $st->fetchAll();
}

function admin_customer_payload(array $row): array {
  return [
    'id' => (int)($row['id'] ?? 0),
    'google_sub' => trim((string)($row['google_sub'] ?? '')),
    'name' => trim((string)($row['name'] ?? '')),
    'email' => trim((string)($row['email'] ?? '')),
    'picture' => trim((string)($row['picture'] ?? '')),
    'locale' => trim((string)($row['locale'] ?? '')),
    'last_login_at' => trim((string)($row['last_login_at'] ?? '')),
    'created_at' => trim((string)($row['created_at'] ?? '')),
    'updated_at' => trim((string)($row['updated_at'] ?? '')),
  ];
}

function admin_customer_summarize_orders(array $rows): array {
  $totalSpent = 0.0;
  $paidCount = 0;
  $pendingCount = 0;
  $lastOrderAt = '';
  $lastTracking = '';
  $lastStatus = '';

  foreach ($rows as $row) {
    $amount = (float)($row['total_amount'] ?? $row['amount'] ?? 0);
    $status = trim((string)($row['status'] ?? ''));
    $createdAt = trim((string)($row['created_at'] ?? ''));

    if ($createdAt !== '' && ($lastOrderAt === '' || strcmp($createdAt, $lastOrderAt) > 0)) {
      $lastOrderAt = $createdAt;
      $lastTracking = trim((string)($row['tracking'] ?? ''));
      $lastStatus = $status;
    }

    if (in_array($status, ['paid', 'preparing', 'shipped', 'delivered'], true)) {
      $paidCount++;
      $totalSpent += $amount;
    }
    if (in_array($status, ['pending_payment', 'payment_failed', 'dispute'], true)) {
      $pendingCount++;
    }
  }

  return [
    'total_spent' => round($totalSpent, 2),
    'paid_orders' => $paidCount,
    'pending_orders' => $pendingCount,
    'last_order_at' => $lastOrderAt,
    'last_tracking' => $lastTracking,
    'last_status' => $lastStatus,
  ];
}

function customer_attach_session(array $user): void {
  customer_session_start();
  if (session_status() === PHP_SESSION_ACTIVE) {
    @session_regenerate_id(true);
  }
  $_SESSION['customer_user'] = customer_session_payload($user);
}

function customer_logout(): void {
  customer_session_start();
  $_SESSION = [];
  unset($_SESSION['customer_user']);
  if (session_status() === PHP_SESSION_ACTIVE) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
      'expires' => time() - 3600,
      'path' => $params['path'] ?: '/',
      'domain' => $params['domain'] ?: '',
      'secure' => request_is_https(),
      'httponly' => true,
      'samesite' => 'Lax',
    ]);
    session_destroy();
  }
}

function header_get(string $name): string {
  $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
  return $_SERVER[$key] ?? '';
}

function versioned_local_url(string $url, string $version): string {
  $url = trim($url);
  if ($url === '') return $url;
  if (preg_match('~^(?:mailto|tel|javascript|data):~i', $url)) return $url;
  if ($url[0] === '#') return $url;

  $parts = parse_url($url);
  if ($parts === false) return $url;

  $scheme = strtolower((string)($parts['scheme'] ?? ''));
  $host = strtolower((string)($parts['host'] ?? ''));
  if ($scheme !== '' || $host !== '') {
    if (!in_array($scheme, ['', 'http', 'https'], true)) return $url;
    if ($host !== '' && !in_array($host, ['scootshop.co', 'www.scootshop.co'], true)) return $url;
  }

  $path = (string)($parts['path'] ?? '');
  $ext = strtolower((string)pathinfo($path, PATHINFO_EXTENSION));
  $allowed = ['css','js','json','webmanifest','xml','ico','png','jpg','jpeg','svg','webp','woff','woff2'];
  if ($ext === '' || !in_array($ext, $allowed, true)) return $url;

  $query = [];
  if (!empty($parts['query'])) {
    parse_str((string)$parts['query'], $query);
  }
  $query['v'] = $version;

  $rebuilt = '';
  if ($host !== '') {
    $rebuilt .= ($scheme !== '' ? $scheme : 'https') . '://' . $host;
  }
  $rebuilt .= $path;
  $qs = http_build_query($query);
  if ($qs !== '') $rebuilt .= '?' . $qs;
  if (!empty($parts['fragment'])) $rebuilt .= '#' . $parts['fragment'];

  return $rebuilt;
}

function update_html_cache_wiring(string $html, string $version, string $stamp, array &$stats): string {
  $assetMetaTag = '<meta name="asset-version" content="' . html_e($version) . '" />';
  $stampMetaTag = '<meta name="scootshop-cache-bust" content="' . html_e($stamp) . '" />';
  $cacheControlTag = '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />';
  $pragmaTag = '<meta http-equiv="Pragma" content="no-cache" />';
  $expiresTag = '<meta http-equiv="Expires" content="0" />';
  $assetSyncTag = '<script src="/js/asset-sync.js?v=' . html_e($version) . '" defer></script>';

  $updated = preg_replace(
    '/<meta\s+name="asset-version"\s+content="[^"]*"\s*\/?>/i',
    $assetMetaTag,
    $html,
    -1,
    $assetMetaCount
  );
  if ($assetMetaCount > 0) {
    $stats['meta_updates'] += $assetMetaCount;
    $html = $updated;
  } elseif (stripos($html, '</head>') !== false) {
    $html = preg_replace('/<\/head>/i', "  {$assetMetaTag}\n</head>", $html, 1, $insertedMetaCount);
    if ($insertedMetaCount > 0) {
      $stats['meta_injected'] += $insertedMetaCount;
    }
  }

  $updated = preg_replace(
    '/<meta\s+name="scootshop-cache-bust"\s+content="[^"]*"\s*\/?>/i',
    $stampMetaTag,
    $html,
    -1,
    $stampMetaCount
  );
  if ($stampMetaCount > 0) {
    $stats['stamp_updates'] += $stampMetaCount;
    $html = $updated;
  } elseif (stripos($html, '</head>') !== false) {
    $html = preg_replace('/<\/head>/i', "  {$stampMetaTag}\n</head>", $html, 1, $insertedStampCount);
    if ($insertedStampCount > 0) {
      $stats['stamp_injected'] += $insertedStampCount;
    }
  }

  foreach ([
    '/<meta\s+http-equiv="Cache-Control"\s+content="[^"]*"\s*\/?>/i' => [$cacheControlTag, 'cache_meta_updates'],
    '/<meta\s+http-equiv="Pragma"\s+content="[^"]*"\s*\/?>/i' => [$pragmaTag, 'pragma_meta_updates'],
    '/<meta\s+http-equiv="Expires"\s+content="[^"]*"\s*\/?>/i' => [$expiresTag, 'expires_meta_updates'],
  ] as $pattern => $metaConfig) {
    [$tag, $statKey] = $metaConfig;
    $updated = preg_replace($pattern, $tag, $html, -1, $metaCount);
    if ($metaCount > 0) {
      $stats[$statKey] += $metaCount;
      $html = $updated;
    } elseif (stripos($html, '</head>') !== false) {
      $html = preg_replace('/<\/head>/i', "  {$tag}\n</head>", $html, 1, $insertCount);
      if ($insertCount > 0) {
        $stats[$statKey . '_injected'] += $insertCount;
      }
    }
  }

  $html = preg_replace_callback(
    '/\b(src|href)=("|\')([^"\']+)(\2)/i',
    static function (array $matches) use ($version, &$stats): string {
      $next = versioned_local_url($matches[3], $version);
      if ($next !== $matches[3]) {
        $stats['asset_ref_updates']++;
      }
      return $matches[1] . '=' . $matches[2] . $next . $matches[4];
    },
    $html
  );

  $html = preg_replace_callback(
    '/\bcontent=("|\')([^"\']+)(\1)/i',
    static function (array $matches) use ($version, &$stats): string {
      $next = versioned_local_url($matches[2], $version);
      if ($next !== $matches[2]) {
        $stats['content_ref_updates']++;
      }
      return 'content=' . $matches[1] . $next . $matches[3];
    },
    $html
  );

  $syncUpdated = preg_replace(
    '/<script\s+src="\/js\/asset-sync\.js(?:\?[^\"]*)?"([^>]*)><\/script>/i',
    $assetSyncTag,
    $html,
    -1,
    $syncUpdateCount
  );
  if ($syncUpdateCount > 0) {
    $stats['asset_sync_updates'] += $syncUpdateCount;
    $html = $syncUpdated;
  } elseif (stripos($html, '</head>') !== false) {
    $html = preg_replace('/<\/head>/i', "  {$assetSyncTag}\n</head>", $html, 1, $insertedSyncCount);
    if ($insertedSyncCount > 0) {
      $stats['asset_sync_injected'] += $insertedSyncCount;
    }
  }

  return $html;
}

function refresh_shell_cache_files(string $rootDir, string $version, string $stamp): array {
  $results = [
    'manifest_updated' => false,
    'browserconfig_updated' => false,
  ];

  $manifestPath = $rootDir . '/site.webmanifest';
  if (is_file($manifestPath)) {
    $manifestJson = json_decode((string)file_get_contents($manifestPath), true);
    if (is_array($manifestJson)) {
      $manifestJson['start_url'] = '/?v=' . $version;
      $manifestJson['scope'] = '/';
      $manifestJson['theme_color'] = (string)($manifestJson['theme_color'] ?? '#ffffff');
      $manifestJson['background_color'] = (string)($manifestJson['background_color'] ?? '#ffffff');
      $manifestJson['id'] = '/?shell=' . $version;
      $manifestJson['version'] = $version;
      $manifestJson['scootshop_cache_bust'] = $stamp;
      if (!empty($manifestJson['icons']) && is_array($manifestJson['icons'])) {
        foreach ($manifestJson['icons'] as &$icon) {
          if (!is_array($icon)) continue;
          $icon['src'] = versioned_local_url((string)($icon['src'] ?? ''), $version);
        }
        unset($icon);
      }
      file_put_contents($manifestPath, json_encode($manifestJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n", LOCK_EX);
      $results['manifest_updated'] = true;
    }
  }

  $browserconfigPath = $rootDir . '/browserconfig.xml';
  if (is_file($browserconfigPath)) {
    $xml = (string)file_get_contents($browserconfigPath);
    $updatedXml = preg_replace_callback(
      '/\bsrc=("|\')([^"\']+)(\1)/i',
      static function (array $matches) use ($version): string {
        return 'src=' . $matches[1] . versioned_local_url($matches[2], $version) . $matches[3];
      },
      $xml,
      -1,
      $xmlCount
    );
    if (is_string($updatedXml)) {
      if (strpos($updatedXml, '<!-- cache-bust:') !== false) {
        $updatedXml = preg_replace('/<!-- cache-bust:[^>]*-->/', '<!-- cache-bust:' . $stamp . ' -->', $updatedXml, 1);
      } else {
        $updatedXml = preg_replace('/<browserconfig>/', "<browserconfig>\n  <!-- cache-bust:{$stamp} -->", $updatedXml, 1);
      }
      file_put_contents($browserconfigPath, $updatedXml, LOCK_EX);
      $results['browserconfig_updated'] = true;
    }
  }

  return $results;
}

function refresh_sitemap_lastmod(string $rootDir): array {
  $sitemapPath = $rootDir . '/sitemap.xml';
  if (!is_file($sitemapPath)) {
    return ['updated' => false, 'entries' => 0, 'path' => $sitemapPath];
  }

  $xml = (string)file_get_contents($sitemapPath);
  $today = date('Y-m-d');
  $updatedXml = preg_replace('/<lastmod>[^<]*<\/lastmod>/i', '<lastmod>' . $today . '</lastmod>', $xml, -1, $count);
  if (!is_string($updatedXml)) {
    return ['updated' => false, 'entries' => 0, 'path' => $sitemapPath];
  }

  if ($count > 0 && $updatedXml !== $xml) {
    file_put_contents($sitemapPath, $updatedXml, LOCK_EX);
  } else {
    @touch($sitemapPath);
  }

  return ['updated' => true, 'entries' => (int)$count, 'path' => $sitemapPath];
}

function write_cache_bust_manifest(string $rootDir, string $version, array $stats): array {
  $manifestPath = $rootDir . '/cache-bust.json';
  $payload = [
    'version' => $version,
    'busted_at' => gmdate('c'),
    'bust_stamp' => $version . '-' . gmdate('His'),
    'scope' => 'sitewide',
    'stats' => $stats,
  ];

  $ok = file_put_contents(
    $manifestPath,
    json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n",
    LOCK_EX
  );

  return ['written' => $ok !== false, 'path' => $manifestPath];
}

/**
 * Bump asset-version.json, rewrite cache wiring across all HTML pages and refresh crawl signals.
 * Returns details for the new version or null on failure.
 */
function bump_asset_version(): ?array {
  $versionFile = __DIR__ . '/../asset-version.json';
  if (!is_file($versionFile)) return null;

  $data = json_decode(file_get_contents($versionFile), true);
  $current = trim((string)($data['v'] ?? ''));
  $today = date('Ymd');

  if (preg_match('/^(\d{8})-(\d+)$/', $current, $m) && $m[1] === $today) {
    $next = $today . '-' . ((int)$m[2] + 1);
  } else {
    $next = $today . '-1';
  }

  file_put_contents($versionFile, json_encode(['v' => $next], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n", LOCK_EX);

  $root = realpath(__DIR__ . '/..');
  if ($root === false) return null;

  $stamp = $next . '-' . gmdate('His');
  $stats = [
    'html_files_scanned' => 0,
    'html_files_rewritten' => 0,
    'meta_updates' => 0,
    'meta_injected' => 0,
    'stamp_updates' => 0,
    'stamp_injected' => 0,
    'cache_meta_updates' => 0,
    'cache_meta_updates_injected' => 0,
    'pragma_meta_updates' => 0,
    'pragma_meta_updates_injected' => 0,
    'expires_meta_updates' => 0,
    'expires_meta_updates_injected' => 0,
    'asset_ref_updates' => 0,
    'content_ref_updates' => 0,
    'asset_sync_updates' => 0,
    'asset_sync_injected' => 0,
  ];

  // Update ALL HTML files: meta tags + versioned runtime/assets + asset-sync bridge.
  $root = realpath(__DIR__ . '/..');
  $iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::LEAVES_ONLY
  );
  foreach ($iterator as $file) {
    if ($file->getExtension() !== 'html') continue;
    $path = $file->getPathname();
    // Skip backups / hidden
    if (strpos($path, '.bak') !== false) continue;
    $html = file_get_contents($path);
    if (!is_string($html)) continue;
    $stats['html_files_scanned']++;

    $updatedHtml = update_html_cache_wiring($html, $next, $stamp, $stats);

    if ($updatedHtml !== $html) {
      file_put_contents($path, $updatedHtml, LOCK_EX);
      $stats['html_files_rewritten']++;
    } else {
      @touch($path);
    }
  }

  $sitemap = refresh_sitemap_lastmod($root);
  $manifest = write_cache_bust_manifest($root, $next, $stats);
  $shellFiles = refresh_shell_cache_files($root, $next, $stamp);

  // Purge OPcache
  if (function_exists('opcache_reset')) {
    @opcache_reset();
  }

  // LiteSpeed cache purge (Hostinger)
  header('X-LiteSpeed-Purge: *');
  header('X-LiteSpeed-Tag: scootshop-global,scootshop-assets,scootshop-html,scootshop-sitemap');
  header('Clear-Site-Data: "cache", "storage"');

  return [
    'version' => $next,
    'previous' => $current,
    'stamp' => $stamp,
    'stats' => $stats,
    'sitemap' => $sitemap,
    'manifest' => $manifest,
    'shell_files' => $shellFiles,
  ];
}

function fetch_remote_text(string $url, int $timeout = 10): array {
  $body = '';
  $status = 0;

  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_MAXREDIRS => 4,
      CURLOPT_CONNECTTIMEOUT => 6,
      CURLOPT_TIMEOUT => $timeout,
      CURLOPT_USERAGENT => 'SCOOTSHOP-CacheVerifier/1.0 (+https://scootshop.co)',
      CURLOPT_HTTPHEADER => ['Cache-Control: no-cache', 'Pragma: no-cache'],
    ]);
    $res = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (is_string($res)) {
      $body = $res;
    }
  }

  if ($body === '') {
    $ctx = stream_context_create([
      'http' => [
        'timeout' => $timeout,
        'ignore_errors' => true,
        'user_agent' => 'SCOOTSHOP-CacheVerifier/1.0 (+https://scootshop.co)',
        'follow_location' => 1,
        'max_redirects' => 4,
        'header' => "Cache-Control: no-cache\r\nPragma: no-cache\r\n",
      ],
    ]);
    $res = @file_get_contents($url, false, $ctx);
    if (is_string($res)) {
      $body = $res;
    }
    if (isset($http_response_header) && is_array($http_response_header)) {
      foreach ($http_response_header as $headerLine) {
        if (preg_match('~^HTTP/\S+\s+(\d{3})\b~', (string)$headerLine, $m)) {
          $status = (int)$m[1];
          break;
        }
      }
    }
  }

  return [
    'status' => $status,
    'ok' => $status >= 200 && $status < 400 && $body !== '',
    'body' => $body,
  ];
}

function extract_meta_content(string $html, string $name): string {
  $patterns = [
    '/<meta[^>]+name=["\']' . preg_quote($name, '/') . '["\'][^>]+content=["\']([^"\']+)["\']/i',
    '/<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']' . preg_quote($name, '/') . '["\']/i',
    '/<meta[^>]+http-equiv=["\']' . preg_quote($name, '/') . '["\'][^>]+content=["\']([^"\']+)["\']/i',
    '/<meta[^>]+content=["\']([^"\']+)["\'][^>]+http-equiv=["\']' . preg_quote($name, '/') . '["\']/i',
  ];
  foreach ($patterns as $pattern) {
    if (preg_match($pattern, $html, $m)) {
      return trim(html_entity_decode((string)$m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
  }
  return '';
}

function verify_public_cache_refresh(string $publicBase, string $version, string $stamp): array {
  $publicBase = rtrim($publicBase, '/');
  $attempts = 0;
  $result = [
    'ok' => false,
    'attempts' => 0,
    'asset_version' => ['ok' => false, 'status' => 0, 'version' => ''],
    'cache_manifest' => ['ok' => false, 'status' => 0, 'version' => '', 'stamp' => ''],
    'home' => ['ok' => false, 'status' => 0, 'version' => '', 'stamp' => '', 'has_asset_sync' => false, 'has_cache_control_meta' => false],
    'manifest' => ['ok' => false, 'status' => 0, 'version' => ''],
  ];

  while ($attempts < 6) {
    $attempts++;
    $nonce = (string)(time() . '-' . $attempts . '-' . random_int(1000, 9999));

    $assetRes = fetch_remote_text($publicBase . '/asset-version.json?ultra=' . rawurlencode($nonce));
    $assetJson = $assetRes['ok'] ? json_decode((string)$assetRes['body'], true) : null;
    $assetVersion = trim((string)($assetJson['v'] ?? ''));
    $result['asset_version'] = [
      'ok' => $assetRes['status'] === 200 && $assetVersion === $version,
      'status' => $assetRes['status'],
      'version' => $assetVersion,
    ];

    $cacheRes = fetch_remote_text($publicBase . '/cache-bust.json?ultra=' . rawurlencode($nonce));
    $cacheJson = $cacheRes['ok'] ? json_decode((string)$cacheRes['body'], true) : null;
    $cacheVersion = trim((string)($cacheJson['version'] ?? ''));
    $cacheStamp = trim((string)($cacheJson['bust_stamp'] ?? ''));
    $result['cache_manifest'] = [
      'ok' => $cacheRes['status'] === 200 && $cacheVersion === $version,
      'status' => $cacheRes['status'],
      'version' => $cacheVersion,
      'stamp' => $cacheStamp,
    ];

    $homeRes = fetch_remote_text($publicBase . '/?ultra=' . rawurlencode($nonce));
    $homeHtml = (string)($homeRes['body'] ?? '');
    $homeVersion = extract_meta_content($homeHtml, 'asset-version');
    $homeStamp = extract_meta_content($homeHtml, 'scootshop-cache-bust');
    $homeHasSync = str_contains($homeHtml, '/js/asset-sync.js?v=' . $version);
    $homeHasCacheControl = stripos($homeHtml, 'http-equiv="Cache-Control"') !== false || stripos($homeHtml, "http-equiv='Cache-Control'") !== false;
    $result['home'] = [
      'ok' => $homeRes['status'] === 200 && $homeVersion === $version && $homeHasSync,
      'status' => $homeRes['status'],
      'version' => $homeVersion,
      'stamp' => $homeStamp,
      'has_asset_sync' => $homeHasSync,
      'has_cache_control_meta' => $homeHasCacheControl,
    ];

    $manifestRes = fetch_remote_text($publicBase . '/site.webmanifest?ultra=' . rawurlencode($nonce));
    $manifestJson = $manifestRes['ok'] ? json_decode((string)$manifestRes['body'], true) : null;
    $manifestVersion = trim((string)($manifestJson['version'] ?? ''));
    $result['manifest'] = [
      'ok' => $manifestRes['status'] === 200 && $manifestVersion === $version,
      'status' => $manifestRes['status'],
      'version' => $manifestVersion,
    ];

    $result['attempts'] = $attempts;
    $result['ok'] = $result['asset_version']['ok'] && $result['cache_manifest']['ok'] && $result['home']['ok'] && $result['manifest']['ok'];
    if ($result['ok']) {
      return $result;
    }

    usleep(350000);
  }

  return $result;
}

function absolute_url(string $base, string $value): string {
  $value = trim($value);
  if ($value === '') return rtrim($base, '/');
  if (preg_match('~^https?://~i', $value)) return $value;
  return rtrim($base, '/') . '/' . ltrim($value, '/');
}

function html_e(string $value): string {
  return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function current_asset_version(): string {
  $versionFile = __DIR__ . '/../asset-version.json';
  if (!is_file($versionFile)) return date('Ymd') . '-1';
  $json = json_decode((string)file_get_contents($versionFile), true);
  $v = trim((string)($json['v'] ?? ''));
  return $v !== '' ? $v : (date('Ymd') . '-1');
}

function series_label(string $series): string {
  $series = strtolower(trim($series));
  $map = [
    'k' => 'Serie K',
    'n' => 'Serie N',
    'gt' => 'Serie GT',
    'ix' => 'Serie IX',
    'ecoxtrem' => 'Ecoxtrem',
  ];
  return $map[$series] ?? ('Serie ' . strtoupper($series));
}

function extract_price_number(string $priceText): string {
  $raw = preg_replace('/[^0-9,\.]/', '', $priceText) ?? '';
  $raw = trim($raw);
  if ($raw === '') return '0.00';

  $hasComma = str_contains($raw, ',');
  $hasDot = str_contains($raw, '.');
  if ($hasComma && $hasDot) {
    $lastComma = strrpos($raw, ',');
    $lastDot = strrpos($raw, '.');
    if ($lastComma !== false && $lastDot !== false && $lastComma > $lastDot) {
      $raw = str_replace('.', '', $raw);
      $raw = str_replace(',', '.', $raw);
    } else {
      $raw = str_replace(',', '', $raw);
    }
  } elseif ($hasComma) {
    $raw = str_replace(',', '.', $raw);
  }

  return number_format((float)$raw, 2, '.', '');
}

function append_product_to_sitemap(string $publicBase, string $href): bool {
  $sitemap = __DIR__ . '/../sitemap.xml';
  if (!is_file($sitemap)) return false;

  $xml = file_get_contents($sitemap);
  if (!is_string($xml) || $xml === '') return false;

  $loc = rtrim($publicBase, '/') . $href;
  if (str_contains($xml, '<loc>' . $loc . '</loc>')) {
    return false;
  }

  $today = date('Y-m-d');
  $node = "  <url>\n"
    . '    <loc>' . html_e($loc) . "</loc>\n"
    . '    <lastmod>' . $today . "</lastmod>\n"
    . "    <changefreq>weekly</changefreq>\n"
    . "    <priority>0.9</priority>\n"
    . "  </url>\n";

  $updated = str_replace('</urlset>', $node . '</urlset>', $xml, $count);
  if ($count !== 1) return false;

  return file_put_contents($sitemap, $updated, LOCK_EX) !== false;
}

function remove_product_from_sitemap(string $publicBase, string $href): bool {
  $sitemap = __DIR__ . '/../sitemap.xml';
  if (!is_file($sitemap)) return false;

  $xml = file_get_contents($sitemap);
  if (!is_string($xml) || $xml === '') return false;

  $loc = rtrim($publicBase, '/') . $href;
  $pattern = '~\s*<url>\s*<loc>' . preg_quote(html_e($loc), '~') . '</loc>.*?</url>\s*~s';
  $updated = preg_replace($pattern, "\n", $xml, 1, $count);
  if (!is_string($updated) || $count < 1) return false;

  return file_put_contents($sitemap, $updated, LOCK_EX) !== false;
}

function delete_dir_recursive(string $path): bool {
  if (!is_dir($path)) return false;

  $items = scandir($path);
  if (!is_array($items)) return false;

  foreach ($items as $item) {
    if ($item === '.' || $item === '..') continue;
    $full = $path . DIRECTORY_SEPARATOR . $item;
    if (is_dir($full) && !is_link($full)) {
      delete_dir_recursive($full);
      continue;
    }
    @unlink($full);
  }

  return @rmdir($path);
}

function create_static_product_page(array $product, string $publicBase): array {
  $href = trim((string)($product['href'] ?? ''));
  if (!preg_match('~^/[a-z0-9/_-]+/$~i', $href)) {
    return ['ok' => false, 'error' => 'bad_href_for_page_generation'];
  }

  $root = realpath(__DIR__ . '/..');
  if (!is_string($root) || $root === '') {
    return ['ok' => false, 'error' => 'project_root_not_found'];
  }

  $relative = trim($href, '/');
  if ($relative === '' || str_contains($relative, '..')) {
    return ['ok' => false, 'error' => 'unsafe_product_path'];
  }

  $productDir = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
  $imgDir = $productDir . DIRECTORY_SEPARATOR . 'img';
  $pageFile = $productDir . DIRECTORY_SEPARATOR . 'index.html';

  if (!is_dir($imgDir) && !mkdir($imgDir, 0775, true) && !is_dir($imgDir)) {
    return ['ok' => false, 'error' => 'cannot_create_product_img_dir'];
  }

  if (is_file($pageFile)) {
    return ['ok' => true, 'created' => false, 'pageFile' => $pageFile, 'href' => $href];
  }

  $name = trim((string)($product['name'] ?? 'Producto'));
  $brand = trim((string)($product['brand'] ?? $name));
  $series = trim((string)($product['series'] ?? ''));
  $sku = trim((string)($product['sku'] ?? 'SKU'));
  $priceText = trim((string)($product['priceText'] ?? '0 €'));
  $compareAt = trim((string)($product['compareAtPriceText'] ?? ''));
  if ($compareAt === '') $compareAt = $priceText;
  $stock = trim((string)($product['stock'] ?? 'in_stock'));
  $specs = $product['specs'] ?? [];
  if (!is_array($specs)) $specs = [];
  $specs = array_values(array_filter(array_map(static fn($v) => trim((string)$v), $specs), static fn($v) => $v !== ''));
  $spec1 = $specs[0] ?? 'Pendiente';
  $spec2 = $specs[1] ?? 'Pendiente';
  $spec3 = $specs[2] ?? 'Pendiente';
  $imagePath = trim((string)($product['image'] ?? ''));
  if ($imagePath === '') $imagePath = $href . 'img/1.webp';
  if (!str_starts_with($imagePath, '/')) $imagePath = '/' . ltrim($imagePath, '/');

  $assetVersion = current_asset_version();
  $seriesLabel = series_label($series);
  $stockLabel = $stock === 'out_of_stock' ? 'Agotado' : 'Disponible';
  $stockSchema = $stock === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';
  $priceNumber = extract_price_number($priceText);

  $buyHref = '/checkout?' . http_build_query([
    'name' => $name,
    'sku' => $sku,
    'price' => $priceNumber,
    'url' => $href,
    'image' => $imagePath,
  ], '', '&', PHP_QUERY_RFC3986);

  $descriptionText = $name . ': ' . $spec1 . ', ' . $spec2 . ', ' . $spec3 . '.';
  $canonical = rtrim($publicBase, '/') . $href;
  $imageAbs = rtrim($publicBase, '/') . $imagePath;

  $jsonLd = json_encode([
    '@context' => 'https://schema.org',
    '@graph' => [
      [
        '@type' => 'Organization',
        '@id' => rtrim($publicBase, '/') . '/#org',
        'name' => 'SCOOT SHOP',
        'url' => rtrim($publicBase, '/') . '/',
        'logo' => rtrim($publicBase, '/') . '/img/0-removebg-preview.png',
      ],
      [
        '@type' => 'Product',
        '@id' => $canonical . '#product',
        'name' => $name,
        'image' => [$imageAbs],
        'brand' => ['@type' => 'Brand', 'name' => $brand],
        'sku' => $sku,
        'description' => $descriptionText,
        'offers' => [
          '@type' => 'Offer',
          'url' => $canonical,
          'price' => $priceNumber,
          'priceCurrency' => 'EUR',
          'availability' => $stockSchema,
          'itemCondition' => 'https://schema.org/NewCondition',
          'seller' => ['@id' => rtrim($publicBase, '/') . '/#org'],
        ],
      ],
    ],
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

  $nameE = html_e($name);
  $seriesLabelE = html_e($seriesLabel);
  $brandE = html_e($brand);
  $skuE = html_e($sku);
  $priceTextE = html_e($priceText);
  $compareAtE = html_e($compareAt);
  $spec1E = html_e($spec1);
  $spec2E = html_e($spec2);
  $spec3E = html_e($spec3);
  $stockLabelE = html_e($stockLabel);
  $hrefE = html_e($href);
  $imageE = html_e($imagePath);
  $assetVersionE = html_e($assetVersion);
  $canonicalE = html_e($canonical);
  $imageAbsE = html_e($imageAbs);
  $descriptionE = html_e($descriptionText);
  $buyHrefE = html_e($buyHref);

  $html = "<!DOCTYPE html>\n"
    . "<html lang=\"es-ES\">\n"
    . "<head>\n"
    . "  <meta charset=\"utf-8\" />\n"
    . "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\" />\n"
    . "  <title>{$nameE} - Ficha tecnica | SCOOT SHOP</title>\n"
    . "  <meta name=\"description\" content=\"{$descriptionE}\" />\n"
    . "  <meta name=\"robots\" content=\"index,follow,max-image-preview:large\" />\n"
    . "  <link rel=\"canonical\" href=\"{$canonicalE}\" />\n"
    . "  <meta name=\"asset-version\" content=\"{$assetVersionE}\" />\n"
    . "  <link rel=\"icon\" href=\"/favicon.ico?v={$assetVersionE}\" sizes=\"any\">\n"
    . "  <link rel=\"icon\" type=\"image/svg+xml\" href=\"/favicon.svg?v={$assetVersionE}\">\n"
    . "  <link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"/favicon-32x32.png?v={$assetVersionE}\">\n"
    . "  <meta property=\"og:url\" content=\"{$canonicalE}\" />\n"
    . "  <meta property=\"og:title\" content=\"{$nameE} - Ficha tecnica | SCOOT SHOP\" />\n"
    . "  <meta property=\"og:description\" content=\"{$descriptionE}\" />\n"
    . "  <meta property=\"og:type\" content=\"product\" />\n"
    . "  <meta property=\"og:image\" content=\"{$imageAbsE}\" />\n"
    . "  <link rel=\"stylesheet\" href=\"/css/icons.css?v={$assetVersionE}\">\n"
    . "  <link rel=\"stylesheet\" href=\"/css/main.css?v={$assetVersionE}\">\n"
    . "  <link rel=\"stylesheet\" href=\"/css/tarjetas.css?v={$assetVersionE}\">\n"
    . "  <script src=\"/js/global-assets.js?v={$assetVersionE}\" defer></script>\n"
    . "</head>\n"
    . "<body>\n"
    . "  <div id=\"site-header-slot\"></div>\n"
    . "  <div id=\"mobile-menu-slot\"></div>\n"
    . "  <main id=\"main-content\" class=\"page-wrap\">\n"
    . "    <section class=\"container\">\n"
    . "      <nav class=\"breadcrumb\" aria-label=\"Ruta\">\n"
    . "        <a href=\"/\">Inicio</a><span>/</span><a href=\"/#comprar\">{$seriesLabelE}</a><span>/</span><span>{$nameE}</span>\n"
    . "      </nav>\n"
    . "      <div class=\"page-title\">\n"
    . "        <div class=\"title-left\"><h1>{$nameE}</h1><div class=\"subtitle\">{$seriesLabelE}</div></div>\n"
    . "      </div>\n"
    . "      <div class=\"layout\">\n"
    . "        <section class=\"gallery\">\n"
    . "          <div class=\"gallery-main\"><img src=\"{$imageE}?v={$assetVersionE}\" alt=\"{$nameE} vista principal\" id=\"mainImage\" loading=\"eager\"></div>\n"
    . "        </section>\n"
    . "        <aside class=\"panel\">\n"
    . "          <div class=\"price-row\"><span class=\"price-now\">{$priceTextE}</span><span class=\"price-was\">{$compareAtE}</span></div>\n"
    . "          <div class=\"panel-inner\">\n"
    . "            <p class=\"desc\"><strong>{$nameE}</strong> de {$seriesLabelE}. Completa esta ficha con especificaciones finales y galeria comercial.</p>\n"
    . "            <div class=\"quick-specs\">\n"
    . "              <div class=\"pill\"><span class=\"pill-label\">Dato 1</span><span class=\"pill-value\">{$spec1E}</span></div>\n"
    . "              <div class=\"pill\"><span class=\"pill-label\">Dato 2</span><span class=\"pill-value\">{$spec2E}</span></div>\n"
    . "              <div class=\"pill\"><span class=\"pill-label\">Dato 3</span><span class=\"pill-value\">{$spec3E}</span></div>\n"
    . "            </div>\n"
    . "            <div class=\"cta-col\">\n"
    . "              <a href=\"{$buyHrefE}\" class=\"btn-main\" aria-label=\"Comprar {$nameE}\"><i class=\"fa-solid fa-bag-shopping\"></i> Comprar</a>\n"
    . "              <p class=\"stock-note\">{$stockLabelE}</p>\n"
    . "              <a href=\"https://wa.me/34612654818?text=Hola%20SCOOT%20SHOP%2C%20quiero%20reservar%20{$nameE}%20({$skuE})\" class=\"btn-reserve\" aria-label=\"Reservar {$nameE}\"><i class=\"fab fa-whatsapp\"></i> Reservar</a>\n"
    . "            </div>\n"
    . "            <p class=\"mini-note\">SKU: {$skuE} | Marca: {$brandE} | URL: {$hrefE}</p>\n"
    . "          </div>\n"
    . "        </aside>\n"
    . "      </div>\n"
    . "    </section>\n"
    . "  </main>\n"
    . "  <script type=\"application/ld+json\">\n{$jsonLd}\n  </script>\n"
    . "</body>\n"
    . "</html>\n";

  if (file_put_contents($pageFile, $html, LOCK_EX) === false) {
    return ['ok' => false, 'error' => 'cannot_write_product_page'];
  }

  return ['ok' => true, 'created' => true, 'pageFile' => $pageFile, 'href' => $href];
}

function new_order_id(): string {
  return 'SS-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
}

function new_token(): string {
  return bin2hex(random_bytes(32));
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
    'expand[0]' => 'line_items',
    'expand[1]' => 'payment_intent',
  ], 'GET');

  if ($response['status'] >= 400 || !is_array($response['body']) || empty($response['body']['id'])) {
    throw new RuntimeException((string)($response['body']['error']['message'] ?? 'stripe_session_fetch_error'));
  }

  return $response['body'];
}

function stripe_fetch_payment_intent(string $secretKey, string $paymentIntentId): array {
  $response = stripe_api_request($secretKey, '/payment_intents/' . rawurlencode($paymentIntentId), [
    'expand[0]' => 'latest_charge',
    'expand[1]' => 'charges.data.balance_transaction',
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

  $stOrder = $pdo->prepare("SELECT status, payer_email, ship_email, name, sku, product_url, product_image_url, product_color, product_color_label, cart_items_json FROM orders WHERE id = :id LIMIT 1");
  $stOrder->execute([':id' => $orderId]);
  $existingOrder = $stOrder->fetch() ?: [];
  $previousStatus = (string)($existingOrder['status'] ?? '');
  $previousPayerEmail = trim((string)($existingOrder['payer_email'] ?? ''));
  $shipEmail = trim((string)($existingOrder['ship_email'] ?? ''));
  $resolvedEmail = $payerEmail !== '' ? $payerEmail : ($previousPayerEmail !== '' ? $previousPayerEmail : $shipEmail);
  $productName = (string)($existingOrder['name'] ?? ($productNameInput !== '' ? $productNameInput : ($productSkuInput !== '' ? $productSkuInput : 'Pedido Scoot Shop')));
  $productSku = (string)($existingOrder['sku'] ?? $productSkuInput);
  $productUrl = trim((string)($existingOrder['product_url'] ?? ($data['productUrl'] ?? '')));
  $productImageUrl = trim((string)($existingOrder['product_image_url'] ?? ($data['productImageUrl'] ?? '')));
  $productColor = trim((string)($existingOrder['product_color'] ?? ($data['productColor'] ?? '')));
  $productColorLabel = trim((string)($existingOrder['product_color_label'] ?? ($data['productColorLabel'] ?? '')));

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

  $shouldSendPaidEmail = ($resolvedEmail !== '') && (
    $previousStatus !== 'paid' ||
    $previousPayerEmail === ''
  );

  if ($shouldSendPaidEmail) {
    send_paid_email($CFG, $resolvedEmail, $orderId, [
      'provider' => $provider,
      'triggerSource' => $provider === 'stripe' ? ('stripe_' . ($sourceType !== '' ? $sourceType : 'reconcile')) : 'system',
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
      'productColor' => $productColor,
      'productColorLabel' => $productColorLabel,
      'orderUrl' => $productUrl,
      'productImageUrl' => $productImageUrl,
      'orderItems' => build_order_items_from_order_row($existingOrder),
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
    case 'error':
      return 'error de pago';
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
  $orderItemsRaw = is_array($context['orderItems'] ?? null) ? $context['orderItems'] : [];
  $orderItems = normalize_order_items_input($orderItemsRaw, $CFG['public_base']);
  $orderUrl = trim((string)($context['orderUrl'] ?? ''));
  $logoUrl = absolute_url($CFG['public_base'], '/img/0-removebg-preview.png');
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

  if (empty($orderItems) && ($productName !== '' || $productImageUrl !== '')) {
    $orderItems = [[
      'sku' => trim((string)($context['sku'] ?? '')),
      'name' => $productName,
      'qty' => 1,
      'price' => null,
      'url' => $orderUrl,
      'image' => $productImageUrl,
      'color' => trim((string)($context['productColor'] ?? '')),
      'color_label' => trim((string)($context['productColorLabel'] ?? '')),
    ]];
  }

  if ($productName === '' && !empty($orderItems)) {
    $productName = order_items_display_name($orderItems, 'Pedido SCOOT SHOP');
  }

  $resumeOrderUrl = absolute_url($CFG['public_base'], '/pedido/?order=' . rawurlencode($orderId));
  $ctaUrl = $orderUrl !== '' ? $orderUrl : $siteUrl;
  $ctaLabel = $orderUrl !== '' ? 'Ver producto' : 'Ir a SCOOT SHOP';
  if ($status === 'pending_payment') {
    $ctaUrl = $resumeOrderUrl;
    $ctaLabel = 'Volver al pedido';
  }
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
  } elseif (in_array($status, ['canceled', 'refunded', 'payment_failed', 'error', 'dispute'], true)) {
    $pillBg = '#fee2e2';
    $pillBorder = '#f0cfd4';
    $pillColor = '#991b1b';
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

  if (!empty($orderItems)) {
    $itemsCount = 0;
    foreach ($orderItems as $item) {
      $itemsCount += max(1, (int)($item['qty'] ?? 1));
    }
    $details['Articulos'] = (string)$itemsCount;
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
  if (!empty($orderItems)) {
    $itemsHtml = '';
    foreach ($orderItems as $item) {
      $itemName = trim((string)($item['name'] ?? $item['sku'] ?? 'Producto SCOOT SHOP'));
      $itemSku = trim((string)($item['sku'] ?? ''));
      $itemQty = max(1, (int)($item['qty'] ?? 1));
      $itemImage = trim((string)($item['image'] ?? ''));
      $itemUrl = trim((string)($item['url'] ?? ''));
      $itemColorLabel = trim((string)($item['color_label'] ?? ''));

      $itemsHtml .= '<tr><td style="padding:0 0 10px 0;">'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid ' . $line . ';border-radius:14px;">'
        . '<tr>';

      if ($itemImage !== '') {
        $itemsHtml .= '<td width="84" style="width:84px;padding:10px 8px 10px 10px;vertical-align:top;">'
          . '<img src="' . email_html_escape($itemImage) . '" alt="' . email_html_escape($itemName) . '" width="64" style="display:block;width:64px;height:auto;border:0;">'
          . '</td>';
      }

      $itemsHtml .= '<td style="padding:10px 10px 10px 0;vertical-align:top;">'
        . '<p style="margin:0 0 3px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.35;color:' . $ink . ';">' . email_html_escape($itemName) . '</p>'
        . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:' . $muted . ';">Cantidad: ' . $itemQty;
      if ($itemSku !== '') {
        $itemsHtml .= ' · SKU: ' . email_html_escape($itemSku);
      }
      if ($itemColorLabel !== '') {
        $itemsHtml .= ' · Color: ' . email_html_escape($itemColorLabel);
      }
      $itemsHtml .= '</p>';
      if ($itemUrl !== '') {
        $itemLinkLabel = 'Ver producto';
        if ($status === 'pending_payment') {
          $itemUrl = $resumeOrderUrl;
          $itemLinkLabel = 'Volver al pedido';
        }
        $itemsHtml .= '<p style="margin:6px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;">'
          . '<a href="' . email_html_escape($itemUrl) . '" style="color:' . $ink . ';text-decoration:underline;">' . email_html_escape($itemLinkLabel) . '</a>'
          . '</p>';
      }
      $itemsHtml .= '</td></tr></table>'
        . '</td></tr>';
    }

    $productSectionHtml = '<tr><td style="padding:2px 28px 18px 28px;">'
      . '<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;line-height:1.4;color:' . $muted . ';text-transform:uppercase;letter-spacing:.14em;">Productos del pedido</p>'
      . '<div style="margin:0 0 10px 0;">' . $miniSegment . '</div>'
      . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;">'
      . $itemsHtml
      . '</table>'
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
    . '<tr><td style="background:linear-gradient(40deg,#dedede,#ffffff,#ffffff,#ffffff);padding:24px 28px 16px 28px;text-align:center;">'
    . '<a href="' . email_html_escape($siteUrl) . '" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">'
    . '<img src="' . email_html_escape($logoUrl) . '" alt="SCOOT SHOP" width="140" style="display:block;margin:0 auto;width:140px;height:auto;border:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#111315;">'
    . '</a>'
    . '</td></tr>'
    . '<tr><td style="padding:0;"><div style="width:100%;height:3px;background:' . $accent . ';"></div></td></tr>'
    . '<tr><td style="padding:18px 28px 18px 28px;">'
    . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;">'
    . '<tr><td style="padding-top:0;">'
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
    log_email_event($CFG, [
      'orderId' => $orderId,
      'eventType' => $event,
      'recipientEmail' => $recipientEmail,
      'deliveryStatus' => 'failed',
      'triggerSource' => email_event_trigger_source($context),
      'providerName' => 'none',
      'providerResponseCode' => null,
      'errorMessage' => 'missing_recipient_email',
      'isManualResend' => !empty($context['manualResend']),
      'sentAt' => null,
    ]);
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
        log_email_event($CFG, [
          'orderId' => $orderId,
          'eventType' => $event,
          'recipientEmail' => $recipientEmail,
          'deliveryStatus' => 'sent',
          'triggerSource' => email_event_trigger_source($context),
          'providerName' => 'vercel_relay',
          'providerMessageId' => email_event_extract_provider_message_id($response['body'] ?? null),
          'providerResponseCode' => (string)$response['status'],
          'errorMessage' => null,
          'isManualResend' => !empty($context['manualResend']),
          'sentAt' => gmdate('Y-m-d H:i:s'),
        ]);
        $usedVercelRelay = true;
      } else {
        log_email_event($CFG, [
          'orderId' => $orderId,
          'eventType' => $event,
          'recipientEmail' => $recipientEmail,
          'deliveryStatus' => 'failed',
          'triggerSource' => email_event_trigger_source($context),
          'providerName' => 'vercel_relay',
          'providerMessageId' => email_event_extract_provider_message_id($response['body'] ?? null),
          'providerResponseCode' => (string)$response['status'],
          'errorMessage' => 'relay_http_' . (string)$response['status'],
          'isManualResend' => !empty($context['manualResend']),
          'sentAt' => null,
        ]);
        error_log('send_transactional_email relay failed for event ' . $event . ': HTTP ' . $response['status'] . ' body=' . substr((string)$response['raw'], 0, 1000));
      }
    } catch (Throwable $e) {
      log_email_event($CFG, [
        'orderId' => $orderId,
        'eventType' => $event,
        'recipientEmail' => $recipientEmail,
        'deliveryStatus' => 'failed',
        'triggerSource' => email_event_trigger_source($context),
        'providerName' => 'vercel_relay',
        'providerResponseCode' => null,
        'errorMessage' => 'relay_exception: ' . $e->getMessage(),
        'isManualResend' => !empty($context['manualResend']),
        'sentAt' => null,
      ]);
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
    log_email_event($CFG, [
      'orderId' => $orderId,
      'eventType' => $event,
      'recipientEmail' => $recipientEmail,
      'deliveryStatus' => 'failed',
      'triggerSource' => email_event_trigger_source($context),
      'providerName' => 'php_mail',
      'providerResponseCode' => null,
      'errorMessage' => 'local_mail_failed',
      'isManualResend' => !empty($context['manualResend']),
      'sentAt' => null,
    ]);
    error_log('send_transactional_email local mail() failed for event ' . $event . ' order ' . $orderId . ' to ' . $recipientEmail);
  } else {
    log_email_event($CFG, [
      'orderId' => $orderId,
      'eventType' => $event,
      'recipientEmail' => $recipientEmail,
      'deliveryStatus' => 'sent',
      'triggerSource' => email_event_trigger_source($context),
      'providerName' => 'php_mail',
      'providerResponseCode' => null,
      'errorMessage' => null,
      'isManualResend' => !empty($context['manualResend']),
      'sentAt' => gmdate('Y-m-d H:i:s'),
    ]);
  }

  return $sent;
}

function send_order_status_email(array $CFG, string $recipientEmail, string $orderId, string $status, array $context = []): bool {
  $context['logoUrl'] = absolute_url($CFG['public_base'], '/img/0-removebg-preview.png');
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

function email_event_trigger_source(array $context): string {
  $triggerSource = trim((string)($context['triggerSource'] ?? ''));
  if ($triggerSource !== '') return $triggerSource;

  if (!empty($context['manualResend'])) return 'manual_resend';

  $source = strtolower(trim((string)($context['source'] ?? '')));
  if ($source === 'admin') return 'admin_status_change';

  $provider = strtolower(trim((string)($context['provider'] ?? '')));
  if ($provider === 'paypal') return 'paypal_ipn';
  if ($provider === 'stripe') {
    $sourceType = trim((string)($context['sourceType'] ?? ''));
    return $sourceType !== '' ? 'stripe_' . $sourceType : 'stripe_reconcile';
  }

  return 'system';
}

function email_event_extract_provider_message_id($providerBody): ?string {
  if (!is_array($providerBody)) return null;

  $candidates = [
    $providerBody['id'] ?? null,
    $providerBody['messageId'] ?? null,
    $providerBody['message_id'] ?? null,
    $providerBody['providerMessageId'] ?? null,
    $providerBody['result']['id'] ?? null,
    $providerBody['result']['messageId'] ?? null,
  ];

  foreach ($candidates as $candidate) {
    $value = trim((string)($candidate ?? ''));
    if ($value !== '') return $value;
  }

  return null;
}

function ensure_email_events_schema_safe(array $CFG): bool {
  static $ready = false;

  if ($ready) {
    return $ready;
  }

  try {
    $pdo = pdo_conn($CFG);

    $pdo->exec("\n    CREATE TABLE IF NOT EXISTS email_events (\n      id BIGINT AUTO_INCREMENT PRIMARY KEY,\n      order_id VARCHAR(64) NULL,\n      event_type VARCHAR(64) NOT NULL,\n      recipient_email VARCHAR(190) NOT NULL,\n      delivery_status VARCHAR(16) NOT NULL,\n      trigger_source VARCHAR(64) NOT NULL DEFAULT 'system',\n      provider_name VARCHAR(64) NULL,\n      provider_message_id VARCHAR(190) NULL,\n      provider_response_code VARCHAR(32) NULL,\n      error_message TEXT NULL,\n      is_manual_resend TINYINT(1) NOT NULL DEFAULT 0,\n      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      sent_at DATETIME NULL,\n      INDEX idx_ee_order_id (order_id),\n      INDEX idx_ee_event_type (event_type),\n      INDEX idx_ee_delivery_status (delivery_status),\n      INDEX idx_ee_created_at (created_at)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n  ");

    $emailEventColumns = [
      'id' => "BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY",
      'order_id' => "VARCHAR(64) NULL",
      'event_type' => "VARCHAR(64) NOT NULL DEFAULT ''",
      'recipient_email' => "VARCHAR(190) NOT NULL DEFAULT ''",
      'delivery_status' => "VARCHAR(16) NOT NULL DEFAULT 'failed'",
      'trigger_source' => "VARCHAR(64) NOT NULL DEFAULT 'system'",
      'provider_name' => "VARCHAR(64) NULL",
      'provider_message_id' => "VARCHAR(190) NULL",
      'provider_response_code' => "VARCHAR(32) NULL",
      'error_message' => "TEXT NULL",
      'is_manual_resend' => "TINYINT(1) NOT NULL DEFAULT 0",
      'created_at' => "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
      'sent_at' => "DATETIME NULL",
    ];

    $existingEmailColumns = [];
    foreach ($pdo->query("SHOW COLUMNS FROM email_events") as $column) {
      $field = (string)($column['Field'] ?? '');
      if ($field !== '') {
        $existingEmailColumns[$field] = true;
      }
    }

    foreach ($emailEventColumns as $columnName => $definition) {
      if (!isset($existingEmailColumns[$columnName])) {
        $pdo->exec("ALTER TABLE email_events ADD COLUMN {$columnName} {$definition}");
      }
    }

    $ready = true;
    return true;
  } catch (Throwable $e) {
    error_log('ensure_email_events_schema_safe failed: ' . $e->getMessage());
    $ready = false;
    return false;
  }
}

function log_email_event(array $CFG, array $eventData): void {
  try {
    if (!ensure_email_events_schema_safe($CFG)) {
      return;
    }

    $pdo = pdo_conn($CFG);
    $st = $pdo->prepare("INSERT INTO email_events (order_id, event_type, recipient_email, delivery_status, trigger_source, provider_name, provider_message_id, provider_response_code, error_message, is_manual_resend, created_at, sent_at) VALUES (:order_id, :event_type, :recipient_email, :delivery_status, :trigger_source, :provider_name, :provider_message_id, :provider_response_code, :error_message, :is_manual_resend, :created_at, :sent_at)");
    $createdAt = gmdate('Y-m-d H:i:s');
    $st->execute([
      ':order_id' => trim((string)($eventData['orderId'] ?? '')) !== '' ? trim((string)$eventData['orderId']) : null,
      ':event_type' => trim((string)($eventData['eventType'] ?? 'unknown')),
      ':recipient_email' => trim((string)($eventData['recipientEmail'] ?? '')),
      ':delivery_status' => trim((string)($eventData['deliveryStatus'] ?? 'failed')),
      ':trigger_source' => trim((string)($eventData['triggerSource'] ?? 'system')),
      ':provider_name' => trim((string)($eventData['providerName'] ?? '')) !== '' ? trim((string)$eventData['providerName']) : null,
      ':provider_message_id' => trim((string)($eventData['providerMessageId'] ?? '')) !== '' ? trim((string)$eventData['providerMessageId']) : null,
      ':provider_response_code' => trim((string)($eventData['providerResponseCode'] ?? '')) !== '' ? trim((string)$eventData['providerResponseCode']) : null,
      ':error_message' => trim((string)($eventData['errorMessage'] ?? '')) !== '' ? trim((string)$eventData['errorMessage']) : null,
      ':is_manual_resend' => !empty($eventData['isManualResend']) ? 1 : 0,
      ':created_at' => $createdAt,
      ':sent_at' => trim((string)($eventData['sentAt'] ?? '')) !== '' ? trim((string)$eventData['sentAt']) : null,
    ]);
  } catch (Throwable $e) {
    error_log('log_email_event failed: ' . $e->getMessage());
  }
}

function log_admin_activity(PDO $pdo, string $entityId, string $action, string $oldValue = '', string $newValue = '', bool $critical = false, string $result = 'ok'): void {
  $entityId = trim($entityId);
  $action = trim($action);
  if ($entityId === '' || $action === '') return;

  $meta = '[result=' . ($result !== '' ? $result : 'ok') . ';critical=' . ($critical ? '1' : '0') . ']';
  $safeOld = mb_substr(trim($oldValue), 0, 1900);
  $safeNew = mb_substr(trim($newValue), 0, 1900);

  try {
    $st = $pdo->prepare("INSERT INTO order_history (order_id, field_name, old_value, new_value, changed_by, created_at) VALUES (:oid, :field, :oldv, :newv, 'admin', :ts)");
    $st->execute([
      ':oid' => $entityId,
      ':field' => $action,
      ':oldv' => $safeOld,
      ':newv' => $meta . ($safeNew !== '' ? ' ' . $safeNew : ''),
      ':ts' => date('Y-m-d H:i:s'),
    ]);
  } catch (Throwable $e) {
    // Best effort only; never break primary action flows.
  }
}

function find_recent_manual_email_event(PDO $pdo, string $orderId, string $recipientEmail, string $eventType, string $triggerSource, int $windowSeconds = 20): ?array {
  if ($orderId === '' || $recipientEmail === '' || $eventType === '' || $triggerSource === '') {
    return null;
  }

  $cutoff = gmdate('Y-m-d H:i:s', time() - max(1, $windowSeconds));

  try {
    $st = $pdo->prepare("SELECT created_at, delivery_status FROM email_events WHERE order_id = :oid AND recipient_email = :recipient_email AND event_type = :event_type AND trigger_source = :trigger_source AND is_manual_resend = 1 AND created_at >= :cutoff ORDER BY created_at DESC, id DESC LIMIT 1");
    $st->execute([
      ':oid' => $orderId,
      ':recipient_email' => $recipientEmail,
      ':event_type' => $eventType,
      ':trigger_source' => $triggerSource,
      ':cutoff' => $cutoff,
    ]);
    $row = $st->fetch();

    if (!$row) {
      return null;
    }

    return [
      'created_at' => (string)($row['created_at'] ?? ''),
      'delivery_status' => (string)($row['delivery_status'] ?? ''),
    ];
  } catch (Throwable $e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCOUNT ENGINE — Fase 1
// Aislado completamente del flujo de ventas.
// Ninguna función de esta sección se llama desde rutas existentes.
// Todo queda inactivo si DISCOUNTS_ENABLED=false.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fees de pasarela de pago — espejo backend de pago.html#L2091.
 * Formato: [pct_decimal, fixed_eur]
 * En Fase 2+ esto será la fuente de verdad y pago.html lo leerá del backend.
 */
const BACKEND_PAYMENT_FEES = [
  'card'     => [0.009,   0.15],
  'klarna'   => [0.0359,  0.15],
  'paypal'   => [0.0209,  0.29],
  'bizum'    => [0.0,     0.0],
  'transfer' => [0.0,     0.0],
];

/**
 * Migración idempotente de tablas y columnas del sistema de descuentos.
 * SOLO se llama desde rutas de descuento, NUNCA desde ensure_schema().
 * Cada operación va en su propio try/catch: un fallo no rompe el resto.
 * Errores van a error_log con prefijo [discount_schema].
 */
function ensure_discount_schema_safe(PDO $pdo): bool {
  $ok = true;

  // ── discount_codes ─────────────────────────────────────────────────────────
  try {
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS discount_codes (
        id               BIGINT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
        code             VARCHAR(64)        NOT NULL,
        code_normalized  VARCHAR(64)        NOT NULL COMMENT 'UPPER(TRIM(code))',
        name             VARCHAR(120)       NOT NULL DEFAULT '',
        description      TEXT               NULL,
        discount_type    ENUM('percent','amount') NOT NULL,
        discount_value   DECIMAL(12,4)      NOT NULL,
        currency         CHAR(3)            NOT NULL DEFAULT 'EUR',
        active           TINYINT(1)         NOT NULL DEFAULT 1,
        starts_at        DATETIME           NULL,
        ends_at          DATETIME           NULL,
        max_redemptions          INT UNSIGNED NULL COMMENT 'NULL = ilimitado',
        max_redemptions_per_email INT UNSIGNED NULL COMMENT 'NULL = ilimitado',
        min_order_amount DECIMAL(12,2)      NULL COMMENT 'NULL = sin mínimo',
        applies_to       ENUM('all','selected_products','selected_categories')
                                            NOT NULL DEFAULT 'all',
        stackable        TINYINT(1)         NOT NULL DEFAULT 0,
        deleted_at       DATETIME           NULL,
        created_at       DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at       DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT uq_discount_code_normalized UNIQUE (code_normalized),
        INDEX idx_dc_active_dates (active, starts_at, ends_at),
        INDEX idx_dc_applies_to   (applies_to),
        INDEX idx_dc_deleted_at   (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
  } catch (Throwable $e) {
    error_log('[discount_schema] CREATE discount_codes failed: ' . $e->getMessage());
    $ok = false;
  }

  // ── discount_code_targets ───────────────────────────────────────────────────
  try {
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS discount_code_targets (
        id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        discount_code_id BIGINT UNSIGNED NOT NULL,
        target_type      ENUM('sku','product_slug','category') NOT NULL,
        target_value     VARCHAR(190)    NOT NULL,
        created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_dct_code
          FOREIGN KEY (discount_code_id)
          REFERENCES discount_codes(id)
          ON DELETE CASCADE,
        CONSTRAINT uq_dct_unique_target
          UNIQUE (discount_code_id, target_type, target_value),
        INDEX idx_dct_lookup   (target_type, target_value),
        INDEX idx_dct_discount (discount_code_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
  } catch (Throwable $e) {
    error_log('[discount_schema] CREATE discount_code_targets failed: ' . $e->getMessage());
    $ok = false;
  }

  // ── discount_redemptions ────────────────────────────────────────────────────
  try {
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS discount_redemptions (
        id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        discount_code_id       BIGINT UNSIGNED NOT NULL,
        order_id               VARCHAR(64)     NOT NULL,
        email                  VARCHAR(190)    NOT NULL DEFAULT '',
        sku                    VARCHAR(64)     NULL,
        amount_before_discount DECIMAL(12,2)   NOT NULL,
        eligible_amount        DECIMAL(12,2)   NOT NULL,
        discount_amount        DECIMAL(12,2)   NOT NULL,
        amount_after_discount  DECIMAL(12,2)   NOT NULL,
        payment_method         VARCHAR(32)     NOT NULL DEFAULT '',
        status                 ENUM('reserved','consumed','released','canceled','expired')
                                               NOT NULL DEFAULT 'reserved',
        created_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                               ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_dr_code
          FOREIGN KEY (discount_code_id)
          REFERENCES discount_codes(id)
          ON DELETE RESTRICT,
        CONSTRAINT uq_dr_order UNIQUE (order_id),
        INDEX idx_dr_discount_status (discount_code_id, status),
        INDEX idx_dr_email_status    (email, status),
        INDEX idx_dr_created         (created_at),
        INDEX idx_dr_order_status    (order_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
  } catch (Throwable $e) {
    error_log('[discount_schema] CREATE discount_redemptions failed: ' . $e->getMessage());
    $ok = false;
  }

  // ── Columnas nuevas en orders (idempotentes) ────────────────────────────────
  try {
    $existing = [];
    foreach ($pdo->query("SHOW COLUMNS FROM orders") as $col) {
      $f = (string)($col['Field'] ?? '');
      if ($f !== '') $existing[$f] = true;
    }

    $newCols = [
      'subtotal_amount'    => 'DECIMAL(12,2) NULL',
      'shipping_amount'    => 'DECIMAL(12,2) NULL',
      'payment_fee_amount' => 'DECIMAL(12,2) NULL',
      'discount_code'      => 'VARCHAR(64) NULL',
      'discount_id'        => 'BIGINT UNSIGNED NULL',
      'discount_type'      => "ENUM('percent','amount') NULL",
      'discount_value'     => 'DECIMAL(12,4) NULL',
      'discount_amount'    => 'DECIMAL(12,2) NULL',
      'total_amount'       => 'DECIMAL(12,2) NULL',
      'pricing_source'     => 'VARCHAR(32) NULL',
      'pricing_version'    => 'VARCHAR(32) NULL',
    ];

    foreach ($newCols as $col => $ddl) {
      if (isset($existing[$col])) continue;
      try {
        $pdo->exec("ALTER TABLE orders ADD COLUMN `{$col}` {$ddl}");
      } catch (Throwable $e) {
        error_log("[discount_schema] ALTER orders ADD COLUMN {$col} failed: " . $e->getMessage());
        $ok = false;
      }
    }
  } catch (Throwable $e) {
    error_log('[discount_schema] SHOW COLUMNS orders failed: ' . $e->getMessage());
    $ok = false;
  }

  // ── Índices nuevos en orders (idempotentes) ─────────────────────────────────
  try {
    $existingIdx = [];
    $st = $pdo->prepare(
      "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'"
    );
    $st->execute();
    foreach ($st->fetchAll() as $row) {
      $n = (string)($row['INDEX_NAME'] ?? '');
      if ($n !== '') $existingIdx[$n] = true;
    }

    $newIdx = [
      'idx_orders_discount_code' => '(discount_code)',
      'idx_orders_discount_id'   => '(discount_id)',
      'idx_orders_total_amount'  => '(total_amount)',
      'idx_orders_pricing_src'   => '(pricing_source)',
    ];

    foreach ($newIdx as $idxName => $cols) {
      if (isset($existingIdx[$idxName])) continue;
      try {
        $pdo->exec("ALTER TABLE orders ADD INDEX `{$idxName}` {$cols}");
      } catch (Throwable $e) {
        error_log("[discount_schema] ALTER orders ADD INDEX {$idxName} failed: " . $e->getMessage());
        // índices son opcionales, no marcar $ok=false
      }
    }
  } catch (Throwable $e) {
    error_log('[discount_schema] INDEX check orders failed: ' . $e->getMessage());
    // no crítico
  }

  return $ok;
}

/**
 * Busca el precio canónico de un SKU en data/products.js.
 * Devuelve ['price' => '999.00', 'priceText' => '999 €'] o null si no existe.
 * Nunca devuelve precio 0 silencioso: si price = 0.00, devuelve null.
 * Nunca confía en el precio enviado por el frontend.
 */
function lookup_product_price_by_sku(string $sku, string $productsFile): ?array {
  if ($sku === '') return null;
  if (!is_file($productsFile) || !is_readable($productsFile)) return null;

  $js = file_get_contents($productsFile);
  if (!is_string($js) || $js === '') return null;

  // Regex basado en el mismo patrón de admin_products_list en este archivo.
  // Busca el bloque del producto cuyo sku coincide exactamente.
  $skuEscaped = preg_quote($sku, '/');
  $pattern = '/\{[^{}]*sku:\s*[\'"]' . $skuEscaped . '[\'"][^{}]*priceText:\s*[\'"]([^\'"]+)[\'"][^{}]*\}/s';

  if (!preg_match($pattern, $js, $m)) {
    // Intento alternativo: bloque multi-línea con mayor alcance
    $pattern2 = '/id:\s*[^\n]*\n.*?sku:\s*[\'"]' . $skuEscaped . '[\'"].*?priceText:\s*[\'"]([^\'"]+)[\'"]/s';
    if (!preg_match($pattern2, $js, $m)) {
      return null;
    }
  }

  $priceText = trim((string)($m[1] ?? ''));
  if ($priceText === '') return null;

  $priceNum = extract_price_number($priceText); // función ya existente en este archivo
  $priceFloat = (float)$priceNum;
  if ($priceFloat <= 0.0) return null; // nunca precio 0 silencioso

  return [
    'price'     => $priceNum,        // '999.00'
    'priceText' => $priceText,       // '999 €'
  ];
}

/**
 * Busca datos de catálogo por SKU para enriquecer pedidos legacy sin metadatos.
 * Devuelve href/image (y color_label si existe en colorVariants) o null.
 */
function lookup_product_media_by_sku(string $sku, string $productsFile): ?array {
  if ($sku === '') return null;
  if (!is_file($productsFile) || !is_readable($productsFile)) return null;

  $js = file_get_contents($productsFile);
  if (!is_string($js) || $js === '') return null;

  $skuEscaped = preg_quote($sku, '/');
  $pattern = '/sku:\s*[\'\"]' . $skuEscaped . '[\'\"][\s\S]{0,1800}?href:\s*[\'\"]([^\'\"]+)[\'\"][\s\S]{0,900}?image:\s*[\'\"]([^\'\"]+)[\'\"]/i';
  if (!preg_match($pattern, $js, $m)) return null;

  $href = trim((string)($m[1] ?? ''));
  $image = trim((string)($m[2] ?? ''));
  if ($href === '' && $image === '') return null;

  $colorLabel = '';
  $colorPattern = '/sku:\s*[\'\"]' . $skuEscaped . '[\'\"][\s\S]{0,12000}?colorVariants:\s*\[[\s\S]{0,6000}?label:\s*[\'\"]([^\'\"]+)[\'\"]/i';
  if (preg_match($colorPattern, $js, $cm)) {
    $colorLabel = trim((string)($cm[1] ?? ''));
  }

  return [
    'url' => $href,
    'image' => $image,
    'color_label' => $colorLabel,
  ];
}

function normalize_order_items_input(array $itemsRaw, string $publicBase = ''): array {
  $items = [];
  foreach ($itemsRaw as $row) {
    if (!is_array($row)) continue;
    $product = (isset($row['product']) && is_array($row['product'])) ? $row['product'] : [];
    $sku = trim((string)($row['sku'] ?? ''));
    $name = trim((string)($row['name'] ?? $row['title'] ?? $row['product_name'] ?? $row['productName'] ?? $product['name'] ?? $product['title'] ?? $product['product_name'] ?? ''));
    $qty = (int)($row['qty'] ?? $row['quantity'] ?? $row['count'] ?? $row['units'] ?? 1);
    if ($qty < 1) $qty = 1;
    $price = null;
    $priceRaw = $row['price'] ?? $row['unit_price'] ?? $row['unitPrice'] ?? $row['price_value'] ?? null;
    if ($priceRaw !== null && $priceRaw !== '') {
      $priceVal = (float)$priceRaw;
      if (is_finite($priceVal) && $priceVal > 0) {
        $price = number_format($priceVal, 2, '.', '');
      }
    }
    $url = trim((string)($row['url'] ?? $row['href'] ?? $row['link'] ?? $row['product_url'] ?? $row['productUrl'] ?? $product['url'] ?? $product['href'] ?? $product['link'] ?? $product['product_url'] ?? ''));
    $image = trim((string)($row['image'] ?? $row['product_image_url'] ?? $row['image_url'] ?? $row['imageUrl'] ?? $row['img'] ?? $row['photo'] ?? $row['product_image'] ?? $row['productImage'] ?? $row['thumbnail'] ?? $row['thumb'] ?? $row['image_path'] ?? $product['image'] ?? $product['product_image_url'] ?? $product['image_url'] ?? $product['imageUrl'] ?? $product['thumbnail'] ?? $product['thumb'] ?? ''));
    $color = trim((string)($row['color'] ?? $row['colorKey'] ?? $row['product_color'] ?? $row['variant_color'] ?? $row['variantColor'] ?? $row['selected_color'] ?? $row['selectedColor'] ?? $row['selectedColorKey'] ?? $row['color_key'] ?? $product['color'] ?? $product['colorKey'] ?? $product['product_color'] ?? $product['variant_color'] ?? $product['variantColor'] ?? $product['selectedColor'] ?? $product['selectedColorKey'] ?? ''));
    $colorLabel = trim((string)($row['color_label'] ?? $row['colorLabel'] ?? $row['product_color_label'] ?? $row['variant_color_label'] ?? $row['variantColorLabel'] ?? $row['selectedColorLabel'] ?? $row['selected_color_label'] ?? $row['color_name'] ?? $row['colour_label'] ?? $row['variant_label'] ?? $row['variantLabel'] ?? $product['color_label'] ?? $product['colorLabel'] ?? $product['product_color_label'] ?? $product['variant_color_label'] ?? $product['variantColorLabel'] ?? $product['selectedColorLabel'] ?? ''));

    if ($colorLabel === '' && $color !== '') $colorLabel = $color;
    if ($color === '' && $colorLabel !== '') $color = $colorLabel;

    if ($name === '' && $sku === '') continue;

    if ($publicBase !== '') {
      if ($url !== '') $url = absolute_url($publicBase, $url);
      if ($image !== '') $image = absolute_url($publicBase, $image);
    }

    $items[] = [
      'sku' => $sku,
      'name' => $name,
      'qty' => $qty,
      'price' => $price,
      'url' => $url,
      'image' => $image,
      'color' => $color,
      'color_label' => $colorLabel,
    ];
  }

  return $items;
}

function decode_order_items_json(?string $raw): array {
  if (!is_string($raw) || trim($raw) === '') return [];
  $decoded = json_decode($raw, true);

  // Compat con payloads legacy guardados como JSON stringificado (doble encode).
  if (is_string($decoded) && trim($decoded) !== '') {
    $decoded = json_decode($decoded, true);
  }
  if (!is_array($decoded)) return [];

  $itemsRaw = [];
  $isList = array_keys($decoded) === range(0, count($decoded) - 1);
  if ($isList) {
    $itemsRaw = $decoded;
  } else {
    foreach (['items', 'cart_items', 'line_items', 'order_items', 'products'] as $bucketKey) {
      if (isset($decoded[$bucketKey]) && is_array($decoded[$bucketKey])) {
        $itemsRaw = $decoded[$bucketKey];
        break;
      }
    }
    if (empty($itemsRaw) && isset($decoded['item']) && is_array($decoded['item'])) {
      $itemsRaw = [$decoded['item']];
    }
    if (empty($itemsRaw)) {
      $itemsRaw = [$decoded];
    }
  }

  return normalize_order_items_input($itemsRaw);
}

function build_order_items_from_order_row(array $order): array {
  $fromJson = decode_order_items_json((string)($order['cart_items_json'] ?? ''));
  if (!empty($fromJson)) {
    $fallbackImage = trim((string)($order['product_image_url'] ?? ''));
    $fallbackColor = trim((string)($order['product_color'] ?? ''));
    $fallbackColorLabel = trim((string)($order['product_color_label'] ?? ''));
    $publicBase = rtrim((string)(getenv('PUBLIC_BASE') ?: 'https://scootshop.co'), '/');
    $productsFiles = [
      __DIR__ . '/../data/products-server.js',
      __DIR__ . '/../data/products.js',
    ];
    $mediaCache = [];

    // Enriquecer pedidos legacy: si faltan url/imagen/color por item, resolver por SKU desde catálogo.
    foreach ($fromJson as &$item) {
      if (!is_array($item)) continue;
      $itemSku = trim((string)($item['sku'] ?? ''));
      $itemUrl = trim((string)($item['url'] ?? ''));
      $itemImage = trim((string)($item['image'] ?? ''));
      $itemColor = trim((string)($item['color'] ?? ''));
      $itemColorLabel = trim((string)($item['color_label'] ?? ''));

      if ($itemSku !== '' && ($itemUrl === '' || $itemImage === '' || ($itemColorLabel === '' && $itemColor === ''))) {
        if (!array_key_exists($itemSku, $mediaCache)) {
          $mediaCache[$itemSku] = null;
          $mergedMedia = ['url' => '', 'image' => '', 'color_label' => ''];
          foreach ($productsFiles as $pf) {
            $media = lookup_product_media_by_sku($itemSku, $pf);
            if ($media !== null) {
              if ($mergedMedia['url'] === '' && trim((string)($media['url'] ?? '')) !== '') {
                $mergedMedia['url'] = trim((string)$media['url']);
              }
              if ($mergedMedia['image'] === '' && trim((string)($media['image'] ?? '')) !== '') {
                $mergedMedia['image'] = trim((string)$media['image']);
              }
              if ($mergedMedia['color_label'] === '' && trim((string)($media['color_label'] ?? '')) !== '') {
                $mergedMedia['color_label'] = trim((string)$media['color_label']);
              }
              if ($mergedMedia['url'] !== '' && $mergedMedia['image'] !== '' && $mergedMedia['color_label'] !== '') {
                break;
              }
            }
          }
          if ($mergedMedia['url'] !== '' || $mergedMedia['image'] !== '' || $mergedMedia['color_label'] !== '') {
            $mediaCache[$itemSku] = $mergedMedia;
          }
        }
        $media = $mediaCache[$itemSku];
        if (is_array($media)) {
          if ($itemUrl === '' && trim((string)($media['url'] ?? '')) !== '') {
            $itemUrl = trim((string)$media['url']);
          }
          if ($itemImage === '' && trim((string)($media['image'] ?? '')) !== '') {
            $itemImage = trim((string)$media['image']);
          }
          if ($itemColorLabel === '' && $itemColor === '' && trim((string)($media['color_label'] ?? '')) !== '') {
            $itemColorLabel = trim((string)$media['color_label']);
          }
        }
      }

      if ($itemImage === '' && $itemUrl !== '') {
        $itemImage = rtrim($itemUrl, '/') . '/img/1.webp';
      }

      if ($itemUrl !== '') {
        $itemUrl = absolute_url($publicBase, $itemUrl);
      }
      if ($itemImage !== '') {
        $itemImage = absolute_url($publicBase, $itemImage);
      }

      if ($itemColorLabel === '' && $itemColor !== '') {
        $itemColorLabel = $itemColor;
      }

      $item['url'] = $itemUrl;
      $item['image'] = $itemImage;
      $item['color'] = $itemColor;
      $item['color_label'] = $itemColorLabel;
    }
    unset($item);

    if (count($fromJson) === 1) {
      if (trim((string)($fromJson[0]['image'] ?? '')) === '' && $fallbackImage !== '') {
        $fromJson[0]['image'] = $fallbackImage;
      }
      if (trim((string)($fromJson[0]['color'] ?? '')) === '' && $fallbackColor !== '') {
        $fromJson[0]['color'] = $fallbackColor;
      }
      if (trim((string)($fromJson[0]['color_label'] ?? '')) === '' && $fallbackColorLabel !== '') {
        $fromJson[0]['color_label'] = $fallbackColorLabel;
      }
    }

    if (trim((string)($fromJson[0]['color_label'] ?? '')) === '' && trim((string)($fromJson[0]['color'] ?? '')) !== '') {
      $fromJson[0]['color_label'] = trim((string)$fromJson[0]['color']);
    }

    return $fromJson;
  }

  $fallbackName = trim((string)($order['name'] ?? ''));
  $fallbackSku = trim((string)($order['sku'] ?? ''));
  if ($fallbackName === '' && $fallbackSku === '') return [];

  return [[
    'sku' => $fallbackSku,
    'name' => $fallbackName !== '' ? $fallbackName : $fallbackSku,
    'qty' => 1,
    'price' => null,
    'url' => trim((string)($order['product_url'] ?? '')),
    'image' => trim((string)($order['product_image_url'] ?? '')),
    'color' => trim((string)($order['product_color'] ?? '')),
    'color_label' => trim((string)($order['product_color_label'] ?? '')),
  ]];
}

function order_items_display_name(array $items, string $fallbackName): string {
  if (empty($items)) return $fallbackName;
  $total = 0;
  $names = [];
  foreach ($items as $item) {
    $qty = max(1, (int)($item['qty'] ?? 1));
    $total += $qty;
    $name = trim((string)($item['name'] ?? $item['sku'] ?? ''));
    if ($name !== '') $names[] = $name;
  }
  if (empty($names)) return $fallbackName;
  if (count($names) === 1) return $names[0];
  return 'Carrito SCOOT SHOP (' . $total . ' articulos)';
}

/**
 * Motor de cálculo de descuentos.
 * Toda la aritmética sobre importes con 2 decimales.
 * Fórmula de fee idéntica a calcSurcharge() de pago.html.
 *
 * @param string $base_amount      Precio base del catálogo backend (sin fee)
 * @param string|null $dtype       'percent' | 'amount' | null
 * @param string|null $dvalue      Valor del descuento (e.g. '20.0000', '50.00')
 * @param string $payment_method   'card'|'klarna'|'paypal'|'bizum'|'transfer'
 * @param string $shipping_amount  '0.00' en V1
 * @return array                   Breakdown completo
 */
function calc_discount_engine(
  string  $base_amount,
  ?string $dtype,
  ?string $dvalue,
  string  $payment_method,
  string  $shipping_amount = '0.00'
): array {
  $subtotal   = round((float)$base_amount, 2);
  $shipping   = round((float)$shipping_amount, 2);
  $eligible   = $subtotal; // V1: eligible = subtotal completo

  // ── Descuento ───────────────────────────────────────────────────────────────
  $discountAmt = 0.0;
  if ($dtype !== null && $dvalue !== null) {
    $dv = round((float)$dvalue, 4);
    if ($dtype === 'percent') {
      $discountAmt = round($eligible * ($dv / 100.0), 2);
    } elseif ($dtype === 'amount') {
      $discountAmt = round(min($dv, $eligible), 2);
    }
  }
  $discountAmt  = max(0.0, $discountAmt);
  $afterDiscount = round($subtotal - $discountAmt, 2);

  // ── Fee de pasarela (fórmula idéntica a pago.html calcSurcharge) ────────────
  $fees       = BACKEND_PAYMENT_FEES[$payment_method] ?? [0.0, 0.0];
  $feesPct    = (float)$fees[0];
  $feesFixed  = (float)$fees[1];
  $feeAmt     = 0.0;

  if ($feesPct > 0.0 || $feesFixed > 0.0) {
    // ceil((base + fixed) / (1 - pct) * 100) / 100
    $totalWithFee = ceil(($afterDiscount + $feesFixed) / (1.0 - $feesPct) * 100.0) / 100.0;
    $feeAmt = round($totalWithFee - $afterDiscount, 2);
  }

  $totalAmount = round($afterDiscount + $feeAmt + $shipping, 2);

  return [
    'subtotal_amount'      => number_format($subtotal, 2, '.', ''),
    'eligible_amount'      => number_format($eligible, 2, '.', ''),
    'discount_amount'      => number_format($discountAmt, 2, '.', ''),
    'amount_after_discount'=> number_format($afterDiscount, 2, '.', ''),
    'payment_method'       => $payment_method,
    'payment_fee_amount'   => number_format($feeAmt, 2, '.', ''),
    'shipping_amount'      => number_format($shipping, 2, '.', ''),
    'total_amount'         => number_format($totalAmount, 2, '.', ''),
  ];
}

/**
 * Resuelve el pricing real de un pedido desde backend.
 * No aplica redenciones definitivas: solo snapshot para orders.
 */
function resolve_order_pricing(array $input): array {
  global $CFG;

  $warnings = [];
  $errors = [];

  $sku = trim((string)($input['sku'] ?? ''));
  $currency = strtoupper(trim((string)($input['currency'] ?? 'EUR')));
  $paymentMethod = strtolower(trim((string)($input['payment_method'] ?? '')));
  $discountCode = strtoupper(trim((string)($input['discount_code'] ?? '')));
  $customerEmail = strtolower(trim((string)($input['customer_email'] ?? '')));
  $frontendBaseAmount = trim((string)($input['frontend_base_amount'] ?? ''));
  $category = trim((string)($input['category'] ?? ''));
  $shippingAmount = trim((string)($input['shipping_amount'] ?? '0.00'));
  if ($shippingAmount === '') {
    $shippingAmount = '0.00';
  }

  $cartItemsRaw = is_array($input['cart_items'] ?? null) ? $input['cart_items'] : [];
  $cartItems = [];
  $cartSkuCandidates = [];
  foreach ($cartItemsRaw as $row) {
    if (!is_array($row)) continue;
    $rowSku = trim((string)($row['sku'] ?? ''));
    if ($rowSku === '') continue;
    $rowQty = (int)($row['qty'] ?? 1);
    if ($rowQty < 1) $rowQty = 1;
    $cartItems[] = ['sku' => $rowSku, 'qty' => $rowQty];
    $cartSkuCandidates[$rowSku] = true;
  }
  $isCartMode = !empty($cartItems);

  $paymentMethodForFees = $paymentMethod === 'bank' ? 'transfer' : $paymentMethod;

  if ($sku === '' && !$isCartMode) {
    $errors[] = 'missing_sku';
  }

  if ($currency !== 'EUR') {
    $errors[] = 'currency_not_supported';
  }

  if (!isset(BACKEND_PAYMENT_FEES[$paymentMethodForFees])) {
    $errors[] = 'invalid_payment_method';
  }

  if ($shippingAmount !== '' && !preg_match('/^\d+(\.\d{1,2})?$/', $shippingAmount)) {
    $errors[] = 'bad_shipping_amount';
  }

  if (!empty($errors)) {
    return [
      'ok' => false,
      'subtotal_amount' => '0.00',
      'discount_code' => null,
      'discount_id' => null,
      'discount_type' => null,
      'discount_value' => null,
      'discount_amount' => '0.00',
      'payment_fee_amount' => '0.00',
      'shipping_amount' => number_format((float)$shippingAmount, 2, '.', ''),
      'total_amount' => '0.00',
      'pricing_source' => 'backend_discount_engine',
      'pricing_version' => 'v1-discounts',
      'discount_valid' => false,
      'price_discrepancy' => false,
      'warnings' => $warnings,
      'errors' => $errors,
    ];
  }

  $productsFile = __DIR__ . '/../data/products.js';
  $catalogEntry = null;
  $backendBaseAmount = '0.00';
  $cartCategoryCandidates = [];

  if ($isCartMode) {
    $cartSubtotal = 0.0;
    foreach ($cartItems as $item) {
      $entry = lookup_product_price_by_sku($item['sku'], $productsFile);
      if ($entry === null) {
        $errors[] = 'cart_sku_not_found_in_catalog';
        continue;
      }
      if ($catalogEntry === null) {
        $catalogEntry = $entry;
        if ($sku === '') $sku = (string)$item['sku'];
      }
      $entryCategory = trim((string)($entry['category'] ?? ''));
      if ($entryCategory !== '') $cartCategoryCandidates[$entryCategory] = true;
      $cartSubtotal += (float)$entry['price'] * (int)$item['qty'];
    }

    if ($cartSubtotal <= 0) {
      $errors[] = 'empty_cart';
    }

    if (!empty($errors)) {
      return [
        'ok' => false,
        'subtotal_amount' => '0.00',
        'discount_code' => null,
        'discount_id' => null,
        'discount_type' => null,
        'discount_value' => null,
        'discount_amount' => '0.00',
        'payment_fee_amount' => '0.00',
        'shipping_amount' => number_format((float)$shippingAmount, 2, '.', ''),
        'total_amount' => '0.00',
        'pricing_source' => 'backend_discount_engine',
        'pricing_version' => 'v1-discounts',
        'discount_valid' => false,
        'price_discrepancy' => false,
        'warnings' => $warnings,
        'errors' => array_values(array_unique($errors)),
      ];
    }

    $backendBaseAmount = number_format($cartSubtotal, 2, '.', '');
  } else {
    $catalogEntry = lookup_product_price_by_sku($sku, $productsFile);
    if ($catalogEntry === null) {
      return [
        'ok' => false,
        'subtotal_amount' => '0.00',
        'discount_code' => null,
        'discount_id' => null,
        'discount_type' => null,
        'discount_value' => null,
        'discount_amount' => '0.00',
        'payment_fee_amount' => '0.00',
        'shipping_amount' => number_format((float)$shippingAmount, 2, '.', ''),
        'total_amount' => '0.00',
        'pricing_source' => 'backend_discount_engine',
        'pricing_version' => 'v1-discounts',
        'discount_valid' => false,
        'price_discrepancy' => false,
        'warnings' => $warnings,
        'errors' => ['sku_not_found_in_catalog'],
      ];
    }
    $backendBaseAmount = (string)$catalogEntry['price'];
  }
  $priceDiscrepancy = false;

  if ($frontendBaseAmount !== '') {
    $diff = abs((float)$frontendBaseAmount - (float)$backendBaseAmount);
    if ($diff > 0.01) {
      $priceDiscrepancy = true;
      $warnings[] = 'price_discrepancy';
    }
  }

  $discountValid = null;
  $discountId = null;
  $discountType = null;
  $discountValue = null;
  $discountAmount = '0.00';

  if ($discountCode !== '') {
    if (!$CFG['discounts_enabled']) {
      $discountValid = false;
      $warnings[] = 'feature_disabled';
    } else {
      $localPdo = get_pdo($CFG);
      $schemaOk = ensure_discount_schema_safe($localPdo);
      if (!$schemaOk) {
        $discountValid = false;
        $warnings[] = 'discount_schema_not_ready';
      } else {
        $now = date('Y-m-d H:i:s');
        $stmt = $localPdo->prepare(
          "SELECT * FROM discount_codes
           WHERE code_normalized = :code AND deleted_at IS NULL AND active = 1
           LIMIT 1"
        );
        $stmt->execute([':code' => $discountCode]);
        $dc = $stmt->fetch();

        if (!$dc) {
          $discountValid = false;
          $warnings[] = 'discount_code_not_found';
        } elseif ($dc['ends_at'] !== null && $dc['ends_at'] < $now) {
          $discountValid = false;
          $warnings[] = 'discount_code_expired';
        } elseif ($dc['starts_at'] !== null && $dc['starts_at'] > $now) {
          $discountValid = false;
          $warnings[] = 'discount_code_not_started';
        } else {
          if ($dc['applies_to'] !== 'all') {
            $targetType = ($dc['applies_to'] === 'selected_products') ? 'sku' : 'category';
            $eligible = false;

            if ($isCartMode) {
              $targetValues = [];
              if ($targetType === 'sku') {
                $targetValues = array_keys($cartSkuCandidates);
              } else {
                $targetValues = array_keys($cartCategoryCandidates);
                if (empty($targetValues) && $category !== '') $targetValues[] = $category;
              }

              if (!empty($targetValues)) {
                $stTarget = $localPdo->prepare(
                  "SELECT id FROM discount_code_targets
                   WHERE discount_code_id = :did AND target_type = :ttype AND target_value = :tvalue
                   LIMIT 1"
                );
                foreach ($targetValues as $targetValue) {
                  if ($targetValue === '') continue;
                  $stTarget->execute([':did' => $dc['id'], ':ttype' => $targetType, ':tvalue' => $targetValue]);
                  if ($stTarget->fetch()) {
                    $eligible = true;
                    break;
                  }
                }
              }
            } else {
              $targetValue = ($targetType === 'sku') ? $sku : $category;
              if ($targetValue !== '') {
                $stTarget = $localPdo->prepare(
                  "SELECT id FROM discount_code_targets
                   WHERE discount_code_id = :did AND target_type = :ttype AND target_value = :tvalue
                   LIMIT 1"
                );
                $stTarget->execute([':did' => $dc['id'], ':ttype' => $targetType, ':tvalue' => $targetValue]);
                $eligible = (bool)$stTarget->fetch();
              }
            }

            if (!$eligible) {
              $discountValid = false;
              $warnings[] = 'discount_code_not_eligible';
            }
          }

          if ($discountValid !== false && $dc['min_order_amount'] !== null && (float)$backendBaseAmount < (float)$dc['min_order_amount']) {
            $discountValid = false;
            $warnings[] = 'discount_min_order_not_reached';
          }

          if ($discountValid !== false && $dc['max_redemptions'] !== null) {
            $stCount = $localPdo->prepare(
              "SELECT COUNT(*) FROM discount_redemptions
               WHERE discount_code_id = :did AND status IN ('reserved','consumed')"
            );
            $stCount->execute([':did' => $dc['id']]);
            if ((int)$stCount->fetchColumn() >= (int)$dc['max_redemptions']) {
              $discountValid = false;
              $warnings[] = 'discount_max_redemptions_reached';
            }
          }

          if ($discountValid !== false && $dc['max_redemptions_per_email'] !== null && $customerEmail !== '') {
            $stEmail = $localPdo->prepare(
              "SELECT COUNT(*) FROM discount_redemptions
               WHERE discount_code_id = :did AND email = :email AND status IN ('reserved','consumed')"
            );
            $stEmail->execute([':did' => $dc['id'], ':email' => $customerEmail]);
            if ((int)$stEmail->fetchColumn() >= (int)$dc['max_redemptions_per_email']) {
              $discountValid = false;
              $warnings[] = 'discount_max_redemptions_per_email_reached';
            }
          }

          if ($discountValid !== false) {
            $discountValid = true;
            $discountId = (int)$dc['id'];
            $discountType = (string)$dc['discount_type'];
            $discountValue = (string)$dc['discount_value'];
          }
        }
      }
    }
  }

  $breakdown = ($discountValid === true)
    ? calc_discount_engine($backendBaseAmount, $discountType, $discountValue, $paymentMethodForFees, $shippingAmount)
    : calc_discount_engine($backendBaseAmount, null, null, $paymentMethodForFees, $shippingAmount);

  if ($discountValid === true) {
    $discountAmount = (string)$breakdown['discount_amount'];
  }

  return [
    'ok' => true,
    'subtotal_amount' => (string)$breakdown['subtotal_amount'],
    'discount_code' => $discountValid === true ? $discountCode : null,
    'discount_id' => $discountValid === true ? $discountId : null,
    'discount_type' => $discountValid === true ? $discountType : null,
    'discount_value' => $discountValid === true ? $discountValue : null,
    'discount_amount' => $discountAmount,
    'payment_fee_amount' => (string)$breakdown['payment_fee_amount'],
    'shipping_amount' => (string)$breakdown['shipping_amount'],
    'total_amount' => (string)$breakdown['total_amount'],
    'pricing_source' => 'backend_discount_engine',
    'pricing_version' => 'v1-discounts',
    'discount_valid' => $discountValid,
    'price_discrepancy' => $priceDiscrepancy,
    'warnings' => array_values(array_unique($warnings)),
    'errors' => $errors,
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIN DISCOUNT ENGINE — Fase 1
// ═══════════════════════════════════════════════════════════════════════════════

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
    json_out(['ok' => false, 'error' => 'db_error', 'detail' => 'internal_error'], 500);
  }
  return $pdo;
}

switch ($route) {

  case 'health': {
    json_out([
      'ok' => true,
      'google_configured' => $CFG['google_client_id'] !== '',
      'paypal_configured' => $CFG['paypal_client_id'] !== '',
      'stripe_configured' => $CFG['stripe_secret_key'] !== '' && $CFG['stripe_publishable_key'] !== '',
    ]);
    break;
  }

  case 'auth_config': {
    json_out([
      'ok' => true,
      'googleConfigured' => $CFG['google_client_id'] !== '',
      'googleClientId' => $CFG['google_client_id'],
      'accountEnabled' => $CFG['google_client_id'] !== '',
      'previewEnabled' => can_use_preview_mode($CFG),
      'devAuthEnabled' => can_use_dev_auth($CFG),
    ]);
    break;
  }

  case 'auth_status': {
    $user = customer_current_user();
    json_out([
      'ok' => true,
      'loggedIn' => !empty($user),
      'user' => !empty($user) ? customer_session_payload($user) : null,
    ]);
    break;
  }

  case 'auth_dev_login': {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    if (!can_use_dev_auth($CFG)) {
      json_out(['ok' => false, 'error' => 'forbidden_dev_auth_disabled'], 403);
    }

    $b = get_json_body();
    $email = strtolower(trim((string)($b['email'] ?? 'cliente.demo@scootshop.co')));
    $name = trim((string)($b['name'] ?? 'Cliente Demo'));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
      json_out(['ok' => false, 'error' => 'bad_email'], 400);
    }

    $fakeSub = 'dev-local-' . substr(sha1($email), 0, 24);
    $profile = [
      'sub' => $fakeSub,
      'email' => $email,
      'name' => $name !== '' ? $name : 'Cliente Demo',
      'picture' => '',
      'locale' => 'es',
      'email_verified' => 'true',
    ];

    try {
      $pdo = pdo_conn($CFG);
      ensure_schema($pdo);
      $user = customer_upsert_google_user($pdo, $profile);
      customer_attach_session($user);
      customer_link_orders_by_email($pdo, (int)$user['id'], (string)$user['email']);
      json_out([
        'ok' => true,
        'dev' => true,
        'user' => customer_session_payload($user),
      ]);
    } catch (Throwable $e) {
      error_log('auth_dev_login_failed: ' . $e->getMessage());
      $fallbackUser = [
        'id' => 0,
        'email' => $email,
        'name' => $profile['name'],
        'picture' => '',
        'google_sub' => $fakeSub,
        'created_at' => gmdate('c'),
        'updated_at' => gmdate('c'),
      ];
      customer_attach_session($fallbackUser);
      json_out([
        'ok' => true,
        'dev' => true,
        'warning' => 'db_unavailable_session_only',
        'user' => customer_session_payload($fallbackUser),
      ]);
    }
    break;
  }

  case 'auth_google_login': {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    if ($CFG['google_client_id'] === '') {
      json_out(['ok' => false, 'error' => 'google_not_configured'], 503);
    }

    $b = get_json_body();
    $idToken = trim((string)($b['id_token'] ?? ''));
    if ($idToken === '') {
      json_out(['ok' => false, 'error' => 'missing_id_token'], 400);
    }

    try {
      $profile = null;
      $tokenInfo = null;
      try {
        $tokenInfo = google_tokeninfo_request($idToken);
      } catch (Throwable $tokenErr) {
        if (!is_local_request()) {
          throw $tokenErr;
        }
        error_log('google_tokeninfo_fallback_local: ' . $tokenErr->getMessage());
      }

      if (is_array($tokenInfo) && ($tokenInfo['status'] ?? 0) === 200 && is_array($tokenInfo['body'] ?? null)) {
        $profile = $tokenInfo['body'];
      } elseif (is_local_request()) {
        // Local-only fallback: decode payload when tokeninfo endpoint is unreachable.
        $profile = google_decode_id_token_unverified($idToken);
      } else {
        json_out(['ok' => false, 'error' => 'google_token_invalid'], 401);
      }

      $aud = trim((string)($profile['aud'] ?? ''));
      $iss = trim((string)($profile['iss'] ?? ''));
      $emailVerified = filter_var($profile['email_verified'] ?? false, FILTER_VALIDATE_BOOL);
      if ($aud !== $CFG['google_client_id']) {
        json_out(['ok' => false, 'error' => 'google_audience_mismatch'], 401);
      }
      if (!in_array($iss, ['accounts.google.com', 'https://accounts.google.com'], true)) {
        json_out(['ok' => false, 'error' => 'google_issuer_mismatch'], 401);
      }
      if (!$emailVerified) {
        json_out(['ok' => false, 'error' => 'google_email_unverified'], 401);
      }

      $pdo = get_pdo($CFG);
      $user = customer_upsert_google_user($pdo, $profile);
      customer_attach_session($user);
      customer_link_orders_by_email($pdo, (int)$user['id'], (string)$user['email']);

      json_out([
        'ok' => true,
        'user' => customer_session_payload($user),
      ]);
    } catch (Throwable $e) {
      error_log('auth_google_login_failed: ' . $e->getMessage());
      json_out(['ok' => false, 'error' => 'google_login_failed', 'detail' => 'internal_error'], 502);
    }
    break;
  }

  case 'auth_logout': {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    customer_logout();
    json_out(['ok' => true]);
    break;
  }

  case 'account_orders': {
    $user = customer_current_user();
    if (empty($user['id'])) {
      json_out(['ok' => false, 'error' => 'not_logged_in'], 401);
    }

    $pdo = get_pdo($CFG);
    $st = $pdo->prepare("SELECT id, sku, name, status, user_id, ship_name, ship_email, payer_name, payer_email, amount, currency, payment_method, tracking, product_url, product_image_url, product_color, product_color_label, cart_items_json, discount_code, discount_type, discount_value, discount_amount, subtotal_amount, total_amount, payment_fee_amount, shipping_amount, updated_at, created_at FROM orders WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 50");
    $st->execute([':user_id' => (int)$user['id']]);
    $rows = $st->fetchAll();

    $orders = [];
    foreach ($rows as $r) {
      $cartItems = [];
      $cartRaw = trim((string)($r['cart_items_json'] ?? ''));
      if ($cartRaw !== '') {
        $decodedCart = json_decode($cartRaw, true);
        if (is_array($decodedCart)) {
          foreach ($decodedCart as $cartItem) {
            if (!is_array($cartItem)) continue;
            $cartItems[] = $cartItem;
          }
        }
      }

      $itemsCount = 0;
      foreach ($cartItems as $item) {
        $qty = (int)($item['qty'] ?? ($item['quantity'] ?? 1));
        if ($qty <= 0) $qty = 1;
        $itemsCount += $qty;
      }
      if ($itemsCount <= 0) {
        $itemsCount = 1;
      }

      $customerName = trim((string)($r['ship_name'] ?? ''));
      if ($customerName === '') $customerName = trim((string)($r['payer_name'] ?? ''));
      if ($customerName === '') $customerName = trim((string)($user['name'] ?? ''));
      if ($customerName === '') $customerName = '(sin nombre)';

      $email = trim((string)($r['ship_email'] ?? ''));
      if ($email === '') $email = trim((string)($r['payer_email'] ?? ''));
      if ($email === '') $email = trim((string)($user['email'] ?? ''));

      $orders[] = [
        'id' => $r['id'],
        'sku' => $r['sku'] ?? '',
        'product' => $r['name'] ?? '',
        'customer' => $customerName,
        'email' => $email,
        'user_id' => (int)($r['user_id'] ?? 0),
        'status' => $r['status'] ?? '',
        'payment_method' => $r['payment_method'] ?? '',
        'amount' => $r['amount'] ?? '',
        'currency' => $r['currency'] ?? 'EUR',
        'tracking' => $r['tracking'] ?? '',
        'discount_code' => $r['discount_code'] ?? '',
        'discount_type' => $r['discount_type'] ?? '',
        'discount_value' => $r['discount_value'] ?? null,
        'discount_amount' => $r['discount_amount'] ?? null,
        'subtotal_amount' => $r['subtotal_amount'] ?? null,
        'total_amount' => $r['total_amount'] ?? null,
        'payment_fee_amount' => $r['payment_fee_amount'] ?? null,
        'shipping_amount' => $r['shipping_amount'] ?? null,
        'product_url' => $r['product_url'] ?? '',
        'product_image_url' => $r['product_image_url'] ?? '',
        'product_color' => $r['product_color'] ?? '',
        'product_color_label' => $r['product_color_label'] ?? '',
        'items_count' => $itemsCount,
        'cart_items' => $cartItems,
        'updated_at' => $r['updated_at'] ?? '',
        'created_at' => $r['created_at'] ?? '',
      ];
    }

    json_out([
      'ok' => true,
      'user' => customer_session_payload($user),
      'orders' => $orders,
      'total' => count($orders),
    ]);
    break;
  }

  case 'account_order_detail': {
    $user = customer_current_user();
    if (empty($user['id'])) {
      json_out(['ok' => false, 'error' => 'not_logged_in'], 401);
    }

    $orderId = trim((string)($_GET['id'] ?? $_GET['order'] ?? ''));
    if ($orderId === '') {
      json_out(['ok' => false, 'error' => 'missing_id'], 400);
    }

    $pdo = get_pdo($CFG);
    $st = $pdo->prepare("SELECT id, sku, name, status, user_id, ship_name, ship_email, payer_name, payer_email, amount, currency, payment_method, tracking, message, product_url, product_image_url, product_color, product_color_label, cart_items_json, discount_code, discount_type, discount_value, discount_amount, subtotal_amount, total_amount, payment_fee_amount, shipping_amount, updated_at, created_at, ship_phone, ship_address, ship_address2, ship_city, ship_province, ship_postal, ship_country, ship_notes FROM orders WHERE id = :id LIMIT 1");
    $st->execute([':id' => $orderId]);
    $order = $st->fetch();

    if (!$order) {
      json_out(['ok' => false, 'error' => 'not_found'], 404);
    }

    $sessionEmail = strtolower(trim((string)($user['email'] ?? '')));
    $orderEmail = strtolower(trim((string)($order['ship_email'] ?? ($order['payer_email'] ?? ''))));
    $matchesUser = (int)($order['user_id'] ?? 0) === (int)($user['id'] ?? 0);
    $matchesEmail = $sessionEmail !== '' && $orderEmail !== '' && $sessionEmail === $orderEmail;

    if (!$matchesUser && !$matchesEmail) {
      json_out(['ok' => false, 'error' => 'forbidden'], 403);
    }

    $customerName = trim((string)($order['ship_name'] ?? ''));
    if ($customerName === '') $customerName = trim((string)($order['payer_name'] ?? ''));
    if ($customerName === '') $customerName = trim((string)($user['name'] ?? ''));

    $customerEmail = trim((string)($order['ship_email'] ?? ''));
    if ($customerEmail === '') $customerEmail = trim((string)($order['payer_email'] ?? ''));
    if ($customerEmail === '') $customerEmail = trim((string)($user['email'] ?? ''));

    json_out([
      'ok' => true,
      'user' => customer_session_payload($user),
      'order' => [
        'id' => $order['id'],
        'sku' => $order['sku'] ?? '',
        'name' => $order['name'] ?? '',
        'status' => $order['status'] ?? '',
        'user_id' => (int)($order['user_id'] ?? 0),
        'customer_name' => $customerName,
        'customer_email' => $customerEmail,
        'payer_name' => $order['payer_name'] ?? '',
        'payer_email' => $order['payer_email'] ?? '',
        'amount' => $order['amount'] ?? '',
        'currency' => $order['currency'] ?? 'EUR',
        'payment_method' => $order['payment_method'] ?? '',
        'tracking' => $order['tracking'] ?? '',
        'message' => $order['message'] ?? '',
        'discount_code' => $order['discount_code'] ?? '',
        'discount_type' => $order['discount_type'] ?? '',
        'discount_value' => $order['discount_value'] ?? null,
        'discount_amount' => $order['discount_amount'] ?? null,
        'subtotal_amount' => $order['subtotal_amount'] ?? null,
        'total_amount' => $order['total_amount'] ?? null,
        'payment_fee_amount' => $order['payment_fee_amount'] ?? null,
        'shipping_amount' => $order['shipping_amount'] ?? null,
        'product_url' => $order['product_url'] ?? '',
        'product_image_url' => $order['product_image_url'] ?? '',
        'product_color' => $order['product_color'] ?? '',
        'product_color_label' => $order['product_color_label'] ?? '',
        'order_items' => build_order_items_from_order_row($order),
        'shipping' => [
          'name' => $order['ship_name'] ?? '',
          'email' => $order['ship_email'] ?? '',
          'phone' => $order['ship_phone'] ?? '',
          'address' => $order['ship_address'] ?? '',
          'address2' => $order['ship_address2'] ?? '',
          'city' => $order['ship_city'] ?? '',
          'province' => $order['ship_province'] ?? '',
          'postal' => $order['ship_postal'] ?? '',
          'country' => $order['ship_country'] ?? '',
          'notes' => $order['ship_notes'] ?? '',
        ],
        'created_at' => $order['created_at'] ?? '',
        'updated_at' => $order['updated_at'] ?? '',
      ],
    ]);
    break;
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
    break;
  }

  case 'paypal_create_order': {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    try {
      $proxy = proxy_json_request(rtrim((string)$CFG['paypal_proxy_base'], '/') . '/create-order', get_json_body(), 'POST');
      json_out($proxy['body'], $proxy['status']);
    } catch (Throwable $e) {
      error_log('paypal_create_order_failed: ' . $e->getMessage());
      json_out(['ok' => false, 'error' => 'paypal_create_order_failed', 'detail' => 'internal_error'], 502);
    }
    break;
  }

  case 'paypal_capture_order': {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    try {
      $proxy = proxy_json_request(rtrim((string)$CFG['paypal_proxy_base'], '/') . '/capture-order', get_json_body(), 'POST');
      json_out($proxy['body'], $proxy['status']);
    } catch (Throwable $e) {
      error_log('paypal_capture_order_failed: ' . $e->getMessage());
      json_out(['ok' => false, 'error' => 'paypal_capture_order_failed', 'detail' => 'internal_error'], 502);
    }
    break;
  }

  case 'stripe_config': {
    if ($CFG['stripe_publishable_key'] === '') {
      json_out(['ok' => false, 'error' => 'stripe_publishable_not_configured'], 503);
    }

    json_out([
      'ok' => true,
      'publishableKey' => $CFG['stripe_publishable_key'],
    ]);
    break;
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
    $productColor = trim((string)($b['productColor'] ?? ''));
    $productColorLabel = trim((string)($b['productColorLabel'] ?? ''));
    $checkoutPath = trim((string)($b['checkoutPath'] ?? '/pago?method=card'));
    $paymentMethodMode = strtolower(trim((string)($b['paymentMethodMode'] ?? 'dynamic')));
    $paymentUiMode = strtolower(trim((string)($b['paymentUiMode'] ?? 'embedded')));
    $paymentMethod = in_array($paymentMethodMode, ['klarna', 'paypal'], true) ? $paymentMethodMode : 'card';
    $discountCode = strtoupper(trim((string)($b['discount_code'] ?? '')));
    $frontendBaseAmount = trim((string)($b['frontend_base_amount'] ?? $amount));
    $shippingAmount = trim((string)($b['shipping_amount'] ?? '0.00'));
    $cartItems = is_array($b['cart_items'] ?? null) ? $b['cart_items'] : [];
    $orderItems = normalize_order_items_input($cartItems, $CFG['public_base']);
    $orderItemsJson = !empty($orderItems) ? json_encode($orderItems, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;

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
    $shipNotes    = mb_substr(trim((string)($shipping['notes'] ?? '')), 0, 1000);

    if ($sku === '' || $name === '' || $amount === '' || !preg_match('/^\d+(\.\d{2})?$/', $amount)) {
      json_out(['ok' => false, 'error' => 'bad_request'], 400);
    }

    if (!preg_match('/^[a-z]{3}$/', $currency)) {
      json_out(['ok' => false, 'error' => 'bad_currency'], 400);
    }

    $now = date('Y-m-d H:i:s');
    $pdo = get_pdo($CFG);
    $sessionUser = customer_current_user();
    $customerUserId = (int)($sessionUser['id'] ?? 0);
    $customerEmail = strtolower(trim((string)($sessionUser['email'] ?? '')));
    $resolvedPayerEmail = $shipEmail !== '' ? strtolower($shipEmail) : $customerEmail;
    $pricing = resolve_order_pricing([
      'sku' => $sku,
      'payment_method' => $paymentMethod,
      'discount_code' => $discountCode,
      'customer_email' => $shipEmail,
      'frontend_base_amount' => $frontendBaseAmount,
      'shipping_amount' => $shippingAmount,
      'cart_items' => $cartItems,
      'currency' => strtoupper($currency),
    ]);

    if (!$pricing['ok']) {
      json_out(['ok' => false, 'error' => 'pricing_resolution_failed', 'detail' => implode(',', $pricing['errors'])], 400);
    }

    $amount = (string)$pricing['total_amount'];
    $subtotalAmount = (string)$pricing['subtotal_amount'];
    $shippingAmount = (string)$pricing['shipping_amount'];
    $paymentFeeAmount = (string)$pricing['payment_fee_amount'];
    $discountAmount = (string)$pricing['discount_amount'];
    $discountCodeResolved = $pricing['discount_code'];
    $discountIdResolved = $pricing['discount_id'];
    $discountTypeResolved = $pricing['discount_type'];
    $discountValueResolved = $pricing['discount_value'];
    $pricingSource = (string)$pricing['pricing_source'];
    $pricingVersion = (string)$pricing['pricing_version'];

    // Reuse existing pending order if provided (prevents duplicate orders when switching payment methods)
    $existingOrderId = trim((string)($b['existingOrderId'] ?? ''));
    $orderId = '';
    $token = '';
    $reused = false;

    if ($existingOrderId !== '' && preg_match('/^SS-\d{8}-[A-F0-9]{6}$/', $existingOrderId)) {
      $reuseSql = "SELECT id, token FROM orders WHERE id = :id AND status = 'pending_payment'";
      $reuseParams = [':id' => $existingOrderId];
      if ($customerUserId > 0) {
        $reuseSql .= " AND (user_id IS NULL OR user_id = :user_id)";
        $reuseParams[':user_id'] = $customerUserId;
      }
      $reuseSql .= " LIMIT 1";
      $chk = $pdo->prepare($reuseSql);
      $chk->execute($reuseParams);
      $existing = $chk->fetch();
      if ($existing) {
        $orderId = $existing['id'];
        $token = $existing['token'];
        $reused = true;

        // Update the existing order with current data (shipping may have changed, payment method switching)
        $upd = $pdo->prepare("
          UPDATE orders SET sku = :sku, name = :name, amount = :amount, currency = :currency,
            subtotal_amount = :subtotal_amount, shipping_amount = :shipping_amount, payment_fee_amount = :payment_fee_amount,
            discount_code = :discount_code, discount_id = :discount_id, discount_type = :discount_type,
            discount_value = :discount_value, discount_amount = :discount_amount, total_amount = :total_amount,
            pricing_source = :pricing_source, pricing_version = :pricing_version,
            product_url = :product_url, product_image_url = :product_image_url,
            cart_items_json = :cart_items_json,
            product_color = :product_color, product_color_label = :product_color_label,
            payment_method = :payment_method,
            user_id = COALESCE(:user_id, user_id),
            payer_email = COALESCE(NULLIF(:payer_email, ''), payer_email),
            ship_name = :ship_name, ship_email = :ship_email, ship_phone = :ship_phone,
            ship_address = :ship_address, ship_address2 = :ship_address2, ship_city = :ship_city,
            ship_province = :ship_province, ship_postal = :ship_postal, ship_country = :ship_country,
            ship_notes = :ship_notes, updated_at = :updated_at
          WHERE id = :id
        ");
        $upd->execute([
          ':sku' => $sku,
          ':name' => $name,
          ':amount' => $amount,
          ':currency' => strtoupper($currency),
          ':subtotal_amount' => $subtotalAmount,
          ':shipping_amount' => $shippingAmount,
          ':payment_fee_amount' => $paymentFeeAmount,
          ':discount_code' => $discountCodeResolved,
          ':discount_id' => $discountIdResolved,
          ':discount_type' => $discountTypeResolved,
          ':discount_value' => $discountValueResolved,
          ':discount_amount' => $discountAmount,
          ':total_amount' => $amount,
          ':pricing_source' => $pricingSource,
          ':pricing_version' => $pricingVersion,
          ':product_url' => $productUrl !== '' ? absolute_url($CFG['public_base'], $productUrl) : null,
          ':product_image_url' => $productImageUrl !== '' ? absolute_url($CFG['public_base'], $productImageUrl) : null,
          ':cart_items_json' => $orderItemsJson,
          ':product_color' => $productColor !== '' ? $productColor : null,
          ':product_color_label' => $productColorLabel !== '' ? $productColorLabel : null,
          ':payment_method' => $paymentMethod,
          ':user_id' => $customerUserId > 0 ? $customerUserId : null,
          ':payer_email' => $resolvedPayerEmail,
          ':ship_name' => $shipName !== '' ? $shipName : null,
          ':ship_email' => $shipEmail !== '' ? $shipEmail : null,
          ':ship_phone' => $shipPhone !== '' ? $shipPhone : null,
          ':ship_address' => $shipAddress !== '' ? $shipAddress : null,
          ':ship_address2' => $shipAddress2 !== '' ? $shipAddress2 : null,
          ':ship_city' => $shipCity !== '' ? $shipCity : null,
          ':ship_province' => $shipProvince !== '' ? $shipProvince : null,
          ':ship_postal' => $shipPostal !== '' ? $shipPostal : null,
          ':ship_country' => $shipCountry !== '' ? $shipCountry : null,
          ':ship_notes' => $shipNotes !== '' ? $shipNotes : null,
          ':updated_at' => $now,
          ':id' => $orderId,
        ]);
      }
    }

    if (!$reused) {
      $orderId = new_order_id();
      $token = new_token();

      $st = $pdo->prepare("
        INSERT INTO orders (id, token, sku, name, amount, currency, status, payment_method, user_id, payer_email,
          subtotal_amount, shipping_amount, payment_fee_amount,
          discount_code, discount_id, discount_type, discount_value, discount_amount, total_amount, pricing_source, pricing_version,
          product_url, product_image_url, cart_items_json,
          product_color, product_color_label,
          ship_name, ship_email, ship_phone, ship_address, ship_address2, ship_city, ship_province, ship_postal, ship_country, ship_notes,
          created_at, updated_at)
        VALUES (:id, :token, :sku, :name, :amount, :currency, 'pending_payment', :payment_method, :user_id, :payer_email,
          :subtotal_amount, :shipping_amount, :payment_fee_amount,
          :discount_code, :discount_id, :discount_type, :discount_value, :discount_amount, :total_amount, :pricing_source, :pricing_version,
          :product_url, :product_image_url, :cart_items_json,
          :product_color, :product_color_label,
          :ship_name, :ship_email, :ship_phone, :ship_address, :ship_address2, :ship_city, :ship_province, :ship_postal, :ship_country, :ship_notes,
          :created_at, :updated_at)
      ");
      $st->execute([
        ':id' => $orderId,
        ':token' => $token,
        ':sku' => $sku,
        ':name' => $name,
        ':amount' => $amount,
        ':currency' => strtoupper($currency),
        ':payment_method' => $paymentMethod,
        ':user_id' => $customerUserId > 0 ? $customerUserId : null,
        ':payer_email' => $resolvedPayerEmail !== '' ? $resolvedPayerEmail : null,
        ':subtotal_amount' => $subtotalAmount,
        ':shipping_amount' => $shippingAmount,
        ':payment_fee_amount' => $paymentFeeAmount,
        ':discount_code' => $discountCodeResolved,
        ':discount_id' => $discountIdResolved,
        ':discount_type' => $discountTypeResolved,
        ':discount_value' => $discountValueResolved,
        ':discount_amount' => $discountAmount,
        ':total_amount' => $amount,
        ':pricing_source' => $pricingSource,
        ':pricing_version' => $pricingVersion,
        ':product_url' => $productUrl !== '' ? absolute_url($CFG['public_base'], $productUrl) : null,
        ':product_image_url' => $productImageUrl !== '' ? absolute_url($CFG['public_base'], $productImageUrl) : null,
        ':cart_items_json' => $orderItemsJson,
        ':product_color' => $productColor !== '' ? $productColor : null,
        ':product_color_label' => $productColorLabel !== '' ? $productColorLabel : null,
        ':ship_name' => $shipName !== '' ? $shipName : null,
        ':ship_email' => $shipEmail !== '' ? $shipEmail : null,
        ':ship_phone' => $shipPhone !== '' ? $shipPhone : null,
        ':ship_address' => $shipAddress !== '' ? $shipAddress : null,
        ':ship_address2' => $shipAddress2 !== '' ? $shipAddress2 : null,
        ':ship_city' => $shipCity !== '' ? $shipCity : null,
        ':ship_province' => $shipProvince !== '' ? $shipProvince : null,
        ':ship_postal' => $shipPostal !== '' ? $shipPostal : null,
        ':ship_country' => $shipCountry !== '' ? $shipCountry : null,
        ':ship_notes' => $shipNotes !== '' ? $shipNotes : null,
        ':created_at' => $now,
        ':updated_at' => $now,
      ]);
    }

    if ($customerUserId > 0 && $customerEmail !== '') {
      customer_link_orders_by_email($pdo, $customerUserId, $customerEmail);
    }

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
        'client_reference_id' => $orderId,
        'metadata[order_id]' => $orderId,
        'metadata[sku]' => $sku,
        'metadata[ref]' => $ref,
        'metadata[ship_name]' => $shipName,
        'metadata[ship_address]' => implode(', ', array_filter([$shipAddress, $shipAddress2])),
        'metadata[ship_city]' => implode(' ', array_filter([$shipPostal, $shipCity])),
        'metadata[ship_province]' => $shipProvince,
        'metadata[ship_country]' => $shipCountry,
        'metadata[ship_notes]' => $shipNotes,
        'line_items[0][quantity]' => 1,
        'line_items[0][price_data][currency]' => $currency,
        'line_items[0][price_data][unit_amount]' => money_to_cents($amount),
        'line_items[0][price_data][product_data][name]' => $name,
        'payment_intent_data[metadata][order_id]' => $orderId,
        'payment_intent_data[metadata][sku]' => $sku,
      ];

      // Create a Stripe Customer so email, name & phone are pre-filled
      $stripeCustomerId = null;
      if ($shipEmail !== '') {
        $custPayload = [
          'email' => $shipEmail,
        ];
        if ($shipName !== '')  $custPayload['name']  = $shipName;
        if ($shipPhone !== '') $custPayload['phone'] = $shipPhone;

        try {
          $custRes = stripe_api_request($CFG['stripe_secret_key'], '/customers', $custPayload);
          if (($custRes['status'] ?? 0) >= 200 && ($custRes['status'] ?? 0) < 300 && !empty($custRes['body']['id'])) {
            $stripeCustomerId = $custRes['body']['id'];
          }
        } catch (Exception $e) {
          // Non-fatal: fall back to customer_email
        }
      }

      if ($stripeCustomerId) {
        $payload['customer'] = $stripeCustomerId;
        $payload['customer_update[name]'] = 'auto';
      } elseif ($shipEmail !== '') {
        $payload['customer_email'] = $shipEmail;
      }

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
      $pdo->prepare("UPDATE orders SET status = 'error', updated_at = :now WHERE id = :id")->execute([':now' => date('Y-m-d H:i:s'), ':id' => $orderId]);
      error_log('stripe_checkout_failed: ' . $e->getMessage());
      json_out(['ok' => false, 'error' => 'stripe_checkout_failed', 'detail' => 'internal_error'], 502);
    }
    break;
  }

  case 'manual_order_create': {
    // Creates / updates a 'pending_payment' order for non-Stripe methods (bizum, bank transfer)
    // so that admin/pedidos receives the same notification flow as Stripe-paid orders.
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    $b = get_json_body();

    $sku = trim((string)($b['sku'] ?? ''));
    $name = trim((string)($b['name'] ?? ''));
    $amount = trim((string)($b['price'] ?? $b['amount'] ?? ''));
    $currency = strtolower(trim((string)($b['currency'] ?? 'eur')));
    $ref = trim((string)($b['ref'] ?? ''));
    $productUrl = trim((string)($b['productUrl'] ?? ''));
    $productImageUrl = trim((string)($b['productImageUrl'] ?? ''));
    $productColor = trim((string)($b['productColor'] ?? ''));
    $productColorLabel = trim((string)($b['productColorLabel'] ?? ''));
    $paymentMethod = strtolower(trim((string)($b['paymentMethod'] ?? '')));
    $discountCode = strtoupper(trim((string)($b['discount_code'] ?? '')));
    $frontendBaseAmount = trim((string)($b['frontend_base_amount'] ?? $amount));
    $shippingAmount = trim((string)($b['shipping_amount'] ?? '0.00'));
    $cartItems = is_array($b['cart_items'] ?? null) ? $b['cart_items'] : [];
    $orderItems = normalize_order_items_input($cartItems, $CFG['public_base']);
    $orderItemsJson = !empty($orderItems) ? json_encode($orderItems, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;

    if (!in_array($paymentMethod, ['bizum', 'bank', 'transfer'], true)) {
      json_out(['ok' => false, 'error' => 'bad_payment_method'], 400);
    }
    // Normalize alias
    if ($paymentMethod === 'transfer') $paymentMethod = 'bank';

    // Shipping data
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
    $shipNotes    = mb_substr(trim((string)($shipping['notes'] ?? '')), 0, 1000);

    if ($sku === '' || $name === '' || $amount === '' || !preg_match('/^\d+(\.\d{2})?$/', $amount)) {
      json_out(['ok' => false, 'error' => 'bad_request'], 400);
    }
    if (!preg_match('/^[a-z]{3}$/', $currency)) {
      json_out(['ok' => false, 'error' => 'bad_currency'], 400);
    }

    $now = date('Y-m-d H:i:s');
    $pdo = get_pdo($CFG);
    $sessionUser = customer_current_user();
    $customerUserId = (int)($sessionUser['id'] ?? 0);
    $customerEmail = strtolower(trim((string)($sessionUser['email'] ?? '')));
    $resolvedPayerEmail = $shipEmail !== '' ? strtolower($shipEmail) : $customerEmail;
    $pricing = resolve_order_pricing([
      'sku' => $sku,
      'payment_method' => $paymentMethod,
      'discount_code' => $discountCode,
      'customer_email' => $shipEmail,
      'frontend_base_amount' => $frontendBaseAmount,
      'shipping_amount' => $shippingAmount,
      'cart_items' => $cartItems,
      'currency' => strtoupper($currency),
    ]);

    if (!$pricing['ok']) {
      json_out(['ok' => false, 'error' => 'pricing_resolution_failed', 'detail' => implode(',', $pricing['errors'])], 400);
    }

    $amount = (string)$pricing['total_amount'];
    $subtotalAmount = (string)$pricing['subtotal_amount'];
    $shippingAmount = (string)$pricing['shipping_amount'];
    $paymentFeeAmount = (string)$pricing['payment_fee_amount'];
    $discountAmount = (string)$pricing['discount_amount'];
    $discountCodeResolved = $pricing['discount_code'];
    $discountIdResolved = $pricing['discount_id'];
    $discountTypeResolved = $pricing['discount_type'];
    $discountValueResolved = $pricing['discount_value'];
    $pricingSource = (string)$pricing['pricing_source'];
    $pricingVersion = (string)$pricing['pricing_version'];

    // Reuse an existing pending order if provided (avoids duplicates when toggling tabs)
    $existingOrderId = trim((string)($b['existingOrderId'] ?? ''));
    $orderId = '';
    $token = '';
    $reused = false;

    if ($existingOrderId !== '' && preg_match('/^SS-\d{8}-[A-F0-9]{6}$/', $existingOrderId)) {
      $reuseSql = "SELECT id, token FROM orders WHERE id = :id AND status = 'pending_payment'";
      $reuseParams = [':id' => $existingOrderId];
      if ($customerUserId > 0) {
        $reuseSql .= " AND (user_id IS NULL OR user_id = :user_id)";
        $reuseParams[':user_id'] = $customerUserId;
      }
      $reuseSql .= " LIMIT 1";
      $chk = $pdo->prepare($reuseSql);
      $chk->execute($reuseParams);
      $existing = $chk->fetch();
      if ($existing) {
        $orderId = $existing['id'];
        $token = $existing['token'];
        $reused = true;

        $upd = $pdo->prepare("
          UPDATE orders SET sku = :sku, name = :name, amount = :amount, currency = :currency,
            subtotal_amount = :subtotal_amount, shipping_amount = :shipping_amount, payment_fee_amount = :payment_fee_amount,
            discount_code = :discount_code, discount_id = :discount_id, discount_type = :discount_type,
            discount_value = :discount_value, discount_amount = :discount_amount, total_amount = :total_amount,
            pricing_source = :pricing_source, pricing_version = :pricing_version,
            product_url = :product_url, product_image_url = :product_image_url,
            cart_items_json = :cart_items_json,
            product_color = :product_color, product_color_label = :product_color_label,
            payment_method = :payment_method,
            user_id = COALESCE(:user_id, user_id),
            payer_email = COALESCE(NULLIF(:payer_email, ''), payer_email),
            ship_name = :ship_name, ship_email = :ship_email, ship_phone = :ship_phone,
            ship_address = :ship_address, ship_address2 = :ship_address2, ship_city = :ship_city,
            ship_province = :ship_province, ship_postal = :ship_postal, ship_country = :ship_country,
            ship_notes = :ship_notes, updated_at = :updated_at
          WHERE id = :id
        ");
        $upd->execute([
          ':sku' => $sku,
          ':name' => $name,
          ':amount' => $amount,
          ':currency' => strtoupper($currency),
          ':subtotal_amount' => $subtotalAmount,
          ':shipping_amount' => $shippingAmount,
          ':payment_fee_amount' => $paymentFeeAmount,
          ':discount_code' => $discountCodeResolved,
          ':discount_id' => $discountIdResolved,
          ':discount_type' => $discountTypeResolved,
          ':discount_value' => $discountValueResolved,
          ':discount_amount' => $discountAmount,
          ':total_amount' => $amount,
          ':pricing_source' => $pricingSource,
          ':pricing_version' => $pricingVersion,
          ':product_url' => $productUrl !== '' ? absolute_url($CFG['public_base'], $productUrl) : null,
          ':product_image_url' => $productImageUrl !== '' ? absolute_url($CFG['public_base'], $productImageUrl) : null,
          ':cart_items_json' => $orderItemsJson,
          ':product_color' => $productColor !== '' ? $productColor : null,
          ':product_color_label' => $productColorLabel !== '' ? $productColorLabel : null,
          ':payment_method' => $paymentMethod,
          ':user_id' => $customerUserId > 0 ? $customerUserId : null,
          ':payer_email' => $resolvedPayerEmail,
          ':ship_name' => $shipName !== '' ? $shipName : null,
          ':ship_email' => $shipEmail !== '' ? $shipEmail : null,
          ':ship_phone' => $shipPhone !== '' ? $shipPhone : null,
          ':ship_address' => $shipAddress !== '' ? $shipAddress : null,
          ':ship_address2' => $shipAddress2 !== '' ? $shipAddress2 : null,
          ':ship_city' => $shipCity !== '' ? $shipCity : null,
          ':ship_province' => $shipProvince !== '' ? $shipProvince : null,
          ':ship_postal' => $shipPostal !== '' ? $shipPostal : null,
          ':ship_country' => $shipCountry !== '' ? $shipCountry : null,
          ':ship_notes' => $shipNotes !== '' ? $shipNotes : null,
          ':updated_at' => $now,
          ':id' => $orderId,
        ]);
      }
    }

    if (!$reused) {
      $orderId = new_order_id();
      $token = new_token();

      $st = $pdo->prepare("
        INSERT INTO orders (id, token, sku, name, amount, currency, status, payment_method, user_id, payer_email,
          subtotal_amount, shipping_amount, payment_fee_amount,
          discount_code, discount_id, discount_type, discount_value, discount_amount, total_amount, pricing_source, pricing_version,
          product_url, product_image_url, product_color, product_color_label, cart_items_json,
          ship_name, ship_email, ship_phone, ship_address, ship_address2, ship_city, ship_province, ship_postal, ship_country, ship_notes,
          created_at, updated_at)
        VALUES (:id, :token, :sku, :name, :amount, :currency, 'pending_payment', :payment_method, :user_id, :payer_email,
          :subtotal_amount, :shipping_amount, :payment_fee_amount,
          :discount_code, :discount_id, :discount_type, :discount_value, :discount_amount, :total_amount, :pricing_source, :pricing_version,
          :product_url, :product_image_url, :product_color, :product_color_label, :cart_items_json,
          :ship_name, :ship_email, :ship_phone, :ship_address, :ship_address2, :ship_city, :ship_province, :ship_postal, :ship_country, :ship_notes,
          :created_at, :updated_at)
      ");
      $st->execute([
        ':id' => $orderId,
        ':token' => $token,
        ':sku' => $sku,
        ':name' => $name,
        ':amount' => $amount,
        ':currency' => strtoupper($currency),
        ':payment_method' => $paymentMethod,
        ':user_id' => $customerUserId > 0 ? $customerUserId : null,
        ':payer_email' => $resolvedPayerEmail !== '' ? $resolvedPayerEmail : null,
        ':subtotal_amount' => $subtotalAmount,
        ':shipping_amount' => $shippingAmount,
        ':payment_fee_amount' => $paymentFeeAmount,
        ':discount_code' => $discountCodeResolved,
        ':discount_id' => $discountIdResolved,
        ':discount_type' => $discountTypeResolved,
        ':discount_value' => $discountValueResolved,
        ':discount_amount' => $discountAmount,
        ':total_amount' => $amount,
        ':pricing_source' => $pricingSource,
        ':pricing_version' => $pricingVersion,
        ':product_url' => $productUrl !== '' ? absolute_url($CFG['public_base'], $productUrl) : null,
        ':product_image_url' => $productImageUrl !== '' ? absolute_url($CFG['public_base'], $productImageUrl) : null,
        ':cart_items_json' => $orderItemsJson,
        ':product_color' => $productColor !== '' ? $productColor : null,
        ':product_color_label' => $productColorLabel !== '' ? $productColorLabel : null,
        ':ship_name' => $shipName !== '' ? $shipName : null,
        ':ship_email' => $shipEmail !== '' ? $shipEmail : null,
        ':ship_phone' => $shipPhone !== '' ? $shipPhone : null,
        ':ship_address' => $shipAddress !== '' ? $shipAddress : null,
        ':ship_address2' => $shipAddress2 !== '' ? $shipAddress2 : null,
        ':ship_city' => $shipCity !== '' ? $shipCity : null,
        ':ship_province' => $shipProvince !== '' ? $shipProvince : null,
        ':ship_postal' => $shipPostal !== '' ? $shipPostal : null,
        ':ship_country' => $shipCountry !== '' ? $shipCountry : null,
        ':ship_notes' => $shipNotes !== '' ? $shipNotes : null,
        ':created_at' => $now,
        ':updated_at' => $now,
      ]);
    }

    if ($customerUserId > 0 && $customerEmail !== '') {
      customer_link_orders_by_email($pdo, $customerUserId, $customerEmail);
    }

    json_out([
      'ok' => true,
      'orderId' => $orderId,
      'token' => $token,
      'reused' => $reused,
      'paymentMethod' => $paymentMethod,
      'status' => 'pending_payment',
    ]);
    break;
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
      error_log('stripe_session_status_failed: ' . $e->getMessage());
      json_out(['ok' => false, 'error' => 'stripe_session_status_failed', 'detail' => 'internal_error'], 502);
    }
    break;
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
      text_out('WEBHOOK_ERROR', 500);
    }
    break;
  }

  case 'orders_resume_payment': {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    $user = customer_current_user();
    if (empty($user['id'])) {
      json_out(['ok' => false, 'error' => 'not_logged_in'], 401);
    }

    $b = get_json_body();
    $orderId = trim((string)($b['orderId'] ?? $_GET['order'] ?? ''));
    if ($orderId === '') {
      json_out(['ok' => false, 'error' => 'missing_id'], 400);
    }

    $pdo = get_pdo($CFG);
    $st = $pdo->prepare("SELECT id, sku, name, status, user_id, ship_name, ship_email, payer_email, amount, currency, payment_method, product_url, product_image_url, product_color, product_color_label, cart_items_json, discount_code, subtotal_amount, total_amount, shipping_amount, ship_phone, ship_address, ship_address2, ship_city, ship_province, ship_postal, ship_country, ship_notes FROM orders WHERE id = :id LIMIT 1");
    $st->execute([':id' => $orderId]);
    $order = $st->fetch();

    if (!$order) {
      json_out(['ok' => false, 'error' => 'not_found'], 404);
    }

    $sessionEmail = strtolower(trim((string)($user['email'] ?? '')));
    $orderEmail = strtolower(trim((string)($order['ship_email'] ?? ($order['payer_email'] ?? ''))));
    $matchesUser = (int)($order['user_id'] ?? 0) === (int)($user['id'] ?? 0);
    $matchesEmail = $sessionEmail !== '' && $orderEmail !== '' && $sessionEmail === $orderEmail;
    if (!$matchesUser && !$matchesEmail) {
      json_out(['ok' => false, 'error' => 'forbidden'], 403);
    }

    if ((string)($order['status'] ?? '') !== 'pending_payment') {
      json_out(['ok' => false, 'error' => 'not_pending_payment', 'status' => (string)($order['status'] ?? '')], 409);
    }

    $orderItems = build_order_items_from_order_row($order);
    $primaryItem = !empty($orderItems) ? $orderItems[0] : [];
    $orderName = trim((string)($order['name'] ?? ''));
    if ($orderName === '' && !empty($orderItems)) {
      $orderName = order_items_display_name($orderItems, 'Producto SCOOT SHOP');
    }

    $paymentAmount = trim((string)($order['total_amount'] ?? ''));
    if ($paymentAmount === '') {
      $paymentAmount = trim((string)($order['amount'] ?? ''));
    }

    $query = [
      'resume' => '1',
      'checkout' => '1',
      'order' => (string)$order['id'],
      'sku' => trim((string)($order['sku'] ?? ($primaryItem['sku'] ?? ''))),
      'name' => $orderName,
      'price' => $paymentAmount,
      'currency' => strtoupper(trim((string)($order['currency'] ?? 'EUR'))),
      'url' => trim((string)($order['product_url'] ?? ($primaryItem['url'] ?? ''))),
      'image' => trim((string)($order['product_image_url'] ?? ($primaryItem['image'] ?? ''))),
      'color' => trim((string)($order['product_color'] ?? ($primaryItem['color'] ?? ''))),
      'colorLabel' => trim((string)($order['product_color_label'] ?? ($primaryItem['color_label'] ?? ''))),
      'discount' => trim((string)($order['discount_code'] ?? '')),
    ];

    if (!empty($orderItems)) {
      $query['cart'] = '1';
    }

    $methodForUrl = strtolower(trim((string)($order['payment_method'] ?? 'card')));
    if ($methodForUrl === 'transfer') {
      $methodForUrl = 'bank';
    }
    if (!in_array($methodForUrl, ['card', 'klarna', 'paypal', 'bizum', 'bank'], true)) {
      $methodForUrl = 'card';
    }
    $query['method'] = $methodForUrl;
    $query['existingOrderId'] = (string)$order['id'];

    $paymentUrl = '/pago?' . http_build_query(array_filter($query, static function ($v) {
      return $v !== null && $v !== '';
    }));

    json_out([
      'ok' => true,
      'orderId' => (string)$order['id'],
      'status' => 'pending_payment',
      'paymentMethod' => $methodForUrl,
      'paymentUrl' => $paymentUrl,
      'pricing' => [
        'subtotal_amount' => (string)($order['subtotal_amount'] ?? ''),
        'shipping_amount' => (string)($order['shipping_amount'] ?? ''),
        'total_amount' => (string)($order['total_amount'] ?? ($order['amount'] ?? '')),
      ],
      'shipping' => [
        'fullName' => (string)($order['ship_name'] ?? ''),
        'email' => (string)($order['ship_email'] ?? ''),
        'phone' => (string)($order['ship_phone'] ?? ''),
        'addressLine1' => (string)($order['ship_address'] ?? ''),
        'addressLine2' => (string)($order['ship_address2'] ?? ''),
        'city' => (string)($order['ship_city'] ?? ''),
        'province' => (string)($order['ship_province'] ?? ''),
        'postalCode' => (string)($order['ship_postal'] ?? ''),
        'country' => (string)($order['ship_country'] ?? 'Spain'),
        'notes' => (string)($order['ship_notes'] ?? ''),
      ],
      'cartItems' => $orderItems,
    ]);
    break;
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
    $sessionUser = customer_current_user();
    $customerUserId = (int)($sessionUser['id'] ?? 0);
    $customerEmail = strtolower(trim((string)($sessionUser['email'] ?? '')));
    $pdo = get_pdo($CFG);

    $st = $pdo->prepare("\n      INSERT INTO orders (id, token, sku, name, amount, currency, status, user_id, payer_email, created_at, updated_at)\n      VALUES (:id, :token, :sku, :name, :amount, :currency, 'pending_payment', :user_id, :payer_email, :created_at, :updated_at)\n    ");
    $st->execute([
      ':id' => $orderId,
      ':token' => $token,
      ':sku' => $sku,
      ':name' => $name,
      ':amount' => $amount,
      ':currency' => $currency,
      ':user_id' => $customerUserId > 0 ? $customerUserId : null,
      ':payer_email' => $customerEmail !== '' ? $customerEmail : null,
      ':created_at' => $now,
      ':updated_at' => $now,
    ]);

    if ($customerUserId > 0 && $customerEmail !== '') {
      customer_link_orders_by_email($pdo, $customerUserId, $customerEmail);
    }

    json_out(['ok'=>true, 'orderId'=>$orderId, 'token'=>$token]);
    break;
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
        'notes'=>$o['ship_notes'] ?? '',
      ],
    ]);
    break;
  }

  case 'admin_status': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $id = trim((string)($_GET['id'] ?? ''));
    if ($id === '') {
      $b_pre = get_json_body();
      $id = trim((string)($b_pre['id'] ?? ''));
    }
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
    $newAmount = isset($b['amount']) && $b['amount'] !== null ? trim((string)$b['amount']) : null;
    $newProductName = isset($b['product_name']) && $b['product_name'] !== null ? trim((string)$b['product_name']) : null;
    $newImageUrl = isset($b['product_image_url']) && $b['product_image_url'] !== null ? trim((string)$b['product_image_url']) : null;

    $allowed = ['pending_payment','paid','preparing','shipped','delivered','canceled','refunded','dispute','payment_failed','error'];
    if (!in_array($status, $allowed, true)) json_out(['ok'=>false,'error'=>'bad_status'], 400);

    if ($newAmount !== null && !preg_match('/^\d+(\.\d{1,2})?$/', $newAmount)) {
      json_out(['ok'=>false,'error'=>'bad_amount'], 400);
    }

    if ($newProductName !== null && $newProductName !== '' && mb_strlen($newProductName) > 255) {
      json_out(['ok'=>false,'error'=>'bad_product_name'], 400);
    }

    if ($newImageUrl !== null && $newImageUrl !== '' && !preg_match('~^https?://~i', $newImageUrl)) {
      json_out(['ok'=>false,'error'=>'bad_image_url'], 400);
    }

    $now = date('Y-m-d H:i:s');
    $sql = "UPDATE orders SET status=:status, tracking=:tracking, message=:message, updated_at=:updated_at";
    $params = [
      ':status'=>$status,
      ':tracking'=>$tracking,
      ':message'=>$message,
      ':updated_at'=>$now,
      ':id'=>$id
    ];

    if ($newAmount !== null) {
      $sql .= ", amount=:amount";
      $params[':amount'] = $newAmount;
    }
    if ($newProductName !== null && $newProductName !== '') {
      $sql .= ", name=:name";
      $params[':name'] = $newProductName;
    }
    if ($newImageUrl !== null) {
      $sql .= ", product_image_url=:product_image_url";
      $params[':product_image_url'] = $newImageUrl;
    }

    $sql .= " WHERE id=:id";
    $st = $pdo->prepare($sql);
    $st->execute($params);

    // --- Audit log ---
    $changes = [];
    if ($previousStatus !== $status) $changes[] = ['status', $previousStatus, $status];
    $prevTracking = trim((string)($order['tracking'] ?? ''));
    if ($tracking !== null && $prevTracking !== trim((string)$tracking)) $changes[] = ['tracking', $prevTracking, trim((string)$tracking)];
    $prevMessage = trim((string)($order['message'] ?? ''));
    if ($message !== null && $prevMessage !== trim((string)$message)) $changes[] = ['message', $prevMessage, trim((string)$message)];
    $prevAmount = trim((string)($order['amount'] ?? ''));
    if ($newAmount !== null && $prevAmount !== $newAmount) $changes[] = ['amount', $prevAmount, $newAmount];
    $prevName = trim((string)($order['name'] ?? ''));
    if ($newProductName !== null && $newProductName !== '' && $prevName !== $newProductName) $changes[] = ['name', $prevName, $newProductName];
    $prevImage = trim((string)($order['product_image_url'] ?? ''));
    if ($newImageUrl !== null && $prevImage !== $newImageUrl) $changes[] = ['product_image_url', $prevImage, $newImageUrl];

    // --- Audit log: always log field changes ---
    if ($changes) {
      $histSt = $pdo->prepare("INSERT INTO order_history (order_id, field_name, old_value, new_value, changed_by, created_at) VALUES (:oid, :field, :oldv, :newv, 'admin', :ts)");
      foreach ($changes as $c) {
        $histSt->execute([':oid' => $id, ':field' => $c[0], ':oldv' => $c[1], ':newv' => $c[2], ':ts' => $now]);
      }
    }

    $statusChanged = $previousStatus !== $status;
    $forceEmail = !empty($b['force_email']);
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
      'reason' => ($statusChanged || $forceEmail) ? 'not_attempted' : 'status_unchanged',
    ];

    if ($statusChanged || $forceEmail) {
      if ($customerEmail === '') {
        $emailNotification['reason'] = 'missing_customer_email';
      } else {
        $triggerSource = $forceEmail ? 'admin_manual_resend' : 'admin_status_change';
        $eventType = order_status_event($status);
        $recentManual = null;

        if ($forceEmail) {
          $recentManual = find_recent_manual_email_event($pdo, $id, $customerEmail, $eventType, $triggerSource, 20);
        }

        if ($recentManual !== null) {
          $emailNotification['attempted'] = false;
          $emailNotification['sent'] = false;
          $emailNotification['reason'] = 'duplicate_recent_manual';
          $emailNotification['duplicateBlocked'] = true;
          $emailNotification['lastSimilarEmailAt'] = (string)($recentManual['created_at'] ?? '');
          $emailNotification['lastSimilarEmailStatus'] = (string)($recentManual['delivery_status'] ?? '');
        } else {
          $emailNotification['attempted'] = true;
          $emailNotification['sent'] = send_order_status_email($CFG, $customerEmail, $id, $status, [
            'customerName' => $customerName,
            'payerName' => trim((string)($order['payer_name'] ?? '')),
            'tracking' => trim((string)($tracking ?? '')),
            'message' => trim((string)($message ?? '')),
            'productName' => ($newProductName !== null && $newProductName !== '') ? $newProductName : trim((string)($order['name'] ?? '')),
            'sku' => trim((string)($order['sku'] ?? '')),
            'orderUrl' => trim((string)($order['product_url'] ?? '')),
            'productImageUrl' => ($newImageUrl !== null && $newImageUrl !== '') ? $newImageUrl : trim((string)($order['product_image_url'] ?? '')),
            'orderItems' => build_order_items_from_order_row($order),
            'source' => 'admin',
            'triggerSource' => $triggerSource,
            'manualResend' => $forceEmail,
            'previousStatus' => $previousStatus,
          ]);
          $emailNotification['reason'] = $emailNotification['sent'] ? 'sent' : 'send_failed';

          // Log email sent/resend in history
          if ($emailNotification['sent']) {
            $emailAction = $forceEmail ? 'email_resend' : 'email_sent';
            $histEmail = $pdo->prepare("INSERT INTO order_history (order_id, field_name, old_value, new_value, changed_by, created_at) VALUES (:oid, :field, :status, :email, 'admin', :ts)");
            $histEmail->execute([':oid' => $id, ':field' => $emailAction, ':status' => $status, ':email' => $customerEmail, ':ts' => $now]);
          }
        }
      }
    }

    json_out([
      'ok' => true,
      'statusChanged' => $statusChanged,
      'previousStatus' => $previousStatus,
      'status' => $status,
      'emailNotification' => $emailNotification,
    ]);
    break;
  }

  case 'admin_dashboard': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $pdo = get_pdo($CFG);

    // Revenue totals + average ticket
    $rev = $pdo->query("
      SELECT
        COALESCE(SUM(CASE WHEN status IN ('paid','preparing','shipped','delivered') THEN amount ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN status IN ('paid','preparing','shipped','delivered') AND DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) AS today_revenue,
        SUM(CASE WHEN status IN ('paid','preparing','shipped','delivered') THEN 1 ELSE 0 END) AS paid_orders,
        COALESCE(
          SUM(CASE WHEN status IN ('paid','preparing','shipped','delivered') THEN amount ELSE 0 END)
          / NULLIF(SUM(CASE WHEN status IN ('paid','preparing','shipped','delivered') THEN 1 ELSE 0 END), 0),
          0
        ) AS avg_ticket,
        COUNT(*) AS total_orders
      FROM orders
    ")->fetch();

    // Orders by status
    $stSt = $pdo->query("SELECT status, COUNT(*) AS cnt FROM orders GROUP BY status");
    $byStatus = [];
    while ($row = $stSt->fetch()) {
      $byStatus[$row['status']] = (int)$row['cnt'];
    }

    // Today / this week counts
    $todayCnt = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()")->fetchColumn();
    $weekCnt = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)")->fetchColumn();

    // Revenue this week
    $weekRev = (float)$pdo->query("SELECT COALESCE(SUM(amount), 0) FROM orders WHERE status IN ('paid','preparing','shipped','delivered') AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)")->fetchColumn();

    // Paid orders without tracking
    $paidNoTrack = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'paid' AND (tracking IS NULL OR tracking = '')")->fetchColumn();

    // Top products sold (last 30 days)
    $topProducts = [];
    $tpSt = $pdo->query("
      SELECT
        COALESCE(NULLIF(TRIM(sku), ''), '(sin sku)') AS sku,
        COALESCE(NULLIF(TRIM(name), ''), '(sin nombre)') AS product,
        COUNT(*) AS units,
        COALESCE(SUM(amount), 0) AS revenue
      FROM orders
      WHERE status IN ('paid','preparing','shipped','delivered')
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY sku, name
      ORDER BY units DESC, revenue DESC
      LIMIT 5
    ");
    while ($tp = $tpSt->fetch()) {
      $topProducts[] = [
        'sku' => $tp['sku'] ?? '',
        'product' => $tp['product'] ?? '',
        'units' => (int)($tp['units'] ?? 0),
        'revenue' => (float)($tp['revenue'] ?? 0),
      ];
    }

    // 7-day evolution (orders + revenue)
    $seriesMap = [];
    $srSt = $pdo->query("
      SELECT
        DATE(created_at) AS d,
        COUNT(*) AS orders_count,
        COALESCE(SUM(CASE WHEN status IN ('paid','preparing','shipped','delivered') THEN amount ELSE 0 END), 0) AS revenue
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY d ASC
    ");
    while ($sr = $srSt->fetch()) {
      $seriesMap[(string)$sr['d']] = [
        'orders' => (int)($sr['orders_count'] ?? 0),
        'revenue' => (float)($sr['revenue'] ?? 0),
      ];
    }
    $dailySeries = [];
    for ($i = 6; $i >= 0; $i--) {
      $d = date('Y-m-d', strtotime('-' . $i . ' day'));
      $entry = $seriesMap[$d] ?? ['orders' => 0, 'revenue' => 0.0];
      $dailySeries[] = [
        'date' => $d,
        'orders' => (int)$entry['orders'],
        'revenue' => (float)$entry['revenue'],
      ];
    }

    // Latest orders snapshot for dashboard cards
    $latestOrders = [];
    $latestSt = $pdo->query("SELECT id, status, amount, created_at, ship_name, payer_name FROM orders ORDER BY created_at DESC LIMIT 6");
    while ($lr = $latestSt->fetch()) {
      $customerName = trim((string)($lr['ship_name'] ?? ''));
      if ($customerName === '') $customerName = trim((string)($lr['payer_name'] ?? ''));
      if ($customerName === '') $customerName = '(sin nombre)';

      $latestOrders[] = [
        'id' => $lr['id'] ?? '',
        'status' => $lr['status'] ?? '',
        'amount' => $lr['amount'] ?? 0,
        'customer' => $customerName,
        'created_at' => $lr['created_at'] ?? '',
      ];
    }

    // Recent admin activity from existing order history
    $recentActivity = [];
    $actSt = $pdo->query("
      SELECT
        oh.order_id,
        oh.field_name,
        oh.old_value,
        oh.new_value,
        oh.changed_by,
        oh.created_at,
        o.status AS order_status
      FROM order_history oh
      LEFT JOIN orders o ON o.id = oh.order_id
      ORDER BY oh.created_at DESC
      LIMIT 8
    ");
    while ($a = $actSt->fetch()) {
      $fieldName = trim((string)($a['field_name'] ?? ''));
      $orderId = trim((string)($a['order_id'] ?? ''));
      $oldValue = trim((string)($a['old_value'] ?? ''));
      $newValueRaw = trim((string)($a['new_value'] ?? ''));

      $result = 'ok';
      $critical = false;
      $newValue = $newValueRaw;
      if (preg_match('/^\[result=([^;\]]+);critical=([01])\]\s*(.*)$/', $newValueRaw, $metaMatch)) {
        $result = trim((string)($metaMatch[1] ?? 'ok')) ?: 'ok';
        $critical = ((string)($metaMatch[2] ?? '0')) === '1';
        $newValue = trim((string)($metaMatch[3] ?? ''));
      }

      if (!$critical) {
        $critical = in_array($fieldName, ['status', 'email_resend', 'admin_cache_bust', 'admin_order_delete', 'admin_orders_bulk_delete', 'admin_product_stock', 'admin_product_price', 'admin_product_delete'], true);
      }

      $eventType = 'order';
      $targetId = $orderId;
      if (str_starts_with($orderId, 'PRODUCT:')) {
        $eventType = 'product';
        $targetId = trim(substr($orderId, strlen('PRODUCT:')));
      } elseif ($orderId === 'SYSTEM') {
        $eventType = 'system';
        $targetId = 'SYSTEM';
      }

      $actionLabel = match ($fieldName) {
        'status' => 'Cambio de estado',
        'tracking' => 'Actualización de tracking',
        'message' => 'Actualización de nota',
        'email_sent' => 'Email enviado',
        'email_resend' => 'Reenvío de email',
        'admin_cache_bust' => 'Purga de caché',
        'admin_order_delete' => 'Borrado de pedido',
        'admin_orders_bulk_delete' => 'Borrado masivo',
        'admin_product_stock' => 'Stock de producto',
        'admin_product_price' => 'Precio de producto',
        'admin_product_delete' => 'Borrado de producto',
        default => $fieldName !== '' ? $fieldName : 'Actividad administrativa',
      };

      $summary = $actionLabel;
      if ($oldValue !== '' || $newValue !== '') {
        $summary .= ' · ' . ($oldValue !== '' ? $oldValue : '(vacío)') . ' → ' . ($newValue !== '' ? $newValue : '(vacío)');
      }

      $recentActivity[] = [
        'order_id' => $orderId,
        'field_name' => $fieldName,
        'old_value' => $oldValue,
        'new_value' => $newValue,
        'changed_by' => $a['changed_by'] ?? 'admin',
        'created_at' => $a['created_at'] ?? '',
        'order_status' => $a['order_status'] ?? '',
        'eventType' => $eventType,
        'targetId' => $targetId,
        'actionLabel' => $actionLabel,
        'result' => $result,
        'critical' => $critical,
        'summary' => $summary,
      ];
    }

    $pendingOrders = (int)(($byStatus['pending_payment'] ?? 0) + ($byStatus['payment_failed'] ?? 0) + ($byStatus['dispute'] ?? 0));
    $paidOrders = (int)($rev['paid_orders'] ?? 0);
    $canceledOrders = (int)(($byStatus['canceled'] ?? 0) + ($byStatus['refunded'] ?? 0));
    $reservations = (int)($byStatus['reserved'] ?? 0);

    json_out([
      'ok' => true,
      'totalRevenue' => (float)$rev['total_revenue'],
      'todayRevenue' => (float)$rev['today_revenue'],
      'weekRevenue' => $weekRev,
      'totalOrders' => (int)$rev['total_orders'],
      'paidOrders' => $paidOrders,
      'pendingOrders' => $pendingOrders,
      'canceledOrders' => $canceledOrders,
      'avgTicket' => (float)($rev['avg_ticket'] ?? 0),
      'reservations' => $reservations,
      'todayOrders' => $todayCnt,
      'weekOrders' => $weekCnt,
      'byStatus' => $byStatus,
      'paidWithoutTracking' => $paidNoTrack,
      'latestOrders' => $latestOrders,
      'topProducts' => $topProducts,
      'dailySeries' => $dailySeries,
      'recentActivity' => $recentActivity,
    ]);
    break;
  }

  case 'admin_customers_list': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $pdo = get_pdo($CFG);
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(100, max(10, (int)($_GET['per_page'] ?? 25)));
    $offset = ($page - 1) * $perPage;
    $search = trim((string)($_GET['q'] ?? ''));

    $where = [];
    $params = [];
    if ($search !== '') {
      $where[] = '(u.name LIKE :q OR u.email LIKE :q OR EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND (o.ship_name LIKE :q OR o.ship_email LIKE :q OR o.payer_name LIKE :q OR o.payer_email LIKE :q OR o.ship_phone LIKE :q OR o.id LIKE :q OR o.tracking LIKE :q)))';
      $params[':q'] = '%' . $search . '%';
    }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countSt = $pdo->prepare("SELECT COUNT(*) FROM users u {$whereSql}");
    $countSt->execute($params);
    $total = (int)$countSt->fetchColumn();

    $st = $pdo->prepare("\n      SELECT\n        u.id, u.google_sub, u.email, u.name, u.picture, u.locale, u.last_login_at, u.created_at, u.updated_at,\n        COUNT(o.id) AS orders_count,\n        COALESCE(SUM(CASE WHEN o.status IN ('paid','preparing','shipped','delivered') THEN COALESCE(o.total_amount, o.amount, 0) ELSE 0 END), 0) AS total_spent,\n        SUM(CASE WHEN o.status = 'pending_payment' THEN 1 ELSE 0 END) AS pending_orders,\n        SUM(CASE WHEN o.status IN ('paid','preparing','shipped','delivered') THEN 1 ELSE 0 END) AS active_orders,\n        MAX(o.created_at) AS last_order_at,\n        MAX(o.updated_at) AS last_order_updated_at\n      FROM users u\n      LEFT JOIN orders o ON o.user_id = u.id\n      {$whereSql}\n      GROUP BY u.id\n      ORDER BY COALESCE(MAX(o.created_at), u.last_login_at, u.created_at) DESC, u.id DESC\n      LIMIT {$perPage} OFFSET {$offset}\n    ");
    $st->execute($params);

    $customers = [];
    while ($row = $st->fetch()) {
      $customers[] = [
        'customer' => admin_customer_payload($row),
        'orders_count' => (int)($row['orders_count'] ?? 0),
        'total_spent' => (float)($row['total_spent'] ?? 0),
        'pending_orders' => (int)($row['pending_orders'] ?? 0),
        'active_orders' => (int)($row['active_orders'] ?? 0),
        'last_order_at' => trim((string)($row['last_order_at'] ?? '')),
        'last_order_updated_at' => trim((string)($row['last_order_updated_at'] ?? '')),
      ];
    }

    json_out([
      'ok' => true,
      'customers' => $customers,
      'total' => $total,
      'page' => $page,
      'per_page' => $perPage,
      'pages' => (int)ceil($total / $perPage),
    ]);
    break;
  }

  case 'admin_customer_detail': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $customerId = (int)($_GET['id'] ?? 0);
    if ($customerId <= 0) json_out(['ok'=>false,'error'=>'missing_id'], 400);

    $pdo = get_pdo($CFG);
    $st = $pdo->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
    $st->execute([':id' => $customerId]);
    $customer = $st->fetch();
    if (!$customer) json_out(['ok'=>false,'error'=>'not_found'], 404);

    $ordersRows = customer_orders_for_identity($pdo, $customerId, (string)($customer['email'] ?? ''), 100);
    $summary = admin_customer_summarize_orders($ordersRows);

    $orders = [];
    foreach ($ordersRows as $row) {
      $orders[] = [
        'id' => $row['id'] ?? '',
        'sku' => $row['sku'] ?? '',
        'product' => $row['name'] ?? '',
        'status' => $row['status'] ?? '',
        'user_id' => (int)($row['user_id'] ?? 0),
        'email' => trim((string)($row['ship_email'] ?? ($row['payer_email'] ?? ''))),
        'customer' => trim((string)($row['ship_name'] ?? ($row['payer_name'] ?? ''))),
        'amount' => $row['amount'] ?? '',
        'currency' => $row['currency'] ?? 'EUR',
        'payment_method' => $row['payment_method'] ?? '',
        'tracking' => $row['tracking'] ?? '',
        'discount_code' => $row['discount_code'] ?? '',
        'total_amount' => $row['total_amount'] ?? null,
        'shipping_amount' => $row['shipping_amount'] ?? null,
        'updated_at' => $row['updated_at'] ?? '',
        'created_at' => $row['created_at'] ?? '',
      ];
    }

    $history = [];
    if ($orders) {
      $orderIds = array_values(array_filter(array_map(static fn($row) => (string)($row['id'] ?? ''), $ordersRows)));
      if ($orderIds) {
        $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
        $hst = $pdo->prepare("SELECT order_id, field_name, old_value, new_value, changed_by, created_at FROM order_history WHERE order_id IN ({$placeholders}) ORDER BY created_at DESC LIMIT 100");
        $hst->execute($orderIds);
        $history = $hst->fetchAll();
      }
    }

    json_out([
      'ok' => true,
      'customer' => admin_customer_payload($customer),
      'summary' => $summary,
      'orders' => $orders,
      'history' => $history,
    ]);
    break;
  }

  case 'admin_customer_link_orders': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') json_out(['ok'=>false,'error'=>'method_not_allowed'], 405);

    $b = get_json_body();
    $customerId = (int)($b['customer_id'] ?? $b['userId'] ?? 0);
    $email = strtolower(trim((string)($b['email'] ?? '')));
    if ($customerId <= 0) json_out(['ok'=>false,'error'=>'missing_customer_id'], 400);

    $pdo = get_pdo($CFG);
    $st = $pdo->prepare('SELECT id, email FROM users WHERE id = :id LIMIT 1');
    $st->execute([':id' => $customerId]);
    $customer = $st->fetch();
    if (!$customer) json_out(['ok'=>false,'error'=>'not_found'], 404);

    $resolvedEmail = $email !== '' ? $email : strtolower(trim((string)($customer['email'] ?? '')));
    if ($resolvedEmail === '') json_out(['ok'=>false,'error'=>'missing_email'], 400);

    $upd = $pdo->prepare('UPDATE orders SET user_id = :user_id WHERE user_id IS NULL AND (LOWER(COALESCE(ship_email, "")) = :email OR LOWER(COALESCE(payer_email, "")) = :email)');
    $upd->execute([
      ':user_id' => $customerId,
      ':email' => $resolvedEmail,
    ]);

    log_admin_activity($pdo, 'SYSTEM', 'admin_customer_link_orders', $resolvedEmail, 'user_id=' . $customerId . ';updated=' . (string)$upd->rowCount(), false, 'ok');

    json_out([
      'ok' => true,
      'customer_id' => $customerId,
      'email' => $resolvedEmail,
      'updated' => (int)$upd->rowCount(),
    ]);
    break;
  }

  case 'admin_orders_list': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $pdo = get_pdo($CFG);

    // Pagination
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(200, max(10, (int)($_GET['per_page'] ?? 50)));
    $offset = ($page - 1) * $perPage;

    // Filters
    $where = [];
    $params = [];

    $filterStatus = trim((string)($_GET['status'] ?? ''));
    if ($filterStatus !== '') {
      $where[] = 'status = :fstatus';
      $params[':fstatus'] = $filterStatus;
    }

    $filterSearch = trim((string)($_GET['q'] ?? ''));
    if ($filterSearch !== '') {
      $where[] = '(
        id LIKE :q OR
        name LIKE :q2 OR
        ship_name LIKE :q3 OR
        payer_name LIKE :q4 OR
        payer_email LIKE :q5 OR
        ship_email LIKE :q6 OR
        sku LIKE :q7 OR
        ship_phone LIKE :q8 OR
        tracking LIKE :q9 OR
        payment_method LIKE :q10 OR
        ship_city LIKE :q11 OR
        ship_province LIKE :q12 OR
        ship_postal LIKE :q13
      )';
      $like = '%' . $filterSearch . '%';
      $params[':q'] = $like;
      $params[':q2'] = $like;
      $params[':q3'] = $like;
      $params[':q4'] = $like;
      $params[':q5'] = $like;
      $params[':q6'] = $like;
      $params[':q7'] = $like;
      $params[':q8'] = $like;
      $params[':q9'] = $like;
      $params[':q10'] = $like;
      $params[':q11'] = $like;
      $params[':q12'] = $like;
      $params[':q13'] = $like;
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Total count
    $countSt = $pdo->prepare("SELECT COUNT(*) FROM orders {$whereSql}");
    $countSt->execute($params);
    $total = (int)$countSt->fetchColumn();

    // Fetch page
    $st = $pdo->prepare("SELECT id, sku, name, status, user_id, ship_name, ship_email, ship_phone, ship_address, ship_address2, ship_city, ship_province, ship_postal, ship_country, payer_name, payer_email, amount, currency, payment_method, tracking, product_image_url, cart_items_json, product_color, product_color_label, updated_at, created_at FROM orders {$whereSql} ORDER BY created_at DESC LIMIT {$perPage} OFFSET {$offset}");
    $st->execute($params);
    $rows = $st->fetchAll();

    $list = [];
    foreach ($rows as $r) {
      $customerName = trim((string)($r['ship_name'] ?? ''));
      if ($customerName === '') $customerName = trim((string)($r['payer_name'] ?? ''));
      if ($customerName === '') $customerName = '(sin nombre)';

      $email = trim((string)($r['ship_email'] ?? ''));
      if ($email === '') $email = trim((string)($r['payer_email'] ?? ''));

      $list[] = [
        'id' => $r['id'],
        'sku' => $r['sku'] ?? '',
        'product' => order_items_display_name(build_order_items_from_order_row($r), (string)($r['name'] ?? '')),
        'cart_items' => build_order_items_from_order_row($r),
        'is_account_order' => (int)($r['user_id'] ?? 0) > 0,
        'user_id' => (int)($r['user_id'] ?? 0),
        'customer' => $customerName,
        'email' => $email,
        'ship_name' => $r['ship_name'] ?? '',
        'ship_email' => $r['ship_email'] ?? '',
        'ship_phone' => $r['ship_phone'] ?? '',
        'ship_address' => $r['ship_address'] ?? '',
        'ship_address2' => $r['ship_address2'] ?? '',
        'ship_city' => $r['ship_city'] ?? '',
        'ship_province' => $r['ship_province'] ?? '',
        'ship_postal' => $r['ship_postal'] ?? '',
        'ship_country' => $r['ship_country'] ?? '',
        'payer_name' => $r['payer_name'] ?? '',
        'payer_email' => $r['payer_email'] ?? '',
        'amount' => $r['amount'] ?? '',
        'currency' => $r['currency'] ?? 'EUR',
        'status' => $r['status'] ?? '',
        'payment_method' => $r['payment_method'] ?? '',
        'tracking' => $r['tracking'] ?? '',
        'product_image_url' => $r['product_image_url'] ?? '',
        'product_color' => $r['product_color'] ?? '',
        'product_color_label' => $r['product_color_label'] ?? '',
        'updated_at' => $r['updated_at'] ?? '',
        'created_at' => $r['created_at'] ?? '',
      ];
    }

    json_out([
      'ok' => true,
      'orders' => $list,
      'total' => $total,
      'page' => $page,
      'per_page' => $perPage,
      'pages' => (int)ceil($total / $perPage),
    ]);
    break;
  }

  case 'admin_order_detail': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $id = (string)($_GET['id'] ?? '');
    if ($id === '') json_out(['ok'=>false,'error'=>'missing_id'], 400);

    $pdo = get_pdo($CFG);

    $st = $pdo->prepare("SELECT * FROM orders WHERE id = :id LIMIT 1");
    $st->execute([':id'=>$id]);
    $o = $st->fetch();
    if (!$o) json_out(['ok'=>false,'error'=>'not_found'], 404);

    // Fetch history
    $hst = $pdo->prepare("SELECT field_name, old_value, new_value, changed_by, created_at FROM order_history WHERE order_id = :oid ORDER BY created_at DESC LIMIT 50");
    $hst->execute([':oid' => $id]);
    $history = $hst->fetchAll();

    // Fetch email history (append-only observability, safe fallback)
    $emailHistory = [];
    try {
      $hstEmail = $pdo->prepare("SELECT id, order_id, event_type, recipient_email, delivery_status, trigger_source, provider_name, provider_message_id, provider_response_code, error_message, is_manual_resend, created_at, sent_at FROM email_events WHERE order_id = :oid ORDER BY created_at DESC, id DESC LIMIT 50");
      $hstEmail->execute([':oid' => $id]);
      $emailHistory = $hstEmail->fetchAll();
    } catch (Throwable $e) {
      $emailHistory = [];
    }

    json_out([
      'ok'=>true,
      'emailHistory' => $emailHistory,
      'order'=>[
        'id'=>$o['id'],
        'sku'=>$o['sku'] ?? '',
        'name'=>$o['name'] ?? '',
        'amount'=>$o['amount'] ?? '',
        'currency'=>$o['currency'] ?? 'EUR',
        'status'=>$o['status'] ?? '',
        'user_id'=>(int)($o['user_id'] ?? 0),
        'payment_method'=>$o['payment_method'] ?? '',
        'payer_email'=>$o['payer_email'] ?? '',
        'payer_name'=>$o['payer_name'] ?? '',
        'txn_id'=>$o['txn_id'] ?? '',
        'tracking'=>$o['tracking'] ?? '',
        'message'=>$o['message'] ?? '',
        'product_image_url'=>$o['product_image_url'] ?? '',
        'cart_items' => build_order_items_from_order_row($o),
        'product_color'=>$o['product_color'] ?? '',
        'product_color_label'=>$o['product_color_label'] ?? '',
        'admin_notes'=>$o['admin_notes'] ?? '',
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
          'notes'=>$o['ship_notes'] ?? '',
        ],
        'billing'=>[
          'name'=>$o['bill_name'] ?? ($o['payer_name'] ?? ''),
          'email'=>$o['bill_email'] ?? ($o['payer_email'] ?? ''),
          'phone'=>$o['bill_phone'] ?? '',
          'address'=>$o['bill_address'] ?? '',
          'address2'=>$o['bill_address2'] ?? '',
          'city'=>$o['bill_city'] ?? '',
          'province'=>$o['bill_province'] ?? '',
          'postal'=>$o['bill_postal'] ?? '',
          'country'=>$o['bill_country'] ?? '',
          'notes'=>$o['bill_notes'] ?? '',
        ],
        'history' => $history,
      ],
    ]);
    break;
  }

  case 'admin_resend_paid_email': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

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

    $recentManual = find_recent_manual_email_event($pdo, $orderId, $payerEmail, 'order.paid', 'admin_manual_resend_paid', 20);
    if ($recentManual !== null) {
      json_out([
        'ok' => true,
        'orderId' => $orderId,
        'payerEmail' => $payerEmail,
        'emailNotification' => [
          'attempted' => false,
          'sent' => false,
          'reason' => 'duplicate_recent_manual',
          'duplicateBlocked' => true,
          'lastSimilarEmailAt' => (string)($recentManual['created_at'] ?? ''),
          'lastSimilarEmailStatus' => (string)($recentManual['delivery_status'] ?? ''),
        ],
      ]);
    }

    send_paid_email($CFG, $payerEmail, $orderId, [
      'provider' => 'stripe',
      'triggerSource' => 'admin_manual_resend_paid',
      'orderStatus' => (string)($order['status'] ?? ''),
      'productName' => (string)($order['name'] ?? 'Pedido Scoot Shop'),
      'sku' => (string)($order['sku'] ?? ''),
      'orderUrl' => (string)($order['product_url'] ?? ''),
      'productImageUrl' => (string)($order['product_image_url'] ?? ''),
      'orderItems' => build_order_items_from_order_row($order),
      'manualResend' => true,
    ]);

    // Log resend in order history
    $pdo->prepare("INSERT INTO order_history (order_id, field_name, old_value, new_value, changed_by, created_at) VALUES (:oid, :field, :oldv, :newv, 'admin', :ts)")
      ->execute([':oid' => $orderId, ':field' => 'email_resend', ':oldv' => '', ':newv' => $payerEmail, ':ts' => gmdate('Y-m-d H:i:s')]);

    json_out([
      'ok' => true,
      'orderId' => $orderId,
      'payerEmail' => $payerEmail,
    ]);
    break;
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

    // Seguridad: verificar que el importe recibido coincide con el pedido
    if ($orderId) {
      $stCheck = $pdo->prepare("SELECT amount, currency FROM orders WHERE id = :id LIMIT 1");
      $stCheck->execute([':id' => $orderId]);
      $orderData = $stCheck->fetch();
      if ($orderData) {
        $expectedAmount = (string)$orderData['amount'];
        $receivedAmount = (string)($ipn['mc_gross'] ?? '');
        $receivedCurrency = strtoupper((string)($ipn['mc_currency'] ?? ''));
        if ($receivedAmount !== $expectedAmount || $receivedCurrency !== strtoupper((string)$orderData['currency'])) {
          error_log("IPN amount mismatch for order {$orderId}: expected {$expectedAmount} {$orderData['currency']}, got {$receivedAmount} {$receivedCurrency}");
          text_out('AMOUNT_MISMATCH', 200);
        }
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
        $orderMailSt = $pdo->prepare("SELECT * FROM orders WHERE id = :id LIMIT 1");
        $orderMailSt->execute([':id' => $orderId]);
        $orderForMail = $orderMailSt->fetch() ?: [];
        send_paid_email($CFG, $payer_email, $orderId, [
          'provider' => 'paypal',
          'triggerSource' => 'paypal_ipn',
          'payerName' => $payer_name,
          'txnId' => $txn_id,
          'paymentStatus' => $payment_status,
          'currency' => (string)($ipn['mc_currency'] ?? 'EUR'),
          'grossAmount' => (string)($ipn['mc_gross'] ?? ''),
          'orderStatus' => 'paid',
          'productName' => (string)($orderForMail['name'] ?? 'Pedido Scoot Shop'),
          'sku' => (string)($orderForMail['sku'] ?? ''),
          'orderUrl' => (string)($orderForMail['product_url'] ?? ''),
          'productImageUrl' => (string)($orderForMail['product_image_url'] ?? ''),
          'orderItems' => build_order_items_from_order_row($orderForMail),
        ]);
      }
    }

    text_out('OK', 200);
    break;
  }

  case 'admin_order_notes': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') json_out(['ok'=>false,'error'=>'method_not_allowed'], 405);

    $b = get_json_body();
    $id = trim((string)($_GET['id'] ?? $b['id'] ?? ''));
    $notes = trim((string)($b['notes'] ?? ''));

    if ($id === '') json_out(['ok'=>false,'error'=>'missing_id'], 400);

    $pdo = get_pdo($CFG);
    $st = $pdo->prepare("UPDATE orders SET admin_notes = :notes, updated_at = :now WHERE id = :id");
    $st->execute([':notes' => $notes !== '' ? $notes : null, ':now' => date('Y-m-d H:i:s'), ':id' => $id]);

    if ($st->rowCount() === 0) json_out(['ok'=>false,'error'=>'not_found'], 404);

    json_out(['ok'=>true]);
    break;
  }

  case 'admin_order_delete': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') json_out(['ok'=>false,'error'=>'method_not_allowed'], 405);

    $b = get_json_body();
    $id = trim((string)($_GET['id'] ?? $b['id'] ?? ''));

    if ($id === '') json_out(['ok'=>false,'error'=>'missing_id'], 400);

    $pdo = get_pdo($CFG);

    $historyDeleted = 0;
    $ipnDeleted = 0;

    try {
      $pdo->beginTransaction();

      // Delete history first (FK / related rows)
      $stHistory = $pdo->prepare("DELETE FROM order_history WHERE order_id = :oid");
      $stHistory->execute([':oid' => $id]);
      $historyDeleted = (int)$stHistory->rowCount();

      // Delete PayPal IPN trace rows if table exists in this environment
      try {
        $stIpn = $pdo->prepare("DELETE FROM ipn_events WHERE order_id = :oid");
        $stIpn->execute([':oid' => $id]);
        $ipnDeleted = (int)$stIpn->rowCount();
      } catch (Throwable $e) {
        $ipnDeleted = 0;
      }

      // Delete order row
      $stOrder = $pdo->prepare("DELETE FROM orders WHERE id = :id");
      $stOrder->execute([':id' => $id]);

      if ($stOrder->rowCount() === 0) {
        $pdo->rollBack();
        json_out(['ok'=>false,'error'=>'not_found'], 404);
      }

      $pdo->commit();
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) {
        $pdo->rollBack();
      }
      json_out(['ok'=>false,'error'=>'delete_failed'], 500);
    }

    log_admin_activity($pdo, $id, 'admin_order_delete', 'exists', 'deleted', true, 'ok');

    json_out([
      'ok' => true,
      'deleted' => $id,
      'purged' => [
        'orders' => 1,
        'order_history' => $historyDeleted,
        'ipn_events' => $ipnDeleted,
      ],
    ]);
    break;
  }

  case 'admin_orders_bulk_delete': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') json_out(['ok'=>false,'error'=>'method_not_allowed'], 405);

    $b = get_json_body();
    $statuses = $b['statuses'] ?? [];

    if (!is_array($statuses) || empty($statuses)) json_out(['ok'=>false,'error'=>'missing_statuses'], 400);

    // Whitelist allowed statuses for bulk delete
    $allowed = ['canceled','error','payment_failed','pending_payment'];
    $filtered = array_values(array_intersect($statuses, $allowed));

    if (empty($filtered)) json_out(['ok'=>false,'error'=>'no_valid_statuses'], 400);

    $pdo = get_pdo($CFG);
    $placeholders = implode(',', array_fill(0, count($filtered), '?'));

    // Count first
    $countSt = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE status IN ({$placeholders})");
    $countSt->execute($filtered);
    $count = (int)$countSt->fetchColumn();

    if ($count === 0) json_out(['ok'=>true, 'deleted'=>0]);

    // Delete history for those orders
    $pdo->prepare("DELETE FROM order_history WHERE order_id IN (SELECT id FROM orders WHERE status IN ({$placeholders}))")->execute($filtered);

    // Delete ipn_events if table exists
    try {
      $pdo->prepare("DELETE FROM ipn_events WHERE order_id IN (SELECT id FROM orders WHERE status IN ({$placeholders}))")->execute($filtered);
    } catch (Throwable $e) {}

    // Delete orders
    $pdo->prepare("DELETE FROM orders WHERE status IN ({$placeholders})")->execute($filtered);

    log_admin_activity(
      $pdo,
      'SYSTEM',
      'admin_orders_bulk_delete',
      'statuses=' . implode(',', $filtered),
      'deleted=' . (string)$count,
      true,
      'ok'
    );

    json_out(['ok'=>true, 'deleted'=>$count, 'statuses'=>$filtered]);
    break;
  }

  // ═══════════ PRODUCT MANAGEMENT (static file) ═══════════

  case 'admin_bust_cache': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $versionFile = __DIR__ . '/../asset-version.json';
    if (!is_file($versionFile)) json_out(['ok'=>false,'error'=>'version_file_not_found'], 500);

    $data = json_decode(file_get_contents($versionFile), true);
    $current = trim((string)($data['v'] ?? ''));

    $result = bump_asset_version();
    if (!$result || empty($result['version'])) json_out(['ok'=>false,'error'=>'bump_failed'], 500);
    $next = (string)$result['version'];

    try {
      $pdo = get_pdo($CFG);
      log_admin_activity($pdo, 'SYSTEM', 'admin_cache_bust', $current, $next, true, 'ok');
    } catch (Throwable $e) {}

    json_out([
      'ok'=>true,
      'previous'=>$current,
      'version'=>$next,
      'stamp'=>$result['stamp'] ?? '',
      'stats'=>$result['stats'] ?? null,
      'sitemap'=>$result['sitemap'] ?? null,
      'manifest'=>$result['manifest'] ?? null,
      'shell_files'=>$result['shell_files'] ?? null,
    ]);
    break;
  }

  case 'admin_bust_cache_ultra': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $versionFile = __DIR__ . '/../asset-version.json';
    if (!is_file($versionFile)) json_out(['ok'=>false,'error'=>'version_file_not_found'], 500);

    $data = json_decode(file_get_contents($versionFile), true);
    $current = trim((string)($data['v'] ?? ''));

    $result = bump_asset_version();
    if (!$result || empty($result['version'])) json_out(['ok'=>false,'error'=>'bump_failed'], 500);
    $next = (string)$result['version'];
    $stamp = (string)($result['stamp'] ?? '');
    $verification = verify_public_cache_refresh((string)($CFG['public_base'] ?? 'https://scootshop.co'), $next, $stamp);

    try {
      $pdo = get_pdo($CFG);
      log_admin_activity(
        $pdo,
        'SYSTEM',
        'admin_cache_bust_ultra',
        $current,
        $next . '|verified=' . ($verification['ok'] ? '1' : '0'),
        true,
        $verification['ok'] ? 'ok' : 'verify_warning'
      );
    } catch (Throwable $e) {}

    json_out([
      'ok'=>true,
      'mode'=>'ultra',
      'previous'=>$current,
      'version'=>$next,
      'stamp'=>$stamp,
      'stats'=>$result['stats'] ?? null,
      'sitemap'=>$result['sitemap'] ?? null,
      'manifest'=>$result['manifest'] ?? null,
      'shell_files'=>$result['shell_files'] ?? null,
      'verification'=>$verification,
    ]);
    break;
  }

  case 'admin_products_list': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $productsFile = __DIR__ . '/../data/products.js';
    if (!is_file($productsFile)) json_out(['ok'=>false,'error'=>'products_file_not_found'], 500);

    $js = file_get_contents($productsFile);
    $products = [];

    // Extract each product block by matching id + relevant fields
    if (preg_match_all('/\{\s*\n\s*id:\s*[\'"]([^\'"]+)[\'"].*?sku:\s*[\'"]([^\'"]+)[\'"].*?name:\s*[\'"]([^\'"]+)[\'"].*?series:\s*[\'"]([^\'"]+)[\'"].*?categoryKey:\s*[\'"]([^\'"]+)[\'"].*?priceText:\s*[\'"]([^\'"]*)[\'"].*?compareAtPriceText:\s*[\'"]([^\'"]*)[\'"].*?stock:\s*[\'"]([^\'"]+)[\'"].*?href:\s*[\'"]([^\'"]+)[\'"].*?image:\s*[\'"]([^\'"]+)[\'"]/s', $js, $matches, PREG_SET_ORDER)) {
      foreach ($matches as $m) {
        $variantCount = 0;
        if (preg_match('/id:\s*[\'\"]' . preg_quote($m[1], '/') . '[\'\"].*?colorVariants:\s*\[(.*?)\]\s*,\s*specs:/s', $js, $vm)) {
          preg_match_all('/\bkey:\s*[\'\"][^\'\"]+[\'\"]/', (string)$vm[1], $vk);
          $variantCount = count($vk[0] ?? []);
        }
        $stock = (string)$m[8];
        $hasHref = trim((string)$m[9]) !== '';
        $hasImage = trim((string)$m[10]) !== '';
        $products[] = [
          'id' => $m[1],
          'sku' => $m[2],
          'name' => $m[3],
          'series' => $m[4],
          'categoryKey' => $m[5],
          'priceText' => $m[6],
          'compareAtPriceText' => $m[7],
          'stock' => $stock,
          'href' => $m[9],
          'image' => $m[10],
          'variantCount' => $variantCount,
          'publishState' => ($hasHref && $hasImage) ? 'published' : 'incomplete',
          'availabilityLabel' => $stock === 'in_stock' ? 'Disponible' : 'Agotado',
        ];
      }
    }

    json_out(['ok'=>true, 'products'=>$products]);
    break;
  }

  case 'admin_product_stock': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $b = get_json_body();
    $productId = trim((string)($b['id'] ?? ''));
    $newStock = trim((string)($b['stock'] ?? ''));

    if ($productId === '') json_out(['ok'=>false,'error'=>'missing_id'], 400);
    if (!in_array($newStock, ['in_stock', 'out_of_stock'], true)) json_out(['ok'=>false,'error'=>'bad_stock_value'], 400);

    $productsFile = __DIR__ . '/../data/products.js';
    if (!is_file($productsFile)) json_out(['ok'=>false,'error'=>'products_file_not_found'], 500);

    $js = file_get_contents($productsFile);

    $prevStock = null;
    if (preg_match('/id:\s*[\'\"]' . preg_quote($productId, '/') . '[\'\"].*?stock:\s*[\'\"](in_stock|out_of_stock)[\'\"]/s', $js, $mPrevStock)) {
      $prevStock = (string)($mPrevStock[1] ?? '');
    }

    // Find this product's block and replace its stock value
    $pattern = '/(id:\s*[\'"]' . preg_quote($productId, '/') . '[\'"].*?stock:\s*[\'"])(in_stock|out_of_stock)([\'"])/s';
    $count = 0;
    $js = preg_replace($pattern, '${1}' . $newStock . '${3}', $js, 1, $count);

    if ($count === 0) json_out(['ok'=>false,'error'=>'product_not_found'], 404);

    file_put_contents($productsFile, $js, LOCK_EX);

    try {
      $pdo = get_pdo($CFG);
      $oldStockLabel = $prevStock === 'in_stock' ? 'in_stock' : ($prevStock === 'out_of_stock' ? 'out_of_stock' : 'unknown');
      log_admin_activity($pdo, 'PRODUCT:' . $productId, 'admin_product_stock', $oldStockLabel, $newStock, true, 'ok');
    } catch (Throwable $e) {}

    bump_asset_version();
    header('X-LiteSpeed-Purge: /data/products.js');

    json_out(['ok'=>true, 'id'=>$productId, 'stock'=>$newStock]);
    break;
  }

  case 'admin_product_price': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $b = get_json_body();
    $productId = trim((string)($b['id'] ?? ''));
    $newPrice = trim((string)($b['priceText'] ?? ''));
    $newCompare = trim((string)($b['compareAtPriceText'] ?? ''));

    $parsePrice = static function (string $txt): ?float {
      $txt = trim($txt);
      if ($txt === '' || str_contains($txt, '-')) return null;
      $raw = preg_replace('/[^0-9,\.]/', '', $txt) ?? '';
      $raw = trim($raw);
      if ($raw === '' || !preg_match('/\d/', $raw)) return null;
      $hasComma = str_contains($raw, ',');
      $hasDot = str_contains($raw, '.');
      if ($hasComma && $hasDot) {
        $lastComma = strrpos($raw, ',');
        $lastDot = strrpos($raw, '.');
        if ($lastComma !== false && $lastDot !== false && $lastComma > $lastDot) {
          $raw = str_replace('.', '', $raw);
          $raw = str_replace(',', '.', $raw);
        } else {
          $raw = str_replace(',', '', $raw);
        }
      } elseif ($hasComma) {
        $raw = str_replace(',', '.', $raw);
      }
      $n = (float)$raw;
      if (!is_finite($n)) return null;
      return $n;
    };
    $formatPrice = static function (float $n): string {
      return number_format($n, 2, ',', '.') . ' €';
    };
    $escapeReplacement = static function (string $v): string {
      return str_replace(['\\', '$'], ['\\\\', '\\$'], $v);
    };

    if ($productId === '') json_out(['ok'=>false,'error'=>'missing_id'], 400);
    if ($newPrice === '') json_out(['ok'=>false,'error'=>'missing_price'], 400);

    $parsedPrice = $parsePrice($newPrice);
    if ($parsedPrice === null) json_out(['ok'=>false,'error'=>'bad_price_format'], 400);
    if ($parsedPrice <= 0) json_out(['ok'=>false,'error'=>'price_must_be_positive'], 400);

    $parsedCompare = null;
    if ($newCompare !== '') {
      $parsedCompare = $parsePrice($newCompare);
      if ($parsedCompare === null) json_out(['ok'=>false,'error'=>'bad_compare_price_format'], 400);
      if ($parsedCompare <= 0) json_out(['ok'=>false,'error'=>'compare_price_must_be_positive'], 400);
      if ($parsedCompare < $parsedPrice) json_out(['ok'=>false,'error'=>'compare_lower_than_price'], 400);
    }

    $newPrice = $formatPrice($parsedPrice);
    if ($parsedCompare !== null) $newCompare = $formatPrice($parsedCompare);

    $productsFile = __DIR__ . '/../data/products.js';
    if (!is_file($productsFile)) json_out(['ok'=>false,'error'=>'products_file_not_found'], 500);

    $js = file_get_contents($productsFile);

    $oldPriceText = '';
    if (preg_match('/id:\s*[\'\"]' . preg_quote($productId, '/') . '[\'\"].*?priceText:\s*[\'\"]([^\'\"]*)[\'\"]/s', $js, $mOldPrice)) {
      $oldPriceText = trim((string)($mOldPrice[1] ?? ''));
    }

    // Replace priceText
    $pattern = '/(id:\s*[\'"]' . preg_quote($productId, '/') . '[\'"].*?priceText:\s*[\'"])[^\'"]*([\'"])/s';
    $count = 0;
    $js = preg_replace($pattern, '${1}' . $escapeReplacement($newPrice) . '${2}', $js, 1, $count);
    if ($count === 0) json_out(['ok'=>false,'error'=>'product_not_found'], 404);

    // Replace compareAtPriceText if provided
    if ($newCompare !== '') {
      $patternCompare = '/(id:\s*[\'"]' . preg_quote($productId, '/') . '[\'"].*?compareAtPriceText:\s*[\'"])[^\'"]*([\'"])/s';
      $js = preg_replace($patternCompare, '${1}' . $escapeReplacement($newCompare) . '${2}', $js, 1);
    }

    file_put_contents($productsFile, $js, LOCK_EX);

    try {
      $pdo = get_pdo($CFG);
      $compareLabel = $newCompare !== '' ? (' / compare ' . $newCompare) : '';
      log_admin_activity($pdo, 'PRODUCT:' . $productId, 'admin_product_price', $oldPriceText, $newPrice . $compareLabel, true, 'ok');
    } catch (Throwable $e) {}

    // ── Also update the individual product HTML page ──
    // Extract href for this product from products.js
    $hrefPattern = '/id:\s*[\'"]' . preg_quote($productId, '/') . '[\'"].*?href:\s*[\'"]([^\'"]+)[\'"]/s';
    if (preg_match($hrefPattern, $js, $hrefMatch)) {
      $productHref = $hrefMatch[1]; // e.g. /patinetes/series-ix/ix8/
      $htmlFile = __DIR__ . '/..' . $productHref . 'index.html';

      if (is_file($htmlFile)) {
        $html = file_get_contents($htmlFile);

        $numericPrice = number_format($parsedPrice, 2, '.', '');

        $numericCompare = '';
        if ($parsedCompare !== null) {
          $numericCompare = number_format($parsedCompare, 2, '.', '');
        }

        // 1. Update visible price: <span class="price-now">XXX €</span>
        $displayPrice = $newPrice;
        $html = preg_replace(
          '/(<span\s+class="price-now">)[^<]*(<\/span>)/i',
          '${1}' . $displayPrice . '${2}',
          $html
        );

        // 2. Update compare/old price: <span class="price-was">XXX €</span>
        if ($newCompare !== '') {
          $displayCompare = $newCompare;
          $html = preg_replace(
            '/(<span\s+class="price-was">)[^<]*(<\/span>)/i',
            '${1}' . $displayCompare . '${2}',
            $html
          );
        }

        // 3. Update checkout URL price= parameter
        if ($numericPrice !== '') {
          $html = preg_replace(
            '/(href="\/checkout\?[^"]*?)price=[\d.]+/',
            '${1}price=' . $numericPrice,
            $html
          );
        }

        // 4. Update JSON-LD "price":"X.XX"
        if ($numericPrice !== '') {
          $html = preg_replace(
            '/("price"\s*:\s*")[^"]*(")/i',
            '${1}' . $numericPrice . '${2}',
            $html
          );
        }

        file_put_contents($htmlFile, $html, LOCK_EX);
      }
    }

    // Auto-bump asset version + update index.html meta tag
    $newVersion = bump_asset_version();

    // Purge LiteSpeed cache
    header('X-LiteSpeed-Purge: /data/products.js');
    header('X-LiteSpeed-Purge: ' . trim($productId, '/') . '/');

    json_out(['ok'=>true, 'id'=>$productId, 'priceText'=>$newPrice, 'compareAtPriceText'=>$newCompare, 'version'=>$newVersion]);
    break;
  }

  case 'admin_product_create': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $b = get_json_body();

    $name = trim((string)($b['name'] ?? ''));
    $sku = strtoupper(trim((string)($b['sku'] ?? '')));
    $brand = trim((string)($b['brand'] ?? ''));
    $series = trim((string)($b['series'] ?? ''));
    $categoryKey = trim((string)($b['categoryKey'] ?? ''));
    $priceText = trim((string)($b['priceText'] ?? ''));
    $compareAtPriceText = trim((string)($b['compareAtPriceText'] ?? ''));
    $stock = trim((string)($b['stock'] ?? 'in_stock'));
    $href = trim((string)($b['href'] ?? ''));
    $image = trim((string)($b['image'] ?? ''));
    $alt = trim((string)($b['alt'] ?? ''));
    $paypalId = trim((string)($b['paypalId'] ?? ''));
    $youtubeUrl = trim((string)($b['youtubeUrl'] ?? ''));

    if ($name === '' || $sku === '' || $series === '' || $categoryKey === '' || $priceText === '' || $href === '' || $image === '') {
      json_out(['ok'=>false,'error'=>'missing_required_fields'], 400);
    }

    if (!in_array($stock, ['in_stock', 'out_of_stock'], true)) {
      json_out(['ok'=>false,'error'=>'bad_stock_value'], 400);
    }

    // Validate price format: must contain at least one digit
    if (!preg_match('/\d/', $priceText)) {
      json_out(['ok'=>false,'error'=>'bad_price_format'], 400);
    }

    if ($compareAtPriceText !== '' && !preg_match('/\d/', $compareAtPriceText)) {
      json_out(['ok'=>false,'error'=>'bad_compare_price_format'], 400);
    }

    $slugify = static function (string $value): string {
      $value = strtolower(trim($value));
      $value = preg_replace('/[^a-z0-9]+/i', '-', $value) ?? '';
      return trim($value, '-');
    };

    $idInput = trim((string)($b['id'] ?? ''));
    $id = $idInput !== '' ? $idInput : ($slugify($series . '-' . $name) ?: $slugify($sku));
    if ($id === '') json_out(['ok'=>false,'error'=>'invalid_id'], 400);

    $menuLabel = trim((string)($b['menuLabel'] ?? ''));
    if ($menuLabel === '') $menuLabel = $name;
    $badgeText = trim((string)($b['badgeText'] ?? ''));
    if ($badgeText === '') $badgeText = $sku;
    $homeTitle = trim((string)($b['homeTitle'] ?? ''));
    if ($homeTitle === '') $homeTitle = $name;
    $homeAriaLabel = trim((string)($b['homeAriaLabel'] ?? ''));
    if ($homeAriaLabel === '') $homeAriaLabel = $name;
    $priceAriaLabel = trim((string)($b['priceAriaLabel'] ?? ''));
    if ($priceAriaLabel === '') $priceAriaLabel = 'Precio ' . $name;

    $specsInput = $b['specs'] ?? [];
    if (!is_array($specsInput)) $specsInput = [];
    $specs = [];
    foreach ($specsInput as $spec) {
      $clean = trim((string)$spec);
      if ($clean !== '') $specs[] = mb_substr($clean, 0, 120);
    }
    if (!$specs) $specs = ['Nueva ficha pendiente'];
    $specs = array_slice($specs, 0, 8);

    $galleryInput = $b['gallery'] ?? [];
    if (!is_array($galleryInput)) $galleryInput = [];
    $gallery = [];
    foreach ($galleryInput as $url) {
      $clean = trim((string)$url);
      if ($clean !== '') $gallery[] = $clean;
    }
    if (!$gallery) $gallery[] = $image;
    $gallery = array_slice($gallery, 0, 20);

    $categoryToType = [
      'electric-scooters' => 'electric-scooter',
      'electric-bikes' => 'electric-bike',
      'electric-motorcycles' => 'electric-motorcycle',
      'accessories' => 'accessory',
    ];
    $productType = $categoryToType[$categoryKey] ?? 'electric-scooter';
    $catalogType = ($categoryKey === 'accessories') ? 'accessory' : 'vehicle';

    if ($alt === '') {
      $alt = ($categoryKey === 'accessories') ? ('Accesorio ' . $name) : ('Producto ' . $name);
    }

    $productsFile = __DIR__ . '/../data/products.js';
    if (!is_file($productsFile)) json_out(['ok'=>false,'error'=>'products_file_not_found'], 500);

    $js = file_get_contents($productsFile);
    if (!is_string($js) || $js === '') json_out(['ok'=>false,'error'=>'products_file_read_failed'], 500);

    if (!preg_match('/var products = \[(.*)\]\s*;/s', $js, $arrMatch)) {
      json_out(['ok'=>false,'error'=>'products_array_not_found'], 500);
    }

    $productsBlock = $arrMatch[1];

    if (preg_match('/id:\s*[\'\"]' . preg_quote($id, '/') . '[\'\"]/i', $productsBlock)) {
      json_out(['ok'=>false,'error'=>'duplicate_id'], 409);
    }
    if (preg_match('/sku:\s*[\'\"]' . preg_quote($sku, '/') . '[\'\"]/i', $productsBlock)) {
      json_out(['ok'=>false,'error'=>'duplicate_sku'], 409);
    }

    $homeOrder = 1;
    if (preg_match_all('/series:\s*[\'\"]' . preg_quote($series, '/') . '[\'\"].*?homeOrder:\s*(\d+)/s', $productsBlock, $orders)) {
      foreach ($orders[1] as $v) {
        $num = (int)$v;
        if ($num >= $homeOrder) $homeOrder = $num + 1;
      }
    }

    $q = static function (string $value): string {
      $value = str_replace('\\', '\\\\', $value);
      $value = str_replace("'", "\\'", $value);
      $value = str_replace(["\r", "\n"], ' ', $value);
      return "'" . $value . "'";
    };

    $specLines = [];
    foreach ($specs as $spec) {
      $specLines[] = '      ' . $q($spec);
    }

    $galleryLines = [];
    foreach ($gallery as $idx => $url) {
      $galleryLines[] = '        { src: ' . $q($url) . ', alt: ' . $q($name . ' vista ' . ($idx + 1)) . ' }';
    }

    $newProduct = "    {\n"
      . '      id: ' . $q($id) . ",\n"
      . '      sku: ' . $q($sku) . ",\n"
      . '      name: ' . $q($name) . ",\n"
      . '      menuLabel: ' . $q($menuLabel) . ",\n"
      . '      badgeText: ' . $q($badgeText) . ",\n"
      . '      brand: ' . $q($brand) . ",\n"
      . '      series: ' . $q($series) . ",\n"
      . '      productType: ' . $q($productType) . ",\n"
      . '      catalogType: ' . $q($catalogType) . ",\n"
      . '      categoryKey: ' . $q($categoryKey) . ",\n"
      . '      priceText: ' . $q($priceText) . ",\n"
      . '      compareAtPriceText: ' . $q($compareAtPriceText) . ",\n"
      . '      stock: ' . $q($stock) . ",\n"
      . ($paypalId !== '' ? ('      paypalId: ' . $q($paypalId) . ",\n") : '')
      . ($youtubeUrl !== '' ? ('      youtubeUrl: ' . $q($youtubeUrl) . ",\n") : '')
      . '      href: ' . $q($href) . ",\n"
      . '      image: ' . $q($image) . ",\n"
      . '      alt: ' . $q($alt) . ",\n"
      . "      specs: [\n" . implode(",\n", $specLines) . "\n      ],\n"
      . '      homeOrder: ' . $homeOrder . ",\n"
      . '      homeTitle: ' . $q($homeTitle) . ",\n"
      . '      homeAriaLabel: ' . $q($homeAriaLabel) . ",\n"
      . '      priceAriaLabel: ' . $q($priceAriaLabel) . ",\n"
      . "      gallery: [\n" . implode(",\n", $galleryLines) . "\n      ]\n"
      . '    }';

    $existing = rtrim($productsBlock);
    if ($existing !== '' && !str_ends_with($existing, ',')) {
      $existing .= ',';
    }
    $newProductsBlock = $existing . "\n" . $newProduct . "\n  ";

    $updatedJs = preg_replace('/var products = \[(.*)\]\s*;/s', 'var products = [' . $newProductsBlock . '];', $js, 1, $replaceCount);
    if ($replaceCount !== 1 || !is_string($updatedJs) || $updatedJs === '') {
      json_out(['ok'=>false,'error'=>'products_array_replace_failed'], 500);
    }

    $pageResult = create_static_product_page([
      'name' => $name,
      'brand' => $brand,
      'series' => $series,
      'sku' => $sku,
      'priceText' => $priceText,
      'compareAtPriceText' => $compareAtPriceText,
      'stock' => $stock,
      'href' => $href,
      'image' => $image,
      'specs' => $specs,
    ], $CFG['public_base']);
    if (!($pageResult['ok'] ?? false)) {
      json_out(['ok'=>false, 'error'=> (string)($pageResult['error'] ?? 'product_page_generation_failed')], 500);
    }

    file_put_contents($productsFile, $updatedJs, LOCK_EX);

    $sitemapUpdated = append_product_to_sitemap($CFG['public_base'], $href);

    $version = bump_asset_version();

    // Purge LiteSpeed cache for this specific file and all related assets
    header('X-LiteSpeed-Purge: /data/products.js');
    header('X-LiteSpeed-Purge: /data/*');
    header('X-LiteSpeed-Purge: /js/global-assets*.js');
    header('X-LiteSpeed-Purge: /css/*');
    header('X-LiteSpeed-Purge: /asset-version.json');
    header('X-LiteSpeed-Purge: ' . $href);
    header('X-LiteSpeed-Purge: /sitemap.xml');

    json_out([
      'ok' => true,
      'version' => $version,
      'pageCreated' => (bool)($pageResult['created'] ?? false),
      'pageHref' => (string)($pageResult['href'] ?? $href),
      'sitemapUpdated' => $sitemapUpdated,
      'product' => [
        'id' => $id,
        'sku' => $sku,
        'name' => $name,
        'series' => $series,
        'categoryKey' => $categoryKey,
        'priceText' => $priceText,
        'compareAtPriceText' => $compareAtPriceText,
        'stock' => $stock,
        'href' => $href,
        'image' => $image,
      ],
    ]);
    break;
  }

  case 'admin_product_autofill_url': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $b = get_json_body();
    $url = trim((string)($b['url'] ?? ''));
    if ($url === '') json_out(['ok'=>false,'error'=>'missing_url'], 400);

    if (!filter_var($url, FILTER_VALIDATE_URL)) json_out(['ok'=>false,'error'=>'bad_url'], 400);

    $parts = parse_url($url);
    $scheme = strtolower((string)($parts['scheme'] ?? ''));
    $host = strtolower((string)($parts['host'] ?? ''));
    if (!in_array($scheme, ['http', 'https'], true)) json_out(['ok'=>false,'error'=>'bad_scheme'], 400);
    if ($host === '') json_out(['ok'=>false,'error'=>'bad_host'], 400);

    if (
      $host === 'localhost' ||
      $host === '127.0.0.1' ||
      $host === '::1' ||
      str_ends_with($host, '.local') ||
      preg_match('/^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/', $host)
    ) {
      json_out(['ok'=>false,'error'=>'host_not_allowed'], 400);
    }

    $html = '';
    if (function_exists('curl_init')) {
      $ch = curl_init($url);
      curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 4,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_USERAGENT => 'SCOOTSHOP-Bot/1.0 (+https://scootshop.co)',
      ]);
      $res = curl_exec($ch);
      $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
      curl_close($ch);
      if (is_string($res) && $res !== '' && $http >= 200 && $http < 400) {
        $html = $res;
      }
    }

    if ($html === '') {
      $ctx = stream_context_create([
        'http' => [
          'timeout' => 10,
          'ignore_errors' => true,
          'user_agent' => 'SCOOTSHOP-Bot/1.0 (+https://scootshop.co)',
          'follow_location' => 1,
          'max_redirects' => 4,
        ],
      ]);
      $res = @file_get_contents($url, false, $ctx);
      if (is_string($res) && $res !== '') {
        $html = $res;
      }
    }

    if ($html === '') json_out(['ok'=>false,'error'=>'fetch_failed'], 502);

    $extractMeta = static function (string $doc, string $prop): string {
      $re1 = '/<meta[^>]+property=["\']' . preg_quote($prop, '/') . '["\'][^>]+content=["\']([^"\']+)["\']/i';
      $re2 = '/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']' . preg_quote($prop, '/') . '["\']/i';
      $re3 = '/<meta[^>]+name=["\']' . preg_quote($prop, '/') . '["\'][^>]+content=["\']([^"\']+)["\']/i';
      foreach ([$re1, $re2, $re3] as $re) {
        if (preg_match($re, $doc, $m)) {
          return trim(html_entity_decode((string)$m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        }
      }
      return '';
    };

    $title = $extractMeta($html, 'og:title');
    if ($title === '' && preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $mTitle)) {
      $title = trim(html_entity_decode(strip_tags((string)$mTitle[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
    $description = $extractMeta($html, 'og:description');
    if ($description === '') $description = $extractMeta($html, 'description');
    $image = $extractMeta($html, 'og:image');

    if ($image !== '' && !preg_match('/^https?:\/\//i', $image)) {
      $base = $scheme . '://' . $host;
      if (str_starts_with($image, '/')) {
        $image = $base . $image;
      } else {
        $path = (string)($parts['path'] ?? '/');
        $dir = rtrim(str_replace('\\', '/', dirname($path)), '/');
        $image = $base . ($dir !== '' ? '/' . ltrim($dir, '/') : '') . '/' . ltrim($image, '/');
      }
    }

    $title = mb_substr($title, 0, 190);
    $description = mb_substr($description, 0, 300);
    $image = mb_substr($image, 0, 500);

    json_out([
      'ok' => true,
      'source_url' => $url,
      'title' => $title,
      'description' => $description,
      'image' => $image,
    ]);
    break;
  }

  case 'admin_product_upload_images': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $href = trim((string)($_POST['href'] ?? ''));
    if ($href === '') json_out(['ok'=>false,'error'=>'missing_href'], 400);

    // Only allow safe path characters; must start and end with /
    if (!preg_match('#^(/[a-zA-Z0-9_\-]+)+/$#', $href)) json_out(['ok'=>false,'error'=>'invalid_href'], 400);

    // Prevent path traversal
    $docRoot = realpath(__DIR__ . '/..');
    if ($docRoot === false) json_out(['ok'=>false,'error'=>'docroot_error'], 500);
    $imgDir = $docRoot . str_replace('/', DIRECTORY_SEPARATOR, rtrim($href, '/')) . DIRECTORY_SEPARATOR . 'img';
    $realImgDir = realpath($imgDir);
    // Allow imgDir if it doesn't exist yet; validate after creation
    if ($realImgDir === false) {
      if (!mkdir($imgDir, 0755, true)) json_out(['ok'=>false,'error'=>'mkdir_failed'], 500);
      $realImgDir = realpath($imgDir);
    }
    if ($realImgDir === false || strpos($realImgDir, $docRoot) !== 0) {
      json_out(['ok'=>false,'error'=>'path_traversal'], 400);
    }

    if (empty($_FILES['images'])) json_out(['ok'=>false,'error'=>'no_files'], 400);

    $files = $_FILES['images'];
    $normalized = [];
    if (is_array($files['name'])) {
      for ($i = 0, $n = count($files['name']); $i < $n; $i++) {
        if ((int)$files['error'][$i] === UPLOAD_ERR_OK) {
          $normalized[] = ['tmp_name'=>$files['tmp_name'][$i], 'size'=>$files['size'][$i]];
        }
      }
    } elseif ((int)$files['error'] === UPLOAD_ERR_OK) {
      $normalized[] = ['tmp_name'=>$files['tmp_name'], 'size'=>$files['size']];
    }

    if (empty($normalized)) json_out(['ok'=>false,'error'=>'no_valid_files'], 400);

    $maxSize = 25 * 1024 * 1024; // 25 MB per file
    $allowedMimes = ['image/jpeg'=>'jpeg','image/jpg'=>'jpeg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp','image/bmp'=>'bmp'];
    $gdAvailable = function_exists('imagecreatefromjpeg') && function_exists('imagewebp');

    // Determine starting index (continue numbering if img folder already has files)
    $existing = glob($realImgDir . DIRECTORY_SEPARATOR . '*.webp') ?: [];
    $nextIndex = count($existing) + 1;

    $paths = [];
    foreach ($normalized as $file) {
      if ($file['size'] > $maxSize) continue;

      // Validate using getimagesize (reads actual image data, not header)
      $info = @getimagesize($file['tmp_name']);
      if (!$info) continue;
      $mime = strtolower((string)($info['mime'] ?? ''));
      if (!isset($allowedMimes[$mime])) continue;

      $destName = $nextIndex . '.webp';
      $destPath = $realImgDir . DIRECTORY_SEPARATOR . $destName;
      $webPath  = rtrim($href, '/') . '/img/' . $destName;

      $converted = false;
      if ($gdAvailable) {
        $img = null;
        switch ($mime) {
          case 'image/jpeg': case 'image/jpg': $img = @imagecreatefromjpeg($file['tmp_name']); break;
          case 'image/png':  $img = @imagecreatefrompng($file['tmp_name']); break;
          case 'image/gif':  $img = @imagecreatefromgif($file['tmp_name']); break;
          case 'image/webp': $img = @imagecreatefromwebp($file['tmp_name']); break;
          case 'image/bmp':  $img = @imagecreatefrombmp($file['tmp_name']); break;
        }
        if ($img) {
          if (in_array($mime, ['image/png','image/gif'], true)) {
            imagepalettetotruecolor($img);
            imagealphablending($img, true);
            imagesavealpha($img, true);
          }
          $converted = imagewebp($img, $destPath, 85);
          imagedestroy($img);
        }
      }

      if (!$converted) {
        // GD not available or failed — store file as-is
        $converted = move_uploaded_file($file['tmp_name'], $destPath);
      }

      if ($converted) {
        $paths[] = $webPath;
        $nextIndex++;
      }
    }

    if (empty($paths)) json_out(['ok'=>false,'error'=>'conversion_failed'], 500);

    json_out(['ok'=>true, 'paths'=>$paths, 'gd'=>$gdAvailable]);
    break;
  }

  case 'admin_product_delete': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) json_out(['ok'=>false,'error'=>'unauthorized'], 401);

    $b = get_json_body();
    $productId = trim((string)($b['id'] ?? ''));
    if ($productId === '') json_out(['ok'=>false,'error'=>'missing_id'], 400);

    $productsFile = __DIR__ . '/../data/products.js';
    if (!is_file($productsFile)) json_out(['ok'=>false,'error'=>'products_file_not_found'], 500);

    $js = file_get_contents($productsFile);
    if (!is_string($js) || $js === '') json_out(['ok'=>false,'error'=>'products_file_read_failed'], 500);

    if (!preg_match('/var products = \[(.*)\]\s*;/s', $js, $arrMatch)) {
      json_out(['ok'=>false,'error'=>'products_array_not_found'], 500);
    }

    $productsBlock = $arrMatch[1];

    // Find product block first (needed to capture href and delete physical page/folder)
    $findPattern = '/\{\s*\n\s*id:\s*[\'"]' . preg_quote($productId, '/') . '[\'"].*?\n\s*\}/s';
    if (!preg_match($findPattern, $productsBlock, $pm)) {
      json_out(['ok'=>false,'error'=>'product_not_found'], 404);
    }

    $productBlock = (string)$pm[0];
    $href = '';
    if (preg_match('/href:\s*[\'"]([^\'"]+)[\'"]/', $productBlock, $hm)) {
      $href = trim((string)($hm[1] ?? ''));
    }

    // Remove product object from products array
    $pattern = '/,?\s*\{\s*\n\s*id:\s*[\'"]' . preg_quote($productId, '/') . '[\'"].*?\n\s*\}/s';
    $count = 0;
    $newBlock = preg_replace($pattern, '', $productsBlock, 1, $count);

    if ($count === 0) json_out(['ok'=>false,'error'=>'product_not_found'], 404);

    // Clean up any leftover commas or formatting issues
    $newBlock = preg_replace('/,\s*,/', ',', $newBlock); // double commas
    $newBlock = preg_replace('/,\s*\]/', ']', $newBlock); // trailing comma before ]
    $newBlock = preg_replace('/\[\s*,/', '[', $newBlock); // leading comma after [

    $updatedJs = preg_replace('/var products = \[(.*)\]\s*;/s', 'var products = [' . $newBlock . '];', $js, 1, $replaceCount);
    if ($replaceCount !== 1 || !is_string($updatedJs) || $updatedJs === '') {
      json_out(['ok'=>false,'error'=>'products_array_replace_failed'], 500);
    }

    file_put_contents($productsFile, $updatedJs, LOCK_EX);

    // Best effort: keep products-server.js in sync if present
    $productsServerFile = __DIR__ . '/../data/products-server.js';
    $serverCatalogUpdated = false;
    if (is_file($productsServerFile)) {
      $js2 = file_get_contents($productsServerFile);
      if (is_string($js2) && $js2 !== '' && preg_match('/var products = \[(.*)\]\s*;/s', $js2, $m2)) {
        $block2 = $m2[1];
        $newBlock2 = preg_replace($pattern, '', $block2, 1, $count2);
        if ($count2 > 0) {
          $newBlock2 = preg_replace('/,\s*,/', ',', $newBlock2);
          $newBlock2 = preg_replace('/,\s*\]/', ']', $newBlock2);
          $newBlock2 = preg_replace('/\[\s*,/', '[', $newBlock2);
          $updatedJs2 = preg_replace('/var products = \[(.*)\]\s*;/s', 'var products = [' . $newBlock2 . '];', $js2, 1, $rc2);
          if ($rc2 === 1 && is_string($updatedJs2) && $updatedJs2 !== '') {
            file_put_contents($productsServerFile, $updatedJs2, LOCK_EX);
            $serverCatalogUpdated = true;
          }
        }
      }
    }

    // Delete static page folder and images based on href
    $folderDeleted = false;
    $sitemapUpdated = false;
    if ($href !== '' && preg_match('~^/[a-z0-9/_-]+/$~i', $href) && !str_contains($href, '..')) {
      $root = realpath(__DIR__ . '/..');
      if (is_string($root) && $root !== '') {
        $relative = trim($href, '/');
        $targetDir = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
        if (is_dir($targetDir)) {
          $folderDeleted = delete_dir_recursive($targetDir);
        }
      }
      $sitemapUpdated = remove_product_from_sitemap($CFG['public_base'], $href);
    }

    $version = bump_asset_version();

    // Purge LiteSpeed cache
    header('X-LiteSpeed-Purge: /data/products.js');
    header('X-LiteSpeed-Purge: /data/products-server.js');
    header('X-LiteSpeed-Purge: /sitemap.xml');
    if ($href !== '') header('X-LiteSpeed-Purge: ' . $href);

    try {
      $pdo = get_pdo($CFG);
      $newSummary = 'deleted';
      if ($href !== '') {
        $newSummary .= ' href=' . $href;
      }
      $newSummary .= ' folder=' . ($folderDeleted ? '1' : '0') . ' sitemap=' . ($sitemapUpdated ? '1' : '0');
      log_admin_activity($pdo, 'PRODUCT:' . $productId, 'admin_product_delete', 'exists', $newSummary, true, 'ok');
    } catch (Throwable $e) {}

    json_out([
      'ok'=>true,
      'id'=>$productId,
      'version'=>$version,
      'purged' => [
        'catalog' => true,
        'catalogServer' => $serverCatalogUpdated,
        'sitemap' => $sitemapUpdated,
        'pageFolder' => $folderDeleted,
      ],
    ]);
    break;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RUTAS DISCOUNT ENGINE — Fase 1
  // Todas las rutas siguientes quedan INACTIVAS con DISCOUNTS_ENABLED=false.
  // No tocan rutas existentes. No se llaman desde ningún flujo de ventas.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * discount_validate — POST
   * Valida un código de descuento contra el catálogo backend.
   * frontend_base_amount es SOLO informativo: el precio real viene del catálogo.
   */
  case 'discount_validate': {
    // ── Guardia feature flag (SIEMPRE PRIMERO, antes de cualquier BD) ────────
    if (!$CFG['discounts_enabled']) {
      json_out(['ok' => false, 'error' => 'feature_disabled'], 503);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    $b = get_json_body();

    $code             = strtoupper(trim((string)($b['code'] ?? '')));
    $sku              = trim((string)($b['sku'] ?? ''));
    $currency         = strtoupper(trim((string)($b['currency'] ?? 'EUR')));
    $paymentMethod    = trim((string)($b['payment_method'] ?? ''));
    $customerEmail    = strtolower(trim((string)($b['customer_email'] ?? '')));
    $frontendBaseAmt  = trim((string)($b['frontend_base_amount'] ?? ''));
    $category         = trim((string)($b['category'] ?? ''));

    if ($code === '')          json_out(['ok'=>false,'error'=>'INVALID_REQUEST','detail'=>'missing_code'], 400);
    if ($sku === '')           json_out(['ok'=>false,'error'=>'INVALID_REQUEST','detail'=>'missing_sku'], 400);
    if ($currency !== 'EUR')   json_out(['ok'=>true,'valid'=>false,'reason_code'=>'CURRENCY_NOT_SUPPORTED','message'=>'Solo se admite EUR en este momento.','pricing_source'=>'backend_discount_engine','pricing_version'=>'v1-discounts']);
    if (!isset(BACKEND_PAYMENT_FEES[$paymentMethod])) {
      json_out(['ok'=>false,'error'=>'INVALID_REQUEST','detail'=>'invalid_payment_method'], 400);
    }
    if ($customerEmail === '') json_out(['ok'=>false,'error'=>'INVALID_REQUEST','detail'=>'missing_customer_email'], 400);

    // ── Lookup precio desde catálogo (fuente de verdad backend) ─────────────
    $productsFile = __DIR__ . '/../data/products.js';
    $catalogEntry = lookup_product_price_by_sku($sku, $productsFile);

    if ($catalogEntry === null) {
      json_out(['ok'=>false,'error'=>'INVALID_REQUEST','detail'=>'sku_not_found_in_catalog'], 400);
    }

    $backendBaseAmt = $catalogEntry['price']; // e.g. '999.00'

    // ── Detección de discrepancia (informativa, no aborta) ───────────────────
    $priceDiscrepancy = false;
    if ($frontendBaseAmt !== '') {
      $diff = abs((float)$frontendBaseAmt - (float)$backendBaseAmt);
      if ($diff > 0.01) {
        $priceDiscrepancy = true;
        error_log("[discount_validate] price_discrepancy: frontend={$frontendBaseAmt} backend={$backendBaseAmt} sku={$sku}");
      }
    }

    // ── Conexión BD y schema ─────────────────────────────────────────────────
    $localPdo = get_pdo($CFG);
    $schemaOk = ensure_discount_schema_safe($localPdo);
    if (!$schemaOk) {
      json_out(['ok'=>false,'error'=>'schema_not_ready','detail'=>'discount tables unavailable'], 503);
    }

    // ── Buscar código ────────────────────────────────────────────────────────
    $now = date('Y-m-d H:i:s');
    $stmt = $localPdo->prepare(
      "SELECT * FROM discount_codes
       WHERE code_normalized = :code AND deleted_at IS NULL
       LIMIT 1"
    );
    $stmt->execute([':code' => $code]);
    $dc = $stmt->fetch();

    $discountResponse = static function(bool $valid, string $reasonCode, string $message) use ($priceDiscrepancy): array {
      return [
        'ok'             => true,
        'valid'          => $valid,
        'reason_code'    => $reasonCode,
        'message'        => $message,
        'price_discrepancy' => $priceDiscrepancy,
        'pricing_source' => 'backend_discount_engine',
        'pricing_version'=> 'v1-discounts',
      ];
    };

    if (!$dc) {
      json_out($discountResponse(false, 'CODE_NOT_FOUND', 'Código de descuento no encontrado.'));
    }

    if (!(bool)$dc['active']) {
      json_out($discountResponse(false, 'CODE_INACTIVE', 'Este código no está activo.'));
    }

    if ($dc['starts_at'] !== null && $dc['starts_at'] > $now) {
      json_out($discountResponse(false, 'CODE_NOT_STARTED', 'Este código todavía no es válido.'));
    }

    if ($dc['ends_at'] !== null && $dc['ends_at'] < $now) {
      json_out($discountResponse(false, 'CODE_EXPIRED', 'Este código ha caducado.'));
    }

    // ── Validar targets si applies_to != all ─────────────────────────────────
    if ($dc['applies_to'] !== 'all') {
      $targetType  = ($dc['applies_to'] === 'selected_products') ? 'sku' : 'category';
      $targetValue = ($dc['applies_to'] === 'selected_products') ? $sku : $category;

      if ($targetValue === '') {
        json_out($discountResponse(false, 'PRODUCT_NOT_ELIGIBLE', 'El producto no es elegible para este descuento.'));
      }

      $stTarget = $localPdo->prepare(
        "SELECT id FROM discount_code_targets
         WHERE discount_code_id = :did AND target_type = :ttype AND target_value = :tvalue
         LIMIT 1"
      );
      $stTarget->execute([':did' => $dc['id'], ':ttype' => $targetType, ':tvalue' => $targetValue]);
      if (!$stTarget->fetch()) {
        $reason = ($dc['applies_to'] === 'selected_products')
          ? 'PRODUCT_NOT_ELIGIBLE'
          : 'CATEGORY_NOT_ELIGIBLE';
        json_out($discountResponse(false, $reason, 'Este producto no es elegible para este código.'));
      }
    }

    // ── Mínimo de pedido ─────────────────────────────────────────────────────
    if ($dc['min_order_amount'] !== null) {
      if ((float)$backendBaseAmt < (float)$dc['min_order_amount']) {
        $minFmt = number_format((float)$dc['min_order_amount'], 2, ',', '.') . ' €';
        json_out($discountResponse(false, 'MIN_ORDER_NOT_REACHED', "El pedido mínimo para este código es {$minFmt}."));
      }
    }

    // ── Límite global de usos ─────────────────────────────────────────────────
    if ($dc['max_redemptions'] !== null) {
      $stCount = $localPdo->prepare(
        "SELECT COUNT(*) FROM discount_redemptions
         WHERE discount_code_id = :did AND status IN ('reserved','consumed')"
      );
      $stCount->execute([':did' => $dc['id']]);
      $usedGlobal = (int)$stCount->fetchColumn();
      if ($usedGlobal >= (int)$dc['max_redemptions']) {
        json_out($discountResponse(false, 'MAX_REDEMPTIONS_REACHED', 'Este código ha alcanzado su límite de usos.'));
      }
    }

    // ── Límite por email ─────────────────────────────────────────────────────
    if ($dc['max_redemptions_per_email'] !== null && $customerEmail !== '') {
      $stEmail = $localPdo->prepare(
        "SELECT COUNT(*) FROM discount_redemptions
         WHERE discount_code_id = :did AND email = :email AND status IN ('reserved','consumed')"
      );
      $stEmail->execute([':did' => $dc['id'], ':email' => $customerEmail]);
      $usedEmail = (int)$stEmail->fetchColumn();
      if ($usedEmail >= (int)$dc['max_redemptions_per_email']) {
        json_out($discountResponse(false, 'MAX_REDEMPTIONS_PER_EMAIL_REACHED', 'Ya has usado este código el máximo de veces permitido.'));
      }
    }

    // ── Calcular breakdown ────────────────────────────────────────────────────
    $breakdown = calc_discount_engine(
      $backendBaseAmt,
      $dc['discount_type'],
      (string)$dc['discount_value'],
      $paymentMethod
    );

    json_out(array_merge([
      'ok'             => true,
      'valid'          => true,
      'code'           => $dc['code'],
      'discount_id'    => (int)$dc['id'],
      'discount_type'  => $dc['discount_type'],
      'discount_value' => $dc['discount_value'],
      'currency'       => $dc['currency'],
      'price_discrepancy' => $priceDiscrepancy,
      'applies_to_product' => $dc['applies_to'] === 'all' || true, // calculado arriba
      'message'        => 'Código aplicado correctamente.',
      'pricing_source' => 'backend_discount_engine',
      'pricing_version'=> 'v1-discounts',
    ], $breakdown));
    break;
  }

  /**
   * order_pricing_preview — POST
   * Devuelve el breakdown de precio con o sin código de descuento.
   * Sin código: breakdown base con fee calculado.
   * Con código: igual que discount_validate pero integrado en un solo call.
   * El precio siempre viene del catálogo backend.
   */
  case 'order_pricing_preview': {
    if (!$CFG['discounts_enabled']) {
      json_out(['ok' => false, 'error' => 'feature_disabled'], 503);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    $b = get_json_body();

    $sku              = trim((string)($b['sku'] ?? ''));
    $currency         = strtoupper(trim((string)($b['currency'] ?? 'EUR')));
    $paymentMethod    = trim((string)($b['payment_method'] ?? ''));
    $discountCode     = strtoupper(trim((string)($b['discount_code'] ?? '')));
    $customerEmail    = strtolower(trim((string)($b['customer_email'] ?? '')));
    $frontendBaseAmt  = trim((string)($b['frontend_base_amount'] ?? ''));
    $category         = trim((string)($b['category'] ?? ''));
    $shippingAmount   = trim((string)($b['shipping_amount'] ?? '0.00'));
    $cartItems        = is_array($b['cart_items'] ?? null) ? $b['cart_items'] : [];

    if ($sku === '' && empty($cartItems)) {
      json_out(['ok' => false, 'error' => 'INVALID_REQUEST', 'detail' => 'missing_sku'], 400);
    }

    $pricing = resolve_order_pricing([
      'sku' => $sku,
      'currency' => $currency,
      'payment_method' => $paymentMethod,
      'discount_code' => $discountCode,
      'customer_email' => $customerEmail,
      'frontend_base_amount' => $frontendBaseAmt,
      'category' => $category,
      'shipping_amount' => $shippingAmount,
      'cart_items' => $cartItems,
    ]);

    if (!$pricing['ok']) {
      json_out([
        'ok' => false,
        'error' => 'pricing_resolution_failed',
        'detail' => implode(',', array_values(array_unique($pricing['errors'] ?? []))),
      ], 400);
    }

    json_out([
      'ok' => true,
      'discount_valid' => $pricing['discount_valid'],
      'discount_code' => $pricing['discount_code'],
      'discount_id' => $pricing['discount_id'],
      'discount_type' => $pricing['discount_type'],
      'discount_value' => $pricing['discount_value'],
      'currency' => $currency,
      'subtotal_amount' => $pricing['subtotal_amount'],
      'discount_amount' => $pricing['discount_amount'],
      'amount_after_discount' => number_format(max(0.0, (float)$pricing['subtotal_amount'] - (float)$pricing['discount_amount']), 2, '.', ''),
      'payment_fee_amount' => $pricing['payment_fee_amount'],
      'shipping_amount' => $pricing['shipping_amount'],
      'total_amount' => $pricing['total_amount'],
      'breakdown' => [
        'subtotal_amount' => $pricing['subtotal_amount'],
        'discount_amount' => $pricing['discount_amount'],
        'amount_after_discount' => number_format(max(0.0, (float)$pricing['subtotal_amount'] - (float)$pricing['discount_amount']), 2, '.', ''),
        'payment_fee_amount' => $pricing['payment_fee_amount'],
        'shipping_amount' => $pricing['shipping_amount'],
        'total_amount' => $pricing['total_amount'],
      ],
      'price_discrepancy' => $pricing['price_discrepancy'],
      'warnings' => $pricing['warnings'],
      'pricing_source' => $pricing['pricing_source'],
      'pricing_version' => $pricing['pricing_version'],
    ]);
    break;
  }

  /**
   * admin_discount_list — GET
   * Lista códigos de descuento. Requiere X-Admin-Key.
   */
  case 'admin_discount_list': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) {
      json_out(['ok'=>false,'error'=>'unauthorized'], 401);
    }

    if (!$CFG['discounts_enabled']) {
      json_out(['ok' => false, 'error' => 'feature_disabled'], 503);
    }

    $localPdo = get_pdo($CFG);
    ensure_discount_schema_safe($localPdo);

    $statusFilter = trim((string)($_GET['status'] ?? 'all'));
    $q            = trim((string)($_GET['q'] ?? ''));
    $page         = max(1, (int)($_GET['page'] ?? 1));
    $perPage      = min(200, max(1, (int)($_GET['per_page'] ?? 50)));
    $offset       = ($page - 1) * $perPage;

    $where  = ['1=1'];
    $params = [];

    if ($statusFilter === 'active') {
      $where[] = 'active = 1 AND deleted_at IS NULL';
    } elseif ($statusFilter === 'inactive') {
      $where[] = 'active = 0 AND deleted_at IS NULL';
    } elseif ($statusFilter === 'deleted') {
      $where[] = 'deleted_at IS NOT NULL';
    } else {
      // all: incluye borrados
    }

    if ($q !== '') {
      $where[] = '(code LIKE :q OR name LIKE :q)';
      $params[':q'] = '%' . $q . '%';
    }

    $whereStr = implode(' AND ', $where);

    $stTotal = $localPdo->prepare("SELECT COUNT(*) FROM discount_codes WHERE {$whereStr}");
    $stTotal->execute($params);
    $total = (int)$stTotal->fetchColumn();

    $params[':limit']  = $perPage;
    $params[':offset'] = $offset;
    $stList = $localPdo->prepare(
      "SELECT dc.id, dc.code, dc.name, dc.discount_type, dc.discount_value,
              dc.currency, dc.active, dc.starts_at, dc.ends_at,
              dc.max_redemptions, dc.deleted_at,
              COUNT(CASE WHEN dr.status IN ('reserved','consumed') THEN 1 END) AS used_redemptions
       FROM discount_codes dc
       LEFT JOIN discount_redemptions dr ON dr.discount_code_id = dc.id
       WHERE {$whereStr}
       GROUP BY dc.id
       ORDER BY dc.created_at DESC
       LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $k => $v) {
      if ($k === ':limit' || $k === ':offset') {
        $stList->bindValue($k, $v, PDO::PARAM_INT);
      } else {
        $stList->bindValue($k, $v);
      }
    }
    $stList->execute();
    $items = $stList->fetchAll();

    foreach ($items as &$item) {
      $item['active']            = (bool)$item['active'];
      $item['used_redemptions']  = (int)$item['used_redemptions'];
      $item['max_redemptions']   = $item['max_redemptions'] !== null ? (int)$item['max_redemptions'] : null;
    }
    unset($item);

    json_out([
      'ok'       => true,
      'items'    => $items,
      'total'    => $total,
      'page'     => $page,
      'per_page' => $perPage,
      'pages'    => (int)ceil($total / $perPage),
    ]);
    break;
  }

  /**
   * admin_discount_detail — GET
   * Detalle de un código de descuento con sus targets. Requiere X-Admin-Key.
   */
  case 'admin_discount_detail': {
    $key = header_get('x-admin-key');
    if ($CFG['admin_key'] === '' || !hash_equals($CFG['admin_key'], $key)) {
      json_out(['ok'=>false,'error'=>'unauthorized'], 401);
    }

    if (!$CFG['discounts_enabled']) {
      json_out(['ok' => false, 'error' => 'feature_disabled'], 503);
    }

    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) json_out(['ok'=>false,'error'=>'INVALID_REQUEST','detail'=>'missing_id'], 400);

    $localPdo = get_pdo($CFG);
    ensure_discount_schema_safe($localPdo);

    $stmt = $localPdo->prepare("SELECT * FROM discount_codes WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $id]);
    $dc = $stmt->fetch();

    if (!$dc) json_out(['ok'=>false,'error'=>'not_found'], 404);

    // Redemptions count
    $stCount = $localPdo->prepare(
      "SELECT COUNT(*) FROM discount_redemptions
       WHERE discount_code_id = :did AND status IN ('reserved','consumed')"
    );
    $stCount->execute([':did' => $id]);
    $dc['used_redemptions']  = (int)$stCount->fetchColumn();
    $dc['active']            = (bool)$dc['active'];
    $dc['stackable']         = (bool)$dc['stackable'];
    $dc['max_redemptions']   = $dc['max_redemptions'] !== null ? (int)$dc['max_redemptions'] : null;
    $dc['max_redemptions_per_email'] = $dc['max_redemptions_per_email'] !== null
      ? (int)$dc['max_redemptions_per_email'] : null;

    // Targets
    $stTargets = $localPdo->prepare(
      "SELECT id, target_type, target_value FROM discount_code_targets
       WHERE discount_code_id = :did ORDER BY target_type, target_value"
    );
    $stTargets->execute([':did' => $id]);
    $dc['targets'] = $stTargets->fetchAll();

    json_out(['ok' => true, 'item' => $dc]);
    break;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FIN RUTAS DISCOUNT ENGINE — Fase 1
  // ══════════════════════════════════════════════════════════════════════════

  default:
    json_out(['ok'=>false,'error'=>'route_not_found'], 404);
}
