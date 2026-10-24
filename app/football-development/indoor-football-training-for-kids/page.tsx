import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Indoor Football Training for Kids: Drills, Games and Kit for Home | Football Parent",
  description: "Indoor football training for kids in a hallway or living room: two-touch passing, nutmeg games, keepy uppies, and a soft ball that won't break anything.",
  path: "/football-development/indoor-football-training-for-kids",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "indoor-football-training-for-kids"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-development/indoor-football-training-for-kids"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
