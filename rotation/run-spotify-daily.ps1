# run-spotify-daily.ps1 — local daily Spotify PHOTO pull for Rotation (fuad.au).
# --mode=photos pulls a Spotify photo for EVERY artist (gap fills + alternates/backup for artists
# whose primary image is Discogs/last.fm), folds them in (R.SPOTIMG), commits/pushes, and once all
# are pulled it notifies + unregisters its own task. Album covers are NOT pulled (endpoint blocked).
# Scheduled via Windows Task Scheduler (task "RotationSpotifyArt"). Logs to spotify-sync.log.
$ErrorActionPreference = "Continue"
Set-Location "C:\Users\Fuad\Documents\GitHub\fuad.au"
$log = "C:\Users\Fuad\Documents\GitHub\fuad.au\spotify-sync.log"
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

Log "--- start ---"
node enrich-spotify.js --mode=photos --limit=400 *>> $log; $img = $LASTEXITCODE

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

# done when every artist's Spotify photo is pulled (exit 3); exit 4 = quota-paused → resume tomorrow.
if ($img -eq 3) {
    Log "all Spotify photos/alternates complete - notifying + unregistering"
    Set-Content -Path "C:\Users\Fuad\Documents\GitHub\fuad.au\PHOTOS-COMPLETE.txt" -Value "All Spotify photos + alternates pulled: $(Get-Date -Format s)" -Encoding utf8
    git add PHOTOS-COMPLETE.txt
    git commit -m "Spotify photos + alternates complete - routine finished" *>> $log
    git push *>> $log
    try { msg.exe * "Rotation: all Spotify photos and alternates are in - the routine has finished." } catch {}
    Unregister-ScheduledTask -TaskName "RotationSpotifyArt" -Confirm:$false
}
