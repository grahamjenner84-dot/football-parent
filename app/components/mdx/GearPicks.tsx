import { affiliateLinkProps } from "@/lib/affiliate";
import AffiliateDisclosure from "./AffiliateDisclosure";

type GearPickItem = {
  // Short role for the pick, e.g. "Budget pick" or "Step up".
  label?: string;
  // Product name, used as the link text.
  name: string;
  href: string;
  // One line on what it is and who it suits.
  note?: string;
};

type GearPicksProps = {
  // JSON string, matching the InfoTable convention so picks stay authored in
  // the MDX rather than hardcoded in a component.
  data?: string;
  title?: string;
  cta?: string;
};

export default function GearPicks({
  data = "[]",
  title = "Quick picks",
  cta = "View on Amazon",
}: GearPicksProps) {
  let items: GearPickItem[] = [];

  try {
    items = JSON.parse(data);
  } catch {
    items = [];
  }

  items = items.filter((item) => item && item.name && item.href);

  if (!items.length) return null;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="font-semibold text-gray-900">{title}</div>
        {/* Disclosure sits above the links, not in the footer: our editorial
            policy requires in-content disclosure, and CMA/ASA guidance expects
            it to be visible before the reader engages with the link. */}
        <AffiliateDisclosure variant="compact" />
      </div>

      {items.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between ${
            index !== items.length - 1 ? "border-b border-gray-200" : ""
          }`}
        >
          <div className="sm:pr-4">
            {item.label ? (
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {item.label}
              </div>
            ) : null}
            <div className="font-semibold text-gray-900">{item.name}</div>
            {item.note ? (
              <div className="text-sm text-gray-600 leading-6">{item.note}</div>
            ) : null}
          </div>

          <a
            href={item.href}
            {...affiliateLinkProps(item.href)}
            className="shrink-0 self-start rounded-lg bg-blue-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-800 transition sm:self-auto"
          >
            {cta}
          </a>
        </div>
      ))}
    </div>
  );
}
