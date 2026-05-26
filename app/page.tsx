import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-transparent text-slate-900">
      <section className="relative overflow-hidden px-6 py-20 sm:px-10 lg:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sky-100/60 via-slate-100/40 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-24 hidden h-80 w-80 rounded-full bg-teal-200/30 blur-3xl lg:block" />
        <div className="pointer-events-none absolute left-0 bottom-10 hidden h-72 w-72 rounded-full bg-emerald-100/30 blur-3xl lg:block" />

        <div className="relative mx-auto max-w-5xl">
          <div className="mb-12 rounded-[2rem] border border-slate-200 bg-white/90 p-10 shadow-xl shadow-slate-200/50 backdrop-blur-md sm:p-12">
            <p className="mb-3 inline-flex rounded-full bg-teal-100 px-4 py-1 text-sm font-medium text-teal-800">
              Calm, clear guidance for football families
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Helping parents understand the UK football development pathway
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              Honest support on academy football, grassroots development,
              football trials, and helping young players grow with confidence.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/academy-pathway"
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-2xl hover:shadow-teal-100/60"
            >
              <div className="mb-4 inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700 transition duration-300 group-hover:bg-teal-100">
                Academy details
              </div>
              <h2 className="text-2xl font-semibold text-slate-950 transition duration-300 group-hover:text-teal-800">
                Academy Pathway
              </h2>
              <p className="mt-3 text-slate-600 leading-7">
                Learn how academy football works in the UK, from grassroots to scholarships.
              </p>
            </Link>

            <Link
              href="/football-development"
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-2xl hover:shadow-cyan-100/60"
            >
              <div className="mb-4 inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700 transition duration-300 group-hover:bg-cyan-100">
                Growth plan
              </div>
              <h2 className="text-2xl font-semibold text-slate-950 transition duration-300 group-hover:text-cyan-800">
                Football Development
              </h2>
              <p className="mt-3 text-slate-600 leading-7">
                Age-by-age development advice for young footballers.
              </p>
            </Link>

            <Link
              href="/academy-trials"
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-2xl hover:shadow-violet-100/60"
            >
              <div className="mb-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 transition duration-300 group-hover:bg-slate-200">
                Trial prep
              </div>
              <h2 className="text-2xl font-semibold text-slate-950 transition duration-300 group-hover:text-slate-800">
                Academy Trials
              </h2>
              <p className="mt-3 text-slate-600 leading-7">
                Understand what happens at trials and what coaches look for.
              </p>
            </Link>

            <Link
              href="/parent-guides"
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-2xl hover:shadow-amber-100/60"
            >
              <div className="mb-4 inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 transition duration-300 group-hover:bg-amber-100">
                Parent support
              </div>
              <h2 className="text-2xl font-semibold text-slate-950 transition duration-300 group-hover:text-amber-800">
                Parent Guides
              </h2>
              <p className="mt-3 text-slate-600 leading-7">
                Realistic advice for football parents navigating the pathway.
              </p>
            </Link>
<Link href="/girls-football">
  <article className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer bg-white">
    <span className="inline-block mb-4 px-4 py-1 rounded-full bg-pink-100 text-pink-700 text-sm font-medium">
      Girls pathway
    </span>

              <h2 className="text-2xl font-semibold text-slate-950 transition duration-300 group-hover:text-slate-800">
      Girls Football
    </h2>
    <p className="mt-3 text-slate-600 leading-7">
      Academy pathways, trials, development advice and support for girls football parents.
    </p>
  </article>
</Link>
            <Link
              href="/football-gear"
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-slate-400 hover:shadow-2xl hover:shadow-slate-100/60"
            >
              <div className="mb-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 transition duration-300 group-hover:bg-slate-200">
                Gear essentials
              </div>
              <h2 className="text-2xl font-semibold text-slate-950 transition duration-300 group-hover:text-slate-800">
                Football Gear
              </h2>
              <p className="mt-3 text-slate-600 leading-7">
                Find trusted shin pads, training equipment, and winter gear for young players.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
