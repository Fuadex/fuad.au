// mine-subjects.js — subject keywords mined from text ALREADY on disk. No API, no model, no cost.
//
// Wikidata's `depicts` is precise but sparse, and it never says "morning" — it lists entities, not
// conditions. Meanwhile the repo already holds a large corpus written specifically about these
// pictures: art-about reads, art_inspect studies, museum-supplied descriptions. If a painting is
// of a storm at dusk, its read almost certainly says so.
//
//   node mine-subjects.js   ->  art_keywords.js  { <work id>: [tag, …] }
//
// Matching is against a CONTROLLED VOCABULARY: many surface forms collapse to one canonical tag,
// so "dusk", "twilight", "setting sun" and "sundown" all become `sunset`. That is what makes the
// search feel semantic later — a query is expanded through the same table, so typing "ocean" finds
// works tagged `sea` whatever word the read happened to use.
//
// Deliberately conservative. Word-boundary matches only, no stemming beyond explicit plurals, and
// NEGATIONS are dropped ("no trees", "without figures") because a read describing an absence would
// otherwise tag the work with the thing it lacks.
const fs = require("fs"), path = require("path");
const HERE = __dirname;

// canonical tag -> the surface forms that mean it
const VOCAB = {
  // time of day
  morning: ["morning", "dawn", "sunrise", "daybreak", "first light", "early light"],
  noon: ["midday", "noon", "high sun"],
  sunset: ["sunset", "dusk", "twilight", "sundown", "setting sun", "evening light", "gloaming"],
  night: ["night", "nocturne", "nocturnal", "moonlight", "moonlit", "starlit", "after dark", "midnight"],
  // weather + air
  rain: ["rain", "rainy", "downpour", "drizzle", "wet street"],
  storm: ["storm", "stormy", "tempest", "squall", "thunder", "lightning", "gale"],
  snow: ["snow", "snowy", "snowfall", "frost", "ice", "icy", "winter"],
  fog: ["fog", "foggy", "mist", "misty", "haze", "hazy", "vapour", "vapor"],
  sunlight: ["sunlight", "sunlit", "sunshine", "blazing sun", "bright sun", "glare"],
  wind: ["wind", "windy", "gust", "breeze", "blowing"],
  // water
  sea: ["sea", "ocean", "marine", "seascape", "surf", "tide", "waves", "wave", "breakers"],
  coast: ["coast", "shore", "beach", "cliff", "harbour", "harbor", "port", "quay", "jetty", "bay"],
  river: ["river", "stream", "brook", "canal", "estuary"],
  lake: ["lake", "pond", "lagoon", "pool", "water lilies", "waterlilies"],
  boat: ["boat", "boats", "ship", "ships", "sail", "sails", "sailing", "vessel", "fishing boat", "regatta"],
  // land
  mountain: ["mountain", "mountains", "peak", "summit", "alpine", "cliffs", "crag"],
  forest: ["forest", "wood", "woods", "woodland", "trees", "tree", "grove", "thicket"],
  field: ["field", "fields", "meadow", "pasture", "wheat", "harvest", "cornfield", "haystack", "farmland"],
  garden: ["garden", "gardens", "orchard", "arbour", "arbor", "terrace"],
  flowers: ["flowers", "flower", "blossom", "bloom", "roses", "rose", "irises", "sunflowers", "poppies", "lilac"],
  // built
  city: ["city", "street", "boulevard", "square", "urban", "rooftops", "pavement", "sidewalk"],
  interior: ["interior", "room", "parlour", "parlor", "studio", "kitchen", "bedroom", "indoors"],
  window: ["window", "windows", "casement", "doorway", "balcony"],
  church: ["church", "cathedral", "chapel", "abbey", "basilica", "altar", "cloister"],
  bridge: ["bridge", "viaduct"],
  train: ["train", "railway", "locomotive", "station", "rails"],
  // figures
  portrait: ["portrait", "sitter", "likeness"],
  selfportrait: ["self-portrait", "self portrait"],
  woman: ["woman", "women", "girl", "lady", "female figure"],
  man: ["man", "men", "boy", "gentleman", "male figure"],
  child: ["child", "children", "infant", "baby", "toddler"],
  crowd: ["crowd", "throng", "gathering", "multitude", "procession"],
  nude: ["nude", "nudes", "naked", "bather", "bathers"],
  dancer: ["dancer", "dancers", "ballet", "dancing"],
  worker: ["worker", "workers", "labour", "labor", "peasant", "peasants", "gleaner", "gleaners", "toil"],
  mother: ["mother", "maternal", "madonna", "nursing"],
  // creatures
  dog: ["dog", "dogs", "hound", "puppy", "greyhound", "spaniel"],
  cat: ["cat", "cats", "kitten"],
  horse: ["horse", "horses", "equestrian", "rider", "mare", "stallion"],
  bird: ["bird", "birds", "crow", "crows", "raven", "swan", "swans", "magpie", "kingfisher", "peacock", "gull"],
  cattle: ["cow", "cows", "cattle", "ox", "oxen", "bull", "sheep", "lamb", "goat"],
  fish: ["fish", "fishes", "crab", "lobster", "shellfish"],
  bigcat: ["lion", "lions", "tiger", "tigers", "leopard", "panther"],
  insect: ["moth", "butterfly", "bee", "beetle", "cicada", "insect"],
  // things
  stilllife: ["still life", "still-life"],
  food: ["bread", "fruit", "apples", "grapes", "wine", "banquet", "feast", "supper", "meal"],
  music: ["music", "musician", "violin", "guitar", "piano", "lute", "singing", "orchestra"],
  book: ["book", "books", "reading", "letter", "writing", "manuscript"],
  mirror: ["mirror", "reflection", "reflected"],
  war: ["war", "battle", "soldier", "soldiers", "army", "siege", "combat", "cavalry"],
  death: ["death", "dying", "corpse", "funeral", "grave", "tomb", "skull", "mourning"],
  religion: ["christ", "crucifixion", "saint", "angel", "angels", "biblical", "annunciation", "nativity", "pieta"],
  myth: ["mythological", "myth", "venus", "apollo", "diana", "nymph", "goddess", "olympus", "titan"],
  // mood
  solitude: ["solitude", "solitary", "alone", "lonely", "loneliness", "isolation"],
  melancholy: ["melancholy", "melancholic", "sorrow", "grief", "despair", "sombre", "somber"],
  serenity: ["serene", "serenity", "calm", "stillness", "tranquil", "quiet"],
  violence: ["violence", "violent", "brutal", "savage", "attack", "struggle"],
  tenderness: ["tenderness", "tender", "intimate", "intimacy", "affection", "embrace"],
};

