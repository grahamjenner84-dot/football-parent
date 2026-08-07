# Anti-AI SEO Work Roadmap

Working punch list for removing AI-slop patterns (cliché reframes, filler words, "badge"
framing) and strengthening E-E-A-T (first-hand parent voice, authoritative sourcing) across
footballparent.co.uk content. Phases ordered easiest/quickest first. Generated 2026-08-07.

Related rules already codified in `CLAUDE.md` Editorial rules section and
`memory/feedback_meta_description_slop_words.md` — don't reintroduce "honest", "independent",
self-referential "guide for parents" framing, or "Not all X are equal" openers when fixing
these.

## Phase 0 — Fix live meta-tag drift (DONE 2026-08-07)
Discovered while starting Phase 1: `page.tsx`'s `generateSEO()` description (the actual live
`<meta name="description">` tag) had drifted from the already-rewritten MDX frontmatter
description on 32 articles — the exact bug CLAUDE.md already warned about, recurring. Fixed by
syncing all 32 `page.tsx` descriptions to their MDX frontmatter, after first removing slop
words ("honest", "independent") and an em dash from 4 of the frontmatter descriptions
themselves (`development-centres-vs-academies`, `how-to-become-a-professional-footballer`,
`what-is-the-junior-premier-league`, `how-football-clubs-recruit-young-players`) so the bad
copy wasn't promoted to a live meta tag. Verified 0 mismatches across all 71 articles after.

- [x] academy-categories-explained
- [x] development-centres-vs-academies
- [x] football-development-centres-in-london
- [x] football-scholarships-uk
- [x] how-much-does-academy-football-cost
- [x] how-to-join-a-football-academy
- [x] premier-league-development-centres-list
- [x] understanding-academy-release
- [x] what-age-do-football-academies-recruit
- [x] what-is-eppp
- [x] football-trials-near-me
- [x] how-football-clubs-recruit-young-players
- [x] what-happens-at-academy-trials
- [x] build-confidence-young-footballers
- [x] how-to-become-a-professional-footballer
- [x] improve-football-decision-making
- [x] is-private-football-coaching-worth-it
- [x] late-developers-in-football
- [x] playing-up-an-age-group-football
- [x] relative-age-effect-football
- [x] best-football-boots-for-wide-feet-kids
- [x] best-football-gloves-for-winter-training
- [x] best-shin-pads-for-kids-football
- [x] emerging-talent-centres-explained
- [x] girls-academy-vs-grassroots-football
- [x] girls-football-trials
- [x] late-developers-in-girls-football
- [x] what-age-do-girls-football-academies-recruit
- [x] futurefit-football-dna-interview-part-1
- [x] futurefit-football-dna-interview-part-2
- [x] what-is-the-junior-premier-league
- [x] what-to-say-after-football-matches

## Phase 1 — Category card sync (mechanical, DONE 2026-08-07)
Card text on category pages still shows old generic copy; sync each to the article's already-
rewritten frontmatter `description`.

