# Weekly SEO check, 13 Nov 2026

GSC to 10 Nov (3-day lag), page views to 12 Nov. Change reads from `scripts/seo/cli/change-impact.ts`; ranking health from `comparePeriods` (28 days 14 Oct-10 Nov vs 16 Sept-13 Oct), run locally because the MCP tools are not connected in this session.

**Site, 28 vs 28 days:** impressions 228k to 323k (+41%), clicks 3,835 to 5,009 (+31%), same-query position 8.9 to 8.2 (2,974 queries; 895 improved, 448 worse). Most of the growth is seasonal gear (advent calendars, shin pads, base layers, gifts).

## Tool finding: `change-impact.ts` counts #fragment URLs

`getPeriodTotals` merges `#fragment` rows (jump links and AI Overview / snippet links) into the page. Those rows carry large impression counts and almost no clicks, so on pages that started getting them the page CTR reads far lower than the CTR of the URL itself. Checked 17-28 Oct vs 30 Oct-10 Nov:

| Page | Exact URL | Fragment rows |
|---|---|---|
| base layers | 6,939 imp / 65 cl (0.94%) to 7,811 / 55 (0.70%), pos 8.5 to 8.6 | 1,477 / 0 to 16,163 / 1 |
| advent calendars | 3,088 / 51 to 21,232 / 302 (1.42%) | 0 to 8,568 / 0 |
| FA youth format | 1,789 / 12 (0.67%) to 2,506 / 37 (1.48%) | 207 / 0 to 1,265 / 0 |

So the 6 Nov read of base layers CTR "0.66% to 0.26%" was mostly fragment impressions, not the title. Suggested fix (not made): print an exact-URL row next to the merged one in `change-impact.ts`, and judge CTR revert rules on the exact URL.

## 1. Changes reviewed

| Page | Changed | Commit | Verdict | Numbers |
|---|---|---|---|---|
| Chelsea title | 22 Oct | 22ca92a | **Keep, closed** | 14 days: CTR 1.97% to 1.62% (rule 1.4%, not met); same-query 4.7 to 4.3; "chelsea pre academy" 5.3 to 3.2 (0 to 4 clicks), "chelsea ppc" 77 to 218 impr. Clicks 96 to 84 against site +43%, organic views -4% vs site +21%: lags the site, but rankings up on every target query |
| stats apps title revert | 29 Oct | caa1bf6 | **Keep, closed** | 12 days: CTR 2.67% to 3.23%, clicks 16 to 24 (+50% vs site +62%), same-query 15.4 to 8.7 (6 queries). Middle of the read rule (above 4% = title was the cause): launch title stays |
| base layers title (thermals) | 29 Oct | 1e3e408 | **Keep for now, read again 17 Nov** | Rule (CTR below 0.6% two weeks) not met on the URL itself: weekly 0.9%, 0.9%, then 0.7%, 0.7% after the change. Guards fine ("kids football skins" 8.9 to 8.2, "boys football skins" 10.9 to 10.5); thermal queries 11.1 to 10.0 and 10.7 to 10.3 but still 0 clicks. Exact-URL clicks 65 to 55 at a flat position while impressions rose 13%: soft negative. Organic views 14d +9% vs site +49% |
| FA format table | 29 Oct | 21d2667 | **Worked, closed** | Clicks 12 to 37 (+208% vs site +62%), exact-URL CTR 0.67% to 1.48%, same-query 6.6 to 6.2, organic views +174% vs +49% |
| Coach App page | 18 Oct | 8952367 | Too small | 88 impressions, 4 clicks in 14 days. AI Overview re-check on the 8 app searches (roadmap, due 8 Nov) not run yet: needs ~$0.03 |
| Coach gifts (new) | 23 Oct | 5977598 | Indexed, page 2 | 533 impr, 12 clicks; "gifts for football coaches" 12.0, "football coach gifts" 12.5, "football gift ideas for coaches" 12.0. Only 2 inbound links. See shortlist |
| Indoor training (new) | 24 Oct | | Doing fine | 1,264 impr, 24 clicks, 7-10 on its head terms |
| QPR guide (new) | 1 Nov | 231702c | Doing well | 1,034 impr, 43 clicks, position 4.6, CTR 4.2% |
| Girls' academy trials by club | 1 Nov | | Indexed, doing well | 1,221 impr, 69 clicks, CTR 5.7%; organic views 5 to 77 a week |
| West Ham (inbound link) | 1 Nov | 6de764c, ea7b046 | Too early | 9 days: same-query 7.7 to 7.3, clicks 34 to 39 (site +69%) |
| soft ground (links 1, 6, 7 Nov) | 1 Nov | 48f41c7, 2146c19, e5635ce, 37e9b70 | Too early, positive | Same-query 9.6 to 9.1, impressions +66% vs +42%, organic views 10 to 19 a week |
| advent calendars (inbound link) | 1 Nov | 1c2d6b7 | Keep | Seasonal: 4.6k to 27k impr, 69 to 273 clicks, same-query 8.9 to 8.1 |
| Veo (inbound link) | 1 Nov | 4de4401 | Keep | Same-query 5.8 to 5.6, clicks 26 to 56 (+115% vs +69%) |
| Crystal Palace (anchors) | 1 Nov | d1768e1 | Keep, neutral | Same-query 7.3 to 7.3, CTR 0.64% to 1.64%. Note "crystal palace academy" 7.7 to 9.9 over 28 days (170 impr) |
| Leeds title revert | 6 Nov | 1373915 | Too early, looks right | 4 days: CTR 0.45% to 1.23%, clicks 10 to 27, organic views +142% vs +18%. Read again 20 Nov |
| playing up FAQ | 6 Nov | 02ec54b | Too early | 4 days. Read again 20 Nov |
| shin pads meta | 7 Nov | 6dba33b | Too early | 3 days. Read again 21 Nov |
| girls' recruitment ages meta | 7 Nov | bf486a1 | Too small | 81 impressions in 3 days. Read again 21 Nov |
| 7-11 Nov (comic batch, gloves, astro trainers, boots fixes, pro footballer, photos, apps roundup) | | see entries | Too early | Read 20-25 Nov |

