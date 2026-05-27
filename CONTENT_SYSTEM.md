# Football Parent Content System Refactor

## Overview

The Football Parent site has been refactored to separate content from code. Instead of hardcoding articles as massive JSX files, articles are now:

1. **Markdown/MDX files** in `content/` directory
2. **Rendered dynamically** by reusable `ArticleLayout` component
3. **Managed centrally** in frontmatter (metadata)

## Key Benefits

- ✅ **Lower token usage** — no massive JSX files
- ✅ **Easier publishing** — write in markdown, don't touch code
- ✅ **Scalable** — 1 MDX file + 1 simple page.tsx per article
- ✅ **Consistent styling** — all articles use same layout automatically
- ✅ **Simple maintenance** — update article once, all references work

---

## Directory Structure

```
content/
├── academy-pathway/
│   ├── how-academy-football-works.mdx
│   ├── what-is-eppp.mdx
│   ├── academy-categories-explained.mdx
│   ├── development-centres-vs-academies.mdx
│   └── what-age-do-football-academies-recruit.mdx
├── academy-trials/
│   ├── what-happens-at-academy-trials.mdx
│   ├── how-football-scouts-identify-players.mdx
├── football-development/
│   ├── improve-football-decision-making.mdx
│   ├── good-football-development-environment.mdx
│   ├── how-much-training-is-too-much.mdx
│   └── signs-your-child-is-ready-for-academy-football.mdx
├── football-gear/
│   ├── ag-vs-fg-boots.mdx
│   └── kit-essentials.mdx
└── parent-guides/
    ├── biggest-football-parent-mistakes.mdx
    └── should-my-child-leave-grassroots-football-for-an-academy.mdx

app/
├── academy-pathway/
│   ├── how-academy-football-works/
│   │   └── page.tsx (simple, imports from content)
│   ├── what-is-eppp/
│   │   └── page.tsx
│   └── ... (one page.tsx per article)
├── academy-trials/
│   └── ... (same pattern)
└── ... (all other categories)
```

---

## How It Works

### 1. MDX Article File Structure

Each article lives in `content/[category]/[slug].mdx`:

```mdx
---
title: "How Academy Football Works In The UK"
description: "A guide to understanding the EPPP framework..."
category: "Academy Pathway"
categoryUrl: "/academy-pathway"
readTime: 15
sections:
  - id: "quick"
    title: "Quick Overview"
  - id: "phases"
    title: "Academy Phases"
relatedArticles:
  - href: "/academy-pathway/what-is-eppp"
    title: "What Is EPPP?"
    color: "from-teal-50 to-teal-100"
    description: "Understanding the framework..."
---

## Quick Overview

Your markdown content here...

---

## Next Section

More content...
```

### 2. Frontmatter Fields

| Field | Type | Purpose |
|-------|------|---------|
| `title` | string | Article headline |
| `description` | string | Meta description & intro text |
| `category` | string | Display category name |
| `categoryUrl` | string | Link to category page |
| `readTime` | number | Estimated read time in minutes |
| `sections` | array | TOC items for sticky nav |
| `relatedArticles` | array | Cards shown at bottom |

### 3. Page Component

Each `app/[category]/[slug]/page.tsx` is now minimal:

```tsx
import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "...",
  description: "...",
};

export default async function Page() {
  const article = getArticleBySlug("category-name", "slug-name");

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

## How to Add a New Article

### Step 1: Create the MDX file

Create `content/[category]/[new-slug].mdx`:

```mdx
---
title: "Your Article Title"
description: "Short description for SEO and intro paragraph"
category: "Display Category Name"
categoryUrl: "/category-url"
readTime: 12
sections:
  - id: "section1"
    title: "First Section"
  - id: "section2"
    title: "Second Section"
relatedArticles:
  - href: "/related-article-1"
    title: "Related Article Title"
    color: "from-blue-50 to-blue-100"
    description: "Brief description"
---

## First Section

Content in markdown...

### Subsection

