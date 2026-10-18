# Plan: top 3 for the three app clusters

2026-10-18. The three clusters are the top three rows of `competitor-keyword-ownership-2026-10-18.md`: (1) game time and subs apps, (2) football stats apps, (3) football coaching and team apps.

Evidence used: today's DataForSEO pulls (`coach-app-competitor-snapshot-3`, now including TeamStats, and `coach-app-store-snapshot`), cached Google UK SERPs from 22 Aug to 18 Oct (desktop; some at depth 10 to 30, so "not in results" can mean below that depth), Search Console 18 Jul to 16 Oct, and our source files. Labels: **[measured]**, **[inference]**, **[estimate]**. Nothing has been changed on the site.

## The one thing that shapes all three

[measured] For the plain "app" searches, Google gives positions 1 to 3 to app store listings, not websites:

- "football stats app": Play, App Store, Play
- "football coach app": App Store, Play, easy2coach
- "football substitution app": Play, App Store, Reddit
- "playing time app football": Play, App Store, subtimeapp.com
- "kids football stats app": Play, Play, TeamStats

For the "best ... apps" and "calculator" searches, the top 3 are websites: roundups (FootballDNA, coachbetter, the-football-hub.org, GoalStation, GoRout) and small calculator sites.

So the plan has two halves:
- **Win the website slots** with the pages we have. This is our advantage, and it's realistic.
- **Win the store slots** with our Play listing. That's not a website job, and it's the harder half: SubTime has 111k installs and 1,018 reviews; we have 72 installs and none.

[inference] A page on footballparent.co.uk will not displace a store listing at #1 to #2 for "football stats app" whatever we do on-page. Where the store listings hold the top, the realistic target for the website is the best non-store position, which on several of these searches is #3 or #4.

---

## Cluster 1: game time and subs apps

**Terms:** playing time calculator (260), playtime calculator (260), equal playing time calculator (210), equal game time calculator (140), football subs (140), subs/subbing app (50 each), equal playing time app (10), football substitution app (10) and the other long variants. Volumes are DataForSEO estimates.

**Top 3 now [measured]:**
- Calculator terms (4 Oct): playingtimecalculator.com, Facebook, belnorth.com / mymathtables.
- App terms (18 Oct): store listings (mainly SubTime), playingtimecalculator.com, Facebook threads.

**Where we are [measured]:**
- The equal playing time article is #6 to #8 for "equal playing time" and "equal game time", and #11 for the long app term.
- The calculator page has **0 impressions since 5 Oct**.
- The coach app page appears for none of these.
- Our Play listing isn't in the top 10 Play results for "substitution app" or the top 30 for "playing time".

**Why this is the most winnable cluster [inference]:** the calculator searches carry most of the volume (870 a month together), and the sites in the top 3 are thin: playingtimecalculator.com has 6 ranked keywords. We already have the better tool and a 3,000-word page around it. It just isn't indexed or being shown.

**Moves, in order:**
1. **Calculator indexing (you, Search Console, today).** URL Inspection on `/coaching/equal-playing-time-calculator`, Test Live URL, then Request Indexing. The source is clean (no noindex, correct canonical, in the sitemap). If Google reports "Crawled, currently not indexed", that's a different problem and I'd look at it before any content change (rule 10).
2. **Coach app page targeting.** Changes 1a, 1b and 2 from `fairplaycoach-gap-plan-2026-10-18.md`: title, description, H1, a playing time and subs section, and the "Is there an app for keeping track of playing time?" FAQ. Low risk: 22 impressions in 56 days.
3. **Anchors pointing to the coach app page.** 4a and 4b from the same plan now; 4c and 4d later (live traffic).
4. **Play listing (Play Console, your call).** The title is limited to 30 characters. Current: "Grassroots Football Coach App" (29). It ranks **#3 in Play for "grassroots football"** [measured], so changing it risks that.
   - Option A (recommended): keep the title, and rewrite the short description (80 characters) to carry the game-time words, e.g. `Fair playing time, a subs plan and lineups for your grassroots football team.` (77).
   - Option B: title `Grassroots Football Subs App` (28). Adds "subs" and keeps "grassroots"; drops "coach".
