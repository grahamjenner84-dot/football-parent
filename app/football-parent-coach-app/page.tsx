import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Parent Coach App: Team Selector & Match Tracker",
  description:
    "Football Parent's Coach App: build your lineup, track live matches and get fair playing-time rotation for your grassroots football team, all in one place.",
  path: "/football-parent-coach-app",
  type: "website",
});

export default function CoachAppPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          <img
            src="/logo-icon-coach.png"
            alt="Football Parent Coach App"
            className="h-14 w-14 mb-6"
          />

          <p className="text-sm font-semibold text-blue-700 mb-4">
            Football Parent Coach App
          </p>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Run Your Grassroots Team Without the Sunday-Morning Spreadsheet
          </h1>

          <p className="text-lg text-gray-700 leading-relaxed">
            If you&apos;re coaching or managing a grassroots team, most of the
            admin isn&apos;t coaching at all: working out who played what last
            week, chasing parents for availability, totting up who&apos;s had
            a fair share of game time. The Coach App handles that side so you
            can focus on the session and the match.
          </p>

          <div className="mt-8">
            <a
              href="/coach-app"
              className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Try the Coach App
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="space-y-6 text-gray-700 text-lg leading-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
            What It Does
          </h2>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Squad Management
          </h3>
          <p>
            Keep your full squad in one place, with an active/inactive flag
            for players who&apos;ve stepped away without losing their history.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Scheduling &amp; Availability
          </h3>
          <p>
            Set up matches and training as one-off or weekly recurring
            fixtures, with location and notes, so the team always knows
            what&apos;s next.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Team Selector &amp; Lineups
          </h3>
          <p>
            Build a fixed lineup or switch on equal-time rotation, with
            drag-and-drop formations, so playing time stays fair without you
            doing the maths in your head.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Live Match Tracker
          </h3>
          <p>
            Log goals, cards and substitutions as they happen, with a live
            feed your team can follow along to.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Real Stats
          </h3>
          <p>
            Appearances, goals, assists and cards, calculated from what
            actually happened in your matches, not hand-counted after the
            fact.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Tournament Day
          </h3>
          <p>
            A dedicated flow for tournament formats, from lineup through to a
            live summary.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Share With Your Team
          </h3>
          <p>
            Send parents, assistant coaches and team managers a link to join
            in and see the same fixtures and results you do.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Built for Grassroots
          </h2>

          <p>
            This isn&apos;t a club-wide platform for academies or leagues to
            run their whole operation. It&apos;s built for the person actually
            stood on the touchline: a head coach, assistant coach or team
            manager running one grassroots team, not a whole club&apos;s
            operation.
          </p>

          <div className="pt-6">
            <a
              href="/coach-app"
              className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Try the Coach App
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
