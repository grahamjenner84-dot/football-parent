# Equal Playing Time Calculator page: SEO and funnel analysis (2026-11-01)

Page: `/coaching/equal-playing-time-calculator` (live 6 Oct 2026). Read-only analysis, no changes made.

Sources: Search Console via `lib/gsc.ts` and the `inspect_page` MCP tool (GSC data runs to **30 Oct**, 31 Oct is empty); first-party `page_views` and `coach_app_signups` in football-parent-social (owner traffic already excluded at write time, bot user agents filtered, UK days via `lib/uk-day.ts`); the `get_coach_app_funnel` MCP tool (calculator steps, banner test, whole-app usage snapshots). The Coach App database was not read.

Periods used below:
- **Launch period:** 6 to 17 Oct (UK days). Google Ads drove the page; Google could not see the calculator.
- **Since 18 Oct:** 18 Oct to 1 Nov (to about 11:00). The `indexifembedded` change (coach-app `39e4ea0`) made the calculator visible to Google on 18 Oct; Google Ads clicks to this page stopped the same day.

---

## 1. SEO

### Current title and meta (from `app/coaching/equal-playing-time-calculator/page.tsx`)

- Title: **Free Equal Playing Time Calculator for Grassroots Football**
- Meta: **Free equal playing time calculator for grassroots football. Add your squad, pick your format and get a fair game time plan with changes at every break.**
- Schema: WebApplication + Breadcrumb + FAQPage (`kind="tool"` in `lib/ArticleLayout.tsx`). Inbound internal links from 6 pages (coaching cluster plus how-to-become-a-football-coach).

### Trend

First impressions on **21 Oct**, three days after the `indexifembedded` change and the indexing request. Zero impressions from 6 to 20 Oct even though the page was indexed on 9 Oct.

| Week (GSC) | Impressions | Clicks | CTR | Avg position |
|---|---|---|---|---|
| 5-11 Oct | 0 | 0 | - | - |
| 12-18 Oct | 0 | 0 | - | - |
| 19-25 Oct (impressions from 21 Oct) | 560 | 15 | 2.7% | 5.2 |
| 26-30 Oct (5 days) | 441 | 8 | 1.8% | 5.1 |
| **21-30 Oct total** | **1,001** | **23** | **2.3%** | **~5.1** |

Daily: 38, 114, 121, 169 (Sat 24), 118, 62, 79, 72, 64, 164 (30 Oct, best position so far at 4.1). Weekend peaks match grassroots matchdays. Running about 100 impressions a day, steady at position 4-6.

### Queries (19-30 Oct)

Query-level rows cover only about 130 of the 1,001 impressions; the rest are anonymised long-tail, so treat the per-query numbers as small samples.

| Query | Impr. | Clicks | Pos. |
|---|---|---|---|
| equal playing time calculator | 37 | 2 | 5.8 |
| playing time calculator | 25 | 0 | 5.4 |
| equal game time calculator | 22 | 0 | 4.7 |
| fair game time calculator | 5 | 0 | 6.0 |
| game time calculator football | 5 | 0 | 3.6 |
| football time calculator | 3 | 0 | 6.3 |
| game time calculator | 3 | 0 | 6.7 |
| playing time calculator football | 3 | 0 | 2.0 |
| match time calculator / playing time calculator soccer | 2 each | 0 | 5.0 |
| gametime calculator | 2 | 0 | 10.0 |
| playing time calculator app | 1 | 0 | 11 |
| equal playing time | 2 | 0 | 36.5 |
| soccer rotation generator | 1 | 0 | 65 |

**Page 2 and below:** very little is there. "gametime calculator" (10) and "playing time calculator app" (11) are the only page-2 rows, at 1-2 impressions each. "equal playing time" (36.5) belongs to the sister article and should stay there. The page is already on page 1 for all three target terms. The next gain is moving from 5 to the top 3, not rescuing page-2 terms.

