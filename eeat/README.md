# E-E-A-T audit and deslopify record

First run: **2026-09-22**. This folder is the durable record of the site's
E-E-A-T (Experience, Expertise, Authoritativeness, Trust) health, so future
work builds on the corrected picture instead of re-deriving raw scores each
time.

## What's here

- `score-eeat.mjs` — reproducible mechanical scorer. Parses every
  `content/**/*.mdx` for measurable signals and scores each article 0-100 on
  the four pillars. Run from repo root: `node eeat/score-eeat.mjs` (writes
  `eeat-scores-raw.json`).
- `eeat-scores.json` — the curated record: mechanical scores for all 86
  articles, plus semantic `voice` / `slop` / `bucket` fields for the articles
  that have had a semantic read. **This is the file to read first next time.**
- `eeat-scores-raw.json` — raw output of the scorer (regenerated, not edited).
- Live dashboards (private artifacts):
  - Per-article scores: https://claude.ai/artifact/HaX31yQkNzDcwwjPBQkDhi
  - Expert question bank: https://claude.ai/artifact/FwTVtkW8NuY2R13RY2cixD

The expert question bank also lives as a skill reference at
`.claude/skills/football-parent-articles/references/expert-question-bank.md`.

## The headline: two measures, and why the mechanical one is only a flag

The **mechanical** scorer counts signals (callouts, citations, words,
internal links). It is reliable for citations and structure but **wrong in
both directions on Experience**, because it scores "Experience" as the count
of `<ParentNote>`/`<ExpertOpinion>` boxes. That misses Graham's voice
whenever it's written into the prose instead of boxed, and it over-rates a
well-sourced but impersonal page.

The two semantic scores, both 0-100: **voice** = how much genuine
first-hand author/expert experience the article shows (higher is better);
**slop** = density of AI-slop tells (reframe clichés like "it isn't X, it's
Y", "honest/honestly", em dashes, reassurance filler, templated phrasing) —
**higher is worse**, the opposite direction to every other score here.

Proven in the 2026-09-22 proof batch (8 articles read semantically):

| Article | Mechanical "Experience" | Semantic voice | Slop | Bucket |
|---|---|---|---|---|
| what-to-say-after-football-matches | 15 | 88 | 26 | C |
| biggest-football-parent-mistakes | 55 | 92 | 24 | C |
| football-burnout | 100 | 90 | 22 | C |
| what-happens-at-academy-trials | 15 | 25 | 60 | B |
| how-girls-football-academies-work | 15 | 18 | 66 | B |
| playing-up-an-age-group-football | 15 | 25 | 60 | B |
| aston-villa-development-centre-guide | 15 | 8 | 62 | B |
| what-is-eppp | 15 | 8 | 42 | B |

**Rule: trust the bucket, not the mechanical number.** The bucket comes from
a read; the mechanical score only decides which articles to read.

## Corpus picture (mechanical, all 86 articles)

Averages: Overall 70, Experience 56, Expertise 98, Authoritativeness 44,
Trust 82. Depth is near-universal; the movement is all in **Experience** and
**Authoritativeness**.

## The buckets (the deslopify plan)

- **A — citations only.** Voice already fine; just under-sourced. Claude can
  do these directly: add ~2 authoritative citations per 1000 words (FA,
  Premier League, UEFA, NCBI, gov.uk). Low risk, factual.
- **B — needs Graham's voice or an expert quote.** Well-structured but
  impersonal or templated; citations won't fix them. These need a first-hand
  story or a named-expert quote. This is the hard-to-copy moat.
- **C — already personal; leave the voice alone.** Cite and tidy slop only;
  do not rewrite the prose. These are the site's strongest assets.

## Systemic gaps found

1. **Authoritativeness is the weak pillar (44%).** 36 of 86 articles carry
   under 1 citation per 1000 words; a band cite zero. Worst clusters:
   Academy Trials, Parent Guides, Girls' Football.
2. **31 articles are below the 2-callout minimum**, but per the proof batch
   many carry inline voice the count misses — semantic-read before acting.
3. **The club development-centre guides are find-replace templates**
   (Arsenal, Aston Villa, Brentford, Chelsea, Fulham, Tottenham, Leeds, West
   Ham, Crystal Palace + the PL list). Classic scaled-content risk. **One
   reusable scout quote** deslopifies all ~10 at once — highest single lever.
4. **Slop is structural, not just lexical.** The recurring tell is the
   reframe reflex ("it isn't X, it's Y", "X matters less than Y"), plus
   "honest/honestly", "it's worth...", and reassurance filler. Present even
   in strong (bucket C) articles; cheap to strip.

## Expert recruit priority (by leverage)

1. **Scout / recruitment lead** — 10-article trials cluster + the ~10
   templated club guides via one reusable quote. Highest leverage.
2. **Girls-pathway coach (ETC/RTC)** — weakest whole cluster, no expert yet.
3. **Academy coach / manager** — biggest cluster; timetable/release/cost reality.
4. **Sports scientist / physio** — maturation cluster (Dr Sean Cumming's Bath
   group already cited in bio-banding: a warm lead).
5. **Sports psychologist** — parent-support cluster (mostly bucket C; a top-up).
6. **Registered agent / intermediary** — 2 high-trust articles.
7. **Podiatrist / boot-fit** — gear cluster; optional.

Existing experts on file (see `expert-quotes.md`): Martin Brock (JPL), Paul
Barry (Football DNA), FutureFit. The recruits above are the gaps those three
don't cover.

## How to extend this next time

1. `node eeat/score-eeat.mjs` to refresh mechanical scores after new/edited
   articles.
2. For any article you're about to touch, do a semantic voice/slop read and
   record `voice` / `slop` / `bucket` / `expert` in `eeat-scores.json` so the
   record grows. Only 8 of 86 carry semantic fields so far.
3. Act by bucket: A = Claude adds citations; B = collect a Graham story or an
   expert answer from the question bank; C = strip slop and cite, never
   rewrite the voice.
4. Follow the CLAUDE.md SEO guardrails when editing live pages (one lever per
   commit, log to the current `seo-changes-*.md`, 10-14 day watch after).
