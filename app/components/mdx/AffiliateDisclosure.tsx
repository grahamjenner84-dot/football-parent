import Link from "next/link";

type AffiliateDisclosureProps = {
  children?: React.ReactNode;
};

/**
 * In-content affiliate disclosure, required by our own editorial policy
 * ("Where an affiliate link is used, it should be disclosed within the
 * relevant content") and by CMA/ASA guidance, which expects the disclosure
 * to be visible before the reader engages with the link. Place it directly
 * above the first affiliate link on the page, not only in the footer.
 */
export default function AffiliateDisclosure({
  children,
}: AffiliateDisclosureProps) {
  return (
    <div className="my-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-1 text-sm font-semibold text-gray-800">
        Affiliate disclosure
      </div>
      <div className="text-sm text-gray-600 leading-7">
        {children ?? (
          <>
            Some links below are affiliate links. If you buy through one,
            Football Parent may earn a small commission at no extra cost to
            you. We only link to gear we have actually used, and commission
            never decides what gets recommended. See our{" "}
            <Link
              href="/editorial-policy"
              className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 transition"
            >
              editorial policy
            </Link>
            .
          </>
        )}
      </div>
    </div>
  );
}
