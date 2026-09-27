import { generateSEO } from "@/lib/seo";

// Landing page for Progress, the parents' app (progress.footballparent.co.uk).
// Every Progress share card carries "footballparent.co.uk/progress" in its
// footer, so this is where a parent lands after seeing a friend's card.
//
// Hand-written rather than an MDX landing variant: lib/landing.ts and
// CoachLandingPage are built around the Coach App's sign-up form, and
// Progress has its own sign-in on its own subdomain, so every CTA here is a
// plain link out. Nothing on this site talks to the Progress backend (it
// holds children's data; see CLAUDE.md on keeping projects isolated).
//
// Claims on this page describe what the app does today. Change them with the
// app, not ahead of it. The price and trial must match Progress's own Terms.

const APP_URL = "https://progress.footballparent.co.uk";
const PAGE_URL = "https://www.footballparent.co.uk/progress";

const TITLE = "Progress: Track Your Child's Football Stats and Development";
const DESCRIPTION =
  "Progress is the app for football parents: log matches, keep your child's career stats, track training and coach feedback, and share season cards. 4 weeks free.";

export const metadata = generateSEO({
  title: TITLE,
  description: DESCRIPTION,
  path: "/progress",
  type: "website",
  image: "/og/progress-1200x630.png",
});

const TRUST = ["4 weeks free, no card needed", "Then £2.50 a month", "Works on any phone"];

const FEATURES = [
  {
    title: "Every match, logged in a minute",
    body: "Record the score, who scored, their goals and assists, player of the match and a rating out of 10 straight after the game. Or log it live from the touchline, period by period, with the line-up and their minutes on the pitch.",
  },
  {
    title: "Their whole career in one place",
    body: "Every club and every season, with games, goals, assists and player of the match adding up as you go. Season already started? Add the games so far. Kept a notebook for years? Add past seasons with their totals.",
  },
  {
    title: "Training and development",
    body: "Note what they worked on at training and how it went, and see how they're developing across the FA's four corners: technical and tactical, physical, psychological and social.",
  },
  {
    title: "Feedback from their coach",
    body: "Send the coach a private link. They rate your child and write a short report in their browser, with no account and no app to download, and it lands straight in your child's record.",
  },
  {
    title: "Cards worth sharing",
    body: "Turn a season, a month or a big game into a card sized for WhatsApp and Instagram, with hat-trick, brace and player of the match versions. First name only by default.",
  },
  {
    title: "Both parents, one record",
    body: "Share a player with another parent so you can both log matches. They ask to join with a link, and you see their email and approve them before they get access.",
  },
];

const PRIVACY = [
  "We never ask for your child's date of birth.",
  "Player photos stay on your phone. They are never uploaded to us.",
  "Share cards show first name only unless you choose otherwise.",
  "Delete a player or your whole account from Settings at any time, with 7 days to change your mind.",
];

const FAQS = [
  {
    q: "Is Progress on the App Store or Google Play?",
    a: "No. Progress is a web app, so there is nothing to download from a store. Open it in your phone's browser, sign in with your email, and add it to your home screen. It then opens like any other app, on iPhone and Android.",
  },
  {
    q: "How much does it cost?",
    a: "Every new account gets a 4-week free trial with everything included, and you don't need a card to start. After that it's £2.50 a month, and you can cancel any time.",
  },
  {
    q: "What happens if the trial ends and I don't subscribe?",
    a: "Nothing is deleted. Your records stay there and you can still read them, you just can't add new ones until you subscribe.",
  },
  {
    q: "Who can see my child's information?",
    a: "Only you, and any other parent you approve. A coach feedback link lets the coach add a report, and all it shows them is your child's first name and team, never the rest of their record.",
  },
  {
    q: "Can I add seasons from before I started using it?",
    a: "Yes. Add a past season with its club, age group and totals (games, goals, assists and player of the match), or add the games so far for a season that's already under way. They count in the stats alongside the matches you log.",
  },
  {
    q: "My child plays for two teams. Does that work?",
    a: "Yes. Add both as current teams. Their stats add up across both, and a season card can cover both teams or just one.",
  },
];

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-[#1a7a45]"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StartButton({ label = "Start your free trial" }: { label?: string }) {
  return (
    <a
      href={APP_URL}
      className="inline-flex items-center justify-center rounded-full bg-[#1a7a45] px-7 py-3.5 text-base font-semibold text-white no-underline shadow-sm transition-colors hover:bg-[#0f5d34]"
    >
      {label}
    </a>
  );
}

