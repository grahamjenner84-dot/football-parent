// Checks the planned Expert Opinion carousels in public/expert-posts.json
// before Graham sees them. Used by the football-parent-expert-carousel skill.
//
//   npx tsx scripts/expert-post-check.ts                 # every post
//   npx tsx scripts/expert-post-check.ts <post-id> ...   # just these
//   npx tsx scripts/expert-post-check.ts <id> --render <dir>   # also write PNGs
//
// Hard failures (exit 1):
//   - verbatim: every answer and the pull-quote must be the expert's exact
//     words from the source article. Cutting is allowed (split kept pieces
//     with " … "), rewording is not. Each piece must appear word for word in
//     the article (case, curly quotes, *gold* markers and edge punctuation
//     ignored).
//   - length caps (short copy is a rule, not a preference).
//   - slide fit, via lib/instagram/slide-fit.ts (same measurements the
//     renderer uses).
//   - the expert preset exists.
import fs from "node:fs";
import path from "node:path";
import { checkSlidesFit, type SlideFitInput } from "../lib/instagram/slide-fit";

type QA = { q: string; a: string };
type Post = {
  id: string;
  label?: string;
  expert: string;
  article: string;
  audience?: string;
  theme?: string;
  coverEyebrow?: string;
  coverQuestion: string;
  coverContext?: string;
  qas: QA[];
  quote?: string;
  cta?: string;
  followLine?: string;
  caption?: string;
  collab?: string;
};
type Preset = { id: string; bio?: string; logoSrc?: string; bioSrc?: string; [k: string]: unknown };

export const LIMITS = {
  coverWords: 10,
  contextWords: 16,
  questionWords: 9,
  answerWords: 35,
  quoteWords: 20,
  ctaWords: 10,
  followWords: 14,
  captionChars: 600,
  minQas: 2,
  maxQas: 4,
};

