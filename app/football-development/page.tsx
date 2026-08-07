import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Development for Young Players | Football Parent",
  description:
    "Football confidence, decision making, training load and late development: what actually predicts long-term progress in young players.",
  path: "/football-development",
  type: "website",
});

export default function FootballDevelopmentPage() {
  return (
    <CategoryPage
      eyebrow="Football development"
      title="Football Development"
      description="Football confidence, decision making, training load and late development: what actually predicts long-term progress in young players."
      intro={[
        "Football development is a long game. The players who make progress are rarely just the ones who trained hardest at age nine. They are usually the ones who stayed engaged, kept improving year on year, and had parents who understood what good development actually looks like at each stage.",
        "These guides cover the parts of player development that parents often worry about most: football confidence, decision making, football IQ, training load, relative age, late developers and knowing when a child may be ready for a more demanding environment. As a parent with first-hand experience of development centre environments in south London, I have written these guides to give you a realistic picture of what to expect and how to help.",
      ]}
      startHere={{
        title: "Start Here",
        description:
          "These guides cover the main development questions football parents usually face.",
        links: [
          {
            title: "Build Confidence in Young Footballers",
            href: "/football-development/build-confidence-young-footballers",
            description:
              "explains how football confidence develops and how parents can support it without adding pressure.",
          },
          {
            title: "Improve Football Decision Making",
            href: "/football-development/improve-football-decision-making",
            description:
              "covers scanning, football IQ, game understanding and how young players make better decisions.",
          },
          {
            title: "Good Football Development Environment",
            href: "/football-development/good-football-development-environment",
            description:
              "explains what parents should look for in a positive development setting.",
          },
          {
            title: "Relative Age Effect in Football",
            href: "/football-development/relative-age-effect-football",
            description:
              "explains how birth month, maturity and physical development can affect young players.",
          },
        ],
      }}
      articles={[
        {
          title: "How to Become a Professional Footballer",
          href: "/football-development/how-to-become-a-professional-footballer",
          description:
            "The real pathways into professional football - the academy route, non-league development, late developers, and why environment and education matter as much as talent.",
        },
        {
          title: "Is My Child Ready for Academy Football?",
          href: "/football-development/signs-your-child-is-ready-for-academy-football",
          description:
            "The qualities scouts actually look for, the myths parents commonly believe, and why dominating at grassroots level tells you very little.",
        },
        {
          title: "How Much Training Is Too Much?",
          href: "/football-development/how-much-training-is-too-much",
          description:
            "More sessions doesn't always mean more development. Age-by-age training load guidelines, from 1-2 sessions a week at U8-U10, and the real signs of burnout.",
        },
        {
          title: "Build Confidence in Young Footballers",
          href: "/football-development/build-confidence-young-footballers",
          description:
            "How parents can help young footballers build football confidence without adding pressure or unrealistic expectations.",
        },
        {
          title: "Improve Football Decision Making",
          href: "/football-development/improve-football-decision-making",
          description:
            "Decision making is one of the most important skills in youth football - and one of the hardest to coach. How parents and coaches can help young players think faster and clearer on the pitch.",
        },
        {
          title: "Good Football Development Environment",
          href: "/football-development/good-football-development-environment",
          description:
            "Coaching quality, touches on the ball, playing time and enjoyment matter more than league position. What actually predicts whether your child is developing.",
        },
        {
          title: "Late Developers in Football",
          href: "/football-development/late-developers-in-football",
          description:
            "Understanding late physical and technical development in football and why early success does not guarantee long-term outcomes.",
        },
        {
          title: "Relative Age Effect in Football",
          href: "/football-development/relative-age-effect-football",
          description:
            "How birth month can influence academy selection, and what it means for your child's development in youth football.",
        },
        {
          title: "Understanding the New FA Youth Football Format",
          href: "/football-development/new-fa-youth-football-format",
          description:
            "The FA's FutureFit reforms start in 2026/27 and change match sizes at nearly every age group between Under-7 and Under-14. What's actually changing, and why.",
        },
        {
          title: "Should My Child Play Up an Age Group in Football?",
          href: "/football-development/playing-up-an-age-group-football",
          description:
            "Should your child play up an age group in football? Learn the FA rules, benefits, risks and signs they are ready to play against older children.",
        },
        {
          title: "What Is Football IQ? A Parent's Guide to Football Intelligence",
          href: "/football-development/what-is-football-iq",
          description:
            "What football IQ actually means, why coaches value it so highly, and how scanning, decision making and match experience help children develop it.",
        },
        {
          title: "Is Private Football Coaching Worth It?",
          href: "/football-development/is-private-football-coaching-worth-it",
          description:
            "Thinking about private football coaching or 1-to-1 football coaching? When it helps, what it costs, how to choose a coach and whether it's worth it for young players.",
        },
        {
          title: "What Is Bio-Banding in Football?",
          href: "/football-development/bio-banding-football",
          description:
            "A jargon-free explanation of bio-banding: what it means, why academies use it and whether parents should be concerned if their child is invited.",
        },
        {
          title: "Why Isn't My Child Improving at Football?",
          href: "/football-development/why-isnt-my-child-improving-at-football",
          description:
            "Why football development plateaus happen, what's normal, and a 3 to 6 month plan for parents.",
        },
        {
          title: "Football Burnout: Signs, Causes and What Parents Can Do",
          href: "/football-development/football-burnout",
          description:
            "How to recognise football burnout early, tell it apart from a normal bad patch, and help a child rediscover enjoyment.",
        },
      ]}
      bottomContent={{
        title: "About Football Development",
        content: [
          "Football development is about more than technical practice or moving into a higher-level team as early as possible. For young players, progress usually depends on a mix of confidence, game understanding, physical maturity, decision making, enjoyment and the quality of the environment around them. Parents often see only the visible parts of development, such as goals, tackles or selection decisions, but many of the most important improvements happen gradually over time.",
          "A good football development pathway should help children become more skilful, more resilient and more confident without losing their love of the game. That means balancing training with recovery, recognising the impact of growth and relative age, understanding that late developers can still catch up, and judging opportunities by how well they support the individual child rather than by the badge on the kit.",
          "The guides in this section are designed to help parents make sense of player development at grassroots, development centre and academy level. They cover football confidence, decision making, football IQ, training load, late development, playing up an age group and knowing when a child may be ready for a more demanding football environment.",
        ],
      }}
    />
  );
}