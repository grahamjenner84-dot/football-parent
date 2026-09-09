type ExpertQAItem = {
  q: string;
  a: string;
};

type ExpertQAProps = {
  name: string;
  role?: string;
  // One or two sentences of background/career context, shown under the
  // name and role, e.g. clubs worked at or years of experience.
  bio?: string;
  // JSON string, matching the GearPicks/InfoTable convention so the Q&A
  // stays authored in the MDX rather than hardcoded in the component.
  data?: string;
  sourceHref?: string;
  sourceLabel?: string;
};

export default function ExpertQA({
  name,
  role,
  bio,
  data = "[]",
  sourceHref,
  sourceLabel,
}: ExpertQAProps) {
  let items: ExpertQAItem[] = [];

  try {
    items = JSON.parse(data);
  } catch {
    items = [];
  }

  items = items.filter((item) => item && item.q && item.a);

  if (!items.length) return null;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-amber-200">
      <div className="border-b border-amber-200 bg-amber-100 px-4 py-3">
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
      </div>

      <div className="divide-y divide-amber-200 bg-amber-50">
        {items.map((item, index) => (
          <div key={index} className="p-4">
            <div className="mb-2 flex gap-2 font-semibold text-gray-900">
              <span className="shrink-0 text-amber-700">Q.</span>
              <span>{item.q}</span>
            </div>
            <div className="flex gap-2 leading-8 text-gray-700">
              <span className="shrink-0 font-semibold text-amber-700">A.</span>
              <span>{item.a}</span>
            </div>
          </div>
        ))}
      </div>

      {sourceHref ? (
        <div className="border-t border-amber-200 bg-white px-4 py-3 text-sm">
          <a
            href={sourceHref}
            className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 transition"
          >
            {sourceLabel ?? "Read the full interview"}
          </a>
        </div>
      ) : null}
    </div>
  );
}
