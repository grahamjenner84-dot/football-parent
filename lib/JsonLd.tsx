// Structured data as a plain <script> tag, so it is in the server-rendered
// HTML. next/script's <Script> only injects it after hydration, which crawlers
// that don't run JavaScript (Ahrefs, Bing, most AI crawlers) never see.
// Escaping "<" stops a "</script>" inside any string from closing the tag.
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}
