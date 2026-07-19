// import-art.js — turn the (gitignored) match_decisions.json artwork-detection verdicts into
// PROPOSED canvas artworks.js entries. Read-only against the canon: writes a review proposal to
// .sptmp/import-proposal.json and prints a sample. NOTHING is merged into artworks.js here.
//
// Mapping (agreed with Fuad):
//   decisions[pick=QID]        -> a SEEN entry (seenAt from venue, seenConfidence from score+venue)
//   loved level "love"         -> floored:true (★)      "like" -> liked:true (♡)
//   loved QID w/o a pick        -> seenConfidence "unsure" (the site's "maybe") + the love mark
//   skip:true                   -> NOT rejected — pending backlog, not imported (counted only)
//   pick_any (versioned works)  -> disambiguate by capture time + neighbour location, else FLAG
//   every QID resolved live via Wikidata (verified, not trusted); non-painting / series dropped.
const fs = require("fs"), path = require("path"), vm = require("vm");
const HERE = __dirname;
const UA = "fuad.au-canvas-importer/1.0 (personal art gallery; contact via github.com/Fuadex)";
const CACHE_PATH = path.join(HERE, "wikidata_cache.json");
let cache = {}; try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")); } catch (e) {}
const saveCache = () => { try { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1)); } catch (e) {} };

// ---- load canon + museums via a window sandbox (same trick fetch-art uses) ----
function evalGlobal(file, prop) {
  const sb = { window: {} }; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(HERE, file), "utf8"), sb, { filename: file });
  return sb.window[prop];
}
const WORKS = evalGlobal("artworks.js", "CANVAS_ARTWORKS") || [];
const MUSEUMS = evalGlobal("museums.js", "CANVAS_MUSEUMS") || [];
const canonQids = new Set(WORKS.filter(w => w.qid).map(w => w.qid));
const museumByQid = {}; MUSEUMS.forEach(m => { if (m.qid) museumByQid[m.qid] = m.id; });
const artistIdByName = {}; WORKS.forEach(w => { if (w.artistId && w.artist) artistIdByName[w.artist.replace(/\s*\(.*\)$/, "").toLowerCase()] = w.artistId; });

// ---- Wikidata ----
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function wd(params) {
  const url = "https://www.wikidata.org/w/api.php?origin=*&format=json&" +
    Object.entries(params).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  await sleep(120);
  return res.json();
}
async function entities(qids) {
  const need = qids.filter(q => q && !cache["ent:" + q]);
  for (let i = 0; i < need.length; i += 50) {
    const batch = need.slice(i, i + 50);
    const j = await wd({ action: "wbgetentities", ids: batch.join("|"), props: "claims|labels|descriptions", languages: "en" });
    for (const q of batch) cache["ent:" + q] = (j.entities && j.entities[q]) || null;
    saveCache();
  }
  const out = {}; for (const q of qids) out[q] = cache["ent:" + q]; return out;
}
const claim = (ent, p) => { const c = ent && ent.claims && ent.claims[p] && ent.claims[p][0]; const v = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value; return v; };
const claimAll = (ent, p) => ((ent && ent.claims && ent.claims[p]) || []).map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter(Boolean);
const yearOf = (t) => t && t.time ? parseInt(t.time.slice(1, 5), 10) : null;
const labelOf = (ent) => ent && ent.labels && ent.labels.en && ent.labels.en.value;
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// instance-of gate: keep genuine works, drop "painting series" umbrellas
const SERIES = new Set(["Q15709879"]);        // painting series
const ARTWORKISH = new Set(["Q3305213", "Q860861", "Q4502142", "Q11060274", "Q93184", "Q125191", "Q179700", "Q838948"]); // painting, sculpture, visual artwork, print, drawing, photograph, statue, work of art

const D = require("./match_decisions.json");

