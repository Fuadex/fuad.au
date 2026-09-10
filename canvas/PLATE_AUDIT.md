# PLATE_AUDIT.md

Generated 2026-09-10T11:25:40.813Z by `audit-plates.js` + `apply-plate-fixes.js`. Measured 1923 `art_hires` rows (all rows except the wilhelm-gentz id, held by another agent) and 1927 `art_imgsize` entries. Holder mismatches computed locally from `art_holders.js` + `museums.js`, no network.

## Counts per category

| Category | Count | Disposition |
| --- | --- | --- |
| (a) flat clamp lifted (server now serves ≥ 90% of master on the long side) | 0 | APPLIED (0 edits) |
| (b) img serves a size >2% off w,h on either axis | 956 | REPORT ONLY — never applied alone (see note below) |
| (c) iiif info.json width/height ≠ recorded w,h | 99 | of which 0 had img-measured agree with info.json — APPLIED; the remaining 99 are capped/served-smaller and NOT applied |
| (d) art_imgsize ≠ Commons true size | 41 | APPLIED (41 edits) |
| (e) URL 404s / errors | 9 | REPORT ONLY |
| (f) holder mismatches (src-implied vs art_holders.js) | 12 | REPORT ONLY — holders never touched |

**On (b):** the great majority of these rows are IIIF hosts deliberately requested at a capped width (NGA/Getty/YCBA all use `full/3000,` against masters far larger than 3000px; several Commons rows use a `?width=NNNN` TIFF-bucket request) — `img` is *supposed* to differ from the master `w,h` there, by the site’s own design (the note in `art_hires.js`’s header: `img` is "the largest single flat file URL", not necessarily the untouched master). Those are listed below for completeness but are not defects. A handful of non-IIIF direct-file rows also appear, where `img` is supposed to equal the master — those are the ones worth a human look.

## Heiss row (`anders-zorn-mrs-veronica-heiss`) — the row Fuad flagged

- Recorded: `w=5511, h=7402`, `flat=[745,1000]`
- info.json (nationalmuseumse.iiifhosting.com, IIIF 2, level1): width=5511, height=7402 — **matches recorded w,h exactly**
- `img` (`.../full/full/0/default.jpg`) measured (SOF decode of the first 64KB): {"status":200,"type":"jpeg","w":745,"h":1000}
- Re-measured today: still serving **745×1000** — the 1000px-per-axis iiifhosting clamp is **still in effect**, unchanged since it was recorded 2026-08-25. Category (a) does NOT fire for this row: 745×1000’s long side (1000) is nowhere near 90% of the master’s long side (7402).
- Commons original behind `art_data.js`’s `img` (`?width=900` preview): API imageinfo reports **{"w":3478,"h":4649}**, matching the recorded `art_imgsize` pair `[3478,4649]` exactly. No drift there either.

**Conclusion:** the Heiss row itself is internally consistent and unchanged today — what Fuad noticed (the plate reading "mushy"/undersized) is the *known, already-documented* iiifhosting flat-render clamp (see `HIRES_SOURCING.md` → "the one that explains a reader-visible complaint"), not a newly-stale record. The clamp has not lifted since 2026-08-25.

## (a) flat clamp lifted — APPLIED

_none — every host that had a recorded `flat` clamp is still enforcing it._

## (b) img ≠ w,h by >2% (REPORT ONLY, full table)

