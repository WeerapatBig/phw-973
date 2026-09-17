// Returns the current guide document plus the git sha it was read at.
const { rejected, getFile } = require('./_lib');

const FILE = 'content/guide.json';

module.exports = async (req, res) => {
  if (rejected(req, res)) return;

  const r = await getFile(FILE);
  if (!r.ok) {
    return res.status(502).json({
      error: r.status === 404
        ? `${FILE} not found in the repository`
        : `GitHub said ${r.status}`
    });
  }

  let doc;
  try {
    doc = JSON.parse(Buffer.from(r.body.content, 'base64').toString('utf8'));
  } catch {
    return res.status(500).json({ error: 'The guide file on GitHub is not valid JSON' });
  }

  res.status(200).json({ doc, sha: r.body.sha });
};
