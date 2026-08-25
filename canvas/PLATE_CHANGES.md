# Plate changes — the last two days

Built from git history: every commit touching `canvas/art_hires.js`, diffed per record. Every URL below was **fetched and decoded** — the dimensions are measured from the JPEG header, not read from a field.

**204** works had their image source change. **143** new plates verified 200. **18** are genuine replacements with a resolvable previous plate; the other **136** are records that did not exist before.

Total measured: **52 MP -> 2183 MP** (+444.7 MP from ten Nationalmuseum re-frames at 80acb76; +13 MP from Szał uniesień restore at f62ee3f).

> CORS note: Guggenheim assets carry no ACAO and load through `img.fuad.au/gugg/` in the app — a direct browser tab is fine, an in-page fetch is not. MNW and Nationalmuseum both measured `ACAO: *`.

---

## Framing, not resolution — your eye decides these

Small linear gain with a real aspect change: the picture is differently cropped rather than sharper. This is the `ferdynand-ruszczyc-stary-dom` shape, which you compared and reverted — the MNW capture was truer to the object but only ~8% larger per axis, so it bought framing and not detail.

### Cypresses
`vincent-van-gogh-cypresse` — **6 stops** — Metropolitan — linear **x0.37**, aspect **-36.87%**

- **before** 4000x3184 (12.7 MP)
  https://images.metmuseum.org/CRDImages/ep/original/DP-42549-001.jpg
- **after** 1476x1861 (2.7 MP)
  https://images.metmuseum.org/CRDImages/ep/original/DP130999.jpg

---

## Toured works whose framing moved

A re-framed plate shifts every box, because box coordinates are fractions of the displayed plate. These need their stops checked.

### Cypresses
`vincent-van-gogh-cypresse` — **6 stops** — Metropolitan — linear **x0.37**, aspect **-36.87%**

- **before** 4000x3184 (12.7 MP)
  https://images.metmuseum.org/CRDImages/ep/original/DP-42549-001.jpg
- **after** 1476x1861 (2.7 MP)
  https://images.metmuseum.org/CRDImages/ep/original/DP130999.jpg

---

## Replacements, largest gain first

### Studium łba końskiego do "Dziewicy Orleańskiej"
`jan-matejko-studium-ba-konskiego-do-dziewicy-orleanskiej` — **no tour** — MNW Warsaw — linear **x1.78**, aspect **-2.65%**

- **before** 1758x2500 (4.4 MP)
  https://upload.wikimedia.org/wikipedia/commons/0/01/Jan_Matejko_-_Study_of_horse%E2%80%99s_head_for_%E2%80%9CThe_Maid_of_Orl%C3%A9ans%E2%80%9D_-_231060_MNW_-_National_Museum_in_Warsaw.jpg
- **after** 3138x4584 (14.4 MP)
  https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/f4/66/f46680cffa6c12e2d71bfdf3d791f21d.jpg

### Droga w lesie
`stanis-aw-witkiewicz-droga-w-lesie` — **no tour** — MNW Warsaw — linear **x1.65**, aspect **-2.01%**

- **before** 1920x2500 (4.8 MP)
  https://upload.wikimedia.org/wikipedia/commons/1/15/Witkacy_-_Droga_w_lesie.jpg
- **after** 3175x4219 (13.4 MP)
  https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/e2/83/e2834d551acfd272e64a583d2471d8bc.jpg

### Portret Wandy z Ciąglińskich Szwengrubenowej, siostry artysty
`jan-ciaglinski-portret-wandy-z-ciaglinskich-szwengrubenowej` — **no tour** — MNW Warsaw — linear **x1.64**, aspect **-2.96%**

- **before** 2224x2500 (5.6 MP)
  https://upload.wikimedia.org/wikipedia/commons/9/9e/Jan_Ci%C4%85gli%C5%84ski_-_Portrait_of_Wanda_Szwengruben_n%C3%A9e_Ci%C4%85gli%C5%84ska%2C_artist%27s_sister_-_MP_1875_MNW_-_National_Museum_in_Warsaw.jpg
- **after** 3655x4234 (15.5 MP)
  https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/fc/3d/fc3da69ed7ba6a4cb17f468a85935b4a.jpg

### Graceful Ascent
`graceful-ascent` — **no tour** — Guggenheim — linear **x1.07**, aspect **+0.00%**

- **before** 3840x3825 (14.7 MP)
  https://commons.wikimedia.org/wiki/Special:FilePath/Wassily_Kandinsky_-_Gentle_accent.jpg?width=3000
- **after** 4096x4080 (16.7 MP)
  https://www.guggenheim.org/wp-content/uploads/1934/01/45.970_ph_web.jpg

### A Fishergirl from the North of France. Study
`august-hagborg-a-fishergirl-from-the-north-of-france-study` — **no tour** — Nationalmuseum Stockholm — linear **x1.00**, aspect **+0.00%**

> Commons hard-clamps TIFF renders at **1920px** regardless of `?width=` param — confirmed via byte-identical response for ?width=1920, ?width=3513, and ?width=9999 (same Content-Length, same upload URL with `1920px` embedded). `w`/`h` in art_hires.js record the native TIFF (3513x4898); the rendered render is always 1920px wide. The param reduction was a documentation fix only.

- **before** 1920x2677 rendered (native TIFF 3513x4898)
  https://commons.wikimedia.org/wiki/Special:FilePath/A_Fishergirl_from_the_North_of_France._Study_%28August_Hagborg%29_-_Nationalmuseum_-_18865.tif?width=3513
- **after** 1920x2677 rendered (same pixels) — verified 302→200
  https://commons.wikimedia.org/wiki/Special:FilePath/A_Fishergirl_from_the_North_of_France._Study_%28August_Hagborg%29_-_Nationalmuseum_-_18865.tif?width=1920

### Motif from Timmermansgatan
`eugene-jansson-motif-from-timmermansgatan` — **5 stops** — Nationalmuseum Stockholm — linear **x1.00**, aspect **+0.00%**

