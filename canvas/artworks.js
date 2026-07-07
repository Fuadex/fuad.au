// artworks.js — hand-authored canon: works Fuad stood in front of (Phase 0 seed).
// seenConfidence: sure | probably | unsure — fuzzy memory is first-class data.
// via: "exhibition" marks temporary-show encounters (they count; see memory-seed.md).
// floored = the in-the-moment knockout (borrowing culture's impact vocabulary).
window.CANVAS_ARTWORKS = [
  { id: "monet-woman-with-a-parasol", title: "Woman with a Parasol — Madame Monet and Her Son", artist: "Claude Monet", artistId: "monet", qid: "Q3244303", year: 1875,
    seenAt: "nga-dc", seenConfidence: "sure", favorite: true, note: "\"Beautiful.\" The DC Monet." },

  { id: "monet-nympheas-orangerie", title: "The Water Lilies cycle (Nymphéas)", artist: "Claude Monet", artistId: "monet", qid: "Q3329731", year: 1926,
    seenAt: "orangerie", seenConfidence: "sure", favorite: true, note: "The panoramic rooms." },

  { id: "monet-water-lilies-marmottan", title: "Water Lilies (Marmottan canvases)", artist: "Claude Monet", artistId: "monet", qid: null, year: null,
    seenAt: "marmottan", seenConfidence: "sure", note: "Seen at \"his museum\" — specific canvases TBC via recall deck." },

  { id: "podkowinski-szal-uniesien", title: "Szał uniesień (Frenzy of Exultations)", artist: "Władysław Podkowiński", artistId: "podkowinski", qid: "Q2450645", year: 1894,
    seenAt: "sukiennice", seenConfidence: "probably", favorite: true, note: "One canvas exists (slashed by the artist, restored) — hangs in Sukiennice; the Warsaw memory was likely a loan or another Podkowiński." },

  { id: "leech-the-sunshade", title: "The Sunshade", artist: "William John Leech", artistId: "leech", qid: null, year: 1913,
    seenAt: "ngi", seenConfidence: "sure", favorite: true, note: "\"Gorgeous.\"" },

  { id: "leech-convent-garden", title: "A Convent Garden, Brittany", artist: "William John Leech", artistId: "leech", qid: null, year: 1913,
    seenAt: "ngi", seenConfidence: "probably", note: "Memory checked out — it is his, and it is NGI." },

  { id: "fjaestad-wood-pattern", title: "TBC — the wood-pattern painting", artist: "Gustaf Fjæstad (TBC)", artistId: "fjaestad", qid: null, year: null,
    seenAt: "tokyo-met", via: "exhibition", exhibition: "Swedish Masters (name TBC)", seenConfidence: "sure", floored: true,
    note: "Painted to resemble wood grain — \"haven't seen a painting made in such style.\" Artist attribution TBC (Fjæstad's signature move). The exhibition poster itself was also loved — identify the poster work." },

  { id: "isson-works", title: "TBC — Tanaka Isson works", artist: "Tanaka Isson", artistId: "isson", qid: null, year: null,
    seenAt: "tokyo-met", via: "exhibition", exhibition: "Tanaka Isson retrospective (venue TBC)", seenConfidence: "probably",
    note: "\"Amazing in real life.\" Likely the 2024 Tokyo Met retrospective — confirm venue + pick the works." },

  { id: "klimt-vienna", title: "TBC — Klimt works in Vienna", artist: "Gustav Klimt", artistId: "klimt", qid: null, year: null,
    seenAt: "belvedere", seenConfidence: "unsure", note: "Long ago. Was The Kiss among them? Recall deck." },

  { id: "pollock-tate", title: "TBC — Pollocks at Tate Modern", artist: "Jackson Pollock", artistId: "pollock", qid: null, year: null,
    seenAt: "tate-modern", seenConfidence: "probably", note: "\"Some cool Pollock works.\" Candidates: Summertime 9A, Yellow Islands." },

  { id: "sergel-drawings", title: "TBC — sculptures + drawings, Nationalmuseum", artist: "Johan Tobias Sergel (TBC)", artistId: "sergel", qid: null, year: null,
    seenAt: "nationalmuseum", seenConfidence: "sure", floored: true, note: "\"Drawings unbelievable, sculptures also great\" — artist name forgotten; Sergel is the strong guess, confirm by showing the drawings." },

  { id: "paris-sculptures", title: "TBC — the Paris sculptor's works", artist: "Bourdelle or Rodin (TBC)", artistId: null, qid: null, year: null,
    seenAt: "paris-sculptor", seenConfidence: "sure", floored: true, note: "\"Probably the best sculptures\" — teacher-with-his-own-school museum. Recognition test pending." },
];

// Artist-affinity list (loved regardless of walls; seeds pilgrimage + similar-artists):
// monet (FAVORITE — "currently my favorite artist"), impressionism/post-impressionism
// as the center of gravity, tanaka-isson, beksinski (seen live? TBC — Sanok holds the
// collection), podkowinski, leech, klimt.
window.CANVAS_AFFINITY = ["monet", "isson", "beksinski", "podkowinski", "leech", "klimt"];
