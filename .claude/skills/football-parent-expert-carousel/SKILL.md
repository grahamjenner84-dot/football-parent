---
name: football-parent-expert-carousel
description: Harvests a published Football Parent expert interview into 2-3 Instagram Expert Opinion carousels, one angle each, aimed at aspiring parents or coaches, using the expert's exact words, saved to the builder's "Saved posts" list with captions. Use when Graham asks for expert Instagram posts, carousel copy, slides or hooks from an interview, or at the end of the football-parent-expert-interview skill.
---

# Football Parent Expert Carousel

One interview becomes 2-3 separate carousels, each on its own angle, posted
a few weeks apart with the expert as an Instagram collaborator. Each post gets
shared to the expert's audience as well as ours, so each one has to stand on
its own and give a different reason to stop scrolling.

Output: entries in `public/expert-posts.json`. In the builder
(`/expert-quote-builder.html`), Graham picks one from "Saved posts" and every
slide, the expert's photo and logo, and the caption load in one go, on any
device.

## Graham's three rules (he has had to correct all three)

1. **Never change the expert's words.** Answers and the pull-quote are exact
   words from the interview. You may cut: take a sentence or two, drop a
   clause, and join the kept pieces with ` … `. You may not reword, reorder,
   swap a word, fix grammar, merge sentences or add anything. If the exact
   words don't make the point short enough, pick a different passage.
   `scripts/expert-post-check.ts` enforces this against the article.
2. **Short copy.** Cover 10 words max, questions 9, answers 35, quote 20,
   closing line 10, caption 600 characters. These are hard caps in the
   checker. Shorter is better: an answer of 15-25 words reads best on a slide.
3. **An interesting angle, for a named audience.** Every post is for one of
   Graham's two audiences:
   - **Parents** trying to help their child improve and get noticed or into an
     academy (aspiring families, not ones already inside an academy).
   - **Coaches**, mostly grassroots: sessions, player development, handling
     players and parents.

   An angle is interesting when that person would save it or send it on: it's
   specific, practical, or cuts against what they assume. It isn't
   interesting when it's general reassurance ("every child develops
   differently"), a summary of the interview, or only relevant to someone
   already in the system.

## Workflow

### 1. Read the whole interview

The source is the published article, `content/<category>/<slug>.mdx` (the
checker matches against it, so the article must exist first; if Graham only
has raw Q&As, run the `football-parent-expert-interview` skill first). Make
sure the expert is in `public/expert-presets.json`; if not, add them as that
skill describes.

### 2. Choose the angles

List every candidate angle in the interview, tag each **parents** or
**coaches**, and pick the 2-3 strongest that don't overlap. No answer passage
may appear in more than one post. Where the interview supports it, cover both
audiences across the set rather than three parent posts. If only one or two
angles pass the "would they save or send it" test, make one or two posts, not
three weak ones.

Before writing, check `public/expert-posts.json` for posts already made from
this interview so nothing is repeated.

### 3. Write each post

- **Cover question:** the angle as the worry or question the audience already
  has, in their words. One `*gold*` word. It's the hook on the grid and in the
  feed, so it carries the post.
- **Context line** (optional): who the expert is and what they're talking
  about, e.g. "Mindset coach Matt Baxter on the car ride home".
- **2-4 Q&As** on that angle only (3 is the default). The question is ours and
  may paraphrase. The answer is exact words (rule 1), with one `*gold*` word.
- **Pull-quote:** the single punchiest exact line on this angle, not
  repeating a Q&A answer in the same post.
- **Closing line:** tells this audience who to send it to ("Send this to your
  coaching WhatsApp group").
- **Caption:** a hook line, one or two lines on why it matters, credit the
  expert's handle, "Full interview: link in bio". No hashtag walls (3 at
  most), no em dashes, none of the slop phrases in CLAUDE.md's editorial rules.

### 4. Save to `public/expert-posts.json`

```json
{
  "id": "matt-baxter-bad-game",
  "label": "Matt Baxter 1/3: after a bad game (parents)",
  "expert": "matt-baxter",
  "article": "/parent-guides/matt-baxter-young-footballer-mindset-interview",
  "audience": "parents",
  "theme": "what to say after a bad game",
  "coverEyebrow": "Football Parent asks",
  "coverQuestion": "What do you say after a *bad* game?",
  "coverContext": "Mindset coach Matt Baxter on the car ride home",
  "qas": [{ "q": "…", "a": "exact words … exact words" }],
  "quote": "…",
  "cta": "…",
  "caption": "…",
  "collab": "@elitemindset_coaching"
}
```

`expert` is the preset id. `article` is the site path. `label` numbers the
set in posting order, strongest first, so the dropdown reads as a plan.
`collab` is the handle to invite as a collaborator (usually the preset's
handle); the builder shows it as a reminder under the caption.

Graham marks a post as posted in the builder (button under the caption), which
hides it from the dropdown on that device. To hide it on every device, add
`"posted": "YYYY-MM-DD"` to the entry. A posted entry is still a record of
what's been used: never reuse its answer passages in a new post.

### 5. Check, fix, look

```bash
npx tsx scripts/expert-post-check.ts <post-id> <post-id> --render <scratchpad dir>
```

Every post must PASS. Fix a verbatim failure by choosing different exact
words from the article, never by editing the words to fit. Fix length or fit
failures by cutting. Then look at the rendered cover and Q&A PNGs: the cover
is what shows on the grid, so check it reads at a glance.

### 6. Hand over

Show Graham each post's audience, angle and cover question, plus a posting
plan: posts roughly two to three weeks apart, alternating audiences where
possible, each with the expert invited as a collaborator. Commit the posts
file on its own; it only reaches his phone once it is live, so when he says
to put it live, merge to `main` and confirm the deploy (CLAUDE.md).
