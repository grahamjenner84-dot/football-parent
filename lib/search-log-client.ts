"use client";

// Module-level (not per-component) dedup set: SearchPanel (header dropdown)
// and SearchClient (/search page) both call this, and since the header
// stays mounted across a client-side navigation from the dropdown to
// /search?q=..., a shared set here stops the same query being logged twice
// - once while the user was typing in the dropdown, once again when the
// results page mounts with the same ?q=.
const logged = new Set<string>();

export function logSearchOnce(query: string, resultCount: number) {
  const trimmed = query.trim();
  const key = trimmed.toLowerCase();
  if (!key || logged.has(key)) return;
  logged.add(key);

  fetch("/api/log-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: trimmed, resultCount }),
  }).catch(() => {});
}