**Why CTR is low for position 5:** the Oct research (`game-time-calculator-plan.md` §7) found an AI Overview on all 12 calculator and explainer queries, citing playingtimecalculator.com, belnorth.com/fairgt, danscapers.com, equalsubs.net and quicksub.fun. The 2.3% CTR at position ~5 fits an AI Overview pushing the organic results down. No single query has enough impressions yet to call a title problem. "playing time calculator" (260/mo, the biggest target) has 25 impressions and 0 clicks at 5.4.

### Overlap with the sister article (`/coaching/equal-playing-time-in-grassroots-football`)

| Week | Sister impr. / clicks / pos | Calculator impr. / clicks | Combined clicks |
|---|---|---|---|
| 5-11 Oct | 886 / 12 / 7.0 | 0 / 0 | 12 |
| 12-18 Oct | 1,008 / 13 / 6.8 | 0 / 0 | 13 |
| 19-25 Oct | 505 / 3 / 6.6 | 560 / 15 | 18 |
| 26-30 Oct (5 days) | 195 / 0 / 6.9 | 441 / 8 | 8 |

- The handover was expected and is visible: before 18 Oct the sister held "equal game time calculator" (pos 7, 1 click) and "equal playing time calculator" (8.5, 1 click). It now has neither, and the calculator holds both at 4.7-5.8.
- Combined clicks held up and then rose (12-13 a week to 18; the last 5 days run at about 11 a week). Combined impressions are flat-to-down (about 1,000 a week to about 890 a week pro rata).
- **Watch item, due ~1 Nov per SEO_ROADMAP:** "equal playing time" on the sister fell from 7 impressions at 5.3 (5-18 Oct) to 1 impression at 9 (19-30 Oct). The numbers are too small to call a slip, and the sister's average position is unchanged (6.6-6.9). But its daily impressions dropped from about 140 to about 40 and it has had 0 clicks since 26 Oct. Most of that is anonymised query volume, plausibly calculator-intent searches now going to the calculator. Re-read alongside the 8 Nov calculator check rather than acting now.

### Change history on this page (from `seo-changes-2026-09-06.md`)

6 Oct publish and same-day layout changes, `dae729c` and `14b934e`. 18 Oct: `indexifembedded` (coach-app `39e4ea0`), plus the Coach App anchor text change `6bb17e5`. 23 Oct: tracking tags only, `73ad532`. The 22 Oct and 1 Nov weekly checks marked `indexifembedded` as **Worked, read again 8 Nov**. The page is inside its watch window until about 8 Nov.

---

## 2. Funnel

### How the steps are tracked

Synthetic `page_views` paths, kept out of page views (`CALCULATOR_STEP_PREFIXES` in `lib/supabase/page-views.ts`). Each step fires at most once per page load and carries the host page's gclid and referrer:

- `/coach-app/game-time-calculator/embed`: the calculator loaded inside this page. This fires about once per page view, so it counts loads, not engagement.
- `.../embed/plan`: a plan was made (squad entered, result shown).
- `.../embed/touchline`: "Run it on the touchline" tapped.
- `.../embed/full-time`: reached full time.
- `.../embed/save-team-open`: "Save team" opened, then `.../embed/save-team`: saved.
- `/coach-app/signup-form/app/calculator-embed/(view|google|email…)`: the sign-up form shown from the embed.
- The same steps without `/embed` are the **full-screen calculator** at `/coach-app/game-time-calculator` (itself a real page view). The page's "open the calculator full screen" link and the touchline button lead there. Its form path is `/coach-app/signup-form/app/calculator/...`.
- `/coach-app/game-time/*`: the in-app tool, used by signed-in coaches.

### Funnel table

