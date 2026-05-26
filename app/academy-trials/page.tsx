import Link from "next/link";

export const metadata = {
  title: "Academy Trials | Football Parent",
  description:
    "Understanding academy football trials, recruitment and player assessment.",
};

export default function AcademyTrialsPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-5xl font-bold mb-6">Academy Trials</h1>

        <p className="text-xl text-gray-600 mb-10">
          Helping parents understand academy football recruitment, assessment
          and player development pathways.
        </p>

        <div className="grid gap-6 md:grid-cols-2">

          <Link href="/academy-trials/how-football-scouts-identify-players">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                How Football Scouts Identify Players
              </h2>

              <p>
                Understanding how scouts assess young footballers and identify
                long-term potential.
              </p>
            </article>
          </Link>

          <Link href="/academy-trials/what-happens-at-academy-trials">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                What Happens At Academy Trials?
              </h2>

              <p>
                What parents and players should expect during football academy
                trials and assessments.
              </p>
            </article>
          </Link>

          <Link href="/academy-trials/football-trials-near-me">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Football Trials Near Me
              </h2>

              <p>
                Understanding how local football trials work and how legitimate
                academy recruitment operates.
              </p>
            </article>
          </Link>

          <Link href="/academy-trials/what-do-academy-coaches-look-for">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                What Do Academy Coaches Look For?
              </h2>

              <p>
                An honest breakdown of the technical, physical and behavioural
                traits academy coaches assess.
              </p>
            </article>
          </Link>

        </div>
      </section>
    </main>
  );
}