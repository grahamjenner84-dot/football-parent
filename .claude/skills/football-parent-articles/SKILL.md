---
name: football-parent-articles
description: Writes fact-checked Football Parent (footballparent.co.uk) articles as MDX plus page.tsx, with SEO frontmatter, sourced claims and correct internal links. Use for any Football Parent article request.
---

# Football Parent Article Writer

Produces a complete, fact-checked, house-style MDX article and its matching
`page.tsx` for footballparent.co.uk from a short brief (title, topic, or
search intent).

## Input handling

The user will typically paste something brief: a title, a target keyword, a
search intent, or a rough topic ("write about whether private coaching is
worth it"). Treat that as the full brief — do not stop to ask clarifying
questions unless the category is genuinely ambiguous. Infer:

- **Category** (one of: Academy Pathway, Academy Trials, Football
  Development, Girls Football, Parent Guides, Football Gear) from the topic.
- **Slug and path** from the title, matching the category's URL pattern
  (e.g. `/football-development/is-private-coaching-worth-it`).
- **Search intent** from the phrasing given.

If the user pastes multiple briefs at once, produce each article in full,
one after another.

## Workflow

1. **Assess fact-check need.** Check the topic against the "when to
   fact-check" list in `references/fact-checking-and-style.md`. If it
   applies, use web search to verify current terminology, rules, or research
   before writing — don't rely on memory for academy structures, FA rules,
   safeguarding guidance, or research claims. Prioritise sources per the
   priority order in that file.
2. **Plan sections.** Sketch the H2 structure (this becomes the `sections`
   frontmatter array 1:1).
3. **Plan internal links.** Open `references/valid-urls.md` and pick 3–5
   contextual links for the body (same cluster first) plus 3–4 for the
   closing Related Articles section. Never invent a URL.
4. **Write the MDX article** following the template and rules below.
5. **Elicit genuine human content.** Every article needs at least 2
   `<ParentNote>`/`<ExpertOpinion>` callouts (or 1 plus a logged pending
   request — see below). Never fabricate either.
   1. Check `references/expert-quotes.md` for an existing reusable expert
      quote or a reusable Graham parent story on-topic (it holds both). Cap
      reuse at 2-3 articles per quote/story so it doesn't read as
      duplicated content across the site. Before inserting a reused quote,
      show Graham the full original Q&A it came from (not just the pulled
      line) with the intended excerpt highlighted, and get his go-ahead —
      never drop an isolated quote into a new article on his say-so alone,
      since a true statement in one context can misrepresent the expert's
      view in another.
   2. If nothing fits and the topic is inside Graham's own experience, ask
      him directly in the conversation — plain text questions tailored to
      this article's actual sections, not generic ones — for a real detail
      or opinion. Write his answer into a `<ParentNote>` in his own words,
      house-style edits only, no invention.
   3. If the topic needs outside expertise Graham doesn't have, draft 3-4
      specific questions for a named expert (e.g. Paul Barry). Don't block
      publishing on an answer — ship with what's genuinely available (1
      real callout is acceptable), log the drafted questions in
      `references/expert-quotes.md`'s pending section and against the
      article's tracker row (`npx tsx scripts/seo/cli/content-backlog.ts
      mark --url <path> --expert-quote-pending`).
6. **Run the quality passes** in `references/fact-checking-and-style.md`
   before finalising: evidence attribution, unsupported-claims check,
   AI-slop removal, EEAT review, originality check, FAQ dedup, final link
   audit, sourcing density, callout minimum.
7. **Write the matching `page.tsx`** using the exact template below.
8. **Write both files directly into the project** (see File output below).
9. **Update the content-status tracker** for this URL: `npx tsx
   scripts/seo/cli/content-backlog.ts mark --url <path> --fact-checked
   --ai-slop-checked --personal-story-count <n> --expert-quote-count <n>`
   (the AI-slop-removal quality pass in step 6 covers `--ai-slop-checked`;
   counts from the actual callouts written, `--expert-quote-pending` too if step 5.3
   applied).

## Article requirements

- 1200–2200 words, British English, no em dashes, no markdown tables.
- Strong intro, clear H2/H3 structure, short paragraphs, bullet points where
  useful.
- 5 football-specific observations, 3 parent misconceptions, 3 practical
  examples (see originality requirement in the style reference).
- Safeguarding section (`## Safeguarding and parent checks` or similar) if
  the topic requires it per the style reference.
- Every factual claim needing evidence has a source link on it or right
  after it, at roughly 2 external citation links per 1000 words, never the
  same source twice.
