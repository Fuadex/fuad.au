# run-spotify-daily.ps1 — local daily Spotify art pull for Rotation (fuad.au).
# Pulls a capped batch (artist photos first, then album covers) using the keys in
# Fuad-Soudah/Culture_2/.env, then commits/pushes the updated spotify-cache.json.
# Scheduled via Windows Task Scheduler (task "RotationSpotifyArt"). Logs to spotify-sync.log.
$ErrorActionPreference = "Continue"
Set-Location "C:\Users\Fuad\Documents\GitHub\fuad.au"
$log = "C:\Users\Fuad\Documents\GitHub\fuad.au\spotify-sync.log"
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

Log "--- start ---"
node enrich-spotify.js --mode=images --limit=400  *>> $log
node enrich-spotify.js --mode=covers --top=150     *>> $log

git add spotify-cache.json
git diff --staged --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m "chore: daily spotify art batch" *>> $log
    git push *>> $log
    Log "pushed"
} else {
    Log "no change"
}
