import { Suspense } from "react";
import type { Metadata } from "next";
import SearchClient from "./search-client";

export const metadata: Metadata = {
  title: "Search | Football Parent",
  description: "Search Football Parent's guides on academy pathways, trials, development and more.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchClient />
    </Suspense>
  );
}
