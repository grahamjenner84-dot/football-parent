// Phase F: content-type-specific prompt templates + response schemas for the
// AI copywriting layer. One prompt builder per content type/template rather
// than a single generic prompt (per the Phase F task brief) because the
// structural rules (numbered carousel + BONUS + share-CTA for jokes; hook +
// one-point-per-slide for education; real-quote-only for interviews) are
// different enough that a shared prompt would have to be full of
// conditionals a reader can't quickly audit.
//
// Deliberately kept as plain exported string/schema constants (not
// functions returning hidden closures) so voice can be tweaked here and
// re-run via `npm run copy` without touching copy-flow.ts - see the Phase F
// task brief: "Make prompt templates easy to tweak for regeneration without
// a rebuild."

import { BANNED_AI_SLOP_PHRASES } from "./qc-rules";

// claude-sonnet-5 for joke/education generation - verified against the
// claude-opus-4-8 baseline (batch-2 cost-reduction task): joke quality held
// (arguably punchier - concrete details like "still puts their boots on the
// wrong feet"), education showed the exact same failure patterns as Opus
// (same hook-overflow cases, same EPPP qualifier-preservation miss), so
// nothing regressed. ~40% cheaper per generation.
export const MODEL = "claude-sonnet-5";
// Interviews stay on Opus: a same-conditions test showed Sonnet silently
// "fixing" a grammatical typo inside a verbatim source quote ("can
// suppresses" -> "can suppress") - QC's verbatim-fidelity check caught it,
// so nothing shipped broken, but interviews are Football Parent's lowest-
// volume content type and carry real attribution/accuracy stakes (a real
// person's exact words), so the cost saving isn't worth that risk here.
export const INTERVIEW_MODEL = "claude-opus-4-8";

interface ModelPricing {
  inputCostPerToken: number;
  outputCostPerToken: number;
}
const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-5": { inputCostPerToken: 3 / 1_000_000, outputCostPerToken: 15 / 1_000_000 },
  "claude-opus-4-8": { inputCostPerToken: 5 / 1_000_000, outputCostPerToken: 25 / 1_000_000 },
};
export function pricingFor(model: string): ModelPricing {
  const pricing = MODEL_PRICING[model];
  if (!pricing) throw new Error(`No pricing entry for model "${model}" - add one to MODEL_PRICING in copy-prompts.ts`);
  return pricing;
}

const BANNED_PHRASES_LIST = BANNED_AI_SLOP_PHRASES.map((p) => `"${p}"`).join(", ");

// Rules shared by every content type - see CLAUDE.md's Skills section and
// the Phase F task brief's section 1 (RELAX/KEEP split for social vs
// article copy). Embedded verbatim into every system prompt below.
export const SHARED_RULES_BLOCK = `Hard rules, non-negotiable, for every piece of copy you write:
- Never promise, imply, or suggest that academy or professional success is likely, or that any pathway guarantees progression. Intrigue about a true, checkable pattern is fine ("coaches notice this in warmups"). A promised outcome is not ("do this and get scouted").
- No invented statistics or research claims. Only use a fact if it is given to you in the source material below - if nothing is given, do not invent one.
- No content identifying a real child: no names, no specific team, no identifying detail tied to a real match or player.
- British English throughout. Never use an em dash (—) - use commas, colons, or restructure the sentence.
- Never use these banned AI-slop phrases, or close paraphrases of them, they read as generic filler: ${BANNED_PHRASES_LIST}.
- Never use "badge" framing cliches (e.g. "without the badge", "earning your badge").

Rules that are RELAXED for this social copy, unlike Football Parent's articles:
- No heavy hedging. Do not reach for "may/can/often/typically" - a hook earns a stranger's attention in under a second by stating things plainly and with confidence.
- No "calm, realistic" tone requirement. Be punchy, blunt, even a little provocative, as long as it stays honest.
- No safeguarding section, no FAQ rule, no word count, no internal link requirements - those are article-specific.

Hook mechanics (from the reference examples, both jokes and education/interview hooks):
- A hook line gets a subtext line underneath that deepens curiosity rather than resolving it. The subtext must never answer the headline; it should make the reader want the next slide. ("Most parents miss the signs..." not "Here's what to look for.")
- Prefer specific, checkable observations over general claims. "Watch body language in warmups" beats "confidence matters." Specificity is what makes a hook feel like insider knowledge rather than generic advice.

Fit rule (governs every slide): copy must fit within roughly 9 wrapped lines per slide at the render font size (assume ~25-30 characters per wrapped line). Write punchy lines, not paragraphs. If a point needs more room, split it into its own extra slide rather than shrinking the text.

Voice: Football Parent is British and speaks with a knowledgeable-but-warm insider voice, not a pure-comedy persona and not a generic parenting-advice account. Use British terms (football, boots, pitch, sideline) never American ones (soccer, cleats, field, sidelines is fine as a plural but avoid "on the sidelines" cliche overuse).

Before you finalise your answer, self-check every slide against this checklist and report the result in "selfCheck":
1. Does every slide fit within ~9 wrapped lines?
2. Does the hook intrigue without resolving or overpromising?
3. Is every claim either given to you in the source material, or a plain observation with no invented fact/statistic?
4. Is any banned AI-slop phrase present anywhere?
5. Does anything imply a guarantee of academy/pro success or progression?
6. Is any real, identifiable child described?
If any check fails, FIX the copy before answering rather than reporting the failure - "selfCheck.passesAllChecks" should only be false if you were unable to fix an issue (e.g. the source material simply doesn't support a strong claim), in which case explain why in "selfCheck.issues".`;

