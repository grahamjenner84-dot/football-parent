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

// Our two apps, set apart from the article categories as filled pills in
// their own brand colours: Progress green, and the Coach App's blue from the
// strip on its icon (#3D86FF, public/parent/readme.txt), with ink text
// because white on that blue is too faint.
//
// Neither link carries a ?b= tag. The Coach App banner report counts clicks
// from any ?b= value but impressions only for placements bannerOnPath() in
// lib/supabase/page-views.ts knows, so an unregistered header tag would add
// a clicks-only row with an inflated CTR. Header clicks count as "Site link"
// in both funnels until the report learns a header placement.
//
// The Coach App link goes to /football-parent-coach-app, the one indexable
// Coach App page, so the link on every page of the site points Google at the
// page that can rank (Graham, 2 Nov 2026). From 1 to 2 Nov it went to
// /coach-app, the app itself, which is noindex, so a sitewide link was spent
// on a page that can never rank. The landing page's form signs returning
// coaches in as well as signing new ones up (Google and the email link both
// sign in an existing account), so nobody is stranded there; it is one tap
// more for a coach who used the header to open the app.
type AppLinkItem = { label: string; href: string; colours: string; external?: boolean };

const appLinks: AppLinkItem[] = [
  { label: "Progress app", href: "/progress", colours: "bg-[#1A7A45] text-white" },
  { label: "Coach App", href: "/football-parent-coach-app", colours: "bg-[#3D86FF] text-[#201E1D]" },
];

// /coach-app is a rewrite to the app's own deployment (vercel.json), not a
// route in this Next app, so it gets a plain <a> and a full page load.
function AppLink({ app, className, onClick }: { app: AppLinkItem; className: string; onClick?: () => void }) {
  if (app.external) {
    return (
      <a href={app.href} className={className} onClick={onClick}>
        {app.label}
      </a>
    );
  }
  return (
    <Link href={app.href} scroll={true} className={className} onClick={onClick}>
      {app.label}
    </Link>
  );
}

const pill =
  "whitespace-nowrap rounded-full border-2 border-[#201E1D] px-4 py-2 text-[15px] font-bold no-underline shadow-[3px_3px_0_#201E1D] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#201E1D]";

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

  // The section the current page belongs to, underlined in the nav row.
  const section = navItems.find(
    (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`),
  )?.href;

  return (
    <header className="sticky top-0 z-50 w-full border-b-[3px] border-[#201E1D] bg-white font-ui text-[#201E1D]">
      <div className="mx-auto flex max-w-[1220px] items-center gap-x-3 gap-y-3 px-5 py-3 sm:gap-x-4 lg:gap-x-7 lg:px-6">
        <Link href="/" scroll={true} className="flex shrink-0 items-center gap-1.5 no-underline">
          <Image src="/parent/icon/parent-circle-512.png" alt="" width={50} height={50} />
          <Image
            src="/parent/horizontal/parent-wordmark-text-424.png"
            alt="Football Parent"
            width={115}
            height={48}
          />
        </Link>

        <SearchPanel className="ml-auto lg:ml-0 lg:max-w-[520px] lg:flex-1" />

        <div className="flex items-center gap-2.5 lg:ml-auto">
          {appLinks.map((app) => (
            <AppLink key={app.href} app={app} className={`hidden md:inline-block ${pill} ${app.colours}`} />
          ))}

          <button
            type="button"
            className="inline-flex h-11 items-center rounded-[10px] border-2 border-[#201E1D] bg-white px-3.5 text-[15px] font-bold text-[#201E1D] lg:hidden"
            onClick={() => setOpen((current) => !current)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      <div className="hidden border-t border-[#E8E4DA] lg:block">
        <nav
          aria-label="Sections"
          className="mx-auto flex max-w-[1220px] flex-wrap gap-x-7 gap-y-2 px-6 pb-3 pt-2.5 text-[15px] font-medium"
        >
          {navItems.map((item) => {
            const active = item.href === section;
            return (
              <Link
                key={item.href}
                href={item.href}
                scroll={true}
                aria-current={pathname === item.href ? "page" : active ? "true" : undefined}
                className={
                  active
                    ? "font-bold text-[#201E1D] underline decoration-[3px] underline-offset-[6px]"
                    : "text-[#201E1D] no-underline underline-offset-[6px] hover:underline"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {open && (
        <nav aria-label="Menu" className="border-t-2 border-[#201E1D] bg-white px-5 pb-5 pt-1 lg:hidden">
          <div className="mx-auto grid max-w-[1220px]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                scroll={true}
                onClick={() => setOpen(false)}
                aria-current={pathname === item.href ? "page" : item.href === section ? "true" : undefined}
                className={`border-b border-[#E8E4DA] py-3 text-base text-[#201E1D] no-underline ${
                  item.href === section ? "font-bold" : "font-medium"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-wrap gap-3">
              {appLinks.map((app) => (
                <AppLink
                  key={app.href}
                  app={app}
                  onClick={() => setOpen(false)}
                  className={`inline-block ${pill} ${app.colours}`}
                />
              ))}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
