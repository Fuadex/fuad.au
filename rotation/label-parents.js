// Record-label → parent-company map for the Shelves "label" lens.
//
// Keys are label names EXACTLY as they appear in ROTATION_ALB_LABELS (the album→label
// cache). Values are the ULTIMATE owner each label rolls up to — the top-level conglomerate,
// never an intermediate division. So every Universal frontline imprint (Interscope, Virgin,
// Geffen, Capitol, EMI…) maps straight to "Universal Music Group"; every Warner imprint
// (Atlantic, Elektra, Roadrunner, Warner Bros…) maps straight to "Warner Music Group"; every
// Sony imprint (Columbia, Epic, RCA, Century Media, Ultra…) maps straight to "Sony Music".
// A label that is its own top of the tree (a genuine independent, or the group name itself)
// maps to itself so the grouped view still has a clean shelf title.
//
// Two jobs, both keyed the same way:
//   1. NORMALISE trivial name variants of ONE label to a single canonical name
//      (e.g. "Nuclear Blast", "Nuclear Blast Records", "Nuclear Blast GmbH" → "Nuclear Blast";
//      "FiXT", "FiXT Music" → "FiXT Music"). A label that only needs normalising maps to
//      its own canonical form.
//   2. CLUSTER labels under the TOP-LEVEL conglomerate / holding company that owns them.
//      The grouped Shelves view shows one shelf per conglomerate; the split toggle then
//      breaks that shelf back into its specific labels.
//
// Sources, in order of confidence: parent hints already carried in the album→label cache
// (MusicBrainz label relationships), then well-established public ownership for the majors
// and the larger metal/electronic groups. Groupings are conservative — where current
// ownership is uncertain, a label stays as itself rather than being folded into a guess.
//
// The Shelves grouped view reads value(label). The split view ignores parents but still
// uses this map to fold name variants together (via ROTATION_LABEL_CANON below).

