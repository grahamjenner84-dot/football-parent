import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import React from "react";
import Link from "next/link";
import InfoTable from "@/app/components/mdx/InfoTable";
import ParentNote from "@/app/components/mdx/ParentNote";
import ExpertOpinion from "@/app/components/mdx/ExpertOpinion";
import ExpertQA, { ExpertQAItem } from "@/app/components/mdx/ExpertQA";
import AffiliateDisclosure from "@/app/components/mdx/AffiliateDisclosure";
import GearPicks from "@/app/components/mdx/GearPicks";
import InstagramEmbed from "@/app/components/mdx/InstagramEmbed";
import InstagramPromo from "@/app/components/mdx/InstagramPromo";
import ToolCallout from "@/app/components/mdx/ToolCallout";
import { affiliateLinkProps } from "@/lib/affiliate";
import { competitorLinkProps } from "@/lib/externalLinks";
import CoachAppBanner, {
  bannerStyleForKey,
  defaultAudienceForSlug,
  type CoachAppAudience,
} from "@/app/components/CoachAppBanner";
import ProgressBanner from "@/app/components/ProgressBanner";
import { routes } from "@/lib/routes";

// Custom components for MDX rendering with styling
const components = {
  InfoTable,
  ParentNote,
  ExpertOpinion,
  ExpertQA,
  ExpertQAItem,
  AffiliateDisclosure,
  GearPicks,
  InstagramEmbed,
  InstagramPromo,
  ToolCallout,

  h2: ({ children }: any) => (
    <h2
      id={
        typeof children === "string"
          ? children
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-")
          : ""
      }
      className="scroll-mt-24 text-3xl font-bold text-gray-900 mb-6 pt-8"
    >
      {children}
    </h2>
  ),

  h3: ({ children }: any) => (
    <h3 className="text-xl font-bold text-gray-900 mb-4 pt-4">
      {children}
    </h3>
  ),

  h4: ({ children }: any) => (
    <h4 className="text-lg font-bold text-gray-900 mb-3">
      {children}
    </h4>
  ),

  p: ({ children }: any) => (
    <p className="leading-8 mb-4">{children}</p>
  ),

  ul: ({ children }: any) => (
    <ul className="list-disc list-inside space-y-2 mb-6 ml-2">
      {children}
    </ul>
  ),

  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-2 mb-6 ml-2">
      {children}
    </ol>
  ),

  li: ({ children }: any) => (
    <li className="leading-8">{children}</li>
  ),

  strong: ({ children }: any) => (
    <strong className="font-bold">{children}</strong>
  ),

  em: ({ children }: any) => (
    <em className="italic">{children}</em>
  ),

  a: ({ children, href }: any) => {
    const url = typeof href === "string" ? href : "";

    return (
      <a
        href={url}
        className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 transition"
        {...affiliateLinkProps(url)}
        {...competitorLinkProps(url)}
      >
        {children}
      </a>
    );
  },

  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-6">
      <table className="w-full border-collapse border border-gray-300">
        {children}
      </table>
    </div>
  ),

  thead: ({ children }: any) => <thead>{children}</thead>,

  tbody: ({ children }: any) => <tbody>{children}</tbody>,

  tr: ({ children }: any) => (
    <tr className="[&:nth-child(even)]:bg-gray-50">
      {children}
    </tr>
  ),

  th: ({ children }: any) => (
    <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-100">
      {children}
    </th>
  ),

  td: ({ children }: any) => (
    <td className="border border-gray-300 p-3">
      {children}
    </td>
  ),

  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 my-6">
      {children}
    </blockquote>
  ),
};

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
  },
};

// Find the "## " heading nearest the middle of the article and split there, so
// the Coach App banner lands between two sections rather than interrupting one.
// Only splits at a heading in the middle 30-70% of the body, and only counts
// headings outside fenced code blocks - if nothing qualifies (short article,
// too few headings) it returns null and the article renders as one block.
//
// A heading that comes soon after an expert or parent callout is skipped, so
// the banner never sits straight after one: callouts are there to break up
// the prose, and two boxes back to back read as one wall. "Soon" is less
// than CALLOUT_GAP characters of prose between the callout and the heading.
const CALLOUT_CLOSE = /^\s*<\/(ExpertQA|ExpertOpinion|ParentNote)>\s*$/;
const CALLOUT_GAP = 400;

