import { affiliateLinkProps } from "@/lib/affiliate";

// A product photo placed in the article text, beside the paragraph that
// discusses that product, rather than in the GearPicks box. Deliberately not
// a card: a photo with a caption reads as part of the write-up, so one brand
// can have photos (QuickPlay supplied theirs, Nov 2026) without the quick
// picks list looking uneven next to Amazon picks, whose images we cannot host.
//
// The photo links to the same affiliate deep link as the product's text link,
// so it carries the same rel/target from lib/affiliate.ts and is counted by
// AffiliateClickTracker. data-affiliate-placement="photo" reports its clicks
// apart from inline and quick-picks clicks on the Amazon clicks tab. The
// visually hidden product name becomes the tracked link text, since an image
// link has no text of its own.
type ProductPhotoProps = {
  src: string;
  alt: string;
  // Product name, used as the link's accessible name and tracked link text.
  name: string;
  // Affiliate deep link to the product shown.
  href: string;
  caption?: string;
  width: number;
  height: number;
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

export default function ProductPhoto({
  src,
  alt,
  name,
  href,
  caption,
  width,
  height,
  design = "classic",
}: ProductPhotoProps) {
  const comic = design === "comic";

  return (
    <figure className="my-8" data-affiliate-placement="photo">
      <a
        href={href}
        {...affiliateLinkProps(href)}
        className={`block overflow-hidden ${
          comic
            ? "rounded-[14px] border-[3px] border-[#201E1D] shadow-[5px_5px_0_#201E1D]"
            : "rounded-xl border border-gray-200"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
        <span className="sr-only">{name}</span>
      </a>
      {caption ? (
        <figcaption
          className={
            comic
              ? "mt-3 text-[15px] leading-[1.5] text-[#201E1D]"
              : "mt-2 text-sm leading-6 text-gray-600"
          }
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
