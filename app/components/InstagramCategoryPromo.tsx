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

// In the category pages' comic-accent design (app/components/category-page.tsx):
// a white box with the ink outline and offset shadow, the Instagram gradient
// on the icon tile and the button. Same words and link as before.
export default function InstagramCategoryPromo() {
  return (
    <aside className="rounded-[18px] border-[3px] border-[#201E1D] bg-white px-6 py-6 shadow-[6px_6px_0_#201E1D] sm:px-7">
      <p className="m-0 mb-3 text-[15px] font-semibold text-[#5A5650]">Football Parent on Instagram</p>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex-1">
          <p className="m-0 mb-2 flex items-center gap-3 text-xl font-bold leading-snug text-[#201E1D]">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-[#201E1D] bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white"
            >
              <InstagramIcon className="h-5 w-5" />
            </span>
            Follow us for the latest interviews
          </p>
          <p className="m-0 text-base leading-[1.6] text-[#3A3836]">
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
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full border-2 border-[#201E1D] bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-[18px] py-[11px] text-[15px] font-bold !text-white no-underline shadow-[3px_3px_0_#201E1D] transition hover:opacity-90 sm:self-auto"
        >
          <InstagramIcon />
          Follow on Instagram
        </a>
      </div>
    </aside>
  );
}
