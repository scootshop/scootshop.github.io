<?php
declare(strict_types=1);

/**
 * /api/config.php
 * Configuración centralizada y segura
 * Requiere .env en raíz
 */

// Detectar entorno
$isDev = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
$logPath = getenv('LOG_PATH') ?: '/tmp/';

// Cargar .env
function loadEnv(string $path): void {
  if (!file_exists($path)) return;
  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  foreach ($lines as $line) {
    if ($line[0] === '#') continue;
    [$key, $val] = explode('=', $line, 2) + ['', ''];
    $_ENV[trim($key)] = trim($val);
  }
}

loadEnv(__DIR__ . '/../.env');

// Validar variables requeridas
$required = ['PAYPAL_ENV', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'ADMIN_KEY', 'PUBLIC_BASE'];
foreach ($required as $key) {
  if (!getenv($key)) {
    http_response_code(500);
    die("Error: variable de entorno {$key} no configurada. Copia .env.example a .env");
  }
}

// Configuración
return [
  'paypal_env' => getenv('PAYPAL_ENV'),
  'paypal_business_email' => getenv('PAYPAL_BUSINESS_EMAIL') ?: 'not-configured@example.com',
  'public_base' => rtrim((string)getenv('PUBLIC_BASE'), '/'),
  'admin_key' => (string)getenv('ADMIN_KEY'),
  'mail_from' => getenv('MAIL_FROM') ?: 'noreply@scootshop.co',
  'vercel_email_endpoint' => getenv('VERCEL_EMAIL_ENDPOINT') ?: '',
  'vercel_email_bearer_token' => getenv('VERCEL_EMAIL_BEARER_TOKEN') ?: '',
  'vercel_email_fallback_local' => strtolower((string)(getenv('VERCEL_EMAIL_FALLBACK_LOCAL') ?: 'true')) !== 'false',
  'debug' => getenv('DEBUG') === 'true',
  'log_path' => $logPath,
  
  'db' => [
    'host' => (string)getenv('DB_HOST'),
    'name' => (string)getenv('DB_NAME'),
    'user' => (string)getenv('DB_USER'),
    'pass' => (string)getenv('DB_PASS'),
    'charset' => 'utf8mb4',
  ],
  
  'paypal_action' => (getenv('PAYPAL_ENV') === 'sandbox')
    ? 'https://www.sandbox.paypal.com/cgi-bin/webscr'
    : 'https://www.paypal.com/cgi-bin/webscr',
    
  'paypal_verify' => (getenv('PAYPAL_ENV') === 'sandbox')
    ? 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'
    : 'https://ipnpb.paypal.com/cgi-bin/webscr',
];
