/* Self-check for the non-obvious logic shared by the site and the editor — the
   bits that would break the guide quietly rather than loudly. Run with:

     npm run check

   Prints "all checks passed" or throws. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalize,
  normalizeRules,
  groupOfSection,
  pickCurrent,
  normalizeHome,
  previewText,
  coverOf,
  findGuide,
  guideKey,
  stripHtml,
  sectionText,
  searchGuides,
} from "../src/lib/content";
import {
  buildCommentTree,
  countComments,
  cleanCommentBody,
  cleanAuthor,
} from "../src/lib/comments";
import { validGuideDoc } from "../src/lib/validate";
import { contentHash, mapTranslations } from "../src/lib/translate-walk";
import type { FlatComment, GuideDoc } from "../src/lib/types";

/* ---- pickCurrent: which section is the reader in? ---- */
const S = [{ id: "a", top: -500 }, { id: "b", top: -100 }, { id: "c", top: 400 }];

assert.equal(pickCurrent(S, 90), "b", "the last section past the header wins");
assert.equal(
  pickCurrent([{ id: "a", top: 300 }], 90),
  "a",
  "before any section is reached, the first one is current"
);
assert.equal(
  pickCurrent([{ id: "a", top: -10 }, { id: "b", top: 90 }], 90),
  "b",
  "a section exactly on the header line counts as reached"
);
assert.equal(
  pickCurrent(
    S.map((s) => ({ id: s.id, top: s.top - 5000 })),
    90
  ),
  "c",
  "scrolled to the bottom, the last section is current"
);
assert.equal(pickCurrent([], 90), null, "no sections, nothing current");

/* ---- normalize: old flat files must keep working ---- */
const oldFlat = {
  page: { eyebrow: "How to Play", title: "Season 3 Guide", intro: "Hello everyone" },
  sections: [{ id: "nien", title: "Nien", blocks: [] }],
};
const n = normalize(JSON.parse(JSON.stringify(oldFlat)));
assert.equal(n.groups.length, 1, "a flat file becomes exactly one topic");
assert.equal(n.groups[0].sections.length, 1, "its sections are carried over");
assert.equal(n.groups[0].intro, "Hello everyone", "the old intro moves onto the topic");
assert.equal((n as unknown as Record<string, unknown>).sections, undefined, "the old flat list is removed");

const already = { page: {}, groups: [{ id: "g", title: "G", sections: [] }] };
assert.equal(normalize(already).groups.length, 1, "normalizing twice changes nothing");

const bare = normalize({ page: {}, groups: [{ id: "g", title: "G" }] });
assert.equal(bare.groups[0].sections.length, 0, "a topic with no sections gets an empty list");

/* ---- rules share the guide shape, with their own default topic ---- */
const emptyRules = normalizeRules({});
assert.equal(emptyRules.groups[0].title, "Alliance Rules", "empty rules get a sensible default topic");
assert.ok(validGuideDoc(emptyRules), "a rules document passes the same save validation as the guide");

/* ---- groupOfSection: deep links must find their topic ---- */
const doc: GuideDoc = {
  groups: [
    {
      id: "s3",
      title: "Season 3",
      sections: [
        { id: "nien", title: "Nien", blocks: [] },
        { id: "map", title: "Map", blocks: [] },
      ],
    },
    {
      id: "s4",
      title: "Season 4",
      sections: [{ id: "intro", title: "Intro", blocks: [] }],
    },
  ],
};
assert.equal(groupOfSection(doc, "map"), 0, "finds a section in the first topic");
assert.equal(groupOfSection(doc, "intro"), 1, "finds a section in a later topic");
assert.equal(groupOfSection(doc, "s4"), 1, "a topic id resolves to that topic");
assert.equal(groupOfSection(doc, "nope"), -1, "an unknown id resolves to nothing");

/* ---- the save endpoint must accept what the editor actually sends ---- */
// This is the check that was missing when a model change (sections -> groups)
// left api/save.js rejecting every real save with a 400.
const live = JSON.parse(readFileSync(new URL("../content/guide.json", import.meta.url), "utf8"));
assert.ok(validGuideDoc(normalize(live)), "the guide file on disk must be one the save endpoint accepts");
assert.ok(
  validGuideDoc(normalizeRules(normalize(live))),
  "the same content is valid as the rules document"
);
assert.ok(
  validGuideDoc(normalize(JSON.parse(JSON.stringify(oldFlat)))),
  "a normalized legacy file must be saveable too"
);

assert.ok(!validGuideDoc(null), "nothing is not a document");
assert.ok(!validGuideDoc({ sections: [] }), "the old flat shape is no longer accepted");
assert.ok(!validGuideDoc({ groups: [{ title: "no sections array" }] }), "a topic must carry a sections list");
assert.ok(validGuideDoc({ groups: [] }), "an empty guide is still a valid document");

