# AI Overviews on the app searches

Pulled 2026-10-18 with `load_async_ai_overview` (google.co.uk, desktop, depth 10), $0.028. Raw: `app-terms-ai-overviews-2026-10-18.json`. The eighth search, "football substitution app", returned its overview in the first pull (cites SubTime, SubNow, SubAssist, Spond, Ballrz, Reddit, App Store).

| Search | Citations | Cites us? | Cites FairPlay Coach? | Sites cited |
|---|---|---|---|---|
| equal playing time app grassroots football | 16 | no | yes | phoenixyouthfc.com, playingtimecalculator.com, Facebook, Google Play (SubTime), fairplaycoach.co.uk, fairplayfc.co.uk, squadd.co.uk, TikTok |
| fair playing time football coaches app | 6 | no | yes | App Store, Google Play (Football Coach Match Tools, Game Time Coach, Fair Playtime Live, FairPlay FC), fairplaycoach.co.uk |
| fair playing time app | 11 | no | no | playingtimecalculator.com, App Store, Facebook, subnowapp.com, fairplayfc.co.uk, belnorth.com, Google Play (CoachAny, SubTime) |
| equal game time app | 14 | no | no | pitchflow.co.uk, Google Play (SubTime, Game Time Coach), App Store, coachany.com, danscapers.com |
| playing time app football | 6 | no | no | App Store, Google Play (Pitch Time, Match Keeper, NextSub, Game Time Coach), coachany.com |
| grassroots football substitution app | 10 | no | no | Google Play (NextSub, Easy Team Subs, SubTime, Game Time Coach), Reddit, App Store, teamstats.net, Facebook, coachany.com |
| equal playing time app | 7 | no | no | fairsub.app, App Store, matchdayiq.com, Google Play (SubTime) |

Key facts:
- AI Overviews appear on all 8 app searches. None cites footballparent.co.uk or our Play listing.
- Store listings are cited on every one; SubTime's on 5 of 8.
- FairPlay Coach is cited on 2, the two searches it also ranks for organically (#4 and #13).

Note: these overviews load asynchronously, so earlier checks without the flag (including `ai-overview-check.ts`) saw them as empty. `googleOrganicSerp` now takes `loadAsyncAiOverview: true`.
