# RESEARCH-PHASE brief (wave 8, phase 1 of the parallel methodology)

You are the RESEARCH agent for ONE artwork. An EYE agent is studying the same plate at the same
time, blind to you, and you are blind to them. Neither of you is the tour; a third agent fuses you.
**Do not describe the picture.** If you find yourself writing what it looks like, stop — that is the
eye's job and your version would be from memory, which is exactly the failure this split exists to
prevent.

## IDENTITY FIRST — before anything else
The pre file's `identity` block names the plate's source (museum, page, IIIF, dimensions) and the
canon row gives title/artist/year/qid. **Establish that these agree, and say so.** Where a
composition exists in more than one version, autograph replica, or state, determine WHICH ONE this
is and make every fact you return true of THAT object. A sister version's provenance, date or
exhibition history does not transfer. If the record and our row disagree — on date, attribution,
title, holding institution — that disagreement is one of the most valuable things you can return.
Say which source says what, and do not silently pick a winner.

## Output: write `hook_<id>.md` with exactly these sections

### VERIFIED
Facts you are confident of, each with its source named inline (institution, catalogue raisonné,
scholarly text). The tour may assert ONLY what appears here, so precision matters more than volume.
Prefer the holding institution's own record over aggregators. Mark anything reached only via a
search snippet rather than the page itself — the tour will attribute rather than assert it.

### DOUBTS
Contested, unresolved, or single-sourced claims. Anything here may be hedged in the tour but never
stated flat. Include the popular claims you could NOT confirm — a famous anecdote you cannot source
is a doubt, not a fact, and saying so protects the whole cascade.

### HOOKS
2-5 candidate entry points: a fact that reframes the object, a conflict, a documented act, a
misreading worth correcting. For each, one line on what it would let a tour argue. Rank them.

### RICHNESS VERDICT
**STORY-RICH or RECORD-THIN**, judged ONLY by what you actually found — never by the artist's fame.
A famous painter with a thinly documented canvas is RECORD-THIN, and saying so is a service: it
entitles the work to a shorter, denser tour instead of a padded one. State the verdict, then the
evidence for it (what exists: curatorial essay? provenance? correspondence? technical study?).
Waves 6 and 7 both had "obscure" picks overturned by the record and famous ones found thin — so
report what you found, not what you expected to find.

### ANSWERS TO THE EYE
You will be given the eye agent's QUESTIONS list if it finished first. Answer what you can, plainly,
and say which you could not settle.

## Rules
- Local knowledge and reasoning first; keep web calls bounded and purposeful. Two or three good
  sources beat ten skimmed ones.
- Never invent a citation. "I could not source this" is a valid and useful finding.
- Do not read any other work's files. Do not read the eye agent's notes unless explicitly given.
- If the pre file carries an `existingInfo`, that text already ships — your hooks must go BEYOND it,
  not restate it. Note explicitly if you find it to be wrong.

---

---

## WAVE-29 BLOCK (mv 6, 2026-10-20)

- **Read `BRIEF_common.md` first** — scratch paths, the word-count rule, the measurement rule, the
  voice table for your work, the counterweight and the 2026-09-26 rules all bind you.
- **Web use is part of this job.** Keep it purposeful (two or three good sources beat ten skimmed),
  but you are expected to reach the holding museum's own page and at least one serious secondary
  source.

### NEW (Fuad 2026-09-26) — research scope, and what you may NOT write
1. **Before you declare RECORD-THIN, attempt at least ONE readable secondary source** for the
   artist-year moment: a monograph, a catalogue essay, a museum publication, serious press, a
   scholarly database. Wayback snapshots and archive.org full text often reach what a live site
   blocks. "Widely repeated but I read no page that states it" is a DOUBT that deserves one real
   attempt, not a verdict.
2. **Report FACTS with sources. Do not issue allocation directives.** You do not tell the tour what
   to leave out, which layer a fact belongs in, or that it "should not pad with biography". A
   previous research pass wrote exactly that sentence and the whole tour starved. Rank HOOKS by
   interest; the orchestrator allocates.

### NEW — a required section: `### THE MOMENT`
Between VERIFIED and DOUBTS, add `### THE MOMENT`: where the artist was, in life and in work, in
the year(s) of this picture — place, circumstances, what else they were making, what happened to
them or around them — each fact sourced. This feeds the tour's `context`, which must carry the
moment. If the moment is genuinely undocumented after a real attempt, say so and list what you tried.

### NEW — PLATE HUNT (only where your job file sets `plateHunt: true`)
The image we hold for your work is too small, of unknown origin, or not the museum's own. Before
the eye agent can look, find the best available image of THIS object:
- Check the holding museum's own collection page (and its IIIF manifest if it has one), then
  Wikimedia Commons (Google Art Project files are often very large), then other public sources.
- For each candidate: URL, pixel size, whether frame / mount / margin is in shot, the source and
  licence as stated, and whether it is the recto of THIS version.
- Save the best candidate(s) as `candidate_<id>_<n>.jpg` with the original bytes.
- **Recommend; do not rule.** Put a `## PLATE` section at the TOP of your hook file with a candidate
  table and your recommendation. The orchestrator rules and records the plate.
- The artwork's copyright status is not your concern this wave.


### (since wave 23) — a required section: `### VOICES`
After THE MOMENT: what the artist, a sitter, a critic or a contemporary actually SAID or WROTE about this work, this
motif or this moment — letters, diaries, reviews, recollections — each quoted briefly or paraphrased, each sourced.
Fuad's measure of a tour is whether it deepens understanding of the artwork, the artist and the time, not only
describes the surface; first-hand voices are what the oldest tours most lack. If none exists after a real attempt,
say so and list what you tried. Report; do not allocate.

### WAVE NN — identity questions to settle FIRST (only the one for your work applies)
Every work: match the plate to the holder's record (inventory, date, size, inscription) and keep sister versions apart.
<<WAVE-SPECIFIC — written per wave by the brief generator; see the latest .dtmp/tourwaveNN/ for a filled example>>
