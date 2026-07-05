import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Is Grassroots Football? A Parent's Guide to the UK Game | Football Parent",
  description: "What grassroots football actually means, what ages it covers, who runs it and how it differs from academy football. A clear guide for UK parents.",
  path: "/parent-guides/what-is-grassroots-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "what-is-grassroots-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/parent-guides/what-is-grassroots-football"
      datePublished={article.frontmatter.date}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
