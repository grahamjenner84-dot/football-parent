import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How Football Scouts Identify Players | Football Parent",
  description:
    "Scouts spend more time watching play away from the ball than goals or assists: scanning, reactions to mistakes, work rate. What gets noticed, age by age.",
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
      datePublished={article.frontmatter.date}
      path="/academy-trials/how-football-scouts-identify-players"
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