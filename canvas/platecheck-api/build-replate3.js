// replate2/build-replate3.js — remap stop boxes for works whose old plate is a GALLERY PHOTO of the framed work onto a
// faithful holder image (registration from reg3.py: old_frac = a + new_frac * s). Boxes clamped to the new image;
// a box that falls wholly outside the work collapses and is reported. Writes replate_<id>.json. Text is re-checked
// afterwards by the API checker on the new plate (platecheck12r).
const fs = require('fs');
const C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const REG = {
  'salvador-dali-the-great-masturbator': { corr: 0.866, a: 0.355, b: 0.2788, su: 0.28, sv: 0.2882 },
  'edgar-degas-woman-drying-herself': { corr: 0.936, a: 0.206, b: 0.3729, su: 0.587, sv: 0.4211 },
};
const o = {}; new Function('window', fs.readFileSync(C + 'art_inspect.js', 'utf8'))(o);
const r4 = v => Math.round(v * 10000) / 10000, cl = v => Math.min(1, Math.max(0, v));
for (const [id, g] of Object.entries(REG)) {
  const out = [];
  (o.CANVAS_INSPECT[id].deeper || []).forEach((s, i) => {
    if (s.x == null) return;
    const x0 = cl((s.x - g.a) / g.su), y0 = cl((s.y - g.b) / g.sv), x1 = cl((s.x + s.w - g.a) / g.su), y1 = cl((s.y + s.h - g.b) / g.sv);
    if (x1 - x0 < 0.03 || y1 - y0 < 0.03) console.log('WARN', id, 'stop', i + 1, 'box falls outside the work');
    out.push({ id, field: `tour.deeper[${i}].box`, old: { x: s.x, y: s.y, w: s.w, h: s.h }, new: { x: r4(x0), y: r4(y0), w: r4(x1 - x0), h: r4(y1 - y0) }, note: 'replate: remapped from a gallery photo of the framed work onto the holder image (registration ' + JSON.stringify(g) + ')' });
  });
  fs.writeFileSync(__dirname + `/replate_${id}.json`, JSON.stringify(out, null, 1));
  console.log(id, out.length, 'boxes');
}
