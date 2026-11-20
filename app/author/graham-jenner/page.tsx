import type { Metadata } from "next";
import { staticPageOpenGraph } from "@/lib/seo";
import { firaSansCondensed } from "@/lib/comic-design";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Graham Jenner | Football Parent",
  description:
    "Graham Jenner is the founder of Football Parent. A football parent and grassroots coach sharing first-hand experience of navigating youth football pathways in the UK.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/author/graham-jenner",
  },
  openGraph: staticPageOpenGraph("/author/graham-jenner"),
};

export default function GrahamJennerAuthorPage() {
  return (
    <main className={`${firaSansCondensed.variable} min-h-screen bg-white font-ui text-[#201E1D]`}>
      <section className="border-b-[3px] border-[#201E1D] bg-[#FFF8E1]">
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-11 lg:pt-16">
          <p className="mb-5 inline-block rounded-full border-2 border-[#201E1D] bg-[#FFC400] px-3 py-1 text-sm font-bold text-[#201E1D]">
            Founder of Football Parent
          </p>

          <h1 className="mb-6 font-display text-[clamp(36px,5vw,64px)] font-extrabold uppercase leading-[1.02] text-[#201E1D]">
            About Graham Jenner
          </h1>

          <p className="text-lg leading-[1.6] text-[#3A3836] sm:text-xl">
            I&apos;m Graham - football parent, grassroots coach, and the
            person behind Football Parent.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="space-y-6 text-[18px] leading-[1.75] text-[#33312E]">
          
          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            How this started
          </h2>

          <p>
            When my son first got involved in youth football, I quickly realised
            how little straightforward information was out there for parents.
            Everything felt either overly technical, written for coaches rather
            than families, or buried inside Facebook groups where the same
            questions got asked repeatedly.
          </p>

          <p>
            As my son loved football and begun to get better I started to wonder whether I should push him to a higher level. He began attending a development centre, I
            genuinely didn&apos;t know what to expect. What would sessions
            involve? What were the coaches looking for? What happened next if things went well - or if they
            didn&apos;t? But over time it has also helped me reflect on how I can support him and keep football enjoyable for him, whatever level he plays at.
          </p>

          <p>That gap was the starting point for Football Parent.</p>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            My background
          </h2>

          <p>
            I&apos;m not a former professional footballer. I&apos;ve never
            worked for an academy and I&apos;ve never been a scout. I&apos;m a
            football parent who has spent years asking the same questions you might have now.
          </p>

          <p>
            My son attended Crystal Palace&apos;s Development Centre, as well as
            both Chelsea&apos;s Player Training Centre and their Player
            Development Centre. Each environment was different, with its own
            expectations, culture and impact on him.
          </p>

          <p>
            Alongside being a parent, I&apos;ve also coached. I took my
            son&apos;s grassroots team from under-6s and found it
            one of the most rewarding and challenging things I&apos;ve done. Having coached youth football before having children, nothing quite prepares you for the difference, emotionally, coaching your own child's team. I also hold an FA
            Level 2 coaching qualification from my time coaching before becoming a parent coach.
          </p>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            What I write about
          </h2>

          <p>
            Football Parent is focused on the journey that football families go
            through, the parts that are not always explained clearly.
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Football academies and how they work</li>
            <li>Development centres and what parents should expect</li>
            <li>Academy trials and how to approach them</li>
            <li>Player development and long-term progress</li>
            <li>Girls&apos; football pathways</li>
            <li>Football parenting, expectations and enjoyment</li>
          </ul>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            My editorial approach
          </h2>

          <p>
            I don&apos;t claim to have insider knowledge of how academies make
            their decisions. I&apos;m not positioned inside the professional
            game and I don&apos;t pretend to be.
          </p>

          <p>
            What I do have is first-hand experience, a willingness to research
            carefully, and a commitment to being honest about what I know and
            what I don&apos;t. Where possible, I use interviews with experts to help give you further guidance and knowledge from those who work in the game. I also make sure to link to official sources so you can read for yourself.
          </p>

          <h2 className="font-display text-[30px] lg:text-[38px] font-extrabold leading-[1.05] text-[#201E1D] pt-8">
            Who I&apos;m writing for
          </h2>

          
          <p>
            I&apos;m not here to sell coaching programmes or tell you your child
            is destined for greatness. I&apos;m here to help you understand the
            system, avoid mistakes i've made and make informed decisions. Ultimately, I want to help you keep football enjoyable for
            your family - whatever level your child plays at.
          </p>



          <p className="pt-6 italic text-[#5A5650]">
            Graham 
          </p>
        </div>
      </section>
    </main>
  );
}