export default function ProgressPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // No aggregateRating: there are no reviews to aggregate. The offer is what
  // the page states: £2.50 a month after the free trial.
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Progress by Football Parent",
    applicationCategory: "SportsApplication",
    operatingSystem: "Web, iOS, Android",
    url: PAGE_URL,
    description: DESCRIPTION,
    image: "https://www.footballparent.co.uk/og/progress-1200x630.png",
    offers: {
      "@type": "Offer",
      price: "2.50",
      priceCurrency: "GBP",
      description: "£2.50 a month after a 4-week free trial",
    },
  };

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="bg-[#f4f6f1] border-b border-[#d8ded1]">
        <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element -- one small
                SVG logo, same reasoning as the Coach App landing page. */}
            <img
              src="/progress/progress-lockup.svg"
              alt="Progress by Football Parent"
              width={574}
              height={146}
              className="h-14 w-auto mb-7"
            />
            <h1 className="text-4xl lg:text-5xl font-bold text-[#16211b] leading-tight mb-5">
              Your child&apos;s football journey, kept for good
            </h1>
            <p className="text-lg text-[#3c4a40] leading-relaxed max-w-xl mb-8">
              Progress is the app for football parents. Log every match, keep their
              career stats, track training and coach feedback, and turn the season
              into cards worth sharing.
            </p>
            <StartButton />
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#5d6b60] list-none p-0">
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- static
                example image; a made-up player, never a real child. */}
            <img
              src="/progress/share-card-example.webp"
              alt="An example Progress season card for a made-up player, Alfie: 14 games, 11 goals, 6 assists, 3 player of the match awards"
              width={720}
              height={900}
              className="w-full max-w-sm h-auto rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-14 lg:py-20">
        <h2 className="text-3xl font-bold text-[#16211b] mb-3">What you can keep</h2>
        <p className="text-lg text-[#3c4a40] max-w-2xl mb-10">
          The things you&apos;d otherwise lose to a group chat, a camera roll or
          memory, all in one record that grows with them.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[#d8ded1] bg-white p-6">
              <h3 className="text-xl font-bold text-[#16211b] mb-2">{f.title}</h3>
              <p className="text-[#3c4a40] leading-relaxed m-0">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Career at a glance */}
      <section className="bg-[#f4f6f1] border-y border-[#d8ded1]">
        <div className="max-w-5xl mx-auto px-6 py-14 lg:py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold text-[#16211b] mb-4">Their career at a glance</h2>
            <p className="text-lg text-[#3c4a40] leading-relaxed mb-4">
              Open the app and their games, goals, assists and player of the match
              awards are right there, across every club and season. Tap a season
              for the matches, the line-ups and how many minutes they played.
            </p>
            <p className="text-lg text-[#3c4a40] leading-relaxed m-0">
              Playing for two teams at once is fine too: add both, and everything
              adds up.
            </p>
          </div>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- static
                example image of the app's player card, made-up player. */}
            <img
              src="/progress/player-card-example.webp"
              alt="The Progress player card for a made-up player, Alfie: 63 games, 38 goals, 21 assists, 9 player of the match awards"
              width={752}
              height={390}
              className="w-full max-w-md h-auto rounded-2xl shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="max-w-5xl mx-auto px-6 py-14 lg:py-20">
        <h2 className="text-3xl font-bold text-[#16211b] mb-3">Built with children&apos;s data in mind</h2>
        <p className="text-lg text-[#3c4a40] max-w-2xl mb-8">
          Progress holds information about your child, so we collect as little as
          we can and keep it under your control.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2 list-none p-0 m-0">
          {PRIVACY.map((p) => (
            <li key={p} className="flex gap-3 rounded-xl bg-[#f4f6f1] p-4 text-[#3c4a40]">
              <span className="mt-1">
                <Check />
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-[#5d6b60]">
          Read the full{" "}
          <a href={`${APP_URL}/privacy`} className="text-[#0f5d34] underline">
            Progress privacy policy
          </a>
          .
        </p>
      </section>

      {/* Price */}
      <section className="bg-[#16211b] text-[#f4f6f1]">
        <div className="max-w-5xl mx-auto px-6 py-14 lg:py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Try everything free for 4 weeks</h2>
          <p className="text-lg text-[#c9d3c4] max-w-xl mx-auto mb-8">
            No card needed to start. After the trial it&apos;s £2.50 a month, and you
            can cancel any time. If you don&apos;t subscribe, nothing is deleted.
          </p>
          <StartButton />
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-14 lg:py-20">
        <h2 className="text-3xl font-bold text-[#16211b] mb-8">Questions parents ask</h2>
        <div className="divide-y divide-[#d8ded1] border-y border-[#d8ded1]">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-[#16211b]">
                {f.q}
                <span className="text-[#1a7a45] transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 mb-0 text-[#3c4a40] leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12 text-center">
          <StartButton label="Start tracking their progress" />
        </div>
      </section>
    </div>
  );
}
