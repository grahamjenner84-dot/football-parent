import type { MetadataRoute } from 'next'

const siteUrl = 'https://www.footballparent.co.uk'

const routes = [
  '',

  // Category pages
  '/academy-pathway',
  '/academy-trials',
  '/football-development',
  '/football-gear',
  '/girls-football',
  '/parent-guides',

  // Academy Pathway
  '/academy-pathway/academy-categories-explained',
  '/academy-pathway/development-centres-vs-academies',
  '/academy-pathway/how-academy-football-works',
  '/academy-pathway/understanding-academy-release',
  '/academy-pathway/what-age-do-football-academies-recruit',
  '/academy-pathway/what-is-eppp',

  // Academy Trials
  '/academy-trials/football-trials-near-me',
  '/academy-trials/how-football-scouts-identify-players',
  '/academy-trials/what-do-academy-coaches-look-for',
  '/academy-trials/what-happens-at-academy-trials',

  // Football Development
  '/football-development/build-confidence-young-footballers',
  '/football-development/good-football-development-environment',
  '/football-development/how-much-training-is-too-much',
  '/football-development/how-to-become-a-professional-footballer',
  '/football-development/improve-football-decision-making',
  '/football-development/is-private-football-coaching-worth-it',
  '/football-development/late-developers-in-football',
  '/football-development/signs-your-child-is-ready-for-academy-football',

  // Football Gear
  '/football-gear/ag-vs-fg-boots',
  '/football-gear/best-football-gloves-for-winter-training',
  '/football-gear/best-footballs-by-age',
  '/football-gear/boots/best-football-boots-for-wide-feet-kids',
  '/football-gear/shin-pads/best-shin-pads-for-kids-football',

  // Girls Football
  '/girls-football/girls-academy-vs-grassroots-football',
  '/girls-football/girls-football-trials',
  '/girls-football/how-girls-football-academies-work',
  '/girls-football/late-developers-in-girls-football',
  '/girls-football/what-age-do-girls-football-academies-recruit',

  // Parent Guides
  '/parent-guides/biggest-football-parent-mistakes',
  '/parent-guides/leave-grassroots-football-for-an-academy',
  '/parent-guides/support-child-after-bad-match',
  '/parent-guides/what-to-say-after-football-matches',
]

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))
}