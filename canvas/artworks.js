// artworks.js — hand-authored canon: works Fuad stood in front of (Phase 0 seed).
// seenConfidence: sure | probably | unsure — fuzzy memory is first-class data.
// via: "exhibition" marks temporary-show encounters (they count; see memory-seed.md).
// floored = the in-the-moment knockout (borrowing culture's impact vocabulary).
window.CANVAS_ARTWORKS = [
  { id: "monet-woman-with-a-parasol", title: "Woman with a Parasol — Madame Monet and Her Son", artist: "Claude Monet", artistId: "monet", qid: "Q3244303", year: 1875,
    seenAt: "nga-dc", seenConfidence: "sure", favorite: true, note: "\"Beautiful.\" The DC Monet." },

  { id: "monet-nympheas-orangerie", title: "The Water Lilies cycle (Nymphéas)", searchAs: "Water Lilies", artist: "Claude Monet", artistId: "monet", qid: null, year: 1926,
    seenAt: "orangerie", seenConfidence: "sure", favorite: true, note: "The panoramic rooms." },

  { id: "monet-water-lilies-marmottan", title: "Water Lilies (Marmottan canvases)", artist: "Claude Monet", artistId: "monet", qid: null, year: null,
    seenAt: "marmottan", seenConfidence: "sure", note: "Seen at \"his museum\" — specific canvases TBC via recall deck." },

  { id: "podkowinski-szal-uniesien", title: "Szał uniesień (Frenzy of Exultations)", artist: "Władysław Podkowiński", artistId: "podkowinski", qid: "Q2450645", year: 1894,
    seenAt: "sukiennice", seenConfidence: "probably", favorite: true, note: "One canvas exists (slashed by the artist, restored) — hangs in Sukiennice; the Warsaw memory was likely a loan or another Podkowiński." },

  { id: "leech-the-sunshade", title: "The Sunshade", artist: "William John Leech", artistId: "leech", qid: null, year: 1913,
    seenAt: "ngi", seenConfidence: "sure", favorite: true, note: "\"Gorgeous.\"" },

  { id: "leech-convent-garden", title: "A Convent Garden, Brittany", artist: "William John Leech", artistId: "leech", qid: null, year: 1913,
    seenAt: "ngi", seenConfidence: "probably", note: "Memory checked out — it is his, and it is NGI." },

  { id: "fjaestad-wood-pattern", title: "TBC — the wood-pattern painting", artist: "Gustaf Fjæstad", artistId: "fjaestad", qid: null, year: null,
    seenAt: "tokyo-met", via: "exhibition", exhibition: "Swedish Masters (name TBC)", seenConfidence: "sure", floored: true,
    note: "Painted to resemble wood grain — \"haven't seen a painting made in such style.\" Attribution to Fjæstad CONFIRMED as likely by Fuad. Which work + which painting was the marvelous exhibition poster — recall deck." },

  { id: "isson-works", title: "TBC — Tanaka Isson works", artist: "Tanaka Isson", artistId: "isson", qid: null, year: null,
    seenAt: null, via: "exhibition", exhibition: "TBC — 2024 retrospective was Tokyo Met, but Fuad can't confirm that's where he saw them", seenConfidence: "sure",
    note: "\"Amazing in real life\" is certain; the VENUE is the open question (couldn't verify the exhibition on the website)." },

  { id: "klimt-kiss", title: "The Kiss", artist: "Gustav Klimt", artistId: "klimt", qid: "Q203890", year: 1908,
    seenAt: "belvedere", seenConfidence: "probably", note: "\"I think I saw The Kiss yes\" — long ago." },

  { id: "klimt-golden-others", title: "TBC — the other golden Klimts", artist: "Gustav Klimt", artistId: "klimt", qid: null, year: null,
    seenAt: "belvedere", seenConfidence: "probably", note: "\"More golden artworks\" beyond The Kiss — Judith I is the prime Belvedere candidate; recall deck." },

  { id: "pollock-tate", title: "TBC — Pollocks at Tate Modern", artist: "Jackson Pollock", artistId: "pollock", qid: null, year: null,
    seenAt: "tate-modern", seenConfidence: "probably", note: "\"Some cool Pollock works.\" Candidates: Summertime 9A, Yellow Islands." },

  { id: "sergel-drawings", title: "TBC — Sergel drawings (incl. a dancing couple) + sculptures", artist: "Johan Tobias Sergel", artistId: "sergel", qid: null, year: null,
    seenAt: "nationalmuseum", seenConfidence: "sure", floored: true, note: "CONFIRMED Sergel. The standout: \"just beautiful sketch of two people dancing\" — identify the exact drawing via deck (his dance studies are famous)." },

  { id: "rodin-sculptures", title: "TBC — Rodin works at Musée Rodin", artist: "Auguste Rodin", artistId: "rodin", qid: null, year: null,
    seenAt: "rodin", seenConfidence: "sure", floored: true, note: "CONFIRMED Rodin — \"best with expressions and such, incredible.\" Which works stood out: recall deck (The Thinker, The Kiss, Gates of Hell, Burghers of Calais…). Bourdelle rated \"good\" — possible second museum visit, TBC." },

  { id: "beksinski-works", title: "Beksiński paintings (three venues)", artist: "Zdzisław Beksiński", artistId: "beksinski", qid: null, year: null, noResolve: true,
    seenAt: ["beksinski-krakow", "beksinski-praga", "czestochowa-mgs"], seenConfidence: "sure",
    note: "Seen in person: Kraków (permanent gallery, venue TBC), a temporary show in Warsaw-Praga, and Częstochowa's collection. Possibly a fourth city, unrecalled. NOTE: in-copyright artist — text-forward cards, museum link-outs (see PLAN §3)." },
];
// seenAt may be a single museumId or an array (multi-venue bundles like Beksiński).

// Artist-affinity list (loved regardless of walls; seeds pilgrimage + similar-artists):
// monet (FAVORITE — "currently my favorite artist"), impressionism/post-impressionism
// as the center of gravity, tanaka-isson, beksinski (seen live? TBC — Sanok holds the
// collection), podkowinski, leech, klimt.
window.CANVAS_AFFINITY = ["monet", "isson", "beksinski", "podkowinski", "leech", "klimt"];
