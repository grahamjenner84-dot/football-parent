import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title:
    "Signs Your Child Is Ready for Academy Football | Football Parent",
  description:
    "Learn the key signs that a young footballer may be ready for academy football and what parents should realistically expect.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-development/signs-your-child-is-ready-for-academy-football",
  },
  openGraph: {
    title:
      "Signs Your Child Is Ready for Academy Football | Football Parent",
    description:
      "Learn the key signs that a young footballer may be ready for academy football and what parents should realistically expect.",
    url: "https://www.footballparent.co.uk/football-development/signs-your-child-is-ready-for-academy-football",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Signs Your Child Is Ready for Academy Football | Football Parent",
    description:
      "Learn the key signs that a young footballer may be ready for academy football and what parents should realistically expect.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "signs-your-child-is-ready-for-academy-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      relatedArticles={article.frontmatter.relatedArticles}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}