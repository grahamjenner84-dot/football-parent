import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-black/10 bg-white text-black">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight"
          >
            Football Parent
          </Link>

          <nav className="w-full">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-medium text-gray-700">
              <Link href="/academy-pathway" className="hover:text-black">
                Academy Pathway
              </Link>

              <Link href="/football-development" className="hover:text-black">
                Football Development
              </Link>

              <Link href="/academy-trials" className="hover:text-black">
                Academy Trials
              </Link>

              <Link href="/girls-football" className="hover:text-black">
                Girls Football
              </Link>

              <Link href="/parent-guides" className="hover:text-black">
                Parent Guides
              </Link>

              <Link href="/football-gear" className="hover:text-black">
                Football Gear
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}