// pull-liked-added.js — ONE-TIME local pull of the true Spotify save dates (added_at).
//
// WHY THIS EXISTS: the Liked page wants the month each song was ADDED (Fuad's "2010.10"
// convention). Spotify's account-data export (YourLibrary.json) carries NO dates — verified
// 2026-08-22 — and the Web API's /me/tracks needs a USER token, which client credentials can
// never be. So: a one-time authorization-code consent in Fuad's browser, then one paged pull.
//
// RUN (from rotation/):   node pull-liked-added.js
//   1. It prints an accounts.spotify.com consent URL — open it, log in, approve.
//      The app's redirect URI must include http://127.0.0.1:8722/cb (add it in the Spotify
//      developer dashboard under the same app whose keys live in culture/.env).
//   2. The browser bounces to localhost; the script catches the code, exchanges it, and pages
//      through /me/tracks (50/page, ~72 pages).
//   3. Writes liked-added.json: { "<spotify track id>": "YYYY.MM" } — month precision only,
//      deliberately (no need to ship exact timestamps). COMMIT that file; build-data.js
//      prefers it over the first-scrobble fallback for meta slot 9.
//
// Secrets come from culture/.env (SPOTIFY / SPOTIFY_SECRET) and are never printed or written.
const fs = require("fs"), path = require("path"), http = require("http"), crypto = require("crypto");

const envTxt = fs.readFileSync(path.join(__dirname, "..", "culture", ".env"), "utf8");
const env = {}; for (const line of envTxt.split(/\r?\n/)) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const ID = env.SPOTIFY, SECRET = env.SPOTIFY_SECRET;
if (!ID || !SECRET) { console.error("SPOTIFY / SPOTIFY_SECRET not found in culture/.env"); process.exit(1); }

const PORT = 8722, REDIRECT = `http://127.0.0.1:${PORT}/cb`;
const state = crypto.randomBytes(8).toString("hex");
const authUrl = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
  client_id: ID, response_type: "code", redirect_uri: REDIRECT,
  scope: "user-library-read", state,
}).toString();

console.log("\nOpen this URL in your browser and approve access:\n\n" + authUrl + "\n\nWaiting on " + REDIRECT + " …");

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, REDIRECT);
  if (u.pathname !== "/cb") { res.writeHead(404); res.end(); return; }
  const code = u.searchParams.get("code");
  if (u.searchParams.get("state") !== state || !code) { res.writeHead(400); res.end("state mismatch"); return; }
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<body style='font-family:monospace;padding:40px'>Got it — you can close this tab. The pull continues in the terminal.</body>");
  server.close();
  try {
    const tok = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(ID + ":" + SECRET).toString("base64") },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT }),
    }).then(r => r.json());
    if (!tok.access_token) { console.error("token exchange failed:", tok.error_description || tok.error); process.exit(1); }
    const out = {};
    let url = "https://api.spotify.com/v1/me/tracks?limit=50", page = 0;
    while (url) {
      const j = await fetch(url, { headers: { Authorization: "Bearer " + tok.access_token } }).then(r => r.json());
      if (j.error) { console.error("api error:", j.error.message); break; }
      for (const it of (j.items || [])) {
        if (it.track && it.track.id && it.added_at) out[it.track.id] = it.added_at.slice(0, 7).replace("-", ".");
      }
      url = j.next; page++;
      if (page % 10 === 0) console.log(`  page ${page} · ${Object.keys(out).length} tracks`);
      await new Promise(r => setTimeout(r, 120));
    }
    fs.writeFileSync(path.join(__dirname, "liked-added.json"), JSON.stringify(out));
    console.log(`\nliked-added.json written: ${Object.keys(out).length} tracks with an added month.`);
    console.log("Commit it, and the next build carries real added months (build-data prefers it).");
  } catch (e) { console.error("pull failed:", e.message); process.exit(1); }
});
server.listen(PORT);
