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
"Understand the differences between PDC, PTC, and RTC in UK football development  .",
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
  title: "Football Development Centres in England: Find Clubs Near You",
  href: "/academy-pathway/premier-league-development-centres",
  description:
    "A regional directory of development centre programmes run by professional clubs and their foundations across England.",
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
title: "How football scholarships work in the UK",
href: "/academy-pathway/football-scholarships-uk",
description:
"A guide to football scholarships in the UK.",
},
{
title: "How Crystal Palace's Development Centre Works",
href: "/academy-pathway/crystal-palace-development-centre-guide",
description:
"A guide to how Crystal Palace's development centre supports young footballers.",
},
]}
/>
);
}