| id | recorded w,h | measured img | Δw% | Δh% |
| --- | --- | --- | --- | --- |
| alfred-sisley-the-banks-of-the-oise | 6252×5181 | 3000×2486 | 52% | 52% |
| alphonse-de-neuville-the-flag-of-truce | 24880×17990 | 3000×2169 | 87.9% | 87.9% |
| eva-gonzales-nanny-and-child | 19261×15426 | 3000×2403 | 84.4% | 84.4% |
| caspar-david-friedrich-northern-landscape-spring | 13245×9535 | 3000×2160 | 77.3% | 77.3% |
| august-macke-people-by-the-blue-lake | 19069×23564 | 3000×3708 | 84.3% | 84.3% |
| arnold-bocklin-the-sanctuary-of-hercules | 8309×5205 | 3000×1879 | 63.9% | 63.9% |
| jean-baptiste-armand-guillaumin-the-bridge-of-louis-philippe | 11835×8921 | 3000×2261 | 74.7% | 74.7% |
| anne-vallayer-coster-still-life-with-flowers-in-an-alabaster | 24812×29928 | 3000×3619 | 87.9% | 87.9% |
| anders-zorn-hugo-reisinger | 5327×7271 | 3000×4095 | 43.7% | 43.7% |
| bartolome-esteban-murillo-the-return-of-the-prodigal-son | 21882×19829 | 3000×2719 | 86.3% | 86.3% |
| sir-david-wilkie-the-holy-family-with-saint-elizabeth-and-sa | 5024×6423 | 3000×3836 | 40.3% | 40.3% |
| giovanni-boldini-after-the-bath | 8209×6001 | 3000×2193 | 63.5% | 63.5% |
| giovanni-boldini-whistler-asleep | 4693×2914 | 3000×1863 | 36.1% | 36.1% |
| giovanni-boldini-bust-of-a-young-woman-in-profile | 6175×8569 | 2952×4096 | 52.2% | 52.2% |
| giovanni-boldini-bust-of-francesco-i-d-este | 9052×13496 | 2747×4096 | 69.7% | 69.7% |
| gustav-klimt-baby-cradle | 14053×14161 | 3000×3024 | 78.7% | 78.6% |
| theo-van-rysselberghe-denise-marechal | 13874×18857 | 3000×4078 | 78.4% | 78.4% |
| leon-bonnat-henry-white | 17949×22993 | 3000×3844 | 83.3% | 83.3% |
| pascal-dagnan-bouveret-study-for-breton-women-at-a-pardon | 10123×8925 | 3000×2645 | 70.4% | 70.4% |
| paul-serusier-farmhouse-at-le-pouldu | 5017×6172 | 3000×3691 | 40.2% | 40.2% |
| robert-delaunay-political-drama | 3560×4578 | 3000×3858 | 15.7% | 15.7% |
| samuel-lovett-waldo-robert-g-l-de-peyster | 5515×7502 | 3000×4081 | 45.6% | 45.6% |
| willem-van-de-velde-the-younger-and-studio-after-the-storm | 11691×6872 | 3000×1763 | 74.3% | 74.3% |
| luis-melendez-still-life-with-figs-and-bread | 3544×5032 | 2885×4096 | 18.6% | 18.6% |
| jules-dupre-the-old-oak | 11269×8690 | 3000×2313 | 73.4% | 73.4% |
| jules-bastien-lepage-simon-hayem | 4720×6182 | 3000×3930 | 36.4% | 36.4% |
| johan-jongkind-the-towpath | 17928×12924 | 3000×2163 | 83.3% | 83.3% |
| johan-christian-dahl-view-from-vaekero-near-christiania | 19205×12106 | 3000×1891 | 84.4% | 84.4% |
| joachim-patinir-the-flight-into-egypt | 4744×7548 | 2574×4096 | 45.7% | 45.7% |
| jervis-mcentee-mount-desert-island-maine | 10875×7192 | 3000×1984 | 72.4% | 72.4% |
| jean-beraud-paris-rue-du-havre | 7291×9452 | 3000×3890 | 58.9% | 58.8% |
| jan-both-an-italianate-evening-landscape | 12271×9792 | 3000×2394 | 75.6% | 75.6% |
| hubert-robert-the-ponte-salario | 18192×13689 | 3000×2257 | 83.5% | 83.5% |
| henry-fuseli-oedipus-cursing-his-son-polynices | 12417×11337 | 3000×2739 | 75.8% | 75.8% |
| henri-gervex-study-for-autopsy-at-the-hotel-dieu | 3478×4342 | 3000×3746 | 13.7% | 13.7% |
| hendrick-ter-brugghen-bagpipe-player | 17327×21169 | 3000×3666 | 82.7% | 82.7% |
| james-tissot-hide-and-seek | 13102×17904 | 2997×4096 | 77.1% | 77.1% |
| claude-monet-the-cradle-camille-with-the-artist-s-son-jean | 24530×32127 | 3000×3930 | 87.8% | 87.8% |
| claude-monet-woman-seated-under-the-willows | 23193×31350 | 3000×4056 | 87.1% | 87.1% |
| claude-monet-the-artist-s-garden-at-vetheuil | 23052×28846 | 3000×3755 | 87% | 87% |
| claude-monet-the-houses-of-parliament-sunset | 17031×15043 | 3000×2650 | 82.4% | 82.4% |
| claude-monet-cliffs-at-pourville | 20692×12341 | 3000×1789 | 85.5% | 85.5% |
| claude-monet-sainte-adresse | 19047×13249 | 3000×2087 | 84.2% | 84.2% |
| claude-monet-waterloo-bridge-london-at-sunset | 18666×13152 | 3000×2114 | 83.9% | 83.9% |
| claude-monet-banks-of-the-seine-vetheuil | 18220×13277 | 3000×2186 | 83.5% | 83.5% |
| claude-monet-the-seine-at-giverny | 16794×13553 | 3000×2421 | 82.1% | 82.1% |
| claude-monet-the-artist-s-garden-in-argenteuil-a-corner-of-t | 17348×12979 | 3000×2244 | 82.7% | 82.7% |
| claude-monet-palazzo-da-mula-venice | 17104×12985 | 3000×2278 | 82.5% | 82.5% |
| claude-monet-jerusalem-artichoke-flowers | 12622×17418 | 2968×4096 | 76.5% | 76.5% |
| claude-monet-bazille-and-camille-study-for-dejeuner-sur-l-he | 12717×17100 | 3000×4034 | 76.4% | 76.4% |
| claude-monet-the-willows | 15922×12764 | 3000×2405 | 81.2% | 81.2% |
| claude-monet-interior-after-dinner | 15342×11872 | 3000×2321 | 80.4% | 80.4% |
| claude-monet-bridge-at-argenteuil-on-a-gray-day | 15468×11650 | 3000×2260 | 80.6% | 80.6% |
| claude-monet-still-life-with-bottle-carafe-bread-and-wine | 16003×10532 | 3000×1974 | 81.3% | 81.3% |
| claude-monet-ships-riding-on-the-seine-at-rouen | 11078×9011 | 3000×2440 | 72.9% | 72.9% |
| claude-monet-rouen-cathedral-west-facade-sunlight | 6030×9204 | 2683×4096 | 55.5% | 55.5% |
| claude-monet-rouen-cathedral-west-facade | 5728×8857 | 2649×4096 | 53.8% | 53.8% |
| claude-monet-the-bridge-at-argenteuil | 7999×5998 | 3000×2250 | 62.5% | 62.5% |
| claude-monet-morning-haze | 5980×4756 | 3000×2386 | 49.8% | 49.8% |
| a-girl-with-a-watering-can | 15915×22072 | 2953×4096 | 81.4% | 81.4% |
| a-lady-writing-a-letter | 25813×29494 | 3000×3428 | 88.4% | 88.4% |
| a-polish-nobleman | 13003×19017 | 2801×4096 | 78.5% | 78.5% |
| a-young-girl-reading | 12451×15654 | 3000×3772 | 75.9% | 75.9% |
| a-young-woman-seated-at-a-virginal | 10100×11371 | 3840×4323 | 62% | 62% |
| a-young-woman-standing-at-a-virginal | 9998×11367 | 3840×4366 | 61.6% | 61.6% |
| alba-madonna | 24180×24180 | 3000×3000 | 87.6% | 87.6% |
| allegory-of-prudence | 7548×8432 | 3840×4290 | 49.1% | 49.1% |
| almost-once | 2252×4000 | 4000×2252 | 77.6% | 43.7% |
| anders-zorn-coquelin-cadet | 5482×7915 | 693×1000 | 87.4% | 87.4% |
| anders-zorn-hemlandstoner | 5206×8951 | 582×1000 | 88.8% | 88.8% |
| anders-zorn-mrs-veronica-heiss | 5511×7402 | 745×1000 | 86.5% | 86.5% |
| anders-zorn-the-painter-bruno-liljefors | 7451×9560 | 779×1000 | 89.5% | 89.5% |
| anna-nordlander-at-the-suspended-cradle-study | 3149×3543 | 1920×2160 | 39% | 39% |
| august-hagborg-a-fishergirl-from-the-north-of-france-study | 3513×4898 | 1920×2677 | 45.3% | 45.3% |
| auguste-rodin-the-evil-spirits | 8929×7143 | 3000×2400 | 66.4% | 66.4% |
| bal-du-moulin-de-la-galette | 40869×30379 | 3840×2854 | 90.6% | 90.6% |
| battle-of-grunwald | 11788×5235 | 3840×1705 | 67.4% | 67.4% |
| bridge-in-the-rain-after-hiroshige | 5582×7680 | 4000×5402 | 28.3% | 29.7% |
| bringing-home-the-body-of-king-karl-xii-of-sweden | 11016×7917 | 1000×719 | 90.9% | 90.9% |
| bruno-liljefors-autumn-landscape-with-partridges | 7860×5902 | 1000×751 | 87.3% | 87.3% |
| bruno-liljefors-curlew | 3496×2940 | 1920×1615 | 45.1% | 45.1% |
| bruno-liljefors-eider-ducks | 3474×2964 | 1920×1638 | 44.7% | 44.7% |
| cafe-terrace-at-night | 7564×9432 | 3840×4789 | 49.2% | 49.2% |
| camille-pissarro-afternoon-break-girl-and-young-peasant-woma | 14819×12000 | 3840×3110 | 74.1% | 74.1% |
| camille-pissarro-route-de-versailles-louveciennes-rain-effec | 6817×4629 | 3840×2608 | 43.7% | 43.7% |
| carl-grabow-untitled-2 | 6720×4238 | 3840×2422 | 42.9% | 42.9% |
| carl-grabow-untitled-3 | 6719×4307 | 3840×2462 | 42.8% | 42.8% |
| chaim-soutine-untitled-4 | 1596×3152 | 3152×1596 | 97.5% | 49.4% |
| christian-rohlfs-white-beeches-in-fall | 19714×24908 | 3000×3791 | 84.8% | 84.8% |
| claude-monet-essai-de-figure-en-plein-air | 6959×10277 | 3840×5671 | 44.8% | 44.8% |
| claude-monet-la-femme-a-l-ombrelle | 7325×10810 | 3840×5667 | 47.6% | 47.6% |
| claude-monet-le-givre | 12162×7384 | 3840×2331 | 68.4% | 68.4% |
| congregation-leaving-the-reformed-church-in-nuenen | 5735×7421 | 3852×5076 | 32.8% | 31.6% |
| coronation-of-gustav-iii | 10931×5948 | 1000×544 | 90.9% | 90.9% |
| dancing-fairies | 6228×3746 | 1000×601 | 83.9% | 84% |
| death-and-the-miser | 12375×36971 | 1371×4096 | 88.9% | 88.9% |
| degas-grande-arabesque-third-time | 5864×4954 | 3000×2534 | 48.8% | 48.8% |
| edgar-degas-woman-drying-herself | 2322×4128 | 4128×2322 | 77.8% | 43.8% |
| edmond-lachenal-untitled | 3888×5184 | 5184×3888 | 33.3% | 25% |
| eilif-peterssen-nocturne | 3385×2696 | 1920×1529 | 43.3% | 43.3% |
| elie-nadelman-man-in-the-open-air | 3060×4080 | 4080×3060 | 33.3% | 25% |
| en-premiar | 2619×3534 | 741×1000 | 71.7% | 71.7% |
| ernst-fries-berchtesgaden-with-the-watzmann-peak-in-the-dist | 5097×3541 | 3000×2084 | 41.1% | 41.1% |
| eugene-jansson-motif-from-timmermansgatan | 2826×3874 | 1920×2632 | 32.1% | 32.1% |
| eugene-jansson-sunset | 4276×2442 | 3840×2193 | 10.2% | 10.2% |
| eugene-jansson-the-outskirts-of-the-town | 3308×3642 | 1920×2114 | 42% | 42% |
| farmhouse-in-provence | 31183×23388 | 3000×2250 | 90.4% | 90.4% |
| ferdinand-hodler-bildnis-der-tanzerin-giulia-leonardi | 9449×8150 | 3840×3312 | 59.4% | 59.4% |
| fire-s-on | 19724×30000 | 3840×5841 | 80.5% | 80.5% |
| fishing-boats-on-the-beach-at-les-saintes-maries-de-la-mer | 11733×9435 | 4948×4000 | 57.8% | 57.6% |
| gerda-roosval-kallstenius-astrid-setterwall-angstrom-artist | 1702×3650 | 1280×2745 | 24.8% | 24.8% |
| ginevra-de-benci | 23235×23968 | 3000×3095 | 87.1% | 87.1% |
| giovanni-battista-tiepolo-die-verehrung-der-trinitat-durch-d | 4763×6000 | 2024×2623 | 57.5% | 56.3% |
| girl-in-white | 12107×17862 | 2776×4096 | 77.1% | 77.1% |
| gottfrid-kallstenius-after-sunset-motif-from-the-archipelago | 4078×3508 | 3840×3303 | 5.8% | 5.8% |
| gustaf-ankarcrona-in-days-of-yore | 4404×3102 | 3840×2705 | 12.8% | 12.8% |
| gustave-le-gray-cavalry-maneuvers-camp-de-chalons | 4648×3756 | 3000×2424 | 35.5% | 35.5% |
| harvest-at-la-crau-with-montmajour-in-the-background | 11382×9053 | 5065×4000 | 55.5% | 55.8% |
| henri-matisse-deux-femmes-dans-un-paysage | 3024×4032 | 4032×3024 | 33.3% | 25% |
| herman-norrman-moonlit-landscape | 3621×2289 | 1920×1214 | 47% | 47% |
| j-m-w-turner-the-new-moon-or-i-ve-lost-my-boat-you-shan-t-ha | 8136×6538 | 3840×3086 | 52.8% | 52.8% |
| john-mackie-falconer-washing-morning-down-south | 5454×3318 | 3000×1825 | 45% | 45% |
| klimt-kiss | 7376×7401 | 3840×3853 | 47.9% | 47.9% |
| la-balancoire | 7648×10000 | 3840×5021 | 49.8% | 49.8% |
| la-promenade | 6752×8395 | 3840×4774 | 43.1% | 43.1% |
| landscape-from-bretagne | 8875×7344 | 1000×827 | 88.7% | 88.7% |
| landscape-with-the-fall-of-icarus | 4506×4053 | 3840×3454 | 14.8% | 14.8% |
| laocoon | 38035×30230 | 3000×2384 | 92.1% | 92.1% |
| leonardo-da-vinci-la-gioconda | 7601×11348 | 3840×5733 | 49.5% | 49.5% |
| leonardo-da-vinci-saint-jean-baptiste | 10446×13522 | 3840×4971 | 63.2% | 63.2% |
| maria-lady-eardley-1743-1794 | 3419×4733 | 1920×2658 | 43.8% | 43.8% |
| midsummer-dance | 3325×4169 | 798×1000 | 76% | 76% |
| monet-woman-with-a-parasol | 12666×15698 | 3000×3719 | 76.3% | 76.3% |
| niccolo-dell-abbate-le-grand-pont-ou-le-torrent | 1882×3351 | 3351×1882 | 78.1% | 43.8% |
| nils-kreuger-nightfall | 3361×2680 | 1920×1531 | 42.9% | 42.9% |
| october-saison-d-octobre | 7936×7329 | 3840×3546 | 51.6% | 51.6% |
| odilon-redon-untitled-9 | 3456×4608 | 4608×3456 | 33.3% | 25% |
| paul-cezanne-arlequin | 11281×17532 | 2636×4096 | 76.6% | 76.6% |
| paul-cezanne-la-montagne-sainte-victoire-au-dessus-de-la-rou | 14368×11448 | 3840×3060 | 73.3% | 73.3% |
| paul-gauguin-the-universe-is-created-l-univers-est-cree | 4994×2975 | 3000×1787 | 39.9% | 39.9% |
| pehr-hillestrom-a-woman-picking-fleas-by-candlelight | 3174×3873 | 1920×2343 | 39.5% | 39.5% |
| pekka-halonen-late-winter | 2171×3278 | 3278×2171 | 51% | 33.8% |
| peter-paul-rubens-a-view-of-het-steen-in-the-early-morning | 21100×12384 | 3840×2254 | 81.8% | 81.8% |
| pierre-auguste-renoir-danseuse | 16208×24531 | 3840×5812 | 76.3% | 76.3% |
| pierre-auguste-renoir-luncheon-of-the-boating-party | 9025×6684 | 3840×2844 | 57.5% | 57.5% |
| pierre-bonnard-sleeping-woman-on-a-bed | 8428×7672 | 3840×3496 | 54.4% | 54.4% |
| portrait-of-a-man-self-portrait | 8889×12230 | 3840×5283 | 56.8% | 56.8% |
| portrait-of-a-violinist | 8768×11116 | 789×1000 | 91% | 91% |
| portrait-of-bindo-altoviti | 18702×25703 | 2980×4096 | 84.1% | 84.1% |
| skarga-s-sermon | 9478×5398 | 3840×2187 | 59.5% | 59.5% |
| strindberg-underlandet | 3181×4385 | 1920×2647 | 39.6% | 39.6% |
| symphony-in-white-no-1-the-white-girl | 28741×57185 | 2059×4096 | 92.8% | 92.8% |
| the-emperor-napoleon-in-his-study-at-the-tuileries | 16304×26731 | 2498×4096 | 84.7% | 84.7% |
| the-kitchen-maid | 5563×6788 | 820×1000 | 85.3% | 85.3% |
| the-milkmaid | 4649×5177 | 4000×4485 | 14% | 13.4% |
| the-old-musician | 19867×15029 | 3000×2269 | 84.9% | 84.9% |
| the-painter-s-studio | 16951×9989 | 3840×2263 | 77.3% | 77.3% |
| the-plum | 10983×16425 | 2739×4096 | 75.1% | 75.1% |
| the-railway | 32954×26753 | 3000×2435 | 90.9% | 90.9% |
| the-rope-dancer | 2880×4155 | 1920×2770 | 33.3% | 33.3% |
| the-sower | 9000×7123 | 7352×5750 | 18.3% | 19.3% |
| the-starry-night | 44567×35291 | 3840×3041 | 91.4% | 91.4% |
| the-town | 2710×4807 | 1920×3406 | 29.2% | 29.1% |
| the-voyage-of-life | 5121×3459 | 3000×2026 | 41.4% | 41.4% |
| thor-s-fight-with-the-giants | 3062×4429 | 1920×2777 | 37.3% | 37.3% |
| truth-time-and-history | 6080×7320 | 831×1000 | 86.3% | 86.3% |
| two-women-at-a-window | 17385×20855 | 3000×3599 | 82.7% | 82.7% |
| unknown-mahakala-in-the-form-of-a-brahman | 6527×9133 | 3840×5373 | 41.2% | 41.2% |
| unknown-untitled-3 | 2223×2845 | 2845×2223 | 28% | 21.9% |
| victory-at-narva | 3524×2590 | 1920×1411 | 45.5% | 45.5% |
| view-of-arles-with-irises-in-the-foreground | 7000×5862 | 4758×4000 | 32% | 31.8% |
| vilhelm-hammersh-i-interior | 6013×6999 | 859×1000 | 85.7% | 85.7% |
| vilhelm-hammersh-i-interior-with-a-reading-lady | 5945×6937 | 857×1000 | 85.6% | 85.6% |
| vincent-van-gogh-enclosed-field-with-peasant | 23036×18484 | 3840×3081 | 83.3% | 83.3% |
| vincent-van-gogh-korenveld-met-cipressen | 10882×8653 | 3840×3053 | 64.7% | 64.7% |
| vincent-van-gogh-self-portrait-2 | 21687×28273 | 3000×3912 | 86.2% | 86.2% |
| vincent-van-gogh-the-red-vineyard-red-vineyard-at-arles-mont | 11406×9092 | 3840×3061 | 66.3% | 66.3% |
| wassily-kandinsky-erinnerung-an-venedig-3-kanal | 8400×6104 | 3840×2790 | 54.3% | 54.3% |
| watson-and-the-shark | 32121×25469 | 3000×2379 | 90.7% | 90.7% |
| woman-holding-a-balance | 23283×26343 | 3000×3395 | 87.1% | 87.1% |
| young-boy-peeling-a-pear | 2940×3474 | 1920×2269 | 34.7% | 34.7% |
| zoie-ghika-moldavian-princess | 2841×3436 | 1920×2322 | 32.4% | 32.4% |
| the-great-wave-off-kanagawa | 8561×6037 | 3840×2708 | 55.1% | 55.1% |
| the-rhinoceros | 10851×8484 | 3000×2346 | 72.4% | 72.3% |
| two-sisters | 19848×24629 | 3840×4765 | 80.7% | 80.7% |
| knight-death-and-the-devil | 3761×4878 | 3000×3891 | 20.2% | 20.2% |
| nemesis | 3388×4892 | 2837×4096 | 16.3% | 16.3% |
| georges-seurat-seascape-at-port-en-bessin-normandy | 31546×25392 | 3000×2415 | 90.5% | 90.5% |
| claude-monet-waterloo-bridge-london-at-dusk | 18814×12079 | 3000×1926 | 84.1% | 84.1% |
| theo-van-rysselberghe-coastal-scene | 28641×23726 | 800×665 | 97.2% | 97.2% |
| madonna-of-the-pinks | 6909×8585 | 870×1080 | 87.4% | 87.4% |
| two-old-men-disputing | 4105×5000 | 1576×1920 | 61.6% | 61.6% |
| fjaestad-winter-moonlight | 3791×3070 | 1000×810 | 73.6% | 73.6% |
| fjaestad-wood-pattern | 3531×2869 | 1000×813 | 71.7% | 71.7% |
| simeon-in-the-temple | 2828×3513 | 805×1000 | 71.5% | 71.5% |
| henri-matisse-auguste-pellerin-ii | 2573×4000 | 1029×1600 | 60% | 60% |
| henri-matisse-tete-blanche-et-rose | 2436×4000 | 974×1600 | 60% | 60% |
| j-m-w-turner-mortlake-terrace | 35379×26561 | 3000×2252 | 91.5% | 91.5% |
| j-m-w-turner-approach-to-venice | 5039×3340 | 3000×1988 | 40.5% | 40.5% |
| j-m-w-turner-venice-the-dogana-and-san-giorgio-maggiore | 5057×3747 | 3000×2223 | 40.7% | 40.7% |
| j-m-w-turner-keelmen-heaving-in-coals-by-moonlight | 5144×3820 | 3000×2228 | 41.7% | 41.7% |
| j-m-w-turner-the-junction-of-the-thames-and-the-medway | 5057×3806 | 3000×2258 | 40.7% | 40.7% |
| j-m-w-turner-the-rape-of-proserpine | 7793×5745 | 3000×2212 | 61.5% | 61.5% |
| j-m-w-turner-the-evening-of-the-deluge | 16878×16964 | 3000×3016 | 82.2% | 82.2% |
| j-m-w-turner-the-dogana-and-santa-maria-della-salute-venice | 26080×17278 | 3000×1987 | 88.5% | 88.5% |
| j-m-w-turner-rotterdam-ferry-boat | 5005×3740 | 3000×2242 | 40.1% | 40.1% |
| j-m-w-turner-a-packet-boat-off-dover | 5083×3478 | 3000×2053 | 41% | 41% |
| j-m-w-turner-a-yorkshire-river | 5049×3566 | 3000×2119 | 40.6% | 40.6% |
| j-m-w-turner-tewkesbury-abbey-no-2 | 6684×8722 | 3000×3915 | 55.1% | 55.1% |
| j-m-w-turner-oberwesel | 5204×3434 | 3000×1980 | 42.4% | 42.3% |
| j-m-w-turner-boats-carrying-out-anchors-to-the-dutch-men-of | 24304×19058 | 3000×2352 | 87.7% | 87.7% |
| vincent-van-gogh-roulin-s-baby-nga | 11574×17076 | 2776×4096 | 76% | 76% |
| vincent-van-gogh-la-mousme | 12684×15516 | 3000×3670 | 76.3% | 76.3% |
| vincent-van-gogh-the-olive-orchard | 22832×18013 | 3000×2367 | 86.9% | 86.9% |
| vincent-van-gogh-flower-beds-in-holland | 35365×25890 | 3000×2196 | 91.5% | 91.5% |
| vincent-van-gogh-green-wheat-fields-auvers | 16266×12766 | 3000×2354 | 81.6% | 81.6% |
| vincent-van-gogh-still-life-of-oranges-and-lemons-with-blue-gloves | 16898×13009 | 3000×2310 | 82.2% | 82.2% |
| girl-with-the-red-hat | 12070×15257 | 3000×3793 | 75.1% | 75.1% |
| william-james-glackens-family-group | 18400×15681 | 3000×2557 | 83.7% | 83.7% |
| jan-van-huysum-flowers-in-an-urn | 12260×16613 | 3000×4066 | 75.5% | 75.5% |
| jan-van-huysum-still-life-with-flowers-and-fruit | 5590×7255 | 3000×3894 | 46.3% | 46.3% |
| joseph-vernet-the-shipwreck | 15463×10739 | 3000×2083 | 80.6% | 80.6% |
| richard-parkes-bonington-the-grand-canal | 24620×17976 | 3000×2190 | 87.8% | 87.8% |
| jean-leon-gerome-view-of-medinet-el-fayoum | 13240×9050 | 3000×2051 | 77.3% | 77.3% |
| william-james-glackens-luxembourg-gardens | 16729×12383 | 3000×2221 | 82.1% | 82.1% |
| jules-breton-the-colza-harvesting-rapeseed | 19075×12998 | 3000×2044 | 84.3% | 84.3% |
| joseph-vernet-moonlight | 26756×18603 | 3000×2086 | 88.8% | 88.8% |
| jules-breton-the-cliff-la-falaise | 36672×23777 | 3000×1945 | 91.8% | 91.8% |
| jean-leon-gerome-edouard-delessert | 8319×12074 | 2822×4096 | 66.1% | 66.1% |
| edward-hopper-ground-swell | 19204×14022 | 3000×2190 | 84.4% | 84.4% |
| edward-hopper-cape-cod-evening | 17405×13054 | 3000×2250 | 82.8% | 82.8% |
| rembrandt-self-portrait-1659 | 25143×32158 | 3000×3838 | 88.1% | 88.1% |
| rembrandt-a-woman-holding-a-pink | 18121×21558 | 3000×3570 | 83.4% | 83.4% |
| rembrandt-lucretia | 16225×19065 | 3000×3526 | 81.5% | 81.5% |
| rembrandt-a-young-man-seated-at-a-table-possibly-govaert-flinck | 17179×21238 | 3000×3709 | 82.5% | 82.5% |
| rembrandt-the-apostle-paul | 17803×22319 | 3000×3761 | 83.1% | 83.1% |
| rembrandt-the-circumcision | 17250×12919 | 3000×2247 | 82.6% | 82.6% |
| rembrandt-the-mill | 22180×18526 | 3000×2506 | 86.5% | 86.5% |
| rembrandt-philemon-and-baucis | 23684×18403 | 3000×2331 | 87.3% | 87.3% |
| rembrandt-portrait-of-a-gentleman-with-a-tall-hat-and-gloves | 17533×20861 | 3000×3570 | 82.9% | 82.9% |
| rembrandt-portrait-of-a-lady-with-an-ostrich-feather-fan | 17330×21073 | 3000×3648 | 82.7% | 82.7% |
| rembrandt-portrait-of-a-man-in-a-tall-hat | 23448×29759 | 3000×3808 | 87.2% | 87.2% |
| rembrandt-saskia-van-uylenburgh-the-wife-of-the-artist | 11148×14348 | 3000×3862 | 73.1% | 73.1% |
| rembrandt-seated-old-man | 4943×5258 | 3000×3192 | 39.3% | 39.3% |
| rembrandt-self-portrait-red-chalk | 5016×5398 | 3000×3229 | 40.2% | 40.2% |
| rembrandt-view-of-diemen | 6557×2702 | 3000×1236 | 54.2% | 54.3% |
| rembrandt-cottages-and-barn-beside-a-road | 6664×3968 | 3000×1786 | 55% | 55% |
| rembrandt-man-with-a-sheet-of-music | 20721×28290 | 3000×4096 | 85.5% | 85.5% |
| henri-harpignies-landscape | 12722×10484 | 3000×2472 | 76.4% | 76.4% |
| jacques-louis-david-madame-david | 12362×15221 | 3000×3694 | 75.7% | 75.7% |
| circle-of-jacques-louis-david-portrait-of-a-young-woman-in-white | 27225×35894 | 3000×3956 | 89% | 89% |
| franz-marc-siberian-dogs-in-the-snow | 18948×13482 | 3000×2135 | 84.2% | 84.2% |
| gustave-caillebotte-skiffs | 23093×17622 | 3000×2289 | 87% | 87% |
| henri-harpignies-landscape-in-auvergne | 7081×4729 | 3000×2004 | 57.6% | 57.6% |
| gustave-caillebotte-dahlias-garden-at-petit-gennevilliers | 15484×21618 | 2934×4096 | 81.1% | 81.1% |
| franz-marc-weasels-at-play | 16497×25008 | 2702×4096 | 83.6% | 83.6% |
| frans-snyders-still-life-with-grapes-and-game | 4755×3788 | 3000×2390 | 36.9% | 36.9% |
| frans-snyders-still-life-with-flowers-grapes-and-small-game-birds | 26070×19576 | 3000×2253 | 88.5% | 88.5% |
| franz-marc-genesis-ii | 3396×4014 | 3000×3546 | 11.7% | 11.7% |
| lawrence-lady-mary-templetown-and-her-eldest-son | 25804×37320 | 2832×4096 | 89% | 89% |
| lawrence-mrs-robert-blencowe | 5325×6794 | 3000×3828 | 43.7% | 43.7% |
| blake-job-and-his-daughters | 10128×7055 | 3000×2090 | 70.4% | 70.4% |
| david-johnson-edwin-forrest | 5292×6310 | 3000×3578 | 43.3% | 43.3% |
| millet-the-bather | 5757×4444 | 3000×2316 | 47.9% | 47.9% |
| carracci-river-landscape | 5970×3510 | 3000×1764 | 49.7% | 49.7% |
| blake-the-last-supper | 6807×4391 | 3000×1935 | 55.9% | 55.9% |
| carracci-venus-adorned-by-the-graces | 29224×22806 | 3000×2341 | 89.7% | 89.7% |
| millet-leconte-de-lisle | 4540×6622 | 2808×4096 | 38.1% | 38.1% |
| millet-portrait-of-a-man | 5019×6406 | 3000×3830 | 40.2% | 40.2% |
| alfred-stevens-young-woman-in-white-holding-a-bouquet | 4145×5806 | 2924×4096 | 29.5% | 29.5% |
| marquet-the-pont-neuf | 5218×4200 | 3000×2413 | 42.5% | 42.5% |
| adolphe-joseph-thomas-monticelli-madame-cahen | 5264×7286 | 2959×4096 | 43.8% | 43.8% |
| pierre-puvis-de-chavannes-the-prodigal-son | 24512×17872 | 3000×2187 | 87.8% | 87.8% |
| alfred-stevens-study-of-a-model | 3162×4836 | 2678×4096 | 15.3% | 15.3% |
| lawrence-francis-charles-seymour-conway-3rd-marquess-of-hertford | 23725×29988 | 3000×3792 | 87.4% | 87.4% |
| pollock-number-1-1950-lavender-mist | 11502×8465 | 3000×2208 | 73.9% | 73.9% |
| juan-gris-fantomas | 16124×13325 | 3000×2479 | 81.4% | 81.4% |
| pollock-number-7-1951 | 19613×16853 | 3000×2577 | 84.7% | 84.7% |
| aert-van-der-neer-moonlit-landscape-with-bridge | 25617×18282 | 3000×2141 | 88.3% | 88.3% |
| blake-evening | 9297×28975 | 1314×4096 | 85.9% | 85.9% |
| pollock-ritual | 17417×37157 | 1921×4096 | 89% | 89% |
| constant-troyon-the-approaching-storm | 9934×7358 | 3000×2222 | 69.8% | 69.8% |
| alexandre-calame-fallen-tree | 11294×6687 | 3000×1776 | 73.4% | 73.4% |
| marquet-posters-at-trouville | 31852×25491 | 3000×2400 | 90.6% | 90.6% |
| alexandre-calame-an-ancient-pine-forest-with-a-mountain-stream | 6299×4617 | 3000×2199 | 52.4% | 52.4% |
| alexandre-calame-swiss-landscape | 11638×8921 | 3000×2300 | 74.2% | 74.2% |
| david-johnson-three-pears-and-an-apple | 13951×8961 | 3000×1927 | 78.5% | 78.5% |
| landseer-lion-defending-its-prey | 4613×2991 | 3000×1945 | 35% | 35% |
| juan-gris-ace-of-clubs-and-four-of-diamonds | 3283×6512 | 2065×4096 | 37.1% | 37.1% |
| juan-gris-glass-and-checkerboard | 17185×12820 | 3000×2238 | 82.5% | 82.5% |
| eugene-isabey-a-celebration | 14173×16977 | 3000×3594 | 78.8% | 78.8% |
| adolphe-joseph-thomas-monticelli-return-from-the-hunt | 29688×14938 | 3000×1509 | 89.9% | 89.9% |
| eugene-isabey-marine | 14625×8925 | 3000×1831 | 79.5% | 79.5% |
| constant-troyon-landscape-with-figures | 11918×8776 | 3000×2209 | 74.8% | 74.8% |
| aert-van-der-neer-winter-in-holland-skating-scene | 17067×13182 | 3000×2317 | 82.4% | 82.4% |
| eugene-isabey-country-tavern-feasting | 25790×17746 | 3000×2064 | 88.4% | 88.4% |
| landseer-the-duke-of-devonshire-and-lady-louisa-egerton | 35256×27223 | 3000×2316 | 91.5% | 91.5% |
| landseer-alpine-mastiffs-reanimating-a-distressed-traveler | 24787×19530 | 3000×2364 | 87.9% | 87.9% |
| pollock-untitled | 7588×4861 | 3000×1923 | 60.5% | 60.4% |
| pollock-untitled-nga-66677 | 7615×4871 | 3000×1920 | 60.6% | 60.6% |
| pollock-untitled-nga-141770 | 5296×3634 | 3000×2060 | 43.4% | 43.3% |
| millet-costume-studies | 3838×3388 | 3000×2648 | 21.8% | 21.8% |
| pollock-untitled-silkscreen-i | 2726×4000 | 2790×4096 | 2.3% | 2.4% |
| pollock-untitled-nga-152773 | 7792×5112 | 3000×1967 | 61.5% | 61.5% |
| millet-calling-home-the-cows | 10428×14087 | 3000×4053 | 71.2% | 71.2% |
| millet-shepherd-returning-with-his-flock | 7161×5499 | 3000×2304 | 58.1% | 58.1% |
| millet-falling-leaves | 6552×5715 | 3000×2617 | 54.2% | 54.2% |
| eugene-isabey-abside-de-l-eglise-de-saint-nectaire | 3510×4591 | 3000×3924 | 14.5% | 14.5% |
| eugene-isabey-souvenir-de-st-valery-sur-somme | 3463×4858 | 2920×4096 | 15.7% | 15.7% |
| eugene-isabey-environs-de-dieppe | 4323×3510 | 3000×2436 | 30.6% | 30.6% |
| eugene-isabey-maree-basse | 3476×4390 | 3000×3789 | 13.7% | 13.7% |
| eugene-isabey-rue-des-gras-a-clermont | 3376×4579 | 3000×4070 | 11.1% | 11.1% |
| eugene-isabey-interieur-d-un-port | 3198×4413 | 2968×4096 | 7.2% | 7.2% |
| eugene-isabey-radoub-d-une-barque-a-maree-basse | 3354×4535 | 3000×4057 | 10.6% | 10.5% |
| eugene-isabey-retour-au-port | 3913×3364 | 3000×2579 | 23.3% | 23.3% |
| eugene-isabey-chaumieres-de-pecheurs | 5250×3271 | 3000×1869 | 42.9% | 42.9% |
| eugene-isabey-chateau-de-pont-gibaud | 4635×3543 | 3000×2293 | 35.3% | 35.3% |
| eugene-isabey-chateau-de-pesteil-a-polminhac | 4457×3499 | 3000×2355 | 32.7% | 32.7% |
| eugene-isabey-radoub-d-une-barque-a-la-maree-basse-refitting-of-a-ship-at-low-tide | 3541×4602 | 3000×3899 | 15.3% | 15.3% |
| eugene-isabey-fishing-boats-tossed-before-a-storm | 4937×3401 | 3000×2067 | 39.2% | 39.2% |
| eugene-isabey-sailboats-in-a-sunlit-harbor-recto | 5550×7356 | 3000×3977 | 45.9% | 45.9% |
| velazquez-pope-innocent-x | 9555×11565 | 3000×3632 | 68.6% | 68.6% |
| velazquez-the-needlewoman | 20911×25426 | 3000×3648 | 85.7% | 85.7% |
| velazquez-portrait-of-a-young-man | 15243×18957 | 3000×3731 | 80.3% | 80.3% |
| elisabeth-louise-vigee-le-brun-madame-d-aguesseau-de-fresnes | 19576×25215 | 3000×3865 | 84.7% | 84.7% |
| mantegna-portrait-of-a-man | 5062×6445 | 3000×3820 | 40.7% | 40.7% |
| durer-portrait-of-a-clergyman-johann-dorsch | 9227×11917 | 3000×3875 | 67.5% | 67.5% |
| mantegna-the-infant-savior | 2382×4936 | 1977×4096 | 17% | 17% |
| elisabeth-louise-vigee-le-brun-marie-antoinette | 12670×16080 | 3000×3808 | 76.3% | 76.3% |
| elisabeth-louise-vigee-le-brun-the-marquise-de-pezay-and-the-marquise-de-rouge-with-her-sons-alexis-and-adrien | 37416×29503 | 3000×2366 | 92% | 92% |
| arshile-gorky-the-artist-and-his-mother | 17358×20795 | 3000×3596 | 82.7% | 82.7% |
| arshile-gorky-one-year-the-milkweed | 20043×15683 | 3000×2347 | 85% | 85% |
| arshile-gorky-organization | 4351×3630 | 3000×2503 | 31.1% | 31% |
| elisabeth-louise-vigee-le-brun-madame-du-barry | 12698×16425 | 3000×3881 | 76.4% | 76.4% |
| constable-salisbury-cathedral-from-lower-marsh-close | 4648×3628 | 3000×2342 | 35.5% | 35.4% |
| constable-wivenhoe-park-essex | 22841×12370 | 3000×1625 | 86.9% | 86.9% |
| ruisdael-forest-scene | 40998×32676 | 3000×2391 | 92.7% | 92.7% |
| durer-the-dream-of-the-doctor-temptation-of-the-idler | 5070×7840 | 2649×4096 | 47.8% | 47.8% |
| durer-the-martyrdom-of-saint-john | 6211×8557 | 2973×4096 | 52.1% | 52.1% |
| durer-the-triumphal-chariot-of-maximilian-i-the-great-triumphal-car | 12905×3103 | 3000×721 | 76.8% | 76.8% |
| john-frederick-kensett-beacon-rock-newport-harbor | 34977×21588 | 3000×1852 | 91.4% | 91.4% |
| ruisdael-country-house-in-a-park | 7741×6036 | 3000×2339 | 61.2% | 61.2% |
| jean-jacques-henner-reclining-nude | 6960×4517 | 3000×1947 | 56.9% | 56.9% |
| ruisdael-landscape | 4178×3714 | 3000×2667 | 28.2% | 28.2% |
| jean-jacques-henner-alsatian-girl | 4576×6784 | 2763×4096 | 39.6% | 39.6% |
| jean-jacques-henner-madame-uhring | 2380×3512 | 2776×4096 | 16.6% | 16.6% |
| john-frederick-kensett-landing-at-sabbath-day-point | 19712×12510 | 3000×1904 | 84.8% | 84.8% |
| stanislas-lepine-pont-de-la-tournelle-paris | 12671×9134 | 3000×2163 | 76.3% | 76.3% |
| john-frederick-kensett-beach-at-beverly | 37113×23639 | 3000×1911 | 91.9% | 91.9% |
| durer-saint-michael-fighting-the-dragon | 5369×7514 | 2927×4096 | 45.5% | 45.5% |
| stanislas-lepine-view-on-the-outskirts-of-caen | 6056×3520 | 3000×1744 | 50.5% | 50.5% |
| durer-the-triumphal-arch-of-maximilian | 8004×9801 | 3000×3674 | 62.5% | 62.5% |
| stanislas-lepine-a-plow-horse-in-a-field | 6317×3544 | 3000×1683 | 52.5% | 52.5% |
| stanislas-lepine-view-of-the-louvre | 7892×4848 | 3000×1843 | 62% | 62% |
| constable-yarmouth-jetty | 27028×16844 | 3000×1870 | 88.9% | 88.9% |
| constable-cloud-study-stormy-sunset | 6519×4618 | 3000×2125 | 54% | 54% |
| jean-jacques-henner-levite-of-ephraim-and-his-dead-wife | 5013×2852 | 3000×1707 | 40.2% | 40.1% |
| john-frederick-kensett-view-on-the-genesee-near-mount-morris | 19601×12074 | 3000×1848 | 84.7% | 84.7% |
| jean-jacques-henner-standing-woman | 12146×22777 | 2184×4096 | 82% | 82% |
| ruisdael-dunes-by-the-sea | 16947×12470 | 3000×2207 | 82.3% | 82.3% |
| guercino-cardinal-francesco-cennini | 17361×21018 | 3000×3632 | 82.7% | 82.7% |
| rousseau-boy-on-the-rocks | 17422×21101 | 3000×3634 | 82.8% | 82.8% |
| frederic-bazille-edouard-blau | 11446×15733 | 2980×4096 | 74% | 74% |
| rousseau-the-equatorial-jungle | 23548×25646 | 3000×3268 | 87.3% | 87.3% |
| rousseau-rendezvous-in-the-forest | 21382×27197 | 3000×3816 | 86% | 86% |
| rousseau-tropical-forest-with-monkeys | 41655×33278 | 3000×2397 | 92.8% | 92.8% |
| frederic-bazille-young-woman-with-peonies | 16998×13438 | 3000×2372 | 82.4% | 82.3% |
| frederic-bazille-the-western-ramparts-at-aigues-mortes | 23403×13873 | 3000×1778 | 87.2% | 87.2% |
| frederic-bazille-edmond-maitre | 4677×6080 | 3000×3900 | 35.9% | 35.9% |
| guercino-amnon-and-tamar | 34388×26209 | 3000×2286 | 91.3% | 91.3% |
| guercino-joseph-and-potiphar-s-wife | 34474×25919 | 3000×2256 | 91.3% | 91.3% |
| guercino-self-portrait-before-a-painting-of-amor-fedele | 22906×27804 | 3000×3642 | 86.9% | 86.9% |
| derby-portrait-of-a-gentleman | 24501×30650 | 3000×3753 | 87.8% | 87.8% |
| william-merritt-chase-a-friendly-call | 10117×6310 | 3000×1871 | 70.3% | 70.3% |
| derby-portrait-of-a-gentleman-nga-34160 | 4960×6169 | 3000×3732 | 39.5% | 39.5% |
| derby-the-corinthian-maid | 31091×25319 | 3000×2443 | 90.4% | 90.4% |
| derby-italian-landscape | 30587×24425 | 3000×2396 | 90.2% | 90.2% |
| albert-bierstadt-lake-lucerne | 7153×4272 | 3000×1792 | 58.1% | 58.1% |
| william-merritt-chase-nude | 5299×6712 | 3000×3800 | 43.4% | 43.4% |
| albert-bierstadt-the-last-of-the-buffalo | 10602×6252 | 3000×1769 | 71.7% | 71.7% |
| william-merritt-chase-gathering-autumn-flowers | 10808×5881 | 3000×1632 | 72.2% | 72.2% |
| albert-bierstadt-buffalo-trail-the-impending-storm | 22191×13222 | 3000×1787 | 86.5% | 86.5% |
| albert-bierstadt-mount-corcoran | 8903×5591 | 3000×1884 | 66.3% | 66.3% |
| william-merritt-chase-an-english-cod | 26831×24133 | 3000×2698 | 88.8% | 88.8% |
| william-merritt-chase-self-portrait | 18570×22431 | 3000×3624 | 83.8% | 83.8% |
| vermeer-the-lacemaker | 10321×11771 | 3000×3422 | 70.9% | 70.9% |
| vermeer-the-smiling-girl | 8339×10877 | 3000×3914 | 64% | 64% |
| vermeer-girl-with-a-flute | 11624×12988 | 3000×3353 | 74.2% | 74.2% |
| boucher-the-bath-of-venus | 8658×11065 | 3000×3835 | 65.3% | 65.3% |
| boucher-allegory-of-painting | 23403×18436 | 3000×2363 | 87.2% | 87.2% |
| boucher-allegory-of-music | 23314×18587 | 3000×2392 | 87.1% | 87.1% |
| boucher-madame-bergeret | 17061×23305 | 2999×4096 | 82.4% | 82.4% |
| charles-francois-daubigny-washerwomen-at-the-oise-river-near-valmondois | 6168×3199 | 3000×1556 | 51.4% | 51.4% |
| boucher-the-love-letter | 7863×8652 | 3000×3302 | 61.8% | 61.8% |
| charles-francois-daubigny-the-farm | 7008×4396 | 3000×1882 | 57.2% | 57.2% |
| church-el-rio-de-luz-the-river-of-light | 36733×23743 | 3000×1939 | 91.8% | 91.8% |
| church-newport-mountain-mount-desert | 17692×11960 | 3000×2028 | 83% | 83% |
| church-fog-off-mount-desert | 1024×768 | 3000×2250 | 193% | 193% |
| church-niagara | 27911×12955 | 3000×1392 | 89.3% | 89.3% |
| church-tamaca-palms | 17899×13173 | 3000×2208 | 83.2% | 83.2% |
| charles-francois-daubigny-landscape-distant-village | 16115×10126 | 3000×1885 | 81.4% | 81.4% |
| charles-francois-daubigny-auvers-washerwomen | 30531×16025 | 3000×1575 | 90.2% | 90.2% |
| charles-francois-daubigny-sunset-on-the-river | 30920×17880 | 3000×1735 | 90.3% | 90.3% |
| canal-the-square-of-saint-mark-s-venice | 25872×19150 | 3000×2221 | 88.4% | 88.4% |
| canal-entrance-to-the-grand-canal-from-the-molo-venice | 8360×6226 | 3000×2234 | 64.1% | 64.1% |
| canal-the-porta-portello-padua | 19535×11085 | 3000×1702 | 84.6% | 84.6% |
| eugene-delacroix-christopher-columbus-and-his-son-at-la-rabida | 4931×3760 | 3000×2288 | 39.2% | 39.1% |
| canal-english-landscape-capriccio-with-a-column | 5527×7069 | 3000×3837 | 45.7% | 45.7% |
| canal-english-landscape-capriccio-with-a-palace | 5576×6934 | 3000×3731 | 46.2% | 46.2% |
| eugene-delacroix-arabs-skirmishing-in-the-mountains | 12688×15802 | 3000×3737 | 76.4% | 76.4% |
| ernst-ludwig-kirchner-two-nudes-obverse | 1753×5263 | 1364×4096 | 22.2% | 22.2% |
| ernst-ludwig-kirchner-nude-figure-reverse | 3873×11784 | 1346×4096 | 65.2% | 65.2% |
| ernst-ludwig-kirchner-dance-hall-bellevue-obverse | 19086×12521 | 3000×1968 | 84.3% | 84.3% |
| ernst-ludwig-kirchner-the-visit-couple-and-newcomer | 8561×8550 | 3000×2996 | 65% | 65% |
| ernst-ludwig-kirchner-two-girls-under-an-umbrella | 5176×6308 | 3000×3657 | 42% | 42% |
| eugene-delacroix-a-horse-hitched-to-a-post | 6477×5767 | 3000×2671 | 53.7% | 53.7% |
| eugene-delacroix-two-studies-of-a-standing-indian-from-calcutta | 17504×14181 | 3000×2430 | 82.9% | 82.9% |
| eugene-delacroix-two-studies-of-an-indian-from-calcutta-seated-and-standing | 17861×14421 | 3000×2422 | 83.2% | 83.2% |
| ernst-ludwig-kirchner-dancing-couple-in-the-snow-reverse | 12884×18761 | 2813×4096 | 78.2% | 78.2% |
| eugene-delacroix-tiger-and-snake | 11964×9427 | 3000×2364 | 74.9% | 74.9% |
| meindert-hobbema-a-farm-in-the-sunlight | 3651×4485 | 3000×3686 | 17.8% | 17.8% |
| meindert-hobbema-a-wooded-landscape | 6683×4812 | 3000×2160 | 55.1% | 55.1% |
| meindert-hobbema-a-view-on-a-high-road | 5128×3704 | 3000×2167 | 41.5% | 41.5% |
| meindert-hobbema-hut-among-trees | 8670×7796 | 3000×2698 | 65.4% | 65.4% |
| meindert-hobbema-the-travelers | 26459×18347 | 3000×2080 | 88.7% | 88.7% |
| meindert-hobbema-village-near-a-pool | 9531×7260 | 3000×2285 | 68.5% | 68.5% |
| odilon-redon-pandora | 11604×26579 | 1788×4096 | 84.6% | 84.6% |
| odilon-redon-saint-sebastian | 11433×26676 | 1755×4096 | 84.6% | 84.6% |
| odilon-redon-evocation-of-roussel | 5232×7157 | 2994×4096 | 42.8% | 42.8% |
| odilon-redon-flowers-in-a-vase | 8222×11638 | 2894×4096 | 64.8% | 64.8% |
| alexej-von-jawlensky-easter-sunday | 4744×6590 | 2949×4096 | 37.8% | 37.8% |
| alexej-von-jawlensky-murnau | 7351×5679 | 3000×2318 | 59.2% | 59.2% |
| odilon-redon-large-vase-with-flowers | 11448×15218 | 3000×3988 | 73.8% | 73.8% |
| odilon-redon-breton-village | 10543×7197 | 3000×2048 | 71.5% | 71.5% |
| alexej-von-jawlensky-portrait-of-a-woman | 13115×15968 | 3000×3654 | 77.1% | 77.1% |
| alexej-von-jawlensky-still-life-with-bottles-and-fruit | 3532×3527 | 3000×2996 | 15.1% | 15.1% |
| alexej-von-jawlensky-red-path-st-prex | 3156×4275 | 3000×4064 | 4.9% | 4.9% |
| alexej-von-jawlensky-frosty-day | 3359×4437 | 3000×3963 | 10.7% | 10.7% |
| odilon-redon-village-by-the-sea-in-brittany | 5625×4303 | 3000×2295 | 46.7% | 46.7% |
| meindert-hobbema-wooded-landscape-with-figures | 16606×12738 | 3000×2301 | 81.9% | 81.9% |
| honore-daumier-advice-to-a-young-artist | 3706×4710 | 3000×3813 | 19.1% | 19% |
| childe-hassam-allies-day-may-1917 | 30689×37478 | 3000×3664 | 90.2% | 90.2% |
| honore-daumier-in-church | 5373×3676 | 3000×2052 | 44.2% | 44.2% |
| honore-daumier-the-beggars | 6835×5519 | 3000×2422 | 56.1% | 56.1% |
| honore-daumier-french-theater | 6974×5096 | 3000×2192 | 57% | 57% |
| honore-daumier-wandering-saltimbanques | 4402×6067 | 2972×4096 | 32.5% | 32.5% |
| honore-daumier-hippolyte-lavoignat | 5588×6978 | 3000×3747 | 46.3% | 46.3% |
| childe-hassam-nude-seated | 6940×7625 | 3000×3297 | 56.8% | 56.8% |
| maurice-utrillo-the-church-of-saint-severin | 4734×6480 | 2990×4096 | 36.8% | 36.8% |
| maurice-utrillo-marizy-sainte-genevieve | 6579×4824 | 3000×2200 | 54.4% | 54.4% |
| maurice-utrillo-row-of-houses-at-pierrefitte | 6570×4566 | 3000×2083 | 54.3% | 54.4% |
| maurice-utrillo-landscape-pierrefitte | 6673×4780 | 3000×2150 | 55% | 55% |
| maurice-utrillo-rue-cortot-montmartre | 4906×6898 | 2913×4096 | 40.6% | 40.6% |
| maurice-utrillo-street-at-corte-corsica | 6502×4840 | 3000×2233 | 53.9% | 53.9% |
| childe-hassam-oyster-sloop-cos-cob | 11515×12527 | 3000×3264 | 73.9% | 73.9% |
| maurice-utrillo-the-pont-saint-michel-paris | 6676×5685 | 3000×2553 | 55.1% | 55.1% |
| childe-hassam-poppies-isles-of-shoals | 15675×12910 | 3000×2471 | 80.9% | 80.9% |
| childe-hassam-a-north-east-headland | 15493×12930 | 3000×2504 | 80.6% | 80.6% |
| childe-hassam-the-new-york-window | 15011×19782 | 3000×3954 | 80% | 80% |
| childe-hassam-old-house-at-east-hampton | 23187×18939 | 3000×2450 | 87.1% | 87.1% |
| honore-daumier-at-the-gallery-drouot | 8973×11387 | 3000×3808 | 66.6% | 66.6% |
| sisley-the-road-in-the-woods | 12190×10139 | 3000×2495 | 75.4% | 75.4% |
| sisley-boulevard-heloise-argenteuil | 8505×5554 | 3000×1959 | 64.7% | 64.7% |
| sisley-meadow | 14045×10447 | 3000×2231 | 78.6% | 78.6% |
| sisley-first-snow-at-veneux-nadon | 17176×12859 | 3000×2246 | 82.5% | 82.5% |
| sisley-flood-at-port-marly | 29434×21890 | 3000×2231 | 89.8% | 89.8% |
| sisley-marly-le-roi | 17949×12085 | 3000×2020 | 83.3% | 83.3% |
| van-gogh-portrait-of-vincent-van-gogh | 4852×6077 | 3000×3758 | 38.2% | 38.2% |
| van-gogh-landscape | 5872×7124 | 3000×3640 | 48.9% | 48.9% |
| van-gogh-roses | 29148×23164 | 3000×2384 | 89.7% | 89.7% |
| whistler-grey-and-silver-chelsea-wharf | 10762×14430 | 3000×4023 | 72.1% | 72.1% |
| whistler-mother-of-pearl-and-silver-the-andalusian | 13215×28563 | 1895×4096 | 85.7% | 85.7% |
| whistler-alexander-arnold-hannay | 3706×6499 | 2336×4096 | 37% | 37% |
| whistler-alice-butt | 8998×12271 | 3000×4092 | 66.7% | 66.7% |
| jean-charles-cazin-the-windmill | 10652×14204 | 3000×3786 | 71.8% | 73.3% |
| whistler-gold-and-brown-self-portrait | 11134×14869 | 3000×4007 | 73.1% | 73.1% |
| whistler-george-w-vanderbilt | 8814×20223 | 1785×4096 | 79.7% | 79.7% |
| jean-charles-cazin-paris-scene-with-bridge | 4836×5603 | 3000×3476 | 38% | 38% |
| whistler-wapping | 26205×18401 | 3000×2107 | 88.6% | 88.5% |
| whistler-battersea-reach | 32607×21584 | 3000×1986 | 90.8% | 90.8% |
| jean-charles-cazin-the-quarry-of-monsieur-pascal-near-nanterre | 14554×11530 | 3000×2377 | 79.4% | 79.4% |
| jean-charles-cazin-landscape | 21227×15465 | 3000×2186 | 85.9% | 85.9% |
| jean-charles-cazin-the-haystack-and-the-moon | 14863×18744 | 3000×3784 | 79.8% | 79.8% |
| jean-charles-cazin-the-great-windmill-and-the-rainbow | 4833×3663 | 3000×2274 | 37.9% | 37.9% |
| jean-charles-cazin-weary-wayfarers | 4862×3887 | 3000×2398 | 38.3% | 38.3% |
| jean-charles-cazin-homestead-by-the-sea | 19486×15514 | 3000×2388 | 84.6% | 84.6% |
| hals-portrait-of-a-woman-aged-sixty | 15776×18722 | 3000×3561 | 81% | 81% |
| hals-portrait-of-a-member-of-the-haarlem-civic-guard | 14415×18015 | 3000×3750 | 79.2% | 79.2% |
| hals-willem-coymans | 4813×5889 | 3000×3671 | 37.7% | 37.7% |
| hals-adriaen-van-ostade | 6040×7594 | 3000×3772 | 50.3% | 50.3% |
| hals-portrait-of-a-young-man | 3671×4498 | 3000×3676 | 18.3% | 18.3% |
| hals-a-young-man-in-a-large-hat | 4206×5448 | 3000×3886 | 28.7% | 28.7% |
| hals-portrait-of-a-man | 5780×6975 | 3000×3621 | 48.1% | 48.1% |
| hals-portrait-of-a-gentleman | 7209×9841 | 3000×4096 | 58.4% | 58.4% |
| robert-henri-catharine | 5832×7051 | 3000×3628 | 48.6% | 48.5% |
| robert-henri-young-woman-in-white | 12764×26447 | 1977×4096 | 84.5% | 84.5% |
| robert-henri-snow-in-new-york | 12638×15758 | 3000×3741 | 76.3% | 76.3% |
| robert-henri-edith-reynolds | 13100×26879 | 1996×4096 | 84.8% | 84.8% |
| robert-henri-volendam-street-scene | 5234×4298 | 3000×2464 | 42.7% | 42.7% |
| robert-henri-george-cotton-smith | 12713×15651 | 3000×3694 | 76.4% | 76.4% |
| robert-henri-elizabeth-virginia-laning-bradner-smith-mrs-george-cotton-smith | 12843×15643 | 3000×3655 | 76.6% | 76.6% |
| robert-henri-seated-nude | 15306×18817 | 3000×3689 | 80.4% | 80.4% |
| robert-henri-indian-girl-in-white-blanket | 13103×16230 | 3000×3716 | 77.1% | 77.1% |
| reynolds-lady-elizabeth-delme-and-her-children | 3176×5199 | 2502×4096 | 21.2% | 21.2% |
| reynolds-lady-elizabeth-compton | 5008×8310 | 2468×4096 | 50.7% | 50.7% |
| reynolds-lady-caroline-howard | 17374×21935 | 3000×3788 | 82.7% | 82.7% |
| reynolds-lady-cornewall | 5957×7497 | 3000×3776 | 49.6% | 49.6% |
| reynolds-lady-elizabeth-hamilton | 5768×8220 | 2874×4096 | 50.2% | 50.2% |
| reynolds-miss-nelly-o-brien | 4389×5327 | 3000×3642 | 31.6% | 31.6% |
| courbet-the-stream-le-ruisseau-du-puits-noir-vallee-de-la-loue | 32819×24850 | 3000×2272 | 90.9% | 90.9% |
| courbet-la-grotte-de-la-loue | 50475×38168 | 3000×2269 | 94.1% | 94.1% |
| reynolds-john-musters | 21190×34419 | 2522×4096 | 88.1% | 88.1% |
| courbet-beach-in-normandy | 5993×4014 | 3000×2009 | 49.9% | 50% |
| courbet-portrait-of-a-young-girl | 6006×6936 | 3000×3465 | 50% | 50% |
| courbet-a-young-woman-reading | 7248×5903 | 3000×2443 | 58.6% | 58.6% |
| courbet-boats-on-a-beach-etretat | 27844×19561 | 3000×2108 | 89.2% | 89.2% |
| courbet-la-bretonnerie-in-the-department-of-indre | 15261×12566 | 3000×2470 | 80.3% | 80.3% |
| courbet-calm-sea | 15417×12983 | 3000×2526 | 80.5% | 80.5% |
| reynolds-miss-beatrix-lister | 12807×15349 | 3000×3596 | 76.6% | 76.6% |
| courbet-the-black-rocks-at-trouville | 29309×24172 | 3000×2474 | 89.8% | 89.8% |
| reynolds-annetta-coke | 26007×31363 | 3000×3618 | 88.5% | 88.5% |
| tiepolo-study-for-a-ceiling-with-the-personification-of-counsel | 30901×17501 | 3000×1699 | 90.3% | 90.3% |
| tiepolo-scene-from-ancient-history | 7094×8926 | 3000×3775 | 57.7% | 57.7% |
| tiepolo-wealth-and-benefits-of-the-spanish-monarchy-under-charles-iii | 9599×16821 | 2337×4096 | 75.7% | 75.6% |
| tiepolo-madonna-of-the-goldfinch | 12896×16322 | 3000×3797 | 76.7% | 76.7% |
| tiepolo-young-lady-in-a-tricorn-hat | 21930×28698 | 3000×3926 | 86.3% | 86.3% |
| tiepolo-apollo-pursuing-daphne | 32915×25922 | 3000×2363 | 90.9% | 90.9% |
| tiepolo-saint-roch-carried-to-heaven-by-angels | 19744×24530 | 3000×3728 | 84.8% | 84.8% |
| rubens-decius-mus-addressing-the-legions | 17693×16950 | 3000×2874 | 83% | 83% |
| rubens-the-meeting-of-abraham-and-melchizedek | 16208×12937 | 3000×2395 | 81.5% | 81.5% |
| rubens-saint-peter | 13136×17855 | 3000×4078 | 77.2% | 77.2% |
| rubens-peter-paul-rubens | 7553×9269 | 3000×3682 | 60.3% | 60.3% |
| tiepolo-bacchus-and-ariadne | 21273×20491 | 3000×2890 | 85.9% | 85.9% |
| rubens-the-assumption-of-the-virgin | 10912×14621 | 3000×4020 | 72.5% | 72.5% |
| tiepolo-queen-zenobia-addressing-her-soldiers | 5980×4260 | 3000×2137 | 49.8% | 49.8% |
| rubens-marchesa-brigida-spinola-doria | 3318×5137 | 2646×4096 | 20.3% | 20.3% |
| rubens-agrippina-and-germanicus | 22193×25968 | 3000×3511 | 86.5% | 86.5% |
| rubens-daniel-in-the-lions-den | 25211×17048 | 3000×2029 | 88.1% | 88.1% |
| rubens-the-fall-of-phaeton | 35539×26496 | 3000×2237 | 91.6% | 91.6% |
| rubens-the-meeting-of-david-and-abigail | 26333×17937 | 3000×2043 | 88.6% | 88.6% |
| tiepolo-madonna-of-the-goldfinch-nga-101678 | 27552×34907 | 3000×3801 | 89.1% | 89.1% |
| goya-the-marquesa-de-pontejos | 11141×18534 | 2462×4096 | 77.9% | 77.9% |
| goya-charles-iv-of-spain-as-huntsman | 3789×5994 | 2589×4096 | 31.7% | 31.7% |
| goya-senora-sabasa-garcia | 12162×14995 | 3000×3699 | 75.3% | 75.3% |
| guardi-view-on-the-cannaregio-canal-venice | 6012×3867 | 3000×1930 | 50.1% | 50.1% |
| guardi-temporary-tribune-in-the-campo-san-zanipolo-venice | 3505×4202 | 3000×3597 | 14.4% | 14.4% |
| goya-bartolome-sureda-y-miserol | 11940×17930 | 2728×4096 | 77.2% | 77.2% |
| goya-therese-louise-de-sureda | 11228×17078 | 2693×4096 | 76% | 76% |
| guardi-grand-canal-with-the-rialto-bridge-venice | 4958×3635 | 3000×2199 | 39.5% | 39.5% |
| guardi-capriccio-of-a-harbor | 26722×18141 | 3000×2037 | 88.8% | 88.8% |
| guardi-rialto-bridge-venice | 6928×4340 | 3000×1879 | 56.7% | 56.7% |
| guardi-fanciful-view-of-the-castel-sant-angelo-rome | 19120×11598 | 3000×1820 | 84.3% | 84.3% |
| goya-victor-guye | 16304×20463 | 3000×3766 | 81.6% | 81.6% |
| guardi-the-square-of-saint-mark-s-venice | 6961×3954 | 3000×1704 | 56.9% | 56.9% |
| goya-don-antonio-noriega | 25205×32331 | 3000×3849 | 88.1% | 88.1% |
| goya-the-duke-of-wellington | 12674×15965 | 3000×3779 | 76.3% | 76.3% |
| goya-young-lady-wearing-a-mantilla-and-basquina | 12331×17425 | 2899×4096 | 76.5% | 76.5% |
| guardi-carlo-and-ubaldo-resisting-the-enchantments-of-armida-s-nymphs | 6589×3513 | 3000×1599 | 54.5% | 54.5% |
| guardi-erminia-and-the-shepherds | 6205×3479 | 3000×1682 | 51.7% | 51.7% |
| goya-maria-teresa-de-borbon-y-vallabriga-later-condesa-de-chinchon | 11471×13269 | 3000×3471 | 73.8% | 73.8% |
| guardi-santa-maria-della-salute | 12251×7372 | 3000×1805 | 75.5% | 75.5% |
| titian-venus-with-a-mirror | 24992×29610 | 3000×3555 | 88% | 88% |
| titian-andrea-de-franceschi | 4945×6245 | 3000×3789 | 39.3% | 39.3% |
| titian-cupid-with-the-wheel-of-time | 21080×25252 | 3000×3594 | 85.8% | 85.8% |
| titian-allegory-of-love | 5241×5935 | 3000×3398 | 42.8% | 42.7% |
| titian-woman-holding-an-apple | 12872×17089 | 3000×3983 | 76.7% | 76.7% |
| benjamin-west-colonel-guy-johnson-and-karonghyontye-captain-david-hill | 23576×34699 | 2783×4096 | 88.2% | 88.2% |
| benjamin-west-benjamin-west | 4259×5188 | 3000×3655 | 29.6% | 29.5% |
| titian-the-feast-of-the-gods | 26900×24642 | 3000×2748 | 88.8% | 88.8% |
| benjamin-west-maria-hamilton-beckford-mrs-william-beckford | 5445×7044 | 3000×3881 | 44.9% | 44.9% |
| benjamin-west-elizabeth-countess-of-effingham | 5590×7190 | 3000×3859 | 46.3% | 46.3% |
| titian-ranuccio-farnese | 28585×34917 | 3000×3665 | 89.5% | 89.5% |
| titian-venus-blindfolding-cupid | 5691×7204 | 3000×3798 | 47.3% | 47.3% |
| titian-cardinal-pietro-bembo | 13171×16171 | 3000×3684 | 77.2% | 77.2% |
| benjamin-west-the-battle-of-la-hogue | 26750×19027 | 3000×2134 | 88.8% | 88.8% |
| titian-giacomo-and-cardinal-marco-corner-investing-andrea-abbot-of-san-zeno-with-his-benefice | 24007×18085 | 3000×2260 | 87.5% | 87.5% |
| titian-doge-andrea-gritti | 16907×21869 | 3000×3881 | 82.3% | 82.3% |
| benjamin-west-dr-samuel-boude | 15842×18729 | 3000×3547 | 81.1% | 81.1% |
| benjamin-west-mary-bethel-boude-mrs-samuel-boude | 5194×6276 | 3000×3625 | 42.2% | 42.2% |
| benjamin-west-the-expulsion-of-adam-and-eve-from-paradise | 19820×13253 | 3000×2006 | 84.9% | 84.9% |
| benjamin-west-telemachus-and-calypso | 25854×17996 | 3000×2088 | 88.4% | 88.4% |
| benjamin-west-cupid-stung-by-a-bee-is-cherished-by-his-mother | 17577×17529 | 3000×2992 | 82.9% | 82.9% |
| morisot-the-sisters | 30906×19591 | 3000×1902 | 90.3% | 90.3% |
| morisot-the-artist-s-daughter-with-a-parakeet | 10427×13255 | 3000×3814 | 71.2% | 71.2% |
| morisot-in-the-dining-room | 12568×15466 | 3000×3692 | 76.1% | 76.1% |
| morisot-the-mother-and-sister-of-the-artist | 22304×27544 | 3000×3705 | 86.5% | 86.5% |
| morisot-the-artist-s-sister-at-a-window | 17500×20918 | 3000×3586 | 82.9% | 82.9% |
| morisot-the-harbor-at-lorient | 27871×16521 | 3000×1778 | 89.2% | 89.2% |
| morisot-young-woman-with-a-straw-hat | 5567×6624 | 3000×3570 | 46.1% | 46.1% |
| morisot-girl-in-a-boat-with-geese | 5795×6998 | 3000×3623 | 48.2% | 48.2% |
| morisot-hanging-the-laundry-out-to-dry | 8264×6710 | 3000×2436 | 63.7% | 63.7% |
| morisot-peonies | 9241×11518 | 3000×3740 | 67.5% | 67.5% |
| morisot-young-girl-with-an-apron | 11070×13162 | 3000×3567 | 72.9% | 72.9% |
| raoul-dufy-saint-jeannet | 18570×15011 | 3000×2427 | 83.8% | 83.8% |
| cole-a-view-of-the-mountain-pass-called-the-notch-of-the-white-mountains-crawford-notch | 26925×17532 | 3000×1953 | 88.9% | 88.9% |
| cole-sketch-for-ohio-state-capitol-design | 15273×5381 | 3000×1057 | 80.4% | 80.4% |
| cole-the-voyage-of-life-youth | 5117×3501 | 3000×2053 | 41.4% | 41.4% |
| cole-the-voyage-of-life-manhood | 5272×3468 | 3000×1973 | 43.1% | 43.1% |
| cole-the-voyage-of-life-old-age | 5100×3431 | 3000×2018 | 41.2% | 41.2% |
| raoul-dufy-july-14-in-le-havre | 3455×5047 | 2803×4096 | 18.9% | 18.8% |
| raoul-dufy-music-and-the-pink-violin | 16272×13394 | 3000×2470 | 81.6% | 81.6% |
| cole-sunrise-in-the-catskills | 17795×12732 | 3000×2146 | 83.1% | 83.1% |
| cole-italian-coast-scene-with-ruined-tower | 5103×3751 | 3000×2205 | 41.2% | 41.2% |
| raoul-dufy-the-beach-at-sainte-adresse | 17477×14456 | 3000×2480 | 82.8% | 82.8% |
| cole-study-for-catskill-creek | 6559×4365 | 3000×1996 | 54.3% | 54.3% |
| raoul-dufy-the-landing | 19320×14829 | 3000×2303 | 84.5% | 84.5% |
| cole-the-return | 25386×15687 | 3000×1854 | 88.2% | 88.2% |
| cole-the-departure | 25475×15798 | 3000×1860 | 88.2% | 88.2% |
| cole-tornado-in-an-american-forest | 32063×22708 | 3000×2125 | 90.6% | 90.6% |
| toulouse-lautrec-a-corner-of-the-moulin-de-la-galette | 4490×5065 | 3000×3385 | 33.2% | 33.2% |
| toulouse-lautrec-rue-des-moulins-1894 | 5479×7495 | 2994×4096 | 45.4% | 45.4% |
| toulouse-lautrec-maxime-dethomas | 5448×6987 | 3000×3848 | 44.9% | 44.9% |
| toulouse-lautrec-alfred-la-guigne | 5511×7299 | 3000×3974 | 45.6% | 45.6% |
| toulouse-lautrec-quadrille-at-the-moulin-rouge | 5579×7394 | 3000×3976 | 46.2% | 46.2% |
| toulouse-lautrec-the-artist-s-dog-fleche | 6333×10661 | 2433×4096 | 61.6% | 61.6% |
| toulouse-lautrec-carmen-gaudin | 6702×10809 | 2540×4096 | 62.1% | 62.1% |
| toulouse-lautrec-lady-with-a-dog | 5650×7453 | 3000×3958 | 46.9% | 46.9% |
| toulouse-lautrec-a-la-bastille-jeanne-wenz | 21190×30990 | 2801×4096 | 86.8% | 86.8% |
| toulouse-lautrec-marcelle-lender-dancing-the-bolero-in-chilperic | 20415×20395 | 3000×2997 | 85.3% | 85.3% |
| toulouse-lautrec-the-trap | 13859×9929 | 3000×2149 | 78.4% | 78.4% |
| toulouse-lautrec-hussars | 16302×12804 | 3000×2356 | 81.6% | 81.6% |
| henri-fantin-latour-duchess-de-fitz-james | 10596×12597 | 3000×3567 | 71.7% | 71.7% |
| henri-fantin-latour-mademoiselle-de-fitz-james | 10506×12590 | 3000×3596 | 71.4% | 71.4% |
| henri-fantin-latour-self-portrait | 8184×10282 | 3000×3770 | 63.3% | 63.3% |
| amedeo-modigliani-cafe-singer | 22970×35522 | 2649×4096 | 88.5% | 88.5% |
| amedeo-modigliani-girl-in-a-green-blouse | 17568×31785 | 2264×4096 | 87.1% | 87.1% |
| amedeo-modigliani-nude-on-a-blue-cushion | 27753×17920 | 3000×1937 | 89.2% | 89.2% |
| amedeo-modigliani-chaim-soutine | 22919×35427 | 2650×4096 | 88.4% | 88.4% |
| amedeo-modigliani-monsieur-deleu | 17589×31355 | 2298×4096 | 86.9% | 86.9% |
| amedeo-modigliani-nude-on-a-divan | 35661×23169 | 3000×1949 | 91.6% | 91.6% |
| henri-fantin-latour-portrait-of-sonia | 17559×24208 | 2971×4096 | 83.1% | 83.1% |
| henri-fantin-latour-still-life | 5848×4755 | 3000×2439 | 48.7% | 48.7% |
| amedeo-modigliani-adrienne-woman-with-bangs | 16296×23608 | 2827×4096 | 82.7% | 82.6% |
| amedeo-modigliani-madame-amedee-woman-with-cigarette | 15424×23930 | 2640×4096 | 82.9% | 82.9% |
| amedeo-modigliani-leon-bakst | 19576×32500 | 2467×4096 | 87.4% | 87.4% |
| amedeo-modigliani-roma-woman-with-baby | 28402×44980 | 2586×4096 | 90.9% | 90.9% |
| amedeo-modigliani-madame-kisling | 17003×23723 | 2936×4096 | 82.7% | 82.7% |
| amedeo-modigliani-woman-with-red-hair | 23412×35476 | 2703×4096 | 88.5% | 88.5% |
| henri-fantin-latour-three-peaches-on-a-plate | 4699×3528 | 3000×2252 | 36.2% | 36.2% |
| henri-fantin-latour-self-portrait-nga-92996 | 3310×3975 | 3000×3603 | 9.4% | 9.4% |
| henri-fantin-latour-roses-de-nice-on-a-table | 11663×7082 | 3000×1822 | 74.3% | 74.3% |
| henri-fantin-latour-still-life-with-grapes-and-a-carnation | 4853×3150 | 3000×1947 | 38.2% | 38.2% |
| henri-fantin-latour-still-life-with-mustard-pot | 9198×5835 | 3000×1903 | 67.4% | 67.4% |
| henri-fantin-latour-pansies | 18249×11716 | 3000×1926 | 83.6% | 83.6% |
| henri-fantin-latour-still-life-with-peaches-and-grapes | 14204×10652 | 3000×2014 | 78.9% | 81.1% |
| gainsborough-mrs-richard-brinsley-sheridan | 10977×15561 | 2889×4096 | 73.7% | 73.7% |
| gainsborough-georgiana-duchess-of-devonshire | 16055×25972 | 2532×4096 | 84.2% | 84.2% |
| gainsborough-miss-catherine-tatton | 12609×15067 | 3000×3585 | 76.2% | 76.2% |
| gainsborough-mrs-john-taylor | 4905×5910 | 3000×3615 | 38.8% | 38.8% |
| gainsborough-mountain-landscape-with-bridge | 19730×16620 | 3000×2527 | 84.8% | 84.8% |
| gainsborough-mrs-paul-cobb-methuen | 5208×6216 | 3000×3581 | 42.4% | 42.4% |
| gainsborough-the-hon-mrs-thomas-graham | 11757×15153 | 3000×3867 | 74.5% | 74.5% |
| gainsborough-john-4th-earl-of-darnley | 6376×7842 | 3000×3690 | 52.9% | 52.9% |
| gauguin-the-bathers | 35660×22808 | 3000×1919 | 91.6% | 91.6% |
| gainsborough-master-john-heathcote | 17716×22228 | 3000×3765 | 83.1% | 83.1% |
| gainsborough-william-yelverton-davenport | 23570×29511 | 3000×3757 | 87.3% | 87.3% |
| gauguin-madame-alexandre-kohler | 9615×12157 | 3000×3794 | 68.8% | 68.8% |
| gauguin-brittany-landscape | 16595×13163 | 3000×2380 | 81.9% | 81.9% |
| gauguin-fatata-te-miti-by-the-sea | 12545×9282 | 3000×2220 | 76.1% | 76.1% |
| gauguin-self-portrait | 6852×10663 | 2632×4096 | 61.6% | 61.6% |
| gainsborough-seashore-with-fishermen | 30601×24379 | 3000×2390 | 90.2% | 90.2% |
| gauguin-haystacks-in-brittany | 25643×20436 | 3000×2391 | 88.3% | 88.3% |
| gauguin-parau-na-te-varua-ino-words-of-the-devil | 12716×17105 | 3000×4036 | 76.4% | 76.4% |
| gauguin-te-pape-nave-nave-delectable-waters | 16917×13162 | 3000×2334 | 82.3% | 82.3% |
| gauguin-the-invocation | 35762×31075 | 3000×2607 | 91.6% | 91.6% |
| gauguin-breton-girls-dancing-pont-aven | 35659×27973 | 3000×2353 | 91.6% | 91.6% |
| gauguin-landscape-at-le-pouldu | 26614×21064 | 3000×2374 | 88.7% | 88.7% |
| gauguin-self-portrait-dedicated-to-carriere | 8771×10840 | 3000×3708 | 65.8% | 65.8% |
| gauguin-still-life-with-peonies | 16372×13341 | 3000×2445 | 81.7% | 81.7% |
| gainsborough-francis-basset-lord-de-dunstanville | 18289×22942 | 3000×3764 | 83.6% | 83.6% |
| gainsborough-frances-susanna-lady-de-dunstanville | 18308×22950 | 3000×3761 | 83.6% | 83.6% |
| winslow-homer-breezing-up-a-fair-wind | 28431×17894 | 3000×1888 | 89.4% | 89.4% |
| winslow-homer-hound-and-hunter | 35432×20615 | 3000×1745 | 91.5% | 91.5% |
| winslow-homer-right-and-left | 36241×20975 | 3000×1736 | 91.7% | 91.7% |
| winslow-homer-sunset | 6700×4550 | 3000×2037 | 55.2% | 55.2% |
| winslow-homer-the-red-school-house | 9567×13665 | 2868×4096 | 70% | 70% |
| winslow-homer-autumn | 23283×37180 | 2565×4096 | 89% | 89% |
| winslow-homer-dad-s-coming | 4815×3215 | 3000×2003 | 37.7% | 37.7% |
| winslow-homer-home-sweet-home | 3608×4769 | 3000×3966 | 16.9% | 16.8% |
| winslow-homer-the-dinner-horn-blowing-the-horn-at-seaside | 20081×28460 | 2890×4096 | 85.6% | 85.6% |
| winslow-homer-sparrow-hall | 22550×15575 | 3000×2072 | 86.7% | 86.7% |
| winslow-homer-east-hampton-beach-long-island | 13170×6076 | 3000×1384 | 77.2% | 77.2% |
| winslow-homer-the-flirt | 6429×4179 | 3000×1950 | 53.3% | 53.3% |
| winslow-homer-school-time | 13434×8844 | 3000×1975 | 77.7% | 77.7% |
| winslow-homer-sketch-of-a-cottage-yard | 7317×4773 | 3000×1957 | 59% | 59% |
| winslow-homer-a-light-on-the-sea | 22922×13329 | 3000×1744 | 86.9% | 86.9% |
| copley-baron-graham | 5153×6309 | 3000×3674 | 41.8% | 41.8% |
| copley-the-red-cross-knight | 6813×5245 | 3000×2310 | 56% | 56% |
| copley-jane-browne | 5062×6085 | 3000×3607 | 40.7% | 40.7% |
| copley-the-death-of-the-earl-of-chatham | 7104×5800 | 3000×2449 | 57.8% | 57.8% |
| copley-epes-sargent | 4831×6079 | 3000×3775 | 37.9% | 37.9% |
| copley-colonel-william-fitch-and-his-sisters-sarah-and-ann-fitch | 6191×4654 | 3000×2255 | 51.5% | 51.5% |
| copley-the-copley-family | 32830×26136 | 3000×2388 | 90.9% | 90.9% |
| copley-eleazer-tyng | 21551×26746 | 3000×3724 | 86.1% | 86.1% |
| copley-anne-fairchild-bowler-mrs-metcalf-bowler | 8110×10163 | 3000×3760 | 63% | 63% |
| seurat-study-for-la-grande-jatte | 7697×4812 | 3000×1876 | 61% | 61% |
| copley-harrison-gray | 5397×6541 | 3000×3636 | 44.4% | 44.4% |
| copley-adam-babcock | 5435×6976 | 3000×3851 | 44.8% | 44.8% |
| copley-elizabeth-gray-otis-mrs-samuel-alleyne-otis | 16429×18793 | 3000×3432 | 81.7% | 81.7% |
| seurat-the-lighthouse-at-honfleur | 15803×12861 | 3000×2441 | 81% | 81% |
| copley-abigail-smith-babcock-mrs-adam-babcock | 19450×25013 | 3000×3859 | 84.6% | 84.6% |
| copley-sketch-for-the-copley-family | 3237×3764 | 3000×3489 | 7.3% | 7.3% |
| seurat-seascape-gravelines | 6859×4759 | 3000×2081 | 56.3% | 56.3% |
| seurat-haymakers-at-montfermeil | 6554×4106 | 3000×1879 | 54.2% | 54.2% |
| seurat-peasant-with-a-hoe | 6474×4062 | 3000×1882 | 53.7% | 53.7% |
| seurat-the-stone-breaker | 7562×4687 | 3000×1859 | 60.3% | 60.3% |
| seurat-the-watering-can-garden-at-le-raincy | 3987×6466 | 2526×4096 | 36.6% | 36.7% |
| seurat-a-summer-landscape | 7263×4502 | 3000×1860 | 58.7% | 58.7% |
| seurat-figures-in-a-landscape | 6436×3951 | 3000×1842 | 53.4% | 53.4% |
| seurat-bathers-study-for-bathers-at-asnieres | 7587×4832 | 3000×1911 | 60.5% | 60.5% |
| seurat-horse-and-boats-study-for-bathers-at-asnieres | 7583×4803 | 3000×1900 | 60.4% | 60.4% |
| seurat-the-seine-with-clothing-on-the-bank-study-for-bathers-at-asnieres | 6064×3781 | 3000×1871 | 50.5% | 50.5% |
| seurat-study-of-figures-for-la-grande-jatte | 7687×4698 | 3000×1833 | 61% | 61% |
| seurat-haystacks | 7634×4787 | 3000×1881 | 60.7% | 60.7% |
| seurat-man-with-a-hoe | 6469×4069 | 3000×1887 | 53.6% | 53.6% |
| copley-thomas-amory-ii | 13207×16661 | 3000×3785 | 77.3% | 77.3% |
| sargent-peter-a-b-widener | 17762×27030 | 2692×4096 | 84.8% | 84.8% |
| sargent-nonchaloir-repose | 18332×15338 | 3000×2510 | 83.6% | 83.6% |
| sargent-ellen-peabody-endicott-mrs-william-crowninshield-endicott | 27585×39142 | 2887×4096 | 89.5% | 89.5% |
| sargent-miss-mathilde-townsend | 14756×22136 | 2730×4096 | 81.5% | 81.5% |
| sargent-mary-crowninshield-endicott-chamberlain-mrs-joseph-chamberlain | 13986×24959 | 2295×4096 | 83.6% | 83.6% |
| sargent-street-in-venice | 23781×19932 | 3000×2514 | 87.4% | 87.4% |
| sargent-miss-grace-woodhouse | 3980×7011 | 2325×4096 | 41.6% | 41.6% |
| andre-derain-head-of-a-woman | 5103×5693 | 3000×3346 | 41.2% | 41.2% |
| andre-derain-portrait-of-a-girl | 4476×6059 | 3000×4061 | 33% | 33% |
| andre-derain-woman-in-an-armchair | 5805×7296 | 3000×3771 | 48.3% | 48.3% |
| andre-derain-woman-in-a-chemise | 5405×6951 | 3000×3858 | 44.5% | 44.5% |
| andre-derain-flowers-in-a-vase | 6012×4731 | 3000×2360 | 50.1% | 50.1% |
| andre-derain-harlequin | 5648×6916 | 3000×3674 | 46.9% | 46.9% |
| andre-derain-the-old-bridge | 6926×5600 | 3000×2427 | 56.7% | 56.7% |
| andre-derain-still-life | 6977×5553 | 3000×2387 | 57% | 57% |
| sargent-eleanora-o-donnell-iselin-mrs-adrian-iselin | 12706×21215 | 2453×4096 | 80.7% | 80.7% |
| andre-derain-road-in-provence | 7056×5644 | 3000×2400 | 57.5% | 57.5% |
| andre-derain-abandoned-house-in-provence | 7142×5659 | 3000×2377 | 58% | 58% |
| andre-derain-marie-harriman | 5811×5648 | 3000×2917 | 48.4% | 48.4% |
| andre-derain-still-life-nga-53128 | 18059×22832 | 3000×3793 | 83.4% | 83.4% |
| andre-derain-charing-cross-bridge-london | 16695×13380 | 3000×2403 | 82% | 82% |
| andre-derain-mountains-at-collioure | 15893×12858 | 3000×2427 | 81.1% | 81.1% |
| andre-derain-view-of-the-thames | 16237×12756 | 3000×2357 | 81.5% | 81.5% |
| sargent-wild-olive-tree-roots-valldemosa-majorca | 29634×23322 | 3000×2361 | 89.9% | 89.9% |
| sargent-miss-beatrice-townsend | 3528×4963 | 2912×4096 | 17.5% | 17.5% |
| sargent-marie-buloz-pailleron-madame-edouard-pailleron | 13386×27691 | 1980×4096 | 85.2% | 85.2% |
| sargent-pavement-cairo | 23404×19365 | 3000×2482 | 87.2% | 87.2% |
| sargent-margaret-stuyvesant-rutherfurd-white-mrs-henry-white | 16869×26461 | 2611×4096 | 84.5% | 84.5% |
| sargent-simplon-pass | 17592×13635 | 3000×2325 | 82.9% | 82.9% |
| sargent-en-route-pour-la-peche-setting-out-to-fish | 31495×19903 | 3000×1896 | 90.5% | 90.5% |
| sargent-apollo-and-daphne | 14736×17009 | 3000×3463 | 79.6% | 79.6% |
| bellows-both-members-of-this-club | 4943×3526 | 3000×2140 | 39.3% | 39.3% |
| bellows-maud-murray-dale-mrs-chester-dale | 8434×10090 | 3000×3590 | 64.4% | 64.4% |
| bellows-chester-dale | 14695×19049 | 3000×3889 | 79.6% | 79.6% |
| bellows-blue-morning | 13134×10236 | 3000×2338 | 77.2% | 77.2% |
| bellows-the-lone-tenement | 10481×7844 | 3000×2245 | 71.4% | 71.4% |
| bellows-nude-with-red-hair | 4739×6179 | 3000×3912 | 36.7% | 36.7% |
| bellows-florence-sittenham-davey-mrs-randall-davey | 12960×16533 | 3000×3828 | 76.9% | 76.8% |
| bellows-club-night | 12107×9771 | 3000×2421 | 75.2% | 75.2% |
| bellows-anne-with-a-japanese-parasol | 8127×13458 | 2473×4096 | 69.6% | 69.6% |
| bellows-little-girl-in-white-queenie-burnett | 8949×16270 | 2253×4096 | 74.8% | 74.8% |
| bellows-my-family | 18599×16844 | 3000×2717 | 83.9% | 83.9% |
| bellows-nude-with-hexagonal-quilt | 13182×10711 | 3000×2438 | 77.2% | 77.2% |
| bellows-tennis-tournament | 11855×10583 | 3000×2678 | 74.7% | 74.7% |
| bellows-new-york | 5211×3597 | 3000×2071 | 42.4% | 42.4% |
| bellows-the-germans-arrive | 19881×12355 | 3000×1864 | 84.9% | 84.9% |
| bellows-forty-two-kids | 19201×13297 | 3000×2078 | 84.4% | 84.4% |
| picasso-lady-with-a-fan | 22783×28368 | 3000×3735 | 86.8% | 86.8% |
| picasso-pedro-manach | 20036×30555 | 2685×4096 | 86.6% | 86.6% |
| picasso-family-of-saltimbanques | 25245×23548 | 3000×2798 | 88.1% | 88.1% |
| picasso-madame-picasso | 18226×22528 | 3000×3709 | 83.5% | 83.5% |
| picasso-nude-woman | 10441×32559 | 1311×4096 | 87.4% | 87.4% |
| picasso-the-tragedy | 13445×20422 | 2694×4096 | 80% | 79.9% |
| picasso-still-life | 18591×13769 | 3000×2223 | 83.9% | 83.9% |
| picasso-guitar | 13219×17870 | 3000×4055 | 77.3% | 77.3% |
| picasso-harlequin-musician | 12829×17268 | 3000×4036 | 76.6% | 76.6% |
| picasso-le-gourmet | 9481×12886 | 3000×4079 | 68.4% | 68.3% |
| picasso-dora-maar | 6313×7681 | 3000×3649 | 52.5% | 52.5% |
| picasso-a-glass-on-a-table | 6501×5013 | 3000×2313 | 53.9% | 53.9% |
| picasso-classical-head | 4891×5997 | 3000×3679 | 38.7% | 38.7% |
| picasso-the-lovers | 4302×5784 | 3000×4036 | 30.3% | 30.2% |
| picasso-juggler-with-still-life | 4105×5994 | 2803×4096 | 31.7% | 31.7% |
| picasso-two-youths | 3416×5562 | 2517×4096 | 26.3% | 26.4% |
| picasso-peonies | 3191×4751 | 2749×4096 | 13.9% | 13.8% |
| pissarro-landscape-at-les-patis-pontoise | 22831×18511 | 3000×2432 | 86.9% | 86.9% |
| pissarro-boulevard-des-italiens-morning-sunlight | 19123×15292 | 3000×2399 | 84.3% | 84.3% |
| pissarro-charing-cross-bridge-london | 19627×12736 | 3000×1947 | 84.7% | 84.7% |
| pissarro-the-artist-s-garden-at-eragny | 17209×13693 | 3000×2387 | 82.6% | 82.6% |
| pissarro-young-peasant-girls-resting-in-the-fields-near-pontoise | 17154×13720 | 3000×2399 | 82.5% | 82.5% |
| pissarro-hampton-court-green | 17656×12992 | 3000×2208 | 83% | 83% |
| pissarro-the-louvre-afternoon-rainy-weather | 16127×12953 | 3000×2410 | 81.4% | 81.4% |
| pissarro-peasant-girl-with-a-straw-hat | 13041×15970 | 3000×3674 | 77% | 77% |
| pissarro-peasant-woman | 12399×15274 | 3000×3696 | 75.8% | 75.8% |
| pissarro-orchard-in-bloom-louveciennes | 13067×10700 | 3000×2457 | 77% | 77% |
| pissarro-landscape-ile-de-france | 14204×9580 | 3000×2023 | 78.9% | 78.9% |
| pissarro-the-fence | 9662×7928 | 3000×2462 | 69% | 68.9% |
| pissarro-the-bather | 6443×8342 | 3000×3885 | 53.4% | 53.4% |
| pissarro-a-creek-in-st-thomas-virgin-islands | 8363×6261 | 3000×2246 | 64.1% | 64.1% |
| pissarro-the-gardener-old-peasant-with-cabbage | 5876×7370 | 3000×3763 | 48.9% | 48.9% |
| pissarro-place-du-carrousel-paris | 5802×4811 | 3000×2488 | 48.3% | 48.3% |
| pissarro-two-women-chatting-by-the-sea-st-thomas | 5954×4003 | 3000×2017 | 49.6% | 49.6% |
| matisse-still-life-with-sleeping-woman | 38501×31070 | 3000×2420 | 92.2% | 92.2% |
| matisse-la-coiffure | 27368×32702 | 3000×3586 | 89% | 89% |
| matisse-woman-seated-in-an-armchair | 29306×24338 | 3000×2490 | 89.8% | 89.8% |
| matisse-still-life-with-apples-on-a-pink-tablecloth | 23616×19343 | 3000×2457 | 87.3% | 87.3% |
| matisse-still-life-with-pineapple | 23575×19333 | 3000×2460 | 87.3% | 87.3% |
| matisse-odalisque-seated-with-arms-raised-green-striped-chair | 17964×23331 | 3000×3897 | 83.3% | 83.3% |
| matisse-large-decoration-with-masks | 28889×10215 | 3000×1060 | 89.6% | 89.6% |
| matisse-palm-leaf-tangier | 13601×19565 | 2849×4096 | 79.1% | 79.1% |
| matisse-pianist-and-checker-players | 16600×13291 | 3000×2403 | 81.9% | 81.9% |
| matisse-lorette-with-turban-yellow-jacket | 13074×16203 | 3000×3720 | 77.1% | 77% |
| matisse-la-negresse | 14918×10864 | 3000×2183 | 79.9% | 79.9% |
| matisse-venus | 10128×13710 | 3000×4061 | 70.4% | 70.4% |
| matisse-beasts-of-the-sea | 7882×15201 | 2121×4096 | 73.1% | 73.1% |
| matisse-the-plumed-hat | 9545×11940 | 3000×3756 | 68.6% | 68.5% |
| matisse-woman-with-amphora-and-pomegranates | 5614×14512 | 1584×4096 | 71.8% | 71.8% |
| matisse-odalisque-half-length-the-tattoo | 6680×9583 | 2854×4096 | 57.3% | 57.3% |
| matisse-les-gorges-du-loup | 6928×5601 | 3000×2427 | 56.7% | 56.7% |
| matisse-pot-of-geraniums | 3628×4547 | 3000×3761 | 17.3% | 17.3% |
| matisse-still-life | 4749×3250 | 3000×2053 | 36.8% | 36.8% |
| pierre-bonnard-the-white-tablecloth | 29721×31529 | 3000×3184 | 89.9% | 89.9% |
| pierre-bonnard-the-artist-s-studio | 29030×23782 | 3000×2457 | 89.7% | 89.7% |
| pierre-bonnard-paris-rue-de-parme-on-bastille-day | 16530×33258 | 2034×4096 | 87.7% | 87.7% |
| pierre-bonnard-stairs-in-the-artist-s-garden | 22538×19454 | 3000×2590 | 86.7% | 86.7% |
| pierre-bonnard-the-cab-horse | 23601×17335 | 3000×2203 | 87.3% | 87.3% |
| pierre-bonnard-two-dogs-in-a-deserted-street | 15913×20852 | 3000×3931 | 81.1% | 81.1% |
| pierre-bonnard-nude-in-an-interior | 13066×24934 | 2144×4096 | 83.6% | 83.6% |
| pierre-bonnard-work-table | 12975×17456 | 3000×4036 | 76.9% | 76.9% |
| pierre-bonnard-still-life-with-dog | 15568×12791 | 3000×2463 | 80.7% | 80.7% |
| pierre-bonnard-bouquet-of-flowers | 11176×16765 | 2731×4096 | 75.6% | 75.6% |
| pierre-bonnard-the-green-table | 15337×11933 | 3000×2333 | 80.4% | 80.4% |
| pierre-bonnard-the-letter | 11168×13008 | 3000×3493 | 73.1% | 73.1% |
| pierre-bonnard-table-set-in-a-garden | 13638×10434 | 3000×2297 | 78% | 78% |
| pierre-bonnard-vase-with-flowers | 9656×10983 | 3000×3414 | 68.9% | 68.9% |
| pierre-bonnard-the-artist-s-sister-and-her-children | 5437×6589 | 3000×3634 | 44.8% | 44.8% |
| pierre-bonnard-a-spring-landscape | 7324×4709 | 3000×1930 | 59% | 59% |
| pierre-bonnard-study-for-a-portrait-of-vuillard | 3727×4583 | 3000×3689 | 19.5% | 19.5% |
| pierre-bonnard-walking-at-the-lake-bois-de-boulogne | 4055×3667 | 3000×2713 | 26% | 26% |
| pierre-bonnard-cherries | 4066×3561 | 3000×2627 | 26.2% | 26.2% |
| pierre-bonnard-red-plums | 4487×3201 | 3000×2140 | 33.1% | 33.1% |
| pierre-bonnard-the-barge-st-tropez-in-the-harbor-of-cannes | 3889×3629 | 3000×2800 | 22.9% | 22.8% |
| degas-scene-from-the-steeplechase-the-fallen-jockey | 35835×42821 | 3000×3585 | 91.6% | 91.6% |
| degas-edmondo-and-therese-morbilli | 23572×30954 | 3000×3940 | 87.3% | 87.3% |
| degas-four-dancers | 27492×23004 | 3000×2510 | 89.1% | 89.1% |
| degas-woman-ironing | 20056×24834 | 3000×3715 | 85% | 85% |
| degas-girl-in-red | 17940×21864 | 3000×3657 | 83.3% | 83.3% |
| degas-alexander-and-bucephalus | 17135×22426 | 3000×3927 | 82.5% | 82.5% |
| degas-madame-camus | 19268×14855 | 3000×2313 | 84.4% | 84.4% |
| degas-woman-viewed-from-behind-visit-to-a-museum | 16035×17276 | 3000×3233 | 81.3% | 81.3% |
| degas-the-riders | 17558×13939 | 3000×2382 | 82.9% | 82.9% |
| degas-the-dance-class | 16933×12896 | 3000×2285 | 82.3% | 82.3% |
| degas-achille-de-gas-in-the-uniform-of-a-cadet | 12150×15400 | 3000×3803 | 75.3% | 75.3% |
| degas-before-the-ballet | 18704×8120 | 3000×1302 | 84% | 84% |
| degas-the-dance-lesson | 18560×8036 | 3000×1299 | 83.8% | 83.8% |
| degas-horses-in-a-meadow | 13105×10487 | 3000×2401 | 77.1% | 77.1% |
| degas-the-races | 11533×8700 | 3000×2263 | 74% | 74% |
| degas-madame-rene-de-gas | 10797×8567 | 3000×2380 | 72.2% | 72.2% |
| degas-rene-de-gas | 8572×10367 | 3000×3629 | 65% | 65% |
| degas-mademoiselle-malot | 5708×7095 | 3000×3729 | 47.4% | 47.4% |
| degas-self-portrait-with-white-collar | 4842×6888 | 2879×4096 | 40.5% | 40.5% |
| degas-dancers-backstage | 4028×5298 | 3000×3946 | 25.5% | 25.5% |
| degas-the-loge | 5954×3413 | 3000×1720 | 49.6% | 49.6% |
| jean-baptiste-camille-corot-madame-stumpf-and-her-daughter | 21212×30145 | 2882×4096 | 86.4% | 86.4% |
| jean-baptiste-camille-corot-the-eel-gatherers | 25967×19231 | 3000×2222 | 88.4% | 88.4% |
| jean-baptiste-camille-corot-souvenir-of-terracina | 24548×19903 | 3000×2432 | 87.8% | 87.8% |
| jean-baptiste-camille-corot-forest-of-fontainebleau | 25730×18704 | 3000×2181 | 88.3% | 88.3% |
| jean-baptiste-camille-corot-ville-d-avray | 24902×18793 | 3000×2264 | 88% | 88% |
| jean-baptiste-camille-corot-landscape | 22114×16080 | 3000×2181 | 86.4% | 86.4% |
| jean-baptiste-camille-corot-a-view-near-volterra | 18728×13651 | 3000×2187 | 84% | 84% |
| jean-baptiste-camille-corot-river-view | 17274×13691 | 3000×2378 | 82.6% | 82.6% |
| jean-baptiste-camille-corot-agostina | 12851×17648 | 2983×4096 | 76.8% | 76.8% |
| jean-baptiste-camille-corot-the-repose | 19893×11334 | 3000×1709 | 84.9% | 84.9% |
| jean-baptiste-camille-corot-the-moored-boatman-souvenir-of-an-italian-lake | 18356×12185 | 3000×1991 | 83.7% | 83.7% |
| jean-baptiste-camille-corot-dance-under-the-trees-at-the-edge-of-the-lake | 17875×12268 | 3000×2059 | 83.2% | 83.2% |
| jean-baptiste-camille-corot-italian-woman-la-morieri | 12167×14309 | 3000×3529 | 75.3% | 75.3% |
| jean-baptiste-camille-corot-gypsy-woman-with-mandolin | 11342×13922 | 3000×3683 | 73.5% | 73.5% |
| jean-baptiste-camille-corot-portrait-of-a-young-girl | 9289×11135 | 3000×3597 | 67.7% | 67.7% |
| jean-baptiste-camille-corot-the-island-and-bridge-of-san-bartolomeo-rome | 11567×7193 | 3000×1866 | 74.1% | 74.1% |
| jean-baptiste-camille-corot-italian-peasant-boy | 8034×6197 | 3000×2314 | 62.7% | 62.7% |
| jean-baptiste-camille-corot-corot-s-studio-woman-seated-before-an-easel-a-mandolin-in-her-hand | 5566×8564 | 2662×4096 | 52.2% | 52.2% |
| jean-baptiste-camille-corot-bridge-on-the-saone-river-at-macon | 7757×5704 | 3000×2206 | 61.3% | 61.3% |
| jean-baptiste-camille-corot-saint-sebastian-succored-by-the-holy-women | 4388×6576 | 2733×4096 | 37.7% | 37.7% |
| jean-baptiste-camille-corot-view-near-epernon | 6630×3983 | 3000×1802 | 54.8% | 54.8% |
| jean-baptiste-camille-corot-the-forest-of-coubron | 4236×5245 | 3000×3715 | 29.2% | 29.2% |
| jean-baptiste-camille-corot-woman-reading-in-the-studio | 5314×4166 | 3000×2352 | 43.5% | 43.5% |
| jean-baptiste-camille-corot-rocks-in-the-forest-of-fontainebleau | 4666×3603 | 3000×2317 | 35.7% | 35.7% |
| jean-baptiste-camille-corot-beach-near-etretat | 5888×2829 | 3000×1441 | 49% | 49.1% |
| boudin-bathing-time-at-deauville | 35844×21768 | 3000×1822 | 91.6% | 91.6% |
| boudin-festival-in-the-harbor-of-honfleur | 28952×19752 | 3000×2047 | 89.6% | 89.6% |
| boudin-return-of-the-terre-neuvier | 22648×16608 | 3000×2200 | 86.8% | 86.8% |
| boudin-the-beach-at-villerville | 20392×12096 | 3000×1780 | 85.3% | 85.3% |
| boudin-le-havre | 18140×12955 | 3000×2143 | 83.5% | 83.5% |
| boudin-beach-scene | 18641×12106 | 3000×1948 | 83.9% | 83.9% |
| boudin-figures-on-the-beach | 16809×10445 | 3000×1864 | 82.2% | 82.2% |
| boudin-coast-of-brittany | 15292×10821 | 3000×2123 | 80.4% | 80.4% |
| boudin-low-tide-at-scheveningen | 15509×10340 | 3000×2000 | 80.7% | 80.7% |
| boudin-beach-at-trouville | 14805×7951 | 3000×1611 | 79.7% | 79.7% |
| boudin-entrance-to-the-harbor-le-havre | 12440×9123 | 3000×2200 | 75.9% | 75.9% |
| boudin-low-tide-sailboats-run-aground | 9526×11788 | 3000×3713 | 68.5% | 68.5% |
| boudin-ships-and-sailing-boats-leaving-le-havre | 12397×8509 | 3000×2059 | 75.8% | 75.8% |
| boudin-jetty-and-wharf-at-trouville | 13047×7876 | 3000×1811 | 77% | 77% |
| boudin-washerwomen-on-the-beach-of-etretat | 12037×8197 | 3000×2043 | 75.1% | 75.1% |
| boudin-fair-in-brittany | 12259×7071 | 3000×1730 | 75.5% | 75.5% |
| boudin-yacht-basin-at-trouville-deauville | 8229×10151 | 3000×3701 | 63.5% | 63.5% |
| boudin-women-on-the-beach-at-berck | 9659×6646 | 3000×2064 | 68.9% | 68.9% |
| boudin-concert-at-the-casino-of-deauville | 10067×5666 | 3000×1688 | 70.2% | 70.2% |
| boudin-washerwoman-near-trouville | 5218×3494 | 3000×2009 | 42.5% | 42.5% |
| boudin-ship-on-the-touques | 3565×4905 | 2977×4096 | 16.5% | 16.5% |
| boudin-the-trawlers | 4910×3362 | 3000×2054 | 38.9% | 38.9% |
| boudin-beach-scene-at-trouville | 5167×3104 | 3000×1802 | 41.9% | 41.9% |
| boudin-on-the-beach | 5176×2969 | 3000×1721 | 42% | 42% |
| boudin-on-the-jetty | 4665×3157 | 3000×2030 | 35.7% | 35.7% |
| boudin-on-the-beach-trouville | 4939×2766 | 3000×1680 | 39.3% | 39.3% |
| anthony-van-dyck-filippo-cattaneo | 31704×46378 | 2800×4096 | 91.2% | 91.2% |
| anthony-van-dyck-maddalena-cattaneo | 31702×46358 | 2801×4096 | 91.2% | 91.2% |
| anthony-van-dyck-giovanni-vincenzo-imperiale | 24135×29388 | 3000×3653 | 87.6% | 87.6% |
| anthony-van-dyck-marchesa-elena-grimaldi-cattaneo | 18655×33059 | 2311×4096 | 87.6% | 87.6% |
| anthony-van-dyck-queen-henrietta-maria-with-sir-jeffrey-hudson | 16462×27108 | 2487×4096 | 84.9% | 84.9% |
| anthony-van-dyck-the-prefect-raffaele-raggi | 18147×22568 | 3000×3731 | 83.5% | 83.5% |
| anthony-van-dyck-catherine-howard-lady-d-aubigny | 17048×21568 | 3000×3796 | 82.4% | 82.4% |
| anthony-van-dyck-philip-lord-wharton | 16889×21201 | 3000×3766 | 82.2% | 82.2% |
| anthony-van-dyck-a-genoese-noblewoman-and-her-son | 15648×21531 | 2977×4096 | 81% | 81% |
| anthony-van-dyck-portrait-of-a-flemish-lady | 12820×17474 | 3000×4090 | 76.6% | 76.6% |
| anthony-van-dyck-group-of-four-boys | 13208×16343 | 3000×3713 | 77.3% | 77.3% |
| anthony-van-dyck-lady-with-a-fan | 11569×13604 | 3000×3528 | 74.1% | 74.1% |
| anthony-van-dyck-susanna-fourment-and-her-daughter | 9963×14695 | 2777×4096 | 72.1% | 72.1% |
| anthony-van-dyck-isabella-brant | 9321×11855 | 3000×3816 | 67.8% | 67.8% |
| anthony-van-dyck-head-of-a-young-man | 9212×11464 | 3000×3734 | 67.4% | 67.4% |
| anthony-van-dyck-saint-mark | 8789×10341 | 3000×3530 | 65.9% | 65.9% |
| anthony-van-dyck-saint-john | 8806×10283 | 3000×3504 | 65.9% | 65.9% |
| anthony-van-dyck-saint-peter | 8739×10310 | 3000×3540 | 65.7% | 65.7% |
| anthony-van-dyck-saint-matthew | 8665×10365 | 3000×3589 | 65.4% | 65.4% |
| anthony-van-dyck-saint-james | 8635×10271 | 3000×3569 | 65.3% | 65.3% |
| anthony-van-dyck-saint-andrew | 8584×10282 | 3000×3594 | 65.1% | 65% |
| anthony-van-dyck-saint-james-the-less | 8609×10229 | 3000×3565 | 65.2% | 65.1% |
| anthony-van-dyck-saint-paul | 8509×10321 | 3000×3639 | 64.7% | 64.7% |
| anthony-van-dyck-saint-thomas | 8664×10136 | 3000×3510 | 65.4% | 65.4% |
| anthony-van-dyck-saint-simon | 8477×10156 | 3000×3595 | 64.6% | 64.6% |
| anthony-van-dyck-saint-philip | 8409×10220 | 3000×3647 | 64.3% | 64.3% |
| anthony-van-dyck-saint-bartholomew | 8379×10211 | 3000×3656 | 64.2% | 64.2% |
| anthony-van-dyck-the-virgin-as-intercessor | 6248×7335 | 3000×3522 | 52% | 52% |
| anthony-van-dyck-henri-ii-de-lorraine | 4756×8026 | 2427×4096 | 49% | 49% |
| anthony-van-dyck-marchesa-balbi | 3386×5049 | 2747×4096 | 18.9% | 18.9% |
| monet-wheatstacks-snow-effect-morning | 10877×6994 | 3000×1929 | 72.4% | 72.4% |
| monet-view-from-voorzan | 3635×1696 | 1000×467 | 72.5% | 72.5% |
| monet-view-over-the-sea | 3519×2775 | 1000×789 | 71.6% | 71.6% |
| turner-dort-or-dordrecht-the-dort-packet-boat-from-rotterdam-becalmed | 14484×9741 | 3000×2017 | 79.3% | 79.3% |
| turner-port-ruysdael | 10019×7467 | 3000×2236 | 70.1% | 70.1% |
| turner-stormy-sea-breaking-on-a-shore | 6634×4428 | 3000×2002 | 54.8% | 54.8% |
| turner-squally-weather | 7037×4620 | 3000×1970 | 57.4% | 57.4% |
| turner-lake-avernus-aeneas-and-the-cumaean-sibyl | 6138×4500 | 3000×2199 | 51.1% | 51.1% |
| turner-staffa-fingal-s-cave | 9989×7480 | 3000×2247 | 70% | 70% |
| turner-tummel-bridge-perthshire | 10099×6123 | 3000×1819 | 70.3% | 70.3% |
| turner-chateaux-de-st-michael-bonneville-savoy | 9889×7360 | 3000×2233 | 69.7% | 69.7% |
| turner-wreckers-coast-of-northumberland-with-a-steam-boat-assisting-a-ship-off-shore | 6939×5160 | 3000×2231 | 56.8% | 56.8% |
| turner-harlech-castle-from-tygwyn-ferry-summer-s-evening-twilight | 9820×7075 | 3000×2161 | 69.5% | 69.5% |
| turner-newark-abbey | 9345×6897 | 3000×2214 | 67.9% | 67.9% |
| turner-the-victory-returning-from-trafalgar-in-three-positions | 10145×6849 | 3000×2025 | 70.4% | 70.4% |
| turner-a-limekiln-possibly-at-briton-ferry-in-south-wales | 4086×2784 | 3000×2044 | 26.6% | 26.6% |
| turner-inverary-pier-loch-fyne-morning | 7190×5370 | 3000×2241 | 58.3% | 58.3% |

