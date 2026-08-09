---
name: seo-content
description: "Discovers and clusters new content opportunities for Football Parent from a topic, pillar, or seed terms - genuinely new topics, not just wording variants of existing articles. Use for 'what should we write next' / content-gap requests."
---

# SEO Content Discovery

Finds genuinely new article opportunities ("new, new terms") and clusters
them by shared intent, rather than ranking a flat list by raw volume.

## Workflow

1. **Check existing content first.** Grep `content/**/*.mdx` frontmatter
   and the article tracker (`pages` table) for anything already covering
   the topic - don't recommend an article that duplicates one that exists.

2. **Check saved keyword research.** Query the `keywords` table and any
   prior `discovery_results` for this pillar before requesting anything new.

3. **Discover genuinely new opportunities.** Use
   `scripts/seo/dataforseo/endpoints/labs.ts`'s `keywordIdeas` (broader
   adjacent terms) seeded from the core subject areas relevant to the
   request (academy football, trials, development centres, grassroots,
   coaching, confidence, training, girls' football, junior leagues, camps,
   tournaments, equipment, football parents, team management), plus
   `relatedKeywords` for anything promising. For the most promising seed
   terms, also pull `people_also_ask`/`related_searches` via
   `googleOrganicSerp` + `scripts/seo/dataforseo/serp-features.ts`'s
   `extractSerpFeatures` (same pattern as `/seo-page` step 4) - real
   Google-surfaced question phrasing is a useful cross-check against the
   Labs-only keyword list, and occasionally turns up an adjacent angle Labs
   doesn't. Show the cache plan (cached vs missing vs stale, proposed
   request count) before requesting; sandbox by default, live only with
   explicit in-session approval.

4. **Cluster by shared intent.**
   ```
   scripts/seo/clustering/intent-cluster.ts -> clusterKeywords(...)
   ```
   Removes obvious wording-variant duplicates mechanically (the task's
   "don't recommend separate articles for obvious wording variations" rule)
   via token-overlap clustering - it will under-merge true synonyms, so
   review clusters with a human eye before finalising, and use
   `bulkKeywordDifficulty`/`searchIntent` on the shortlisted cluster heads
   to confirm intent rather than assuming from wording alone.

5. **Calculate cluster-level opportunity**: combined search volume, typical
   difficulty, dominant intent, and whether the cluster overlaps an existing
   page (cannibalisation risk) or a different pillar's cluster.

6. **Prioritise** - not by raw volume alone. Weigh difficulty, intent match,
   commercial/affiliate relevance, and whether it's a genuinely new topic
   vs. an extension of an existing article (which belongs in `/seo-page`
   instead).

7. Persist accepted clusters:
   `scripts/seo/clustering/persist.ts` -> `persistClusters(clusters, pillar, intent)`.

## Output

- Proposed article (title/angle)
- Primary keyword
- Secondary keywords
- Combined cluster search volume
- Difficulty
- Intent
- Pillar
- Seasonality (cross-reference `/seo-trends` if timing matters)
- Suggested publication timing
- Commercial/affiliate relevance
- Rationale
- Cannibalisation notes
- Tracker rows (`ARTICLE_TRACKER_COLUMNS`/`KEYWORD_TRACKER_COLUMNS` order)
