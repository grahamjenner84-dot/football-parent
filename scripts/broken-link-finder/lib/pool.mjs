// Minimal concurrency-limited map - no dependency needed for something this small.
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        results[i] = { error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}