## (c) iiif info.json ≠ recorded w,h (full table; ✓ = applied)

| id | recorded w,h | info.json w,h | applied? |
| --- | --- | --- | --- |
| marquet-the-pont-neuf | 5218×4200 | 900×724 | not applied (img-measured does not agree with info.json) |
| pollock-number-7-1951 | 19613×16853 | 900×773 | not applied (img-measured does not agree with info.json) |
| pollock-ritual | 17417×37157 | 422×900 | not applied (img-measured does not agree with info.json) |
| marquet-posters-at-trouville | 31852×25491 | 900×720 | not applied (img-measured does not agree with info.json) |
| pollock-untitled | 7588×4861 | 900×577 | not applied (img-measured does not agree with info.json) |
| pollock-untitled-nga-66677 | 7615×4871 | 900×576 | not applied (img-measured does not agree with info.json) |
| pollock-untitled-nga-141770 | 5296×3634 | 900×618 | not applied (img-measured does not agree with info.json) |
| pollock-untitled-silkscreen-i | 2726×4000 | 613×900 | not applied (img-measured does not agree with info.json) |
| pollock-untitled-nga-152773 | 7792×5112 | 900×590 | not applied (img-measured does not agree with info.json) |
| arshile-gorky-the-artist-and-his-mother | 17358×20795 | 751×900 | not applied (img-measured does not agree with info.json) |
| arshile-gorky-one-year-the-milkweed | 20043×15683 | 900×704 | not applied (img-measured does not agree with info.json) |
| arshile-gorky-organization | 4351×3630 | 900×751 | not applied (img-measured does not agree with info.json) |
| alexej-von-jawlensky-easter-sunday | 4744×6590 | 648×900 | not applied (img-measured does not agree with info.json) |
| alexej-von-jawlensky-portrait-of-a-woman | 13115×15968 | 739×900 | not applied (img-measured does not agree with info.json) |
| maurice-utrillo-the-church-of-saint-severin | 4734×6480 | 657×900 | not applied (img-measured does not agree with info.json) |
| maurice-utrillo-marizy-sainte-genevieve | 6579×4824 | 900×660 | not applied (img-measured does not agree with info.json) |
| maurice-utrillo-row-of-houses-at-pierrefitte | 6570×4566 | 900×625 | not applied (img-measured does not agree with info.json) |
| maurice-utrillo-landscape-pierrefitte | 6673×4780 | 900×645 | not applied (img-measured does not agree with info.json) |
| maurice-utrillo-rue-cortot-montmartre | 4906×6898 | 640×900 | not applied (img-measured does not agree with info.json) |
| maurice-utrillo-street-at-corte-corsica | 6502×4840 | 900×670 | not applied (img-measured does not agree with info.json) |
| maurice-utrillo-the-pont-saint-michel-paris | 6676×5685 | 900×766 | not applied (img-measured does not agree with info.json) |
| jean-charles-cazin-the-windmill | 10652×14204 | 8525×10758 | not applied (img-measured does not agree with info.json) |
| raoul-dufy-saint-jeannet | 18570×15011 | 900×728 | not applied (img-measured does not agree with info.json) |
| raoul-dufy-july-14-in-le-havre | 3455×5047 | 616×900 | not applied (img-measured does not agree with info.json) |
| raoul-dufy-music-and-the-pink-violin | 16272×13394 | 900×741 | not applied (img-measured does not agree with info.json) |
| raoul-dufy-the-beach-at-sainte-adresse | 17477×14456 | 900×744 | not applied (img-measured does not agree with info.json) |
| raoul-dufy-the-landing | 19320×14829 | 900×691 | not applied (img-measured does not agree with info.json) |
| henri-fantin-latour-still-life-with-peaches-and-grapes | 14204×10652 | 9870×6626 | not applied (img-measured does not agree with info.json) |
| andre-derain-head-of-a-woman | 5103×5693 | 807×900 | not applied (img-measured does not agree with info.json) |
| andre-derain-portrait-of-a-girl | 4476×6059 | 665×900 | not applied (img-measured does not agree with info.json) |
| andre-derain-woman-in-an-armchair | 5805×7296 | 716×900 | not applied (img-measured does not agree with info.json) |
| andre-derain-woman-in-a-chemise | 5405×6951 | 700×900 | not applied (img-measured does not agree with info.json) |
| andre-derain-flowers-in-a-vase | 6012×4731 | 900×708 | not applied (img-measured does not agree with info.json) |
| andre-derain-harlequin | 5648×6916 | 735×900 | not applied (img-measured does not agree with info.json) |
| andre-derain-the-old-bridge | 6926×5600 | 900×728 | not applied (img-measured does not agree with info.json) |
| andre-derain-still-life | 6977×5553 | 900×716 | not applied (img-measured does not agree with info.json) |
| andre-derain-road-in-provence | 7056×5644 | 900×720 | not applied (img-measured does not agree with info.json) |
| andre-derain-abandoned-house-in-provence | 7142×5659 | 900×713 | not applied (img-measured does not agree with info.json) |
| andre-derain-marie-harriman | 5811×5648 | 900×875 | not applied (img-measured does not agree with info.json) |
| andre-derain-still-life-nga-53128 | 18059×22832 | 712×900 | not applied (img-measured does not agree with info.json) |
| andre-derain-charing-cross-bridge-london | 16695×13380 | 900×721 | not applied (img-measured does not agree with info.json) |
| andre-derain-mountains-at-collioure | 15893×12858 | 900×728 | not applied (img-measured does not agree with info.json) |
| andre-derain-view-of-the-thames | 16237×12756 | 900×707 | not applied (img-measured does not agree with info.json) |
| picasso-lady-with-a-fan | 22783×28368 | 723×900 | not applied (img-measured does not agree with info.json) |
| picasso-pedro-manach | 20036×30555 | 590×900 | not applied (img-measured does not agree with info.json) |
| picasso-madame-picasso | 18226×22528 | 728×900 | not applied (img-measured does not agree with info.json) |
| picasso-nude-woman | 10441×32559 | 288×900 | not applied (img-measured does not agree with info.json) |
| picasso-the-tragedy | 13445×20422 | 592×900 | not applied (img-measured does not agree with info.json) |
| picasso-still-life | 18591×13769 | 900×667 | not applied (img-measured does not agree with info.json) |
| picasso-guitar | 13219×17870 | 666×900 | not applied (img-measured does not agree with info.json) |
| picasso-harlequin-musician | 12829×17268 | 669×900 | not applied (img-measured does not agree with info.json) |
| picasso-le-gourmet | 9481×12886 | 662×900 | not applied (img-measured does not agree with info.json) |
| picasso-dora-maar | 6313×7681 | 740×900 | not applied (img-measured does not agree with info.json) |
| picasso-a-glass-on-a-table | 6501×5013 | 900×694 | not applied (img-measured does not agree with info.json) |
| picasso-classical-head | 4891×5997 | 734×900 | not applied (img-measured does not agree with info.json) |
| picasso-the-lovers | 4302×5784 | 669×900 | not applied (img-measured does not agree with info.json) |
| picasso-juggler-with-still-life | 4105×5994 | 616×900 | not applied (img-measured does not agree with info.json) |
| picasso-two-youths | 3416×5562 | 553×900 | not applied (img-measured does not agree with info.json) |
| picasso-peonies | 3191×4751 | 604×900 | not applied (img-measured does not agree with info.json) |
| matisse-still-life-with-sleeping-woman | 38501×31070 | 900×726 | not applied (img-measured does not agree with info.json) |
| matisse-la-coiffure | 27368×32702 | 753×900 | not applied (img-measured does not agree with info.json) |
| matisse-woman-seated-in-an-armchair | 29306×24338 | 900×747 | not applied (img-measured does not agree with info.json) |
| matisse-still-life-with-apples-on-a-pink-tablecloth | 23616×19343 | 900×737 | not applied (img-measured does not agree with info.json) |
| matisse-still-life-with-pineapple | 23575×19333 | 900×738 | not applied (img-measured does not agree with info.json) |
| matisse-odalisque-seated-with-arms-raised-green-striped-chair | 17964×23331 | 693×900 | not applied (img-measured does not agree with info.json) |
| matisse-large-decoration-with-masks | 28889×10215 | 900×318 | not applied (img-measured does not agree with info.json) |
| matisse-palm-leaf-tangier | 13601×19565 | 626×900 | not applied (img-measured does not agree with info.json) |
| matisse-pianist-and-checker-players | 16600×13291 | 900×721 | not applied (img-measured does not agree with info.json) |
| matisse-lorette-with-turban-yellow-jacket | 13074×16203 | 726×900 | not applied (img-measured does not agree with info.json) |
| matisse-la-negresse | 14918×10864 | 900×655 | not applied (img-measured does not agree with info.json) |
| matisse-venus | 10128×13710 | 665×900 | not applied (img-measured does not agree with info.json) |
| matisse-beasts-of-the-sea | 7882×15201 | 466×900 | not applied (img-measured does not agree with info.json) |
| matisse-the-plumed-hat | 9545×11940 | 719×900 | not applied (img-measured does not agree with info.json) |
| matisse-woman-with-amphora-and-pomegranates | 5614×14512 | 348×900 | not applied (img-measured does not agree with info.json) |
| matisse-odalisque-half-length-the-tattoo | 6680×9583 | 627×900 | not applied (img-measured does not agree with info.json) |
| matisse-les-gorges-du-loup | 6928×5601 | 900×728 | not applied (img-measured does not agree with info.json) |
| matisse-pot-of-geraniums | 3628×4547 | 718×900 | not applied (img-measured does not agree with info.json) |
| matisse-still-life | 4749×3250 | 900×616 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-the-white-tablecloth | 29721×31529 | 848×900 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-the-artist-s-studio | 29030×23782 | 900×737 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-paris-rue-de-parme-on-bastille-day | 16530×33258 | 447×900 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-stairs-in-the-artist-s-garden | 22538×19454 | 900×777 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-the-cab-horse | 23601×17335 | 900×661 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-two-dogs-in-a-deserted-street | 15913×20852 | 687×900 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-nude-in-an-interior | 13066×24934 | 471×900 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-work-table | 12975×17456 | 669×900 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-still-life-with-dog | 15568×12791 | 900×739 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-bouquet-of-flowers | 11176×16765 | 600×900 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-the-green-table | 15337×11933 | 900×700 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-the-letter | 11168×13008 | 773×900 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-table-set-in-a-garden | 13638×10434 | 900×689 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-vase-with-flowers | 9656×10983 | 791×900 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-the-artist-s-sister-and-her-children | 5437×6589 | 743×900 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-a-spring-landscape | 7324×4709 | 900×579 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-study-for-a-portrait-of-vuillard | 3727×4583 | 732×900 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-walking-at-the-lake-bois-de-boulogne | 4055×3667 | 900×814 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-cherries | 4066×3561 | 900×788 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-red-plums | 4487×3201 | 900×642 | not applied (img-measured does not agree with info.json) |
| pierre-bonnard-the-barge-st-tropez-in-the-harbor-of-cannes | 3889×3629 | 900×840 | not applied (img-measured does not agree with info.json) |

