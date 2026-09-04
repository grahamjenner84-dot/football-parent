import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How to Become a Grassroots Football Coach | Football Parent",
  description: "How to become a grassroots football coach: joining as a volunteer, DBS checks, safeguarding, first aid, time commitment and coaching your own child.",
  path: "/parent-guides/how-to-become-a-football-coach",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "how-to-become-a-football-coach"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
      path="/parent-guides/how-to-become-a-football-coach"
      datePublished={article.frontmatter.date}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