const ROOT = process.cwd();
const readJson = <T>(p: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

function norm(s: string): string {
  return s
    .replace(/\*/g, "")
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// The article as plain text: frontmatter, JSX/HTML tags and markdown syntax
// stripped, so a quoted answer can be matched against what the reader sees.
function articleText(articlePath: string): string {
  const rel = articlePath.replace(/^https?:\/\/[^/]+/, "").replace(/^\/|\/$/g, "");
  const file = path.join(ROOT, "content", rel + ".mdx");
  if (!fs.existsSync(file)) throw new Error("article not found: " + file);
  let t = fs.readFileSync(file, "utf8");
  t = t.replace(/^---[\s\S]*?\n---/, " ");
  t = t.replace(/<[^>]+>/g, " ");
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  t = t.replace(/^#+\s*/gm, " ").replace(/^\s*[-*]\s+/gm, " ").replace(/\*\*|__/g, "");
  return norm(t);
}

function pieces(text: string): string[] {
  return norm(text)
    .split(/\s*(?:…|\.\.\.)\s*/)
    .map((p) => p.replace(/^[\s.,;:!?'"()-]+|[\s.,;:!?'"()-]+$/g, ""))
    .filter((p) => p.length > 0);
}

const words = (s: string) => (s || "").replace(/\*/g, "").split(/\s+/).filter(Boolean).length;

function dataUri(src?: string): string | null {
  if (!src || !src.startsWith("/")) return null;
  const f = path.join(ROOT, "public", src);
  if (!fs.existsSync(f)) return null;
  const ext = path.extname(f).slice(1).toLowerCase().replace("jpg", "jpeg");
  return `data:image/${ext};base64,` + fs.readFileSync(f).toString("base64");
}

async function main() {
  const args = process.argv.slice(2);
  const ri = args.indexOf("--render");
  const renderDir = ri >= 0 ? args[ri + 1] : null;
  const ids = args.filter((a, i) => !a.startsWith("--") && (ri < 0 || i !== ri + 1));

  const posts = readJson<Post[]>("public/expert-posts.json");
  const presets = readJson<Preset[]>("public/expert-presets.json");
  const chosen = ids.length ? posts.filter((p) => ids.includes(p.id)) : posts;
  if (ids.length && chosen.length !== ids.length) {
    console.error("unknown post id(s): " + ids.filter((i) => !posts.some((p) => p.id === i)).join(", "));
    process.exit(1);
  }

  let failed = 0;
  const seenIds = new Set<string>();
  for (const post of chosen) {
    const errs: string[] = [];
    const warns: string[] = [];
    if (seenIds.has(post.id)) errs.push("duplicate post id");
    seenIds.add(post.id);

    const preset = presets.find((p) => p.id === post.expert);
    if (!preset) errs.push(`expert "${post.expert}" is not in public/expert-presets.json`);

    // length caps
    const cap = (label: string, n: number, max: number) => { if (n > max) errs.push(`${label}: ${n} words, max ${max}`); };
    cap("cover", words(post.coverQuestion), LIMITS.coverWords);
    cap("context line", words(post.coverContext || ""), LIMITS.contextWords);
    (post.qas || []).forEach((qa, i) => {
      cap(`Q${i + 1} question`, words(qa.q), LIMITS.questionWords);
      cap(`Q${i + 1} answer`, words(qa.a), LIMITS.answerWords);
    });
    if (post.quote) cap("quote", words(post.quote), LIMITS.quoteWords);
    if (post.cta) cap("closing line", words(post.cta), LIMITS.ctaWords);
    if (post.followLine) cap("follow line", words(post.followLine), LIMITS.followWords);
    if ((post.caption || "").length > LIMITS.captionChars) errs.push(`caption: ${post.caption!.length} chars, max ${LIMITS.captionChars}`);
    const n = (post.qas || []).length;
    if (n < LIMITS.minQas || n > LIMITS.maxQas) errs.push(`${n} Q&As, want ${LIMITS.minQas}-${LIMITS.maxQas}`);
    if (!post.audience) warns.push("no audience set (parents or coaches)");

    // verbatim
    let source = "";
    try { source = articleText(post.article); } catch (e) { errs.push((e as Error).message); }
    if (source) {
      const check = (label: string, text: string) => {
        for (const p of pieces(text)) {
          // whole words only, so a one-word answer can't match inside another word
          const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const re = new RegExp("(^|[^a-z0-9'])" + escaped + "($|[^a-z0-9'])");
          if (!re.test(source)) errs.push(`${label} is not the expert's exact words: "${p}"`);
        }
      };
      (post.qas || []).forEach((qa, i) => check(`Q${i + 1} answer`, qa.a));
      if (post.quote) check("quote", post.quote);
    }

    // slide fit
    const inputs: SlideFitInput[] = [
      { label: "cover", renderer: "expert-quote-core", slideKind: "cover-question", head: post.coverQuestion, body: post.coverContext || "" },
      ...(preset?.bio ? [{ label: "bio", renderer: "expert-quote-core" as const, slideKind: "bio", head: String(preset.bio) }] : []),
      ...(post.qas || []).map((qa, i) => ({ label: `Q${i + 1}`, renderer: "expert-quote-core" as const, slideKind: "qa", head: qa.q, body: qa.a })),
      { label: "closing", renderer: "expert-quote-core", slideKind: "closing", head: post.followLine || "", body: post.cta || "" },
    ];
    for (const r of checkSlidesFit(inputs)) {
      if (!r.fits) errs.push(`${r.label} overflows: ${r.detail}`);
      else if (r.tight) warns.push(`${r.label} is tight: ${r.detail}`);
    }

    console.log(`\n${errs.length ? "FAIL" : "PASS"}  ${post.id}${post.audience ? ` [${post.audience}]` : ""}${post.theme ? ` - ${post.theme}` : ""}`);
    errs.forEach((e) => console.log("  x " + e));
    warns.forEach((w) => console.log("  ! " + w));
    if (errs.length) failed++;

    if (renderDir && preset) {
      const { renderExpertQuoteSlidePNG } = await import("../lib/renderers/expert-quote-server");
      fs.mkdirSync(renderDir, { recursive: true });
      const data = {
        ...preset, bioSrc: dataUri(preset.bioSrc) ?? undefined,
        coverStyle: "question", coverEyebrow: post.coverEyebrow || "Football Parent asks",
        coverQuestion: post.coverQuestion, coverContext: post.coverContext || "",
        qas: post.qas, quote: post.quote || "", cta: post.cta || "", followLine: post.followLine || "", format: "carousel", platform: "ig",
      };
      const slides = [{ type: "cover" }, { type: "bio" }, ...post.qas.map((_, i) => ({ type: "qa", i })), { type: "quote" }, { type: "cta" }];
      for (let i = 0; i < slides.length; i++) {
        const buf = await renderExpertQuoteSlidePNG(slides[i] as never, data as never, dataUri(preset.logoSrc));
        fs.writeFileSync(path.join(renderDir, `${post.id}-${String(i + 1).padStart(2, "0")}-${slides[i].type}.png`), buf);
      }
      console.log(`  rendered ${slides.length} slides to ${renderDir}`);
    }
  }
  console.log(`\n${chosen.length - failed}/${chosen.length} posts pass`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
