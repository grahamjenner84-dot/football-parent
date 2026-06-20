import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "New FA Youth Football Format | Football Parent",
  description:
    "An overview of the new FA youth football format and its impact on young players.",
  path: "/football-development/new-fa-youth-football-format",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "new-fa-youth-football-format"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-development/new-fa-youth-football-format"
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