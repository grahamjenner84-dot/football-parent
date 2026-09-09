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
  children?: React.ReactNode;
  sourceHref?: string;
  sourceLabel?: string;
};

export default function ExpertQA({
  name,
  role,
  bio,
  children,
  sourceHref,
  sourceLabel,
}: ExpertQAProps) {
  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<ExpertQAItemProps> =>
      React.isValidElement(child) && Boolean((child.props as ExpertQAItemProps)?.q)
  );

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
