"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const navItems = [
  { label: "Academy Pathway", href: "/academy-pathway" },
  { label: "Football Development", href: "/football-development" },
  { label: "Academy Trials", href: "/academy-trials" },
  { label: "Girls Football", href: "/girls-football" },
  { label: "Parent Guides", href: "/parent-guides" },
  { label: "Football Gear", href: "/football-gear" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white text-slate-950 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" scroll={true} className="flex items-center no-underline">
          <Image
            src="/logo.webp"
            alt="Football Parent"
            width={220}
            height={60}
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