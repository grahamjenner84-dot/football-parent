// "Follow us on Instagram" card at the end of every article (rendered once in
// lib/ArticleLayout.tsx, inside the author box).
//
// Instagram has no embeddable one-tap follow button, so this is a link to the
// profile: on a phone it opens the Instagram app, where the reader taps
// Follow. It opens in a new tab so the article stays open behind it.
//
// Measurement: instagram.com is in lib/outbound-partners.ts, so the existing
// PartnerClickTracker logs every click on this (and on the footer link) to
// partner_clicks under the "instagram" slug, reported on the "Instagram
// clicks" tab at /admin/seo. No onClick here on purpose: this is a server
// component and the delegated listener already catches it.

export const INSTAGRAM_URL = "https://www.instagram.com/football.parent";

// Where on the site an Instagram link sits. Carried in the link itself as
// utm_content (Instagram ignores it), because partner_clicks stores the full
// href and has no placement column: the "Instagram clicks" report reads it
// back out with instagramPlacementFromHref in lib/supabase/partner-clicks.ts.
export type InstagramPlacement = "end-card" | "mid-article" | "footer";

export function instagramUrl(placement: InstagramPlacement): string {
  return `${INSTAGRAM_URL}/?utm_content=${placement}`;
}
export const INSTAGRAM_HANDLE = "@football.parent";

export function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

export default function InstagramFollow() {
  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="m-0 font-bold text-gray-900">Follow Football Parent on Instagram</p>
        <p className="m-0 mt-1 text-sm text-gray-600">
          Tips from academy coaches and parents who have been through it, in a
          minute a day. {INSTAGRAM_HANDLE}
        </p>
      </div>
      <a
        href={instagramUrl("end-card")}
        target="_blank"
        // No noreferrer: the profile visit should show it came from us.
        rel="noopener"
        className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-5 py-2.5 text-sm font-semibold !text-white no-underline shadow-sm transition hover:opacity-90"
      >
        <InstagramIcon />
        Follow on Instagram
      </a>
    </div>
  );
}
