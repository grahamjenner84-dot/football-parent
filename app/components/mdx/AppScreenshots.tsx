type Shot = {
  // Path under /public, e.g. "/images/reviews/football-dna/search.webp".
  src: string;
  alt: string;
  caption: string;
};

type AppScreenshotsProps = {
  // JSON array of { src, alt, caption } (MDX attributes are strings).
  shots: string;
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

// Phone screenshots for an app review, each with its own caption. Up to
// three side by side on wider screens, stacked and centred on a phone so
// nothing scrolls sideways. Images are tall portrait crops (about 540 wide).
export default function AppScreenshots({ shots, design = "classic" }: AppScreenshotsProps) {
  let items: Shot[] = [];
  try {
    const parsed = JSON.parse(shots);
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    items = [];
  }
  if (!items.length) return null;

  const comic = design === "comic";

  return (
    <div className="my-8 grid gap-6 sm:grid-cols-3 sm:gap-4">
      {items.map((shot) => (
        <figure key={shot.src} className="m-0 mx-auto w-full max-w-[260px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shot.src}
            alt={shot.alt}
            loading="lazy"
            width={540}
            height={1050}
            className={`h-auto w-full ${
              comic
                ? "rounded-xl border-[3px] border-[#201E1D]"
                : "rounded-xl border border-gray-200"
            }`}
          />
          <figcaption
            className={`mt-2 text-center text-sm leading-[1.5] ${
              comic ? "text-[#3A3836]" : "text-gray-600"
            }`}
          >
            {shot.caption}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
