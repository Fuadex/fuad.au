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

// ── batch 3, 2026-08-20 ─────────────────────────────────────────────────────────────────

"bruno-liljefors": "Paints the animal into its ground rather than in front of it — scaled to the landscape instead of posed for you, with predation treated as ordinary weather rather than as drama. He hunted, climbed to eagle and osprey nests and watched from camouflaged blinds, and he kept foxes, badgers, owls and an eagle in an enclosure at home so he could study them alive.",

"emile-bernard": "Worked out flat unmodulated colour inside dark contours — cloisonnism, named for the metal strips in cloisonné enamel — with Louis Anquetin around 1887, when he was nineteen. He then spent the rest of his life arguing that Gauguin had taken the credit for what the two of them built at Pont-Aven; left France in 1893, turned against modern art entirely, and went back to Renaissance models. Nine of your ten are after 1900, so what you have is almost all the reactionary Bernard rather than the nineteen-year-old.",

"maximilien-luce": "Took the neo-impressionist dot — the period's most advanced way of painting light — and pointed it at navvies, foundries and building sites instead of at bathers and harbours. He was an anarchist, arrested in July 1894 in the round-up after President Carnot's assassination and tried among the thirty; he was acquitted, after forty-eight days in Mazas.",

"ivan-shishkin": "Painted forest interiors at species-level exactness — you can name the tree — and was a serious etcher besides, so bark and needle come out drawn rather than suggested. He was a founding Wanderer, taking Russian painting out of the academy and around the provinces, and the forest was what he thought deserved that precision. The bear cubs in his most famous picture were painted by someone else.",

"henri-jean-guillaume-martin": "Uses the divided touch of neo-impressionism but stretches the dot into a long hatched filament, in a high, pale, chalky key. The method is optical and the subjects are symbolist — muses, allegories, figures in a light that belongs to no particular hour — which is the unusual pairing. The state kept handing him enormous mural commissions anyway: the Sorbonne, the Conseil d'État, the Capitole at Toulouse.",

"theo-van-rysselberghe": "Converted to strict pointillism the moment he saw Seurat's Grande Jatte, and is one of the very few who then took the dot into portraiture rather than landscape — he went on preferring faces to scenery for the rest of his life. He was standing in front of that painting in 1886 with the poet Émile Verhaeren; he then helped Octave Maus choose who Les XX showed in Brussels, and Seurat was there the following year.",

"menzel": "Drew compulsively: one of his overcoats had eight pockets, each holding a sketchbook of a different size, and the paintings are built out of that forensic looking rather than out of studio convention. He was an empiricist among history painters. For the rolling mill he went to an ironworks in Upper Silesia in 1872 and spent weeks making hundreds of studies on the factory floor.",

"millais": "Pre-Raphaelite method meant painting into a wet white ground with small brushes, so the colour stays jewelled and everything holds focus at once — foreground weed as sharp as a face. He then became a society portraitist and President of the Royal Academy, which the movement read as desertion, and your five straddle both halves. His Ophelia model lay in a bath warmed by lamps underneath; the lamps went out, she fell ill, and her father made him pay the doctor's bills.",

"tissot": "Renders contemporary dress with a fashion plate's precision and then leaves the story unresolved, so the whole reading hangs on a glance or a turned shoulder. Kathleen Newton, who had been living with him in London, died in 1882 and he was back in Paris within the week. His later career went into illustrating the Bible, with long research journeys to the Holy Land — two of your five come from that second life.",

"petrus-van-der-velden": "Loads paint heavily in the dark tonal key of the Hague School, so the weather is in the handling before it is in the subject. He emigrated to New Zealand in 1890 and reached the Otira Gorge that January; it became the thing he returned to. Your five straddle the crossing — Dutch canal on one side, Canterbury rock on the other.",

"henri-le-sidaner": "Paints the table laid and nobody at it, in twilight or lamplight, with a touch soft enough to hold everything just short of focus; the absence is the subject. He rented a house at Gerberoy in 1901 and bought it in 1904, then built the terraced gardens up around it. He went further than his own walls: he got the villagers planting roses too, and founded a rose festival there in 1928 that is still held every June.",

"henri-fantin-latour": "Ran two practices at once: flower pieces of almost photographic sobriety, and smoky, dissolving lithographs on Wagner, Berlioz and Schumann. The flowers sold in Britain and stayed practically unknown in France in his lifetime, so his English reputation and his French one are for different work entirely. Your Schumann overture is the ambition; the pansies are the income.",

"hodler": "Built pictures on what he called Parallelism — figures and forms repeated and mirrored across the canvas, symmetry used as structure rather than as ornament — and reduced the late landscapes to flat horizontal bands. He thought repetition was how nature reveals its order, and said so in a lecture in 1897. Your symmetrical reflection on Lake Thun is that theory stated about as plainly as he ever stated it.",

"arshile-gorky": "Floats improvised line over thin stained washes so the drawing sits on top of the colour instead of containing it — the hinge between Surrealist automatism and what American painting did next. He was born Vosdanig Adoian and got out of the Armenian genocide as a child; his mother died of starvation in 1919. The name is invented, and he let people believe he was related to Maxim Gorky.",

