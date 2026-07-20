// The SINGLE authoritative fit-measurement module for Phase F copy, covering
// all three render_payload shapes it produces:
//   - single-slide-core (joke, format='single')
//   - reel-core (education reels, joke carousels)
//   - expert-quote-core (interviews)
//
// Loads each renderer's real public/*-core.js file the same way
// lib/renderers/*-server.ts already does (manual CommonJS compile - see
// those files for why `require` can't be used), then calls THAT renderer's
// own exported text-measurement functions (fit/fitWords/countLines/words) -
// not a reimplementation of them - against the exact box geometry read out
// of each renderer's drawSlide/draw function. That geometry is duplicated
// here as constants (topY offsets, fixed budgets, per-field font sizes)
// because the renderers don't expose it as data, but the actual line-
// wrapping/shrink-to-fit MATH is always the renderer's own function, so if a
// renderer's text engine changes, this check changes with it.
//
// Two renderers use different fit strategies and this module models each
// correctly:
//   - reel-core: FIXED font size, wraps to N lines, no auto-shrink - true
//     failure is wrapping past the pixel budget (would visually collide
//     with the footer/handle, since drawSlide never clips).
//   - single-slide-core / expert-quote-core: SHRINK-TO-FIT - the renderer
//     itself reduces the font size (down to a floor) until the text fits a
//     fixed box. True failure is the text still not fitting even at that
//     floor size (returned height > the box).
//
// Used as the single source of truth by BOTH Phase F's pre-QC self-check
// (copy-flow.ts, before it writes/regenerates) and Phase D's QC gate
// (qc-fit.ts, which now delegates its reel-core measurement here rather
// than duplicating it - see that file's module comment).

import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";

