"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { SearchIndexEntry } from "@/lib/search-index";
import { logSearchOnce } from "@/lib/search-log-client";

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") ?? "";

  const [inputValue, setInputValue] = useState(initialQuery);
  const [index, setIndex] = useState<SearchIndexEntry[] | null>(null);
  const fuseRef = useRef<Fuse<SearchIndexEntry> | null>(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setInputValue(initialQuery);
  }, [initialQuery]);

  const activeQuery = searchParams.get("q") ?? "";
  const results =
    fuseRef.current && activeQuery.trim()
      ? fuseRef.current.search(activeQuery.trim()).map((r) => r.item)
      : [];

  useEffect(() => {
    const trimmed = activeQuery.trim();
    if (!trimmed || !fuseRef.current) return;
    logSearchOnce(trimmed, results.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuery, index]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-8 md:pt-20 md:pb-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
            Search
          </h1>

          <form onSubmit={handleSubmit} className="mt-6 max-w-xl">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search articles..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-500"
              autoFocus
            />
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        {!activeQuery.trim() && (
          <p className="text-slate-600">Enter a search term above to find articles.</p>
        )}

        {activeQuery.trim() && index === null && (
          <p className="text-slate-600">Searching...</p>
        )}

        {activeQuery.trim() && index !== null && (
          <>
            <p className="mb-6 text-sm font-medium text-slate-500">
              {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{activeQuery}&rdquo;
            </p>

            {results.length === 0 && (
              <p className="text-slate-600">
                No articles matched. Try a different search, or browse our{" "}
                <Link href="/" className="font-semibold text-emerald-700 hover:text-emerald-800">
                  categories
                </Link>
                .
              </p>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {results.map((result) => (
                <Link
                  key={result.url}
                  href={result.url}
                  className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                >
                  <h2 className="text-xl font-bold tracking-tight text-slate-950 group-hover:text-emerald-700">
                    {result.title}
                  </h2>
                  <p className="mt-3 leading-7 text-slate-600">{result.description}</p>
                  <p className="mt-5 text-sm font-semibold text-emerald-700">Read guide →</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
