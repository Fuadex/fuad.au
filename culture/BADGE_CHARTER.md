> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Badge Charter

The badges are the editorial voice of Culture. Each one is a *claim*, not a genre tag —
it says something did a specific thing at a high level. This charter fixes what each badge
means, how to decide if a title earns it, three exemplars, and a **size band** (roughly how
many titles should carry it before it stops meaning "standout"). Scarcity is the feature:
🪞 cognitive (≈19) is the most trusted badge precisely because it is rare.

Format per badge: **label** — one-line meaning · *test* · e.g. exemplars · band.

Badge key → emoji/label lives in the `HIGHLIGHTS` map in `culture-v2.jsx`. Base badges are
inline in `data.js`/`imports.js`; curated ADDITIONS live in `badges_source.json`
(→ `badges.js`). Audit = UNION of both.

---

## The four families

Badges cluster into four families. Keeping the family in mind stops bleed between
neighbours (the cerebral/mindbending/cognitive trio especially).

1. **Craft** — what is *masterful* about the making.
2. **Effect** — what it *did to you*.
3. **Tone / register** — the emotional key it plays in.
4. **Status / meta** — how it sits in the wider field.

---

## The thinking trio (charter-critical — these three bleed without a boundary)

- **🧠 cerebral** — *makes you think **while** watching*: ideas are on screen, the film is
  reasoning in front of you. Test: could you argue with it? · e.g. 2001, Ex Machina, Stalker,
  The Vietnam War · band ≈ 40–50.
- **🌀 mindbending** — *disorients **during**: structure, twist, or reality-games.* The effect
  lives inside the work; a month later the trick still belongs to the film. Test: did it bend
  the floor while you stood on it? · e.g. The Usual Suspects, Dark, Primer, Inception · band ≈ 35.