(async () => {
  // 1. collapse decisions: dedupe seen picks by qid (keep highest score), attach venue
  const seen = {};   // qid -> {qid, venueQid, venueLabel, inferred, score, taken_at, photos:[]}
  const backlog = []; const anyCases = [];
  for (const fn in D.decisions) {
    const e = D.decisions[fn];
    if (e.pick_any) { anyCases.push({ fn, e }); continue; }
    if (e.skip || !e.pick) { if (!e.pick) backlog.push(fn); continue; }
    const q = e.pick, p = e.picked || {};
    const cur = seen[q];
    const rec = { qid: q, venueQid: (e.venue && e.venue.qid) || p.venue_qid || null, venueLabel: (e.venue && e.venue.label) || p.venue || null, inferred: !!(e.venue && e.venue.inferred), score: p.score || 0, taken_at: e.taken_at, lat: e.lat, lon: e.lon };
    if (!cur || rec.score > cur.score) seen[q] = Object.assign(rec, { photos: (cur ? cur.photos : []).concat(fn) });
    else cur.photos.push(fn);
  }
  // 2. love overlay + loved-unpicked
  const loveOf = {};   // qid -> "love" | "like"
  for (const q in D.loved) loveOf[q] = D.loved[q].level || "like";
  const lovedUnpicked = Object.keys(D.loved).filter(q => !seen[q]);

  // 3. resolve every needed QID
  const allQids = [...new Set([...Object.keys(seen), ...lovedUnpicked, ...anyCases.flatMap(a => a.e.pick_any)])];
  process.stderr.write(`resolving ${allQids.length} artwork QIDs (${allQids.filter(q => cache["ent:" + q]).length} cached)…\n`);
  const ents = await entities(allQids);
  // creators
  const creatorQids = [...new Set(allQids.map(q => { const v = claim(ents[q], "P170"); return v && v.id; }).filter(Boolean))];
  const cents = await entities(creatorQids);
  // collection labels (for pick_any location reasoning + new-museum notes)
  const collQids = [...new Set(allQids.flatMap(q => claimAll(ents[q], "P195").map(v => v.id)))];
  const collents = await entities(collQids);

  const resolve = (q) => {
    const ent = ents[q]; if (!ent) return { qid: q, drop: "no-entity" };
    const p31 = claimAll(ent, "P31").map(v => v.id);
    if (p31.some(x => SERIES.has(x))) return { qid: q, drop: "painting-series umbrella" };
    const cq = claim(ent, "P170"); const cname = cq && labelOf(cents[cq.id]);
    const title = (claim(ent, "P1476") && claim(ent, "P1476").text) || labelOf(ent) || "(untitled)";
    const artist = cname || "(unknown)";
    const aid = artistIdByName[artist.toLowerCase()] || slug(artist);
    return {
      qid: q, title, artist, artistId: aid,
      year: yearOf(claim(ent, "P571")),
      hasImg: !!claim(ent, "P18"),
      isArtwork: p31.some(x => ARTWORKISH.has(x)) || p31.length === 0,
      collLabels: claimAll(ent, "P195").map(v => labelOf(collents[v.id]) || v.id),
      newArtist: !artistIdByName[artist.toLowerCase()],
    };
  };

  // 4. build proposed entries
  const conf = (s, inferred) => (s >= 0.85 && !inferred) ? "sure" : (s >= 0.75 || !inferred) ? "probably" : "unsure";
  const proposal = [];
  const build = (q, opts) => {
    const r = resolve(q); if (r.drop) return { drop: r.drop, qid: q };
    const lv = loveOf[q];
    const seenAt = opts.venueQid ? (museumByQid[opts.venueQid] || ("NEW:" + opts.venueQid)) : null;
    return {
      id: slug(r.artist + " " + r.title).slice(0, 60), title: r.title, artist: r.artist, artistId: r.artistId, qid: q,
      year: r.year, seenAt, seenConfidence: opts.confidence,
      ...(lv === "love" ? { floored: true } : lv === "like" ? { liked: true } : {}),
      _meta: { score: opts.score, venueLabel: opts.venueLabel, inferred: opts.inferred, hasImg: r.hasImg, isArtwork: r.isArtwork, newArtist: r.newArtist, mergeIntoCanon: canonQids.has(q), collLabels: r.collLabels },
    };
  };
  // Fuad's rule: a committed pick means HE manually confirmed the artwork → always "sure",
  // even on an inferred venue. The ML score is kept in _meta for reference only, never drives conf.
  for (const q in seen) { const s = seen[q]; const b = build(q, { venueQid: s.venueQid, venueLabel: s.venueLabel, inferred: s.inferred, score: s.score, confidence: "sure" }); proposal.push(b); }
  for (const q of lovedUnpicked) { const b = build(q, { venueQid: (D.loved[q].venue_qid) || null, venueLabel: D.loved[q].venue, inferred: true, score: D.loved[q].score || 0, confidence: "unsure" }); if (b) b._meta && (b._meta.lovedUnpicked = true); proposal.push(b); }

  // 5. pick_any disambiguation by capture-time neighbour venue
  const decArr = Object.entries(D.decisions).filter(([, e]) => e.venue && e.venue.qid && e.taken_at).map(([fn, e]) => ({ t: +new Date(e.taken_at), vq: e.venue.qid, vl: e.venue.label }));
  const anyReport = anyCases.map(({ fn, e }) => {
    const t = +new Date(e.taken_at);
    const near = decArr.filter(d => Math.abs(d.t - t) < 90 * 60 * 1000).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    const cands = e.pick_any.map(q => { const r = resolve(q); return { qid: q, title: r.title, coll: r.collLabels, drop: r.drop }; });
    let verdict = "MANUAL — no location signal";
    if (near) {
      const match = cands.find(c => !c.drop && c.coll.some(cl => cl === near.vl || (museumByQid[near.vq] && c.coll.includes(near.vl))));
      verdict = match ? `auto: ${match.qid} (collection matches nearby venue "${near.vl}")` : `MANUAL — near "${near.vl}" but no version's collection matches`;
    }
    return { photo: fn, taken_at: e.taken_at, nearVenue: near ? near.vl : null, candidates: cands, verdict };
  });

  // 6. emit
  const drops = proposal.filter(p => p.drop);
  const good = proposal.filter(p => !p.drop);
  const outPath = path.join(HERE, "..", "..", ".sptmp", "import-proposal.json");
  fs.writeFileSync(outPath, JSON.stringify({ generated: new Date().toISOString(), entries: good, drops, pickAny: anyReport, backlogCount: backlog.length }, null, 1));

  const P = (s) => process.stdout.write(s + "\n");
  P("\n================ IMPORT PROPOSAL (nothing applied) ================");
  P(`decisions: ${Object.keys(D.decisions).length} photos`);
  P(`  → SEEN (committed pick, deduped by artwork): ${Object.keys(seen).length}`);
  P(`  → skip/no-match backlog (kept, NOT imported): ${backlog.length}`);
  P(`  → pick_any versioned works: ${anyCases.length}`);
  P(`loved: ${Object.keys(D.loved).length}  (merged onto a sighting: ${Object.keys(D.loved).length - lovedUnpicked.length}, loved-but-unpicked→"maybe": ${lovedUnpicked.length})`);
  P(`proposed entries: ${good.length}  |  dropped (series/non-art): ${drops.length}  |  already in canon (merge): ${good.filter(p => p._meta.mergeIntoCanon).length}`);
  P(`new artists not yet in canon: ${new Set(good.filter(p => p._meta.newArtist).map(p => p.artistId)).size}`);
  P(`new museums referenced (NEW: prefix): ${new Set(good.map(p => p.seenAt).filter(s => s && s.startsWith("NEW:"))).size}`);

  const mark = (p) => p.floored ? "★loved" : p.liked ? "♡liked" : "·";
  P("\n---- first 20 SEEN entries ----");
  good.filter(p => !p._meta.lovedUnpicked).slice(0, 20).forEach((p, i) => {
    P(`${String(i + 1).padStart(2)}. ${p.title} — ${p.artist}${p.year ? " ("+p.year+")" : ""}`);
    P(`    ${p.qid}  @ ${p._meta.venueLabel || "?"} → seenAt:${p.seenAt}  conf:${p.seenConfidence}${p._meta.inferred ? " (venue inferred)" : ""}  score:${p._meta.score}  ${mark(p)}${p._meta.hasImg ? "" : "  ⚠no-image"}${p._meta.mergeIntoCanon ? "  ⇄already-in-canon" : ""}`);
  });
  P("\n---- 6 loved-but-unpicked (→ 'maybe') ----");
  good.filter(p => p._meta.lovedUnpicked).slice(0, 6).forEach((p) => P(`  ${mark(p)}  ${p.title} — ${p.artist}  ${p.qid}  conf:${p.seenConfidence}`));
  if (drops.length) { P("\n---- dropped ----"); drops.slice(0, 8).forEach(d => P(`  ${d.qid} — ${d.drop}`)); }
  P("\n---- pick_any disambiguation (8) ----");
  anyReport.forEach(a => {
    P(`  ${a.photo}  @${a.taken_at}  near:${a.nearVenue || "—"}`);
    a.candidates.forEach(c => P(`     ${c.qid} "${c.title}"  coll:[${(c.coll || []).join(", ") || "—"}]${c.drop ? " DROP:"+c.drop : ""}`));
    P(`     → ${a.verdict}`);
  });
  P(`\nfull proposal written to .sptmp/import-proposal.json`);
})();
