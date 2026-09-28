type ExpertOpinionProps = {
  name: string;
  role?: string;
  // Organisation shown after the role, e.g. "Football DNA". With orgHref it
  // renders as a link styled like the surrounding title text (underlined,
  // same colour), not a blue body link.
  org?: string;
  orgHref?: string;
  children: React.ReactNode;
};

export default function ExpertOpinion({ name, role, org, orgHref, children }: ExpertOpinionProps) {
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
