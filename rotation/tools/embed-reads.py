#!/usr/bin/env python
"""embed-reads.py -- semantic vectors for Themes-mode search (contract: .sptmp/searchbar/CONTRACT.md).

WORKSHOP step, never CI (python + onnxruntime). Run after every reads / themes-tells apply:

    python rotation/tools/embed-reads.py [--model <dir>] [--src <llm-about.js>] [--out <about dir>]

Embeds every llm-about.js entry that carries any read with the quantized MiniLM
(Xenova all-MiniLM-L6-v2, model_quantized.onnx -- the exact file the browser fetches), using
the embed recipe:

    (fable || opus || sonnet || haiku || web) + " " + means + " " + built + " " + themes.join(", ")

(missing fields skipped), truncated at 256 tokens, mean-pooled over the attention mask,
L2-normalized, then int8-quantized with ONE matrix-wide scale (= max |component|).

Writes (all three are COMMITTED: CI can never regenerate them; see rotation/.gitignore):
    rotation/about/sem-vecs.bin    raw int8, row-major n x 384
    rotation/about/sem-meta.js     window.ROTATION_SEM = {v,dims,scale,n,bin,keys}
    rotation/about/sem-vocab.json  WordPiece vocab for the client tokenizer (written if absent,
                                   or always with --vocab)

--model holds model_quantized.onnx + tokenizer.json. Default: <GitHub>/.dtmp/sem-model/
(NEVER committed). If missing, both files are downloaded from Hugging Face once.
"""
import argparse, hashlib, json, os, re, sys, time, urllib.request

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(HERE)
GH_ROOT = os.path.dirname(os.path.dirname(ROT))           # .../GitHub
DEFAULT_MODEL = os.path.join(GH_ROOT, ".dtmp", "sem-model")
HF = "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/"
UA = "fuad.au-embed-reads/1.0 (+https://fuad.au)"
MAX_TOKENS = 256
DIMS = 384
READ_TIERS = ("fable", "opus", "sonnet", "haiku", "web")


def load_about(path):
    src = open(path, encoding="utf-8").read().lstrip("﻿")
    start = src.index("{", src.index("ROTATION_LLM_ABOUT"))
    end = src.rindex("}")
    body = re.sub(r",\s*}\s*$", "}", src[start:end + 1])   # JS trailing comma before the close
    return json.loads(body)


def embed_text(e):
    """The contract's embed recipe. Returns None when the entry has no read."""
    best = next((e[t] for t in READ_TIERS if e.get(t)), None)
    if not best:
        return None
    parts = [best, e.get("means"), e.get("built")]
    th = e.get("themes")
    if isinstance(th, list) and th:
        parts.append(", ".join(str(x) for x in th))
    return " ".join(p for p in parts if p)


def ensure_model(d):
    os.makedirs(d, exist_ok=True)
    for f, url in (("model_quantized.onnx", HF + "onnx/model_quantized.onnx"),
                   ("tokenizer.json", HF + "tokenizer.json")):
        p = os.path.join(d, f)
        if os.path.exists(p):
            continue
        print(f"downloading {f} ...", flush=True)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req) as r, open(p + ".part", "wb") as w:
            w.write(r.read())
        os.replace(p + ".part", p)


def load_tokenizer(model_dir):
    tok = Tokenizer.from_file(os.path.join(model_dir, "tokenizer.json"))
    tok.no_padding()                                   # tokenizer.json ships Fixed-128 padding
    tok.enable_truncation(max_length=MAX_TOKENS)       # ...and 128 truncation; contract = 256
    return tok


class Embedder:
    def __init__(self, model_dir):
        self.tok = load_tokenizer(model_dir)
        so = ort.SessionOptions()
        self.sess = ort.InferenceSession(os.path.join(model_dir, "model_quantized.onnx"), so,
                                         providers=["CPUExecutionProvider"])
        self.inputs = {i.name for i in self.sess.get_inputs()}

    def __call__(self, texts):
        encs = self.tok.encode_batch(texts)
        maxlen = max(len(e.ids) for e in encs)
        ids = np.zeros((len(encs), maxlen), dtype=np.int64)
        att = np.zeros((len(encs), maxlen), dtype=np.int64)
        for i, e in enumerate(encs):
            ids[i, :len(e.ids)] = e.ids
            att[i, :len(e.ids)] = 1
        feed = {"input_ids": ids, "attention_mask": att}
        if "token_type_ids" in self.inputs:
            feed["token_type_ids"] = np.zeros_like(ids)
        out = self.sess.run(None, feed)[0]                 # last_hidden_state [b, L, 384]
        mask = att[:, :, None].astype(np.float32)
        vec = (out * mask).sum(1) / np.clip(mask.sum(1), 1e-9, None)
        return vec / np.clip(np.linalg.norm(vec, axis=1, keepdims=True), 1e-12, None)


