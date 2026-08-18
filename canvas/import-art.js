// import-art.js — turn the (gitignored) match_decisions.json artwork-detection verdicts into
// PROPOSED canvas artworks.js entries. Read-only against the canon: writes a review proposal to
// .sptmp/import-proposal.json and prints a sample. NOTHING is merged into artworks.js here.
//
// Mapping (agreed with Fuad):
//   decisions[pick=QID]        -> a SEEN entry (seenAt from venue, seenConfidence from score+venue)
//   loved level "love"         -> floored:true (★)      "like" -> liked:true (♡)
//   loved QID w/o a pick        -> wish:true + the mark, NO seenAt / NO seenConfidence.
//     Fuad's rule (2026-08-19): a MATCHED pick means he stood in front of it. A love/like
//     WITHOUT a match means he liked the candidate the matcher offered — he has NOT seen it.
//     Routing these to seenConfidence "unsure" (the pre-2026-08 behaviour) was fine at 6 rows
//     but would redefine "seen" at 1,000+; they are pilgrimage material, same as deck wishes.
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
// 2026-08-19: this pass resolves ~1,450 qids (vs ~250 in July) and Wikidata starts returning
// a plaintext "too many requests" body partway through. Throttle + exponential backoff on
// any non-JSON / 429 response; the entity cache is flushed per batch so a retry never redoes work.
async function wd(params) {
  const url = "https://www.wikidata.org/w/api.php?origin=*&format=json&" +
    Object.entries(params).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const body = await res.text();
    await sleep(400);
    if (res.ok && body[0] === "{") { try { return JSON.parse(body); } catch (e) {} }
    const wait = 2000 * Math.pow(2, attempt);
    process.stderr.write(`  ⏳ ${res.status} throttled — backing off ${wait / 1000}s (attempt ${attempt + 1}/6)\n`);
    await sleep(wait);
  }
  throw new Error("Wikidata refused after 6 attempts: " + url.slice(0, 120));
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
  // A loved qid counts as SEEN if this run picked it, or the canon already records a sighting.
  // Everything else is a want-to-see (wish), never a sighting.
  const canonSeenQids = new Set(WORKS.filter(w => w.qid && w.seenAt).map(w => w.qid));
  const lovedUnpicked = Object.keys(D.loved).filter(q => !seen[q] && !canonSeenQids.has(q));
  const lovedOnCanonSighting = Object.keys(D.loved).filter(q => !seen[q] && canonSeenQids.has(q));

  // 3. resolve every needed QID
  const allQids = [...new Set([...Object.keys(seen), ...lovedUnpicked, ...lovedOnCanonSighting, ...anyCases.flatMap(a => a.e.pick_any)])];
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
    const seenAt = (opts.kind === "seen" && opts.venueQid) ? (museumByQid[opts.venueQid] || ("NEW:" + opts.venueQid)) : null;
    return {
      id: slug(r.artist + " " + r.title).slice(0, 60), title: r.title, artist: r.artist, artistId: r.artistId, qid: q,
      year: r.year,
      // "seen" carries the sighting; "wish" carries NO sighting fields at all (a want-to-see,
      // not a "maybe I saw it"); "mark" touches neither — the canon row already says where it was seen.
      ...(opts.kind === "seen" ? { seenAt, seenConfidence: opts.confidence } : opts.kind === "wish" ? { wish: true } : {}),
      ...(lv === "love" ? { floored: true } : lv === "like" ? { liked: true } : {}),
      _meta: { kind: opts.kind, score: opts.score, venueLabel: opts.venueLabel, inferred: opts.inferred, hasImg: r.hasImg, isArtwork: r.isArtwork, newArtist: r.newArtist, mergeIntoCanon: canonQids.has(q), collLabels: r.collLabels },
    };
  };
  // Fuad's rule: a committed pick means HE manually confirmed the artwork → always "sure",
  // even on an inferred venue. The ML score is kept in _meta for reference only, never drives conf.
  for (const q in seen) { const s = seen[q]; const b = build(q, { kind: "seen", venueQid: s.venueQid, venueLabel: s.venueLabel, inferred: s.inferred, score: s.score, confidence: "sure" }); proposal.push(b); }
  // want-to-see: loved/liked in the picker but never matched to a photo → wish, no sighting
  for (const q of lovedUnpicked) { const b = build(q, { kind: "wish", score: D.loved[q].score || 0 }); proposal.push(b); }
  // loved a work the canon ALREADY records as seen → mark-merge only, nothing else changes
  for (const q of lovedOnCanonSighting) { const b = build(q, { kind: "mark", score: D.loved[q].score || 0 }); if (b && b._meta) b._meta.markOnly = true; proposal.push(b); }

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

  // 5b. VENUE TRIAGE — every venue qid the picks reference that museums.js does not know.
  // Venue is geo-inferred, so this list reliably contains non-museums (a nearby monument or
  // even a single artwork that happens to carry coordinates), rooms/wings of a museum already
  // in canon, and defunct institutions. Classified here, decided by hand before apply.
  const venueHits = {};
  for (const [fn, e] of Object.entries(D.decisions)) {
    if (!(e.pick || e.pick_any)) continue;
    const v = e.venue; if (!v || !v.qid) continue;
    const k = v.qid;
    (venueHits[k] = venueHits[k] || { qid: k, label: v.label, picks: 0, inferred: 0, known: !!museumByQid[k], dates: new Set() });
    venueHits[k].picks++; if (v.inferred) venueHits[k].inferred++;
    if (e.taken_at) venueHits[k].dates.add(e.taken_at.slice(0, 10));
  }
  const unknownVenues = Object.values(venueHits).filter(v => !v.known);
  // Same-day co-location: a bogus venue (a courtyard statue, a chandelier) was photographed on a
  // day Fuad was demonstrably somewhere else too. Whatever OTHER venue shows up in that day's
  // photos is the real answer — far better than nulling the seenAt and losing the sighting.
  const venuesByDay = {};
  for (const e of Object.values(D.decisions)) {
    if (!e.taken_at || !e.venue || !e.venue.qid) continue;
    const day = e.taken_at.slice(0, 10);
    (venuesByDay[day] = venuesByDay[day] || {});
    const k = e.venue.qid;
    venuesByDay[day][k] = (venuesByDay[day][k] || { qid: k, label: e.venue.label, n: 0 });
    venuesByDay[day][k].n++;
  }
  const sameDayNeighbours = (v) => {
    const acc = {};
    for (const day of v.dates) for (const o of Object.values(venuesByDay[day] || {})) {
      if (o.qid === v.qid) continue;
      acc[o.qid] = acc[o.qid] || { ...o, canon: museumByQid[o.qid] || null, n: 0 };
      acc[o.qid].n += o.n;
    }
    return Object.values(acc).sort((a, b) => b.n - a.n).slice(0, 3);
  };
  const vents = await entities(unknownVenues.map(v => v.qid));
  // P31 classes that mean "this is a place you can visit", vs "this is an object/artwork"
  const PLACEISH = new Set(["Q33506","Q207694","Q1007870","Q2087181","Q3152824","Q1970365","Q24699794","Q28737012","Q2772772","Q1007870","Q17431399","Q839954","Q57660343","Q56245661","Q4989906","Q41176","Q811979","Q16560","Q23413","Q1802963","Q57659271","Q2668072","Q1497364","Q31855","Q43229","Q7075","Q3918"]);
  const OBJECTISH = new Set(["Q3305213","Q860861","Q179700","Q4989906","Q11060274","Q93184","Q125191","Q838948","Q1094229","Q2293362","Q15711026"]);
  const venueTriage = unknownVenues.map(v => {
    const en = vents[v.qid];
    const p31 = claimAll(en, "P31").map(x => x.id);
    const partOf = claimAll(en, "P361").map(x => x.id);   // part of (a wing/room of a bigger museum)
    const loc = claimAll(en, "P276").map(x => x.id);      // located in
    const dissolved = claim(en, "P576");                  // dissolved/abolished date
    const parentInCanon = [...partOf, ...loc].find(x => museumByQid[x]);
    let verdict = "REVIEW";
    if (p31.some(x => OBJECTISH.has(x))) verdict = "ARTWORK-AS-VENUE → null the seenAt";
    else if (parentInCanon) verdict = `WING/ROOM of ${museumByQid[parentInCanon]} → remap`;
    else if (dissolved) verdict = `DEFUNCT (closed ${String(dissolved.time || "").slice(1, 5)}) → impossible, remap or null`;
    else if (p31.some(x => PLACEISH.has(x))) verdict = "NEW MUSEUM → stub it";
    const dates = [...v.dates].sort();
    const neighbours = sameDayNeighbours({ ...v, dates });
    return { ...v, dates, p31, partOf, loc, parentInCanon: parentInCanon ? museumByQid[parentInCanon] : null, label: labelOf(en) || v.label, verdict, neighbours };
  }).sort((a, b) => b.picks - a.picks);

  // 5c. TITLE+ARTIST DEDUPE — a qid-clean entry can still already exist in canon under a
  // different qid (the met-XXXXXX pseudo-qid lesson, 2026-07-24). Match on normalized pairs.
  const normPair = (t, a) => (slug(String(t || "")) + "|" + slug(String(a || ""))).replace(/^the-|-the$/g, "");
  const canonPairs = {}; WORKS.forEach(w => { canonPairs[normPair(w.title, w.artist)] = w; });
  const titleDupes = proposal.filter(p => !p.drop && !p._meta.mergeIntoCanon)
    .map(p => ({ p, hit: canonPairs[normPair(p.title, p.artist)] }))
    .filter(x => x.hit)
    .map(x => ({ qid: x.p.qid, kind: x.p._meta.kind, title: x.p.title, artist: x.p.artist, canonId: x.hit.id, canonQid: x.hit.qid || null }));

  // 6. emit
  const drops = proposal.filter(p => p.drop);
  const good = proposal.filter(p => !p.drop);
  const outPath = path.join(HERE, "..", "..", ".sptmp", "import-proposal.json");
  fs.writeFileSync(outPath, JSON.stringify({ generated: new Date().toISOString(), entries: good, drops, pickAny: anyReport, venueTriage, titleDupes, backlogCount: backlog.length }, null, 1));

  const P = (s) => process.stdout.write(s + "\n");
  P("\n================ IMPORT PROPOSAL (nothing applied) ================");
  P(`decisions: ${Object.keys(D.decisions).length} photos`);
  P(`  → SEEN (committed pick, deduped by artwork): ${Object.keys(seen).length}`);
  P(`  → skip/no-match backlog (kept, NOT imported): ${backlog.length}`);
  P(`  → pick_any versioned works: ${anyCases.length}`);
  const byKind = (k) => good.filter(p => p._meta.kind === k);
  P(`loved: ${Object.keys(D.loved).length}  → on a sighting: ${Object.keys(D.loved).length - lovedUnpicked.length}  |  want-to-see (wish): ${lovedUnpicked.length}`);
  P(`proposed entries: ${good.length}  |  dropped (series/non-art): ${drops.length}  |  already in canon (merge): ${good.filter(p => p._meta.mergeIntoCanon).length}`);
  P(`  by kind →  seen: ${byKind("seen").length}   wish: ${byKind("wish").length}   mark-only: ${byKind("mark").length}`);
  P(`  wish marks →  ★floored: ${byKind("wish").filter(p => p.floored).length}   ♡liked: ${byKind("wish").filter(p => p.liked).length}`);
  P(`new artists not yet in canon: ${new Set(good.filter(p => p._meta.newArtist).map(p => p.artistId)).size}`);
  P(`new museums referenced (NEW: prefix): ${new Set(good.map(p => p.seenAt).filter(s => s && s.startsWith("NEW:"))).size}`);

  const mark = (p) => p.floored ? "★loved" : p.liked ? "♡liked" : "·";
  P("\n---- first 20 SEEN entries ----");
  good.filter(p => !p._meta.lovedUnpicked).slice(0, 20).forEach((p, i) => {
    P(`${String(i + 1).padStart(2)}. ${p.title} — ${p.artist}${p.year ? " ("+p.year+")" : ""}`);
    P(`    ${p.qid}  @ ${p._meta.venueLabel || "?"} → seenAt:${p.seenAt}  conf:${p.seenConfidence}${p._meta.inferred ? " (venue inferred)" : ""}  score:${p._meta.score}  ${mark(p)}${p._meta.hasImg ? "" : "  ⚠no-image"}${p._meta.mergeIntoCanon ? "  ⇄already-in-canon" : ""}`);
  });
  P("\n---- want-to-see sample (wish, no sighting) ----");
  byKind("wish").filter(p => p.floored).slice(0, 8).forEach((p) => P(`  ${mark(p)}  ${p.title} — ${p.artist}  ${p.qid}`));
  if (drops.length) { P("\n---- dropped ----"); drops.slice(0, 8).forEach(d => P(`  ${d.qid} — ${d.drop}`)); }

  P(`\n---- VENUE TRIAGE: ${venueTriage.length} venues on picks that museums.js does not know ----`);
  venueTriage.forEach(v => {
    P(`  ${String(v.picks).padStart(3)} picks  ${v.label}  (${v.qid})${v.inferred ? "  [" + v.inferred + " inferred]" : ""}`);
    P(`        ${v.verdict}${v.dates.length ? "   dates: " + v.dates.slice(0, 3).join(",") + (v.dates.length > 3 ? " +" + (v.dates.length - 3) : "") : ""}`);
    if (v.neighbours.length) P(`        same-day: ${v.neighbours.map(n => `${n.label}${n.canon ? " [" + n.canon + "]" : " (also unknown)"} ×${n.n}`).join("  |  ")}`);
  });

  P(`\n---- TITLE+ARTIST DUPES: ${titleDupes.length} (same work already in canon under another qid) ----`);
  titleDupes.forEach(d => P(`  [${d.kind}] "${d.title}" — ${d.artist}  ${d.qid}  ⇄ canon "${d.canonId}" (${d.canonQid || "no qid"})`));
  P("\n---- pick_any disambiguation (8) ----");
  anyReport.forEach(a => {
    P(`  ${a.photo}  @${a.taken_at}  near:${a.nearVenue || "—"}`);
    a.candidates.forEach(c => P(`     ${c.qid} "${c.title}"  coll:[${(c.coll || []).join(", ") || "—"}]${c.drop ? " DROP:"+c.drop : ""}`));
    P(`     → ${a.verdict}`);
  });
  P(`\nfull proposal written to .sptmp/import-proposal.json`);
})();
