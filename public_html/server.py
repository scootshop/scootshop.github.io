"""
Servidor local que simula las reglas .htaccess (URLs limpias sin .html).
Uso:  python server.py
Abre:  http://localhost:8000
"""
import http.server
import os
import sys
import urllib.parse

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class RewriteHandler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        # Redirigir /algo.html -> /algo (como hace .htaccess)
        if path.endswith('.html') and path != '/index.html':
            clean = path[:-5]  # quita .html
            if parsed.query:
                clean += '?' + parsed.query
            self.send_response(301)
            self.send_header('Location', clean)
            self.end_headers()
            return

        # Quitar barra final (excepto /)
        if path != '/' and path.endswith('/'):
            check_dir = os.path.join(ROOT, path.lstrip('/').rstrip('/'))
            index_in_dir = os.path.join(check_dir, 'index.html')
            if os.path.isdir(check_dir) and os.path.isfile(index_in_dir):
                # Es directorio real con index.html -> servir
                self.path = path + 'index.html'
                if parsed.query:
                    self.path += '?' + parsed.query
                return super().do_GET()
            # No es directorio -> quitar barra
            clean = path.rstrip('/')
            if parsed.query:
                clean += '?' + parsed.query
            self.send_response(301)
            self.send_header('Location', clean)
            self.end_headers()
            return

        # URL limpia: /pago -> sirve pago.html
        file_path = os.path.join(ROOT, path.lstrip('/'))
        html_path = file_path + '.html'
        if not os.path.isfile(file_path) and not os.path.isdir(file_path) and os.path.isfile(html_path):
            self.path = path + '.html'
            if parsed.query:
                self.path += '?' + parsed.query
            return super().do_GET()

        # Directorio sin barra final con index.html
        if os.path.isdir(file_path):
            index_path = os.path.join(file_path, 'index.html')
            if os.path.isfile(index_path):
                self.path = path.rstrip('/') + '/index.html'
                if parsed.query:
                    self.path += '?' + parsed.query
                return super().do_GET()

        return super().do_GET()


if __name__ == '__main__':
    print(f'  Servidor local en http://localhost:{PORT}')
    print(f'  Raiz: {ROOT}')
    print(f'  Ctrl+C para detener\n')
    with http.server.HTTPServer(('', PORT), RewriteHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServidor detenido.')
            sys.exit(0)
