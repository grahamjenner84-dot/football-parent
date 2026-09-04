import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Finding a Football Agent for Your Child | Football Parent",
  description:
    "FA rules block agents from representing players under 18 outside a first professional contract. When they genuinely become relevant, and warning signs to watch for.",
  path: "/academy-pathway/how-to-find-a-football-agent-for-your-child",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "how-to-find-a-football-agent-for-your-child"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/how-to-find-a-football-agent-for-your-child"
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
