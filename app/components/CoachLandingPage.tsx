import Script from "next/script";
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

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-emerald-600"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

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

  // Deliberately no aggregateRating: there are no reviews to aggregate, and
  // inventing one is both a Google penalty and a lie. Offers describes what
  // the page itself states - a free tier and a 2.99/month paid tier.
  const appSchema = indexable
    ? {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Football Parent Coach App",
        applicationCategory: "SportsApplication",
        operatingSystem: "Web, iOS, Android",
        url: "https://www.footballparent.co.uk/football-parent-coach-app",
        description: frontmatter.seoDescription ?? frontmatter.subhead,
        offers: [
          {
            "@type": "Offer",
            name: "Free",
            price: "0",
            priceCurrency: "GBP",
          },
          {
            "@type": "Offer",
            name: "Paid",
            price: "2.99",
            priceCurrency: "GBP",
          },
        ],
      }
    : null;

  return (
    <main className="min-h-screen bg-white">
      {faqSchema && (
        <Script
          id={`landing-faq-schema-${slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {appSchema && (
        <Script
          id={`landing-app-schema-${slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
        />
      )}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          {/* The horizontal lockup rather than the square icon: the icon
              alone read as an app tile dropped into a page, and it sat
              directly above a line of text repeating the words the wordmark
              already carries. That eyebrow goes with it.

              Transparent PNG, so it sits on the grey hero without a plate
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
            className="h-12 w-auto mb-6"
          />

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {frontmatter.h1}
          </h1>

          <p className="text-lg text-gray-700 leading-relaxed max-w-2xl">
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
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 list-none p-0">
            {TRUST_SIGNALS.map((signal) => (
              <li key={signal} className="flex items-center gap-1.5">
                <CheckIcon />
                {signal}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {frontmatter.carousel !== false && <CoachAppCarousel />}

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="text-gray-700 text-lg">
          <MDXContent content={content} slug={slug} coachAppBanner="none" />
        </div>

        <div className="pt-10">
          <CoachSignUpForm heading={frontmatter.formHeading} />
        </div>
      </section>
    </main>
  );
}
