import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Can Academy Players Play Grassroots Football? | Football Parent",
  description:
    "Academy players can play grassroots football in the Foundation Phase (U9-U11) with club approval, but it's banned from U12 under the Youth Development Rules.",
  path: "/academy-pathway/can-academy-players-play-grassroots-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "can-academy-players-play-grassroots-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/can-academy-players-play-grassroots-football"
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
