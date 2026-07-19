// Sequential fetch mock: each call consumes the next queued step, in order.
// The Instagram publish flow is fully deterministic in what it calls and
// when, so a strict in-order queue (rather than URL-pattern matching) is
// simplest and catches accidental extra/missing calls as a hard error.
export interface MockStep {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface RecordedCall {
  url: string;
  method?: string;
  body?: string;
}

export interface MockFetch {
  calls: RecordedCall[];
  restore: () => void;
}

export function installMockFetch(steps: MockStep[]): MockFetch {
  const calls: RecordedCall[] = [];
  let i = 0;
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method, body: typeof init?.body === "string" ? init.body : undefined });
    if (i >= steps.length) {
      throw new Error(`installMockFetch: unexpected extra fetch call #${i + 1}: ${init?.method ?? "GET"} ${url}`);
    }
    const step = steps[i++];
    return {
      ok: step.status < 400,
      status: step.status,
      json: async () => step.body,
      headers: { get: (name: string) => step.headers?.[name.toLowerCase()] ?? null },
    } as unknown as Response;
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}