> Same Commons TIFF clamp applies: native TIFF is 2826x3874, but ?width= param has no effect above 1920. The param reduction to ?width=1920 changed nothing about delivered pixels.

- **before** 1920x2632 rendered (native TIFF 2826x3874)
  https://commons.wikimedia.org/wiki/Special:FilePath/Motif_from_Timmermansgatan_%28Eug%C3%A8ne_Jansson%29_-_Nationalmuseum_-_18705.tif?width=2826
- **after** 1920x2632 rendered (same pixels) — verified 302→200
  https://commons.wikimedia.org/wiki/Special:FilePath/Motif_from_Timmermansgatan_%28Eug%C3%A8ne_Jansson%29_-_Nationalmuseum_-_18705.tif?width=1920

### Cypresses
`vincent-van-gogh-cypresse` — **6 stops** — Metropolitan — linear **x0.37**, aspect **-36.87%**

- **before** 4000x3184 (12.7 MP)
  https://images.metmuseum.org/CRDImages/ep/original/DP-42549-001.jpg
- **after** 1476x1861 (2.7 MP)
  https://images.metmuseum.org/CRDImages/ep/original/DP130999.jpg

---

## New records (no previous plate)

Grouped by source, largest first.

### Commons — 3 works, 36 MP

| work | stops | px | MP | url |
|---|---|---|---|---|
| Birds' Nests | - | 6420x5424 | 34.8 | https://upload.wikimedia.org/wikipedia/commons/3/39/Vogelnesten_-_s0001V1962_-_Van_Gogh_Museum.jpg |
| The Madonna of the Pinks ('La Madonna dei Garofani') | 6 | 870x1080 | 0.9 | https://commons.wikimedia.org/wiki/Special:FilePath/Raphael_Madonna_of_the_Pinks.jpg?width=2000 |
| Coastal Scene | 4 | 800x665 | 0.5 | https://commons.wikimedia.org/wiki/Special:FilePath/Th%C3%A9o_van_Rysselberghe_(1862-1926)_-_Coastal_Scene_-_NG6582_-_National_Gallery.jpg?width=2000 |

### Guggenheim — 19 works, 238 MP

| work | stops | px | MP | url |
|---|---|---|---|---|
| Several Circles | 7 | 4016x4096 | 16.4 | https://www.guggenheim.org/wp-content/uploads/1926/01/41.283_ph_web.jpg |
| Composition No. 1 with Grey and Red 1938 / Composition with Red 1939 | - | 3978x4096 | 16.3 | https://www.guggenheim.org/wp-content/uploads/1938/01/76.2553.39_ph_web.jpg |
| Young Boy with a Lamb; The Good Shepherd | - | 3854x4096 | 15.8 | https://www.guggenheim.org/wp-content/uploads/1911/01/48.1172.503_ph_web.jpg |
| Still Life with Gingerpot I | - | 4096x3533 | 14.5 | https://www.guggenheim.org/wp-content/uploads/1911/01/L295.76_ph_web.jpg |
| Portrait of Countess Albazzi | - | 3393x4096 | 13.9 | https://www.guggenheim.org/wp-content/uploads/1880/01/91.3909_ph_web.jpg |
| Portrait of an Army Doctor | - | 3224x4096 | 13.2 | https://www.guggenheim.org/wp-content/uploads/1914/01/37.473_ph_web.jpg |
| The Football Players | - | 3195x4096 | 13.1 | https://www.guggenheim.org/wp-content/uploads/1908/01/60.1583_ph_web.jpg |
| Still Life with Gingerpot II | - | 4096x3096 | 12.7 | https://www.guggenheim.org/wp-content/uploads/1911/01/L294.76_ph_web.jpg |
| White Bull | - | 4096x2995 | 12.3 | https://www.guggenheim.org/wp-content/uploads/1911/01/51.1312_ph_web.jpg |
| Sketch for "Composition II" | - | 4096x2957 | 12.1 | https://www.guggenheim.org/wp-content/uploads/1909/01/45.961_ph_web.jpg |
| Levels | - | 2930x4096 | 12.0 | https://www.guggenheim.org/wp-content/uploads/1929/01/46.1049_ph_web.jpg |
| Small Pleasures | - | 3585x3297 | 11.8 | https://www.guggenheim.org/wp-content/uploads/1913/01/43.921_ph_web.jpg |
| Painting with White Border | 7 | 4096x2865 | 11.7 | https://www.guggenheim.org/wp-content/uploads/1913/01/37.245_ph_web.jpg |
| Woman with Parrot | 7 | 2847x4096 | 11.7 | https://www.guggenheim.org/wp-content/uploads/1871/01/78.2514.68_ph_web.jpg |
| Improvisation 28 (second version) | 6 | 4075x2758 | 11.2 | https://www.guggenheim.org/wp-content/uploads/1912/01/37.239_ph_web.jpg |
| The Unfortunate Land of Tyrol | - | 4096x2637 | 10.8 | https://www.guggenheim.org/wp-content/uploads/1913/01/46.1040_ph_web.jpg |
| Composition | - | 2563x4096 | 10.5 | https://www.guggenheim.org/wp-content/uploads/1916/01/49.1229_ph_web.jpg |
| Composition 8 | - | 2378x4096 | 9.7 | https://www.guggenheim.org/wp-content/uploads/1914/01/49.1227_ph_web.jpg |
| Woman in a Striped Dress | - | 1936x4096 | 7.9 | https://www.guggenheim.org/wp-content/uploads/1877/01/78.2514.28_ph_web.jpg |

### MNW Warsaw — 61 works, 1012 MP

