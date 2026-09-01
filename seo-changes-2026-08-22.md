# SEO / AI-citation changes — 22 August 2026

2-week check-in on the [9 August baseline](seo-changes-2026-08-09.md), plus new FAQ changes made today off the back of it. Target next check-in: **~5 September 2026** (14 days).

## 1. 2-week check-in on the 9 Aug changes

**Methodology note:** the first pass at this used `inspect_page`'s rolling 28-day windows, which mixed ~15 days of pre-change data into the "recent" bucket — not a clean before/after. Redone using `compare_search_console_periods` with a tight **10-day window either side of the change** (30 Jul–8 Aug vs 9–18 Aug), cut off 3 days before today specifically to stay clear of GSC's own reporting lag (confirmed clean: `dataFreshnessWarning` was `null` on this window, vs. a lag warning on an earlier 13-day attempt that reached into 19–21 Aug).

Site-wide in that window: **25,511 → 38,216 impressions (+50%), 368 → 578 clicks (+57%)**.

| Page | Before (30 Jul–8 Aug) | After (9–18 Aug) | Verdict |
|---|---|---|---|
| `academy-categories-explained` (2 FAQs added) | 2,738 impr / 57 clicks / pos 6.3 | 4,021 impr / 81 clicks / pos 6.2 | Genuine gain, position held |
| `jpl-vs-grassroots-football` (1 FAQ added) | 801 impr / 9 clicks / pos 4.4 | 753 impr / 9 clicks / pos 4.3 | Flat — already top-5, no real movement either way |
| `what-is-grassroots-football` (Quick Answer trial) | 2,595 impr / 4 clicks / pos 8.3 | 2,043 impr / 8 clicks / pos 8.2 | Impressions down, clicks up, position flat — mixed |

**Gone-quiet pages (8 flagged 9 Aug, recrawl requested):** all recovered off the site-wide "silence" list except `support-child-after-bad-match`, still 0 impressions since its 26 May launch. Unrelated pre-existing indexing issue, not a content problem — worth a Search Console URL Inspection check separately.

## 2. AI Overview citation recheck (live DataForSEO)

| Query | 9 Aug baseline | 22 Aug | Change |
|---|---|---|---|
| "academy categories" | Cited, source #8 | Cited, source #8 | **No change** |
| "is jpl better than grassroots" | Cited, source #3 | Cited, source #3 | **No change** |
| "what is grassroots football" | Not cited | Not cited | No change |
| "what does grassroots football mean" | Not cited | Not cited | No change |
| "what age can a child start grassroots football" | Not cited | Not cited | No change |
| "how does grassroots football differ from academy football" | Not cited | Not cited | No change |
| "is grassroots football the same as sunday league" | Not cited | Not cited | No change |

Same competing domains cited both times on every query (uefa.com/thefa.com/diamondfootball.com/ballrz.co.uk/sports-tours.co.uk for the grassroots set). **Conclusion: the FAQ/schema changes are driving real GSC gains, but haven't moved AI Overview citation status on any of the 7 queries tracked, up or down**, after 2 weeks. The grassroots Quick Answer trial specifically has not produced a citation.

## 3. FAQ schema mechanism — confirmed site-wide, article-triggered

Investigated whether FAQPage schema is per-article code or shared infrastructure: it's shared. `lib/faq.ts`'s `extractFaqs()` scans every article's MDX body for an `## <heading containing "FAQ" or "frequently asked questions">` section followed by `### Question` sub-headings; `lib/ArticleLayout.tsx` (used by every article page) automatically emits `FAQPage` JSON-LD if one is found. No per-article opt-in — this is why a heading-text mismatch has silently dropped schema before (`4cd81f2` JPL heading rename, `f54f48a` Fulham/Tottenham/coaching fix).

Cross-referenced every striking-distance page (`get_seo_report`, position 11-20) against its MDX for an existing FAQ section: **virtually every article-level page already has one.** The only pages without are `/football-development`, `/academy-pathway`, `/about` — hand-written category/hub pages on `category-page.tsx`, not `ArticleLayout.tsx`, so they're unreachable by this mechanism without actual engineering work.

**Reframed the opportunity:** not "add FAQ where missing" (pool is empty), but "existing FAQ doesn't literally cover the specific striking-distance query wording." Confirmed via live PAA/AI Overview pulls per page's actual highest-volume query (not just its nominal title keyword — see [[feedback_paa_main_query_optimization]]).

## 4. New FAQ changes made today

