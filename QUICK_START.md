# Quick Start: Publishing Your First Article

## The Simplest Possible Example

This guide shows the exact steps to add one complete article to the site.

---

## Step 1: Create the MDX File

Create a new file: `content/academy-pathway/my-new-article.mdx`

Copy this template and fill it in:

```mdx
---
title: "Why Grassroots Players Should Consider Academies"
description: "Understanding when and how to move from grassroots club football to a formal academy."
category: "Academy Pathway"
categoryUrl: "/academy-pathway"
readTime: 8
sections:
  - id: "when"
    title: "When to Move to an Academy"
  - id: "pros"
    title: "Pros of Academy Football"
  - id: "cons"
    title: "Cons of Academy Football"
  - id: "faq"
    title: "FAQ"
relatedArticles:
  - href: "/academy-pathway/what-age-do-football-academies-recruit"
    title: "What Age Do Academies Recruit?"
    color: "from-blue-50 to-blue-100"
    description: "Understanding recruitment windows and trial timing."
  - href: "/academy-trials/what-happens-at-academy-trials"
    title: "What Happens at Academy Trials?"
    color: "from-teal-50 to-teal-100"
    description: "Practical guide to the trial day experience."
---

## When to Move to an Academy

Most players have the opportunity to join an academy between Under-9 and Under-14. The decision about whether to accept is often more complex than whether they've been invited.

---

## Pros of Academy Football

**Better coaching**: Academies employ specialist coaches with licenses and experience.

**Structured development**: Clear progression pathways and age-appropriate training.

**Competition**: Playing against other academy players accelerates development.

**Facilities**: Better pitches, training grounds, and equipment.

---

## Cons of Academy Football

**Time commitment**: Multiple sessions per week, often midweek.

**Travel burden**: Not all facilities are local; families often spend 2+ hours driving per week.

**Pressure**: More intense competition can affect enjoyment for some players.

**Inflexibility**: Released players sometimes struggle emotionally.

---

## FAQ

**Q: Should my child leave grassroots to join an academy?**

A: It depends on your family situation. If the commute is manageable and your child is excited about it, academies offer great development. If it would stress your family significantly, grassroots football is also excellent.

**Q: Can my child do both?**

A: Typically no. Once in a formal academy, EPPP rules restrict dual participation.

**Q: What if my child doesn't like academy football?**

A: Many players step back to grassroots and rejoin later. There's no "wrong" decision.
```

---

## Step 2: Create the Page Component

Create a new file: `app/academy-pathway/my-new-article/page.tsx`

Paste this code:

```tsx
import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Why Grassroots Players Should Consider Academies | Football Parent",
  description: "Understanding when and how to move from grassroots club football to a formal academy.",
};

export default async function Page() {
  const article = getArticleBySlug("academy-pathway", "my-new-article");

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      relatedArticles={article.frontmatter.relatedArticles}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
```

---

## Step 3: That's It!

Run:
```bash
npm run dev
```

Navigate to: `http://localhost:3000/academy-pathway/my-new-article`

Your article is live with:
- ✅ Breadcrumb navigation
- ✅ Sticky table of contents
- ✅ Professional styling
- ✅ Related articles
- ✅ Author info block
- ✅ Mobile responsive

---

## Real Example from the Site

This is the actual `how-academy-football-works` article:

**MDX file**: `content/academy-pathway/how-academy-football-works.mdx` (~100 lines)
**Page component**: `app/academy-pathway/how-academy-football-works/page.tsx` (~25 lines)

View them to see the pattern in action.

---

## Key Points

**File naming must match**:
- MDX: `content/academy-pathway/my-new-article.mdx`
- Page: `app/academy-pathway/my-new-article/page.tsx`
- URL: `http://localhost:3000/academy-pathway/my-new-article`

The file name is used by `getArticleBySlug()` — if they don't match, the article won't load.

**Frontmatter must be valid YAML**:
- Use spaces, not tabs
- Dashes for lists: `- item`
- Colons after keys: `title: "value"`

**Section IDs must match headings**:
```mdx
sections:
  - id: "when"
    title: "When to Move"

## When to Move   <-- Must have matching ID in frontmatter
```

---

## Content Guidelines

### For Parents
- Use conversational tone
- Avoid jargon or explain it
- Include real examples
- Address fears/concerns directly

### Formatting
- Use `##` for main sections (these appear in TOC)
- Use `###` for subsections
- Break up long paragraphs with lists or tables
- Use `> **Football Parent note:**` for tips

### Related Articles
- Link to 2-3 closely related articles
- Use specific color gradient for visual distinction
- Write clear descriptions so readers know why they're relevant

---

## Testing Locally

1. Save your MDX file
2. Save your page.tsx file
3. Run `npm run dev`
4. Open browser to your article URL
5. Check:
   - Heading renders correctly
   - TOC appears on desktop
   - Markdown formatting looks right
   - Related articles appear at bottom
   - Mobile view is readable

If something looks wrong, check:
- Frontmatter valid? (use an online YAML validator)
- File names match exactly?
- Markdown syntax correct? (especially tables)

---

## Deployment

Just commit and push:

```bash
git add content/academy-pathway/my-new-article.mdx
git add app/academy-pathway/my-new-article/page.tsx
git commit -m "Add article: Why Grassroots Players Should Consider Academies"
git push
```

Next.js auto-detects the new pages and deploys them. No special configuration needed.

---

## Styling is Automatic

You don't need to add any CSS. The system handles:

- `##` headings → 3xl font, bold, proper spacing
- Lists → disc bullets, proper indentation
- Tables → bordered, alternating row colors
- `> **Note:**` → blue callout box styling
- Links → blue color with hover effect

Just write clean markdown and styling applies automatically.

---

## Common Mistakes to Avoid

| Mistake | Fix |
|---------|-----|
| YAML uses tabs | Use spaces (2 or 4 per indent) |
| Section IDs don't match headings | Make sure `sections` array IDs match `##` heading text |
| File names have different cases | `my-article.mdx` in content, `my-article` in page path |
| Forgot to create page.tsx | Article page won't render without both files |
| Bad markdown syntax (tables) | Check alignment and pipe characters |

---

## You're Ready!

Pick a topic, create the MDX file + page.tsx, and publish. The system handles the rest.

For questions, see:
- `CONTENT_SYSTEM.md` for detailed technical docs
- `REFACTORING_COMPLETE.md` for architecture overview
- `ARTICLE_TEMPLATE.mdx` for a blank template
