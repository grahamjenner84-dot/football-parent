import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'http://footballparent.co.uk',
      lastModified: new Date(),
    },
  ]
}