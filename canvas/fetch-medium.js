// fetch-medium.js — per-artwork MEDIUM (what kind of object it is) from Wikidata P31
// (instance of), written to art_medium.js.
//
// Why: the Wall wanted a painting/sculpture/etc filter and nothing in the data supported it —
// art_data's `desc` yields a usable type for only a handful of works (the rest are empty or
// "(trusted deck qid)"). P31 is the real signal.
//
//   node fetch-medium.js            (resumable; cache-committed in medium_cache.json)
//
// TWO LEVELS (Fuad 2026-08-19: "full wikidata granularity — but we do fold under the 5 buckets
// as default, we just want the extra granularity for future sake"):
//
//   window.CANVAS_MEDIUM[workId] = [bucket, kindLabel, p31Qid]
//
//   bucket    one of the 5 facet chips the Wall renders — painting | sculpture | paper |
//             object | photo. Null when nothing could be decided (never guessed).
//   kindLabel the RAW English label of the work's first P31 — "oil painting", "bronze
//             sculpture", "woodblock print", "funerary stele". This is the granular layer:
//             nothing in the UI reads it today, it is banked for later.
//   p31Qid    the P31 itself, so the granular layer stays joinable to Wikidata.
//
// Bucketing is curated by qid where it matters and falls back to matching the LABEL, so a P31
// nobody has seen before ("panel painting", "marble sculpture") still lands correctly instead of
// dropping out. Anything still undecided keeps its label and gets a null bucket — visible in the
// report, never silently guessed.
const fs = require("fs"), path = require("path");
const HERE = __dirname;
const UA = { "User-Agent": "fuad.au-canvas/0.1 (https://fuad.au; fuadex@gmail.com)" };
const CACHE = path.join(HERE, "medium_cache.json");
const LABELS = path.join(HERE, "medium_labels.json");   // P31 qid -> English label

// ── the five facet buckets ────────────────────────────────────────────────────────────────
// Curated P31 -> bucket for the cases where the label alone is ambiguous or absent.
const BUCKET_BY_QID = {
  Q3305213: "painting", Q1028181: "painting", Q22669139: "painting",   // painting / fresco
  Q219423: "painting", Q48498: "painting",                             // mural / altarpiece
  Q860861: "sculpture", Q179700: "sculpture", Q1400264: "sculpture",   // sculpture / statue
  Q245117: "sculpture", Q17489160: "sculpture",                        // bust / relief-ish
  Q93184: "paper", Q11060274: "paper", Q18219090: "paper", Q11835431: "paper",
  Q15123870: "paper", Q18761202: "paper", Q133067: "paper",            // drawing/print/litho/etch/engraving
  Q87167: "paper", Q213283: "paper",                                   // manuscript / illuminated ms
  Q125191: "photo", Q13333778: "photo", Q11424: "photo", Q20937557: "photo",
  Q10855061: "object", Q220659: "object", Q11642: "object", Q1063071: "object",
  Q184296: "object", Q131557: "object", Q2264296: "object", Q20437094: "object",
  Q4989906: "object", Q811979: "object", Q7748: "object", Q7377: "object",
  // widened after the 2026-08-19 import surfaced them in the unbucketed tail
  Q12043905: "paper",      // pastel artwork — pigment on paper, sits with drawings
  Q55633069: "paper",      // shigajiku (Japanese poem-and-painting hanging scroll)
  Q11497168: "paper",      // tekagami (calligraphy album)
  Q11813560: "paper",      // stencil
  Q28890616: "sculpture",  // group of casts
  Q20350: "sculpture",     // moai
  Q155987: "sculpture",    // quadriga
  Q448190: "object",       // cage cup
  Q164099: "object",       // hoard
  Q207697: "object",       // diorama
  Q11381412: "object",     // traditional handicraft of Japan
};
// P31s that mean the row is NOT a single artwork — an institution, a collection, a show, or an
// umbrella over many executions. Never bucketed; reported instead, because a canon row landing
// here is usually a bad import rather than a medium we failed to classify.
const NOT_A_WORK = {
  Q33506: "museum", Q7328910: "art collection", Q2982955: "public collection",
  Q667276: "art exhibition", Q29023906: "temporary exhibition",
  Q15709879: "painting series", Q18020205: "series of images",
  Q28886448: "work with multiple executions", Q838948: "work of art (too generic)",
};
// Label fallback — ordered, first hit wins. Keeps unseen P31s from dropping out.
const BUCKET_BY_LABEL = [
  [/\b(painting|fresco|mural|altarpiece|panel painting|triptych|diptych|tondo)\b/i, "painting"],
  [/\b(sculpture|statue|statuette|bust|relief|figurine|monument|memorial|carving|bronze)\b/i, "sculpture"],
  [/\b(drawing|print|etching|engraving|lithograph|woodcut|woodblock|watercolou?r|sketch|study|poster|manuscript|codex|illustration|miniature)\b/i, "paper"],
  [/\b(photograph|photo|daguerreotype|film|video|moving image)\b/i, "photo"],
  [/\b(vase|ceramic|pottery|amphora|krater|jewel|jewellery|coin|medal|artefact|artifact|tapestry|mosaic|installation|furniture|armour|armor|helmet|mask|stele|sarcophagus|urn|vessel|textile|costume|instrument|clock|glass|silver|porcelain)\b/i, "object"],
];
const bucketOf = (qid, label) => {
  if (NOT_A_WORK[qid]) return null;          // never let an institution/series match on its label
  if (BUCKET_BY_QID[qid]) return BUCKET_BY_QID[qid];
  for (const [re, b] of BUCKET_BY_LABEL) if (label && re.test(label)) return b;
  return null;
};

