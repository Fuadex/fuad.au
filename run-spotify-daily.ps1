# run-spotify-daily.ps1 — local daily Spotify PHOTO pull for Rotation (fuad.au).
# Pulls artist photos using the keys in Fuad-Soudah/Culture_2/.env, folds them into the dataset,
# commits/pushes, and once every gap is filled it notifies + unregisters its own scheduled task.
# Album covers are paused for now (that endpoint is quota-blocked) — photos first.
# Scheduled via Windows Task Scheduler (task "RotationSpotifyArt"). Logs to spotify-sync.log.
$ErrorActionPreference = "Continue"
Set-Location "C:\Users\Fuad\Documents\GitHub\fuad.au"
$log = "C:\Users\Fuad\Documents\GitHub\fuad.au\spotify-sync.log"
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

Log "--- start ---"
node enrich-spotify.js --mode=images --limit=400 *>> $log; $img = $LASTEXITCODE

# rebuild + commit only when the cache actually gained photos (avoids timestamp-only commits)
git add spotify-cache.json
git diff --staged --quiet
$cacheChanged = ($LASTEXITCODE -ne 0)
if ($cacheChanged) {
    node build-data.js *>> $log                                # fold the new photos into music-data.js
    git add music-data.js search-index.js
    git commit -m "chore: daily spotify photo batch" *>> $log
    git push *>> $log
    Log "pushed (img=$img)"
} else {
    Log "no new photos (img=$img)"
}

# done when photos report complete (exit 3); exit 4 = quota-paused → stay alive and resume tomorrow.
if ($img -eq 3) {
    Log "all artist photos complete - notifying + unregistering"
    Set-Content -Path "C:\Users\Fuad\Documents\GitHub\fuad.au\PHOTOS-COMPLETE.txt" -Value "All artist photos pulled: $(Get-Date -Format s)" -Encoding utf8
    git add PHOTOS-COMPLETE.txt
    git commit -m "Artist photos complete - Spotify photo routine finished" *>> $log
    git push *>> $log
    try { msg.exe * "Rotation: all artist photos are in - the Spotify photo routine has finished." } catch {}
    Unregister-ScheduledTask -TaskName "RotationSpotifyArt" -Confirm:$false
}
