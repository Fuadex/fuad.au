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
// Venue is GEO-inferred, so the raw qid is often a monument, a room, or a single artwork that
// happens to carry coordinates. Each remap below is backed by SAME-DAY co-location: what else
// the day's photos place Fuad at (see the venue-triage block in import-art.js).
const REMAP = {
  // rooms / wings / sub-museums → their parent institution
  "Q4806644": "agnsw",                  // Asian Gallery, AGNSW
  "Q69545079": "kunstmuseum-basel",     // Kunstmuseum Basel Neubau
  "Q1895953": "pompidou",               // Musée National d'Art Moderne, inside the Centre
  "Q129673434": "nga-dc",               // NGA West Building
  "Q118314575": "nga-dc",               // NGA East Building
  "Q76628637": "lenbachhaus",           // unlabelled Lenbachhaus sub-entity
  "Q130394757": "v-and-a",              // Prince Consort Gallery, inside the V&A
  // artwork-as-venue: the statue/object the geo latched onto, resolved to the museum whose
  // works that same day's photos actually contain
  "Q18156060": "louvre",                // equestrian statue of Louis XIV (Cour Napoléon)
  "Q16959772": "v-and-a",               // V&A Rotunda Chandelier
  "Q23593315": "marmottan",             // Fisherman Bringing back Orpheus' Head
  "Q133867018": "agsa",                 // The Life of Stars
  "Q6746166": "nga-dc",                 // Man Controlling Trade (DC, NGA day)
  "Q3222981": "petit-palais",           // The Fruit
  "Q2586256": "ngv",                    // Larry La Trobe (Melbourne)
  "Q24089142": "alte-nationalgalerie",  // equestrian statue of Friedrich Wilhelm IV
  // DEFUNCT (closed 1976). Corrected 2026-08-19: the July pass sent this to met-nyc on the
  // assumption the Rockefeller primitive-art collection went to the Met — true of the COLLECTION,
  // but all five picks here are MoMA-held works (Nadelman's Man in the Open Air, Hopper's House
  // by the Railroad) photographed on a day spent at MoMA. The old museum's building stood next
  // door to MoMA, which is what the geo caught.
  "Q6940999": "moma",
};
// artwork-as-venue with NO same-day museum to fall back on, plus known geo errors → no seenAt
const VENUE_NULL = new Set([
  "Q19759191",   // Mother and Child: Block Seat (Moore) — only an unresolved neighbour that day
  "Q31407686",   // Leo Castelli Gallery — removed as a geo error in the 2026-07-24 dedupe audit
]);
// clean new museums to create: qid -> id
const NEW_MUS = {
  // carried from the July pass (already created; listed so re-runs stay idempotent)
  "Q194626": "kunstmuseum-basel", "Q15428775": "kunstsalon-franke-schenk",
  "Q812285": "bavarian-state-paintings", "Q262234": "lenbachhaus",
  "Q616676": "museo-fortuny", "Q1059456": "new-york-historical",
  // new in the 2026-08-19 pass
  "Q238587": "npg-london",            // NOTE: distinct from the canon's npg-canberra
  "Q19675": "louvre",
  "Q213322": "v-and-a",
  "Q674773": "science-museum",
  "Q653433": "tokyo-national",
  "Q1359908": "momat",                // National Museum of Modern Art, Tokyo
  "Q1362629": "nmwa-tokyo",           // National Museum of Western Art
  "Q1495745": "neue-kunst-karlsruhe",
  "Q76632158": "tubingen-antiquities",
  "Q11689613": "warsaw-old-town-centre",
  "Q7168281": "aus-performing-arts",
};

const claim = (ent, p) => { const c = ent && ent.claims && ent.claims[p] && ent.claims[p][0]; const v = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value; return v; };
const labelOf = (ent) => ent && ent.labels && ent.labels.en && ent.labels.en.value;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// throttle + exponential backoff, same as import-art.js — Wikidata answers a burst with a
// plaintext "too many requests" body, which JSON.parse would blow up on.
async function wd(params) {
  const url = "https://www.wikidata.org/w/api.php?origin=*&format=json&" + Object.entries(params).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    const body = await r.text();
    await sleep(400);
    if (r.ok && body[0] === "{") { try { return JSON.parse(body); } catch (e) {} }
    const wait = 2000 * Math.pow(2, attempt);
    process.stderr.write(`  ⏳ ${r.status} throttled — backing off ${wait / 1000}s\n`);
    await sleep(wait);
  }
  throw new Error("Wikidata refused after 6 attempts");
}
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
    // A WISH is a want-to-see: it carries the love/like mark and nothing else. Emitting
    // seenAt/seenConfidence on these would assert a sighting that never happened (and before
    // 2026-08-19 would have literally written the string "undefined" into the canon).
    const tail = e.wish
      ? `    wish: true${mark} }`
      : `    seenAt: ${sa ? `"${sa}"` : "null"}, seenConfidence: "${e.seenConfidence}"${mark} }`;
    newLines.push(`  { id: "${esc(id)}", title: "${esc(e.title)}", artist: "${esc(e.artist)}", artistId: "${esc(e.artistId)}", qid: "${e.qid}", qidTrusted: true${yr},\n${tail}`);
  }

  // ---- report ----
  const P = (s) => process.stdout.write(s + "\n");
  P(`\n===== APPLY ${WRITE ? "(WRITING)" : "(DRY RUN)"} =====`);
  P(`new museums: ${newMusRecs.length}`);
  newMusRecs.forEach(m => P(`  + ${m.id}  "${m.name}"  ${m.city}, ${m.country}  visits:[${m.visits.join(",")}]`));
  P(`remaps applied: ${Object.entries(REMAP).map(([q, id]) => q + "→" + id).join(", ")}  | venue-nulled: ${[...VENUE_NULL].join(", ")}`);
  const wishLines = proposal.entries.filter(e => e.wish && !canonByQid[e.qid]).length;
  P(`new artworks: ${newLines.length}  (seen: ${newLines.length - wishLines}, want-to-see: ${wishLines})`);
  P(`merges into canon: ${merges.length}  | dup-skip: ${skippedDup.length}`);
  P(`venues: ${Object.keys(REMAP).length} remapped, ${VENUE_NULL.size} nulled, ${newMusRecs.length} museums created`);
  merges.slice(0, 20).forEach(m => P(`  ⇄ ${m.id} (${m.qid})${m.add ? " + " + m.add : " (no new mark)"}`));
  if (merges.length > 20) P(`  … +${merges.length - 20} more merges`);

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
