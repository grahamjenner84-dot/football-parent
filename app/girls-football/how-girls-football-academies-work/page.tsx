import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How Girls Football Academies Work | Football Parent",
  description:
    "Girls academy football isn't a copy of the boys' EPPP system: entry comes later, and Emerging Talent Centres have no male equivalent. How the pathway works.",
  path: "/girls-football/how-girls-football-academies-work",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "how-girls-football-academies-work"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/girls-football/how-girls-football-academies-work"
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