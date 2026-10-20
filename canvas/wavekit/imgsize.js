const fs = require('fs');
const f = process.argv[2];
const b = fs.readFileSync(f);
// minimal JPEG SOF parser
let i = 2;
while (i < b.length) {
  if (b[i] !== 0xFF) { i++; continue; }
  const marker = b[i+1];
  if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD9)) { i += 2; continue; }
  const len = b.readUInt16BE(i+2);
  if ((marker >= 0xC0 && marker <= 0xCF) && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
    const height = b.readUInt16BE(i+5);
    const width = b.readUInt16BE(i+7);
    console.log(width + 'x' + height);
    process.exit(0);
  }
  i += 2 + len;
}
console.log('not found');
