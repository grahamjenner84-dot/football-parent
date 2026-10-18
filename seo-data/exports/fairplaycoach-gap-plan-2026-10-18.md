# Fair playing time app terms: why FairPlay Coach is ahead, and a plan

Written 2026-10-18 from `coach-app-competitor-snapshot-3-2026-10-18.json` / `.md`, our source files and Search Console. Nothing here has been changed on the site. Every change below needs your approval.

Labels: **[measured]** came from data pulled today or the repo. **[inference]** is my reading of it. **[guess]** is weaker than an inference.

## 1. What the data says

### The size of the prize

- [measured] Of the 8 terms, Google Ads gives a volume for two: "football substitution app" 10/month, "equal playing time app" 10/month. The other six return nothing (below Google's reporting floor, or no data). No KD for any.
- [inference] Together these are likely tens of searches a month, not hundreds. They're worth having because the intent is someone looking for exactly what the Coach App does, not because of volume. Nothing here would show as a traffic change; the measure is sign-ups via `/football-parent-coach-app`.

### Who is ahead, and by how much

- [measured] In the non-personalised SERP (DataForSEO, desktop, google.co.uk), FairPlay Coach ranks #4 for "fair playing time football coaches app" (`/features/equal-playing-time-app/`), #13 for "equal playing time app grassroots football", #14 for "equal playing time app" and #16 for "playing time app football" (all its homepage). It is not in the top 30 for the other four.
- [measured] We rank #11 for "equal playing time app grassroots football" with the equal playing time article, and are not in the top 30 for the other seven. The coach app page is not in the top 30 for any.
- [measured] The "FairPlay Coach #1" result in `game-time-serp-snapshot-2026-10-18.json` came from a signed-in Chrome session. Today's non-personalised pull does not reproduce it. [inference] Browsing history most likely explains the difference, but I can't prove it from here.

### Does on-page explain it?

| | FairPlay Coach feature page (#4) | FairPlay Coach homepage | Our `/football-parent-coach-app` |
|---|---|---|---|
| Title | Football Team Rotation App / FairPlay Coach | Grassroots Football Coaching App / FairPlay Coach | Football Parent Coach App: Team Selector & Match Tracker |
| H1 | A clearer way to plan your football matchday | THE GRASSROOTS FOOTBALL COACHING APP FOR FAIRER MATCHDAYS | Give every kid fair game time |
| Meta description | Plan football player rotations, manage the match live and share clear lineups with FairPlay Coach. | Plan football substitutions, track player minutes and keep playing time fair. FairPlay Coach helps grassroots coaches manage matchdays and update parents. | Football Parent's Coach App: build your lineup, track live matches and get fair playing-time rotation for your grassroots football team, all in one place. |
| Words (body) | 128 | 1,226 | about 680 (source) |
| URL | contains "equal-playing-time-app" | / | /football-parent-coach-app |
| "fair playing time" / "equal playing time" uses | 0 / 0 | 1 / 1 | 2 / 0 |
| "substitution(s)" / "rotation" | 0 / 3 | 9 / 15 | 2 / 4 |
| Schema | not checked today | SoftwareApplication, FAQ (Chrome check 18 Oct) | FAQPage |

Sources: FairPlay Coach title/meta/H1/word counts from DataForSEO instant_pages and content_parsing today [measured]; ours from `content/landing/main.mdx` [measured].

- [measured] The page that ranks #4 has 128 words and uses none of the target phrases in its text. The one place the phrase appears is its URL.
- [inference] The visible differences are: FairPlay Coach has a page (and URL) dedicated to the topic, and both its titles say "app" plus "grassroots" or "rotation". Our title leads with the brand and "Team Selector & Match Tracker", and doesn't say playing time, subs or grassroots.
- **The data doesn't explain the #4 by itself.** A 128-word page with no exact-match text outranking us could be the URL slug, the site's tight topic focus, or something not measured here (click behaviour, freshness). I can't separate those, and I'm not offering a theory beyond that.

### Does links explain it?

- [measured] No. All 34 of FairPlay Coach's referring domains are an automated spam network, and 28 of our 31 are the same network. Neither site has a real link that distinguishes it.

### Does Google pick one of our pages, and is there cannibalisation?

- [measured] For these 8 terms, Google shows one of our pages once (#11, the equal playing time article). Search Console shows no impressions for any of the 8 terms on any of our pages in the last 90 days. So there's no measurable cannibalisation on these terms.
- [measured] Adjacent split worth knowing: "grassroots football app" shows best-grassroots-football-apps (17.8, 92 impressions) and best-football-stats-apps (22.3, 28 impressions).
- [inference] The risk of cannibalisation comes later. If the coach app page starts ranking for app terms, the equal playing time article (informational) should stay on "equal playing time"/"equal game time" and not be pushed toward "app" wording.

### AI Overviews

- [measured] All 8 SERPs carry one. The single one returned in full ("football substitution app") cites SubTime, SubNow, SubAssist, Spond, Ballrz, Reddit and the App Store: not us, not FairPlay Coach.
- [measured] The other 7 load asynchronously and their citations were not fetched, so whether we or FairPlay Coach are cited there is **unknown**. Nothing in this repo requests async overviews (`load_async_ai_overview`), so the existing AI Overview checks have the same blind spot. See section 4.

## 2. Which page owns which term

| Term | Owner | Why |
|---|---|---|
| equal playing time app grassroots football | `/football-parent-coach-app` | App-seeking intent; SERP is app listings and product pages |
| fair playing time football coaches app | `/football-parent-coach-app` | Same |
| fair playing time app | `/football-parent-coach-app` | Same |
| equal game time app / equal playing time app | `/football-parent-coach-app` | Same |
| playing time app football | `/football-parent-coach-app` | Same |
| football substitution app / grassroots football substitution app / subbing app | `/football-parent-coach-app` | Same |
| best football coaching app(s), grassroots football app | `/coaching/best-grassroots-football-apps` (unchanged) | List intent, already ranking 5 to 19 |
| equal playing time, equal game time | `/coaching/equal-playing-time-in-grassroots-football` (unchanged) | Informational, already ranking around 6 |
| equal playing time calculator, playing time calculator | `/coaching/equal-playing-time-calculator` (unchanged) | Tool intent |

The other three pages keep their current targets. The plan only changes how they link to the owner.

## 3. Changes, in order

The coach app page has had 22 impressions in 56 days and no clicks [measured], so a change there risks almost nothing, but the 10 to 14 day watch also won't produce a readable signal. **Decision for you:** CLAUDE.md rule 1 says one lever per change. I suggest treating change 1 (title, description, H1) as a single targeting change for this page, because there is no traffic to attribute against. If you'd rather keep strictly to rule 1, ship 1a first and 1b two weeks later.

### Change 1a. Title and meta description: `content/landing/main.mdx` (`seoTitle`, `seoDescription`)

Current title: `Football Parent Coach App: Team Selector & Match Tracker`

Options:
- A (recommended): `Equal Playing Time App for Grassroots Football: Subs and Lineups` (64 chars). Contains "playing time app", "equal playing time app", "grassroots football" and "subs".
- B: `Fair Playing Time App for Grassroots Football Coaches` (53 chars). Matches the "fair" variants and "coaches app"; drops subs.
- C: `Grassroots Football Coach App: Fair Playing Time, Subs and Lineups` (66 chars). Leads with the category, but [inference] it may pull "grassroots football app" toward this page and away from best-grassroots-football-apps, which ranks for it now.

Current description: `Football Parent's Coach App: build your lineup, track live matches and get fair playing-time rotation for your grassroots football team, all in one place.`

Options:
- A (recommended, 165 chars): `A fair playing time app for grassroots football coaches. Pick your lineup, get a substitution plan for every quarter or half and keep minutes even across the season.`
- B (163 chars): `Plan fair playing time for your grassroots football team. The Coach App picks the lineup, plans the subs for every quarter or half and tracks each child's minutes.`

Why: neither the title nor the description currently says "playing time app", "subs" or "substitution", which are in every target term. [inference]

Check before shipping: "keep minutes even across the season" and "tracks each child's minutes" must match what the free plan actually does. The landing copy says full season stats are paid. If the season minutes view is paid, use option B and drop "across the season".

### Change 1b. H1: `content/landing/main.mdx` (`h1`)

Current: `Give every kid fair game time`

Options:
- A (recommended): `The fair playing time app for grassroots coaches`
- B: keep the H1, and change `subhead` to open with "The fair playing time and substitution app for grassroots football coaches: squad, lineups, live subs and playing-time stats, all worked out for you."

Why: FairPlay Coach's H1 names the category ("grassroots football coaching app"); ours describes a benefit without saying what the product is. [inference] Option B keeps the emotional line you chose in commit `5ce5ffd` ("Lead with fair game time").

### Change 2. New section and FAQ on the coach app page: `content/landing/main.mdx`

Add after "## What It Does", additive only:

```mdx
## Fair Playing Time and Substitutions

Tell the app how you want game time shared out: equal minutes for everyone, a minimum each, or a fixed lineup you adjust yourself. It builds the lineup and a substitution plan for every quarter or half, so nobody is working out minutes on the touchline while the match is going on.

Change your formation and the rotation reworks around it. Once a match is saved, each player's share of the available minutes updates, so when a parent asks whether their child is getting a fair go, you can answer from your phone.
```

Add to the FAQ (it feeds the existing FAQPage schema):

```mdx
### Is there an app for keeping track of playing time?

Yes. The Coach App plans fair playing time for a grassroots team: set your rules once and it builds the lineup, plans substitutions for every quarter or half and shows each player's share of the minutes. The team selector and equal-time rotation are free.
```

Why: [measured] "Is there an app for keeping track of playing time?", "What app can I use to track playing time?" and "Is there an app for subs?" are People Also Ask questions on these SERPs. The section copy reuses claims already on the site (`content/landing/equal-game-time.mdx`, `main.mdx`); confirm "minimum each" and "share of available minutes" are both live and free before shipping.

Ship this at least 10 days after change 1 so the two can be told apart, if anything moves at all.

### Change 3. SoftwareApplication schema: recommend not adding yet

The brief asks to add it. The repo removed it deliberately: `app/components/CoachLandingPage.tsx` lines 66 to 72. Google's Software App rich result needs `aggregateRating` or `review`; we have no reviews to put there, and without them the entity only reports as a structured-data error (Semrush audit, 5 Oct 2026). Pulling a Google Play rating into it would be marking up reviews from another site, which Google's review snippet guidelines don't allow.

- [measured] FairPlay Coach has the schema and still isn't top 3 for any term in today's SERP, so there's no evidence here that it moves rankings.
- Recommendation: leave it off until there are real on-page reviews (for example coach quotes, with permission), then add `SoftwareApplication` with `name`, `applicationCategory: "SportsApplication"`, `operatingSystem: "Web, Android"`, `offers` (free tier and £2.99/month) and `aggregateRating` from those reviews.
- If you want it anyway without reviews, say so and I'll draft it, but expect the error to reappear in the site audit.

### Change 4. Internal links: anchor text, one link per source page

[measured] The coach app page gets 16 body links from articles, plus the sitewide banner on every article. 11 of the 16 body anchors are just "Coach App". None says playing time, subs or substitution. These edits keep every link and change only the words linked. Paste-ready replacements:

**4a. `content/coaching/equal-playing-time-calculator.mdx`, line 49** (0 impressions so far, lowest risk; do first)

Current: `It is the same planner that picks the team inside the [Coach App](/football-parent-coach-app), run change by change.`

New: `It is the same planner that picks the team inside the Coach App, our [playing time app for grassroots football](/football-parent-coach-app), run change by change.`

**4b. `content/coaching/football-team-spreadsheet.mdx`, line 94**

Current: `The [Coach App](/football-parent-coach-app) applies the same target-minutes and rotation logic a spreadsheet uses, but automatically: ...`

New: `The Coach App, our [fair playing time app for grassroots coaches](/football-parent-coach-app), applies the same target-minutes and rotation logic a spreadsheet uses, but automatically: ...` (rest of the sentence unchanged)

**4c. `content/coaching/best-grassroots-football-apps.mdx`, line 66** (live traffic: 2,093 impressions and 52 clicks in the last 28 days, so be conservative)

Current: `Football Parent's [Coach App](/football-parent-coach-app) is the pick here because it builds equal-time rotation directly into its team selector: ...`

New: `Football Parent's [equal playing time app](/football-parent-coach-app) is the pick here because it builds equal-time rotation directly into its team selector: ...` (rest unchanged)

**4d. `content/coaching/equal-playing-time-in-grassroots-football.mdx`, line 62** (live traffic: 3,691 impressions, 48 clicks, average position 6.8 in the last 28 days; do last, and only if 4a to 4c haven't caused problems)

Current: `That's the gap the [Coach App](/football-parent-coach-app) is built to close: ...`

New: `That's the gap the Coach App, our [grassroots football substitution app](/football-parent-coach-app), is built to close: ...` (rest unchanged)

Why: anchor text is one of the few on-site signals telling Google what the coach app page is about, and today it says only the brand. [inference] 4c and 4d change only the anchor of an outbound link on the source page, so [inference] the risk to those pages' own rankings is small, but they carry live traffic, so space them out and log each one.

### Change 5. Link and visibility targets (no outreach sent; for your review)

The backlink gap holds almost nothing usable [measured]: competitors' real links are app directories, startup trackers, partner homepages and Centre Circle's official county FA pages. The better prospects are UK pages already ranking on these SERPs, put through `assessProspect`:

| Page | Ranks for | Gate | Realistic? |
|---|---|---|---|
| phoenixyouthfc.com, "I recently saw a post from Grassroots Football UK about equal play..." | #3, equal playing time app grassroots football | ok (country unclear from URL) | Yes. A youth club blog post on equal play. Pitch the free calculator as a resource, not the app. |
| launtonfc.co.uk/equal-playing-time | #8, "equal game time" (2026-10-04 pull) | ok | Yes. A club's equal playing time page. Same calculator angle. |
| footballdna.co.uk/mastering-equal-playtime/ | #7, equal playing time app | ok | Existing partner. Raise inside the sponsorship conversation, not as a cold pitch. |
| englandfootball.com, Helpful apps & websites: Matchday | #7, grassroots football substitution app | parked (governing body) | Needs a partnership conversation; it's a list of apps. |
| belnorth.com/fairgt/ | #3 and #9 | ok (country unclear) | Unlikely. It's a club's own rival calculator. |
| bcgfl.org.uk/coaches/centre-circle-app/ | not ranking | ok | No. It documents the app the league uses. |
| pitch-planner.app blog listicle | #10, fair playing time app | ok | No. Pitch Planner is a rival sub app. |

Outside the site, [measured] two things fill most of these top 10s: app store listings (SubTime in 6 of 8) and Grassroots Football Hub Facebook threads (5 of 8, as high as #1). [inference] Our Google Play listing's title and short description (Play Console, not this repo; not checked today) and replies in the threads listed in `fb-groups-and-threads-2026-10-18.json` may do more for these terms than anything on the site. Both are your call and done by hand.

## 4. Other things found

1. **The calculator page has 0 impressions since 5 Oct** [measured], although it's in the sitemap, has 7 internal links, and its source has no noindex and a correct canonical. Per CLAUDE.md rule 10, check URL Inspection / Test Live URL in Search Console before any content change.
2. **Async AI Overviews aren't being fetched.** 7 of 8 overviews here, and probably many in the weekly checks, load asynchronously and DataForSEO returns them empty unless the request sets `load_async_ai_overview: true`. That would be a small optional flag on `googleOrganicSerp` in `scripts/seo/dataforseo/endpoints/serp.ts`. Re-pulling these 7 SERPs with it would cost roughly $0.06 [estimate, not a quote]. Not run: it needs your approval.
3. **The outreach quality gate lets two kinds of junk through** [measured]: link-farm directory pages (`*.store` / `*.space` `.../dir/white-hat-backlinks-...`) come back `ok`, and pitch-planner.app (a rival sub app) isn't caught by `isCommercialRival`. CLAUDE.md says to tighten the gate rather than filter by hand, so that's a separate change for approval.
4. Two small helper additions were made for this pull (scripts only, no site change): optional `filters`/`orderBy` on `rankedKeywords` in `labs.ts`, and an `instantPages` function in `on_page.ts`. Existing callers send the same request bodies as before.

## 5. If you approve

Suggested order: 1a (with 1b if you accept the bundling), then 4a and 4b, then 2 after 10 days, then 4c, then 4d. Each in its own commit, logged to the latest `seo-changes-*.md` as it ships. Run `npm run build` before each commit. The coach app page change is low risk; 4c and 4d touch pages with live traffic.