## (d) art_imgsize ≠ Commons true size (full table; all APPLIED)

| id | recorded | Commons true size |
| --- | --- | --- |
| fjaestad-wood-pattern | 3000×2438 | 1000×813 |
| fjaestad-winter-moonlight | 3000×2429 | 1000×810 |
| the-birth-of-venus | 3000×4238 | 1239×1749 |
| paule-gobillard-peignant | 3000×2691 | 1500×1361 |
| portrait-de-madame-claude-monet | 3000×3639 | 1500×1806 |
| in-the-arbour | 2935×2720 | 1948×1787 |
| the-open-window | 2012×2424 | 1608×1927 |
| the-taking-of-christ | 3000×2325 | 1500×1172 |
| hellelil-and-hildebrand-the-meeting-on-the-turret-stairs | 1931×3000 | 1500×2329 |
| simeon-in-the-temple | 2828×3513 | 1000×1228 |
| landscape-with-snow | 1576×1295 | 980×797 |
| yellow-cow | 2390×1767 | 1067×797 |
| graceful-ascent | 3000×2988 | 980×976 |
| the-lady-of-shalott | 3000×2302 | 1712×1314 |
| black-obelisk-of-shalmaneser-iii | 3000×4500 | 1361×2048 |
| mlle-irene-cahen-d-anvers | 3000×3610 | 990×1200 |
| two-sisters | 3000×3723 | 1813×2250 |
| shahnameh-of-shah-tahmasp | 3000×4519 | 1458×2200 |
| vincent-van-gogh-cypresse | 2848×3616 | 1476×1861 |
| vincent-van-gogh-korenveld-met-cipressen | 3752×2940 | 10882×8653 |
| franz-marc-tierschicksale | 3000×2202 | 1150×838 |
| peter-paul-rubens-self-portrait | 3000×4095 | 1924×2636 |
| arnold-bocklin-im-spiel-der-wellen | 3000×2279 | 1344×1018 |
| vincent-van-gogh-blick-auf-arles | 2672×2108 | 900×714 |
| claude-monet-arm-of-the-seine-near-giverny | 1219×992 | 684×549 |
| claude-monet-belle-ile-rocks-cote-sauvage | 850×682 | 500×409 |
| henry-fuseli-thor-battering-the-midgard-serpent | 2024×2855 | 1415×2000 |
| paul-cezanne-la-maison-du-pendu-auvers-sur-oise | 2874×2328 | 1460×1200 |
| john-constable-the-opening-of-waterloo-bridge-whitehall-stai | 3000×1780 | 1536×912 |
| paul-cezanne-une-moderne-olympia | 2193×1892 | 1411×1200 |
| henri-edmond-cross-la-chevelure | 2304×3104 | 643×850 |
| wilhelm-trubner-ave-caesar-morituri-te-salutant | 2885×3552 | 1654×2042 |
| georges-seurat-seascape-at-port-en-bessin-normandy | 3000×2416 | 1576×1253 |
| paul-steck-ophelie | 1200×2031 | 472×800 |
| vincent-van-gogh-enclosed-field-with-rising-sun | 2536×1984 | 751×590 |
| jozef-che-monski-bitwa-pod-el-teb-kawaleria-sudanska-prze-am | 3000×2008 | 800×539 |
| jean-baptiste-camille-corot-bacchanal-at-the-spring-souvenir | 1286×1600 | 1000×1267 |
| paul-signac-setting-sun-sardine-fishing-concarneau | 2000×1596 | 745×590 |
| arshile-gorky-enigmatic-combat | 3000×2250 | 1280×962 |
| pierre-bonnard-l-amandier-en-fleurs | 866×1280 | 662×970 |
| vincent-van-gogh-self-portrait | 3000×3792 | 1774×2250 |

