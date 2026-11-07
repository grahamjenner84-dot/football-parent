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
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

export default function GearPicks({
  data = "[]",
  title = "Quick picks",
  cta = "View on Amazon",
  design = "classic",
}: GearPicksProps) {
  let items: GearPickItem[] = [];

  try {
    items = JSON.parse(data);
  } catch {
    items = [];
  }

  items = items.filter((item) => item && item.name && item.href);

  if (!items.length) return null;

  // Comic: the Start Here box's ink outline and hard shadow, a yellow title
  // band like the comic table headers, and the buy button kept blue (only
  // its shape changes), so a shift in the click-out rate reads as the
  // design rather than a new button colour. Same links, rel, tracking
  // attribute and disclosure as the classic box.
  if (design === "comic") {
    return (
      <div className="my-8">
        <div className="overflow-hidden rounded-[18px] border-[3px] border-[#201E1D] bg-white shadow-[6px_6px_0_#201E1D]">
          <div className="border-b-[3px] border-[#201E1D] bg-[#FFC400] px-5 py-3 font-display text-[22px] font-extrabold leading-tight text-[#201E1D]">
            {title}
          </div>

          {items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                index > 0 ? "border-t border-[#C9C4BA]" : ""
              }`}
            >
              <div className="sm:pr-4">
                {item.label ? (
                  <div className="text-[13px] font-bold uppercase tracking-wide text-[#5A5650]">{item.label}</div>
                ) : null}
                <div className="font-display text-xl font-extrabold leading-tight text-[#201E1D]">{item.name}</div>
                {item.note ? <div className="mt-1 text-[15px] leading-[1.55] text-[#3A3836]">{item.note}</div> : null}
              </div>

              <a
                href={item.href}
                {...affiliateLinkProps(item.href)}
                data-affiliate-placement="gear-picks"
                className="shrink-0 self-start whitespace-nowrap rounded-full border-2 border-[#201E1D] bg-[#1F5FD6] px-[18px] py-2.5 text-center text-[15px] font-bold text-white! no-underline shadow-[3px_3px_0_#201E1D] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#201E1D] sm:self-auto"
              >
                {cta}
              </a>
            </div>
          ))}
        </div>

        <AffiliateDisclosure className="mt-3 px-1" />
      </div>
    );
  }

  return (
    <div className="my-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="font-semibold text-gray-900">{title}</div>
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

            {/* data-affiliate-placement is read by
                app/components/AffiliateClickTracker.tsx, so clicks on the
                quick-picks buttons can be told apart from clicks on ordinary
                inline links in the prose - which is the whole point of this
                component existing. */}
            <a
              href={item.href}
              {...affiliateLinkProps(item.href)}
              data-affiliate-placement="gear-picks"
              className="shrink-0 self-start rounded-lg bg-blue-700 px-4 py-2 text-center text-sm font-semibold text-white! hover:bg-blue-800 transition sm:self-auto"
            >
              {cta}
            </a>
          </div>
        ))}
      </div>

      <AffiliateDisclosure className="mt-2 px-1" />
    </div>
  );
}
