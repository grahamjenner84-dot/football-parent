import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import React from "react";
import Link from "next/link";
import InfoTable from "@/app/components/mdx/InfoTable";
import ParentNote from "@/app/components/mdx/ParentNote";
import ExpertOpinion from "@/app/components/mdx/ExpertOpinion";
import AffiliateDisclosure from "@/app/components/mdx/AffiliateDisclosure";
import GearPicks from "@/app/components/mdx/GearPicks";
import { affiliateLinkProps } from "@/lib/affiliate";
import CoachAppBanner, {
  bannerStyleForKey,
  type CoachAppAudience,
} from "@/app/components/CoachAppBanner";

// Custom components for MDX rendering with styling
const components = {
  InfoTable,
  ParentNote,
  ExpertOpinion,
  AffiliateDisclosure,
  GearPicks,

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
function splitAtMiddleHeading(content: string): [string, string] | null {
  const lines = content.split("\n");
  const total = content.length;

  if (total < 3000) return null;

  const candidates: { line: number; offset: number }[] = [];
  let offset = 0;
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
    } else if (!inFence && /^## /.test(line)) {
      candidates.push({ line: i, offset });
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
  coachAppBanner?: CoachAppAudience | "none";
  // The article's slug, used only to assign it one arm of the banner A/B
  // test. Stable across content edits, unlike hashing the body would be.
  slug?: string;
}

export async function MDXContent({
  content,
  coachAppBanner = "parent",
  slug,
}: MDXContentProps) {
  const split =
    coachAppBanner === "none" ? null : splitAtMiddleHeading(content);

  return (
    <div className="space-y-6 text-gray-700 leading-relaxed max-w-none">
      {split ? (
        <>
          <MDXRemote
            source={split[0]}
            components={components}
            options={mdxOptions}
          />

          <CoachAppBanner
            audience={coachAppBanner === "none" ? "parent" : coachAppBanner}
            style={bannerStyleForKey(slug)}
          />

          <MDXRemote
            source={split[1]}
            components={components}
            options={mdxOptions}
          />
        </>
      ) : (
        <MDXRemote
          source={content}
          components={components}
          options={mdxOptions}
        />
      )}
    </div>
  );
}