function loadCoreModule(fileName: string) {
  const filePath = path.join(process.cwd(), "public", fileName);
  const src = fs.readFileSync(filePath, "utf8");
  const mod = new Module(filePath);
  mod.filename = filePath;
  mod.paths = (Module as unknown as { _nodeModulePaths: (p: string) => string[] })._nodeModulePaths(path.dirname(filePath));
  (mod as unknown as { _compile: (src: string, filename: string) => void })._compile(src, filePath);
  return mod.exports;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SingleSlideCore: any = loadCoreModule("single-slide-core.js");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReelCore: any = loadCoreModule("reel-core.js");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ExpertQuoteCore: any = loadCoreModule("expert-quote-core.js");

// Superset of every font any of the three renderers can reference (matches
// lib/renderers/reel-server.ts's FONT_FILES, which is itself already the
// superset of single-slide-server.ts's and expert-quote-server.ts's lists -
// all three renderers only ever use Anton/Archivo/Spline Sans Mono for the
// 'default'/classic templates Phase F targets, but registering the rest
// costs nothing and keeps this future-proof against a template change).
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_FILES: Array<[string, string?]> = [
  ["Anton-Regular.woff2", "Anton"],
  ["Archivo-Variable.woff2", "Archivo"],
  ["SplineSansMono-Variable.woff2", "Spline Sans Mono"],
  ["ArchivoBlack-Regular.woff2", "Archivo Black"],
  ["BarlowCondensed-ExtraBold.woff2", "Barlow Condensed"],
  ["BebasNeue-Regular.woff2", "Bebas Neue"],
  ["Montserrat-Black.woff2", "Montserrat"],
  ["Oswald-Bold.woff2", "Oswald"],
  ["Poppins-ExtraBold.woff2", "Poppins"],
  ["Teko-Bold.woff2", "Teko"],
  ["NotoEmoji-PointDown.woff2"],
];
let fontsRegistered = false;
function ensureFonts(): void {
  if (fontsRegistered) return;
  for (const [file, family] of FONT_FILES) {
    GlobalFonts.registerFromPath(path.join(FONTS_DIR, file), family);
  }
  fontsRegistered = true;
}

function getCtx(width: number, height: number): SKRSContext2D {
  ensureFonts();
  return createCanvas(width, height).getContext("2d");
}

export type Renderer = "single-slide-core" | "reel-core" | "expert-quote-core";

// slideKind meaning is renderer-specific:
//   single-slide-core: "joke" (the only kind Phase F produces - layout 'A'/dark)
//   reel-core: "hook" | "content" | "cta" | "quote" (cta measured identically
//     to content - see measureReelCore; classic-style cta ignores slide.head/
//     body entirely and draws brand.ctaUrl/ctaLines instead, so a payload
//     that puts real content on a 'cta' slide should use 'content' instead -
//     see copy-flow.ts's joke-carousel closing slide)
//   expert-quote-core: "cover-question" (hook, coverStyle='question') | "bio" | "qa"
export interface SlideFitInput {
  label: string;
  renderer: Renderer;
  slideKind: string;
  head: string;
  body?: string;
}

export interface SlideFitResult {
  label: string;
  renderer: Renderer;
  slideKind: string;
  fits: boolean; // hard: renders within the real safe-area budget for this renderer
  tight: boolean; // soft: fits, but close to the limit (near-minimum shrink-to-fit size, or near the wrapped-line cap)
  detail: string;
  // reel-core only (fixed font size, not shrink-to-fit) - structured
  // head-line-count data for callers that want a numeric line budget
  // rather than just a pass/fail (e.g. qc-fit.ts's legacy FitFinding shape,
  // which pre-dates head+body slides and only ever measured a single
  // headline-sized text field). Undefined for the two shrink-to-fit
  // renderers, where "how many lines" isn't the right question - the
  // renderer resizes the font instead of a fixed line budget.
  headLines?: number;
  headMaxLines?: number;
}

// ---------------------------------------------------------------------------
// single-slide-core (joke, layout 'A' / dark - the only layout Phase F uses)
// ---------------------------------------------------------------------------

function measureSingleSlideCore(label: string, head: string, body: string): SlideFitResult {
  const ctx = getCtx(SingleSlideCore.WIDTH, SingleSlideCore.HEIGHT);
  const S = SingleSlideCore.safe();
  // Mirrors drawDark()'s band geometry exactly - see public/single-slide-core.js.
  const bandTop = S.safeTop + 150;
  const bandBot = S.safeBottom - 260;
  const bandH = bandBot - bandTop;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paras = [SingleSlideCore.words(head), SingleSlideCore.words(body)].filter((p: any[]) => p.length);
  const f = SingleSlideCore.fit(ctx, paras, S.maxW, bandH, 120, 52, 1.02, 40);
  const fits = f.height <= bandH;
  const tight = fits && f.size <= 56; // shrunk to near the 52px floor - readable but cramped
  return {
    label,
    renderer: "single-slide-core",
    slideKind: "joke",
    fits,
    tight,
    detail: `shrink-to-fit chose ${f.size}px Anton, ${Math.round(f.height)}px tall vs ${Math.round(bandH)}px available${fits ? "" : " - OVERFLOWS even at the 52px minimum size"}`,
  };
}

// ---------------------------------------------------------------------------
// reel-core (education reels, joke carousels) - the 'default' built-in
// template (style='classic', font='Helvetica' via defaultLayout - the
// 'default' template has no layout overrides, so it's exactly
// defaultLayout(kind) - see public/reel-core.js's builtinTemplates()).
// Fixed font sizes, no auto-shrink: drawSlide never stops or clips, it just
// keeps drawing past the safe area if there's too much text, visually
// colliding with the footer/handle - so "fits" here means "stays within the
// real pixel budget before that collision point", the same definition the
// pre-existing qc-fit.ts used for headline-only content.
// ---------------------------------------------------------------------------

const REEL_WIDTH = 1080;
const REEL_HEIGHT = 1920;
// Mirrors scripts/render-seed-test-reel.ts's seeded brand margins, same
// defaults the old qc-fit.ts used (no per-post brand exists at QC time).
const REEL_MARGIN_X = 96;
const REEL_MARGIN_RIGHT = 96;
const REEL_MARGIN_BOTTOM = 220;
const REEL_HANDLE_BASELINE_OFFSET = 104; // fixed offset in drawSlide's handle line: H - 104 - marginBottom

let reelDefaultTemplate: unknown = null;
function getReelDefaultTemplate() {
  if (!reelDefaultTemplate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reelDefaultTemplate = (ReelCore.builtinTemplates(null) as any[]).find((t) => t.id === "default");
  }
  return reelDefaultTemplate;
}

function reelSafeBottomY(): number {
  return REEL_HEIGHT - REEL_HANDLE_BASELINE_OFFSET - REEL_MARGIN_BOTTOM;
}

function measureReelCore(label: string, slideKind: string, head: string, body: string | undefined): SlideFitResult {
  const template = getReelDefaultTemplate();
  // classic-style 'cta' ignores slide.head/body entirely (draws
  // brand.ctaUrl/brand.ctaLines instead) - measuring real content against
  // it would silently pass content the renderer would never draw. Treat it
  // as 'content' for measurement, matching the fix in copy-flow.ts that
  // routes real per-slide CTA text (the joke carousel's closing slide)
  // through kind='content' rather than 'cta'.
  const effectiveKind = slideKind === "cta" ? "content" : slideKind === "hook" ? "hook" : "content";
  const layout = ReelCore.resolveLayout(effectiveKind, template);
  const fontStack = ReelCore.fontStack(layout.font);
  const headWeight = ReelCore.headWeight(layout.font);

  const ctx = getCtx(REEL_WIDTH, REEL_HEIGHT);
  const maxW = REEL_WIDTH - REEL_MARGIN_X - REEL_MARGIN_RIGHT;
  const topY = REEL_HEIGHT * (layout.yPct / 100);
  const safeBottom = reelSafeBottomY();
  const headLineHeight = layout.headSize * (layout.lineHeight || 1.06);

  ctx.font = `${headWeight} ${layout.headSize}px ${fontStack}`;
  const headText = layout.textCase === "none" ? head : head.toUpperCase();
  const headLines: number = ReelCore.countLines(ctx, headText, maxW);
  const headHeight = headLines * headLineHeight;

  if (effectiveKind === "hook") {
    // Classic hook layout: headline only (Phase F embeds any subtext into
    // `head` via \n - see generateEducationReel/generateJokeCarousel -
    // brand.hookSubtitle is a separate fixed site tagline, not per-post
    // content, so it isn't part of what Phase F is checking here). Budget
    // reserves room below the headline for that fixed subtitle line so the
    // two don't collide, mirroring drawSlide's hook branch (subtitle drawn
    // at y2+26, ~46px font).
    const budget = safeBottom - topY - 26 - 50;
    const fits = headHeight <= budget;
    const maxLines = Math.max(1, Math.floor(budget / headLineHeight));
    return {
      label,
      renderer: "reel-core",
      slideKind,
      fits,
      tight: fits && headLines >= maxLines,
      detail: `${headLines} head line(s) at ${layout.headSize}px (max ${maxLines} before colliding with the footer/subtitle area)`,
      headLines,
      headMaxLines: maxLines,
    };
  }

  // content-kind (and cta, redirected above): index number badge (84px) +
  // accent bar/gap (46px) precede the headline; a fixed 14px gap, then the
  // body at 42px/56px-line-height follows - see drawSlide's classic
  // content branch in public/reel-core.js. Body is drawn raw (not
  // uppercased) via drawML, only when slide.body is truthy - Phase F never
  // uses parseBody's bullet-list syntax, so pb.items is always empty and
  // the plain-paragraph path is what actually runs.
  let bodyHeight = 0;
  let bodyLines = 0;
  if (body) {
    ctx.font = `400 42px ${fontStack}`;
    bodyLines = ReelCore.countLines(ctx, body, maxW);
    bodyHeight = bodyLines * 56;
  }
  const gapAfterHead = 14; // drawn unconditionally after the headline, whether or not there's a body
  const budget = safeBottom - topY - 84 - 46;
  const totalHeight = headHeight + gapAfterHead + bodyHeight;
  const fits = totalHeight <= budget;
  return {
    label,
    renderer: "reel-core",
    slideKind,
    fits,
    tight: fits && totalHeight >= budget * 0.85,
    detail: `${headLines} head line(s) @78px + ${bodyLines} body line(s) @42px = ${Math.round(totalHeight)}px vs ${Math.round(budget)}px available`,
    headLines,
    headMaxLines: Math.max(1, Math.floor(budget / headLineHeight)),
  };
}

// ---------------------------------------------------------------------------
// expert-quote-core (interviews) - carousel format (1080x1350), the format
// Phase F always sets (see generateInterviewCarousel). Every slide type
// here shrink-to-fits like single-slide-core, not fixed-size like reel-core.
// ---------------------------------------------------------------------------

const EXPERT_FORMAT = "carousel";

function measureExpertCoverQuestion(label: string, head: string, body: string): SlideFitResult {
  const dims = ExpertQuoteCore.dims(EXPERT_FORMAT) as { W: number; H: number };
  const ctx = getCtx(dims.W, dims.H);
  const S = ExpertQuoteCore.safe(EXPERT_FORMAT);
  // Mirrors drawCoverQuestion() exactly - see public/expert-quote-core.js.
  const creditY = S.safeBottom - 150;
  const eyebrowH = 52;
  const regionTop = S.safeTop + 150;
  const regionBot = creditY - 56;

  const anton = (s: number) => `400 ${s}px 'Anton'`;
  const archivo = (s: number) => `500 ${s}px 'Archivo'`;

  let ctxGap = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cf: any = null;
  const contextLine = (body || "").trim();
  if (contextLine) {
    ctxGap = 42;
    cf = ExpertQuoteCore.fitWords(ctx, [ExpertQuoteCore.wordsRaw(contextLine)], S.maxW - 30, 180, 32, 26, 1.4, 0, archivo);
  }
  const headlineBudget = regionBot - regionTop - eyebrowH - ctxGap - (cf ? cf.height : 0);
  const words = ExpertQuoteCore.wordsUC(head);
  const f = ExpertQuoteCore.fitWords(ctx, [words], S.maxW, headlineBudget, 108, 54, 1.04, 0, anton);

  const headFits = f.height <= headlineBudget;
  const ctxFits = !cf || cf.height <= 180;
  const fits = headFits && ctxFits;
  return {
    label,
    renderer: "expert-quote-core",
    slideKind: "cover-question",
    fits,
    tight: fits && (f.size <= 58 || (cf && cf.size <= 28)),
    detail: `headline shrink-to-fit ${f.size}px (${Math.round(f.height)}px vs ${Math.round(headlineBudget)}px)${cf ? `, subtext ${cf.size}px (${Math.round(cf.height)}px vs 180px)` : ""}${fits ? "" : " - OVERFLOWS even at minimum size"}`,
  };
}

function measureExpertBio(label: string, bio: string): SlideFitResult {
  const dims = ExpertQuoteCore.dims(EXPERT_FORMAT) as { W: number; H: number };
  const ctx = getCtx(dims.W, dims.H);
  const S = ExpertQuoteCore.safe(EXPERT_FORMAT);
  // Mirrors drawBio() exactly: eyebrow (52px) + fixed 470x490 photo box
  // (+46 gap) + name line (42px) + role line (54px) all precede the bio
  // text - see public/expert-quote-core.js. None of that depends on
  // content, so the bio text's budget is a fixed value for a given format.
  const y = S.safeTop + 118 + 52 + 490 + 46 + 42 + 54;
  const budget = S.safeBottom - y - 70;
  const archivo = (s: number) => `500 ${s}px 'Archivo'`;
  const f = ExpertQuoteCore.fitWords(ctx, [ExpertQuoteCore.wordsRaw(bio)], S.maxW, budget, 38, 30, 1.4, 0, archivo);
  const fits = f.height <= budget;
  return {
    label,
    renderer: "expert-quote-core",
    slideKind: "bio",
    fits,
    tight: fits && f.size <= 32,
    detail: `bio shrink-to-fit ${f.size}px, ${Math.round(f.height)}px vs ${Math.round(budget)}px available${fits ? "" : " - OVERFLOWS even at the 30px minimum size"}`,
  };
}

function measureExpertQa(label: string, question: string, answer: string): SlideFitResult {
  const dims = ExpertQuoteCore.dims(EXPERT_FORMAT) as { W: number; H: number };
  const ctx = getCtx(dims.W, dims.H);
  const S = ExpertQuoteCore.safe(EXPERT_FORMAT);
  const anton = (s: number) => `400 ${s}px 'Anton'`;
  const archivo = (s: number) => `500 ${s}px 'Archivo'`;

  // Mirrors drawQA() exactly - see public/expert-quote-core.js. The
  // question/context line (q) auto-fits into a FIXED 210px box; the
  // answer/quote (a) then auto-fits into whatever vertical space is left
  // between q's ACTUAL drawn height and the credit lockup near the bottom -
  // a genuinely two-stage, content-dependent budget, not two independent
  // boxes.
  const qf = ExpertQuoteCore.fitWords(ctx, [ExpertQuoteCore.wordsUC(question || "")], S.maxW, 210, 44, 30, 1.06, 0, anton);
  const qFits = qf.height <= 210;

  const yAfterQ = S.safeTop + 130 + qf.height + 34 /* gap */ + 70 /* quote-mark offset */;
  const creditY = S.safeBottom - 150;
  const aBudget = creditY - yAfterQ - 30;
  const af = ExpertQuoteCore.fitWords(ctx, [ExpertQuoteCore.wordsRaw(answer || "")], S.maxW, Math.max(0, aBudget), 56, 34, 1.42, 0, archivo);
  const aFits = aBudget > 0 && af.height <= aBudget;

  const fits = qFits && aFits;
  return {
    label,
    renderer: "expert-quote-core",
    slideKind: "qa",
    fits,
    tight: fits && (qf.size <= 32 || af.size <= 36),
    detail: `q ${qf.size}px (${Math.round(qf.height)}px vs 210px), a ${af.size}px (${Math.round(af.height)}px vs ${Math.round(Math.max(0, aBudget))}px available)${fits ? "" : " - OVERFLOWS"}`,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function checkSlideFit(input: SlideFitInput): SlideFitResult {
  if (input.renderer === "single-slide-core") {
    return measureSingleSlideCore(input.label, input.head, input.body ?? "");
  }
  if (input.renderer === "reel-core") {
    return measureReelCore(input.label, input.slideKind, input.head, input.body);
  }
  // expert-quote-core
  if (input.slideKind === "cover-question") {
    return measureExpertCoverQuestion(input.label, input.head, input.body ?? "");
  }
  if (input.slideKind === "bio") {
    return measureExpertBio(input.label, input.head);
  }
  return measureExpertQa(input.label, input.head, input.body ?? "");
}

export function checkSlidesFit(inputs: SlideFitInput[]): SlideFitResult[] {
  return inputs.map(checkSlideFit);
}
