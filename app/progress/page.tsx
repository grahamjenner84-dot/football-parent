import ProgressJoinForm from "@/app/components/ProgressJoinForm";
import { generateSEO } from "@/lib/seo";

// Landing page for Progress, the parents' app (progress.footballparent.co.uk).
// Every Progress share card carries "footballparent.co.uk/progress" in its
// footer, so this is where a parent lands after seeing a friend's card.
//
// Hand-written rather than an MDX landing variant: lib/landing.ts and
// CoachLandingPage are built around the Coach App's sign-up form, and
// Progress has its own sign-in on its own subdomain. The join form
// (app/components/ProgressJoinForm.tsx) sends the Progress sign-in email from
// this page through lib/progress-auth.ts: anon key, auth only, a sanctioned
// and deliberately narrow exception (read that file before extending it).
// Without its env vars the form falls back to handing the email to the app.
//
// Claims on this page describe what the app does today. Change them with the
// app, not ahead of it. The price and trial must match Progress's own Terms.

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

const TRUST = ["4 weeks free, no card needed", "Add their previous seasons too"];

// The four features called out with a screenshot each. Screenshots are the
// real app screens with a made-up player (Alfie) and made-up teammates and
// coach, captured at 390px wide. Retake them if those screens change.
const HIGHLIGHTS = [
  {
    title: "Log every goal and every assist",
    body: "After the game or live from the touchline, record who scored, who set it up, and how: left foot, right foot or header, open play or penalty. Log the whole team's goals, not just your child's, and the app keeps the top scorers and assisters for every season.",
    img: "/progress/screen-goals.webp",
    alt: "The goals list for a 5-2 win: each goal with the scorer, the assist, and left foot, right foot or header",
  },
  {
    title: "Track their whole career, including previous seasons",
    body: "Every club, age group and season in one place, from their first Saturday morning team to today. Already a few seasons in? Add their previous seasons with the games, goals and assists from each, and it all adds up to one career. Playing for two teams at once? Add both.",
    img: "/progress/screen-career.webp",
    alt: "The Progress home screen: career totals of 54 games and 32 goals, with City FC's U9, U10 and U11 seasons and a futsal team listed",
  },
  {
    title: "Get feedback from their coach",
    body: "Send the coach a private link. They rate your child across the FA's four corners and write what's going well and what to work on, in their browser, with no account and no app. Every report is kept, so you can see how they've come on since the last one.",
    img: "/progress/screen-coach.webp",
    alt: "A coach report from Coach Dan: a four-corner chart and ratings for skills such as first touch, dribbling and finishing",
  },
  {
    title: "Make notes on games and training, and spot patterns",
    body: "After a match or a session, jot down what went well and what to work on, and tag it: first touch, confidence, weaker foot. The tags add up across the four corners, so you can see what keeps coming up and what to practise next.",
    img: "/progress/screen-notes.webp",
    alt: "Training notes tagged with skills such as finishing, weaker foot and communication, with counts for each of the four corners",
  },
];

const MORE = [
  {
    title: "Minutes and line-ups",
    body: "Log a game live, quarter by quarter or half by half, and see their minutes on the pitch and where they played.",
  },
  {
    title: "Cards worth sharing",
    body: "Turn a season, a month or a big game into a card for WhatsApp and Instagram, with hat-trick, brace and player of the match versions. First name only by default.",
  },
  {
    title: "Both parents, one record",
    body: "Share a player with another parent so you can both log matches. You see their email and approve them before they get access.",
  },
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

  // No SoftwareApplication schema. Google's Software App rich result needs
  // aggregateRating or review as well as name and offers, and there are no
  // reviews to aggregate. Without a rating the entity can never earn the
  // rich result and only reports as a structured-data error ("a value for
  // the aggregateRating or review field is required", Semrush site audit,
  // 5 Oct 2026). Reinstate it, with real reviews, when there are some.

  return (
    <div className="bg-white">
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
              className="h-14 w-auto mb-4"
            />
            {/* The brand strapline. Only "progress" is ever green (brand rules
                in the progress repo's brand/README.md). */}
            <p className="text-xl font-bold text-[#16211b] mb-7">
              Trust the process. Track the <span className="text-[#1a7a45]">progress</span>.
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold text-[#16211b] leading-tight mb-5">
              Your child&apos;s football journey, kept for good
            </h1>
            <p className="text-lg text-[#3c4a40] leading-relaxed max-w-xl mb-8">
              Progress is the app for football parents. Log every goal and assist,
              keep their career stats (previous seasons included), track training
              and coach feedback, and turn the season into cards worth sharing.
            </p>
            <ProgressJoinForm id="join" />
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

      {/* Highlights: text and a screenshot, alternating sides */}
      <section className="max-w-5xl mx-auto px-6 py-14 lg:py-20">
        <h2 className="text-3xl font-bold text-[#16211b] mb-3">What you can keep</h2>
        <p className="text-lg text-[#3c4a40] max-w-2xl mb-12">
          The things you&apos;d otherwise lose to a group chat, a camera roll or
          memory, all in one record that grows with them.
        </p>
        <div className="grid gap-16 lg:gap-20">
          {HIGHLIGHTS.map((h, i) => (
            <div key={h.title} className="grid gap-8 md:grid-cols-2 md:items-center">
              <div className={i % 2 === 1 ? "md:order-2" : undefined}>
                <h3 className="text-2xl font-bold text-[#16211b] mb-3">{h.title}</h3>
                <p className="text-lg text-[#3c4a40] leading-relaxed m-0">{h.body}</p>
              </div>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- static
                    screenshot, sized below; a made-up player throughout. */}
                <img
                  src={h.img}
                  alt={h.alt}
                  width={780}
                  height={1688}
                  loading="lazy"
                  className="w-64 sm:w-72 h-auto rounded-[2rem] border-[6px] border-[#16211b] shadow-xl"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* And more */}
      <section className="bg-[#f4f6f1] border-y border-[#d8ded1]">
        <div className="max-w-5xl mx-auto px-6 py-14 lg:py-16">
          <h2 className="text-3xl font-bold text-[#16211b] mb-8">And there&apos;s more</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {MORE.map((m) => (
              <div key={m.title} className="rounded-2xl border border-[#d8ded1] bg-white p-6">
                <h3 className="text-xl font-bold text-[#16211b] mb-2">{m.title}</h3>
                <p className="text-[#3c4a40] leading-relaxed m-0">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Price */}
      <section className="bg-[#16211b] text-[#f4f6f1]">
        <div className="max-w-5xl mx-auto px-6 py-14 lg:py-16 text-center">
          <p className="text-2xl lg:text-3xl font-bold text-white mb-8">
            Trust the process. Track the <span className="text-[#47b473]">progress</span>.
          </p>
          <h2 className="text-3xl font-bold text-white mb-3">Try everything free for 4 weeks</h2>
          <p className="text-lg text-[#c9d3c4] max-w-xl mx-auto mb-8">
            No card needed to start. After the trial it&apos;s £2.50 a month, and you
            can cancel any time. If you don&apos;t subscribe, nothing is deleted.
          </p>
          <div className="flex justify-center text-left">
            <ProgressJoinForm id="join-trial" dark />
          </div>
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
          <a
            href="#join"
            className="inline-flex items-center justify-center rounded-full bg-[#1a7a45] px-7 py-3.5 text-base font-semibold text-white no-underline shadow-sm transition-colors hover:bg-[#0f5d34]"
          >
            Start your journey
          </a>
        </div>
      </section>
    </div>
  );
}
