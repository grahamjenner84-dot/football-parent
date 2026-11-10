# Review structure research: TechRadar, Tech Advisor, Trusted Reviews, Bäst i test

Researched 10 Nov 2026 for the Football DNA review (collaboration) and for the gear guides generally. Pages were downloaded and parsed directly, including their JSON-LD. Football DNA's own site (footballdna.co.uk) returned 403 to automated fetches, so its current pricing and features still need to come from Graham.

## 1. What the big three UK review sites do

Pages studied:
- TechRadar: [Strava review](https://www.techradar.com/health-fitness/strava-is-still-the-best-training-app-for-runners-and-cyclists-but-its-getting-expensive), [Centr review](https://www.techradar.com/health-fitness/fitness-apps/centr-review), [Narwal V50 Cube](https://www.techradar.com/home/vacuums/narwal-v50-cube-review), [Best fitness app](https://www.techradar.com/health-fitness/best-fitness-app)
- Trusted Reviews: [Max](https://www.trustedreviews.com/reviews/max), [Garmin Enduro 4](https://www.trustedreviews.com/reviews/garmin-enduro-4), [Best fitness trackers](https://www.trustedreviews.com/best/best-fitness-trackers-3435397)
- Tech Advisor: [Surfshark VPN](https://www.techadvisor.com/article/720030/surfshark-vpn-review-3.html), [Luna Band](https://www.techadvisor.com/article/3242626/luna-band-review.html), [Best smartwatch](https://www.techadvisor.com/article/723389/best-smartwatch.html)

### What all three share
- **Verdict above the fold:** a 1 to 3 sentence verdict, a score out of 5, and 3 to 5 pros and cons, shown before the body starts.
- **The pros and cons on the page are repeated word for word in the schema:** a `Product` containing a `Review`, with `reviewRating`, `positiveNotes` and `negativeNotes` as ItemLists, and the author as a Person with a url.
- **A short summary near the top that answer engines can lift:**
  - TechRadar: a "One-minute review"
  - Trusted Reviews: "Key Features" and short FAQs
  - Tech Advisor: a one-line verdict plus summary bullets at the start of each section
- **App and subscription reviews always cover:**
  - platforms
  - a price table (free, monthly, annual)
  - trial, renewal and cancellation catches (Tech Advisor warns of a "nasty surprise when the subscription renews")
  - rivals' prices
  - the reviewer's own captioned screenshots
- **Buy it if / Don't buy it if:** each "don't" names a specific alternative and links to it.
- **How we tested:** first person, with how long, which device and which plan ("Premium subscriber for around a month... iPhone 15 Pro"). It links to a site-wide method page, and Tech Advisor also has a method page per category.
- **Two-way internal links:** each review links to the best-of guides, and each best-of entry has "Our expert review" linking back. There are also "X vs Y" pages for obvious rivals.

### Differences worth noting
- **Length:**
  - TechRadar runs to about 4,600 words, which works on its authority.
  - Trusted Reviews and Tech Advisor rank at 1,800 to 2,800.
  - Depth on what the reader cares about matters more than length.
- **Titles:**
  - The best pattern is "X review: [short hook with a position]" (Trusted Reviews: "Garmin Enduro 4 Review: The Fenix, minus the fluff").
  - Tech Advisor's meta descriptions state the verdict in full sentences, which is better than TechRadar's one-word straplines.
- **Best-of guide schema:** Tech Advisor's is the richest, an `Article` with `hasPart` holding one `Review` per pick.
- **Schema mistakes not to copy:** both TechRadar and Trusted Reviews sometimes put "X Review" or the headline into the Product `name`. Name the product itself.
- **What doesn't transfer to a small site:** award badges, "founded 2003, 1,000+ products a year" boilerplate, IPSO membership and price-comparison widgets. A small site's version of that trust is the personal "who is testing this" statement.

## 2. Bäst i test Guiden (bast-i-test.se)

Pages studied:
- the homepage, robots.txt, llms.txt and the sitemap (353 pages parsed)
- newer-template guides: airfryer, gaming-dator, strykjarn, vinterdacken, luftvarmepumpar, mikrovagsugn, dammsugare
- older guides: termos, vattenkokare
- the author and about pages

They have 274 templated "[Product] bäst i test 2026" ("best in test 2026") guides at `/tester_pa_basta/<product>.html`, monetised through Prisjakt (a price-comparison site) and Adtraction (an affiliate network).

### Why the newer guides do well with GEO and AI Overviews (observed)
1. **A primary answer box** under the H1, now on 54 guides including 8 of the 10 most recently reworked. It is a question heading, then one sentence naming the winner with its exact model and 2 to 3 reasons, then the runners-up. The same text is the first FAQPage entry in the schema (`#primary-answer`). In a non-Google search tool, the AI summary quoted the airfryer answer almost word for word. We could not observe Google AI Overviews directly.
2. **A labelled winners strip:** best in test, best value, best budget, best premium, best for a specific need. These labels match how people word their questions to AI tools.
3. **Product sections that stand alone,** with fixed H3s ("suits you if", "who is it for", "why it's good value") and spec lists.
4. **Text full of exact model codes, litres, wattage and prices,** plus named test bodies.
5. **Year and month in the headings** ("Top 5 models in November") and live prices.
6. **Heavy schema on every guide:** Article, BreadcrumbList, Organization, FAQPage, an ItemList of winners, and Product + Review per product.
7. **robots.txt explicitly allows the AI crawlers by name:** GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot. It blocks only their affiliate redirect path. A minimal llms.txt asks AI tools to credit and link them.

### Weaknesses and risks (feedback on their strategy)
1. **The dates look automated:**
   - 105 guides say "last fact-checked: 10 Nov 2026" (the day of research), and the sitemap lastmod matches.
   - No guide has `datePublished`.
   - This looks tied to the price refresh rather than real checks. Google warns against exactly this.
2. **There are QA failures that show scaled production:**
   - The gaming laptop answer box, in both the HTML and the schema, is in **Finnish** and names a different winner from the one on the page.
   - The airfryer schema lists products that are no longer on the page.
   - Spec figures contradict each other within the same page (12 programmes in the specs, 10 in the text).
3. **The review markup is uniform and partly self-served:**
   - Every airfryer is rated 4/5 by the Organisation.
   - On 90 pages, the AggregateRating comes from readers rating the article, not the products.
   - Google treats both as spam-prone.
4. **The testing claims are mixed:**
   - The about page claims mostly their own practical tests.
   - The footer and older guides say they compile other people's tests.
   - There is little visible proof of first-hand use. This is what the reviews system targets.
5. **Thin expertise and topic sprawl:**
   - One author, with a finance background, is credited on 163 guides, from perfume to tyres to loans.
   - There are thin loan Q&A pages on YMYL (money and health) topics.
6. **Very long, repetitive pages** (5,000 to 9,000 words) with a lot of affiliate buttons. Near-identical aggregator sites in the same results show the format alone is not a lasting advantage.

In short, their structure is excellent and easy to borrow; their trust signals are weak and easy to beat. Copy the structure and get the evidence right.

## 3. What Football Parent should take from this

### For the Football DNA review
Football DNA is a coaching platform (drills, session plans, coaching video), so the review is written from a coach's side, not as a children's app review.

**Search volumes (Google Ads Keyword Planner, UK):**
- "football dna" about 1,600 a month (2,400 in Sept)
- "football dna app" about 110 and rising
- "football session plans" about 590
- "football coaching app" about 140
- "football dna review" about 20

So write for the brand and app searches, not just "review".

Suggested structure:
1. **H1 and title:** "Football DNA review: [a clear position]". The meta description states the verdict.
2. **Byline block:** author, "Reviewed [date]" (and "Updated" only when it truly changes), and a disclosure line covering the partnership and whether access was free.
3. **Verdict box:**
   - score out of 5
   - a 2 to 3 sentence verdict
   - 3 to 4 pros and 3 cons
   - price when reviewed (UK)
   - who it suits (age groups coached, level)
   - platforms
   - free tier
4. **Primary answer:** "Is Football DNA worth it for grassroots coaches?" answered in the first sentence, Bäst i test style.
5. **Football DNA in one minute:** about 120 quotable words.
6. **The app in action:** the video embed, near the top.
7. **Price and plans:** a table of free and paid tiers, monthly vs annual, trial, cancellation and renewal, with rivals' prices.
8. **Feature sections, each opening with 2 to 3 summary bullets and our own captioned screenshots:**
   - finding a drill (search, filter by age and topic)
   - session plans
   - coach video
   - building your own sessions
   - using it at the pitch on a phone
9. **Real sessions:** two or three Tuesday nights where Graham used it (age group, topic, what happened).
10. **Scorecard table.**
11. **Buy it if / Don't buy it if,** each "don't" pointing to a named alternative.
12. **Alternatives,** linking both ways with `/coaching/best-grassroots-football-apps`.
13. **FAQs:** short, answer-first.
14. **How we tested,** then the author box.

**Code needed:**
- a `VideoEmbed` MDX component: YouTube's privacy-enhanced embed, which loads only on tap, plus `VideoObject` JSON-LD
- a `VerdictBox` MDX component
- `Review` JSON-LD in `lib/ArticleLayout.tsx`, driven by frontmatter: `itemReviewed` as a `SoftwareApplication` with offers in GBP, `reviewRating`, `positiveNotes`/`negativeNotes`, and the author Person

Review snippets only apply to independent reviews, so the partnership must be disclosed.

### For the gear guides (prioritised)
1. **A primary answer block under the H1 on every gear guide:** a question heading, then one sentence with the exact model and reasons, then the runners-up.
2. **One source of truth:** picks, roles, prices and pros/cons in frontmatter. The answer box, winners strip, comparison table and Product/Review/ItemList JSON-LD are all generated from it, which avoids Bäst i test's stale-schema and wrong-answer failures by design.
3. **Football-specific winner labels:** best overall, best budget, best for wide feet, best for 3G/AG, best for under-8s.
4. **Fixed H3s in each product section:** "Who it's for", "What we noticed in use", "Sizing", "Downsides".
5. **A real "How we tested" section:** dates, the child's age and position, number of sessions, surfaces, original photos. This is our edge over aggregators.
6. **Honest dates:** only bump `dateModified` on a real change, and show a "Tested: [months]" line.
7. **Review markup only for products visible on the page,** with ratings that actually differ. No reader-vote AggregateRating.
8. **Answer-first FAQs taken from GSC long-tail queries.**
9. **Explicit AI crawler rules in `app/robots.ts`** (currently a single `*` allow), and add the gear guides to `public/llms.txt`, which currently lists none. Both are deliberate decisions for Graham.

**Not to copy:** their "Sources: the experts' verdicts" outbound links. That conflicts with the rule against outbound citations on gear pages.
