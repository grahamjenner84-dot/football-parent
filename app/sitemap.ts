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
  '/academy-pathway/how-to-join-a-football-academy',
  '/academy-pathway/what-age-do-football-academies-recruit',
  '/academy-pathway/what-is-eppp',
  '/academy-pathway/uk-football-development-centres-explained',
  '/academy-pathway/pdc-vs-ptc-vs-rtc-explained',
  '/academy-pathway/how-players-progress-through-football-development-centres',
  '/academy-pathway/chelsea-fc-development-centre-guide',
  '/academy-pathway/arsenal-development-centre-guide',
  '/academy-pathway/crystal-palace-development-centre-guide',
  '/academy-pathway/premier-league-development-centres-list',
  '/academy-pathway/football-scholarships-uk',
  '/academy-pathway/premier-league-development-centres',
  '/academy-pathway/how-to-find-a-football-agent-for-your-child',
  '/academy-pathway/west-ham-player-pathway-guide',

  // Academy Trials
  '/academy-trials/football-academy-trials-uk',
  '/academy-trials/football-trials-near-me',
  '/academy-trials/how-football-scouts-identify-players',
  '/academy-trials/what-do-academy-coaches-look-for',
  '/academy-trials/what-happens-at-academy-trials',
  '/academy-trials/how-to-get-scouted-for-football',
  '/academy-trials/how-football-clubs-recruit-young-players',

  // Football Development
  '/football-development/build-confidence-young-footballers',
  '/football-development/good-football-development-environment',
  '/football-development/how-much-training-is-too-much',
  '/football-development/how-to-become-a-professional-footballer',
  '/football-development/improve-football-decision-making',
  '/football-development/is-private-football-coaching-worth-it',
  '/football-development/late-developers-in-football',
  '/football-development/relative-age-effect-football',
  '/football-development/signs-your-child-is-ready-for-academy-football',
  '/football-development/playing-up-an-age-group-football',
  '/football-development/new-fa-youth-football-format',

  // Football Gear
  '/football-gear/ag-vs-fg-boots',
  '/football-gear/best-football-gloves-for-winter-training',
  '/football-gear/best-footballs-by-age',
  '/football-gear/boots/best-football-boots-for-wide-feet-kids',
  '/football-gear/shin-pads/best-shin-pads-for-kids-football',

  // Girls Football
  '/girls-football/girls-academy-vs-grassroots-football',
  '/girls-football/emerging-talent-centres-explained',
  '/girls-football/girls-football-trials',
  '/girls-football/how-girls-football-academies-work',
  '/girls-football/late-developers-in-girls-football',
  '/girls-football/what-age-do-girls-football-academies-recruit',
  '/girls-football/girls-rtcs-explained',

  // Parent Guides
  '/parent-guides/biggest-football-parent-mistakes',
  '/parent-guides/leave-grassroots-football-for-an-academy',
  '/parent-guides/support-child-after-bad-match',
  '/parent-guides/what-to-say-after-football-matches',
  '/parent-guides/are-football-development-centres-worth-it',
]

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))
}