def write_vocab(model_dir, out_dir):
    t = json.load(open(os.path.join(model_dir, "tokenizer.json"), encoding="utf-8"))
    m = t["model"]
    doc = {
        "vocab": m["vocab"],
        "unk": m.get("unk_token", "[UNK]"),
        "cls": "[CLS]",
        "sep": "[SEP]",
        # WordPiece's per-word cap: a whitespace/punct-split word longer than this becomes [UNK].
        # Taken from tokenizer.json (100 for this model) so the client reproduces python exactly.
        "maxInputChars": m.get("max_input_chars_per_word", 100),
    }
    p = os.path.join(out_dir, "sem-vocab.json")
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--src", default=os.path.join(ROT, "llm-about.js"))
    ap.add_argument("--out", default=os.path.join(ROT, "about"))
    ap.add_argument("--vocab", action="store_true", help="rewrite sem-vocab.json even if present")
    a = ap.parse_args()

    t0 = time.time()
    ensure_model(a.model)
    os.makedirs(a.out, exist_ok=True)

    about = load_about(a.src)
    keys, texts = [], []
    for k, e in about.items():
        txt = embed_text(e)
        if txt:
            keys.append(k)
            texts.append(txt)
    print(f"corpus: {len(keys)} of {len(about)} llm-about entries carry a read", flush=True)

    emb = Embedder(a.model)
    # ONE TEXT PER RUN, never batched: model_quantized.onnx uses DynamicQuantizeLinear, whose
    # activation scale is computed over the WHOLE input tensor — batch-mates and padding shift
    # every row's vector (measured 2026-11-26: batched-64 vs single cos mean 0.991, min 0.979).
    # Single, unpadded runs are deterministic (cos 0.9999998) and identical to how the browser
    # embeds a query. ~5 ms/text, so the full corpus is still a few minutes.
    vecs = np.zeros((len(texts), DIMS), dtype=np.float32)
    t1 = time.time()
    for i, txt in enumerate(texts):
        vecs[i] = emb([txt])[0]
        if i % 2000 == 0:
            print(f"  {i}/{len(texts)}  {time.time() - t1:.0f}s", flush=True)
    print(f"embedded {len(texts)} in {time.time() - t1:.1f}s", flush=True)

    scale = float(np.abs(vecs).max())
    q = np.clip(np.rint(vecs / scale * 127.0), -127, 127).astype(np.int8)
    bin_path = os.path.join(a.out, "sem-vecs.bin")
    raw = np.ascontiguousarray(q).tobytes()
    with open(bin_path, "wb") as f:
        f.write(raw)
    md5_8 = hashlib.md5(raw).hexdigest()[:8]

    meta = {"v": 1, "dims": DIMS, "scale": scale, "n": len(keys),
            "bin": f"sem-vecs.bin?v={md5_8}", "keys": keys}
    meta_path = os.path.join(a.out, "sem-meta.js")
    with open(meta_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("// GENERATED by tools/embed-reads.py -- do not edit. Semantic vectors for Themes search;\n"
                "// keys[i] = row i of sem-vecs.bin (int8, n x dims; float = q/127*scale, then L2-normalize).\n")
        f.write("window.ROTATION_SEM = " + json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + ";\n")

    vocab_path = os.path.join(a.out, "sem-vocab.json")
    if a.vocab or not os.path.exists(vocab_path):
        write_vocab(a.model, a.out)
        print("wrote sem-vocab.json", flush=True)

    print(f"sem-vecs.bin  : {len(raw):,} bytes ({len(keys)} x {DIMS}), scale={scale:.6f}, md5_8={md5_8}")
    print(f"sem-meta.js   : {os.path.getsize(meta_path):,} bytes")
    print(f"sem-vocab.json: {os.path.getsize(vocab_path):,} bytes")
    print(f"total {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
