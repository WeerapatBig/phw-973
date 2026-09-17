/* Local preview server. Serves the site and stands in for the Vercel /api/*
   functions by reading and writing the files on disk instead of committing to
   GitHub — so you can try the editor before anything goes live.

     node dev-server.js            -> http://localhost:4173  (password: dev)
     ADMIN_PASSWORD=x node dev-server.js

   Not used in production. Vercel runs api/*.js instead. */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 4173;
const PASSWORD = process.env.ADMIN_PASSWORD || 'dev';
const GUIDE = path.join(ROOT, 'content', 'guide.json');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

const shaOf = buf => crypto.createHash('sha1').update(buf).digest('hex');
const send = (res, code, obj) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
};

function readBody(req) {
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => (b += c));
    req.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(null); } });
  });
}

const api = {
  load(body, res) {
    const raw = fs.readFileSync(GUIDE);
    send(res, 200, { doc: JSON.parse(raw), sha: shaOf(raw) });
  },

  save(body, res) {
    const current = fs.readFileSync(GUIDE);
    if (body.sha !== shaOf(current)) {
      return send(res, 409, { error: 'conflict: the guide changed since you loaded it' });
    }
    const json = JSON.stringify(body.doc, null, 2) + '\n';
    fs.writeFileSync(GUIDE, json);
    send(res, 200, { sha: shaOf(Buffer.from(json)) });
  },

  upload(body, res) {
    const ext = String(body.filename).split('.').pop().toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      return send(res, 400, { error: 'Only PNG, JPG, WEBP and GIF images are allowed' });
    }
    const stem = String(body.filename).replace(/\.[^.]*$/, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image';
    const rel = `img/uploads/${Date.now()}-${stem}.${ext}`;
    const abs = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, Buffer.from(body.base64, 'base64'));
    send(res, 200, { path: rel });
  }
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const name = url.pathname.replace(/^\/api\//, '');

  if (url.pathname.startsWith('/api/')) {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const body = await readBody(req);
    if (!body || body.password !== PASSWORD) return send(res, 401, { error: 'Wrong password' });
    if (!api[name]) return send(res, 404, { error: 'No such endpoint' });
    try { return api[name](body, res); }
    catch (e) { return send(res, 500, { error: e.message }); }
  }

  // static files
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const abs = path.join(ROOT, rel);
  if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('Not found');
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(abs)] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  fs.createReadStream(abs).pipe(res);
}).listen(PORT, () => {
  console.log(`PHW site    http://localhost:${PORT}`);
  console.log(`Admin       http://localhost:${PORT}/admin.html   (password: ${PASSWORD})`);
});
