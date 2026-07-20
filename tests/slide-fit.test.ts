import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSlideFit, SlideFitInput } from "../lib/instagram/slide-fit";

function fit(input: SlideFitInput) {
  return checkSlideFit(input);
}

// ---------------------------------------------------------------------------
// single-slide-core (jokes, format='single')
// ---------------------------------------------------------------------------

test("single-slide-core: a normal setup/punch joke fits", () => {
  const r = fit({
    label: "joke",
    renderer: "single-slide-core",
    slideKind: "joke",
    head: "Football parents don't have weekends.",
    body: "We have fixtures.",
  });
  assert.equal(r.renderer, "single-slide-core");
  assert.equal(r.fits, true);
});

test("single-slide-core: a wall of text overflows even at the shrink-to-fit floor", () => {
  const wallOfText = Array.from({ length: 40 }, (_, i) => `sentence number ${i} about football parents on the sideline`).join(". ");
  const r = fit({ label: "joke", renderer: "single-slide-core", slideKind: "joke", head: wallOfText, body: wallOfText });
  assert.equal(r.fits, false);
  assert.match(r.detail, /OVERFLOWS/);
});

// ---------------------------------------------------------------------------
// reel-core (education reels, joke carousels) - fixed font size, head+body
// measured at their OWN sizes and combined against one real budget.
// ---------------------------------------------------------------------------

test("reel-core hook: a short two-line hook (headline + embedded subtext) fits", () => {
  const r = fit({
    label: "hook",
    renderer: "reel-core",
    slideKind: "hook",
    head: "Category 1 to 4 doesn't mean what most parents think.\nThe number tells you something else entirely.",
  });
  assert.equal(r.fits, true);
});

test("reel-core hook: many sentences crammed into one hook overflows", () => {
  const longHook = Array.from({ length: 15 }, (_, i) => `This is sentence ${i} of an extremely long hook headline that keeps going on and on`).join(". ");
  const r = fit({ label: "hook", renderer: "reel-core", slideKind: "hook", head: longHook });
  assert.equal(r.fits, false);
});

test("reel-core content: a real Phase F-shaped point (short head, two-sentence body) fits", () => {
  // This is the exact shape that previously false-failed QC (12-17 "lines")
  // when the adapter concatenated head+body and measured both at the
  // headline font size - see copy-qc-adapter.ts's module comment.
  const r = fit({
    label: "point 1",
    renderer: "reel-core",
    slideKind: "content",
    head: "Category 1: the top tier",
    body: "Usually Premier League and some Championship clubs. The most contact hours, full-time coaches across every age phase, top facilities and formal education support.",
  });
  assert.equal(r.fits, true);
});

test("reel-core content: short head but a very long body overflows - body is measured, not ignored", () => {
  const longBody = Array.from({ length: 12 }, (_, i) => `This is a long supporting sentence number ${i} that keeps adding more detail than a slide can hold`).join(". ");
  const r = fit({ label: "point", renderer: "reel-core", slideKind: "content", head: "Short head", body: longBody });
  assert.equal(r.fits, false);
});

test("reel-core content: a slide with no body measures head alone", () => {
  const r = fit({ label: "point", renderer: "reel-core", slideKind: "content", head: "Short head, no body" });
  assert.equal(r.fits, true);
  assert.ok((r.headLines ?? 0) <= 2);
});

test("reel-core: 'cta' kind is measured the same as 'content' (classic style draws brand.ctaLines instead of slide.body under real 'cta', so real per-slide content must be routed through 'content' - see copy-flow.ts's joke-carousel closing slide)", () => {
  const input = { label: "closing", head: "FOOTBALL PARENTS ARE A DIFFERENT BREED.", body: "Send this to the parent who definitely yelled it this weekend." };
  const asCta = fit({ ...input, renderer: "reel-core", slideKind: "cta" });
  const asContent = fit({ ...input, renderer: "reel-core", slideKind: "content" });
  assert.equal(asCta.fits, asContent.fits);
  assert.equal(asCta.headLines, asContent.headLines);
});

// ---------------------------------------------------------------------------
// expert-quote-core (interviews) - shrink-to-fit, previously never checked
// at all (qc-fit.ts only knew reel-core's layout).
// ---------------------------------------------------------------------------

