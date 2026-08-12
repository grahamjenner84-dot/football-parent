"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { SearchIndexEntry } from "@/lib/search-index";

const MAX_LIVE_RESULTS = 6;

export default function SearchPanel() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndexEntry[] | null>(null);
  const fuseRef = useRef<Fuse<SearchIndexEntry> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open || index) return;
    fetch("/api/search-index")
      .then((res) => res.json())
      .then((data: SearchIndexEntry[]) => {
        setIndex(data);
        fuseRef.current = new Fuse(data, {
          keys: ["title", "description", "category"],
          threshold: 0.35,
        });
      })
      .catch(() => setIndex([]));
  }, [open, index]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const results = fuseRef.current && query.trim()
    ? fuseRef.current.search(query.trim(), { limit: MAX_LIVE_RESULTS }).map((r) => r.item)
    : [];

  function goToResultsPage() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Search articles"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:w-96">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goToResultsPage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </form>

          {query.trim() && (
            <div className="mt-2 max-h-80 overflow-y-auto">
              {index === null && (
                <p className="px-1 py-2 text-sm text-slate-500">Loading...</p>
              )}
              {index !== null && results.length === 0 && (
                <p className="px-1 py-2 text-sm text-slate-500">No matching articles.</p>
              )}
              {results.map((result) => (
                <Link
                  key={result.url}
                  href={result.url}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-2 no-underline transition hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-slate-900">{result.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{result.description}</p>
                </Link>
              ))}
              {results.length > 0 && (
                <button
                  type="button"
                  onClick={goToResultsPage}
                  className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-slate-50"
                >
                  See all results for &ldquo;{query.trim()}&rdquo; →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
