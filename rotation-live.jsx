// rotation-live.jsx — client-side last.fm live layer (real-time now-playing).
// NOTE: this read-only last.fm API key is visible in page source. Worst case is
// someone consuming the key's request quota; swap for a dedicated key if needed.
const LASTFM = { user: "fuadex", key: "REDACTED-ROTATED-KEY" };

// fetch the most-recent scrobble (or now-playing track) once on mount.
// returns { artist, track, album, artistId, nowplaying, live } — falls back to
// the static ROTATION.NOW from the last export until the fetch resolves.
function useLiveNow() {
  const R = window.ROTATION;
  // seed from the daily-synced snapshot if present, else the static export
  const seed = (window.ROTATION_LIVE && window.ROTATION_LIVE.now) || R.NOW;
  const fallback = {
    artist: seed.artist, track: seed.track, album: seed.album || "",
    artistId: seed.artistId, nowplaying: !!seed.nowplaying, live: false,
  };
  const [now, setNow] = React.useState(fallback);

  React.useEffect(() => {
    let alive = true;
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM.user}` +
      `&api_key=${LASTFM.key}&format=json&limit=1`;
    fetch(url)
      .then(r => r.json())
      .then(j => {
        const tr = j && j.recenttracks && j.recenttracks.track;
        const t = Array.isArray(tr) ? tr[0] : tr;
        if (!alive || !t) return;
        const artist = (t.artist && (t.artist["#text"] || t.artist.name)) || "";
        if (!artist) return;
        setNow({
          artist, track: t.name || "", album: (t.album && t.album["#text"]) || "",
          artistId: R.slug(artist),
          nowplaying: !!(t["@attr"] && t["@attr"].nowplaying), live: true,
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return now;
}

Object.assign(window, { useLiveNow });
