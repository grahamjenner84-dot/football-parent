import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Age Do Football Academies Recruit? | Football Parent",
  description:
    "When do football clubs recruit into academies? Find out which ages clubs target, how recruitment differs by phase, and when it's not too late to join an academy.",
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
      datePublished={article.frontmatter.date}
      path="/academy-pathway/what-age-do-football-academies-recruit"
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