/* ---- normalizeHome: partial DB rows must never render a blank page ---- */
const home = normalizeHome(null);
assert.ok(home.hero.title.length, "a missing row still gets a hero title");
assert.equal(home.whatWeDo.cards.length, 3, "default cards survive an empty row");

const partial = normalizeHome({ hero: { title: "New" }, join: { facts: [{ term: "A", detail: "B" }] } });
assert.equal(partial.hero.title, "New", "an edited field wins");
assert.equal(partial.hero.sub, "Alliance Family", "an untouched field keeps its default");
assert.equal(partial.join.facts.length, 1, "a nested array can be replaced wholesale");

/* ---- guide cards: blurb and cover fall back to the content ---- */
assert.equal(previewText({ blocks: [{ type: "text", html: "Hello <strong>all</strong>" }] }), "Hello all", "the blurb strips markup");
assert.equal(previewText({ summary: "Ships", blocks: [{ type: "text", html: "ignored" }] }), "Ships", "an officer summary wins over the first paragraph");
assert.equal(
  previewText({ blocks: [{ type: "text", html: "x".repeat(400) }] }).length <= 161,
  true,
  "a long paragraph is clipped"
);
assert.equal(previewText({ blocks: [{ type: "list", ordered: false, items: ["First thing"] }] }), "First thing", "a list item can be the blurb");
assert.equal(stripHtml("a<br>b"), "a b", "line breaks become spaces");

assert.equal(coverOf({ blocks: [{ type: "figures", items: [{ src: "img/a.webp" }] }] }), "img/a.webp", "the first figure is the fallback cover");
assert.equal(coverOf({ cover: "img/b.webp", blocks: [{ type: "figures", items: [{ src: "img/a.webp" }] }] }), "img/b.webp", "the cover field wins");
assert.equal(coverOf({ blocks: [] }), "", "no image means no cover");

assert.equal(findGuide(doc, "s3", "map")?.section.title, "Map", "findGuide finds a nested guide");
assert.equal(findGuide(doc, "s3", "nope"), null, "an unknown guide id is not found");
assert.equal(findGuide(doc, "nope", "map"), null, "an unknown category id is not found");
assert.equal(guideKey("s3", "map"), "s3/map", "guide keys are stable");

/* ---- search: filters every guide, across categories ---- */
const searchDoc: GuideDoc = {
  groups: [
    {
      id: "c1",
      title: "Basics",
      sections: [
        { id: "g1", title: "Getting started", blocks: [{ type: "text", html: "Build your <strong>city</strong> and farm." }] },
      ],
    },
    {
      id: "c2",
      title: "War",
      sections: [
        { id: "g2", title: "Troop types", blocks: [{ type: "list", ordered: false, items: ["Infantry", "Cavalry", "Archers", "Farms"] }] },
      ],
    },
  ],
};

assert.deepEqual(searchGuides(searchDoc, "   "), [], "a blank query finds nothing");
assert.equal(searchGuides(searchDoc, "cavalry")[0].section.id, "g2", "search looks inside block text");
assert.equal(searchGuides(searchDoc, "CITY")[0].group.id, "c1", "search ignores case");
assert.equal(searchGuides(searchDoc, "troop archers")[0].section.id, "g2", "every word must match");
assert.equal(searchGuides(searchDoc, "cavalry city").length, 0, "words in different guides do not match");
assert.equal(searchGuides(searchDoc, "farm").length, 2, "a match is returned from every category, not just one");
assert.ok(sectionText(searchDoc.groups[1].sections[0]).includes("archers"), "sectionText flattens lists");
assert.ok(!sectionText(searchDoc.groups[0].sections[0]).includes("<strong>"), "sectionText strips markup");

/* ---- comments: flat rows become a nested, ordered thread ---- */
const flat: FlatComment[] = [
  { id: "1", parentId: null, author: "A", body: "root", hearts: 2, createdAt: "2024-01-01T00:00:00Z" },
  { id: "2", parentId: "1", author: "B", body: "reply", hearts: 0, createdAt: "2024-01-03T00:00:00Z" },
  { id: "3", parentId: null, author: "C", body: "second root", hearts: 0, createdAt: "2024-01-02T00:00:00Z" },
];
const tree = buildCommentTree(flat);
assert.equal(tree.length, 2, "two roots");
assert.equal(tree[0].id, "1", "roots are ordered by time");
assert.equal(tree[0].replies.length, 1, "a reply nests under its parent");
assert.equal(tree[0].replies[0].id, "2", "the reply is the right one");
assert.equal(countComments(tree), 3, "replies are counted too");

