> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# The global IIIF census — who actually serves art at high resolution

A research document. Companion to [HIRES_SOURCING.md](HIRES_SOURCING.md) (the hunt log and
provider ledger) and [NGA_IIIF_CANDIDATES.md](NGA_IIIF_CANDIDATES.md) (the adoption list that
built ~670 works of this canon).

**The question it answers:** is the National Gallery of Art unusual, or had we simply not
looked? Short answer: **IIIF is common, gigapixel masters are rare, and the two facts are
almost unrelated — a museum's manifest count barely predicts its image quality, and in this
sample it inversely tracks it.**

---

## 1. The instrument — one request characterises the whole planet

Wikidata property **P6108 is "IIIF manifest URL"**. Crossed with **P195 (collection)** and
filtered to **Q3305213 (painting)**, one grouped SPARQL query returns every museum on earth
that publishes IIIF for paintings, ranked, with a sample manifest to probe:

```sparql
SELECT ?collLabel (COUNT(?item) AS ?c) (SAMPLE(?m) AS ?manifest) WHERE {
  ?item wdt:P31 wd:Q3305213 ; wdt:P6108 ?m ; wdt:P195 ?coll .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
} GROUP BY ?collLabel ORDER BY DESC(?c) LIMIT 60
```

Swap the filter for `?item wdt:P170 wd:Q296` and it answers "where are the IIIF Monets".
Add `?coll wdt:P17 wd:Q17` and it answers "what does Japan publish". **This replaced
holder-by-holder guessing with a ranked list at a cost of one HTTP request**, and it is the
method to reach for first on any new hunt.

### Two traps in the output — read before trusting a row

1. ⛔ **The SAMPLE url frequently belongs to a different museum.** Works carry multiple P195
   values, so provenance groupings — Kress, Mellon, Cook, Rosenwald, Corcoran, Musées
   Nationaux Récupération, Führermuseum — are the *same* works counted again under their
   ownership history, and they sample with their current holder's url. The Louvre, Hermitage
   and Tokyo rows below all came back with `nga.gov` samples for this reason. **Check the
   host before treating a sample as that museum's route.**
2. ⛔ **Coverage is Wikidata's, not the museum's.** A low count is evidence about Wikidata.
   Japan is the proof: it registers almost nothing here and is one of the most IIIF-dense
   countries on earth.

---

## 2. The census (2026-08-27, top 60 by registered painting manifests)

