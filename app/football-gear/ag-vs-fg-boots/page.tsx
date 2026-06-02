import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "AG vs FG Football Boots Explained | Football Parent",
  description:
    "Understand the difference between AG and FG football boots, which surfaces they are designed for, and what parents should know before buying.",
  path: "/football-gear/ag-vs-fg-boots",
});

export default async function Page() {
  const article = getArticleBySlug("football-gear", "ag-vs-fg-boots");

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-gear/ag-vs-fg-boots"
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