"ivan-aivazovsky": "Painted the sea in the studio from memory, fast, glazing thin translucent layers so a wave crest reads as lit from behind rather than on its surface. He held that a storm cannot be painted in front of you, only recalled. He was official painter to the Russian Navy from 1844, and left something like six thousand works.",

"albert-lebourg": "Works light and rapid in a silvery tonal register on the Seine and the Rouen quays — an impressionist who stayed with atmosphere rather than crossing over into pure colour. He spent five years from 1872 teaching drawing in Algiers, and showed in the fourth and fifth Impressionist exhibitions, in 1879 and 1880. A stroke in September 1920 paralysed his left side, and he went on painting anyway.",

"george-frederic-watts": "Works dry, muted earth colour over a canvas he keeps returning to for years, so the surface reads as fresco or as memory rather than as paint. The symbolic pictures were meant to belong to one connected scheme he called the House of Life, in which every aspiration would get its symbol. He refused a baronetcy twice, and gave the major symbolic works to the nation rather than selling them.",

"cole": "Worked large studio canvases up from studies made on the spot in the Catskills, and founded the Hudson River School doing it. The serial pictures are moral arguments — empire, decline, the course of a life — landscape recruited to sermon. His patron died before the first Voyage of Life cycle was done and the heirs would not cooperate, so he painted all four again in Rome; the 1842 set is that second one, and it is the one you have.",

"makart": "Worked enormous, in deep bituminous reds and browns, staging figures as theatre — and the pigments were unstable, so much of it has darkened and cracked since. He was the impresario of Ringstrasse Vienna, where painting, costume and interior decoration arrived as one commission. He designed the 1879 imperial pageant, some fourteen thousand people, and rode at the head of it dressed as Rubens.",

"johan-jongkind": "Made the watercolours outdoors on the spot and built the oils up from them in the studio, keeping a broken, nervous touch that holds the weather of a particular hour. Monet met him at Le Havre in 1862 and said later that it was to him he owed the definitive education of his eye.",

// ── batch 4, 2026-08-20 ─────────────────────────────────────────────────────────────────

"eugene-jansson": "Painted Stockholm at night in almost nothing but blue: long swirling strokes, gaslight lying on the water, the city seen downhill from the Södermalm heights where he lived his whole life. In 1904 he stopped almost dead and gave the rest of his career to male nudes — bathers, sailors, the naval bathhouse. All three of yours sit on the blue side of that break.",

"jozef-pankiewicz": "Started as one of the first Polish impressionists, went through symbolist nocturnes in the 1890s, and came out the other side a colourist working in France, where Bonnard was a friend. He then led the students who formed the Paris Committee — the Kapiści — and took them to France with him, which is how French colour reached Polish painting wholesale. Your three land in three different decades, one from each of those lives.",

"georges-lemmen": "Took up Seurat's dot as a member of Les XX from 1888 and used it hardest in the early 1890s, on the Belgian coast. He later left it behind for intimist interiors and portraits much closer to Bonnard and Vuillard. He was a graphic designer as well — book covers, posters, and a typeface cut with Harry Kessler. All three of yours are 1891, the pointillist peak.",

"henry-brokmann": "Oil on canvas in wide horizontal formats, with haze built as close-toned graduated passages rather than by contrast. A Dane who trained in Copenhagen, reached the Académie Julian in 1886 and came out committed to a systematic study of light, which he then chased across Egypt, Syria, Brittany, the Italian lakes and Menton. Almost none of it was collected while he lived: his entire public presence dates from 1979, when his son gave fifty-one paintings and twenty-seven drawings to the Petit Palais, forty-six years after he died.",

"theo-van-doesburg": "Founded De Stijl, and was not born to the name — he was Christian Emil Marie Küpper. He ran a second identity alongside it: I. K. Bonset, who published Dada poetry in De Stijl while van Doesburg edited the magazine. In 1925 he brought in the diagonal, and it ended his friendship with Mondrian for good. Your three are 1904 and 1905 — night landscapes and a portrait, a decade before any of that, the painter before he had invented himself.",

"strindberg": "The playwright painted in thick impasto pushed about with a palette knife, in bursts, outside any exhibiting career. In 1894 he published an essay arguing for the role of chance in making art, and worked that way: letting the accident produce the image and finding the subject in it afterwards. That is automatism, proposed some thirty years before the Surrealists made a programme of it.",

"fjaestad": "Builds snow and hoar frost out of small contrasting touches worked into rhythmic, almost decorative surfaces, so a frozen river reads as pattern before it reads as place. He helped found the Rackstad colony near Arvika, an arts-and-crafts community, and designed furniture and weaving patterns alongside the painting. Bruno Liljefors hired him in 1893 as an assistant on the landscape panorama for the Biological Museum in Stockholm.",

