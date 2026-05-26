import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "When Should Your Child Leave Grassroots For Academy Football? | Football Parent",
  description:
    "When is the right time for grassroots players to move to academy football? Honest advice about the academy transition.",
};

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "leave-grassroots-football-for-an-academy"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      relatedArticles={article.frontmatter.relatedArticles}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
