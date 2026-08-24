import { getConsentStats } from "@/lib/supabase/cookie-consent";

export const dynamic = "force-dynamic";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function CookieConsentAdminPage() {
  const stats = await getConsentStats(30);
  const decisions = stats.acceptAll + stats.rejectAll;
  const acceptRate = decisions > 0 ? stats.acceptAll / decisions : 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Cookie consent rate
        </h1>
        <p className="text-sm text-gray-500 mb-8">Last 30 days</p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Banner shown
            </p>
            <p className="text-2xl font-bold text-gray-900">{stats.bannerShown}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Accept all
            </p>
            <p className="text-2xl font-bold text-gray-900">{stats.acceptAll}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Reject
            </p>
            <p className="text-2xl font-bold text-gray-900">{stats.rejectAll}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Manage &amp; save
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.savePreferences}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Accept rate
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {decisions > 0 ? pct(acceptRate) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              of Accept all / Reject clicks only
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-10">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">
              {pct(stats.analyticsGrantedRate)}
            </span>{" "}
            of all {stats.totalDecisions} banner decisions ended with
            analytics cookies granted, and{" "}
            <span className="font-semibold">
              {pct(stats.advertisingGrantedRate)}
            </span>{" "}
            with advertising cookies granted (includes Accept all and any
            Manage &amp; save where the toggle was left on). Analytics is
            roughly the share of visitors GA can now see, down from ~100%
            before consent gating went live.
            {stats.bannerShown > 0 && (
              <>
                {" "}
                Of {stats.bannerShown} banner shows, {stats.totalDecisions} ended
                in a decision (
                {pct(
                  stats.totalDecisions > 0 ? stats.totalDecisions / stats.bannerShown : 0
                )}
                ) — the rest saw the banner but left without clicking
                Accept/Reject/Save, which also means GA doesn&apos;t see
                them.
              </>
            )}
          </p>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-3">By day</h2>
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="p-3 font-semibold text-gray-600">Date</th>
                <th className="p-3 font-semibold text-gray-600">Shown</th>
                <th className="p-3 font-semibold text-gray-600">Accept all</th>
                <th className="p-3 font-semibold text-gray-600">Reject</th>
                <th className="p-3 font-semibold text-gray-600">Manage &amp; save</th>
              </tr>
            </thead>
            <tbody>
              {stats.byDay.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-400" colSpan={5}>
                    No consent events recorded yet.
                  </td>
                </tr>
              ) : (
                stats.byDay.map((row) => (
                  <tr key={row.date} className="border-b border-gray-100 last:border-0">
                    <td className="p-3 text-gray-700">{row.date}</td>
                    <td className="p-3 text-gray-700">{row.bannerShown}</td>
                    <td className="p-3 text-gray-700">{row.acceptAll}</td>
                    <td className="p-3 text-gray-700">{row.rejectAll}</td>
                    <td className="p-3 text-gray-700">{row.savePreferences}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
