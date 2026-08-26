// hunt-encoder.js — the semantic hunt's query encoder (Model2Vec potion-base-8M port).
// WordPiece (Bert lowercase) → int8 token-table lookup → mean-pool → L2 normalize.
// Pure functions over pre-fetched buffers; no fetching here (the app owns loading, which
// happens ONLY on search-bar intent per Fuad's ruling). Runs in browser AND node (parity
// tests drive the same file — see .dtmp/tourqc-pass/extraction/parity_hunt.js).
(function () {
  function buildVocab(tokens) {
    const map = new Map();
    for (let i = 0; i < tokens.length; i++) map.set(tokens[i], i);
    return map;
  }

  // BertNormalizer(lowercase) + BertPreTokenizer: lowercase, split on whitespace,
  // punctuation becomes its own token. Accents are KEPT (strip_accents:null + lowercase).
  function preTokenize(text) {
    const out = [];
    let cur = '';
    for (const ch of String(text).toLowerCase()) {
      if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = ''; } continue; }
      // Bert punctuation class: ASCII punct + general unicode punctuation
      if (/[!-\/:-@\[-`{-~]|[ -⁯⸀-⹿'’“”«»]/.test(ch)) {
        if (cur) { out.push(cur); cur = ''; }
        out.push(ch);
        continue;
      }
      cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }

  // greedy longest-match WordPiece; unknown words are SKIPPED (mean-pool is forgiving,
  // and a free-text hunt must not explode on a word the table lacks)
  function wordpiece(word, vocab, maxLen) {
    const pieces = [];
    let start = 0;
    while (start < word.length) {
      let end = Math.min(word.length, start + (maxLen || 100));
      let hit = -1;
      while (end > start) {
        const sub = (start > 0 ? '##' : '') + word.slice(start, end);
        const idx = vocab.get(sub);
        if (idx !== undefined) { hit = idx; break; }
        end--;
      }
      if (hit < 0) return [];     // whole word unknown → skip word
      pieces.push(hit);
      start = end;
    }
    return pieces;
  }

  // table: Int8Array (n×dims) · scales: Float32Array (n) → L2-normalized Float32Array(dims)
  function encode(text, vocab, table, scales, dims) {
    const ids = [];
    for (const w of preTokenize(text)) ids.push(...wordpiece(w, vocab));
    const v = new Float32Array(dims);
    if (!ids.length) return v;
    for (const id of ids) {
      const s = scales[id], off = id * dims;
      for (let d = 0; d < dims; d++) v[d] += table[off + d] * s;
    }
    let n = 0;
    for (let d = 0; d < dims; d++) { v[d] /= ids.length; n += v[d] * v[d]; }
    n = Math.sqrt(n) || 1;
    for (let d = 0; d < dims; d++) v[d] /= n;
    return v;
  }

  function cosineTop(q, workVecs, dims, k) {
    const n = workVecs.length / dims;
    const scored = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      const off = i * dims;
      for (let d = 0; d < dims; d++) s += q[d] * workVecs[off + d];
      scored[i] = [s, i];
    }
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, k);
  }

  const api = { buildVocab, preTokenize, wordpiece, encode, cosineTop };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.HUNT_ENCODER = api;
})();
