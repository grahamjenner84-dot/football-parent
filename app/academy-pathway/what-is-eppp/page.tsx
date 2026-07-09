import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = generateSEO({
  title: "What Is EPPP in Football? | Football Parent",
  description:
    "EPPP stands for Elite Player Performance Plan. Here is what it means in academy football, including categories, coaching hours, player movement and what parents need to know.",
  path: "/academy-pathway/what-is-eppp",
});

export default async function Page() {
  const article = getArticleBySlug("academy-pathway", "what-is-eppp");

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/what-is-eppp"
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