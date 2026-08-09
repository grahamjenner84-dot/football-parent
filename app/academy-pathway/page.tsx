import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Academy Pathway | Football Parent",
  description:
    "The UK academy pathway runs through EPPP's Category 1-4 system, from development centres and scouting to scholarships and release. What each stage actually involves.",
  path: "/academy-pathway",
  type: "website",
});

export default function AcademyPathwayPage() {
  return (
    <CategoryPage
      eyebrow="Academy pathway"
      title="Academy Pathway"
      description="The UK academy pathway runs through EPPP's Category 1-4 system, from development centres and scouting to scholarships and release. What each stage actually involves."
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
            "Academy football runs through three EPPP phases, Foundation, Youth Development and Professional Development, each with different stakes and training hours.",
        },
        {
          title: "Category 1, 2, 3 & 4 Football Academies",
          href: "/academy-pathway/academy-categories-explained",
          description:
            "What's the difference between a Category 1 and Category 4 academy? What each level means for training hours, travel, facilities and your child's development.",
        },
        {
          title: "Development Centres vs Academies",
          href: "/academy-pathway/development-centres-vs-academies",
          description:
            "What's the difference between a football development centre and a professional academy, and what each means for a family navigating the youth football pathway.",
        },
        {
          title: "How to join a Football Academy",
          href: "/academy-pathway/how-to-join-a-football-academy",
          description:
            "Learn how to join a football academy, how to get into academy football, how clubs recruit young players and what parents can realistically do to improve their child's chances.",
        },
        {
          title: "What Age Do Football Academies Recruit?",
          href: "/academy-pathway/what-age-do-football-academies-recruit",
          description:
            "When do football clubs recruit into academies? Find out which ages clubs target, how recruitment differs by phase, and when it's not too late to join an academy.",
        },
        {
          title: "What Is EPPP? Elite Player Performance Plan",
          href: "/academy-pathway/what-is-eppp",
          description:
            "EPPP stands for Elite Player Performance Plan. What it means for your child's academy journey: categories, coaching hours, catchment rules and player movement.",
        },
        {
          title: "Understanding Academy Release",
          href: "/academy-pathway/understanding-academy-release",
          description:
            "Being released from a football academy: what happens at a release meeting, emotional support and the next steps.",
        },
        {
          title: "UK Football Development Centres Explained",
          href: "/academy-pathway/uk-football-development-centres-explained",
          description:
            "Development centres run from age five, use inconsistent names like PDC, PTC and RTC, and most players never reach a club's academy.",
        },
        {
          title: "PDC vs PTC vs RTC Explained",
          href: "/academy-pathway/pdc-vs-ptc-vs-rtc-explained",
          description:
            "What PDC, PTC, RTC and ETC actually mean, and don't mean, for parents navigating youth football pathways where clubs use the terms inconsistently.",
        },
        {
          title: "How Players Progress Through Football Development Centres",
          href: "/academy-pathway/how-players-progress-through-football-development-centres",
          description:
            "How players actually move through development centre pathways, and why progress is rarely as straightforward as families expect.",
        },
        {
          title: "How Chelsea FC's Development Centre Works",
          href: "/academy-pathway/chelsea-fc-development-centre-guide",
          description:
            "Chelsea's development centre isn't the Academy - PTC, PDC and PPC are separate tiers run via Soccer Schools. How each level works, and what to ask before joining.",
        },
        {
          title: "Premier League Development Centres",
          href: "/academy-pathway/premier-league-development-centres-list",
          description:
            "Which Premier League clubs run development centres, and what do they actually involve? How club pathways differ, and what families should understand before pursuing an opportunity.",
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
            "Arsenal's academy is Category 1 and based at Hale End, but there's no public development centre to apply to. How the pathway works, and what to do if scouted.",
        },
        {
          title: "Football Development Centres in London",
          href: "/academy-pathway/football-development-centres-in-london",
          description:
            "London has more youth football development pathways than anywhere else in England - the options for both boys and girls across the capital.",
        },
        {
          title: "How to Find a Football Agent for Your Child",
          href: "/academy-pathway/how-to-find-a-football-agent-for-your-child",
          description:
            "FA rules block agents from representing players under 18 outside a first professional contract. When they genuinely become relevant, and warning signs to watch for.",
        },
        {
          title: "How football scholarships work in the UK",
          href: "/academy-pathway/football-scholarships-uk",
          description:
            "Football scholarships in the UK: the difference between academy scholarships, college programmes and education pathways for young footballers aged 16 to 18.",
        },
        {
          title: "How Crystal Palace's Development Centre Works",
          href: "/academy-pathway/crystal-palace-development-centre-guide",
          description:
            "Crystal Palace's pathway has three tiers before the Academy: open, invite-only, then the Talent Centre. How it works for south London and Kent families.",
        },
        {
          title: "Can Academy Players Play Grassroots Football?",
          href: "/academy-pathway/can-academy-players-play-grassroots-football",
          description:
            "Academy players can play grassroots football in the Foundation Phase (U9-U11) with club approval, but it's banned from U12 under the Youth Development Rules.",
        },
        {
          title: "What Is Pre-Academy Football?",
          href: "/academy-pathway/pre-academy-football",
          description:
            "What is pre-academy football, what ages does it cover, and is it worth it? How pre-academies and trials relate to the wider academy pathway.",
        },
        {
          title: "How Much Does Academy Football Cost?",
          href: "/academy-pathway/how-much-does-academy-football-cost",
          description:
            "Are football academies free? Learn how much football academy really costs, what parents pay for, and the hidden expenses most families don't expect.",
        },
        {
          title: "West Ham Player Pathway Guide",
          href: "/academy-pathway/west-ham-player-pathway-guide",
          description:
            "West Ham's academy and the Foundation's Player Pathway aren't the same thing. How each route actually works, and which one most east London families join.",
        },
        {
          title: "Fulham FC Development Centre Guide",
          href: "/academy-pathway/fulham-fc-development-centre-guide",
          description:
            "Fulham runs boys' and girls' Player Development Centres for ages 7-16, separate from the Category One academy. How the Pathway and trials actually work.",
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