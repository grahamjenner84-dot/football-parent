import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Playing Up an Age Group in Football | Football Parent",
  description:
    "Practical ways parents can help young footballers adapt to playing up an age group, recover from mistakes and enjoy their development.",
  path: "/football-development/playing-up-an-age-group-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "playing-up-an-age-group-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-development/playing-up-an-age-group-football"
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