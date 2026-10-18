# Coach App competitor snapshot 3: grassroots game time and matchday apps

Pulled 2026-10-18 by `scripts/seo/cli/coach-app-competitor-snapshot-3.ts`. Raw data: `coach-app-competitor-snapshot-3-2026-10-18.json`. DataForSEO spend: $2.0851 (live, no errors).

All DataForSEO figures are UK (location 2826), English. **etv is DataForSEO's estimate of monthly organic traffic, not real traffic.** Volumes and KD are DataForSEO / Google Ads figures, also estimates.

## How it was pulled

- 14 domains pulled new: pocketgaffer.co.uk, fairplaycoach.co.uk, fairplayfc.co.uk, matchflow.co.uk, gaffer-app.co.uk, getpytch.com, boxlytics.app, teammate.football, centrecircleapp.com, club-roots.co.uk, everyplayer.app, onpitch.app, footballgpt.co, thesportingresource.co.uk.
- subtimeapp.com pulled new. The 2026-10-18 Facebook-group summary said it was in the 2026-10-16 snapshot. It wasn't: that pull was subnowapp.com, a different app.
- Reused from the 2026-10-16 snapshots (2 days old): Coach Meister (all but a filtered FA/club/Facebook link pull), FairSub and Pitch Planner (all but FairSub ranked keywords), Statzo and our own summary/overview, and our own backlink list.
- Per domain: rank overview, top 100 ranked keywords by etv (plus a filtered game-time pull when a domain had more), backlink summary, top 50 referring domains, backlink list (first 1,000 plus a filtered pull for FA, league, club and Facebook hosts where a domain had more).
- Link classification (county FA / league / club / Facebook) is a hostname pattern match, then `assessProspect` from `lib/outreach/quality.ts`. Pattern matches need checking by hand.

## Part 1 key facts (measured)

