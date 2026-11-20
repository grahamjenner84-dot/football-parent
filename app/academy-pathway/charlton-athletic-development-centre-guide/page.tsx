import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Charlton Academy Trials and Development Centres | Football Parent",
  description: "Charlton's Category 2 academy at Sparrows Lane recruits by scouting. How the Trust's £8.50 Development Centres, invite-only Advanced Centre and girls' trials work.",
  path: "/academy-pathway/charlton-athletic-development-centre-guide",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "charlton-athletic-development-centre-guide"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/academy-pathway/charlton-athletic-development-centre-guide"
      datePublished={article.frontmatter.date}
      design={article.frontmatter.design}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} design={article.frontmatter.design} />
    </ArticleLayout>
  );
}
