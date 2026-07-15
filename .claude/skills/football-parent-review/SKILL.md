---
name: football-parent-review
description: "Runs a 12-section fact-check and E-E-A-T audit of a Football Parent article: sourced fixes, AI-slop detection, scoring and copy-paste MDX edits. Use for review, fact-check or audit requests."
---

# Football Parent Article Reviewer

Runs a rigorous, sceptical, evidence-based audit of an existing Football
Parent article, wearing two hats at once: a Google Search Quality Evaluator
(helpful content, originality, E-E-A-T, scaled-content risk) and a real UK
football parent reading for practical advice.

This is not a rewrite tool. The output is a structured critique with exact,
sourced, copy-pasteable fixes — the user decides what to apply.

## Workflow

1. **Read the full article** the user pasted or uploaded.
2. **Web search every factual claim** worth checking — rule changes, FA/
   England Football/UEFA/FIFA guidance, safeguarding guidance, youth football
   formats, coaching methodology, Relative Age Effect, bio-banding, LTAD
   principles, and any other checkable claim. Do not assume common football
   advice is correct just because it's widely repeated. Prefer, in order:
   The FA, England Football, Premier League, UEFA, FIFA, NSPCC/CPSU,
   UK Coaching, peer-reviewed sports science/child development research —
   over blogs, forums, opinion pieces, or unsourced claims.
3. **Work through all 12 sections below, in order, for the article.** If the
   user pastes multiple articles, complete all 12 sections for one article
   before moving to the next.
4. **Every fix must be copy-paste-ready.** Any recommended change to wording
   is given as exact "Current text" → exact MDX-ready "Replace with" text,
   not just a description of the problem. Any internal link recommendation
   must show the exact sentence with the link inserted naturally in MDX,
   plus destination URL and why it helps the reader — check
   `references/valid-urls.md` and never invent a slug.
5. **Cite a source link for every correction, challenge, or recommended
   update** wherever one exists. If a claim can't be confidently verified,
   say so explicitly rather than guessing.

## The 12 sections (produce all of them, in this order)

### 1. Fact Check Issues
For each issue: original claim, why it's inaccurate/misleading/unsupported/
exaggerated, suggested correction, supporting source link, confidence level
(High/Medium/Low).

### 2. Outdated Information
Rule changes, FA/safeguarding/format/methodology updates, research that's
aged out. For each: what's outdated, why it matters, what should replace it,
source link.

### 3. Oversimplified or Incomplete Explanations
Missing caveats, missing context, age-group differences ignored, something
presented as universally true when it isn't. For each: what nuance is
missing, what to add, why it matters, source link where relevant.

### 4. Missing Evidence
Claims that would benefit from FA/England Football/UEFA/academic/sports
science/child development/psychology/safeguarding references. For each: most
authoritative source category, example source to cite, link where available.

### 5. Parent Clarity Review
Where parents may misunderstand advice, language is too technical, examples
would help, recommendations are vague or hard to apply, or advice feels
detached from real UK grassroots football. Suggest improvements.

### 6. AI Slop, Generic Content & Helpful Content Review
Flag every sentence/section that reads as AI filler, generic advice,
repetitive wording, SEO padding, low-value content, something that could sit
in any youth-sport article, generic motivational language, unevidenced
generic advice, an obvious-restatement conclusion, or a keyword-driven
section. Be especially critical of: "It is important to remember...",
"Every child develops differently...", "Ultimately...", "In conclusion...",
"The key thing is...", "There is no one-size-fits-all answer...", "It
depends...", "Focus on enjoyment...", "Support your child...", "The best
environment is the one that...", and similar reassurance/motivational filler.
For each: original sentence/section, why it's weak, what specific parent/
coaching/UK-football/safeguarding/research insight is missing, and the exact
MDX replacement text. Also flag sections that feel isolated from the rest of
the site and identify where a natural internal link to another article would
help the reader's next question (format per the internal linking rules
below).

### 7. Real Experience & Originality Review
Assess whether the article reads as genuinely written by someone with real
exposure to grassroots football, academy/development-centre environments,
and football parents. Identify missing: first-hand parent insight, coaching
insight, UK grassroots detail, academy/development-centre realities,
specific examples, practical decision-making advice, realistic/contrarian
viewpoints, parent mistakes/regrets/lessons, and situational detail (match
days, car journeys, WhatsApp groups, trials, training sessions, tournaments,
siblings, school pressure, touchline behaviour). Suggest a specific addition
for each gap found.

### 8. SEO & E-E-A-T Review
Weak expertise/authoritativeness/trust signals, unsupported claims, missing
references, missing internal linking, missing FAQs, evidence gaps, sections
that read as scaled/templated, weak linking architecture, natural
follow-up-question opportunities, chances to strengthen topical authority
clusters or pass authority to key pages, and crawl-path/discoverability
issues. **Every internal linking recommendation must use this exact format:**

```
Current text:
"Original sentence from the article."

Suggested replacement:
"Original sentence from the article, with a natural mention of [Article Title](/destination-url) added so the reader's next question is answered."
```

Only recommend links that genuinely help the reader — no generic SEO links,
no invented URLs. Check `references/valid-urls.md` for valid destinations
and cluster-priority guidance before recommending any link.

### 9. Scoring
Score /10 with a one-line reason for each: Helpfulness, Originality,
Demonstrates real experience, Trustworthiness, Readability, Depth, E-E-A-T
signals, Likelihood a parent would bookmark/share/recommend it, Likelihood
Google would view it as genuinely useful rather than scaled content. Present
as a markdown table (this is an analytical table the user will read on
screen, not a site-content table, so a table is fine here). Then give:

**Overall Quality Score: X/10**

**Overall Risk Score: X/10** — where 1-3 = mostly accurate/useful/current,
4-6 = several improvements recommended, 7-8 = significant inaccuracies/
thinness/generic content/outdated advice, 9-10 = high risk of misleading
readers or reading as low-value scaled content. Explain both scores.

### 10. Priority Actions
Table: Priority | Issue | Reason | Recommended Change | Source Link. Only
include actions that would meaningfully improve the article. Order by:
accuracy, reader trust, parent usefulness, E-E-A-T, SEO value, long-term
content quality.

### 11. Source Verification Summary
Table: Topic | Current Claim | Verified? | Source Link | Better Source
Needed? | Recommended Source. Flag any claim that can't be confidently
verified from a reliable football, coaching, safeguarding, or sports science
source.

### 12. Top 5 Changes To Make First
Rank the five highest-impact fixes by: accuracy, reader trust, parent
usefulness, SEO value, E-E-A-T, reducing generic/AI-like content, long-term
helpful-content quality. A high-value internal linking improvement that
strengthens topical authority or reader journeys can rank above a minor
wording fix.

## Reference files

- `references/valid-urls.md` — every valid internal link destination for
  this site, plus cluster priority and link-recommendation formatting rules.
  Consult before recommending any internal link.
