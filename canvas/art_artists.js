// art_artists.js — short artist reads, shown under the compressed header on #/artist/<id>.
// Written and QC'd per READS_SPEC.md §10: how the work is made → why it is made that way → a
// hook that reframes, with an optional collection tie-back only where the link is real.
//
// EVERY claim here went through the §10 fact-check loop (swarm → own pass → repeat until stable).
// That loop overturned four of its own corrections along the way, so if you edit a line, re-verify
// it — including any correction you are tempted to make from memory.
window.CANVAS_ARTISTS = {

"monet": "Painted the same haystack, façade and pond over and over because the subject was never the point; the envelope was, the air and light between eye and object. Worked fast and outdoors, and let broken colour do the mixing on your retina rather than on the palette. Cataracts took hold in his seventies and pushed his sight — and his canvases — towards yellow and brown; the 1923 operation stripped that filter away and the blues came flooding back.",

"turner": "Spent fifty years dissolving solid things into weather, until a critic could report his paintings dismissed as “pictures of nothing”. Ships, sun and storm all become the same suspended light. He left his finished paintings to the nation on condition a gallery be built to house them — a condition met only in 1987, which is why so many of yours are at Tate Britain.",

"rembrandt": "Painted his own face across forty years, in some forty pictures and thirty-odd etchings, as a working record of what age does to a head. Late on he laid paint thick enough to catch raking light, so the surface itself does the modelling. He was bankrupt by 1656 and painting better afterwards.",

"vermeer": "Left barely more than thirty paintings. Nearly all are one room, one window, light from the left, a woman absorbed in something small — and the stillness is engineered, not observed. The odd pinpoint highlights have convinced many that he worked with a camera obscura, though the question has never closed. He died in debt and was essentially forgotten for two centuries.",

"seurat": "Tried to put painting on a scientific footing: separate dots of unmixed colour left for the eye to combine, on the theory that optical mixing stays brighter than mixing on a palette. The theory was wrong — it borrows the physics of light for the physics of paint — and the paintings are extraordinary anyway. He died at thirty-one.",

"johan-christian-dahl": "Founded Norwegian landscape painting largely by refusing to idealise it, and painted skies from life as working studies — the same impulse that had Constable annotating clouds over Hampstead at the same moment. Eight of your fifteen are drawings rather than finished canvases.",

"sergel": "His public commissions are cool neoclassical marble; his private drawings are fast, frank and often erotic, made to be passed around among friends. The Passionate Couple is entirely that second Sergel — which is presumably why it is the one you live with.",

"knud-baade": "Painted almost nothing but moonlight: wrecks, cliffs and coastal night under a single cold silver source, over and over. He trained under Johan Christian Dahl in Dresden — so the two Norwegians in your collection are teacher and student.",

"van-gogh": "Painted fast and loaded, laying colour on in ropes and slabs so the brushstroke is the subject as much as the wheatfield is. He turned to it seriously only at twenty-seven and had about a decade in all. Wrote some 820 letters explaining exactly what he was trying to do, and almost everything you would recognise came out of the final two years.",

"renoir": "Trained as a porcelain painter, and it shows in the dissolved, flattering edges — flesh handled as light rather than anatomy. Alone among the Impressionists he kept faith with pleasure as a legitimate subject. Rheumatoid arthritis deformed his hands from around fifty and he painted on, the brush placed into them.",

"manet": "Painted with brutal tonal shorthand — mid-tones dropped, figures flattened against the ground like playing cards — which is why contemporaries thought he could not finish a picture. He never showed in any of the eight Impressionist exhibitions, despite inventing much of what they used.",

"cezanne": "Built form from patches of colour laid side by side rather than modelled with light and shade, so a mountain and a tablecloth get the same architectural treatment. After roughly 115 sittings for Vollard's portrait he declared himself “not altogether displeased with the shirt-front” and abandoned it. Painted Mont Sainte-Victoire more than eighty times, and everything Cubism did afterwards starts here.",

"courbet": "Insisted on painting only what he could see, at a scale previously reserved for gods and generals — a village funeral given a canvas ten feet high and twenty-two wide. Often worked with a palette knife, which gives the surface its trowelled, unglamorous grain. He was jailed after the Commune and died in exile in Switzerland.",

"pissarro": "The only painter to exhibit in all eight Impressionist shows, and the one the others went to for advice — Cézanne and Gauguin both learned from him. An anarchist by conviction who painted peasants working rather than posed, and who in his mid-fifties took up Seurat's dot method before abandoning it.",

"degas": "Called himself a realist, not an Impressionist, and almost never painted outdoors — the dancers are studio constructions, built from memory and repetition. Cropped figures at the frame like a snapshot decades before that was a visual language. He worked increasingly in pastel as his sight failed.",

"kandinsky": "Trained as a lawyer, turned to painting at thirty, then spent his life removing the subject from it — arguing that colour and line could work on you directly, the way music does, without depicting anything. He may have had synaesthesia; he certainly wrote as though hearing colour were ordinary.",

"klimt": "Gold leaf laid flat against faces painted with academic realism, so the ornament and the person sit in different worlds on the same panel. He took the gold from Byzantine mosaics he saw in Ravenna in 1903. His university ceiling paintings were attacked as pornographic; he bought them back and kept them, and they burned with Schloss Immendorf in 1945.",

"zorn": "Made his name in watercolour and spent his career chasing water and skin — reflected light on both. Famous for the Zorn palette: four pigments and no more. He portrayed three American presidents, painting Cleveland and Taft and etching Roosevelt, then went home to Mora and painted midsummer.",

"rodin": "Modelled surfaces deliberately rough so light breaks across them and the bronze never settles into stillness. The Age of Bronze was so convincing that he was accused of casting it from a live model, and had to be publicly defended. He worked in fragments — a hand, a torso — and treated the incomplete thing as finished, which is most of modern sculpture's inheritance.",

"matisse": "Chased colour released from description: a face can be green if the composition needs green. The critic who called the group fauves — wild beasts — meant it as an insult. After surgery for duodenal cancer in 1941 left him unable to stand at an easel, he cut painted paper with scissors instead and called it drawing with colour.",

"odilon-redon": "Spent two decades working almost entirely in black — charcoal and lithograph, floating eyes and spiders, which he called his noirs. Then at fifty he turned to pastel and oil and the palette went luminous. The pivot is one of the most complete in the period.",

"morisot": "Painted with an open, unfinished-looking touch, and a critic asked in 1880 why, with this talent, she would not “take the trouble to finish”. She showed in seven of the eight Impressionist exhibitions, missing only 1879, having just given birth. Barred as a bourgeois woman from the cafés where the movement argued itself into being, so the arguing happened in her drawing room instead.",

"mondrian": "Arrived at the grid slowly, through a dozen years of trees and piers reduced step by step until only vertical, horizontal and primaries remained. It was a spiritual programme, not a design one — he had joined the Theosophical Society in 1908 and believed those elements were universal. He broke with Theo van Doesburg over the use of diagonals.",

"giovanni-boldini": "Painted society portraits at a speed that looks like showing off, with long whipping brushstrokes that stretch a figure past anatomy into pure momentum. Silk in particular is done in strokes you can count. Enormously fashionable in Belle Époque Paris, and dismissed afterwards for exactly the qualities that made him fashionable.",

"constable": "Painted a small stretch of Suffolk over and over on the grounds that he knew it, and made full-size oil sketches before the final canvases, so the study is often livelier than the picture. Obsessed with weather; he annotated cloud studies with the date, time and wind direction. Sold better in France than at home.",

"stanis-aw-ignacy-witkiewicz": "Ran a portrait firm with a printed price list and formal types, some executed under alcohol or drugs with the substance noted on the work beside the signature. Mostly pastel, which suited the speed. A playwright and philosopher who treated painting as the commercial arm, and who took his own life the day after the Soviet invasion in September 1939.",

"jean-baptiste-camille-corot": "The hinge between classical landscape and Impressionism: silvery, tonal, painted outdoors when that was still unusual. Notoriously generous — he signed work by struggling friends so it would sell, which is a large part of why he is among the most forged painters in existence.",

"unknown": "Not an artist but a gap: works whose maker is unrecorded. Anonymity here usually means the object outlived its attribution — workshop pieces, antiquities, things catalogued by what they are rather than who made them.",

"vinci": "Painted very little and finished less, because a picture was a research problem and research does not conclude. Built form through sfumato — smoke — laying glazes so thin the transitions have no edge at all, which is why the Mona Lisa's expression will not hold still. He kept her for some sixteen years and was still adjusting her at the end.",

"rubens": "Ran a studio like a business, with specialists for animals, drapery and landscape, and priced canvases by how much of the surface was his own hand — he set it out in writing to a buyer in 1618. Painted flesh in transparent layers over a warm ground so bodies look lit from within. Also a working diplomat, knighted by both Spain and England, who helped negotiate peace between them.",

"hopper": "Built pictures out of raking light and empty architecture, then put one or two figures in them who are not talking. The mood is engineered by geometry rather than expression — you can cover the faces and lose nothing. His wife Josephine modelled every woman he painted after their marriage, and kept the ledgers that catalogue the work.",

"caillebotte": "Painted with a plunging, photographic perspective — wet boulevards seen from above, floor-scrapers foreshortened along the boards — which looked cold beside Renoir's warmth. Rich enough never to need sales, he bought his friends' work instead. France accepted forty of the sixty-seven he left it and refused the rest as filth; the forty are the core of the Musée d'Orsay.",

"signac": "Took Seurat's dot and enlarged it into a mosaic tile, so the later canvases read as bright blocks rather than stipple. A serious sailor who owned thirty-two boats over his life and painted harbours the way someone paints their own street. Kept Neo-Impressionism going for forty-four years after Seurat died at thirty-one.",

"marc": "Assigned colours fixed meanings — blue the male principle, spiritual and severe; yellow the female, gentle and sensual; red brute matter — and then painted animals, believing they saw the world more purely than people. Killed near Verdun in March 1916, aged thirty-six.",

"umberto-boccioni": "Tried to paint motion itself rather than a thing that moves, dissolving figures into force-lines so the crowd and the air it displaces become one event. The Futurists loved speed and machines; he died in 1916 when his horse bolted at a passing lorry during cavalry exercises and threw him.",

"sisley": "The most consistent of the Impressionists and the least varied — skies, water, snow, the same modest French villages, painted for forty years without a stylistic swerve. Born in Paris to English parents, he was ruined when the family silk business collapsed in 1870, and died poor four months before his prices multiplied at auction.",

"pierre-bonnard": "Painted from memory and small notes rather than the motif — he said the presence of the object was cramping — which is why interiors glow at temperatures no room actually holds. Marthe, his companion for nearly fifty years, appears in the bath again and again. He was known to slip into museums with a small brush and retouch his own hanging pictures while the guards moved on.",

"chaim-soutine": "Attacked the canvas — buildings lean, faces twist, everything is in a wind that is not there. Hauled a beef carcass up to his studio and painted it as it rotted, fetching buckets of blood from the slaughterhouse to keep the colour alive, until the neighbours complained and the police came.",

"lovis-corinth": "Painted with a heavy, confident naturalism until a stroke in 1911, after which the touch went loose and urgent — and the late work is what he is remembered for. Whether that change was the illness or a turn toward Expressionism he was already making is still argued.",

"matejko": "Painted enormous set-piece scenes from Polish history at a moment when Poland did not exist on any map, which makes the canvases arguments as much as pictures. Crowded, meticulously costumed, deliberately legible. He taught Wyspiański and Mehoffer, so a generation of Polish modernism came out of his classroom.",

"podkowinski": "Began as a competent Impressionist and then made one enormous symbolist scandal, Frenzy of Exultations — a naked woman on a black horse — which drew crowds until he took a knife to it himself at the exhibition in April 1894. He died the following January at twenty-eight, and the picture survives because it was repaired.",

"che-monski": "Painted the Polish countryside at eye level and full speed — horse teams coming straight at the viewer, mud, weather, no ennobling distance. Made his name in Paris selling exactly that, then returned in 1889 to a village outside Warsaw and farmed.",

"jan-ciaglinski": "A Warsaw-born painter who spent his career in St Petersburg and travelled compulsively — India, Egypt, Palestine, Spain, Morocco — painting small, fast, bright studies on the road rather than finished salon pictures. The looseness was deliberate, and closer to Impressionism than anything around him at the Academy.",

"boudin": "Painted beaches and skies outdoors decades before that was normal, and pushed the teenage Monet into doing the same. Monet was still saying it in old age: “I owe everything to Boudin.” Corot called him the king of skies, and two thirds of a typical Boudin is cloud.",

"charles-francois-daubigny": "Fitted out a studio boat, Le Botin, and painted rivers from the water, which is why the bank is so often at eye level and slightly too close. Attacked for exhibiting what critics called mere impressions, years before the word became a movement. As a Salon juror he pushed the young Impressionists through, and resigned in 1870 when Monet was rejected.",

"narcisse-virgilio-diaz": "A Barbizon painter of forest interiors, working in thick, jewel-dark paint with light breaking through the canopy in patches. He lost a leg in childhood and walked on a wooden one. He gave the young Renoir encouragement and free paint.",

"adolphe-joseph-thomas-monticelli": "Loaded paint so thickly that figures dissolve into encrusted colour, closer to enamel than to painting — dismissed in his lifetime as a decorative eccentric. Van Gogh saw the work in Paris, decided he was a serious ancestor, and wrote to Theo that he was continuing it as if he were Monticelli's son or brother.",

"edouard-vuillard": "Painted small domestic interiors in which pattern eats people — wallpaper, dress fabric and upholstery given the same weight as a face, so figures half-disappear into the room. A Nabi, working on cardboard in muffled distemper. He lived with his mother, who ran a corset and dressmaking business, until her death when he was sixty; her workroom is most of the subject.",

};
