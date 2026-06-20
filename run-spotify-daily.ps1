# run-spotify-daily.ps1 — local daily Spotify art pull for Rotation (fuad.au).
# Phase 1: artist photos (folded into the site). Phase 2: once photos are complete, album covers
# (accumulated into spotify-cache.json for a future cover wall — not yet shown on the site).
# Album calls only run AFTER photos are done, so they can't trip the daily ban mid photo-pull.
# Self-unregisters once BOTH photos and covers report nothing left. Scheduled task "RotationSpotifyArt".
$ErrorActionPreference = "Continue"
Set-Location "C:\Users\Fuad\Documents\GitHub\fuad.au"
$log = "C:\Users\Fuad\Documents\GitHub\fuad.au\spotify-sync.log"
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

Log "--- start ---"
node enrich-spotify.js --mode=images --limit=400 *>> $log; $img = $LASTEXITCODE
$cov = 0
if ($img -eq 3) {
    # photos are complete → spend the day's quota on album covers
    node enrich-spotify.js --mode=covers --top=300 *>> $log; $cov = $LASTEXITCODE
}

git add spotify-cache.json
git diff --staged --quiet
$cacheChanged = ($LASTEXITCODE -ne 0)
if ($cacheChanged) {
    # only rebuild/fold when PHOTOS changed — album covers aren't folded into the build yet
    if ($img -ne 3) {
        node build-data.js *>> $log
        git add music-data.js search-index.js artist-detail.js
    }
    git commit -m "chore: daily spotify art batch" *>> $log
    git push *>> $log
    Log "pushed (img=$img cov=$cov)"
} else {
    Log "no new art (img=$img cov=$cov)"
}

# done only when BOTH photos (img) and covers (cov) report nothing left (exit 3); exit 4 = quota-paused.
if ($img -eq 3 -and $cov -eq 3) {
    Log "all artwork complete - notifying + unregistering"
    Set-Content -Path "C:\Users\Fuad\Documents\GitHub\fuad.au\ART-COMPLETE.txt" -Value "All artist photos + album covers pulled: $(Get-Date -Format s)" -Encoding utf8
    git add ART-COMPLETE.txt
    git commit -m "Spotify art complete - photos + album covers finished" *>> $log
    git push *>> $log
    try { msg.exe * "Rotation: all artist photos and album covers are in - the Spotify routine has finished." } catch {}
    Unregister-ScheduledTask -TaskName "RotationSpotifyArt" -Confirm:$false
}
