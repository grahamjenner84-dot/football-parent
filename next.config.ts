import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas'],
  // The reviewed outreach backlogs written by the link-building skill are
  // plain JSON in the repo; ship them with the route that loads them into
  // the queue from /admin/outreach (nothing imports them, so tracing alone
  // would leave them out of the deployment).
  outputFileTracingIncludes: {
    '/api/outreach/backlogs': ['./seo-data/exports/outreach-backlog-*.json'],
    // Our own domain strength, shown at the top of /admin/outreach.
    '/api/outreach': ['./seo-data/exports/our-domain-strength.json'],
  },
  async redirects() {
    return [
      // A mistyped inbound link picked up a trailing colon, most likely from
      // a citation or post that wrote the URL followed by ": Title" and had
      // the auto-linker swallow the colon. It sent 25 hits on 9 September,
      // every one of them to a 404. The colon is escaped because ':' starts
      // a route parameter in Next's matcher. Only the literal colon is
      // covered: a percent-encoded %3A still 404s, and an explicit rule for
      // that form does not match either. It is the literal colon that the
      // logged hits actually carry, and an encoded one now lands on the
      // real 404 page rather than being counted as a view.
      {
        source: '/parent-guides/what-is-grassroots-football\\:',
        destination: '/parent-guides/what-is-grassroots-football',
        permanent: true,
      },
      // Moved 3 October 2026: Google left the old slug in "Discovered -
      // currently not indexed" from May, and it read as a twin of
      // what-to-say-after-football-matches. The article is about a run of
      // poor form and lost confidence, not one bad match.
      {
        source: '/parent-guides/support-child-after-bad-match',
        destination: '/parent-guides/child-lost-confidence-in-football',
        permanent: true,
      },
      {
        source: '/pdc-vs-ptc-vs-rtc-explained',
        destination: '/academy-pathway/pdc-vs-ptc-vs-rtc-explained',
        permanent: true,
      },
      {
        source: '/uk-football-development-centres-explained',
        destination: '/academy-pathway/uk-football-development-centres-explained',
        permanent: true,
      },
      {
        source: '/academy-pathway/chelsea-development-centre-guide',
        destination: '/academy-pathway/chelsea-fc-development-centre-guide',
        permanent: true,
      },
      {
        source: '/academy-pathway/how-players-progress-through-development-centres',
        destination: '/academy-pathway/how-players-progress-through-football-development-centres',
        permanent: true,
      },
      {
        source: '/academy-pathway/arsenal-fc-development-centre-guide',
        destination: '/academy-pathway/arsenal-development-centre-guide',
        permanent: true,
      },
      {
        source: '/academy-pathway/premier-league-development-centres-guide',
        destination: '/academy-pathway/premier-league-development-centres-list',
        permanent: true,
      },
      {
        source: '/academy-pathway/premier-league-development-centres',
        destination: '/academy-pathway/football-development-centres-near-me',
        permanent: true,
      },
    ];
  },
  // In production /coach-app is a Vercel rewrite to the app's own deployment
  // (vercel.json), which `npm run dev` knows nothing about: the Coach App
  // links 404 locally and the calculator page's iframe comes up empty. This
  // proxies the same path to the live app in development only, so the
  // embed can be checked on localhost. Same-origin from the browser's point
  // of view, exactly as in production. Never active in a build.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [
      {
        source: '/coach-app/:path*',
        destination: 'https://coach-app-zeta.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;