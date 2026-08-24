import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Football Parent",
  description:
    "How Football Parent collects and uses personal data across the website and Coach App, the cookies we set, and your rights under UK GDPR.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          <p className="text-sm font-semibold text-blue-700 mb-4">
            Football Parent
          </p>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Privacy Policy
          </h1>

          <p className="text-lg text-gray-700 leading-relaxed">
            Last updated: 24 August 2026
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="space-y-6 text-gray-700 text-lg leading-8">
          <p>
            Graham Jenner, trading as Football Parent (&quot;we&quot;,
            &quot;us&quot;), operates footballparent.co.uk and the Coach App.
            This policy explains what personal data we collect across both,
            why, and what rights you have over it.
          </p>

          <p>
            If you have any questions, email us at{" "}
            <a
              href="mailto:footballparentuk@gmail.com"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              footballparentuk@gmail.com
            </a>
            .
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            1. What this policy covers
          </h2>

          <p>This policy applies to:</p>

          <ul className="list-disc pl-6 space-y-2">
            <li>The footballparent.co.uk website</li>
            <li>
              The Coach App (used by coaches to manage their team, squad and
              matches)
            </li>
          </ul>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            2. What we collect
          </h2>

          <p>
            <strong>Account data.</strong> When you sign in (via Google or a
            magic-link email), we collect your email address and, if you sign
            in with Google, your name. If you set a display name in the app,
            we store that too.
          </p>

          <p>
            <strong>Team and squad data.</strong> As a coach, you can enter
            information about your team and squad to use the app - player
            names, shirt numbers, positions, and match data (goals, cards,
            minutes played, and similar). This is entered and managed by you
            for your own team&apos;s purposes; we store and process it on
            your behalf to provide the service. We don&apos;t collect this
            information directly from players, and we don&apos;t collect any
            contact details for players or their parents at this time.
          </p>

          <p>
            <strong>Marketing preferences.</strong> If you tell us whether
            you want to hear about partner offers, we record that choice
            (and when you made it) so we can honour it.
          </p>

          <p>
            <strong>Usage and technical data.</strong> Like most websites and
            apps, we automatically collect some technical information - IP
            address, browser/device type, and basic usage data - mainly for
            security, troubleshooting and improving the service.
          </p>

          <p>
            <strong>Cookies and advertising.</strong> The website may use
            cookies and similar technologies for analytics and for
            advertising. This includes conversion tracking and retargeting
            through advertising platforms such as Google Ads, Meta (Facebook
            and Instagram) and TikTok - for example, measuring whether an ad
            led to a signup, or showing a Football Parent ad to someone who
            previously visited our site. These platforms may set their own
            cookies or use pixels on our site for this purpose. Cookies that
            aren&apos;t strictly necessary for the site to function will only
            be set with your consent, which we&apos;ll ask for via a cookie
            banner. You can withdraw that consent at any time through your
            browser or the{" "}
            <a
              href="/cookie-policy"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              cookie settings
            </a>{" "}
            on our site.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            3. Why we process your data, and on what basis
          </h2>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-100">
                    What
                  </th>
                  <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-100">
                    Why
                  </th>
                  <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-100">
                    Legal basis
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="[&:nth-child(even)]:bg-gray-50">
                  <td className="border border-gray-300 p-3">Account data</td>
                  <td className="border border-gray-300 p-3">
                    To provide and secure your account
                  </td>
                  <td className="border border-gray-300 p-3">
                    Performance of a contract
                  </td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-gray-50">
                  <td className="border border-gray-300 p-3">
                    Team/squad data
                  </td>
                  <td className="border border-gray-300 p-3">
                    To provide the app&apos;s core features
                  </td>
                  <td className="border border-gray-300 p-3">
                    Performance of a contract
                  </td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-gray-50">
                  <td className="border border-gray-300 p-3">
                    Billing records
                  </td>
                  <td className="border border-gray-300 p-3">
                    To meet our tax and accounting obligations
                  </td>
                  <td className="border border-gray-300 p-3">
                    Legal obligation
                  </td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-gray-50">
                  <td className="border border-gray-300 p-3">
                    Service update emails (e.g. new features)
                  </td>
                  <td className="border border-gray-300 p-3">
                    To keep you informed about the product you use
                  </td>
                  <td className="border border-gray-300 p-3">
                    Legitimate interests
                  </td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-gray-50">
                  <td className="border border-gray-300 p-3">
                    Partner offer emails (e.g. from VEO)
                  </td>
                  <td className="border border-gray-300 p-3">
                    To let you know about relevant offers, only if
                    you&apos;ve opted in
                  </td>
                  <td className="border border-gray-300 p-3">Consent</td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-gray-50">
                  <td className="border border-gray-300 p-3">
                    Analytics cookies
                  </td>
                  <td className="border border-gray-300 p-3">
                    To understand and improve how the site/app is used
                  </td>
                  <td className="border border-gray-300 p-3">
                    Consent (where not strictly necessary)
                  </td>
                </tr>
                <tr className="[&:nth-child(even)]:bg-gray-50">
                  <td className="border border-gray-300 p-3">
                    Advertising and retargeting cookies
                  </td>
                  <td className="border border-gray-300 p-3">
                    To show relevant ads and measure their performance
                  </td>
                  <td className="border border-gray-300 p-3">Consent</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            4. Marketing emails
          </h2>

          <p>
            We may send you two kinds of marketing email, and treat them
            differently:
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Product updates</strong> (what&apos;s new in Coach
              App): sent by default, since you&apos;re already a user and
              it&apos;s directly relevant to the product you use. Every
              email has an unsubscribe link, and you can also turn this off
              any time in Settings.
            </li>
            <li>
              <strong>Partner offers</strong> (e.g. discounts, samples or
              competitions from brands like VEO): only sent if you&apos;ve
              explicitly opted in. You can opt in or out at any time from
              Settings in the app. We do not share your email address or any
              other personal data with these partners - we send the email
              ourselves, from our own list.
            </li>
          </ul>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            5. Affiliate links and sponsored content
          </h2>

          <p>
            Some links on footballparent.co.uk may be affiliate links,
            meaning we may earn a commission if you make a purchase after
            clicking through - this doesn&apos;t cost you anything extra. We
            use Skimlinks to manage this: it automatically turns eligible
            outbound links to retailers into affiliate links, and sets a
            tracking cookie to attribute any resulting commission. Like our
            other non-essential cookies, this only runs if you consent via
            our cookie banner or{" "}
            <a
              href="/cookie-policy"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              cookie settings
            </a>{" "}
            - see our{" "}
            <a
              href="/cookie-policy"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              Cookie Policy
            </a>{" "}
            for detail. Similarly, the Coach App may show sponsored banners
            to coaches on our free plan. These are just visual placements;
            clicking through doesn&apos;t share any of your data with the
            advertiser.
          </p>

          <p>
            Wherever you click through to a third-party site (whether from
            an affiliate link, a sponsored banner, or a partner offer
            email), that site&apos;s own privacy policy applies to whatever
            you do there - we have no visibility into or responsibility for
            that site&apos;s data handling.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            6. Children&apos;s data
          </h2>

          <p>
            The Coach App is used by adult coaches, not by children. Any
            player information in the app is entered by the coach for team
            administration purposes, within the context of the coach&apos;s
            existing relationship with their club and players&apos;
            families. We don&apos;t knowingly collect data directly from
            children, and we don&apos;t send marketing of any kind to or
            about individual players.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            7. Where your data is stored
          </h2>

          <p>
            Your data is stored with our infrastructure providers (including
            Supabase), which may process data outside the UK/EEA. Where that
            happens, appropriate safeguards (such as standard contractual
            clauses) are in place.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            8. How long we keep your data
          </h2>

          <p>
            We keep personal data only for as long as we need it, or for as
            long as the law requires.
          </p>

          <p>
            While your account is active, we keep your account details and
            the data you enter (teams, players and match statistics) so the
            service works and your records carry across seasons.
          </p>

          <p>
            If you cancel your subscription, your account isn&apos;t deleted.
            It reverts to the free tier and your data is kept, so you can
            subscribe again later, for example for a new season, without
            losing your history.
          </p>

          <p>
            If you delete your account, access ends immediately and your data
            is erased 7 days later. During those 7 days you can restore your
            account by logging back in.
          </p>

          <p>
            If an account has no active subscription and isn&apos;t used for
            6 months, we deactivate it. If it stays inactive for a further 6
            months after that, we delete it. We&apos;ll email you before
            deleting.
          </p>

          <p>
            Where you&apos;ve paid, we keep basic transaction records (date,
            amount and invoice) for 6 years for tax and accounting purposes.
            These records don&apos;t include your team or player data.
          </p>

          <p>
            Deleted data may remain in secure backups for a short period
            until those backups are overwritten on their normal cycle, after
            which it&apos;s gone. We don&apos;t restore deleted data into the
            live service.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            9. Your rights
          </h2>

          <p>Under UK GDPR, you have the right to:</p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Ask us to delete your data</li>
            <li>Object to or restrict certain processing</li>
            <li>
              Withdraw consent at any time (this won&apos;t affect anything
              done before you withdrew it)
            </li>
            <li>Request a copy of your data in a portable format</li>
            <li>
              Complain to the{" "}
              <a
                href="https://ico.org.uk"
                className="font-semibold text-blue-700 hover:text-blue-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                Information Commissioner&apos;s Office (ICO)
              </a>{" "}
              if you think we&apos;ve mishandled your data
            </li>
          </ul>

          <p>
            You can download a copy of your own data at any time from your
            account settings, and you can edit the information you&apos;ve
            entered directly in the app. If you&apos;re an account holder,
            your download includes the teams and players you manage; if
            you&apos;re an assistant on someone else&apos;s team, it includes
            your own account details, since the team&apos;s data belongs to
            the account holder.
          </p>

          <p>
            To exercise any other right - including deleting a child&apos;s
            data, objecting to or restricting processing, or withdrawing
            consent - email{" "}
            <a
              href="mailto:footballparentuk@gmail.com"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              footballparentuk@gmail.com
            </a>
            , or use the in-app Settings for marketing preferences
            specifically.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            10. Changes to this policy
          </h2>

          <p>
            We may update this policy from time to time - the &quot;last
            updated&quot; date at the top will always reflect the latest
            version. If we make a significant change, we&apos;ll let you
            know via the app or by email.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            11. Contact us
          </h2>

          <p>
            Graham Jenner, trading as Football Parent
            <br />
            Email:{" "}
            <a
              href="mailto:footballparentuk@gmail.com"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              footballparentuk@gmail.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
