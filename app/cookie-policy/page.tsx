import type { Metadata } from "next";
import { staticPageOpenGraph } from "@/lib/seo";
import { firaSansCondensed } from "@/lib/comic-design";

export const metadata: Metadata = {
  title: "Cookie Policy | Football Parent",
  description:
    "The cookies footballparent.co.uk sets, what they're for, how long they last, and how to change your cookie preferences.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/cookie-policy",
  },
  openGraph: staticPageOpenGraph("/cookie-policy"),
};

export default function CookiePolicyPage() {
  return (
    <main className={`${firaSansCondensed.variable} min-h-screen bg-white font-ui text-[#201E1D]`}>
      <section className="border-b-[3px] border-[#201E1D] bg-[#FFF8E1]">
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-11 lg:pt-16">
          <p className="mb-5 inline-block rounded-full border-2 border-[#201E1D] bg-[#FFC400] px-3 py-1 text-sm font-bold text-[#201E1D]">
            Football Parent
          </p>

          <h1 className="mb-6 font-display text-[clamp(36px,5vw,64px)] font-extrabold uppercase leading-[1.02] text-[#201E1D]">
            Cookie Policy
          </h1>

          <p className="text-lg leading-[1.6] text-[#3A3836] sm:text-xl">
            Last updated: 6 October 2026
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="space-y-6 text-[18px] leading-[1.75] text-[#33312E]">
          <p>
            footballparent.co.uk is operated by Jenneral Trading Ltd,
            trading as Football Parent. This page explains the cookies we
            set, what they&apos;re for, and how long they last. For how we
            handle personal data more broadly, see our{" "}
            <a
              href="/privacy-policy"
              className="font-bold text-[#1F5FD6] hover:underline"
            >
              Privacy Policy
            </a>
            .
          </p>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            Strictly necessary cookies
          </h2>

          <p>
            We don&apos;t currently set any strictly necessary cookies for
            general site visitors. If that changes, this page will be
            updated.
          </p>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            Analytics cookies
          </h2>

          <p>
            We use Google Analytics to understand how visitors use the site,
            so we can improve it. These cookies are only set if you accept
            them via our cookie banner or{" "}
            <a
              href="/cookie-policy"
              className="font-bold text-[#1F5FD6] hover:underline"
            >
              cookie settings
            </a>
            . If you reject or don&apos;t respond, none of the cookies below
            are set. Separately, we count page views ourselves without any
            cookie: that count holds no IP address or identifier, and is
            explained in our{" "}
            <a
              href="/privacy-policy"
              className="font-bold text-[#1F5FD6] hover:underline"
            >
              Privacy Policy
            </a>
            .
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse border-2 border-[#201E1D]">
              <thead>
                <tr>
                  <th className="border border-[#201E1D] p-3 text-left font-bold bg-[#FFC400] text-[#201E1D]">
                    Cookie
                  </th>
                  <th className="border border-[#201E1D] p-3 text-left font-bold bg-[#FFC400] text-[#201E1D]">
                    Purpose
                  </th>
                  <th className="border border-[#201E1D] p-3 text-left font-bold bg-[#FFC400] text-[#201E1D]">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="[&:nth-child(even)]:bg-[#FFF8E1]">
                  <td className="border border-[#C9C4BA] p-3">
                    <code>_ga</code>
                  </td>
                  <td className="border border-[#C9C4BA] p-3">
                    Distinguishes unique visitors, used by Google Analytics
                    to calculate visitor, session and campaign data.
                  </td>
                  <td className="border border-[#C9C4BA] p-3">2 years</td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-[#FFF8E1]">
                  <td className="border border-[#C9C4BA] p-3">
                    <code>_ga_&lt;container-id&gt;</code>
                  </td>
                  <td className="border border-[#C9C4BA] p-3">
                    Used by Google Analytics to persist session state for
                    this specific property.
                  </td>
                  <td className="border border-[#C9C4BA] p-3">2 years</td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-[#FFF8E1]">
                  <td className="border border-[#C9C4BA] p-3">
                    <code>_gid</code>
                  </td>
                  <td className="border border-[#C9C4BA] p-3">
                    Distinguishes unique visitors for a shorter window,
                    also used by Google Analytics.
                  </td>
                  <td className="border border-[#C9C4BA] p-3">24 hours</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            Google is the third party that ultimately controls these
            cookies. See{" "}
            <a
              href="https://policies.google.com/technologies/cookies"
              className="font-bold text-[#1F5FD6] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google&apos;s cookie policy
            </a>{" "}
            for more detail.
          </p>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            Advertising and retargeting cookies
          </h2>

          <p>
            We use Google Ads and Meta (Facebook and Instagram) to run ads
            for Football Parent and the Coach App, and to measure whether
            they work - for example, whether someone who clicked an ad went
            on to sign up. These cookies are only set if you accept them via
            our cookie banner or{" "}
            <a
              href="/cookie-policy"
              className="font-bold text-[#1F5FD6] hover:underline"
            >
              cookie settings
            </a>
            . If you reject or don&apos;t respond, none of the cookies below
            are set.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse border-2 border-[#201E1D]">
              <thead>
                <tr>
                  <th className="border border-[#201E1D] p-3 text-left font-bold bg-[#FFC400] text-[#201E1D]">
                    Cookie
                  </th>
                  <th className="border border-[#201E1D] p-3 text-left font-bold bg-[#FFC400] text-[#201E1D]">
                    Purpose
                  </th>
                  <th className="border border-[#201E1D] p-3 text-left font-bold bg-[#FFC400] text-[#201E1D]">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="[&:nth-child(even)]:bg-[#FFF8E1]">
                  <td className="border border-[#C9C4BA] p-3">
                    <code>_gcl_au</code>
                  </td>
                  <td className="border border-[#C9C4BA] p-3">
                    Set by Google Ads to measure ad conversions.
                  </td>
                  <td className="border border-[#C9C4BA] p-3">90 days</td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-[#FFF8E1]">
                  <td className="border border-[#C9C4BA] p-3">
                    <code>_fbp</code>
                  </td>
                  <td className="border border-[#C9C4BA] p-3">
                    Set by the Meta Pixel to identify browsers for ad
                    delivery and measurement.
                  </td>
                  <td className="border border-[#C9C4BA] p-3">90 days</td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-[#FFF8E1]">
                  <td className="border border-[#C9C4BA] p-3">
                    <code>_fbc</code>
                  </td>
                  <td className="border border-[#C9C4BA] p-3">
                    Set by the Meta Pixel to record that a visit came from a
                    Meta ad click.
                  </td>
                  <td className="border border-[#C9C4BA] p-3">90 days</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            Google and Meta are the third parties that ultimately control
            these cookies. See{" "}
            <a
              href="https://policies.google.com/technologies/cookies"
              className="font-bold text-[#1F5FD6] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google&apos;s cookie policy
            </a>{" "}
            and{" "}
            <a
              href="https://www.facebook.com/privacy/policies/cookies/"
              className="font-bold text-[#1F5FD6] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Meta&apos;s cookie policy
            </a>{" "}
            for more detail.
          </p>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            Changing your preferences
          </h2>

          <p>
            You can change your cookie choice at any time using the
            &quot;Cookie Settings&quot; link in the site footer, or by
            clearing cookies in your browser, which will show the cookie
            banner again on your next visit.
          </p>
        </div>
      </section>
    </main>
  );
}
