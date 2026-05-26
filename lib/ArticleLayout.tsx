import Link from "next/link";

interface ArticleLayoutProps {
  title: string;
  description: string;
  category: string;
  categoryUrl: string;
  readTime: number;
  sections: { id: string; title: string }[];
  relatedArticles: { href: string; title: string; color: string; description: string }[];
  children: React.ReactNode;
}

export default function ArticleLayout({
  title,
  description,
  category,
  categoryUrl,
  readTime,
  sections,
  relatedArticles,
  children,
}: ArticleLayoutProps) {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-gray-50 border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-6 py-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <span className="text-gray-400">/</span>
            <Link href={categoryUrl} className="hover:text-gray-900">{category}</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{title}</span>
          </div>
        </nav>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-6">Guide</span>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6 text-gray-900">
            {title}
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mb-6">
            {description}
          </p>
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">By</span>
              <span className="font-medium text-gray-700">Football Parent</span>
            </div>
            <span className="text-gray-300">•</span>
            <span>Updated May 2026</span>
            <span className="text-gray-300">•</span>
            <span>{readTime} min read</span>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row gap-12">
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="hidden sticky top-8 bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">On this page</h3>
                
                <nav className="space-y-3">
  {sections.map((section) => (
    <a
      key={section.id}
      href={`#${section.title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}`}
      className="block rounded-lg bg-white px-3 py-2 text-sm font-semibold !text-gray-900 opacity-100 border border-gray-200 hover:!text-blue-700 hover:bg-gray-100 transition"
    >
      {section.title}
    </a>
  ))}
</nav>
              </div>
            </aside>

            <article className="flex-1 max-w-2xl">
              {children}
            </article>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-24">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-10">Related Articles</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {relatedArticles.map((article, idx) => (
                <article key={idx} className="group">
                  <Link href={article.href} className="block">
                    <div className={`mb-4 h-40 bg-gradient-to-br ${article.color} rounded-lg group-hover:opacity-90 transition-all`}></div>
                    <h3 className={`text-lg font-semibold text-gray-900 group-hover:text-blue-700 mb-2`}>{article.title}</h3>
                    <p className="text-sm text-gray-600">{article.description}</p>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <div className="max-w-4xl">
            <div className="bg-gray-50 rounded-lg p-8 lg:p-10">
              <div className="flex gap-6 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Football Parent</h3>
                  <p className="text-gray-600">
                    Independent guidance for parents navigating the youth football system in the UK.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
