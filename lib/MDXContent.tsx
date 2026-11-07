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
import { InterviewQuestion, InterviewAnswer } from "@/app/components/mdx/Interview";
import type { ArticleDesign } from "@/lib/comic-design";
import { affiliateLinkProps } from "@/lib/affiliate";
import { competitorLinkProps } from "@/lib/externalLinks";
import CoachAppBanner, {
  bannerStyleForKey,
  defaultAudienceForSlug,
  SHARE_BANNER_KEPT_SLUGS,
  type CoachAppAudience,
  type CoachAppPlacement,
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
  InterviewQuestion,
  InterviewAnswer,

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

// The comic-accent design (lib/comic-design.ts, design: "comic"): its own
// element styles, from the "Article components" and "Interview" boards of
// the homepage concepts canvas, and the comic versions of the callouts.
// Classic pages never see any of this.
const slugify = (children: unknown) =>
  typeof children === "string"
    ? children
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
    : "";

const comicComponents = {
  ...components,
  ParentNote: (props: React.ComponentProps<typeof ParentNote>) => (
    <ParentNote {...props} design="comic" />
  ),
  ExpertOpinion: (props: React.ComponentProps<typeof ExpertOpinion>) => (
    <ExpertOpinion {...props} design="comic" />
  ),
  ExpertQA: (props: React.ComponentProps<typeof ExpertQA>) => (
    <ExpertQA {...props} design="comic" />
  ),
  InterviewQuestion: (props: React.ComponentProps<typeof InterviewQuestion>) => (
    <InterviewQuestion {...props} design="comic" />
  ),
  InterviewAnswer: (props: React.ComponentProps<typeof InterviewAnswer>) => (
    <InterviewAnswer {...props} design="comic" />
  ),
  InstagramPromo: () => <InstagramPromo design="comic" />,
  InfoTable: (props: React.ComponentProps<typeof InfoTable>) => <InfoTable {...props} design="comic" />,
  GearPicks: (props: React.ComponentProps<typeof GearPicks>) => <GearPicks {...props} design="comic" />,

  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2
      id={slugify(children)}
      className="scroll-mt-24 mt-14 mb-4 font-display text-[30px] font-extrabold leading-[1.1] text-[#201E1D] first:mt-0 sm:text-[34px]"
    >
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-8 mb-2 font-display text-2xl font-extrabold leading-[1.2] text-[#201E1D]">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mt-6 mb-2 text-lg font-bold text-[#201E1D]">{children}</h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-[18px]">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-[22px] list-disc pl-6">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-[22px] list-decimal pl-6">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="mb-2">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold text-[#201E1D]">{children}</strong>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => {
    const url = typeof href === "string" ? href : "";
    return (
      <a
        href={url}
        className="font-medium text-[#1F5FD6] underline underline-offset-[3px] transition hover:text-[#174AA8]"
        {...affiliateLinkProps(url)}
        {...competitorLinkProps(url)}
      >
        {children}
      </a>
    );
  },
  hr: () => <hr className="my-12 border-0 border-t-2 border-[#E8E4DA]" />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-6 overflow-x-auto rounded-xl border-[3px] border-[#201E1D]">
      <table className="w-full border-collapse">{children}</table>
    </div>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="[&:nth-child(even)]:bg-[#FFF8E1]">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-b-2 border-[#201E1D] bg-[#FFC400] p-3 text-left font-bold text-[#201E1D]">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-t border-[#C9C4BA] p-3">{children}</td>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-8 rounded-[14px] border-[3px] border-[#201E1D] bg-[#FFE89A] px-[22px] pt-[18px] pb-1 shadow-[5px_5px_0_#201E1D]">
      {children}
    </blockquote>
  ),
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
  // Where the mid-article Coach App banner reports its clicks from
  // (CoachAppPlacement). "article" unless a page has its own tag.
  coachAppPlacement?: CoachAppPlacement;
  // "comic" renders the callouts in the comic-accent design. Pass the
  // article's frontmatter `design`, the same value ArticleLayout gets.
  design?: ArticleDesign;
}

export async function MDXContent({
  content,
  coachAppBanner,
  slug,
  coachAppPlacement = "article",
  design = "classic",
}: MDXContentProps) {
  const mdxComponents = design === "comic" ? comicComponents : components;
  const split =
    coachAppBanner === "none" ? null : splitAtMiddleHeading(content);
  // One app per article, in the mid-article slot: the Coach App for coach
  // pages (/coaching/*, set to "coach", and COACH_AUDIENCE_SLUGS), Progress
  // (the parents' app) for every other article. Parent and share audiences
  // used to get a Coach App banner here and Progress at the end; since
  // PARENT_ARTICLE_BANNER_ENDED_AT Progress takes the middle and the end
  // banner is gone. Landing pages ("none") get neither. SHARE_BANNER_KEPT_SLUGS
  // keep the Coach App share banner instead.
  const audience =
    coachAppBanner && coachAppBanner !== "none" ? coachAppBanner : defaultAudienceForSlug(slug);
  const showProgress = audience !== "coach" && !(slug && SHARE_BANNER_KEPT_SLUGS.has(slug));
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
    <div
      className={
        design === "comic"
          ? "fp-comic-prose text-[18px] leading-[1.75] text-[#33312E]"
          : "space-y-6 text-gray-700 leading-relaxed max-w-none"
      }
    >
      {split ? (
        <>
          <MDXRemote
            source={split[0]}
            components={mdxComponents}
            options={mdxOptions}
          />

          {showProgress ? (
            <ProgressBanner
              design={design}
              placement={inAcademyPathway ? "academy-pathway" : "article"}
              inArticle
              test={progressTest}
            />
          ) : (
            <CoachAppBanner
              audience={audience}
              style={inCoaching ? "sponsor" : bannerStyleForKey(slug)}
              placement={coachAppPlacement}
              // The comic frame only on the Coaching sponsor banner. Elsewhere
              // articles are split dark vs light (AB_TEST_ENABLED), and framing
              // only the dark one would skew that comparison.
              design={inCoaching ? design : undefined}
            />
          )}

          <MDXRemote
            source={split[1]}
            components={mdxComponents}
            options={mdxOptions}
          />
        </>
      ) : (
        <>
          <MDXRemote
            source={content}
            components={mdxComponents}
            options={mdxOptions}
          />

          {/* An article too short or flat to split still gets Progress, at
              the end as before. */}
          {coachAppBanner !== "none" && showProgress && (
            <ProgressBanner
              design={design}
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
