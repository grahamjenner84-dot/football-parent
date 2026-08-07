import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Understanding Academy Release | Football Parent",
  description:
    "Being released from a football academy: what happens at a release meeting, emotional support and the next steps.",
  path: "/academy-pathway/understanding-academy-release",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "understanding-academy-release"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/understanding-academy-release"
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