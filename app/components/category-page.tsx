import type { ReactNode } from "react";
import Link from "next/link";
import { firaSansCondensed } from "@/lib/comic-design";
import GuideFilter from "./GuideFilter";

type Article = {
  title: string;
  href: string;
  description: string;
};

type StartHereLink = {
  title: string;
  href: string;
  description: string;
};

type StartHereSection = {
  title: string;
  description?: string;
  links: StartHereLink[];
};

type BottomContentSection = {
  title: string;
  content: string[];
};

// A named set of guides, shown under its own heading with a filter chip
// (Academy Pathway). `hrefs` picks guides out of `articles` in the order
// listed; every article has to be in exactly one group.
export type GuideGroup = {
  id: string;
  label: string;
  heading: string;
  subheading?: string;
  hrefs: string[];
};

type CategoryPageProps = {
  title: string;
  description: string;
  articles: Article[];
  groups?: GuideGroup[];
  intro?: string[];
  startHere?: StartHereSection;
  articlesHeading?: string;
  bottomContent?: BottomContentSection;
  // Section-level promo. Optional: most categories don't have one.
  promo?: ReactNode;
  // Where the promo sits: "grid" (the original slot, directly above the
  // guide grid, below the intro and Start Here) or "top" (straight under the
  // header, above the intro copy, so it's on a phone's first screen).
  promoPosition?: "top" | "grid";
};

// When /coaching and /academy-pathway moved their promo from "grid" to "top":
// the deploy that shipped it (live between 14:04:07 and 14:04:28 UTC). The
// Progress pipeline reads the Academy Pathway page's banner before vs after
// this (lib/supabase/progress-funnel.ts); the Coach App banner report's
// category row is /coaching alone, so its before/after is the same row read
// either side of this time.
export const PROMO_ABOVE_INTRO_FROM = "2026-10-30T14:04:20Z";

// The comic-accent design from the homepage concepts canvas ("Academy
// Pathway · yellow · with sponsor"), shared by all seven category pages.
// Titles, descriptions, headings and links are the pages' own, unchanged:
// the H1 is upper case in CSS only, and each guide card keeps its <h2>.

const sectionHeading =
  "m-0 font-display text-[clamp(32px,3.4vw,42px)] font-extrabold leading-[1.05] text-[#201E1D]";