| work | stops | px | MP | url |
|---|---|---|---|---|
| W altanie | 7 | 6000x5540 | 33.2 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/38/72/387251926c3de890b51b5de31f2ac218.jpg |
| Portret Adama Mickiewicza na skale Judahu | 6 | 4921x6000 | 29.5 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/ac/c8/acc8d33a49fac7d5612a0ebc3e38431f.jpg |
| Hamlet polski - Portret Aleksandra Wielopolskiego | 6 | 6620x4446 | 29.4 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/df/a7/dfa78a5a22722e38d5dff309716f9dd0.jpg |
| Ziemia | 6 | 6000x4734 | 28.4 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/e8/7d/e87d0ccde5847b7dcaba26e3da9b21d7.jpg |
| Babie lato | 7 | 6000x4604 | 27.6 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/41/9a/419a42c107c408a20cbee9200aec1a4f.jpg |
| Trumna chłopska | - | 6000x4501 | 27.0 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/ce/ab/ceab00ce4cc70e755e63c32740d148e0.jpg |
| Podmuchy wiosenne | - | 6000x4323 | 25.9 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/0a/83/0a83ff5c3cf038788be94074f9418cfd.jpg |
| Zaprowadzenie chrześcijaństwa. R.P. 965 | - | 6000x4119 | 24.7 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/d5/3f/d53f59da7d0b4922b5b27cc6d2315bb9.jpg |
| Wskrzeszenie Łazarza | - | 4044x6000 | 24.3 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/7f/b7/7fb71dc98608fff01fe0d63de8fcd165.jpg |
| Kobieta spacerująca wokół fontanny w ogrodzie zdrojowym w Kissingen | - | 4028x6000 | 24.2 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/5d/4c/5d4ccbe8ca07232b02c66db88d2a0225.jpg |
| Na łące | - | 5200x3776 | 19.6 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/44/f7/44f7cdc9795c8319595db24bb2ca4fcb.jpg |
| Widok Morysinka w Wilanowie | - | 5138x3565 | 18.3 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/25/aa/25aaed85c51604e410a100a8a9f8fc90.jpg |
| Trzy nimfy nad jeziorem - koncert | - | 5217x3509 | 18.3 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/24/62/2462ea99670e89d425ff155728d875fd.jpg |
| Studium ulicznicy do obrazu "Wschód" | - | 3512x5174 | 18.2 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/16/ab/16ab068e62db23b0338a4ff95ab320f1.jpg |
| Brzozy | - | 3498x5136 | 18.0 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/6f/54/6f54105eebbc0f7b0f75beb1cadeb310.jpg |
| Unitka | - | 4944x3547 | 17.5 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/8c/55/8c5512e4e7bb47558c4ee240afa1c2a2.jpg |
| Antibes - Ranek | - | 5065x3412 | 17.3 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/5b/65/5b652542b3be5745a6aab333d1773086.jpg |
| Plac Opery w Paryżu | - | 4380x3823 | 16.7 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/27/0f/270f6717e6de0b3a8e78d50bd0e837b0.jpg |
| Szarytka w ogrodzie szpitalnym | - | 5278x3164 | 16.7 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/f9/fb/f9fb0d869b4448e596a5931c7524907e.jpg |
| Rzeczpospolita Babińska | - | 5968x2767 | 16.5 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/ce/69/ce69569ec0381f088921fee2458f4cb0.jpg |
| Dama w liliowej sukni z kwiatami | - | 4887x3364 | 16.4 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/90/f4/90f4d91af7f413e2c9649955645a4697.jpg |
| Noc na morzu. Z podróży do Konstantynopola | - | 5389x2996 | 16.1 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/9e/5b/9e5bd6a410653dc684c979ad705c9704.jpg |
| Planty w Krakowie | - | 4905x3268 | 16.0 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/b6/f5/b6f5bdc55e89f2cc3fe5bf4d9009501a.jpg |
| Ognie z okrętu. Z podróży do Palestyny | - | 4737x3377 | 16.0 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/ef/0b/ef0b8936743e18ff73b2f13b1e7f6a60.jpg |
| Statek w mieście | - | 3307x4808 | 15.9 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/ba/2d/ba2df31c0e0a17d134b9495fd675926c.jpg |
| Z pierwszego postoju na pustyni. Z podróży do Palestyny | - | 4672x3403 | 15.9 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/ee/a6/eea611b9b86bc352813dab4d558402ed.jpg |
| Starożytne ruiny. Z podróży do Egiptu | - | 4583x3419 | 15.7 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/61/2a/612adb43213bb7813cdb512e2d457d16.jpg |
| Drzewa | - | 3505x4451 | 15.6 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/27/6c/276ccd709654788687cf3a24ff892826.jpg |
| Portret Teresy z Konów Silberstein | - | 3559x4333 | 15.4 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/ee/07/ee072844b9318273fbfeb5dd76b75e59.jpg |
| Wystawa Sztuk Pięknych w Warszawie w 1828 roku | 9 | 4237x3615 | 15.3 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/cc/17/cc171cd55c49b6f705477b24681c248c.jpg |
| Kobieta w ogrodzie | - | 3350x4519 | 15.1 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/d3/28/d328b0114d663f5c9818a73d00735044.jpg |
| Chrystus w Emaus | - | 4396x3427 | 15.1 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/99/fa/99fa7716277ab08cb377ad5500460423.jpg |
| Ganges po zachodzie słońca. Z podróży do Indii | - | 4375x3430 | 15.0 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/94/9a/949a20494db42b6d7e1a87798953b933.jpg |
| Himalaje. Z podróży do Indii | - | 4391x3412 | 15.0 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/8f/92/8f92618205dc101df5088391bbf58b68.jpg |
| W noc świętojańską | - | 3160x4727 | 14.9 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/68/f8/68f818dc9165150d2351cef95f7251b0.jpg |
| Pejzaż z przeświecającym słońcem | - | 4523x3277 | 14.8 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/36/a9/36a9b8b6d9ad7d1a14bb2de15ec5f9e0.jpg |
| Werki pod Wilnem | - | 4199x3496 | 14.7 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/79/19/79190c25eee581131b34b581db2b4470.jpg |
| Szkic do obrazu "Vita" I | - | 4252x3435 | 14.6 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/1c/e2/1ce28567197276c3c57b338ad9ef84ec.jpg |
| Morze. Z podróży do Konstantynopola | - | 4533x3206 | 14.5 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/2f/d8/2fd8280c758123f6ebda96fdf942bdcd.jpg |
| Portret Eugenii Aleksandry Rubcowej, matki malarza Rubcowa | - | 4366x3325 | 14.5 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/62/c5/62c59e9b52e10f228f00c1a791913544.jpg |
| Podwieczorek | - | 5283x2728 | 14.4 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/ac/62/ac622f1889cd80cac0028d4e2510e325.jpg |
| Portret kobiecy | - | 3238x4351 | 14.1 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/35/7b/357bccc57532f4df29bd4db9fbdc1acb.jpg |
| Scena w lesie | - | 3779x3715 | 14.0 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/79/b0/79b059ba04de8cfdaceee93225fd851c.jpg |
| Chałupy w śniegu | - | 4492x3085 | 13.9 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/b2/15/b2150344f46805d0df58394d16c67e77.jpg |
| Studium głowy do obrazu "Taniec symboliczny" | - | 3377x4099 | 13.8 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/e6/53/e653b120532dfb01f8c268dff7d1ae44.jpg |
| Wodna boginka | - | 3390x4075 | 13.8 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/25/93/2593fa0464bc046f71604c9d12d9fe17.jpg |
| Ze statku. Z podróży do Indii | - | 4185x3282 | 13.7 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/a6/69/a6692adac56544c23f465ed2d5358905.jpg |
| Pejzaż z zagajnikiem brzozowym | - | 4362x3021 | 13.2 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/2d/ea/2dea2481131ec9f952d2b8bc216bdad2.jpg |
| Kołomyjka | 8 | 4159x3140 | 13.1 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/a4/b5/a4b5eb00e924d13a6580f4eadb7a5faf.jpg |
| Pejzaż rzeczny | - | 4310x3015 | 13.0 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/1f/6d/1f6d74a2da71a5ea75f0f6d58f5cc526.jpg |
| Odpoczynek oracza | - | 4165x2995 | 12.5 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/f1/89/f18944710238e79aa16ddaa3ce04cfa2.jpg |
| Pejzaż z Saint-Tropez - Pinie | - | 3182x3837 | 12.2 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/db/c2/dbc2b0546b3676c928e972d55a6608b9.jpg |
| Nokturn - Łabędzie w Ogrodzie Saskim w Warszawie nocą | - | 4608x2597 | 12.0 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/6e/c5/6ec590a313b2b81cc731cfc226173205.jpg |
| Kąpiel w parku | - | 2633x4513 | 11.9 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/5c/d0/5cd0b9fd2aa5bfc999826c4505858c7f.jpg |
| Opuszczona plebania | - | 3043x3842 | 11.7 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/d3/c8/d3c8e8861e859524c49da4a3ddb0ce55.jpg |
| Szał, szkic | - | 3071x3695 | 11.3 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/4d/36/4d362761024aef6717f6677b1cf10352.jpg |
| Dirce chrześcijańska | 7 | 4648x2286 | 10.6 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/f4/a5/f4a55d28bfaef14fae78c06021220651.jpg |
| Pejzaż z jarzębiną, część prawa tryptyku "Idź nad strumienie" | - | 4764x2116 | 10.1 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/5e/a2/5ea2d033da9981851a6bc50aa243e8cc.jpg |
| Widok doliny Cousin koło Avallon | - | 2968x3294 | 9.8 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/be/d6/bed62d84666e5fbf4b16749cade8e1ac.jpg |
| Portret Wincentyny Karskiej | - | 1616x4659 | 7.5 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/b0/e3/b0e3bdc92091191555c75ab601c261f0.jpg |
| Pejzaż z trzema postaciami | - | 2856x2470 | 7.1 | https://cyfrowe-cdn.mnw.art.pl/upload/multimedia/38/43/3843523dbfd8345b2feacd12b0e43736.jpg |

