"""probe-mlenv.py — asserts the venv can actually run the pipeline of record.

Exits non-zero (and setup-mlenv.ps1 then refuses to go on) unless ALL of:
  · torch imports and reports a CUDA build
  · a CUDA device is visible with enough VRAM for a 4-bit 7B
  · bitsandbytes imports (the nf4 quantiser — no bnb means no 4-bit means
    a different model of record, which is not ours to substitute)
  · transformers imports and exposes BitsAndBytesConfig
  · sentence_transformers imports (themes side)

Prints nothing sensitive. No lyric ever touches this file.
"""
import sys

MIN_VRAM_GB = 7.0  # a 4-bit 7B + KV cache wants ~6 GB; 8 GB card, ~1 GB desktop overhead
fail = []


def line(ok, label, detail=""):
    print(f"  [{'ok' if ok else 'FAIL'}] {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        fail.append(label)


print("environment probe")

try:
    import torch
    line(True, "torch import", torch.__version__)
    cuda_build = torch.version.cuda is not None
    line(cuda_build, "torch is a CUDA build",
         f"torch.version.cuda={torch.version.cuda}" if cuda_build
         else "CPU-only wheel installed — reinstall from the cu126 index")
    avail = torch.cuda.is_available()
    line(avail, "CUDA device available")
    if avail:
        props = torch.cuda.get_device_properties(0)
        gb = props.total_memory / (1024 ** 3)
        line(gb >= MIN_VRAM_GB, "VRAM sufficient", f"{props.name}, {gb:.1f} GiB")
        # a real allocation, not just a capability report
        try:
            t = torch.zeros(1024, 1024, 64, dtype=torch.float16, device="cuda")
            del t
            torch.cuda.empty_cache()
            line(True, "CUDA allocation smoke test", "128 MiB fp16")
        except Exception as e:  # noqa: BLE001
            line(False, "CUDA allocation smoke test", type(e).__name__)
except Exception as e:  # noqa: BLE001
    line(False, "torch import", f"{type(e).__name__}: {e}")

try:
    import bitsandbytes as bnb
    line(True, "bitsandbytes import", bnb.__version__)
except Exception as e:  # noqa: BLE001
    line(False, "bitsandbytes import", f"{type(e).__name__}: {e}")

try:
    import transformers
    from transformers import BitsAndBytesConfig  # noqa: F401
    line(True, "transformers + BitsAndBytesConfig", transformers.__version__)
except Exception as e:  # noqa: BLE001
    line(False, "transformers + BitsAndBytesConfig", f"{type(e).__name__}: {e}")

try:
    import sentence_transformers
    line(True, "sentence_transformers import", sentence_transformers.__version__)
except Exception as e:  # noqa: BLE001
    line(False, "sentence_transformers import", f"{type(e).__name__}: {e}")

if fail:
    print("\nPROBE FAILED:", ", ".join(fail))
    sys.exit(1)
print("\nprobe passed — the stack of record is installable and live")
