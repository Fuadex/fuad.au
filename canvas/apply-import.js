// apply-import.js — apply .sptmp/import-proposal.json into museums.js + artworks.js.
// Idempotent-ish: refuses to add a museum id or artwork qid that already exists.
// Run `node apply-import.js` for a DRY RUN (prints what it would do); add `--write` to commit to disk.
const fs = require("fs"), path = require("path"), vm = require("vm");
const HERE = __dirname;
const WRITE = process.argv.includes("--write");
const UA = "fuad.au-canvas-importer/1.0 (personal art gallery; contact via github.com/Fuadex)";
let cache = JSON.parse(fs.readFileSync(path.join(HERE, "wikidata_cache.json"), "utf8"));
const D = require("./match_decisions.json");
const proposal = require(path.join(HERE, "..", "..", ".sptmp", "import-proposal.json"));

// ---- venue remaps (the noisy inferred-venue cleanup, decided with Fuad) ----
const REMAP = { "Q4806644": "agnsw", "Q6940999": "met-nyc", "Q69545079": "kunstmuseum-basel" };
const VENUE_NULL = new Set(["Q133867018", "Q76628637"]);   // artwork-as-venue / unresolved → no seenAt
// clean new museums to create: qid -> id
const NEW_MUS = { "Q194626": "kunstmuseum-basel", "Q15428775": "kunstsalon-franke-schenk", "Q31407686": "leo-castelli", "Q812285": "bavarian-state-paintings", "Q262234": "lenbachhaus", "Q616676": "museo-fortuny", "Q1059456": "new-york-historical" };

