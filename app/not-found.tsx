import Link from "next/link";

// Next renders this inside the root layout, which is what makes the
// data-fp-not-found marker below worth having: PageViewPing is mounted in
// that same layout and would otherwise log every 404 as a page view. On
// 9 September a mistyped inbound link, /parent-guides/what-is-grassroots-football
// with a trailing colon, took 25 of the day's 81 recorded views and topped
// the report, for a URL that does not exist. See app/components/PageViewPing.tsx.
export const metadata = {
  title: "Page not found",
  // Belt and braces: a 404 should never be indexed, and Next's default page
  // does not set this itself.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div data-fp-not-found className="mx-auto max-w-2xl px-4 py-20">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
        404
      </p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900 lg:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-4 leading-8 text-gray-700">
        The link may be out of date, or have picked up a stray character on its
        way here. Nothing you did wrong.
      </p>

      <h2 className="mt-10 text-lg font-bold text-gray-900">
        Where most people are heading
      </h2>
      <ul className="mt-4 space-y-3">
        {[
          { href: "/academy-pathway", label: "Academy pathway" },
          { href: "/academy-trials", label: "Academy trials" },
          { href: "/parent-guides", label: "Parent guides" },
          { href: "/football-development", label: "Football development" },
          { href: "/girls-football", label: "Girls' football" },
          { href: "/football-gear", label: "Football gear" },
          { href: "/coaching", label: "Coaching" },
        ].map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 leading-8 text-gray-700">
        Or{" "}
        <Link
          href="/search"
          className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900"
        >
          search the site
        </Link>
        , or start from the{" "}
        <Link
          href="/"
          className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900"
        >
          home page
        </Link>
        .
      </p>
    </div>
  );
}
