"""fetch-models.py - pulls the two models of record into the untracked scratch cache.

Weights are disposable; this script is what is tracked. HF_HOME is set by
setup-mlenv.ps1 to <sptmp>/models so nothing lands in the user profile or the repo.

  Qwen/Qwen2.5-7B-Instruct                                    the scorer (4-bit nf4 at load)
  sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 the themes embedder

Both names are load-bearing: changing either changes the scores and is the owner's call,
not a maintenance decision (MOOD_PIPELINE.md 1, and the themes anchor space).
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

SCORER = "Qwen/Qwen2.5-7B-Instruct"
EMBEDDER = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def main():
    from huggingface_hub import snapshot_download

    print("HF_HOME:", os.environ.get("HF_HOME", "(default)"))

    which = sys.argv[1] if len(sys.argv) > 1 else "all"

    if which in ("all", "scorer"):
        print(f"\ndownloading {SCORER} ...", flush=True)
        p = snapshot_download(
            SCORER,
            allow_patterns=["*.json", "*.safetensors", "*.txt", "*.py", "*.model"],
        )
        print("scorer at:", p)

    if which in ("all", "embedder"):
        print(f"\ndownloading {EMBEDDER} ...", flush=True)
        p = snapshot_download(EMBEDDER)
        print("embedder at:", p)

    print("\nmodels ready")


if __name__ == "__main__":
    main()
