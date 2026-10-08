import Link from "next/link";
import Script from "next/script";
import { BRAND_IMAGES } from "@/lib/seo";
import { extractFaqs } from "@/lib/faq";
import InstagramFollow from "@/app/components/InstagramFollow";

interface ArticleLayoutProps {
  title: string;
  description: string;
  category: string;
  categoryUrl: string;
  readTime: number;
  sections: { id: string; title: string }[];
  path?: string;
  datePublished?: string;
  dateModified?: string;
  content?: string;
  relatedArticles?: {
    href: string;
    title: string;
    color?: string;
    description?: string;
  }[];
  // A "tool" page is one whose main content is something the reader uses
  // (the equal playing time calculator) rather than reads. It renders the
  // hero slot full width above the body, drops the read time, badges itself
  // "Free tool" and describes itself to Google as a WebApplication rather
  // than a BlogPosting. Articles are unaffected: the default is "article".
  kind?: "article" | "tool";
  hero?: React.ReactNode;
  // Tool pages only: a one-paragraph lead rendered in the header where an
  // article shows its description, so the hero (the calculator) starts as
  // high as possible, inside the first screen on a phone.
  lead?: React.ReactNode;
  children: React.ReactNode;
}

function createAbsoluteUrl(path: string) {
  if (path.startsWith("https://")) {
    return path;
  }

  return `https://www.footballparent.co.uk${
    path.startsWith("/") ? path : `/${path}`
  }`;
}