| # | collection | manifests | host |
|---|---|---|---|
| 1 | Nationalmuseum (Stockholm) | 7,750 | nationalmuseumse.iiifhosting.com |
| 2 | Statens Museum for Kunst (SMK) | 6,740 | api.smk.dk |
| 3 | Harvard Art Museums | 5,490 | iiif.harvardartmuseums.org |
| 4 | Musée d'Orsay | 4,843 | iiif.musee-orsay.fr |
| 5 | National Gallery of Art (Q214867) | 4,262 | nga.gov |
| 6 | Belvedere | 4,114 | sammlung.belvedere.at |
| 7 | Princeton Art Museum | 3,111 | data.artmuseum.princeton.edu |
| 8 | **Royal Museum of Fine Arts Antwerp (KMSKA)** | 2,673 | iiif.kmska.be |
| 9 | Fogg Museum | 2,446 | iiif.harvardartmuseums.org |
| 10 | Arthur M. Sackler Museum | 2,020 | iiif.harvardartmuseums.org |
| 11 | Nelson-Atkins | 1,783 | art.nelson-atkins.org |
| 12 | Yale Center for British Art | 1,691 | manifests.britishart.yale.edu |
| 13 | National Portrait Gallery of Sweden | 1,683 | nationalmuseumse.iiifhosting.com |
| 14 | Museum of Fine Arts Ghent (MSK) | 1,568 | imagehub.mskgent.be |
| 15 | Kunsthistorisches Museum | 851 | ⛔ sampled with Belvedere's host |
| 16 | Munch Museum | 739 | munch.emuseum.com |
| 17–18 | National Library of Wales (2 collections) | 644 · 613 | dams.llgc.org.uk |
| 19 | Yale University Art Gallery | 602 | manifests.collections.yale.edu |
| 20 | Germanisches Nationalmuseum | 576 | objektkatalog.gnm.de |
| 21 | Corcoran Gallery of Art | 529 | ⛔ NGA (absorbed 2014) |
| 22 | Vlaamse Kunstcollectie | 441 | iiif.kmska.be |
| 23 | Samuel H. Kress Collection | 390 | ⛔ NGA provenance |
| 24 | Augustiner Museum | 383 | expodelivery.bsz-bw.de |
| 25 | Vanderbilt Museum of Art | 376 | iiif-manifest.library.vanderbilt.edu |
| 26 | Andrew W. Mellon collection | 299 | ⛔ NGA provenance |
| 27 | Busch–Reisinger Museum | 222 | iiif.harvardartmuseums.org |
| 28 | Museum Mayer van den Bergh | 213 | dams.antwerpen.be |
| 29 | Musées Nationaux Récupération | 133 | ⛔ provenance |
| 30 | Bavarian State Painting Collections | 125 | objektkatalog.gnm.de |
| 31 | Rubenshuis | 111 | dams.antwerpen.be |
| 32 | Collectie Vlaamse Gemeenschap | 109 | iiif.kmska.be |
| 34 | Department of Paintings of the Louvre | 63 | ⛔ sampled with nga.gov |
| 35 | Arthur M. Sackler Gallery | 55 | ids.si.edu |
| 38 | Hammer Museum | 40 | collections.hammer.ucla.edu |
| 40 | National Museum in Kraków | 31 | api-zbiory.mnk.pl |
| 47 | Freer Gallery of Art | 22 | ids.si.edu |
| 53 | Art Institute of Chicago | 18 | api.artic.edu |
| 54 | Victoria and Albert Museum | 17 | iiif.vam.ac.uk |
| 59 | Hermitage Museum | 14 | ⛔ sampled with nga.gov |
| 60 | Pinacoteca Vaticana | 14 | catalogo.museivaticani.va |

Rows 33, 36–37, 39, 41–46, 48–52, 55–58 are provenance groupings, castle collections or
regional French museums sampling through Orsay's host; omitted for readability.

---

## 3. ⚙ MEASURED — and the ranking is nearly anti-correlated with quality

Every figure below is a canvas dimension read from the holder's own manifest.

| holder | manifests | measured master | MP | verdict |
|---|---|---|---|---|
| **KMSKA Antwerp** | 2,673 | **19,924 × 12,341** | **245.9** | ⭐ **NGA-class.** IIIF 2 **level2** |
| MSK Ghent | 1,568 | 6,000 × 3,384 | 20.3 | fine. IIIF 2 level1 |
| Harvard | 5,490 | 1,976 × 2,450 | 4.8 | matches the 5.1 MP already in our store |
| Princeton | 3,111 | 1,199 × 1,452 | 1.7 | low |
| **Belvedere** | **4,114** | 1,123 × 905 | **1.0** | ⛔ four thousand manifests at one megapixel |

For scale, from our own store: **NGA 400–1,900 MP · Getty 52–203 MP · Yale 13–17 MP ·
Met 10.6 MP · Guggenheim 11.7 MP · Frick 6.5 MP cap · Whitney 3.1 MP.**

⭐ **The lesson.** Belvedere publishes 4,114 manifests at 1 MP; KMSKA publishes 2,673 at
246 MP. Sorting by count puts Belvedere *above* KMSKA. **Only measurement separates them, and
"has IIIF" is worth almost nothing as a signal.** The bar to beat is roughly **50 MP**, not
the presence of a manifest.

### KMSKA — the find
```
https://iiif.kmska.be/iiif/2/34343/manifest.json
  canvas 19924 × 12341
  service @id  https://iiif.kmska.be/c/iiif/2/public@34343.tif
  profile      http://iiif.io/api/image/2/level2.json
```
The service id is `public@<objectid>.tif` — **constructible for all 2,673 works.**
⚠ CORS unmeasured (needs an `Origin:` probe with curl, which WebFetch cannot send).

