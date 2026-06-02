import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Girls RTCs Explained | Football Parent",
  description:
    "Understand the differences between Regional Talent Clubs (RTCs) in UK girls football development.",
  path: "/girls-football/girls-rtcs-explained",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "girls-rtcs-explained"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/girls-football/girls-rtcs-explained"
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