- 3–5 contextual internal links in the body + 3–4 in Related Articles, all
  from `references/valid-urls.md` or the current batch.
- At least 2 `<ParentNote>`/`<ExpertOpinion>` callouts (or 1 plus a logged
  pending expert-quote request) — genuine material only, see workflow step 5.
- Never promise academy or professional success.
- Full rules: `references/fact-checking-and-style.md`.
- Valid link targets: `references/valid-urls.md`.
- Reusable expert quotes: `references/expert-quotes.md`.

## Frontmatter format

```md
---
title: "ARTICLE TITLE"
description: "META DESCRIPTION"
date: "YYYY-MM-DD"
category: "CATEGORY NAME"
categoryUrl: "/category-slug"
readTime: N
sections:
  - id: "h2-slug-one"
    title: "H2 Heading One"
  - id: "h2-slug-two"
    title: "H2 Heading Two"
---
```

Rules:
- `date` is mandatory — use today's date unless the user specifies otherwise.
- Every H2 in the body must appear in `sections`, in order, with `id`
  matching the heading's slug exactly.
- Do not include `relatedArticles` in frontmatter — related articles live in
  the MDX body only.

## Related Articles (bottom of MDX body, mandatory)

```md
## Related Articles

- [Article Title](/url-one)
- [Article Title](/url-two)
- [Article Title](/url-three)
```

3–4 links, from `references/valid-urls.md` or new articles in the same batch.

## page.tsx template (use exactly, only filling in the placeholders)

```tsx
import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "ARTICLE TITLE | Football Parent",
  description: "META DESCRIPTION", // must be word-for-word identical to the mdx frontmatter description
  path: "/category-slug/article-slug",
});

export default async function Page() {
  const article = getArticleBySlug(
    "category-slug",
    "article-slug"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/category-slug/article-slug"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
```

Rules:
- The `generateSEO()` path and the `ArticleLayout path` prop must be
  identical, and must match the live URL exactly.
- The `generateSEO()` `description` is the literal `<meta name="description">`
  tag (also used for OpenGraph/Twitter). It must be word-for-word identical
  to the mdx frontmatter `description` — write the description once, then
  paste the same string into both files. Never draft a second, differently
  worded description for `page.tsx`; a past audit found this had drifted on
  most of the site's existing articles, each page silently shipping generic
  placeholder text in the actual meta tag while a better description sat
  unused in the frontmatter.
- Always use `datePublished={article.frontmatter.date}` — never invent or
  hardcode a `dateModified`.
- Never pass `relatedArticles` into `ArticleLayout`.
- Always pass `content={article.content}` to `ArticleLayout` itself (not just
  to the `<MDXContent>` child) — `ArticleLayout` calls `extractFaqs()` on
  this prop to build FAQPage JSON-LD schema, so omitting it silently drops
  FAQ schema with no visible error. Found 2026-08-11: this line was missing
  from this template for an unknown period and had already shipped on the
  Fulham and Tottenham guides (fixed then, both re-checked against a real
  page render, not just `npm run build`, which does not catch this).
- Only ever generate a file named `page.tsx` — never `new-page.tsx`,
  `article-page.tsx`, or similar.

## File output

Save each article as two files directly into the project (this is a Claude
Code project skill, not a claude.ai outputs workflow):
- `content/<category-slug>/<article-slug>.mdx`
- `app/<category-slug>/<article-slug>/page.tsx`

`<category-slug>` is the directory name matching `categoryUrl` (e.g.
`football-development`, `academy-pathway`, `academy-trials`,
`girls-football`, `parent-guides`, `football-gear`) — these must match the
existing directories under `content/` and `app/` exactly.

After writing both files, add the new route to `app/sitemap.ts` (manually
maintained, not derived from the filesystem — see CLAUDE.md). Briefly note
the category, path, and word count when presenting — no long postamble.

## Reference files

- `references/valid-urls.md` — every valid internal link target, cluster
  priorities, and suggested contextual links by topic. Consult before
  adding any internal link.
- `references/fact-checking-and-style.md` — fact-check triggers, source
  priority order, evidence-attribution rules, safeguarding requirements,
  banned AI-slop phrases, EEAT review, and final style rules. Consult before
  finalising every article.
- `references/expert-quotes.md` — reusable `<ExpertOpinion>` quotes and
  reusable `<ParentNote>` material (Graham's own, trimmed from other
  articles) by topic, plus a log of pending/answered expert-quote requests.
  Check before asking for a new quote or story; append new pending
  requests, trimmed-but-reusable material, and reuse counts here.