const load = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return fb; } };
const cache = load(CACHE, {});          // artwork qid -> [p31 qids]  (legacy values coerced below)
const labels = load(LABELS, {});        // p31 qid -> label

// canon rows via node (single source of truth for parsing)
const w = {};
new Function("window", fs.readFileSync(path.join(HERE, "artworks.js"), "utf8") + "\nreturn window;")(w);
const WORKS = w.CANVAS_ARTWORKS;
// art_data desc is the last-resort signal for works Wikidata gives no P31 at all
// ("painting by Claude Monet, National Gallery of Art").
const ad = {};
try { new Function("window", fs.readFileSync(path.join(HERE, "art_data.js"), "utf8") + "\nreturn window;")(ad); } catch (e) {}
const DESC = (ad.CANVAS_ART_DATA && ad.CANVAS_ART_DATA.artworks) || {};

// The old cache stored either a resolved string ("painting") or {unmapped:[...]}. Both lose the
// raw P31 list we now want, so anything not already an array is refetched.
const cachedP31 = (qid) => (Array.isArray(cache[qid]) ? cache[qid] : null);
const todo = [...new Set(WORKS.filter(x => x.qid && !cachedP31(x.qid)).map(x => x.qid))];
console.log(`${WORKS.length} works · ${todo.length} qids to fetch · ${Object.keys(cache).filter(k => Array.isArray(cache[k])).length} cached`);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// throttle + exponential backoff: a burst gets a PLAINTEXT 429 body that .json() chokes on
async function api(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: UA });
    const body = await res.text();
    await sleep(350);
    if (res.ok && body[0] === "{") { try { return JSON.parse(body); } catch (e) {} }
    const wait = 2000 * Math.pow(2, attempt);
    console.log(`  ⏳ ${res.status} throttled — backing off ${wait / 1000}s`);
    await sleep(wait);
  }
  throw new Error("Wikidata refused after 6 attempts");
}