| Step | 6-17 Oct (launch, Ads-led) | 18 Oct - 1 Nov (organic-led) |
|---|---|---|
| Page views | **95**: Ads 75, Direct 11, Internal 9 | **67**: Search 38, Direct 21, Internal 4, Social 3, Ads 1 |
| Embed loaded | 96 (Ads 76) | 66 (Search 37, Direct 21) |
| Plan made (embed) | **28** (29% of loads; Ads 23 of 76 = 30%) | **21** (32% of loads; **Search 19 of 37 = 51%**; Direct 1 of 21) |
| Touchline (embed) | 2 | 2 (both Search) |
| Save team opened / saved (embed) | 2 / 1 | **0 / 0** |
| Embed sign-up form view / Google tap | 2 / 1 | 0 / 0 |
| Full-screen calculator page views | 32 (26 internal referrer)* | 13 (8 internal, 5 direct) |
| Full-screen plan / touchline / full time / save team | 19 / 3 / 0 / 0* | 6 / 1 / 1 / 1 |
| Full-screen sign-up form view / Google tap | 0 / 0 | 1 / 1 |
| Coach App link `?b=link-coach-calculator` | not tagged before 23 Oct 22:20 UTC | **0 clicks / 40 impressions** |
| Coach App banner `sponsor-coach-calculator` | not tagged before 23 Oct 22:20 UTC | **0 clicks / 40 impressions** |
| **Sign-ups attributed to the calculator** | **1** (17 Oct 07:22 UTC, Google Ads, signed up from the embed on this page) | **1** (1 Nov 00:48 UTC, organic Search, entered on this page, signed up from the full-screen calculator via save team and Google) |

\* The full-screen counts for the launch period include 5 Oct, the day before launch (3 plan events that day, probably preview/test traffic). The embed rows above already exclude 5 Oct (6 loads and 6 plans that day).

Notes:
- **"Direct" visits barely engage**: 21 views and loads since 18 Oct, 1 plan. Part of that is probably referrer-stripped search or app webviews, and part may be crawlers with ordinary user agents. Organic search visitors are the engaged ones: half of them make a plan.
- **The drop-off is after the plan.** Since 18 Oct, 19 organic visitors made a plan inside the page and none opened "save team" in the embed. The one sign-up went through the full-screen calculator, which suggests that is where the save step is visible or reached.
- **Coach App link and banner: 0 for 40.** The link sits in the "How the Calculator Works" section below the frame, and the banner is further down. 40 impressions is too few to judge a CTR, but nothing is flowing through the page's own routes to `/football-parent-coach-app`. Every calculator conversion so far came from inside the calculator.
- **Coach App landing / sign-in views from the calculator:** none tagged, and no landing view of `/football-parent-coach-app` since 23 Oct carries a calculator `b=`. Before 23 Oct the link was untagged, so any clicks then cannot be separated from other internal traffic.
- **Sign-up rate:** launch period, 1 sign-up from 75 ad visits (1.3%); since 18 Oct, 1 sign-up from 38 organic visits (about 2.6%). **Both are single events and are not a rate you can rely on.** In the funnel tool's `bySignupForm`, the calculator page shows 162 views and 1 sign-up (the 17 Oct one), and `/coach-app/game-time-calculator` shows 1 sign-up (the 1 Nov one).
- **The ad landing variant** `/football-parent-coach-app/equal-playing-time-calculator` is a separate Google Ads page, not this one: 43 views since 5 Oct (36 before 18 Oct, 7 after, mostly Ads) and 0 sign-ups (its last two were on 29 Sept).

### Activation (what the app's count snapshots allow)

The snapshots are whole-app counts only, so no account can be tied to the calculator. The one inference that holds: **1 Nov had exactly one sign-up (the calculator one), and the 10:40 snapshot shows `signupsToday 1, signupsTodayWithTeam 1`, so that account set up a team.** The same day the in-app game time tool logged `plan`, `touchline` and `minutes-saved` with a Search-sourced referrer, and the app counted 1 finished match. Those are consistent with the same coach running a match, but that is not proven. The 17 Oct Ads sign-up cannot be separated from that day's other sign-ups (7, 5 with a team).

