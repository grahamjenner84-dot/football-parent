import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Equal Playing Time in Grassroots Football | Football Parent",
  description:
    "A working formula for fair playing time, the real difference between equal minutes and equal position time, and what rolling substitutions actually allow.",
  path: "/coaching/equal-playing-time-in-grassroots-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "coaching",
    "equal-playing-time-in-grassroots-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/coaching/equal-playing-time-in-grassroots-football"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
