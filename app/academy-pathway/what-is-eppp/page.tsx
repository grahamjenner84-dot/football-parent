import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Is EPPP? Elite Player Performance Plan | Football Parent",
  description:
    "EPPP stands for Elite Player Performance Plan. What it means for your child's academy journey: categories, coaching hours, catchment rules and player movement.",
  path: "/academy-pathway/what-is-eppp",
});

export default async function Page() {
  const article = getArticleBySlug("academy-pathway", "what-is-eppp");

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/what-is-eppp"
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