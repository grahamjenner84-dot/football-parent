import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Ball Mastery Drills for 7 and 8 Year Olds: A Parent's At-Home Guide | Football Parent",
  description:
    "Cone circuits, 1v1 games and passing routines for 7 and 8 year olds, plus how long a ball mastery session should actually last.",
  path: "/coaching/football-drills-for-7-and-8-year-olds",
});

export default async function Page() {
  const article = getArticleBySlug(
    "coaching",
    "football-drills-for-7-and-8-year-olds"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/coaching/football-drills-for-7-and-8-year-olds"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
