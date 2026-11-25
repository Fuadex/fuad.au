// sem-wordpiece.js — the in-house BERT WordPiece tokenizer for Themes-mode semantic search
// (contract: .sptmp/searchbar/CONTRACT.md, ruled 2026-11-26).
//
// It must reproduce, id for id, what HuggingFace `tokenizers` does with the Xenova
// all-MiniLM-L6-v2 tokenizer.json (BertNormalizer + BertPreTokenizer + WordPiece + the
// [CLS] … [SEP] template), because the build side embeds the reads with that tokenizer and a
// query tokenized differently lands somewhere else in the vector space. Parity is checked by
// rotation/tools/sem-token-check.js against tools/sem-token-fixture.json (python-produced).
//
// The steps, in the order the Rust implementation applies them:
//   1. clean_text      drop U+0000, U+FFFD and every "other" char (Unicode C*) except \t \n \r;
//                      every whitespace char becomes a plain space.
//   2. chinese chars   pad each CJK ideograph with spaces so it stands alone.
//   3. strip accents   NFD, then drop non-spacing marks (Mn) — strip_accents is null in the
//                      tokenizer.json, which means "follow lowercase", and lowercase is true.
//   4. lowercase       per code point (Rust char::to_lowercase — no final-sigma context rule,
//                      which String#toLowerCase on a whole string WOULD apply).
//   5. pre-tokenize    split on whitespace; every punctuation char is its own word.
//   6. WordPiece       greedy longest-match-first, "##" continuation prefix; a word longer than
//                      max_input_chars_per_word (100) or with an unmatchable piece is one [UNK].
//   7. template        [CLS] … [SEP], truncated so the whole sequence is ≤ 256 ids.
//
// Pure: tokenize(text, vocab, opts) → number[]. No DOM, no globals read. Works as a plain
// browser script (window.SEM_WORDPIECE) and as a node module (require) for the parity check.
(function (root) {
  "use strict";

  var RE_OTHER = /\p{C}/u;                       // Cc Cf Cs Co Cn — Rust's char::is_other
  var RE_WS = /\s/u;
  var RE_MN = /\p{Mn}/u;
  // BERT punctuation = ASCII punctuation (33–47, 58–64, 91–96, 123–126) OR any Unicode P*.
  var RE_PUNCT = /[!-\/:-@\[-`{-~]|\p{P}/u;

  function isWhitespace(c) { return c === " " || c === "\t" || c === "\n" || c === "\r" || RE_WS.test(c); }
  function isControl(c) { if (c === "\t" || c === "\n" || c === "\r") return false; return RE_OTHER.test(c); }
  function isChinese(cp) {
    return (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF) ||
      (cp >= 0x20000 && cp <= 0x2A6DF) || (cp >= 0x2A700 && cp <= 0x2B73F) ||
      (cp >= 0x2B740 && cp <= 0x2B81F) || (cp >= 0x2B920 && cp <= 0x2CEAF) ||
      (cp >= 0xF900 && cp <= 0xFAFF) || (cp >= 0x2F800 && cp <= 0x2FA1F);
  }

  function normalize(text) {
    var out = "";
    for (var ch of String(text == null ? "" : text)) {          // for…of walks code points
      var cp = ch.codePointAt(0);
      if (cp === 0 || cp === 0xFFFD || isControl(ch)) continue;
      if (isWhitespace(ch)) { out += " "; continue; }
      if (isChinese(cp)) { out += " " + ch + " "; continue; }
      out += ch;
    }
    var stripped = "";
    for (var c2 of out.normalize("NFD")) if (!RE_MN.test(c2)) stripped += c2;
    var lower = "";
    for (var c3 of stripped) lower += c3.toLowerCase();
    return lower;
  }

  function preTokenize(norm) {
    var words = [], cur = "";
    for (var ch of norm) {
      if (isWhitespace(ch)) { if (cur) { words.push(cur); cur = ""; } continue; }
      if (RE_PUNCT.test(ch)) { if (cur) { words.push(cur); cur = ""; } words.push(ch); continue; }
      cur += ch;
    }
    if (cur) words.push(cur);
    return words;
  }

  function wordPiece(word, vocab, unkId, maxChars, out) {
    var chars = Array.from(word);
    if (chars.length > maxChars) { out.push(unkId); return; }
    var pieces = [], start = 0;
    while (start < chars.length) {
      var end = chars.length, found = -1;
      while (start < end) {
        var sub = chars.slice(start, end).join("");
        if (start > 0) sub = "##" + sub;
        if (Object.prototype.hasOwnProperty.call(vocab, sub)) { found = vocab[sub]; break; }
        end--;
      }
      if (found < 0) { out.push(unkId); return; }   // one unmatchable piece → the whole word is [UNK]
      pieces.push(found);
      start = end;
    }
    for (var i = 0; i < pieces.length; i++) out.push(pieces[i]);
  }

  // tokenize(text, vocabFile, opts?) → ids. `vocabFile` is the sem-vocab.json shape
  // { vocab:{token:id}, unk, cls, sep, maxInputCharsPerWord? } or a bare {token:id} map.
  // opts.maxLen (default 256) counts [CLS] and [SEP].
  function tokenize(text, vocabFile, opts) {
    var V = vocabFile && vocabFile.vocab ? vocabFile.vocab : vocabFile;
    var unk = V[(vocabFile && vocabFile.unk) || "[UNK]"];
    var cls = V[(vocabFile && vocabFile.cls) || "[CLS]"];
    var sep = V[(vocabFile && vocabFile.sep) || "[SEP]"];
    // per-WORD char cap = tokenizer.json's model.max_input_chars_per_word (100). sem-vocab.json
    // carries it as `maxInputChars` (the contract's draft said 512; the shipped file says 100,
    // which is the tokenizer's real value — a word over it becomes one [UNK]).
    var maxChars = (vocabFile && (vocabFile.maxInputCharsPerWord || vocabFile.maxInputChars)) || 100;
    var maxLen = (opts && opts.maxLen) || 256;
    var ids = [];
    var words = preTokenize(normalize(text));
    for (var i = 0; i < words.length && ids.length < maxLen - 2; i++) wordPiece(words[i], V, unk, maxChars, ids);
    if (ids.length > maxLen - 2) ids.length = maxLen - 2;
    return [cls].concat(ids, [sep]);
  }

  var api = { tokenize: tokenize, normalize: normalize, preTokenize: preTokenize };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SEM_WORDPIECE = api;
})(typeof window !== "undefined" ? window : null);