(async () => {
  // ── pass 1: P31 claims per artwork ──────────────────────────────────────────────────────
  for (let i = 0; i < todo.length; i += 45) {
    const batch = todo.slice(i, i + 45);
    const j = await api("https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&format=json&ids=" + batch.join("|"));
    for (const qid of batch) {
      const ent = j.entities && j.entities[qid];
      const claims = (ent && ent.claims && ent.claims.P31) || [];
      cache[qid] = claims.map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id).filter(Boolean);
    }
    fs.writeFileSync(CACHE, JSON.stringify(cache));
    console.log(`  P31 ${Math.min(i + 45, todo.length)}/${todo.length}`);
  }

  // ── pass 2: English labels for every distinct P31 in the corpus (the granular layer) ────
  const allP31 = [...new Set(WORKS.flatMap(x => cachedP31(x.qid) || []))].filter(q => !(q in labels));
  console.log(`${allP31.length} P31 types need labels`);
  for (let i = 0; i < allP31.length; i += 45) {
    const batch = allP31.slice(i, i + 45);
    const j = await api("https://www.wikidata.org/w/api.php?action=wbgetentities&props=labels&languages=en&format=json&ids=" + batch.join("|"));
    for (const qid of batch) {
      const ent = j.entities && j.entities[qid];
      labels[qid] = (ent && ent.labels && ent.labels.en && ent.labels.en.value) || null;
    }
    fs.writeFileSync(LABELS, JSON.stringify(labels, null, 1));
    console.log(`  labels ${Math.min(i + 45, allP31.length)}/${allP31.length}`);
  }

  // ── emit ────────────────────────────────────────────────────────────────────────────────
  const out = {};
  let viaP31 = 0, viaDesc = 0, undecided = 0, noQid = 0;
  const unresolved = {};
  for (const wk of WORKS) {
    if (!wk.qid) { noQid++; continue; }
    const p31s = cachedP31(wk.qid) || [];
    // first P31 that buckets wins; if none bucket, still keep the first one's label
    let picked = null;
    for (const q of p31s) { const b = bucketOf(q, labels[q]); if (b) { picked = [b, labels[q] || null, q]; break; } }
    if (!picked && p31s.length) picked = [null, labels[p31s[0]] || null, p31s[0]];
    if (picked && picked[0]) viaP31++;
    if (!picked || !picked[0]) {
      // last resort: art_data's own description sentence
      const d = (DESC[wk.id] && DESC[wk.id].desc) || "";
      const m = d.match(/^(oil painting|painting|sculpture|statue|drawing|print|etching|engraving|lithograph|photograph|fresco|mural|tapestry|manuscript)\b/i);
      if (m) { const kind = m[1].toLowerCase(); picked = [bucketOf(null, kind), kind + " (from description)", picked ? picked[2] : null]; viaDesc++; }
      else if (picked) { undecided++; (unresolved[picked[2]] = unresolved[picked[2]] || { label: picked[1], n: 0 }).n++; }
    }
    if (picked) out[wk.id] = picked;
  }

  fs.writeFileSync(path.join(HERE, "art_medium.js"),
    "// GENERATED by fetch-medium.js — per-work medium from Wikidata P31 (instance of).\n" +
    "// { <work id>: [bucket, kindLabel, p31Qid] }\n" +
    "//   bucket    painting | sculpture | paper | object | photo  (null = undecided, never guessed)\n" +
    "//   kindLabel the RAW P31 English label, kept for granularity the UI does not use yet\n" +
    "//   p31Qid    so that granular layer stays joinable back to Wikidata\n" +
    "window.CANVAS_MEDIUM = " + JSON.stringify(out) + ";\n", "utf8");

  const tally = {};
  for (const v of Object.values(out)) tally[v[0] || "(undecided)"] = (tally[v[0] || "(undecided)"] || 0) + 1;
  console.log(`\nworks: ${WORKS.length} | bucketed via P31: ${viaP31} | via description: ${viaDesc} | undecided: ${undecided} | no qid: ${noQid}`);
  console.log("buckets:", Object.entries(tally).sort((a, b) => b[1] - a[1]).map(r => r[0] + ":" + r[1]).join("  "));
  const kinds = {};
  for (const v of Object.values(out)) if (v[1]) kinds[v[1]] = (kinds[v[1]] || 0) + 1;
  console.log("\ntop granular kinds:", Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 18).map(r => `${r[0]}:${r[1]}`).join("  "));
  const un = Object.entries(unresolved).sort((a, b) => b[1].n - a[1].n);
  if (un.length) console.log("\nUNBUCKETED P31s (widen BUCKET_BY_QID/LABEL if any matter):\n" + un.slice(0, 20).map(([q, v]) => `  ${String(v.n).padStart(4)}  ${q}  ${v.label || "(no label)"}`).join("\n"));

  // rows whose P31 says they are not a single artwork — worth a human look, not a medium
  const suspect = WORKS.filter(wk => (cachedP31(wk.qid) || []).some(q => NOT_A_WORK[q]));
  if (suspect.length) {
    console.log(`\nNOT-AN-ARTWORK rows (${suspect.length}) — P31 says institution / collection / series:`);
    suspect.forEach(wk => {
      const hit = (cachedP31(wk.qid) || []).find(q => NOT_A_WORK[q]);
      console.log(`  ${wk.id}  "${wk.title}" — ${wk.artist}  [${wk.qid}] → ${NOT_A_WORK[hit]}`);
    });
  }
})();
