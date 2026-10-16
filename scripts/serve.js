// Dependency-free local static server. Production remains a static GitHub Pages site.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')));
const base = options.base ? '/' + options.base.replace(/^\/+|\/+$/g, '') + '/' : '/';
const port = Number(options.port || 9090);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.yaml': 'application/yaml', '.wasm': 'application/wasm' };
const server = createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!requestPath.startsWith(base)) { response.writeHead(404).end(); return; }
    const pathname = '/' + requestPath.slice(base.length);
    if (pathname.split('/').some(part => part.startsWith('.') || part === 'node_modules')) {
      response.writeHead(403).end(); return;
    }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
      response.writeHead(403).end(); return;
    }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': (mime[extname(file)] || 'application/octet-stream') +
      (extname(file) === '.wasm' ? '' : '; charset=utf-8'), 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log('Assessment: http://localhost:' + port + base));
