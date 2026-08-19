const fs = require('fs');
const Babel = require('@babel/standalone');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
try {
  Babel.transform(src, { presets: ['react'], filename: file });
  console.log('COMPILE OK:', file);
} catch (e) {
  console.error('COMPILE FAIL:', e.message);
  process.exit(1);
}
