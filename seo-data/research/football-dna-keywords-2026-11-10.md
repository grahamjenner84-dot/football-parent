# Football DNA review: keywords, People Also Ask and SERPs

Researched 10 Nov 2026 for `/coaching/football-dna-review` (`content/coaching/football-dna-review.mdx`), which is live but noindex until Football DNA have seen it. Nothing in the article has been changed. Every recommendation below waits for Graham's approval, then ships as its own commit.

**Sources:**
- Google Ads Keyword Planner (UK, English, Google Search), via `get_keyword_ideas` and `get_keyword_metrics`
- DataForSEO live SERPs: UK, desktop and mobile, depth 20, People Also Ask expanded (click depth 2), asynchronous AI Overviews loaded
- DataForSEO Labs keyword difficulty (KD, 0 to 100, organic)
- Search Console, 10 Aug to 8 Nov 2026

**Cost:** DataForSEO $0.1642 in total ($0.1493 for 30 SERPs, $0.0149 for one keyword difficulty call). Both are logged in the SEO database's API usage table. Keyword Planner and Search Console cost nothing.

**Raw files (seo-data/exports/):**
- `football-dna-serps-2026-11-10.json`: every SERP, raw and summarised
- `football-dna-kp-ideas-seeds-2026-11-10.json`, `football-dna-kp-ideas-url-2026-11-10.json`, `football-dna-kp-metrics-extra-2026-11-10.json`: Keyword Planner
- `football-dna-kd-2026-11-10.json`: keyword difficulty
- `football-dna-gsc-queries-2026-11-10.json`: Search Console queries

**Scripts:** `scripts/seo/cli/football-dna-serp-paa.ts` and `scripts/seo/cli/football-dna-kd.ts`. `endpoints/serp.ts` gained an optional `peopleAlsoAskClickDepth`, sent only when set, so other callers' cache hashes don't change.

**Data caveat:** DataForSEO now returns many organic URLs as `google.com/goto?...` redirects. Sites were identified from each result's breadcrumb and site name. The script's own "footballdna.co.uk top 3" and "independent review" counts read 0 everywhere because of this; the notes below are the corrected reading.

## The headline

No independent written review of Football DNA ranks in the top 20 for any Football DNA search, on desktop or mobile.

What fills those positions instead:
- Facebook group threads asking whether it is worth it ("is it worth the £5.99 a month?", "Is Football DNA app good for under 7s?", "Does anyone subscribe to Football DNA?")
- Trustpilot, the App Store and Google Play
- Football DNA's own social posts
- one four-year-old YouTube review (Catalan Soccer, 1.5k views)

For "football dna cost", footballdna.co.uk itself does not rank in the top 20. The AI Overview answers the price question, and the organic results are Trustpilot and Facebook.

Keyword difficulty is low across the board: "football dna" 20, "football dna review" 22, "football dna app" 12. The brand terms are winnable, and the review is already written for them.

## Top 10 priority list

