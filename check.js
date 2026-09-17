/* Self-check for the non-obvious logic in render.js — the bits that would break
   the guide quietly rather than loudly. Run it after touching render.js:

     node check.js

   No framework on purpose: it either prints "all checks passed" or throws. */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// render.js is a browser file; give it just enough of a window to load.
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + '/render.js', 'utf8'), sandbox);
const PHW = sandbox.window.PHW;

/* ---- pickCurrent: which section is the reader in? ---- */
const S = [{ id: 'a', top: -500 }, { id: 'b', top: -100 }, { id: 'c', top: 400 }];

assert.strictEqual(PHW.pickCurrent(S, 90), 'b', 'the last section past the header wins');
assert.strictEqual(PHW.pickCurrent([{ id: 'a', top: 300 }], 90), 'a',
  'before any section is reached, the first one is current');
assert.strictEqual(PHW.pickCurrent([{ id: 'a', top: -10 }, { id: 'b', top: 90 }], 90), 'b',
  'a section exactly on the header line counts as reached');
assert.strictEqual(PHW.pickCurrent(S.map(s => ({ id: s.id, top: s.top - 5000 })), 90), 'c',
  'scrolled to the bottom, the last section is current');
assert.strictEqual(PHW.pickCurrent([], 90), null, 'no sections, nothing current');

/* ---- normalize: old flat files must keep working ---- */
const old = {
  page: { eyebrow: 'How to Play', title: 'Season 3 Guide', intro: 'Hello everyone' },
  sections: [{ id: 'nien', title: 'Nien', blocks: [] }]
};
const n = PHW.normalize(JSON.parse(JSON.stringify(old)));
assert.strictEqual(n.groups.length, 1, 'a flat file becomes exactly one topic');
assert.strictEqual(n.groups[0].sections.length, 1, 'its sections are carried over');
assert.strictEqual(n.groups[0].intro, 'Hello everyone', 'the old intro moves onto the topic');
assert.strictEqual(n.sections, undefined, 'the old flat list is removed');

const already = { page: {}, groups: [{ id: 'g', title: 'G', sections: [] }] };
assert.strictEqual(PHW.normalize(already).groups.length, 1, 'normalizing twice changes nothing');

const bare = PHW.normalize({ page: {}, groups: [{ id: 'g', title: 'G' }] });
// length, not deepStrictEqual — the array comes from the sandbox realm, so its
// prototype is not this realm's Array and a deep compare would fail spuriously.
assert.strictEqual(bare.groups[0].sections.length, 0, 'a topic with no sections gets an empty list');

/* ---- groupOfSection: deep links must find their topic ---- */
const doc = {
  groups: [
    { id: 's3', title: 'Season 3', sections: [{ id: 'nien' }, { id: 'map' }] },
    { id: 's4', title: 'Season 4', sections: [{ id: 'intro' }] }
  ]
};
assert.strictEqual(PHW.groupOfSection(doc, 'map'), 0, 'finds a section in the first topic');
assert.strictEqual(PHW.groupOfSection(doc, 'intro'), 1, 'finds a section in a later topic');
assert.strictEqual(PHW.groupOfSection(doc, 's4'), 1, 'a topic id resolves to that topic');
assert.strictEqual(PHW.groupOfSection(doc, 'nope'), -1, 'an unknown id resolves to nothing');

console.log('all checks passed');
