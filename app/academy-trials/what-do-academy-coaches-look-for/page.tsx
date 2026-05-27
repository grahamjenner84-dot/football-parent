import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "What Do Academy Coaches Look For? | Football Parent",
  description:
    "Understand the technical, physical and psychological qualities academy coaches look for in young footballers.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/academy-trials/what-do-academy-coaches-look-for",
  },
  openGraph: {
    title: "What Do Academy Coaches Look For? | Football Parent",
    description:
      "Understand the technical, physical and psychological qualities academy coaches look for in young footballers.",
    url: "https://www.footballparent.co.uk/academy-trials/what-do-academy-coaches-look-for",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Do Academy Coaches Look For? | Football Parent",
    description:
      "Understand the technical, physical and psychological qualities academy coaches look for in young footballers.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "what-do-academy-coaches-look-for"
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