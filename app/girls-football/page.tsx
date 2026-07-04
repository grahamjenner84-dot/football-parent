import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Girls Football | Football Parent",
  description:
    "Guidance for parents navigating girls football, academy pathways, trials and long-term player development in the UK.",
  path: "/girls-football",
  type: "website",
});

export default function GirlsFootballPage() {
  return (
    <CategoryPage
      eyebrow="Girls football"
      title="Girls Football"
      description="Support and guidance for parents navigating girls football pathways, academies, trials and long-term development."
      intro={[
        "Girls football in the UK has changed significantly in recent years, but the pathway from grassroots to academy level remains poorly understood by most parents. Whether your daughter is playing for a local club and wondering about the next step, or you have heard about Emerging Talent Centres and Regional Talent Clubs and want to know what they actually involve, these guides explain how the girls football development system works and what to realistically expect at each stage.",
      ]}
      startHere={{
        title: "Start Here",
        description:
          "New to the girls football pathway? These guides explain academies, ETCs, RTCs and trials.",
        links: [
          {
            title: "How Girls Football Academies Work",
            href: "/girls-football/how-girls-football-academies-work",
            description:
              "explains the structure of girls academy football and the wider pathway.",
          },
          {
            title: "Emerging Talent Centres Explained",
            href: "/girls-football/emerging-talent-centres-explained",
            description:
              "covers how ETCs work and where they fit in the girls talent pathway.",
          },
          {
            title: "Girls RTCs Explained",
            href: "/girls-football/girls-rtcs-explained",
            description:
              "explains Regional Talent Clubs and how they differ from other pathway options.",
          },
          {
            title: "Girls Football Trials",
            href: "/girls-football/girls-football-trials",
            description:
              "looks at trials, assessments and how girls can access football opportunities.",
          },
        ],
      }}
      articles={[
        {
          title: "How Girls Football Academies Work",
          href: "/girls-football/how-girls-football-academies-work",
          description:
            "Understand how girls academies are structured and how pathways work.",
        },
        {
          title: "Emerging Talent Centres Explained",
          href: "/girls-football/emerging-talent-centres-explained",
          description:
            "Learn about emerging talent centres in girls' football and how they support player development.",
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
        {
          title: "Girls RTCs Explained",
          href: "/girls-football/girls-rtcs-explained",
          description:
            "A guide to Regional Talent Clubs (RTCs) and how they fit into the girls football development pathway.",
        },
      ]}
      bottomContent={{
        title: "About Girls Football",
        content: [
          "Girls football has more opportunities than ever, but the pathway can still feel unclear for parents. A young player might move between grassroots football, school football, Emerging Talent Centres, Regional Talent Clubs, academy-style programmes or open trials, depending on her age, ability, location and the structure of clubs nearby.",
          "The most important thing is understanding what each environment is actually designed to do. Some programmes focus on widening access and giving talented girls more coaching time. Others are more selective and closer to an academy pathway. Grassroots football can still be an excellent development environment, especially when a player is getting good coaching, meaningful match time and the chance to build confidence.",
          "The guides in this section help parents understand girls football academies, ETCs, RTCs, trials, recruitment ages, late development and the difference between academy and grassroots football. The aim is to give families a realistic view of the girls football pathway in the UK, so decisions are based on development, enjoyment and the individual child rather than pressure or hype.",
        ],
      }}
    />
  );
}