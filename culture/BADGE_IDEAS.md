# Badge & taste-layer ideas — open questions and roadmap

Companion to `BADGE_CHARTER.md` (the settled definitions) and `taste_profile_plan.md`
(the Explore/Palette explorer). This file holds what's **still being cracked** — mostly
earmarked for a Fable 5 pass — plus the build roadmap for the new taste layer.

## Settled this pass (2026-07-08)
- **Age of Success** director corrected → **Jang Sun-woo** (was wrongly Im Kwon-taek);
  regained `satire` + `social-xray`.
- **The Usual Suspects** re-tagged `cognitive → mindbending` (the reframe stays inside the
  film; it doesn't change how you see the world/medium after).
- **New badges added + founders assigned:** 🔬 social-xray, 📐 formal-exec, 😬 squirm, 🍵 gentle.
- **Cover promotions:** Zdjęcie, Fear and Loathing, Red Dragon, Half-Life 2 (`favorite: true`).
- **Enrichment bug fixes:** bad OMDb `enTitle`s — Poetry (was "Naruto Shippuden…"),
  Mother (was "Scarlet Innocence"). Worth an audit pass for other romanized-KR/JP mismatches.
- **Ponyo / funny:** no action — Ponyo was never actually tagged `funny` in the data (the
  `funny_taxonomy.md` DROP list was a proposal, not applied). Nothing to remove.

## Settled 2026-07-08 (second Fable pass)

### 🪞 close-lens — IN the taxonomy, zero confirmed holders
Kept as the third cognitive sub-flavour (charter updated; Cognitive Hall subtitle and the 🪞
legend desc now name all three lenses). Fuad can't currently point to a personal instance —
that's fine: it's a *watch-for* slot, not a quota. One-line test in the charter: "can you name
the one thing?" Assign the moment a title genuinely ruins one concrete thing.

### 🌫️ haunting — SHIPPED, scoped
Now in the charter (Effect family) + HIGHLIGHTS. Hand-curated only; excludes "it was scary";
test = *weeks later, did it come back uninvited?* Founders (Fuad-named): Spec Ops: The Line,
Black Mirror, Antichamber. **Expansion candidates awaiting Fuad's yes/no** (only he knows what
actually returned): TLOU2, Come and See, The Human Condition I, A Short Film About Killing,
Incendies, Norwegian Wood (book), Watership Down, The Plague Dogs, Night on the Galactic
Railroad, The Walking Dead S1, Chernobyl, Wonder Egg Priority, Voskhozhdeniye/The Ascent.

### 💎 gem — provisional definition written
Charter now reads: *a personal treasure, loved far beyond its fame — the ones you press into
people's hands* (advocacy test, reach a signal not a gate). Legend desc populated. Still
Fuad's call whether this sticks or the taxonomy splits again; `audit_gems.py` remains the
discovery aid.

## Still to crack

### 💥 impact — tighten 63 → ≈50
Demotion shortlist (impact reads as blanket/mislabeled; each keeps its other badges):
Innocence (6 — cinematography carries it), Chilsu wa Mansu (cerebral, not visceral),
Terror in Resonance, Steins;Gate, Cyberpunk: Edgerunners (all 7s — thrilling/devastating
already cover them), Gurren Lagann (thrilling covers it), Life is Strange (bittersweet is
the truth of it), GTA IV (atmosphere), Skins (social-xray). Several current 💥 holders are
really 🌫️ candidates instead: Norwegian Wood, Watership Down, Incendies, Night on the
Galactic Railroad. Awaiting Fuad's approval before applying.

### "floored me" — the orphaned half of old gem
Old 💎 conflated *underseen* with *personal maximum*. Once 💎 = underseen, the "floored me"
meaning needs a home. Options: (a) don't badge it — `rating:10 + favorite` already encodes it;
(b) a new **🌟 floored** badge for the personal-ceiling titles regardless of fame (Fight Club,
TLOU2, Red Dragon-for-Fuad). Lean (a) for now to avoid badge inflation; revisit with Fable.

### 🎨 visuals prune (113 → ≤ 60)
`visuals` is bloating toward "is animation." Re-curation rule: keep 🎨 for titles whose *image
beauty* is a top-3 reason they're memorable; move "bold/quirky aesthetic" cases to 🕶️ style and
"lenswork" cases to 📷 cinematography; drop from titles where it was blanket-applied. Candidate
demotions to review: most Pixar/Disney shorts carrying only `visuals`, generic anime OPs. Do a
`propose_visuals_prune.py` listing every `visuals` holder with its other badges + medium, sorted
so the blanket cases surface first.

### Mechanize the charter
Add a machine-readable `BADGE_CHARTER` block (one-line test + 3 exemplars + size band per badge)
and extend `propose_badges.py` to *score* candidates against each badge's test (keyword / genre /
mood / script-mood heuristics) so future fishing ranks candidates instead of listing them
alphabetically. Also: clear the **Hazbin Hotel duplicate** (two entries) flagged in
`funny_taxonomy.md`.

---

## New taste layer — build roadmap

### 1. "My Taste" pane (Stats-adjacent nav)
A new top-level view sitting next to **Charts** and **Explore** (renamed from *Taste Profile*).
Holds the long-form taste read (the five walls: execution-of-format, the cognitive shift,
social vivisection, earned devastation, canon-skepticism) as authored prose + a few pulled
superlatives. Essentially the essay, made a first-class page. (Nav rename: *Taste Profile →
Explore*; alt names considered: *Lab*, *Palette*, *Playground* — Explore chosen for clarity.)

### 2. Badge Charter surface (a "Badges" button)
A page rendering `BADGE_CHARTER` — badge, emoji, one-line meaning, exemplars, live count. Turns
the taxonomy into the site's editorial voice (Letterboxd has likes; Culture has *defined
qualities*). Placement options: (a) a small **Badges** button in the Stats/Explore header;
(b) a section inside "My Taste"; (c) click any badge chip anywhere → opens its charter card.
Recommend (c) as the primary affordance + (a) as the index. Content not wired yet — seed from
the charter's one-liners.

### 3. Halls (under Stats)
Curated "best-of by badge" galleries, one per marquee badge, each item with a one-line note:
- **🪞 Cognitive Shift Hall** (split into world-lens / medium-lens / close-lens rows)
- **📐 Formal Execution Hall**
- **🃏 One of a Kind Hall** (singular)
- **🕰️ Ahead of Its Time Hall**
- **🗺️ A World Unto Itself Hall** (worldbuilding)

### 4. Predicted-rating model → default wishlist view
Fit on the ~3,000 rated items; score the ~1,340-item wishlist to order it "start here". Details
in `PREDICT_MODEL.md`. Becomes the default sort of the wishlist page (toggle back to date/manual).
Model to be tuned by Fable 5.

### 5. Extraction (transcripts + character corpus)
dialogue density (words/min), monologue detection ("great speeches"), NRC emotion vectors beyond
valence (validate 💀/🩸 against fear/anger density → curation queue), cast-line concentration
(two-hander vs ensemble). Surface as a tiny dialogue-fingerprint glyph in the Reader.