"bouguereau": "Blends every transition out until the brushwork disappears and the surface reads as porcelain — the finish the Salon existed to reward, defended by the man who had most mastered it, and who worked to keep the Impressionists out of it. His reputation then collapsed so thoroughly after his death that the name became shorthand for kitsch and he was barely hung for most of the twentieth century, before a late rehabilitation. He also spent years pushing to get women admitted to art training.",

"hokusai": "Not a painting: a woodblock print, and the work of three pairs of hands — designer, block-cutter, printer — in a Prussian blue that had only lately become available as an import. It was one sheet of a commercial series aimed at a mass market. He used more than thirty artistic names across his life, and wrote at seventy-five that nothing he had made before seventy was worth counting.",

"henry-fuseli": "Foreshortens violently, pushes musculature past anatomy, and lights figures from below out of the surrounding dark. He painted Shakespeare, Milton and nightmares — literature rather than anything in front of him. He had been ordained a Zwinglian minister before he ever took up painting, and ended as Professor of Painting and Keeper at the Royal Academy.",

"witold-wojtkiewicz": "Mixes oil with tempera for a deliberately matte, chalky surface, and paints circuses, dolls, marionettes and children acting out adult griefs. André Gide saw the work in Berlin in 1906, arranged him a one-man show at Galerie Druet in Paris the next year and wrote the catalogue introduction. He had a congenital heart defect and was dead at twenty-nine, two years after that show.",

"thomas-alexander-harrison": "Works enormous and horizontal, in tonal fields with almost no incident — a strip of water and one gradient of light — and though he was known for painting outdoors, the big canvases were built in the studio from rapid sketches, because a moonrise will not hold still for a session. He came to it late: about five years as a draughtsman for the US Coast Survey, mapping shorelines, before he painted anything. Cecilia Beaux, who knew him, said his method had the quality of science, perhaps because he had been trained as an engineer.",

"alphonse-osbert": "Works in near-monochrome blue, with motionless hieratic figures set in twilight landscape and composed flat, like a frieze. The manner comes from Puvis de Chavannes and the intent from Symbolism — a picture meant to induce a state rather than report an event. He showed at the Salon de la Rose+Croix.",

"julian-ashton": "Watercolour with opaque white worked over the washes for the highlights rather than reserving bare paper, handled loose and fast on the spot. He had trained at the Académie Julian and brought the Barbizon habit of working outdoors to Sydney. He was a trustee of the Art Gallery of New South Wales for some fifty years and used it — the Streeton he bought for seventy pounds in 1890 was the first in any public collection — and the school he founded is the oldest still running in Australia.",

"michael-wutky": "Paints the eruption at night so the lava is the only light source, the ground kept dark, with tiny figures at the edge for scale. The pictures come out of studies made at the rim rather than out of studio invention, and were long held to be the most accurate images of an eruption anyone had before photography. He climbed to the crater during the great eruption of 1779 in the company of Sir William Hamilton, the British envoy who went up Vesuvius more than sixty times and published what he saw for the Royal Society.",

"teodor-axentowicz": "Worked mostly in pastel, and got melancholy out of a medium usually asked for charm — a society portraitist trained in Munich and then in Paris under Carolus-Duran. He gave the other half of his life to the Hutsuls of the Carpathians, painting their dances and rites with exactly the seriousness he gave his Parisian sitters. He founded an art school for women in Kraków in 1897 and became the Academy's rector in 1910.",

"hiromitsu-nakazawa": "Oil on canvas in the manner Kuroda Seiki brought back from Raphaël Collin's Paris studio: violet in the shadows in place of the browns the older Japanese school of Western-style painting used, and the figure set in a soft, light-filled atmosphere. He was a founding member of the Hakubakai, the society formed to push that lighter French palette — and the nude was still contested in Japan, Kuroda's own having drawn a police order a decade before. He was at the same time one of Meiji Japan's leading magazine illustrators, and was made an Imperial Household Artist in 1944.",

"pierre-isidore-bureau": "Nocturnes on the Oise in a near-monochrome range — dark ground, silvery reflected light, closer to seventeenth-century Dutch tonal painting than to broken colour. He was a pupil of Jules Dupré, and applied Barbizon's habit of direct observation to the one thing Barbizon rarely painted, which was night. He showed four pictures in the first Impressionist exhibition of 1874, one of them a moonlight on the banks of the Oise at L'Isle-Adam; and when the Société Anonyme that ran it was wound up he was one of the three artists, with Renoir and Sisley, who liquidated it.",

"valentin-serov": "Made sitters come back dozens of times, so a portrait that looks caught in one glance is in fact heavily built. He trained under Repin and then at the Academy, and wanted the freshness of a study to survive the labour of a finished picture. He watched the Bloody Sunday shootings of 1905 from the Academy's own windows, and resigned his membership over it.",

"ludwik-de-laveaux": "Painted Paris at night in a dark tonal key learned first in Kraków and then in Munich under Otto Seitz. He died of tuberculosis in Paris in 1894, aged twenty-five and poor. Wyspiański, who had studied alongside him, put him into Wesele as the Widmo — the ghost who comes back for Marysia, the girl from Bronowice he had really been engaged to before he left.",

};
