import Link from "next/link";

type AffiliateDisclosureProps = {
  // "compact" is the inline variant used inside GearPicks, which supplies its
  // own container. The default renders a standalone bordered callout, for an
  // article with inline affiliate links and no picks box.
  variant?: "block" | "compact";
  children?: React.ReactNode;
};

/**
 * In-content affiliate disclosure, required by our own editorial policy
 * ("Where an affiliate link is used, it should be disclosed within the
 * relevant content") and by CMA/ASA guidance, which expects the disclosure
 * to be visible before the reader engages with the link. Place it above the
 * first affiliate link on the page, not only in the footer.
 *
 * Single source of the disclosure wording: GearPicks renders this rather than
 * repeating the copy, so the two can't drift apart.
 */
export default function AffiliateDisclosure({
  variant = "block",
  children,
}: AffiliateDisclosureProps) {
  const compact = variant === "compact";

  const body = children ?? (
    <>
      {compact ? "Affiliate links." : "Some links below are affiliate links."}{" "}
      If you buy through one, Football Parent may earn a small commission at no
      extra cost to you. We only link to gear we have actually used, and
      commission never decides what gets recommended. See our{" "}
      <Link
        href="/editorial-policy"
        className={
          compact
            ? "underline underline-offset-2 hover:text-gray-900"
            : "font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 transition"
        }
      >
        editorial policy
      </Link>
      .
    </>
  );

  if (compact) {
    return <div className="mt-1 text-xs text-gray-600 leading-5">{body}</div>;
  }

  return (
    <div className="my-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-1 text-sm font-semibold text-gray-800">
        Affiliate disclosure
      </div>
      <div className="text-sm text-gray-600 leading-7">{body}</div>
    </div>
  );
}
