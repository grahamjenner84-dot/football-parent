# SEO / AI-citation changes — 9 August 2026

Baseline snapshot for comparing impact in ~2 weeks (target check-in: **23 August 2026**,
the scheduled reminder already covers the grassroots trial specifically). GSC figures below
are 90-day impressions/position as pulled during today's session, treat them as the
"before" state.

This covers the SEO/AI-citation thread from today's session only, not the separate
Phase 5C content-voice work that landed in parallel.

## 1. Content/FAQ changes made

| Article | Change | Baseline (9 Aug, 90d) | Commit |
|---|---|---|---|
| `parent-guides/what-is-grassroots-football` | Added a "Quick Answer" TL;DR block near the top (5 Q&As, distinct wording from the existing FAQ) — AI-citation trial | 598 impr / pos 11.6 for "grassroots football"; 106 impr / pos 14.2 for "what does grassroots football mean" | `0af7ef6` |
| `academy-trials/football-trials-near-me` | Meta description trimmed 177→147 chars | — | `058dfbc` |
| `parent-guides/what-to-say-after-football-matches` | Meta description expanded 94→154 chars | — | `7cb3083` |
| `football-development/late-developers-in-football` | Added reciprocal internal link to the girls' version | — | `c3ccce5` |
| `parent-guides/what-is-the-junior-premier-league` | Renamed hidden FAQ heading ("Questions parents often ask" → "FAQs: Questions Parents Often Ask") so it triggers FAQPage schema — no content changed | **7,263 impr / pos 6.9** (highest-traffic page touched today) | `4cd81f2` |
| `academy-pathway/football-scholarships-uk` | Added FAQ section (3 new Q&As: payment, application, age) — page had zero FAQ before today | 840 impr / pos 6.7 | `ecda40d` |
| `academy-pathway/football-development-centres-in-london` | Added FAQ section (3 new Q&As) — page had zero FAQ before today | 190 impr / pos 9.0 | `25bbb9e` |
| `academy-pathway/academy-categories-explained` | Added 2 FAQs (Category 2, Category 4) | 6,409 impr / pos 6.2 — **already cited in Google AI Overview for "academy categories" (source #8)** | `a73a36d` |
| `academy-pathway/how-academy-football-works` | Added 3 FAQs (payment, cost, "worth it") | 2,959 impr / pos 7.4 | `e1954a8` |
| `parent-guides/jpl-vs-grassroots-football` | Added 1 FAQ ("What level of football is JPL?") | 2,216 impr / pos 4.7 — **already cited in Google AI Overview for "is jpl better than grassroots" (source #3)** | `6687c4d` |
| `football-gear/best-footballs-by-age` | Added 1 FAQ ("Is a normal football size 4 or 5?") | 5,808 impr / pos 8.8 (2nd-highest-traffic page on the site) | `f1cb713` |
| `academy-pathway/chelsea-fc-development-centre-guide` | Added 2 FAQs (cost, difficulty of entry) | 1,740 impr / pos 6.0 | bundled into `3e880ab` (concurrent session's commit — content verified correct) |

## 2. Recrawl requested, no content change

Investigated for a "gone quiet" pattern (real historical traffic, gone near-silent in the last 7 days). No technical fault found on any of them (200 status, correct canonical, no noindex) — most were simply last-crawled before a site-wide FAQ/schema commit on 25 July, so Google hadn't re-visited yet.

| Article | Baseline (21d, pre-silence) | Last crawled |
|---|---|---|
| `academy-trials/football-trials-near-me` | 91 impr | 4 Jul (longest gap) |
| `football-development/late-developers-in-football` | 109 impr | 14 Jul |
| `girls-football/late-developers-in-girls-football` | 35 impr | 15 Jul |
| `parent-guides/what-to-say-after-football-matches` | 113 impr | 27 Jul |
| `girls-football/girls-academy-vs-grassroots-football` | 50 impr | 14 Jul |
| `girls-football/how-girls-football-academies-work` | 240 impr | 14 Jul |
| `parent-guides/support-child-after-bad-match` | 0 impr since launch (26 May) — indexing requested separately | — |
| `parent-guides/what-is-grassroots-football` | recrawl requested after the Quick Answer trial went live | — |

Not recrawled: `football-gear/best-football-gloves-for-winter-training` (128 impr baseline) — skipped deliberately, mid-summer/heatwave seasonality, not a real signal right now.

## 3. Reviewed, no action taken

| Article | Reason |
|---|---|
| `academy-pathway/crystal-palace-development-centre-guide` | PAA questions were almost entirely about the football club (stadium rebuild, finances), not the development centre — no real FAQ material |
| `girls-football/emerging-talent-centres-explained` | PAA mostly already covered or off-topic drift |
| `parent-guides/futurefit-football-dna-interview-part-1` / `-part-2` | PAA questions were about an unrelated fitness/Pilates brand also called "Future Fit" — false positive, not a real gap |
| `academy-pathway/pdc-vs-ptc-vs-rtc-explained` | No PAA data available for this query at all |
| `academy-pathway/premier-league-development-centres-list` | Has an FAQ-shaped section ("What Changes at Each Club") but it's advice-framed content woven into a narrative, not standalone FAQ material — didn't force it |

## 4. Outstanding — needs real sourcing before drafting

| Article | Question | Why not drafted today |
|---|---|---|
| `academy-pathway/what-is-eppp` | "How many Cat 1 academies are there?" / "What is the Premier League EPPP 10 year report?" | Needs a verified number/document, not a guess |
| `academy-pathway/what-age-do-football-academies-recruit` | "What percentage of football academy players make it?" | Needs a real cited statistic |
| `academy-pathway/how-players-progress-through-football-development-centres` + `parent-guides/are-football-development-centres-worth-it` | "What is the 80/20 rule in soccer?" | Concept confirmed real (Pareto principle applied to coaching), but it's a training-methodology question, loose topical fit for these two development-centre pages — needs a judgement call, not just a citation |

## 5. AI citation baseline (`ai-citation-log.csv`)

Confirmed **not** cited in Google's AI Overview: all 5 grassroots trial queries, and most of the no-FAQ-article batch (`football-scholarships-uk` loses to uksportsscholarships.com/foundationoflight.co.uk/emc-academy.co.uk; `football-sizes for age` loses to forza.com/adidas.co.uk/nike.com).

Confirmed **cited**, the two wins to watch: "academy categories" (source #8) and "is jpl better than grassroots" (source #3).

## How to compare on the next check-in

1. Rank tracker in `/admin/seo` for the specific queries above (grassroots, academy categories, JPL, football sizes).
2. Re-run `LIVE_CONFIRM=yes npx tsx scripts/seo/cli/ai-overview-check.ts "<query>"` for the same keyword list — same tool, same log file, appends a fresh dated row so the CSV becomes a real before/after.
3. Check whether the 6 "gone quiet" pages actually got recrawled (URL Inspection in Search Console) and whether their impressions recovered.
