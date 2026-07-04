import Link from "next/link";

type Article = {
  title: string;
  href: string;
  description: string;
};

type StartHereLink = {
  title: string;
  href: string;
  description: string;
};

type StartHereSection = {
  title: string;
  description?: string;
  links: StartHereLink[];
};

type BottomContentSection = {
  title: string;
  content: string[];
};

type CategoryPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  articles: Article[];
  intro?: string[];
  startHere?: StartHereSection;
  articlesHeading?: string;
  bottomContent?: BottomContentSection;
};

export default function CategoryPage({
  eyebrow,
  title,
  description,
  articles,
  intro,
  startHere,
  articlesHeading = "All Guides",
  bottomContent,
}: CategoryPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-6 md:pt-20 md:pb-8">
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

      {((intro && intro.length > 0) || startHere) && (
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 pt-6 pb-10">
            {intro && intro.length > 0 && (
              <div className="max-w-3xl space-y-4 text-base leading-7 text-slate-600">
                {intro.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}

            {startHere && (
              <div className="mt-8 max-w-3xl rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  {startHere.title}
                </h2>

                {startHere.description && (
                  <p className="mt-3 leading-7 text-slate-700">
                    {startHere.description}
                  </p>
                )}

                <ul className="mt-4 space-y-3 leading-7 text-slate-700">
                  {startHere.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        {link.title}
                      </Link>{" "}
                      {link.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-950">
          {articlesHeading}
        </h2>

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

        {bottomContent && (
          <div className="mt-14 max-w-3xl border-t border-slate-200 pt-10">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              {bottomContent.title}
            </h2>

            <div className="mt-5 space-y-4 text-base leading-7 text-slate-600">
              {bottomContent.content.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}