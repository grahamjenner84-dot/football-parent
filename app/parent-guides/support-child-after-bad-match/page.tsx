import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "When Your Child Is Struggling in Football | Football Parent",
  description:
    "Practical advice for supporting young footballers emotionally after difficult matches, mistakes or disappointing performances.",
  path: "/parent-guides/support-child-after-bad-match",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "support-child-after-bad-match"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/support-child-after-bad-match"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}