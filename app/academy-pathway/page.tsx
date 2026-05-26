import Link from "next/link";

export const metadata = {
  title: "Academy Pathway | Football Parent",
  description:
    "A parent-focused guide to the UK football academy pathway, from grassroots to scholarship.",
};

export default function AcademyPathwayPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-5xl font-bold mb-6">Academy Pathway</h1>

        <p className="text-xl text-gray-600 mb-10">
          Practical guidance for parents navigating the academy pathway and understanding the stages of youth football.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/academy-pathway/how-academy-football-works">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                How Academy Football Works
              </h2>
              <p>
                Introductory guide to how academy football works in the UK.
              </p>
            </article>
          </Link>

          <Link href="/academy-pathway/what-is-eppp">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                What is EPPP?
              </h2>
              <p>
                Read about EPPP, the elite player performance plan, and how it affects academy football.
              </p>
            </article>
          </Link>

          <Link href="/academy-pathway/academy-categories-explained">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Academy categories explained
              </h2>
              <p>
                Understand the differences between Category 1, 2, 3 and 4 academies.
              </p>
            </article>
          </Link>

          <Link href="/academy-pathway/what-age-do-football-academies-recruit">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                What Age Do Football Academies Recruit?
              </h2>
              <p>
                Find out when academies recruit and how the pathway changes by age group.
              </p>
            </article>
          </Link>

          <Link href="/academy-pathway/development-centres-vs-academies">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Development centres vs academies
              </h2>
              <p>
                See how development centres differ from formal academy programmes.
              </p>
            </article>
          </Link>

          <Link href="/academy-pathway/understanding-academy-release">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Understanding academy release
              </h2>
              <p>
                What parents should know about development, selection, and support.
              </p>
            </article>
          </Link>

          

          
        </div>
      </section>
    </main>
  );
}