**Mid-phase discovery:** while syncing, found the self-referential "guide" framing (the same
banned pattern as "honest"/"independent") sitting unnoticed in 13 already-"rewritten" source
descriptions ("A clear guide to...", "This guide helps parents...", "A guide for football
parents on..."), including a few already promoted to live meta tags in Phase 0. Fixed all 13 at
the MDX source, re-synced the affected `page.tsx` meta tags, and fixed the 2 category cards that
had already picked up the bad text before the fix: `football-development-centres-in-london`,
`premier-league-development-centres-list`, plus `football-scholarships-uk`,
`understanding-academy-release`, `pre-academy-football`, `what-happens-at-academy-trials` (guide
framing), `playing-up-an-age-group-football`, `relative-age-effect-football`,
`best-football-gloves-for-winter-training`, `emerging-talent-centres-explained`,
`what-is-grassroots-football`, `football-trials-near-me`, `what-to-say-after-football-matches`.
Lesson: don't treat existing frontmatter copy as pre-vetted just because it predates this
roadmap — rescan it against the slop-word rules before promoting/syncing it anywhere.

**Second mid-phase discovery:** a follow-up sweep for other self-appointed quality adjectives
("practical", "clear", "straightforward" used to describe the article itself rather than the
subject matter) found 9 more instances, 2 of them in cards that had never been touched by any
sync pass (`build-confidence-young-footballers`, `why-isnt-my-child-improving-at-football`,
plus a leftover "A clear guide for UK parents." on the `what-is-grassroots-football` card).
Fixed all 9 at the MDX source, re-synced `page.tsx`, and fixed all affected cards. Left one
legitimate use of "straightforward" (`how-players-progress-through-football-development-centres`
— describes the subject's difficulty, not the article's quality) and one functional "is useful
if..." Start Here link caption, both judged not to be the self-congratulatory pattern.
`npm run build` verified clean after all of Phase 0 + Phase 1.

### Academy Pathway
- [x] How Academy Football Works
- [x] Development Centres vs Academies
- [x] How to Join a Football Academy
- [x] What Age Do Football Academies Recruit?
- [x] Understanding Academy Release
- [x] How Players Progress Through Football Development Centres
- [x] Premier League Development Centres
- [x] Football Development Centres in London
- [x] Football Scholarships UK
- [x] Can Academy Players Play Grassroots Football?
- [x] What Is Pre-Academy Football?
- [x] How Much Does Academy Football Cost?

### Academy Trials
- [x] Football Academy Trials in the UK
- [x] What Happens at Academy Trials
- [x] What Do Academy Coaches Look For?
- [x] How Football Clubs Recruit Young Players

### Football Development
- [x] How to Become a Professional Footballer
- [x] Is My Child Ready for Academy Football?
- [x] How Much Training Is Too Much?
- [x] Improve Football Decision Making
- [x] Good Football Development Environment
- [x] Late Developers in Football
- [x] Relative Age Effect in Football
- [x] What Is Football IQ?
- [x] Is Private Football Coaching Worth It?

### Football Gear
- [x] Best Football Gloves for Winter Training
- [x] Football Sizes by Age
- [x] Best Football Boots for Wide Feet Kids
- [x] Best Shin Pads for Kids Football

### Girls Football
- [x] How Girls Football Academies Work
- [x] Emerging Talent Centres Explained
- [x] Girls Football Trials
- [x] Girls Academy vs Grassroots Football
- [x] Late Developers in Girls Football
- [ ] What Age Do Girls Football Academies Recruit?

### Parent Guides
- [ ] Should You Leave Grassroots Football for an Academy?
- [ ] What is the Junior Premier League? *(fix "independent guide" in the source description first)*
- [ ] JPL vs Grassroots Football
- [ ] Are Football Development Centres Worth It?
- [ ] What to Say After Football Matches
- [ ] FutureFit Interview Part 1
- [ ] FutureFit Interview Part 2

## Phase 2 — Kill the "badge" cliché
Sentence-level rewrite; each article leans on "it's not about the badge" as a stock device.
- [ ] how-much-does-academy-football-cost
- [ ] football-development-centres-near-me
- [ ] premier-league-development-centres-list
- [ ] how-to-join-a-football-academy
- [ ] what-is-the-junior-premier-league
- [ ] jpl-vs-grassroots-football
- [ ] girls-academy-vs-grassroots-football
- [ ] how-to-become-a-professional-footballer
- [ ] what-is-grassroots-football

## Phase 3 — Strip "honestly" filler
Word-level edit; "honestly" used as a filler adverb, 2+ times per article.
- [ ] what-is-the-junior-premier-league
- [ ] how-to-join-a-football-academy
- [ ] girls-academy-vs-grassroots-football
- [ ] signs-your-child-is-ready-for-academy-football
- [ ] are-football-development-centres-worth-it
- [ ] how-much-does-academy-football-cost
- [ ] development-centres-vs-academies
- [ ] relative-age-effect-football
- [ ] biggest-football-parent-mistakes
- [ ] chelsea-fc-development-centre-guide

## Phase 4 — Remove reframe / negative-parallelism patterns
"It isn't X. It's Y.", "X matters far less than Y", "Focus on Y, not X" and similar fake-depth
contrast shortcuts.
- [ ] build-confidence-young-footballers
- [ ] how-to-become-a-professional-footballer
- [ ] signs-your-child-is-ready-for-academy-football
- [ ] is-private-football-coaching-worth-it
- [ ] how-much-does-academy-football-cost
- [ ] are-football-development-centres-worth-it
- [ ] uk-football-development-centres-explained
- [ ] how-to-get-scouted-for-football
- [ ] how-girls-football-academies-work
- [ ] how-to-join-a-football-academy
- [ ] development-centres-vs-academies

*(Phases 2-4 overlap heavily — do them as one combined pass per article rather than three
separate file-opens.)*

## Phase 5 — Add real first-hand voice + sourcing (E-E-A-T)
The substantive rewrite work: a "Football Parent note" callout, genuine first-hand parent
detail, or an authoritative FA/NSPCC/UK Coaching-type citation. Sub-ordered by how much other
work is already stacked on the same file.

### 5A — Already touched in 3+ earlier phases (do first)
- [ ] how-much-does-academy-football-cost
- [ ] how-to-join-a-football-academy
- [ ] signs-your-child-is-ready-for-academy-football
- [ ] are-football-development-centres-worth-it
- [ ] football-development-centres-near-me
- [ ] uk-football-development-centres-explained
- [ ] how-to-become-a-professional-footballer
- [ ] what-is-the-junior-premier-league

### 5B — Touched in 1-2 earlier phases
- [ ] jpl-vs-grassroots-football
- [ ] how-football-clubs-recruit-young-players
- [ ] best-football-boots-for-wide-feet-kids
- [ ] best-shin-pads-for-kids-football
- [ ] arsenal-development-centre-guide
- [ ] how-players-progress-through-football-development-centres
- [ ] how-to-get-scouted-for-football
- [ ] how-girls-football-academies-work
- [ ] build-confidence-young-footballers
- [ ] is-private-football-coaching-worth-it
- [ ] biggest-football-parent-mistakes
- [ ] chelsea-fc-development-centre-guide

### 5C — Not touched by any earlier phase (clean E-E-A-T-only fix)
- [ ] academy-categories-explained
- [ ] can-academy-players-play-grassroots-football
- [ ] crystal-palace-development-centre-guide
- [ ] football-scholarships-uk
- [ ] how-to-find-a-football-agent-for-your-child
- [ ] pre-academy-football
- [ ] west-ham-player-pathway-guide
- [ ] what-age-do-football-academies-recruit
- [ ] what-is-eppp
- [ ] football-academy-trials-uk
- [ ] how-football-scouts-identify-players
- [ ] what-do-academy-coaches-look-for
- [ ] bio-banding-football
- [ ] new-fa-youth-football-format
- [ ] ag-vs-fg-boots
- [ ] best-football-gloves-for-winter-training
- [ ] veo-camera-alternatives
- [ ] futurefit-football-dna-interview-part-2 *(different fix — interview format, may just need an editor framing line rather than a personal anecdote)*
- [ ] what-qualifications-do-i-need-to-be-a-football-coach
- [ ] late-developers-in-football

## Coverage
42 category cards + 40 of 71 articles touched somewhere in Phases 2-5.
