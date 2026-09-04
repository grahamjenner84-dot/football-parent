import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Fulham FC Development Centre Guide | Football Parent",
  description:
    "Fulham runs boys' and girls' Player Development Centres for ages 7-16, separate from the Category One academy. How the Pathway and trials actually work.",
  path: "/academy-pathway/fulham-fc-development-centre-guide",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "fulham-fc-development-centre-guide"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/academy-pathway/fulham-fc-development-centre-guide"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
