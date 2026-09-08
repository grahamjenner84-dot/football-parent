"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SearchPanel from "./search-panel";

const navItems = [
  { label: "Academy Pathway", href: "/academy-pathway" },
  { label: "Football Development", href: "/football-development" },
  { label: "Academy Trials", href: "/academy-trials" },
  { label: "Girls Football", href: "/girls-football" },
  { label: "Parent Guides", href: "/parent-guides" },
  { label: "Coaching", href: "/coaching" },
  { label: "Football Gear", href: "/football-gear" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The PPC landing variants under /football-parent-coach-app/<variant> drop
  // the site nav entirely. They exist to convert one ad click, and the seven
  // category links are seven ways to leave a page we paid to land someone on.
  // The hero carries the Coach App wordmark, so the page is not left
  // unbranded, and the footer stays for the privacy/terms links that Google
  // Ads policy expects to be reachable.
  //
  // Deliberately not the parent /football-parent-coach-app page: that one is
  // the only indexable page in the set, and stripping its internal links
  // would cost it the crawl paths it is supposed to have.
  //
  // usePathname is safe to branch on here despite the page being prerendered:
  // the docs' hydration-mismatch warning applies to pages reached *through* a
  // rewrite, and the only rewrite in this project (/coach-app/:path* in
  // vercel.json) points at a separate deployment that never renders this
  // component.
  if (/^\/football-parent-coach-app\/[^/]+$/.test(pathname ?? "")) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white text-slate-950 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" scroll={true} className="flex items-center gap-1.5 no-underline">
          <Image
            src="/parent/icon/parent-circle-512.png"
            alt=""
            width={58}
            height={58}
          />
          <Image
            src="/parent/horizontal/parent-wordmark-text-424.png"
            alt="Football Parent"
            width={148}
            height={62}
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              scroll={true}
              className="text-slate-700 no-underline transition hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <SearchPanel />

          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 md:hidden"
            onClick={() => setOpen((current) => !current)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-slate-200 bg-white px-5 py-4 md:hidden">
          <div className="mx-auto grid max-w-6xl gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                scroll={true}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-800 no-underline transition hover:bg-slate-100 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}