# Game time calculator: SEO opportunity and embed plan

Written 2026-10-04 in a footballparent session, for review from both repos:

- **footballparent** (`C:\Users\graha\footballparent`): the SEO case and the new page.
- **coach-app** (`C:\Users\graha\coach-app`): the calculator changes the embed needs. Its section is written so a coach-app session can check it against the code and push back.

Nothing in here is built yet. Status of each part is at the end.

---

## 1. Summary

The Coach App now has a public game time calculator at `/coach-app/game-time-calculator`. It sits outside the login on purpose: a coach who types in their squad can sign up and land in the app with the team already set up, so they never onboard twice. It is linked from the equal playing time article (tool card after the intro plus a closing link, footballparent commit `5cdc51e`).

That gets coaches from the article into the app, but it **does not win any calculator searches**, because Google cannot rank the calculator page:

- The app's `index.html` sets `<meta name="robots" content="noindex">` for every route, which is correct for the app.
- Its title is "Coach App" (the calculator only sets "Game time calculator – Coach App" after JavaScript runs). It has no meta description and no server-rendered text.
- It is not in the site's sitemap.

**Proposal:** a standalone, indexable calculator page on footballparent.co.uk, `/coaching/equal-playing-time-calculator`. The real app calculator is embedded in an iframe at the top, with readable content written for the calculator searches underneath. The calculator stays in the app, so the sign-up and team hand-off work exactly as they do now. The coach-app side needs a few small changes so sign-in and the touchline mode work properly inside a frame.

---

## 2. The SEO opportunity

### Search volumes (UK, DataForSEO Google Ads endpoint, already in `seo-data/database/seo.db`)

| Search | Volume/mo | Notes |
|---|---|---|
| playing time calculator | 260 | Primary target |
| equal playing time calculator | 210 | Primary target |
| equal game time football | ~300 | The competitor's estimate. The canonical endpoint returns null. |
| game time football | 320 | **Not a target.** Page one is football news, TV schedules and fixtures. |
| playtime calculator | 260 | Probably gaming playtime. Not counted. |
| playing time calculator app | 10 | |

### Who ranks now (live SERPs, 2026-09-28, cached)

**"playing time calculator"**: playingtimecalculator.com, a Facebook post, belnorth.com, mymathtables.com, somersetfa.com, the App Store, danscapers.com, jscalc.io. Page one is single-purpose tool pages on small sites. playingtimecalculator.com's link profile is almost entirely spam, with about five genuine links (see section 8).

**"equal playing time calculator"**: Google hasn't settled on a result. Page one is a rugby drills site, generic hours/minutes calculators on mymathtables, a Facebook thread, an App Store page, and a Reddit thread about Emacs. **There is no proper football calculator page on page one.** This is the most open term.

