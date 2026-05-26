import Link from "next/link";

export const metadata = {
  title: "Girls Football | Football Parent",
  description:
    "Parent-centered advice on girls football academies, development pathways, and competitive opportunities.",
};

export default function GirlsFootballPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-5xl font-bold mb-6">Girls Football</h1>

        <p className="text-xl text-gray-600 mb-10">
          Comprehensive support for parents navigating girls football academies,
          development pathways, and competitive opportunities.
        </p>

        <div className="grid gap-6 md:grid-cols-2">

          <Link href="/girls-football/how-girls-football-academies-work">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Academy Pathways
              </h2>

              <p>
                Understanding how girls football academies work and what to
                expect.
              </p>
            </article>
          </Link>

          <Link href="/girls-football/what-age-do-girls-football-academies-recruit">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Development & Recruitment
              </h2>

              <p>
                Ages, stages, and what scouts look for in female footballers.
              </p>
            </article>
          </Link>

          <Link href="/girls-football/girls-football-trials">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Trials & Selection
              </h2>

              <p>
                Preparing for academy trials and competitive selection
                processes.
              </p>
            </article>
          </Link>

          <Link href="/girls-football/late-developers-in-girls-football">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Late Development
              </h2>

              <p>
                Supporting players who develop at different rates in girls
                football.
              </p>
            </article>
          </Link>

          <Link href="/girls-football/girls-academy-vs-grassroots-football">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Academy vs Grassroots
              </h2>

              <p>
                Comparing academy and grassroots environments for girls
                footballers.
              </p>
            </article>
          </Link>

        </div>
      </section>
    </main>
  );
}