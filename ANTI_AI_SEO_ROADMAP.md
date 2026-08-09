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
- [x] What Age Do Girls Football Academies Recruit?

### Parent Guides
- [x] Should You Leave Grassroots Football for an Academy?
- [x] What is the Junior Premier League?
- [x] JPL vs Grassroots Football
- [x] Are Football Development Centres Worth It?
- [x] What to Say After Football Matches
- [x] FutureFit Interview Part 1
- [x] FutureFit Interview Part 2

## Phase 2 — Kill the "badge" cliché (DONE 2026-08-07)
Sentence-level rewrite; each article leaned on "it's not about the badge" as a stock device.
First attempt just word-swapped "badge" for "name"/"club" while keeping the identical "X matters
more than Y" comparison skeleton across all nine - rejected as not actually fixing the pattern.
Redone properly: 7 sentences were pure redundant restatement and got deleted outright rather
than rewritten (the point was already made in the surrounding sentences); the other 6 carried
real information and got restructured into genuinely different shapes (a direct instruction, an
actionable question, a causal statement) rather than a find-replace on the trigger word.
- [x] how-much-does-academy-football-cost *(deleted)*
- [x] football-development-centres-near-me *(rewritten)*
- [x] premier-league-development-centres-list *(rewritten, both instances)*
- [x] how-to-join-a-football-academy *(deleted)*
- [x] what-is-the-junior-premier-league *(1 rewritten, 1 deleted, 1 rewritten - 3 instances)*
- [x] jpl-vs-grassroots-football *(rewritten opener, deleted closer)*
- [x] girls-academy-vs-grassroots-football *(deleted, both instances)*
- [x] how-to-become-a-professional-footballer *(deleted)*
- [x] what-is-grassroots-football *(trimmed in place)*

## Phase 3 — Strip "honestly" filler (DONE 2026-08-07)
Word-level edit; "honestly" used as a filler adverb.

**Data correction on start:** the original list above was built from a combined regex count
(honestly + badge + other patterns together), not "honestly" alone — `what-is-the-junior-premier-league`
had zero actual "honestly" instances and shouldn't have been listed; `are-football-development-centres-worth-it`,
`how-much-does-academy-football-cost`, and `chelsea-fc-development-centre-guide` each had 1, not 2+.
A clean count found **19 instances across 13 files**. Since each fix is a trivial one-word
removal either way, all 19 were fixed rather than stopping at the original (wrong) 2+ threshold.
Mostly plain deletion; a natural substitute word ("directly", "carefully", "realistically", "in
good faith") was used wherever bare deletion left the sentence flat.
- [x] signs-your-child-is-ready-for-academy-football (2)
- [x] development-centres-vs-academies (2)
- [x] how-to-join-a-football-academy (2)
- [x] relative-age-effect-football (2)
- [x] biggest-football-parent-mistakes (2)
- [x] girls-academy-vs-grassroots-football (2)
- [x] leave-grassroots-football-for-an-academy (1)
- [x] are-football-development-centres-worth-it (1)
- [x] football-development-centres-in-london (1)
- [x] how-much-does-academy-football-cost (1)
- [x] football-scholarships-uk (1)
- [x] chelsea-fc-development-centre-guide (1)
- [x] why-isnt-my-child-improving-at-football (1)

## Phase 4 — Remove reframe / negative-parallelism patterns (DONE 2026-08-07)
"It isn't X. It's Y.", "X matters far less than Y", "Focus on Y, not X" and similar fake-depth
contrast shortcuts.

**Two items dropped as false positives on re-check:** `development-centres-vs-academies` had no
matching sentence left in the body (likely already resolved via the Phase 0/1 wording fixes);
`how-girls-football-academies-work`'s flagged text was only in the meta description, which
states a plain factual difference rather than performing the banned reject-then-reveal device,
so it was left alone. **Two items added mid-phase:** `are-football-development-centres-worth-it`
also still had a literal "badge" mention that Phase 2's search missed (a personal-voice
paragraph doing double duty as a Phase 4 violation); `football-scholarships-uk` and
`what-to-say-after-football-matches` were new catches (the "name of the club attached to them" /
"isn't about X, it's Y" variants respectively) not on the original list. A broad site-wide sweep
for "matters more/less than" turned up 30+ additional instances, nearly all of which are
legitimate substantive comparatives, not the banned rhetorical device — those were deliberately
left alone rather than flattening normal comparison-based writing.
- [x] build-confidence-young-footballers
- [x] how-to-become-a-professional-footballer
- [x] signs-your-child-is-ready-for-academy-football
- [x] is-private-football-coaching-worth-it
- [x] are-football-development-centres-worth-it *(also had the missed "badge" mention)*
- [x] uk-football-development-centres-explained
- [x] how-to-get-scouted-for-football
- [x] how-to-join-a-football-academy
- [x] football-scholarships-uk *(new catch)*
- [x] what-to-say-after-football-matches *(new catch)*

