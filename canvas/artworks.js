// artworks.js — hand-authored canon: works Fuad stood in front of (Phase 0 seed).
// seenConfidence: sure | probably | unsure — fuzzy memory is first-class data.
// via: "exhibition" marks temporary-show encounters (they count; see memory-seed.md).
// floored = the in-the-moment knockout (borrowing culture's impact vocabulary).
window.CANVAS_ARTWORKS = [
  { id: "monet-woman-with-a-parasol", title: "Woman with a Parasol — Madame Monet and Her Son", artist: "Claude Monet", artistId: "monet", qid: "Q3244303", year: 1875,
    seenAt: "nga-dc", seenConfidence: "sure", favorite: true, note: "\"Beautiful.\" The DC Monet." },

  { id: "monet-nympheas-orangerie", title: "The Water Lilies cycle (Nymphéas)", searchAs: "Water Lilies", artist: "Claude Monet", artistId: "monet", qid: null, year: 1926,
    seenAt: "orangerie", seenConfidence: "sure", favorite: true, note: "The panoramic rooms." },


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
  // ——— deck-folded picks (fold-deck.js) ———
  { id: "luncheon-on-the-grass", title: "Luncheon on the Grass", artist: "Édouard Manet", artistId: "manet", qid: "Q152509", qidTrusted: true, year: 1863, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "bal-du-moulin-de-la-galette", title: "Bal du moulin de la Galette", artist: "Pierre-Auguste Renoir", artistId: "renoir", qid: "Q683274", qidTrusted: true, year: 1876, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "starry-night-over-the-rhone", title: "Starry Night Over the Rhone", artist: "Vincent van Gogh", artistId: "van-gogh", qid: "Q1464531", qidTrusted: true, year: 1888, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-church-at-auvers", title: "The Church at Auvers", artist: "Vincent van Gogh", artistId: "van-gogh", qid: "Q1213917", qidTrusted: true, year: 1890, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "a-burial-at-ornans", title: "A Burial at Ornans", artist: "Gustave Courbet", artistId: "courbet", qid: "Q540488", qidTrusted: true, year: 1841, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-birth-of-venus", title: "The Birth of Venus", artist: "William-Adolphe Bouguereau", artistId: "bouguereau", qid: "Q1283024", qidTrusted: true, year: 1879, seenAt: "orsay", seenConfidence: "sure", floored: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "whistler-s-mother", title: "Whistler's Mother", artist: "James McNeill Whistler", artistId: "whistler", qid: "Q687182", qidTrusted: true, year: 1871, seenAt: "orsay", seenConfidence: "sure", note: "Deck pick — orsay-2026-07-07." },
  { id: "the-painter-s-studio", title: "The Painter's Studio", artist: "Gustave Courbet", artistId: "courbet", qid: "Q1167178", qidTrusted: true, year: 1850, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "l-absinthe", title: "L'Absinthe", artist: "Edgar Degas", artistId: "degas", qid: "Q1239950", qidTrusted: true, year: 1875, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-balcony", title: "The Balcony", artist: "Édouard Manet", artistId: "manet", qid: "Q775407", qidTrusted: true, year: 1868, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-gleaners", title: "The Gleaners", artist: "Jean-François Millet", artistId: "millet", qid: "Q1368055", qidTrusted: true, year: 1857, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-gates-of-hell", title: "The Gates of Hell", artist: "Auguste Rodin", artistId: "rodin", qid: "Q2003287", qidTrusted: true, year: 1880, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "la-balancoire", title: "La Balançoire", artist: "Pierre-Auguste Renoir", artistId: "renoir", qid: "Q1118456", qidTrusted: true, year: 1876, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "dante-and-virgil-in-hell", title: "Dante and Virgil in Hell", artist: "William-Adolphe Bouguereau", artistId: "bouguereau", qid: "Q2665048", qidTrusted: true, year: 1850, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "women-in-the-garden", title: "Women in the Garden", artist: "Claude Monet", artistId: "monet", qid: "Q2734892", qidTrusted: true, year: 1866, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-birth-of-venus-cabanel", title: "The Birth of Venus", artist: "Alexandre Cabanel", artistId: "cabanel", qid: "Q1212861", qidTrusted: true, year: 1863, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "girls-at-the-piano", title: "Girls at the Piano", artist: "Pierre-Auguste Renoir", artistId: "renoir", qid: "Q3808227", qidTrusted: true, year: 1892, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-angelus", title: "The Angelus", artist: "Jean-François Millet", artistId: "millet", qid: "Q2571560", qidTrusted: true, year: 1858, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "self-portrait", title: "Self-portrait", artist: "Vincent van Gogh", artistId: "van-gogh", qid: "Q3630735", qidTrusted: true, year: 1889, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-magpie", title: "The Magpie", artist: "Claude Monet", artistId: "monet", qid: "Q4429116", qidTrusted: true, year: 1868, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "les-raboteurs-de-parquet", title: "Les raboteurs de parquet", artist: "Gustave Caillebotte", artistId: "caillebotte", qid: "Q1766454", qidTrusted: true, year: 1875, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-circus", title: "The Circus", artist: "Georges Seurat", artistId: "seurat", qid: "Q2275610", qidTrusted: true, year: 1891, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "dance-in-the-country", title: "Dance in the Country", artist: "Pierre-Auguste Renoir", artistId: "renoir", qid: "Q1114718", qidTrusted: true, year: 1883, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "berthe-morisot-with-a-bouquet-of-violets", title: "Berthe Morisot with a Bouquet of Violets", artist: "Édouard Manet", artistId: "manet", qid: "Q2899286", qidTrusted: true, year: 1872, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "le-dejeuner-sur-l-herbe", title: "Le Déjeuner sur l'herbe", artist: "Claude Monet", artistId: "monet", qid: "Q1167912", qidTrusted: true, year: 1865, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-wounded-man", title: "The Wounded Man", artist: "Gustave Courbet", artistId: "courbet", qid: "Q3751961", qidTrusted: true, year: 1844, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-age-of-bronze", title: "The Age of Bronze", artist: "Auguste Rodin", artistId: "rodin", qid: "Q526178", qidTrusted: true, year: 1877, seenAt: "orsay", seenConfidence: "unsure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "regates-a-argenteuil", title: "Régates à Argenteuil", artist: "Claude Monet", artistId: "monet", qid: "Q3454959", qidTrusted: true, year: 1872, seenAt: "orsay", seenConfidence: "sure", liked: true, note: "Deck pick — orsay-2026-07-07." },
  { id: "the-clouds", title: "The Clouds", artist: "Claude Monet", artistId: "monet", qid: "Q3828905", qidTrusted: true, year: 1920, seenAt: "orangerie", seenConfidence: "sure", floored: true, note: "Deck pick — orangerie-2026-07-07." },
  // ——— deck-folded picks (fold-deck.js) ———
  { id: "impression-sunrise", title: "Impression, Sunrise", artist: "Claude Monet", artistId: "monet", qid: "Q328523", qidTrusted: true, year: 1872, seenAt: "marmottan", seenConfidence: "sure", floored: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "pont-de-l-europe-gare-saint-lazare", title: "Pont de l'Europe, gare Saint-Lazare", artist: "Claude Monet", artistId: "monet", qid: "Q6082483", qidTrusted: true, year: 1877, seenAt: "marmottan", seenConfidence: "sure", floored: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "eugene-manet-on-isle-of-wight", title: "Eugène Manet on Isle of Wight", artist: "Berthe Morisot", artistId: "morisot", qid: "Q26164546", qidTrusted: true, year: 1875, seenAt: "marmottan", seenConfidence: "unsure", wish: true, liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "train-in-the-snow", title: "Train in the Snow", artist: "Claude Monet", artistId: "monet", qid: "Q50415955", qidTrusted: true, year: 1875, seenAt: "marmottan", seenConfidence: "sure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "monet-that-reads", title: "Monet that reads", artist: "Pierre-Auguste Renoir", artistId: "renoir", qid: "Q3860679", qidTrusted: true, year: 1873, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "white-and-yellow-chrysanthemums-petit-gennevilliers-garden", title: "White and yellow chrysanthemums. Petit Gennevilliers garden", artist: "Gustave Caillebotte", artistId: "caillebotte", qid: "Q63986335", qidTrusted: true, year: 1893, seenAt: "marmottan", seenConfidence: "sure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "diogenes", title: "Diogenes", artist: "Jules Bastien-Lepage", artistId: "bastien-lepage", qid: "Q110118614", qidTrusted: true, year: 1877, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "berthe-morisot", title: "Berthe Morisot", artist: "Édouard Manet", artistId: "manet", qid: "Q43293114", qidTrusted: true, year: 1873, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "the-row-boat", title: "The row boat", artist: "Claude Monet", artistId: "monet", qid: "Q50415974", qidTrusted: true, year: 1887, seenAt: "marmottan", seenConfidence: "unsure", wish: true, liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "eugene-manet-et-sa-fille-dans-le-jardin-de-bougival", title: "Eugène Manet et sa fille dans le jardin de Bougival", artist: "Berthe Morisot", artistId: "morisot", qid: "Q63928680", qidTrusted: true, year: 1881, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "bergere-couchee", title: "Bergère couchée", artist: "Berthe Morisot", artistId: "morisot", qid: "Q63928689", qidTrusted: true, year: 1891, seenAt: "marmottan", seenConfidence: "unsure", wish: true, liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "julie-manet-and-her-greyhound-laertes", title: "Julie Manet and her Greyhound, Laertes", artist: "Berthe Morisot", artistId: "morisot", qid: "Q63928690", qidTrusted: true, year: 1893, seenAt: "marmottan", seenConfidence: "unsure", wish: true, liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "paule-gobillard-peignant", title: "Paule Gobillard peignant", artist: "Berthe Morisot", artistId: "morisot", qid: "Q63928948", qidTrusted: true, year: 1887, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "au-bal", title: "Au bal", artist: "Berthe Morisot", artistId: "morisot", qid: "Q63928949", qidTrusted: true, year: 1875, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "portrait-de-mademoiselle-victorine-de-bellio", title: "Portrait de Mademoiselle Victorine de Bellio", artist: "Pierre-Auguste Renoir", artistId: "renoir", qid: "Q63986327", qidTrusted: true, year: 1892, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "portrait-de-julie-manet", title: "Portrait de Julie Manet", artist: "Pierre-Auguste Renoir", artistId: "renoir", qid: "Q63986337", qidTrusted: true, year: 1894, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "portrait-de-madame-claude-monet", title: "Portrait de madame Claude Monet", artist: "Pierre-Auguste Renoir", artistId: "renoir", qid: "Q65965327", qidTrusted: true, year: 1873, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "bassin-aux-nympheas", title: "Bassin aux nymphéas", artist: "Claude Monet", artistId: "monet", qid: "Q105099605", qidTrusted: true, year: 1918, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "nympheas", title: "Nymphéas", artist: "Claude Monet", artistId: "monet", qid: "Q105099609", qidTrusted: true, year: 1916, seenAt: "marmottan", seenConfidence: "sure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "water-lilies", title: "Water-Lilies", artist: "Claude Monet", artistId: "monet", qid: "Q105099610", qidTrusted: true, year: 1917, seenAt: "marmottan", seenConfidence: "sure", floored: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "nympheas-monet", title: "Nymphéas", artist: "Claude Monet", artistId: "monet", qid: "Q105099611", qidTrusted: true, year: 1918, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "nympheas-monet-2", title: "Nympheas", artist: "Claude Monet", artistId: "monet", qid: "Q105099612", qidTrusted: true, year: 1918, seenAt: "marmottan", seenConfidence: "sure", floored: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "water-lilies-reflection-of-a-weeping-willow", title: "Water-Lilies, Reflection of a Weeping Willow", artist: "Claude Monet", artistId: "monet", qid: "Q105099614", qidTrusted: true, year: 1917, seenAt: "marmottan", seenConfidence: "sure", floored: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "saule-pleureur-et-bassin-aux-nympheas", title: "Saule pleureur et bassin aux nymphéas", artist: "Claude Monet", artistId: "monet", qid: "Q105099616", qidTrusted: true, year: 1917, seenAt: "marmottan", seenConfidence: "sure", floored: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "vetheuil-in-the-fog", title: "Vetheuil in the Fog", artist: "Claude Monet", artistId: "monet", qid: "Q10392679", qidTrusted: true, year: 1879, seenAt: "marmottan", seenConfidence: "unsure", wish: true, liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "michel-monet-with-a-pompon", title: "Michel Monet with a Pompon", artist: "Claude Monet", artistId: "monet", qid: "Q16389932", qidTrusted: true, year: 1880, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "the-tuileries-study", title: "The Tuileries (Study)", artist: "Claude Monet", artistId: "monet", qid: "Q19967296", qidTrusted: true, year: 1876, seenAt: "marmottan", seenConfidence: "sure", floored: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "walk-near-argenteuil", title: "Walk near Argenteuil", artist: "Claude Monet", artistId: "monet", qid: "Q50415942", qidTrusted: true, year: 1875, seenAt: "marmottan", seenConfidence: "sure", floored: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "sur-la-plage-a-trouville", title: "Sur la plage à Trouville", artist: "Claude Monet", artistId: "monet", qid: "Q50415968", qidTrusted: true, year: 1870, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "autoportrait", title: "Autoportrait", artist: "Berthe Morisot", artistId: "morisot", qid: "Q63928685", qidTrusted: true, year: 1885, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "le-cerisier", title: "Le Cerisier", artist: "Berthe Morisot", artistId: "morisot", qid: "Q63928688", qidTrusted: true, year: 1891, seenAt: "marmottan", seenConfidence: "unsure", wish: true, liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "nympheas-effect-in-the-evening", title: "Nympheas, effect in the evening", artist: "Claude Monet", artistId: "monet", qid: "Q63952027", qidTrusted: true, year: 1897, seenAt: "marmottan", seenConfidence: "unsure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "nympheas-monet-3", title: "Nymphéas", artist: "Claude Monet", artistId: "monet", qid: "Q63952029", qidTrusted: true, year: 1903, seenAt: "marmottan", seenConfidence: "sure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "the-water-lily-pond", title: "The Water-Lily Pond", artist: "Claude Monet", artistId: "monet", qid: "Q63952033", qidTrusted: true, year: 1918, seenAt: "marmottan", seenConfidence: "sure", liked: true, note: "Deck pick — marmottan-2026-07-07." },
  { id: "the-pont-neuf-and-the-samaritaine-at-night", title: "The Pont Neuf and the Samaritaine at night", artist: "Albert Marquet", artistId: "marquet", qid: "Q47157012", qidTrusted: true, year: 1937, seenAt: "pompidou", seenConfidence: "unsure", wish: true, liked: true, note: "Deck pick — pompidou-2026-07-07." },
  { id: "la-ville-de-paris", title: "La Ville de Paris", artist: "Robert Delaunay", artistId: "delaunay", qid: "Q131747322", qidTrusted: true, year: null, seenAt: "pompidou", seenConfidence: "unsure", liked: true, note: "Deck pick — pompidou-2026-07-07." },
];
// seenAt may be a single museumId or an array (multi-venue bundles like Beksiński).

// Artist-affinity list (loved regardless of walls; seeds pilgrimage + similar-artists):
// monet (FAVORITE — "currently my favorite artist"), impressionism/post-impressionism
// as the center of gravity, tanaka-isson, beksinski (seen live? TBC — Sanok holds the
// collection), podkowinski, leech, klimt.
window.CANVAS_AFFINITY = ["monet", "isson", "beksinski", "podkowinski", "leech", "klimt"];
