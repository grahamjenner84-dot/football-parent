# Weekly SEO check, 1 Nov 2026

GSC to 29 Oct (3-day lag), page views to 31 Oct. Windows from `scripts/seo/cli/change-impact.ts`; site comparison from `compare_search_console_periods` (2-29 Oct vs 4 Sep-1 Oct).

Run only three days after the 29 Oct check, so most of the 29-30 Oct changes have no post-change GSC data yet. This run mainly reads the items the 29 Oct check set for 1-2 Nov.

**Site, 28 vs 28 days:** impressions 212.2k to 258.5k (+22%), clicks 3,587 to 3,840 (+7%), same-query position 8.8 to 8.1 (2,700 queries; 789 improved, 357 worse). Page 2 (11-20) impressions nearly doubled (7.3k to 14.0k), mostly shin pads and base layer head terms, so CTR fell from 1.7% to 1.5% without any ranking loss.

**Hash note:** the 22 Oct title commits were rebased on merge. The log's `511fff2` / `7c59443` / `3212dcf` are `8fd3936` (Brentford), `eb79590` (Leeds) and `22ca92a` (Chelsea) on `main`. Use the `main` hashes for any revert.

## 1. Changes reviewed

| Page | Changed | Commit (main) | Verdict | Numbers | Next |
|---|---|---|---|---|---|
| Crystal Palace title | 16 Oct | 65295d9 | **Keep** | 13 days each side. Same-query position 7.6 to 6.4; CTR 0.63% to 0.72%; "crystal palace academy trials" 9.4 to 7.2, "...trials 2026" 10.8 to 7.9; guard "crystal palace development centre" 3.1 flat. Impressions -5% vs site +14% (decay entry is seasonal demand, position steady). Shared with the 18 Oct girls' link and fact fix. | Closed |
| Veo title (price queries) | 16 Oct | e47d978 | **Neutral, keep** | Same-query 6.5 to 5.9 (better). Impressions -27% and clicks -37% are demand: "veo football camera" 437 to 49 impressions. Price queries: "veo camera price" 9.7 to 8.7 (2 clicks both sides), "how much is a veo camera" 7.0 flat. CTR 0.86% to 0.74%. The title did not win price clicks, but it did no harm. | Closed |
| ETC definition first | 16 Oct | 3ef42ee | **Neutral, keep** | "etc football" 3.9 to 4.2 (impressions 78 to 323), "emerging talent centre" 6.9 to 7.4. Revert rule (more than 2 places) not met. Same-query -0.2. CTR 1.35% to 0.90%, driven by "etc football" quadrupling at 0-2 clicks (AI Overview pattern). Organic page views +89% over 7 days. | AI Overview recheck still outstanding ($0.012, ask first) |
| Grassroots apps roundup links/anchors | 18 Oct | 76f2c08 etc. | **Keep** | Same-query 18.0 to 14.3. "football coaching app" 15.4 to 8.2, "football coaching apps" 14.4 to 8.2, "football coach app" 16.5 to 8.3, "best football coach app" 10.0 to 7.4. Clicks 19 to 17, because the new impressions sit at 7-8 with no clicks yet. | Closed |
| Coach App page title | 18 Oct | 8952367 | **Too small to read** | 2 to 57 impressions, 2 clicks | Read again 5 Nov |
| Calculator `indexifembedded` | 18 Oct | 39e4ea0 | **Worked** | 0 to 837 impressions, 20 clicks, position 5.3; "equal playing time calculator" 6.0, "equal game time calculator" 4.8 | Read again 8 Nov (roadmap) |
| Brentford title | 22 Oct | 8fd3936 | **Keep, provisional (strong)** | 7 days each side. Clicks 8 to 26, CTR 0.65% to 1.11% (site flat); same-query 9.4 to 8.4; "brentford academy trials" 9.6 to 4.3; guard "brentford development centre trials" 5.4 to 3.5. Organic page views 14 to 36. Part of this is trials demand, but CTR and positions both moved the right way. | Read again 5 Nov |
| Leeds title | 22 Oct | eb79590 | **Flag: revert rule half met** | 7 days each side. CTR 1.63% to 0.89% (rule: below 1.5% for two weeks running, so week 1 of 2 is met). Clicks 46 to 36 (-22%) vs site +14%; organic page views 65 to 51 (-22%) vs site +2%, so the drop is real, not a GSC artefact. Guards fine: "leeds united development centre" 3.4 to 3.2, "technical centre" 4.5 to 4.2. Mitigation: about 650 new impressions on trials queries ("open trials 2026" 8 to 182, "academy trials" 7 to 181, "trials" 15 to 167) at 6-8 with 0 clicks. Even without those, CTR is about 1.1%. "leeds united girls academy" 8.3 to 10.4 was expected (moving to the girls' trials page). | **Read 5 Nov.** If the week to 2 Nov is also below 1.5%, the rule is met: propose `git revert eb79590` |
| Chelsea title | 22 Oct | 22ca92a | **Too early, flag** | Rule not met: CTR 2.26% to 1.62% (rule: below 1.4%); guards "chelsea ppc" 2.3 to 2.0, "player performance centre" 1.9 to 2.9 (-1.0, under 2), "development centre" 4.5 to 4.4. Target "chelsea pre academy" 5.4 to 3.6 (0 to 2 clicks). But clicks 58 to 45 vs site +14%, and "chelsea development centre" clicks 5 to 0. Organic page views -5% over 7 days, a milder drop. | Read again 5 Nov |
| New: Wolves guide | 17 Oct | see log | **Doing well** | 1,281 impressions, 87 clicks, CTR 6.8%, position 5.5. "wolves advanced player centre" 4.5 (11.5% CTR) | Closed |
| New: Girls' academy trials by club | 18 Oct | see log | **Problem: no impressions** | 0 impressions in GSC after 11 days, while Wolves (published a day earlier) has 1,281. Live page returns 200 with a self canonical, no robots meta, in the sitemap, 13 inbound links. Probably not indexed. URL Inspection via the API was refused (the service account lacks full permission on the property). | Graham: URL Inspection + Request indexing |
| New: Football advent calendars | 22 Oct | d48157f | **Indexed, ranking 8-10** | 3,108 impressions and 52 clicks in its first full week, position 8.2. "football advent calendar" 9.8 (391), "football card advent calendar 2026" 8.3 (299) | See shortlist 2 |
| New: Gifts for coaches | 23 Oct | 5977598 | **Indexed** | 230 impressions, 4 clicks, position 8.7; head terms at 10-20 | Read again 12 Nov |
| New: Indoor training | 24 Oct | 29f95c9 | **Indexed** | 526 impressions, 4 clicks, position 7.3 | Read again 12 Nov |
| 29 Oct: stats title revert, base layers title, FA format table | 29 Oct | caa1bf6, 1e3e408, 21d2667 | **Too early** | No post-change GSC days yet | Read again 12 Nov |
| 30 Oct: nine internal links, homepage block, category banners | 30 Oct | see log | **Too early** | | Read again 13 Nov (banners 27 Nov) |

No unlogged commits: every content commit since 24 Oct has a log entry.

## 2. Opportunities

Filtered from `seo-opportunities.json` (222 striking distance, 296 low CTR, 10 decay, 2 silence) and the 28 vs 28 comparison.

Dropped:
- **Shin pads head terms** ("kids shin pads" 925 at 10.6, "shin pads kids" 847 at 11.0, "boys shin pads" 278 at 10.9). These are the biggest page 2 rows and the top "slips", but the page is on watch to about 13 Nov (30 Oct internal link and homepage block). First in line after that.
- **Base layers thermals, girls' boots, FA format, homepage block targets:** on watch.
- **Decay entries** (playing up, can academy players play grassroots, JPL vs grassroots, premier league DC list, AG vs FG, burnout): positions flat or better in every case (for example 4.9 to 4.8, 5.5 to 5.5, 5.2 to 5.0). That is September season-start demand fading, not a ranking problem.
- **Confirmed low CTR** list: led by footballs by age (AI Overview checked 22 Oct), JPL explainer (not to be raised again), academy categories (AI Overview checked 29 Oct, we are cited), Veo and Arsenal (titles just tested). Nothing new.
- **"veo pricing"**: 183 impressions at position 1.0 with 0 clicks. Almost certainly an AI Overview or a citation slot rather than an organic #1. Just noted.
- **"football development"** (419 at 13.8, the category page): a generic head term, and our edge is the long tail.

### Shortlist

**1. Girls' academy trials article: get it indexed (technical, no content change).**
`/girls-football/girls-academy-trials-by-club`: 0 impressions in 11 days. The site-side checks are clean. In Search Console: URL Inspection, then Test live URL, then Request indexing. If it says "Crawled, currently not indexed", that is a quality or duplication signal against the club guides, and worth a look before anything else. Optional: give the service account Full permission on the property so these checks can run from here in future.

**2. Football advent calendars: one inbound link before the peak (time-critical).**
The page ranks 8-10 on its head terms with demand peaking around 9 Nov. It has only two in-body inbound links (gifts guide, goals guide). Proposed lever, on `/football-gear/best-football-rebounders-for-kids` (off watch; last edits were the 31 Oct Awin swap, link maintenance, and the 13 Oct title). The existing line 163 becomes:

```mdx
Our guide to [football gifts for kids](/football-gear/christmas-football-gifts-for-kids) covers other presents by age and budget if a rebounder is one part of a bigger present, and for something to open every day in December our round-up of [football advent calendars](/football-gear/football-advent-calendars) covers the Match Attax, Topps and Adrenalyn card calendars.
```

Gear page, internal link only, which is fine. The baseline would be the 23-29 Oct week above.

**3. Leeds: decide on 5 Nov, nothing to do today.** Shown here because the revert rule is half met. If the week to 2 Nov also has CTR below 1.5%, revert with `git revert eb79590` (title back to "Leeds United Development Centre Guide | Football Parent").

## 3. Blocked or skipped

- URL Inspection API: 403 "You do not own this site". The service account has restricted access.
- ETC AI Overview recheck ($0.012): not run, needs a yes.
- No paid DataForSEO calls made.
