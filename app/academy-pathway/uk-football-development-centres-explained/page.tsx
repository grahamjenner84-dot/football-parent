import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Development Centres explained | Football Parent",
  description:
    "Development centres run from age five, use inconsistent names like PDC, PTC and RTC, and most players never reach a club's academy.",
  path: "/academy-pathway/uk-football-development-centres-explained",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "uk-football-development-centres-explained"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/premier-league-development-centres-explained"
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