import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Scholarships in the UK | Football Parent",
  description:
    "Football scholarships in the UK: the difference between academy scholarships, college programmes and education pathways for young footballers aged 16 to 18.",
  path: "/academy-pathway/football-scholarships-uk",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "football-scholarships-uk"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/football-scholarships-uk"
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
