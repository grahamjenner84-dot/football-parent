---
name: seo-status
description: "Status/health dashboard for the local SEO research system: record counts, cache hit rate, API usage and cost by date/workflow/endpoint/environment, last GSC/trend update, latest imports, database and environment safety. Use for 'what's in the SEO database' or usage/cost check requests."
---

# SEO Status

Reports the current state of `seo-data/database/seo.db` and API usage.

## Workflow

Run:
```
npx tsx scripts/seo/cli/status.ts
```

This returns (as JSON - present it readably, don't just paste the raw
blob):

- Unique keyword count, page count, GSC observation count, discovery-run
  count, trend-run count, backlink-prospect count
- Raw-response counts by environment (sandbox vs live - live should be zero
  unless the user has explicitly run and approved a live smoke test)
- Cache hit rate and cache-status breakdown (hit/miss/stale-refreshed/
  refused) from `api_usage`
- Stale cache-record count (past their freshness window - see
  `CACHE_FRESHNESS_DAYS` in `scripts/seo/shared/types.ts`)
- API usage and reported cost, broken down by date, workflow, endpoint, and
  environment
- Last GSC update timestamp, last trend-run timestamp
- 10 most recent imports (file, type, counts)
- Database health (path, exists, size)
- Environment safety status: active `DATAFORSEO_ENV`, whether live is
  allowed by the env flags, whether credentials are present (never their
  values)

If live raw-response rows are present, call this out explicitly with their
count and cost so it's never buried in the summary.