## Phase 5 — Add real first-hand voice + sourcing (E-E-A-T)
The substantive rewrite work: a "Football Parent note" callout, genuine first-hand parent
detail, or an authoritative FA/NSPCC/UK Coaching-type citation. Sub-ordered by how much other
work is already stacked on the same file.

### 5A — Already touched in 3+ earlier phases (DONE 2026-08-08)
Before starting the articles, built the tooling this phase actually needed: new
`<ParentNote>` (blue) and `<ExpertOpinion>` (amber) MDX components; sourcing-density
(~2 external citations/1000 words, no source linked twice) and callout-minimum (2
callouts, or 1 + a logged pending request) rules in the article skill; a reusable
expert-quote + parent-story library (`expert-quotes.md`) seeded from the FutureFit/Paul
Barry interview and Graham's own trimmed material; and a SQLite-backed content-status
tracker (`content-backlog.ts`) measuring `voice_pct` — words inside callout tags as a
percentage of body word count, computed automatically, not estimated — against a 10%
floor (explicitly a minimum we intend to raise later, not a ceiling).

Both rules got real judgement carve-outs, not blanket enforcement: an article with
genuine first-person voice already woven into unmarked body prose doesn't need
sentences extracted into callout boxes just to hit the count, and experiential/opinion
articles don't need a citation forced onto a claim that doesn't need one. Every
external citation was live-fetched and confirmed before use (caught one stale NSPCC
CPSU URL mid-phase — now fixed in the skill reference). Real quotes/anecdotes were
verified word-for-word against source before use, and Graham signed off on quote
reuse and any reframing before it went in the article.

- [x] how-much-does-academy-football-cost — 3 Parent Notes, 2 external citations
  (Premier League EPPP, Parent Hub). voice_pct 7.7%, left under the 10% floor
  deliberately rather than padded further.
- [x] how-to-join-a-football-academy — 1 Expert Opinion (Paul Barry) + 1 pending
  expert-quote request logged (trials/misconceptions, expert TBD), 3 external
  citations. voice_pct 5.2%, left under floor pending that request.
- [x] signs-your-child-is-ready-for-academy-football — 2 Parent Notes + 1 Expert
  Opinion, 2 external citations (peer-reviewed RAE study, England Football UEFA B
  licence page). voice_pct 12.1%, over the floor.
- [x] are-football-development-centres-worth-it — no changes: already had genuine
  first-person parent voice woven through the body prose (Palace vs Chelsea,
  coach ratios, curriculum, friendships), so formal callout extraction and forced
  citations were both deliberately skipped as the exception the new rules allow for.
- [x] football-development-centres-near-me — directory/listing page (35+ official
  club links), not a discursive article, so already over-provisioned on sourcing by
  design. 1 genuine Parent Note added (group consistency between two real
  development centres). voice_pct 5.6%, structurally handicapped by the non-prose
  directory format, left under floor as lowest priority to revisit.
- [x] uk-football-development-centres-explained — 2 Parent Notes (trial/tier
  process at Chelsea vs Palace; coach rapport + inconsistent FA four-corner
  feedback forms), 3 external citations (EPPP categories, U9 registration rule,
  DBS checks). voice_pct 4.6% → 10.3%, over the floor. Also fixed while in the
  file: 2 orphaned TOC entries with no matching body heading, 1 banned AI-slop
  phrase ("It's important to remember"), 1 duplicate FAQ that also used the
  banned reframe pattern.
- [x] how-to-become-a-professional-footballer — replaced an old pre-component
  blockquote (used the banned "shouldn't be X, it should be Y" reframe pattern
  and read as generic advice) with a genuine Parent Note, plus 1 Expert Opinion
  (2nd reuse of the Paul Barry technique-before-tactics quote) and 1 external
  citation fixing a previously uncited research claim. voice_pct 8.6%, left under
  floor deliberately.
