type ReviewVerdictProps = {
  // The product being reviewed, exactly as its maker names it (never
  // "X Review"): this is the itemReviewed name in the schema.
  name: string;
  // Score out of 5, as a string because MDX attributes are strings ("5", "4.5").
  rating: string;
  // One to three sentences. Shown in the box and used as reviewBody.
  verdict: string;
  // JSON arrays of short strings. The same text is shown on the page and
  // written to positiveNotes/negativeNotes, so the two can never drift.
  pros?: string;
  cons?: string;
  // Price when reviewed, in GBP, as a plain number string ("7.99").
  price?: string;
  // e.g. "per month". Shown after the price.
  priceUnit?: string;
  // schema.org applicationCategory, e.g. "SportsApplication".
  applicationCategory?: string;
  operatingSystem?: string;
  url?: string;
  // ISO date the review was published.
  datePublished: string;
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

const AUTHOR = {
  "@type": "Person",
  name: "Graham Jenner",
  url: "https://www.footballparent.co.uk/about",
};

function parseList(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function itemList(items: string[]) {
  return {
    "@type": "ItemList",
    itemListElement: items.map((name, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
    })),
  };
}

// The verdict box at the top of a review: score, verdict, pros and cons,
// plus SoftwareApplication + Review JSON-LD built from the same props, so
// what Google reads is exactly what the reader sees. Written for app and
// software reviews (Football DNA first); a physical product review would
// want a Product variant instead.
export default function ReviewVerdict({
  name,
  rating,
  verdict,
  pros,
  cons,
  price,
  priceUnit,
  applicationCategory = "SportsApplication",
  operatingSystem,
  url,
  datePublished,
  design = "classic",
}: ReviewVerdictProps) {
  const prosList = parseList(pros);
  const consList = parseList(cons);
  const score = Number(rating);
  const fullStars = Math.floor(score);
  const halfStar = score - fullStars >= 0.5;

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    applicationCategory,
    ...(operatingSystem ? { operatingSystem } : {}),
    ...(url ? { url } : {}),
    ...(price
      ? { offers: { "@type": "Offer", price, priceCurrency: "GBP" } }
      : {}),
    review: {
      "@type": "Review",
      author: AUTHOR,
      datePublished,
      reviewBody: verdict,
      reviewRating: {
        "@type": "Rating",
        ratingValue: rating,
        bestRating: "5",
        worstRating: "1",
      },
      ...(prosList.length ? { positiveNotes: itemList(prosList) } : {}),
      ...(consList.length ? { negativeNotes: itemList(consList) } : {}),
      publisher: {
        "@type": "Organization",
        name: "Football Parent",
        url: "https://www.footballparent.co.uk",
      },
    },
  };

  const comic = design === "comic";
  const stars = (
    <span aria-hidden="true" className="text-[26px] leading-none tracking-wide text-[#F5A623]">
      {"★".repeat(fullStars)}
      {halfStar ? "½" : ""}
      <span className={comic ? "text-[#C9C4BA]" : "text-gray-300"}>
        {"★".repeat(Math.max(0, 5 - fullStars - (halfStar ? 1 : 0)))}
      </span>
    </span>
  );

  return (
    <aside
      className={
        comic
          ? "my-8 rounded-[14px] border-[3px] border-[#201E1D] bg-white px-[22px] pt-[18px] pb-[22px] shadow-[5px_5px_0_#201E1D]"
          : "my-8 rounded-xl border border-gray-200 bg-white p-6"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={`m-0 font-display text-[21px] font-extrabold leading-[1.2] ${
            comic ? "text-[#201E1D]" : "text-gray-900"
          }`}
        >
          Our verdict
        </p>
        <p className="m-0 flex items-center gap-2">
          {stars}
          <span className={`text-[18px] font-bold ${comic ? "text-[#201E1D]" : "text-gray-900"}`}>
            {rating}/5
          </span>
          <span className="sr-only">Rated {rating} out of 5</span>
        </p>
      </div>

      <p className={`mt-3 mb-0 text-[18px] leading-[1.7] ${comic ? "text-[#201E1D]" : "text-gray-700"}`}>
        {verdict}
      </p>

      {price ? (
        <p className={`mt-3 mb-0 text-[16px] ${comic ? "text-[#3A3836]" : "text-gray-600"}`}>
          <strong>Price when reviewed:</strong> £{price}
          {priceUnit ? ` ${priceUnit}` : ""}
        </p>
      ) : null}

      {prosList.length || consList.length ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {prosList.length ? (
            <div>
              <p className={`m-0 mb-2 font-bold ${comic ? "text-[#1F7A3A]" : "text-green-700"}`}>
                What&apos;s good
              </p>
              <ul className="m-0 list-none space-y-2 p-0">
                {prosList.map((item) => (
                  <li key={item} className="flex gap-2 text-[16px] leading-[1.5]">
                    <span aria-hidden="true" className={comic ? "text-[#1F7A3A]" : "text-green-700"}>
                      +
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {consList.length ? (
            <div>
              <p className={`m-0 mb-2 font-bold ${comic ? "text-[#B3261E]" : "text-red-700"}`}>
                What&apos;s not
              </p>
              <ul className="m-0 list-none space-y-2 p-0">
                {consList.map((item) => (
                  <li key={item} className="flex gap-2 text-[16px] leading-[1.5]">
                    <span aria-hidden="true" className={comic ? "text-[#B3261E]" : "text-red-700"}>
                      −
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </aside>
  );
}
