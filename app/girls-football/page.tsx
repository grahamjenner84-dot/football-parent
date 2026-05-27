import CategoryPage from "../components/category-page";

export default function GirlsFootballPage() {
  return (
    <CategoryPage
      eyebrow="Girls football"
      title="Girls Football"
      description="Support and guidance for parents navigating girls football pathways, academies, trials and long-term development."
      articles={[
        {
          title: "How Girls Football Academies Work",
          href: "/girls-football/how-girls-football-academies-work",
          description:
            "Understand how girls academies are structured and how pathways work.",
        },
        {
          title: "Girls Football Trials",
          href: "/girls-football/girls-football-trials",
          description:
            "Learn what to expect from girls football academy trials.",
        },
        {
          title: "Girls Academy vs Grassroots Football",
          href: "/girls-football/girls-academy-vs-grassroots-football",
          description:
            "Compare academy and grassroots environments for girls football.",
        },
        {
          title: "Late Developers in Girls Football",
          href: "/girls-football/late-developers-in-girls-football",
          description:
            "Why development timelines vary and why patience matters.",
        },
        {
          title: "What Age Do Girls Football Academies Recruit?",
          href: "/girls-football/what-age-do-girls-football-academies-recruit",
          description:
            "A guide to recruitment ages and development stages.",
        },
      ]}
    />
  );
}