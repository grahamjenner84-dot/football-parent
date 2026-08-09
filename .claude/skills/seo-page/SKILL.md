---
name: seo-page
description: "Full page-level SEO opportunity analysis for one Football Parent URL: existing GSC performance, cached/new DataForSEO keyword discovery, classification of each opportunity, cannibalisation check, and exact recommended changes. Use when the user gives a specific article URL to analyse or improve."
---

# SEO Page Analysis

Analyses one Football Parent URL end to end: what it already ranks for
(GSC, the source of truth), what it's missing (DataForSEO discovery), and
what to do about each gap. This is "existing article, existing terms" +
"existing article, new terms" from the system's workflow list.

## Workflow

1. **Locate and read the article.** From the URL/path, find
   `app/<category>/<slug>/page.tsx` and `content/<category>/<slug>.mdx`
   (same convention as `lib/gsc.ts`'s `findContentFiles`). Read the current
   title, meta description, headings, and body.

2. **Retrieve GSC data through the existing connection.**
   ```
   npx tsx scripts/seo/gsc/pull.ts page <path> 180
   ```
   This calls the same service-account JWT connection as `lib/gsc.ts` (no
   new auth) and persists query-level history into `gsc_observations`.
   Prefer the already-connected `mcp__claude_ai_Football_Parent_SEO__inspect_page`
   tool for the live "why is this page doing X" read if it's available in
   this session - it hits the same underlying `getPageInspection` logic -
   then still run `pull.ts page` to persist it locally for future
   `/seo-status` and offline analysis (GSC cache freshness = 7 days; skip
   the pull if `scripts/seo/gsc/persist.ts`'s `lastGscRetrievalFor` shows a
   retrieval within the last 7 days and no refresh was requested).

3. **Analyse existing, existing terms** from the persisted rows: current
   queries, clicks, impressions, CTR, avg position, current-28-vs-previous-28
   comparison (pull both windows via `pull.ts existing 28`, or compute from
   already-persisted `gsc_observations` if fresh), improving/declining
   queries, high-impression/low-CTR queries, queries at position 4-15
   (striking distance), and any query apparently ranking against the wrong
   URL (cross-check `gsc_observations` for the same query mapped to a
   *different* Football Parent page - see the cannibalisation table in
   `lib/gsc.ts`'s `analyseCannibalisation` for the pattern).

4. **Pull AI Overview / People Also Ask / related searches** for the page's
   primary keyword. `scripts/seo/dataforseo/endpoints/serp.ts`'s
   `googleOrganicSerp` (same call step 5 below would make anyway) already
   returns these as item types on the same response; parse them with
   `scripts/seo/dataforseo/serp-features.ts`'s `extractSerpFeatures` /
   `citationSummary` rather than re-implementing. This gives three things
   step 5's Labs-only discovery doesn't: whether footballparent.co.uk is
   currently cited in the AI Overview (and who is, if not), the PAA
   question list as candidate FAQ material, and `related_searches` as free
   extra keyword candidates from the same request. Check each PAA question
   against the article body the same way `scripts/seo/cli/faq-gap-check.ts`
   does (`coverageRatio` - a keyword-overlap heuristic, not a real
   comprehension check, so treat "likely covered" as "probably fine" and
   "LIKELY GAP" as "worth a human read", not gospel either way). Same live
   gate as step 5 - sandbox by default, live only with explicit in-session
   approval; both steps can share one live call if run together.

5. **Check cached DataForSEO research first.** Query `keywords` /
   `discovery_results` for this page's `target_url` or `mapped_article`
   before requesting anything new.

6. **Discover existing, new terms** where the cache is missing or stale
   (90-day freshness for discovery). Use, in order: `keywordSuggestions`
   then `relatedKeywords` (close variants) from
   `scripts/seo/dataforseo/endpoints/labs.ts`, seeded with the article's
   primary keyword, plus `domain_intersection` seeded with any competitor
   domain that showed up citing over us in step 4's AI Overview check (the
   most direct "what are they ranking for that we aren't" signal available).
   Only enrich a shortlist (not the raw firehose) with
   `bulkKeywordDifficulty`/`keywordOverview`. Environment defaults to
   sandbox; a live call requires the user's explicit approval in this
   session before `confirmLive: true` is ever passed - see `/seo-setup` and
   the live-approval process in `CLAUDE.md`/the system's own safety rules.
   Before requesting, show cached vs missing vs stale (`planRequests` in
   `scripts/seo/dataforseo/cache.ts`) and the proposed request count.

7. **Compare** discoveries against: GSC data from step 3; step 4's AI
   Overview/PAA coverage check; the article's actual content (does it
   already cover this?); the `keywords` table; the article tracker (`pages`
   table); and other Football Parent pages (avoid recommending a term that
   already belongs to a different page - that's cannibalisation, not a gap).
   Also note, but don't chase, whether a `featured_snippet` item appeared on
   the same SERP and who holds it - informational only, not an extra lever.

8. **Classify each opportunity**: optimise existing article / add new
   section / add FAQ / secondary keyword / create separate article / ignore
   / potential cannibalisation.

9. **Recommend exact changes** - titles, meta descriptions, headings, FAQ
   entries - always showing the *current* text first (read it from the
   file, never guess), per the SEO admin guardrails in `CLAUDE.md`: one
   lever per page per change, never remove existing content, no em dashes,
   internal link suggestions as paste-ready MDX sentences.

## Output

- Concise summary
- Existing-query findings (clicks/impressions/CTR/position, 28-vs-28 trend)
- AI Overview citation status (cited / not cited, and who is if not) and PAA
  coverage (likely covered / partially touched / likely gap per question)
- Missing-keyword findings
- Terms to add to this article / terms needing a separate article / terms
  to ignore
- Title and metadata opportunities (current vs proposed, side by side)
- Heading and FAQ opportunities
- Internal-link opportunities (paste-ready MDX)
- Article tracker row (matching `scripts/seo/imports/article-tracker.ts`'s
  `ARTICLE_TRACKER_COLUMNS` order)
- Keyword tracker rows (matching `KEYWORD_TRACKER_COLUMNS` order)
- Sources and retrieval dates
- Cached vs newly-requested data, and API-reported cost for anything newly
  requested
