import Link from "next/link";

export const metadata = {
  title: "Football Development | Football Parent",
  description:
    "Long-term football development advice for parents and young players.",
};

export default function FootballDevelopmentPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-5xl font-bold mb-6">Football Development</h1>

        <p className="text-xl text-gray-600 mb-10">
          Understanding long-term player development, confidence, coaching and
          realistic progression in youth football.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/football-development/how-to-become-a-professional-footballer">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                How To Become A Professional Footballer
              </h2>
              <p>
                A realistic look at the football pathway and what parents should
                understand about progression.
              </p>
            </article>
          </Link>

          <Link href="/football-development/signs-your-child-is-ready-for-academy-football">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Signs Your Child Is Ready For Academy Football
              </h2>
              <p>
                Understanding readiness, attitude and development signs without
                overhyping early talent.
              </p>
            </article>
          </Link>

          <Link href="/football-development/improve-football-decision-making">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Improving Football Decision Making
              </h2>
              <p>
                Helping young players develop awareness, confidence and better
                choices during matches.
              </p>
            </article>
          </Link>

          <Link href="/football-development/good-football-development-environment">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                What Makes A Good Football Development Environment?
              </h2>
              <p>
                How to judge whether a football environment is genuinely helping
                your child develop.
              </p>
            </article>
          </Link>

          <Link href="/football-development/how-much-training-is-too-much">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                How Much Training Is Too Much?
              </h2>
              <p>
                Balancing training, recovery, enjoyment and long-term development.
              </p>
            </article>
          </Link>

          <Link href="/football-development/build-confidence-young-footballers">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Building Confidence In Young Footballers
              </h2>
              <p>
                Practical ways parents can support confidence and resilience.
              </p>
            </article>
          </Link>

          <Link href="/football-development/late-developers-in-football">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Late Developers In Football
              </h2>
              <p>
                Why some players physically and technically develop later.
              </p>
            </article>
          </Link>

          <Link href="/football-development/is-private-football-coaching-worth-it">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Is Private Football Coaching Worth It?
              </h2>
              <p>
                A balanced look at private coaching for young footballers.
              </p>
            </article>
          </Link>
        </div>
      </section>
    </main>
  );
}