import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Academy Life: Paul Barry on Categories, Development Centres and Release | Football Parent",
  description:
    "Football DNA's Paul Barry on academy categories, juggling grassroots and academy football, development centres as a route in, and supporting a child through release.",
  path: "/academy-pathway/academy-life-paul-barry-interview",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "academy-life-paul-barry-interview"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/academy-pathway/academy-life-paul-barry-interview"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
