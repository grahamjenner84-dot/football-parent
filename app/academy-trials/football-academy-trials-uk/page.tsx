import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Academy Trials in the UK | Football Parent",
  description:
    "A comprehensive guide to football academy trials in the UK, including how to find trials, what to expect and how to prepare your child for success.",
  path: "/academy-trials/football-academy-trials-uk",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "football-academy-trials-uk"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-trials/football-academy-trials-uk"
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