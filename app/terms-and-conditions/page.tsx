import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Football Parent",
  description:
    "The terms governing your use of the Coach App, provided by Football Parent - accounts, the free trial and paid tier, billing and cancellation, and your data.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/terms-and-conditions",
  },
};

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          <p className="text-sm font-semibold text-blue-700 mb-4">
            Football Parent
          </p>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Terms &amp; Conditions
          </h1>

          <p className="text-lg text-gray-700 leading-relaxed">
            Last updated: 10 August 2026
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="space-y-6 text-gray-700 text-lg leading-8">
          <p>
            These terms govern your use of the Coach App, provided by
            Football Parent (&quot;we&quot;, &quot;us&quot;). By creating an
            account you agree to them. If you have any questions, email us
            at{" "}
            <a
              href="mailto:footballparentuk@gmail.com"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              footballparentuk@gmail.com
            </a>
            .
          </p>

          <p>
            Our{" "}
            <a
              href="/privacy-policy"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              Privacy Policy
            </a>{" "}
            explains what personal data we collect and why - it applies
            alongside these terms.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            1. What the Coach App is
          </h2>

          <p>
            The Coach App helps grassroots football coaches manage a team:
            squad and player records, formations and lineups, availability,
            match scheduling, live match tracking, stats and tournaments.
            It&apos;s built for coaches acting on behalf of their team,
            within their existing relationship with their club and
            players&apos; families.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            2. Your account
          </h2>

          <p>
            You need an account (via Google sign-in or a magic-link email) to
            use the app. You&apos;re responsible for keeping your sign-in
            secure and for the accuracy of the team, squad and match data you
            enter - it&apos;s your data, entered and managed by you for your
            own team&apos;s purposes. Don&apos;t share your account with
            people outside your coaching role, and don&apos;t use the app to
            store or manage data for a team you&apos;re not authorised to
            manage.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            3. Free features and the paid tier
          </h2>

          <p>
            Some features are free to use; others require a paid
            subscription after a <strong>30-day free trial from signup</strong>.
            Which features fall into which category is shown in the app and
            may change over time. If we move a feature you rely on from free
            to paid, we&apos;ll give you reasonable notice before the change
            takes effect on your account.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            4. Subscription, billing and cancellation
          </h2>

          <p>
            If you subscribe, you&apos;re billed monthly in advance at the
            price shown to you at checkout. Payment is processed by Stripe;
            we never see or store your card details ourselves.
          </p>

          <p>
            You can cancel any time from Settings → Manage subscription.
            Cancelling stops future billing, but you don&apos;t get money
            back for the month you&apos;re currently in - you keep access for
            the rest of the month you&apos;ve already paid for, then the
            account reverts to the free tier at the end of it (your data
            isn&apos;t deleted, see our Privacy Policy on retention).
          </p>

          <p>
            <strong>14-day cancellation right.</strong> Because a
            subscription gives you immediate access to paid features rather
            than a physical product, by subscribing you agree that service
            starts straight away and, to that extent, you waive the standard
            UK 14-day right to cancel a distance contract for a refund. If
            you&apos;d rather keep that right, don&apos;t subscribe until
            you&apos;re sure - the 30-day free trial exists precisely so you
            can try paid features before paying anything. Outside of that: if
            something&apos;s gone wrong on our end - a billing error, an
            accidental duplicate charge - email us and we&apos;ll sort it
            out, refund included where it&apos;s due.
          </p>

          <p>
            If a payment fails, Stripe will automatically retry it a few
            times. If it&apos;s still failing after those retries, your
            subscription is cancelled and paid features lock in the same way
            as if you&apos;d cancelled yourself - update your card details
            before that happens to avoid interruption.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            5. Your data
          </h2>

          <p>
            You keep ownership of the team, squad and match data you enter.
            You&apos;re giving us permission to store and process it purely
            to provide you the service - we don&apos;t use it for anything
            else, and we don&apos;t sell it. See our Privacy Policy for the
            full detail on what we collect, how long we keep it, and your
            rights over it.
          </p>

          <p>
            You&apos;re responsible for having a proper basis (through your
            coaching role at your club) to enter information about players in
            the app.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            6. Acceptable use
          </h2>

          <p>Use the app for coaching your own team. Don&apos;t:</p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Try to access another coach&apos;s account or data</li>
            <li>
              Use the app in a way that breaches any law, or infringes
              anyone else&apos;s rights
            </li>
            <li>
              Attempt to disrupt, reverse-engineer, or interfere with how the
              app or its infrastructure works
            </li>
            <li>
              Create accounts or use the free trial repeatedly to avoid ever
              paying, where you&apos;d otherwise be expected to subscribe
            </li>
          </ul>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            7. Availability and changes to the app
          </h2>

          <p>
            We aim to keep the app available and reliable, but we don&apos;t
            guarantee it&apos;ll be available at all times, or that
            it&apos;ll always be free of bugs - it&apos;s provided
            &quot;as is.&quot; We may update, change or discontinue features
            from time to time; where a change materially reduces what a paid
            subscription gives you, we&apos;ll let you know in advance.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            8. Liability
          </h2>

          <p>
            Nothing in these terms limits our liability for anything the law
            doesn&apos;t let us limit - for example, death or personal injury
            caused by our negligence, or fraud.
          </p>

          <p>
            Beyond that, we provide the app for team administration and
            organisation, not as a safety-critical or medical tool -
            decisions about a player&apos;s fitness to play, injuries, or
            welfare are always yours to make as the coach, not something the
            app decides for you. We&apos;re not liable for indirect or
            consequential losses (like lost data from a device failure, or a
            match being disorganised because of an outage), and our total
            liability to you for any claim relating to the app is capped at
            the amount you&apos;ve paid us in the 12 months before the claim
            arose.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            9. Ending your account
          </h2>

          <p>
            You can delete your account at any time from Settings. We can
            suspend or end your access if you seriously or repeatedly breach
            these terms, or if we reasonably believe your account is being
            used to harm the service or other users - we&apos;ll aim to tell
            you why if we do.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            10. Changes to these terms
          </h2>

          <p>
            We may update these terms from time to time - the &quot;last
            updated&quot; date at the top will always reflect the latest
            version. If we make a significant change, we&apos;ll let you
            know via the app or by email.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            11. Governing law
          </h2>

          <p>
            These terms are governed by the law of England and Wales, and
            any dispute will be handled by the courts of England and Wales.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            12. Contact us
          </h2>

          <p>
            Football Parent
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
