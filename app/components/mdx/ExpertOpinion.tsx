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
  const orgNode =
    org && orgHref ? (
      <a
        href={orgHref}
        target="_blank"
        rel="noopener"
        className="underline underline-offset-2"
      >
        {org}
      </a>
    ) : (
      org
    );

  if (design === "comic") {
    return (
      <div className="my-8 rounded-2xl border-[3px] border-[#201E1D] bg-[#FFF8E1] p-5 shadow-[6px_6px_0_#201E1D]">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#201E1D]">
          <span className="inline-block rounded-full border-2 border-[#201E1D] bg-[#FFC400] px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]">
            Expert opinion
          </span>
          <span>
            {name}
            {role ? `, ${role}` : ""}
            {org ? ", " : ""}
            {orgNode}
          </span>
        </div>
        <div className="border-l-[5px] border-[#FFC400] pl-4 leading-8 text-[#3A3836]">{children}</div>
      </div>
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
