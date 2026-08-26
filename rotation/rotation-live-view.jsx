// rotation-live-view.jsx — the (dormant) Live/concerts view (split from rotation-views2.jsx, 2026-08-26).

function ConcertRow({ g, onArtist }) {
  const d = new Date(g.date);
  const mo = d.toLocaleString("en", { month: "short" }).toUpperCase();
  return (
    <div className="r-gig" onClick={onArtist ? () => onArtist(g.artistId) : undefined}
      style={{ display: "grid", gridTemplateColumns: "44px 36px 1fr auto", gap: 13, alignItems: "center",
        padding: "11px 4px", borderBottom: "1px solid var(--rule)", cursor: onArtist ? "pointer" : "default" }}>
      <div style={{ textAlign: "center" }}>
        <div className="r-mono" style={{ fontSize: 9, color: "var(--accent)", letterSpacing: ".1em" }}>{mo}</div>
        <div className="r-stat-n" style={{ fontSize: 22 }}>{d.getDate()}</div>
      </div>
      <GenCover hue={g.hue} name={g.artist} size={36} radius={3} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          {g.artist}{g.inLibrary && <span className="r-mono" style={{ fontSize: 8, color: "var(--accent)", border: "1px solid var(--accent-dim)", borderRadius: 3, padding: "1px 4px", letterSpacing: ".06em" }}>YOURS</span>}</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{g.venue}</div>
      </div>
      <button className="r-alert">tickets ↗</button>
    </div>
  );
}

// ════════════════════════ LIVE ════════════════════════
function LiveView({ t, go, city, setCity }) {
  const R = window.ROTATION;
  const cities = R.CITIES || [];
  const activeCity = cities.includes(city) ? city : (cities[0] || "");
  const gigs = (activeCity && R.CONCERTS[activeCity]) || [];
  const yours = gigs.filter(g => g.inLibrary);

  // empty state: no concerts data has been enriched yet
  if (cities.length === 0) {
    return (
      <div className="r-view">
        <div className="r-viewhead">
          <div>
            <div className="r-kicker">Live · upcoming</div>
            <h1 className="r-title">Out <em>tonight</em><span className="dot">.</span></h1>
          </div>
          <p className="r-lede">Shows for the artists you actually play — once the concert data is wired up.</p>
        </div>
        <div className="r-card" style={{ padding: 32, textAlign: "center" }}>
          <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14 }}>No concert data yet</div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 24, lineHeight: 1.2, marginBottom: 12 }}>
            Real upcoming shows arrive once <code style={{ fontFamily: "var(--mono)", fontSize: 17, color: "var(--accent)" }}>concerts-cache.json</code> is populated.
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 14, maxWidth: 480, margin: "0 auto" }}>
            Run <code style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>TICKETMASTER_API_KEY=… node enrich-concerts.js</code> to pull
            live event data via the Ticketmaster Discovery API (free key, instant signup at developer.ticketmaster.com).
            The placeholder concerts have been removed.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Live · upcoming</div>
          <h1 className="r-title">Out <em>tonight</em><span className="dot">.</span></h1>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <p className="r-lede" style={{ marginBottom: 2 }}>Shows from artists you actually play, wherever you are.
            <b> {yours.length} of your artists</b> are touring {activeCity}.</p>
          <div className="r-seg">
            {cities.map(c => <button key={c} data-on={activeCity === c} onClick={() => setCity(c)}>{c}</button>)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(380px,100%),1fr))", gap: "var(--gap)" }}>
        <div className="r-card" style={{ padding: "8px 18px 14px" }}>
          <div className="r-card-h" style={{ padding: "12px 0 8px" }}><span className="lbl"><b>From your library</b></span>
            <span className="meta">{yours.length} dates</span></div>
          {yours.length
            ? yours.map(g => <ConcertRow key={g.id} g={g} onArtist={(id) => go("artist", id)} />)
            : <div style={{ padding: 16, color: "var(--ink-faint)", fontSize: 13 }}>No shows in {activeCity} from artists you play right now.</div>}
        </div>
        <div className="r-card" style={{ padding: "8px 18px 14px" }}>
          <div className="r-card-h" style={{ padding: "12px 0 8px" }}><span className="lbl"><b>Also in town</b></span>
            <span className="meta">{gigs.filter(g => !g.inLibrary).length} dates</span></div>
          {gigs.filter(g => !g.inLibrary).length
            ? gigs.filter(g => !g.inLibrary).map(g => <ConcertRow key={g.id} g={g} />)
            : <div style={{ padding: 16, color: "var(--ink-faint)", fontSize: 13 }}>Nothing else booked in {activeCity}.</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────── shared audio-viz helpers (Album + Track panes) ───────────
// expand a media yearTail (0 | year | [year,plays,…]) + the row's total plays into [{y, p}] sorted by year.

Object.assign(window, { LiveView, ConcertRow });
