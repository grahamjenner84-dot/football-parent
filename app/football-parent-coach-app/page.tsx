import Image from "next/image";
import Link from "next/link";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Coach App | Team Sheets, Live Matchday and Equal Playing Time",
  description:
    "The grassroots football coach app that handles team selection, equal playing time rotation, live matchday scoring and session planning, so you can run the team from your phone.",
  path: "/football-parent-coach-app",
  type: "website",
});

const features = [
  {
    title: "Team selection and equal playing time rotation",
    description:
      "Pick a formation and build your matchday lineup by tapping players onto the pitch, or switch to Rotate mode and let the app build a fair playing-time rotation across periods for you, with rules for minimum minutes, GK involvement and same-position limits so nobody is stuck arguing about who played where.",
  },
  {
    title: "Season stats without the spreadsheet",
    description:
      "Team and individual stats, goals, assists, minutes and playing time by position, calculated automatically from the games you log.",
  },
  {
    title: "Run the game live",
    description:
      "Score, cards, substitutions and a match commentary feed, all logged in real time from the touchline. Full time locks the result and can prompt Man of the Match.",
  },
  {
    title: "Fixtures and results in one place",
    description:
      "Upcoming matches, played results and a full match history per player, so parents asking 'how did we get on' get an instant answer.",
  },
  {
    title: "Training, kept simple",
    description:
      "Check who's available for the next session and keep your plan in a simple notepad, nothing complicated to wrestle with before training even starts.",
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
            Team selection, equal playing time rotation, live matchday
            scoring and simple session planning, built for volunteer
            coaches, not professional clubs.
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
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-12 text-center">
          Everything a grassroots coach actually needs
        </h2>

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
    </main>
  );
}
