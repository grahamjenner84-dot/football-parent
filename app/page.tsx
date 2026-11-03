import Link from "next/link";
import type { ReactNode } from "react";
import { generateSEO } from "@/lib/seo";
import { firaSansCondensed } from "@/lib/comic-design";
import ProgressBanner from "@/app/components/ProgressBanner";

export const metadata = generateSEO({
  title: "Football Parent | UK Academy Pathways & Youth Football Advice",
  description:
    "Academy pathways, grassroots football and player development advice for UK football parents, written by a grassroots coach based in south London.",
  path: "/",
  type: "website",
});

// Drawn to the homepage concepts canvas, "B · Comic accents (yellow)". Same
// headings, copy and links as the page it replaced, in the same order.

const categories: { href: string; title: string; description: string; icon: ReactNode }[] = [
  {
    href: "/academy-pathway",
    title: "Academy Pathway",
    description:
      "Understand how academy football works in the UK, from grassroots to scholarships.",
    icon: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />,
  },
  {
    href: "/football-development",
    title: "Football Development",
    description:
      "Age-by-age development advice to help young footballers improve with confidence.",
    icon: (
      <>
        <polyline points="3 17 9 11 13 15 21 7" />
        <polyline points="15 7 21 7 21 13" />
      </>
    ),
  },
  {
    href: "/academy-trials",
    title: "Academy Trials",
    description:
      "Learn what happens at trials and what academy coaches look for in players.",
    icon: (
      <>
        <circle cx="12" cy="14" r="7" />
        <path d="M12 14v-4M10 3h4M12 3v4" />
      </>
    ),
  },
  {
    href: "/parent-guides",
    title: "Parent Guides",
    description:
      "Practical advice for football parents navigating youth football pathways.",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8" />
      </>
    ),
  },
  {
    href: "/coaching",
    title: "Coaching",
    description:
      "Qualifications, formations, session drills and fair playing time for volunteer coaches.",
    icon: (
      <>
        <path d="M3 12a5 5 0 1 0 10 0h8V8H8.6A5 5 0 0 0 3 12z" />
        <circle cx="8" cy="12.5" r="1.3" />
      </>
    ),
  },
  {
    href: "/girls-football",
    title: "Girls Football",
    description:
      "Advice on girls academies, development, trials and long-term progression.",
    icon: <polygon points="12 3 14.8 9 21 9.6 16.3 13.8 17.7 20 12 16.8 6.3 20 7.7 13.8 3 9.6 9.2 9 12 3" />,
  },
  {
    href: "/football-gear",
    title: "Football Gear",
    description:
      "Trusted football boots, shin pads, gloves and training equipment for young players.",
    icon: <path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z" />,
  },
];

// Picked 30 Oct 2026 from Search Console and page views: the most read
// guides plus the ones with the most impressions still ranking around 6-9.
// Pages on an SEO watch were left out (Leeds, Chelsea, Brentford, Crystal
// Palace, Veo, base layers); swap in once their reads are done.
const popularGuides = [
  {
    href: "/academy-pathway/academy-categories-explained",
    label: "Academy Pathway",
    title: "Football academy categories explained",
  },
  {
    href: "/academy-pathway/how-academy-football-works",
    label: "Academy Pathway",
    title: "How academy football works in the UK",
  },
  {
    href: "/academy-pathway/football-scholarships-uk",
    label: "Academy Pathway",
    title: "Football scholarships in the UK",
  },
  {
    href: "/academy-pathway/arsenal-development-centre-guide",
    label: "Academy Pathway",
    title: "Arsenal academy and development centre guide",
  },
  {
    href: "/parent-guides/what-is-the-junior-premier-league",
    label: "Parent Guides",
    title: "What is the Junior Premier League (JPL)?",
  },
  {
    href: "/parent-guides/what-is-grassroots-football",
    label: "Parent Guides",
    title: "What is grassroots football?",
  },
  {
    href: "/football-gear/shin-pads/best-shin-pads-for-kids-football",
    label: "Football Gear",
    title: "Best shin pads for kids",
  },
  {
    href: "/football-gear/best-footballs-by-age",
    label: "Football Gear",
    title: "Football sizes by age",
  },
  {
    href: "/football-gear/boots/best-football-boots-for-wide-feet-kids",
    label: "Football Gear",
    title: "Best football boots for kids with wide feet",
  },
];