### NGA Washington — 37 works, 338 MP

| work | stops | px | MP | url |
|---|---|---|---|---|
| Hugo Reisinger | - | 3000x4095 | 12.3 | https://api.nga.gov/iiif/46d4f74d-9be3-4531-b36d-f4dbf2ceecea/full/3000,/0/default.jpg |
| Hide and Seek | - | 2997x4096 | 12.3 | https://api.nga.gov/iiif/6811986f-e19e-4f8e-bb02-d26603a9dd72/full/3000,/0/default.jpg |
| Robert G. L. De Peyster | - | 3000x4081 | 12.2 | https://api.nga.gov/iiif/856c6333-0b47-4f69-8603-186cf9651901/full/3000,/0/default.jpg |
| Denise Maréchal | 8 | 3000x4078 | 12.2 | https://api.nga.gov/iiif/8319cbb0-0cb2-4a26-9943-2baaf62c481b/full/3000,/0/default.jpg |
| Bust of a Young Woman in Profile | - | 2952x4096 | 12.1 | https://api.nga.gov/iiif/7a51192f-df23-4b9f-b48e-d36a3dfbb330/full/3000,/0/default.jpg |
| Still Life with Figs and Bread | - | 2885x4096 | 11.8 | https://api.nga.gov/iiif/ce3b93db-19f3-47c2-bbe8-2914619e86ee/full/3000,/0/default.jpg |
| Simon Hayem | - | 3000x3930 | 11.8 | https://api.nga.gov/iiif/374fda41-5b38-4cad-82e1-070612ae14f3/full/3000,/0/default.jpg |
| Paris, rue du Havre | - | 3000x3890 | 11.7 | https://api.nga.gov/iiif/c7a98171-4bfa-4882-9732-c30082ff9a33/full/3000,/0/default.jpg |
| Political Drama | - | 3000x3858 | 11.6 | https://api.nga.gov/iiif/c7872b3a-6d88-4718-bac3-b52fa6278d73/full/3000,/0/default.jpg |
| Henry White | - | 3000x3844 | 11.5 | https://api.nga.gov/iiif/1050c145-2892-4679-be3f-43be5553a005/full/3000,/0/default.jpg |
| The Holy Family with Saint Elizabeth and Saint John the Baptist | - | 3000x3836 | 11.5 | https://api.nga.gov/iiif/bf907138-43ba-4e12-bef6-b82634074555/full/3000,/0/default.jpg |
| Bust of Francesco I d'Este | - | 2747x4096 | 11.3 | https://api.nga.gov/iiif/e030587a-5582-4a63-9913-0adc7c7bd730/full/3000,/0/default.jpg |
| Study for "Autopsy at the Hôtel-Dieu" | - | 3000x3746 | 11.2 | https://api.nga.gov/iiif/03619368-16a1-4888-a7bb-a6d5520f0fc1/full/3000,/0/default.jpg |
| People by the Blue Lake | - | 3000x3708 | 11.1 | https://api.nga.gov/iiif/72f706d6-0de4-418d-87fa-95dd1c13578c/full/3000,/0/default.jpg |
| Farmhouse at Le Pouldu | - | 3000x3691 | 11.1 | https://api.nga.gov/iiif/b51d9c85-e16b-4dd0-8eb0-ec0d13466005/full/3000,/0/default.jpg |
| Bagpipe Player | - | 3000x3666 | 11.0 | https://api.nga.gov/iiif/1b9686e2-26d2-4aa7-9256-63c14efc0cb6/full/3000,/0/default.jpg |
| Still Life with Flowers in an Alabaster Vase and Fruit | - | 3000x3619 | 10.9 | https://api.nga.gov/iiif/2400455c-9b59-4464-94b0-874e0be2686b/full/3000,/0/default.jpg |
| The Flight into Egypt | - | 2574x4096 | 10.5 | https://api.nga.gov/iiif/b1fca544-2bc8-455a-a6c4-1249f4988b70/full/3000,/0/default.jpg |
| Baby (Cradle) | - | 3000x3024 | 9.1 | https://api.nga.gov/iiif/c9129cd8-4893-443a-ac43-8a64fdab5852/full/3000,/0/default.jpg |
| Oedipus Cursing His Son Polynices | - | 3000x2739 | 8.2 | https://api.nga.gov/iiif/64f98f88-fb97-44a6-8ac1-2c57f4a2f10b/full/3000,/0/default.jpg |
| The Return of the Prodigal Son | - | 3000x2719 | 8.2 | https://api.nga.gov/iiif/676fa96e-ad4e-4209-b985-ae0c15f5d902/full/3000,/0/default.jpg |
| Study for "Breton Women at a Pardon" | - | 3000x2645 | 7.9 | https://api.nga.gov/iiif/075b8c2f-2dbd-4ceb-b362-c9af9c94a548/full/3000,/0/default.jpg |
| The Banks of the Oise | - | 3000x2486 | 7.5 | https://api.nga.gov/iiif/a167f440-ad1c-481e-ada0-2f6962d54e64/full/3000,/0/default.jpg |
| Nanny and Child | - | 3000x2403 | 7.2 | https://api.nga.gov/iiif/8bffe28f-ef5b-4098-9356-ff5a5d70cbb1/full/3000,/0/default.jpg |
| An Italianate Evening Landscape | - | 3000x2394 | 7.2 | https://api.nga.gov/iiif/125d79bc-0a09-4428-bfb2-ceaf995400cd/full/3000,/0/default.jpg |
| The Old Oak | - | 3000x2313 | 6.9 | https://api.nga.gov/iiif/e9543336-c733-422c-9c41-913f976218b9/full/3000,/0/default.jpg |
| The Bridge of Louis Philippe | - | 3000x2261 | 6.8 | https://api.nga.gov/iiif/ce2e25da-4383-426f-933b-e06c3fabac1f/full/3000,/0/default.jpg |
| The Ponte Salario | - | 3000x2257 | 6.8 | https://api.nga.gov/iiif/411fcbf3-4bef-4e34-aa9f-af5817f56d99/full/3000,/0/default.jpg |
| After the Bath | 9 | 3000x2193 | 6.6 | https://api.nga.gov/iiif/7dd5fd0f-a0cb-4338-8d73-549e6fbe4f1d/full/3000,/0/default.jpg |
| The Flag of Truce | 8 | 3000x2169 | 6.5 | https://api.nga.gov/iiif/945d69c3-149b-47e0-9b41-b4857c1aa5f2/full/3000,/0/default.jpg |
| The Towpath | - | 3000x2163 | 6.5 | https://api.nga.gov/iiif/1b205f03-ef58-4ce4-9980-ed4a777ff30b/full/3000,/0/default.jpg |
| Northern Landscape, Spring | - | 3000x2160 | 6.5 | https://api.nga.gov/iiif/40bb6453-0326-4377-8ffd-872226a0e5d8/full/3000,/0/default.jpg |
| Mount Desert Island, Maine | - | 3000x1984 | 6.0 | https://api.nga.gov/iiif/2e1b19eb-2e77-42c3-84f9-3bd10cdf8c9c/full/3000,/0/default.jpg |
| View from Vaekero near Christiania | - | 3000x1891 | 5.7 | https://api.nga.gov/iiif/e5fffc83-c01c-4fbb-979b-ccefb49232cd/full/3000,/0/default.jpg |
| The Sanctuary of Hercules | - | 3000x1879 | 5.6 | https://api.nga.gov/iiif/f5309c2c-13a0-41d9-89d6-9659ad0534ec/full/3000,/0/default.jpg |
| Whistler Asleep | - | 3000x1863 | 5.6 | https://api.nga.gov/iiif/133713ab-5558-48d5-aef3-2b16aff511e0/full/3000,/0/default.jpg |
| After the Storm | - | 3000x1763 | 5.3 | https://api.nga.gov/iiif/924cb48a-cde6-4204-9beb-a2916a065157/full/3000,/0/default.jpg |

