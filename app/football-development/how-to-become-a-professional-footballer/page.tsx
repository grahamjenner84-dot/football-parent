import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How to Become a Professional Footballer | Football Parent",
  description:
    "The real pathways into professional football - the academy route, non-league development, late developers, and why environment and education matter as much as talent.",
  path: "/football-development/how-to-become-a-professional-footballer",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "how-to-become-a-professional-footballer"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-development/how-to-become-a-professional-footballer"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
     
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}