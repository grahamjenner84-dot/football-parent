import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Leave Grassroots Football for an Academy? | Football Parent",
  description:
    "Understand whether leaving grassroots football for an academy is the right move, including benefits, risks and what parents should consider.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/parent-guides/leave-grassroots-football-for-an-academy",
  },
  openGraph: {
    title: "Leave Grassroots Football for an Academy? | Football Parent",
    description:
      "Understand whether leaving grassroots football for an academy is the right move, including benefits, risks and what parents should consider.",
    url: "https://www.footballparent.co.uk/parent-guides/leave-grassroots-football-for-an-academy",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Leave Grassroots Football for an Academy? | Football Parent",
    description:
      "Understand whether leaving grassroots football for an academy is the right move, including benefits, risks and what parents should consider.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "leave-grassroots-football-for-an-academy"
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