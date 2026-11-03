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

// The comic-accent version ("Expert Q&A" on the homepage concepts canvas's
// "Article components" board): our question in the yellow caption, their
// answer in a speech bubble, and their photo, role and background under it,
// with the link to the full interview beside them.
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
    <div className="my-10 flex flex-col gap-[22px]">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <div className="max-w-[620px] rounded-xl border-[3px] border-[#201E1D] bg-[#FFE89A] px-[18px] py-[14px]">
            <p className="m-0 text-[13px] font-bold leading-[1.4] text-[#5A4A00]">
              Football Parent asks
            </p>
            <p className="m-0 mt-1 text-[17px] font-bold leading-[1.45] text-[#201E1D]">
              {item.props.q}
            </p>
          </div>
          <blockquote className="fp-bubble m-0 px-[26px] pt-[22px] pb-[6px] text-[17px] leading-[1.65] text-[#201E1D] [&_li]:mb-1.5 [&_p]:mb-4 [&_ul]:mb-4">
            {item.props.children}
          </blockquote>
        </React.Fragment>
      ))}

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3.5 pl-9">
        <span className="flex items-center gap-3.5">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt={photoAlt ?? name}
              width={66}
              height={66}
              className="h-[66px] w-[66px] shrink-0 rounded-full border-[3px] border-[#201E1D] object-cover"
            />
          ) : null}
          <span className="flex flex-col gap-0.5">
            <span className="text-[17px] font-bold leading-[1.3] text-[#201E1D]">{name}</span>
            {role ? (
              <span className="text-[15px] leading-[1.4] text-[#5A5650]">{role}</span>
            ) : null}
            {bio ? (
              <span className="mt-0.5 max-w-[440px] text-sm leading-[1.45] text-[#3A3836]">{bio}</span>
            ) : null}
            {profileHref ? (
              <a
                href={profileHref}
                target="_blank"
                rel="noopener"
                className="text-sm font-bold text-[#1F5FD6] underline underline-offset-2"
              >
                {profileLabel ?? profileHref}
              </a>
            ) : null}
          </span>
        </span>
        {sourceHref ? (
          <a
            href={sourceHref}
            className="text-base font-bold text-[#1F5FD6] underline underline-offset-[3px] hover:text-[#174AA8]"
          >
            {sourceLabel ?? "Read the full interview"}
          </a>
        ) : null}
      </div>
    </div>
  );
}