More content...

---

## Second Section

More markdown...
```

### Step 2: Create the page component

Create `app/[category]/[slug]/page.tsx`:

```tsx
import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Your Article Title | Football Parent",
  description: "Your meta description",
};

export default async function Page() {
  const article = getArticleBySlug("category-name", "new-slug");

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
```

### Step 3: Done

The article is now published with full styling, navigation, and related articles automatically included.

---

## Formatting Reference

### Headers

```mdx
## H2 (main section)
### H3 (subsection)
#### H4 (sub-subsection)
```

### Lists

```mdx
- Bullet point
- Another point
  - Nested point

1. Numbered item
2. Second item
```

### Callout Box

Markdown:
```mdx
> **Football Parent note:** This is a callout. It renders with blue styling.
```

HTML (if needed):
```html
<div className="bg-blue-50 border-l-4 border-blue-500 p-4">
  <p><strong>Football Parent note:</strong> Content here...</p>
</div>
```

### Tables

```mdx
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data | Data | Data |
| Data | Data | Data |
```

### Bold/Italic

```mdx
**Bold text**
*Italic text*
```

---

## Related Articles Colors

Use these gradient colors for consistency:

- `from-blue-50 to-blue-100` — Primary blue
- `from-teal-50 to-teal-100` — Teal
- `from-amber-50 to-amber-100` — Amber
- `from-purple-50 to-purple-100` — Purple
- `from-emerald-50 to-emerald-100` — Green

---

## Styling Notes

The `MDXContent` component automatically applies:

- Prose styling from Tailwind
- Proper heading hierarchy
- Table styling with borders and alternating rows
- List formatting
- Blockquote styling (blue border, blue background)
- Link colors and hover states

You don't need to add HTML classes — just write clean markdown.

---

## Migration Checklist

For converting existing hardcoded JSX articles:

- [ ] Copy article content to `.mdx` file
- [ ] Add frontmatter with metadata
- [ ] Update page.tsx to import from content
- [ ] Test the page renders correctly
- [ ] Verify all links work
- [ ] Check related articles are correct

---

## Utilities Available

### `getArticleBySlug(category, slug)`

Returns: `{ frontmatter, content, slug }`

```ts
const article = getArticleBySlug("academy-pathway", "how-academy-football-works");
// article.frontmatter contains all metadata
// article.content contains markdown
```

### `getArticlesInCategory(category)`

Returns: `string[]` of slugs

```ts
const slugs = getArticlesInCategory("academy-pathway");
// Returns: ["how-academy-football-works", "what-is-eppp", ...]
```

### `getAllArticles()`

Returns: `Article[]`

```ts
const articles = getAllArticles();
// Returns all articles across all categories
```

---

## SEO Metadata

Each article's `page.tsx` sets metadata:

```tsx
export const metadata = {
  title: "Article Title | Football Parent",  // Page title (50-60 chars)
  description: "Meta description...",  // Meta description (150-160 chars)
};
```

These match the frontmatter values or can be customized per page.

---

## Future Enhancements

Once comfortable with the system, you can:

1. **Auto-generate category pages** — pull all .mdx files in category, display as grid
2. **Auto-generate sitemap** — list all articles from `content/`
3. **Add search** — index all .mdx files by title/description
4. **Analytics** — track which articles are most read
5. **Comments** — add discussion per article (if desired)

All possible without touching article files — just utilities and category pages.

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/ArticleLayout.tsx` | Reusable layout wrapper for all articles |
| `lib/MDXContent.tsx` | MDX rendering with auto styling |
| `lib/content.ts` | Utilities to read/parse MDX files |
| `content/[category]/` | Article files organized by category |

---

## Questions?

The system is designed to be simple. If an article won't render:

1. Check frontmatter is valid YAML
2. Verify `getArticleBySlug()` params match file location
3. Ensure page.tsx is in correct path
4. Check for typos in category/slug names

That's typically 90% of issues. MDX rendering is handled automatically.
