import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Child Lost Confidence in Football? What Parents Can Do",
  description:
    "Three or four bad matches in a row is different from one bad match. The warning signs of a genuine confidence dip, what not to do, and when to talk to the coach.",
  path: "/parent-guides/child-lost-confidence-in-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "child-lost-confidence-in-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/child-lost-confidence-in-football"
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