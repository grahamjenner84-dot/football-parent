import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
  async rewrites() {
    return [
      {
        source: '/coach-app',
        destination: '/coach-app/index.html',
      },
    ];
  },
};

export default nextConfig;