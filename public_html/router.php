<?php
/**
 * Router para el servidor PHP built-in.
 * Simula las reglas de .htaccess (extensión .html limpia).
 *
 * Uso:  php -S localhost:8000 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. Si el archivo existe tal cual, servirlo (CSS, JS, imágenes, HTML directos…)
$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) {
    // Dejar que PHP sirva archivos estáticos con su MIME correcto
    return false;
}

// 2. Si es un directorio y tiene index.html, servirlo
if (is_dir($file)) {
    $index = rtrim($file, '/\\') . '/index.html';
    if (is_file($index)) {
        // Para que PHP sirva PHP embebido o HTML, hacemos include
        header('Content-Type: text/html; charset=UTF-8');
        readfile($index);
        return true;
    }
}

// 3. URL limpia: /pago -> pago.html, /legal -> legal.html, etc.
$htmlFile = __DIR__ . rtrim($uri, '/') . '.html';
if (is_file($htmlFile)) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($htmlFile);
    return true;
}

// 4. Rutas de API (/api/...) -> index.php del API
if (preg_match('#^/api(/|$)#', $uri)) {
    $_SERVER['REQUEST_URI'] = $uri; // mantener la URI original
    include __DIR__ . '/api/index.php';
    return true;
}

// 5. 404
http_response_code(404);
echo '<!DOCTYPE html><html><head><title>404</title></head><body><h1>404 — No encontrado</h1><p><a href="/">Volver al inicio</a></p></body></html>';
return true;
