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
- `eeat-scores.json` — the curated record: mechanical scores plus semantic
  `voice` / `slop` / `bucket` / `expert` fields for **all 86 articles**
  (full pass completed 2026-09-22), and a `semanticSummary` block. **This is
  the file to read first next time.**
- `bucket-b-worklist.md` — the 36 Bucket-B articles that need voice or an
  expert, each with the section to strengthen and a draft interview question,
  grouped by expert archetype. The actionable "what to do next" list.
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

## Full semantic pass result (2026-09-22, all 86 articles)

Averages: **voice 46/100, slop 40/100**. Buckets: **A = 8, B = 36, C = 42**.
So nearly half the site (42 articles) already carries genuine first-hand
voice and just needs protecting; 36 need voice or an expert; only 8 are a
pure citations job.

**Bucket-B expert demand** (how many B articles each archetype would fix) —
this is the real recruit priority, with counts:

| Expert | B articles |
|---|---|
| Scout / recruitment lead | 11 |
| Academy coach / manager | 9 |
| Girls-pathway coach (ETC/RTC) | 7 |
| Graham first-person (no expert) | 3 |
| Sports scientist / physio | 2 |
| Podiatrist / boot-fit | 2 |
| Registered agent | 1 |
| Sports psychologist | 1 |

The regex was confirmed a **false negative on 8 articles** (mechanical
Experience <=55 but real voice >=60), incl. what-to-say (15->88),
are-development-centres-worth-it (15->88), support-child-after-bad-match
(55->88). It also over-rated impersonal-but-cited pages. Trust the bucket.

## The buckets (the deslopify plan)