function splitAtMiddleHeading(content: string): [string, string] | null {
  const lines = content.split("\n");
  const total = content.length;

  if (total < 3000) return null;

  const candidates: { line: number; offset: number }[] = [];
  let offset = 0;
  let inFence = false;
  let lastCalloutEnd = -Infinity;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
    } else if (!inFence && CALLOUT_CLOSE.test(line)) {
      lastCalloutEnd = offset + line.length + 1;
    } else if (!inFence && /^## /.test(line)) {
      if (offset - lastCalloutEnd >= CALLOUT_GAP) {
        candidates.push({ line: i, offset });
      }
    }

    offset += line.length + 1;
  }

  const inRange = candidates.filter(
    (c) => c.offset > total * 0.3 && c.offset < total * 0.7
  );

  if (inRange.length === 0) return null;

  const best = inRange.reduce((a, b) =>
    Math.abs(b.offset - total / 2) < Math.abs(a.offset - total / 2) ? b : a
  );

  return [
    lines.slice(0, best.line).join("\n").trimEnd(),
    lines.slice(best.line).join("\n"),
  ];
}

interface MDXContentProps {
  content: string;
  // "none" opts a page out of the mid-article Coach App banner entirely.
  // Left unset, the audience comes from the slug (defaultAudienceForSlug).
  coachAppBanner?: CoachAppAudience | "none";
  // The article's slug, used only to assign it one arm of the banner A/B
  // test. Stable across content edits, unlike hashing the body would be.
  slug?: string;
}

export async function MDXContent({
  content,
  coachAppBanner,
  slug,
}: MDXContentProps) {
  const split =
    coachAppBanner === "none" ? null : splitAtMiddleHeading(content);
  // One app per article, in the mid-article slot: the Coach App for coach
  // pages (/coaching/*, set to "coach", and COACH_AUDIENCE_SLUGS), Progress
  // (the parents' app) for every other article. Parent and share audiences
  // used to get a Coach App banner here and Progress at the end; since
  // PARENT_ARTICLE_BANNER_ENDED_AT Progress takes the middle and the end
  // banner is gone. Landing pages ("none") get neither.
  const audience =
    coachAppBanner && coachAppBanner !== "none" ? coachAppBanner : defaultAudienceForSlug(slug);
  const showProgress = audience !== "coach";
  // Progress sponsors the Academy Pathway section: its articles get the
  // sponsor version of the banner.
  const inAcademyPathway =
    !!slug && routes.some((r) => r === `/academy-pathway/${slug}`);
  // The trial/development-centre banner A/B test runs on Academy Pathway
  // and Academy Trials articles only (lib/progress-banner-test.ts).
  const progressTest =
    inAcademyPathway ||
    (!!slug && routes.some((r) => r === `/academy-trials/${slug}`));
  // The Coach App sponsors the Coaching section: the mid-article banner on
  // its articles is the sponsor creative rather than an arm of the A/B test.
  const inCoaching = !!slug && routes.some((r) => r === `/coaching/${slug}`);

  return (
    <div className="space-y-6 text-gray-700 leading-relaxed max-w-none">
      {split ? (
        <>
          <MDXRemote
            source={split[0]}
            components={components}
            options={mdxOptions}
          />

          {showProgress ? (
            <ProgressBanner
              placement={inAcademyPathway ? "academy-pathway" : "article"}
              inArticle
              test={progressTest}
            />
          ) : (
            <CoachAppBanner
              audience={audience}
              style={inCoaching ? "sponsor" : bannerStyleForKey(slug)}
            />
          )}

          <MDXRemote
            source={split[1]}
            components={components}
            options={mdxOptions}
          />
        </>
      ) : (
        <>
          <MDXRemote
            source={content}
            components={components}
            options={mdxOptions}
          />

          {/* An article too short or flat to split still gets Progress, at
              the end as before. */}
          {coachAppBanner !== "none" && showProgress && (
            <ProgressBanner
              placement={inAcademyPathway ? "academy-pathway" : "article"}
              inArticle
              test={progressTest}
            />
          )}
        </>
      )}
    </div>
  );
}