const card =
  "flex min-w-0 flex-col gap-3 rounded-2xl border-2 border-[#201E1D] bg-white px-6 py-[22px] text-[#201E1D] no-underline transition hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[6px_6px_0_#201E1D]";

const sectionHeading =
  "m-0 font-display text-[clamp(32px,3.4vw,42px)] font-extrabold leading-[1.05] text-[#201E1D]";

const aboutLink = "font-bold text-[#1F5FD6] underline";

export default function Home() {
  return (
    <main className={`${firaSansCondensed.variable} min-h-screen bg-white font-ui text-[#201E1D]`}>
      {/* Kept short enough that the category cards start above a desktop
          fold with the cookie banner showing: the headline runs to two lines
          on a wide screen, where the canvas's 76px in an 860px column took
          four. */}
      <section className="mx-auto max-w-[1220px] px-6 pb-12 pt-12">
        <div className="max-w-[1080px]">
          {/* Upper case is CSS only: the heading text is unchanged. */}
          <h1 className="m-0 font-display text-[clamp(40px,4.6vw,64px)] font-extrabold uppercase leading-[1.02]">
            Helping parents navigate youth football with confidence
          </h1>

          <p className="m-0 mt-5 max-w-[760px] text-lg leading-[1.6] text-[#3A3836] sm:text-xl">
            Academy pathways, development centres, trials, grassroots football
            and kit, explained by a football parent and grassroots coach. We
            also put parents&apos; questions to people who work in youth
            football, from academy recruiters and coaches to mindset coaches
            and league chiefs, and publish their answers.
          </p>
        </div>
      </section>

      <section className="border-y-[3px] border-[#201E1D] bg-[#FFF8E1]">
        <div className="mx-auto grid max-w-[1220px] grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-6 px-6 pb-[72px] pt-12">
          {categories.map((category) => (
            <Link key={category.href} href={category.href} className={card}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#201E1D] bg-[#FFC400]">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#201E1D"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {category.icon}
                </svg>
              </span>

              <h2 className="m-0 mt-0.5 min-w-0 font-display text-[26px] font-extrabold leading-[1.05]">
                {category.title}
              </h2>

              <p className="m-0 text-base leading-[1.55] text-[#3A3836]">
                {category.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* The homepage's one app slot: Progress, the parents' app, since
          2 Oct 2026 (it was the Coach App's parent banner until then). */}
      <section className="mx-auto max-w-[1220px] px-6 pb-6 pt-20">
        <ProgressBanner placement="home" design="comic" />
      </section>

      <section className="mx-auto max-w-[1220px] px-6 pb-[72px] pt-16">
        <h2 className={`${sectionHeading} mb-3.5`}>Popular guides</h2>

        <div className="grid gap-x-9 md:grid-cols-2">
          {popularGuides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="group block min-w-0 border-b-2 border-[#201E1D] py-4 text-[#201E1D] no-underline"
            >
              <p className="m-0 text-sm font-semibold text-[#5A5650]">{guide.label}</p>
              <h3 className="m-0 mt-0.5 font-display text-[21px] font-extrabold leading-[1.2] group-hover:text-[#1F5FD6]">
                {guide.title}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t-[3px] border-[#201E1D] bg-[#FFF8E1]">
        <div className="mx-auto max-w-[880px] px-6 pb-20 pt-16 text-lg leading-[1.75] text-[#3A3836]">
          <h2 className={`${sectionHeading} mb-5`}>About Football Parent</h2>

          <div className="grid gap-[18px]">
            <p className="m-0">
              Football Parent is an independent UK resource for families navigating youth football. Whether your child plays grassroots football, attends a development centre, trials with an academy or simply loves the game, our aim is to help parents make informed decisions based on evidence rather than hype.
            </p>

            <p className="m-0">
              The site covers academy football, football development, football trials, girls football pathways, equipment advice and the everyday questions that football parents face as children progress through the game.
            </p>

            <p className="m-0">
              Every guide is written from the perspective of a football parent, combining first-hand experience with trusted research to provide clear, balanced advice that puts children&apos;s long-term development first.
            </p>

            <p className="m-0">
              Learn more about our{" "}
              <Link href="/about" className={aboutLink}>
                mission and background
              </Link>
              , read our{" "}
              <Link href="/editorial-policy" className={aboutLink}>
                Editorial Policy
              </Link>
              , or visit the{" "}
              <Link href="/author/graham-jenner" className={aboutLink}>
                author profile
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
