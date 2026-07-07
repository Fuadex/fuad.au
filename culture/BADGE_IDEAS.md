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

## Still to crack (Fable 5)

### 🪞 close-lens — the third cognitive sub-flavour
world-lens (see reality/self anew) and medium-lens (see the form anew) are settled. The third,
**close-lens**, = *changed how you look at one concrete thing forever* — narrower aperture:
a technique, an object, a place, a person-type; not "reality" but "I can't see X the same."
Candidates: Jaws (open water), Whiplash (a metronome / a mentor's approval), Psycho (a shower),
Uncut Gems (a buzzer), Koyaanisqatsi (traffic/cities), The Act of Killing (a perpetrator's
smile), There Will Be Blood (a milkshake), Funny Games (the remote). **Open:** is close-lens a
real third axis or a subset of world-lens? Name candidates if we keep it: *object-lens*,
*fixation*, *"ruined-forever"*. Decide with Fable.

### 🌫️ haunting — the afterglow badge, carefully scoped
Splitting `impact` into **💥 impact** (visceral in-the-moment, gut/face-punch) + **🌫️ haunting**
(stayed for weeks) is agreed in principle — BUT the trap: most horror is *designed* to haunt,
so a naive rule floods the badge. Fuad's intent is the opposite — reserve 🌫️ for titles that
lingered **because of a cognitive/thematic residue, not a scare**: Spec Ops: The Line, Black
Mirror, Antichamber all stayed for weeks, and a big part of *why* was the 🪞 shift entangled in
them. So haunting and cognitive are correlated but not identical (a 🪞 can fade; a 🌫️ can lack a
shift). **Proposed rule:** 🌫️ is *hand-curated only* (never auto-applied), explicitly excludes
"it was scary," and is meant for the handful that genuinely occupied you afterward. Needs a
Fable pass to seed the founder set and write the one-line test. Do NOT ship until scoped.

### 💎 gem — make it computable
Keep the label "hidden gem" (moving to plain "gem" loses the *underseen* weight). Definition to
implement: **high personal rating AND low popular reach.** We have the signals in the overlays —
`item.fwAvg`, `voteCount`, and OMDb `imdbVotes`. Proposed rule:
`gem = rating >= 9 && (imdbVotes < ~25k || fwVoteCount < ~5k)`, tunable. A script can then:
(a) FLAG current 💎 holders that fail the reach test for demotion — Sopranos, Se7en, The Wire
are not hidden by any measure; (b) SURFACE unbadged imports rated ≥8–9 with tiny vote counts as
gem candidates (e.g. O-bal-tan has 106 votes). Build as `audit_gems.py`, review, then curate.

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