window.ROTATION_LABEL_PARENTS = {
  // ── Warner Music Group ────────────────────────────────────────────────
  // Atlantic, Elektra, Roadrunner, Warner Bros/Reprise, Parlophone, Rhino, etc. all roll up
  // to WMG at the top. Elektra Music Group and Atlantic Music Group are internal WMG
  // divisions — they do NOT get their own shelf.
  "Roadrunner Records": "Warner Music Group",
  "Roadracer Records": "Warner Music Group",     // Roadrunner's 1980s name
  "Elektra": "Warner Music Group",
  "Elektra Music Group": "Warner Music Group",
  "Warner Bros. Records": "Warner Music Group",
  "Reprise Records": "Warner Music Group",
  "Maverick": "Warner Music Group",
  "Sire Records": "Warner Music Group",
  "Slash": "Warner Music Group",
  "Atlantic": "Warner Music Group",
  "Rhino": "Warner Music Group",
  "Parlophone": "Warner Music Group",            // Parlophone Label Group → WMG (2013)
  "Parlophone Records TOKYO": "Warner Music Group",
  "wea": "Warner Music Group",
  "Warner Music Japan": "Warner Music Group",
  "Warner Music Australia": "Warner Music Group",
  "Warner Music Finland": "Warner Music Group",
  "Warner Music Central Europe": "Warner Music Group",
  "EastWest Japan": "Warner Music Group",
  "EastWest": "Warner Music Group",
  "Rykodisc": "Warner Music Group",              // Warner-owned catalogue label
  "Better Noise Music": "Better Noise Music",    // Eleven Seven / Better Noise — independent
  "Better Noise Records": "Better Noise Music",
  "Eleven Seven Music": "Better Noise Music",

  // ── Universal Music Group ─────────────────────────────────────────────
  // Interscope, Geffen, Capitol, Virgin, EMI, Republic, Def Jam, Island, Decca, Spinefarm…
  "Universal Music Group": "Universal Music Group",
  "Universal Music": "Universal Music Group",
  "Universal": "Universal Music Group",
  "UMe": "Universal Music Group",
  "Universal International": "Universal Music Group",
  "Universal Music Domestic Division": "Universal Music Group",
  "Universal Music Australia": "Universal Music Group",
  "Universal Music Ltda.": "Universal Music Group",
  "UNIVERSAL MUSIC ARTISTS": "Universal Music Group",
  "USM JAPAN": "Universal Music Group",
  "Interscope Records": "Universal Music Group",
  "Geffen Records": "Universal Music Group",
  "DGC Records": "Universal Music Group",         // Geffen imprint
  "A&M Records": "Universal Music Group",
  "A&M/Octone Records": "Universal Music Group",
  "Republic Records": "Universal Music Group",
  "Casablanca": "Universal Music Group",
  "Casablanca Records (Republic Records)": "Universal Music Group",
  "Def Jam Recordings": "Universal Music Group",
  "Capitol Records": "Universal Music Group",
  "Virgin": "Universal Music Group",
  "Virgin Records": "Universal Music Group",
  "Virgin Records America, Inc.": "Universal Music Group",
  "Virgin EMI Records": "Universal Music Group",
  "Virgin Music Group": "Universal Music Group",
  "EMI": "Universal Music Group",                // EMI recorded-music → UMG (2012)
  "Harvest": "Universal Music Group",            // EMI/Capitol imprint
  "Decca Records": "Universal Music Group",
  "Mercury Records": "Universal Music Group",
  "Island": "Universal Music Group",
  "Fiction": "Universal Music Group",            // Fiction Records (UMG UK)
  "Vertigo Berlin": "Universal Music Group",
  "Motor Music": "Universal Music Group",
  "Caroline International": "Universal Music Group",
  "Caroline Records": "Universal Music Group",
  "Aftermath Entertainment": "Universal Music Group",  // via Interscope
  "Top Dawg Entertainment": "Universal Music Group",   // distributed via Interscope
  "Cherrytree Records": "Universal Music Group",
  "Spinefarm Records": "Universal Music Group",
  "Spinefarm Records U.K.": "Universal Music Group",
  "Spinnin’ Records": "Universal Music Group",

  // ── Sony Music ────────────────────────────────────────────────────────
  // Columbia, Epic, RCA, Century Media (+ its Inside Out sub), Ultra, Music for Nations…
  "Sony Music": "Sony Music",
  "Sony Music Records": "Sony Music",
  "Sony Music Associated Records": "Sony Music",
  "Columbia": "Sony Music",
  "Epic": "Sony Music",
  "Epic Records": "Sony Music",
  "RCA": "Sony Music",
  "Century Media": "Sony Music",                 // Century Media Records → Sony (2015)
  "Inside Out Music": "Sony Music",              // InsideOut → Century Media → Sony
  "Music for Nations": "Sony Music",             // reactivated under Columbia UK / Sony
  "SME Records": "Sony Music",
  "Jive": "Sony Music",
  "CBS": "Sony Music",                           // legacy → Columbia/Sony
  "SACRA MUSIC": "Sony Music",                   // Sony Music Japan imprint
  "DefSTAR RECORDS": "Sony Music",
  "Aniplex": "Sony Music",                       // Sony/Aniplex
  "Ultra Records": "Sony Music",                 // Ultra → Sony (2021)
  "Ultra Records, LLC": "Sony Music",

  // ── BMG (BMG Rights Management) ───────────────────────────────────────
  "BMG": "BMG",
  "BMG Rights Management": "BMG",
  "BMG Japan": "BMG",
  "BMG Direct Marketing, Inc.": "BMG",
  "Sanctuary Records": "BMG",                    // Sanctuary catalogue → BMG

  // ── Concord ───────────────────────────────────────────────────────────
  "Concord Records": "Concord",
  "Craft Recordings": "Concord",                 // Concord catalogue arm
  "Razor & Tie": "Concord",
  "Loma Vista Recordings": "Concord",            // Concord Music Group label
  "Fearless Records": "Concord",                 // Concord-owned

  // ── Believe ───────────────────────────────────────────────────────────
  // Believe acquired Nuclear Blast (via Nuclear Blast/Sanctum) in 2018.
  "Nuclear Blast": "Believe",
  "Nuclear Blast Records": "Believe",
  "Nuclear Blast GmbH": "Believe",

  // ── Independents that keep their own top-level shelf ──────────────────
  "Cooking Vinyl": "Cooking Vinyl",
  "Sumerian Records": "Sumerian Records",
  "FiXT Music": "FiXT Music",
  "FiXT": "FiXT Music",
  "UNFD": "UNFD",
  "Rise Records": "Rise Records",
  "SharpTone Records": "SharpTone Records",
  "Long Branch Records": "Long Branch Records",
  "Arising Empire": "Arising Empire",
  "Napalm Records": "Napalm Records",
  "Metal Blade Records": "Metal Blade Records",
  "Season of Mist": "Season of Mist",
  "Relapse Records": "Relapse Records",
  "Earache Records": "Earache Records",
  "Hopeless Records": "Hopeless Records",
  "Hopeless Records, Inc.": "Hopeless Records",
  "Pure Noise Records": "Pure Noise Records",
  "Epitaph": "Epitaph",
  "Mascot Records": "Mascot Records",
  "Out of Line": "Out of Line Music",
  "Out of Line Music": "Out of Line Music",
  "Steamhammer": "SPV",
  "Noise Records": "SPV",                        // Noise catalogue → BMG later, historically SPV
  "Noise International": "SPV",
  "Peaceville": "Peaceville",
  "Kscope": "Snapper Music",                     // Kscope is a Snapper Music imprint
  "SO Recordings": "Silva Screen",
  "AFM Records": "Soulfood",
  "Prophecy Productions": "Prophecy Productions",
  "Metal Mind Productions": "Metal Mind Productions",
  "Metal Mind Records": "Metal Mind Productions",

  // ── Electronic / dance independents ───────────────────────────────────
  "Monstercat": "Monstercat",
  "Monstercat Uncaged": "Monstercat",
  "mau5trap": "mau5trap",
  "Hospital Records": "Hospital Records",
  "Breakbeat Kaos": "Hospital Records",
  "Viper Recordings": "Viper Recordings",
  "Insomniac": "Insomniac",
  "Future Classic": "Future Classic",
  "STMPD RCRDS": "STMPD RCRDS",

  // ── Beggars Group ─────────────────────────────────────────────────────
  "XL Recordings": "Beggars Group",
  "Young Turks": "Beggars Group",
  "4AD": "Beggars Group",
  "Matador": "Beggars Group",
  "True Panther Sounds": "Beggars Group",
  "Rough Trade": "Beggars Group",                // Rough Trade distributed via Beggars

  // ── PIAS ──────────────────────────────────────────────────────────────
  "[PIAS] Cooperative": "PIAS",
  "[PIAS] Recordings": "PIAS",
  "Cooperative Music": "PIAS",
  "Invada": "PIAS",                              // Invada distributed via [PIAS]/Lakeshore

  // ── Japanese majors / independents ────────────────────────────────────
  "Victor": "JVCKenwood Victor Entertainment",
  "TOY’S FACTORY": "TOY’S FACTORY",
  "PONY CANYON": "PONY CANYON",
  "株式会社ポニーキャニオン": "PONY CANYON",
  "KADOKAWA": "KADOKAWA",
  "SPEEDSTAR": "JVCKenwood Victor Entertainment",
  "Spiritual Beast": "Spiritual Beast",
  "AMUSE Inc.": "AMUSE Inc.",
  "Hostess Entertainment Unlimited": "Hostess Entertainment Unlimited",

  // ── Independents that stand alone (self → self, several with name variants) ─
  "Nothing Records": "Nothing Records",
  "The Null Corporation": "The Null Corporation",
  "Flip Records": "Flip Records",
  "American Recordings": "American Recordings",
  "Dirty Hit": "Dirty Hit",
  "Sub Pop Records": "Sub Pop Records",
  "Sacred Bones Records": "Sacred Bones Records",
  "Dais Records": "Dais Records",
  "Partisan Records": "Partisan Records",
  "Heavenly Recordings": "Heavenly Recordings",
  "Loosegroove Records": "Loosegroove Records",
  "Prosthetic Records": "Prosthetic Records",
  "Listenable Records": "Listenable Records",
  "The End Records": "The End Records",
  "Osmose Productions": "Osmose Productions",
  "Avantgarde Music": "Avantgarde Music",
  "Blood Music": "Blood Music",
  "Marshall Records": "Marshall Records",
  "Church Road Records": "Church Road Records",
  "Holy Roar Records": "Holy Roar Records",
  "Closed Casket Activities": "Closed Casket Activities",
  "Victory Records": "Victory Records",
  "Trustkill Records": "Trustkill Records",
  "Artery Recordings": "Artery Recordings",
  "Basick Records": "Basick Records",
  "LAB Records": "LAB Records",
  "Red Bull Records": "Red Bull Records",
  "Roadshow Music": "Roadshow Music",
  "Dim Mak Records": "Dim Mak Records",
  "Sumerian Records ": "Sumerian Records",
  "Alfa Matrix": "Alfa Matrix",
  "Selfmadegod Records": "Selfmadegod Records",
  "Candlelight Records": "Candlelight Records",
  "Candlelight Records USA": "Candlelight Records",
  "Locomotive Records": "Locomotive Records",
  "AVALON": "AVALON",
  "SevenOne Music": "SevenOne Music",
  "GUN Records": "SPV",                          // GUN was an SPV imprint
  "UDR": "UDR",
  "Riot Entertainment": "Riot Entertainment",
  "Mystic Production": "Mystic Production",
  "Irond": "Irond",
  "Boma Records": "Boma Records",
  "Revive Records": "Revive Records",
  "Faravid Records": "Faravid Records",
  "Bakuretsu Records": "Bakuretsu Records",
  "K.O.G.A. Records": "K.O.G.A. Records",
  "RHW Records": "RHW Records",
  "Scarecrow Records": "Scarecrow Records",
  "A-Zap Records": "A-Zap Records",
  "Glass Air": "Glass Air",
  "Fonografika": "Fonografika",
  "DRIPFED Music": "DRIPFED Music",
  "Headphone Dust": "Headphone Dust",            // Steven Wilson's own imprint
  "Puscifer Entertainment": "Puscifer Entertainment",
  "Tool Dissectional": "Tool Dissectional",
  "Evil Ink": "Evil Ink",
  "HevyDevy Records": "HevyDevy Records",
  "Worldeater Records": "Worldeater Records",
  "NLV Records": "NLV Records",
  "NewRetroWave": "NewRetroWave",
  "Lowtemp": "Lowtemp",
  "Modern Music": "Modern Music",
  "humans are such a fragile machine": "humans are such a fragile machine",
  "HAUS OF THUG": "HAUS OF THUG",
  "Chilli Tribe Records": "Chilli Tribe Records",
  "Surf Gang Records": "Surf Gang Records",
  "Easy Life Records": "Easy Life Records",
  "Terrible Records": "Terrible Records",
  "YEAR0001": "YEAR0001",
  "Failure Records": "Failure Records",
  "Boss Battle Records": "Boss Battle Records",
  "INTACT RECORDS": "INTACT RECORDS",
  "Krankenhaus Records": "Krankenhaus Records",
  "earMUSIC": "Edel",                            // earMUSIC is an Edel imprint
  "Membran": "Membran",
  "Nocturnal Productions": "Nocturnal Productions",
  "Golden Era Records": "Golden Era Records",
  "Dine Alone Records": "Dine Alone Records",
  "Alter Bridge Recordings": "Alter Bridge Recordings",
  "MTA Records": "MTA Records",
  "Position Music": "Position Music",
  "Around the World": "Around the World",
  "No Quarter Prod": "No Quarter Prod",
  "Take Me to the Hospital": "Take Me to the Hospital",
  "Earstorm": "Earstorm",
  "LUMINELLE": "LUMINELLE",
  "Zoo Entertainment": "Zoo Entertainment",
  "13th Planet Records": "13th Planet Records"
};

// A label → canonical-name map, derived so the SPLIT view (no grouping) still folds
// trivial variants (Records/GmbH/Inc. suffixes, casing) onto one shelf. When a label is
// its own parent, the canonical name is that label; otherwise the split view keeps the
// label's own name but we still normalise the handful of pure-variant pairs listed here.
window.ROTATION_LABEL_CANON = {
  "Nuclear Blast Records": "Nuclear Blast",
  "Nuclear Blast GmbH": "Nuclear Blast",
  "FiXT": "FiXT Music",
  "Hopeless Records, Inc.": "Hopeless Records",
  "Candlelight Records USA": "Candlelight Records",
  "Metal Mind Records": "Metal Mind Productions",
  "Better Noise Records": "Better Noise Music",
  "Out of Line": "Out of Line Music",
  "Roadracer Records": "Roadrunner Records",
  "Spinefarm Records U.K.": "Spinefarm Records",
  "株式会社ポニーキャニオン": "PONY CANYON",
  "Ultra Records, LLC": "Ultra Records",
  "Monstercat Uncaged": "Monstercat",
  "Virgin Records": "Virgin",
  "Virgin Records America, Inc.": "Virgin",
  "Universal Music": "Universal Music Group",
  "Epic Records": "Epic"
};
