import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How Football Scouts Identify Players | Football Parent",
  description:
    "Learn what football scouts actually look for in young players, from technical ability to decision making and attitude.",
  path: "/academy-trials/how-football-scouts-identify-players",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "how-football-scouts-identify-players"
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