// In-order fetch mock built on Node's real global Response class, so
// res.ok/res.status/res.text() all behave exactly as they would for a real
// HTTP response - scripts/seo/dataforseo/client.ts reads .text() (not
// .json()), which the repo's existing tests/helpers/mock-fetch.ts doesn't
// support, hence this separate helper.
export type MockStep = { status: number; body: unknown };

export function installMockFetch(steps: MockStep[]): {
  calls: { url: string; method?: string }[];
  restore: () => void;
} {
  const calls: { url: string; method?: string }[] = [];
  let i = 0;
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
    if (i >= steps.length) {
      throw new Error(`installMockFetch: unexpected extra fetch call #${i + 1}: ${init?.method ?? "GET"} ${url}`);
    }
    const step = steps[i++];
    return new Response(JSON.stringify(step.body), { status: step.status });
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}