5. **First ratings.** We have none. Store listings with ratings get stars in Google results, and the in-store ranking uses ratings too [inference, based on how the stores describe their ranking, not measured here]. An in-app review prompt is a coach-app repo change. It sits apart from the frozen match engine, but it's still your call where it fires (for example after a coach's third finished match).
6. **Calculator links and mentions (you, by hand).** Phoenix Youth FC and Launton FC (gate: ok) as calculator-resource pitches through the link-building skill, and replies with the calculator link in the Grassroots Football Hub threads that rank #1 to #6 for these terms.

**Target [estimate]:** top 3 for the calculator terms within 6 to 10 weeks of the calculator being indexed, since today's top 3 are small single-tool sites. Top 3 for the "app" terms depends mostly on the Play listing, and I can't put a date on that.

---

## Cluster 2: football stats apps

**Terms:** football stats tracker (140), football stats app / football statistics app / app for football stats (110 each), best football stats app (70), kids football stats app, football match stats app.

**Top 3 now [measured, cached 3 Oct]:**
- "football stats app": three store listings.
- "football stats tracker": sportsleaguehub.co.uk, App Store, Play.
- "best football stats app": Reddit, App Store, Quora.
- "kids football stats app": Play, Play, TeamStats.

**Where we are [measured]:** `/parent-guides/best-football-stats-apps` was published 3 Oct. It has 580 impressions and 28 clicks in its first 28 days at an average position of 6.2, but it's at #25 to #27 for the main "football stats app" terms. Two problems:
- **It has one internal link pointing to it** (from the spreadsheet article).
- **The wrong page ranks.** In the cached SERPs the coaching apps roundup shows for stats searches (#11 "grassroots football stats app", #15 "football stats app for coaches", #22 "...for grassroots players"), and the stats page doesn't. Google hasn't yet connected the stats page with these searches.

[measured] TeamStats spreads these terms over at least four URLs ranking #18 to #35, and Statzo ranks #3 to #11 with its homepage.

**Why it's winnable [inference]:** on "best football stats app" the top 3 are Reddit, a store listing and Quora. No dedicated roundup holds a top-3 spot, and ours is that page.

**Moves, in order:**
1. **Internal links to the stats page** (one per source page; paste-ready):
   - `content/football-gear/best-football-gps-trackers-for-kids.mdx`, a new sentence at the end of the paragraph on line 25: `If what you want is goals, assists and minutes rather than distance and sprint speed, a tracker is the wrong tool, and our guide to the [best football stats apps for kids](/parent-guides/best-football-stats-apps) covers the apps that log what actually happened in the match.` This is a live affiliate page; an internal link is fine under the gear rule, but [inference] it may take a little click share from the tracker picks.
   - `content/coaching/best-grassroots-football-apps.mdx`, **after its watch window ends (around 25 Oct)**: in the Coach App all-rounder paragraph, add `For tracking one child's stats rather than a whole team's, see our guide to the [best football stats apps](/parent-guides/best-football-stats-apps).` This is also the fix for the wrong page ranking: it tells Google where stats intent belongs.
   - From the Progress-related parent articles: find two that already mention logging goals or assists before choosing (not checked today).
2. **Leave the title for now.** The page is 15 days old and climbing. One lever at a time: links first, title only if the main terms are still past #20 after the links have had 2 to 3 weeks.
3. **Store slots:** the parents' stats app (Progress) has no store listing, so no store result can be ours here. Whether Progress goes on Play is a product decision; flagging it only.

**Target [estimate]:** top 3 for "best football stats app" and the "for kids" / "grassroots" variants is realistic in 4 to 8 weeks. The plain "football stats app" top 3 is store listings; the website's realistic ceiling there is the best non-store spot.

---

## Cluster 3: football coaching and team apps

**Terms:** football coaching app / apps (140), football coach apps (140), best football coaching apps (70), grassroots football app, best football team management app, football team app (70).

**Top 3 now [measured, cached 11 Oct]:**
- "best football coaching apps": FootballDNA, coachbetter, Facebook.
- "football coaching app": firstwhistle.app, Facebook, TeamStats.
- "football coach apps": the-football-hub.org, App Store, GoalStation.
- "grassroots football app": juniorgrassrootshub.com, TeamStats, Facebook.
- "best football team management app": Spond, TeamStats, Teamer.

**Where we are [measured]:** `/coaching/best-grassroots-football-apps` is our strongest app page:
- 1,228 impressions in 90 days on this cluster, 2,093 in the last 28 days.
- **#3 for "grassroots football apps for coaches"**, #9 "best football coaching apps", #13 to #19 for the head terms, #27 to #33 for team management.
- It has 4 internal links pointing to it.
- It was last edited 11 Oct, so it's **on watch until about 25 Oct**.

**What the data doesn't tell us:** why FootballDNA, coachbetter and the-football-hub.org outrank it. I haven't compared those pages, and on links we're far behind (3 real linking domains), but I can't say how much each factor matters.

**Moves, in order:**
1. **Nothing on the page until about 25 Oct.**
2. **Before then: internal links pointing to it** from coaching pages that don't link yet. Paste-ready, `content/parent-guides/how-to-become-a-football-coach.mdx` line 105:
   - Current: `As you get more comfortable planning sessions, a simple session-planning notebook or app and a stopwatch for timing drills are the next practical additions, but neither is essential in the first few weeks.`
   - New: `As you get more comfortable planning sessions, a simple session-planning notebook or app (our roundup of the [best football coaching apps for grassroots coaches](/coaching/best-grassroots-football-apps) compares the main ones) and a stopwatch for timing drills are the next practical additions, but neither is essential in the first few weeks.`
3. **About 25 Oct: run `seo-page` on the roundup**, including content parsing of the current top 3 roundups (well under $0.05 [estimate]), and choose one lever from what it shows. I'm not proposing a title change before that comparison.
4. **Links (the gap the data does show):** this roundup is the page clubs' "useful resources" pages would link to. Target it in the next link-building run: club and league resource pages that already list apps, run through the gate.
5. **Team management terms:** Spond, TeamStats and Teamer hold the top 3 with products that have 50k+ installs. [inference] Not a realistic top 3 in the near term; leave this sub-cluster alone.

**Target [estimate]:** top 3 for the grassroots-specific variants (we're already #3 on one) in 4 to 8 weeks. The generic head terms "football coaching app(s)" need links as well, so expect months, not weeks.

---

## Timeline

| When | Action | Cluster |
|---|---|---|
| Now | Calculator URL Inspection / Request Indexing (you) | 1 |
| Now | Coach app page title, description, H1 (approval) | 1 |
| Now | Anchors 4a and 4b to the coach app page; GPS tracker page link to the stats page; how-to-become-a-coach link to the roundup | 1, 2, 3 |
| Now | Play short description (and title, if option B) (you, Play Console) | 1 |
| Decide | In-app review prompt (coach-app repo) | 1 |
| About 28 Oct | Coach app page section and FAQ (10 days after the title change) | 1 |
| About 25 Oct | Roundup: stats page link added; `seo-page` analysis, then one lever | 2, 3 |
| From 1 Nov | Anchors 4c and 4d; stats page title only if still past #20; link-building run aimed at the roundup and the calculator | all |

Each on-site change gets its own commit and goes in the latest `seo-changes-*.md`. The weekly SEO check reads the results.

## New from TeamStats (not in the three clusters)

[measured] TeamStats ranks #17 for "build a lineup" (590), #38 "team line up" (390) and #35 "team lineup builder" (70) with its line-up planner tool. Those SERPs are led by lineup-builder tools (buildlineup.com, FotMob, lineup-builder.co.uk), mostly for pro and fantasy line-ups. A grassroots lineup tool, embedded like the calculator, could compete there. That's a product call, so it's flagged and not planned here.
