import type { MetadataRoute } from 'next'
import { getAllArticles } from '@/lib/content'
import { routes } from '@/lib/routes'

const siteUrl = 'https://www.footballparent.co.uk'

// lastmod, derived from content rather than from the clock.
//
// This used to be `new Date()` for every route, which meant all ~90 URLs
// claimed to have changed on every deploy. Google discards lastmod it can
// tell is untrustworthy, so the whole field was dead weight: there was no
// way for a genuinely edited page to stand out from the other 89.
//
// Now an article's lastmod is its own `dateModified ?? date` frontmatter,
// and anything we can't date honestly (home, legal pages, /search, the
// Coach App landing) omits lastmod entirely. Omitting is valid per the
// sitemap spec and is the correct answer for "we don't know" - much better
// than asserting a date we made up.
//
// Routes are keyed on their LAST path segment, not the full path, because
// they aren't uniformly /<category>/<slug>: some football-gear articles sit
// a level deeper (/football-gear/boots/<slug>) while their MDX still lives
// flat in content/football-gear. Same reasoning as getAllArticleSlugs() in
// lib/content.ts. Slugs are unique across categories, so this is unambiguous.
function buildLastModifiedIndex(): Map<string, Date> {
  const index = new Map<string, Date>()

  for (const article of getAllArticles()) {
    const raw = article.frontmatter.dateModified ?? article.frontmatter.date
    if (!raw) continue

    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) continue

    index.set(article.slug, parsed)
  }

  return index
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModifiedBySlug = buildLastModifiedIndex()

  return routes.map((route) => {
    const slug = route.split('/').filter(Boolean).pop()
    const lastModified = slug ? lastModifiedBySlug.get(slug) : undefined

    return {
      url: `${siteUrl}${route}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
    }
  })
}