import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Biggest Football Parent Mistakes | Football Parent",
  description:
    "Learn the most common football parent mistakes and how to better support young players in healthy long-term development.",
  path: "/parent-guides/biggest-football-parent-mistakes",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "biggest-football-parent-mistakes"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/biggest-football-parent-mistakes"
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