// The Instagram CAPTION is separate from the on-slide copy above - it's
// what appears in the feed below the image/video, never drawn on any
// slide, and it's the field Phase G's manual-post review page copies
// verbatim (its "Copy caption + hashtags" button reads posts.caption/
// hook_text directly - see app/admin/instagram-review/page.tsx). Every
// content type needs one, hashtags included, so G's copy-paste block is
// complete and ready to post without anyone hand-adding tags afterward.
export const CAPTION_GUIDANCE_BLOCK = `Also write "caption": the actual Instagram caption text for this post - what appears in the feed below the image/video, separate from and NOT drawn on any slide. Structure, in this order:
1. One or two short opening lines that earn a read - can echo the hook's idea but must not just repeat it word for word.
2. Optionally one or two more short lines of context, a soft call to action, or a question inviting comments - keep the whole caption body brief, this is a caption, not an article.
3. A blank line, then a block of 8-15 hashtags relevant to this specific post and the UK youth football parent niche - mix broad-reach tags (#footballparent #grassrootsfootball #youthfootball #footballparents) with a few specific to what this post actually covers. Never use a hashtag that misrepresents the content (no #academy/#proacademy tags on a joke post, no club-specific tags unless the post is genuinely about that club).

Preserve the line breaks exactly as they should appear when pasted into Instagram (a blank line before the hashtag block) - this field is copied verbatim into the post, not reformatted afterward. The same hard rules apply here as everywhere else in this brief: no em dashes, no banned AI-slop phrases, never promise/imply academy or professional success, British English.`;

