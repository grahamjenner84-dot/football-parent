import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Football Parent",
  description:
    "The cookies footballparent.co.uk sets, what they're for, how long they last, and how to change your cookie preferences.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/cookie-policy",
  },
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          <p className="text-sm font-semibold text-blue-700 mb-4">
            Football Parent
          </p>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Cookie Policy
          </h1>

          <p className="text-lg text-gray-700 leading-relaxed">
            Last updated: 5 August 2026
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="space-y-6 text-gray-700 text-lg leading-8">
          <p>
            This page explains the cookies footballparent.co.uk sets, what
            they&apos;re for, and how long they last. For how we handle
            personal data more broadly, see our{" "}
            <a
              href="/privacy-policy"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              Privacy Policy
            </a>
            .
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Strictly necessary cookies
          </h2>

          <p>
            We don&apos;t currently set any strictly necessary cookies for
            general site visitors. If that changes, this page will be
            updated.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Analytics cookies
          </h2>

          <p>
            We use Google Analytics to understand how visitors use the site,
            so we can improve it. These cookies are only set if you accept
            them via our cookie banner or{" "}
            <a
              href="/cookie-policy"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              cookie settings
            </a>
            . If you reject or don&apos;t respond, none of the cookies below
            are set.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-100">
                    Cookie
                  </th>
                  <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-100">
                    Purpose
                  </th>
                  <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-100">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="[&:nth-child(even)]:bg-gray-50">
                  <td className="border border-gray-300 p-3">
                    <code>_ga</code>
                  </td>
                  <td className="border border-gray-300 p-3">
                    Distinguishes unique visitors, used by Google Analytics
                    to calculate visitor, session and campaign data.
                  </td>
                  <td className="border border-gray-300 p-3">2 years</td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-gray-50">
                  <td className="border border-gray-300 p-3">
                    <code>_ga_&lt;container-id&gt;</code>
                  </td>
                  <td className="border border-gray-300 p-3">
                    Used by Google Analytics to persist session state for
                    this specific property.
                  </td>
                  <td className="border border-gray-300 p-3">2 years</td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-gray-50">
                  <td className="border border-gray-300 p-3">
                    <code>_gid</code>
                  </td>
                  <td className="border border-gray-300 p-3">
                    Distinguishes unique visitors for a shorter window,
                    also used by Google Analytics.
                  </td>
                  <td className="border border-gray-300 p-3">24 hours</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            Google is the third party that ultimately controls these
            cookies. See{" "}
            <a
              href="https://policies.google.com/technologies/cookies"
              className="font-semibold text-blue-700 hover:text-blue-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google&apos;s cookie policy
            </a>{" "}
            for more detail.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
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
