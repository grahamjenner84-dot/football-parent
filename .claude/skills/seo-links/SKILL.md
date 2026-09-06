---
name: seo-links
description: "Backlink prospect research: competitor overlap, domains linking to competitors but not Football Parent, resource-page and broken-link opportunities. Use for backlink/outreach-prospecting requests. Never sends outreach."
---

# SEO Backlink Prospecting

Finds and screens backlink prospects. Never sends outreach - output is a
reviewable prospect list only.

## Workflow

1. Identify 2+ competitor domains relevant to the pillar/article in
   question (ask the user if not given, or infer from prior
   `competitors` table entries).

2. Start with overlap, not a full unfiltered export:
   ```
   scripts/seo/dataforseo/endpoints/backlinks.ts
     -> domainIntersection(competitorTargets, { ...opts, excludeTargets: ["footballparent.co.uk"] })
        // domains linking to competitors but not FP - confirmed against the
        // real API: domainIntersection(targets, opts) WITHOUT excludeTargets
        // returns the true intersection (domains linking to ALL of targets,
        // i.e. linking to both the competitor AND us already) - a small,
        // different, much-less-useful list. excludeTargets is required to
        // get the actual opportunity list.
     -> pageIntersection(targetPages, opts) // once a specific competitor page is a known link magnet
   ```

3. Narrow further as needed: `referringDomains`, `competitorsBacklinks`,
   `anchors`, and `bulkRanks` (screening-only authority signal for a batch
   of prospect domains - never treat as an absolute quality measure).

4. Filter out obviously irrelevant or low-quality prospects (unrelated
   niches, spam-pattern domains) before presenting the list.

5. Match each surviving prospect to the most relevant Football Parent page
   and propose an outreach angle - but do not draft or send anything.

## Output (one row per prospect)

- Prospect domain
- Exact referring page
- Competitor linked to
- Competitor target page
- Link type
- Dofollow/nofollow status
- Available authority/rank metrics (labelled as a screening signal, not an
  absolute measure)
- Available spam indicators (same caveat)
- Most appropriate Football Parent page
- Suggested outreach angle
- Priority
- Review status (always starts `needs_review` - see the `backlink_prospects`
  table default; outreach is a manual, separate step)
