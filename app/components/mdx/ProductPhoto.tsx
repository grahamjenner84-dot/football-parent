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
  // Intrinsic pixel size, so the space is reserved before the image loads.
  // Strings because next-mdx-remote strips {expression} props from MDX, so
  // author them as width="1200", not width={1200}.
  width: number | string;
  height: number | string;
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
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  // A square or portrait photo at full column width runs to ~700px tall and
  // swamps the text around it, so those are capped and centred; wide photos
  // use the full width.
  const compact = w > 0 && h >= w * 0.8;

  return (
    <figure
      className={`my-8 ${compact ? "mx-auto max-w-[440px]" : ""}`}
      data-affiliate-placement="photo"
    >
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
          width={w || undefined}
          height={h || undefined}
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