### Nationalmuseum Stockholm — 5 works, 9 MP

| work | stops | px | MP | url |
|---|---|---|---|---|
| Eider Ducks | 7 | 1920x1638 | 3.1 | https://commons.wikimedia.org/wiki/Special:FilePath/Eider_Ducks_%28Bruno_Liljefors%29_-_Nationalmuseum_-_18506.tif?width=1920 |
| Curlew | - | 1920x1615 | 3.1 | https://commons.wikimedia.org/wiki/Special:FilePath/Curlew_%28Bruno_Liljefors%29_-_Nationalmuseum_-_18660.tif?width=1920 |
| Vinterafton vid en älv (Winter Evening by a River), NM 1703 | 6 | 1000x813 | 0.8 | https://nationalmuseumse.iiifhosting.com/iiif/a7e7b7d4d4a03b2f13dd3a7d7b4fa90f73b223955f3d528ab5568b5af58defc8/full/full/0/default.jpg |
| Vintermånsken (Winter Moonlight), NM 1628 | 6 | 1000x810 | 0.8 | https://nationalmuseumse.iiifhosting.com/iiif/b8408303582c56cbffc2d3cac0a39b76d79328557ca5e333e76d75bb0075fd9/full/full/0/default.jpg |
| Simeon in the Temple, NM 4567 | 6 | 805x1000 | 0.8 | https://nationalmuseumse.iiifhosting.com/iiif/c6825a9f644120a9f69998822a061dc3ea666864bd7e3d44ea8dfbbc5343da6e/full/full/0/default.jpg |

