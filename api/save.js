// Commits the edited guide document back to the repo.
const { rejected, putFile } = require('./_lib');

const FILE = 'content/guide.json';

module.exports = async (req, res) => {
  if (rejected(req, res)) return;

  const { doc, sha } = req.body || {};
  if (!doc || !Array.isArray(doc.sections)) {
    return res.status(400).json({ error: 'Missing or malformed guide document' });
  }
  if (!sha) {
    return res.status(400).json({ error: 'Missing file version — reload the editor' });
  }

  const json = JSON.stringify(doc, null, 2) + '\n';
  const r = await putFile(FILE, Buffer.from(json, 'utf8').toString('base64'),
                          'Update guide content (admin)', sha);

  // 409 = the file moved on since we loaded it; never overwrite someone's work.
  if (r.status === 409 || r.status === 422) {
    return res.status(409).json({ error: 'conflict: the guide changed since you loaded it' });
  }
  if (!r.ok) return res.status(502).json({ error: `GitHub said ${r.status}` });

  res.status(200).json({ sha: r.body.content.sha });
};