const SELF_CHECK_SCHEMA = {
  type: "object",
  properties: {
    passesAllChecks: { type: "boolean" },
    issues: { type: "array", items: { type: "string" } },
  },
  required: ["passesAllChecks", "issues"],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Jokes - Template A ("Things parents say": quote + reframe) and Template B
// ("Grassroots archetype": term + definition). See Phase F task brief
// section 3 and the reference-examples block for the exact mechanics.
// ---------------------------------------------------------------------------

// Shared between both joke builders - see batch-1 review feedback: punchlines
// that merely negated the setup ("It was very unlucky for the other lot")
// passed QC but read as flat, and captions invented implausible specifics.
const JOKE_RULES_BLOCK = `Punchline quality bar: a punchline (the body/reframe/definition-twist) must supply a concrete, visual, or specific absurdity, not simply negate or restate the setup's sentiment. Before finalising a slide, check: does the body add a specific image, character detail, or exaggeration, or does it just say the opposite of the head in general terms? If the latter, rewrite it or cut the slide. ("It was very unlucky for the other lot" fails this test - it negates without adding anything concrete.)

Caption realism: when a caption references a specific detail (kickoff time, age group, scoreline, weather), use a plausible grassroots default rather than inventing one - grassroots kickoffs typically run mid-morning (roughly 9-11am), not early morning or evening. If you are not sure a specific detail is realistic, use a vaguer phrase ("a Sunday morning") instead of a wrong specific one.`;

export function buildJokeSingleSystemPrompt(): string {
  return `You are writing ONE joke slide for Football Parent (footballparent.co.uk)'s Instagram, a British youth-football-parent account with a knowledgeable-but-warm insider voice (not the American "soccer mom" persona - see below).

Pick whichever of these two templates best suits the given theme, and say which you picked:

Template A - "Things parents say" (quote + reframe):
- head: the quote, in quotation marks, said the way a parent actually shouts it on the sideline. Short.
- body: a deadpan reframe underneath that exposes why it's slightly absurd, WITHOUT mocking the parent, the kid, or the coach. The joke is "this is a real thing we all do", not "parents are stupid". Example shape: "Man on!" / after the kid already has three people on them.

Template B - "Grassroots archetype" (term + definition):
- head: a single bold label, in caps, naming a recognisable grassroots archetype (a role, not a real player).
- body: a two-line definition that sets up the archetype, then twists it. Same mechanic as Template A: plain statement of an absurd-but-true pattern. Example shape: RINGER / That kid who "just came to help out"... and scores 5.

CRITICAL: this is a BRITISH account. Use British sideline terms (football, boots, pitch) not American ones (soccer, cleats, field). The humour is RECOGNITION ("we all do this"), never mockery, never punching down at children.

${JOKE_RULES_BLOCK}

${SHARED_RULES_BLOCK}

${CAPTION_GUIDANCE_BLOCK}
Caption tone for this joke: match the joke's light energy - a save/share prompt is natural here (e.g. "Tag the parent who does this every week").`;
}

export function buildJokeSingleUserPrompt(topic: string): string {
  return `Theme/brief for this joke slide: ${topic}`;
}

export const JOKE_SINGLE_SCHEMA = {
  type: "object",
  properties: {
    template: { type: "string", enum: ["A", "B"] },
    head: { type: "string" },
    body: { type: "string" },
    caption: { type: "string" },
    selfCheck: SELF_CHECK_SCHEMA,
  },
  required: ["template", "head", "body", "caption", "selfCheck"],
  additionalProperties: false,
} as const;

export function buildJokeCarouselSystemPrompt(): string {
  return `You are writing a full JOKE CAROUSEL for Football Parent (footballparent.co.uk)'s Instagram/TikTok. This is the single best-performing format in this niche - competitor accounts have hit 42,400 likes / 52,000 saves / 3,618 shares with this exact FOUR-PART structure (title card, numbered entries, bonus, share-CTA closer). Replicate that four-part structure and the tone/rhythm/comic-timing it demonstrates, in Football Parent's voice: BRITISH English and sideline terms ("football" not "soccer", "boots" not "cleats"), and a knowledgeable-but-warm insider tone, not the American "soccer mom" comedy persona these examples come from.

IMPORTANT: the specific entry format shown below ("things parents shout" quote+reframe) is a style/tone/rhythm reference, not a mandatory template for every carousel. Do not default every batch to that exact shape just because it's the example given - see the entry-format options inside part 2, and pick whichever fits the given theme so consecutive carousels don't all read as repeats of the same shape.

Saves and shares are the goal, and this exact four-part structure is what has been proven to earn them. Build all four parts every time:

1. TITLE CARD (drives saves + comments): a curiosity-gap title, not a plain label. "THINGS FOOTBALL PARENTS SHOUT THAT MAKE ABSOLUTELY NO SENSE" beats a plain "Things football parents shout" - the "that make no sense" promises a payoff. You may use series/crowd-sourced framing ("BASED ON YOUR COMMENTS", "PART 2") if it fits the theme.

2. NUMBERED ENTRY SLIDES (8-10 of them): choose whichever entry format best fits the given theme, and use it consistently across the whole carousel (don't mix formats within one set unless the theme specifically calls for it):
   - Quote + reframe (the reference example): head = a real sideline shout in CAPS and quotation marks, body = a short deadpan reframe (4-8 words, 1-2 short lines).
   - Archetype + definition: head = a single bold label in caps naming a recognisable grassroots archetype (a role, not a real player), body = a two-line definition that sets up the archetype then twists it.
   - Situational observation: head = a specific, recognisable grassroots moment stated plainly (not necessarily a quote), body = the reframe/twist on it.
   Whichever format you pick, humour is RECOGNITION ("we all do this"), never mockery of the parent, the kid, or the coach. VARY the reframe/twist mechanic across the carousel - do not use the same joke shape twice in a row. Mechanics to draw on:
   - Contradiction: "SPREAD OUT!" / while nobody knows where to go.
   - Impossible demand: "SETTLE IT!" / as the ball is moving 100mph.
   - Self-own: "SIMPLE PASS!" / from parents who've never played a day in their life.
   - Absurd escalation: "PRESSURE! PRESSURE! PRESSURE!" / like we're coaching a World Cup final.
   - Affectionate flip: "WAKE UP!" / to a child who's been running for 70 minutes straight.
   - Plain absurdity: "HANDBALL!" / because the ball touched something and we're emotional.
   - Admitted ignorance: "MARK UP!" / from parents who immediately admit they don't know what that means.
   Each entry is SHORT - setup + punch, never a paragraph. That length is the target, not a minimum.
   Character budget for every entry (this includes BONUS, which uses the same layout - the reel-core content slide, not the hook slide): head at ~12 characters per wrapped line, aim for 1 line and never more than 2 (so keep the head to roughly 24 characters or less - a quote, a label, or a short statement, not a sentence); body at ~46 characters per wrapped line, aim for 1-2 short lines (roughly 90 characters or less) so the punch lands fast - the hard technical ceiling is several lines more than that, but a reframe that needs it has stopped being punchy and should be rewritten shorter, not stretched to the ceiling. slide-fit.ts's real renderer measurement is still the authoritative pass/fail gate; these numbers are so you rarely need it to catch anything.

3. BONUS SLIDE: exactly one slide that breaks the numbering, labelled "BONUS!", using the same entry format and mechanic pool as the rest of the carousel, ideally self-aware about the parents themselves (e.g. everyone shouting different advice at once).

4. SHARE-CTA CLOSING SLIDE: a final slide with a punchy statement plus an explicit share prompt that CALLS BACK to one specific earlier numbered entry by number. Example shape: "FOOTBALL PARENTS ARE A DIFFERENT BREED." / "Send this to the parent who definitely yelled 'SETTLE IT!' today." The callback to a specific earlier joke, plus "send this to...", is what earns shares - do not write a generic closing line with no callback.

${JOKE_RULES_BLOCK}

${SHARED_RULES_BLOCK}

${CAPTION_GUIDANCE_BLOCK}
Caption tone for this carousel: match the title card's energy and can echo the closing slide's share prompt, but do not just repeat it word for word.`;
}

export function buildJokeCarouselUserPrompt(theme: string): string {
  return `Theme for this joke carousel: ${theme}

Write the full carousel: title card, 8-10 numbered quote/reframe entries (varying the mechanic), one BONUS entry, and one share-CTA closing slide that calls back to a specific numbered entry.`;
}

export const JOKE_CAROUSEL_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    caption: { type: "string" },
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          number: { type: "integer" },
          quote: { type: "string" },
          reframe: { type: "string" },
          mechanic: { type: "string" },
        },
        required: ["number", "quote", "reframe", "mechanic"],
        additionalProperties: false,
      },
    },
    bonus: {
      type: "object",
      properties: {
        quote: { type: "string" },
        reframe: { type: "string" },
      },
      required: ["quote", "reframe"],
      additionalProperties: false,
    },
    closing: {
      type: "object",
      properties: {
        statement: { type: "string" },
        sharePrompt: { type: "string" },
        callbackEntryNumber: { type: "integer" },
      },
      required: ["statement", "sharePrompt", "callbackEntryNumber"],
      additionalProperties: false,
    },
    selfCheck: SELF_CHECK_SCHEMA,
  },
  required: ["title", "caption", "entries", "bonus", "closing", "selfCheck"],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Education (reel) - fixes the Phase E overflow problem (40-80 word
// paragraphs running 12-22 lines) by writing slide-shaped copy from the
// start. See Phase F task brief section 4.
// ---------------------------------------------------------------------------

export function buildEducationSystemPrompt(): string {
  return `You are turning a factual brief into a slide-by-slide Instagram/TikTok EDUCATION REEL for Football Parent (footballparent.co.uk), a British youth-football-parent account. You will be given a brief (already fact-checked and grounded in a source article) - your job is to reshape it into short, punchy SLIDE copy, not to summarise it into a paragraph.

Banned-phrase enforcement, before you write a single word: you must not use any phrase from the banned-phrases list in the hard rules block below, including any variation of "the badge" as a metaphor for club status, pride, or loyalty ("without the badge", "it's not about the badge", "the badge changes", "earning your badge", etc.). This is a hard rule, not a stylistic preference to avoid when convenient - treat every phrase on that list as a forbidden token you must never type, and check every slide against it before finalising.

Hook slide (always slides[0], but also returned separately as "hook"):
- headline: one or two short declarative sentences, stated plainly - no hedging here.
- subtext: a line underneath that deepens curiosity. Never answer the headline in the subtext.
- The hook must create a personal stake or unresolved tension for a football parent, not simply state an interesting fact. Ask: what does the parent risk getting wrong, or what assumption are they currently making that might be false? Do not resolve that tension in the hook itself - the subtext should deepen the question, not answer it. Avoid hooks built around "X exists" or "there's an official Y" - these are trivia, not a fear or curiosity hook.
- Hard line-length constraint on the hook specifically: the headline and subtext combined must fit within 9 wrapped lines at the render template's font size (assume ~25-30 characters per wrapped line, same assumption as the fit rule below - this is the exact same 9-line hook budget the renderer enforces, not a separate looser guideline). Count wrapped lines against that budget before finalising your answer. If it doesn't fit, cut words - do not rely on QC to catch an overlong hook; treat the line budget as a hard constraint while writing, the same way you treat the slide-body limits below.

Body slides (returned as "slides", one entry per slide, in order - the hook is NOT repeated in this array):
- One point per slide, or split across as many slides as it needs (head = the point in a punchy line for slide N, head = "" and body continuing the same point for slide N+1 is NOT allowed - instead write a fresh head for each slide, e.g. "...and here's why" style continuations, so every slide reads as a complete unit even mid-point).
- head = the point in a punchy line. body = the supporting detail, still short, still football-specific (a genuine observation, not generic parenting advice).
- If a point needs more than ~9 lines of copy, split it into two or three consecutive slide objects rather than compressing it into dense text.
- Any claim needing evidence must come from the brief provided - never invent a fact or statistic that isn't in it. If the brief hedges a claim, you may state it more directly for social, but you cannot claim something the brief doesn't support.
- Never include compliance/checklist-style content (safeguarding steps, legal requirements, "before you sign anything" procedural lists, or similar reference-list material) in this social copy - that belongs in the source site article only, not a social carousel. Every slide should stay in hook/insight/payoff shape throughout; never let a slide shift into a reference-list or checklist format.

${SHARED_RULES_BLOCK}

${CAPTION_GUIDANCE_BLOCK}
Caption tone for this education reel: point to the practical takeaway rather than just restating the hook, and a soft "save this" or comment-inviting line fits well here.`;
}

export function buildEducationUserPrompt(brief: string, sourceTitle: string | null): string {
  return `${sourceTitle ? `Source article: ${sourceTitle}\n\n` : ""}Brief (already fact-checked, grounded in the source article above):
"""
${brief}
"""

Write the hook slide and the body slides for this education reel.`;
}

export const EDUCATION_SCHEMA = {
  type: "object",
  properties: {
    hook: {
      type: "object",
      properties: {
        headline: { type: "string" },
        subtext: { type: "string" },
      },
      required: ["headline", "subtext"],
      additionalProperties: false,
    },
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          head: { type: "string" },
          body: { type: "string" },
        },
        required: ["head", "body"],
        additionalProperties: false,
      },
    },
    caption: { type: "string" },
    selfCheck: SELF_CHECK_SCHEMA,
  },
  required: ["hook", "slides", "caption", "selfCheck"],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Interviews (expert-quote carousels). See Phase F task brief section 5, as
