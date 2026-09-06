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

**Watch:** don't make a second content change to this page before ~20 September (10-14 day watch window from today), and don't reintroduce a title/meta change here without putting explicit before/after alternatives to Graham first.

## Still on watch, not yet due

- Coach App banner A/B test (started 4 Sept) — needs both arms to clear 300 impressions before the CTR comparison is meaningful.
- Mitre Impel / Nike Academy affiliate links on `best-footballs-by-age` — hold until ~18 September before any further edit.
