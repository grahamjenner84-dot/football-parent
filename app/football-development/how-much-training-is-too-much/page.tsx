import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How Much Football Training Is Too Much? | Football Parent",
  description:
    "Understand how much football training may be too much for young players and how parents can balance development, recovery and enjoyment.",
  path: "/football-development/how-much-training-is-too-much",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "how-much-training-is-too-much"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-development/how-much-training-is-too-much"
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