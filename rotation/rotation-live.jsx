// rotation-live.jsx — now-playing from the daily-synced snapshot (live-data.js).
// NO API key here and NO client-side last.fm call. The key stays server-side in the
// GitHub Action (sync-live.js → secret); the browser only ever reads static live-data.js.
function useLiveNow() {
  const R = window.ROTATION;
  const snap = (window.ROTATION_LIVE && window.ROTATION_LIVE.now) || null;
  const src = snap || R.NOW;
  return {
    artist: src.artist, track: src.track, album: src.album || "",
    artistId: src.artistId, nowplaying: !!src.nowplaying, live: !!snap,
  };
}

Object.assign(window, { useLiveNow });
