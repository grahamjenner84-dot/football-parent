import type { Metadata } from "next";

const siteUrl = "https://www.footballparent.co.uk";

type SEOProps = {
  title: string;
  description: string;
  path: string;
  type?: "article" | "website";
  image?: string;
};

export function generateSEO({
  title,
  description,
  path,
  type = "article",
  image = "/og-default.jpg",
}: SEOProps): Metadata {
  const url = `${siteUrl}${path}`;
  const imageUrl = `${siteUrl}${image}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Football Parent",
      locale: "en_GB",
      type,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}