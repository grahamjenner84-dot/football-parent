import Link from "next/link";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Parent | Independent Guidance for Football Parents",
  description:
    "Independent advice for parents navigating academy football, grassroots football and player development in the UK.",
  path: "/",
  type: "website",
});

const categories = [
  {
    href: "/academy-pathway",
    label: "Academy guidance",
    title: "Academy Pathway",
    description:
      "Understand how academy football works in the UK, from grassroots to scholarships.",
  },
  {
    href: "/football-development",
    label: "Player development",
    title: "Football Development",
    description:
      "Age-by-age development advice to help young footballers improve with confidence.",
  },
  {
    href: "/academy-trials",
    label: "Trials & scouting",
    title: "Academy Trials",
    description:
      "Learn what happens at trials and what academy coaches look for in players.",
  },
  {
    href: "/parent-guides",
    label: "Parent support",
    title: "Parent Guides",
    description:
      "Practical advice for football parents navigating youth football pathways.",
  },
  {
    href: "/girls-football",
    label: "Girls football",
    title: "Girls Football",
    description:
      "Advice on girls academies, development, trials and long-term progression.",
  },
  {
    href: "/football-gear",
    label: "Equipment & gear",
    title: "Football Gear",
    description:
      "Trusted football boots, shin pads, gloves and training equipment for young players.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
              Independent guidance for football families
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
              Helping parents navigate youth football with confidence
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-600 md:text-xl">
              Clear, practical advice on academy football, grassroots
              development, football trials, player progression and supporting
              young footballers. Helping football parents make confident decisions.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
            >
              <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                {category.label}
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-950 group-hover:text-emerald-700">
                {category.title}
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                {category.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
      <section className="border-t border-slate-200 bg-white">
  <div className="mx-auto max-w-4xl px-5 py-12 md:py-16">
    <h2 className="text-3xl font-bold text-slate-950 mb-6">
      About Football Parent
    </h2>

<div className="space-y-5 text-slate-700 leading-8">
  <p>
    Football Parent is an independent UK resource for families navigating youth football. Whether your child plays grassroots football, attends a development centre, trials with an academy or simply loves the game, our aim is to help parents make informed decisions based on evidence rather than hype.
  </p>

  <p>
    The site covers academy football, football development, football trials, girls football pathways, equipment advice and the everyday questions that football parents face as children progress through the game.
  </p>

  <p>
    Every guide is written from the perspective of a football parent, combining first-hand experience with trusted research to provide clear, balanced advice that puts children's long-term development first.
  </p>

  <p>
    Learn more about our{" "}
    <Link
      href="/about"
      className="font-medium text-emerald-700 hover:text-emerald-800"
    >
      mission and background
    </Link>
    , read our{" "}
    <Link
      href="/editorial-policy"
      className="font-medium text-emerald-700 hover:text-emerald-800"
    >
      Editorial Policy
    </Link>
    , or visit the{" "}
    <Link
      href="/author/graham-jenner"
      className="font-medium text-emerald-700 hover:text-emerald-800"
    >
      author profile
    </Link>
    .
  </p>
</div>

  </div>
</section>

    </main>
  );
}