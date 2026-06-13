import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How to Join a Football Academy | Football Parent",
  description:
    "A clear guide to the process of joining a football academy in the UK, including eligibility, trials, and what to expect.",
  path: "/academy-pathway/how-to-join-a-football-academy",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "how-to-join-a-football-academy"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/how-to-join-a-football-academy"
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