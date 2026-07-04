import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Academy Pathway | Football Parent",
  description:
    "Learn how football academy pathways work in the UK, including academy recruitment, development centres, academy trials, scholarships, scouting and player development.",
  path: "/academy-pathway",
  type: "website",
});

export default function AcademyPathwayPage() {
  return (
    <CategoryPage
      eyebrow="Academy pathway"
      title="Academy Pathway"
      description="Clear guidance for parents trying to understand football academy pathways in the UK, including academy recruitment, development centres, academy trials, scholarships, scouting and player development."
      intro={[
        "The football academy system in the UK is structured around the Elite Player Performance Plan, which divides clubs into Category 1 to 4 academies with different levels of resource, coaching, and player commitment. Alongside full academies, most professional clubs also run development centres that are open to a wider range of players. Understanding where your child fits in this pathway, and what each stage actually involves, is what these guides are designed to help with. Written from first-hand experience of Crystal Palace and Chelsea's development programmes in south London.",
      ]}
      startHere={{
        title: "Start Here",
        description:
          "New to academy football? These guides explain the main parts of the pathway.",
        links: [
          {
            title: "How Academy Football Works",
            href: "/academy-pathway/how-academy-football-works",
            description:
              "explains how academy football is structured and what parents need to know.",
          },
          {
            title: "How to Join a Football Academy",
            href: "/academy-pathway/how-to-join-a-football-academy",
            description:
              "covers the realistic routes into academy football, including scouting and recruitment.",
          },
          {
            title: "UK Football Development Centres Explained",
            href: "/academy-pathway/uk-football-development-centres-explained",
            description:
              "explains how development centres work and where they sit in the pathway.",
          },
          {
            title: "Football Scholarships UK",
            href: "/academy-pathway/football-scholarships-uk",
            description:
              "looks at football scholarships, education routes and post-16 options.",
          },
        ],
      }}
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
          title: "How to join a Football Academy",
          href: "/academy-pathway/how-to-join-a-football-academy",
          description:
            "A guide to the process of joining a football academy in the UK.",
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
        {
          title: "UK Football Development Centres Explained",
          href: "/academy-pathway/uk-football-development-centres-explained",
          description:
            "Understand how football development centres work in the UK.",
        },
        {
          title: "PDC vs PTC vs RTC Explained",
          href: "/academy-pathway/pdc-vs-ptc-vs-rtc-explained",
          description:
            "Understand the differences between PDC, PTC, and RTC in UK football development.",
        },
        {
          title: "How Players Progress Through Football Development Centres",
          href: "/academy-pathway/how-players-progress-through-football-development-centres",
          description:
            "Understand how young players advance through different stages of football development centres and academies.",
        },
        {
          title: "How Chelsea FC's Development Centre Works",
          href: "/academy-pathway/chelsea-fc-development-centre-guide",
          description:
            "Understand Chelsea FC's development centre and how it supports young footballers.",
        },
        {
          title: "Premier League Development Centres: A Parent's Guide",
          href: "/academy-pathway/premier-league-development-centres-list",
          description:
            "How Premier League clubs structure their development programmes, what they involve, and what to consider before pursuing an opportunity.",
        },
        {
          title:
            "Football Development Centres Near Me | Find Professional Club Programmes Across England",
          href: "/academy-pathway/football-development-centres-near-me",
          description:
            "Looking for a football development centre near you? Browse verified development centres run by Premier League and EFL clubs across England, organised by region with links to official programmes.",
        },
        {
          title: "How Arsenal FC's Development Centre Works",
          href: "/academy-pathway/arsenal-development-centre-guide",
          description:
            "Understand Arsenal FC's development centre and how it supports young footballers.",
        },
        {
          title: "Football Development Centres in London",
          href: "/academy-pathway/football-development-centres-in-london",
          description:
            "A guide to football development centres in London and how they support young players in their journey.",
        },
        {
          title: "How to Find a Football Agent for Your Child",
          href: "/academy-pathway/how-to-find-a-football-agent-for-your-child",
          description:
            "A guide for parents on how to find a qualified football agent to represent their child's interests.",
        },
        {
          title: "How football scholarships work in the UK",
          href: "/academy-pathway/football-scholarships-uk",
          description: "A guide to football scholarships in the UK.",
        },
        {
          title: "How Crystal Palace's Development Centre Works",
          href: "/academy-pathway/crystal-palace-development-centre-guide",
          description:
            "A guide to how Crystal Palace's development centre supports young footballers.",
        },
        {
          title: "Can Academy Players Play Grassroots Football?",
          href: "/academy-pathway/can-academy-players-play-grassroots-football",
          description:
            "Discover whether academy players can participate in grassroots football and how it benefits their development.",
        },
        {
          title: "How Much Does Academy Football Cost?",
          href: "/academy-pathway/how-much-does-academy-football-cost",
          description:
            "Learn about the costs associated with academy football and what parents need to know.",
        },
        {
          title: "West Ham Player Pathway Guide",
          href: "/academy-pathway/west-ham-player-pathway-guide",
          description:
            "A comprehensive guide to understanding the West Ham United player pathway and how young players can progress through the academy system.",
        },
      ]}
      bottomContent={{
        title: "About the Academy Pathway",
        content: [
          "The academy pathway is not one single route. For most young players, it sits somewhere between grassroots football, development centres, pre-academy groups, club trials, scouting and, for a much smaller number, full academy registration. That can make the system difficult for parents to judge from the outside, especially when different clubs use different names for their programmes.",
          "This section is designed to help parents understand how the wider football academy system fits together. It covers the main stages of the player pathway, including development centres, academy categories, recruitment ages, EPPP rules, scholarships, release decisions and the difference between training opportunities and genuine academy registration.",
          "The aim is not to suggest that every child should chase academy football. A good pathway should support the player's long-term development, confidence and enjoyment of the game. For some children, that may mean a professional club environment. For others, it may mean grassroots football, extra coaching, school football, futsal, private training or simply finding the right team at the right time.",
        ],
      }}
    />
  );
}