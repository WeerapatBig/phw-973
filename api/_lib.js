// Shared helpers for the admin endpoints. Files starting with _ are not routes.
const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'WeerapatBig/phw-973';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const API = 'https://api.github.com';

// Constant-time compare. Hash both sides first so lengths always match —
// comparing raw strings would leak the password length through timing.
function passwordOk(given) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(String(given ?? '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// Returns true if it already sent an error response.
function rejected(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return true;
  }
  if (!process.env.GITHUB_TOKEN || !process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: 'Server is missing ADMIN_PASSWORD or GITHUB_TOKEN' });
    return true;
  }
  if (!passwordOk(req.body && req.body.password)) {
    res.status(401).json({ error: 'Wrong password' });
    return true;
  }
  return false;
}

// The one definition of a usable guide document. save.js and dev-server.js both
// use it, so the local mock cannot drift away from the real endpoint again.
function validDoc(doc) {
  return !!doc && Array.isArray(doc.groups) &&
    doc.groups.every(function (g) { return g && Array.isArray(g.sections); });
}

async function gh(path, options = {}) {
  const r = await fetch(API + path, {
    ...options,
    headers: {
      authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'phw-admin',
      ...(options.headers || {})
    }
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  return { ok: r.ok, status: r.status, body };
}

function getFile(path) {
  return gh(`/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`);
}

function putFile(path, base64, message, sha) {
  return gh(`/repos/${REPO}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: base64, branch: BRANCH, ...(sha ? { sha } : {}) })
  });
}

module.exports = { REPO, BRANCH, rejected, validDoc, gh, getFile, putFile };