function createSchemaId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function formatDate(date?: string) {
  if (!date) {
    return null;
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

export default function ArticleLayout({
  title,
  description,
  category,
  categoryUrl,
  readTime,
  sections,
  path,
  datePublished,
  dateModified,
  content,
  kind = "article",
  hero,
  lead,
  children,
}: ArticleLayoutProps) {
  const articleUrl = path ? createAbsoluteUrl(path) : undefined;
  const categoryAbsoluteUrl = createAbsoluteUrl(categoryUrl);
  const schemaId = createSchemaId(title);
  const faqs = content ? extractFaqs(content) : [];
  const isTool = kind === "tool";

  const breadcrumbSchema = articleUrl
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.footballparent.co.uk",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: category,
            item: categoryAbsoluteUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: title,
            item: articleUrl,
          },
        ],
      }
    : null;

  const author = {
    "@type": "Person",
    name: "Graham Jenner",
    url: "https://www.footballparent.co.uk/author/graham-jenner",
  };

  const publisher = {
    "@type": "Organization",
    name: "Football Parent",
    url: "https://www.footballparent.co.uk",
    logo: {
      "@type": "ImageObject",
      url: "https://www.footballparent.co.uk/parent/icon/parent-icon-512.png",
    },
  };

  // Google's Article guidance: at least 1200px wide, in 16:9, 4:3 and 1:1 so
  // it can pick the ratio each surface needs without cropping.
  const images = [BRAND_IMAGES.parent.wide, BRAND_IMAGES.parent.standard, BRAND_IMAGES.parent.square];

  const dates = {
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
  };

  const mainSchema = !articleUrl
    ? null
    : isTool
      ? {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: title,
          description,
          url: articleUrl,
          applicationCategory: "SportsApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          isAccessibleForFree: true,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "GBP",
          },
          image: images,
          author,
          publisher,
          ...dates,
        }
      : {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          description,
          image: images,
          author,
          publisher,
          ...dates,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": articleUrl,
          },
        };

  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <main className="min-h-screen bg-white">
      {mainSchema && (
        <Script
          id={`article-schema-${schemaId}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(mainSchema),
          }}
        />
      )}

      {breadcrumbSchema && (
        <Script
          id={`breadcrumb-schema-${schemaId}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}

      {faqSchema && (
        <Script
          id={`faq-schema-${schemaId}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema),
          }}
        />
      )}

      <div className="bg-gray-50 border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-6 py-4 text-sm">
          <div className={`flex items-center gap-2 text-gray-600 ${isTool ? "min-w-0" : ""}`}>
            <Link href="/" className="hover:text-gray-900">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href={categoryUrl} className="hover:text-gray-900">
              {category}
            </Link>
            <span className="text-gray-400">/</span>
            <span className={`text-gray-900 font-medium ${isTool ? "truncate" : ""}`}>{title}</span>
          </div>
        </nav>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className={`max-w-4xl mx-auto px-6 ${isTool ? "py-6 lg:py-20" : "py-16 lg:py-20"}`}>
          <span className={`${isTool ? "hidden sm:inline-block" : "inline-block"} px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-6`}>
            {isTool ? "Free tool" : "Guide"}
          </span>

          <h1 className={`${isTool ? "text-3xl sm:text-4xl" : "text-4xl"} lg:text-5xl font-bold leading-tight mb-6 text-gray-900`}>
            {title}
          </h1>

          {/* A tool page shows its lead here instead of the description,
              which would repeat it almost word for word. The meta
              description in the head is unaffected. */}
          {isTool ? (
            lead && <div className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mb-6">{lead}</div>
          ) : (
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mb-6">
              {description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">By</span>
              <Link
                href="/author/graham-jenner"
                className="font-medium text-gray-700 hover:text-gray-900"
              >
                Graham Jenner
              </Link>
            </div>

            {formatDate(datePublished) && (
              <>
                <span className="text-gray-300">•</span>
                <span>Published {formatDate(datePublished)}</span>
              </>
            )}

            {formatDate(dateModified) && (
              <>
                <span className="text-gray-300">•</span>
                <span>Updated {formatDate(dateModified)}</span>
              </>
            )}

            {!isTool && (
              <>
                <span className="text-gray-300">•</span>
                <span>{readTime} min read</span>
              </>
            )}
          </div>
        </div>
      </div>

      {hero && (
        <div className="bg-white">
          <div className="max-w-4xl mx-auto px-6 pt-4 lg:pt-12">{hero}</div>
        </div>
      )}

      <div className="bg-white">
        {/* A tool page keeps one left edge for its title, the tool and the
            copy: the same centred column as the header and hero, with no
            sidebar. (The sidebar's "On this page" box is hidden on every
            article anyway; here its empty 256px pushed the copy out of line
            with the calculator above it on a desktop.) */}
        <div className={`${isTool ? "max-w-4xl" : "max-w-7xl"} mx-auto px-6 py-16 lg:py-20`}>
          <div className="flex flex-col lg:flex-row gap-12">
            <aside className={`hidden ${isTool ? "" : "lg:block"} lg:w-64 flex-shrink-0`}>
              <div className="hidden sticky top-8 bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  On this page
                </h3>

                <nav className="space-y-3">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.title
                        .toLowerCase()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/\s+/g, "-")}`}
                      className="block rounded-lg bg-white px-3 py-2 text-sm font-semibold !text-gray-900 opacity-100 border border-gray-200 hover:!text-blue-700 hover:bg-gray-100 transition"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <article className="flex-1 max-w-2xl">{children}</article>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-gray-200">
        <div className={`${isTool ? "max-w-4xl" : "max-w-7xl"} mx-auto px-6 py-12 lg:py-16`}>
          <div className="max-w-4xl">
            <div className="bg-gray-50 rounded-lg p-8 lg:p-10">
              <div className="flex gap-6 mb-6">
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-white border border-gray-200">
                  <img
                    src="/parent/icon/parent-icon-256.png"
                    alt="Football Parent"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Written by
                  </p>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    <Link
                      href="/author/graham-jenner"
                      className="hover:text-gray-700"
                    >
                      Graham Jenner
                    </Link>
                  </h3>

                  <p className="text-gray-600">
                    Graham is the founder of Football Parent. As a football
                    parent and grassroots coach, he provides independent
                    guidance on academies, development centres, trials and youth
                    football pathways in the UK.
                  </p>
                </div>
              </div>

              <InstagramFollow />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
