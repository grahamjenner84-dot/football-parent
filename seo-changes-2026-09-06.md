# SEO / AI-citation changes — 6 September 2026

New append target, opened by the check-in that closed [22 August's log](seo-changes-2026-08-22.md). See that file's final section for the 6 September check-in results.

## Gone-quiet pages and `support-child-after-bad-match` — resolved (finally used the real URL Inspection API)

`support-child-after-bad-match` had been flagged on 9 Aug and 22 Aug as needing a Search Console URL Inspection that never actually happened. Built a one-off script (`tmp-url-inspection.ts`, deleted after use) reusing `lib/gsc.ts`'s existing service-account credentials (`webmasters.readonly` scope is sufficient for the read-only `urlInspection.index:inspect` endpoint — no new credentials needed, no DataForSEO spend) and called it for all 4 pages on this check-in's list.

- **`academy-pathway/premier-league-development-centres`**: not a silence issue at all. It's a permanent 301 redirect to `/academy-pathway/football-development-centres-near-me`, added 2 July (`next.config.ts`) — confirmed live via `curl` (308 → 200, correct canonical on the destination). The "gone quiet" flag is just Google finally consolidating the old URL out of its index in favour of the redirect target, which is the intended outcome of a 301. No action needed.
- **`support-child-after-bad-match`: root cause found.** URL Inspection verdict: **"URL is unknown to Google"** — Google has never crawled or indexed this URL at all, despite being live since 26 May, present in `app/sitemap.ts`, and internally linked from 9 other articles plus the `/parent-guides` index. This fully explains the 90+ days of zero impressions — it isn't a ranking, content, or technical-block problem (canonical, robots.txt, robots meta and X-Robots-Tag all checked clean separately), Google simply hasn't fetched the page. **Needs Graham to open the URL Inspection tool in Search Console and click "Request Indexing"** — that's a UI action the read-only API scope can't perform. Direct link: `https://search.google.com/search-console/inspect?resource_id=sc-domain:footballparent.co.uk&id=bB2B3_pO-qCz0hx-P3hzTQ&utm_medium=link&utm_source=api`.
- **`what-to-say-after-football-matches`**: confirmed properly indexed (verdict PASS, "Submitted and indexed", last crawled 9 Aug, robots allowed, correct canonical). Its recent quiet week (2 impr week of 28 Aug, 1 impr so far in Sept, against a naturally spiky 10-67/week baseline) is real but not caused by any indexing or technical fault — most likely normal fluctuation on an already low-volume page. No action taken; continuing to watch rather than editing on a 1-2 week low-sample dip.
- **`girls-academy-vs-grassroots-football`**: same result — confirmed indexed (verdict PASS, last crawled 9 Aug), referring URL from `/girls-football` confirmed, technically clean. Same call: watch, don't edit yet.

**Minor, separate finding surfaced while checking `support-child-after-bad-match`:** its MDX frontmatter `date` field reads `2026-06-15`, but the file was actually first committed/published `2026-05-26` (matching what the SEO logs have called its launch date throughout). This means the page's own JSON-LD `datePublished` (rendered by `ArticleLayout.tsx`) has been wrong by about 3 weeks since launch. Not the cause of the indexing problem, but worth a one-line frontmatter fix once the page is actually being indexed and rankings are being tracked, so the structured data matches reality. Not fixed in this session (deliberately no content change while root-causing the indexing gap, and it has no visitors yet to disturb).

## `support-child-after-bad-match` still not indexed after repeated manual requests — anchor-text mismatch found and fixed, 6 September 2026

Graham reported the URL Inspection status had progressed to "Discovered - currently not indexed" despite requesting indexing multiple times. Re-ran the URL Inspection API check: confirmed — Google now knows the URL exists (via sitemap + referring URLs) but still hasn't fetched it at all (`pageFetchState` still unset). Repeated manual re-requests don't help past this point; that's Google's own crawl queue, not something resubmission speeds up.

Ruled out "young/low-authority site, new pages just take a while" as the general explanation: `equal-playing-time-in-grassroots-football`, published 28 Aug, got indexed and picked up real impressions within days. So something specific to this one page, not a site-wide crawl-budget shortage.

**Found the likely cause: every inbound link's anchor text contradicted the article's own stated angle.** Checked all 9 links to this page across the site — every one used "supporting/talking to your child after a bad match" (single-match framing). The article's own opening paragraph explicitly disclaims that framing: "This article is not about the single bad match... the [what to say after football matches] guide covers that." From the outside, via anchor text alone, this page looked like a duplicate of the already-indexed, already-performing `what-to-say-after-football-matches` sibling — a plausible reason Google keeps deprioritising the crawl.

**Fixed: rewrote anchor text on all 9 inbound links plus the `/parent-guides` category card title (10 edits total)**, to reflect the actual sustained-confidence-dip/multiple-bad-performances angle instead of the single-match framing:
- `academy-pathway/how-much-does-academy-football-cost.mdx`: "supporting a child through a sustained confidence dip"
- `academy-pathway/understanding-academy-release.mdx` (Related Articles): "When Your Child Is Struggling in Football" (the article's real title)
- `coaching/equal-playing-time-in-grassroots-football.mdx`: "talking to your child's coach about a sustained dip in form"
- `football-development/build-confidence-young-footballers.mdx` (See: list): "When Your Child Is Struggling in Football"
- `football-development/football-burnout.mdx` (inline): "helping a child through a genuine confidence dip" (its own Related Articles bullet already used the correct title, untouched)
- `football-gear/veo-camera-alternatives.mdx` (Related Articles): "When Your Child Is Struggling in Football"
- `girls-football/late-developers-in-girls-football.mdx` (Related Articles): "When Your Child Is Struggling in Football"
- `parent-guides/biggest-football-parent-mistakes.mdx` (Related Articles): "When Your Child Is Struggling in Football"
- `parent-guides/what-to-say-after-football-matches.mdx`: fixed both its inline "See:" link and its Related Articles bullet to "When Your Child Is Struggling in Football" — this is the sibling page itself, so its own link was the most direct source of the duplicate-looking signal
- `app/parent-guides/page.tsx`: category card `title` changed from "Support Your Child After a Bad Match" to "When Your Child Is Struggling in Football" (its `description` already correctly said "Three or four bad matches in a row is different from one bad match")

Anchor-text only — no headings, structure, meta, or article content touched on any of the 9 linking pages (2 of which, `what-to-say-after-football-matches` and `football-burnout`, carry real live traffic). `npm run build` passes, all routes generated. Not yet committed or deployed.

**Not expected to be instant.** This doesn't force indexing by itself — Google still has to recrawl the linking pages to pick up the new anchor text, then reassess and crawl the target URL. Worth checking `support-child-after-bad-match`'s inspection status again in 1-2 weeks rather than repeating manual Request Indexing clicks in the meantime.

## JPL explainer page CTR — checked, no title change recommended

Live competing-titles SERP pull for "what is jpl football" and "what is the junior premier league" (`serp/google/organic/live/advanced`, depth 10, ~$0.01): both are branded/navigational SERPs. Top organic results are almost entirely JPL's own official properties (juniorpremierleague.com, its Facebook, Instagram, LinkedIn) plus a rival junior league's own site (jplwarriors.com) and a Facebook group thread — not editorial content we could out-title. Both queries also carry a Google AI Overview. At the moment of this check, our own *comparison* page (`jpl-vs-grassroots-football`) was the one showing at #7 for "what is jpl football", not the explainer page GSC's smoothed data shows as dominant — consistent with the position-6-8 volatility already on record, not a new problem. Conclusion: the 0% CTR at position 6.4-6.8 is a branded-SERP/intent problem, not a title problem — a rewrite is unlikely to move CTR here. No change made. Not revisiting unless the SERP's composition changes (e.g. official JPL properties drop off, or the AI Overview disappears).

## Gear FAQ pages — AI Overview recheck (22 Aug plan)

Re-ran the 5 queries live (~$0.02 actual): "football boots for wide feet" and all 3 shin-pad phrasings are **still not cited** in their AI Overviews, same competitor sets as 22 Aug (reddit.com/sportsdirect.com/prodirectsport.com for boots; fourfourtwo.com/footballboots.co.uk/nike.com and fourfourtwo.com/soccer.com/forza.com/adidas.co.uk for the two shin-pad queries). The one existing citation, "wide fit football boots kids" (#5), **held**. Same conclusion as the JPL/grassroots FAQ trial: the FAQ additions haven't moved AI Overview citation status either way after 2 weeks. Appended to `ai-citation-log.csv`.

## Coaching cluster keyword audit, focused on `equal-playing-time-in-grassroots-football` — 6 September 2026

Graham asked whether the equal-playing-time article is optimised for the right terms (e.g. "equal game time football"). Ran live Google Ads search volume for 8 candidate phrasings via `page-keyword-research.ts`: "equal playing time football", "equal game time football", "fair playing time football", "equal minutes football", "equal playing time rules football", "grassroots football playing time rules", "rolling substitutions grassroots football", "fa rules equal playing time" — **all 8 came back null**, including "equal game time football" specifically. The keyword_ideas discovery pass (seeded from the same terms) surfaced only generic unrelated "football" noise (quiz, betting/tipping, player names) — nothing topically relevant. This confirms the original 22 Aug tracker research ("unmeasurable head-term volume... topical-authority play, not a traffic play") extends to this specific phrasing too: there's no measurable-search-volume version of this topic to target a title around.

**Tooling bug hit again, fixed in place:** the same Git Bash leading-slash path-mangling bug (previously seen on IndexNow and `content-backlog.ts mark`) corrupted this run's `target_url` on 8 `keywords` rows (including one pre-existing row, id 236, whose real target_url got overwritten) to `https://www.footballparent.co.ukC:/Program Files/Git/coaching/equal-playing-time-in-grassroots-football`, and left `discovery_runs` id 33 with a null `page_id`. Both corrected directly in `seo-data/database/seo.db` (8 keyword rows repointed to the real URL, page_id set to 4535). Confirms this bug isn't specific to any one script — worth remembering to prefix `MSYS_NO_PATHCONV=1` on any script here taking a leading-slash path argument, not just IndexNow/tracker calls.

**Live PAA/AI Overview check on 4 of the null-volume queries (~$0.012 actual, 1 of 5 failed on a transient fetch error):** AI Overview present on all 3 that returned data ("equal game time football", "fair playing time football", "rolling substitutions grassroots football"), footballparent not cited on any — expected for a 9-day-old page. Checked the article's actual coverage against the PAA questions returned: "How to calculate equal game time?" and "Should kids get equal playing time?" are already covered by existing sections; "What age does rolling substitution stop applying?" is already an existing FAQ entry, near-verbatim match to the live PAA's "What age does roll-on roll off subs stop." No content gap found — the article already covers what real searchers are asking.

**The one genuine finding: a recurring "calculator" signal.** Related searches on 3 separate query variants independently surfaced a playing-time-calculator angle: "equal game time football calculator", "fair playing time football calculator", "equal playing time calculator football", "playing time calculator" (twice). The article already has a deliberate stance against this (line ~53: "a bare online calculator... still leaves you without any sense of why the number is what it is"), positioning itself as the explainer rather than the tool. Given there's no search-volume case for a content/title change here, and the market signal points at a *tool* rather than an article, the real opportunity is product-shaped, not content-shaped — it lines up with the Coach App's own fair-rotation/team-selector feature already covered in the equal-playing-time article's inbound-linking to `/football-parent-coach-app` (see 4 Sept log entries). Not actioned — flagging as a possible angle if a public-facing calculator/tool page is ever considered, not a recommendation to build one now.

**No change made to the article or its title/meta** — the audit confirms it's already well-aligned to real query language for a page in a genuinely low/no-measurable-volume topic, and reinforces the original "topical authority, not a traffic play" framing rather than overturning it.

## New article: Aston Villa Development Centre Guide

Published `/academy-pathway/aston-villa-development-centre-guide` (Academy Pathway, ~1,800 words). Covers the Foundation's six age-banded Coaching/Skills Centres vs the Category One academy at Bodymoor Heath (held since 2014), the Girls Academy's FP/YDP/PDP structure, and the Under-12 national-recruitment rule. Next in the club dev-centre cluster after Brentford (highest remaining unwritten volume, ~280/mo per the 11 Aug opportunity scan). No direct Graham experience of Villa - pending expert-quote request logged in `expert-quotes.md`, zero real callouts, same precedent as Tottenham/Brentford/Leeds.

Added to `app/sitemap.ts` and the `/academy-pathway` category page. Cross-linked from the `premier-league-development-centres-list` pillar and, following the same inbound-linking pattern used for Brentford, from `academy-categories-explained`, `development-centres-vs-academies` and `what-is-eppp`.

**Caught during a football-parent-review audit before publish settled:** the article's first draft claimed Category One clubs recruit nationally "from age 14" - wrong, corrected to the accurate Under-12 rule already documented (and now independently corroborated) in `academy-categories-explained.mdx`. Fixed everywhere it appeared (body, FAQ, summary) before this was committed anywhere.

## Safeguarding citation removed from Aston Villa and Tottenham articles - couldn't verify live

The review also flagged that both articles cited `tottenhamhotspur.com/teams/men-u18/academy-info/trials/` for a specific named-scam-operator claim ("Tony's Soccer School" / "Go Pro"). Tried 3 current URL variants on that domain; all resolved to a generic U18 team-news hub with no scam-warning content. Couldn't confirm the claim is still live on that exact page, so removed the named-operator detail from both articles rather than keep an unverifiable accusation against a specific named business. Kept the general "verify before paying, don't hand over your child's details" safeguarding advice in both, which doesn't depend on that one citation. Graham's call, not a unilateral edit.

- `academy-pathway/aston-villa-development-centre-guide.mdx`: new article shipped without the claim from the start (caught pre-publish-settle in review)
- `academy-pathway/tottenham-development-centres-explained.mdx`: live article, safeguarding section edited to drop the named-operator paragraph only - no other content, structure or meta touched

## New article: Martin Brock JPL interview, Part 2

Published `/parent-guides/jpl-martin-brock-interview-part-2` (Parent Guides, ~2,025 words). Second half of the JPL CEO interview (questions 7-11, real Q&A supplied directly by Graham from his own interview with Martin Brock): balancing results with development, the JPL's relationship to scouts/academies, common parent misconceptions, matchday conduct, and how families should think about grassroots vs JPL.

Added to `app/sitemap.ts`. Part 1 (`jpl-martin-brock-interview-part-1`) updated: its "Part 2 will follow separately" placeholder line now links forward to Part 2, and Part 2 added to Part 1's Related Articles. Part 2 links back to Part 1, plus cross-links to `jpl-vs-grassroots-football`, `jpl-and-academy-football`, `how-football-scouts-identify-players`, `how-to-get-into-the-jpl` and `what-to-say-after-football-matches`.

Content tracker `mark` run hit the known Git-Bash leading-slash path-mangling bug again (same one noted earlier in this log for the coaching-cluster audit) — corrupted a fresh row's URL to a `C:/Program Files/Git/...` path. Re-ran with `MSYS_NO_PATHCONV=1` to mark the real row correctly, then deleted the corrupted stray row (id 5197) directly from `seo-data/database/seo.db`.

## `equal-playing-time-in-grassroots-football` - "game time" phrasing added, overturning this morning's "no change" call

Graham asked to analyse playingtimecalculator.com, which he's aware is ranking #2 for "equal game time football" (~300 searches/month). Live SERP check confirmed footballparent.co.uk isn't in the top 99 organic results for that exact query at all yet (page is 9 days old). Competitor is a thin, single-purpose multi-sport calculator site (7 total ranked keywords, domain rank 147, 94 referring domains but spam score 43 - mostly junk directory links) - not a strong moat, but our own backlink profile is essentially nonexistent by comparison (domain rank 0, 10 backlinks total site-wide, first indexed July 2026).

Labs `ranked_keywords` on the competitor showed real volume on shorter variants ("game time football" 320/mo at their #1, "playing time calculator" 260, "equal playing time calculator" 210) that directly contradicted this morning's "Coaching cluster keyword audit" entry above (8 phrasings checked via the canonical Google Ads volume endpoint, all null, "no change" concluded). **Re-ran the same canonical `keywords_data/google_ads/search_volume` check Graham pointed out we normally use, specifically on the shorter phrases** - confirms all three as real (320/260/210), while "equal game time football" itself stays null. Reconciled: this morning's audit tested only the longer 4-word phrase; it never tested the shorter phrases that actually carry the volume. Same tool both times, different keyword strings - not a data-source discrepancy.

**Change made** (additive only, one lever): added "(often called equal game time)" to the intro paragraph, plus one new FAQ entry ("Is 'game time' the same as 'playing time' in football?") clarifying the terms are interchangeable. No headings, links, or existing content removed. `npm run build` passes. Committed separately: `502ed89`.

Title/meta not changed - per the paste-ready-alternatives rule, options need putting to Graham directly rather than auto-applied.

**Not actioned (flagged for a separate decision, not this change):** the SERP is dominated by literal calculator tools at the top positions (#2, #11 mention, #18, #36, #38 among the first 40 results). An embedded interactive calculator would target the tool-intent side of this query directly but is real dev scope - deferred as a distinct follow-up, not bundled into this content edit.

Also hit the known Git-Bash leading-slash path-mangling bug a third time on `page-keyword-research.ts` (same bug as the two entries above) - left `discovery_runs` id 34 orphaned with `page_id NULL`. Re-ran with `MSYS_NO_PATHCONV=1` (cache hit, no extra cost) to persist correctly under page 4535, then deleted the empty orphaned row.

Live cost this session: SERP + Labs domain/backlink checks ~$0.10, plus two `page-keyword-research.ts` search-volume/keyword-ideas runs ~$0.11 (second was a free cache hit). ~$0.20 total.

**Watch:** don't reintroduce a title/meta change here without putting explicit before/after alternatives to Graham first.

## Same page, same day: proper keyword discovery + Coach App calculator positioning (deliberate exception to the watch-window rule above)

Graham asked for the keyword research redone properly (discover -> shortlist -> canonical volume, per the seo-content skill's sequence, rather than guessing phrasings), and separately asked whether the Coach App could be positioned as the "calculator" this SERP rewards, since it's genuinely a season-long equal-game-time tool rather than a one-off.

**Discovery corrected the picture further:** `keyword_ideas` (5 seeds) + `related_keywords` (2 seeds) surfaced "football lineup builder" (1,900/mo) and "football lineup maker" (720/mo) as tempting high-volume adjacents - checked their live SERPs before acting on them and both are entirely fan-facing formation/graphic tools (lineup-builder.co.uk, fotmob, buildlineup.com, chosen11.com), not real matchday squad management. Discarded - same kind of check that was skipped this morning, done properly this time. Real cluster confirmed via the canonical `google_ads_search_volume` endpoint: "game time football" 320/mo, "playing time calculator" 260/mo, "equal playing time calculator" 210/mo, all LOW competition; "game time football today" (170) excluded as likely kickoff-time-lookup intent, not equal-time rotation.

**Change made:** added a paragraph after the worked example in "How to Calculate Fair Playing Time" distinguishing a one-off calculation (the formula already given is enough) from tracking it automatically across a full season (the Coach App). Also repointed both existing Coach App links on this page from `/football-parent-coach-app` (the marketing/SEO page) straight to `/coach-app` (the live app itself) - confirmed via the coach-app repo's `vercel.json` that `/coach-app` is a real reverse-proxied deployment, not a dead link, and that the marketing page's own CTA just forwards to the same place, so this removes a redundant hop for a reader already sold on the idea. `npm run build` passes. Committed separately: `a2c16fb`.

**Deliberate rule exception, logged explicitly per the CLAUDE.md guardrail:** this is a second content change to this page today, on top of the "game time" phrasing edit above (`502ed89`). Graham explicitly chose to bundle both today rather than wait out the usual watch window, aware this makes it harder to attribute any ranking movement over the next 2 weeks to one specific cause. Not treating this as a precedent for skipping the rule elsewhere.

Live cost this addition: ~$0.18 (keyword_ideas + 2x related_keywords + canonical search_volume + search_intent, the last of which returned no usable rows - shape mismatch, not worth a retry at this cost) + ~$0.004 for 2 SERP sanity checks on the lineup-builder terms.

**Watch:** page now carries two same-day changes (phrasing + Coach App positioning). Don't touch it again before ~20 September.

## JPL cluster: four Martin Brock Part 2 quotes added to close a logged EEAT gap

Graham asked whether any Part 2 answers could fill JPL-cluster gaps where he has no personal experience (i.e. insider/structural facts, not parent-voice territory). Cross-checked the content tracker and found `jpl-and-academy-football` had a note from 2026-08-08 explicitly reading "voice still deliberately deferred pending a real JPL interview" - a documented gap this interview now closes.

Four `<ExpertOpinion>` quotes added, each linking to Part 2, no headings/structure/existing links removed:

- `jpl-and-academy-football.mdx`, "Exposure vs selection" section: quote 13 ("we are not a scouting agency... development and visibility become possible") - closes the logged 8 Aug gap, first Martin Brock quote this page has ever had.
- `jpl-vs-grassroots-football.mdx`, "Playing time" section: quote 12 (66%/50% tiered minimum game-time rule). Also **tightened the section's own pre-existing claim** ("at least 50% of each league match... where appropriate") to the correct tiered 66%/U11-and-below, 50%/U12-and-above figures now confirmed directly by JPL's own CEO - the old text was a vaguer, less accurate version of the same claim, not a different one.
- `jpl-vs-grassroots-football.mdx`, "Which children suit each pathway?" section: quote 15 (more than half of JPL players also still play grassroots).
- `how-to-get-into-the-jpl.mdx`, new "Misconception 5" under "Common misconceptions about joining": quote 14 (JPL isn't only for future stars).

All four logged in `expert-quotes.md` (quotes 12-15, each 1/3 reuse) and the content tracker (`expert-quote-count` incremented per page, `MSYS_NO_PATHCONV=1` used throughout to avoid the recurring path-mangling bug this time). `npm run build` passes, all four routes generate. Not yet committed.

## New article: Football Team Spreadsheet

Published `/coaching/football-team-spreadsheet` (Coaching, ~1,557 words, commit `2385d35`). Replaces the previously-planned "how to track stats for a grassroots football team" angle (pages.id 4539, never published, now marked `superseded`, its research history merged into the new row 5211) after this session's proper keyword research (discover -> shortlist -> canonical volume + live SERP + difficulty, per the seo-page skill pattern) found that phrasing has null search volume in every variant tested, while "football team spreadsheet" / "soccer team spreadsheet" (320/mo each, KD 0) has real, low-competition demand - surfaced via a competitor ranked-keyword pull on Spond/Mingle/the FA's Matchday app, where mingle.sport ranked for "soccer team spreadsheet".

Live SERP for both primary terms confirmed a weak field (Etsy, Pinterest, OpenOffice/Vertex42 template galleries, spreadsheet hobbyist blogs, YouTube, Reddit, mingle.sport) with no SaaS/app competitors - a much easier field than the "team management app" phrasing. No PAA surfaced on either term; FAQ content was built from the consistent related-searches modifiers (template, free, excel, pdf) instead.

Covers what to track and how to structure a spreadsheet (lineup by period, goals/assists, a season master table), cross-links to `equal-playing-time-in-grassroots-football` for the rotation-fairness angle, and pivots to the Coach App as the upgrade once manual tracking becomes the bottleneck, linking directly to `/coach-app`. Two genuine `<ParentNote>` callouts from Graham's own spreadsheet (sourced live this session), voice_pct exactly 10.0%. 1 external citation (FA Standard Code of Rules) - deliberately light sourcing, practical/DIY topic with no governing-body facts needing heavier citation density, per the style guide's explicit exception.

Added to `app/sitemap.ts`. Open follow-up, not yet decided: whether to build a real downloadable spreadsheet/Google Sheets template as a linked asset, since "template"/"free download" is real, strong intent the current prose-only version doesn't fully match.

## Football Team Spreadsheet: remaining internal links + Parent Guides listing

Graham asked to finish the internal-linking work: link from `equal-playing-time-in-grassroots-football` despite that page's watch-window note above, and list the new article under `/parent-guides` since there's no `/coaching` category page yet (confirmed one doesn't exist - the existing `equal-playing-time`, `best-football-formations` and `what-qualifications` coaching articles are already surfaced this same way, so this matches established practice, not a new pattern).

- `equal-playing-time-in-grassroots-football.mdx`: added the link on "a spreadsheet" in the matchday-admin section. This is a 3rd same-day content edit to this specific page (phrasing, Coach App positioning, now this) - explicit exception to the one-lever/watch-window guidance, done on Graham's direct instruction rather than my own judgement call.
- `app/parent-guides/page.tsx`: added to the `articles` array, matching the existing entries for the other unreleased-category coaching pages.

Also fixed the two zero-inbound-link gaps flagged in the previous session turn: a body link from `best-football-formations-by-age-group.mdx` and one from `football-parent-coach-app/page.tsx`'s Real Stats feature description, plus swapped the new article's weakest Related Articles entry for a link to `/football-parent-coach-app` as requested. `npm run build` passes throughout. Commits: `5da13c9`, `dfffbe6`.

## New /coaching category page; coaching articles moved out of Parent Guides and Football Development

Graham asked for a proper Coaching category now that there are enough articles for one. The five `/coaching/*` articles already lived at those URLs; what was missing was the category index, and they were being surfaced as cards on other categories' index pages instead.

**No URLs changed.** All five article slugs are untouched, so nothing indexed moved.

- New `app/coaching/page.tsx` (index page, `/coaching`), listing all five coaching articles with a Start Here block and category copy. Added `/coaching` to the category-pages section of `app/sitemap.ts`.
- Frontmatter `category`/`categoryUrl` corrected on the four articles that still said Parent Guides or Football Development: `what-qualifications-do-i-need-to-be-a-football-coach`, `equal-playing-time-in-grassroots-football`, `best-football-formations-by-age-group`, `football-drills-for-7-and-8-year-olds`. This drives the breadcrumb, the breadcrumb JSON-LD and the site search index. Note the search index built URLs as `categoryUrl + slug`, so those four articles were previously producing dead `/parent-guides/...` and `/football-development/...` links in site search; that is now fixed as a side effect.
- Removed the four coaching cards from `app/parent-guides/page.tsx` and the one from `app/football-development/page.tsx` (cards only, no other content, headings or links touched on either page).
- Added "Coaching" to the header nav (`app/components/header.tsx`, after Parent Guides) and to the homepage category grid (`app/page.tsx`, before Girls Football).

Reverses the 6 Sept decision above to list `football-team-spreadsheet` under Parent Guides, which was explicitly a stopgap because no `/coaching` category existed. `npm run build` passes; all 6 `/coaching` routes prerender.

## Sitemap lastmod made real; Coach App promo on /coaching; landing page link leak closed

Three changes, all off the back of the /coaching category work above.

**1. Sitemap `lastmod` now derived from content, not the clock.** `app/sitemap.ts` was emitting `lastModified: new Date()` for every route, so all ~93 URLs claimed to have changed on every deploy. Google discards lastmod it can tell is untrustworthy, which made the field dead weight: a genuinely edited page had no way to stand out. Now an article's lastmod is its own `dateModified ?? date` frontmatter, and the 11 routes with no backing MDX (home, the six category indexes, legal pages, /search, the Coach App landing) omit lastmod entirely rather than asserting a date we invented. Verified in the build output: 82 URLs with a real date, 11 without.

Required extracting the route list from `app/sitemap.ts` to a new `lib/routes.ts`. `app/admin/seo/page.tsx` is a `"use client"` component that imports the list, so once the sitemap module read the filesystem, `fs` landed in the client bundle and the build failed. `lib/routes.ts` is now the manually maintained list; consumers updated (`app/sitemap.ts`, `app/admin/seo/page.tsx`, `lib/gsc.ts`, `scripts/seo/cli/content-backlog.ts`, `internal-link-audit.mjs`). CLAUDE.md updated to point at the new location.

**2. Coach App promo banner on `/coaching`, above the guide grid.** New optional `promo` slot on `app/components/category-page.tsx`; `/coaching` passes the dark coach-audience creative. Its copy (fair game time, lineups, match stats, the Sunday-morning spreadsheet) answers the same problems the category's intro and closing copy raise, which is why that creative rather than the parent one.

Deliberately pinned to the dark style rather than entering the article A/B test: the test splits by article slug and a single category page has nothing to split on. `bannerOnPath()` in `lib/supabase/page-views.ts` was taught about the new `category` placement, which was necessary rather than optional: clicks are counted from the `?b=` parameter on any path, but impressions only for paths the report recognises as carrying a banner, and it explicitly returned null for category indexes. Left unfixed it would have reported this banner's clicks against zero impressions and inflated the CTR. Tracks as `dark-coach-category`.

Worth knowing but not changed: `enoughData` sums impressions by style across all placements, so the homepage (also pinned dark) and now this page both feed the dark arm only. That asymmetry predates this change; not touched mid-test.

**3. Removed the only internal link out of the Coach App landing page.** `content/landing/main.mdx` linked "football team spreadsheet" to `/coaching/football-team-spreadsheet`. Unlinked, sentence and keyword mention kept. The landing page's main content now has zero internal outbound links, confirmed in the rendered DOM.

`npm run build` passes; no new lint issues. Commit: see below.

## Still on watch, not yet due

- Coach App banner A/B test (started 4 Sept) — needs both arms to clear 300 impressions before the CTR comparison is meaningful.
- Mitre Impel / Nike Academy affiliate links on `best-footballs-by-age` — hold until ~18 September before any further edit.

## New PPC landing variant: equal playing time calculator (8 Sept)

`content/landing/equal-playing-time-calculator.mdx`, served at
`/football-parent-coach-app/equal-playing-time-calculator`. Built for a Google
Ads ad group, not for organic: `index: false`, so it is noindex/follow, carries
no canonical, and is deliberately absent from `lib/routes.ts` and the sitemap.

H1 is "Equal playing time calculator for grassroots coaches", containing the
target keyword verbatim for ad-to-page message match and Quality Score. Keyword
chosen over "equal game time calculator" because it is the only term in the
cluster with corroborated volume: 210/mo UK in DataForSEO against a 100-1K
Keyword Planner band, where "equal game time calculator" appears only in the
coarse Planner band. Close variants match the game-time queries into the same
ad group regardless.

Page gives the Sheffield FA target-minutes formula and a worked example on the
page rather than gating it, then positions the app at the season-long gap.
Consistent with the framing already published in
`content/coaching/equal-playing-time-in-grassroots-football`, which likewise
concedes that one-off online calculators do the single-match job fine. One
internal link out, to that article.

No change to any existing page. `npm run build` passes, all four landing
variants prerender.

**Not yet live in ads.** Two things to settle first, both recorded here so the
result is readable later: the Google Ads conversion action may not be firing
(`AW-18192816393` is configured in `app/layout.tsx` but not in the Coach App's
own `index.html`, where the conversion event actually fires), and the campaign
economics only clear at roughly £0.10-0.50 a click against a £2.99/month
product, which rules out the `football coaching app` head term at £1.37.

## Cookie banner overlap fix, and nav stripped from the ad variants (8 Sept)

Both found while checking the new calculator landing page for Google Ads
landing-page experience, both measured in the browser at 375x812 rather than
eyeballed.

**1. The cookie banner was covering the page.** `fixed inset-x-0 bottom-0`,
186px tall on a phone, top edge at y=626. The Coach App sign-up form's primary
button sat at y=614-664, so 38 of its 50px were behind the banner; the email
fallback and the terms/privacy line were fully hidden. Every ad click is a
first-time visitor, so this hit 100% of paid traffic, and it applied to every
page on the site carrying a form or a CTA low in the viewport, not just the
landing pages. `app/components/CookieConsent.tsx` now reserves the banner's
measured height as `padding-bottom` on `<body>` while it is shown. Commit
`6e14809`.

**2. Site nav removed from `/football-parent-coach-app/<variant>` only.**
Seven category links plus search on a page bought at roughly £0.30-1.40 a
click. Footer deliberately kept: Ads expects privacy and terms to be
reachable, and stripping trust links is not the same win as stripping exits.
The parent `/football-parent-coach-app` page is untouched and keeps its nav,
being the only indexable page in the set. Verified in served HTML that the
header is absent server-side on both variants and still present on the parent
page, articles and the homepage. Commit `401a4d8`.

Net effect on the calculator variant at 375x812: primary CTA now fully visible
without scrolling, email fallback and legal links reachable by scrolling,
nothing permanently obscured.

**Calculator variant copy revised (8 Sept).** CTA changed from "Work out your
first lineup free" to "Manage equal game time": the old one described effort
the coach has to put in, the new one describes what they get. Subhead rewritten
to lead with what the app does rather than announcing that the formula below is
free, which undercut the product before the form. Sheffield FA attribution and
link removed, and the internal link to the equal-playing-time article removed:
this is a join page, and outbound links are exits from a page bought by the
click. Also cut the line conceding that free calculators exist online, which
was pointing paid traffic at competitors. Page body now has zero outbound
links. Commit below.

**Coach App page views start recording 9 Sept (8 Sept).** The landing pages
were built, rewritten and previewed repeatedly through early September, so
their view counts to date are mostly setup traffic rather than visitors: on
8 Sept the calculator page held 24 rows, 13 of them an agent's and most of the
rest Graham checking the deploy. `RECORDING_STARTS` in
`lib/supabase/page-views.ts` now excludes everything under
`/football-parent-coach-app` before 2026-09-09 from the SEO report. Excluded in
reporting only, so page_views keeps the honest raw record, and kept separate
from the bot filter so these rows are not miscounted as bot traffic. Verified:
both coach-app paths now report 0, an unrelated control page is unchanged at
225 views over 21 days. The campaign's own numbers therefore start clean.

**Sign-up button now names what it does (8 Sept).** The landing variants'
`ctaLabel` was rendered directly on the Google OAuth button, so the calculator
page shipped a primary button reading "Manage equal game time" that opened
Google sign-in. Anyone without a Google account clicked a benefit and hit a
wall. All five variants had the same shape ("Build your first lineup free",
"Start tracking your season free" and so on). The button is now fixed at "Sign
up with Google" and the field, renamed `formHeading`, drives the heading above
the form instead, so a variant can still echo its ad without disguising what
the button does. Commit below.

## Amazon affiliate click-out tracking added, 9 September 2026

Not an SEO edit: no content, title, meta, heading or internal link on any page was touched. Logged here because it is a site-wide change that ships on every page, so it needs to be datable if anything moves.

**Problem.** Amazon Associates reporting only starts at the moment a click lands on Amazon, is aggregated per tracking id rather than per page, and shows nothing at all on a day with no orders. It cannot answer the question worth asking: which article sends people to Amazon, and what share of that article's readers click.

**What was built.** First-party click logging, mirroring the existing `page_views` system rather than inventing a second pattern:

- `affiliate_clicks` table in the `football-parent-social` Supabase project (`supabase/migrations/20260909130000_affiliate_clicks.sql`): path, destination href, merchant host, anchor text, placement, user agent, timestamp. Anonymous, same posture as `page_views`: no IP, no session id, no cookie.
- `app/components/AffiliateClickTracker.tsx`, mounted once in `app/layout.tsx`. One delegated listener on the document, matching clicked anchors against `lib/affiliate.ts`'s existing `AFFILIATE_HOSTS`, so it covers inline MDX links and the `GearPicks` buttons alike with nothing to wire up per link. Beacons `/api/affiliate-click`. Same exclusions as `PageViewPing`: `/admin`, the localStorage opt-out, the admin/no-track cookies, localhost, and self-declared bots.
- A `affiliate_click` gtag event fires alongside it, so the data is in GA4 too. GA4 is consent-gated and only sees the accepting share of visitors, so the Supabase table is the number to trust.
- New "Amazon clicks" tab at `/admin/seo` (`/api/affiliate-click-report`, admin-only via `proxy.ts`): clicks by page with `page_views` for the same page and window as the denominator, giving a click-out rate per article; clicks by product; quick-picks vs inline placement; clicks by day.

**Currently measurable pages** (the two carrying Amazon links today): `/football-gear/best-footballs-by-age` and `/football-gear/veo-camera-alternatives`.

**Reading the numbers.** Baseline starts 9 September 2026. An empty window before that date is "not measured", not "no clicks". This still cannot see conversion or earnings, which exist only in Associates: read the two together, this for which page and product pull, Associates for what the traffic was worth.

**Deploy step:** the migration has to be pushed to Supabase (`supabase db push`, after confirming `supabase/.temp/linked-project.json` still points at `jwlwzoklgrzharqvazeg`) or the logging endpoint will error on every click. The click handler swallows the failure, so a missed migration shows up as an empty report, not a broken page.

`npm run build` passes, all routes generated. Commit `b22df32`.

### Follow-up: click-out rate denominator clamped to when tracking went live, 9 September 2026

First reading of the new tab was "206 views, 1 click", which is not a 0.5% click-out rate: the clicks covered about an hour, the views covered 30 days. 205 of those views happened before the tracker existed.

Fixed by clamping both sides of the ratio to `AFFILIATE_TRACKING_STARTED_AT` (`2026-09-09T08:13:00Z`, the merge to main; the deploy finished two or three minutes later), the same approach `BANNER_TEST_STARTED_AT` already uses on the Coach App banner test and for the same reason. The Page views tab still reports the full 30 days, so the two tabs are meant to disagree on view counts for these pages, and the tab now says so.

No data was deleted or altered: this is a reporting window change only, `affiliate_clicks` and `page_views` are untouched.

## 404s were being counted as page views, and a mistyped inbound link, 9 September 2026

**Found via the page view report:** `/parent-guides/what-is-grassroots-football:` (trailing colon) was the top page of 9 September with 25 of the day's 81 views, about 31%, for a URL that does not exist. It appears on no earlier day. `botViews` was 0, so whatever is sending them presents an ordinary browser user agent, and 25 spread over a morning never reaches the 30-per-minute flood guard.

**Root cause, two separate things:**

1. **Next renders the not-found page inside the root layout**, where `PageViewPing` is mounted, so every 404 logged itself as a page view of its own dead URL. Confirmed on a local production build: the 404 response carries the full header, footer and Organization schema, so all layout-level scripts run. This was inflating the report site-wide, not just for this URL.
2. **A mistyped inbound link.** Nothing in the repo links to that URL with a colon, so it is external, most likely a citation or post that wrote the URL followed by ": Title" and had the auto-linker swallow the colon.

**Fixes:**

- `app/not-found.tsx` added (there was none, so Next's default was in use). Renders a real 404 with category links and site search, sets `robots: noindex`, and carries a `data-fp-not-found` marker.
- `app/components/PageViewPing.tsx` skips logging when that marker is in the DOM. Detected from the DOM rather than from a route list because the list would need hand-syncing and would wrongly drop `/coach-app/*` views, which come from the separate Coach App deployment through the `vercel.json` rewrite and so are not in `lib/routes.ts`. Verified in headless Chromium: the marker is in the rendered DOM on a 404 and not on a real page (it appears in the RSC flight payload of every page, but inside a `<script>`, which `querySelector` never matches).
- `next.config.ts` redirects the colon URL to the real article, 308. The colon is escaped because `:` starts a route parameter in Next's matcher. Known gap: a percent-encoded `%3A` still 404s and an explicit rule for that form does not match either. The logged hits carry a literal colon, and an encoded one now lands on the proper 404 page rather than being counted.

**Effect on historical data:** none, nothing was deleted. Days before this fix still contain 404 rows in `page_views`, so any past day where a dead URL ranked high in the report was measuring the same artefact. Worth remembering when comparing against pre-9-September days.

### Per-page source and user-agent breakdown added to the Page trend tab, 9 September 2026

Follow-up to the 404 finding above. Answering "where did this page's traffic come from" needed a hand-written Supabase query, which is what identified the 25 hits on the mistyped grassroots URL as one client rotating user agents inside 34 seconds (16 claiming iOS 13.2.3, released December 2019, plus nine more across six different Chrome majors).

`/admin/seo` → Page trend now shows, under the daily chart for whichever page is selected: traffic sources grouped as on the Page views tab, and behind a toggle, every user agent that hit that page with hit count and first/last seen. Covers the page's full recorded history rather than the 7/30-day window chosen for the chart, which the tab states.

New `getPageViewSourcesForPath` in `lib/supabase/page-views.ts`, returned from the existing `/api/page-view-by-path`. The per-path bot rules were extracted into a shared `isBotRowForPath` used by both this and the trend chart, so the two can never disagree about which rows are real. No change to what either counts.

Admin-only, no public-facing change, no change to what is logged.

### Per-path page view flood threshold lowered 30 → 12 per minute, 9 September 2026

The 9 September burst on the mistyped grassroots URL sat deliberately under the existing guard: 25 views in 34 seconds, roughly 44/minute, but it stopped at 25 so the 30-in-a-rolling-minute check never fired.

Lowered to 12. The whole site runs 250-350 views a day across every page and the busiest single page managed 55 across three days, so 12 in one minute on one URL is still two orders of magnitude above anything genuine.

More urgent since the same-day redirect: that URL now 308s to the real article, so an unblocked repeat would inflate a live page's numbers rather than a dead one's.

Applies to `page_views` inserts only (`FLOOD_THRESHOLD` in `lib/supabase/page-views.ts`). The affiliate click guard was already 10 and is unchanged. Drops are silent and not counted anywhere, same as before, so a genuine spike above 12/minute on a single page would be lost rather than flagged.

## Product picks added to the kids shin pads guide, 9 September 2026

**Page:** `/football-gear/shin-pads/best-shin-pads-for-kids-football`
**Commit:** `e36c213`
**Lever:** product recommendations. Title and meta deliberately unchanged.

**Why:** the page went from 681 impressions in July to 14,807 over the last
28 days, averaging position 8.7, but converts at 0.7% against an expected
3%. It ranks on commercial queries while naming no products, so the click
goes to a retailer. Gear as a whole runs 0.56% CTR against 1.23% for the
rest of the site, and 64 of the site's 98 striking-distance queries are
gear pages.

**What changed:** three H2 sections added after the existing types
explanation, each with a `GearPicks` block. Nothing removed, slug
unchanged.

- Best Slip-In Shin Pads: adidas Tiro
- Best Shin Pads With Ankle Protection: Nike Charge, both colour listings
- Best Shin Pad Sleeves And Sock Shin Pads: Nike Mercurial Lite, JOGA Youth

**Terms targeted:** the sleeve and sock pad cluster is the main one, six
queries totalling ~357 impressions sitting at positions 9 to 12.4 off a
single passing sentence. Also the age band queries, which already rank but
do not convert: "best shin pads for 10 year old" (424 impressions, position
8.7, zero clicks), 7 year old (146), 8 year old (144).

**Held back deliberately:** the generic "best shin pads" block (~2,100
impressions at 0.1-0.2% CTR, mostly adult intent) is a title and intent
mismatch, not a content gap. Fixing it means changing the title, which is a
separate lever and would make this change unattributable. Next round.

**Two original findings**, both from checking listings rather than
marketing copy, and not present in any competing guide:

- Nike runs two size systems in one range. The Charge uses youth sizes, the
  Mercurial Lite uses adult XS to XL, and that XS starts around 140cm. A
  parent buying XS for an Under-8 gets a pad sized for an average 11 year
  old. This is the direct answer to the 10 year old query above.
- Nike splits youth sizes across colourway listings, so Youth S and Youth M
  sit on different pages of the same pad.

**Verification:** `npm run build` passes. Rendered HTML confirms all five
links carry `rel="sponsored nofollow noopener noreferrer"` and
`data-affiliate-placement="gear-picks"`, so a malformed data prop is not
silently dropping rows.

**Watch list:** until 23 September. No further changes to this page before
then, including the title change noted above.

**Size chart resolved (commit `06d190c`):** Graham supplied Nike's own chart,
which confirmed the copy and improved on it. Kids L and Adult XS are both
55 to 59in, the same range under two labels, and Nike puts that band at age
10 to 12. The hedged "roughly 140cm" was replaced with the real bands as an
InfoTable, cited to Nike. Folded into this change rather than made a second
edit, since nothing had deployed and the watch window had not started.

**Remaining caveat:** the adidas Tiro note still points at the listing chart
rather than stating a band, because adidas's chart is unreachable from the
sandbox. Tighten it alongside the title change next round.

### Editorial fixes in the gear articles, 9 September 2026

**Commit:** `9320ef4`. Separate from the above so the product change stays a
clean single revert. An em dash in the shin pads guide, and a FAQ answer in
the wide feet guide that ended on "the brand on the side", which is the
banned name-on-the-box framing. Wording only.

## New component: ExpertQA, and Paul Barry round 2 answers added to 3 academy-trials articles

Graham supplied real answers to 4 of the "Paul Barry - round 2" pending questions logged in `expert-quotes.md`. Closes a documented E-E-A-T gap: `what-do-academy-coaches-look-for.mdx` and `how-football-scouts-identify-players.mdx` both had zero named-expert voice before this (confirmed by reading both files - only generic unattributed "Football Parent note" callouts existed).

**New component:** `app/components/mdx/ExpertQA.tsx`, registered in `lib/MDXContent.tsx`. Deliberately different from the existing single-quote `<ExpertOpinion>`: shows the full question alongside the answer (`Q.`/`A.` labelled), an optional `bio` line under the expert's name/role for career background. Intended as the reusable "Football Parent asks the expert" pattern Graham wants to use more going forward, not a one-off for this article.

**Bug found and fixed same session, before this shipped live:** the first version took its Q&A pairs as a JSON `data` prop (`data={\`[...]\`}`, matching the `GearPicks` JSON-string convention). That rendered fine in `npm run build` and in a local isolated `@mdx-js/mdx` compile, but the box silently rendered nothing on the live site (just the H2 heading and a lead-in sentence, straight into FAQ) - Graham caught this after the first deploy. Root cause: `next-mdx-remote`'s `serialize()` runs a `blockJS: true` security default that strips any `attr={jsExpression}` value in MDX (via its `removeJavaScriptExpressions` remark plugin), which silently emptied the `data` prop to `""` at runtime - it never threw, so the build and a plain `@mdx-js/mdx` compile (which doesn't apply that plugin) both looked fine. Confirmed by instrumenting the component and rendering through `next-mdx-remote/rsc`'s actual `compileMDX` + `react-dom/server`, not just `next build`. Fixed by redesigning the API to avoid JS expressions entirely: Q&A pairs are now nested `<ExpertQAItem q="...">answer text</ExpertQAItem>` children (plain JSX attributes and children, both of which survive `blockJS`), not a JSON string. Also had to drop the double-quote marks from around "missing the window" in one question (`q="..."` is itself double-quoted, so literal `"..."` inside it isn't representable in JSX without changing the wording or the delimiter). Verified this time by actually curling a running dev server and a full local production build's rendered HTML, not just a clean `npm run build` exit code.

**Where used**, each as a new `## Football Parent Asks The Expert` H2 section (added to frontmatter `sections` too), attributed to Paul Barry (Head of Coaching, Content & Club Support, Football DNA), with a `bio` line noting his prior Head of Coaching/talent-ID roles at Southend United, Watford, Arsenal and Crystal Palace:

- `academy-trials/what-do-academy-coaches-look-for.mdx`: Q1 (first thing noticed before anything technical - personality/mindset) + Q2 (parents overweight goals/pace; growth mindset and consistent improvement weighted more heavily). Placed after "Physical Development", before FAQ.
- `academy-trials/how-football-scouts-identify-players.mdx`: Q3 (biggest misconception about "missing the window" - relative age effect, Q4 under-maturated players catching up post-puberty). Placed after "Three Common Scouting Myths", before FAQ.
- `academy-trials/how-to-get-scouted-for-football.mdx`: Q4 (best way to actually get spotted - "whispering talent" who go under the radar vs visually obvious players; scouts watch over several weeks now). Placed after "How to Improve Your Chances of Being Noticed", before "Common Myths About Football Scouting".

Answers used near-verbatim; only obvious transcription typos, one stray em dash (per the site's no-em-dash editorial rule), and the quote marks around "missing the window" in Q3's question text (removed for the `attr=` escaping reason above, not a wording judgement call) corrected - no other rephrasing. `expert-quotes.md` updated to move this from "Pending" to "Answered" and log the placements.

`npm run build` passes, all three routes prerender, and this time verified against actual rendered HTML (dev server + production build output), not just a clean build exit code, given the bug above.

### Skill added: football-parent-affiliate-link

Not an SEO change, recorded because it governs how future product links get
built. Converts a pasted Amazon URL into
`amazon.co.uk/dp/<ASIN>?tag=footballpar09-21`, and carries the product
judgement rules: check size coverage before committing to a pick, treat a
SiteStripe high-return-rate refusal as a reason to choose something else,
prefer deeply stocked categories over boots.

## Site-wide E-E-A-T audit, and 2 unused Martin Brock quotes placed on the JPL hub page, 9 September 2026

Graham asked for a list of articles with low/no voice-density, to find gaps like the 3 academy-trials ones just fixed. `internal-link-audit.mjs`'s voice-density counter only recognised `<ParentNote>`/`<ExpertOpinion>` blocks, so it scored the new `<ExpertQA>` sections as 0% - fixed by adding `<ExpertQA>` to both the extraction regex and the unmarked-first-person exclusion, then re-ran the audit to refresh the checked-in report/JSON.

Produced a full site ranking by voice_pct (voiceWordCount/bodyWordCount from `link-audit-voice.json`, landing pages and interview-format articles excluded as not applicable to this metric): 33 articles at 0%, 21 more under 6%.

**Graham flagged `what-is-the-junior-premier-league` (3.2%) as surprisingly low** given two full Martin Brock interviews exist. Checked `expert-quotes.md`'s Martin Brock quote list against this specific article and found the actual cause: quotes 10 ("readiness is three honest questions") and 11 ("transparency on cost") had never been placed anywhere at all, despite being strong exact-topic fits for this exact hub page, and quote 13 ("we are not a scouting agency") was sitting at 1/3 reuse while this page's own "Scouting and academy links" section made the identical point in unattributed prose.

**Change made**, all three as `<ExpertOpinion>` blocks, no headings/structure/existing content removed:
- Quote 10 (readiness questions) - new, placed in the intro section after the "neither choice is automatically better" paragraph
- Quote 11 (cost transparency) - new, placed in "Costs and travel"
- Quote 13 (not a scouting agency) - reused (2/3), placed in "Scouting and academy links"

**Result:** voice_pct for this page went from 3.2% (61/1879 words) to 11.5% (236/2054 words). `expert-quotes.md` updated to log all three placements. `npm run build` passes, rendered HTML confirms all three quotes present.

Not yet actioned: the other 2 JPL cluster articles under 6% (`jpl-and-academy-football` 5.0%, `jpl-vs-grassroots-football` 5.0%) already each carry one distinct, well-fitted Brock quote - every other Brock quote in the library is already in use somewhere, so raising their % further would mean reusing quotes without as clean a topical fit as this page had. Flagged for Graham's call rather than done unprompted.

## New article: "The Best Grassroots Football Apps for Coaches and Parents (2026)", 11 September 2026

Published `/coaching/best-grassroots-football-apps`. Content gap identified this session: AI Overviews cite competitor "best grassroots/coaching app" roundups (Spond, Tacticosport, Sportplan, FootballDNA and others) across every checked query variant (11 SERPs total, this session plus a cached 22 Aug batch), and footballparent.co.uk had zero presence in any of them - no article existed on this topic, only the product page at `/football-parent-coach-app`.

Primary keyword "best football coaching app" (70/mo UK, KD 13); secondary terms (best grassroots football app, best app for grassroots football coaches, best youth football coaching app, football coaching app uk, best all in one football coaching app) are individually low/unmeasured volume but share the same SERP and intent. ~$0.142 spent on live DataForSEO research this session (keyword widening seeded on real "best X app" phrasing, 8 new SERP/AI Overview checks, a domain-rank pull on footballdna.co.uk to verify what it's actually known for before naming it in print).

Structured by job-to-be-done rather than a single ranked list, at Graham's direction: FootballDNA for drills/session planning (verified via DataForSEO to genuinely rank on set pieces, drills, formations, not team admin, so no overlap with the other picks), Spond for availability and payments, and Football Parent's own Coach App for equal playing time and as the stats/admin all-rounder - disclosed openly as our own product in the intro, the same pattern Spond's own "best of" page uses by including itself. TeamStats and Pitchero get a shorter honest paragraph each rather than being ignored; FA Matchday and Mingle are named and excluded with a one-line reason each.

All competitor pricing/feature claims (Spond's fee-only model, TeamStats' and Pitchero's current tiers, FA Matchday's Whole Game System positioning, FootballDNA's free-content tier) were fact-checked live via WebSearch/WebFetch this session against each product's own current pricing page, not from memory or the cached SERP data. The two `<ParentNote>` callouts are Graham's own genuine app-usage opinions, given directly in the sourcing conversation for this article rather than a separate follow-up Q&A.

Added to `lib/routes.ts` (sitemap picks it up automatically). `npm run build` passes, page prerenders as static. Tracker row marked fact-checked and AI-slop-checked; reasoning for the above-target external-citation density (7 citations across ~1480 words - every pricing/feature claim needed its own official-source citation for the honest-comparison premise to hold) logged in the tracker's `--notes` rather than left unexplained.

**Pre-publish AI-slop pass (before commit):** re-read against the banned-phrase and reject-then-reveal-construction rules in `fact-checking-and-style.md`. Rewrote 3 sentences that used an "isn't X / not a Y" contrast shape ("it isn't a team-admin app... it solves a different problem entirely", "it's not a feature most... treat as core", "that's a genuine gap, not a hedge") to state the point directly instead. Cut one duplicate FAQ ("How much is Spond per month?") that restated "Is Spond really free?" almost verbatim. No banned phrases or markdown tables found; no em dashes.

**Inbound links added (before commit), deliberately excluding the Coach App pages:** added to the `/coaching` category index's article list, plus one contextual reciprocal link each from `football-team-spreadsheet` ("When to Move From a Spreadsheet to an App" section) and `equal-playing-time-in-grassroots-football` ("Tracking Playing Time Without Extra Matchday Admin" section), both of which the new article already linked to. Deliberately did not add a link from `/football-parent-coach-app` or any of its `[variant]` landing pages: those are conversion pages with outbound links already stripped on purpose (see the 8 Sept entry above on the calculator variant and nav removal), and a link out to a comparison article would be exactly the kind of leakage that work was designed to prevent.

`npm run build` re-verified clean after all of the above.

**On watch:** new page, no baseline yet. Per the 10-14 day rule, no further edits to this page before ~25 September without a specific reason.

## SEO edit: Veo camera alternatives (conversion), 11 September 2026

Page: `/football-gear/veo-camera-alternatives` (`content/football-gear/veo-camera-alternatives.mdx`). Commit `6026658`.

**Why:** GSC shows the page ranking page 1 for most Veo cost/comparison terms but converting affiliate clicks poorly vs other gear pages. Working theory: the XbotGo alternatives were not obvious enough and the comparison sat too far down the page.

**What changed (single-page conversion + accuracy edit, not a striking-distance/decay content play):**
- Moved the existing "Cost and Features at a Glance" H2 up to directly after the intro, before "What Is a Veo Camera", so the XbotGo alternatives are visible above the fold rather than near the bottom. `sections` frontmatter reordered to match. Heading text and anchor id unchanged, so no URL/anchor breakage.
- Replaced vague/hedged pricing with figures sourced from Veo's own checkout at time of writing: £1,199 camera, £229 carbon tripod, Starter subscription from £499/year on a 12-month minimum, £1,927 due at checkout in year one (excl. tax). The £1,927 figure now reads identically in the comparison section, "What a Veo Camera Costs Over a Season", the InfoTable, and FAQ 4.
- Added bolded click-out CTAs ("Check the current Falcon/Chameleon price →") under the Falcon (amzn.to/4gBPZGS) and Chameleon (amzn.to/46Hg7dy) entries, so the affiliate links read as actions, not just citations. This is the primary conversion lever.
- Chameleon entry switched to the £471.71 Amazon UK Field Bundle (camera, 13ft tripod, carrying case) per Graham's confirmation, since it was ambiguous which SKU the ~£320 buying-guide figure and the Field Bundle screenshot referred to. The two other ~£320 Chameleon mentions elsewhere in the body are the phone-only Standard Bundle (a different SKU) and were left as-is.
- Removed both veo.com/pricing hedge-and-redirect links; kept the single veo.com/product/veo-cam-3 spec link (sources the 180-degree/1.25kg/6.5hr claims). Exactly one veo.com outbound link now remains.
- Dropped the unsourced "£34 a month" Starter figure (conflicted with the £499/year checkout figure) in favour of the sourced annual number.
- Added four FAQs targeting page 1-2 keywords and AI Overview extraction: "Is there a cheaper alternative to Veo?", "Does XbotGo need a subscription?", "XbotGo Falcon vs Veo: what's the difference?", "Chameleon or Falcon: which should I pick?". Updated the existing cost FAQ to £1,927.

**Keywords targeted (already ranking, worked in naturally, no exact-match forcing):** veo camera price, cheaper alternative to veo camera, xbotgo alternatives, xbotgo falcon alternative, veo subscription cost uk, xbotgo falcon vs veo, is there a cheaper alternative to veo.

**Schema:** confirmed the page already emits FAQPage JSON-LD (ArticleLayout runs `extractFaqs` on the content and renders a FAQPage script; page.tsx passes `content`). No schema code change needed; the four new FAQs are automatically eligible for FAQ rich results / AI Overview citation.

**Verification:** `npm run build` passes, page prerenders static. H2 order matches `sections` frontmatter, no em dashes, no markdown pipe tables, all money figures consistent.

**On watch:** live-traffic page. Per the 10-14 day rule, no further edits before ~25 September without a specific reason; watch affiliate click-out rate for this URL vs baseline at `/admin/seo` "Amazon clicks" tab.

## Affiliate update: Veo alternatives Chameleon pick, 11 September 2026

Page: `/football-gear/veo-camera-alternatives`. Commit `634b928`.

Graham confirmed the XbotGo Chameleon camera is available on its own at £279.99 on Amazon UK and supplied the listing (ASIN `B0DG2DYQD8`). Switched the comparison-box Chameleon entry and the "Cheaper Alternatives" bullet from the £471.71 Field Bundle to the standalone camera at £279.99 (prose "around £280"), pointing both at the canonical tagged link `https://www.amazon.co.uk/dp/B0DG2DYQD8?tag=footballpar09-21` (UK Associates tag footballpar09-21; `AFFILIATE_HOSTS` already covers amazon.co.uk, so rel/target and first-party click tracking apply automatically). The box CTA ("Check the current Chameleon price →") uses the same link.

Left the explicitly-labelled "Chameleon Standard Bundle from around £320" sourced claim (XbotGo's own UK buying guide) and its existing `amzn.to/46Hg7dy` short link in the "Veo vs XbotGo" section untouched: it is a genuinely different SKU with its own click history, so each stated price now sits next to a link for that same product (bare camera ~£280 on the tagged link, Standard Bundle ~£320 on the existing short link). `npm run build` passes; page prerenders static.

## Affiliate fix: Veo alternatives Falcon links, 11 September 2026

Page: `/football-gear/veo-camera-alternatives`. Commit `202af65`.

Graham spotted the Falcon affiliate links pointed at the tripod-bundle listing (£882) while the copy quoted the £759 standalone. Repointed the three standalone-price Falcon mentions (comparison box heading + CTA, "Veo vs XbotGo", "Cheaper Alternatives") at the standalone camera via the canonical tagged link `https://www.amazon.co.uk/dp/B0H8D49N68?tag=footballpar09-21` (ASIN B0H8D49N68). Kept the existing `amzn.to/4gBPZGS` short link as the tripod-bundle link in the comparison box, now labelled £882, so the box offers both the standalone (£759) and the tripod bundle (£882) each next to the correct link. `npm run build` passes.

## Best Grassroots Football Apps: intro rewritten, Coach App picks moved first, 11 September 2026

Same-day edit to the article published above, made before any real traffic or indexing baseline exists (published within the last few hours), not a violation of the watch-window rule.

Graham read the published article and objected to the opening two paragraphs: they framed the piece around other sites' "best grassroots app" roundups being self-serving, which read as bitter about a comparison the reader has likely never seen, rather than being useful on its own terms.

**Intro rewritten.** Dropped the "search 'best grassroots football app' and you'll find a list from Spond that includes Spond..." framing entirely. Replaced with a plainer premise: there are a fair few grassroots coaching apps, each solving a different job, and this is our own shortlist of the ones actually found useful, including our own. Disclosure sentence ("built because two of those four jobs... weren't being solved well enough") kept, just no longer positioned as a dig at how competitors write their own comparisons.

**Section order changed for AI-citation (GEO) purposes, at Graham's explicit request.** The two Football Parent Coach App sections (Best All-Rounder, Best for Equal Playing Time) now come first, ahead of FootballDNA and Spond, on the reasoning that AI answer engines and SERP snippet extraction weight earlier content in a page more heavily when choosing what to cite or summarise. The "at a glance" bullet list, frontmatter `sections` TOC order, and the two FAQ answers that named picks in order ("What is the best app for managing team sports?", "Is there a free coaching app available?") were all reordered to match, so the Coach App is named first throughout rather than only in the reordered headings. No claims changed, no competitor pick demoted in substance, honest comparison content unchanged.

**Meta description also reordered and shortened** to lead with the Coach App (162 chars, within the usual 150-165 target) rather than leading with FootballDNA/Spond.

`npm run build` passes, page prerenders. Not yet committed.

## Best Grassroots Football Apps: further edits after Graham read the live page, 11 September 2026

Same-day, page still has no traffic/indexing baseline (published today).

- Dropped the Pitchero mention at the end of the All-Rounder section ("so it won't fit a league or multi-team club the way Pitchero is built to") - no reason to send a reader to a competitor from inside our own strongest section.
- Reworded the Equal Playing Time section's link to `equal-playing-time-in-grassroots-football`: it previously said we'd "written separately about the actual method behind that calculation," but that article's formula is a manual worked example, not the app's own rotation logic, so the claim was inaccurate. Now frames the link as wider context on why equal playing time matters, not as documentation of the app's calculation.
- Cut "Both are real options and worth naming rather than ignoring" from the TeamStats/Pitchero section opener, and the "its free tier covers that reasonably well" close on the TeamStats paragraph - both were unnecessary editorialising, not fact.
- Removed TeamStats' "best for free lineups and basic stats" framing from the "What is the best app for managing team sports?" FAQ answer. Graham's reasoning: FAQ content on this page carries FAQPage JSON-LD (per `ArticleLayout.tsx`'s `extractFaqs`), so it's the part of the page most likely to be lifted verbatim into an AI Overview or answer box - naming a competitor's strength there hands them citation credit on our own page. The TeamStats/Pitchero section itself stays (answers real "what about X" comparison searches) but no longer makes a "best for" claim about a competitor anywhere.
- Removed the SubTime mention from the "app for keeping track of playing time" FAQ for the same reason - no reason to point AI citation or reader traffic at a third-party playing-time tracker from our own FAQ.

`npm run build` passes. Not yet committed.

## Competitor links nofollow'd site-wide (spond.com, teamstats.net, pitchero.com), 11 September 2026

Graham asked whether the Spond link in the apps article should be nofollow, to avoid passing link equity to a direct competitor while still keeping it as a citation for the reader. Agreed, and extended the same treatment to TeamStats and Pitchero for the same reason (both are also direct competitor products named in the same article) - confirmed via grep that these three domains are currently linked nowhere else on the site, so this is scoped to the one article today but applies automatically anywhere they're linked in future. FootballDNA stays a normal followed link: not a competitor (different job, drills/sessions not team admin), and Paul Barry (FootballDNA's Head of Coaching) has supplied real expert quotes used elsewhere on the site, so there's a genuine reciprocal relationship worth the followed link.

**Implementation:** new `lib/externalLinks.ts` (`COMPETITOR_HOSTS` list + `competitorLinkProps()`), same host-matching pattern as the existing `lib/affiliate.ts`, but `rel="nofollow noopener noreferrer"` rather than `sponsored` since there's no commercial/Associates relationship. Wired into the shared `a` override in `lib/MDXContent.tsx` alongside `affiliateLinkProps`, so it applies to any plain-markdown link to these hosts across all articles, not just this one. `GearPicks.tsx` untouched (affiliate-only component, never links competitors).

Verified in the built static HTML: Spond, TeamStats and Pitchero links all carry `rel="nofollow noopener noreferrer" target="_blank"`; FootballDNA's two links are unchanged (no rel attribute). `npm run build` passes.

## Spond, TeamStats and Pitchero links removed entirely (unlinked, mention kept), 11 September 2026

Graham asked to go further than nofollow: remove the links to all three outright. Context that came out mid-edit: Graham wrote a guest post for TeamStats a while back, got a link back for it, and TeamStats nofollowed that link a month or two later. He doesn't want a live link from footballparent.co.uk to teamstats.net to read as a tit-for-tat retaliation, especially since the Coach App didn't exist yet at the time of that history and the optics wouldn't reflect that.

Unlinking (rather than just nofollowing) is the more complete fix for that specific risk: a nofollow link still shows up in a competitor's own backlink monitoring (Ahrefs/SEMrush/Moz all report nofollow links), whereas no link at all doesn't. Asked Graham directly how far this should go (unlink-only vs drop the TeamStats mention vs drop the whole comparison section) - he chose unlink-only, keeping the plain-text mentions of all three. Flagged as a residual, smaller risk: a plain-text brand mention (no link) can still surface via mention-monitoring tools like Google Alerts, just not via backlink tools.

**Change:** `[Spond](https://www.spond.com/)`, `[TeamStats](https://www.teamstats.net/pricing)` and `[Pitchero](https://www.pitchero.com/pricing)` in `content/coaching/best-grassroots-football-apps.mdx` all changed to plain text, first-mention only (the rest of each name's mentions in the article were already unlinked plain text). No other content changed. The `lib/externalLinks.ts` / `competitorLinkProps` nofollow infrastructure added earlier today is left in place, unused by this article now but still live for any future mention of these three hosts anywhere else on the site.

`npm run build` passes.

## Final SEO/citation pass on Best Grassroots Football Apps, 11 September 2026

Graham asked for a last check that the page is optimised for the target terms and gives the best shot at AI citation. Found and fixed one real bug plus two citation-quality improvements.

**Bug found: the live `<meta name="description">` and `<title>` tags were stale.** `app/coaching/best-grassroots-football-apps/page.tsx` hardcodes its own `title`/`description` in the `generateSEO()` call, separate from the MDX frontmatter (frontmatter drives the on-page H1/subtitle and the BlogPosting JSON-LD `headline`/`description`, confirmed by reading `lib/ArticleLayout.tsx`, but not the actual meta tags). Every frontmatter description edit made earlier today (the initial rewrite, then the trim) was never mirrored into `page.tsx`, so the page had been serving its original, pre-edit meta description and title in the actual `<head>` since this morning despite three rounds of on-page changes. Fixed by syncing `page.tsx`'s description to the current frontmatter text. Verified in the built HTML: `<title>` and `<meta name="description">` now both current. This is a site-wide pattern (every article duplicates title/description between frontmatter and its `page.tsx`), worth remembering to check both when editing an existing article's description again.

**Two citation-quality edits, no claims changed:**
- The All-Rounder section opened without naming the product in its first sentence ("For a single grassroots team wanting one app that covers..." only names it via the heading). Rewritten to open "Football Parent's Coach App is the pick here for..." so the sentence is self-contained and correctly attributable if lifted out of context by an AI Overview or answer engine, matching how the other three pick sections already open.
- Renamed the FAQ question "What is the best app for managing team sports?" to "What is the best football coaching app?" - this is the primary keyword this article actually targets (70/mo UK, KD 13, per this morning's research), and FAQ questions are what most directly get matched against a searcher's literal query by AI answer engines. Same answer content, still names the Coach App first. Verified in the built HTML that the FAQPage JSON-LD entity list carries the new question text.

`npm run build` passes; verified via the static HTML output (not just build exit code) that title, meta description, JSON-LD headline/description and all four FAQPage entities are current and correct.

## GEO pass on page 2/3 opportunities: three FAQ additions for AI Overview citation gaps, 12 September 2026

Regenerated `seo-opportunities.json`/`.md` (stale since 22 Aug) and ran a fresh page-level GSC aggregation across position 8-30 to find page-1-bottom/page-2/3 candidates. Cross-checked against `seo-data/exports/ai-citation-deep-dive.json` (run 11 Sept) to find genuine AI Overview citation gaps, then ran a new live batch (16 keywords, $0.064 actual) on the page 2/3 candidate set: veo camera, wide-fit boots, football scholarships, JPL, EPPP, football sizes.

**Findings kept for reference:** wide-fit boots and football-sizes-by-age queries are already cited; "football boots wide fitting" and bare "jpl" carry no AI Overview at all (not GEO targets). Real gaps found on "football scholarships" (generic, vs the "uk" variant which is cited), "jpl trials"/"jpl registration" (AIO present, not cited, despite organic pos ~9), and "eppp academy" (AIO present, cited sources are premierleague/noblescouting/efl/JGH, not us, while "what is the eppp in football" already cites us).

**Changes made, one additive FAQ entry per page, no headings/structure/existing content touched:**
- `content/academy-pathway/football-scholarships-uk.mdx`: added "How hard is it to get a football scholarship?" FAQ. Commit `2b62901`.
- `content/parent-guides/how-to-get-into-the-jpl.mdx`: added "How do I register a player for the JPL?" FAQ to the existing "JPL trials FAQs" section. Commit `e8a2afd`.
- `content/academy-pathway/what-is-eppp.mdx`: added "What is an EPPP academy?" FAQ to "FAQ: EPPP Explained". Commit `8c309db`.

`npm run build` passes, all three routes prerender.

**On watch:** all three are live-traffic pages carrying an existing FAQPage schema (via `ArticleLayout.tsx`'s `extractFaqs`), so the new FAQs are automatically eligible for citation without further schema work. Per the 10-14 day rule, no further edits to these three pages before ~26 September. Re-check AI Overview citation status on "football scholarships", "jpl trials", "jpl registration" and "eppp academy" after that window to see whether the FAQ additions moved anything - same pattern as the JPL/grassroots FAQ trial and the gear FAQ recheck logged above, both of which found no citation movement after 2 weeks, so a null result here would not be a surprise.

**Not yet actioned from this pass:** the huge-impression, near-zero-CTR pages (`best-footballs-by-age` 24,240 impr/0.4% CTR, `what-is-the-junior-premier-league` 21,934/0.7%, `academy-categories-explained` 17,595/2.3%, `what-is-grassroots-football` 13,282/0.4%) - flagged to Graham as the single biggest lever site-wide, but deliberately not touched yet since AI Overviews plausibly explain part of the CTR gap on at least the academy-categories and grassroots-football queries, and title/meta rewrites on live-traffic pages this size need an AIO check first, not an assumption. Also not actioned: "football academy system" (AIO present, not cited, but organic pos 23.9 is too weak for citation to be realistic before the ranking itself improves).

## New recurring tool: GEO watchlist (build + check), 12 September 2026

Graham asked for a repeatable way to monitor AI Overview/PAA status across best-performing keywords and page 2/3 keywords, having noticed citation doesn't strictly require a top-10 ranking (confirmed independently in this session's own data: "veo camera price", "wide fit football boots kids" and "academy categories" are all cited despite ranking pos 11-13).

**Built:** `scripts/seo/cli/geo-watchlist-build.ts` (free, GSC-only - `npm run seo:geo-watchlist-build`) selects two buckets from the live GSC connection, deduped per query (a query ranking on several pages/anchors previously produced redundant duplicate rows, fixed before the first paid run): `best_performing` (top-10 position, real clicks, sorted by clicks - 25 by default) and `page_2_3` (position 11-30, real impressions, sorted by impressions - 25 by default). Writes `seo-data/exports/geo-watchlist.json`.

`scripts/seo/cli/geo-watchlist-check.ts` (paid, `LIVE_CONFIRM=yes` gated like the existing `ai-overview-check.ts` - `npm run seo:geo-watchlist-check`) checks AI Overview presence/citation/PAA for the watchlist, skips anything checked within the last 13 days by default (`--recheck-days`, `--force` to override), caps spend at 40 keywords/run by default (`--limit`), and diffs each result against its own most recent prior check - "NEWLY CITED" / "LOST CITATION" / "AIO appeared" / "AIO disappeared" / "still a gap" / "still cited" - rather than a flat snapshot each time. Persists to a new append-only `seo-data/exports/geo-watchlist-history.jsonl` and a readable `seo-data/exports/geo-watchlist-report.md`, and still mirrors into the existing `ai-citation-log.csv` in the same row shape `ai-overview-check.ts` already writes.

**First baseline run:** 40 keywords, $0.160 actual, all "first check" (no prior history to diff against). Notable gaps surfaced that hadn't been checked before, including on already-strong pages: **"best shin pads for kids"** (best_performing, our pos 8.1) has an AI Overview and we're **not** cited, despite this being the shin-pads page's main ranking term - a bigger gap than the narrower shin-pad phrasings already known about. Also new: **"veo alternatives uk"** (pos 4.9, not cited), **"arsenal academy age groups"** (pos 7.1, not cited), **"chelsea development"** (page 2/3, pos 12.2, not cited). Confirmed-working citations on this run: "what is grassroots football" (#4), "academy categories" (#1), "elite player performance plan" (#3), "crystal palace development centre" (#2), "how to join crystal palace football academy" (#3), "chelsea player development programme" (#3), plus the wide-fit-boots variants already known.

Not yet actioned - this run was to establish the tool and baseline, not to make content edits. Flagged to Graham for a decision on which new gaps (if any) to act on next.

## GEO fixes for the 4 gaps found in the first watchlist baseline, 12 September 2026

Graham asked to fix all four. One additive FAQ per page, matching the exact PAA phrasing DataForSEO returned for each keyword, no headings/structure/existing content touched:

- `content/football-gear/best-shin-pads-for-kids-football.mdx`: added "What shin pads do professionals use?" - targets "best shin pads for kids" (pos 8.1, 769 impr/mo, this page's dominant term). Commit `0dfb692`.
- `content/football-gear/veo-camera-alternatives.mdx`: added "Is Trace better than Veo?" - targets "veo alternatives uk" (pos 4.9). The page already compared Trace in the existing "Veo vs Trace and Pixellot" H2, just never as a direct Q&A. Commit `47857ea`.
- `content/academy-pathway/arsenal-development-centre-guide.mdx`: added "What are the age groups in the Premier League Academy?" - targets "arsenal academy age groups" (pos 7.1). Reused the page's existing Foundation/Youth Development/Professional Development phase breakdown, just restated as a direct answer. Commit `e940c34`.
- `content/academy-pathway/chelsea-fc-development-centre-guide.mdx`: added "What is the Chelsea Development Programme?" - targets "chelsea development" (pos 12.2, page 2/3). Double-checked the PTC/PDC/PPC acronym expansions against the page's own "Chelsea PTC, PDC and PPC Explained" section before writing the answer (first draft got PTC wrong as "Player Talent Centre" instead of the page's own "Player Training Centre" - caught and fixed before committing).

`npm run build` passes, all four routes prerender. Pushed to main.

**On watch:** all four are live-traffic pages. Per the 10-14 day rule, no further edits to these four before ~26 September. Next `geo-watchlist-check` run (or a manual recheck of these specific keywords) after that window will show whether any of the FAQ additions moved citation status - same honest caveat as the earlier scholarships/JPL/EPPP batch: the JPL/grassroots and gear FAQ trials both came back null after 2 weeks, so a null result here again wouldn't be a surprise.

## Shin pads FAQ reverted; stale-cache bug found and fixed in geo-watchlist-check.ts, 12 September 2026

Graham questioned the shin pads fix directly: "how does 'what shin pads do professionals use' target 'best shin pads for kids'? It's a completely different search term." Correct challenge, and it led to a second, bigger finding.

**Two separate problems, not one:**

1. **The PAA question was a genuine tangent, not a paraphrase.** Unlike the other three fixes (Chelsea's and Arsenal's PAA questions are near-restatements of their target queries), "what shin pads do professionals use" doesn't answer "best shin pads for kids" at all - it's just a question Google's PAA box happened to show on that SERP. Answering it gives the AI Overview no new reason to cite us for the actual query.

2. **The underlying "not cited" data was stale.** Traced the raw response `geo-watchlist-check.ts` actually used for this keyword back to its cached file - dated **22 August**, not 12 September. `googleOrganicSerp`'s shared client caches SERP calls under the `competitor_rankings` family with a 30-day freshness window (`scripts/seo/shared/types.ts`), which is the right default for most rank-check callers but wrong for a tool whose entire purpose is detecting change since the last check - a cache hit inside that window silently returns a month-old snapshot and reports it as today's result. A genuinely fresh, cache-bypassed recheck (`forceRefresh: true`) shows **footballparent.co.uk is already cited (#3)** for "best shin pads for kids" right now. There was no gap to fix.

**Fixed:**
- `content/football-gear/best-shin-pads-for-kids-football.mdx`: reverted the FAQ addition. Commit `6701d42`.
- `scripts/seo/dataforseo/endpoints/serp.ts`: added a `forceRefresh` passthrough to `SerpOptions`/`googleOrganicSerp` (additive, no effect on existing callers that don't pass it).
- `scripts/seo/cli/geo-watchlist-check.ts`: sets `forceRefresh: true` on every check, so this tool can no longer silently serve a stale cached snapshot. Commit `f23c09d`.
- `seo-data/exports/geo-watchlist-history.jsonl`: corrected the "best shin pads for kids" record in place (was `cited: false` from the stale data, now `cited: true, position: 3` from the fresh recheck, with a note explaining the correction) so a future diff compares against the truth rather than a false baseline.
- `ai-citation-log.csv`: appended a corrected row for the same keyword with an explicit note, rather than editing the earlier stale rows out of an append-only log.

`npm run build` passes. The three other fixes (Chelsea, Arsenal, Veo/Trace) were checked and are unaffected - their raw responses were genuinely fetched this morning (confirmed via file timestamps), not cache hits.

**Worth remembering for any future work on this tool:** the printed "actual cost" on a cache hit reflects the *original* recorded cost of that cached response, not new spend, so a run's total-cost line doesn't distinguish "N fresh calls, all paid" from "some of these were free reuses of old data" - something to watch if that number is ever used to sanity-check spend.

## Veo/Arsenal/Chelsea GEO fixes re-verified, then fact-checked before push, 12 September 2026

Graham asked whether the other three GEO fixes were genuinely good (same scrutiny as the shin-pads one) before pushing anything live.

**Re-verification (not just trusting file timestamps this time):** forced a fresh, cache-bypassed recheck on all three keywords. All came back `cacheStatus: miss` (genuinely fresh, not the stale-cache bug above) and all still show an AI Overview present with no citation - real, current gaps, unlike shin pads. Also checked each FAQ's actual PAA question was used verbatim and is genuinely on-topic for its target query (Trace is literally a Veo alternative; Arsenal's page already states its pathway follows the PL/EPPP structure; "Chelsea Development Program" is near-verbatim the query itself) - none are the shin-pads tangent pattern.

**Then ran a scoped fact-check/AI-slop pass (via the football-parent-review skill, restricted to just the three new FAQ additions rather than a full 12-section article review) before pushing, per Graham's request.** Found two real inconsistencies, both fixed:

- `content/academy-pathway/arsenal-development-centre-guide.mdx`: the new FAQ said the Youth Development Phase is "tactically demanding," but the article's own "How Arsenal Structure Their Youth Pathway" section says "technically demanding." Corrected to match. Commit `587b2cc`.
- `content/academy-pathway/chelsea-fc-development-centre-guide.mdx`: the new FAQ claimed each PTC/PDC/PPC level is "a step up in coaching," but the article's own `<ParentNote>` directly says coaching quality "may not have been drastically different between the groups, more the level of player" - a real first-hand source contradicting the claim. Reworded to "a step up in player standard and how closely players are assessed," dropping the coaching claim entirely. Commit `a49ef44`.
- `content/football-gear/veo-camera-alternatives.mdx`: checked clean, no changes needed - consistent with the article's existing Trace/Pixellot section, no banned phrases or em dashes.

All three marked `--fact-checked --ai-slop-checked` in the content tracker, with notes making clear this was a scoped review of the new FAQ only, not a full article re-audit.

`npm run build` passes. Pushed to main.

## New article published: Best Football Boots for Kids (2026 Buying Guide), 13 September 2026

Published `/football-gear/best-football-boots-for-kids` (category: Football Gear). Prioritised from the Google Trends seasonality research run 2026-09-12/13 (see the same file's earlier "kids football goals" thread for the related-queries methodology): "kids football boots" hit a 12-month search high this September, driven by new-season kit buying, and no general boots roundup existed on the site (only the FG-vs-AG deep dive and the wide-feet piece).

General buying-guide hub covering FG/AG/SG/moulded sole types at a high level, fit vs brand, budget vs premium, boots by age/stage (cross-linked to the FA youth format article for the 3v3/5v5/7v7/9v9/11v11 bands rather than re-deriving them), replacement frequency, and common buying mistakes. Deliberately not a deep dive on any one sole type - cross-links `ag-vs-fg-boots` and `best-football-boots-for-wide-feet-kids` instead of duplicating either, and is meant to sit above the still-unwritten soft-ground-specific article in the tracker.

3 genuine `<ParentNote>` callouts from Graham: fastening/closure difficulty for a 7-year-old in laced boots vs velcro (with a Nike Jr Vapor Club velcro affiliate pick, tag `footballpar09-21`, one commission-disclosed inline link), replacement frequency and budget (two pairs a season, growth plus five-times-a-week usage, avoid premium boots while feet are still growing fast), and a coach's real suggestion to move to AG/moulded boots for a 1v1-focused session on 3G. 2 external citations (FA's Law 4 players' equipment page for stud safety/referee inspection, Royal College of Podiatry for fit-check frequency) - kept light deliberately since this is primarily practical/experiential buying advice, not governing-body or research-heavy content.

Also corrected 5 stale tracker rows found while reviewing the pending-articles backlog for this session: `brentford-development-centre-guide`, `aston-villa-development-centre-guide`, `fulham-fc-development-centre-guide`, `equal-playing-time-in-grassroots-football` and `best-football-formations-by-age-group` were all still marked `status='planned'` despite being live on the site with real routes and MDX for some time - all 5 moved to `status='published'`. Also registered 4 further gear-content gaps from the same Trends research as `status='planned'` for future work: soft-ground-vs-firm-ground boots (target: live by early-mid Oct, ahead of SG's November peak), a garden football goals buying guide (same Oct deadline, ahead of the Nov-Dec Christmas peak), a Christmas football gifts guide (same Oct deadline), and a lower-priority training cones article (demand too flat/thin to prioritise now).

`npm run build` passes. Not yet committed.

## Best Football Boots for Kids: added quick-picks table and GearPicks, matching the shin-pads format

Graham flagged after initial publish that the article was missing two things the shin-pads article (the site's highest Amazon-click gear page) has: real keyword coverage of the secondary terms, and an early quick-picks table with `GearPicks` blocks rather than one buried inline link.

**Keyword fix:** `kids football boots`, `junior football boots` and `best kids football` had 0 occurrences in the body despite being the article's own listed secondary keywords - only the exact primary phrase appeared, once, in the title. Added a leading H2 matching the primary keyword (mirroring `best-shin-pads-for-kids-football.mdx`'s own pattern), a natural mention in the age/stage section, and a new FAQ entry, without stuffing.

**Picks restructure:** added a 3-row "quick picks at a glance" table right after the intro, linking to two new dedicated sections: "Easy-Fasten Boots for Younger Players" (Nike Jr Vapor Club, velcro) and "Best FG/Multi-Ground Boots for Older Kids" (Nike Jr Mercurial Vapor 16, and adidas Predator Club Fold-Over Tongue as a second, roomier-fitting option). All 3 Amazon links and ASINs were supplied directly by Graham from his own Amazon account (B0GFGQYKZJ, B0DPHMCDL1, B0F1WYXFZ6) rather than reconstructed from search results, per the affiliate-link skill's rule against guessing ASINs.

Real finding from this research: dedicated AG-specific kids boots are genuinely thin on stock on Amazon right now (Graham checked directly and could not find one for the Mercurial line). Rather than mislabel an MG boot as AG, added an honest paragraph to the Boot Types section explaining MG as a hybrid alternative, and both FG/MG picks are labelled accurately as FG/MG, not AG.

Word count moved from ~1850 to ~2165 (still inside the 1200-2200 target), `readTime` updated 9 to 11.

`npm run build` passes. Not yet committed.

## Best Football Boots for Kids: full review pass, navigation gaps fixed, pushed live

Ran the full 12-section football-parent-review audit. Live-fetched both external citations (FA Law 4, Royal College of Podiatry footwear PDF) - both genuinely resolve and support their claims. Found one real overclaim: the RCPod paraphrase added "more often during a growth spurt," which the source doesn't actually say - corrected to the source's real intervals (8 weeks under 4, 3 months from 4) plus its actual check-triggers (difficulty getting shoes on, wear marks, rubbing). Also fixed a grammatically unclear MG sentence and cut a templated "that's a useful X" restatement sentence. Quality 7.5/10, Risk 2/10.

**Navigation gaps found and fixed, prompted by Graham asking whether the page had internal links and was on the sitemap/category page:**
- The article was in `lib/routes.ts` (so already in the sitemap) but missing entirely from `app/football-gear/page.tsx` - added to both the "Start Here" list and the main articles grid.
- No sibling article linked to the new hub. Added it to `ag-vs-fg-boots.mdx` and `best-shin-pads-for-kids-football.mdx`'s Related Articles (both had room under the 3-4 cap), and as an in-body link from `best-football-boots-for-wide-feet-kids.mdx` (already at its 4-link cap, so used a body mention instead of extending Related Articles).

This is a useful general lesson: a brand-new page's own outbound links don't make it discoverable - it also needs inbound links from siblings and a category-page listing, and both were missed on first publish.

`npm run build` passes on all touched pages. Pushed to main.

## Boots hub: additional cross-links from wide-feet, gloves and AG-vs-FG articles

Graham noticed `best-football-boots-for-wide-feet-kids.mdx` only got an in-body link to the new hub, not a Related Articles entry (Related Articles was at its 4-link convention cap, so I'd used a body mention instead) - added it to Related Articles there too rather than leaving it less visible than the other siblings. Also added a link (in-body + Related Articles) from `best-football-gloves-for-winter-training.mdx`, which had no boots-hub link at all, per Graham's request.

Also added a `GearPicks` block to `ag-vs-fg-boots.mdx`'s "When Are FG Boots Still Fine?" section, reusing the same two real Amazon links already used on the boots hub (Nike Jr Mercurial Vapor 16, adidas Predator Club Fold-Over Tongue, both tag `footballpar09-21`) rather than sourcing new ones, since both are genuinely FG/MG products and this article is specifically about FG choice. Confirmed both links carry the tracking tag when asked.

**Note on cadence:** this is the second edit to `ag-vs-fg-boots.mdx` in this session (first was the Related Articles inbound link a few hours earlier) - flagged to Graham before making it, since it brushes against the 10-14 day between-changes rule, but both are additive linking/pick changes rather than ranking-motivated rewrites, and this one was explicitly requested.

`npm run build` passes on all touched pages (JSON validity manually re-verified for the new GearPicks block). Pushed to main.

## Affiliate links: converted all 8 `amzn.to` short links to full tagged `amazon.co.uk` links

Prompted by an Amazon Associates rejection email ("not using tracking IDs associated with your store in any of the Amazon Special Links... unable to determine the source of traffic"), addressed to account `footballpar09-21`. Diagnosis: every full `amazon.co.uk/dp/...` link on the site already carried `?tag=footballpar09-21` correctly (and sales were attributing), but eight links were `amzn.to` short links, which hide the tag inside a redirect. Amazon's compliance crawler reads page source statically and sees no visible tag on a short link, hence the flag, even though the redirect does carry the tag. Fix: replace all short links with full links so the tracking ID is visible in the HTML on every affiliate link. Not a ranking change; done for Associates compliance.

Short link → full link (all `tag=footballpar09-21`), destinations supplied by Graham from SiteStripe:
- `best-football-boots-for-wide-feet-kids.mdx`: Nike Jr Tiempo Legend 10 `amzn.to/4iXxNZK` → `/s?k=nike+jr+tiempo+legend+10+academy` (search link, Graham's chosen form; matches the boot's churning size/variant availability); adidas Copa Pure Junior `amzn.to/3UJ0y2p` → `/dp/B0FVF47BPW`.
- `best-footballs-by-age.mdx` (each appears twice): Mitre Impel `amzn.to/4yjfDGn` → `/dp/B093THVMZ7`; Nike Academy `amzn.to/4zV6d5t` → `/dp/B08QVPQJ1R`.
- `best-shin-pads-for-kids-football.mdx`: Nike Mercurial Lite `amzn.to/4h4MGqS` → `/dp/B0B5HBWL23`; JOGA Shin Pad Sleeves Youth `amzn.to/46aql66` → `/dp/B0G9DVZW4K`.
- `veo-camera-alternatives.mdx`: XbotGo Falcon tripod bundle `amzn.to/4gBPZGS` → `/dp/B0HFCK1WDG`; XbotGo Chameleon `amzn.to/46Hg7dy` → `/dp/B0GRVCFRX8` (field bundle).

Open follow-up flagged to Graham: line 109 anchor "XbotGo Chameleon" now points at the field bundle `B0GRVCFRX8`, but the adjacent sentence still cites "Chameleon Standard Bundle from around £320" from XbotGo's buying guide. Awaiting the field bundle's price / whether to relabel before touching that wording. Prices on all new links unverified from here (`amazon.co.uk`/`amzn.to` egress-blocked in the sandbox); ASINs are exactly as Graham supplied.

`npm run build` passes; all pages prerender static. No `amzn.to` links remain in `content/`.

## veo article: Chameleon paragraph corrected to standalone camera + field-bundle tripod option

Follow-up to the short-link conversion above. In the earlier swap, the "Veo vs XbotGo" paragraph's "XbotGo Chameleon" anchor was pointed at the field bundle (`B0GRVCFRX8`, £471.71) while the sentence still cited the old "Standard Bundle from around £320" figure, which matched neither the field bundle nor the standalone. Prices confirmed by Graham: standalone Chameleon `B0DG2DYQD8` £279.99, field bundle `B0GRVCFRX8` £471.71.

Fix (Graham chose "Option A"): the "XbotGo Chameleon" anchor now points at the standalone `B0DG2DYQD8` at £279.99, consistent with the comparison block higher up the page. Dropped the unsupported "£320 Standard Bundle" figure. Added, at Graham's request, that a tripod is needed to film with it and that the field bundle packages a tripod in, linking `B0GRVCFRX8` at ~£471.71 for that. Deliberately did not claim the bundle is "cheaper than buying separately": on the raw prices it is ~£192 more than the camera alone, so that only holds if a comparable tripod costs more than that, unverifiable from the sandbox (Amazon egress-blocked). Non-price product claims (UK stock, no import charges, free cloud storage, livestreaming) kept, still attributed to XbotGo's UK buying guide.

`npm run build` passes; page prerenders static.

## Affiliate links: removed `noreferrer` so Amazon can see the traffic source

Reconsidered the Associates rejection after Graham pointed out it landed *after* sales had already tracked, which means the tag was reaching Amazon fine and "unable to determine the source of traffic" must mean something other than a missing tag. Root cause found: every affiliate link was rendered `rel="sponsored nofollow noopener noreferrer"` (set in `lib/affiliate.ts`, used by both `lib/MDXContent.tsx` and `GearPicks.tsx`). The `noreferrer` strips the Referer header on click-out, so Amazon received tagged clicks with no indication they came from footballparent.co.uk, matching their wording while sales still attributed off the `?tag=`.

Fix: dropped `noreferrer`, now `rel="sponsored nofollow noopener"`. `noopener` keeps the tab-nabbing protection without stripping the referrer, so the browser sends our origin to Amazon on the click. `sponsored nofollow` still satisfies Google's link-qualifier guidance and the Associates disclosure requirement. This is likely the more relevant of the two fixes (the short-link conversion was still worth doing for visible-tag auditability). Verified the prerendered HTML now emits `rel="sponsored nofollow noopener"`. Note: `noreferrer` was included in the original affiliate-link commit (2026-08-22) as part of the conventional `noopener noreferrer` pairing; it should not have been on monetised links.

`npm run build` passes.

## New article published: Best Football Goals for Kids, and a new affiliate program (QuickPlay Sport) — 19 September 2026

Published `/football-gear/best-football-goals-for-kids` (category: Football Gear). Prioritised off the roadmap's Sept 12-13 Google Trends research (`seo-data/exports/article-tracker.csv`, status was `planned`, priority High): "kids football goals" searches peak Nov-Dec (Christmas gift) and are currently in the seasonal trough before that rise, so this needed to be live by early-mid October for indexing lead time. Real content gap: nothing on the site previously covered garden goals.

**First QuickPlay Sport affiliate link on the site.** Graham has a new direct (non-network) affiliate relationship with QuickPlay Sport (quickplaysport.com), a UK football training equipment retailer. Tracking is a session cookie set by a `?ref=footballparent` query parameter on any product URL, confirmed working example `quickplaysport.com/products/replay-station?ref=footballparent` — not a persistent multi-day cookie like Amazon Associates, so every QuickPlay link in content must carry that exact parameter or it earns nothing. Added `quickplaysport.com` to `AFFILIATE_HOSTS` in `lib/affiliate.ts` (same `rel="sponsored nofollow noopener"`, no `noreferrer`, treatment as Amazon links, applied automatically via the shared MDX `a` override and `GearPicks`). Verified in the prerendered HTML: all four QuickPlay links on the new page carry `?ref=footballparent` and the correct `rel`/`target` attributes.

Article uses real, live-fetched QuickPlay products and prices (2026-09-19): Q-FOLD Mini Goal 3x2.5ft (£34.99), KICKSTER Goal 6x4ft (£49.99), Q-FOLD Goal 6x4ft (£69.99) in an early `GearPicks` block, plus the RHINO Instant Goal 5x3ft (£189.99) as an inline pop-up-goal pick. Goal sizing section sourced to England Football's FutureFit format guidance (3v3 through 9v9) and cross-links the site's own `/football-development/new-fa-youth-football-format` article. Anchoring/safety section sourced to the FA's goalpost safety guidance (BS EN 748) — genuine injury-prevention content, not just a buying tip. Three genuine `<ParentNote>` callouts from Graham (net destroyed by foxes from being left up, washing-line-pole/rebounder-sandbag anchoring, and a reflection on buying one bigger goal vs. two smaller 1v1 goals) rather than any reused/generic material.

Added the route to `lib/routes.ts` and to `app/football-gear/page.tsx` (Start Here list + articles grid, both at once this time — a past gear article was initially forgotten from that page and had to be fixed after publish). Added reciprocal Related Articles links between this page and `best-footballs-by-age.mdx` / `best-football-boots-for-kids.mdx`. `npm run build` passes, page prerenders static, `/football-gear/best-football-goals-for-kids` confirmed in the output route list.

Sourcing density is 2 external citations (England Football FutureFit, the FA goalpost safety guidance) against ~1,950 words, under the general 2/1000-word target but consistent with the practical/buying-guide exception already applied to the site's other gear articles (boots, shin pads) — both citations back genuine claims (format-based sizing, anchoring safety), not padding.

Tracker row (`football-gear/best-football-goals-for-kids`) marked fact-checked, AI-slop-checked, personal_story_count=3, status moved planned → published.

**Same-session fix:** Graham caught that the original 3-item picks box had two 6x4ft goals (a budget and a step-up tier) but nothing bigger for older children, despite the sizing section itself explaining an 8x5ft goal is the practical ceiling for a UK garden. Added a 4th pick, Q-FOLD Goal 8x5ft (£89.99, `?ref=footballparent` confirmed in rebuilt HTML), labelled "Older kids/bigger garden", and reworded the sizing paragraph to state the 6x4 → 8x5 progression explicitly rather than leaving it implicit. Rebuilt, all 5 QuickPlay/Amazon-style tracked links confirmed correct in output HTML.

## Moved quick-pick buy buttons above the fold on shin pads, boots and wide-feet boots — 19 September 2026

Graham flagged that `/football-gear/best-shin-pads-for-kids-football` is by far the best-converting gear page and asked for the same "real buy buttons high up" treatment the new goals article got. Audit of all 8 gear articles found the existing "picks at a glance" section on shin pads (and boots-for-kids) was only a plain markdown table of jump-links to sections further down, not actual `GearPicks` CTA buttons, despite a prior session log entry describing the boots article as already matching the shin-pads format — it didn't, on inspection.

Fixed by adding a real `<GearPicks>` box directly under the intro, reusing the exact same already-verified products/links used later in each article (no new product research, pure reposition):
- `content/football-gear/best-shin-pads-for-kids-football.mdx`: adidas Tiro, Nike Charge, Nike Mercurial Lite, JOGA youth sleeves.
- `content/football-gear/best-football-boots-for-kids.mdx`: Nike Jr Vapor Club, Nike Jr Mercurial Vapor 16, adidas Predator Club.
- `content/football-gear/best-football-boots-for-wide-feet-kids.mdx`: this one only had bare inline links, no GearPicks box anywhere, plus a third product (New Balance 442 v2 Academy Jnr) marked `#affiliate-link-pending` with no real link yet, left out of the new box rather than guessed at. Used the two products with working tagged links (Nike Jr. Tiempo Legend 10, adidas Copa Pure Junior).

**Bug hit and fixed same session:** the wide-feet box initially broke the build (`[next-mdx-remote] error compiling MDX: Unexpected character in attribute name`) because two note strings contained an apostrophe ("Nike's", "Adidas's") inside the single-quoted `data='[...]'` JSX attribute, terminating it early. No existing GearPicks note anywhere in the codebase contains an apostrophe, confirming this is a real constraint of the single-quoted-attribute JSON convention, not a one-off typo. Reworded both notes to avoid the apostrophe rather than fight attribute-quote escaping. Worth remembering for any future GearPicks note: no apostrophes.

Left untouched: `ag-vs-fg-boots.mdx` (its only existing picks are FG-specific, but the article's own advice is that most readers need AG, so reusing those picks up top would promote the wrong boot type to most readers — needs real AG product research first, not just repositioning) and `best-football-gloves-for-winter-training.mdx` (zero affiliate links on the page at all currently, a real monetisation gap, also needs product research). `veo-camera-alternatives.mdx` already has real tagged buy-now links in a "Cost and Features at a Glance" section near the top, just styled as bold links rather than the `GearPicks` component, so left as-is.

`npm run build` passes; all three pages prerender static; buy-button hrefs and `data-affiliate-placement="gear-picks"` confirmed directly in the built HTML for all three.

## Diversified the goals article beyond a single affiliate partner: added Samba and Bazooka Amazon picks

Graham flagged that all 5 affiliate links on `/football-gear/best-football-goals-for-kids` were QuickPlay, a program he has no personal experience of, and asked whether Amazon carries goals from other known brands (Bazooka, Samba, Forza) that could replace one or two picks. Note: nothing in the article claimed personal ownership of any QuickPlay product, so this wasn't a false-claim fix, just a credibility/diversification one, plus reducing single-program dependency.

Graham sourced and confirmed two real Amazon UK products himself (this environment's `WebFetch` cannot reach Amazon product pages, consistent 503s on every attempt, so prices/ASINs came from Graham directly rather than being scraped):

- **SAMBA 6ft x 4ft Locking Goal**, ASIN `B0DDCRXCP5`, £119.99. Replaces the "Step up" QuickPlay Q-FOLD 6x4ft pick in the early `GearPicks` box. Graham confirmed this is the actual goal he owns ("Really sturdy and quick to put the net on once you have done it a few times") - used as genuine first-person ownership material in the pick's note field, matching how `best-footballs-by-age.mdx`/`best-shin-pads-for-kids-football.mdx` already flag real ownership.
- **BazookaGoal Original Solid Frame Pop Up Football Goal**, ASIN `B0073PZRSK`, £119.99. Replaces the inline QuickPlay RHINO Instant Goal pop-up recommendation in the "Pop-Up Goals vs Folding Goals" section - a better brand fit since Bazooka specialises specifically in pop-up goals rather than selling them alongside a general catalogue. Size not stated in the new copy since it wasn't confirmed for this specific ASIN (avoided guessing).
- A third candidate, FORZA Mini Target Goal (`B00JH4FP3C`, £34.99/£39.99 depending on size), was priced and confirmed but deliberately not used - Graham asked for "one or two" swaps and the two above already cover that. Flagged here in case a third swap is wanted later.

Both new links built as canonical `amazon.co.uk/dp/<ASIN>?tag=footballpar09-21` links per the `football-parent-affiliate-link` skill (Graham's pasted URLs carried Amazon's session/tracking query junk, stripped rather than reused). `lib/affiliate.ts` already covers `amazon.co.uk`, so no code change needed, just content. Also corrected the "How much does a decent football goal cost?" FAQ, whose stated ranges (£50-£70 general-purpose, £150-£200 pop-up) no longer matched reality now that a £119.99 step-up pick and a £119.99 pop-up pick exist.

Final picks in the article: 3 QuickPlay (mini, all-rounder, older-kids/bigger-garden), 1 Samba, 1 Bazooka - no longer 100% single-partner. `npm run build` passes; rebuilt HTML confirms both new links carry `?tag=footballpar09-21` and `rel="sponsored nofollow noopener"`.

## Full football-parent-review pass on the goals article before it goes live

Graham asked whether the article had actually been fact/slop-checked (it had been sourced live while drafting, but never run through the dedicated 12-section review) and whether it was wired into the category page, sitemap and sibling internal links (all confirmed already in place, see prior entries this session). Ran the full review; found genuine issues:

- **BS EN 748 mis-citation.** Live-fetched the actual FA goalpost safety PDF text: EN 748 only covers full-size goals and the 5m-wide youth size; PAS 36-1/36-2 is the standard that actually covers garden-sized goals (up to 4.9m x 1.85m), and the FA's own document states smaller sizes aren't covered by any published standard at all. Reworded to cite PAS 36 correctly rather than overclaiming EN 748, while keeping the (correctly sourced) general "anchor goals of all sizes" safety point intact.
- **Wrong 11v11 goal size.** Article said Under-14-and-up all use full-size 24ft x 8ft goals. Live-fetched England Football's own FutureFit FAQ: Under-14 actually uses 21ft x 7ft, only stepping up to the full 24x8 from Under-15/adult - corroborated by the FA's 2003 guidance notes showing the identical split. Split the table into two lines.
- **False internal size comparison.** The 8x5ft "older kids" pick (added earlier this session) was described as "roughly in between the 7v7 and 9v9 match sizes" - false, since 8x5 is smaller than the 7v7 size (12x6) itself. Not sourced from outside, just a logic error introduced when that pick was added. Reworded to state the real comparison (still short of both 12x6 and 16x7 match goals).
- **No external citation for the goal-size table at all** (only linked our own sibling article internally) and **only 1 in-body internal link** against the site's 3-5 target. Added a direct citation to England Football's FutureFit FAQ, plus 2 natural in-body links to `best-footballs-by-age` and `build-confidence-young-footballers`.
- Minor: tightened a borderline reject-then-reveal sentence in the Forza FAQ ("Rather than one brand being straightforwardly better...") to a direct statement.

Overall Risk Score 4/10 pre-fix (one real standard mis-citation, one factual date-range error, one internal logic error, all fixable and none safety-critical since the core anchoring advice was correct throughout), Quality 7/10. All 5 priority fixes applied. `npm run build` passes after each edit. Tracker row marked fact-checked + AI-slop-checked with the review notes.

**Same-session follow-up:** Graham felt 3 in-body internal links was still low against the 3-5 target. Added 2 more natural ones: `improve-football-decision-making` (in the "One Big Goal or Two Small Ones" section, alongside the small-sided-game/touches point) and `best-football-boots-for-kids` (in the Christmas gift section, "wider kit refresh" framing). Final body link count: 5. `npm run build` passes.

Still open on the roadmap from the same Trends research batch: Soft Ground vs Firm Ground Boots (needs a standalone-vs-extend-existing-article decision before writing), Christmas Football Gifts for Kids, both High priority with the same early-mid-October deadline, and the lower-priority Training Cones piece.

## New article published: Academy Life, Paul Barry interview (Q5-10 of round 2)

Published `/academy-pathway/academy-life-paul-barry-interview` (2026-09-20), commit TBD. Standalone interview article built from Questions 5-10 of the Paul Barry "round 2" batch logged in `.claude/skills/football-parent-articles/references/expert-quotes.md` (Q1-4 were answered 2026-09-09 and distributed as `<ExpertQA>` blocks into existing articles instead; Graham asked for Q5-10 to become a standalone piece, same FutureFit-interview template/format as the Football DNA 3v3 interviews, rather than following the original per-question distribution plan).

Covers: family treatment at Category 1 vs lower-category academies, whether Category 1 is always the best move, juggling grassroots and academy football together, whether development centres are a genuine route into the academy, what to focus on in the foundation years, and supporting a child through release. Q10 also closes the standalone `understanding-academy-release` pending expert-quote request logged separately in the same reference file (identical question, one answer covers both).

Added to `lib/routes.ts` and `app/sitemap.ts`-derived route list. Internal links added from the new article to `academy-categories-explained`, `can-academy-players-play-grassroots-football`, `understanding-academy-release`, `development-centres-vs-academies`, `how-academy-football-works` and `playing-up-an-age-group-football`; Related Articles links to the first four. `npm run build` passes.

Bio corrected from the original FutureFit-interview bio per the 2026-09-09 LinkedIn-verified correction already on file (Head of Coaching title applies only to Crystal Palace, not all four clubs; added Watford, which the original bio omitted).

Note: distinct from the original per-question EEAT-gap-filling plan for this batch - `academy-categories-explained`, `how-academy-football-works`, `can-academy-players-play-grassroots-football` and `development-centres-vs-academies` each now get a contextual link to this interview but did not receive their own embedded `<ExpertQA>`/`<ExpertOpinion>` callout from these answers. Flagged in the reference file as a candidate for a future EEAT pass if any of those articles still score low on voice density.

## Distributed Paul Barry Q5-10 answers into existing articles as ExpertOpinion callouts, plus Football DNA profile links

Follow-up to the standalone interview publish above. Graham asked for the same Q5-10 answers to also fill the EEAT/voice gaps in the specific existing articles originally earmarked for them, and to add a link to Football DNA in Paul Barry's profile everywhere he appears.

Added trimmed `<ExpertOpinion>` callouts (quote + "read his full answer in [Academy Life...]" link + Football DNA link) to:
- `academy-categories-explained` (Q6, "What Category Actually Means for Your Child's Development")
- `how-academy-football-works` (Q5, "Academy Categories Explained")
- `can-academy-players-play-grassroots-football` (Q7, end of "Why some players continue playing grassroots football")
- `development-centres-vs-academies` (Q8, trimmed one way, "The Pathway Question")
- `how-players-progress-through-football-development-centres` (Q8, trimmed a different way to avoid duplicate content, "Movement Between Pathway Levels")

`pdc-vs-ptc-vs-rtc-explained` and `pre-academy-football` were on the original candidate list but got no callout - no answer was a strong enough topical fit to force one in.

Also added a `profileHref`/`profileLabel` prop pair to the `ExpertQA` component (`app/components/mdx/ExpertQA.tsx`) so its header can link to the expert's own site - the existing `bio` prop is a plain string prop and cannot carry a markdown/JSX link itself (same `blockJS` attr-stripping behaviour documented in the component's own comments). Wired `https://footballdna.co.uk` into all 3 existing Paul Barry `<ExpertQA>` placements from the Q1-4 round (`what-do-academy-coaches-look-for`, `how-football-scouts-identify-players`, `how-to-get-scouted-for-football`), and into the new standalone article's own bio block and `<ExpertOpinion>` callouts (those needed no component change since their content is normal MDX).

`npm run build` passes; spot-checked rendered HTML on all 8 touched pages to confirm the interview-article and Football DNA links render as real `<a>` tags, not literal markdown text. Content-status tracker rows updated for all 5 newly-edited articles (`--expert-quote-count 1`).

Note while running the tracker `mark` command: Git Bash on this machine auto-converts a leading `/academy-pathway/...` style `--url` argument into a Windows filesystem path before it reaches the script, silently corrupting the row (caught and fixed for the standalone article publish above; prefix `MSYS_NO_PATHCONV=1` on the command to avoid it). A second, unrelated bad row from a prior session (`best-football-goals-for-kids`) was also spotted in the same table but not fixed, since it predates this session.

## Filled the remaining Q9/Q10 gap: how-academy-football-works and understanding-academy-release

Graham asked whether Q9-10 had an EEAT home yet - they did not. Added:

- **Q9** (foundation-years focus) to `how-academy-football-works`, "Foundation Phase: Under-9 to Under-11" section. This article now carries two separate Paul Barry `<ExpertOpinion>` callouts in different sections (Q5 and Q9), which is intentional, not a duplicate-quote issue.
- **Q10** (release) to `understanding-academy-release` itself, directly under the existing "release is a structural reality, not a personal verdict" note. This was the real fix: the article had been logged as answered via the new interview's cross-link only, not actually given its own embedded quote, which is why it still showed up as zero-voice in the tracker.

Both link back to the interview and to Football DNA, same pattern as the other 5. `npm run build` passes; confirmed both quotes render in the built HTML. Tracker updated (`how-academy-football-works` now expert-quote-count 2, `understanding-academy-release` now 1).

## AI Overview recheck on the three flagged low-CTR pages — all found cited, confirms suppression not a title/meta problem, 22 September 2026

Follow-up to the 22 September weekly check-in, which queued three overdue AI Overview checks: `what-is-the-junior-premier-league` (0% CTR on "what is jpl football", 521 impr), `best-footballs-by-age` and `what-is-grassroots-football` (both flagged 12 Sept as the site's biggest low-CTR levers but deliberately held pending this check). Ran live, on the pages' actual highest-volume queries per `inspect_page`, not just title keywords (6 keywords, $0.024 actual):

| Page | Query (28d impr) | AI Overview | footballparent.co.uk cited |
|---|---|---|---|
| `what-is-the-junior-premier-league` | "what is jpl football" (521) | Present | **Yes, source #5** (also: facebook.com, juniorpremierleague.com, refchat.co.uk, uk.linkedin.com) |
| `what-is-the-junior-premier-league` | "jpl football" (817) | None | n/a |
| `best-footballs-by-age` | "what size football for 10 year old" (1,112) | Present | **Yes, source #5** |
| `best-footballs-by-age` | "football sizes by age" (839) | Present | **Yes, source #5** |
| `what-is-grassroots-football` | "what is grassroots football" (3,942) | Present | **Yes, source #4** |
| `what-is-grassroots-football` | "grassroots football" (5,566, page's single largest query) | Present | **Yes, source #5** |

**No title/meta change made on any of the three.** All three pages are already cited in the AI Overview on their highest-volume query, yet all three still convert at 0.2-0.5% CTR. Being cited doesn't drive the click the way ranking normally would, since a reader who gets the answer in the overview has less reason to click through, so this is consistent with AI Overview presence being the actual explanation for the low CTR, not a weak title/meta — the same pattern already established for the JPL league query on 22 Aug, now confirmed across three more pages that were flagged purely on aggregate low-CTR numbers before this check had been run. A rewrite would not be expected to move these numbers. Logged 30 rows (main + PAA sub-rows per query) to `ai-citation-log.csv`.

**Not revisiting** unless a SERP's composition changes (the AI Overview drops, or the citation is lost) — same standing rule as the existing JPL entry.

## `best-football-formations-by-age-group` impression decline — checked, indexing confirmed clean, not a crawl problem

The 22 September weekly check-in flagged this page's post-launch pattern (impressions spiking then falling steadily since publish, ~310→248→58/wk in the fork's read, 145→96→56/wk per `inspect_page`'s own weekly buckets, while position held steady ~6.5-6.8) as looking more like an indexing issue than a ranking one, and recommended a URL Inspection check before assuming it needs content work. Graham separately confirmed the page was crawled 4 September.

Ran the URL Inspection API directly (`urlInspection.index:inspect`, same one-off script pattern as the 6 Sept `support-child-after-bad-match` check, `webmasters.readonly` scope, no DataForSEO cost, script deleted after use): **verdict PASS, "Submitted and indexed", last crawl `2026-09-04T00:19:12Z`, robots allowed, correct canonical (`/coaching/best-football-formations-by-age-group` on both sides, matching post-6-Sept-recategorization), page fetch successful.** No technical fault.

**Reframed:** not an indexing problem. The 377 recent-28-day impressions are spread across many distinct long-tail queries, only two of which clear the 3-impression floor to show in `topQueries` (10 impressions between them) — consistent with a 3-week-old page still inside Google's normal post-launch ranking-volatility window, where a fresh-content bump settles before the page finds its stable query set, not a technical or content problem. Position hasn't moved, which is the more informative signal here than the impression count on its own.

**No action taken.** Watching rather than editing — too early to read a real trend from 3 weekly data points on a brand-new page, and the one clear fact (clean index status, stable position) doesn't support a content fix.

## `football-team-spreadsheet` near-zero impressions — checked, technically clean but unexplained

Same 22 September check-in flagged this page as a new, unexplained silence entry (136 impr/21d baseline → 1 impr/7d recent). Ran the same URL Inspection check as above.

**Technically clean:** verdict PASS, "Submitted and indexed", robots allowed, correct canonical, listed in `sitemap.xml`, **last crawled `2026-09-21T18:45:14Z`** (yesterday) — this is being recrawled regularly, not stuck.

**But the collapse is real and sharper than the formations page's:** week of 6 Sept had 135 impressions / 14 clicks / position 4.9 / 10.4% CTR (a strong debut week). Week of 13 Sept: 1 impression, 0 clicks. `topQueries` now returns nothing (falls below the 3-impression/90-day floor). Position on the single remaining impression reads 3.0, but that's a sample of one, not a real position read.

**No technical cause found, so per the standing rule this isn't being treated as a content problem.** Two most likely explanations, neither confirmed: (a) the same fresh-content evaluation bump seen on `best-football-formations-by-age-group`, just steeper here — Google trials a new URL at a visible position for a short window, then re-settles it, which can look like a cliff rather than a taper if the true post-settling position is well outside page 1; or (b) a genuine ranking loss for "football team spreadsheet"/"soccer team spreadsheet" not yet visible in any technical signal. The strong week-1 CTR (10.4%) argues against an engagement-quality explanation.

**No action taken.** Watching only — recrawl is current, so another read once a full post-recrawl week of data exists (~29 Sept) should show whether this recovers on its own or is a real, lasting drop worth a live SERP check at that point.

## Bucket C slop-tidy: em dashes and reframe clichés removed from 9 articles (E-E-A-T deslopify)

Part of the E-E-A-T deslopify programme (see `eeat/`). Conservative copy-only tidy of high-slop Bucket C articles (genuine first-hand voice preserved, no headings/links/sections changed, no meta descriptions or slugs touched). Removed banned em dashes (house rule) and the most blatant "it isn't X, it's Y" / "X matters more than Y" reframe clichés, rewording each to a plain statement with identical meaning. `npm run build` passes (all routes statically generated). One combined commit (single lever, one `git revert` away; each page's change is isolated to its own file).

Articles and what changed:
- `parent-guides/jpl-vs-grassroots-football` - 1 reframe cliché reworded ("league isn't the deciding factor, timing is").
- `academy-trials/what-do-academy-coaches-look-for` - 13 em dashes removed + 1 reframe reworded (Paul Barry ExpertQA left untouched). Proposed meta-description change deliberately NOT made (separate SEO lever).
- `football-development/how-to-become-a-professional-footballer` - 2 em dashes + 2 reframes.
- `football-development/improve-football-decision-making` - 2 em dashes + 1 reframe.
- `parent-guides/what-is-grassroots-football` - 2 reframe clichés.
- `parent-guides/what-is-the-junior-premier-league` - 2 reframe clichés (Martin Brock quotes untouched).
- `football-development/build-confidence-young-footballers` - 2 reframe clichés.
- `football-development/good-football-development-environment` - 2 em dashes + fixed an accidental duplicated sentence.
- `academy-pathway/how-players-progress-through-football-development-centres` - 1 em dash.

Note: not an SEO-metric-targeting edit; it is a house-style/originality consistency fix, so no per-page watch window applies, but logged here for traceability. Commit hash recorded on commit below.

## Fix pre-existing broken sentence in how-players-progress-through-football-development-centres

Spotted during the post-slop-tidy re-score: line 37 read "work like a ladder  you join, you impress" (double space, missing punctuation, a pre-existing run-on, NOT introduced by the slop-tidy commit 2e7de41). Fixed to "work like a ladder: you join, you impress" (colon). Copy correctness fix on a live page.

## Bucket C slop-tidy, second light pass: residual reframe cliches

Follow-up to the first slop-tidy. Reworded 6 residual "isn't X, it's Y" / "not X, but Y" reveal cliches the re-score flagged, across 5 articles, meaning and voice preserved:
- `football-development/improve-football-decision-making` - "Scanning isn't just a habit; it's a skill" merged into a plain statement.
- `parent-guides/what-is-grassroots-football` - "not a stepping stone. It's a genuinely good place" reordered to lead with the positive (Graham's following first-person lines untouched).
- `football-development/build-confidence-young-footballers` - 2 fragment reframes ("Not as a mantra...but", "It's not performing...it's").
- `football-development/good-football-development-environment` - "Enjoyment is not the opposite of development, it's the engine" simplified to a plain positive.
- `academy-pathway/how-players-progress-through-football-development-centres` - "one data point, not the whole story" reworded.

Deliberately left: "honest" instances (Graham's genuine voice, or inside real expert quotes) and the reframe section HEADING in how-to-become-a-professional-footballer ("Education Is Not a Backup Plan, It's Part of the Plan"), because changing heading text changes its TOC anchor slug and needs a matching frontmatter update, which is not a light change. `npm run build` passes. Commit hash on commit below.

## Reword reframe section heading in how-to-become-a-professional-footballer

The last residual reframe from the Bucket C slop-tidy. Section heading "Education Is Not a Backup Plan - It's Part of the Plan" reworded to the plain "Education Is Part of the Plan". Updated the frontmatter `sections` entry (id + title) to match the new heading text so the sidebar TOC anchor stays consistent (id now "education-is-part-of-the-plan"). Page URL/slug unchanged; no internal links referenced the old anchor. Body prose unchanged. `npm run build` passes. Commit hash on commit below.

## Decision: grassrootsfootball.co.uk domain purchase (2026-09-23)

Not a site change; logged so a later link-profile or `/coaching` movement can be traced to it. Graham is offering the £200 GoDaddy minimum for grassrootsfootball.co.uk (TeamStats-owned, redirects to teamstats.net/blog), walking away above £300. Basis: the domain's own profile is about a dozen genuine referring domains (FourFourTwo 35 dofollow, Mirror and Birmingham Mail nofollow) plus 79 spam directories, against footballparent.co.uk's 10 junk links and domain rank 0. Plan, page-level redirect map and draft disavow file are in `seo-data/exports/grassrootsfootball-couk-acquisition-plan.md`, `-redirect-map-2026-09-23.csv` and `-disavow-draft.txt`. If bought: root to `/coaching`, six `/article/` URLs to matching pages, everything else 410, then verify the old domain in Search Console and disavow the spam there, not on footballparent.co.uk. The redirect commit will be logged here separately with its hash when it ships.

Update 2026-09-23: offer of $300 (about £225) submitted through GoDaddy. Ceiling unchanged at £300 (about $400).

## Site-wide link preview and structured-data images rebuilt from the brand lockup (2026-09-24)

Not a content change, but it touches every page's `og:image`, `twitter:image` and (on articles) the BlogPosting `image`, so any movement in Discover, rich-result or social click-through is traceable to this. The old single `public/og-default.jpg` (1200x630, left-aligned text with a decorative circle running off the right edge) was cropped badly wherever a surface shows a square or 2:1 thumbnail (WhatsApp/iMessage small previews, Google 1:1 thumbnails, X). Replaced with four PNGs in `public/og/`, generated by `scripts/generate-og-images.mjs` from the horizontal lockup, logo centred inside the crop-safe zone of each: 1200x630 (og/twitter), 1200x675 (16:9), 1200x900 (4:3), 1200x1200 (1:1), all 34-60 KB. `lib/seo.ts` now points every `generateSEO()` page at the 1200x630 and sets `twitter:image` explicitly; `app/layout.tsx` carries the same as a root default so the about/author/policy pages (which write their own metadata and previously had no `og:image` at all) get a preview too; `lib/ArticleLayout.tsx` adds the 16:9/4:3/1:1 set as the BlogPosting `image`, which was missing before and is what Google's Article guidance asks for. Old `og-default.jpg` removed; the new file names also stop Facebook/WhatsApp/iMessage serving their cached copy of the old image. Commit hash on commit below.

## Coach App pages get their own preview and structured-data images (2026-09-24)

Follow-on to the entry above. `scripts/generate-og-images.mjs` now also builds a `coach-app-*` set in `public/og/` from the Coach lockup (same four sizes, 36-63 KB). `/football-parent-coach-app` passes `brand: "coach"` to `generateSEO()` so its `og:image`/`twitter:image` carry the Coach lockup, the `[variant]` ad landing pages set the same directly (they are shareable links even when noindex, and previously fell back to the site-wide default), and the SoftwareApplication schema on the indexable landing page gains the 16:9/4:3/1:1 coach set as its `image`, which it did not have before. Article and site pages unchanged. Commit hash on commit below.

## Favicon set rebuilt from the brand icons (2026-09-24)

Same branch as the two entries above. The old `app/icon.png` was an 825 KB, 1254px export of the pre-brand artwork, downloaded on every first visit for a tab icon, and it was also the favicon Google shows next to results. Replaced with a set generated by `scripts/generate-favicons.mjs` from `public/parent/icon`: `app/favicon.ico` (16/32/48, 4 KB), `app/icon.png` (192px, 12 KB, a multiple of 48 as Google's favicon guidance asks), `app/apple-icon.png` (180px, 19 KB). The Coach App landing segment gets its own `icon.png`/`apple-icon.png` from the coach icon set, so those pages show the COACH mark in the tab and on an iOS home screen. The manual `icons` entry in `app/layout.tsx` is gone; Next's file conventions emit the links. Google refreshes result favicons on its own recrawl, so expect the search-result icon to lag the tab icon by days to weeks. Commit hash on commit below.

## Top searches cleanup and Countries tab on /admin/seo (2026-09-24)

Admin tooling only, no article or metadata change, logged so a shift in the numbers on these tabs is traceable.

- Top searches: the header dropdown was logging a search after a 600ms typing pause, so one search typed on a phone showed as a dozen prefixes each counted as its own 0-result search. Logging now fires on commit (result click, submit, closing the panel) with a 3s idle fallback, and the report folds a query into a longer one logged within two minutes that starts with it. Expect the search totals and the "no results" count to drop; that is the correction, not a traffic change. Window toggle and a single-day picker added.
- Countries: new tab. `page_views.country` (ISO code from Vercel's `x-vercel-ip-country` header, no IP stored) via migration `20260924120000_page_views_country.sql`, which must be applied to the football-parent-social project. Shows views by country, the share landing before 06:30 UK time and which countries and pages that is, and views by hour in UK time. Rows before the migration report as Unknown. Prompted by mornings with ~25% of the day's views before 06:30.

Commit hashes on commit below.

## Fix: page views stopped logging after the Countries deploy (2026-09-24, 17:44 to fix)

The country insert fell back to the old row shape only on Postgres code 42703, but PostgREST reports an unknown insert column as PGRST204, so with the `country` migration not yet applied every `/api/page-view` insert failed and the dashboard sat at 207 views. Fallback now covers both codes. Views in that gap are lost, not recoverable; treat 24 September's total as under-counted by roughly the length of the gap. Commit hash on commit below.

## Paul Barry interview card added to /academy-pathway (2026-09-25)

The interview (`/academy-pathway/academy-life-paul-barry-interview`, published 2026-09-20) was in `lib/routes.ts` and the sitemap but had no card on the Academy Pathway category page, so its only internal links came from other articles. Card added at the end of the articles grid. Additive only, one internal link. Commit 99fcf47.

## `equal-playing-time-in-grassroots-football`: "game time" added to the title tag (2026-09-25)

Title tag only, in `app/coaching/equal-playing-time-in-grassroots-football/page.tsx`. H1 (frontmatter title), meta description, headings and body unchanged.

- Before: "Equal Playing Time in Grassroots Football | Football Parent" (59 chars)
- After: "Equal Playing Time in Grassroots Football: Fair Game Time" (57 chars, site-name suffix dropped to stay under ~60)

Why: "game time football" is ~320 UK searches/month (canonical Google Ads volume, 6 Sep) against ~20 for "equal playing time football", and the title never mentioned game time. Page already ranks ~7.7 for "equal game time". Live traffic at the time of the change: 1,349 impressions, 24 clicks, avg position 6.4, CTR 1.8% (28 days), flagged low-CTR. Previous change to this page was 6 Sep, so outside its watch window.

Commit: `af27498`. Watch until ~7 Oct before touching the page again.

## Same page, same day: calculation H2 renamed (2026-09-25, deliberate exception to the watch window)

H2 "How to Calculate Fair Playing Time" renamed to "How to Calculate Equal Game Time", with its frontmatter `sections` TOC entry (id and title) updated to match. Section body unchanged, no headings removed, no inbound anchor links to the old id anywhere on the site.

Why: targets "playing time calculator" (260/mo) and "equal playing time calculator" (210/mo), and gets "game time" into a main heading alongside the title change above.

**Rule exception, logged explicitly:** this is a second change to this page on the same day as the title change (`af27498`). Graham asked for it to go now rather than wait out the 10-14 day window, so any movement over the next two weeks can't be put down to one of the two changes alone. If the page drops, revert both, then re-apply the title on its own.

Commit: `8008588`. Watch until ~7 Oct.

## Drills and formations title tags (2026-09-25)

Two pages, one lever each (title tag in `page.tsx` only; H1 frontmatter titles, meta descriptions, headings and body unchanged), separate commits. Asked for by Graham after a volume review showed both title tags missing their highest-volume target phrases. Both are low-traffic pages, so low risk.

| Page | Before | After | Commit |
|---|---|---|---|
| `coaching/football-drills-for-7-and-8-year-olds` | "Ball Mastery Drills for 7 and 8 Year Olds \| Football Parent" (59) | "Football Drills for 7 and 8 Year Olds: Ball Mastery" (51) | `90445e3` |
| `coaching/best-football-formations-by-age-group` | "Best Football Formations by Age Group \| Football Parent" (55) | "Best 7-a-Side and 9-a-Side Football Formations by Age" (53) | `2ed3239` |

- Drills: "football drills for 8 year olds" 210/mo and "football drills for 7 year olds" 140/mo (KD 0, 22 Aug research), ranking 11 and 11.9. Those words dropped out of the title tag when it was shortened on 23 Aug. At the change: 315 impressions, 8 clicks, avg pos 6.7 (28 days).
- Formations: "7 a side formations" and its variants ~480/mo each (probably the same pool, from the TeamStats ranked-keywords export, where TeamStats holds positions 4-7), "best 7 a side formation" 170/mo, "formation for 7 a side football" 110/mo, 9v9 terms 40-110/mo. The page's H1 already said "7-a-Side and 9-a-Side" but the title tag did not. At the change: 402 impressions, 4 clicks, avg pos 6.5. This overrides the 22 Sep "watch only" note above on Graham's instruction; indexing was confirmed clean then.

Both on watch until ~7 Oct.

## Coach App banner: "send it to your child's coach" on 19 grassroots articles (2026-09-25)

Not an SEO lever, logged because it changes a mid-article block on 19 live pages. The in-article Coach App banner on grassroots-focused parent articles (list: `SHARE_AUDIENCE_SLUGS` in `app/components/CoachAppBanner.tsx`) now asks the reader to pass the app to their child's coach, with a native share button, instead of pitching them the parent features. `how-to-become-a-football-coach` switched to the coach copy; `/coaching/best-grassroots-football-apps` and `/coaching/football-team-spreadsheet` corrected from parent to coach copy. Headings, links and article text unchanged. Commit `49d70ad`. If engagement on those pages moves in the next two weeks, this is a candidate cause.

## New page: Progress landing page (2026-09-27)

New indexable page at `/progress` (`app/progress/page.tsx`, added to `lib/routes.ts`), the landing page for Progress, the parents' app at progress.footballparent.co.uk. Every Progress share card prints "footballparent.co.uk/progress" in its footer, so this is where parents land from a shared card. Hand-written page (not an MDX landing variant), with SoftwareApplication and FAQPage JSON-LD and its own og:image (`/og/progress-1200x630.png`). Four feature sections each carry a screenshot of the real app (goals and assists, career across teams and seasons, coach feedback, notes and patterns), all with a made-up player. A "Start your journey" email form (hero and price block) is a plain GET to the app, which prefills its sign-in; nothing here connects to the Progress backend. Not linked from site navigation or articles yet.
## AG boot pick added to /football-gear/ag-vs-fg-boots (2026-09-27)

The page tells most readers to buy AG but only carried FG/MG picks (flagged as a gap in this file earlier). Added a one-item `GearPicks` block, adidas Predator League Fold-Over Tongue AG kids (ASIN B0F341CZS5, tag footballpar09-21), at the end of "The Grassroots Reality: Most Kids Are Playing on 3G". Additive only; no title, meta, heading or link changes. Last prior change to this page was 2026-09-13, so the 10-14 day window was clear. Commit c5a308d. Watch Amazon clicks for this page on /admin/seo.

## New article: /football-gear/childrens-soft-ground-football-boots (2026-09-27)

Published 2026-09-27, category Football Gear. "Children's Soft Ground Football Boots: Do Kids Need Them?" Targets "childrens soft ground football boots" / "soft ground football boots junior" (1,000/mo each, KD 0) and the metal-studs question cluster ("are metal studs allowed in football" 170, "can you wear metal studs on 4g" 110, "on 3g"/"on astro" 70 each). Replaces the planned `soft-ground-vs-firm-ground-football-boots` slug, which led on a 40/mo comparison phrase. Keeps "firm ground football boots meaning" with `ag-vs-fg-boots` to avoid cannibalisation. One Amazon pick (adidas Predator League Fold-Over Tongue SG kids, B0F33WK9NZ) as a quick pick and in-article. Timed for the November SG seasonal peak. Commit 3da5587.

## Soft ground boots guide: pre-publish review fixes (2026-09-27)

Review pass on the unpublished article before it went live: 9v9 pitch-size error fixed, youth metal-studs rule attributed to the FA Laws for Mini-Soccer and county officiating guidance, stud-key claims softened, booking-cancellation point attributed to West Riding FA, repeated stock line trimmed. Added FG/MG picks (B0DPHMCDL1, B0F1WYXFZ6) under "Do Kids Need Soft Ground Football Boots?" and an AG training-pair pick (B0F341CZS5) in the 3G section, all reused from existing articles. Commit 3cb5406.

## Inbound link to soft ground guide from /football-gear/best-football-boots-for-kids (2026-09-27)

One internal link added in the FAQ "Can my child wear SG boots for grassroots football?", anchor "children's soft ground football boots". Same sentence corrected from "they're never appropriate on 3G or 4G surfaces" to "most 3G and 4G venues ban them", since West Riding FA's 3G pitch permits screw-in studs under 21mm. Previous change to this page was 2026-09-13, so the watch window was clear. Watch list until ~2026-10-09. Commit 9508aba.

## Soft ground boots guide: intro rewritten (2026-09-27)

Same day as publish, before any impressions. Replaced the "Search for children's soft ground football boots and you'll mostly find..." opener (a template already used on the formations and coaching-qualifications articles) and the "This guide covers..." roadmap paragraph with an intro that leads on who actually needs SG boots and the 3G rules conflict. Primary phrase kept in the first paragraph. Commit 4521858.

## Weekly round-up (2026-09-27): no changes made, results only

GSC 18-24 Sept vs 11-17 Sept: 53,475 vs 55,521 impressions (-4%), 910 vs 926 clicks (-2%), average position 6.5 both weeks. 24 Sept was still inside GSC's processing lag. First-party page views were flat week on week; the 24 Sept dip is the Countries logging outage, not a real drop. No silence entries. The only decay entries are small: the /academy-trials hub (12 to 6 clicks, position ~20) and leave-grassroots-football-for-an-academy (10 to 7).

- **Buy buttons moved above the fold (19 Sept):** Amazon click-outs per page view on wide-feet boots went from 16.7% to 33.6% (18 to 42 clicks; 27 of those came from the new gear-picks box). Shin pads stayed about the same (68% to 64%) and so did boots-for-kids (24% to 21%). Site total 148 to 217 clicks (12-18 vs 19-26 Sept) on 13% more page views.
- **Veo alternatives (11 Sept edit):** 4,838 to 7,624 impressions a week, clicks 42 to 57. Price queries are climbing ("how much is a veo" 12 to 9.7). CTR is slipping (0.9% to 0.7%) because the new impressions come in at positions 8-10.
- **Equal playing time ("game time" phrasing, 6 Sept, and /coaching hub):** 215 to 935 impressions a week, clicks 4 to 15. The title tag and H2 changes from 25 Sept are not measurable yet.
- **Best football boots for kids (13 Sept):** 2,563 impressions and 21 clicks in its first 2 weeks. Most of its top queries are long synthetic prompts ending "asking as: youth soccer parent", which look like AI rank-tracker probes rather than real searches, so the impression count is inflated and the CTR understated.
- **Best grassroots apps (11 Sept):** position 16.6 to 14.2, still page 2-3 for its main terms.
- **Goals (19 Sept):** 289 impressions at position 8.7 in its first week.
- **Paul Barry callouts (20-21 Sept) and slop tidy (22-23 Sept):** too recent to read. One to watch: "how to become a footballer" 7.1 to 17 (49 to 1 impressions, tiny volume) after the 23 Sept heading change. Page-level position is flat at 7.9.
- **Drops that are demand, not rankings:** wide feet (-1,152 impressions, but position 8.0 to 7.6 and clicks flat); JPL explainer (-913, almost all from "jpl league" 990 to 229 at a steady position); Aston Villa (launch bump fading, position steady 5.3).

## Veo alternatives: quick-pick buy box above the fold (2026-09-27)

Commit e98cadf, on `/football-gear/veo-camera-alternatives`. Added a `GearPicks` box titled "Best Veo alternatives" directly under the intro, above "Cost and Features at a Glance". It has three picks: the XbotGo Falcon (standalone), the Falcon tripod bundle and the XbotGo Chameleon. The box reuses the same tagged ASINs and the same prices the article already quotes; no new products and no copy changes elsewhere. This is the same treatment the 19 Sept change gave wide-feet boots, which doubled that page's click-out rate (16.7% to 33.6%). Baseline: 23 Amazon clicks on 119 page views (19.3%) for 19-26 Sept, all placement `inline`. New clicks from this box report as `gear-picks`, so the effect can be read separately. This is a conversion lever, not a ranking one: headings, sections and meta description are unchanged. The page has live traffic (~57 clicks a week). `npm run build` passes and the box renders in the built HTML.

## New article: Matt Baxter mindset interview (2026-09-28)

Published 28 Sept 2026: `/parent-guides/matt-baxter-young-footballer-mindset-interview`, category Parent Guides. Expert Q&A with youth athlete mindset coach Matt Baxter (business: Elite Mindset Coach), eight questions: rebuilding identity after release, the first ten minutes after a bad game, bouncing back vs spiralling, where confidence comes from, plateaus, early burnout signs, talk of quitting, encouragement vs pressure. Same format as the Paul Barry interview. Added to `lib/routes.ts` and the `/parent-guides` index. His answers are also a source for `<ExpertOpinion>` callouts on the eight articles the questions were written for (not added yet).

## Matt Baxter expert quotes added to 8 articles (2026-09-28)

One `<ExpertOpinion>` callout per page, each an excerpt of his answer from the new interview with a link back to `/parent-guides/matt-baxter-young-footballer-mindset-interview`. Additive only: no headings, text or links removed. One commit per page so each is a single revert.

- `academy-pathway/understanding-academy-release`, "Identity and the Long Game" (release and identity): 32af46c. Stacks on the Paul Barry callout of 20 Sept, so read the two together.
- `parent-guides/what-to-say-after-football-matches`, "The Simplest Rule: Let Them Lead" (first ten minutes): 277ff1f
- `parent-guides/support-child-after-bad-match`, "When They Say They Want To Quit" (wobble vs real): 39f5e85
- `football-development/build-confidence-young-footballers`, "The Role of Parents" (over-praise tied to outcomes): 1e741a6. Page had a slop tidy on 22 Sept.
- `football-development/why-isnt-my-child-improving-at-football`, "Why Football Development Rarely Moves in a Straight Line" (plateaus, "yet"): 9a80be2
- `football-development/football-burnout`, "Burnout or Just a Bad Week?" (dip vs burnout): 616a8b4
- `parent-guides/biggest-football-parent-mistakes`, "Touchline Behaviour" (body language): 1af2ace
- `parent-guides/jpl-vs-grassroots-football`, "Pressure and environment" (who is the goal for?): 6d18999. Page had a slop tidy on 22 Sept.
- `parent-guides/what-to-say-after-football-matches`: added a `<ParentNote>` (Graham's own car-journey story, in his words) under "Processing your frustration out loud": 3c59e79. Same page and day as the Matt Baxter quote (277ff1f), so read the two as one change.

## Expert box presentation tidy (2026-09-28, later the same day)

Presentation only, no change to what the experts said. Graham's feedback: Matt's boxes had a big blue link inside the quote, and Paul's read as if the interview was done for Football DNA.
- 5842bcf: `ExpertQA` footer link ("Read the full interview") and profile link now small, underlined, same amber colour as the box. `ExpertOpinion` gained `org`/`orgHref`, so an organisation in the title can be a plain underlined link.
- a5e9262: Matt Baxter's 8 quotes switched from `ExpertOpinion` to the photo `ExpertQA` box (his question, an excerpt of his answer, small "Read Matt's full interview" link, no Instagram). Two moved: understanding-academy-release from "Identity and the Long Game" to "Rebuilding Confidence" (was reading back to back with the Football Parent note), and biggest-football-parent-mistakes from "Touchline Behaviour" (next to Paul's box) to "Too Much Pressure". jpl-vs-grassroots moved up one paragraph to separate it from Martin Brock's box.
- 0a291b6 (plus the 3 Paul boxes in a5e9262's pages): all 13 Paul Barry `ExpertOpinion` boxes now show "Football DNA" as an underlined link in his title, and the trailing ", his interview for Football DNA" is gone.
- 8c5d08b: Paul Barry's 13 remaining `ExpertOpinion` boxes (12 pages) switched to the photo `ExpertQA` box, same as Matt's and the 3 trials-article originals from 9 Sept: his photo (alt text "Paul Barry, Head of Coaching, Content & Club Support at Football DNA"), the original interview question, the same excerpt as before, "Football DNA" as a small same-colour link, and a small "Read Paul's full interview" link. The linking sentences that sat inside the old boxes are gone; on biggest-football-parent-mistakes the one sentence of context (the 3v3 point applied to the touchline) now sits as a normal paragraph under the box. Every expert quote on the site from Paul or Matt now uses one design.
- ecc5703: understanding-academy-release, Paul Barry's box moved from straight after the opening Football Parent note to "What Happens During An Academy Release Meeting?" (after the paragraph on decisions rarely resting on one factor). It had read back to back with the note since 20 Sept.

## Progress app: menu link and banners (2026-10-02)

Commit 810705a, sitewide. Progress (the parents' app, /progress) launched. Header gets a green "Progress app" button beside search (md and up) and a Menu entry; the seven category links now show inline only from xl (1280px) and move into the Menu below that, as on phones, because they overlapped the logo from md to xl. New `ProgressBanner` on the homepage (above the Coach App banner) and at the end of every article whose banner audience isn't "coach" (so not /coaching/* or the Coach App landing pages). Mid-article Coach App banner and its A/B split unchanged. Banner links carry `?b=progress-home` / `?b=progress-article` into page_views.banner_variant; the Coach App banner report skips progress-* values. Internal links only: no headings, copy or metadata changed on any article.

Follow-up, commit 88071a1: the homepage now carries the Progress banner only (the Coach App parent banner there is gone, so the two never sit together; the Coach App report stops counting homepage impressions from `HOME_BANNER_ENDED_AT`). Progress sponsors Academy Pathway: a "supported by Progress" banner with the strapline ("Trust the process. Track the progress.") on `/academy-pathway` (category promo slot) and at the end of every `/academy-pathway/*` article instead of the plain one (`?b=progress-academy-pathway`). Price removed from the banner copy.

## New article: Watford Development Centre and Academy Trials guide (2026-10-02)

Published 2026-10-02: `/academy-pathway/watford-development-centre-guide` (Academy Pathway). Next on the club-guide roadmap (Watford academy trials 170/mo, the largest "trials" term among uncovered clubs). Covers the CSE Trust's three-tier Player Development Programme, futsal PDC, the girls' ETC, and the academy's move to Category Three for 2026/27. One Paul Barry `ExpertOpinion` (Q6, second use, trimmed differently from academy-categories-explained). Commits 784bd76 (article), 53ee966 (fact-check fixes, Academy Pathway category page entry).

Internal links into it, commit 064ead8, one additive link per page: football-development-centres-near-me (new Watford entry under East of England), what-is-eppp (a category can go down, after the Aston Villa example), pdc-vs-ptc-vs-rtc-explained (Watford uses PDC at two levels). academy-categories-explained deliberately skipped: changed 28 Sept, still on watch; add a link from its Category 3 section after ~10 Oct.

Same day, readability pass on the Watford guide (published hours earlier, no traffic yet, so not on a watch window): the Paul Barry quote is now an `ExpertQA` with his photo, bio and the original interview question instead of a plain `ExpertOpinion` (the prose lead-in that restated the question is gone), and five long paragraphs split at sentence breaks with no wording changed. Site-wide in the same commit: the mid-article Coach App banner (`lib/MDXContent.tsx`) now skips any heading with under ~400 characters of prose after a ParentNote/ExpertQA/ExpertOpinion, so it never sits straight after a callout. That moves the banner to a different heading on 14 articles (none lose it). Layout only, no copy change on those pages.

Watford guide opener rewritten (commit 9f27668): "When parents search for Watford academy trials, most of what they find is run by..." became "Most trials and development centres advertised under the Watford name are run by...". Same facts, filler opener removed. Earlier same-day readability commits: a559bf9 (banner placement, site-wide), 337dc57 (ExpertQA photo, paragraph splits).

## Weekly round-up (2026-10-03): GSC 22-28 Sept vs 15-21 Sept

54,102 vs 56,008 impressions (-3%), 980 vs 979 clicks, average position 6.5 vs 6.4, CTR 1.8% vs 1.7%. The impression dip is demand plus the AI rank-tracker probe queries ("... asking as: youth soccer parent") dropping out of best-football-boots-for-kids, not lost rankings.

- **Veo quick-pick box (27 Sept):** Amazon click-out rate flat, 20.2% to 20.8% (20-26 Sept vs 27 Sept-1 Oct); 5 of 16 clicks came via the box, so it mostly moved clicks from the inline links. Search side still growing: 7,288 to 7,808 impressions, 57 to 67 clicks, position 6.8 to 6.5.
- **Wide-feet buy box (19 Sept):** holding, 37.1% to 40.8% click-out. Shin pads 65% to 74%, and +2,650 impressions, 98 to 127 clicks.
- **Drills title (25 Sept):** 103 to 237 impressions, 3 to 5 clicks. **Formations title (25 Sept):** nothing to read yet. **Equal playing time title/H2 (25 Sept):** 975 to 821 impressions, 15 to 9 clicks, position 6.4 to 6.7, inside noise; now picking up junk "fair matlab" impressions at position 1, probably from "Fair Game Time" in the title. Watch to ~7 Oct.
- **Playing time calculator is not live.** It is only on the unmerged `claude/playing-time-calculator` branch, which Graham is reworking. Its watch window starts from the real merge date.
- Best grassroots apps position 15.2 to 10.1, clicks 9 to 21. Football team spreadsheet back to 24 impressions/4 clicks at 4.3. Soft ground boots 69 impressions at 7.3 in its first two days.
- Silence flag on `/coach-app` is expected (the app is noindex). Decay: only the `/academy-trials` hub again.
- URL Inspection: `support-child-after-bad-match` still "Discovered - currently not indexed", never fetched (moved, see below); the Matt Baxter interview "URL is unknown to Google" at 4 days old.

## `support-child-after-bad-match` moved to `/parent-guides/child-lost-confidence-in-football` (2026-10-03)

The page sat in "Discovered - currently not indexed" from May to October, with zero impressions, despite manual indexing requests and the 6 Sept anchor fix. Google never fetched it, so this was a URL-level judgement, not a content one. The slug said "after bad match" while the article opens "This article is not about the single bad match", and it read as a twin of `what-to-say-after-football-matches`. A content comparison found little overlap with that page (one is the car journey after one match, this is a run of poor form, confidence, the coach conversation, a break, quitting), so it was moved rather than merged. Zero impressions meant no traffic to protect, so the whole move went in one commit.

- Slug research (DataForSEO, $0.16, `scripts/seo/cli/child-struggling-slug-research.ts`): almost every phrasing has no measurable UK volume; "my son wants to quit football", "son wants to quit football", "my son has lost his confidence in football", "lost/losing confidence in football" ~10/mo each. The "child lost confidence in football" SERP is UK parent sites (teamgrassroots.co.uk #2, wemakefootballers.com #3); the "wants to quit" SERP is Reddit/US/social, and quitting is only one section of the article. AI Overview on both.
- Cannibalisation check against `build-confidence-young-footballers`: it gets ~25-40 impressions a week and no "lost/losing confidence" queries; its setback section already hands a bad run of form to this article. Its "See:" link anchor changed to "what to do when your child has lost confidence in football" to make the split explicit.
- Changes: 301 from the old URL (`next.config.ts`), `lib/routes.ts`, `/parent-guides` card, Coach App banner slug list, 13 internal links repointed (anchor text unchanged except the build-confidence one), skills' valid-urls lists.
- Title tag: "When Your Child Is Struggling in Football | Football Parent" to "Child Lost Confidence in Football? What Parents Can Do".
- H1: "When Your Child Is Struggling in Football | Football Parent" (the site name was showing in the H1) to "When Your Child Has Lost Confidence in Football".
- Frontmatter `date` corrected from 2026-06-15 to the real publish date 2026-05-26 (fixes the BlogPosting `datePublished`).
- Body, headings and meta description unchanged.

Commit `2d10b7c`. After deploy: request indexing for the new URL in Search Console, and check its inspection status again ~17 Oct.

## `best-football-boots-for-wide-feet-kids`: "wide fit" added to the title tag (2026-10-03)

Title tag only, in `app/football-gear/boots/best-football-boots-for-wide-feet-kids/page.tsx`. H1 (frontmatter title), meta description, headings and body unchanged.

- Before: "Best Football Boots for Wide Feet Kids | Football Parent" (56 chars)
- After: "Wide Fit Football Boots for Kids: Best Picks for Wide Feet" (57 chars; the site name suffix was typed into the old string, no title template adds one)

Why: the page's largest query, "wide fit football boots kids", had 3,046 impressions in 28 days at position 10.6 and 0.2% CTR, and the "wide fit"/"wide fitting" variants ("wide fitting football boots kids" 621, "kids football boots wide fit" 556 at 11.3, "wide fitting kids football boots" 372) never appeared in the title. "Wide feet" kept for the queries already ranking 7-8. **Live traffic:** 21,730 impressions, 175 clicks, position 8.5 (28 days), 54 clicks in the week of 23 Sept, position improving on its own from ~14 in July. Last prior change 19 Sept (buy box), so the window was clear. If position slips over the next 14 days, revert.

Commit `cfe92d3`. Watch until ~17 Oct.

## `best-grassroots-football-apps`: Progress added as the pick for parents (2026-10-03)

Additive only, in `content/coaching/best-grassroots-football-apps.mdx`: a new section "Best for Parents Tracking Their Child's Stats: Progress" (between Spond and TeamStats/Pitchero), its TOC entry, one at-a-glance line, and `dateModified`. Title, meta description, existing headings, links and body unchanged.

Why: competitor research on Statzo (statzoapp.com, grassroots stats app). Google AI Overviews name Statzo as the "track your own stats" pick on 4 of 20 stats/app queries, largely from its App Store/Play listings and one repeated positioning sentence. This article is already cited in the AI Overview for "best grassroots football app" and in ChatGPT's answer to "best grassroots football apps in the UK", but never mentioned Progress, so the parent-stats slot went to Statzo. Claims in the section are taken from `/progress` (what the app does today). Trimmed the same day to a shorter, lower-key version: no disclosure line, no price or trial detail. Research data: `seo-data/exports/statzo-ai-visibility.json`.

Commit `5149d01`. Watch until ~17 Oct: rankings for "grassroots football app" (#3) and "grassroots football stats" (#5), and re-run `scripts/seo/cli/statzo-ai-visibility.ts` to see whether Progress gets named.

## New article: `/football-gear/best-football-gps-trackers-for-kids` (written 2026-10-03, publish date = merge date)

Category: Football Gear. Targets football gps tracker (480/mo, KD 23), football gps vest (320, KD 15), football tracker vest (320, KD 13), football tracker (720, KD 46), playermaker football tracker (210, KD 1), football boot tracker (170, KD 10). Page one for these was Amazon/eBay search pages, brand shops and two non-UK roundups. Picks verified on Amazon UK the same day: Footbar Meteor (B08FCK78K8), STATSports Academy (B0B3F1DGBQ), PitcheroGPS youth vest (B0CY3KX4DN), CityPlay (B0C625498V). Progress listed as the goals/assists/minutes pick. Research: `seo-data/exports/stats-gps-discovery.json`.

Commit `6dac4df`.

Follow-ups the same day: slop/fact pass and Paul Barry Q&A added to the article (`35eb6e8`). Inbound links, one added sentence each, nothing else on those pages changed: `how-much-training-is-too-much` (`064ad70`, after the training-load lists) and `late-developers-in-football` (`062ab78`, end of Comparison Culture). Both pages were last changed in August, so outside any watch window; both now on watch until ~17 Oct.

Inline affiliate links added 2026-10-04 (`86029b6`): one link on the first mention of each of the four picks in its own "Best Football GPS Trackers for Kids" subsection (STATSports Academy, PitcheroGPS, Footbar Meteor, CityPlay), same ASINs as the GearPicks card. No wording changed. Playermaker 2.0 and SoccerBee left unlinked (no verified UK ASIN).

## New article: `/parent-guides/best-football-stats-apps` (written 2026-10-03, publish date = merge date)

Category: Parent Guides. Targets the cluster statzoapp.com's homepage ranks for: football stats app / football statistics app / football stat app / app for football stats (110/mo each, KD 0-19), best football stats app (70, KD 14), football stats tracker (140, KD 52), football stats book (50, KD 0), plus unmeasured parent phrasings (track my child's football stats, football stats app for parents). Picks: Progress, Coach App, three Amazon stats books/journals (B0D1P58YB6, B0CCCKYMZF, B0D8VVF4KR), Footbar Meteor (B08FCK78K8). No competing apps named (Graham's rule). Inbound link added from `football-team-spreadsheet` (one sentence, `6f41210`; last changed 11 Sept, now on watch until ~17 Oct). Research: `seo-data/exports/stats-gps-discovery.json`, `statzo-ai-visibility.json`.

Inline links added 2026-10-04 (`c2a3773`): [Progress](/progress) on the first line of its own section, the three stats books in the sentence under the GearPicks card, and the Footbar Meteor in the wearable trackers section. Same ASINs as the card, no wording changed. The Coach App section already linked to `/football-parent-coach-app`.

## Rank tracker positions 11-20: two single-lever edits (2026-10-04)

From the rank tracker (27-29 Sep vs 20-22 Sep; GSC running ~5 days behind). One lever per page, additive only.

- `/academy-pathway/football-scholarships-uk`: added FAQ "Are there football scholarships for 16 year olds?" after the existing "What age" FAQ. Targets "football scholarships for 16 year olds" (179 impressions in 6 days, position 10.6 to 10.2). Uses only facts already in the article. Commit `961a614`. Watch until ~18 Oct.
- `/academy-pathway/brentford-development-centre-guide`: one inbound link with the anchor "Brentford academy", added as a sentence in the "How Tottenham Compares to Other London Clubs" section of `tottenham-development-centres-explained` (which listed Arsenal, Chelsea, West Ham and Fulham but not Brentford). Targets "brentford academy" (73 impressions, 10.6 to 10.2) and "brentford fc academy" (6.8 to 10.6). The guide had 11 inbound links, none using "academy" in the anchor. Brentford guide itself unchanged. Commit `9bda1c0`. Watch until ~18 Oct.

## `best-footballs-by-age`: age-in-years list under the quick reference table (2026-10-04)

Page: `/football-gear/best-footballs-by-age`. Commit `9e9d6d8`. **Live traffic page** (Google's AI answers cite it), so additive only: added a short "By age in years" list (6-10: size 3; 11: 3 or 4; 12: 4; 13: 4 or 5; 14+: 5, explained via the 31 August age-group cutoff) directly under the existing paragraph below the InfoTable. Table, title, meta, headings, FAQ and GearPicks untouched. Searches are phrased by age in years, while the table is by age group, which also left 11 and 13 year olds ambiguous.

**Baseline before the change** (GSC, 28 days to ~29 Sep): 27,309 impressions, 44 clicks, average position 8.7. Top queries: what size football for 10 year old 9.6, for 8 year old 9.9, football sizes by age 9.7, for 7 year old 10.0, for 6 year old 9.7, for 9 year old 10.2, football size for 10 year old 10.6, size 3 football age 10.4, for 12 year old 10.4, for 11 year old 9.1, for 13 year old 9.2.

**Revert rule agreed with Graham:** if "football sizes by age" or the main age queries lose more than ~2 positions and hold there for a week, `git revert 9e9d6d8`. GSC is ~5 days behind, so read at ~14 days (around 18-20 Oct). Also recheck the AI Overview citation for "what size football for 10 year old" and "football sizes by age" after about a week. No other edit to this page until then.

## `equal-playing-time-in-grassroots-football`: game time calculator links (2026-10-04)

Page: `/coaching/equal-playing-time-in-grassroots-football`. Commit `5cdc51e`. Additive only: a "Work it out for your squad" tool card after the intro (before the first H2) and a one-line "Try it on your own squad: game time calculator" link after the last FAQ, both to `/coach-app/game-time-calculator` with `utm_source=footballparent&utm_medium=article&utm_campaign=game-time-calculator`. Frontmatter, title, headings and existing internal links unchanged. Clicks show on the Coach App funnel tab under that campaign.

## `how-academy-football-works`: Paul Barry quote moved down the page (2026-10-04)

Page: `/academy-pathway/how-academy-football-works`. Commit `4e64155`. **Live traffic page.** Layout only: the ExpertQA block (Paul Barry on how families are treated at smaller vs Category 1 academies) moved from directly under the Category 1-4 cards to the "What Parents Should Expect From Academy Football" section, after the paragraph on the whole-family commitment. No wording, headings, links, title or meta changed. Graham asked for it so the quote breaks up the article rather than stacking against the graphic.

**External mention, same day:** the Grassroots Hub Facebook group posted this article on the evening of 4 Oct. 24 Facebook referrals in the first 3 hours, all phones in the Facebook app. Expect a one-off bump in page_views and GA for this URL on 4-5 Oct that is not search traffic.

## Inbound links to the equal playing time calculator page (2026-10-06)

Branch `calculator-page`, live when it merges. Two pages outside their watch windows each gained one clause linking `/coaching/equal-playing-time-calculator` (anchor "equal playing time calculator"), additive only, titles, headings and existing links unchanged:

- `/coaching/what-qualifications-do-i-need-to-be-a-football-coach` (last changed 8 Sept): the rotation/minutes sentence. Commit `15b8027`.
- `/parent-guides/how-to-become-a-football-coach` (last changed 4 Sept): the coaching-your-own-child rotation sentence. Commit `91bce7f`.

Queued, not done, because those pages are inside watch windows: the explainer's tool card and closing link swap from `/coach-app/game-time-calculator` to the new page (`equal-playing-time-in-grassroots-football`, changed 4 Oct, from ~18 Oct); one sentence each on `football-team-spreadsheet` and `best-grassroots-football-apps` (changed 3 Oct, from ~17 Oct); `best-football-formations-by-age-group` (title changed 25 Sept, from ~9 Oct). The calculator page itself is not yet published; its publish entry goes here when it merges (content commits `6c002fa`, `c7039ba`, `bed5b76`, `7767870`).

## Calculator inbound links: the queued four, done early (2026-10-06)

Graham chose to add these inside the watch windows rather than wait. Each is one clause or sentence, additive only, anchor "equal playing time calculator", target `/coaching/equal-playing-time-calculator`:

- `/coaching/equal-playing-time-in-grassroots-football`: the intro tool card and the closing link now go to the calculator page instead of `/coach-app/game-time-calculator?utm_campaign=game-time-calculator`. The Coach App funnel's `game-time-calculator` campaign clicks stop here; from now the article-to-calculator path shows as page views of the calculator page with this article as referrer. Commit `42ca8d8`.
- `/coaching/football-team-spreadsheet`: one sentence after the master-table paragraph. Commit `64e3ce7`.
- `/coaching/best-grassroots-football-apps`: one clause in the Coach App pick. Commit `d8a80b1`.
- `/coaching/best-football-formations-by-age-group`: one clause in the rotation section. Commit `633d601`.

Each of these pages had a change in the previous two weeks (see entries above), so if any of them moves in the next fortnight, both changes are candidate causes.

## `/progress` and the Coach App landing: SoftwareApplication schema removed (2026-10-05)

Pages: `/progress` (`app/progress/page.tsx`) and `/football-parent-coach-app` plus its indexable variants (`app/components/CoachLandingPage.tsx`). Semrush's site audit (5 Oct) flagged the `/progress` SoftwareApplication JSON-LD as invalid: "a value for the aggregateRating or review field is required". Google's Software App rich result needs a rating or review as well as name and offers, and there are none to give (inventing one is against Google's review guidelines), so the block could never earn a rich result and only ever reported as an error. Removed from both pages, since the Coach App landing carried the same shape and would be flagged next crawl. FAQPage schema on both pages untouched; titles, meta, headings and content untouched. Not a ranking lever, so no watch period needed; reinstate with real reviews if the apps ever collect them.

Semrush also crawled `/progress?b=progress-home` and `?b=progress-academy-pathway` as separate pages. The canonical already points at `/progress`, so Google is fine; in Semrush, add `b` under Site Audit settings > Remove URL parameters to stop the duplicates.

## New page: Equal Playing Time Calculator (published 2026-10-06)

- URL: `/coaching/equal-playing-time-calculator`. Category: Coaching. A tool page: the Coach App's game time calculator embedded in a same-origin iframe above ~2,400 words of written content (formula with a 9v9 worked example and rotating-keeper variant, target minutes by format and squad size at the FA 2026/27 lengths, halves vs quarters vs rolling subs, position rotation, season tracking, seven FAQs from People Also Ask, three Graham ParentNotes). WebApplication plus FAQPage JSON-LD via the new `kind="tool"` layout.
- Targets (UK, Oct 2026): playing time calculator 260/mo, equal playing time calculator 210, equal game time calculator 140, then equal game time 50, equal playing time 30 and the 10-20/mo tail (fair game time calculator, game time calculator football, football substitution calculator). Research: `game-time-calculator-plan.md` sections 7.3 to 7.5, `seo-data/exports/game-time-calculator-serp-research-2026-10-04.md`.
- Content commits `6c002fa`, `c7039ba`, `bed5b76`, `7767870`; shell `065961f`, `b22e5a6`. Inbound links: see the two entries above. Watch from today; the explainer (`equal-playing-time-in-grassroots-football`, position ~7 for "equal game time") is the page to check for any cannibalisation on "how to calculate equal game time", the one heading the two pages share.

## `equal-playing-time-in-grassroots-football`: calculation section shortened (2026-10-06)

Live-traffic page (about 2,000 impressions and 29 clicks a month, position ~7 for "equal game time"), so this is the one to watch. The "How to Calculate Equal Game Time" H2 stays, but its body drops from five paragraphs to three: the sum in one sentence with the 7v7 example, a new link to `/coaching/equal-playing-time-calculator`, and the season-tracking paragraph with its Coach App link. Removed: the "bare online calculator" aside, the Sheffield FA external link (Graham's call: the formula is division, not a method to attribute), and the "number itself matters less than having one" paragraph. Done the same day as the tool-card swap above, so the two changes share a watch window. Purpose: stop the two pages competing for "how to calculate equal game time" and send that question to the calculator page. `dateModified` set to 2026-10-06. Commit `b6f2a5b`.

## Calculator page: intro moved above the embed (2026-10-06)

Layout only, same day as publish: the two lead paragraphs now sit between the header and the calculator instead of below it, and the tool layout no longer shows the description line under the H1 (meta description unchanged). Body, headings, links and schema unchanged. Commit `14b934e`.

## New page: Girls United interview (published 2026-10-06)

- URL: `/girls-football/girls-united-daughter-football-interview`. Category: Girls Football (the first interview in that category; earlier interviews sit in Parent Guides or Academy Pathway). Ten-question Q&A with the Girls United London team (credited as the team at their request), answers in their own words, two stats linked to FA sources. Added to the girls' football category page and `lib/routes.ts`. Angle: parents new to girls' football (getting started, barriers, confidence, choosing a club). Commit: see git log for "Girls United interview".

## Girls' football: first expert voice on three pages (2026-10-06)

Six of the seven `/girls-football` articles had no ParentNote or expert callout. One `ExpertQA` box per page (logo, question, answer verbatim, link to the Girls United interview), additive only, no `dateModified`, nothing else on the page touched. All three are low-traffic (under 30 impressions in the last 28 days), so latitude was fine:

- `/girls-football/girls-football-trials`, "What Coaches Are Actually Looking For": what coaches look for beyond technical ability. Commit `c235db2`.
- `/girls-football/late-developers-in-girls-football`, "The Confidence Dimension": talented but lacks confidence. Commit `5baeb76`.
- `/girls-football/girls-academy-vs-grassroots-football`, "The Real Variables: Environment and Enjoyment": choosing a club. Commit `abf10b9`.

Queued for after the watch window (from ~20 Oct): trials "Parent Behaviour at Trials" (coaching from the sideline answer) and late developers "What Late Developers Often Share" (most-improved players answer). `what-age-do-girls-football-academies-recruit` left alone for now: it has live traffic (150 impressions, position ~4) and the candidate answer was only a moderate fit.

## Calculator page: one-sentence lead, calculator in the first phone screen (2026-10-06)

Layout only, same day as publish. The lead is one paragraph in the header slot; the rest of the intro is now the first body paragraph under the frame. Tool-page header tightened on phones (truncated breadcrumb, smaller H1, chip hidden, less padding). Calculator top on a 390px phone: 1242px at publish, 810px after the first move, 642px now. Words, headings, links and schema unchanged. Commit `dae729c`.

## Development centre guides: duplicated ParentNote replaced on Fulham and Leeds (2026-10-06)

The same first-hand ParentNote (coaches matter more than the club, four-corner feedback forms, weaker foot scored both ways) appeared on Arsenal, Fulham and Leeds. Arsenal keeps it. Fulham and Leeds each get a new note in Graham's words from a Q&A, framed as experience at other clubs' centres. ParentNote text only: headings, links, frontmatter and `dateModified` unchanged. Both pages carry live traffic, so both go on the 10-14 day watch list (to ~20 Oct) before any expert-quote swaps on them.

- `/academy-pathway/fulham-fc-development-centre-guide`: choosing a centre by location and midweek travel, uneven coaching week to week. Commit `81c8337`.
- `/academy-pathway/leeds-united-development-centre-guide`: Friday travel, a session with no goals putting him off, starting with small-group coaching instead. Commit `ec9cd29`.

## Owner network exclusion for first-party tracking (2026-10-06)

Commit `859c023`. Not a content change, but it changes what `page_views`, `affiliate_clicks`, `partner_clicks`, `coach_app_shares`, `coach_app_signups` and `progress_join_events` count: requests from networks listed in the new `owner_networks` table are dropped at write time, alongside the existing admin-cookie exclusion. Graham browses in incognito, so the cookie never applied to him; 4-6 Oct saw about a hundred of his calculator test visits and two test sign-ups deleted by hand. Expect a small step down in page views from the home network from today, especially on `/coach-app/*` and the calculator pages, that is not a traffic change. Migration `20261006210000_owner_networks` applied before deploy.

## Indexing requested for 3 unindexed pages (2026-10-06)

URL Inspection API check of all 105 routes in `lib/routes.ts`: 102 "Submitted and indexed" with Google's canonical matching ours. Graham then used "Request indexing" in Search Console for the other three. No code change.

- `/parent-guides/matt-baxter-young-footballer-mindset-interview` (published 28 Sept): "Discovered - currently not indexed", never crawled, despite 9 internal inbound links.
- `/girls-football/girls-united-daughter-football-interview` (published 6 Oct): "URL is unknown to Google".
- `/coaching/equal-playing-time-calculator` (live 6 Oct): "URL is unknown to Google".

Recheck around 13 Oct. If Matt Baxter is still not indexed, look at it again rather than requesting indexing a second time.

## Watford DC guide: first ParentNote; Fulham typo fix (2026-10-06)

- `/academy-pathway/watford-development-centre-guide`: first first-hand note, added in "What a Season at the Advanced PDC Looks Like for a Family" from Graham's Q&A answers not used on Fulham or Leeds (foundations taking themselves too seriously, coach experience, spotting a good session, small groups run by academy coaches). Additive only. Page published 2 Oct, so low existing traffic. Commit: see git log "Watford DC guide: first ParentNote".
- `/academy-pathway/fulham-fc-development-centre-guide`: "willigness" and "its worth" corrected. Spelling only, same day as the ParentNote swap above, so it shares that watch window.

## Instagram follow prompts (2026-10-08)

- Every article: "Follow on Instagram" card in the "Written by" box at the end (PR #64, merge 3ccb637, live 8 Oct). Sitewide, so it shares one date across all articles. Clicks on the "Instagram clicks" tab at /admin/seo.
- Mid-article "More like this on Instagram" box (`<InstagramPromo />`), additive, no wording changed, placed at a section break about 15-35% in: `/academy-pathway/academy-categories-explained`, `/academy-pathway/chelsea-fc-development-centre-guide`, `/academy-pathway/arsenal-development-centre-guide`, `/academy-pathway/crystal-palace-development-centre-guide`, `/football-development/new-fa-youth-football-format`. Commit 60c7fa7.
- Held back until their watch windows end (around 18-20 Oct): Leeds DC guide (edited 6 Oct), how-academy-football-works and football-scholarships-uk (both edited 4 Oct).
- Same day, Graham OK'd adding it to those three now rather than waiting: `/academy-pathway/leeds-united-development-centre-guide`, `/academy-pathway/how-academy-football-works`, `/academy-pathway/football-scholarships-uk`. Commit edec1ab. Note this overlaps their earlier edits' watch windows (6 Oct and 4 Oct), so a movement on these three is harder to attribute.
- Sitewide app banners (live 8 Oct, 21:27 UTC, merge 06e0a90): every parent and share-audience article now has the Progress banner in the mid-article slot instead of a Coach App banner, and no end-of-article Progress banner, so one app promo per article. /coaching and its articles: the Coach App banner becomes the "Coaching is supported by" sponsor version. New copy on both: Progress "Trust the process. Track the progress."; Coach App "Less admin. Pick the team fast and keep track of your team's stats." Banner block only, no article wording changed. Shares a date with the Instagram boxes above, so movement on 8 Oct onwards has two sitewide causes.

## Weekly round-up (2026-10-09): GSC 30 Sept-6 Oct vs 23-29 Sept

58,342 vs 54,192 impressions (+8%), 962 vs 969 clicks, average position 6.5 both weeks, CTR 1.6% vs 1.8%. GSC data ends 6 Oct and the last day may still be partial. No changes made this round; results only.

- **Wide-feet title (3 Oct):** rankings moved the right way. Weekly position 7.9 to 6.4, and the "wide fit" variants it targeted jumped: wide fitting football boots kids 10.6 to 4.5, kids football boots wide fit 9.5 to 5.1, wide fit kids football boots 7.6 to 3.7. Clicks 54 to 35, but the 23 Sept week was the page's best week so far, so read clicks at the 17 Oct watch end, not now. No revert signal.
- **Footballs by age list (4 Oct):** only 2-3 days of data after the change. "What size football for 10 year old" 9.6 to 10.6, "football sizes by age" 9.1 to 10.3: about 1 position, under the agreed 2-position revert line and too early to read. Read again around 18-20 Oct.
- **Best grassroots apps, Progress section (3 Oct):** mixed. Weekly position 9.1 to 12.0 and clicks 22 to 8, but "best football coaching apps" 11.6 to 5.5 in the rank tracker. One noisy week on a new page; watch to 17 Oct.
- **Scholarships FAQ (4 Oct):** impressions 3,642 to 2,008 but position 6.7 to 5.5 and clicks 29 to 33; "football scholarships for 16 year olds" 9.9 to 9.0 with 2 clicks. Positive so far.
- **Brentford inbound link (4 Oct):** brentford academy 10.2 to 10.8, brentford development 10.0 to 10.6. Small and early; watch to 18 Oct.
- **Equal playing time explainer:** flat, 821 to 842 impressions, 9 to 7 clicks, position 6.7 to 6.8. Still picking up "fair matlab" junk at position 1.
- **New pages, first week:** GPS trackers 192 impressions, 15 clicks, position 5.6. Watford DC guide 402 impressions, 23 clicks, 5.8. Stats apps 159 impressions, 4 clicks, 5.4. child-lost-confidence-in-football (moved 3 Oct) 87 impressions at 5.9, so the new URL is being served. Soft ground boots 151 to 651 impressions.
- **Still no impressions:** Matt Baxter interview, Girls United interview, calculator page. Indexing recheck due 13 Oct as planned.
- Decay: `/academy-trials` hub again, plus Tottenham DC (14 to 9 clicks, but position improved 6.7 to 5.9, so demand rather than rankings). Silence on `/coach-app` is expected (noindex).

Opportunities queued for this week (not yet done): AG vs FG title tag, its top queries are about wearing FG boots on artificial grass/turf and neither the title nor H1 says so (from 11 Oct, when the 27 Sept watch ends); one FAQ on the maximum/minimum age to join an academy on `what-age-do-football-academies-recruit` ("maximum age to join football academy" 11.8, "minimum age" 18.3; page last edited 4 Sept).
