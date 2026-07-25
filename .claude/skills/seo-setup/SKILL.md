---
name: seo-setup
description: "Validates the local SEO research system: directory structure, SQLite schema, env vars (presence only), sandbox/live safety, existing GSC connection, and sandbox integration tests. Use for initial setup or a health check of the SEO tooling. Makes no live DataForSEO calls."
---

# SEO Setup / Health Check

Validates the local SEO research system (`seo-data/`, `scripts/seo/`,
`.claude/skills/seo-*`) end to end. Never displays credential values, never
makes a live DataForSEO call.

## Workflow

1. Run the structure/env/DB/GSC check:
   ```
   npx tsx scripts/seo/cli/setup.ts
   ```
   This checks: required directories exist; `DATAFORSEO_USERNAME` (or the
   repo's actual `DATAFORSEO_LOGIN`) / `DATAFORSEO_PASSWORD` /
   `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` /
   `GSC_SITE_URL` are *present* (values are never read into the report);
   the active `DATAFORSEO_ENV`; that live calls aren't silently allowed;
   migrates the SQLite schema (`seo-data/database/seo.db`, via Node's
   built-in `node:sqlite` - no native build step); and does a 1-day GSC
   probe query through the existing service-account connection (the same
   one `lib/gsc.ts`, the `/api/mcp` tools, and `scripts/inspect-page.mjs`
   already use) to confirm it's still reachable.

2. Run the sandbox integration test:
   ```
   npx tsx scripts/seo/cli/sandbox-integration-test.ts
   ```
   Exercises Labs (keyword_ideas, related_keywords, bulk_keyword_difficulty),
   Keywords Data (Google Ads search_volume, Google Trends explore),
   Backlinks (domain_intersection), and App Data (Google Play listings
   search) against `sandbox.dataforseo.com` only. Also proves a second
   identical request is served from cache (same `requestHash`, no new
   network call) and that a live call attempt is refused while
   `DATAFORSEO_ALLOW_LIVE=false`. If this fails with HTTP 401, the
   DataForSEO credentials in `.env.local` are the problem, not this system -
   report that plainly rather than guessing at endpoint paths.

3. Report a combined summary: which checks passed/failed, the active
   DataForSEO environment, table row counts, and whether both sandbox and
   live raw-response rows this run are correctly environment-tagged (there
   should be zero `live` rows unless the user has separately approved and
   run a live smoke test).

## What this skill must never do

- Never set `environment: "live"` or `confirmLive: true` anywhere in this
  workflow.
- Never print `DATAFORSEO_PASSWORD`, `DATAFORSEO_USERNAME`/`DATAFORSEO_LOGIN`,
  or `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` values - only whether they're set.
- Never treat a sandbox response as real keyword/SEO evidence in the report.
