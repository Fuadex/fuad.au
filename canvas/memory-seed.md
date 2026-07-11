> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Canvas — Phase 0 memory-seed log

Session log of the memory reconstruction (started 2026-07-07). Raw recollections from
Fuad → resolved entities → open questions. `museums.js` / `artworks.js` carry the
structured output; this file keeps the reasoning so nothing is lost between sessions.

## Resolved (high confidence)

| Memory | Resolution |
|---|---|
| "Monet collection at Artizon, Tokyo" | **Artizon Museum** (ex-Bridgestone, Ishibashi Foundation) — strong impressionist holdings incl. Monet. Recent trip. |
| "Swedish Masters at Metropolitan Tokyo Museum; painting made to resemble wood patterns — floored me" | **Tokyo Metropolitan Art Museum** (Ueno). The wood-pattern painter is almost certainly **Gustaf Fjæstad** (1868–1948) — his signature move: paintings imitating woodgrain/frost, plus actual woodgrain furniture & tapestries. Exact work + exhibition name TBC. |
| "Monet, lady with umbrella, Washington DC" | **Woman with a Parasol — Madame Monet and Her Son** (1875), **National Gallery of Art, Washington DC**. |
| "Podkowiński, Szał uniesień — MNW Warsaw, likely also Kraków" | One canvas exists (Podkowiński slashed it himself in 1894; restored). It hangs in the **Sukiennice Gallery (MNK), Kraków**. A Warsaw sighting = loan or a different Podkowiński — both visits recorded, work pinned to Sukiennice as `probably`. |
| "Klimt in Vienna, long ago" | Almost certainly **Upper Belvedere** (The Kiss lives there). Confidence: unsure; which works TBC. |
| "d'Orsay a few times, wide impressionists" | **Musée d'Orsay**, multiple visits. |
| "MET's gallery, NY, ~2019" | **The Met**, ~2019. |
| "Museum of Natural History NY — best museum I've ever seen, only 2 bottom floors" | **AMNH**, ~2019 trip. Not art — recorded with `kind: natural-history`; it's the benchmark experience. |
| "Ireland: William John Leech, The Sunshade; also Convent Garden" | **National Gallery of Ireland**, Dublin. *The Sunshade* ✓ and *A Convent Garden, Brittany* ✓ — both his, both NGI. Memory checks out exactly. |
| "Monet's Water Lilies at his museum in Paris" | **Musée Marmottan Monet** (largest Monet collection anywhere). |
| "Water Lilies at l'Orangerie" | **Musée de l'Orangerie** — the Nymphéas cycle rooms. |
| "Stockholm national museum: sculptor, unbelievable drawings" | **Nationalmuseum, Stockholm**; the profile (huge in-house collection, sculptures + celebrated drawings) fits **Johan Tobias Sergel** (1740–1814) — TBC with Fuad. |
| "Pollock at Tate Modern" | **Tate Modern**, London. Which Pollocks TBC (likely *Summertime 9A* / *Yellow Islands*). |
| "Paris contemporary museum that looks like a factory" | **Centre Pompidou** (the inside-out building). |
| "Best sculptures in Paris; his museum explains he was a teacher with his own school" | Two candidates: **Musée Bourdelle** (Antoine Bourdelle — famously a *teacher*, La Grande Chaumière; students incl. Giacometti) fits the teacher detail best; **Musée Rodin** fits "best sculptures in Paris" by default. TBC via recognition (garden + The Thinker vs Montparnasse studio + monumental Herakles). |
| "Tanaka Isson — amazing in real life" | **Tanaka Isson** (1908–1977, the Amami Ōshima painter). Likely the big **2024 Tokyo Metropolitan Art Museum retrospective** — same building as the Swedish show; venue/trip TBC. |

## Calibration decisions
- **Exhibitions count.** Two of the strongest memories (Swedish Masters, Isson) are
  temporary shows → the data model carries `via: "exhibition"` + exhibition name.
- **Non-art museums count as visits** (`kind` field) — AMNH is the best-museum benchmark.
- Taste center of gravity: **impressionism / post-impressionism; Monet is the favorite
  artist** ("incredibly lucky to see so many of his works"). Seeds the similar-artist
  direction and the pilgrimage ranking.

## Answered (session 2, 2026-07-07)
1. ✅ Wood-pattern painter = **Fjæstad** ("might have been him, yes"). Exact work + the
   marvelous poster painting → recall deck.
2. ✅ Stockholm = **Sergel confirmed**. The standout was a "just beautiful sketch of two
   people dancing" → identify the exact dance drawing via deck.
3. ✅ Paris sculptor = **Rodin** ("best with expressions and such, incredible"). Fuad also
   rates Bourdelle "good" — did a Musée Bourdelle visit happen too? (open)
4. ✅ Klimt = **The Kiss (probably) + more golden works** at Belvedere. Judith I is the
   prime candidate for the others → deck.
5. ◐ Isson: the 2024 retrospective is real, but Fuad **couldn't verify the venue** on the
   website — seeing Isson in person is SURE, the where is open.