Context: total Coach App sign-ups over the same window (5 Oct - 1 Nov) were 89, and 78 of them came through the Android install route (`/coach-app/android-install`), mostly Google Ads. The calculator accounts for 2 of the 89.

---

## 3. Recommendations

The page is in its watch window until about 8 Nov. Change one lever at a time, each in its own commit and logged. The Coach App match engine and lineup planner must not change; everything below is page copy, layout or calculator UI.

1. **Do nothing to title, meta or headings before the 8 Nov read.** The page went from 0 to about 100 impressions a day at position ~5 in ten days, and the trend is still settling (30 Oct was the best day at 4.1). The low CTR fits the AI Overview on every calculator SERP. After 8 Nov, if "playing time calculator" still has impressions and 0 clicks at 5+, the first lever is a title that leads with that exact phrase. Current: "Free Equal Playing Time Calculator for Grassroots Football". Options for then: "Playing Time Calculator for Grassroots Football: Free Equal Minutes Planner" or "Equal Playing Time Calculator: Free Game Time Planner for Kids' Football". Show these to Graham next to the current title; don't swap without his call.

2. **Conversion lever 1: put the save step where organic users stall.** 19 organic users made a plan in the embed since 18 Oct, 0 opened "save team", and the only conversion went through the full-screen version. In the coach-app calculator UI only (the embedded result screen, not the planner), make "Save this squad and track minutes over the season" a visible button directly under the result. Success measure: `embed/save-team-open` per `embed/plan`, currently 0 of 21 since 18 Oct and 2 of 28 at launch. At about 20 plans a fortnight, allow 3-4 weeks before judging.

3. **Leave the in-body Coach App link and the banner alone for now.** 0 clicks from 40 impressions is too small a sample, and changing them at the same time as recommendation 2 would blur which change worked. Revisit only if recommendation 2 doesn't move saves. The next lever there would be a single line directly under the frame (inside the first screen) rather than in the body.

4. **Don't send Google Ads back to this page.** At launch, 75 ad visits gave 1 sign-up. The Android install route converted 78 of the 89 sign-ups in the same weeks. The page's value is organic: it grows without spend, and its organic visitors engage more (51% make a plan against 30% from ads).

5. **Links are the route from position 5 to the top 3.** The on-page work is done: formula, worked example, tables by format and FA lengths, WebApplication schema. The main competitor, playingtimecalculator.com, has only about five genuine links. The roadmap's partnership routes fit this page directly: the Football DNA sponsorship conversation, and county FAs such as Somerset FA "Even Stevens" and Sheffield FA, which rank on these terms. Pitch the calculator page in the link-building backlog rather than editing the page.

Also re-read the sister article with the 8 Nov check. Its impressions are down about 70% and it has had 0 clicks since 26 Oct at a steady position, and "equal playing time" moved 5.3 to 9 on single-digit impressions. That is most likely the calculator taking calculator-intent queries, since combined clicks are steady. Confirm the explainer queries ("equal playing time", "equal game time", rolling subs) are still holding before closing the watch item.

---

## 4. Data gaps and caveats

- GSC data runs to 30 Oct. Query-level rows cover only about 13% of impressions; the rest are anonymised.
- Step events fire once per page load. The `embed` step measures loads, not engagement, and there is no session id, so a person's steps cannot be chained. The funnel is built from counts, not individual journeys.
- Calculator link and banner clicks are measurable only from 23 Oct 22:20 UTC (`CALCULATOR_TAGS_STARTED_AT`). Earlier clicks from this page to the Coach App cannot be separated.
- Each period has one sign-up. No conversion rate from this page is statistically meaningful yet.
- Activation comes only from whole-app daily counts. The 1 Nov "set up a team" inference relies on it being the only sign-up that day; nothing can be said about the 17 Oct account.
- "Direct" traffic may include crawlers with normal user agents and referrer-stripped visits.
- No Google Ads spend data was used, so there is no cost per sign-up.
