// build-lists.js — plain-text lists of the Culture library for reading or scraping (Fuad 2026-11-07: "a complete
// list of stuff I've seen and wishlist so Claude can also refer to and find upcoming things I may be interested in").
// Writes seen.md, wishlist.md and culture.json next to this file. Run by CI before staging (sync.yml), so the lists
// always match the committed data; the outputs are gitignored and listed in apps.json's culture deploy array.
// Usage: node culture/build-lists.js
const fs = require('fs'), path = require('path');
const D = __dirname;
const W = {};
for (const f of ['data.js', 'imports.js', 'wishlist.js', 'cast_data.js', 'wishlist_cast.js']) {
  global.window = W;
  eval(fs.readFileSync(path.join(D, f), 'utf8'));
}
const CAST = W.CULTURE_CAST || {}, WCAST = W.CULTURE_WISHLIST_CAST || {};
const today = new Date().toISOString().slice(0, 10);
const MEDIA = ['Movies', 'TV', 'Feature Animation', 'Animated Series', 'Shorts', 'Games', 'Books'];
const mediumOrder = m => { const i = MEDIA.indexOf(m); return i < 0 ? MEDIA.length : i; };
// igdbGenres is a comma-separated STRING ("Shooter, Arcade") on games, in the item or its cast overlay; films carry
// a genres array in the overlay. Spreading the string gave single letters (the 2026-11-07 games bug).
const asList = v => Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\s*,\s*/).filter(Boolean) : [];
const genresOf = (x, cast) => {
  const c = cast[x.id] || {};
  const g = [...asList(c.genres), ...asList(x.igdbGenres), ...asList(c.igdbGenres)];
  return [...new Set(g)].slice(0, 3);
};
const studioOf = (x, cast) => x.medium === 'Games' ? (x.studio || (cast[x.id] || {}).studio || undefined) : undefined;

// SEEN: the curated canon (data.js) plus the imported history (imports.js); a title in both counts once, canon wins.
const seen = [];
const key = x => (x.title + '|' + x.year + '|' + x.medium).toLowerCase();
const have = new Set();
for (const [src, list] of [['canon', W.CULTURE.ITEMS], ['import', W.CULTURE_IMPORTS]]) {
  for (const x of list) {
    if (have.has(key(x))) continue;
    have.add(key(x));
    seen.push({
      title: x.title, enTitle: x.enTitle && x.enTitle !== x.title ? x.enTitle : undefined, year: x.year,
      medium: x.medium, director: x.director || (CAST[x.id] || {}).director || undefined, region: x.region || undefined,
      studio: studioOf(x, CAST), genres: genresOf(x, CAST), rating: x.rating ? Number(x.rating) : undefined, favorite: !!x.favorite,
      watched: x.watchedDate || undefined, curated: src === 'canon',
    });
  }
}
const wish = W.CULTURE_WISHLIST.map(x => {
  const c = WCAST[x.id] || {};
  return {
    title: x.title, enTitle: x.enTitle && x.enTitle !== x.title ? x.enTitle : undefined, year: x.year, medium: x.medium,
    director: x.director || c.director || undefined, region: x.region || c.region || undefined,
    studio: studioOf(x, WCAST), genres: genresOf(x, WCAST), filmwebAvg: x.fwAvg || undefined, added: x.addedDate || undefined,
    selfAdded: x.source === 'own', unreleased: x.year > Number(today.slice(0, 4)) || undefined,
  };
});

const line = r => {
  const name = `**${r.title}**${r.enTitle ? ` (${r.enTitle})` : ''}`;
  const facts = [r.year, r.director, r.studio, r.region && r.region.toUpperCase(), r.genres && r.genres.length ? r.genres.join(', ') : '']
    .filter(Boolean).join(' · ');
  const extra = [];
  if (r.rating) extra.push(`rated ${r.rating}/10`);
  if (r.favorite) extra.push('favourite');
  if (r.watched) extra.push(`seen ${r.watched}`);
  if (r.filmwebAvg) extra.push(`Filmweb ${r.filmwebAvg}`);
  if (r.selfAdded) extra.push('added by hand');
  if (r.added) extra.push(`added ${r.added}`);
  return `- ${name} — ${facts}${extra.length ? ` · ${extra.join(' · ')}` : ''}`;
};
const grouped = (rows, sortFn) => {
  const out = [];
  const media = [...new Set(rows.map(r => r.medium))].sort((a, b) => mediumOrder(a) - mediumOrder(b) || a.localeCompare(b));
  for (const m of media) {
    const rs = rows.filter(r => r.medium === m).sort(sortFn);
    out.push('', `## ${m} (${rs.length})`, ...rs.map(line));
  }
  return out;
};
const byRating = (a, b) => (b.favorite - a.favorite) || ((b.rating || 0) - (a.rating || 0)) || a.title.localeCompare(b.title);
const byYear = (a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title);

const seenMd = [`# Seen — the Culture library (films, TV, animation, games, books)`, '',
  `Generated ${today} · ${seen.length} titles · per medium, favourites first, then by Fuad's own rating (1–10). ` +
  `Wishlist: fuad.au/culture/wishlist.md · both as JSON: fuad.au/culture/culture.json`, ...grouped(seen, byRating)];
const wishMd = [`# Wishlist — what Fuad wants to watch, play or read`, '',
  `Generated ${today} · ${wish.length} titles · per medium, newest release first (unreleased titles at the top). ` +
  `Seen list: fuad.au/culture/seen.md · both as JSON: fuad.au/culture/culture.json`, ...grouped(wish, byYear)];
fs.writeFileSync(path.join(D, 'seen.md'), seenMd.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(D, 'wishlist.md'), wishMd.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(D, 'culture.json'), JSON.stringify({ generated: today, seen, wishlist: wish }) + '\n', 'utf8');
console.log(`culture lists: seen ${seen.length}, wishlist ${wish.length}`);