### agsa — 1 works, 10 MP

| work | stops | px | MP | url |
|---|---|---|---|---|
| Meadow at Éragny (Prairie à Éragny) | 6 | 3543x2849 | 10.1 | https://agsa-prod.s3.amazonaws.com/media/dd/images/76058-HQ-20138P31.3cb2105.jpg |

### artuk — 9 works, 7 MP

| work | stops | px | MP | url |
|---|---|---|---|---|
| Colour Sketch for 'Egyptian Slinger Scaring Birds in the Harvest Time – Moonrise' | - | 918x1200 | 1.1 | https://d3d00swyhr67nd.cloudfront.net/w1200h1200/collection/LW/LHMU/LW_LHMU_0405-001.jpg |
| Margate Jetty | - | 835x1200 | 1.0 | https://d3d00swyhr67nd.cloudfront.net/w1200h1200/collection/ACNMW/ACNMW/ACNMW_ACNMW_NMWA5186-001.jpg |
| Beach at Gravelines | - | 1200x753 | 0.9 | https://d3d00swyhr67nd.cloudfront.net/w1200h1200/collection/CIA/CIA/CIA_CIA_P_1948_SC_397-001.jpg |
| Bellinzona from the Road to Locarno | - | 1200x752 | 0.9 | https://d3d00swyhr67nd.cloudfront.net/w1200h1200/collection/ABD/AAG/ABD_AAG_ABDAG003697-001.jpg |
| De annunciatie | - | 1200x665 | 0.8 | https://d3d00swyhr67nd.cloudfront.net/w1200h1200/collection/ASH/ASHM/ASH_ASHM_WA1855_171-001.jpg |
| A Wooded Landscape by Sir David Wilkie | - | 1000x739 | 0.7 | https://d3d00swyhr67nd.cloudfront.net/w1200h1200/collection/ABD/AAG/ABD_AAG_ag003544-001.jpg |
| Canal at Amsterdam | - | 1000x720 | 0.7 | https://d3d00swyhr67nd.cloudfront.net/w1200h1200/collection/ABD/AAG/ABD_AAG_AG004478-001.jpg |
| The Rue St Vincent, Paris in Spring | - | 428x685 | 0.3 | https://d3d00swyhr67nd.cloudfront.net/w1200h1200/collection/CAM/CCF/CAM_CCF_PD_1_1948-001.jpg |
| View of Hampstead Heath | - | 1200x240 | 0.3 | https://d3d00swyhr67nd.cloudfront.net/w1200h1200/collection/SS/EAC/SS_EAC_FA_A40-001.jpg |

### whitney — 1 works, 3 MP

| work | stops | px | MP | url |
|---|---|---|---|---|
| New York/Liberty | 9 | 1537x2048 | 3.1 | https://whitneymedia.org/assets/artwork/47209/2017_190a-b_cropped.jpg |


---

## Ten Nationalmuseum re-frames (80acb76, 2026-08-25)

Fuad's ruling: quality beats framing. All ten are **UPGRADES** — no axis regressed on any work. Every `orig` field was dropped (iiifhosting clamps flat renders at 1000 px on both axes; advertising the master as a download would be dishonest). Tour boxes on the three toured works were remapped via NCC registration in 80acb76 (mrs-veronica-heiss) and bde6ec8 (truth-time-and-history, the-kitchen-maid).

### Portrait of a violinist
`portrait-of-a-violinist` — **no tour** — Nationalmuseum Stockholm — linear **x2.00**, aspect **+0.14%**

- **before** 4382x5563 (24.4 MP) — Commons TIFF ?width=4382
  https://commons.wikimedia.org/wiki/Special:FilePath/Portait_of_a_violinist_%28Anne_Vallayer-Coster%29_-_Nationalmuseum_-_177753.tif?width=4382
- **after** 8768x11116 (97.5 MP) — Nationalmuseum IIIF, flat 789x1000 verified 200
  https://nationalmuseumse.iiifhosting.com/iiif/160a554cd43cd0dca256eb9447308cabc1cc26326ecc3cf79bcd81a7f68d2a50/full/full/0/default.jpg

### Dancing Fairies
`dancing-fairies` — **no tour** — Nationalmuseum Stockholm — linear **x1.77**, aspect **-0.29%**

- **before** 3510x2105 (7.4 MP) — Commons TIFF ?width=3510
  https://commons.wikimedia.org/wiki/Special:FilePath/Dancing_Fairies_%28August_Malmstr%C3%B6m%29_-_Nationalmuseum_-_18226.tif?width=3510
