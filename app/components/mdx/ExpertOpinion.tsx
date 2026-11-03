type ExpertOpinionProps = {
  name: string;
  role?: string;
  // Organisation shown after the role, e.g. "Football DNA". With orgHref it
  // renders as a link styled like the surrounding title text (underlined,
  // same colour), not a blue body link.
  org?: string;
  orgHref?: string;
  children: React.ReactNode;
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

export default function ExpertOpinion({ name, role, org, orgHref, children, design = "classic" }: ExpertOpinionProps) {
  // Comic-accent design: the expert's words in a speech bubble with a quote
  // mark, pointing at their name underneath ("Expert quote" on the homepage
  // concepts canvas's "Article components" board).
  if (design === "comic") {
    return (
      <figure className="m-0 my-10">
        <blockquote className="fp-bubble m-0 px-7 pt-8 pb-[10px] text-[#201E1D] [&_p]:mb-4">
          <span
            aria-hidden="true"
            className="absolute -top-6 left-6 flex h-[46px] w-[46px] items-center justify-center rounded-full border-[3px] border-[#201E1D] bg-[#FFC400]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#201E1D" aria-hidden="true">
              <path d="M10 7H6.5A2.5 2.5 0 0 0 4 9.5V13h4v4h2V7zm10 0h-3.5A2.5 2.5 0 0 0 14 9.5V13h4v4h2V7z" />
            </svg>
          </span>
          {children}
        </blockquote>
        <figcaption className="mt-[34px] flex flex-col gap-0.5 pl-9">
          <span className="text-[17px] font-bold text-[#201E1D]">{name}</span>
          {role || org ? (
            <span className="text-[15px] leading-[1.4] text-[#5A5650]">
              {role}
              {role && org ? ", " : ""}
              {org && orgHref ? (
                <a href={orgHref} target="_blank" rel="noopener" className="underline underline-offset-2">
                  {org}
                </a>
              ) : (
                org
              )}
            </span>
          ) : null}
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="my-6 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4">
      <div className="mb-1 text-sm font-semibold text-amber-800">
        Expert opinion — {name}
        {role ? `, ${role}` : ""}
        {org ? ", " : ""}
        {org && orgHref ? (
          <a
            href={orgHref}
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2 hover:text-amber-950"
          >
            {org}
          </a>
        ) : (
          org
        )}
      </div>
      <div className="text-gray-700 leading-8">{children}</div>
    </div>
  );
}
