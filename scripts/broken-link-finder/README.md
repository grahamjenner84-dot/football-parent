# Broken-link / expired-domain SEO opportunity finder

Finds dead UK youth/grassroots-football resources that have real backlinks
and that an existing (or future) Football Parent article could replace.
Standalone `.mjs` tool - no build step, not part of the `scripts/seo/`
TypeScript pipeline elsewhere in this repo.

## Setup

No new npm packages are required - the tool only uses Node built-ins plus
`gray-matter`, which is already a project dependency.

Credentials come from the `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`
variables already in `.env.local` (the same ones `scripts/seo/` uses). If
they're not already set:

```
DATAFORSEO_LOGIN=your-dataforseo-login
```

```
DATAFORSEO_PASSWORD=your-dataforseo-password
```

## Running it

Sandbox mode (default, free, returns DataForSEO's dummy data - use this to
sanity-check the pipeline runs end-to-end before spending anything):

```
node scripts/broken-link-finder/run.mjs
```

Live mode (real, chargeable DataForSEO calls). Requires **both** the CLI
flag and an explicit env var - either alone stays in sandbox:

```
DATAFORSEO_ALLOW_LIVE=true
```

(add that line to `.env.local`, then run:)

```
node scripts/broken-link-finder/run.mjs --live
```

Run only specific stages (useful once early stages are done and cached -
see "Resuming" below):

```
node scripts/broken-link-finder/run.mjs --live --stage=3,4
```

Override the domain-crawl cap for a smaller/larger test run:

```
node scripts/broken-link-finder/run.mjs --live --max-domains=20
```

Full option list:

```
node scripts/broken-link-finder/run.mjs --help
```

## Stages

1. Discover candidate UK youth-football websites via SERP (`serp/google/organic/live/advanced`) across ~70 generated queries, filtered for relevance and deduped by domain.
2. Crawl each discovered domain (`on_page` task) for broken external links in editorial content.
3. Screen every unique broken destination URL for backlinks (`backlinks/summary/live`); only URLs clearing `CONFIG.minReferringDomains` get the full, more expensive backlink workup, capped at `CONFIG.backlinksTier2Limit` per run.
4. Recover each dead resource's likely former topic via the Wayback Machine (free) plus the anchor text/URL slug found in Stage 2.
5. Match that topic against Football Parent's actual published content (`content/**/*.mdx`) - exact/close/new-article/not-relevant.
6. Check whether the broken domain itself looks entirely dead (DNS/HTTP only - no WHOIS call) and flag multi-broken-page domains as acquisition candidates.
7. Score every opportunity 0-100.
8. Write `output/discovered-sites.csv`, `output/broken-links.csv`, `output/opportunities.csv` (sorted highest score first).

## Resuming / caching

Every stage saves progress to `output/run-state.json` after each unit of
work (each SERP query, each crawled domain, each analysed broken URL), and
every DataForSEO response is cached to `cache/` keyed by request identity.
An interrupted run, or a re-run with `--stage=`, picks up from what's
already done rather than re-paying for it. Delete `output/run-state.json`
and/or the relevant `cache/<family>/` folder to force a clean re-run of a
stage.

## Before a real (`--live`) run

- Run in sandbox first end-to-end (all 8 stages) to confirm the pipeline
  runs cleanly - sandbox data is dummy data, so don't draw SEO conclusions
  from it, but it will surface any endpoint/field-shape mismatches for free.
- The `on_page` field names (`is_broken`, `link_to`, etc. - see
  `lib/onpage.mjs`) are from documentation, not a live-verified call. The
  sandbox run logs each raw response's shape (`[on_page raw shape]` lines)
  specifically so a mismatch is visible before it costs anything live.
- Start with a small `--max-domains` on the first live run.
- Every DataForSEO call made (cache misses only) is logged to
  `cache/api-usage.jsonl` with its reported cost - review that file to see
  actual spend for a run.
