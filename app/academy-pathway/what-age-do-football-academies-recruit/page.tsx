import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Age Do Football Academies Recruit? | Football Parent",
  description:
    "Find out what age football academies usually recruit players in the UK and what parents should realistically expect.",
  path: "/academy-pathway/what-age-do-football-academies-recruit",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "what-age-do-football-academies-recruit"
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