import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Drills for 9 and 10 Year Olds: Receiving, Turning and 1v1s",
  description:
    "Receiving, turning, 1v1 and rondo drills for 9 and 10 year olds stepping up to 7v7, plus how to fit them into a 60-minute session.",
  path: "/coaching/football-drills-for-9-and-10-year-olds",
});

export default async function Page() {
  const article = getArticleBySlug(
    "coaching",
    "football-drills-for-9-and-10-year-olds"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/coaching/football-drills-for-9-and-10-year-olds"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} coachAppBanner="coach" />
    </ArticleLayout>
  );
}