**"equal game time football"**: one calculator (#1), then England Football, Cornwall FA, Somerset FA, Sheffield FA and club guidance. This is explainer territory, and the existing article already ranks in it.

### Where the existing article stands

`/coaching/equal-playing-time-in-grassroots-football`, last 28 days: 2,012 impressions, 29 clicks, average position 6.6. "Equal game time" is at 7.5 and "equal playing time" at 7.1. It gets no impressions for any "calculator" search.

### Why a separate page rather than putting the calculator in the article

The results split by intent. Calculator searches return tool-first pages, and equal game time searches return explainers and FA guidance. The article is a 2,500-word explainer that already ranks for the explainer searches. A page whose job is to be the calculator matches the calculator results directly. The two pages target different searches, so they shouldn't compete with each other.

An earlier note (seo-changes, 6 Sept) suggested embedding a calculator in the article itself. The results above are why this plan moved to a separate page.

**The catch:** a new page starts with no authority, and the site has very few backlinks. The bar on these results is low (small single-purpose sites), but expect weeks to a couple of months to climb, with no guaranteed position. "Equal playing time calculator" is the best chance.

---

## 3. The standalone page (footballparent)

### URL and files

- `content/coaching/equal-playing-time-calculator.mdx`
- `app/coaching/equal-playing-time-calculator/page.tsx`
- Added to `lib/routes.ts` (the sitemap follows automatically)
- Linked from the Coaching category page (`app/coaching/page.tsx`)

Written with the `football-parent-articles` skill, so all claims are sourced and it uses house style.

This does not clash with the 8 Sept ads landing page `/football-parent-coach-app/equal-playing-time-calculator`, which stays `noindex` and serves Google Ads only.

### Title options (pick one)

| | Title | Length |
|---|---|---|
| A | Equal Playing Time Calculator for Grassroots Football | 53 |
| B | Equal Playing Time Calculator: Fair Game Time for Every Child | 61 |
| C | Playing Time Calculator for Grassroots Football Coaches | 55 |

A is my pick. It has the 210/mo term verbatim and "grassroots football" for UK relevance, and it contains "playing time calculator" too.

Meta description draft (~150 characters): "Free equal playing time calculator for grassroots football. Add your squad, pick your format and get a fair game time plan with changes at every break."

### Outline (~1,200 to 1,500 words)

1. **H1 + one-line intro** that leads with what the tool does. No "Search for X" opener.
2. **The embedded calculator**, above the fold.
3. **How the calculator works**: changes at half-time or quarter breaks, the least-played going on first, rotating positions. It's the same planner as the Coach App's Auto-generate.
4. **The formula behind it**: the Sheffield FA method (outfield positions × match length ÷ outfield players available), with a worked example.
5. **Target minutes by format and squad size**: ready-worked tables for 5v5, 7v7 and 9v9 at the FA match lengths for each age group (sourced from the FA youth rules during the build, not assumed). This is the content Google can read and the iframe can't give it. It also answers longer searches like "how many minutes each player 7 a side 10 players", which none of the current tool pages cover.
6. **Halves, quarters or rolling subs**: what each means for the plan.
7. **Equal minutes vs equal positions**: short, with a link to the article for the full explainer.
8. **Keeping it fair across a season**: a subtle Coach App mention ("the Coach App is our app for…"), with no price or trial details and no competitor apps named.
9. **FAQs** taken from the questions Google shows for these searches.

Also:

- **WebApplication JSON-LD.** `ArticleLayout` currently emits only BlogPosting and Breadcrumb, so this needs either a small prop or a JSON-LD block on the page.
- **A visible "Open full screen" link** under the iframe, to `/coach-app/game-time-calculator`, for anyone who prefers the full page and as a fallback if the frame fails.

### Embed component (footballparent)

A new client component, `app/components/mdx/CalculatorEmbed.tsx`, registered in `lib/MDXContent.tsx`:

```tsx
<iframe
  src="/coach-app/game-time-calculator?embed=1&utm_source=footballparent&utm_medium=calculator-page&utm_campaign=game-time-calculator"
  title="Equal playing time calculator"
  allow="screen-wake-lock"
  style={{ width: "100%", border: 0, height }}
/>
```

- The iframe's height comes from a `postMessage` sent by the calculator (see 4.4), with a sensible starting height so the page doesn't jump.
- `allow="screen-wake-lock"` is needed because the touchline runner keeps the screen awake with the Wake Lock API, which is blocked in iframes without it. See 4.3 for why the touchline mode should leave the frame anyway.
- The UTM parameters on the `src` mean the calculator's own funnel tracking attributes these visits to this page (it reads `window.location.search` inside the frame, and `document.referrer` will be `www.footballparent.co.uk`).

### Later, separate changes to the article (one at a time, after the watch window)

- Fix lines 57 and 65 of `equal-playing-time-in-grassroots-football.mdx`. They currently play down calculators ("a bare online calculator… still leaves you without any sense of why"; "that's genuinely all the calculator you need"), which now contradicts having our own. They should point to the new page.
- Decide whether the article's tool card points to the new page (passes internal link value) or stays pointing straight into the app (one less click). Default: the card stays on the app, and the new link sits in the "How to Calculate Equal Game Time" section.

---

## 4. The coach-app changes the embed needs

Checked against `origin/master` on 2026-10-04: `src/calculator/GameTimeCalculatorPage.tsx`, `SaveTeamSignIn.tsx`, `TouchlineRunner.tsx`, `teamHandoff.ts`, `src/data/auth.ts`, `src/data/calculatorTracking.ts`. **Coach-app session: please check these against the code and say if anything is wrong or missing.**

### What already works in an iframe, with no changes

- **The team hand-off.** The iframe is served from `www.footballparent.co.uk/coach-app/...`, the same origin as the page around it, so it shares the same `localStorage`. `writeCalculatorTeam` (`coachApp.calculatorTeam.v1`) and the calculator setup (`coachApp.gameTimeCalculator.v1`) are visible to the app after sign-up exactly as now. Browsers don't partition storage for a same-site frame.
- **First-touch attribution.** `fp-first-touch` (written by the site, consent-gated) is readable from inside the frame, so `markCalculatorSignup` gets the true entry page and channel.
- **Framing is allowed.** The live `/coach-app/game-time-calculator` already sends `X-Frame-Options: SAMEORIGIN` and `Content-Security-Policy: frame-ancestors 'self'`. Same-origin embedding is permitted, and nobody else can frame it. Keep these headers as they are.
- **Magic-link sign-in.** The email link opens in its own tab at `redirectTo` (`/coach-app/`), so it never touches the frame.

### What needs changing

#### 4.1 Knowing it's embedded

Add a small helper, e.g. `src/calculator/embed.ts`:

```ts
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true // cross-origin parent: definitely framed
  }
}
```

Optionally, also honour `?embed=1` (the site passes it). That makes the mode explicit and testable, and could hide any calculator chrome that duplicates the host page's own heading.

#### 4.2 Google sign-in must leave the frame

Google's sign-in page refuses to load inside an iframe. Even if it did load, the redirect back to `/coach-app/` would open the whole app inside the small frame.

`signInWithGoogle` in `src/data/auth.ts` already has the pattern for this in its native branch: `skipBrowserRedirect: true`, then open `data.url` itself. Add a top-level variant for the web path, for example an option `{ topLevel: true }` that requests the URL with `skipBrowserRedirect: true` and then runs `window.top!.location.href = data.url`. `SaveTeamSignIn.google()` passes it when `isEmbedded()`.

Check this on the coach-app side: whichever auth flow the client uses (implicit or PKCE), any state supabase-js stores before the redirect goes to the same-origin `localStorage`, so the top-level return to `/coach-app/` should find it. Please confirm against the client config.

#### 4.3 Links and navigations into the app must target the top window

- `GameTimeCalculatorPage.tsx` ~line 291: `<a className="action full" href={appUrl}>` gets `target="_top"` when embedded.
- `TouchlineRunner.tsx` ~line 304: `window.location.assign(appUrl)` becomes `window.top!.location.assign(appUrl)` when embedded.
- **The touchline run itself.** This is a phone-in-hand, full-screen mode with a wake lock. Inside a frame that sizes to its content, anything `position: fixed` is placed against the frame's own (tall) viewport, not the phone screen, so overlays can end up off-screen. Suggest that when embedded, "Run it on the touchline" opens `/coach-app/game-time-calculator` top-level instead of running in the frame. The run already persists (`writeRun`/`readRun`) and the page offers to resume, so the coach picks up where they were.

#### 4.4 Tell the host page its height

So the iframe fits the calculator with no inner scrollbar, when embedded:

```ts
const post = () =>
  window.parent.postMessage(
    { type: 'fp-calculator-height', height: document.documentElement.scrollHeight },
    window.location.origin,
  )
new ResizeObserver(post).observe(document.body)
post()
```

The site component listens for `fp-calculator-height`, checks `event.origin === window.location.origin`, and sets the height. When an editing section opens or closes, the frame grows and shrinks with it.

#### 4.5 Smaller points to check

- **The service worker.** Does the calculator branch in `main.tsx` register the PWA service worker? Registering from a same-origin frame works, but check it doesn't show an install prompt or "update available" banner inside the frame.
- **`document.title`.** The calculator sets the tab title, which inside a frame changes the frame's title only. That's harmless.
- **Funnel counts.** The host page's own page view is recorded by the site, and the frame records `/coach-app/game-time-calculator` as now. Both counting is fine (page landed vs calculator loaded) but worth knowing when reading the funnel.
- **Tests.** The existing component tests (`GameTimeCalculatorPage.component.test.tsx`) cover the sign-in calls. Add embedded-mode cases for the top-level Google redirect and `target="_top"`.

None of this touches the lineup/live-match engine, which stays frozen.

---

## 5. Order of work

1. **coach-app:** review section 4, make the changes, test (tests plus a manual check in a local iframe), deploy. These go first because the site embed depends on them. Without them, Google sign-in fails inside the frame.
2. **footballparent:** `CalculatorEmbed` component plus the new page, built with the articles skill, sources checked. `npm run build`. Check on localhost against the live `/coach-app` (the dev server proxies it, or test on a Vercel preview).
3. Graham reviews both on localhost or a preview, then they go live (merged to `main` and deployed).
4. Log the publish in the current `seo-changes-*.md`. After 10 to 14 days, read GSC for the new page and check the article hasn't started losing its explainer queries to it.
5. Then, separately: the article's lines 57/65 and its link to the new page.

## 6. Open questions for Graham

- Title A, B or C?
- Should the article's tool card keep going straight into the app, or go to the new page?
- Is it OK to spend about $0.01 on a fresh volume check for the secondary phrasings ("equal game time calculator", "fair playing time calculator", "sub rotation generator") before writing? They weren't in the cached data.

## 7. Review from the coach-app session (2026-10-04)

Checked against coach-app `origin/master` at `c80fdd1` (4 Oct), the footballparent code, the live calculator route, the Coach App funnel, and a fresh term and SERP pull (7.3 and 7.4). Sections 1 to 6 above are untouched; this section is additive.

**Verdict: build it as planned.** A separate indexable page with the real calculator embedded is the right shape. A native port would mean copying `gameTimePlan` → `generateLineup` → the Hungarian assignment into a second repo and losing the touchline runner; keep that as the fallback if the embed underperforms. The changes below are what the plan is missing.

### 7.1 Section 4 against the code

Confirmed correct: the client uses auth-js's default `flowType: 'implicit'`, so nothing is stored before the Google redirect and a top-level `skipBrowserRedirect` variant is safe; the frame headers in `vercel.json`; the magic link; the localStorage hand-off (consumed by `App.tsx`, `AuthGate.tsx`, `TeamSetupPage.tsx`, `CalculatorTeamCard.tsx`); and `GameTimeCalculatorPage.tsx:291` plus `TouchlineRunner.tsx:304` really are the only app links.

Missing, and would break the embed:

1. **Two cookie banners.** `main.tsx:143` renders `<CookieConsent />` on the calculator route, so the frame shows its own consent sheet, full-cover backdrop included, positioned against the frame's own tall viewport. It reads the shared key once when it opens, so accepting on the host page does not close it. Do not render it when embedded; the host page owns consent.
2. **UTMs on the iframe `src` corrupt attribution.** `markCalculatorSignup` (`calculatorTracking.ts:116-119`) prefers URL params over first touch, so a Google Ads visitor who signs up in the frame is recorded as `utm_source=footballparent`; and `index.html`'s gtag sends a `page_view` from inside the frame, starting a new GA session with an internal source. Drop the UTMs, pass only `?embed=1`, and skip gtag's page_view when framed (a framed check in the inline script, which runs before React).
3. **Auto-height never shrinks.** `#root { min-height: 100svh }` (`index.css:286`) means `documentElement.scrollHeight` cannot drop below the frame's height, so the frame grows and never shrinks. When embedded, set the root min-height to auto and measure `.calc-page`.
4. **Bundle weight.** The live route loads 9 chunks, 754 KB (208 KB gzipped) plus 66 KB CSS, because `main.tsx` imports `App` statically. A same-origin frame runs on the host page's main thread, so this lands on the SEO page's Core Web Vitals. Dynamic-import `App` so the calculator ships only its own chunk; the article's direct link benefits too.

Wrong in the doc:

5. **4.3, "the page offers to resume":** not for a run handed off at kick-off. `c80fdd1` made Resume appear only once the clock has started (`resumable = phase === 'playing' || 'break'`, `GameTimeCalculatorPage.tsx:129`). The full page also recomputes the plan with the shuffle count reset, so a shuffled plan changes. Fix: `writeRun(fresh)` in the frame, then open the full page top-level with a one-shot flag that opens the saved run directly.
6. **4.5, the service worker:** there is no "update available" banner. The app uses `autoUpdate` plus a reload on `controllerchange` (`main.tsx:78-108`), so the real risk is the frame reloading itself after a deploy, and a first visit precaching the whole app. Skip `registerSW` and `startInstallPromptCapture` when embedded.
7. **5.2, "the dev server proxies it":** `next.config.ts` has no `/coach-app` rewrite; it lives only in `vercel.json`, so `npm run dev` 404s the iframe. Test on a Vercel preview (same-origin framing works there; Google sign-in on a preview host falls back to the Supabase Site URL unless the preview URL is whitelisted).

Smaller: hide the frame's own H1 and intro panel when embedded (they duplicate the host H1); give embedded steps their own funnel paths and set `landingPath` to the host page for sign-ups from the frame, otherwise this page's sign-ups show as `/coach-app/game-time-calculator`; the frame's view is logged by `trackCalculatorStep`, not `PageViewPing`. Tests to add: no consent sheet, no gtag page_view, the frame shrinking, the full-screen hand-off keeping a shuffled plan.

### 7.2 Strategy

- **Rank #1 is realistic for "equal playing time calculator" and "equal game time calculator"**: their SERPs are rugby drills, generic time calculators, Facebook posts, X, a Scribd PDF and Reddit (7.4). "Playing time calculator" is harder: playingtimecalculator.com has rotations, a game-day timer, a season report and 94 referring domains. The edge is being UK football specific: FA formats, age-group match lengths, with or without the goalkeeper.
- **Google gives zero credit for the frame's content.** The surrounding text, the tables and a screenshot with alt text do the ranking.
- **Upsell:** value first beats the ads landing page (`/football-parent-coach-app/equal-playing-time-calculator`: 150 views, 2 sign-ups since 25 Sept). The data backs the upsell: "app" is the dominant modifier in related searches on 11 of the 12 queries (7.4), so an honest "Is there an app?" FAQ and one measured host-page CTA (`CoachAppBanner`, coach audience, new placement so the banner test counts it) belong on the page. Tracking is free in the app; goals and assists are the paid part. Scale: ~470 searches/month annual average, about 1.8x that in September; expect 10 to 15 sign-ups a month at best. Top of funnel and authority, not a revenue line.
- **Layout:** `ArticleLayout` puts content in a `max-w-2xl` column beside the TOC sidebar, with a read time. Make a tool variant: embed full width above the TOC grid, no read time, author box kept for E-E-A-T.
- **Schema:** `WebApplication` with a free offer as the main entity, plus Breadcrumb and FAQPage. FAQ rich results no longer show for sites like this; the FAQ content still earns the long tail and AI Overview citations.
- **Cannibalisation:** Title A shares "Equal Playing Time ... Grassroots Football" with the article. Keep A, keep the prose on numbers and how to use the tool rather than the philosophy, and check the cannibalisation report at the watch window.

### 7.3 Term research (live Google Ads volume, UK, 4 Oct)

50 phrasings in one request ($0.09), persisted to `seo.db` (cluster "Game time calculator", type `calculator_term_candidate`), script `scripts/seo/cli/game-time-calculator-term-research.ts`.

| Phrase | /mo | Last 12 months |
|---|---|---|
| playing time calculator | 260 | peak Sept 2025 480, low July 2026 90 |
| equal playing time calculator | 210 | peak Sept 390, low July 70 |
| **equal game time calculator** | **140** | peak Sept 320, low July 50. Not in section 2; third target |
| equal game time | 50 | |
| equal playing time | 30 | |
| fair game time calculator | 20 | |
| game time calculator football / football game time calculator | 20 each | |
| playing time calculator football, football playing time calculator, soccer playing time calculator, fair game time, football substitution calculator, youth football substitution chart, how to work out equal playing time, equal playing time app, playing time tracker | 10 each | |
| 33 others | none | every "sub rotation generator / planner / schedule" phrasing, "fair playing time calculator", "how many minutes each player 7 a side", "equal game time formula", all tracker-app phrasings bar one |

What it settles: **"fair" is not the term** ("fair game time" is 10/mo and its SERP and AI Overview are about Fairgame, the London bar). **"Game time" and "playing time" both matter**: 140 against 210 for the calculator phrasing, so the page must use both wordings explicitly. **Seasonality** is strong: September runs at about 1.8x the annual average and July at 0.3x, so the quoted volumes understate the season-start peak, and the page needs to be established and linked by August 2027.

### 7.4 SERP features (12 queries with volume, UK desktop, 4 Oct)

Script `scripts/seo/cli/game-time-calculator-serp-research.ts`; full report with every question, related search and top 10 in `seo-data/exports/game-time-calculator-serp-research-2026-10-04.md`. Five SERPs were 28 Sept / 19 Sept cache hits; seven were live (about $0.04).

- **An AI Overview sits on all 12 queries.** On the calculator terms it cites playingtimecalculator.com, belnorth.com/fairgt (Belnorth FC's "Fair Game Time" calculator, named as the football-specific option because it works with or without the goalkeeper; Belnorth is an Australian club, three dropdowns and a Google Sheet, so no UK football calculator is cited anywhere), danscapers.com, equalsubs.net and quicksub.fun. On the explainer terms: learn.englandfootball.com, thefa.com (Cornwall FA guidance), projectplay.org, playerdevelopmentproject.com, launtonfc.co.uk, pitch-planner.app. Four queries had the slot present but the content was not captured (it loads asynchronously). The overviews are assembled from pages that state the formula in plain text with a worked example under explicit headings, and from one-line descriptions of what each tool is "best for".
- **People Also Ask, football-relevant** (number of queries showing it): Should kids get equal playing time? (3); How to calculate equal game time? (2); Is halftime 15 or 30 minutes? (2); Should coaches give equal playing time?; What are the FA rules regarding equal playing time?; What are the FA rules for playing time for children?; How long is a 12 year old soccer game? / How long does a football game usually last? / How long is a football game in minutes?; What is the best app for managing playing time? (asked in basketball wording, same intent).
- **Related searches, by modifier:** *app* on 11 of 12 queries (equal playing time calculator app, playing time calculator app free, equal game time app, fair game time app, football substitution calculator app, player rotation generator app free); *Excel* six times (playing time calculator Excel, fair game time calculator excel); *football* and *soccer* qualifiers; *free* and *online*; "equal game time table"; "equal game time rules", "FA guidelines on equal playing time PDF", "FA guidelines on equal playing time age"; "why equal playing time is bad"; "grassroots football equal playing time".
- **Competitors are more than section 2 lists.** Dedicated calculators: playingtimecalculator.com, belnorth.com/fairgt, danscapers.com, equalsubs.net, quicksub.fun, coachmeister.com, squaddie.app, mymathtables.com, squadtiming.com. App Store and Play results on most queries (Playing Time: Easy Rotations, SubTime, Player Timing, Coach Meister, PlayBall). Somerset FA's "Even Stevens" page ranks on 7 of the 12 queries; Sheffield FA's calculating-minutes page and Launton FC's policy page rank on the explainer terms. footballparent.co.uk is not in the top 30 of any of the 12 snapshots (the article's GSC position of about 7 for "equal game time" and "equal playing time" is an average across devices and days; the snapshots are single desktop pulls from 19 and 28 Sept).
- **The weak SERPs confirm the opening:** Facebook posts, X, Reddit, a Scribd PDF, and off-topic "equal play" gender-equality results rank for the calculator and how-to phrasings. An image pack shows on "equal playing time calculator".

### 7.5 What this adds to the page outline (section 3)

- **Title:** A, or "Free Equal Playing Time Calculator for Grassroots Football" (58 characters); "free" and "online" are related-search modifiers. The intro sentence uses the "equal game time calculator" wording so both phrasings are on the page. H2 "How to calculate equal game time", the PAA question verbatim.
- **Formula section:** the formula in plain text, a worked example, and a "with or without the goalkeeper" variant (the distinction the AI Overview credits Belnorth for).
- **Tables:** by format and age group with match length *and* half-time or break length (answers the "how long is a game" and "is halftime 15 or 30 minutes" questions); "equal game time table" is a related search.
- **Spreadsheet:** a short "Prefer a spreadsheet?" section linking `/coaching/football-team-spreadsheet`, or a downloadable playing-time template (six Excel-related searches, and a linkable asset).
- **FAQs** from the PAA and related searches: Should kids get equal playing time? Should coaches give equal playing time? What do the FA guidelines say, and does it change by age? Is there a downside to equal playing time? How long is a grassroots match at each age group? Is there an app that does this across a season? (the Coach App, which is the honest answer to the "best app" question).
- **Describe the tool in text:** positions and formations, changes at half-time, quarters or rolling subs, the touchline clock, saving the game to the season. Those are the lines AI Overviews lift into "best for" descriptions, and the frame's content is invisible to Google.
- **A screenshot** of the calculator with a descriptive filename and alt text, for the image pack and as something Google can see.

### 7.6 Section 6, answered

1. Title A (or A with "Free"). Not "fair game time": 10/mo, wrong SERP.
2. Point the article's tool card at the new page after the watch window. It is the strongest internal link slot on the only page ranking in this cluster, and the calculator is at the top of the new page, so the coach loses nothing. The "Open full screen" link covers anyone who wants the bare tool.
3. Done: 7.3 and 7.4, about $0.13 in total.

### 7.7 The embed contract, as built (coach-app branch `calculator-embed`, 2026-10-04)

Built in the worktree `C:\Users\graha\coach-app-embed`, unit-tested, built, and checked in a local same-origin iframe. Every behaviour below is gated on the calculator being framed; an unframed visit is unchanged. Merged (PR #37, `origin/master` = `edcf83d`) and live since about 22:30 on 2026-10-04: production build `main-sTAkGJpg.js`, verified in headless Chromium against production both top-level (unchanged) and inside a same-origin frame (height message, no cookie sheet, no gtag, `_top` link). This is what the site's `CalculatorEmbed` component should assume, and it replaces the details in section 3 and 4 where they differ:

- **`src`:** `/coach-app/game-time-calculator`. No UTM parameters (7.1 point 2). `?embed=1` is harmless but unused: the app detects the frame itself.
- **Height:** listen for `message` events where `event.origin === window.location.origin` and `event.data.type === 'fp-calculator-height'`, and set the iframe height to `event.data.height` (a whole number of pixels). The first message arrives as soon as the calculator renders; further ones follow every size change. The host should still give the iframe a sensible starting height. Nothing is posted while the frame has no width.
- **`allow="screen-wake-lock"` is not needed:** the touchline runner never runs inside the frame. "Run it on the touchline" writes the run and sends the top window to `/coach-app/game-time-calculator?run=1`, which opens straight into it. "Resume today's game" does the same.
- **Sign-in:** "Save with Google" sends the top window to Google and back to `/coach-app/`. The email link is unchanged (it opens in its own tab). The host page needs no sign-in code of its own.
- **"Open the app"** targets the top window.
- **The frame draws no cookie sheet, loads no gtag, registers no service worker and captures no install prompt.** The host page's banner and GA tag are the only ones. Consent made on the host applies to the app as before (shared key, same origin).
- **The frame has no H1 or intro panel**; the host page carries the heading.
- **Funnel:** the embedded calculator's steps report as `/coach-app/game-time-calculator/embed`, `.../embed/plan`, `.../embed/touchline`, `.../embed/full-time` and `.../embed/save-team`, so they can be read beside the direct page's steps. The site's funnel code may want to label them. A sign-up from the frame records the host page's path (from the frame's referrer) as its landing page.
- **Testing:** on branch `calculator-page`, `npm run dev` proxies `/coach-app` to the live app (a development-only rewrite in `next.config.ts`), so the page and its embed can be checked at `http://localhost:3000/coaching/equal-playing-time-calculator`; set `localStorage fp-page-view-optout=1` first so test visits are not counted. Before that branch, local dev did not proxy `/coach-app` (7.1 point 7). The coach-app worktree serves a stand-in host page at `http://localhost:5177/embed-test.html` (`public/embed-test.html`, untracked) while its dev server is running.
- **Retest once the site page exists** (from the calculator session's list, 2026-10-04): in the embedded calculator make a plan, tap Run, and confirm the full page opens with that plan ready at kick-off. Touchline, alerts and screen-on tests belong on the full page, never inside the frame. Keep the iframe `src` plain: `?run=1` is produced by the frame's hand-off, and putting it on the `src` would open the runner inside the frame.
- **Follow-up, separate PR:** the bundle split (7.1 point 4). Left out of this branch because it changes how the app itself boots.
- **Follow-up, small hardening:** ignore `?run=1` when framed (`GameTimeCalculatorPage` could skip `openRunRequested()` when `embedded`), so a mis-set `src` can never run the touchline inside the frame.
- **Polish branch `calculator-embed-polish` (coach-app, merged to master 2026-10-05 as `d90a53a`):** "keep set positions" chosen before adding players now opens the Positions grid; the lineup fold (Hide/Show) is on the public calculator as well as the in-app quick game; height messages are one per animation frame and only on change, and the embedded document never scrolls itself. Found by Graham on the local page. Also in it: a first visit opens on "Your game" with the player entry alongside; the card under the answer is a marked Coach App card ("19 subs today. 9 as a season game." / "Run it as a season game"); "On the pitch" starts folded on both screens and a parity test holds the two screens together. The `?run=1` hardening and the bundle split are still open.

## 8. playingtimecalculator.com's backlinks, in full (footballparent session, 2026-10-04)

Every live backlink, pulled with `scripts/seo/cli/playingtimecalculator-backlinks.ts` (two calls, $0.10 in total). The raw list is in `seo-data/exports/playingtimecalculator-backlinks-2026-10-04.json`. This replaces the "94 referring domains" figure used in sections 2 and 7.2, which came from the 6 Sept summary.

**591 backlinks from 440 domains, and almost all of them are spam.**

- **345 links appeared between 20 Sept and 4 Oct** from one network of pages titled "Expert Authority Backlink Building" (`.site`, `.space`, `.store`, `.shop`, `.online` domains). That burst is why the count went from 243 to 591 in a month. Either the owner bought a link package, or someone is pointing spam at the site. Neither builds real authority, and a burst like this can do it more harm than good.
- The rest of the junk is the usual mix: "domain report" and URL-shortener pages, "web push notifications" spam, "sites like X" pages, and PBN sales pages.
- **428 of the 440 domains have a spam score of 30 or more.**

**The genuine links, about five:**

| Site | Page | Notes |
|---|---|---|
| **somersetfa.com** | "Even Stevens", `/coaches/even-stevens` | **UK county FA, followed, linked since 2020.** The only UK football link it has, and the same page ranks on 7 of the 12 queries in 7.4. |
| mildurabasketballassociation.com.au | Domestic Coach Resources | Australian basketball, followed |
| nwysa.org | Team Staff | US youth soccer association, followed |
| fmbasketball.org | Fife Milton Youth Basketball (2 pages) | US youth basketball, site-wide template links |
| greysonmasters.com | "No coach should have to do math!" | A coaching blog post, followed |

Also a handful of scraped or accidental mentions (a French football news site that linked the words "playing time", printable-template scrapers, a Swiss scraper page).

**What it means:**

- **Its real authority is thin**, about five earned links, only one of them UK football. Its ranking rests mostly on the exact-match domain and being first. That makes "playing time calculator" more winnable than 7.2 suggests: we can't outdo its raw link count, but we can beat its real links.
- **Somersetfa.com's Even Stevens page is the single most valuable link in this cluster**: a county FA coaches' page that already links out to a calculator, ranking on most of these searches. The ask would be to add a UK, FA-format calculator alongside (or instead of) a US multi-sport one. Note that `lib/outreach/quality.ts` parks governing bodies by default (those links usually come from relationships, not cold pitches), so this would be an exception. Graham's call.
- **The same type of lead elsewhere:** other county FAs' coach resources and equal playing time guidance pages (Sheffield FA's calculating-minutes page, Cornwall FA's guidance) are the natural places for this calculator to be linked. Clubs' coach resources pages too, which the outreach rules currently exclude as club info pages.
- **Don't copy its link tactics.** Bought or network links are what this profile is made of, and they're why its spam score is 43.

## Status

| Part | Status |
|---|---|
| SEO case | Done (this doc) |
| coach-app review of section 4 | Done 2026-10-04, see 7.1 |
| Term and SERP research | Done 2026-10-04, see 7.3 and 7.4 |
| coach-app changes | Done: merged (PR #37) and live 2026-10-04, verified against production (see 7.7) |
| Calculator page | Shell built 2026-10-04 on footballparent branch `calculator-page` (CalculatorEmbed, tool layout, page, route, index entry, dev proxy); checked on localhost against the live app; content is a draft brief in the MDX, not written; not merged |
| Article follow-ups | Not started, after the watch window |
