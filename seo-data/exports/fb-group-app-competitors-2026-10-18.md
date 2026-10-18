# Competitor research: equal game time and matchday apps

Checked 18 October 2026. Sources: UK grassroots Facebook groups, UK App Store, Google Play, homepage audits in Chrome, a Google UK snapshot and Football Parent Search Console.

## Files

| File | What it holds |
|---|---|
| `competitors.json` | 20 apps: platform, stores, price, features, website/SEO notes, how they promote, threat level (my judgement), screenshot path |
| `serp-snapshot-2026-10-18.json` | Google UK top results for 4 game-time queries, tagged football parent / competitor / other, plus your own page stats |
| `facebook-groups.json` | Groups worth working with, and recent Junior Grassroots Hub threads with no app link yet |
| `screenshots/` | Homepage or App Store screenshots for each app, plus your landing page and calculator |

## Key facts (checked)

- 11 of the 20 are native store apps. 7 run in the browser: Pocket Gaffer, FairPlay Coach, GAFFER, ClubRoots, FootballGPT, EveryPlayer and The Sporting Resource calculator.
- iPhone only: Roll On Football, SquadSync, FairPlay FC. Coach Meister's Android version is in beta.
- Most have thin or no websites. Four have no website I could find (Roll On Football, SquadSync, FTACT, McAuley's). Coach Meister is at coachmeister.com, already in your 2026-10-16 snapshot. Match Flow, Pytch, GAFFER and ClubRoots have no sitemap or blog.
- Four are doing content: FootballGPT (619 URLs, 36 blog posts), The Sporting Resource (136 pages), Centre Circle (news and guides blogs), Pocket Gaffer (5 guides).
- FairPlay Coach has a 4-page site but ranked 1st for "fair playing time football coaches app" and "equal playing time app grassroots football".
- Closest to your product:
  - **Pocket Gaffer:** £2.99/month, live minutes, tells you who's next on, parent WhatsApp match report.
  - **Roll On Football:** £4.99, balances keepers, positions and ability, re-plans for late arrivals, No. 53 in UK Sports.

## Your pages

- `/coach-app/` is the sign-in screen, not an SEO page.
- `/football-parent-coach-app`
  - About 830 words, FAQ schema.
  - Search Console: 24 impressions since September at about position 7, no clicks.
  - No SoftwareApplication schema; FairPlay Coach and Pocket Gaffer both have it.
- `/coaching/equal-playing-time-calculator`
  - Published 5 October. About 3,200 words, with WebApplication, FAQ and breadcrumb schema.
  - No impressions yet, which is too early to judge.

## Inferences (not proven)

- These searches look low-competition, because exact-match pages rank with very little content.
- Most rivals rely on Facebook posts and the app stores rather than search.
- The parent "proof of minutes" angle isn't unique: Coach Meister and Pocket Gaffer already use it.

## Limits

- The Google snapshot came from a signed-in browser, so it may be personalised.
- fairplayfc.co.uk and onpitch.app showed a bot check and weren't audited.
- No traffic, download or revenue data. Ratings and claims like "250+ teams" are the companies' own figures.
- The threat levels are my judgement, not a measured score.

## Overlap with existing SEO exports

Already covered in `seo-data/exports`:
- coachmeister.com, subtimeapp.com and statzoapp.com: 2026-10-16 snapshot
- fairplaycoach.co.uk: 2026-09-19 refs
- footballgpt.co: 2026-09-25 competitor map
- thesportingresource.co.uk: 2026-10-04 calculator SERP research

`competitors.json` lists the rest in `not_yet_in_dataforseo_snapshots`. They're candidates for a `coach-app-competitor-snapshot-3` pull. I haven't run any DataForSEO calls.
