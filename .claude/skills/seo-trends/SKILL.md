---
name: seo-trends
description: "Seasonal/timing research for Football Parent topics: recurring annual peaks, rising searches, publication and social-promotion windows, using monthly search history and Google Trends. Use for 'when should we publish/promote X' or seasonal-content requests."
---

# SEO Trends

Distinguishes measured trend data from interpretation - every output must
be traceable to either a stored `monthly_search_history`/`trend_results`
row or clearly labelled as Claude's reading of that data.

## Workflow

1. **Check existing monthly search history first** (`monthly_search_history`
   table, 90-day freshness) before requesting anything new.

2. **Use Google Trends only where it adds timing/rising-query evidence**
   that monthly history doesn't already show:
   ```
   scripts/seo/dataforseo/endpoints/keywords_data.ts -> googleTrendsExplore(keywords, opts)
   ```
   This is task-based (`task_post` then polled `task_get`), 30-day cache
   freshness. Batch comparable terms in one call (up to a handful of
   genuinely related terms) - never compare unrelated terms just to save a
   request, and never batch terms from different topics merely to reduce
   call count.

3. Save every trend response (already automatic via the cache/raw-response
   layer - `seo-data/raw/keywords_data/` + `trend_runs`/`trend_results`).

4. For each theme, distinguish:
   - **Measured**: relative interest by month (0-100 Google Trends scale,
     not absolute search volume - never conflate the two), rising related
     queries, recurring year-over-year pattern if 2+ years of history exist.
   - **Interpretation**: likely cause, recommended publish/promote window,
     whether it's a durable SEO opportunity or a short-lived social moment.

## Output

- Measured trend direction (labelled as measured)
- Normal rise period / likely peak period
- Recurring vs one-off classification (and confidence - one season of data
  is not a confirmed recurring pattern)
- Rising related searches
- Permanent article opportunities vs temporary social opportunities
- Recommended publication window
- Recommended promotion window
- Instagram carousel concepts
- TikTok/Reel concepts
- Parent checklist ideas
- Newsletter themes
- Data limitations (e.g. "only N months of history available",
  "Trends interest is relative, not an absolute volume figure")
