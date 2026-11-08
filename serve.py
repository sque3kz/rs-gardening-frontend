"""Local dev server: like `python3 -m http.server`, but answers missing paths with 404.html
(as GitHub Pages / S3 + CloudFront do), so the custom error page can be seen locally.

    python3 serve.py            # http://localhost:8000
    python3 serve.py 8080       # another port
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_error(self, code, message=None, explain=None):
        page = os.path.join(ROOT, f'{code}.html')
        if code not in (404, 500) or not os.path.isfile(page):
            return super().send_error(code, message, explain)
        with open(page, 'rb') as f:
            body = f.read()
        self.send_response(code, message)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('', PORT), Handler) as httpd:
        print(f'Serving {ROOT} at http://localhost:{PORT}  (Ctrl+C to stop)')
        httpd.serve_forever()
