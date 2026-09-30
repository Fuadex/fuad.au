// ingest-plates.js — add holder-image plate rows to art_hires.js for works that have none (flat images, one compact
// JSON line per row, the file's canonical format). Every image is FETCHED and its pixel size read from the JPEG/PNG
// header — no size is ever taken from a manifest or a page on trust (HIRES_SOURCING: echoed sizes lie).
// Input: a JSON array of { id, src, title, page, img?, dimu?, note? }.
//   dimu = a DigitaltMuseum object id (KODE and other Norwegian holders): the IIIF manifest names the media, and the
//          row's img becomes the holder's own max-size download (the same URL the object page offers).
// Refuses ids that already have a row or are not in the canon. Inserts after the `window.CANVAS_HIRES = {` anchor.
// Usage: node ingest-plates.js <plates.json>           DRY RUN (fetches + measures, prints rows)
//        node ingest-plates.js <plates.json> --write   writes art_hires.js
const fs = require("fs"), path = require("path");
const UA = "CanvasPlates/1.0 (https://fuad.au)";
const HIRES = path.join(__dirname, "art_hires.js"), ART = path.join(__dirname, "artworks.js");
const WRITE = process.argv.includes("--write");
const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const load = (f, k) => { global.window = {}; eval(fs.readFileSync(f, "utf8")); return window[k]; };
const H = load(HIRES, "CANVAS_HIRES"), A = load(ART, "CANVAS_ARTWORKS");
const canon = new Set(A.map(w => w.id));

function sizeOf(buf) {                       // JPEG SOFn or PNG IHDR
  if (buf[0] === 0x89 && buf[1] === 0x50) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
}
// Some holders (the British Museum's media host, 2026-10-01) serve an incomplete TLS chain that Node refuses and curl
// (which completes the chain from the OS store) accepts. Fall back to curl for the first 512 KB rather than ever
// disabling certificate checks.
function measureCurl(url) {
  const { execFileSync } = require("child_process");
  const buf = execFileSync("curl", ["-s", "-f", "-L", "-A", UA, "-r", "0-524287", url], { maxBuffer: 64 << 20 });
  const s = sizeOf(buf); if (!s) throw new Error("no size in header (curl)"); return s;
}
async function measure(url) {
  let r;
  try { r = await fetch(url, { headers: { "User-Agent": UA } }); }
  catch (err) { if (err.cause && /CERT|SIGNATURE|ISSUER/.test(err.cause.code || "")) return measureCurl(url); throw err; }
  if (!r.ok) throw new Error("HTTP " + r.status);
  const ct = r.headers.get("content-type") || "";
  if (!/image\//.test(ct)) throw new Error("not an image: " + ct);
  const reader = r.body.getReader(); let buf = Buffer.alloc(0);
  while (buf.length < 4 << 20) {             // headers sit early; stop reading as soon as the size is known
    const { done, value } = await reader.read(); if (done) break;
    buf = Buffer.concat([buf, Buffer.from(value)]);
    const s = sizeOf(buf); if (s) { reader.cancel().catch(() => {}); return s; }
  }
  const s = sizeOf(buf); if (!s) throw new Error("no size in header"); return s;
}
async function dimuMedia(dimu) {
  const r = await fetch(`https://ems.dimu.org/api/iiif/${dimu}/manifest.json`, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("manifest HTTP " + r.status);
  const m = await r.json(), c = m.sequences[0].canvases[0];
  return { dms: c.dms_id, by: c.label || null };
}
(async () => {
  const rows = [], problems = [];
  for (const e of input) {
    if (!canon.has(e.id)) { problems.push(`${e.id}: not in the canon`); continue; }
    if (H[e.id]) { problems.push(`${e.id}: already has a hires row`); continue; }
    try {
      let img = e.img, credit = null;
      if (!img && e.dimu) {
        const d = await dimuMedia(e.dimu);
        img = `https://ems.dimu.org/image/${d.dms}?dimension=max&quality=100&mediatype=image/jpg`;
        credit = d.by;
      }
      if (!img) throw new Error("no img and no dimu");
      const [w, h] = await measure(img);
      const row = { src: e.src, w, h, img, title: e.title, conf: "high" };
      if (e.page) row.page = e.page;
      row.note = e.note || ("Holder image" + (credit ? ` (photo ${credit})` : "") + `, measured ${w}x${h} at ingest ${new Date().toISOString().slice(0, 10)}.`);
      rows.push([e.id, row]);
      console.log(`  ok  ${e.id}  ${w}x${h}`);
    } catch (err) { problems.push(`${e.id}: ${err.message}`); }
    await new Promise(r => setTimeout(r, 250));
  }
  if (problems.length) console.log("\nPROBLEMS (" + problems.length + "):\n  " + problems.join("\n  "));
  console.log(`\n${rows.length} rows ready`);
  if (!WRITE) { console.log("DRY RUN — add --write to apply."); return; }
  let src = fs.readFileSync(HIRES, "utf8");
  const anchor = "window.CANVAS_HIRES = {\n";
  if (src.split(anchor).length !== 2) throw new Error("art_hires anchor not exactly once");
  src = src.replace(anchor, anchor + rows.map(([id, r]) => JSON.stringify(id) + ":" + JSON.stringify(r) + ",\n").join(""));
  global.window = {}; eval(src);
  if (Object.keys(window.CANVAS_HIRES).length !== Object.keys(H).length + rows.length) throw new Error("round-trip count mismatch");
  fs.writeFileSync(HIRES, src, "utf8");
  console.log(`wrote ${rows.length}; art_hires ${Object.keys(H).length} -> ${Object.keys(window.CANVAS_HIRES).length}`);
})();
