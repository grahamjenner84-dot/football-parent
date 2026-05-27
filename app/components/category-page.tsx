import Link from "next/link";

type Article = {
  title: string;
  href: string;
  description: string;
};

type CategoryPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  articles: Article[];
};

export default function CategoryPage({
  eyebrow,
  title,
  description,
  articles,
}: CategoryPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            {eyebrow}
          </p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
            {title}
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            {description}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {articles.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
            >
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 group-hover:text-emerald-700">
                {article.title}
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                {article.description}
              </p>

              <p className="mt-6 text-sm font-semibold text-emerald-700">
                Read guide →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}