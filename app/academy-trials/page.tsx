import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Academy Trials | Football Parent",
  description:
    "Advice for parents navigating football academy trials, scouts, recruitment and what coaches look for in young players.",
  path: "/academy-trials",
  type: "website",
});

export default function AcademyTrialsPage() {
  return (
    <CategoryPage
      eyebrow="Academy trials"
      title="Academy Trials"
      description="Guidance for football parents on academy trials, scouting and preparing young players for trial environments."
      articles={[
        {
          title: "Football Trials Near Me",
          href: "/academy-trials/football-trials-near-me",
          description:
            "How to find legitimate football trials and avoid unrealistic promises.",
        },
        {
          title: "How Football Scouts Identify Players",
          href: "/academy-trials/how-football-scouts-identify-players",
          description:
            "Understand what scouts actually look for in young footballers.",
        },
        {
          title: "What Happens at Academy Trials",
          href: "/academy-trials/what-happens-at-academy-trials",
          description:
            "A parent-friendly guide to what players can expect at trials.",
        },
        {
          title: "What Do Academy Coaches Look For?",
          href: "/academy-trials/what-do-academy-coaches-look-for",
          description:
            "Learn the technical, physical and psychological traits coaches value.",
        },
      ]}
    />
  );
}