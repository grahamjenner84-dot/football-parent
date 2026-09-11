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