// a read that says "no figures at all" must not tag the work `man`
const NEG = /\b(no|without|absent|lacking|devoid of|free of|nothing but|never)\s+(\w+\s+){0,2}$/i;

const g = {};
for (const f of ["artworks.js", "art-about.js", "art_inspect.js", "art_data.js"]) {
  try { new Function("window", fs.readFileSync(path.join(HERE, f), "utf8") + "\nreturn window;")(g); }
  catch (e) { console.log("skip " + f + ": " + String(e).slice(0, 60)); }
}
const WORKS = g.CANVAS_ARTWORKS;
const ABOUT = g.CANVAS_ART_ABOUT || {}, INSPECT = g.CANVAS_INSPECT || {};
const AD = (g.CANVAS_ART_DATA && g.CANVAS_ART_DATA.artworks) || {};

// build one searchable blob per work from everything written about it
const textOf = (w) => {
  const bits = [];
  const a = ABOUT[w.id];
  if (a) for (const k of ["about", "deep", "info", "interp"]) if (typeof a[k] === "string") bits.push(a[k]);
  const s = INSPECT[w.id];
  if (s) {
    for (const k of ["see", "about", "craft", "context"]) if (typeof s[k] === "string") bits.push(s[k]);
    for (const d of s.deeper || []) { if (d.t) bits.push(d.t); if (d.body) bits.push(d.body); }
  }
  if (AD[w.id] && AD[w.id].desc) bits.push(AD[w.id].desc);
  if (w.note) bits.push(w.note);
  bits.push(w.title);                       // the title is evidence too ("Water Lilies", "The Magpie")
  return bits.join(" \n ").toLowerCase();
};

const out = {};
let withText = 0, tagged = 0;
const tally = {};
for (const w of WORKS) {
  const text = textOf(w);
  if (text.trim().length < 40) continue;    // title alone is too thin to mine
  withText++;
  const tags = new Set();
  for (const [tag, forms] of Object.entries(VOCAB)) {
    for (const form of forms) {
      const re = new RegExp("\\b" + form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
      let m;
      while ((m = re.exec(text))) {
        if (NEG.test(text.slice(Math.max(0, m.index - 40), m.index))) continue;
        tags.add(tag); break;
      }
      if (tags.has(tag)) break;
    }
  }
  if (!tags.size) continue;
  tagged++;
  out[w.id] = [...tags].sort();
  for (const t of tags) tally[t] = (tally[t] || 0) + 1;
}

fs.writeFileSync(path.join(HERE, "art_keywords.js"),
  "// GENERATED by mine-subjects.js — subject tags mined from text already in the repo (reads,\n" +
  "// studies, museum descriptions, titles). Controlled vocabulary: many surface forms collapse to\n" +
  "// one canonical tag, so a search can expand a query through the same table.\n" +
  "// { <work id>: [tag, …] }\n" +
  "window.CANVAS_KEYWORDS = " + JSON.stringify(out) + ";\n", "utf8");

console.log(`works: ${WORKS.length} · with enough text to mine: ${withText} · tagged: ${tagged}`);
console.log(`vocabulary: ${Object.keys(VOCAB).length} canonical tags from ${Object.values(VOCAB).flat().length} surface forms\n`);
console.log("tag frequency:");
Object.entries(tally).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`  ${String(n).padStart(4)}  ${t}`));
