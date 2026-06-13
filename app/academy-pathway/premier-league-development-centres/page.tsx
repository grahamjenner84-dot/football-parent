import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Development Centres in England: Find Clubs Near You | Football Parent",
  description:
    "A regional guide to football development centres run by professional clubs and their foundations across England, covering Premier League, Championship, League One and League Two clubs.",
  path: "/academy-pathway/premier-league-development-centres",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "premier-league-development-centres"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/premier-league-development-centres"
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