// build-beside-candidates.js — companion candidates for the `beside` stage (pipeline step 8).
// A drafter cannot search the store, so this file IS its view of the collection. Two pools per work:
// same-artist rows, and cross-artist TOURED works sharing subject/keyword ground. Every row carries
// the museum, the toured flag and — where one ships — the companion's own Info text, because a
// `beside` may only assert content about a companion that has shipped text behind it.
//
// Wave-9 fix carried forward: `museum` came from seenAt, which is null for wish works, so a strong
// same-artist candidate was un-nameable. Museum now falls back through art_holders and museums.js.
const fs = require('fs');
const C = 'c:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const D = 'c:/Users/Fuad/Documents/GitHub/.dtmp/tourwave29/';
function load(f, k) { global.window = {}; eval(fs.readFileSync(C + f, 'utf8')); return window[k]; }
const A = load('artworks.js', 'CANVAS_ARTWORKS');
const I = load('art_inspect.js', 'CANVAS_INSPECT');
const AB = load('art-about.js', 'CANVAS_ART_ABOUT');
const M = load('museums.js', 'CANVAS_MUSEUMS');
const HO = load('art_holders.js', 'CANVAS_HOLDERS');
const KW = (() => { try { return load('art_keywords.js', 'CANVAS_KEYWORDS'); } catch (e) { return {}; } })();
const SU = (() => { try { return load('art_subjects.js', 'CANVAS_SUBJECTS'); } catch (e) { return {}; } })();
const mus = Object.fromEntries((M || []).map((m) => [m.id, m.name]));
const IDS = JSON.parse(fs.readFileSync(D + 'ids.json', 'utf8'));
const byId = Object.fromEntries(A.map((w) => [w.id, w]));

// ⚠ TWO DIFFERENT FACTS, and conflating them cost this wave real effort. `seenAt` is WHERE FUAD
// STOOD; the holder is WHO CATALOGUES THE WORK. For a work seen on loan they differ, and a `beside`
// is required to name the COMPANION'S MUSEUM — which is the holder. Emit both and let the drafter
// choose; a single `museum` field is what made two drafters read a venue as a holder claim and spend
// a flag arguing with it.
//
// The old fallback here was DEAD CODE: it read `HO[w.id]` where art_holders.js exports
// `{works: {id -> qid}, places: {qid -> {...}}}`, so it never fired and 128 of this wave's 298
// candidates carried no holder at all. Resolve the qid properly.
const musByQid = Object.fromEntries((M || []).filter((m) => m.qid).map((m) => [m.qid, m.name]));
// A "name" that is just a QID is an unresolved label, not a museum — art_holders.js had five of
// them (since repaired at source: the fetch script read only Wikidata's `en` label, and Wikidata
// has been migrating institution names onto `mul`). Never let one reach a drafter as a museum.
const realName = (x) => (x && !/^Q\d+$/.test(String(x))) ? String(x) : '';
const holderOf = (w) => {
  const q = (HO && HO.works) ? HO.works[w.id] : null;
  if (!q) return '';
  if (realName(musByQid[q])) return musByQid[q];
  const pl = (HO && HO.places) ? HO.places[q] : null;
  return pl ? (realName(pl.name) || realName(pl.label) || realName(pl.museum) || '') : '';
};
const seenVenueOf = (w) => {
  const v = Array.isArray(w.seenAt) ? w.seenAt[0] : w.seenAt;
  return (v && mus[v]) ? mus[v] : (v || '');
};
// ⚠ AND A SECOND TRAP, found while testing the first: `art_holders.js` stores ONE qid per work,
// but Wikidata's P195 is MULTI-VALUED, and for a cast, a print or any other multiple it genuinely
// has several true answers. Rodin's `danaid` (Q11855751) lists Musée Rodin, the Finnish National
// Gallery AND the Museo Soumaya, with P186 giving both marble and bronze — the item is the
// COMPOSITION, and three institutions each hold a version. The flattened holder came back "Finnish
// National Gallery", which would have silently overwritten a correct "Musée Rodin" in a drafted
// paragraph with an arbitrary pick from a list.
//
// So `museum` prefers the holder — that is what part 2 of the beside form asks for, and it is what
// recovers a work whose venue was never recorded — but where a holder and a seen venue BOTH exist
// and disagree, the row says so instead of choosing. Prints, casts and other multiples are the
// class this happens to; a drafter seeing `museumUncertain` must check the specific object.
const where = (w) => holderOf(w) || seenVenueOf(w);
const museumUncertain = (w) => {
  const h = holderOf(w), v = seenVenueOf(w);
  return !!(h && v && h !== v);
};
// Terms come from the two curated stores only. Title words were tried first and dropped: they match
// on vocabulary rather than on subject, which is how a scan proposes a companion that shares a word
// and nothing else — the exact failure the refs band was narrowed to avoid.
const terms = (w) => new Set([...(KW[w.id] || []), ...(((SU[w.id] || {}).d) || [])].map((t) => String(t).toLowerCase()));

