import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { sanitizeReading } from './validate.js';
import os from 'node:os';
import { createCollector } from './metrics.js';

const PORT = Number(process.env.PORT) || 3000;
const TOKEN = process.env.DASH_TOKEN || crypto.randomBytes(12).toString('hex');
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

function tokenOk(given) {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  let rel = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

const { CERT, KEY } = process.env;
const server = CERT && KEY
  ? https.createServer({ cert: fs.readFileSync(CERT), key: fs.readFileSync(KEY) }, handler)
  : http.createServer(handler);

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
const dashboards = new Set();
let latest = null;
const pcViewers = new Set();
let latestPc = null;

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  const role = url.searchParams.get('role');
  if (!tokenOk(url.searchParams.get('token')) || (role !== 'sensor' && role !== 'dashboard' && role !== 'pc')) {
    ws.close(1008, 'unauthorized');
    return;
  }
  if (role === 'pc') {
    pcViewers.add(ws);
    if (latestPc) ws.send(JSON.stringify(latestPc));
    ws.on('close', () => pcViewers.delete(ws));
    return;
  }
  if (role === 'dashboard') {
    dashboards.add(ws);
    if (latest) ws.send(JSON.stringify(latest));
    ws.on('close', () => dashboards.delete(ws));
    return;
  }
  ws.on('message', (buf) => {
    let reading;
    try { reading = sanitizeReading(JSON.parse(buf.toString())); } catch { return; }
    if (!reading) return;
    latest = { ...latest, ...reading };
    const msg = JSON.stringify(reading);
    for (const d of dashboards) if (d.readyState === 1) d.send(msg);
  });
});

const collect = createCollector();
setInterval(async () => {
  if (pcViewers.size === 0) return;
  latestPc = await collect();
  const msg = JSON.stringify(latestPc);
  for (const v of pcViewers) if (v.readyState === 1) v.send(msg);
}, 1000);

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
}

server.listen(PORT, () => {
  const scheme = CERT && KEY ? 'https' : 'http';
  console.log(`Dashboard : ${scheme}://localhost:${PORT}/?token=${TOKEN}`);
  console.log(`iPhone    : ${scheme}://<host>:${PORT}/sensor.html?token=${TOKEN}`);
  for (const ip of lanAddresses()) console.log(`iPhone xem PC: ${scheme}://${ip}:${PORT}/pc.html?token=${TOKEN}`);
  if (scheme === 'http') console.log('Lưu ý: Safari trên iPhone chỉ cấp cảm biến/GPS trên HTTPS (xem README).');
});
