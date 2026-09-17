// Commits one uploaded image into the repo and returns the path to reference it by.
const { rejected, putFile } = require('./_lib');

const ALLOWED = { png: 1, jpg: 1, jpeg: 1, webp: 1, gif: 1 };
const MAX_BYTES = 4 * 1024 * 1024;

module.exports = async (req, res) => {
  if (rejected(req, res)) return;

  const { filename, base64 } = req.body || {};
  if (!filename || !base64) return res.status(400).json({ error: 'Missing filename or file data' });

  // The filename is attacker-controlled. Take the extension, throw the rest away,
  // and build our own name — so nothing can escape the uploads folder or land as
  // a .html/.js file on the site's own origin.
  const ext = String(filename).split('.').pop().toLowerCase();
  if (!ALLOWED[ext]) {
    return res.status(400).json({ error: 'Only PNG, JPG, WEBP and GIF images are allowed' });
  }

  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length) return res.status(400).json({ error: 'That file appears to be empty' });
  if (bytes.length > MAX_BYTES) {
    return res.status(413).json({ error: 'Image is larger than 4 MB — please shrink it first' });
  }

  const stem = String(filename).replace(/\.[^.]*$/, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image';
  const path = `img/uploads/${Date.now()}-${stem}.${ext}`;

  const r = await putFile(path, bytes.toString('base64'), `Upload ${path} (admin)`);
  if (!r.ok) return res.status(502).json({ error: `GitHub said ${r.status}` });

  res.status(200).json({ path });
};
