import http from 'node:http';
import { readFile } from 'node:fs/promises';
const port = Number(process.env.PORT || 8893);
http.createServer(async (req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
  if (req.url !== '/' && !req.url?.startsWith('/?') && req.url !== '/index.html') { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(await readFile(new URL('dist/index.html', import.meta.url)));
}).listen(port, '127.0.0.1', () => console.log(`Tornado Town: http://127.0.0.1:${port}`));
