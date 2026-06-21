# run-spotify-daily.ps1 — local daily Spotify PHOTO pull for Rotation (fuad.au).
# Pulls artist photos, folds them into the dataset, commits/pushes, and once every gap is filled it
# notifies + unregisters its own scheduled task. Album covers are NOT pulled — that endpoint is
# hard quota-blocked for this app (see the dump route for a future cover wall).
# Scheduled via Windows Task Scheduler (task "RotationSpotifyArt"). Logs to spotify-sync.log.
$ErrorActionPreference = "Continue"
Set-Location "C:\Users\Fuad\Documents\GitHub\fuad.au"
$log = "C:\Users\Fuad\Documents\GitHub\fuad.au\spotify-sync.log"
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

Log "--- start ---"
node enrich-spotify.js --mode=images --limit=400 *>> $log; $img = $LASTEXITCODE

git add spotify-cache.json
git diff --staged --quiet
$cacheChanged = ($LASTEXITCODE -ne 0)
if ($cacheChanged) {
    node build-data.js *>> $log                                # fold the new photos into music-data.js
    git add music-data.js search-index.js artist-detail.js
    git commit -m "chore: daily spotify photo batch" *>> $log
    git push *>> $log
    Log "pushed (img=$img)"
} else {
    Log "no new photos (img=$img)"
}

# done when photos report nothing left (exit 3); exit 4 = quota-paused → stay alive, resume tomorrow.
if ($img -eq 3) {
    Log "all artist photos complete - notifying + unregistering"
    Set-Content -Path "C:\Users\Fuad\Documents\GitHub\fuad.au\PHOTOS-COMPLETE.txt" -Value "All artist photos pulled: $(Get-Date -Format s)" -Encoding utf8
    git add PHOTOS-COMPLETE.txt
    git commit -m "Artist photos complete - Spotify photo routine finished" *>> $log
    git push *>> $log
    try { msg.exe * "Rotation: all artist photos are in - the Spotify photo routine has finished." } catch {}
    Unregister-ScheduledTask -TaskName "RotationSpotifyArt" -Confirm:$false
}
