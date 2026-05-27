import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Is Private Football Coaching Worth It? | Football Parent",
  description:
    "An honest guide to private football coaching for children, including benefits, drawbacks and when it may be worth considering.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-development/is-private-football-coaching-worth-it",
  },
  openGraph: {
    title: "Is Private Football Coaching Worth It? | Football Parent",
    description:
      "An honest guide to private football coaching for children, including benefits, drawbacks and when it may be worth considering.",
    url: "https://www.footballparent.co.uk/football-development/is-private-football-coaching-worth-it",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Is Private Football Coaching Worth It? | Football Parent",
    description:
      "An honest guide to private football coaching for children, including benefits, drawbacks and when it may be worth considering.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "is-private-football-coaching-worth-it"
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