function GuideGrid({ articles }: { articles: Article[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-6">
      {articles.map((article) => (
        <Link
          key={article.href}
          href={article.href}
          className="flex min-w-0 flex-col gap-2.5 rounded-2xl border-2 border-[#201E1D] bg-white px-6 py-[22px] text-[#201E1D] no-underline transition hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[6px_6px_0_#201E1D]"
        >
          <h2 className="m-0 font-display text-2xl font-extrabold leading-[1.12]">
            {article.title}
          </h2>
          <p className="m-0 text-base leading-[1.6] text-[#3A3836]">{article.description}</p>
        </Link>
      ))}
    </div>
  );
}

function groupArticles(title: string, articles: Article[], groups: GuideGroup[]) {
  const byHref = new Map(articles.map((article) => [article.href, article]));
  const grouped = new Set<string>();
  const result = groups.map((group) => ({
    ...group,
    articles: group.hrefs.map((href) => {
      const article = byHref.get(href);
      if (!article) throw new Error(`${title}: guide group "${group.id}" lists ${href}, which is not in its articles`);
      if (grouped.has(href)) throw new Error(`${title}: ${href} is in more than one guide group`);
      grouped.add(href);
      return article;
    }),
  }));
  // A guide left out of every group would vanish from the page, so a new
  // article has to be given a group before the build passes.
  for (const article of articles) {
    if (!grouped.has(article.href)) {
      throw new Error(`${title}: ${article.href} is in no guide group; add it to one of the page's groups`);
    }
  }
  return result;
}

export default function CategoryPage({
  title,
  description,
  articles,
  groups,
  intro,
  startHere,
  articlesHeading = "All Guides",
  bottomContent,
  promo,
  promoPosition = "grid",
}: CategoryPageProps) {
  const promoTop = !!promo && promoPosition === "top";

  return (
    <main className={`${firaSansCondensed.variable} min-h-screen bg-white font-ui text-[#201E1D]`}>
      <section className="mx-auto max-w-[1220px] px-6 pb-2 pt-14">
        <div className="max-w-[860px]">
          {/* Upper case is CSS only: the heading text is unchanged. */}
          <h1 className="m-0 font-display text-[clamp(40px,5.6vw,72px)] font-extrabold uppercase leading-[1.02]">
            {title}
          </h1>

          <p className="m-0 mt-5 text-lg leading-[1.6] text-[#3A3836] sm:text-xl">{description}</p>
        </div>
      </section>

      {/* Kept short so the guides start sooner (Graham, 6 Nov 2026): the
          sponsor banner where there is one, then Start Here as a row of four.
          The intro paragraphs open the About section under the guides. */}
      {(startHere || promoTop) && (
        <section className="mx-auto max-w-[1220px] px-6 pb-14 pt-8">
          {promoTop && <div className="mb-10 max-w-[860px]">{promo}</div>}

          {startHere && (
            <div className="rounded-[18px] border-[3px] border-[#201E1D] bg-[#FFF8E1] px-6 py-6 shadow-[6px_6px_0_#201E1D] sm:px-7">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="m-0 font-display text-[28px] font-extrabold leading-[1.1]">
                  {startHere.title}
                </h2>
                {startHere.description && (
                  <p className="m-0 text-base leading-[1.5] text-[#3A3836]">{startHere.description}</p>
                )}
              </div>

              <ol className="m-0 mt-5 grid list-none gap-x-6 gap-y-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
                {startHere.links.map((link, index) => (
                  <li key={link.href} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-[3px] border-[#201E1D] bg-[#FFC400] font-display text-base font-extrabold"
                    >
                      {index + 1}
                    </span>
                    <span className="pt-[3px] text-[15px] leading-[1.5] text-[#3A3836]">
                      <Link href={link.href} className="font-bold text-[#1F5FD6] hover:underline">
                        {link.title}
                      </Link>{" "}
                      {link.description}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      <section className="border-y-[3px] border-[#201E1D] bg-[#FFF8E1]">
        <div className="mx-auto max-w-[1220px] px-6 pb-[72px] pt-14">
          {promo && !promoTop && <div className="mb-12 max-w-[860px]">{promo}</div>}

          <h2 className={`${sectionHeading} mb-5`}>{articlesHeading}</h2>

          {groups ? (
            <GuideFilter
              groups={groupArticles(title, articles, groups).map((group) => ({
                id: group.id,
                label: group.label,
                count: group.articles.length,
                content: (
                  <div className="mt-10">
                    <div className="mb-[18px] flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                      <h2 className="m-0 font-display text-[28px] font-extrabold leading-[1.1]">
                        {group.heading}
                      </h2>
                      {group.subheading && (
                        <p className="m-0 text-[15px] font-medium text-[#5A5650]">{group.subheading}</p>
                      )}
                    </div>
                    <GuideGrid articles={group.articles} />
                  </div>
                ),
              }))}
            />
          ) : (
            <GuideGrid articles={articles} />
          )}
        </div>
      </section>

      {(bottomContent || (intro && intro.length > 0)) && (
        <section className="mx-auto max-w-[880px] px-6 pb-20 pt-16 text-lg leading-[1.75] text-[#3A3836]">
          {bottomContent && (
            <h2 className="m-0 mb-5 font-display text-[clamp(30px,3.2vw,38px)] font-extrabold leading-[1.05] text-[#201E1D]">
              {bottomContent.title}
            </h2>
          )}

          <div className="grid gap-[18px]">
            {[...(intro ?? []), ...(bottomContent?.content ?? [])].map((paragraph, index) => (
              <p key={index} className="m-0">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
