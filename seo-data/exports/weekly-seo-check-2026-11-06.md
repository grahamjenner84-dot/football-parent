# Weekly SEO check, 6 Nov 2026

Data: GSC to 3 Nov (3-day lag), page views to 5 Nov. Change windows from `scripts/seo/cli/change-impact.ts` (14 days each side where available, cut at the lag). Site 28 vs 28 days (7 Oct-3 Nov vs 9 Sep-6 Oct): impressions 221k to 277k (+25%), clicks 3,769 to 4,195 (+11%), same-query position 8.8 to 8.1 (2,822 queries, 804 improved, 404 worse). Page 2 band (11-20) impressions 8.3k to 15.5k and clicks 38 to 119: the new gear pages arriving there.

## 1. Changes reviewed

| Page | Changed | Commit | Verdict | Numbers |
|---|---|---|---|---|
| Leeds title | 22 Oct | eb79590 | **Revert rule met** (Graham to decide) | Weekly CTR 1.7% (14 Oct), 0.9% (21 Oct), 0.5% (28 Oct): rule is below 1.5% two weeks running. Weekly clicks 42, 38, 28, 18 while impressions rose 2,024 to 3,805. 12 days each side: clicks 76 to 49 (-36%) vs site +34%; same-query position 7.1 to 7.5; organic page views -22% (7d) and -32% (14d) vs site +2% / +21%. Guards fine: "leeds united development centre" 2.9 to 3.1, "technical centre" 4.6 to 4.3. Caveat: CTR was already sliding before the change (2.9% to 1.7% in Sept-Oct) and much of the new impressions are "open trials 2026" queries at 8. Revert: `git revert eb79590` (title back to "Leeds United Development Centre Guide \| Football Parent"). |
| Brentford title | 22 Oct | 8fd3936 | **Keep** | Clicks 16 to 56, CTR 0.83% to 1.51%, same-query 9.2 to 8.5; "brentford academy trials" 9.3 to 4.2 (191 impr); organic views +157% (7d) vs site +2%. Closed. |
| Chelsea title | 22 Oct | 22ca92a | **Keep, soft** | Rule not met: CTR 1.59% (rule 1.4%), guards "ppc" 2.1 to 1.9, "development centre" 4.4 to 4.3, "player performance centre" 2.1 to 2.7. "chelsea pre academy" 5.1 to 3.3 with 0 to 4 clicks. But clicks -15% vs site +34%, organic views -4% vs +21%. Read again 12 Nov, then close. |
| Calculator indexing | 18 Oct | 39e4ea0 | **Worked** | 0 to 1,452 impressions and 37 clicks in 14 days, position 4.9; calculator queries 3.5-7.3. 44 organic views in 14 days. Closed (AI Overview re-check still due 8 Nov, roadmap). |
| Coach App page | 18 Oct | 8952367 | **Too small** | 2 to 88 impressions, 4 clicks. Now confounded by the 2 Nov header link and design. Read with the 8 Nov AI Overview re-check. |
| Stats apps title revert | 29 Oct | caa1bf6 | **Too early, looks right** | 5 days: CTR 2.9% to 4.7%, clicks 7 to 17, organic views +80% vs site +34%. Read again 12 Nov. |
| Base layers title (thermals) | 29 Oct | 1e3e408 | **Too early, flag** | 5 days: CTR 0.66% to 0.26%, clicks 28 to 19, impressions +69% (thermal and "boys football skins" queries now showing at ~10). Same-query 9.9 to 9.8. Organic views -31% vs site +34%. Rule (CTR below 0.6% two weeks) is half met at most. Links on 1 Nov and a stock swap on 31 Oct share the window. Read again 10-12 Nov: revert if the second week is also below 0.6%. |
| FA youth format table | 29 Oct | 21d2667 | **Too early, promising** | 5 days: CTR 0.40% to 0.93%, clicks 3 to 14, same-query 7.0 to 5.7; new "what age is 11 a side" queries ranking 6-7. Organic views +243%. Read again 12 Nov. |
| Girls' trials by club (indexing) | 1 Nov | | **Now indexed** | 55 organic page views in 4 days (0 before). GSC read after 7 Nov. |
| 30 Oct links + homepage block, 1 Nov links/anchors, QPR, advent links, Football DNA links | 30 Oct-5 Nov | see log | **Too early** | Read 13-19 Nov as logged. |

No unlogged SEO commits found in the last 35 days.

## 2. Design changes: impact so far

