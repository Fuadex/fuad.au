// Sanity: compute the AlbumView theme roll-up OLD (ROTATION_TRACKTHEMES) vs NEW (fable gist themes)
// for two albums, loading the generated data the same way the client would.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.join(__dirname, "..");
const { slug } = require(path.join(ROOT, "lib-slug"));

// fake window; execute each generated sidecar against it (they all do window.X = ... assigns)
const window = {};
function loadInto(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return false;
  const code = fs.readFileSync(p, "utf8");
  vm.runInNewContext(code, { window });
  return true;
}
loadInto("media-index.js");
loadInto("genius-themes-lazy.js");
// load ALL gist shards (client loads only the album's one bucket; loading all is equivalent for lookup)
for (let b = 0; b < 16; b++) loadInto("about/g-" + String(b).padStart(2, "0") + ".js");

const M = window.ROTATION_MEDIA;
const TT = window.ROTATION_TRACKTHEMES;
const GIST = window.ROTATION_ABOUT_G || {};
const aboutGist = (k) => GIST[k] || null;

// reconstruct an album's played tracks the way AlbumView's `data` memo does (best-plays album row)
function albumData(id) {
  const sep = id.indexOf("~"); const aSlug = id.slice(0, sep), tSlug = id.slice(sep + 1);
  let bestIdx = -1, bestPlays = -1;
  for (let i = 0; i < M.albums.length; i++) {
    const al = M.albums[i];
    if (al[2] > bestPlays && slug(M.artists[al[1]]) === aSlug && slug(al[0]) === tSlug) { bestIdx = i; bestPlays = al[2]; }
  }
  if (bestIdx < 0) return null;
  const al = M.albums[bestIdx], artist = M.artists[al[1]];
  const tracks = [];
  for (const t of M.tracks) if (t[3] === bestIdx) tracks.push({ title: t[0], plays: t[2] });
  return { title: al[0], artist, tracks };
}

function fableRoll(data) {
  const acc = new Map(); let themed = 0, tot = 0;
  for (const t of data.tracks) {
    const g = aboutGist(slug(data.artist) + "~" + slug(t.title));
    const th = g && g.themes;
    if (!th || !th.length) continue;
    themed++; tot += t.plays; acc.set(th[0], (acc.get(th[0]) || 0) + t.plays);
  }
  if (themed < 2 || !tot) return { list: null, themed };
  return { list: [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([theme, p]) => ({ theme, share: Math.round(p / tot * 100) })), themed };
}
function lexRoll(data) {
  if (!TT || !TT._themes) return { list: null, themed: 0 };
  const acc = new Map(); let themed = 0, tot = 0;
  for (const t of data.tracks) {
    const th = TT[slug(data.artist) + "~" + slug(t.title)];
    if (!th || !th.length) continue;
    themed++; tot += t.plays; acc.set(th[0][0], (acc.get(th[0][0]) || 0) + t.plays);
  }
  if (themed < 2 || !tot) return { list: null, themed };
  return { list: [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([i, p]) => ({ theme: TT._themes[i], share: Math.round(p / tot * 100) })), themed };
}
function sentence(list, src) {
  if (!list) return "(no roll-up)";
  const suffix = src === "reads" ? "from the reads" : "lyric themes";
  return "Mostly about " + list[0].theme + (list[1] ? ", with " + list[1].theme : "") + " · " + suffix;
}

for (const id of ["deftones~koi-no-yokan", "system-of-a-down~toxicity"]) {
  const data = albumData(id);
  console.log("\n=== " + id + " ===");
  if (!data) { console.log("  album not found in media-index"); continue; }
  const fable = fableRoll(data), lex = lexRoll(data);
  const pickFable = fable.list && fable.themed >= 2 && fable.themed >= Math.ceil(lex.themed / 2);
  console.log("  tracks played: " + data.tracks.length + " | fable-themed: " + fable.themed + " | lex-themed: " + lex.themed + " | guard(need>=" + Math.ceil(lex.themed / 2) + ") -> " + (pickFable ? "FABLE" : "LEXICON"));
  console.log("  OLD (lexicon): " + sentence(lex.list, "lyric"));
  console.log("  NEW (fable)  : " + sentence(fable.list, "reads"));
  console.log("  SHIPS AS     : " + (pickFable ? sentence(fable.list, "reads") : sentence(lex.list, "lyric")));
}
