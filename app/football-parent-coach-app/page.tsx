import { notFound } from "next/navigation";
import CoachLandingPage from "@/app/components/CoachLandingPage";
import { getLandingPage, MAIN_LANDING_SLUG } from "@/lib/landing";
import { generateSEO } from "@/lib/seo";

// The main Coach App page. Its content lives in content/landing/main.mdx,
// the same system the ad variants use, so the page that actually ranks can
// be edited without touching code — previously it was the other way round:
// the throwaway variants were editable and the one page worth tuning was
// hardcoded.
//
// Still its own route rather than a [variant] slug, because it is the only
// indexable page in the set and needs the full generateSEO treatment
// (canonical, OpenGraph, Twitter) that the noindex variants deliberately
// skip. lib/landing.ts keeps its slug out of generateStaticParams so the
// same content can't also appear at /football-parent-coach-app/main.

const page = getLandingPage(MAIN_LANDING_SLUG);

export const metadata = generateSEO({
  title: page?.frontmatter.seoTitle ?? page?.frontmatter.h1 ?? "Football Parent Coach App",
  description: page?.frontmatter.seoDescription ?? page?.frontmatter.subhead ?? "",
  path: "/football-parent-coach-app",
  type: "website",
});

export default function CoachAppPage() {
  if (!page) notFound();
  return <CoachLandingPage page={page} />;
}