- **A — citations only.** Voice already fine; just under-sourced. Claude can
  do these directly: add ~2 authoritative citations per 1000 words (FA,
  Premier League, UEFA, NCBI, gov.uk). Low risk, factual.
  **Exception: gear/product articles (`content/football-gear/*`) are exempt
  from external citations** (Graham's rule, 2026-09-22, now in CLAUDE.md):
  they are conversion pages and outbound links pull readers away from the
  affiliate click, so their low external-citation count is by design, not a
  gap. `best-shin-pads-for-kids-football`, though scored Bucket A, needs no
  citation work. Internal links to other Football Parent articles are fine.
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
Barry (Football DNA), FutureFit, Matt Baxter (youth athlete mindset coach,
2026-09-28), Girls United team (girls' grassroots, 2026-10-06; partial fill for #2), Chris Robinson (academy recruitment head, 2026-10-10; fills #1 for the trials cluster). **Sports psychologist (#5) is now filled** by Matt Baxter; the
other recruits above are still open.

## Update 2026-09-28: Matt Baxter interview + 8 expert quotes

- New article `/parent-guides/matt-baxter-young-footballer-mindset-interview`
  (8-question Q&A, Bucket C, voice 85, slop 28).
- One `<ExpertOpinion>` from it on each of 8 parent-support articles, each
  linking back to the interview: understanding-academy-release,
  what-to-say-after-football-matches, support-child-after-bad-match,
  build-confidence-young-footballers, why-isnt-my-child-improving-at-football,
  football-burnout, biggest-football-parent-mistakes, jpl-vs-grassroots-football.
  what-to-say-after-football-matches also got a Graham `<ParentNote>` (a car
  journey he got wrong).
- **understanding-academy-release moved B to C** (voice 42 to 60): it was the
  only sports-psychologist Bucket B article, and now carries Paul Barry (why
  clubs release) plus Matt Baxter (identity afterwards). The other seven were
  already C; voice nudged up 1-4 points each.
- New totals: **87 articles, A = 8, B = 35, C = 44; voice 47, slop 39.**
  Expert demand now has no sports-psychologist entry.
- All 8 edited pages are on the 10-14 day watch list (to about 2026-10-10).
  Commits and sections are in `seo-changes-2026-09-06.md`.

## Update 2026-10-06: Girls United interview + 3 expert boxes

- New article `/girls-football/girls-united-daughter-football-interview`
  (10-question Q&A with the Girls United London team, Bucket C, voice 60,
  slop 30; voice held down because the answers are general advice).
- One `<ExpertQA>` box on each of girls-football-trials,
  late-developers-in-girls-football and girls-academy-vs-grassroots-football
  (voice +12 each). **All three stay Bucket B** and girls-pathway-coach demand
  stays 7: a grassroots organisation's general answers are a partial fill, not
  the pathway coach this cluster needs (recruit #2 above is still open). Their
  mechanical experience score jumps to 90 only because the scorer counts the
  ExpertQA tag as interview material; trust the bucket.
- New totals: **88 articles, A = 8, B = 35, C = 45; voice 47, slop 39.**
- Watch list to about 2026-10-20. Commits and sections are in
  `seo-changes-2026-09-06.md`.

## Update 2026-10-10: Chris Robinson interview + 14 expert boxes

- New article `/parent-guides/chris-robinson-football-scout-interview`
  (10-question Q&A with the Head of Academy Recruitment at Southampton FC,
  ex-Chelsea academy; Bucket C, voice 85, slop 25). **First real fill for the
  scout / recruitment lead recruit (#1 above).** Also given the standard
  `<AffiliateDisclosure />` under its Amazon book link, which the scorer
  flagged as the only affiliate page without one.
- One `<ExpertQA>` box (internal link to the interview only, Graham's rule)
  on each of 14 pages: the trials cluster (what-happens-at-academy-trials,
  football-academy-trials-uk, football-trials-near-me,
  how-football-clubs-recruit-young-players, how-football-scouts-identify-players,
  what-do-academy-coaches-look-for), what-age-do-football-academies-recruit,
  how-to-join-a-football-academy, the agent guide,
  are-football-development-centres-worth-it, and the Brentford, Aston Villa,
  Tottenham and Premier League development-centre guides. Q1 is used on two
  pages only, and repeat passages are cut differently so no two boxes match.
- **New bucket rule (Graham, 2026-10-10): a genuine quote from the expert a
  page needed counts as the Bucket B fix, so the page moves to C.** The voice
  score still records how much of the page is personal, and the note says
  where a Graham story would lift it further. Under this rule every B page
  that got a box is now C. The agent guide carries a caveat (a recruitment
  head, not a registered agent). The four templated club guides are C on
  voice but still need club-specific detail to stop reading as copies.
- Two line fixes to agree with him: trial length on
  what-happens-at-academy-trials, and scouts going to the coach first on
  how-football-scouts-identify-players.
- New totals: **94 articles, A = 8, B = 23, C = 63; voice 50, slop 38.**
  Expert demand: academy coach 8, girls-pathway coach 7, Graham 3, sports
  scientist 2, podiatrist 2, scout 1 (football-development-centres-in-london,
  which needs a travel story he doesn't cover).
- Watch list to about 2026-10-24. Commits and sections are in
  `seo-changes-2026-09-06.md`.

## Update 2026-10-10: Bucket A citations on five pages

- 14 source links on factual claims only (rules, ages, research), each source
  different on its page, most already cited elsewhere on the site:
  how-academy-football-works (4), jpl-and-academy-football (3),
  is-private-football-coaching-worth-it (4), academy-categories-explained (1),
  chelsea-fc-development-centre-guide (2). All five **A to C**.
- Context for next time: Google treats clear sourcing as a trust signal, but
  outbound links are not a direct ranking factor, so this is done claim by
  claim, never to hit a links-per-1000-words figure. Experience and expert
  quotes matter more.
- Left at A: how-football-scouts-identify-players (watch window to ~24 Oct),
  best-shin-pads-for-kids-football (gear, exempt), football-development-centres-near-me
  (already link-heavy).
- Accuracy fixes the same day: researching the sources turned up five errors
  on these pages, all corrected (one commit each): the academy-categories
  travel-rule example (U9-U11 one-hour limit applies to every category) and
  "audited every year"; the private-coaching FAQ that said 1-to-1 beats small
  groups for decision-making, against its own article, plus an em dash;
  "FA-registered academies" (academies are licensed under the EPPP); Premier
  League 2 listed separately from U21; Chelsea's tiers said to run "at
  Cobham". Worth repeating on future citation passes: checking a page's facts
  against sources is where the real value is, more than the links.
- New totals: **94 articles, A = 3, B = 23, C = 68; voice 50, slop 37.**

## How to extend this next time

1. `node eeat/score-eeat.mjs` to refresh mechanical scores after new/edited
   articles.
2. All 86 carry semantic fields as of 2026-09-22. Re-read an article's voice/
   slop and update its `semantic` block in `eeat-scores.json` after you edit
   it, so the record tracks the change (bump `reviewed` to the new date).
3. Act by bucket: A = Claude adds citations; B = collect a Graham story or an
   expert answer from the question bank; C = strip slop and cite, never
   rewrite the voice.
4. Follow the CLAUDE.md SEO guardrails when editing live pages (one lever per
   commit, log to the current `seo-changes-*.md`, 10-14 day watch after).
