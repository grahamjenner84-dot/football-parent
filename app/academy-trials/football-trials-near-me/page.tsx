import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Trials Near Me | Football Parent",
  description:
    "How legitimate academy trials work in the UK, the scams to avoid, and why grassroots football remains the most realistic pathway for most children.",
  path: "/academy-trials/football-trials-near-me",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "football-trials-near-me"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-trials/football-trials-near-me"
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