import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Sizes by Age: Best Footballs For Kids | Football Parent",
  description:
    "Find out what size football your child needs by age group, including UK guidance for mini soccer, youth football and older players.",
  path: "/football-gear/best-footballs-by-age",
});

export default async function Page() {
  const article = getArticleBySlug("football-gear", "best-footballs-by-age");

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-gear/best-footballs-by-age"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}