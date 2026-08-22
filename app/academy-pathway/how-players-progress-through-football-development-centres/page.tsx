import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Development Centre Progression | Football Parent",
  description:
    "How players actually move through development centre pathways, and why progress is rarely as straightforward as families expect.",
  path: "/academy-pathway/how-players-progress-through-football-development-centres",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "how-players-progress-through-football-development-centres"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/how-players-progress-through-football-development-centres"
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