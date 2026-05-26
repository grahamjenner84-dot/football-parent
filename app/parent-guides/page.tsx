import Link from "next/link";

export const metadata = {
  title: "Parent Guides | Football Parent",
  description:
    "Practical support and advice for parents navigating youth football.",
};

export default function ParentGuidesPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-5xl font-bold mb-6">Parent Guides</h1>

        <p className="text-xl text-gray-600 mb-10">
          Practical advice to help parents support young footballers in healthy,
          positive and realistic ways.
        </p>

        <div className="grid gap-6 md:grid-cols-2">

          <Link href="/parent-guides/support-child-after-bad-match">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Supporting Your Child After A Bad Match
              </h2>

              <p>
                Helping young players process difficult performances and setbacks.
              </p>
            </article>
          </Link>

          <Link href="/parent-guides/what-to-say-after-football-matches">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                What Parents Should Say After Matches
              </h2>

              <p>
                Post-match conversations that build confidence instead of pressure.
              </p>
            </article>
          </Link>

          <Link href="/parent-guides/biggest-football-parent-mistakes">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                The Biggest Football Parent Mistakes
              </h2>

              <p>
                Common mistakes football parents make and how to support better.
              </p>
            </article>
          </Link>

          <Link href="/parent-guides/leave-grassroots-football-for-an-academy">
            <article className="border rounded-2xl p-6 hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3">
                Should My Child Leave Grassroots For An Academy?
              </h2>

              <p>
                Deciding whether academy football is the right choice for your child.
              </p>
            </article>
          </Link>

        </div>
      </section>
    </main>
  );
}