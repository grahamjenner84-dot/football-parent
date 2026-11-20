import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Stocking Fillers for Kids: Under £5, £10 and £15 (2026) | Football Parent",
  description: "Football stocking fillers for kids under £5, £10 and £15: a pump with needles, Match Attax 2026/27 packs, the 2027 annuals, and team Secret Santa ideas.",
  path: "/football-gear/football-stocking-fillers",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "football-stocking-fillers"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/football-stocking-fillers"
      datePublished={article.frontmatter.date}
      design={article.frontmatter.design}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} design={article.frontmatter.design} />
    </ArticleLayout>
  );
}
