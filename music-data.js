// ────────────────────────────────────────────────────────────────
// Rotation — Fuad's listening data  (last.fm/user/fuadex)
//
// BELIEVABLE MOCK built from Fuad's real top artists (Instafest + the
// 10×10 album quilt he shared). Structured to mirror the live APIs so
// it can be wired up later:
//   ARTISTS  ~ last.fm user.getTopArtists + artist.getInfo
//             (playcount, tags, similar) + Spotify audio-features
//             (energy/valence/acoustic/tempo/dance/instrumental, 0..1).
//   ALBUMS   ~ user.getTopAlbums.   TRACKS ~ user.getTopTracks.
//   GENRES   ~ artist.getTopTags rolled into family→subgenre, each sub
//             given a sound-map coord (x organic↔electronic,
//             y calm↔intense — à la Every Noise at Once).
//   CLOCK    ~ user.getRecentTracks timestamps (7×24).
//   ERAS     ~ user.getWeeklyArtistChart stitched across years.
//   CONCERTS ~ Songkick/Bandsintown artist + metro events.
// Covers are GENERATIVE duotone sleeves (deterministic per hue+name).
// ────────────────────────────────────────────────────────────────

window.ROTATION = (function () {

  // name, plays, hue, country, tags[], similar[], audio[e,v,a,t,d,i], era[12 → 2014..2025]
  const A = [
    ["Nine Inch Nails", 3120, 212, "us", ["industrial rock","industrial","electronic","alternative"], ["Marilyn Manson","Ministry","How to Destroy Angels","Filter"], [.82,.30,.18,.62,.45,.30], [9,9,8,8,7,7,6,6,7,7,7,7]],
    ["Linkin Park", 2890, 18, "us", ["nu-metal","alternative metal","rap metal","electronic"], ["Limp Bizkit","Korn","Crossfaith","Papa Roach"], [.85,.42,.15,.66,.50,.20], [9,9,9,8,7,6,6,6,6,7,8,7]],
    ["System of a Down", 2460, 8, "us", ["nu-metal","alternative metal","thrash metal","armenian"], ["Korn","Deftones","Slipknot","Rage Against the Machine"], [.92,.45,.12,.78,.40,.20], [8,8,8,7,7,6,6,6,6,6,6,6]],
    ["Deftones", 2410, 290, "us", ["alternative metal","nu-metal","shoegaze","post-metal"], ["Tool","Coaltar of the Deepers","Chevelle","Far"], [.78,.35,.22,.58,.42,.30], [7,7,8,8,8,7,7,7,8,8,9,8]],
    ["Korn", 2180, 26, "us", ["nu-metal","alternative metal","industrial metal"], ["Limp Bizkit","Slipknot","Linkin Park","Coal Chamber"], [.86,.32,.14,.62,.46,.20], [8,8,8,7,6,6,5,5,5,6,6,5]],
    ["Tool", 1980, 276, "us", ["progressive metal","alternative metal","art rock"], ["A Perfect Circle","Deftones","Puscifer","Karnivool"], [.70,.30,.20,.55,.30,.45], [7,7,7,7,7,7,7,7,7,7,7,7]],
    ["Rammstein", 1870, 220, "de", ["industrial metal","neue deutsche härte","industrial"], ["Nine Inch Nails","Ministry","Oomph!","Marilyn Manson"], [.84,.40,.14,.60,.50,.25], [7,7,7,7,6,6,6,6,7,7,7,7]],
    ["Slipknot", 1760, 4, "us", ["nu-metal","metalcore","alternative metal"], ["Korn","Slayer","System of a Down","Machine Head"], [.94,.28,.10,.80,.35,.18], [7,7,7,7,6,6,6,6,6,6,6,5]],
    ["Bring Me the Horizon", 1680, 342, "uk", ["metalcore","post-hardcore","electronicore","deathcore"], ["Architects","Northlane","Sleep Token","Thornhill"], [.85,.42,.16,.66,.45,.22], [3,4,6,8,9,9,8,7,7,7,7,7]],
    ["The Prodigy", 1620, 152, "uk", ["big beat","breakbeat","electronic","rave"], ["The Chemical Brothers","Pendulum","Crystal Castles","Fatboy Slim"], [.90,.55,.10,.85,.78,.55], [8,8,8,7,6,5,5,5,5,5,6,6]],
    ["Machine Head", 1610, 0, "us", ["groove metal","thrash metal","metalcore"], ["Slayer","Megadeth","Lamb of God","Pantera"], [.90,.30,.10,.78,.32,.20], [6,6,6,6,5,5,5,5,5,5,5,5]],
    ["A Perfect Circle", 1540, 286, "us", ["alternative metal","art rock","progressive rock"], ["Tool","Puscifer","Deftones","Chevelle"], [.62,.35,.30,.50,.32,.35], [6,6,7,7,7,6,6,6,6,6,6,6]],
    ["Muse", 1510, 256, "uk", ["alternative rock","art rock","electronic rock"], ["Queens of the Stone Age","Radiohead","Royal Blood","Biffy Clyro"], [.75,.50,.22,.62,.48,.30], [7,7,7,6,6,6,5,5,5,5,5,5]],
    ["Ocean Grove", 1490, 322, "au", ["nu-metal","alternative metal","post-hardcore","nu-gaze"], ["Thornhill","Northlane","Deftones","House of Protection"], [.84,.48,.18,.64,.52,.28], [0,0,1,2,3,5,6,7,8,9,9,9]],
    ["Limp Bizkit", 1490, 30, "us", ["nu-metal","rap metal","alternative metal"], ["Korn","Linkin Park","Papa Roach","P.O.D."], [.88,.50,.12,.70,.58,.18], [8,8,7,7,6,5,5,5,5,6,7,6]],
    ["Slayer", 1450, 2, "us", ["thrash metal","speed metal","heavy metal"], ["Megadeth","Metallica","Sodom","Kreator"], [.95,.25,.08,.88,.28,.20], [6,6,6,6,5,5,5,5,5,5,5,5]],
    ["deadmau5", 1440, 196, "ca", ["progressive house","electro house","techno"], ["Eric Prydz","Pendulum","Wolfgang Gartner","Rezz"], [.78,.55,.08,.82,.80,.75], [8,8,8,7,6,5,5,5,5,5,5,5]],
    ["Megadeth", 1380, 12, "us", ["thrash metal","heavy metal","speed metal"], ["Slayer","Metallica","Annihilator","Testament"], [.90,.32,.10,.84,.30,.25], [6,6,6,6,5,5,5,5,5,5,5,5]],
    ["Alice in Chains", 1330, 32, "us", ["grunge","alternative metal","sludge metal"], ["Soundgarden","Tool","Deftones","Mad Season"], [.68,.28,.30,.52,.32,.30], [6,6,6,6,6,6,6,6,6,6,6,6]],
    ["Haru Nemuri", 1280, 330, "jp", ["japanese","poetry rap","noise rock","post-hardcore"], ["Number Girl","Ling Tosite Sigure","Otoboke Beaver","Tricot"], [.88,.55,.18,.70,.50,.30], [0,0,0,1,2,3,5,7,8,9,9,9]],
    ["The Mad Capsule Markets", 1340, 140, "jp", ["digital hardcore","japanese","industrial","electronic"], ["Number Girl","Machine Girl","Coaltar of the Deepers","Boris"], [.92,.45,.10,.80,.60,.35], [4,4,4,4,5,5,6,7,8,8,8,8]],
    ["Machine Girl", 1340, 308, "us", ["digital hardcore","breakcore","hardcore punk","electronic"], ["The Mad Capsule Markets","Crystal Castles","SeeYouSpaceCowboy","100 gecs"], [.95,.40,.08,.90,.55,.40], [0,0,0,1,2,4,6,7,8,9,9,9]],
    ["Northlane", 1430, 240, "au", ["metalcore","djent","progressive metalcore","electronic"], ["Architects","Thornhill","Invent Animate","Erra"], [.86,.40,.16,.70,.48,.30], [2,3,5,7,8,8,7,7,7,8,8,8]],
    ["Queens of the Stone Age", 1290, 22, "us", ["stoner rock","alternative rock","desert rock"], ["Them Crooked Vultures","Kyuss","Eagles of Death Metal","Royal Blood"], [.74,.48,.22,.60,.50,.30], [6,6,6,6,6,6,6,6,6,6,6,6]],
    ["Type O Negative", 1250, 128, "us", ["gothic metal","doom metal","industrial"], ["Paradise Lost","Danzig","Moonspell","The 69 Eyes"], [.66,.25,.24,.48,.34,.30], [5,5,6,6,6,6,6,6,6,6,6,6]],
    ["Babymetal", 1240, 346, "jp", ["kawaii metal","japanese","metalcore","idol"], ["HANABIE.","Maximum the Hormone","Bring Me the Horizon","Ladybeard"], [.88,.62,.14,.72,.58,.25], [0,0,2,4,6,7,7,6,6,7,7,7]],
    ["Coaltar of the Deepers", 1210, 166, "jp", ["japanese","shoegaze","alternative metal","nu-gaze"], ["Deftones","Number Girl","Boris","Ling Tosite Sigure"], [.80,.42,.28,.60,.40,.45], [0,0,0,1,2,3,5,7,8,9,9,9]],
    ["Ling Tosite Sigure", 1180, 200, "jp", ["japanese","math rock","post-hardcore","progressive"], ["Number Girl","Tricot","Haru Nemuri","toe"], [.86,.48,.20,.74,.42,.45], [3,3,4,4,5,5,6,6,7,8,8,8]],
    ["Crystal Castles", 1120, 300, "ca", ["witch house","electronic","noise","synthpunk"], ["Sleigh Bells","HEALTH","Machine Girl","Grimes"], [.80,.35,.12,.72,.62,.45], [7,7,8,7,6,5,5,5,6,6,6,6]],
    ["Number Girl", 1090, 352, "jp", ["japanese","noise rock","post-punk","alternative"], ["Ling Tosite Sigure","Haru Nemuri","Coaltar of the Deepers","Tricot"], [.86,.46,.22,.74,.40,.35], [1,1,2,3,4,5,6,7,8,9,8,8]],
    ["Poppy", 1090, 318, "us", ["metalcore","art pop","industrial metal","electronic"], ["Spiritbox","Bring Me the Horizon","Babymetal","Sleep Token"], [.82,.45,.18,.66,.52,.28], [0,0,0,2,4,6,7,7,7,8,8,8]],
    ["Maximum the Hormone", 1160, 14, "jp", ["japanese","nu-metal","hardcore punk","metalcore"], ["Babymetal","Crossfaith","Coaltar of the Deepers","Dir En Grey"], [.94,.55,.10,.82,.50,.22], [4,4,5,5,6,6,6,6,7,7,8,8]],
    ["Architects", 1180, 350, "uk", ["metalcore","djent","progressive metalcore"], ["Bring Me the Horizon","Northlane","While She Sleeps","Erra"], [.88,.36,.14,.72,.44,.28], [2,3,5,6,7,8,8,7,7,7,7,7]],
    ["Pendulum", 980, 186, "au", ["drum and bass","electronic rock","breakbeat"], ["The Prodigy","Knife Party","Toronto Is Broken","Chase & Status"], [.90,.55,.10,.88,.74,.45], [7,7,7,6,5,5,5,5,5,6,6,6]],
    ["Celldweller", 880, 230, "us", ["industrial","electronic rock","industrial metal"], ["Nine Inch Nails","Blue Stahli","Crossfaith","Pendulum"], [.84,.45,.14,.72,.56,.40], [4,4,5,5,6,6,6,6,6,6,6,6]],
    ["PRO8L3M", 870, 46, "pl", ["polish hip-hop","hip-hop","electronic"], ["Pezet","Taco Hemingway","Quebonafide","O.S.T.R."], [.62,.50,.30,.55,.70,.30], [0,0,2,4,6,7,7,7,7,7,7,6]],
    ["Toronto Is Broken", 760, 176, "uk", ["drum and bass","liquid dnb","electronic"], ["Pendulum","Koven","Camo & Krooked","Netsky"], [.84,.58,.10,.90,.72,.55], [0,0,1,2,3,4,5,6,8,9,9,8]],
    ["Pezet", 760, 42, "pl", ["polish hip-hop","boom bap","hip-hop"], ["PRO8L3M","O.S.T.R.","Taco Hemingway","Małpa"], [.55,.52,.36,.50,.66,.25], [3,4,5,6,7,7,6,6,6,6,6,6]],
    ["Wargasm", 760, 314, "uk", ["electronic rock","industrial","nu-metal","alternative"], ["Nine Inch Nails","Poppy","Machine Girl","Pendulum"], [.86,.48,.14,.70,.58,.28], [0,0,0,0,1,3,5,7,8,9,9,9]],
    ["Thornhill", 720, 332, "au", ["metalcore","alternative metal","nu-gaze"], ["Ocean Grove","Northlane","Deftones","Invent Animate"], [.82,.40,.20,.64,.46,.30], [0,0,0,1,3,5,7,8,8,8,8,8]],
    ["Otoboke Beaver", 590, 336, "jp", ["japanese","garage punk","punk","noise rock"], ["TsuShiMaMiRe","Number Girl","Shonen Knife","Haru Nemuri"], [.92,.62,.16,.80,.48,.25], [0,0,0,1,2,4,6,7,8,9,9,8]],
    ["HANABIE.", 620, 340, "jp", ["kawaii metalcore","japanese","metalcore","electronicore"], ["Babymetal","Maximum the Hormone","Poppy","Crossfaith"], [.90,.62,.12,.74,.56,.25], [0,0,0,0,1,3,5,7,8,9,9,9]],
    ["Magdalena Bay", 680, 304, "us", ["hyperpop","synth-pop","art pop","electronic"], ["Jane Remover","100 gecs","Charli XCX","Grimes"], [.66,.62,.18,.58,.74,.40], [0,0,0,0,1,2,4,6,8,9,9,9]],
    ["Crossfaith", 640, 206, "jp", ["metalcore","electronicore","japanese","trance metal"], ["coldrain","Northlane","Bring Me the Horizon","Maximum the Hormone"], [.90,.50,.10,.76,.58,.28], [2,3,4,5,6,7,7,6,6,6,7,7]],
  ];

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const ARTISTS = A.map((r, i) => ({
    id: slug(r[0]), rank: i + 1, name: r[0], plays: r[1], hue: r[2], country: r[3],
    tags: r[4], similar: r[5].map(slug), similarNames: r[5],
    audio: { energy: r[6][0], valence: r[6][1], acoustic: r[6][2], tempo: r[6][3], dance: r[6][4], instr: r[6][5] },
    era: r[7],
  }));
  const byId = Object.fromEntries(ARTISTS.map(a => [a.id, a]));

  // ─────────── ALBUMS ───────────  [artistId, title, year, plays]
  const ALB = [
    ["nine-inch-nails", "The Downward Spiral", 1994, 940],
    ["nine-inch-nails", "The Fragile", 1999, 560],
    ["linkin-park", "Hybrid Theory", 2000, 1080],
    ["linkin-park", "Meteora", 2003, 760],
    ["system-of-a-down", "Toxicity", 2001, 1020],
    ["system-of-a-down", "Mezmerize", 2005, 440],
    ["deftones", "White Pony", 2000, 980],
    ["deftones", "Around the Fur", 1997, 560],
    ["deftones", "Diamond Eyes", 2010, 480],
    ["korn", "Follow the Leader", 1998, 640],
    ["korn", "Korn", 1994, 520],
    ["tool", "Lateralus", 2001, 760],
    ["tool", "Ænima", 1996, 560],
    ["rammstein", "Mutter", 2001, 640],
    ["rammstein", "Sehnsucht", 1997, 420],
    ["slipknot", "Iowa", 2001, 560],
    ["slipknot", "Slipknot", 1999, 480],
    ["the-prodigy", "The Fat of the Land", 1997, 780],
    ["bring-me-the-horizon", "Sempiternal", 2013, 820],
    ["bring-me-the-horizon", "That's the Spirit", 2015, 540],
    ["ocean-grove", "Flip Phone Fantasy", 2020, 690],
    ["ocean-grove", "Up in the Air Forever", 2023, 610],
    ["ocean-grove", "The Rhapsody Tapes", 2017, 520],
    ["haru-nemuri", "Shunka Ryougen", 2022, 760],
    ["haru-nemuri", "Haru to Shura", 2018, 520],
    ["machine-girl", "U-Void Synthesizer", 2020, 560],
    ["machine-girl", "WLFGRL", 2014, 480],
    ["machine-girl", "MG Ultra", 2024, 420],
    ["coaltar-of-the-deepers", "No Thank You", 2007, 520],
    ["number-girl", "Sappukei", 2000, 480],
    ["number-girl", "School Girl Distortional Addict", 1999, 420],
    ["maximum-the-hormone", "Bu-ikikaesu", 2007, 520],
    ["babymetal", "Babymetal", 2014, 520],
    ["deadmau5", "Random Album Title", 2008, 480],
    ["deadmau5", "4x4=12", 2010, 420],
    ["northlane", "Alien", 2019, 520],
    ["northlane", "Mesmer", 2017, 440],
    ["crystal-castles", "(II)", 2010, 560],
    ["alice-in-chains", "Dirt", 1992, 640],
    ["muse", "Origin of Symmetry", 2001, 520],
    ["queens-of-the-stone-age", "Songs for the Deaf", 2002, 560],
    ["type-o-negative", "Bloody Kisses", 1993, 440],
    ["ling-tosite-sigure", "I'mperfect", 2013, 420],
    ["the-mad-capsule-markets", "OSC-DIS", 1999, 480],
    ["poppy", "I Disagree", 2020, 520],
    ["megadeth", "Rust in Peace", 1990, 560],
    ["slayer", "Reign in Blood", 1986, 540],
    ["pro8l3m", "Art Brut", 2016, 420],
    ["the-mad-capsule-markets", "010", 2001, 360],
    ["thornhill", "Heroine", 2022, 380],
    ["hanabie", "Reborn Superstar!", 2023, 360],
    ["magdalena-bay", "Mercurial World", 2021, 420],
  ];
  const ALBUMS = ALB.map((r, i) => ({
    id: "al" + i, artistId: r[0], artist: (byId[r[0]] || {}).name || r[0],
    title: r[1], year: r[2], plays: r[3], hue: (byId[r[0]] || { hue: 30 }).hue,
  })).sort((a, b) => b.plays - a.plays);

  // ─────────── TRACKS ───────────
  const TRK = [
    ["ocean-grove", "Sunny", 412], ["haru-nemuri", "Old Fashioned", 388],
    ["nine-inch-nails", "Closer", 372], ["system-of-a-down", "Chop Suey!", 360],
    ["deftones", "Change (In the House of Flies)", 344], ["linkin-park", "One Step Closer", 330],
    ["bring-me-the-horizon", "Can You Feel My Heart", 312], ["the-prodigy", "Breathe", 300],
    ["rammstein", "Du Hast", 292], ["korn", "Freak on a Leash", 280],
    ["machine-girl", "Krystle", 268], ["crystal-castles", "Not in Love", 256],
    ["babymetal", "Gimme Chocolate!!", 248], ["tool", "Schism", 240],
    ["coaltar-of-the-deepers", "Wipeout", 232], ["number-girl", "Toumei Shoujo", 224],
    ["deadmau5", "Strobe", 216], ["slipknot", "Duality", 208],
    ["northlane", "Bloodline", 200], ["maximum-the-hormone", "What's Up, People?!", 192],
  ];
  const TRACKS = TRK.map((r, i) => ({
    id: "tr" + i, rank: i + 1, artistId: r[0], artist: (byId[r[0]] || {}).name || r[0],
    title: r[1], plays: r[2], hue: (byId[r[0]] || { hue: 30 }).hue,
  }));

  // ─────────── GENRES (family → subgenre + sound-map coords) ───────────
  // sound map: x 0(organic/guitars)→1(electronic), y 0(calm)→1(intense). w = plays.
  const GENRES = [
    { family: "Nu-metal", hue: 24, subs: [
      { name: "nu-metal", x: .30, y: .80, w: 2890 },
      { name: "rap metal", x: .36, y: .78, w: 1490 },
      { name: "alternative metal", x: .32, y: .70, w: 2410 },
      { name: "funk metal", x: .28, y: .66, w: 520 },
    ]},
    { family: "Metalcore", hue: 346, subs: [
      { name: "metalcore", x: .34, y: .88, w: 1680 },
      { name: "post-hardcore", x: .36, y: .82, w: 1490 },
      { name: "djent", x: .44, y: .86, w: 1180 },
      { name: "progressive metalcore", x: .46, y: .84, w: 1430 },
      { name: "deathcore", x: .40, y: .92, w: 540 },
    ]},
    { family: "Industrial", hue: 214, subs: [
      { name: "industrial rock", x: .58, y: .72, w: 3120 },
      { name: "industrial metal", x: .55, y: .82, w: 1870 },
      { name: "neue deutsche härte", x: .52, y: .80, w: 1870 },
      { name: "electronicore", x: .62, y: .82, w: 640 },
    ]},
    { family: "Alt / Prog metal", hue: 282, subs: [
      { name: "progressive metal", x: .30, y: .66, w: 1980 },
      { name: "art rock", x: .34, y: .50, w: 1540 },
      { name: "stoner rock", x: .26, y: .62, w: 1290 },
      { name: "post-metal", x: .38, y: .60, w: 720 },
    ]},
    { family: "Thrash / Heavy", hue: 4, subs: [
      { name: "thrash metal", x: .24, y: .92, w: 1450 },
      { name: "groove metal", x: .26, y: .84, w: 1610 },
      { name: "heavy metal", x: .22, y: .80, w: 1380 },
      { name: "speed metal", x: .25, y: .90, w: 540 },
    ]},
    { family: "Japanese underground", hue: 332, subs: [
      { name: "japanese noise rock", x: .40, y: .82, w: 1280 },
      { name: "math rock", x: .38, y: .64, w: 1180 },
      { name: "kawaii metal", x: .56, y: .78, w: 1240 },
      { name: "j-punk", x: .30, y: .80, w: 590 },
      { name: "nu-gaze", x: .44, y: .58, w: 1210 },
    ]},
    { family: "Digital hardcore / Hyperpop", hue: 308, subs: [
      { name: "digital hardcore", x: .82, y: .92, w: 1340 },
      { name: "breakcore", x: .88, y: .90, w: 760 },
      { name: "witch house", x: .80, y: .58, w: 1120 },
      { name: "hyperpop", x: .84, y: .60, w: 680 },
    ]},
    { family: "Electronic / DnB", hue: 190, subs: [
      { name: "drum and bass", x: .86, y: .74, w: 980 },
      { name: "big beat", x: .80, y: .66, w: 1620 },
      { name: "breakbeat", x: .82, y: .70, w: 760 },
      { name: "progressive house", x: .90, y: .50, w: 1440 },
    ]},
    { family: "Hip-hop", hue: 46, subs: [
      { name: "polish hip-hop", x: .64, y: .44, w: 1630 },
      { name: "boom bap", x: .60, y: .40, w: 760 },
    ]},
  ];

  // ─────────── LISTENING CLOCK (7×24) ───────────
  function buildClock() {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const grid = days.map((d, di) => {
      const weekend = di >= 5;
      return Array.from({ length: 24 }, (_, h) => {
        let v = 0;
        if (h <= 2) v += 40 - h * 6;                 // small-hours sessions
        if (h >= 7 && h <= 9) v += 20;               // commute
        if (h >= 10 && h <= 17) v += 30 + Math.sin((h - 10) / 7 * Math.PI) * 14; // work
        if (h >= 19 && h <= 23) v += 46 + (h - 19) * 7; // night peak
        if (weekend) { if (h >= 11 && h <= 16) v += 24; if (h <= 3) v += 18; }
        v += ((di * 31 + h * 17) % 11) - 5;
        return Math.max(0, Math.round(v));
      });
    });
    return { days, grid };
  }

  // ─────────── ERAS (per-year top artists for the scrubber) ───────────
  function buildEras() {
    const years = [];
    for (let y = 2014; y <= 2025; y++) years.push(y);
    return years.map((year, bi) => {
      const ranked = ARTISTS
        .map(a => ({ id: a.id, name: a.name, hue: a.hue, plays: Math.round(a.era[bi] * (a.plays / 70) + a.era[bi] * 7) }))
        .filter(x => x.plays > 0).sort((a, b) => b.plays - a.plays);
      const total = ranked.reduce((s, x) => s + x.plays, 0);
      return { year, total, top: ranked.slice(0, 10) };
    });
  }

  // ─────────── CONCERTS (Songkick/Bandsintown shape) ───────────
  const CITY = {
    "Tokyo": [
      ["ocean-grove", "Shibuya WWW X", "2026-06-20"],
      ["haru-nemuri", "Daikanyama UNIT", "2026-06-28"],
      ["coaltar-of-the-deepers", "Shindaita Fever", "2026-07-05"],
      ["hanabie", "Shinjuku Loft", "2026-07-12"],
      ["maximum-the-hormone", "Zepp Haneda", "2026-07-19"],
      ["crossfaith", "Spotify O-East", "2026-08-01"],
      ["babymetal", "Makuhari Messe", "2026-08-16"],
      ["machine-girl", "Shibuya Cyclone", "2026-08-23"],
      ["otoboke-beaver", "Shimokitazawa Shelter", "2026-09-06"],
    ],
    "London": [
      ["bring-me-the-horizon", "The O2", "2026-06-22"],
      ["architects", "Alexandra Palace", "2026-07-03"],
      ["northlane", "Electric Ballroom", "2026-07-15"],
      ["wargasm", "Heaven", "2026-07-26"],
      ["machine-girl", "EartH, Hackney", "2026-08-09"],
      ["the-prodigy", "Finsbury Park", "2026-08-22"],
      ["pendulum", "O2 Academy Brixton", "2026-09-12"],
    ],
    "Warsaw": [
      ["pro8l3m", "Stodoła", "2026-06-25"],
      ["pezet", "Klub Hydrozagadka", "2026-07-08"],
      ["rammstein", "PGE Narodowy", "2026-08-01"],
      ["slipknot", "Tauron Arena (Kraków)", "2026-08-14"],
      ["korn", "COS Torwar", "2026-09-20"],
    ],
    "Berlin": [
      ["nine-inch-nails", "Velodrom", "2026-06-28"],
      ["deadmau5", "Kraftwerk", "2026-07-12"],
      ["crystal-castles", "Berghain", "2026-07-29"],
      ["rammstein", "Olympiastadion", "2026-08-18"],
      ["celldweller", "SO36", "2026-09-06"],
    ],
  };
  function buildConcerts() {
    const out = {};
    for (const [city, list] of Object.entries(CITY)) {
      out[city] = list.map((r, i) => ({
        id: city.toLowerCase() + i, city, artistId: r[0],
        artist: (byId[r[0]] || {}).name || r[0], hue: (byId[r[0]] || { hue: 30 }).hue,
        venue: r[1], date: r[2], inLibrary: !!byId[r[0]],
      })).sort((a, b) => a.date.localeCompare(b.date));
    }
    return out;
  }

  // ─────────── TOTALS / NOW ───────────
  const totalScrobbles = ARTISTS.reduce((s, a) => s + a.plays, 0) + 41200;
  const TOTALS = {
    scrobbles: totalScrobbles, artists: 1840, albums: 4120, tracks: 12600,
    since: "2013-09-14", perDay: 58,
    topDay: { date: "2024-04-19", count: 247, note: "Lost a Friday to Flip Phone Fantasy on repeat." },
    streak: { current: 31, best: 116 },
    listeningHours: Math.round(totalScrobbles * 3.6 / 60),
    discoveryRate: 0.34,
  };
  const NOW = { artistId: "ocean-grove", artist: "Ocean Grove", track: "Sunny", album: "Flip Phone Fantasy", nowplaying: true };
  const RECENT = [
    ["ocean-grove", "Sunny", "1m"], ["haru-nemuri", "Old Fashioned", "24m"],
    ["coaltar-of-the-deepers", "Wipeout", "52m"], ["machine-girl", "Krystle", "1h"],
    ["the-mad-capsule-markets", "Pulse", "2h"], ["number-girl", "Toumei Shoujo", "3h"],
    ["hanabie", "Pardon Me, I Have to Go Now", "5h"], ["northlane", "Bloodline", "7h"],
  ].map((r, i) => ({ id: "rc" + i, artistId: r[0], artist: (byId[r[0]] || {}).name || r[0], track: r[1], when: r[2], hue: (byId[r[0]] || { hue: 30 }).hue }));

  return {
    ARTISTS, byId, ALBUMS, TRACKS, GENRES,
    CLOCK: buildClock(), ERAS: buildEras(), CONCERTS: buildConcerts(),
    CITIES: Object.keys(CITY), TOTALS, NOW, RECENT, slug,
  };
})();
