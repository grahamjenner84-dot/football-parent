import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Academy Categories Explained | Football Parent",
  description:
    "Understand Category 1, 2, 3 and 4 football academies in England and what each academy category means for young players.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/academy-pathway/academy-categories-explained",
  },
  openGraph: {
    title: "Academy Categories Explained | Football Parent",
    description:
      "Understand Category 1, 2, 3 and 4 football academies in England and what each academy category means for young players.",
    url: "https://www.footballparent.co.uk/academy-pathway/academy-categories-explained",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Academy Categories Explained | Football Parent",
    description:
      "Understand Category 1, 2, 3 and 4 football academies in England and what each academy category means for young players.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "academy-categories-explained"
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