What shipped: header and footer on every page (1 Nov), Coach App landing pages on the comic design and the header Coach App link to `/football-parent-coach-app` (2 Nov), comic design on the scholarships, late developers and what-happens-at-trials articles plus the David Jervis interview (3 Nov), the homepage redesign (3 Nov, 23:22), every interview on the comic design and lighter images (4 Nov).

**Short answer: too early for search, nothing negative so far, one small positive signal on Progress.**

- **Search rankings:** no GSC read possible yet. The 3-4 Nov pages need data to about 9-10 Nov. Nothing in the 28-day site comparison points at a template problem: same-query position is better (8.8 to 8.1) and no page that took the design shows up in the slips.
- **Traffic:** site page views 1-5 Nov were 2,767 against 1,997 for the same weekdays a week before (+39%; search +44%). This is **not** the design: it is search demand (advent calendars, shin pads, Leeds and girls' trials queries, the newly indexed girls' trials page). A header change cannot bring in more Google clicks.
- **On-site behaviour (the thing a design can move):** internal page-to-page views were 11.3% of all views (18-31 Oct) and 12.7% (1-5 Nov); views per visit 1.13 to 1.15. A small move the right way, within normal day-to-day noise for now.
- **Progress (header "Progress app" button):** 3 joins via "Site link" since 1 Nov (1 Nov, 4 Nov twice), none in the 9 days before inside the same window. Smallest numbers, but the clearest signal so far.
- **Coach App (header link now to the Coach App page, 2 Nov):** sign-up form views on the page are up (3-7 a day vs 1-4), 1 sign-up through the page since (search). No Site link sign-ups yet.
- **Homepage Progress banner:** 44 seen, 0 clicks in 14 days, before and after the redesign. Too few views to read.
- **Comic articles:** page view numbers too small to read (scholarships 24 to 29 in 2 days; the rest single figures). One Progress join from the scholarships banner on 5 Nov.
- **/coaching banner above the intro (30 Oct):** 0 clicks from 14 views after vs 7 from 32 before. Logged read date is 27 Nov; worth keeping an eye on.
- **Speed:** the header added the site's first web font (Fira Sans); the 4 Nov image work cut ~100-150 KB of photos from design pages. Check Search Console's Core Web Vitals report from about 15 Nov (it runs on a 28-day field window).

Next proper design read: GSC for the 3-4 Nov pages from about 10 Nov; on-site behaviour and app joins after two full weeks (about 15 Nov).

## 3. Opportunities

Almost every page with real impressions is on a watch list this week (homepage block and links 30 Oct, links and anchors 1 Nov, design and expert boxes 3-4 Nov). Filtered out: those pages, the JPL explainer CTR (memory), and footballs by age (AI Overview checked 22 Oct, homepage block 30 Oct).

1. **Leeds title revert** (above). The one live decision.
2. **Soft ground boots link from the Christmas gifts guide** (held in `SEO_ROADMAP.md` for after 5 Nov). Target is on watch to ~15 Nov from the 1 Nov links and anchors, so adding now stacks a third link change on it; it is the same kind of lever ("more internal links"), and winter boot demand is now. Paste-ready, in the "The surface matters" bullet: link "Soft ground boots with longer studs" to `/football-gear/childrens-soft-ground-football-boots`. Graham's call: now, or 15 Nov.
3. **Playing up an age group** (`decay`, off watch): clicks 32 to 22 over 28 days at a steady 5.5, weekly CTR 1.5-2.7% in Sept down to 0.7-1.2%. **Can academy players play grassroots** (`decay`, off watch): clicks 63 to 44 at 4.8-4.9. Both answer yes/no questions, so this is the AI Overview pattern until shown otherwise. Next step is a live SERP check for "can a child play up an age group in football" and "can academy players play grassroots football" (`ai-overview-check.ts`, about $0.012 each) before any edit. Not live-traffic heavy.

Silence entries: the academy categories `#category-2` jump link (a GSC fragment row, not a page) and the Girls United interview (35 impressions baseline). Neither is a real silence.

## 4. Due dates carried forward

- 8 Nov: AI Overview re-check on the app searches; calculator rankings; stats title decision (roadmap).
- 10-12 Nov: base layers revert read; stats, FA format, Chelsea reads.
- 13-19 Nov: 30 Oct and 1 Nov link/anchor targets, advent calendars, QPR, Football DNA links.
- ~15 Nov: design read (two full weeks), Core Web Vitals.
- 27 Nov: /coaching and /academy-pathway banner positions.
