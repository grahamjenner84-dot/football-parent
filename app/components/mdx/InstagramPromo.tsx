import { INSTAGRAM_HANDLE, INSTAGRAM_URL, InstagramIcon } from "@/app/components/InstagramFollow";

// Mid-article "more like this on Instagram" box, placed by hand in the
// highest-traffic articles as <InstagramPromo /> (about a fifth of the way
// in, so it never meets the Coach App banner that splits the middle).
//
// Not for content/football-gear/*: those are conversion pages and anything
// pulling readers off-site competes with the affiliate click-out (same
// reasoning as the no-outbound-citations rule in CLAUDE.md).
//
// Clicks are counted by PartnerClickTracker like the end-of-article card;
// data-instagram-placement is there so the two can be told apart later.
export default function InstagramPromo() {
  return (
    <aside
      data-instagram-placement="mid-article"
      className="not-prose my-8 rounded-2xl border border-[#f3d3e3] bg-gradient-to-br from-[#fff5ec] via-[#fdf0f6] to-[#f5effb] px-6 py-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex-1">
          <p className="m-0 flex items-center gap-2 font-bold text-gray-900">
            <InstagramIcon className="h-5 w-5 text-[#dd2a7b]" />
            More like this on Instagram
          </p>
          <p className="m-0 mt-1 text-sm leading-6 text-gray-700">
            Quick expert insights from youth coaches and the people who run
            grassroots football, plus what we have learned as football
            parents. {INSTAGRAM_HANDLE}
          </p>
        </div>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener"
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-5 py-2.5 text-sm font-semibold !text-white no-underline shadow-sm transition hover:opacity-90"
        >
          Follow on Instagram
        </a>
      </div>
    </aside>
  );
}
