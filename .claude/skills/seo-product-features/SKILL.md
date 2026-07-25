---
name: seo-product-features
description: "Translates coach search behaviour into evidenced feature proposals for the grassroots coaching app: problem, search evidence, target user, competitor coverage, differentiation, MVP/later/reject call. Use for product-feature research requests."
---

# SEO Product Feature Research

Turns search evidence into feature proposals - high search volume alone is
never sufficient justification to build something.

## Workflow

1. Search for the jobs-to-be-done language coaches/managers actually use
   (e.g. "substitution planner", "training attendance tracker", "5-a-side
   formation maker", "player development tracking spreadsheet") via
   `scripts/seo/dataforseo/endpoints/labs.ts`'s `keywordIdeas`/
   `relatedKeywords`/`keywordSuggestions`, and app-store search via
   `scripts/seo/dataforseo/endpoints/app_data.ts` for the same terms.

2. For each distinct problem surfaced, gather: approximate search demand
   (volume where available - sandbox data doesn't count as real demand
   evidence), likely user type (coach / team manager / parent-volunteer),
   and what existing apps in the app-store search results appear to already
   cover it.

3. Weigh differentiation: is this already well-served, or a genuine gap for
   Football Parent's grassroots-specific angle?

## Output

- User problem
- Supporting search terms
- Approximate search demand (with source/date, sandbox vs live clearly
  labelled)
- Likely user type
- Proposed feature
- Competitor coverage
- Differentiation opportunity
- MVP / later / reject recommendation
- Confidence level (state explicitly when volume evidence is thin or
  sandbox-only)
- Limitations
