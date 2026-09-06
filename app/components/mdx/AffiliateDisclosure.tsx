/**
 * In-content affiliate disclosure. Our editorial policy requires disclosure
 * "within the relevant content" rather than only on the policy page, and
 * CMA/ASA guidance expects it visible where the links are. Kept to one quiet
 * line: it has to be readable, not prominent.
 */
export default function AffiliateDisclosure({
  className = "",
}: {
  className?: string;
}) {
  return (
    <p className={`text-xs italic text-gray-500 leading-5 ${className}`}>
      *Football Parent may earn a commission on recommended products.
    </p>
  );
}