- **Almost none of these apps has search visibility.** 11 of 20 domains have 4 or fewer UK ranked keywords; matchflow, boxlytics, everyplayer and fairsub have none in the index. pocketgaffer has 2 (and no backlink record at all).
- The only domains with real visibility rank for things other than game time: footballgpt.co (941 keywords, etv ~10,654, almost all Football Manager and positions content), centrecircleapp.com (30 keywords, etv ~1,280, nearly all its own brand: it's a referee-registration app), statzoapp.com (football stats app terms, #3 to #10). We have 324 ranked keywords, etv ~1,247.
- **Game-time keywords barely exist in DataForSEO's index for these sites.** Across 20 domains, 24 flagged keywords, and the only ones with positions in the top 20 are SubTime brand terms ("sub time", "sub time app" #1), "subs app" #8 and "football subs" #20 (SubTime), and "app for football stats" #11 (Statzo). FairPlay Coach has one ranked keyword in the index, "equal playing time calculator" at #64.
- **Our own game-time keywords:** "football coach apps" #17 and "football coaching app" #18 (best-grassroots-football-apps), "equal playing time calculator" #51 (the equal playing time article, not the calculator page).
- **Backlinks are mostly spam on both sides.** FairPlay Coach's 34 referring domains are all an automated network (anchor "High Quality Dofollow Backlinks DA 50 PA 40 Premium PBN Network Service..."); 28 of our 31 linking domains are the same network. Pytch, Coach Meister, SubTime, Statzo and Centre Circle each show 1,400 to 1,900 referring domains, which on inspection are largely link-farm directories (".store"/".space" "white-hat-backlinks" pages). Treat their referring-domain counts as noise, not authority.
- **County FA / league / club / Facebook links:** found for one domain only. Centre Circle has 190 county FA links (Kent 135, Northamptonshire 43, West Riding 6, others 1 or 2), all from referee or registration pages, plus two league pages (Berkshire County Girls FL coaches page, Taunton & District YL U9 fixtures). These come from an official referee-system relationship, so the gate parks them. No Facebook links were found for any domain (DataForSEO rarely indexes Facebook links).
- Not in the index: pocketgaffer.co.uk, matchflow.co.uk, gaffer-app.co.uk have no backlink summary at all.

## Part 2 key facts (measured)

- **Volumes:** of the 8 target terms, only "football substitution app" and "equal playing time app" have a Google Ads figure, 10/month each. The other 6 return no volume and no KD. Labs agrees.
- **FairPlay Coach is not #1 in the non-personalised SERP.** Its best is #4 ("fair playing time football coaches app", with `/features/equal-playing-time-app/`); homepage #13, #14 and #16 on three more terms; not in the top 30 for four. The #1 positions in `game-time-serp-snapshot-2026-10-18.json` came from a signed-in Chrome session.
- **We appear once in the top 30:** #11 for "equal playing time app grassroots football", with `/coaching/equal-playing-time-in-grassroots-football`. `/football-parent-coach-app` is not in the top 30 for any of the 8.
- **What holds the top 10:** app store listings (SubTime's Play or App Store listing is in the top 10 for 6 of 8 terms), Facebook group threads (Grassroots Football Hub threads in the top 10 for 5 of 8, at #1, #2 and #4 on some), Reddit, and playingtimecalculator.com.
- **AI Overviews are present on all 8 SERPs.** Only one was returned in full ("football substitution app"): it cites subtimeapp.com, subnowapp.com, subassist.co.nz, spond.com, ballrz.app, reddit.com and apps.apple.com. Not us, not FairPlay Coach. **The other 7 load asynchronously and their citations were not fetched**, so for those it is unknown who is cited.
- **Search Console (last 90 days):** none of the 8 terms show for any of our pages. The coach app page had 18 impressions in the prior 28 days and 4 in the last 28, no clicks, no query rows. The calculator page has 0 impressions since publishing on 5 Oct. Cannibalisation on the 8 terms: none measurable (no impressions). Adjacent measured split: "grassroots football app" shows best-grassroots-football-apps at 17.8 (92 impressions) and best-football-stats-apps at 22.3 (28 impressions).

## Limits

- SERPs are desktop only. One snapshot, so ranking volatility isn't visible.
- No DataForSEO endpoint used here returns schema types. FairPlay Coach's schema (SoftwareApplication and FAQ) comes from the 2026-10-18 Chrome check, not this pull.
- The game-time flag regex missed "subbing app" (50/mo): SubTime #5, Pitch Planner #20. Added to the gap by hand below.
- Backlink lists for domains with more than 1,000 links are partial (first 1,000 plus the filtered pull).
- fairplayfc.co.uk and onpitch.app had a bot check in Chrome; DataForSEO's index returned data for both, but no page was parsed for either.

## Data

### Domain overview

| Domain | Ranked kw (UK) | etv, DataForSEO estimate | #1 | Top 3 | Top 10 | Referring domains | Backlinks | DataForSEO rank | Source |
|---|---|---|---|---|---|---|---|---|---|
| pocketgaffer.co.uk | 2 | 8 | 0 | 1 | 1 | not in index | not in index | - | new pull |
| fairplaycoach.co.uk | 1 | 0 | 0 | 0 | 0 | 34 | 35 | 0 | new pull |
| fairplayfc.co.uk | 4 | 4 | 0 | 0 | 0 | 29 | 30 | 0 | new pull |
| matchflow.co.uk | 0 | 0 | 0 | 0 | 0 | not in index | not in index | - | new pull |
| gaffer-app.co.uk | 1 | 1 | 0 | 0 | 0 | not in index | not in index | - | new pull |
| getpytch.com | 1 | 28 | 0 | 1 | 1 | 1818 | 1869 | 0 | new pull |
| boxlytics.app | 0 | 0 | 0 | 0 | 0 | 2 | 3 | 0 | new pull |
| teammate.football | 3 | 3 | 0 | 0 | 1 | 31 | 33 | 0 | new pull |
| centrecircleapp.com | 30 | 1280 | 4 | 9 | 14 | 1830 | 2123 | 131 | new pull |
| club-roots.co.uk | 1 | 79 | 1 | 1 | 1 | 41 | 46 | 0 | new pull |
| everyplayer.app | 0 | 0 | 0 | 0 | 0 | 25 | 26 | 0 | new pull |
| onpitch.app | 1 | 0 | 0 | 0 | 0 | 25 | 28 | 0 | new pull |
| footballgpt.co | 941 | 10654 | 6 | 35 | 398 | 300 | 1150 | 202 | new pull |
| thesportingresource.co.uk | 31 | 17 | 0 | 0 | 1 | 42 | 53 | 41 | new pull |
| coachmeister.com | 4 | 2 | 0 | 0 | 0 | 1552 | 1599 | 110 | partly reused 10-16 |
| subtimeapp.com | 22 | 64 | 4 | 4 | 7 | 1920 | 2046 | 147 | new pull |
| statzoapp.com | 21 | 53 | 0 | 1 | 8 | 1440 | 1475 | 53 | partly reused 10-16 |
| fairsub.app | 0 | 0 | 0 | 0 | 0 | 29 | 31 | 0 | partly reused 10-16 |
| pitch-planner.app | 4 | 2 | 0 | 0 | 0 | 31 | 40 | 0 | partly reused 10-16 |
| footballparent.co.uk | 324 | 1247 | 2 | 18 | 109 | 13 | 13 | 0 | partly reused 10-16 |

### Top keywords by etv (up to 5 per domain)

- **pocketgaffer.co.uk:** "u11 football match length" #5 (vol 70); "football gaffer" #32 (vol 390)
- **fairplaycoach.co.uk:** "equal playing time calculator" #64 (vol 210)
- **fairplayfc.co.uk:** "fairplay league" #13 (vol 210); "fair play league" #17 (vol 210); "under 7 football age rules" #18 (vol 70); "fair play soccer" #27 (vol 90)
- **matchflow.co.uk:** no UK ranked keywords in DataForSEO's index
- **gaffer-app.co.uk:** "gaffer football" #63 (vol 390)
- **getpytch.com:** "pytch" #2 (vol 170)
- **boxlytics.app:** no UK ranked keywords in DataForSEO's index
- **teammate.football:** "my teammates" #25 (vol 880); "iteammate" #13 (vol 90); "teammates app login" #30 (vol 90)
- **centrecircleapp.com:** "centre circle" #2 (vol 1900); "centrecircle" #2 (vol 1900); "centre circle portal" #1 (vol 720); "central circle" #4 (vol 1900); "centre circle app" #1 (vol 260)
- **club-roots.co.uk:** "club roots" #1 (vol 260)
- **everyplayer.app:** no UK ranked keywords in DataForSEO's index
- **onpitch.app:** "on the pitch" #81 (vol 70)
- **footballgpt.co:** "fm scouting" #5 (vol 18100); "fm26 wonderkids" #7 (vol 14800); "positions for football" #10 (vol 14800); "positioning in football" #14 (vol 14800); "positions in football" #11 (vol 14800)
- **thesportingresource.co.uk:** "fran alonso" #9 (vol 110); "fixture generator" #27 (vol 1300); "create a fixture list" #21 (vol 590); "ruling the roost" #59 (vol 720); "reflections tool" #19 (vol 260)
- **coachmeister.com:** "game time football" #61 (vol 320); "playing time calculator" #25 (vol 260); "playtime calculator" #22 (vol 260); "equal playing time calculator" #29 (vol 210)
- **subtimeapp.com:** "sub time" #1 (vol 50); "subtime" #1 (vol 50); "sub time app" #1 (vol 40); "subtime app" #1 (vol 40); "subbing app" #5 (vol 50)
- **statzoapp.com:** "football stats tracker" #3 (vol 140); "football statistics app" #6 (vol 110); "football stat app" #7 (vol 110); "football stats app" #7 (vol 110); "apps for football stats" #10 (vol 110)
- **fairsub.app:** no UK ranked keywords in DataForSEO's index
- **pitch-planner.app:** "pitch dimensions for 9v9" #47 (vol 480); "9v9 goal size" #46 (vol 210); "u12 football match length" #64 (vol 110); "subbing app" #20 (vol 50)
- **footballparent.co.uk:** "junior premier league football" #10 (vol 4400); "jpl league" #12 (vol 6600); "jpl leagues" #12 (vol 6600); "junior premier league" #12 (vol 4400); "jpl football" #5 (vol 720)

### Game-time keywords flagged

| Domain | Keyword | Position | UK volume | KD | URL |
|---|---|---|---|---|---|
| fairplaycoach.co.uk | equal playing time calculator | 64 | 210 | 0 | fairplaycoach.co.uk/features/equal-playing-time-app/ |
| centrecircleapp.com | subs payment | 13 | 110 | 0 | centrecircleapp.com/blogs/news/centre-circle-launches-payments-feature |
| footballgpt.co | football coach apps | 32 | 140 | 13 | footballgpt.co/ |
| coachmeister.com | game time football | 61 | 320 | 7 | coachmeister.com/ |
| coachmeister.com | playing time calculator | 25 | 260 | 0 | coachmeister.com/ |
| coachmeister.com | playtime calculator | 22 | 260 | 18 | coachmeister.com/ |
| coachmeister.com | equal playing time calculator | 29 | 210 | 0 | coachmeister.com/ |
| subtimeapp.com | sub time | 1 | 50 | 7 | subtimeapp.com/ |
| subtimeapp.com | sub time app | 1 | 40 | 22 | subtimeapp.com/ |
| subtimeapp.com | subs app | 8 | 50 | 3 | subtimeapp.com/ |
| subtimeapp.com | football subs | 20 | 140 | 1 | subtimeapp.com/ |
| subtimeapp.com | sub app | 12 | 50 | 3 | subtimeapp.com/club |
| subtimeapp.com | playing time calculator | 42 | 260 | 0 | subtimeapp.com/ |
| subtimeapp.com | equal playing time calculator | 32 | 210 | 0 | subtimeapp.com/ |
| subtimeapp.com | sub timer | 20 | 50 | 0 | subtimeapp.com/ |
| subtimeapp.com | sub to me | 40 | 40 | 0 | subtimeapp.com/club |
| statzoapp.com | app for football stats | 11 | 110 | 17 | statzoapp.com/ |
| footballparent.co.uk | football coach apps | 17 | 140 | 13 | footballparent.co.uk/coaching/best-grassroots-football-apps |
| footballparent.co.uk | football coaching app | 18 | 140 | 14 | footballparent.co.uk/coaching/best-grassroots-football-apps |
| footballparent.co.uk | equal playing time calculator | 51 | 210 | 0 | footballparent.co.uk/coaching/equal-playing-time-in-grassroots-football |
| footballparent.co.uk | best football coaching app | 40 | 70 | 32 | footballparent.co.uk/coaching/best-grassroots-football-apps |
| footballparent.co.uk | best football coaching apps | 41 | 70 | 17 | footballparent.co.uk/coaching/best-grassroots-football-apps |
| footballparent.co.uk | best football coach app | 44 | 70 | 4 | footballparent.co.uk/coaching/best-grassroots-football-apps |
| footballparent.co.uk | best football coach apps | 52 | 70 | 4 | footballparent.co.uk/coaching/best-grassroots-football-apps |
| footballparent.co.uk | best app for football coaches | 54 | 70 | 2 | footballparent.co.uk/coaching/best-grassroots-football-apps |

### Keyword gap (rival top 20, us absent or below 20)

| Keyword | UK volume | KD | Rival | Rival position | Our position |
|---|---|---|---|---|---|
| football subs | 140 | 1 | subtimeapp.com | 20 | not ranked |
| subs payment | 110 | 0 | centrecircleapp.com | 13 | not ranked |
| app for football stats | 110 | 17 | statzoapp.com | 11 | not ranked |
| sub time | 50 | 7 | subtimeapp.com | 1 | not ranked |
| subs app | 50 | 3 | subtimeapp.com | 8 | not ranked |
| sub app | 50 | 3 | subtimeapp.com | 12 | not ranked |
| subbing app (added by hand) | 50 | n/a | subtimeapp.com | 5 | not ranked |
| sub timer | 50 | 0 | subtimeapp.com | 20 | not ranked |
| sub time app | 40 | 22 | subtimeapp.com | 1 | not ranked |

### Top referring domains (top 10 by DataForSEO rank, per domain)

- **fairplaycoach.co.uk:** dbike-us.com (0), thcradar.com (0), bureatag.com (0), shanzytechs.site (0), clifflisting.com (0), techbumppy.com (0), onlyhealthydeals.com (0), seonix.agency (0), archive-hu.com (0), sahammurah.com (0)
- **fairplayfc.co.uk:** dbike-us.com (0), thcradar.com (0), bureatag.com (0), shanzytechs.site (0), clifflisting.com (0), techbumppy.com (0), onlyhealthydeals.com (0), seonix.agency (0), archive-hu.com (0), sahammurah.com (0)
- **getpytch.com:** adulttrafficsources.online (0), websitedatachecker.website (0), earntraffic.shop (0), organicseo.website (0), websitehitscheck.space (0), freeadulttraffic.site (0), seofreechecker.shop (0), websiteanalyzer.site (0), onlinedachecker.online (0), buywebsitehits.online (0)
- **boxlytics.app:** seonix.agency (0), auto-parts-shop.shop (0)
- **teammate.football:** techbumppy.com (0), thcradar.com (0), sahammurah.com (0), clifflisting.com (0), bestnz-poker-casinoslot.com (0), archive-hu.com (0), dupurgeniefr.com (0), thedocmag.com (0), kernelpanicpodcast.com (0), cvillico.com (0)
- **centrecircleapp.com:** bcgfl.org.uk (79), footyapps.com (58), tdyl.co.uk (54), indexo.dev (51), centrecircleapp.myshopify.com (23), westridingfa.com (12), trafficadfree.store (0), backlinksbuilder.space (0), backlinkautomationtool.store (0), highauthority.online (0)
- **club-roots.co.uk:** techbumppy.com (0), bureatag.com (0), shanzytechs.site (0), sahammurah.com (0), clifflisting.com (0), onlyhealthydeals.com (0), seonix.agency (0), rank-seo-now.shop (0), archive-hu.com (0), bestnz-poker-casinoslot.com (0)
- **everyplayer.app:** shanzytechs.site (0), techbumppy.com (0), archive-hu.com (0), seonix.agency (0), onlyhealthydeals.com (0), clifflisting.com (0), sahammurah.com (0), bestnz-poker-casinoslot.com (0), bestwebs123.site (0), thedocmag.com (0)
- **onpitch.app:** bureatag.com (0), thcradar.com (0), techbumppy.com (0), clifflisting.com (0), archive-hu.com (0), seonix.agency (0), sahammurah.com (0), bestnz-poker-casinoslot.com (0), thedocmag.com (0), dupurgeniefr.com (0)
- **footballgpt.co:** 360tft.co.uk (177), coachreflection.com (124), playreflect.com (107), saas1to10.com (51), worththehack.com (51), techbasedirectory.com (51), gokuscraper.com (30), boonqo.com (27), buildorbill.com (23), refereegpt.co (16)
- **thesportingresource.co.uk:** dallassurf.com (11), dbike-us.com (0), techbumppy.com (0), thcradar.com (0), bureatag.com (0), sahammurah.com (0), seonix.agency (0), bestnz-poker-casinoslot.com (0), clifflisting.com (0), archive-hu.com (0)
- **coachmeister.com:** fairsub.app (100), sportsstartups.com (23), chrisandone.com (23), dapacheckermultiple.website (0), createbacklinksfree.shop (0), multipledapachecker.store (0), qualitylinkbuilding.store (0), freewebseochecker.shop (0), competitorchecker.online (0), aibacklinkcreator.site (0)
- **subtimeapp.com:** fairsub.app (100), robuta.com (81), ogdencity.com (63), appwiso.com (37), appglint.com (35), apps.me (23), androidrank.org (23), sporty.co.nz (7), morewebsitevisits.shop (0), massdapachecker.shop (0)
- **statzoapp.com:** appwiso.com (23), appglint.com (7), backlinkbuildingagency.shop (0), dapaprochecker.store (0), competitorbacklink.space (0), backlinksubmissiontool.shop (0), internettrafficdata.shop (0), backlinkseochecker.shop (0), backlinkseoservices.online (0), websitemetrics.shop (0)
- **fairsub.app:** shanzytechs.site (0), clifflisting.com (0), techbumppy.com (0), seonix.agency (0), onlyhealthydeals.com (0), archive-hu.com (0), sahammurah.com (0), bestwebs123.site (0), bestnz-poker-casinoslot.com (0), whatsaifor.com (0)
- **pitch-planner.app:** techbumppy.com (0), bureatag.com (0), sahammurah.com (0), seonix.agency (0), clifflisting.com (0), archive-hu.com (0), parentcoachdesk.com (0), bestnz-poker-casinoslot.com (0), dupurgeniefr.com (0), thedocmag.com (0)

### Part 2 SERPs (google.co.uk, desktop, depth 30, not personalised)

**equal playing time app grassroots football**  
AI Overview: present, loaded asynchronously, citations not fetched  
Us: #11 /coaching/equal-playing-time-in-grassroots-football. FairPlay Coach: #13 fairplaycoach.co.uk/.

| # | Domain | Title |
|---|---|---|
| 1 | playingtimecalculator.com | Playing Time Calculator - Equal Playing Time Calculator |
| 2 | facebook.com | What apps manage equal playing time for junior teams? |
| 3 | phoenixyouthfc.com | I recently saw a post from Grassroots Football UK about ... |
| 4 | play.google.com | SubTime - Sub Timer & Rotation – Apps on Google Play |
| 5 | learn.englandfootball.com | What is equal playing time in football? |
| 6 | apps.apple.com | SubTime - Sub Timer & Rotation - App Store - Apple |
| 7 | teamgrassroots.co.uk | BE HONEST, IS 5 MINUTES GAME TIME ENOUGH ... |
| 8 | facebook.com | 🗣️Should every child get equal game time? Or ... |
| 9 | fairplayfc.co.uk | Fair Playing Time App |
| 10 | facebook.com | Do you give all your players equal playing time?  If not ... |

**fair playing time football coaches app**  
AI Overview: present, loaded asynchronously, citations not fetched  
Us: not in top 30. FairPlay Coach: #4 fairplaycoach.co.uk/features/equal-playing-time-app/.

| # | Domain | Title |
|---|---|---|
| 1 | play.google.com | Football Coach Match Tools – Apps on Google Play |
| 2 | facebook.com | GameTime Planner app for grassroots football team ... |
| 3 | belnorth.com | Fair Game Time Calculator |
| 4 | fairplaycoach.co.uk | Football Team Rotation App |
| 5 | sheffieldfa.freshdesk.com | How to plan equal playing time (calculating minutes) |
| 6 | apps.apple.com | FairPlayTime - App Store - Apple |
| 7 | thefa.com | Cornwall FA Guidance Equal Playing Time in Youth Football |
| 8 | apps.apple.com | Game Time Coach - App Store |
| 9 | reddit.com | I coach 4v4 soccer and made a free app to ensure my ... |
| 10 | somersetfa.com | Even Stevens - Somerset FA |

**fair playing time app**  
AI Overview: present, loaded asynchronously, citations not fetched  
Us: not in top 30. FairPlay Coach: not in top 30.

| # | Domain | Title |
|---|---|---|
| 1 | facebook.com | Anyone use a good app for game time? |
| 2 | thehoopsgeek.com | Equal Playing Time Generator - Divide Playing Time Fairly |
| 3 | apps.apple.com | Magic Lineup: Sub & Rotation - App Store |
| 4 | apps.apple.com | Soccer Playing Time Tracker - App Store |
| 5 | apps.apple.com | Pitch Time: Fair Lineups - App Store - Apple |
| 6 | reddit.com | Coaches – a free app to help manage your subs |
| 7 | apps.apple.com | ‎Pitch Time: Fair Lineups - You Might Also Like - App Store |
| 8 | apps.apple.com | Player Timing - App Store - Apple |
| 9 | apps.apple.com | Soccer Playing Time Tracker - You Might Also Like - App Store |
| 10 | pitch-planner.app | How to Choose a Youth Soccer Substitution App - Pitch Planner |

**equal game time app**  
AI Overview: present, loaded asynchronously, citations not fetched  
Us: not in top 30. FairPlay Coach: not in top 30.

| # | Domain | Title |
|---|---|---|
| 1 | apps.apple.com | Sub Manager - You Might Also Like - App Store |
| 2 | playingtimecalculator.com | beta |
| 3 | learn.microsoft.com | Team Sport Equal Game Time and Position Calculator |
| 4 | apps.apple.com | Playing Time: Easy Rotations - App Store - Apple |
| 5 | apps.apple.com | ‎GameTime Manager - You Might Also Like - App Store |
| 6 | coachany.com | CoachAny: Keep track of substitutions while coaching kids |
| 7 | apps.apple.com | SubTime - Sub Timer & Rotation - App Store - Apple |
| 8 | apps.apple.com | Soccer Playing Time Tracker - You Might Also Like - App Store |
| 9 | pitchflow.co.uk | PitchFlow - Real-Time Match Management for Coaches |
| 10 | apps.apple.com | SubTime - Sub Timer & Rotation - App Store - Apple |

**football substitution app**  
AI Overview: present, cites apps.apple.com, subtimeapp.com, reddit.com, ballrz.app, spond.com, subnowapp.com, subassist.co.nz; us: no, FairPlay Coach: no  
Us: not in top 30. FairPlay Coach: not in top 30.

| # | Domain | Title |
|---|---|---|
| 1 | play.google.com | SubTime - Sub Timer & Rotation – Apps on Google Play |
| 2 | apps.apple.com | SubTime - Sub Timer & Rotation - App Store - Apple |
| 3 | reddit.com | Sub app? : r/SoccerCoaching |
| 4 | subtimeapp.com | SubTime / Youth Sports Coaching / Soccer Football Basketball ... |
| 5 | coachany.com | CoachAny: Keep track of substitutions while coaching kids |
| 6 | facebook.com | Hi Everyone. Can I get coaches opinions on the best app to ... |
| 7 | subnowapp.com | SubNow |
| 8 | subassist.co.nz | SubAssist / Fair Play Youth Sports Substitution App |
| 9 | play.google.com | CoachAny – Apps on Google Play |
| 10 | subcav.com | SubCav: Free Soccer Substitution App for Coaches |

**playing time app football**  
AI Overview: present, loaded asynchronously, citations not fetched  
Us: not in top 30. FairPlay Coach: #16 fairplaycoach.co.uk/.

| # | Domain | Title |
|---|---|---|
| 1 | play.google.com | SubTime - Sub Timer & Rotation – Apps on Google Play |
| 2 | apps.apple.com | SubTime - Sub Timer & Rotation - App Store - Apple |
| 3 | subtimeapp.com | SubTime / Youth Sports Coaching / Soccer Football Basketball ... |
| 4 | facebook.com | Best free app for equal game time (subs) |
| 5 | reddit.com | Substitution/game management app? : r/SoccerCoaching |
| 6 | playingtimecalculator.com | Playing Time Calculator |
| 7 | fairplayfc.co.uk | Fair Playing Time App |
| 8 | subnowapp.com | SubNow |
| 9 | squadtiming.com | Player Timing |
| 10 | subnowapp.com | SubNow |

**grassroots football substitution app**  
AI Overview: present, loaded asynchronously, citations not fetched  
Us: not in top 30. FairPlay Coach: not in top 30.

| # | Domain | Title |
|---|---|---|
| 1 | apps.apple.com | Substitution Manager - App Store |
| 2 | reddit.com | Substitution/game management app? : r/SoccerCoaching |
| 3 | coachany.com | CoachAny: Keep track of substitutions while coaching kids |
| 4 | facebook.com | Anyone use a good app for game time? |
| 5 | subassist.co.nz | SubAssist / Fair Play Youth Sports Substitution App |
| 6 | play.google.com | SubTime - Sub Timer & Rotation - Apps on Google Play |
| 7 | englandfootball.com | Helpful apps & websites - Matchday |
| 8 | playingtimecalculator.com | Playing Time Calculator |
| 9 | reddit.com | Sub app? : r/SoccerCoaching |
| 10 | teamstats.net | Top Grassroots Football Stats App for Coaches |

**equal playing time app**  
AI Overview: present, loaded asynchronously, citations not fetched  
Us: not in top 30. FairPlay Coach: #14 fairplaycoach.co.uk/.

| # | Domain | Title |
|---|---|---|
| 1 | playingtimecalculator.com | Playing Time Calculator - Equal Playing Time Calculator |
| 2 | apps.apple.com | SubTime - Sub Timer & Rotation - App Store - Apple |
| 3 | play.google.com | SubTime - Sub Timer & Rotation – Apps on Google Play |
| 4 | facebook.com | What apps manage equal playing time for junior teams? |
| 5 | subnowapp.com | SubNow |
| 6 | reddit.com | How can I get equal playing time for my players |
| 7 | footballdna.co.uk | Mastering Equal Playtime - Easily Keep Track Of Your ... |
| 8 | thehoopsgeek.com | Equal Playing Time Generator - Divide Playing Time Fairly |
| 9 | belnorth.com | Fair Game Time Calculator |
| 10 | subtimeapp.com | Subtime App |
