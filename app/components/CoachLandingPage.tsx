import CoachAppCarousel from "@/app/components/CoachAppCarousel";
import CoachSignUpForm from "@/app/components/CoachSignUpForm";
import { MDXContent } from "@/lib/MDXContent";
import type { LandingPage } from "@/lib/landing";

// Shared shell for every Coach App landing page, so a variant differs from
// the main page only in its words - same hero shape, same form, same
// screenshots. Variants exist to test messaging; anything else varying
// between them is noise in the result.
//
// coachAppBanner is "none" throughout: MDXContent otherwise injects a promo
// banner pointing at the Coach App page, which on the Coach App page itself
// would be a CTA competing with the actual sign-up form.

export default function CoachLandingPage({ page }: { page: LandingPage }) {
  const { frontmatter, content, slug } = page;

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          {/* eslint-disable-next-line @next/next/no-img-element -- matches
              the sibling page; a 56px logo is not worth next/image's
              runtime cost or its provider billing. */}
          <img
            src="/logo-icon-coach.png"
            alt="Football Parent Coach App"
            className="h-14 w-14 mb-6"
          />

          <p className="text-sm font-semibold text-blue-700 mb-4">
            Football Parent Coach App
          </p>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {frontmatter.h1}
          </h1>

          <p className="text-lg text-gray-700 leading-relaxed max-w-2xl">
            {frontmatter.subhead}
          </p>

          <div className="mt-8">
            <CoachSignUpForm ctaLabel={frontmatter.ctaLabel} />
          </div>
        </div>
      </section>

      {frontmatter.carousel !== false && <CoachAppCarousel />}

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="text-gray-700 text-lg">
          <MDXContent content={content} slug={slug} coachAppBanner="none" />
        </div>

        <div className="pt-10">
          <CoachSignUpForm ctaLabel={frontmatter.ctaLabel} />
        </div>
      </section>
    </main>
  );
}
