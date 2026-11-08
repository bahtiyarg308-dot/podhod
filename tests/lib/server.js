// tiny static file server for the tests: start(port, dir) → { kill() }
const http = require('http'), fs = require('fs'), path = require('path');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.woff2': 'font/woff2' };
exports.start = (port, dir) => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(dir, p); if (!f.startsWith(path.resolve(dir))) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  }).listen(port, '127.0.0.1');
  return { kill: () => srv.close(), close: () => srv.close() };
};
