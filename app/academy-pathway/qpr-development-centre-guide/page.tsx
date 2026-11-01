import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "QPR Academy Trials and Development Programmes: A Parent's Guide",
  description: "QPR's Category 2 academy is applying for Category 1. How it recruits, what the Trust's ADP and £80-a-month Showcase squad involve, and girls' trial dates.",
  path: "/academy-pathway/qpr-development-centre-guide",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "qpr-development-centre-guide"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/academy-pathway/qpr-development-centre-guide"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
