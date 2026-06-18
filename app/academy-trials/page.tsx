import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Academy Trials, Scouting & Recruitment | Football Parent",
  description:
    "Everything football parents need to know about academy trials, scouting and recruitment. What coaches look for, how to prepare, and what really happens on the day.",
  path: "/academy-trials",
  type: "website",
});

export default function AcademyTrialsPage() {
  return (
    <CategoryPage
      eyebrow="Academy trials"
      title="Football Academy Trials"
      description="Guidance for football parents on academy trials, scouting and preparing young players for trial environments."
      intro={[
        "Football academy trials are one of the most misunderstood parts of youth football development. Parents often use the phrase to describe several different situations: an open trial at a local club, an invitation to train with an academy group, a development centre assessment, or a scout-led observation period.",
        "The route into academy football is rarely as simple as applying for a trial. Many young players are identified through grassroots football, development centres, referrals and long-term observation. Having been through professional club development-centre environments with my own child, including Crystal Palace, I know how little honest information there can be for parents going in for the first time.",
        "The guides below cover how football academy trials work, how scouts identify players, how clubs recruit young talent, what coaches look for and what parents should realistically expect.",
      ]}
      startHere={{
        title: "Start Here",
        description:
          "New to academy trials? These guides explain the main parts of the process.",
        links: [
          {
            title: "Football Academy Trials in the UK",
            href: "/academy-trials/football-academy-trials-uk",
            description:
              "explains how trials, scouting and recruitment usually work.",
          },
          {
            title: "Football Trials Near Me",
            href: "/academy-trials/football-trials-near-me",
            description:
              "covers how to find genuine opportunities and avoid unrealistic promises.",
          },
          {
            title: "How to Get Scouted for Football",
            href: "/academy-trials/how-to-get-scouted-for-football",
            description:
              "looks at how young players get noticed by clubs and scouts.",
          },
          {
            title: "What Happens at Academy Trials",
            href: "/academy-trials/what-happens-at-academy-trials",
            description:
              "is useful if your child already has a trial or assessment coming up.",
          },
        ],
      }}
      articlesHeading="All Academy Trial Guides"
      articles={[
        {
          title: "Football Academy Trials in the UK",
          href: "/academy-trials/football-academy-trials-uk",
          description:
            "A comprehensive guide to football academy trials in the UK.",
        },
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
          title: "How to Get Scouted for Football",
          href: "/academy-trials/how-to-get-scouted-for-football",
          description:
            "Learn how to increase your chances of getting scouted for football, from technical ability to decision making and attitude.",
        },
        {
          title: "What Do Academy Coaches Look For?",
          href: "/academy-trials/what-do-academy-coaches-look-for",
          description:
            "Learn the technical, physical and psychological traits coaches value.",
        },
        {
          title: "How Football Clubs Recruit Young Players",
          href: "/academy-trials/how-football-clubs-recruit-young-players",
          description:
            "Learn how football clubs identify and recruit young talent, and what parents should know about the recruitment process.",
        },
      ]}
    />
  );
}