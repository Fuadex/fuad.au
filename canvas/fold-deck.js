// fold-deck.js — folds completed recall-deck exports into artworks.js (the canon).
// Rules: seen:"yes" → canon (sure); seen:"unsure"+love>0 → canon (unsure, hangs faded);
// seen:"no"+love>0 → canon as PILGRIMAGE candidate (seenAt:null, wish:true);
// everything else carries no signal and is skipped. love:1 → liked, love:2 → floored
// (when seen) / loved wish (when not). Deck qids come FROM Wikidata → qidTrusted:true
// (fetch-art fetches them directly, no name-search roulette).
//   node fold-deck.js <deck1.json> [deck2.json …]
const fs = require("fs"), path = require("path"), vm = require("vm");
const FILE = path.join(__dirname, "artworks.js");

const ev = (f, g) => { const c = { window: {} }; vm.createContext(c); vm.runInContext(fs.readFileSync(f, "utf8"), c, { filename: f }); return c.window[g]; };
const existing = ev(FILE, "CANVAS_ARTWORKS");
const haveQids = new Set(existing.map(w => w.qid).filter(Boolean));
const haveIds = new Set(existing.map(w => w.id));

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const surname = (a) => {
  if (/van gogh/i.test(a)) return "van-gogh";
  const parts = a.split(/\s+/); return slug(parts[parts.length - 1]);
};

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: node fold-deck.js <deck.json> …"); process.exit(1); }

const out = [];
for (const f of files) {
  const deck = JSON.parse(fs.readFileSync(f, "utf8"));
  const deckName = path.basename(f, ".json");
  for (const r of deck) {
    if (/collection/i.test(r.title)) { console.log("skip (collection entity):", r.title); continue; }
    const signal = r.seen === "yes" || r.love > 0;
    if (!signal) continue;
    if (haveQids.has(r.qid)) { console.log("skip (already in canon):", r.title); continue; }
    let id = slug(r.title);
    const taken = (x) => haveIds.has(x) || out.some(o => o.id === x);
    if (taken(id)) id = id + "-" + surname(r.artist);
    for (let n = 2; taken(id); n++) id = id.replace(/-\d+$/, "") + "-" + n;
    if (r.year && /^q\d+$/.test(slug(r.title))) id = surname(r.artist) + "-" + r.year;  // unlabeled leftovers
    haveIds.add(id);
    const e = {
      id, title: r.title, artist: r.artist, artistId: surname(r.artist), qid: r.qid, qidTrusted: true,
      year: r.year || null,
      seenAt: r.seen === "no" ? null : r.museum,
      seenConfidence: r.seen === "yes" ? "sure" : r.seen,   // "unsure" stays unsure
    };
    if (r.seen === "no") { e.wish = true; e.at = r.museum; } // pilgrimage candidate; keep holder
    if (r.love === 1) e.liked = true;
    if (r.love === 2) { if (r.seen === "yes") e.floored = true; else { e.liked = true; e.wish = true; } }
    e.note = "Deck pick — " + deckName + ".";
    out.push(e);
  }
}

// serialize compactly, insert before the closing of CANVAS_ARTWORKS
const lines = out.map(e => {
  const parts = [
    `id: ${JSON.stringify(e.id)}`, `title: ${JSON.stringify(e.title)}`, `artist: ${JSON.stringify(e.artist)}`,
    `artistId: ${JSON.stringify(e.artistId)}`, `qid: ${JSON.stringify(e.qid)}`, `qidTrusted: true`,
    `year: ${e.year}`, `seenAt: ${JSON.stringify(e.seenAt)}`, `seenConfidence: ${JSON.stringify(e.seenConfidence)}`,
  ];
  if (e.wish) parts.push("wish: true");
  if (e.liked) parts.push("liked: true");
  if (e.floored) parts.push("floored: true");
  parts.push(`note: ${JSON.stringify(e.note)}`);
  return "  { " + parts.join(", ") + " },";
});
let src = fs.readFileSync(FILE, "utf8");
src = src.replace(/\n\];\n\/\/ seenAt may be/, "\n  // ——— deck-folded picks (fold-deck.js) ———\n" + lines.join("\n") + "\n];\n// seenAt may be");
fs.writeFileSync(FILE, src);
console.log("folded", out.length, "works into artworks.js");
const check = ev(FILE, "CANVAS_ARTWORKS");
console.log("artworks.js loads:", check.length, "entries");
