import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CoachLandingPage from "@/app/components/CoachLandingPage";
import { getLandingPage, getLandingSlugs } from "@/lib/landing";

// One route serving every landing variant from content/landing/*.mdx.
//
// generateStaticParams means these are prerendered at build time, exactly
// like the hand-written article pages - so an ad click still gets static
// HTML, which is what Google Ads' landing page experience is assessed on.
// A dynamic route here does not mean a dynamically rendered page.
//
// These live under /football-parent-coach-app/ for now. When the app moves
// off /coach-app/ they move with the parent page to /coach-app/<variant>,
// which is the shorter URL these were always meant to have.

export function generateStaticParams() {
  return getLandingSlugs().map((variant) => ({ variant }));
}

// Variants are noindex by default - see the `index` field in lib/landing.ts
// for why. `follow: true` so the links out of them are still crawled; there
// is no reason to waste the internal linking just because the page itself
// should not rank.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ variant: string }>;
}): Promise<Metadata> {
  const { variant } = await params;
  const page = getLandingPage(variant);
  if (!page) return {};

  const { frontmatter } = page;
  const indexable = frontmatter.index === true;

  return {
    title: frontmatter.seoTitle ?? frontmatter.h1,
    description: frontmatter.seoDescription ?? frontmatter.subhead,
    robots: { index: indexable, follow: true },
    // Only an indexable variant gets a canonical of its own. Pointing a
    // noindex page's canonical at the main page would be contradictory -
    // canonical says "index this other page instead", noindex says "don't
    // index me" - and Google treats the pair as a conflicting signal.
    ...(indexable
      ? {
          alternates: {
            canonical: `https://www.footballparent.co.uk/football-parent-coach-app/${variant}`,
          },
        }
      : {}),
  };
}

export default async function LandingVariantPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  const page = getLandingPage(variant);
  if (!page) notFound();

  return <CoachLandingPage page={page} />;
}
