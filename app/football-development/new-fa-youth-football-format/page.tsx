import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "New FA Youth Football Format | Football Parent",
  description:
    "The FA's FutureFit reforms start in 2026/27 and change match sizes at nearly every age group between Under-7 and Under-14. What's actually changing, and why.",
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
      content={article.content}
    
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}