import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Tottenham Development Centres Explained | Football Parent",
  description:
    "Tottenham's Academy Development Centres (boys, 10 and under) sit apart from its 15-21 Education Centres. Real ages, and Spurs' own trial scam warning.",
  path: "/academy-pathway/tottenham-development-centres-explained",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "tottenham-development-centres-explained"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/academy-pathway/tottenham-development-centres-explained"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