const claim = (ent, p) => { const c = ent && ent.claims && ent.claims[p] && ent.claims[p][0]; const v = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value; return v; };
const labelOf = (ent) => ent && ent.labels && ent.labels.en && ent.labels.en.value;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function wd(params) { const url = "https://www.wikidata.org/w/api.php?origin=*&format=json&" + Object.entries(params).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&"); const r = await fetch(url, { headers: { "User-Agent": UA } }); await sleep(120); return r.json(); }
async function ent(q) { if (cache["ent:" + q]) return cache["ent:" + q]; const j = await wd({ action: "wbgetentities", ids: q, props: "claims|labels", languages: "en" }); cache["ent:" + q] = (j.entities && j.entities[q]) || null; fs.writeFileSync(path.join(HERE, "wikidata_cache.json"), JSON.stringify(cache, null, 1)); return cache["ent:" + q]; }

// resolve seenAt for a proposal entry through the remap/new/null rules
function finalSeenAt(sa) {
  if (!sa) return null;
  if (sa.startsWith("NEW:")) { const q = sa.slice(4); if (VENUE_NULL.has(q)) return null; if (REMAP[q]) return REMAP[q]; if (NEW_MUS[q]) return NEW_MUS[q]; return null; }
  return sa; // already a real museum id
}

(async () => {
  // ---- load canon (text preserved for artworks) ----
  const sb = { window: {} }; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(HERE, "museums.js"), "utf8"), sb);
  const MUS = sb.window.CANVAS_MUSEUMS;
  const musIds = new Set(MUS.map(m => m.id));
  const sb2 = { window: {} }; vm.createContext(sb2);
  vm.runInContext(fs.readFileSync(path.join(HERE, "artworks.js"), "utf8"), sb2);
  const WORKS = sb2.window.CANVAS_ARTWORKS;
  const canonByQid = {}; WORKS.forEach(w => { if (w.qid) canonByQid[w.qid] = w; });
  const existingIds = new Set(WORKS.map(w => w.id));

  // ---- visit dates per museum id, from photo EXIF (taken_at) of committed picks ----
  const visitsByMus = {};
  for (const fn in D.decisions) {
    const e = D.decisions[fn]; if (!e.pick || e.skip) continue;
    const sa = finalSeenAt((e.venue && e.venue.qid) ? (musIds.has(e.venue.qid) ? null : ("NEW:" + e.venue.qid)) : null);
    // map via proposal instead (already resolved): handled below per-entry; here use venue qid → id
  }
  // simpler: walk proposal seen entries, use match_decisions taken_at of their photos
  const photoDate = {}; for (const fn in D.decisions) { const t = D.decisions[fn].taken_at; if (t) photoDate[fn] = t.slice(0, 10); }
  // group visit dates by resolved museum for NEW museums only
  for (const e of proposal.entries) {
    const mid = finalSeenAt(e.seenAt); if (!mid) continue;
    const isNew = Object.values(NEW_MUS).includes(mid) && !musIds.has(mid);
    if (!isNew) continue;
    // find photos for this qid
    for (const fn in D.decisions) { if (D.decisions[fn].pick === e.qid && photoDate[fn]) (visitsByMus[mid] = visitsByMus[mid] || new Set()).add(photoDate[fn]); }
  }

  // ---- build new museum records (fetch city/country) ----
  const newMusRecs = [];
  for (const [q, id] of Object.entries(NEW_MUS)) {
    if (musIds.has(id)) continue;
    const en = await ent(q);
    const name = labelOf(en) || id;
    const cQ = claim(en, "P17"); const locQ = claim(en, "P131");
    let country = "?", city = "?";
    if (cQ) { const ce = await ent(cQ.id); const iso = claim(ce, "P297"); country = iso ? String(iso).toLowerCase() : (labelOf(ce) || "?"); }
    if (locQ) { const le = await ent(locQ.id); city = labelOf(le) || "?"; }
    const visits = visitsByMus[id] ? [...visitsByMus[id]].sort() : ["TBC"];
    newMusRecs.push({ id, name, city, country, qid: q, kind: "art", visits, note: "" });
  }

  // ---- build artwork lines (new) + merges ----
  const usedIds = new Set(existingIds);
  const uniqId = (base) => { let id = base, n = 2; while (usedIds.has(id)) id = base + "-" + n++; usedIds.add(id); return id; };
  const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const newLines = []; const merges = []; const skippedDup = [];
  for (const e of proposal.entries) {
    const sa = finalSeenAt(e.seenAt);
    if (canonByQid[e.qid]) { merges.push({ qid: e.qid, id: canonByQid[e.qid].id, add: e.floored ? "floored" : e.liked ? "liked" : null }); continue; }
    const id = uniqId(e.id.replace(/[^a-z0-9-]/g, "").replace(/^-|-$/g, "") || "work-" + e.qid.toLowerCase());
    const mark = e.floored ? ", floored: true" : e.liked ? ", liked: true" : "";
    const yr = e.year ? `, year: ${e.year}` : "";
    const saStr = sa ? `"${sa}"` : "null";
    newLines.push(`  { id: "${esc(id)}", title: "${esc(e.title)}", artist: "${esc(e.artist)}", artistId: "${esc(e.artistId)}", qid: "${e.qid}", qidTrusted: true${yr},\n    seenAt: ${saStr}, seenConfidence: "${e.seenConfidence}"${mark} }`);
  }

  // ---- report ----
  const P = (s) => process.stdout.write(s + "\n");
  P(`\n===== APPLY ${WRITE ? "(WRITING)" : "(DRY RUN)"} =====`);
  P(`new museums: ${newMusRecs.length}`);
  newMusRecs.forEach(m => P(`  + ${m.id}  "${m.name}"  ${m.city}, ${m.country}  visits:[${m.visits.join(",")}]`));
  P(`remaps applied: ${Object.entries(REMAP).map(([q, id]) => q + "→" + id).join(", ")}  | venue-nulled: ${[...VENUE_NULL].join(", ")}`);
  P(`new artworks: ${newLines.length}  | merges into canon: ${merges.length}  | dup-skip: ${skippedDup.length}`);
  merges.forEach(m => P(`  ⇄ ${m.id} (${m.qid})${m.add ? " + " + m.add : " (no new mark)"}`));

  if (!WRITE) { P(`\n(dry run — re-run with --write to apply)`); return; }

  // ---- WRITE museums.js: insert before closing "];" (only if there's something to add) ----
  if (newMusRecs.length) {
    let mtxt = fs.readFileSync(path.join(HERE, "museums.js"), "utf8");
    const musBlock = newMusRecs.map(m => "  " + JSON.stringify(m).replace(/"([a-zA-Z]+)":/g, "$1: ")).join(",\n");
    mtxt = mtxt.replace(/,?\n\];\s*$/, ",\n" + musBlock + "\n];\n");   // ,? absorbs any existing trailing comma
    fs.writeFileSync(path.join(HERE, "museums.js"), mtxt);
  }

  // ---- WRITE artworks.js: append new entries before closing "];", apply merges in place ----
  let atxt = fs.readFileSync(path.join(HERE, "artworks.js"), "utf8");
  // merges: add mark field to the existing entry line(s)
  for (const m of merges) {
    if (!m.add) continue;
    const re = new RegExp(`(qid:\\s*"${m.qid}"[^\\n]*)`);
    if (re.test(atxt) && !new RegExp(`"${m.qid}"[\\s\\S]{0,300}${m.add}:`).test(atxt)) {
      // append the mark right after seenConfidence of that entry's object
      atxt = atxt.replace(new RegExp(`("${m.id}"[\\s\\S]{0,400}?seenConfidence:\\s*"[a-z]+")`), `$1, ${m.add}: true`);
    }
  }
  // artworks.js has a trailing CANVAS_AFFINITY array — insert before the FIRST "\n];" (works close)
  if (newLines.length) atxt = atxt.replace(/,?\n\];/, ",\n" + newLines.join(",\n") + "\n];");   // ,? absorbs existing trailing comma before works-array close
  fs.writeFileSync(path.join(HERE, "artworks.js"), atxt);
  P(`\nWROTE museums.js (+${newMusRecs.length}) and artworks.js (+${newLines.length} new, ${merges.filter(m => m.add).length} merges marked).`);
})();
