import type { Metadata } from "next";
import { staticPageOpenGraph } from "@/lib/seo";
import { firaSansCondensed } from "@/lib/comic-design";

export const metadata: Metadata = {
  title: "About Football Parent | Football Parent",
  description:
    "Football Parent is an independent website helping UK families navigate football academies, development centres, trials and youth football pathways.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/about",
  },
  openGraph: staticPageOpenGraph("/about"),
};

export default function AboutFootballParentPage() {
  return (
    <main className={`${firaSansCondensed.variable} min-h-screen bg-white font-ui text-[#201E1D]`}>
      <section className="border-b-[3px] border-[#201E1D] bg-[#FFF8E1]">
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-11 lg:pt-16">
          <p className="mb-5 inline-block rounded-full border-2 border-[#201E1D] bg-[#FFC400] px-3 py-1 text-sm font-bold text-[#201E1D]">
            Independent guidance for football families
          </p>

          <h1 className="mb-6 font-display text-[clamp(36px,5vw,64px)] font-extrabold uppercase leading-[1.02] text-[#201E1D]">
            About Football Parent
          </h1>

          <p className="text-lg leading-[1.6] text-[#3A3836] sm:text-xl">
            Football Parent exists because navigating youth football in the UK
            is harder than it should be - and most families are figuring it out
            on their own.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="space-y-6 text-[18px] leading-[1.75] text-[#33312E]">
          

          <p>
            It is independent, practical, and written by someone who has been
            through it.
          </p>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            The problem this site tries to solve
          </h2>

          <p>
            The UK youth football system is genuinely complex. There are
            academies, development centres, centres of excellence, player
            training centres, player development centres, regional talent clubs,
            emerging talent centres - and that is before you get into EPPP
            categories, age group differences, and how the girls&apos; pathway
            differs from the boys&apos;.
          </p>

          <p>
            Most parents encounter this system without any context. Their child
            gets invited to a trial or a development centre, and suddenly they
            are trying to understand a world that feels opaque and slightly
            intimidating. Clubs are not always forthcoming with detail. Online
            forums are a mixture of useful experience and strong opinions from
            people who do not always know more than you do. Much of the formal
            guidance is written for coaches, not families.
          </p>

          

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            Who this is for
          </h2>

          <p>
            Football Parent is written for families across the UK whose children
            play football at any level, but who are specifically navigating - or
            thinking about navigating - the more structured end of youth
            football.
          </p>

          <p>That includes:</p>

          <ul className="list-disc pl-6 space-y-2">
            <li>
              Parents of children attending development centres or centres of
              excellence who want to understand what it means and what to expect
            </li>
            <li>
              Families preparing for or going through academy trials who want
              honest information rather than vague reassurance
            </li>
            <li>
              Parents supporting children who have been released from an academy
              or development centre and are working out what comes next
            </li>
            <li>
              Families involved in girls&apos; football who are navigating a
              separate and still-developing pathway
            </li>
            <li>
              Grassroots football parents who want to understand how the broader
              system works
            </li>
            <li>
              Anyone who wants to support their child&apos;s football journey
              without applying too much pressure or getting in the way
            </li>
          </ul>

          <p>
            You do not need to have a child at an elite academy to find this
            site useful. The questions around player development, managing
            expectations, and keeping football enjoyable apply at every level.
          </p>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            What this site covers
          </h2>

          <p>
            Football Parent is built around topical depth rather than breadth.
            The goal is to cover a focused set of subjects properly, rather than
            skimming every aspect of football.
          </p>

          <h3 className="text-[22px] lg:text-2xl font-bold text-[#201E1D] pt-4">
            Football academies
          </h3>

          <p>
            How the English academy system is structured, what the different
            EPPP categories mean, what life inside an academy looks like from a
            family perspective, and what happens at each age group.
          </p>

          <h3 className="text-[22px] lg:text-2xl font-bold text-[#201E1D] pt-4">
            Development centres
          </h3>

          <p>
            What development centres are, how they differ from academies, what
            sessions typically involve, and how to approach them as a parent.
            This is an area where first-hand experience particularly shapes the
            content.
          </p>

          <h3 className="text-[22px] lg:text-2xl font-bold text-[#201E1D] pt-4">
            Academy trials
          </h3>

          <p>
            What different types of trials exist, how to prepare your child
            without overdoing it, what coaches are actually looking for, and how
            to handle the outcome - whether positive or not.
          </p>

          <h3 className="text-[22px] lg:text-2xl font-bold text-[#201E1D] pt-4">
            Player development
          </h3>

          <p>
            Long-term athlete development principles, what good coaching looks
            like at different ages, how parents can genuinely support
            development, and where they sometimes hinder it.
          </p>

          <h3 className="text-[22px] lg:text-2xl font-bold text-[#201E1D] pt-4">
            Girls&apos; football pathways
          </h3>

          <p>
            The specific routes available for girls in England, including
            Emerging Talent Centres, the WSL academy system, and how the
            girls&apos; pathway compares to and differs from the boys&apos;.
          </p>

          <h3 className="text-[22px] lg:text-2xl font-bold text-[#201E1D] pt-4">
            Football parenting
          </h3>

          <p>
            The less technical but equally important side of youth football:
            managing expectations, keeping the game enjoyable, handling
            disappointment, and knowing when your child needs support rather
            than coaching from the touchline.
          </p>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            Why independent guidance matters
          </h2>

          <p>
            Football Parent has no affiliation with any club, academy, agency,
            or coaching provider. There are no partnerships with clubs. Nothing
            on this site is written to reflect well on any particular
            organisation.
          </p>

          <p>
            That independence matters because the youth football system is one
            where commercial interests can blur the lines. Agent services,
            coaching programmes, trial preparation companies, and academy-linked
            ventures all exist, and some are genuinely useful. But parents
            deserve guidance that is not shaped by those relationships.
          </p>

          <p>
            Where affiliate links exist, for example to equipment, that is
            clearly disclosed.
          </p>

                    
          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            A note on the content
          </h2>

          <p>
            Football Parent currently covers around 75 topics across the areas
            described above. The site is updated as things change - the youth
            football pathway evolves, and outdated information does more harm
            than no information at all.
          </p>

          <p>
           If you have questions or topics you would like covered, you can get
in touch at{" "}
<a
  href="mailto:footballparentuk@gmail.com"
  className="font-bold text-[#1F5FD6] hover:underline"
>
  footballparentuk@gmail.com
</a>.
          </p>

          <p className="pt-6 italic text-[#5A5650]">
            Football Parent is an independent website. It is not affiliated with
            the FA, the Premier League, or any football club.
          </p>
        </div>
      </section>
    </main>
  );
}