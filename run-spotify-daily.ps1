# run-spotify-daily.ps1 — local daily Spotify art pull for Rotation (fuad.au).
# Pulls a capped batch (artist photos first, then album covers) using the keys in
# Fuad-Soudah/Culture_2/.env, then commits/pushes the updated spotify-cache.json.
# Scheduled via Windows Task Scheduler (task "RotationSpotifyArt"). Logs to spotify-sync.log.
$ErrorActionPreference = "Continue"
Set-Location "C:\Users\Fuad\Documents\GitHub\fuad.au"
$log = "C:\Users\Fuad\Documents\GitHub\fuad.au\spotify-sync.log"
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

Log "--- start ---"
node enrich-spotify.js --mode=images --limit=400  *>> $log; $img = $LASTEXITCODE
node enrich-spotify.js --mode=covers --top=150     *>> $log; $cov = $LASTEXITCODE

# rebuild + commit only when the cache actually gained art (avoids timestamp-only commits)
git add spotify-cache.json
git diff --staged --quiet
$cacheChanged = ($LASTEXITCODE -ne 0)
if ($cacheChanged) {
    node build-data.js *>> $log                                # fold the new art into music-data.js
    git add music-data.js search-index.js
    git commit -m "chore: daily spotify art batch" *>> $log
    git push *>> $log
    Log "pushed (img=$img cov=$cov)"
} else {
    Log "no new art (img=$img cov=$cov)"
}

# self-terminate: once photos report complete (exit 3) and a run adds nothing new, all pullable art is in
if ($img -eq 3 -and -not $cacheChanged) {
    Log "all pullable art complete - unregistering RotationSpotifyArt"
    Unregister-ScheduledTask -TaskName "RotationSpotifyArt" -Confirm:$false
}
