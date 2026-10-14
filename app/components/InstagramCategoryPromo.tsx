import { INSTAGRAM_HANDLE, InstagramIcon, instagramUrl } from "@/app/components/InstagramFollow";

// House filler for the sponsor slot on category pages that have no sponsor
// yet (the `promo` slot in app/components/category-page.tsx, above the guide
// grid). Coaching carries the Coach App and Academy Pathway carries Progress;
// the sections listed in INSTAGRAM_CATEGORY_PATHS carry this until a paying
// sponsor takes the slot, at which point swap the promo and drop the path.
//
// Not on /football-gear: those are conversion pages and anything pulling
// readers off-site competes with the affiliate click-out (same reasoning as
// InstagramPromo and the no-outbound-citations rule in CLAUDE.md).
//
// Clicks are counted by PartnerClickTracker like the other Instagram links,
// told apart by utm_content=category (see instagramUrl).

// Category pages carrying this promo. Read by the Instagram clicks report
// (lib/supabase/partner-clicks.ts) to count impressions, so it must mirror
// the pages that render <InstagramCategoryPromo />.
export const INSTAGRAM_CATEGORY_PATHS = [
  "/academy-trials",
  "/football-development",
  "/girls-football",
  "/parent-guides",
];

export default function InstagramCategoryPromo() {
  return (
    <aside className="rounded-2xl border border-[#f3d3e3] bg-gradient-to-br from-[#fff5ec] via-[#fdf0f6] to-[#f5effb] px-6 py-6 sm:px-8">
      <p className="m-0 mb-3 text-xs font-semibold uppercase tracking-wide text-[#8a5a73]">
        Football Parent on Instagram
      </p>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex-1">
          <p className="m-0 mb-2 flex items-center gap-2 text-lg font-bold leading-snug text-slate-950 sm:text-xl">
            <InstagramIcon className="h-6 w-6 flex-shrink-0 text-[#dd2a7b]" />
            Follow us for the latest interviews
          </p>
          <p className="m-0 text-base leading-7 text-slate-700">
            Academy coaches, scouts and the people who run grassroots football,
            in their own words, plus what we have learned as football parents.{" "}
            {INSTAGRAM_HANDLE}
          </p>
        </div>
        <a
          href={instagramUrl("category")}
          target="_blank"
          // No noreferrer: the profile visit should show it came from us.
          rel="noopener"
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-6 py-3 text-sm font-semibold !text-white no-underline shadow-sm transition hover:opacity-90 sm:self-auto"
        >
          <InstagramIcon />
          Follow on Instagram
        </a>
      </div>
    </aside>
  );
}
