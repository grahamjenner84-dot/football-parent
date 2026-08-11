import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Leeds United Development Centre Guide | Football Parent",
  description:
    "Leeds United's academy became Category One in 2020, above a Skills Centre to Technical Centre pathway. Real ages, costs and how trials actually work.",
  path: "/academy-pathway/leeds-united-development-centre-guide",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "leeds-united-development-centre-guide"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/academy-pathway/leeds-united-development-centre-guide"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