- [x] what-is-the-junior-premier-league — 2 external citations added (England
  Football youth format guidance, EPPP). Voice deliberately deferred: no personal
  JPL experience, no Paul Barry quote fits (unrelated topic) — a real JPL
  interview is coming up and is the genuine source to wait for.

### 5B — Touched in 1-2 earlier phases (DONE 2026-08-08)

Same tooling and rules as 5A. Three articles turned out to already have
genuine, substantial first-person voice sitting unmarked in body prose
(`biggest-football-parent-mistakes`, `build-confidence-young-footballers`,
and partially `chelsea-fc-development-centre-guide`) - per the exception
carve-out, that voice was left in place rather than force-extracted, and
formal `<ParentNote>`/`<ExpertOpinion>` callouts were added alongside it as
new value rather than a re-statement. One quote reuse was proposed and
rejected: the "technique before tactics" Paul Barry quote for
`how-to-get-scouted-for-football` was judged too much of a stretch from its
original context (a general tactics-timing question, not scouting) - left
unused, voice deferred on that article instead. Three articles had no
personal material available and no expert quote that genuinely fit
(`how-to-get-scouted-for-football`, `best-football-boots-for-wide-feet-kids`,
`best-shin-pads-for-kids-football`), plus `how-girls-football-academies-work`
(no personal experience of the girls' pathway) and
`jpl-vs-grassroots-football` (deferred pending a real JPL interview, same
call as `what-is-the-junior-premier-league` in 5A) - all four left with
voice deliberately deferred rather than padded. Two pre-existing bugs fixed
while in the files: `build-confidence-young-footballers` had a broken FAQ
heading (missing the space after `##`, so it wasn't rendering as a heading
at all) and a frontmatter `sections` list with a missing entry and a
duplicate; `best-football-boots-for-wide-feet-kids` was missing its
`## Related Articles` heading and TOC entry entirely. `npm run build`
verified clean after all 5B changes.

- [x] jpl-vs-grassroots-football — voice deferred (no personal JPL-vs-
  grassroots story yet, Graham wants to wait for a real JPL interview).
  Sourcing already adequate (3 citations from the original write), no
  changes made.
- [x] how-football-clubs-recruit-young-players — 1 Parent Note (Graham's
  real open-day trial experience), 2 external citations (EPPP, Premier
  League parent-hub scout verification). voice_pct 2.7%, left under floor.
- [x] best-football-boots-for-wide-feet-kids — no personal material, no
  expert quote fits gear topics, voice deferred. Fixed missing Related
  Articles heading/TOC entry.
- [x] best-shin-pads-for-kids-football — no personal material, voice
  deferred. Added IFAB Law 4 shin-guard citation for the mandatory-
  equipment claim.
- [x] arsenal-development-centre-guide — 1 Parent Note (trimmed, club-
  agnostic reuse - no Arsenal-specific experience available), 2 external
  citations (EPPP, player welfare). voice_pct 1.3%, left under floor.
- [x] how-players-progress-through-football-development-centres — 1 Parent
  Note (Chelsea/Palace open-trial tiers, 2nd reuse), 1 external citation
  (Premier League parent-hub review process). voice_pct 8.3%.
- [x] how-to-get-scouted-for-football — no personal material; declined
  reusing the technique-before-tactics Paul Barry quote as too much of a
  stretch. Voice deferred. Added Premier League parent-hub (scout
  verification) citation.
- [x] how-girls-football-academies-work — voice deferred, no personal
  experience of the girls' pathway. Already well sourced (6 citations), no
  changes needed.
- [x] build-confidence-young-footballers — replaced a generic un-storied
  "Football Parent Note" section with Graham's real clenched-fists/self-
  recognition story, added a Paul Barry "embracing chaos" Expert Opinion,
  2 peer-reviewed citations plus a Grassroots Code citation. voice_pct
  4.6% (plus pre-existing unmarked first-person voice in 3 other places,
  left as-is per the exception rule).
- [x] is-private-football-coaching-worth-it — 1 Parent Note (Graham's real
  small-group vs 1-to-1 answer), 1 external citation (FA Youth Development
  Phase, deliberate practice vs unstructured play). voice_pct 4.1%, left
  under floor.
- [x] biggest-football-parent-mistakes — already had extensive genuine
  unmarked first-person voice throughout the body (exception case, not
  extracted). Added the "adults find it difficult to relinquish control"
  Paul Barry Expert Opinion, transparent in the article about its original
  context (clubs gaming the 3v3 format, not touchline behaviour) per
  Graham's sign-off, plus a Silent Support Weekend citation. voice_pct
  measures 2.9% via tags only; the real figure is much higher unmarked.
- [x] chelsea-fc-development-centre-guide — formalised Graham's existing
  unmarked PTC/PDC/PPC progression story into a proper Parent Note (kept
  distinct from the open-trial-tiers story used elsewhere, to avoid
  duplicating the same real experience across two articles), 2 external
  citations (EPPP, compensation rules). voice_pct 5.2%.

### 5C — Not touched by any earlier phase (clean E-E-A-T-only fix)
- [x] late-developers-in-football — already had two genuine, substantial coaching-experience
  ParentNotes (the "Modric-esque slight midfielder" story and the "later developers read
  the game better" note) that predate this checklist and were never logged. real_voice_pct
  10.9%, over the floor. No changes needed, checklist corrected 2026-08-09.
- [x] futurefit-football-dna-interview-part-2 — interview Q&A format, not a standard
  article. Views are already explicitly attributed to Paul Barry throughout plus a
  dedicated Editor's Note at the bottom. The tracker's "unmarked voice" flags are the
  existing "Football Parent perspective" editorial commentary boxes, not missing personal
  anecdote - forcing a Graham anecdote into an expert interview would misattribute voice
  that isn't his. Resolved without changes, 2026-08-09.
- [x] crystal-palace-development-centre-guide — trimmed open-trial-tiers ParentNote
  (3rd/final use) + new Tier 1 workbook ParentNote (Group A, 2026-08-09)
- [x] west-ham-player-pathway-guide — club-agnostic coaching-quality ParentNote,
  2nd use of Arsenal's story (Group A, 2026-08-09)
- [x] football-academy-trials-uk — Chelsea open-day trial ParentNote, 2nd use
  (Group A, 2026-08-09)
- [x] new-fa-youth-football-format — Paul Barry ExpertOpinion (bigger pitches =
  fewer touches), 1st use; trimmed an uncited "in our experience" line
  (Group A, 2026-08-09)
- [x] football-scholarships-uk — reviewed, already adequately sourced (3
  citations); voice deferred, no personal fit at scholarship age 16-18
  (Group B, 2026-08-09)
- [x] how-to-find-a-football-agent-for-your-child — added citation for the
  agent commission cap claim (previously uncited); voice deferred, no
  personal fit (Group B, 2026-08-09)
- [x] what-is-eppp — reviewed, already well sourced (4 citations, Useful
  Sources section); voice deferred (Group B, 2026-08-09)
- [x] ag-vs-fg-boots — added citation for boot/turf injury risk claim
  (article had zero external citations); voice deferred, gear topic
  (Group B, 2026-08-09)
- [x] best-football-gloves-for-winter-training — added citation for
  cold-hands/dexterity claim (zero external citations previously); voice
  deferred, gear topic (Group B, 2026-08-09)
- [x] veo-camera-alternatives — reviewed, already excellently sourced
  (10+ citations); no changes needed (Group B, 2026-08-09)
- [ ] academy-categories-explained *(Group C — needs Graham's real material)*
- [ ] can-academy-players-play-grassroots-football *(Group C)*
- [ ] pre-academy-football *(Group C)*
- [ ] what-qualifications-do-i-need-to-be-a-football-coach *(Group C)*
- [ ] what-age-do-football-academies-recruit *(Group C, weaker fit — may end
  up citation-only)*
- [ ] how-football-scouts-identify-players *(Group C — "technique before
  tactics" reuse declined, fresh expert-quote request logged instead)*
- [ ] what-do-academy-coaches-look-for *(Group C — same as above)*
- [ ] bio-banding-football *(voice left deferred — quote fit too weak per
  Graham's call, 2026-08-09)*

## Coverage
42 category cards + 40 of 71 articles touched somewhere in Phases 2-5.
20 articles remain in Phase 5C (not yet touched by any earlier phase).
