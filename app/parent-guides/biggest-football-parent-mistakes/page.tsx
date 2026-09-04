import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Biggest Football Parent Mistakes | Football Parent",
  description:
    "Sideline coaching, comparing siblings and chasing academy status cause damage parents rarely notice. A grassroots coach's look at the mistakes he's seen.",
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
      content={article.content}
      
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}