**What KMSKA holds, by artists already in this canon** (top-40 artist slice, 141 works):
James Ensor **39** (canon holds 1) · Peter Paul Rubens **34** (holds 18) · Jan August Hendrik
Leys **34** (holds 1) · Anthony van Dyck **19** (holds 31) · Constantin Meunier **15**
(holds 1). Deep Flemish names *not* yet in canon: Jacob Jordaens 22 — including the measured
manifest above, *The Daughters of Cecrops Finding the Child Erichthonius* — plus Maerten de
Vos 38, Henri de Braekeleer 32, Rik Wouters 25, Constant Permeke 21, Quinten Metsys 15.

---

## 4. Where the IIIF Monets and Turners actually are

**Monet** (works by Q296 carrying a manifest):

| collection | works | usable? |
|---|---|---|
| Musée d'Orsay | 87 | ⛔ **no** — measured 850 px ceiling, a downgrade on everything |
| National Gallery of Art | 29 | ✅ already our best source |
| Harvard / Fogg | 10 | ~4.8 MP |
| Musée des Beaux-Arts de Rouen | 6 | ⛔ serves through Orsay's host |
| Art Institute of Chicago | 6 | ⚠ image server measured 403 |
| Nelson-Atkins | 5 | ⚠ unprobed — connection refused |
| Belvedere · Princeton | 3 · 3 | 1.0 / 1.7 MP |
| Nationalmuseum Stockholm | 2 | ⚙ regions serve native off masters to 8,875 px |
| **J. Paul Getty Museum** | 1 | ✅ 52–203 MP class |
| Hammer, Fabre, Lille, Grenoble, Angers, Caen, Pontoise | 1 each | mostly Orsay-hosted |

⭐ **The blunt finding: outside NGA there is no large pool of high-resolution Monet.** The
French holdings are numerous and capped; the American ones are small or low-res. Getty's
single Monet and Stockholm's two are the only clear quality wins.

**Turner** (works by Q159758 carrying a manifest):

| collection | works | note |
|---|---|---|
| National Gallery of Art | 117 | ⚠ mostly PRINTS — the *Prints* (102) and *Rosenwald* (81) rows are the same works re-counted |
| **Yale Center for British Art** | 14 registered | ⚠ Wikidata undercounts badly — a direct probe found **80 YCBA Turners**; 13–17 MP |
| Vanderbilt | 2 | unprobed |
| Nationalmuseum · NLW · Nelson-Atkins · Harvard | 1 each | — |

⭐ **Turner is a YCBA story and nothing else.** No other holder has depth, and YCBA's plates
are study-grade (13–17 MP cropped), not gigapixel. ⚠ Note YCBA serves **framed / unframed /
cropped** variants per object — the framed plate is the largest *and the wrong picture*.

---

## 5. Open leads, in priority order

1. **KMSKA** — run the canon-scoped Wikidata match (the Getty method) and generate a
   candidates file. Best pixel-per-effort ratio found so far.
2. **SMK Copenhagen** — 6,740 manifests, and a 118.8 MP work is already recorded in
   HIRES_SOURCING. Its Presentation-3 manifest returns an empty `items` array through a
   markdown-converting client; **needs a raw-JSON fetch.**
3. **Nationalmuseum Stockholm** — 7,750 manifests, the largest count on the board. Route is
   already known (`api.nationalmuseum.se/api/objects/<obj>` → `data[0].iiif`), and its flat
   renders clamp at 1,000 px while **regions serve native**. Re-measure by region.
4. **Nelson-Atkins and the Munch Museum** — both refused the connection through this client;
   retry with curl and a normal user-agent before writing either off.
5. **National Museum of Western Art, Tokyo** — the Matsukata collection (Monet, Courbet,
   van Gogh). Japan publishes outside Wikidata; probe its own portal.

## 6. What this document is not

No figure here is a substitute for measuring the work you actually want. Two failures already
recorded in HIRES_SOURCING are the reason for the ⚙/⚠ marking discipline: Getty's candidate
table carries a Commons-derived MP column that is wrong **23× low on one work and 19× high on
another**, and both Oslo and Stockholm were written off as capped when their *flat renders*
were clamped and their *regions* served native pixels off enormous masters. **A clamp is not a
ceiling, a name is not a measurement, and a manifest count is not a quality bar.**
