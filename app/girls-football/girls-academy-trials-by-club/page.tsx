import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Girls' Academy Trials 2026/27: Club by Club | Football Parent",
  description: "Most 2026/27 girls' academy trials ran April to July. How Arsenal, Chelsea, Man Utd, Leeds, Villa and 23 more clubs recruit girls, and what is still open.", // must be word-for-word identical to the mdx frontmatter description
  path: "/girls-football/girls-academy-trials-by-club",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "girls-academy-trials-by-club"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/girls-football/girls-academy-trials-by-club"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
