import Link from "next/link";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Academy Pathway | Football Parent",
  description:
    "Learn how academy football works in the UK, including academy categories, recruitment, development centres and player pathways.",
  path: "/academy-pathway",
  type: "website",
});

const articles = [
  {
    title: "What Is EPPP?",
    description:
      "Understand the Elite Player Performance Plan and how it changed academy football in England.",
    href: "/academy-pathway/what-is-eppp",
  },
  {
    title: "Academy Categories Explained",
    description:
      "Learn the difference between Category 1, 2, 3 and 4 academies.",
    href: "/academy-pathway/academy-categories-explained",
  },
  {
    title: "Development Centres vs Academies",
    description:
      "Compare football development centres and academy football pathways.",
    href: "/academy-pathway/development-centres-vs-academies",
  },
  {
    title: "What Age Do Football Academies Recruit?",
    description:
      "Find out when academies usually begin identifying young players.",
    href: "/academy-pathway/what-age-do-football-academies-recruit",
  },
  {
    title: "Understanding Academy Release",
    description:
      "Practical support and guidance for parents after academy release.",
    href: "/academy-pathway/understanding-academy-release",
  },
];

export default function AcademyPathwayPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <section className="border-b border-black/5 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-3">
            Football Parent
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Academy Pathway
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-gray-700 leading-relaxed">
            Honest guidance for parents trying to understand academy football,
            recruitment, development pathways and what realistic progression
            looks like in the UK.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid gap-6">
          {articles.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="group rounded-2xl border border-black/5 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-2xl font-semibold text-gray-900 group-hover:text-black">
                {article.title}
              </h2>

              <p className="mt-3 text-gray-700 leading-relaxed">
                {article.description}
              </p>

              <p className="mt-4 text-sm font-medium text-emerald-700">
                Read article →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}