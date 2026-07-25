import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Does the Junior Premier League Lead to Academy Football? | Football Parent",
  description:
    "Playing in the JPL doesn't create an automatic route into an academy - scouts select on ability, not league. What actually gets a child noticed.",
  path: "/parent-guides/jpl-and-academy-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "jpl-and-academy-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/jpl-and-academy-football"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
      
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}