| Page | New FAQ entry | Target query (GSC position) | AI Overview status at time of writing | Commit |
|---|---|---|---|---|
| `football-gear/best-football-boots-for-wide-feet-kids` | "Which football boots are best for wide feet?" | "football boots for wide feet" — 175 impr, pos 20.8, **not cited** (others: reddit.com, sportsdirect.com, prodirectsport.com) | — | `4d63d67` |
| `football-gear/best-shin-pads-for-kids-football` | "What are the best shin pads for football?" | "best shin pads" — 149 impr, pos 15.8, no AI Overview present at all; "best shin pads for football" — 139 impr, pos 13.2, not cited (others: fourfourtwo.com, footballboots.co.uk, nike.com) | — | `8f50fe0` |
| `football-gear/best-shin-pads-for-kids-football` | "What size shin pads does my child need?" — sourced Adidas/Nike sizing comparison | "best shin pads for kids" — 689 impr, pos 10.2 (page's actual largest query, just off page 1), not cited (others: fourfourtwo.com, soccer.com, forza.com, adidas.co.uk) | — | `8f50fe0` |

Note: `wide fit football boots kids` (672 impr, pos 12.4) — the boots page's main query — is **already cited (#5)** in its AI Overview as of 22 Aug, unprompted by today's change. Worth watching whether it holds.

Also added to `CLAUDE.md` editorial rules (`67a7548`): "name/brand on the box" framing cliché, alongside the existing "badge" rule — caught in my own first draft of the boots FAQ. Flagged but not fixed: the page's *existing*, previously-published FAQ ("worth more than the brand on the side") has the same pattern — untouched pending a separate decision on whether to edit already-live content for style only.

## 5. Outstanding — needs real sourcing before drafting

| Page | Question | Why not drafted |
|---|---|---|
| `best-shin-pads-for-kids-football` | "What is the best shin pad brand?" / "Which shin pads are the best?" | Would require a genuine product recommendation, not currently sourced |
| `best-shin-pads-for-kids-football` | "What shin pads do professionals use?" / "What shin pads does Jack Grealish wear?" | Specific player-gear claim, not researched (explicitly deferred this session) |

## 6. JPL low-CTR investigation and two further changes

Followed up on the 93-page confirmed low-CTR list (section 5 above isn't in this doc, but see the same-day chat log): checked whether AI Overview suppression explains it before touching anything, per [[feedback_verify_before_recommending]].

- **`jpl league` (1,091 impr, the JPL page's single biggest query): no AI Overview on this SERP at all.** Competing results are almost entirely the league's own official properties (juniorpremierleague.com, its Facebook/Instagram/YouTube, one specific club site) — a genuine intent mismatch (navigational, not informational), not a copy problem. No title change made here; there's no real basis for one.
- **`what is jpl football` (249 impr, 0 clicks, 0% CTR at position 6.8 on the explainer page — vs. the site's own expected-CTR curve of ~4% at that position):** live SERP check showed `jpl-vs-grassroots-football` ranking instead of the explainer page at the moment checked, matching the query cannibalisation already flagged in `get_seo_report`. Confirmed via `inspect_page` that this is a real, recurring split: the explainer page gets 249 impr / pos 6.8 on this query vs. the comparison page's 20 impr / pos 7.4 — the explainer page is the clearly stronger, more consistent performer; the comparison page's real strength is entirely different, evaluative queries ("is jpl better than grassroots" pos 3.2, "jpl vs grassroots" pos 3.8, "junior premier league" pos 2.4).
- Root cause: the comparison page (`jpl-vs-grassroots-football.mdx`) re-explained what the JPL is in its own body text, not just linking out to the dedicated explainer — giving Google two legitimately relevant pages for the same definitional query.

**Changes made:**

| Page | Change | Commit |
|---|---|---|
| `parent-guides/what-is-the-junior-premier-league` | Meta description expanded 141 -> 151 chars, into the 150-165 target range (no title change - see above) | `0fe31c0` |
| `parent-guides/jpl-vs-grassroots-football` | Trimmed the redundant "what is JPL" definitional sentences from the "Understanding the choice" section down to a link-out, to stop splitting ranking signal with the explainer page on "what is jpl football" | `1326110` |

**Open question flagged to Graham, not yet resolved:** removing the cannibalisation doesn't by itself explain *why* the explainer page has 0% CTR on 249 impressions even at its own stronger position (6.8) - that's a real, separate CTR gap. The plan is to let the cannibalisation fix bed in first (so the explainer page ranks consistently, not intermittently), then re-run the competing-titles check specifically for the explainer page once its ranking is stable - the same check couldn't be done cleanly today because the comparison page was the one showing at the time.

## How to compare on the next check-in (~5 Sept 2026)

1. Tight 10-day-either-side GSC comparison (`compare_search_console_periods`, cut 3 days before the check-in date to avoid the reporting-lag warning) for the two gear pages.
2. Re-run live AI Overview check for: "football boots for wide feet", "best shin pads", "best shin pads for football", "best shin pads for kids" — see if today's FAQ entries produced a citation. Also recheck "wide fit football boots kids" to confirm the existing #5 citation held.
3. The 9 Aug batch (grassroots, JPL, academy categories, scholarships, etc.) is now past the 10-14 day watch window — decide whether a second round of targeted FAQ additions is worth it there, now that the first round's results are confirmed.
4. **JPL cannibalisation check**: confirm via `inspect_page` on both `what-is-the-junior-premier-league` and `jpl-vs-grassroots-football` whether the explainer page is now consistently the one showing for "what is jpl football" (was 249 vs 20 impr split before the fix). If it's consolidated, re-run the competing-titles live check for that query against the explainer page specifically, since today's check was confounded by the comparison page ranking instead - that's the point where a title change would have real evidence behind it, not before.
5. Check whether the explainer page's 0% CTR on "what is jpl football" has moved at all now that ranking should be more consistent, before concluding a title/meta change is needed there.

## 7. Title-length cleanup (Screaming Frog audit: 13 pages over 60 chars)

Screaming Frog flagged 13 indexable pages with titles over 60 characters/561px. `ball-mastery-drills` (was 85 chars) turned out to already be fixed by an earlier same-day commit, leaving 12 live. Split by current GSC traffic per the risk-scale rule above:

**Left untouched — real, live traffic, not worth the risk:**

| Page | 28d impressions | Position | CTR |
|---|---|---|---|
| `football-gear/best-footballs-by-age` | 8,630 | 9.1 | 0.5% |
| `football-gear/veo-camera-alternatives` | 3,751 (up from 147) | 7.5 | 1.1% |
| `academy-pathway/what-is-eppp` | 2,290 | 6.7 | 1.2% |

**Also left untouched — moderate/growing traffic, low priority:**

`academy-pathway/can-academy-players-play-grassroots-football` (881 impr), `football-development/playing-up-an-age-group-football` (829 impr, up from 18), `parent-guides/leave-grassroots-football-for-an-academy` (467 impr).

**Research before changing the remaining 6:** live PAA/FAQ-gap check (`faq-gap-check.ts`) plus DataForSEO search-volume + discovery calls (`page-keyword-research.ts`) for each — total cost **~$0.56**. Findings: PAA already "likely covered" or the SERP had no PAA box at all on every page except the coaching-qualifications one, so **no FAQ additions made** — the data didn't support any. Keyword volume came back null on nearly every candidate phrase for JPL/girls-academy-age/agent/development-centre-progress (genuinely thin-demand topics, confirms low GSC impressions aren't a title problem there). One real find: "FA Level 1 coaching football" gets 90/mo search volume, higher than the generic head term (70/mo) the coaching-qualifications page was titled around, and its PAA box was dominated by professional-career-intent questions (GCSEs, salary, demand) that don't match this grassroots-parent-focused article.

**Titles changed (title tag only, H1s/headings untouched):**

| Page | Before | After | Commit |
|---|---|---|---|
| `coaching/what-qualifications-do-i-need-to-be-a-football-coach` | "What Qualifications Do You Need to Be a Football Coach?" (73 chars) — pos 15.6, 0 clicks/240 impr; only 3 weeks old, position volatile | "Grassroots Football Coach Qualifications" (58 chars) | `f4619cb` |
| `parent-guides/jpl-and-academy-football` | "Does the Junior Premier League Lead to Academy Football?" (74 chars) — pos 4.5, 166 impr (down from 216) | "Does JPL Lead to Academy Football?" (53 chars) | `b2221a6` |
| `academy-pathway/how-to-find-a-football-agent-for-your-child` | "How to Find a Football Agent for Your Child" (61 chars) — pos 5.7, 169 impr, 3% CTR | "Finding a Football Agent for Your Child" (58 chars) | `4f4478f` |
| `girls-football/what-age-do-girls-football-academies-recruit` | "What Age Do Girls Football Academies Recruit?" (63 chars) — pos 6.6, 90 impr (down from 238) | "What Age Do Girls Academies Recruit?" (55 chars) | `327fc17` |
| `academy-pathway/how-players-progress-through-football-development-centres` | "Progress Through Football Development Centres" (63 chars) — pos 4.9, 26 impr | "Football Development Centre Progression" (58 chars) | `bc1467d` |
| `parent-guides/jpl-martin-brock-interview-part-1` | "JPL Interview: Martin Brock on the Junior Premier League" (74 chars) — pos 4.8, 18 impr, brand new | "Martin Brock on the Junior Premier League" (59 chars) | `2827c5e` |

All 6 now on the 10-14 day watch list (~2-5 Sept 2026 depending on publish date) before any further change. Next check-in: pull `inspect_page` for each, confirm ranking/CTR held or improved, nothing regressed.

## 8. Meta description cleanup (Screaming Frog audit: 38 pages over 155 chars)

Same audit, second issue type. Found 37 in the actual codebase (close match). Triaged by 28-day GSC traffic, same risk-scale rule as section 7:

- **Skipped (4):** `academy-pathway` index (already mid-edit in an uncommitted change, not ours to touch), `parent-guides/support-child-after-bad-match` (known 0-impression indexing "silence" issue, not a content problem), `academy-pathway/how-to-find-a-football-agent-for-your-child` (already on the watch list from section 7's title change), `academy-pathway/brentford-development-centre-guide` (new unpublished article, not live yet).
- **Left untouched, high/live traffic (7):** `academy-categories-explained` (8,896 impr), `arsenal-development-centre-guide` (3,153, up from 37), `chelsea-fc-development-centre-guide` (3,139, up from 40), `how-to-get-into-the-jpl` (2,443), `emerging-talent-centres-explained` (2,475), `what-is-eppp` (2,290), `football-scholarships-uk` (2,220, up from 264).
- **Left untouched, moderate traffic (9):** `what-age-do-football-academies-recruit`, `new-fa-youth-football-format`, `how-to-become-a-professional-footballer`, `development-centres-vs-academies`, `can-academy-players-play-grassroots-football`, `how-girls-football-academies-work`, `academy-trials` index, `how-to-join-a-football-academy`, `how-football-clubs-recruit-young-players`.
- **Changed, low traffic (17):** meta descriptions trimmed to 145-155 chars on `football-development-centres-near-me` (`67e54cc`), `premier-league-development-centres-list` (`fcfcd26`), `is-private-football-coaching-worth-it` (`43fe22e`), `why-isnt-my-child-improving-at-football` (`e5cb532`), `how-to-get-scouted-for-football` (`15e8088`), `how-football-scouts-identify-players` (`c825101`), `improve-football-decision-making` (`9481153`), `are-football-development-centres-worth-it` (`1722503`), `football-academy-trials-uk` (`8953953`), `good-football-development-environment` (`e286b48`), `biggest-football-parent-mistakes` (`f19a971`), `bio-banding-football` (`41c34c2`), `futurefit-football-dna-interview-part-1` (`f1a330b`), `futurefit-football-dna-interview-part-2` (`8012cda`), `girls-football` index (`5568c1d`), `parent-guides` index (`d40b25a`), homepage `/` (`1a6ba11`).

No paid research needed for this batch (unlike section 7's titles) — GSC top-query data already on hand was enough to draft copy, meta description isn't a ranking signal so there was no keyword-targeting decision to make, just a length/clarity edit. `girls-football` and `parent-guides` index pages reuse the same string as visible on-page intro copy via `CategoryPage`, so both occurrences were edited to keep them in sync, not just the meta tag.

**Expectation set going in:** this is a low-traffic batch (several pages at single-digit to low-hundred impressions), so treat this as a compliance/cleanup pass with a small possible CTR upside, not a traffic-driving change. Google also rewrites the served snippet a large share of the time regardless of what's in the tag. All 17 now on the 10-14 day watch list.

## 9. H1 cleanup (Screaming Frog audit: 3 pages over 70 chars)

Third issue type from the same audit. Only 3 pages, found by frontmatter `title` length (the field `ArticleLayout` renders as H1 and uses as the JSON-LD `headline` - separate from each page's `<title>` tag, which is set independently in `page.tsx`). Lower risk than sections 7-8 by nature: an H1-only edit doesn't touch the SERP snippet at all, so no CTR/ranking exposure the way a title-tag change has.

| Page | Before (chars) | After (chars) | 28d traffic | Commit |
|---|---|---|---|---|
| `academy-trials/football-trials-near-me` | "Football Trials Near Me: A Realistic Parent's Guide to Academy Recruitment in the UK" (84) | "Football Trials Near Me: How Academy Recruitment Works" (54) | 78 impr, pos 11.9 | `c26f4a9`, `1f9d9a7` |
| `football-development/how-to-become-a-professional-footballer` | "How to Become a Professional Footballer: What Parents Should Actually Know" (74) | "How to Become a Professional Footballer: What Parents Should Know" (65) | 938 impr, pos 8.6 | `9e010c0` |
| `parent-guides/futurefit-football-dna-interview-part-1` | "FutureFit Explained: Football DNA on 3v3, More Touches and Youth Development" (76) | "FutureFit Explained: Football DNA on 3v3 and Youth Development" (62) | 4 impr, pos 14.3 (declining) | `29845fb` |

The first draft of the trials-page H1 kept "A Realistic Guide to" from the original - caught after the fact as the same self-praising "[adjective] guide" framing as the banned "honest guide" pattern, just a different adjective. Fixed in a follow-up commit (`1f9d9a7`) to drop the framing entirely rather than just trim its length.

Both the professional-footballer and FutureFit-part-1 titles were used verbatim as internal-link anchor text elsewhere (`how-academy-football-works.mdx`; and `how-to-join-a-football-academy.mdx`, the professional-footballer article itself, `signs-your-child-is-ready-for-academy-football.mdx`, and FutureFit part 2's Related Articles, respectively) - all updated in the same commit to match the renamed H1, rather than left stale. The `football-trials-near-me` links elsewhere already used the short form "Football Trials Near Me", so nothing else needed changing there. Category-page card labels for all three were already independent, shorter, hardcoded strings, not pulled from frontmatter - unaffected.

## 10. IndexNow setup (audit tool flagged "17 pages to submit")

Not a content or ranking change - infrastructure only, logged for traceability since it touches how pages get discovered. IndexNow (Bing/Yandex only, Google doesn't support it) lets the site push "this URL changed" directly instead of waiting for a crawl. No prior integration existed.

Added: `public/b5ca026b56fd32a037caf1ef9a4c876f.txt` (ownership key file, content = filename, not secret) and `scripts/submit-indexnow.mjs` (`npm run indexnow -- <path> [<path> ...]` or `-- --all` for every route in `app/sitemap.ts`). Not yet committed or run live - awaiting go-ahead to submit the current route list.

Investigated whether Bing traffic can be measured on `/admin/seo`: no, that page is GSC (Google-only); there's no Bing Webmaster Tools integration in the codebase. GA4 (already wired into `app/layout.tsx`) does passively capture Bing organic sessions under source/medium `bing/organic` in its own UI - no code change needed to check that today. A dedicated Bing dashboard section would need a separate Bing Webmaster Tools API integration, not built.

Submitted the full route list (`app/sitemap.ts`, 86 URLs) live via `npm run indexnow -- --all`.

## 11. Traffic-source breakdown on the Page views tab (GA4 undercounts due to consent gating)

Not a ranking/content change - dashboard tooling, logged for traceability. Graham flagged that GA4 only fires post-consent, and a meaningful share of visitors never make a choice on the cookie banner (leave it up, navigate away), so GA4 undercounts real traffic - already the known reason `PageViewPing.tsx`'s consent-independent pageview log exists (see `20260819120000_page_views.sql`). That log only tracked `path`, not source, so it couldn't answer "where did visitors come from" the way GA4 normally would.

Added `referrer_host` to `page_views` (migration `20260822180000_page_views_referrer.sql` - hostname only, never the full referrer URL, same anonymous/no-PII posture as the rest of the table) and a classifier (`lib/referrer-sources.ts`) grouping into Search (Google/Bing/DuckDuckGo/Yahoo/Ecosia/Brave/Yandex/Baidu), Social (Facebook/Instagram/TikTok/YouTube/Pinterest/X/Reddit/LinkedIn/Threads), AI (ChatGPT/Perplexity/Claude/Gemini/Meta AI/You.com/DeepSeek/Poe/Copilot), Direct, and Internal (on-site navigation - excluded from the breakdown entirely, which is what lets a referrer captured per-pageview approximate "visits from this source" without needing a session id: only the true entry pageview of a visit carries an external referrer).

Known, disclosed-in-UI limitations: Bing search and Bing/Copilot chat share the `bing.com` hostname and can't be split apart; same for Grok and X/Twitter on `x.com`. In-app browsers (Instagram, TikTok) frequently blank the referrer, so those sources will undercount into "Direct" - a known industry-wide gap, not specific to this implementation. Historical rows from before this change have `referrer_host = null` and will show as Direct.

Verified live: inserted temporary test rows covering every group, confirmed the new "Traffic sources" section on the Page views tab (`app/admin/seo/page.tsx`) correctly grouped and excluded Internal, then deleted the test rows before finishing.

## 12. XbotGo partnership outreach sent (backlink/product-review prospect) — 23 Aug 2026

Not a site change, logged for traceability so a future referral-traffic bump, backlink, or response can be traced back to this instead of reconstructed later. Graham submitted XbotGo's partnership form (`xbotgo.com/pages/partnership`, "Media / content collaboration" category) on 23 August, pitching a hands-on review of the XbotGo Falcon on `/football-gear/veo-camera-alternatives` in exchange for a gifted unit, explicitly proposed outside their affiliate program (5% commission, poor fit for research-stage traffic).

Data cited in the form, sourced from this page's GSC history at time of writing: page-one rankings on Google UK for "veo alternatives uk" and "xbotgo falcon vs veo 3" among others, site-wide traffic currently 200+ sessions/day and growing, with a forward-looking note on the trajectory (not a current-state claim) and the in-progress coach app as the audience-growth story. No specific position numbers, impression counts, or analytics screenshots were shared, deliberately, per the position-shouldn't-be-quoted-externally call made in-session.

**Watch for:** any reply from XbotGo, a backlink to `veo-camera-alternatives` from xbotgo.com if they follow up on the page, and referral traffic from xbotgo.com on the Page views tab's traffic-source breakdown (section 11 above) if that happens. No article content has changed as a result of this outreach; if/when a review unit is received and a review is written, that will be its own dated log entry.

## 13. Bottom-20 low-impression-page keyword research + follow-up fixes — 24 Aug 2026

Resumed a keyword-research pass (started, crashed mid-run in an earlier session) across the 20 lowest-GSC-impression articles live >2 weeks. Full per-page write-up: `scripts/tmp-low-impression-research-results.md`. Live DataForSEO spend across the whole pass: ~$2.2 (bulk of it the $1.90 main batch, plus ~$0.2 in this follow-up round).

**Tooling bug found and fixed (not a live-site issue):** the list-building script derived each page's URL as `categoryUrl + slug` from MDX frontmatter, which is wrong wherever a page's real route nests under a subcategory folder not reflected in frontmatter (`categoryUrl` stays `/football-gear` there on purpose - it's still the correct breadcrumb target, a shared flat category index page). This produced false "0 impressions" readings for `best-football-boots-for-wide-feet-kids` and `best-shin-pads-for-kids-football` - real 28-day GSC numbers are **1,890 impr / 8 clicks** and **1,124 impr / 15 clicks** respectively, both already ranking (positions 8-33), consistent with the FAQ work already logged for both pages on 22 Aug (section 4 above). Fixed properly in `scripts/seo/dataforseo/site-keywords.ts`'s `getSiteArticleKeywords()` by cross-referencing `app/sitemap.ts` (the repo's established source of truth for real URLs, same pattern `internal-link-audit.mjs` already uses) instead of guessing from frontmatter - this also silently corrected two more pre-existing mismatches for `coaching/what-qualifications-do-i-need-to-be-a-football-coach` and `coaching/football-drills-for-7-and-8-year-olds` (both moved from their original category folder into the new `coaching` category, frontmatter never updated to match). One stale `keywords` row (id 25, boots) had the wrong target_url from before this fix - corrected in place. Commit `d41549b`.

**Title change made:** `football-development/bio-banding-football` - keyword research found "bio banding football" gets 70/mo vs. the previous question-phrased primary keyword's 10/mo. Changed MDX frontmatter `title` and `page.tsx`'s `generateSEO()` title together (avoiding the exact meta-tag-drift bug from Phase 0 above) from "What Is Bio-Banding in Football?" to "Bio Banding in Football Explained". Meta description, H1 subheadings, and TOC sections left untouched (one-lever change; page has only 9 impressions/28 days, low-traffic latitude applies). DB `primary_keyword` updated to match for tracker consistency. Commit `46368cd`. A genuine content-gap was also confirmed independently by both PAA and related-search data (a bio-banding calculator, "bio banding calculator" 20/mo unclaimed) - not built, logged as a separate, bigger opportunity.

**Deprioritized, logged not forgotten:** `academy-trials/football-academy-trials-uk` has ~1,300/mo of real, unclaimed, non-cannibalizing volume in the "open trials football" / "academy open trials 2026" cluster (KD 13-23, mostly non-local intent). Decision: not pursuing - the #1 competitor (`ukfootballtrials.com`, ranks first on every term checked) wins with a maintained trial-date/listings feature, which is a different content type (needs constant upkeep) than this site's evergreen-explainer approach. Full reasoning logged in the page's tracker notes (`seo-data/exports/article-tracker.csv`), not acted on.

**Confirmed dead ends (no fix needed, verified not a bug):** `support-child-after-bad-match`'s "what to say" angle - tested 5 close phrasings including the exact keyword the sibling `what-to-say-after-football-matches` page targets, all null in Google Ads data despite that sibling page having genuine real GSC traffic (Ads underreports this kind of informational parenting query on this site). `futurefit-football-dna-interview-part-1`'s real FA-relevant keyword ("FA FutureFit" 10/mo, "3v3 football rules FA" 20/mo) - correct keyword identified, but volume is negligible either way; treating these two interview pieces as topical-authority content rather than keyword-targeted content, no change made.

**Slop cleanup (same day, prompted by re-checking bio-banding's description):** "jargon-free explanation of" on `bio-banding-football`'s description was the same self-appointed-quality-adjective pattern as "clear"/"practical" - missed during the title change above because that task was framed as a title change, not a description rewrite (same gap as the Aug 22 H1 "Realistic Guide" catch). Fixed, plus a fresh full-site grep (not just this batch) turned up 5 more pre-existing instances, all fixed: homepage title ("Independent Guidance for Football Parents" -> "UK Academy Pathways & Youth Football Advice"), `crystal-palace-development-centre-guide` ("...Guide for Parents" -> "Crystal Palace Development Centre"), `ag-vs-fg-boots` ("...A Practical Parent's Guide" -> dropped), `how-to-join-a-football-academy` ("...A Realistic Guide for Parents" -> dropped, + its one internal-link anchor text updated to match), and the `football-development` category card (synced to the article's own already-clean title). Also found and deliberately left alone: the entire club-development-centre-guide series (Arsenal, Chelsea, Fulham, West Ham, Leeds, Brentford, Tottenham, `football-development-centres-in-london`) uses "A Parent's Guide" as a consistent title suffix - flagged to Graham as a real pattern match but likely a deliberate series convention on pages with real traffic (Arsenal 1,217 impr/28d, Chelsea 901, West Ham 879), not an accidental slip; he confirmed leave it as-is. Commit `846a362`.

**Boots/shin-pads monetization - drafted, not live:** given both pages' real query intent is commercial ("best football boots for wide feet," "best shin pads for kids" - "best X" phrasing) and the current content never names a specific buyable product, added a new "Boots Worth Trying" section to `best-football-boots-for-wide-feet-kids.mdx` with 3 real, sourced junior boot picks (New Balance Kids' 442 v2 Academy Jnr - genuine Wide/W width, Nike Jr. Tiempo Legend 10, adidas Copa Pure Junior) tied to the width factors already in the article, plus an inline affiliate disclosure linking to `/editorial-policy` (which already pre-approves affiliate income for boot recommendations specifically). Links are placeholders (`#affiliate-link-pending`) pending Graham setting up a Skimlinks account - chosen over individual retailer/Awin sign-ups since Skimlinks' single-integration coverage (48,500+ merchants, 25% cut of whatever the underlying merchant pays) beats the friction of applying to programs individually at this site's current size; revisit direct sign-up only if a specific merchant proves itself worth the extra ~0.75-2.5 percentage points later. Prices deliberately left out of the new section (stated as a considered choice in the copy itself, not an omission) to avoid a maintenance/staleness burden. Shin pads needs the same product-research pass before its equivalent section can be drafted - not done yet. Commit `09ebdfa` - not live (no working affiliate links yet, so no ranking/conversion exposure until the account exists and links are swapped in).

## 14. New article published: Equal Playing Time in Grassroots Football — 28 Aug 2026

Published `/coaching/equal-playing-time-in-grassroots-football` (category: Parent Guides breadcrumb, `coaching` content/route folder, matching the existing `what-qualifications-do-i-need-to-be-a-football-coach` and `football-drills-for-7-and-8-year-olds` pattern - no live `/coaching` category index exists yet). 2,036 words. Added to `app/sitemap.ts`.

From the article tracker's "Coach App: fair rotation" cluster (High priority, researched 2026-08-22: PAA/related-searches/organic-gap data in `seo-data/raw/serp/`, primary keyword "equal playing time football" has unmeasurable head-term volume - topical-authority + product-tie-in play, not a traffic play). Re-verified sourcing live on publish day rather than relying on the 22 Aug cache: [England Football's equal playing time guidance](https://learn.englandfootball.com/articles-and-resources/coaching/resources/2023/What-is-equal-playing-time-in-football), [Sheffield FA's calculation method](https://sheffieldfa.freshdesk.com/support/solutions/articles/76000060364-how-to-plan-equal-playing-time-calculating-minutes-), [Cornwall FA's 2018 guidance PDF](https://www.thefa.com/-/media/cfa/cornwallfa/files/governance/cornwall-fa-guidance--equal-playing-time-2018.ashx) (loads as an image-based PDF, unreadable by automated fetch - corroborated via independent search results instead, same confidence caveat as the Fulham guide's JS-rendered citation), and England Football's FutureFit pages for the 2026/27 U7 3v3 format change.

**Fact-check note:** several secondary sources (not FA-official) claimed U7 3v3 has "no substitutes, every child plays 30-40 minutes." Could not confirm this from a primary FA source directly (the official Know Your Format PDF wasn't machine-readable, and the FutureFit landing page doesn't state it explicitly) - softened the claim in the article to "designed around continuous involvement... rather than a traditional substitutes system" instead of asserting the specific unconfirmed minute figures.

4 `<ParentNote>` callouts from Graham's own experience coaching his son's u7/u8 team (equal position time vs equal minutes, the spreadsheet that led to building the Coach App, why transparency has avoided any bias complaints, and how expectations shift with age) - no existing Paul Barry library quote was a topical fit, so this used fresh first-hand material instead of a pending expert-quote request. Voice pct ~19%, well above the 10% floor. Tracker marked fact-checked/ai-slop-checked via `content-backlog.ts mark`. `npm run build` passes.

Note: `seo-data/exports/article-tracker.csv`'s `Status` column still shows `planned` for this row (that CSV is a separate export from the `content-backlog.ts` tracker updated above) - not yet refreshed.

**Follow-up: independent football-parent-review audit run same day.** Overall Quality 8/10, Risk 3/10. Found 5 fixes, all applied: (1) rolling-substitution rules broadened and cited to the FA's Standard Code of Rules for Youth Competitions - roll-on/roll-off subs apply across mini-soccer, 9v9 and youth 11-a-side, not just younger mini-soccer ages as originally written; (2) the "can a player refuse a substitution" FAQ now cites IFAB Law 3 directly (a player who delays leaving can be cautioned, though grassroots doesn't use the formal substitution-board procedure that rule was written for); (3) swapped the `what-to-say-after-football-matches` body link for `support-child-after-bad-match` (a better-fit article that already carries Graham's own coach-side quote on receiving parent questions); (4) softened the academy-football equal-playing-time FAQ, since EPPP/Foundation Phase playing-time policy could not be confirmed from either the PFSA's or Premier League's own EPPP explainer pages despite an AI web-search summary asserting a specific "50% of games" figure - that figure was not used; (5) clarified the goalkeeper-rotation-shifts sentence in the calculation section.

**Correction caught mid-fix:** the review's own first proposed fix (assume 9v9/11v11 cap substitutions like the adult game) was itself wrong - caught by actually fetching the FA rulebook and corroborating sources while implementing it, rather than taking the review's own claim on trust. Applied the corrected version instead. Worth remembering: a review pass's recommendations still need verification before being applied, same as the original draft.

Now 2,159 words, 6 external citations (2.78/1000 words, no duplicates), 5 body + 4 related internal links, `npm run build` passes. Tracker notes updated via `content-backlog.ts mark`.

**Published live, inbound links added, IndexNow submitted.** Pushed to `main` in two commits: `ef746dc` (article + sitemap entry + 3 inbound links from `what-qualifications-do-i-need-to-be-a-football-coach`, `how-to-become-a-football-coach`, `support-child-after-bad-match`, so it isn't an orphan page) and `3bd6701` (added the missing card to `/parent-guides`'s hand-maintained article list - it was folded into Parent Guides same as its `what-qualifications...` sibling, but I'd forgotten to add it to that page's array on first publish, same class of oversight as the Aug 22 boots/shin-pads categoryUrl mismatch above). Category decision made explicitly: keep `/coaching/` folded into existing categories (Parent Guides/Football Development) rather than launching it as its own nav category, revisit once it reaches 5-6+ articles (currently 3).

Submitted the URL to IndexNow (`npm run indexnow -- /coaching/equal-playing-time-in-grassroots-football`) so Bing/Yandex recrawl it without waiting for their own schedule - first attempt hit the known Git Bash path-mangling bug (`/coaching/...` silently rewritten to a `C:/Program Files/Git/coaching/...` URL, which still got a 202 from the IndexNow endpoint since it doesn't validate the URL belongs to the site) - resubmitted correctly with `MSYS_NO_PATHCONV=1`, confirmed `200 OK` with the real URL in the request. The bad first submission is harmless (IndexNow will just fail to fetch a URL that was never real) but worth knowing this bug can produce a false-success response, not just an obvious error, if this pattern recurs elsewhere.

## 15. Coach App landing page published — 1 September 2026

Published `/football-parent-coach-app`, a new standalone landing page (not an MDX article, hand-written `page.tsx` on `generateSEO()`, no `ArticleLayout`) introducing the Coach App now that it's live: what it does (squad management, scheduling/availability, team selector with equal-time rotation, live match tracker, real stats, tournament day, team sharing) and who it's for (grassroots head/assistant coaches and team managers, explicitly not an academy/league platform). Links out to `/coach-app`. Added to `app/sitemap.ts`. `npm run build` passes. Commit `6229f4f`.

**Follow-up completed same day:** added 2 inbound links to `/football-parent-coach-app` (commit `c92a63c`) — `coaching/what-qualifications-do-i-need-to-be-a-football-coach.mdx` (replacing a placeholder comment left specifically for this: `{/* App CTA placeholder: link to the grassroots coaching app once live. Do not add a URL until real. */}`, converting "dedicated team management tools" into the link) and `coaching/equal-playing-time-in-grassroots-football.mdx` (linking the existing "Coach App" mention in the spreadsheet ParentNote). A third candidate, `parent-guides/how-to-become-a-football-coach.mdx`, was considered and skipped to avoid stacking two links in one sentence (it already links to the equal-playing-time page, which now links onward to the app). `npm run build` passes.

Submitted the URL to IndexNow (`npm run indexnow -- /football-parent-coach-app` with `MSYS_NO_PATHCONV=1`), confirmed `200 OK`.