## (e) URL errors (REPORT ONLY)

| id | url | error |
| --- | --- | --- |
| alexej-von-jawlensky-kopf | https://upload.wikimedia.org/wikipedia/commons/5/51/LWL_Museum_f%C3%BCr_Kunst_und_Kultur-Jawlensky-Kopf_DSC5884.jpg | no SOF in 64KB window |
| berthe-morisot-study-at-the-water-s-edge | https://upload.wikimedia.org/wikipedia/commons/2/20/Berthe_Morisot_-_Study_at_the_Water%27s_Edge_-_Paris_1863_%E2%80%93_1874-_Revolution_in_der_Kunst-9835_%28cropped%29.jpg | no SOF in 64KB window |
| eugene-louis-boudin-de-kust-bij-deauville | https://upload.wikimedia.org/wikipedia/commons/5/59/Ein_Gef%C3%BChl_von_Sommer-Eug%C3%A8ne_Boudin-Die_K%C3%BCste_bei_Deauville-6070.jpg | no SOF in 64KB window |
| henri-de-toulouse-lautrec-madame-la-comtesse-adele-de-toulou | https://upload.wikimedia.org/wikipedia/commons/a/a5/Toulouse-Lautrec_-_Ad%C3%A8le_de_Toulouse-Lautrec.jpg | no SOF in 64KB window |
| henri-edmond-cross-untitled | https://upload.wikimedia.org/wikipedia/commons/6/69/Douai_%28Nord%29_-_Mus%C3%A9e_de_la_Chartreuse_-_%22Le_four_des_Maures%22_%28Henri-Edmond_Cross%2C_1856-1910%29.jpg | no SOF in 64KB window |
| henry-moore-falling-warrior | https://upload.wikimedia.org/wikipedia/commons/1/13/Falling_Warrior.jpg | no SOF in 64KB window |
| jean-leon-gerome-les-mouettes | https://upload.wikimedia.org/wikipedia/commons/5/5d/Les_mouettes_gerome_vesoul.jpg | no SOF in 64KB window |
| vertumnus-and-pomona | https://upload.wikimedia.org/wikipedia/commons/b/ba/Vertumne_et_Pomone_par_Camille_Claudel%2C_Paris.jpg | no SOF in 64KB window |
| vincent-van-gogh-auvers-sous-la-pluie | https://upload.wikimedia.org/wikipedia/commons/f/fd/Amgueddfa_Cymru_-_Glaw%2C_Auvers_-_Rain%2C_Auvers_-_2470.jpeg | no SOF in 64KB window |

