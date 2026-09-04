import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How Football Clubs Recruit Young Players | Football Parent",
  description:
    "How do professional football clubs actually find and recruit young players? How scouting, development centres, referrals and trials fit together, and what parents should realistically expect.",
  path: "/academy-trials/how-football-clubs-recruit-young-players",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "how-football-clubs-recruit-young-players"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-trials/how-football-clubs-recruit-young-players"
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