// Evenly sample n items across a sorted list, so a cap preserves the list's RANGE rather than its
// head. spread(xs, n) === xs when xs is already short enough.
const spread = (xs, n) => xs.length <= n ? xs
  : Array.from({ length: n }, (_, i) => xs[Math.round(i * (xs.length - 1) / (n - 1))]);

const out = {};
for (const id of IDS) {
  const me = byId[id];
  const mine = terms(me);
  const row = (w) => ({
    id: w.id, artist: w.artist, title: w.title, year: w.year, museum: where(w),
    holder: holderOf(w), seenVenue: seenVenueOf(w), museumUncertain: museumUncertain(w) || undefined,
    toured: !!I[w.id], info: AB[w.id] ? AB[w.id].about : null,
  });
  const sameArtist = A.filter((w) => w.id !== id && w.artistId && w.artistId === me.artistId)
    .sort((a, b) => (I[b.id] ? 1 : 0) - (I[a.id] ? 1 : 0)).slice(0, 14).map(row);
  const cross = A.filter((w) => w.id !== id && I[w.id] && w.artistId !== me.artistId)
    .map((w) => ({ w, n: [...terms(w)].filter((t) => mine.has(t)).length }))
    .filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 14).map((x) => ({ ...row(x.w), shared: x.n }));
  // Third pool, added because the subject stores are thin or empty for a third of this wave — three
  // works carry no keyword and no subject term at all, so a term-overlap scan returns nothing and a
  // drafter would be forced into an omission by a gap in the data rather than by the collection.
  // Nearest toured works by date give it something real to weigh; the rhyme still has to be argued.
  // The Hilleström has no year in any record — the museum's dating field is empty and two published
  // estimates differ by twenty years — so it gets the toured eighteenth-century pool instead of a
  // date window. Its own undatedness is a fact about it, not a reason to leave it companionless.
  const period = me.year
    ? A.filter((w) => w.id !== id && I[w.id] && w.artistId !== me.artistId && w.year)
      .map((w) => ({ w, d: Math.abs(w.year - me.year) })).filter((x) => x.d <= 30)
      .sort((a, b) => a.d - b.d).slice(0, 12).map((x) => ({ ...row(x.w), yearsApart: x.d }))
    // ⚠ A CAP APPLIED AFTER AN ASCENDING SORT IS A DATE FILTER WEARING A CAP'S CLOTHING. This
    // branch used `.sort(by year).slice(0, 12)`, which for the undated Hilleström turned a stated
    // 1700–1830 window into "the twelve earliest", cutting off at 1770 — and silently excluding
    // Wright of Derby's The Corinthian Maid (1782), which the drafter went on to choose after
    // searching the corpus index by hand. The dated branch above is fine because it sorts by
    // DISTANCE, so its cap keeps the nearest. With no year there is no distance, so sample EVENLY
    // across the whole window instead of taking one end of it.
    : spread(A.filter((w) => w.id !== id && I[w.id] && w.year && w.year >= 1700 && w.year <= 1830)
      .sort((a, b) => a.year - b.year), 12).map((w) => ({ ...row(w), yearsApart: null }));
  out[id] = { self: row(me), sameArtist, crossArtist: cross, periodToured: period };
}
fs.writeFileSync(D + 'beside_candidates.json', JSON.stringify(out, null, 1));
for (const id of IDS) console.log(String(out[id].sameArtist.length).padStart(3), 'same |', String(out[id].crossArtist.length).padStart(3), 'cross |', String(out[id].periodToured.length).padStart(3), 'period |', id);
