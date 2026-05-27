import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Age Do Girls Football Academies Recruit? | Football Parent",
  description:
    "Find out what age girls football academies usually recruit players and what parents should realistically expect.",
  path: "/girls-football/what-age-do-girls-football-academies-recruit",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "what-age-do-girls-football-academies-recruit"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
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