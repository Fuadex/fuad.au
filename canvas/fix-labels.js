// fix-labels.js — backfill weak labels on freshly-imported artworks: give "(untitled)" entries
// a title from the best available language, and set the two Klee works' creator. In-place,
// anchored by QID. Run with --write to commit.
const fs = require("fs"), path = require("path"), vm = require("vm");
const HERE = __dirname, WRITE = process.argv.includes("--write");
const UA = "fuad.au-canvas/1.0";
const LANGS = ["en", "fr", "de", "it", "es", "nl", "pl", "da"];

const sb = { window: {} }; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(HERE, "artworks.js"), "utf8"), sb);
const WORKS = sb.window.CANVAS_ARTWORKS;
const untitledQids = WORKS.filter(w => w.qid && /^\(untitled\)$/.test(w.title)).map(w => w.qid);
// creator backfills discovered from Wikidata P170 (Q44007 = Paul Klee)
const ARTIST_FIX = { "Q19884088": { artist: "Paul Klee", artistId: "klee" }, "Q20198210": { artist: "Paul Klee", artistId: "klee" } };

(async () => {
  const bestLabel = (e) => {
    const p1476 = e.claims && e.claims.P1476 && e.claims.P1476.find(c => c.mainsnak.datavalue && c.mainsnak.datavalue.value.language === "en");
    if (p1476) return p1476.mainsnak.datavalue.value.text;
    for (const l of LANGS) if (e.labels && e.labels[l]) return e.labels[l].value;
    return null;
  };
  const titleMap = {};
  for (let i = 0; i < untitledQids.length; i += 40) {
    const batch = untitledQids.slice(i, i + 40);
    const j = await (await fetch("https://www.wikidata.org/w/api.php?origin=*&format=json&action=wbgetentities&ids=" + batch.join("|") + "&props=labels|claims&languages=" + LANGS.join("|"), { headers: { "User-Agent": UA } })).json();
    for (const q of batch) { const e = j.entities[q]; const t = e && bestLabel(e); if (t) titleMap[q] = t; }
  }

  let atxt = fs.readFileSync(path.join(HERE, "artworks.js"), "utf8");
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  let tFixed = 0, aFixed = 0; const report = [];
  for (const q in titleMap) {
    const re = new RegExp('title: "\\(untitled\\)"(?=[^\\n]*qid: "' + q + '")');
    if (re.test(atxt)) { atxt = atxt.replace(re, 'title: "' + esc(titleMap[q]) + '"'); tFixed++; report.push(`  ${q}  title → "${titleMap[q]}"`); }
  }
  for (const q in ARTIST_FIX) {
    const f = ARTIST_FIX[q];
    const re = new RegExp('artist: "\\(unknown\\)", artistId: "unknown"(?=[^\\n]*qid: "' + q + '")');
    if (re.test(atxt)) { atxt = atxt.replace(re, `artist: "${f.artist}", artistId: "${f.artistId}"`); aFixed++; report.push(`  ${q}  artist → ${f.artist}`); }
  }

  console.log(`untitled found: ${untitledQids.length} | titles resolved: ${Object.keys(titleMap).length} | title fixes: ${tFixed} | artist fixes: ${aFixed}`);
  report.forEach(r => console.log(r));
  if (WRITE) { fs.writeFileSync(path.join(HERE, "artworks.js"), atxt); console.log("\nWROTE artworks.js"); }
  else console.log("\n(dry run — add --write)");
})();
