import Link from "next/link";

export const metadata = {
  title: "Football Gear | Football Parent",
  description:
    "Practical football equipment advice for parents and young players.",
};

export default function FootballGearPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-5xl font-bold mb-6">Football Gear</h1>

        <p className="text-xl text-gray-600 mb-10">
          Practical equipment advice to help young footballers stay comfortable,
          safe and properly prepared.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/football-gear/ag-vs-fg-boots">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                FG vs AG Boots For Kids
              </h2>
              <p>
                Understanding football boot soleplates and choosing the right type
                for different surfaces.
              </p>
            </article>
          </Link>

          <Link href="/football-gear/boots/best-football-boots-for-wide-feet-kids">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Best Football Boots For Wide Feet Kids
              </h2>
              <p>
                Practical advice for choosing comfortable football boots for
                wider feet.
              </p>
            </article>
          </Link>

          <Link href="/football-gear/shin-pads/best-shin-pads-for-kids-football">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Best Shin Pads For Kids Football
              </h2>
              <p>
                How to choose shin pads that balance comfort, protection and fit.
              </p>
            </article>
          </Link>

          <Link href="/football-gear/best-football-gloves-for-winter-training">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Best Football Gloves For Winter Training
              </h2>
              <p>
                Choosing football gloves for cold-weather training sessions.
              </p>
            </article>
          </Link>

          <Link href="/football-gear/best-footballs-by-age">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Best Footballs By Age
              </h2>
              <p>
                Choosing the correct football size and type for young players.
              </p>
            </article>
          </Link>
        </div>
      </section>
    </main>
  );
}