import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Development Centres Near Me | Find Professional Club Programmes Across England",
  description:
    "Looking for a football development centre near you? Browse verified development centres run by Premier League and EFL clubs across England, organised by region with links to official programmes.",
  path: "/academy-pathway/football-development-centres-near-me",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "football-development-centres-near-me"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/football-development-centres-near-me"
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