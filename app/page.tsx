import Link from "next/link";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Parent | Honest Guidance for Football Parents",
  description:
    "Independent advice for parents navigating academy football, grassroots football and player development in the UK.",
  path: "/",
  type: "website",
});

export default function Home() {
  return (
    <main className="bg-gray-50">
      <section className="border-b border-black/5 bg-gradient-to-b from-white to-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Independent Football Parenting Guidance
            </p>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
              Honest guidance for parents navigating youth football.
            </h1>

            <p className="mt-6 text-lg text-gray-700 leading-relaxed">
              Practical advice on academy football, grassroots development,
              football trials and supporting young players realistically in the
              UK game.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/academy-pathway"
                className="rounded-xl bg-black px-6 py-3 text-white font-medium hover:bg-gray-800 transition"
              >
                Explore Academy Pathway
              </Link>

              <Link
                href="/parent-guides"
                className="rounded-xl border border-black/10 bg-white px-6 py-3 font-medium hover:bg-gray-100 transition"
              >
                Read Parent Guides
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}