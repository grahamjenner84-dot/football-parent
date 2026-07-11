import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Is Football IQ? A Parent's Guide to Football Intelligence | Football Parent",
  description: "What football IQ actually means, why coaches value it so highly, and how scanning, decision making and match experience help children develop it.",
  path: "/football-development/what-is-football-iq",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "what-is-football-iq"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-development/what-is-football-iq"
      datePublished={article.frontmatter.date}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
