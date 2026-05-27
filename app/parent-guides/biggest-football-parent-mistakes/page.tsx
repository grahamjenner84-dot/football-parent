import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Biggest Football Parent Mistakes | Football Parent",
  description:
    "Common mistakes football parents make, from pressure after matches to unrealistic expectations, and how to support young players better.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/parent-guides/biggest-football-parent-mistakes",
  },
  openGraph: {
    title: "Biggest Football Parent Mistakes | Football Parent",
    description:
      "Common mistakes football parents make, from pressure after matches to unrealistic expectations, and how to support young players better.",
    url: "https://www.footballparent.co.uk/parent-guides/biggest-football-parent-mistakes",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Biggest Football Parent Mistakes | Football Parent",
    description:
      "Common mistakes football parents make, from pressure after matches to unrealistic expectations, and how to support young players better.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "biggest-football-parent-mistakes"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      relatedArticles={article.frontmatter.relatedArticles}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}