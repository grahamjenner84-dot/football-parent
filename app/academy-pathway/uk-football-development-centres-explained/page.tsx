import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "UK Football Development Centres Explained | Football Parent",
  description:
    "A clear guide to how football development centres work in the UK, including age groups, training, fixtures and what parents should expect.",
  path: "/academy-pathway/uk-football-development-centres-explained",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "uk-football-development-centres-explained"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
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