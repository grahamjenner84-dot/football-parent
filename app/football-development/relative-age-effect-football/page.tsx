import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "The Relative Age Effect in Football | Football Parent",
  description:
    "Understanding how relative age can impact a young footballer's development and opportunities in the sport.",
  path: "/football-development/relative-age-effect-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "relative-age-effect-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-development/relative-age-effect-football"
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