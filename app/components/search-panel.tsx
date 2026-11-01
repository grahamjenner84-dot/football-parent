"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { SearchIndexEntry } from "@/lib/search-index";
import { logSearchOnce } from "@/lib/search-log-client";
import { searchArticles } from "@/lib/site-search";

const MAX_LIVE_RESULTS = 6;
// How long the query has to sit unchanged before it is logged as a search
// in its own right. 600ms was far too short: anyone typing at phone speed
// pauses that long mid-word, so a single search like "who to register
// child's 5 years old to become pro" was landing in the report as a dozen
// prefixes, each counted as a separate 0-result search. The dropdown now
// mostly logs on commit instead (a result click, submit, or closing the
// panel with a query in it), and this idle timer only catches the visitor
// who types, reads the results and then leaves the panel open.
const LOG_IDLE_MS = 3000;

export default function SearchPanel({ className = "" }: { className?: string }) {
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

  const results = fuseRef.current && index && query.trim()
    ? searchArticles(fuseRef.current, index, query).slice(0, MAX_LIVE_RESULTS)
    : [];

  // Most searches are satisfied straight from this dropdown (type, see a
  // match, click it) without ever hitting the /search page - previously
  // that meant only zero-result / submitted searches got logged at all,
  // skewing the report toward "no result" queries. Debounce so we log the
  // settled query once, not every keystroke.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !fuseRef.current || !index) return;
    const fuse = fuseRef.current;
    const timer = setTimeout(() => {
      logSearchOnce(trimmed, searchArticles(fuse, index, trimmed).length);
    }, LOG_IDLE_MS);
    return () => clearTimeout(timer);
  }, [query, index]);

  // Log the settled query when the panel closes (outside click, Escape, a
  // result click, or the header unmounting on navigation), so a search
  // that was abandoned before the idle timer fired still counts once, as
  // whatever the visitor had typed last, rather than as its prefixes.
  const latestRef = useRef({ query: "", resultCount: 0 });
  useEffect(() => {
    latestRef.current = { query: query.trim(), resultCount: results.length };
  }, [query, results.length]);
  useEffect(() => {
    if (open) return;
    const { query: settled, resultCount } = latestRef.current;
    if (settled && index) logSearchOnce(settled, resultCount);
  }, [open, index]);
  useEffect(() => {
    return () => {
      const { query: settled, resultCount } = latestRef.current;
      if (settled) logSearchOnce(settled, resultCount);
    };
  }, []);

  function goToResultsPage() {
    const trimmed = query.trim();
    if (!trimmed) return;
    logSearchOnce(trimmed, results.length);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const searchIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* From lg the trigger is drawn as the search box itself and the panel
          opens over it, with the real input in the same spot, so it reads as
          typing into the box. Below lg it is an icon button and the panel
          drops down under it. One component either way, so the index fetch
          and the search logging below are unchanged. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search articles"
        aria-expanded={open}
        className="hidden w-full items-center gap-2 text-left lg:flex"
      >
        <span className="block h-[46px] min-w-0 flex-1 truncate rounded-xl border-2 border-[#201E1D] bg-white px-3.5 text-base leading-[42px] text-[#6B6560]">
          Search guides: trials, the JPL, shin pads…
        </span>
        <span className="inline-flex h-[46px] w-[52px] shrink-0 items-center justify-center rounded-xl border-2 border-[#201E1D] bg-[#FFC400] text-[#201E1D] shadow-[3px_3px_0_#201E1D]">
          {searchIcon}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Search articles"
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border-2 border-[#201E1D] bg-[#FFC400] text-[#201E1D] shadow-[3px_3px_0_#201E1D] lg:hidden"
      >
        {searchIcon}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-80 rounded-xl border-2 border-[#201E1D] bg-white p-3 shadow-[6px_6px_0_#201E1D] sm:w-96 lg:left-0 lg:top-0 lg:w-full">
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
              placeholder="Search guides: trials, the JPL, shin pads…"
              aria-label="Search articles"
              className="w-full rounded-lg border-2 border-[#201E1D] px-3 py-2.5 text-base text-[#201E1D] outline-none focus:border-[#1F5FD6]"
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
                  onClick={() => {
                    logSearchOnce(query.trim(), results.length);
                    setOpen(false);
                  }}
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
                  className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-[#1F5FD6] hover:bg-slate-50"
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
