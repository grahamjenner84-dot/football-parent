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
      title="Academy Trials"
      description="Guidance for football parents on academy trials, scouting and preparing young players for trial environments."
      intro={[
  "Football academy trials are one of the most misunderstood parts of youth football development. Most players will attend at least one trial during their development years, whether that is an open trial at a local club, an invitation to an EPPP academy session, or a development centre assessment. Having been through the process with my own child at Crystal Palace, I know how little honest information there is for parents going in for the first time. The guides below cover what scouts look for, how clubs recruit, and what really happens on the day.",
]}
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