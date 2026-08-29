import Image from "next/image";
import Link from "next/link";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Coach App | Team Sheets, Live Matchday and Equal Playing Time",
  description:
    "The grassroots football coach app that handles team selection, equal playing time rotation, live matchday scoring and a training board, so you can run the team from your phone.",
  path: "/football-parent-coach-app",
  type: "website",
});

const features = [
  {
    title: "Team selection in seconds",
    description:
      "Pick a formation, tap players onto the pitch or drag them from the bench. Save a lineup once and reuse it next week.",
  },
  {
    title: "Equal playing time, handled automatically",
    description:
      "Switch to Rotate mode and the app builds a fair rotation across periods for you, with rules for minimum minutes, GK involvement and same-position limits so nobody is stuck arguing about who played where.",
  },
  {
    title: "Run the game live",
    description:
      "Score, cards, substitutions and a match commentary feed, all logged in real time from the touchline. Full time locks the result and can prompt Man of the Match.",
  },
  {
    title: "A tactics board that animates",
    description:
      "Build a drill on a full pitch, half pitch or final third, sequence your arrows, then press play to animate the movement for your squad or save it into a training session.",
  },
  {
    title: "Fixtures and results in one place",
    description:
      "Upcoming matches, played results and a full match history per player, so parents asking 'how did we get on' get an instant answer.",
  },
  {
    title: "Season stats without the spreadsheet",
    description:
      "Team and individual stats, goals, assists, minutes and playing time by position, calculated automatically from the games you log.",
  },
];

export default function CoachAppLandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 lg:py-24 text-center">
          <Image
            src="/logo-horizontal-coach-white.png"
            alt="Coach App"
            width={280}
            height={82}
            className="mx-auto mb-8 h-auto w-[220px] lg:w-[280px]"
            priority
          />

          <h1 className="text-3xl lg:text-5xl font-bold mb-6 leading-tight">
            Run your grassroots team from your phone
          </h1>

          <p className="text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto mb-10">
            Team selection, equal playing time rotation, live matchday scoring
            and a training board built for volunteer coaches, not
            professional clubs.
          </p>

          <Link
            href="/coach-app"
            className="inline-block bg-white text-gray-900! font-semibold px-8 py-4 rounded-lg text-lg hover:bg-gray-100 transition-colors"
          >
            Open Coach App
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 lg:py-20">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 text-center">
          Everything a grassroots coach actually needs
        </h2>
        <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
          No club admin, no subscriptions per player, no features built for
          professional academies. Just the tools you need on a Saturday
          morning.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-16 lg:py-20 text-center">
          <Image
            src="/logo-icon-coach.png"
            alt=""
            width={64}
            height={64}
            className="mx-auto mb-6 rounded-xl"
          />
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            Works in your browser, no app store required
          </h2>
          <p className="text-gray-700 text-lg mb-8">
            Coach App is a progressive web app. Open it on your phone and add
            it to your home screen for a full-screen, app-like experience,
            with no install or update to manage.
          </p>
          <Link
            href="/coach-app"
            className="inline-block bg-gray-900 text-white! font-semibold px-8 py-4 rounded-lg text-lg hover:bg-gray-800 transition-colors"
          >
            Open Coach App
          </Link>
        </div>
      </section>
    </main>
  );
}