test("expert-quote-core cover-question: a real Phase F hook fits", () => {
  const r = fit({
    label: "hook",
    renderer: "expert-quote-core",
    slideKind: "cover-question",
    head: "3v3 can give a child up to 6 times more touches than 7v7",
    body: "And Paul says the touch count isn't even the biggest change.",
  });
  assert.equal(r.renderer, "expert-quote-core");
  assert.equal(r.fits, true);
});

test("expert-quote-core cover-question: an extremely long headline overflows even at the shrink-to-fit floor", () => {
  const longHeadline = Array.from({ length: 10 }, (_, i) => `reason number ${i} why this headline is far too long for a cover slide`).join(", ");
  const r = fit({ label: "hook", renderer: "expert-quote-core", slideKind: "cover-question", head: longHeadline });
  assert.equal(r.fits, false);
});

test("expert-quote-core bio: a ~15-word shortened bio fits", () => {
  const r = fit({
    label: "bio",
    renderer: "expert-quote-core",
    slideKind: "bio",
    head: "Head of Coaching at Football DNA. UEFA A Licence, 25+ years across grassroots and academy football.",
  });
  assert.equal(r.fits, true);
});

test("expert-quote-core bio: the full ~100-word supplied bio (not yet shortened) overflows - this is exactly why F must shorten it", () => {
  const fullBio =
    "Paul Barry is Head of Coaching, Content & Club Support. He holds the UEFA A Licence, the FA Advanced Youth Award (U5-11s) and has more than 25 years' experience across grassroots and academy football. During his career he has worked with Southend United, Arsenal and Crystal Palace, where he served as Head of Coaching. He also worked as a Coach and Mentor for The Football Association through the FA Skills Programme, and has delivered coach education across multiple County FAs and grassroots club environments throughout his career.";
  const r = fit({ label: "bio", renderer: "expert-quote-core", slideKind: "bio", head: fullBio });
  assert.equal(r.fits, false);
});

test("expert-quote-core qa: a real verbatim Paul Barry quote (context + quote pair) fits", () => {
  const r = fit({
    label: "slide 2",
    renderer: "expert-quote-core",
    slideKind: "qa",
    head: "Shrink the game to 3v3 and the maths changes completely.",
    body: "A child makes more decisions in a single 10 minute 3v3 game than they would in an entire half of a standard 5v5 match.",
  });
  assert.equal(r.fits, true);
});

test("expert-quote-core qa: a long context line leaves less room for the answer - the two boxes are NOT independent", () => {
  // Same answer text, two different context lines - a longer context (more
  // wrapped lines within its own 210px box, or a genuinely huge one) can
  // only ever shrink or hold steady the room left for the answer, never
  // grow it, because yAfterQ is computed FROM qf.height.
  const answer =
    "A child makes more decisions in a single 10 minute 3v3 game than they would in an entire half of a standard 5v5 match, guaranteeing between 100 to 150 touches per game.";
  const shortQ = fit({ label: "short-q", renderer: "expert-quote-core", slideKind: "qa", head: "Short.", body: answer });
  const longQ = fit({
    label: "long-q",
    renderer: "expert-quote-core",
    slideKind: "qa",
    head: "This is a considerably longer piece of context framing that will wrap across more lines before the quote even begins.",
    body: answer,
  });
  assert.ok(shortQ.fits, "short context + this answer should fit");
  // The longer context consumes more of the shared vertical space, so it
  // must never leave MORE room for the answer than the short one did.
  assert.ok((longQ.detail.match(/vs (\d+)px available/) ?? [])[1] !== undefined);
  assert.ok((shortQ.detail.match(/vs (\d+)px available/) ?? [])[1] !== undefined);
  const longBudget = Number((longQ.detail.match(/vs (\d+)px available/) as RegExpMatchArray)[1]);
  const shortBudget = Number((shortQ.detail.match(/vs (\d+)px available/) as RegExpMatchArray)[1]);
  assert.ok(longBudget <= shortBudget, `expected long-context budget (${longBudget}) <= short-context budget (${shortBudget})`);
});

test("expert-quote-core qa: an excessively long answer overflows", () => {
  const longAnswer = Array.from({ length: 10 }, (_, i) => `This is sentence number ${i} of a quote that has been allowed to run on for far too long`).join(". ");
  const r = fit({ label: "slide", renderer: "expert-quote-core", slideKind: "qa", head: "Short context.", body: longAnswer });
  assert.equal(r.fits, false);
});
