// audit-previews.js — regression suite for the needle-drop resolver (window.itunesPreview,
// defined in rotation-core.jsx).
//
//   node audit-previews.js
//
// This makes LIVE calls to the iTunes Search API, so it is a manual tool, not a CI gate — run it
// after touching the resolver. It loads the real IIFE out of rotation-core.jsx rather than a copy,
// so it cannot drift from the shipping code.
//
// WHY THIS EXISTS. Preview resolution has now produced two separate wrong-audio incidents, and
// neither was catchable by reading the code or by clicking around:
//   2026-08-19  the album needle matched on artist+album only and played whichever track iTunes
//               ranked first, while the UI named a different song.
//   2026-09-01  the song page stripped parentheticals before comparing titles, so Chalk's
//               "Tongue" resolved to "Tongue (Torba Remix)" and played it.
// Both look correct in isolation. They only show up against real API responses, because the fault
// is in what iTunes RANKS, not in what the code says. Hence a live suite.
//
// A failing case is not automatically a code bug — iTunes' catalogue moves. Check the case first.
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "rotation-core.jsx"), "utf8");
const marker = "// itunesPreview — the shared runtime resolver";
if (!src.includes(marker)) { console.error("could not find itunesPreview in rotation-core.jsx"); process.exit(1); }
global.window = {};
eval(src.slice(src.indexOf("(function () {", src.indexOf(marker))));

const CASES = [
  // ── the 2026-09-01 report ──────────────────────────────────────────────────
  { artist: "Chalk", album: "Crystalpunk", track: "Tongue", want: "url",
    why: "served the Torba Remix; album path must find track 1" },
  { artist: "Chalk", album: "Crystalpunk", track: "Ache", want: "url",
    why: "album had no needle at all (search term was over-specific)" },
  { artist: "Chalk", album: "Crystalpunk", track: "Beal Feirste", want: "url",
    why: "accented title resolves through the tracklist" },
  { artist: "Chalk", album: null, track: "Tongue", want: "null",
    why: "no album: the remix must be REFUSED, not normalized into a match" },

  // ── the 2026-08-19 report: 'Poppy' is a TRACK on Model/Actriz's 'Pirouette' ─
  { artist: "Model/Actriz", album: "Pirouette", track: "Poppy", want: "url",
    why: "track name collides with a real artist name" },
  { artist: "Model/Actriz", album: null, track: "Poppy", want: "url",
    why: "no album: the artist guard alone must still land on the right track" },

  // ── must keep working ─────────────────────────────────────────────────────
  { artist: "Nine Inch Nails", album: "The Fragile", track: "We're In This Together", want: "url" },
  { artist: "Poppy", album: "I Disagree", track: "BLOODMONEY", want: "url" },
  { artist: "Radiohead", album: "OK Computer", track: "Let Down", want: "url",
    why: "remastered reissues must still count as the same recording" },

  // ── must stay silent ──────────────────────────────────────────────────────
  { artist: "Andrew Chalk", album: null, track: "Tongue", want: "null",
    why: "the drone musician must not borrow the Belfast band's audio" },
];

(async () => {
  let bad = 0;
  for (const c of CASES) {
    const url = await window.itunesPreview(c).catch(() => null);
    const ok = c.want === "url" ? !!url : !url;
    if (!ok) bad++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${(c.artist + " – " + c.track).padEnd(42)} ` +
      `${(url ? url.split("/").pop().slice(0, 24) : "(none)").padEnd(26)} ${c.why || ""}`);
  }
  console.log(`\n${CASES.length - bad}/${CASES.length} passed`);
  if (bad) {
    console.log("\nA failure here means the resolver hands back the wrong audio or none at all.\n" +
      "Check the CASE before the code — iTunes' catalogue changes, and a track can genuinely\n" +
      "vanish from a store. Confirm against the raw API before editing the matcher.");
  }
  process.exit(bad ? 1 : 0);
})();