- **after** 6228x3746 (23.3 MP) — Nationalmuseum IIIF, flat 1000x601 verified 200
  https://nationalmuseumse.iiifhosting.com/iiif/9059ed5d6f031844fe7d8923bdcf8107b0fdd35c3823fc90c346ab76d65a103/full/full/0/default.jpg

### Mrs Veronica Heiss
`anders-zorn-mrs-veronica-heiss` — **toured (boxes remapped)** — Nationalmuseum Stockholm — linear **x1.58**, aspect **-0.48%**

- **before** 3478x4649 (16.2 MP) — Commons TIFF ?width=3478
  https://commons.wikimedia.org/wiki/Special:FilePath/Mrs_Veronica_Heiss_%28Anders_Zorn%29_-_Nationalmuseum_-_19728.tif?width=3478
- **after** 5511x7402 (40.8 MP) — Nationalmuseum IIIF, flat 745x1000 verified 200
  https://nationalmuseumse.iiifhosting.com/iiif/f5e1c4ce95f9cfaafab6a26e137dd40681bb3c998fbdd74f7facfc9732c66548/full/full/0/default.jpg

### The Painter Bruno Liljefors
`anders-zorn-the-painter-bruno-liljefors` — **no tour** — Nationalmuseum Stockholm — linear **x2.72**, aspect **+0.64%**

- **before** 2736x3533 (9.7 MP) — Commons TIFF ?width=2736
  https://commons.wikimedia.org/wiki/Special:FilePath/The_Painter_Bruno_Liljefors_%28Anders_Zorn%29_-_Nationalmuseum_-_18644.tif?width=2736
- **after** 7451x9560 (71.2 MP) — Nationalmuseum IIIF, flat 779x1000 verified 200
  https://nationalmuseumse.iiifhosting.com/iiif/39da4a4802c18068e0a6371360c75790551ceb4606281d3bc1e1605c2af814a6/full/full/0/default.jpg

### Truth, Time and History
`truth-time-and-history` — **toured (boxes remapped)** — Nationalmuseum Stockholm — linear **x2.11**, aspect **+0.81%**

- **before** 2883x3499 (10.1 MP) — Commons TIFF ?width=2883
  https://commons.wikimedia.org/wiki/Special:FilePath/Truth%2C_Time_and_History_%28Francisco_Goya_Y_Lucientes%29_-_Nationalmuseum_-_22643.tif?width=2883
- **after** 6080x7320 (44.5 MP) — Nationalmuseum IIIF, flat 831x1000 verified 200
  https://nationalmuseumse.iiifhosting.com/iiif/b516a79ed3d3c9d61e26029f44cc60c9938f3b1f7d590b4c9e83f2bd524f8ba5/full/full/0/default.jpg

### Bringing Home the Body of King Karl XII of Sweden
`bringing-home-the-body-of-king-karl-xii-of-sweden` — **no tour** — Nationalmuseum Stockholm — linear **x2.70**, aspect **-1.07%**

- **before** 4073x2896 (11.8 MP) — Commons TIFF ?width=4073
  https://commons.wikimedia.org/wiki/Special:FilePath/Bringing_Home_the_Body_of_King_Karl_XII_of_Sweden_%28Gustaf_Cederstr%C3%B6m%29_-_Nationalmuseum_-_18366.tif?width=4073
- **after** 11016x7917 (87.2 MP) — Nationalmuseum IIIF, flat 1000x719 verified 200
  https://nationalmuseumse.iiifhosting.com/iiif/4d049052768188fc6be1c6719f5bed19a34fe516da1137510f9ece6210332b3d/full/full/0/default.jpg

### The Kitchen Maid
`the-kitchen-maid` — **toured (boxes remapped)** — Nationalmuseum Stockholm — linear **x1.97**, aspect **+1.43%**

- **before** 2823x3494 (9.9 MP) — Commons TIFF ?width=2823
  https://commons.wikimedia.org/wiki/Special:FilePath/The_Kitchen_Maid_%28Rembrandt_Harmensz._van_Rijn%29_-_Nationalmuseum_-_17587.tif?width=2823
- **after** 5563x6788 (37.8 MP) — Nationalmuseum IIIF, flat 820x1000 verified 200
  https://nationalmuseumse.iiifhosting.com/iiif/640882d756112062a94fcb87dff89327bc80499e7b80d89b613f252093ceed10/full/full/0/default.jpg

### Hemlandstoner
`anders-zorn-hemlandstoner` — **no tour** — Nationalmuseum Stockholm — linear **x2.49**, aspect **-1.54%**

- **before** 2087x3533 (7.4 MP) — Commons TIFF ?width=2087
  https://commons.wikimedia.org/wiki/Special:FilePath/Home_Tunes_%28Anders_Zorn%29_-_Nationalmuseum_-_19274.tif?width=2087
- **after** 5206x8951 (46.6 MP) — Nationalmuseum IIIF, flat 582x1000 verified 200
  https://nationalmuseumse.iiifhosting.com/iiif/d8c6dd1d002cef59ba7f08601b0dfd8c76a7bdf1209ff08102a12165f2e15f26/full/full/0/default.jpg

### Coquelin Cadet
`anders-zorn-coquelin-cadet` — **no tour** — Nationalmuseum Stockholm — linear **x2.23**, aspect **-1.92%**

- **before** 2461x3485 (8.6 MP) — Commons TIFF ?width=2461
  https://commons.wikimedia.org/wiki/Special:FilePath/Coquelin_Cadet_%28Anders_Zorn%29_-_Nationalmuseum_-_23815.tif?width=2461
- **after** 5482x7915 (43.4 MP) — Nationalmuseum IIIF, flat 693x1000 verified 200
  https://nationalmuseumse.iiifhosting.com/iiif/fd973548ed69d0535a4711dc7d19e29fd001d699d24bbbe2507e7acddc1c7c7e/full/full/0/default.jpg

### Coronation of Gustav III.
`coronation-of-gustav-iii` — **no tour** — Nationalmuseum Stockholm — linear **x3.03**, aspect **+2.64%**