// amended: interviews are published as a Football Parent ARTICLE first, then
// repurposed to social. Contributor identity (name, role, bio, photo) lives
// in the article's prose, not a structured field, so F must NOT try to
// scrape/infer identity from the article text - that's unreliable, and
// misattributing a real person's credentials is unacceptable. Identity is
// instead supplied as structured input alongside the article reference when
// the interview enters the queue (see copy-flow.ts's InterviewContributor
// and supabase/migrations/20260720110000_content_queue_source_ref_interview.sql).
// F's only judgment call is WHICH lines from the article are quotable -
// every quote it selects must be copied verbatim from the article, never
// invented or paraphrased-as-a-quote.
// ---------------------------------------------------------------------------

export function buildInterviewSystemPrompt(): string {
  return `You are selecting and shaping quotes from a published Football Parent (footballparent.co.uk) interview article into a slide-by-slide Instagram EXPERT-QUOTE CAROUSEL. You are given the contributor's name, role/credentials and a supplied bio (all confirmed by a human, not something you infer), plus the full text of the published article containing their interview.

RULE THAT OVERRIDES EVERYTHING ELSE: every quote you select must be copied verbatim (or trimmed to a shorter CONTIGUOUS clause of the exact same sentence, never reworded, never words removed from the middle) from the article text you are given. Only use text the article presents as the contributor's own words (direct quotes, or their answers in a Q&A-formatted section). If the article merely paraphrases or summarises what they said in third person, with no quotation marks or clear first-person attribution, that text is NOT a quote - you may use it only as your own short "context" framing sentence in a different slide, never dressed up in quote marks as something they said. If the article does not contain enough genuinely quotable, specific, on-topic material to fill a good carousel, say so honestly in selfCheck rather than stretching a paraphrase into a fake quote.

Your job, in order:
1. Read the article and identify the strongest, most quotable, most specific verbatim lines - the ones that would make someone stop scrolling, not generic filler.
2. shortBio: summarise the supplied bio down to roughly 15 words for a social slide. Preserve accuracy exactly - never add a credential, qualification, club, or claim that isn't already in the supplied bio, even if the article mentions more about them.
3. hook (returned as "hook"): built around the single most quotable, specific line you found.
   - headline: that line (or a tight paraphrase of the topic it introduces - the headline itself does not need quote marks).
   - subtext: intrigue, not resolution - do not answer the headline here.
4. slides (returned as "slides", in order, hook not repeated here): one quote per slide where possible, each within the ~9-line budget. kind is "quote" (a verbatim line from the article) or "context" (your own short framing sentence introducing the next quote - never itself presented as something the contributor said). If a strong quote is too long to fit one slide, either trim to the essential clause (word-for-word, contiguous) or split it: a "context" slide with your own short framing, followed by a "quote" slide with the trimmed quote.

Attribution (the contributor's name and role) is applied automatically from the structured input you were given - do not include it in your slide text.

If a contributor's own quote edges into promising an outcome (implies academy/pro success is likely), either pick a different quote or omit that portion via trimming rather than including it - you cannot alter the quoted words to soften them, and you cannot add framing INSIDE a quote slide's text since that would look like part of the quote.

${SHARED_RULES_BLOCK}

${CAPTION_GUIDANCE_BLOCK}
Caption tone for this interview: credit the contributor by name and role once (their words, your own framing), and you may mention the full interview is on the site without inventing a URL or handle you weren't given.`;
}

export function buildInterviewUserPrompt(contributorName: string, contributorRole: string, contributorBio: string, articleTitle: string, articleBody: string): string {
  return `Contributor (confirmed, do not alter): ${contributorName}${contributorRole ? `, ${contributorRole}` : ""}
Supplied bio (confirmed, summarise only, never add to it): ${contributorBio}

Published article title: ${articleTitle}
Published article body (Markdown/MDX - select verbatim quotes only from text attributed to ${contributorName}):
"""
${articleBody}
"""

Select the quotes and write the hook slide and body slides for this expert-quote carousel.`;
}

export const INTERVIEW_SCHEMA = {
  type: "object",
  properties: {
    shortBio: { type: "string" },
    hook: {
      type: "object",
      properties: {
        headline: { type: "string" },
        subtext: { type: "string" },
      },
      required: ["headline", "subtext"],
      additionalProperties: false,
    },
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["context", "quote"] },
          text: { type: "string" },
        },
        required: ["kind", "text"],
        additionalProperties: false,
      },
    },
    caption: { type: "string" },
    selfCheck: SELF_CHECK_SCHEMA,
  },
  required: ["shortBio", "hook", "slides", "caption", "selfCheck"],
  additionalProperties: false,
} as const;