6. ✅ Australia: **AGNSW, NGV, both Canberra galleries** (assumed NGA + National Portrait
   Gallery — correct if the pair was different).
7. ✅ Beksiński **seen in person, three venues**: Kraków (permanent gallery — NCK? TBC),
   a temporary show in **Warsaw-Praga** (Koneser? TBC), and **Częstochowa** (Miejska
   Galeria Sztuki collection). Possibly a fourth city, unrecalled. NOT Sanok, notably.

## Answered (session 3 — the Google Timeline match, 2026-07-07)
`match-museums.js` coordinate-matched 17 years of Timeline against Wikidata museums:
**336 venues, 963 visit events** (raw: `.sptmp/location/museum-visits.json`; location data
stays out of the repo — only names+dates enter here). All 19 resolvable museums.js entries
now carry REAL dates. Mysteries resolved:
- ✗ RETRACTED (Fuad, 2026-07-07): **no Tokyo trip in 2024** — the Timeline 2024-10-16 Tokyo Met match was wrong (removed from museums.js). The Isson venue question REOPENS: the 2024 retrospective cannot be where he saw Isson; his Tokyo Met visits are 2026 only. Candidates: another Isson show, or the Amami museum.
- ✅ **Swedish Masters = Tokyo Met, 2026-01-28 and/or 2026-02-15** (two visits) — and the
  Stockholm Nationalmuseum visit followed on **2026-04-16**: saw the Swedish loans in
  Tokyo, then their home museum ten weeks later. (Fjæstad's works are Nationalmuseum's.)
- ✅ **Musée Bourdelle WAS visited** (same Paris day as Pompidou + Petit Palais, with the
  Giacometti Institute the day before). And **Musée Rodin 2023-09-22, 160 min**.
- ✅ **The Klimt visit = Belvedere, 2017-06-20** (33 min; same day: MAK, KunstHausWien).
  Second Vienna trip 2015-11 (Dom Museum, Palais Eskeles/Jewish Museum).
- ◐ **Warsaw-Praga Beksiński lead**: Neon Museum (Soho Factory, Praga) visits on
  2019-07-22 + 2024-05-18/29 — the Beksiński gallery operated AT Soho Factory; the
  2019-07-22 visit is the prime candidate for the Praga Beksiński encounter. Confirm.
- ✗ Kraków shows NO Nowa Huta/NCK trace (trips were 2014-04 + 2015-07, Old Town only) —
  the Kraków Beksiński venue question stays open (pre-2014? different venue?).
- ✗ **No Washington DC trace at all** — the Woman-with-a-Parasol visit is either pre-2009
  or untracked. Date stays TBC.
- NGI Dublin: the 2017-03 Dublin trip is on the timeline (Kilmainham Gaol 2017-03-21) but
  NGI itself fell below the match threshold — visit real, date ~2017-03.

**Major NEW discoveries the memory session missed entirely** (full curated list in
`.sptmp/location/museum-visits-report.md`): the 2019 NYC museum season (Guggenheim, Frick,
Whitney, MoMA ×2, The Cloisters, New Museum, Cooper Hewitt…), **Van Gogh Museum 2016-08-08**,
Kunsthaus Zürich + Museum Rietberg + Tinguely (2017), Museum Ludwig + Städel (2018-11),
Acropolis Museum (2018-11), Seoul MMCA + National Museum of Korea (2018, 2025), Montreal
MFA (2019), the deep Australia sweep (AGSA, QAGOMA, Ian Potter, Brett Whiteley Studio,
White Rabbit), the 2025–26 Japan wave (Hokusai Museum, Mori, National Art Center, MOMAT, Sompo, Ōta Memorial, Yamatane, teamLab, Ghibli — NB per Fuad there was NO 2024 Tokyo trip, so any 2024-dated Japan rows in the .sptmp report are suspect and must not be promoted), **Scrovegni Chapel 2025-09-30** (Giotto!),
Getty Villa 2025-09-29, Kunstmuseum Stuttgart + ZKM (2026-05), Hagia Sophia (2013).
Known false positives (neighborhood artifacts, excluded): Forbes Galleries 124× (closed
venue next to the 2019 NYC residence), MAAS 55×, Samurai Museum 13×, etc.

## Open questions (next session)
1. Fjæstad: which painting; which work was the exhibition poster? (deck)
2. Sergel: identify the dancing-couple drawing. (deck)
3. Beksiński Kraków venue (no NCK trace on timeline — pre-2014 or elsewhere?);
   confirm Praga = Soho Factory 2019-07-22; the possible 4th city.
4. Skim the new-discoveries report → promote real art encounters into museums.js/artworks.js
   (Guggenheim/Frick/Whitney/Van Gogh Museum/Scrovegni are obvious candidates).
5. Artizon / Tate / Pompidou / Met / d'Orsay / Belvedere standouts → recall decks (live).
6. Woman with a Parasol: date of the DC trip (pre-2009?).
