"use client";

import Link from "next/link";
import Image from "next/image";
import { InstagramIcon, instagramUrl } from "@/app/components/InstagramFollow";

const YOUTUBE_URL = "https://www.youtube.com/channel/UCLxRWA0LswKxL0vZuQfrsmA";

const pageLinks = [
  { label: "About", href: "/about" },
  { label: "Graham Jenner", href: "/author/graham-jenner" },
  { label: "Editorial Policy", href: "/editorial-policy" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
];

export default function Footer() {
  return (
    <footer className="bg-[#201E1D] font-ui text-white">
      <div className="mx-auto flex max-w-[1220px] flex-col gap-6 px-6 pb-8 pt-10">
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
          <Link href="/" className="shrink-0 no-underline">
            <Image
              src="/parent/horizontal/parent-horizontal-white-600.png"
              alt="Football Parent"
              width={177}
              height={52}
            />
          </Link>

          {/* The two socials in their own brand colours, so they read as
              Instagram and YouTube at a glance. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px] font-bold">
            <a
              href={instagramUrl("footer")}
              target="_blank"
              // No noreferrer: the profile visit should show it came from us.
              rel="noopener"
              className="inline-flex items-center gap-2.5 text-white no-underline hover:underline"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]"
              >
                <InstagramIcon className="h-5 w-5" />
              </span>
              Instagram
            </a>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 text-white no-underline hover:underline"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#FF0000]"
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                  <path d="M9 6.5v11l9-5.5z" fill="currentColor" />
                </svg>
              </span>
              YouTube
            </a>
          </div>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-6 gap-y-2.5 border-t border-[#3F3C39] pt-5 text-[15px] font-medium"
        >
          {pageLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-white no-underline hover:underline">
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("fp:open-cookie-settings"))}
            className="cursor-pointer text-white hover:underline"
          >
            Cookie Settings
          </button>
          <a href="mailto:footballparentuk@gmail.com" className="text-[#FFC400] no-underline hover:underline">
            Contact
          </a>
        </nav>

        <p className="m-0 text-sm text-[#B8B4AD]">
          © {new Date().getFullYear()} Football Parent. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
