import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Late Developers in Girls Football | Football Parent",
  description:
    "Why late developers in girls football can still progress, and how parents can support confidence and long-term development.",
  path: "/girls-football/late-developers-in-girls-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "late-developers-in-girls-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/girls-football/late-developers-in-girls-football"
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