- **🪞 cognitive** — *a shift you **kept**.* You describe the world — or the medium — differently
  afterward. Test: **a month later, would you narrate something differently because of it?**
  If the reframe stays inside the plot → that's 🌀, not 🪞. · band ≈ 15–20 (keep it rare).

  **Two sub-flavours of 🪞** (same badge, tracked in the charter, surfaced in the Cognitive
  Hall):
  - **world-lens** — changed how you see *reality / yourself*: Fight Club, TLOU2, A Beautiful
    Mind, Spec Ops: The Line.
  - **medium-lens** — changed what you think *the form itself* can do: Antichamber, Undertale,
    The Witness, One Cut of the Dead.
  - **close-lens** *(defined 2026-07-08, no confirmed holders yet)* — changed how you look at
    *one concrete thing* forever: a technique, an object, a place, a person-type. Narrower
    aperture than world-lens: not "reality," but "I cannot see X the same way." Test: **can
    you name the one thing?** (If the answer is "everything," it's world-lens; if it's "the
    form," it's medium-lens.) Kept in the taxonomy as the third slot even though Fuad can't
    yet point to a personal instance — it's a *watch-for* category: the day a title ruins one
    concrete thing, it has a home. Textbook non-library exemplars: Jaws (open water), Psycho
    (a shower), Uncut Gems (a buzzer), The Act of Killing (a perpetrator's smile).

## Effect family

- **💔 devastating** — *earned emotional demolition* (earned by craft — devastation without
  control doesn't qualify). e.g. Come and See, Grave of the Fireflies, Kiwi! · band ≈ 90.
- **💥 impact** — *visceral in-the-moment force — a gut-punch or a face-punch.* Strictly the
  moment, not the afterglow (afterglow is 🌫️ haunting). e.g. La Haine, Come and See, CoD4
  · band ≈ 50 (tighten from current 63 — demotion shortlist in BADGE_IDEAS).
- **🌫️ haunting** *(new, 2026-07-08)* — *it kept working on you for weeks — uninvited return
  visits, thematic residue.* **Hand-curated only, never auto-applied**, and explicitly NOT
  "it was scary" (dread-by-design is 💀). Correlated with 🪞 but not identical: a shift is
  *kept*, a haunt eventually fades; a haunt can also carry no new lens at all, just weight.
  Test: **weeks later, did it come back to you when nothing prompted it?** Founders (named
  by Fuad): Spec Ops: The Line, Black Mirror, Antichamber · band ≈ 12–15.
- **💀 horrifying** — *designed to disturb / dread.* e.g. Possession, Made in Abyss, Hereditary.
- **🩸 intense** — *sustained brutality / pressure* (a state, not a jolt). e.g. Uncut Gems,
  Whiplash, Come and See.
- **⚡ thrilling** — *pure adrenaline / propulsion.* e.g. Mad Max: Fury Road, CoD4, T2.
- **😂 funny** — *you actually laughed, repeatedly* (not "contains jokes"). Tighten to ≈ 25.
  e.g. Fleabag, In Bruges, Curb.

## Tone / register family

- **🥲 bittersweet** — *laughter laced with ache.* e.g. Cinema Paradiso, Soul, Aftersun.
- **🗯️ satire** — *pointed social/political bite* (the comic subset of social x-ray). e.g. Network,
  The Great Dictator, Dr. Strangelove.
- **🤪 absurdist** — *surreal/anarchic nonsense.* e.g. Rick and Morty, Duck Amuck, Odrzucone.
- **😬 squirm** *(new)* — *comedy of discomfort; you laughed and flinched.* e.g. Fleabag, Curb,
  The Office (UK), Baby Reindeer · band ≈ 12.
- **🍵 gentle** *(new)* — *warm, low-stakes, restorative; kindness as the mode.* Not comedy —
  a register. e.g. Hilda, Joe Pera, My Neighbors the Yamadas, Ernest & Celestine, Clarkson's
  Farm · band ≈ 12.
- **⏳ slowburn** — *rewards patience; accretes.* e.g. Burning, Mad Men, The Americans.
- **🌌 atmosphere** — *immersive mood/world-feel* over plot. e.g. Twin Peaks, Stalker, Mushishi.

## Craft family

- **🎬 direction** · **✍️ writing** · **📷 cinematography** · **🎭 acting** · **🎵 score** —
  standout in that discipline. Reserve for genuine standouts, not "good".
- **🎨 visuals** — *gorgeous* (beauty of image). **Over-broad at 113 — needs a pruning pass**
  (see IDEAS): should not be a synonym for "is animation". Target ≤ 60.
- **🕶️ style** — *bold/quirky aesthetic identity* (distinct from gorgeous). e.g. A Clockwork
  Orange, Mr. Robot, Fear and Loathing.
- **🗺️ worldbuilding** — *a world unto itself.* e.g. The Expanse, BioShock, Nausicaä.
- **📐 formal execution** *(new)* — *a chosen constraint, exhausted; the format IS the
  achievement.* Distinct from 🃏 singular (unrepeatable object) — this is a *deliberate
  limit* pushed to its limit. e.g. 12 Angry Men (one room), Dekalog (ten films / one
  commandment each), Locke (one car), One Cut of the Dead, Antichamber · band ≈ 15.
- **🔬 social x-ray** *(new)* — *dissects a society / class / institution under pressure*
  (przekrój społeczny). The non-comic superset of satire. e.g. La Haine, The Housemaid,
  The Wire, Parasite, Squid Game, Corpus Christi, City of God · band ≈ 25.

## Status / meta family

- **💎 gem** — *a personal treasure: loved far beyond its fame — the ones you press into
  people's hands.* Provisional definition (2026-07-08, pending Fuad's taxonomy rework): the
  common thread across the current 72 holders is **advocacy** — not "underseen" as a hard
  gate (Se7en, The Sopranos qualify) but "my rating is way ahead of how often this gets
  brought up / how it's remembered." Test: *would you push it on someone unprompted?*
  `audit_gems.py` still surfaces high-rating / low-reach candidates as a discovery aid, but
  reach is a signal, not a gate. No demotions applied.
- **🕰️ ahead** — *ahead of its time.* e.g. Network, Blade Runner, RoboCop.
- **🃏 singular** — *an unrepeatable object, no formula, no genre slot.* e.g. Belladonna, Kiwi!,
  Holy Motors. (Tightened away from formal-execution: 🃏 = *sui generis*; 📐 = *constraint
  exhausted*.)

---

*Open/unresolved definitions are tracked in `BADGE_IDEAS.md` (close-lens 🪞, 🌫️ haunting,
computable 💎, the "floored me" replacement, the 🎨 visuals prune). Those are earmarked for a
Fable 5 pass.*
