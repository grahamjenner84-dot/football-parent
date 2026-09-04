import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How Much Does Academy Football Cost? | Football Parent",
  description:
    "Are football academies free? Learn how much football academy really costs, what parents pay for, and the hidden expenses most families don't expect.",
  path: "/academy-pathway/how-much-does-academy-football-cost",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "how-much-does-academy-football-cost"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/how-much-does-academy-football-cost"
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
