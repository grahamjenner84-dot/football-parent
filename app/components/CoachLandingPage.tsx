import Script from "next/script";
import { Fira_Sans_Condensed } from "next/font/google";
import CoachAppCarousel from "@/app/components/CoachAppCarousel";
import CoachSignUpForm from "@/app/components/CoachSignUpForm";
import { MDXContent } from "@/lib/MDXContent";
import { extractFaqs } from "@/lib/faq";
import type { LandingPage } from "@/lib/landing";

// Shared shell for every Coach App landing page, so a variant differs from
// the main page only in its words - same hero shape, same form, same
// screenshots. Variants exist to test messaging; anything else varying
// between them is noise in the result.
//
// coachAppBanner is "none" throughout: MDXContent otherwise injects a promo
// banner pointing at the Coach App page, which on the Coach App page itself
// would be a CTA competing with the actual sign-up form.

const TRUST_SIGNALS = [
  "Free to get started",
  "Add to your home screen",
  "Built by grassroots coaches",
];

// The comic-accent design's headline face (Football Parent homepage concepts
// canvas, "B · Comic accents (yellow)"). Loaded here rather than in the root
// layout so only these pages preload it until the rest of the site moves
// over; globals.css maps `font-display` onto the variable.
const firaSansCondensed = Fira_Sans_Condensed({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-fira-sans-condensed",
  display: "swap",
});

// The phone beside the hero form, from the app's store-listing screenshots
// (coach-app store-listing/screenshots/, 1080x2160, resized to 720x1440).
// Each landing page picks the screen its headline promises; see heroScreen
// in lib/landing.ts.
const HERO_SCREENS = {
  "stats-minutes": {
    image: "stats-minutes.webp",
    alt: "Coach App playing time stats: the squad average share of available minutes, everyone within a game of their fair share, and the fair play time table",
  },
  "team-selection": {
    image: "team-selection.webp",
    alt: "Coach App team selection: auto-pick rules for a 7v7 2-3-1 with 15 minute quarters, the lineup on the pitch and a sub on the bench",
  },
  "stats-team-overview": {
    image: "stats-team-overview.webp",
    alt: "Coach App team stats: won, drawn and lost record, top scorer, top assister and player of the match, and goals for and against",
  },
} as const;

