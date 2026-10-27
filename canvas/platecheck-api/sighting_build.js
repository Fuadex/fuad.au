// replate3/sighting_build.js — owner-sighting sentences ("you saw it at …") found store-wide 2026-10-27.
// Each keeps the holder / observation and drops the sighting. Field located automatically; old must occur once.
const fs = require('fs');
const C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const g = {}; new Function('window', fs.readFileSync(C + 'art_inspect.js', 'utf8'))(g); const I = g.CANVAS_INSPECT;
const a = {}; new Function('window', fs.readFileSync(C + 'art-about.js', 'utf8'))(a); const A = Object.values(a)[0];
const R = [
 ['knud-baade-the-wreck', ' You saw it at South Kensington.', ''],
 ['rembrandt-jonge-vrouw-in-een-schilderijlijst', ' as ZKW/3906, where you saw it.', ' as ZKW/3906.'],
 ['chaim-soutine-untitled', ' centimetres, and you saw it there.', ' centimetres.'],
 ['andre-derain-untitled', 'now at the Musée de l\'Orangerie, where you saw it.', 'now at the Musée de l\'Orangerie.'],
 ['thomas-gainsborough-the-painter-s-daughters-with-a-cat', 'which is the state you met it in.', 'which is the state it remains in.'],
 ['georges-seurat-circus-sideshow-parade-de-cirque', 'It now hangs at the Metropolitan Museum in New York, where you saw it:', 'It belongs to the Metropolitan Museum in New York:'],
 ['gustav-klimt-portrait-of-hermine-gallia', 'the National Gallery in London, where you found it, while', 'the National Gallery in London, while'],
 ['julian-fa-at-powrot-z-polowania-na-niedzwiedzia', 'You saw this at the National Museum in Warsaw, where the sheer wall-size', 'It belongs to the National Museum in Warsaw, and the sheer wall-size'],
 ['unknown-marine-with-rocks', 'You met it at the Musée d\'Orsay:', 'It belongs to the Musée d\'Orsay:'],
 ['vincent-van-gogh-korenveld-met-cipressen', 'This particular canvas now hangs in the National Gallery in London, and you saw it there.', 'This particular canvas belongs to the National Gallery in London.'],
 ['claude-monet-la-femme-a-l-ombrelle', 'now hangs at the Musée d\'Orsay, where you saw it —', 'belongs to the Musée d\'Orsay —'],
 ['claude-monet-bouquet-of-sunflowers', 'You saw this at the Met in New York, where it hangs among his other still lifes.', 'The Met in New York holds it among his other still lifes.'],
 ['claude-monet-ile-aux-orties-near-vernon', 'You saw this at the Met, and in detail it stops', 'In detail it stops'],
 ['lovis-corinth-blumen-und-tochter-wilhelmine', 'It hangs at the Kunstmuseum Basel, where you saw it.', 'It belongs to the Kunstmuseum Basel.'],
 ['unknown-mask-of-fear', 'You saw this at MoMA in New York, where it entered a collection that prized', 'It entered MoMA\'s collection in New York, which prized'],
 ['edgar-degas-the-artist-s-cousin-probably-mrs-william-bell-ma', 'If you saw this pastel at the Metropolitan Museum of Art, this floating second face is what you carry away:', 'This floating second face is what stays:'],
 ['la-mort-de-barbara-radziwi-by-jozef-simmler', 'You saw it at the National Museum in Warsaw.', 'It belongs to the National Museum in Warsaw.'],
 ['storks', 'You saw it at the National Museum in Warsaw.', 'It belongs to the National Museum in Warsaw.'],
 ['the-emperor-napoleon-in-his-study-at-the-tuileries', 'through the Kress collection, where you saw it.', 'through the Kress collection.'],
 ['the-gleaners', 'now hangs in the Musée d\'Orsay, where you saw it —', 'now belongs to the Musée d\'Orsay —'],
 ['peter-paul-rubens-der-hollensturz-der-verdammten', 'You saw it in the Alte Pinakothek, the Bavarian State Painting Collections in Munich, and it floored you — the correct response to a wall of falling humanity nearly three metres tall.', 'It belongs to the Alte Pinakothek, the Bavarian State Painting Collections in Munich: a wall of falling humanity nearly three metres tall.'],
 ['arshile-gorky-diary-of-a-seducer', 'You saw it at MoMA, and it floored you — which, for a grey painting that refuses to explain itself, is the point worth trusting.', 'It belongs to MoMA: a grey painting that refuses to explain itself and still lands hard, which is the point worth trusting.'],
 ['the-birth-of-venus', 'You saw it at the Orsay and it floored you — which is the honest reaction the century of dismissal tried to argue you out of, and the picture is built precisely to produce it.', 'It belongs to the Orsay, and the strong reaction it provokes is the honest one, the reaction a century of dismissal tried to argue viewers out of; the picture is built precisely to produce it.'],
 ['fjaestad-wood-pattern', 'You saw this at the Swedish Masters of Art exhibition at the Tokyo Metropolitan Art Museum, and the thing that stopped you is exactly this:', 'The thing that stops the eye is exactly this:'],
 ['fjaestad-wood-pattern', 'You saw it at the Swedish Masters show in Tokyo, and the jolt is the one it engineers:', 'The jolt is the one it engineers:'],
 ['podkowinski-szal-uniesien', 'You likely saw it in the Sukiennice\'s quiet salon of 19th-century Polish art, where it still radiates', 'It belongs to the Sukiennice\'s gallery of 19th-century Polish art in Kraków, and it still radiates'],
];
const out = [];
for (const [id, old, nw] of R) {
  const e = I[id] || {}, ab = A[id] || {}; const fields = { 'tour.see': e.see, 'tour.about': e.about, 'tour.craft': e.craft, 'tour.context': e.context, beside: e.beside, about: ab.about, deep: ab.deep };
  (e.deeper || []).forEach((d, i) => { fields[`tour.deeper[${i}].body`] = d.body; });
  const hit = Object.entries(fields).filter(([k, s]) => typeof s === 'string' && s.split(old).length === 2);
  if (hit.length !== 1) { console.log('NOT FOUND/AMBIG', id, hit.length, old.slice(0, 50)); continue; }
  out.push({ id, field: hit[0][0], old, new: nw, note: 'sighting sweep 2026-10-27: owner-sighting line ("you saw it at …") removed; holder kept' });
}
fs.writeFileSync(__dirname + '/sighting_sweep.json', JSON.stringify(out, null, 1)); console.log(out.length, 'entries');
