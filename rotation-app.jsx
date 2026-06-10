// rotation-app.jsx — shell: header nav, routing, tweaks, popover layer

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accH": 330,
  "font": "grotesk",
  "chart": "expressive",
  "density": "regular",
  "layout": "wall"
}/*EDITMODE-END*/;

const ACCENTS = [
  { h: 330, name: "Magenta" },
  { h: 255, name: "Electric" },
  { h: 188, name: "Cyan" },
  { h: 140, name: "Acid" },
  { h: 28,  name: "Ember" },
];

const NAV = [
  ["overview", "Overview"],
  ["charts", "Charts"],
  ["clock", "Clock"],
  ["sound", "Sound Map"],
  ["eras", "Eras"],
  ["live", "Live"],
];

function RotationApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState({ view: "overview", id: null });
  const [pop, setPop] = React.useState(null);
  const [city, setCity] = React.useState("Tokyo");
  const R = window.ROTATION;

  const go = React.useCallback((view, id) => {
    setPop(null);
    setRoute({ view, id: id || null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // keep popover from sticking when scrolling
  React.useEffect(() => {
    const clr = () => setPop(null);
    window.addEventListener("scroll", clr, { passive: true });
    return () => window.removeEventListener("scroll", clr);
  }, []);

  const v = route.view;
  return (
    <div className="r-app" data-density={t.density} data-font={t.font}
      style={{ "--acc-h": t.accH }}>
      <style dangerouslySetInnerHTML={{ __html: cssRotation }} />

      <header className="r-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="r-wordmark" onClick={() => go("overview")} style={{ cursor: "pointer" }}>Rotation<span className="dot">.</span></span>
          <span className="r-sub">last.fm / fuadex</span>
        </div>
        <nav className="r-nav">
          {NAV.map(([k, lbl]) => (
            <button key={k} data-on={v === k || (k === "charts" && v === "artist")} onClick={() => go(k)}>
              <span className="gl" />{lbl}
            </button>
          ))}
        </nav>
        <div className="right">
          <div className="r-live" onClick={() => go("artist", R.NOW.artistId)} style={{ cursor: "pointer" }}>
            <span className="dot" /> <b>{R.NOW.artist}</b> — {R.NOW.track}
          </div>
        </div>
      </header>

      {v === "overview" && <OverviewView t={t} go={go} />}
      {v === "charts" && <ChartsView t={t} go={go} setPop={setPop} />}
      {v === "clock" && <ClockView t={t} setPop={setPop} />}
      {v === "sound" && <SoundMapView t={t} setPop={setPop} />}
      {v === "eras" && <ErasView t={t} go={go} />}
      {v === "live" && <LiveView t={t} go={go} city={city} setCity={setCity} />}
      {v === "artist" && <ArtistView t={t} id={route.id} go={go} setPop={setPop} city={city} setCity={setCity} />}

      <footer className="r-foot">
        <div>rotation · a companion to <a className="r-link" href="Culture v2.html">Culture</a> · fuad.design / 2026</div>
        <div className="r-foot-links">
          <span>real scrobbles — last.fm/fuadex · concerts &amp; genres curated</span>
        </div>
      </footer>

      <Popover data={pop} />

      <TweaksPanel>
        <TweakSection label="Identity" />
        <div className="tw-accents">
          {ACCENTS.map(a => (
            <button key={a.h} title={a.name} onClick={() => setTweak("accH", a.h)}
              data-on={t.accH === a.h}
              style={{ background: `oklch(0.72 0.15 ${a.h})` }} />
          ))}
        </div>
        <TweakRadio label="Type" value={t.font}
          options={[{ value: "grotesk", label: "Grotesk" }, { value: "editorial", label: "Editorial" }]}
          onChange={(val) => setTweak("font", val)} />
        <TweakSection label="Data viz" />
        <TweakRadio label="Charts" value={t.chart}
          options={[{ value: "expressive", label: "Expressive" }, { value: "minimal", label: "Minimal" }]}
          onChange={(val) => setTweak("chart", val)} />
        <TweakRadio label="Top-chart layout" value={t.layout}
          options={[{ value: "wall", label: "Wall" }, { value: "bars", label: "Bars" }, { value: "bubbles", label: "Bubbles" }]}
          onChange={(val) => setTweak("layout", val)} />
        <TweakSection label="Density" />
        <TweakRadio label="Spacing" value={t.density}
          options={[{ value: "compact", label: "Compact" }, { value: "regular", label: "Regular" }, { value: "comfy", label: "Comfy" }]}
          onChange={(val) => setTweak("density", val)} />
      </TweaksPanel>

      <style>{`
        .r-foot { display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap;
          padding: 24px var(--pad); border-top: 1px solid var(--rule); font-family: var(--mono);
          font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); }
        .tw-accents { display: flex; gap: 8px; padding: 4px 0 10px; }
        .tw-accents button { width: 30px; height: 30px; border-radius: 8px; border: 2px solid transparent;
          cursor: pointer; transition: transform .15s, border-color .15s; }
        .tw-accents button:hover { transform: scale(1.1); }
        .tw-accents button[data-on="true"] { border-color: var(--ink); }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RotationApp />);
