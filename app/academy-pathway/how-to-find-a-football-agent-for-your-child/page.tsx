import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How to Find a Football Agent for Your Child | Football Parent",
  description:
    "A guide for parents on how to find a qualified football agent to represent their child's interests.",
  path: "/academy-pathway/how-to-find-a-football-agent-for-your-child",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "how-to-find-a-football-agent-for-your-child"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/how-to-find-a-football-agent-for-your-child"
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
