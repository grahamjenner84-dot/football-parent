import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas'],
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
};

export default nextConfig;