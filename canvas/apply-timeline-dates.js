// apply-timeline-dates.js — one-off: folds visit dates deduced from the Google Timeline
// coordinate-match (.sptmp/location/museum-visits.json) into museums.js `visits` fields.
// Review the diff after running; museums.js stays the hand-authored source of truth.
const fs = require("fs"), vm = require("vm"), path = require("path");
const FILE = path.join(__dirname, "museums.js");
let src = fs.readFileSync(FILE, "utf8");

const dates = {
  "artizon": ["2026-03-24"],
  "tokyo-met": ["2026-01-28", "2026-02-15"],
  "met-nyc": ["2019-02-27"],
  "amnh": ["2019-03-20"],
  "orsay": ["2017-01-15", "2023-09-06", "2023-09-22", "2024-05-23"],
  "orangerie": ["2023-09-06"],
  "marmottan": ["2023-09-24"],
  "pompidou": ["2017-01-14", "2023-09-06"],
  "rodin": ["2023-09-22"],
  "tate-modern": ["2024-06-13", "2026-06-17"],
  "belvedere": ["2017-06-20"],
  "mnw": ["2014 (frequent)", "2017", "2019-08-01", "2022-12-27", "2023-09-20", "2024 (4 visits)"],
  "sukiennice": ["2014-04-27", "2015-07-07"],
  "nationalmuseum": ["2026-04-16"],
  "agnsw": ["2014-2025 (45 visits)"],
  "ngv": ["2020-12-20", "2021-05-01"],
  "nga-canberra": ["2020-10-22"],
  "npg-canberra": ["2020-10-22"],
  "ngi": ["~2017-03 (Dublin trip on timeline; NGI below match threshold)"],
};

let n = 0;
for (const [id, v] of Object.entries(dates)) {
  const re = new RegExp('(\\{ id: "' + id + '",[\\s\\S]*?visits: )\\[[^\\]]*\\]');
  const before = src;
  src = src.replace(re, "$1" + JSON.stringify(v));
  if (src !== before) n++; else console.log("MISS", id);
}
fs.writeFileSync(FILE, src);
console.log("dated", n, "museums from Timeline");
const c = { window: {} }; vm.createContext(c); vm.runInContext(src, c);
console.log("museums.js loads:", c.window.CANVAS_MUSEUMS.length, "entries");
