type ToolCalloutProps = {
  heading: string;
  href: string;
  buttonLabel: string;
  children: React.ReactNode;
};

// A call-to-action card for a free tool, styled to match the light Coach App
// banner. Uses a plain <a> rather than next/link because the tools live under
// /coach-app/, a Vercel rewrite to a separate deployment that the Next router
// can't navigate to client-side.
export default function ToolCallout({
  heading,
  href,
  buttonLabel,
  children,
}: ToolCalloutProps) {
  return (
    <aside className="my-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 lg:p-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Free tool
      </p>
      <h3 className="mb-3 text-xl font-bold text-gray-900">{heading}</h3>
      <div className="mb-5 text-base leading-7 text-gray-700 [&_p]:mb-0 [&_p]:leading-7">
        {children}
      </div>
      <a
        href={href}
        className="inline-block rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white! transition-colors hover:bg-blue-800"
      >
        {buttonLabel}
      </a>
    </aside>
  );
}
