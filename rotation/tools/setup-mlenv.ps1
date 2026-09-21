<#
  setup-mlenv.ps1 - rebuilds the UNTRACKED local ML venv the mood + themes pipelines run in.

  The venv and the model weights are disposable; THIS SCRIPT is the durable artefact.
  Nothing it creates is ever committed (see rotation/tools/README.md, "What is tracked").

  Stack of record (must not drift - see MOOD_PIPELINE.md section 1):
      Qwen/Qwen2.5-7B-Instruct, 4-bit nf4 via bitsandbytes, driven by python
      `transformers` (AutoModelForCausalLM + apply_chat_template) on CUDA.
  There is no llama.cpp / GGUF path. If this stack cannot be installed, STOP and
  report - a different quantisation changes the scores and is the owner's call.

  Python: 3.12 is required. 3.14 has no torch-cuda / bitsandbytes wheels (measured
  2026-09-21: the 3.14 env could only resolve torch 2.12.1+cpu). Install once with
      winget install --id Python.Python.3.12 --scope user --silent

  NOTE: this file is ASCII-only on purpose - Windows PowerShell 5.1 reads .ps1 as ANSI
  and mangles UTF-8 punctuation into parse errors.

  Usage:
      powershell -ExecutionPolicy Bypass -File rotation/tools/setup-mlenv.ps1
      ... -Force          # delete and rebuild an existing venv
      ... -VenvPath X     # build somewhere other than <workspace>/.sptmp/mlenv
      ... -SkipModel      # do not pre-download the weights
      ... -Freeze         # rewrite tools/requirements-mlenv.lock.txt from the built env
#>
[CmdletBinding()]
param(
  [string]$VenvPath,
  [string]$PythonExe,
  [switch]$Force,
  [switch]$SkipModel,
  [switch]$Freeze
)

$ErrorActionPreference = 'Stop'

# ---- paths -----------------------------------------------------------------
# tools/ -> rotation/ -> <repo> -> <workspace>;  the scratch root is <workspace>/.sptmp
$ToolsDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Rotation  = Split-Path -Parent $ToolsDir
$Repo      = Split-Path -Parent $Rotation
$Workspace = Split-Path -Parent $Repo
$Sptmp     = if ($env:ROTATION_SPTMP) { $env:ROTATION_SPTMP } else { Join-Path $Workspace '.sptmp' }
if (-not $VenvPath) { $VenvPath = Join-Path $Sptmp 'mlenv' }
$ModelDir  = Join-Path $Sptmp 'models'

Write-Host "workspace : $Workspace"
Write-Host "scratch   : $Sptmp"
Write-Host "venv      : $VenvPath"
Write-Host "models    : $ModelDir  (HF_HOME)"

if (-not (Test-Path $Sptmp))    { New-Item -ItemType Directory -Path $Sptmp -Force | Out-Null }
if (-not (Test-Path $ModelDir)) { New-Item -ItemType Directory -Path $ModelDir -Force | Out-Null }

# ---- locate a 3.12 interpreter ---------------------------------------------
if (-not $PythonExe) {
  $cands = @()
  try { $cands += (& py -3.12 -c "import sys; print(sys.executable)" 2>$null) } catch {}
  try { $cands += (& py -3.11 -c "import sys; print(sys.executable)" 2>$null) } catch {}
  $cands += (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe')
  $cands += 'C:\Python312\python.exe'
  $PythonExe = $cands | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
}
if (-not $PythonExe) {
  throw "No Python 3.12 found. Install it:  winget install --id Python.Python.3.12 --scope user --silent"
}
$pyVer = (& $PythonExe -c "import sys; print('%d.%d' % sys.version_info[:2])").Trim()
Write-Host "python    : $PythonExe (v$pyVer)"
if ($pyVer -ne '3.12' -and $pyVer -ne '3.11') {
  throw "Python $pyVer will not do: torch-cuda + bitsandbytes need 3.11/3.12 wheels on Windows."
}

# ---- create the venv -------------------------------------------------------
if ((Test-Path $VenvPath) -and $Force) {
  Write-Host "removing existing venv (-Force)..."
  Remove-Item -Recurse -Force $VenvPath
}
if (-not (Test-Path $VenvPath)) {
  Write-Host "creating venv..."
  & $PythonExe -m venv $VenvPath
  if ($LASTEXITCODE -ne 0) { throw "venv creation failed ($LASTEXITCODE)" }
} else {
  Write-Host "venv exists - installing into it (pass -Force to rebuild from scratch)"
}
$VPy = Join-Path $VenvPath 'Scripts\python.exe'
if (-not (Test-Path $VPy)) { throw "venv python missing at $VPy" }

function Invoke-Pip {
  param([string[]]$PipArgs)
  Write-Host ""
  Write-Host ">>> pip $($PipArgs -join ' ')"
  & $VPy -m pip @PipArgs
  if ($LASTEXITCODE -ne 0) { throw "pip failed ($LASTEXITCODE): pip $($PipArgs -join ' ')" }
}

Invoke-Pip @('install','--upgrade','pip','setuptools','wheel')

# ---- torch, CUDA build -----------------------------------------------------
# cu126 matches the house driver (560.94 / CUDA 12.6, RTX 3070 8 GB).
Invoke-Pip @('install','--index-url','https://download.pytorch.org/whl/cu126','torch')

# ---- the rest --------------------------------------------------------------
$req = Join-Path $ToolsDir 'requirements-mlenv.txt'
Invoke-Pip @('install','-r',$req)

# ---- verify: CUDA must be live, bitsandbytes must import -------------------
Write-Host ""
Write-Host "=== verification ==="
$env:HF_HOME = $ModelDir
& $VPy (Join-Path $ToolsDir 'probe-mlenv.py')
if ($LASTEXITCODE -ne 0) { throw "environment verification FAILED - do not run the pipeline" }

# ---- model weights (untracked, into .sptmp/models) -------------------------
if (-not $SkipModel) {
  Write-Host ""
  Write-Host "=== downloading model weights into $ModelDir ==="
  & $VPy (Join-Path $ToolsDir 'fetch-models.py') all
  if ($LASTEXITCODE -ne 0) { throw "model download failed" }
}

# ---- freeze ----------------------------------------------------------------
if ($Freeze) {
  $lock = Join-Path $ToolsDir 'requirements-mlenv.lock.txt'
  & $VPy -m pip freeze | Out-File -Encoding ascii $lock
  Write-Host "froze exact versions -> $lock"
}

Write-Host ""
Write-Host "DONE. Run the pipeline with:"
Write-Host "  `$env:HF_HOME='$ModelDir'"
Write-Host "  & '$VPy' '$ToolsDir\mood-score.py' --help"
