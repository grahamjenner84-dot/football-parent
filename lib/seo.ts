import type { Metadata } from "next";

const siteUrl = "https://www.footballparent.co.uk";

type SEOProps = {
  title: string;
  description: string;
  path: string;
  type?: "article" | "website";
};

export function generateSEO({
  title,
  description,
  path,
  type = "article",
}: SEOProps): Metadata {
  const url = `${siteUrl}${path}`;

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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}