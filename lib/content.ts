import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface ArticleFrontmatter {
  title: string;
  description: string;
  date: string;
  category: string;
  categoryUrl: string;
  readTime: number;
  sections: { id: string; title: string }[];
}

export interface Article {
  frontmatter: ArticleFrontmatter;
  content: string;
  slug: string;
}

const contentDirectory = path.join(process.cwd(), "content");

export function getArticleBySlug(category: string, slug: string): Article {
  const filePath = path.join(contentDirectory, category, `${slug}.mdx`);
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    frontmatter: data as ArticleFrontmatter,
    content,
    slug,
  };
}

export function getArticlesInCategory(category: string): string[] {
  const categoryPath = path.join(contentDirectory, category);
  if (!fs.existsSync(categoryPath)) return [];
  return fs.readdirSync(categoryPath)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(".mdx", ""));
}

export function getAllArticles(): Article[] {
  const categories = fs.readdirSync(contentDirectory);
  const articles: Article[] = [];

  for (const category of categories) {
    const categoryPath = path.join(contentDirectory, category);
    const stats = fs.statSync(categoryPath);
    if (!stats.isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".mdx"));
    for (const file of files) {
      const slug = file.replace(".mdx", "");
      try {
        articles.push(getArticleBySlug(category, slug));
      } catch (e) {
        console.error(`Error loading article: ${category}/${slug}`);
      }
    }
  }

  return articles;
}
