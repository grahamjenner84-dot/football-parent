import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Parent Guides | Football Parent",
  description:
    "Honest football parenting advice covering confidence, matchday behaviour, academy decisions and supporting young players.",
  path: "/parent-guides",
  type: "website",
});

export default function ParentGuidesPage() {
  return (
    <CategoryPage
      eyebrow="Parent guides"
      title="Parent Guides"
      description="Realistic support and guidance for football parents navigating youth football and player development."
      articles={[
        {
          title: "What to Say After Football Matches",
          href: "/parent-guides/what-to-say-after-football-matches",
          description:
            "Simple ways parents can support players after matches.",
        },
        {
          title: "Support Your Child After a Bad Match",
          href: "/parent-guides/support-child-after-bad-match",
          description:
            "Practical guidance for helping players bounce back positively.",
        },
        {
          title: "Biggest Football Parent Mistakes",
          href: "/parent-guides/biggest-football-parent-mistakes",
          description:
            "Common mistakes football parents make and how to avoid them.",
        },
        {
          title: "Should You Leave Grassroots Football for an Academy?",
          href: "/parent-guides/leave-grassroots-football-for-an-academy",
          description:
            "Factors parents should consider before making the move.",
        },
      ]}
    />
  );
}