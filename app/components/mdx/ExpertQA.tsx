import React from "react";

type ExpertQAItemProps = {
  q: string;
  children?: React.ReactNode;
};

// Pure data holder: read by the parent ExpertQA via React.Children, never
// rendered on its own. Kept as a real component (not a plain object) so the
// Q&A content can be authored as normal nested MDX/JSX rather than a JSON
// string - next-mdx-remote strips `attr={jsExpression}` values by default
// (the `blockJS` security setting in its `serialize()`), which silently
// emptied an earlier JSON-string-prop version of this component.
export function ExpertQAItem(_props: ExpertQAItemProps) {
  return null;
}

type ExpertQAProps = {
  name: string;
  role?: string;
  // One or two sentences of background/career context, shown under the
  // name and role, e.g. clubs worked at or years of experience.
  bio?: string;
  // Path to a small headshot, e.g. "/experts/paul-barry.jpg". Optional -
  // the header lays out fine without one.
  photoSrc?: string;
  photoAlt?: string;
  children?: React.ReactNode;
  sourceHref?: string;
  sourceLabel?: string;
  // Link shown under the name/role line, e.g. to the expert's own site
  // (Football DNA) - separate from sourceHref, which points back to the
  // Football Parent interview article this Q&A is drawn from.
  profileHref?: string;
  profileLabel?: string;
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

export default function ExpertQA({
  name,
  role,
  bio,
  photoSrc,
  photoAlt,
  children,
  sourceHref,
  sourceLabel,
  profileHref,
  profileLabel,
  design = "classic",
}: ExpertQAProps) {
  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<ExpertQAItemProps> =>
      React.isValidElement(child) && Boolean((child.props as ExpertQAItemProps)?.q)
  );

  if (!items.length) return null;

  if (design === "comic") {
    return (
      <ComicExpertQA
        items={items}
        name={name}
        role={role}
        bio={bio}
        photoSrc={photoSrc}
        photoAlt={photoAlt}
        sourceHref={sourceHref}
        sourceLabel={sourceLabel}
        profileHref={profileHref}
        profileLabel={profileLabel}
      />
    );
  }

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-amber-200">
      <div className="flex gap-3 border-b border-amber-200 bg-amber-100 px-4 py-3">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={photoAlt ?? name}
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : null}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Football Parent asks the expert
          </div>
          <div className="font-semibold text-gray-900">
            {name}
            {role ? `, ${role}` : ""}
          </div>
          {bio ? (
            <div className="mt-1 text-sm text-amber-900/80">{bio}</div>
          ) : null}
          {profileHref ? (
            <a
              href={profileHref}
              target="_blank"
              rel="noopener"
              className="mt-1 inline-block text-xs text-amber-900/80 underline underline-offset-2 hover:text-amber-950 transition"
            >
              {profileLabel ?? profileHref}
            </a>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-amber-200 bg-amber-50">
        {items.map((item, index) => (
          <div key={index} className="p-4">
            <div className="mb-2 flex gap-2 font-semibold text-gray-900">
              <span className="shrink-0 text-amber-700">Q.</span>
              <span>{item.props.q}</span>
            </div>
            <div className="flex gap-2 leading-8 text-gray-700">
              <span className="shrink-0 font-semibold text-amber-700">A.</span>
              <span>{item.props.children}</span>
            </div>
          </div>
        ))}
      </div>

      {sourceHref ? (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-right text-xs">
          <a
            href={sourceHref}
            className="text-amber-800 underline underline-offset-2 hover:text-amber-950 transition"
          >
            {sourceLabel ?? "Read the full interview"}
          </a>
        </div>
      ) : null}
    </div>
  );
}

// The comic-accent version: an ink-outlined card with a hard offset shadow, a
// yellow header band carrying the expert, and the answer set as a quote.
function ComicExpertQA({
  items,
  name,
  role,
  bio,
  photoSrc,
  photoAlt,
  sourceHref,
  sourceLabel,
  profileHref,
  profileLabel,
}: Omit<ExpertQAProps, "children" | "design"> & {
  items: React.ReactElement<ExpertQAItemProps>[];
}) {
  return (
    <div className="not-prose my-8 overflow-hidden rounded-2xl border-[3px] border-[#201E1D] bg-white shadow-[6px_6px_0_#201E1D]">
      <div className="flex items-center gap-4 border-b-[3px] border-[#201E1D] bg-[#FFC400] px-5 py-4">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={photoAlt ?? name}
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-full border-[3px] border-[#201E1D] bg-white object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <div className="mb-1 inline-block rounded-full border-2 border-[#201E1D] bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#201E1D]">
            Expert view
          </div>
          <div className="font-display text-[22px] font-extrabold leading-tight text-[#201E1D]">
            {name}
          </div>
          {role ? (
            <div className="text-sm font-semibold text-[#201E1D]">{role}</div>
          ) : null}
        </div>
      </div>

      {bio || profileHref ? (
        <div className="border-b-2 border-dashed border-[#C9C4BA] bg-[#FFF8E1] px-5 py-3 text-sm leading-6 text-[#3A3836]">
          {bio}
          {profileHref ? (
            <>
              {bio ? " " : null}
              <a
                href={profileHref}
                target="_blank"
                rel="noopener"
                className="font-bold underline underline-offset-2"
              >
                {profileLabel ?? profileHref}
              </a>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="divide-y-2 divide-dashed divide-[#C9C4BA]">
        {items.map((item, index) => (
          <div key={index} className="px-5 py-5">
            <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-[#1F5FD6]">
              Football Parent asks
            </div>
            <div className="mb-4 font-semibold leading-7 text-[#201E1D]">
              {item.props.q}
            </div>
            <div className="relative border-l-[5px] border-[#FFC400] pl-4 leading-8 text-[#3A3836] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3">
              {item.props.children}
            </div>
          </div>
        ))}
      </div>

      {sourceHref ? (
        <div className="border-t-[3px] border-[#201E1D] bg-white px-5 py-3 text-right">
          <a
            href={sourceHref}
            className="inline-block rounded-full border-2 border-[#201E1D] bg-[#FFC400] px-4 py-1.5 text-sm font-bold !text-[#201E1D] no-underline shadow-[3px_3px_0_#201E1D] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#201E1D]"
          >
            {sourceLabel ?? "Read the full interview"} →
          </a>
        </div>
      ) : null}
    </div>
  );
}