**Unlogged commits found:** `7d10049` (David Jervis interview: Graham's note on the trial-day pep talk, 3 Nov) and `0ccf973` (late developers: Football Parent note split into two paragraphs, 3 Nov). Small copy changes, no ranking lever; noted here so they aren't a mystery later. The Football DNA review commits are on a noindex page.

## 2. Opportunities

Most of the site is inside a watch window (7 Nov comic batch to ~21 Nov, plus the gear pages changed 7-11 Nov), so the list is short.

1. **Coach gifts, one inbound link (seasonal, now).** `/parent-guides/gifts-for-football-coaches` ranks 10-15 on its head terms after 3 weeks, with 2 inbound links (both gear pages). Searches peaked at 5,400 in Dec 2025, so waiting for windows to close costs the peak. Best fit is the volunteer coaches paragraph in `/parent-guides/what-is-grassroots-football` (live traffic, ~28k impr in 90 days; on watch from the 5 Nov wide feet link to ~19 Nov, and in the comic batch). Additive, appended to the end of that paragraph:

   > I've seen lots of grassroots coaches who are brilliant at building a connection with the kids, helping them enjoy football and improving them, particularly at the younger ages. If your child has one of those coaches, our round-up of [football gifts for coaches](/parent-guides/gifts-for-football-coaches) has Christmas and end of season ideas the team can club together for.

   Option: wait until ~19 Nov for the source page's window to close.

2. **AI Overview re-check on the 8 Coach App searches** (roadmap, due 8 Nov). ~$0.03. Decides whether the 18 Oct Coach App page changes got it cited.

3. **AI Overview check before touching two decay pages** (~$0.024): `/parent-guides/how-to-get-into-the-jpl` (clicks 35 to 21, position steady 6.1 to 6.4) and `/academy-pathway/fulham-fc-development-centre-guide` (41 to 28 at a steady 6.8). Steady position with falling clicks is the AI Overview or seasonal pattern; no edit until checked.

4. **Tool fix:** exact-URL CTR row in `change-impact.ts` (above). Code only, no site change.

**Checked and dropped:**
- `/football-gear/best-footballs-by-age` low CTR (0.3% at 7-9 on "what size football for X year old"): AI Overview on those queries, checked 22 Oct, we are not cited. Already known.
- `/girls-football/emerging-talent-centres-explained` decay (77 to 44 at a steady 4.3): AI Overview, held 16 Oct.
- `/academy-pathway/can-academy-players-play-grassroots-football` decay: AI Overview, checked 6 Nov.
- `/new-fa-youth-football-format` decay: the 28-day window is September seasonality; the 29 Oct change is working.
- `/equal-playing-time-in-grassroots-football` decay: the calculator took its calculator queries (known).
- `/veo-camera-alternatives` decay: demand ("veo football camera" fell), position better.
- Striking distance on the wide feet, kids boots, AG vs FG, base layers, shin pads, scholarships, pro footballer and apps roundup pages: all on watch.
- "football academy system" 13.6 on `how-academy-football-works` (188 impr in 90 days): the page already explains the academy system; small.
- `/academy-pathway` category page slipped 13 to 18 from mid-October, but it is ~300 impressions and ~1 click a week. Not worth a lever.
- The one `silence` entry is a `#category-2` fragment URL: expected.
- JPL explainer CTR: not re-raised (memory).