function CheckIcon() {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#201E1D] bg-[#FFC400]"
      aria-hidden="true"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#201E1D"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

// The MDX body is rendered by the shared MDXContent, whose element styles are
// the article template's. These descendant overrides restyle it here only,
// in the comic-accent look, without touching the articles (which move over
// in their own step). A `[&_h2]` rule beats MDXContent's own classes because
// it is one element more specific.
const BODY_STYLES = [
  "[&_h2]:font-display [&_h2]:text-[32px] [&_h2]:lg:text-[40px] [&_h2]:leading-[1.05] [&_h2]:text-[#201E1D] [&_h2]:font-extrabold",
  "[&_h3]:text-[22px] [&_h3]:text-[#201E1D]",
  "[&_a]:text-[#1F5FD6] [&_a]:font-bold",
  "[&_table]:border-2 [&_table]:border-[#201E1D] [&_th]:border-[#201E1D] [&_td]:border-[#C9C4BA] [&_th]:bg-[#FFC400] [&_th]:text-[#201E1D]",
  "[&_tr:nth-child(even)]:bg-[#FFF8E1]",
  "[&_blockquote]:border-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[#201E1D] [&_blockquote]:bg-[#FFF8E1] [&_blockquote]:rounded-xl [&_blockquote]:shadow-[4px_4px_0_#201E1D]",
].join(" ");

export default function CoachLandingPage({ page }: { page: LandingPage }) {
  const { frontmatter, content, slug } = page;

  // Only on the indexable page. A noindex variant cannot earn a rich result,
  // so schema there is markup nobody will ever read.
  const indexable = frontmatter.index === true;

  // Same extractFaqs + FAQPage shape ArticleLayout already uses, so the FAQ
  // on this page is described to Google the way every article's is. It was
  // simply never wired up here.
  const faqs = indexable ? extractFaqs(content) : [];
  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

  // No SoftwareApplication schema. Google's Software App rich result needs
  // aggregateRating or review as well as name and offers, and there are no
  // reviews to aggregate (inventing one is both a Google penalty and a lie).
  // Without a rating the entity can never earn the rich result and only
  // reports as a structured-data error (Semrush site audit, 5 Oct 2026,
  // on the /progress page carrying the same shape). Reinstate it, with
  // real reviews, when there are some.

  const hero = HERO_SCREENS[frontmatter.heroScreen ?? "stats-minutes"] ?? HERO_SCREENS["stats-minutes"];

  return (
    <main className={`${firaSansCondensed.variable} min-h-screen bg-white font-ui text-[#201E1D]`}>
      {faqSchema && (
        <Script
          id={`landing-faq-schema-${slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <section className="border-b-[3px] border-[#201E1D] bg-white">
        <div className="mx-auto grid max-w-[1120px] items-center gap-12 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6 lg:py-16">
          <div className="min-w-0">
            {/* The horizontal lockup rather than the square icon: the icon
                alone read as an app tile dropped into a page, and it sat
                directly above a line of text repeating the words the wordmark
                already carries. That eyebrow goes with it.

                Transparent PNG, so it sits on the hero without a plate
                behind it. 1000x293 rendered at 48px high, well above the
                density it needs, and the intrinsic size is declared so the
                hero does not reflow as it loads. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- matches
                the sibling pages; one small logo is not worth next/image's
                runtime cost or its provider billing. */}
            <img
              src="/logo-horizontal-coach.png"
              alt="Football Parent Coach"
              width={1000}
              height={293}
              className="mb-6 h-12 w-auto"
            />

            {/* Uppercase is CSS only: the heading text, and so what Google
                reads, is exactly the frontmatter h1. */}
            <h1 className="font-display text-[40px] font-extrabold uppercase leading-[1.02] sm:text-5xl lg:text-[60px]">
              {frontmatter.h1}
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#3A3836] lg:text-xl">
              {frontmatter.subhead}
            </p>

            <div className="mt-8">
              <CoachSignUpForm heading={frontmatter.formHeading} />
            </div>

            {/* Carried over from the app's own sign-in screen, where these sat
                under the form. Reassurance rather than message: the same three
                on every variant, so what a variant is actually testing stays
                the headline and not the framing around it. Only under the hero
                form, not the repeat CTA further down - twice on one page reads
                as a slogan rather than a fact. */}
            <ul className="mt-6 flex list-none flex-wrap gap-x-6 gap-y-3 p-0 text-[15px] font-medium text-[#3A3836]">
              {TRUST_SIGNALS.map((signal) => (
                <li key={signal} className="flex items-center gap-2">
                  <CheckIcon />
                  {signal}
                </li>
              ))}
            </ul>
          </div>

          {/* Wide screens only. On a phone the form has to stay at the top
              of the page, and the carousel straight below shows the same
              screens. `loading="lazy"` keeps the hidden copy from being
              fetched on phones; on a desktop it is in view and loads at once. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- a static
              screenshot, same reasoning as the carousel. */}
          <img
            src={`/coach-app-screens/hero/${hero.image}`}
            alt={hero.alt}
            width={720}
            height={1440}
            loading="lazy"
            className="hidden w-full rotate-[3deg] rounded-[28px] border-[3px] border-[#201E1D] shadow-[10px_10px_0_#201E1D] lg:block"
          />
        </div>
      </section>

      {frontmatter.carousel !== false && <CoachAppCarousel />}

      <section className="mx-auto max-w-[880px] px-5 py-12 lg:px-6 lg:py-16">
        <div className={`text-lg text-[#3A3836] ${BODY_STYLES}`}>
          <MDXContent content={content} slug={slug} coachAppBanner="none" />
        </div>
      </section>

      <section className="dots-yellow border-t-[3px] border-[#201E1D]">
        <div className="mx-auto flex max-w-[880px] justify-center px-5 py-14 lg:px-6 lg:py-16">
          <CoachSignUpForm heading={frontmatter.formHeading} />
        </div>
      </section>
    </main>
  );
}