## (f) holder mismatches (REPORT ONLY — holders not changed)

| id | src | art_holders.js says | src implies |
| --- | --- | --- | --- |
| claude-monet-charing-cross-bridge-fog | harvard | Art Gallery of Ontario | harvard-art |
| the-sower | kroller-muller | Van Gogh Museum | Kröller-Müller Museum |
| the-rhinoceros | nga | British Museum | National Gallery of Art |
| nemesis | nga | Staatliche Kunsthalle Karlsruhe | National Gallery of Art |
| still-life-with-gingerpot-2 | gugg | Kunstmuseum Den Haag | Solomon R. Guggenheim Museum |
| durer-saint-michael-fighting-the-dragon | nga | Q64946756 | National Gallery of Art |
| durer-the-triumphal-arch-of-maximilian | nga | Germanisches Nationalmuseum | National Gallery of Art |
| goya-the-marquesa-de-pontejos | nga | Q46596638 | National Gallery of Art |
| sargent-margaret-stuyvesant-rutherfurd-white-mrs-henry-white | nga | Corcoran Gallery of Art | National Gallery of Art |
| jean-baptiste-camille-corot-the-repose | nga | Corcoran Gallery of Art | National Gallery of Art |
| jean-baptiste-camille-corot-the-moored-boatman-souvenir-of-an-italian-lake | nga | Corcoran Gallery of Art | National Gallery of Art |
| anthony-van-dyck-maddalena-cattaneo | nga | Q62101859 | National Gallery of Art |
