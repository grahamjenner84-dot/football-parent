import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Why Isn't My Child Improving at Football? | Football Parent",
  description: "If your child's football progress has stalled, you're not alone. Why development plateaus happen, what's normal, and a plan for the next few months.",
  path: "/football-development/why-isnt-my-child-improving-at-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "why-isnt-my-child-improving-at-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
      path="/football-development/why-isnt-my-child-improving-at-football"
      datePublished={article.frontmatter.date}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
