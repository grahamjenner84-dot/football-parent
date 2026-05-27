import CategoryPage from "../components/category-page";

export default function AcademyPathwayPage() {
  return (
    <CategoryPage
      eyebrow="Academy pathway"
      title="Academy Pathway"
      description="Clear guidance for parents trying to understand how academy football works in the UK, including recruitment, categories, development centres and release."
      articles={[
        {
          title: "How Academy Football Works",
          href: "/academy-pathway/how-academy-football-works",
          description:
            "A simple explanation of how academy football is structured and what parents need to know.",
        },
        {
          title: "Academy Categories Explained",
          href: "/academy-pathway/academy-categories-explained",
          description:
            "Understand the difference between Category 1, 2, 3 and 4 academies.",
        },
        {
          title: "Development Centres vs Academies",
          href: "/academy-pathway/development-centres-vs-academies",
          description:
            "Learn how development centres differ from full academy environments.",
        },
        {
          title: "What Age Do Football Academies Recruit?",
          href: "/academy-pathway/what-age-do-football-academies-recruit",
          description:
            "A parent-friendly guide to when academy recruitment usually starts.",
        },
        {
          title: "What Is EPPP?",
          href: "/academy-pathway/what-is-eppp",
          description:
            "Understand the Elite Player Performance Plan and why it matters.",
        },
        {
          title: "Understanding Academy Release",
          href: "/academy-pathway/understanding-academy-release",
          description:
            "Practical support for parents dealing with academy release decisions.",
        },
      ]}
    />
  );
}