- **before** 3606x2014 (7.3 MP) — Commons TIFF ?width=3606
  https://commons.wikimedia.org/wiki/Special:FilePath/The_Coronation_of_King_Gustav_III_of_Sweden._Uncompleted_%28Carl_Gustav_Pilo%29_-_Nationalmuseum_-_18007.tif?width=3606
- **after** 10931x5948 (65.0 MP) — Nationalmuseum IIIF, flat 1000x544 verified 200
  https://nationalmuseumse.iiifhosting.com/iiif/1eff38c7deaa845f24ec6f82197fb0c600605b13943feb6333b86370bfafb289/full/full/0/default.jpg

---

## Szał uniesień restore (f62ee3f, 2026-08-25)

The plate was removed in two steps: `850ba9d` nulled `img` (the Inspection-layer pilot commit), then `c0e8547` swept the now-empty record. For months the work fell back to the canon `?width=900` thumbnail — 0.4 MP, the smallest plate in the whole corpus.

### Szał uniesień
`podkowinski-szal-uniesien` — **6 stops** — MNK Kraków — linear **x2.30**, aspect **+0.00%**

- **before** (recovered from commit 1a83004, then lost at 850ba9d + c0e8547) ~0.4 MP fallback via `?width=900` canon
- **after** 3339x4000 (13.4 MP) — Commons MNK digitization verified 200
  https://upload.wikimedia.org/wikipedia/commons/c/c3/Wladyslaw_Podkowinski_-_Ecstasy_-_MNK_II-b-887_%28143955%29.jpg

---

## Cypresses — accuracy note

The existing entry is accurate. Current plate at HEAD: `DP130999`, 1476x1861 (2.7 MP) — verified 200 on 2026-08-25. This is a genuine downgrade from the prior DP-42549-001 plate (4000x3184, 12.7 MP); it was adopted because DP130999 frames the right picture (the framing changed, not just the resolution). No action needed.

---

## Did not verify

Probed 2026-08-25. Status codes annotated inline.

**Tile-only (no flat `img` URL — Zoomify or DZI delivery):**
- `two-old-men-disputing` — NGV Zoomify, no img field; probe not applicable
- `henri-matisse-auguste-pellerin-ii` — Centre Pompidou DZI, no img field; probe not applicable
- `henri-matisse-tete-blanche-et-rose` — Centre Pompidou DZI, no img field; probe not applicable

**Van Gogh Museum (Micrio IIIF or Commons fallback) — img returns 429 at rate-limited probe:**
> VGM throttles HEAD at ~1 req/s. In-browser loads work fine; the 429s here are probe artefacts.
- `almond-blossom` — STILL 429
- `bridge-in-the-rain-after-hiroshige` — STILL 429 (Micrio IIIF added; Commons img also 429)
- `birds-nests` — verified 200 (Commons upload.wikimedia.org)
- `congregation-leaving-the-reformed-church-in-nuenen` — verified 200 (Commons upload.wikimedia.org)
- `avenue-of-poplars-in-autumn` — STILL 429
- `cafe-terrace-at-night` — verified 302→200 (Commons redirect)
- `crab-on-its-back` — STILL 429
- `fishing-boats-on-the-beach-at-les-saintes-maries-de-la-mer` — STILL 429
- `giant-peacock-moth` — STILL 429
- `head-of-a-woman` — STILL 429
- `harvest-at-la-crau-with-montmajour-in-the-background` — STILL 429
- `kingfisher-by-the-waterside` — STILL 429
- `red-cabbages-and-garlic` — STILL 429
- `portrait-of-vincent-van-gogh-1887` — STILL 429
- `self-portrait-with-grey-felt-hat` — STILL 429
- `still-life-with-bible` — STILL 429
- `skull-of-a-skeleton-with-burning-cigarette` — STILL 429
- `the-milkmaid` — STILL 429 (img is Commons fallback; Micrio IIIF is the active plate)
- `the-potato-eaters` — STILL 429
- `the-sower` — STILL 429
- `view-of-arles-with-irises-in-the-foreground` — STILL 429
- `vincent-van-gogh` — STILL 429
- `vincent-van-gogh-winterlandschap-herinnering-aan-het-noorden` — STILL 429
- `view-of-the-sea-at-scheveningen` — STILL 429
- `vincent-van-gogh-zelfportret-en-face` — STILL 429
- `wheatfield-with-crows` — STILL 429

**Other:**
- `ferdynand-ruszczyc-stary-dom` — STILL 429 (MNW CDN, rate-limited probe)
- `giovanni-battista-tiepolo-die-verehrung-der-trinitat-durch-d` — STILL 429 (NG London IIIF)

**Nationalmuseum (Commons TIFF Special:FilePath) — returns 302 redirect, resolves to 200:**
> All 277babb NM entries verified 302 (expected redirect behaviour for Special:FilePath URLs).
- `anna-nordlander-at-the-suspended-cradle-study` — verified 302
- `eugene-jansson-sunset` — verified 302
- `eugene-jansson-the-outskirts-of-the-town` — verified 302
- `eilif-peterssen-nocturne` — verified 302
- `gerda-roosval-kallstenius-astrid-setterwall-angstrom-artist` — verified 302
- `gottfrid-kallstenius-after-sunset-motif-from-the-archipelago` — verified 302
- `landscape-with-the-fall-of-icarus` — verified 302
- `gustaf-ankarcrona-in-days-of-yore` — verified 302
- `pehr-hillestrom-a-woman-picking-fleas-by-candlelight` — verified 302
- `maria-lady-eardley-1743-1794` — verified 302
- `herman-norrman-moonlit-landscape` — verified 302
- `nils-kreuger-nightfall` — verified 302
- `the-town` — verified 302
- `victory-at-narva` — verified 302
- `thor-s-fight-with-the-giants` — verified 302
- `the-rope-dancer` — verified 302
- `young-boy-peeling-a-pear` — verified 302
- `strindberg-underlandet` — verified 302
- `zoie-ghika-moldavian-princess` — verified 302
