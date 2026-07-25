import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Crystal Palace Development Centre Guide | Football Parent",
  description:
    "Crystal Palace's pathway has three tiers before the Academy: open, invite-only, then the Talent Centre. How it works for south London and Kent families.",
  path: "/academy-pathway/crystal-palace-development-centre-guide",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "crystal-palace-development-centre-guide"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/crystal-palace-development-centre-guide"
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