1. **Title tag and H1:** lead with "Football DNA App Review" and "Is It Worth It". Take the £7.99 out of the title because the price rises on 1 January. *Evidence:* "football dna app" has 110 a month against 20 for "review". The "is football dna worth it" SERP is led by Facebook threads, and PAA asks "Is football DNA any good?". See section 5.1.
2. **An answer block under the H1:** "Is Football DNA worth it?" answered in one sentence. *Evidence:* AI Overviews show on 29 of 30 SERPs. The "worth it" AI Overviews cite Facebook, Reddit and YouTube, and state the 14-day money-back guarantee without the "annual plan only" condition that the review gets right. See 5.3.
3. **Rename "Football DNA Price: Is It Worth the Money?" to "How Much Does Football DNA Cost?"** and make the first sentence the answer. *Evidence:* footballdna.co.uk is absent from the "football dna cost" top 20, and PAA asks "How much is football DNA?". See 5.4.
4. **Rename "What Football DNA Is" to "What Is Football DNA?"** *Evidence:* the exact PAA question on the "football dna" mobile SERP. See 5.4.
5. **New FAQ: "Is Football DNA good for under 7s?"** *Evidence:* the Facebook thread asking exactly this ranks #1 on mobile for "football dna review" and #2 on desktop for "football dna price". See 5.5.
6. **New FAQ: "Can you cancel Football DNA at any time?"** *Evidence:* "Football DNA cancel subscription" is a Google related search, and the review already has the facts. See 5.5.
7. **Rename the curriculum H2 to "The Football DNA Curriculum: A Week-by-Week Plan"**, and add the 36-week structure once it has been checked against footballdna.co.uk. *Evidence:* the AI Overview for "football dna curriculum" leads with "36-week full-season programs divided into six 6-week blocks". See 5.4.
8. **Schema:** add the £59.99 annual offer, plus App Store and Google Play `sameAs` links on the SoftwareApplication. *Evidence:* the schema currently carries only the £7.99 monthly offer, and "football dna" returns DNA academies and the FA's England DNA, so entity links help. See 5.7.
9. **Internal links in, staged for the day noindex is lifted:** the apps roundup (restore the sentence held back in a1574a8), FutureFit Part 1, the Paul Barry academy-life interview and the /coaching hub. Two links out can go in now. See 5.6.
10. **Head term, new article: playing out from the back drills for 5v5 and 7v7.** *Evidence:* 140 a month, KD 0, peaks of 260 in September and October. The AI Overview describes an 11v11 build-up (#2 and #3 split, #6, #8), which is the wrong answer for children's formats. See 5.8.

Worth asking Football DNA while they review the page:
- Can a membership be used on more than one device? A Junior Grassroots Hub thread ranking for "football dna" asks this, and we don't know.
- Please confirm the curriculum structure (36 weeks, six 6-week blocks, three practices per session).

## 1. Keyword universe

Keyword Planner, UK, average monthly searches, then the 12-month trend from October 2025 to September 2026. Competition is ad competition, not organic difficulty, so KD (DataForSEO Labs) is given beside it. "No volume" means Keyword Planner returned nothing, not zero searches.

### (a) Win now: low competition, intent matches the review, no strong independent review ranking

- **football dna**: 1,600/mo
  - trend: 1900, 1900, 1000, 1900, 1600, 1600, 1600, 1300, 1600, 1600, 1600, 2400
  - LOW (16); bid £0.08 to £0.77; KD 20
  - Mostly navigational, but positions 4 to 10 are threads, Trustpilot and an old video, so a review can realistically reach the middle of page 1, not the top 3.
- **football dna app**: 110/mo
  - trend: 70, 70, 30, 140, 210, 140, 70, 90, 90, 110, 170, 140
  - LOW (20); bid £0.21 to £1.38; KD 12
  - Rising, with a January peak.
- **football dna review**: 20/mo
  - trend: 20, 20, 10, 20, 30, 10, 10, 20, 20, 20, 20, 30
  - LOW (16); bid £0.96 to £3.88; KD 22
  - The highest bid of the set, which signals buyer intent.
- **football dna cost**: 10/mo
  - trend: 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 20, 10
  - LOW (19); no bid
  - footballdna.co.uk is not in the top 20.
- **football dna price**: no volume. footballdna.co.uk ranks only through a "Warm Up" practice page (#6 desktop, #3 mobile).
- **is football dna worth it**: no volume. Ranked by Facebook threads, the App Store and Trustpilot.
- **football dna curriculum**: 10/mo
  - flat at 10 all year; LOW (19); no bid
  - The SERP is all footballdna.co.uk, so the review can only be an extra result here. Low priority.
- **football dna alternatives**: no volume. The mobile AI Overview cites mingle.sport, thecoachingmanual.com and Coaches' Voice, and the top result is a Coachbetter alternatives page.
- **football dna sessions**: no volume.

### (b) Support: answer in a section or FAQ

- **football coaching sessions**: 90/mo
  - trend: 140, 140, 90, 90, 110, 110, 90, 90, 50, 50, 50, 110
  - LOW (14); bid £0.49 to £1.57; KD 0
  - Football DNA's own "Drills & Sessions" page ranks #4, so the review should mention sessions naturally, not target the term.
- **u8 football training sessions**: 10/mo, flat; LOW (5)
- **u7 football coaching sessions**: 10/mo; LOW (5)
- **football session plans for 6 year olds**: 10/mo; LOW (0)
- **playing out from the back drills pdf**: 10/mo (30 in October); LOW (1). The review's U8 section mentions the PDF plan.
- **the coaching manual review**: 10/mo; LOW (0)
- **the coaching manual alternatives**: no volume. It already reaches the apps roundup (1 impression, position 9).
- **grassroots football session plans**: 10/mo; LOW (10)
- Questions taken from Facebook threads and related searches (no Planner volume):
  - "football dna discount code"
  - "football dna app cost"
  - "football dna cancel subscription"
  - "football dna curriculum pdf"
  - "football dna curriculum free"
  - "Is Football DNA app good for under 7s?"
  - "are you limited to one device or can you share it?"
  - "Is Football DNA 36 weeks curriculum worth it?"

### (c) Head terms: big volume, not for the review

- **football session plans**: 590/mo
  - trend: 720, 880, 480, 880, 590, 720, 480, 480, 480, 390, 390, 590
  - MEDIUM (66); bid £0.44 to £1.02; KD 13
- **fa session plan**: 590/mo. Keyword Planner gives it the same figures as "football session plans", so treat the two as one cluster.
- **football training sessions**: 210/mo
  - trend: 260, 210, 170, 210, 210, 260, 170, 210, 210, 140, 140, 210
  - LOW (23); bid £0.44 to £2.07; KD 14
- **playing out from the back drills**: 140/mo
  - trend: 260, 210, 90, 210, 140, 140, 110, 70, 90, 90, 110, 260
  - LOW (0); no bid; KD 0
- **football coaching app**: 140/mo
  - trend: 140, 110, 110, 140, 110, 110, 140, 140, 170, 140, 170, 210
  - LOW (23); bid £0.48 to £2.03; KD 14
  - Owned by the apps roundup (position 10.9).
- **best football coaching apps**: 50/mo; LOW (22); bid £0.60 to £1.47; KD 17. Owned by the apps roundup (position 10.3; 4.6 for the singular).
- **football training app**: 110/mo
  - trend: 110, 110, 90, 70, 50, 70, 110, 110, 140, 210, 140, 140
  - LOW (24); bid £0.44 to £1.57; KD 0
  - Player-training intent mixed in.
- **soccer drills u8 / coaching u8 soccer drills**: 170/mo (merged)
  - trend: 260, 210, 70, 260, 170, 260, 140, 140, 140, 140, 90, 260
  - LOW (10); KD 0
  - US phrasing; UK searchers say "football".
- **football training session plan**: 90/mo; MEDIUM (61); KD 0
- **football coaching session plan**: 70/mo; HIGH (87); KD 0
- **childrens football training drills**: 140/mo; HIGH (72); KD 0
- **1v1 soccer drills**: 210/mo; LOW (1); KD 0
- **fun football training drills**: 70/mo; LOW (5); KD 2
- **football training drills for 8 year olds**: 40/mo; LOW (21); KD 0. Belongs to `/coaching/football-drills-for-7-and-8-year-olds`.
- **football drills app**: 20/mo; LOW (23)
- **football session planner app**: 20/mo; MEDIUM (65); KD 50
- **u8 football sessions, u7 football sessions, football curriculum for kids**: no volume.

### (d) Ignore: navigational or unrelated

- **football dna login**: 90/mo; KD 0. Navigational.
- **england football learning**: 2,400/mo; KD 20. Navigational: the SERP is entirely the FA's own sites. The review already names it as an alternative.
- **learn england football**: 320/mo. Navigational.
- **the coaching manual**: 880/mo; KD 14. Navigational: thecoachingmanual.com holds most of the top 10.
- **dna elite football academy**: 170/mo. Unrelated.
- **dna football academy**: 30/mo. Unrelated.
- **dna academy football**: 10/mo. Unrelated (dna-academy.co.uk, Stoke).
- **arsenal dna**: 20/mo. Unrelated.
- **football in my dna**: 10/mo. Unrelated.
- **academy soccer coach**: 90/mo. Navigational.
- **academy soccer coach session planner**: 10/mo. Navigational.
- **coach3**: 10/mo. Navigational and tiny.
- The URL-seeded Keyword Planner run (the review URL as seed) returned generic football terms such as "england football", "football club" and "football match". Expected for a noindex page that Google has little context on, and none of them are useful.

## 2. People Also Ask, grouped by theme

PAA appeared on 11 of 30 SERPs, mostly mobile. Even with expansion it drifts off-topic quickly: DNA tests, ticket prices, Beckham. Answer sources were not returned with the expanded questions. The Facebook thread titles that rank are better evidence of real questions than PAA here, so they are listed too.

**About Football DNA (FAQ or H2 material for the review)**
- Is football DNA any good? ("football dna", mobile)
- How much is football DNA? ("football dna", mobile)
- What is football DNA? ("football dna", mobile)
- What is England's football DNA? ("football dna", mobile)
- What does DNA mean in football? (cost, price and worth-it SERPs)
- Is that DNA company legit? ("is football dna worth it", desktop)
- Ranking Facebook thread titles:
  - "is it worth the £5.99 a month? are you limited to having it on one device or can you share it?" (Junior Grassroots Hub)
  - "Is Football DNA app good for under 7s?" (Junior Grassroots Hub)
  - "Is Football DNA app worth it for training drills?" (Essex Junior Football)
  - "Does anyone subscribe to Football DNA?"
  - "Do anyone use the coaches voice or football dna?" (Youth Soccer Coach)
  - "Is Football DNA 36 weeks curriculum worth it?" (Anytime Soccer)
  - "is there any other apps apart from Football dna?" (Junior Grassroots Hub)

**Apps and tools (apps roundup material, not the review)**
- What is the best football drill app?
- Is there an app that teaches you football?
- What is the best free app for football training?
- Which is the best coaching app?
- Is there a free football coach app?
- Is there a free coaching app available?
- What is the best soccer training tool?
- What AI tool is available for football coaches?
- Which AI coaching app is the best?
- Is there a GameChanger for soccer?
- What is the best app for managing soccer substitutions?

**Playing out from the back (material for a new article)**
- What are the advantages of playing out from the back in football?
- What is playing out from the back in soccer?
- Where to put your weakest player in soccer?
- What does 3-5-2 mean in soccer?

**Coaching craft and cost (other coaching pages, not the review)**
- What does every football coach need?
- What do coaches struggle with the most?
- How to spot a bad coach? What makes a bad soccer coach?
- Can a bad player be a good coach?
- What is the hardest sport to coach?
- What is the 70/30 rule in coaching? What are the 5 C's of coaching? What is the golden rule of coaching? What are 10 qualities of a good coach?
- Is the UEFA B licence worth it? How long does level 1 coaching take?
- How much does coaching cost in the UK? How much does 1 to 1 football coaching cost? How much does a private football coach cost?
- What are the 5 basic skills in soccer? What are the 5 W's in soccer? What is the best training for football players?

**Noise (ignore):** DNA tests (cost, legality, accuracy), football ticket prices, Beckham, Zidane, Football Manager, PES, streaming sites, online football games, formations trivia.

**Google related searches worth noting:**
- Football DNA review trustpilot
- Football DNA discount code
- Football DNA app cost
- Coaches' Voice Academy
- Football dna curriculum pdf / free
- Best football dna curriculum
- Football DNA cancel subscription
- Football session plans pdf / template / free

## 3. SERP notes (top 15 terms, desktop and mobile)

Features across all 30 SERPs:
- AI Overview: on 29 of 30. The exception is "football dna" on mobile.
- PAA: on 11.
- Video or short-video results: on 28.
- Review stars (Trustpilot, Google Play, App Store): on 15.
- Discussions and forums block: on 3 ("is football dna worth it" on both devices, "football dna alternatives" on desktop).

### football dna (1,600)

**Desktop:**
- Top 10:
  1. App Store
  2. App Store ratings
  3. Football DNA's Facebook
  4. Junior Grassroots Hub thread ("is it worth it")
  - 5 to 7. footballdna.co.uk: One to One, a blog post and a Warm Up page
  8. YouTube "FOOTBALL DNA Review | Catalan Soccer" (4 years old)
  9. Trustpilot (5.0, 276 reviews)
  10. Google Play (4.8)
- footballdna.co.uk is not in 1 to 3: the App Store holds 1 and 2.
- The AI Overview cites Facebook, Football DNA and YouTube. It says "over 1,000 video drills", "150+ complete session plans" and "36-week grassroots" curriculums.

**Mobile:**
- Top 10:
  1. footballdna.co.uk
  2. Football DNA's YouTube
  3. Trustpilot
  4. Instagram
  5. DNA Casual Football (unrelated)
  6. thefa.com "England DNA Foundation Phase"
  7. Junior Grassroots Hub thread
  8. Spotify podcast
  9. DNA Academy, Stoke (unrelated)
  10. Kitlocker
- No AI Overview.
- PAA: is it any good, how much, what is it, what is England's football DNA, best drill app.
- **Independent review:** only the old YouTube video.

### football dna app (110)

**Desktop:**
- Top 10:
  1. Google Play
  2. App Store
  - 3 and 4. footballdna.co.uk: Free Content, F.A.Q
  5. Instagram
  6. App Store
  - 7 to 9. footballdna.co.uk
  10. Junior Grassroots Hub thread ("any other apps apart from Football dna?")
- footballdna.co.uk holds 3.
- **Mobile:** footballdna.co.uk at 1 (Free Content). Trustpilot at 2. The Essex Junior Football thread "Is Football DNA app worth it?" at 9.
- AI Overview citations:
  - desktop: footballdna.co.uk, Google Play
  - mobile: footballdna.co.uk, Trustpilot, Facebook, YouTube
- **Independent review:** none.

### football dna review (20)

**Desktop:**
- Top 10:
  1. Trustpilot
  2. Youth Soccer Coach thread
  3. App Store
  4. Google Play
  5. Football DNA's Facebook ("5 star rating on Trustpilot after over 230 reviews")
  6. Trustpilot (Canada)
  7. Football DNA's Facebook
  8. FA Boot Room "Plan, Do, Review" (a word match)
  9. App Store
  10. footballdna.co.uk
- footballdna.co.uk is not in 1 to 3.

**Mobile:**
- Top 10:
  1. Junior Grassroots Hub "Is Football DNA app good for under 7s?"
  2. footballdna.co.uk
  3. FA Boot Room
  4. Football DNA's Facebook
  5. Reddit r/bootroom (4 years old)
  6. Trustpilot category page
  - 7 to 9. footballdna.co.uk: membership, blog, about
  10. FA Boot Room
- AI Overview citations:
  - desktop: YouTube, App Store, Trustpilot
  - mobile: YouTube, footballdna.co.uk, Reddit, Facebook
- **Independent review:** none, apart from customereye.ai (an AI review summariser) in 11 to 20 on mobile.

### football dna cost (10)

**Desktop:**
- Top 10:
  1. Trustpilot
  2. App Store
  3. Youth Soccer Coach thread
  4. Football DNA's Facebook
  5. Trustpilot
  6. Football DNA's Facebook
  - 7 and 8. App Store
  9. Google Play
  10. Trustpilot (Canada)
- footballdna.co.uk is absent from the top 20.

**Mobile:**
- Top 10:
  1. Football DNA's Facebook
  2. Trustpilot
  3. Youth Soccer Coach thread
  4. Football DNA's Facebook
  5. Trustpilot
  6. Football DNA's Facebook
  7. juniorgrassrootshub.com partner page
  8. Trustpilot
  9. Football DNA's Facebook
  10. App Store
- AI Overview on both devices: "£7.99 per month or £59.99 per year (saves 37%)", plus club memberships for 5+ coaches. It cites footballdna.co.uk and Facebook.
- PAA is off-topic (academy costs, UEFA B, 1 to 1 coaching cost).
- **Independent review:** none.

### football dna price (no volume)

- **Desktop:**
  1. Football DNA's Facebook (club membership)
  2. Junior Grassroots Hub "good for under 7s?"
  3. Trustpilot
  4. Google Play
  5. Football DNA's Facebook
  6. footballdna.co.uk Warm Up
  7. Youth Soccer Coach thread
  8. Essex Junior Football thread
  9. Trustpilot
  10. App Store
- **Mobile:** Trustpilot at 1. footballdna.co.uk Warm Up at 3. A Black Friday post at 6. The Anytime Soccer "36 weeks curriculum worth it?" thread at 10.
- The AI Overview gives the same prices.
- **Independent review:** none.

### is football dna worth it (no volume)

- **Desktop:**
  1. Youth Soccer Coach thread
  2. App Store
  3. Trustpilot (New Zealand)
  4. Football DNA's Facebook
  5. App Store
  6. Google Play
  7. Trustpilot
  8. footballdna.co.uk membership
  9. Reddit r/bootroom
  10. Kitlocker (Football DNA guest content)
- **Mobile:** Youth Soccer Coach thread at 1. footballdna.co.uk membership at 3.
- A discussions and forums block shows on both devices.
- AI Overview:
  - It says "generally considered worth the investment" and "Includes a 14-day money-back guarantee". It drops the condition that the guarantee covers the annual plan only, which the review gets right.
  - It cites YouTube, Trustpilot, Facebook, Reddit, footballdna.co.uk and the App Store.
- **Independent review:** none. This is the clearest gap.

### football dna alternatives (no volume)

- **Desktop:** Football DNA's own pages and posts fill most of the top 10. A discussions block shows.
- The desktop AI Overview builds a comparison and cites thecoachingmanual.com, thekicksapp.com, tracbac.club, Reddit and Coach Amigo.
- **Mobile:**
  1. mingle.sport "Coachbetter Alternative"
  2. Football DNA's Facebook
  3. Trustpilot
- The mobile AI Overview names The Coaching Manual and Coaches' Voice Academy, and cites mingle.sport and thecoachingmanual.com.
- **Independent review:** none.

### football dna curriculum (10)

- **Desktop:** footballdna.co.uk at 1, 2, 3, 5, 6, 8 and 10.
- **Mobile:** footballdna.co.uk at 1, 3, 4, 5 and 6, including "Block One: Week One - Passing & Receiving (Build from the Back)".
- The AI Overview gives "36-week full-season programs divided into six 6-week blocks", "three structured practices", and the U5 to U8, U9 to U12, U13 to U16 and 3v3 curriculums.
- **Independent review:** none, and little room for one.

### the coaching manual (880)

- thecoachingmanual.com and its subdomains hold most of the top 10 on both devices. Google Play (4.3) and Trustpilot (4.0, 216 reviews) also rank.
- The AI Overview says "6,000 resources, 2,000+ full training sessions".
- Navigational.

### england football learning (2,400)

- All FA properties (learn.englandfootball.com, community.thefa.com, help.thefa.com) plus its social accounts.
- Navigational.

### football session plans (590)

- **Desktop:**
  1. England Football Learning session programme
  2. owayo.co.uk
  3. FA Level 2 Session Planner
  4. ourcitysc.com
  5. sportsessionplanner.com
  6. sportplan.net
  7. YouTube
  8. professionalsoccercoaching.com
  9. footballdna.co.uk "How to Plan & Structure a Coaching Session"
  10. a Facebook "39 free football coaching session plans" post
- **Mobile:**
  1. England Football Learning
  2. footballdna.co.uk
  3. Scottish FA
  4. sportplan
  5. thecoacheszone
  6. FIFA Training Centre
  7. sportsessionplanner
  8. teamgrassroots.co.uk
  9. sportplan
  10. pembee.app "Football Training Session Plans (Free Templates by Age)"
- The AI Overview describes a 90-minute themed session structure.
- Related searches are all "pdf", "template", "free" and "Word".
- The intent is a free downloadable plan or template.

### football coaching app (140)

- **Desktop:**
  1. MyPersonalFootballCoach (Google Play)
  2. vantasports.ai list
  3. Train Effective (Play)
  4. goalstation list
  5. familyfc.com
  6. teamstats.net guide
  7. bcoach (Play)
  8. teamstats.net
  9. box-to-box (Play)
  10. Facebook thread
- **Mobile:** goalstation, youcoach, vantasports, thecoachingmanual "apps compared", teamstats, thrive4grassroots, among others.
- The AI Overview names Football DNA first ("Best for video drills and session plans") and cites footballdna.co.uk, Coachbetter, Coach Amigo, easy2coach, Sportplan and Joner.
- Football Parent's apps roundup averages position 10.9 for this query in Search Console.

### playing out from the back drills (140)

- **Desktop:**
  1. YouTube (Next Play)
  2. sportsessionplanner 9v9
  3. FIFA Training Centre
  4. grassrootsfootballuk.com
  5. southmilfordfc.co.uk
  6. FIFA Training Centre
  7. YouTube 9v9
  8. footballdna.co.uk "Playing Out From The Back In 5 v 5 - 7 v 7"
  9. sportsessionplanner
  10. Football DNA's YouTube
- **Mobile:**
  1. themastermindsite.com full session plan
  2. footballsouthcoast.com
  3. sportsessionplanner
  4. FA community
  5. elitesoccercoaching.net
  6. footballdna.co.uk full session
- Video results show heavily on both devices (7 each).
- The AI Overview gives an 11v11 build-up (split centre-backs #2 and #3, #6, #8, #11, #9). That does not fit 5v5 or 7v7 children's football.
- Mobile PAA:
  - What are the advantages of playing out from the back?
  - What is playing out from the back in soccer?

### football training sessions (210) and football coaching sessions (90)

- Mostly governing-body and drill-library sites:
  - England Football Learning
  - FIFA Training Centre
  - sportplan
  - sportsessionplanner
  - Soccer Coach Weekly
  - The Coaching Manual
  - YouTube
- footballdna.co.uk is #4 for "football coaching sessions" on both devices.
- The AI Overviews describe a generic warm-up, technical, game and cool-down structure.

## 4. Our current position (Search Console, 10 Aug to 8 Nov 2026)

Search Console hides low-volume queries, so the brand terms barely show.

What reaches the site:
- **"football dna cost":** 3 impressions at position 10.3, landing on `/parent-guides`. This is the only Football DNA query recorded. It will move to the review once it is indexed.
- **App queries on the apps roundup (`/coaching/best-grassroots-football-apps`):**

  | Query | Impressions | Clicks | Average position |
  |---|---|---|---|
  | "football coaching app" | 258 | 3 | 10.9 |
  | "football coach apps" | 225 | 1 | 17.9 |
  | "football coaching apps" | 219 | 8 | 15.1 |
  | "best football coaching apps" | 185 | 6 | 10.3 |
  | "best football coach app" | 176 | 0 | 21.0 |
  | "football coach app" | 153 | 0 | 12.8 |
  | "free football coaching app" | 32 | 1 | 6.0 |
  | "best football coaching app" | 26 | 4 | 4.6 |
  | "the coaching manual alternatives" | 1 | 0 | 9 |

  Its FootballDNA section (#best-for-drills-and-session-planning-footballdna) also earns impressions as a jump link.
- **No "session plan" or "curriculum" queries** reach any of the five pages.
- **FutureFit Part 1 and Part 2:** under 30 impressions a month each, no named queries, nothing overlapping.
- **`/coaching/football-drills-for-7-and-8-year-olds`:** "football drills for 7 year olds" and similar age-plus-drills queries (3,531 impressions in 28 days, position 8.3). Its queries are parent and home-practice phrased, with no session plan or app terms.
- **`/coaching`:** "grassroots football coaching" (position 22) and "grassroots coaching" (position 11). No overlap.

**Which page should own each term (cannibalisation guard):**
- **The review:** every Football DNA term (football dna, app, review, cost, price, worth it, curriculum, alternatives, sessions).
  - Keep "coaching app" out of its title and H2s: the roundup already ranks 4.6 to 11 for those terms.
  - The H1 wording "Football DNA App Review" is fine, because the brand qualifies it.
- **The apps roundup:** football coaching app(s), best football coaching app(s), free football coaching app, football training app, football drills app, the coaching manual alternatives.
  - The roundup should link to the review, not compete with it: one sentence in its FootballDNA section (5.6).
- **A new playing-out-from-the-back article:** playing out from the back drills (plus pdf, 7v7, 9v9, u10).
  - The review's "Using It for a Real Problem" section keeps its first-hand angle and links across once that article exists.
  - Don't add "drills" phrasing to that H2.
- **Drills for 7 and 8 year olds:** football training drills for 8 year olds, ball mastery, home practice. No change.
- **No page yet:** football session plans / fa session plan / football training session plan. These need their own page type (5.8). Don't push them into the review.
- **FutureFit interviews and /coaching:** no overlap.

## 5. Recommendations for the review

All facts used below are already in the article. The exception is 5.4(c), which needs checking first, as marked. Nothing here has been applied.

### 5.1 Title tag and H1

Current:
- **Title tag** (`app/coaching/football-dna-review/page.tsx`): "Football DNA App Review: Is It Worth £7.99 a Month? | Football Parent". 69 characters, so it will likely be truncated.
- **H1** (frontmatter `title`): "Football DNA App Review: Is It Worth £7.99 a Month for Grassroots Coaches?". 74 characters.

Title tag options:
- **A (recommended):** "Football DNA App Review: Is It Worth It? A Coach's Verdict" (58)
- **B:** "Football DNA Review: Is the App Worth £7.99 a Month?" (52)
- **C:** "Football DNA App Review: Price, Curriculums and Who It Suits" (60)

H1, recommended: "Football DNA App Review: Is It Worth It for Grassroots Coaches?" (63)

Why A:
- "Football DNA App Review" carries both "football dna app" (110) and "football dna ... review" (20).
- "Is It Worth It" matches the "is football dna worth it" SERP, where Facebook threads currently rank first, and the PAA question "Is football DNA any good?".
- Dropping "| Football Parent" fits the title inside the display limit. The apps roundup already runs without it.
- The article says Football DNA prices rise on 1 January. A £7.99 title would be wrong 7 weeks after launch and would force a title change on a newly indexed page. Option B carries that risk. Prices stay in the meta description and the answer block, where a January update is a lower-risk edit.

### 5.2 Meta description (must be identical in the MDX frontmatter and page.tsx)

Current (153): "Football DNA costs £7.99 a month or £59.99 a year. A grassroots coach's review after a year of paid use: filmed sessions, curriculums and who should pay."

Options:
- **A (recommended, 157):** "Football DNA costs £7.99 a month or £59.99 a year, with no free trial. A coach's review after a year of paid use: filmed sessions, curriculums, who it suits."
- **B (157):** "Is Football DNA worth it? A grassroots coach's verdict after a year of paid use: £7.99 a month or £59.99 a year, no free trial, filmed sessions, curriculums."
- **Keep the current one:** it is already good. This is the lowest-value change on the list.

Why A: "no free trial" answers the commonest buying question before the click, and the review is the only page that states it clearly. Both options need the prices updating in January, as the current one does.

### 5.3 Answer block under the H1 (for AI Overviews)

Current opening: "Football DNA gets 5 out of 5 from us. At £7.99 a month, or £59.99 a year, it is worth it for any grassroots coach who plans training around a theme, and especially for newer coaches. It is less useful for a coach who wants a quick drill on the way to the pitch."

Proposed replacement for those three sentences (paste-ready MDX):

```mdx
**Is Football DNA worth it?** Yes, for any grassroots coach who plans training around a theme: at £7.99 a month or £59.99 a year, its filmed sessions and week-by-week curriculums save time on planning, though there is no free trial.

We give it 5 out of 5, and newer coaches get the most from it. It is less useful for a coach who wants a quick drill on the way to the pitch.
```

The rest of the paragraph ("The library of filmed sessions is the reason to pay...") follows unchanged.

### 5.4 H2s to rename or extend

When a heading changes, its `sections[].id` in the frontmatter must change to match the slugified heading.

**(a) "What Football DNA Is" becomes "What Is Football DNA?"**
- id: `what-is-football-dna`
- The first sentence is already a complete answer ("Football DNA is a coaching content platform.").
- Evidence: the exact PAA question on the "football dna" mobile SERP.

**(b) "Football DNA Price: Is It Worth the Money?" becomes "How Much Does Football DNA Cost?"**
- id: `how-much-does-football-dna-cost`
- Put the answer first, above the existing "Prices below are from..." line:

```mdx
Football DNA costs £7.99 a month or £59.99 a year, which works out at about £5 a month on the annual plan, and there is no free trial.
```

- Evidence:
  - PAA asks "How much is football DNA?".
  - footballdna.co.uk is absent from the "football dna cost" top 20.
  - The related search "Football DNA app cost".
- The section's "is it worth it" reasoning stays where it is. The question form now leads in the answer block (5.3).

**(c) "The Curriculums: A Week-by-Week Plan" becomes "The Football DNA Curriculum: A Week-by-Week Plan"**
- id: `the-football-dna-curriculum-a-week-by-week-plan`
- Optional added sentence, **only after it has been checked** on footballdna.co.uk/curriculums. That site returns 403 to automated fetches, so check it in Graham's browser or ask Football DNA during their review:

```mdx
Football DNA describes each curriculum as a 36-week season plan in six blocks of six weeks, with three practices per session.
```

- Source so far: Football DNA's own Facebook and Instagram posts as they appeared in today's SERPs ("6 x 6-week blocks", "3 practices per session", "36 Full Sessions"), and the matching AI Overview.
- The review already says each week has three practices and that Block One's week six is a games week, which fits.

**Keep as they are:**
- "Football DNA Alternatives". The AI Overviews for that query name The Coaching Manual and Coaches' Voice Academy. Adding either would need checked facts and is Graham's call, since Football DNA is a partner.
- "Who Should Pay for Football DNA, and Who Shouldn't".
- "What Could Be Better".

### 5.5 PAA and thread questions to add as FAQs

Each goes as a `###` under "Frequently Asked Questions", so FAQPage schema picks it up automatically through `lib/faq.ts`. Each answer is built from facts already in the article.

```mdx
### Is Football DNA good for under 7s?

Yes. You can filter sessions by the U5 to U8 age group, and the U5 to U8 curriculum is built around the basics that age needs, such as hiding and carrying the ball, passing and receiving, and 1v1s. We used it to plan sessions for an U8 team.
```

Evidence: the "Is Football DNA app good for under 7s?" thread ranks #1 on mobile for "football dna review" and #2 on desktop for "football dna price".

```mdx
### Can you cancel Football DNA at any time?

Yes. There is no minimum term: cancelling stops the next renewal, and you keep access until the end of the period you have paid for. Only the annual plan has a 14-day money-back guarantee.
```

Evidence: the related search "Football DNA cancel subscription". The AI Overviews also get the guarantee wrong.

```mdx
### Is there a free Football DNA curriculum?

Not the full curriculum. Football DNA's free section has 56 items, mostly single practices, plus about six full sessions and some curriculum weeks, so you can see how the format works before paying.
```

Evidence: the related searches "Football dna curriculum free" and "Football dna curriculum pdf".

**Optional, needs a source link before it goes in:**

```mdx
### Is Football DNA the same as the FA's England DNA?

No. Football DNA is a separate company that sells coaching content. England DNA is the FA's own coaching philosophy, published on its Boot Room site.
```

Evidence: the PAA questions "What is England's football DNA?" and "What does DNA mean in football?", and the FA's "England DNA Foundation Phase" page ranking #6 on mobile for "football dna". DataForSEO returned that result as a Google redirect, so the exact thefa.com URL still needs finding.

**Not added (unknown facts, so don't guess):** "Can you use Football DNA on more than one device?" Ask Football DNA.

### 5.6 Internal links (all URLs are in lib/routes.ts)

**Out of the review: can go in now**

1. In "How We Reviewed It", replace "Its Head of Coaching, Paul Barry, has been interviewed on this site, and clicks from this site..." with:

```mdx
Its Head of Coaching, Paul Barry, has been interviewed on this site twice, on [the FA's FutureFit changes](/parent-guides/futurefit-football-dna-interview-part-1) and on [what academy life is like for families](/academy-pathway/academy-life-paul-barry-interview), and clicks from this site to Football DNA are counted so we can report traffic to them.
```

This also makes the disclosure more complete.

2. In "Football DNA Alternatives", extend the England Football Learning bullet:

```mdx
- **England Football Learning.** The FA's [England Football Learning](https://learn.englandfootball.com/) site publishes its own session programmes and coaching articles. It's worth looking at first, because it is the governing body's own material, and it is also where the FA's coaching courses are booked, which our guide to [what qualifications you need to be a football coach](/coaching/what-qualifications-do-i-need-to-be-a-football-coach) explains.
```

**Into the review: hold until noindex is lifted** (the same reasoning as a1574a8)

3. Apps roundup, FootballDNA section. Restore the sentence removed in a1574a8, after the free-section paragraph:

```mdx
For the price, what the filmed sessions add and where it falls short, see our full [Football DNA review](/coaching/football-dna-review).
```

4. FutureFit Part 1, intro paragraph. After "It's amazing for when you have an idea for a topic but aren't sure what to do or how to deliver it.", add:

```mdx
Our [Football DNA review](/coaching/football-dna-review) covers the price, the curriculums and how the filmed sessions work at training.
```

5. Paul Barry academy-life interview, intro. After "...how to adapt a session for your group.", add:

```mdx
We've reviewed the platform in full, after a year of paid use, in our [Football DNA review](/coaching/football-dna-review).
```

6. `/coaching` hub: add the review card, as the comment in `app/coaching/football-dna-review/page.tsx` already says.

**Not recommended:**
- **`/coaching/football-drills-for-7-and-8-year-olds`:** it is written for parents practising in the garden, so a link to a paid coaching subscription doesn't fit its readers. The review already links to it.
- **`/coaching/best-football-formations-by-age-group`:** it covers 7v7 and 9v9, not the 5v5 the review discusses.

**Consistency note:** both interviews describe Football DNA as "thousands of drills". The review uses the App Store's "more than 1,000 sessions", and Football DNA's own club page says "1,000+ practices and sessions". Worth aligning the interviews to "more than 1,000" as a separate change.

### 5.7 Schema gaps

Already in place:
- SoftwareApplication with a Review (rating, positiveNotes and negativeNotes, author, publisher)
- one Offer
- VideoObject for both walkthroughs (thumbnail from the poster, contentUrl, duration)
- FAQPage from the FAQ section
- BlogPosting and BreadcrumbList

Gaps:

1. **The annual offer is missing.** `ReviewVerdict` emits a single `Offer` at £7.99. Proposed:
   - emit two Offers (£7.99 with `priceSpecification` `UnitPriceSpecification` `billingDuration: "P1M"`, and £59.99 with `"P1Y"`)
   - drive them from a new optional `offers` prop, so other reviews are unaffected
   - This is a shared-component change, so it gets its own commit.
2. **No entity links on the SoftwareApplication.** Add `sameAs` with the App Store (`https://apps.apple.com/gb/app/football-dna/id1611898337`) and Google Play (`https://play.google.com/store/apps/details?id=com.Football.DNA`) URLs, both already linked in the article. "football dna" SERPs mix in DNA academies, DNA Casual Football and the FA's England DNA, so tying the review to the right entity matters.
3. **The BlogPosting and the SoftwareApplication aren't connected.** Give the SoftwareApplication an `@id` (`https://www.footballparent.co.uk/coaching/football-dna-review#software`) and add `about: { "@id": ... }` to the BlogPosting. This is lower priority.
4. **Don't add:**
   - an AggregateRating built from Trustpilot or app store ratings. Google doesn't accept third-party aggregate ratings, and it would read as self-serving.
   - a HowTo
   - ImageObject markup for every screenshot
5. **Note:** FAQ rich results only show for government and health sites now, so the new FAQs are for AI Overviews and answer engines, not SERP display. VideoObject is complete for self-hosted video.

### 5.8 Head terms: what it would take, and which page should target each

1. **New article: "Playing Out From the Back Drills for 5v5 and 7v7"** (in /coaching)
   - Terms and numbers:
     - playing out from the back drills: 140/mo, KD 0, peaks of 260 in Sep and Oct, 210 in Jan
     - playing out from the back drills pdf: 10/mo
     - playing out from the back 9v9 drills: 10/mo
     - playing out from the back drills u10: 10/mo
   - Why it's winnable:
     - The SERP is drill libraries, FIFA Training Centre and YouTube.
     - The AI Overview gives an 11v11 answer.
     - Nobody answers it for the children's formats: the 5v5 retreat line at goal kicks, the 7v7 build-up line.
     - Graham has the first-hand U8 story already.
     - The mobile PAA ("advantages of", "what is") gives two ready-made H2s.
     - Effort: one article with diagrams.
   - Links: from the review's U8 section and from the formations guide's 7v7 section.
   - Ranking: page 1 without links is realistic at KD 0.
   - Route it through the football-parent-articles skill.
2. **Football session plans hub or template** (new page type, not an article)
   - Terms: football session plans / fa session plan (590/mo, KD 13, ad competition MEDIUM 66) and football training session plan (90/mo).
   - The intent is a free, downloadable plan or template: the related searches are pdf, template, free and Word.
   - Ranking pages:
     - England Football Learning
     - the FA's Level 2 planner
     - sportplan
     - sportsessionplanner
     - the Scottish FA
     - FIFA Training Centre
     - one small app (pembee.app, #10 on mobile with "Free Templates by Age")
   - What it would take:
     - a genuinely useful free template (PDF and Word)
     - a few complete plans by age group, U7 to U10
     - some links, because the governing bodies hold the top three
   - It wouldn't come from the review. The review can link to it later.
   - A medium-term job, not a quick win.
3. **football coaching app / best football coaching apps / football training app** (140, 50, 110 a month; KD 14, 17, 0)
   - The apps roundup already owns these (positions 4.6 to 11) and is on its own watch.
   - The only review-related action is the inbound link at noindex lift (5.6, item 3), which also backs up the AI Overview's "Football DNA: best for video drills and session plans" claim from our side.
4. **football training sessions / football coaching sessions** (210 and 90 a month; KD 14 and 0)
   - The SERPs belong to governing bodies and drill libraries. Park these: they would be secondary targets for the session plans hub in item 2, not a page of their own.
5. **1v1 soccer drills and childrens football training drills** (210 and 140 a month; KD 0)
   - Not related to the review. SERPs not checked in this run.
   - Possible future drills articles; record them in the article roadmap rather than here.

## 6. Shipping plan once approved

- Branch from an up-to-date `main`. The current local branch, `chore/stock-check-2026-11-10`, is 34 commits behind.
- One commit per change:
  - title and H1
  - meta
  - answer block
  - each H2 rename
  - each FAQ
  - outbound links
  - schema (component change)
- Log each in `seo-changes-2026-09-06.md`, the latest change log.
- `npm run build` before pushing.
- Keep `noindex: true` and the robots line in place.
- Hold the inbound links (5.6, items 3 to 6) for the noindex lift, so they ship with that change.