const orphan = buildCommentTree([{ id: "x", parentId: "gone", author: "A", body: "b", hearts: 0, createdAt: "2024-01-01T00:00:00Z" }]);
assert.equal(orphan.length, 1, "a reply to a missing parent becomes a root rather than vanishing");
assert.equal(buildCommentTree([]).length, 0, "no comments, no thread");

assert.equal(cleanCommentBody("  hello \n\n\n\nworld  "), "hello\n\nworld", "blank lines are collapsed and trimmed");
assert.equal(cleanCommentBody("x".repeat(5000)).length, 4000, "the body length is capped");
assert.equal(cleanAuthor("   "), "Anonymous", "an empty name is not allowed");
assert.equal(cleanAuthor("  Big   Boss "), "Big Boss", "names are tidied");

/* ---- content translation: only prose is touched, structure is preserved ---- */

// Hashes must be stable regardless of key order (jsonb may reorder keys).
assert.equal(
  contentHash({ a: 1, b: { c: "x", d: "y" } }),
  contentHash({ b: { d: "y", c: "x" }, a: 1 }),
  "contentHash ignores object key order"
);
assert.notEqual(contentHash({ a: "one" }), contentHash({ a: "two" }), "contentHash changes with the content");

async function checkTranslation() {
  // A fake translator (no network): marks every string so we can see exactly what
  // the walker considered translatable.
  const mark = async (chunk: string[]) => chunk.map((s) => `«${s}»`);
const srcGuide: GuideDoc = {
  page: { eyebrow: "About", title: "Season 3" },
  groups: [
    {
      id: "nien",
      title: "Nien",
      intro: "<p>Meet <strong>Nien</strong></p>",
      sections: [
        {
          id: "skills",
          nav: "Skills",
          title: "Skills",
          cover: "img/uploads/pic.png",
          blocks: [
            { type: "text", html: "Pick the right skill." },
            { type: "list", ordered: false, items: ["First", "Second"] },
            { type: "figures", items: [{ src: "img/uploads/a.jpg", alt: "A diagram", caption: "The map" }] },
            { type: "table", head: ["Term", "Meaning"], rows: [["Nien", "A hero"]] },
          ],
        },
      ],
    },
  ],
};

const translated = (await mapTranslations(srcGuide, "Testish", mark)) as GuideDoc;

assert.equal(translated.groups[0].id, "nien", "ids are never translated");
assert.equal(translated.groups[0].sections[0].id, "skills", "section ids are never translated");
assert.equal(translated.groups[0].sections[0].cover, "img/uploads/pic.png", "image paths are never translated");
assert.equal(translated.groups[0].sections[0].blocks[2].type, "figures", "block discriminators are never translated");
assert.equal(
  (translated.groups[0].sections[0].blocks[2] as { items: { src: string }[] }).items[0].src,
  "img/uploads/a.jpg",
  "figure src is never translated"
);
assert.equal(translated.groups[0].title, "«Nien»", "titles are translated");
assert.equal(translated.groups[0].intro, "«<p>Meet <strong>Nien</strong></p>»", "html markup is sent intact and preserved");
assert.equal(
  (translated.groups[0].sections[0].blocks[1] as { items: string[] }).items[1],
  "«Second»",
  "list items are translated"
);

// Placeholders/urls are skipped; repeated strings are sent only once.
const calls: string[][] = [];
const counting = async (chunk: string[]) => {
  calls.push(chunk);
  return chunk.map((s) => s.toUpperCase());
};
const dedupSrc = { a: "Hello", b: "Hello", c: "https://discord.gg/x", d: "/guide", e: "4096" };
const dedupOut = (await mapTranslations(dedupSrc, "X", counting)) as Record<string, string>;
assert.equal(calls.length, 1, "one request for a small document");
assert.equal(calls[0].length, 1, "duplicate and non-prose strings are collapsed away");
assert.equal(calls[0][0], "Hello", "only the real prose is sent");
assert.equal(dedupOut.a, "HELLO", "the translation is applied");
assert.equal(dedupOut.b, "HELLO", "every occurrence is translated");
assert.equal(dedupOut.c, "https://discord.gg/x", "urls are left alone");
assert.equal(dedupOut.d, "/guide", "site paths are left alone");
assert.equal(dedupOut.e, "4096", "numbers are left alone");

// Large documents are split so a single request cannot grow without bound.
const bigCalls: number[] = [];
const big = { text: Array.from({ length: 40 }, (_, i) => `Sentence number ${i} with some words.`) };
await mapTranslations(big, "X", async (chunk) => {
  bigCalls.push(chunk.length);
  return chunk;
}, 100);
assert.ok(bigCalls.length > 1, "a long document is chunked into several requests");
assert.equal(
  bigCalls.reduce((a, b) => a + b, 0),
  40,
  "every string is translated across the chunks"
);
}

checkTranslation()
  .then(() => console.log("all checks passed"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });