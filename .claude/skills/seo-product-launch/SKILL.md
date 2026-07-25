---
name: seo-product-launch
description: "Market/terminology/naming research for the future grassroots football coaching app: user groups, category keywords, positioning, five distinct naming territories, app-store terminology. Use for product-launch research and naming requests. Never picks a final name."
---

# SEO Product Launch Research

Research support for the future UK grassroots football coaching app.
Produces terminology and positioning evidence - never a final name, and
never claims trademark/domain/app-store-availability clearance.

## Workflow

1. Gather general Google demand for the product's core terms (football
   coaching app, team management app, session planner, tactics app,
   formation maker, match-day planning, player rotation, substitution
   planning, training attendance, player development tracking, grassroots
   statistics) via `scripts/seo/dataforseo/endpoints/labs.ts`'s
   `keywordIdeas`/`relatedKeywords`.

2. Gather app-store terminology via
   `scripts/seo/dataforseo/endpoints/app_data.ts`'s
   `googlePlayAppListingsSearch`/`appleAppListingsSearch` for the same
   terms - and keep this explicitly separate from web search demand (an
   app-store search ranking is not the same signal as Google web-search
   demand).

3. Identify competitor apps surfaced in both, and note their apparent
   positioning from listing titles/subtitles (don't fabricate competitor
   detail beyond what the search data shows - flag anything that needs a
   manual App Store/Play Store visit to confirm).

## Output

- Common terminology (from both general search and app-store search,
  labelled separately)
- User groups (grassroots coaches, team managers, parents-as-coaches, etc.)
- Main problem areas surfaced by the search terms themselves
- Category keywords
- Competitor positioning (from what the data actually shows)
- Recommended positioning
- **Five clearly distinct naming territories** (not five variations on one
  idea) - each a *direction*, not a final name, and never chosen just
  because it contains a high-volume keyword
- Keyword-led descriptors (distinct from brand names)
- App-store subtitle ideas (distinct from descriptors)
- Landing-page structure suggestions
- Launch-content opportunities
- **Verification still required**: trademark search, company-name
  availability, domain availability, App Store/Play Store name availability
  - state plainly that none of these were checked here
