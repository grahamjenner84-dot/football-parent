"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { useProgressBannerSeen } from "@/app/components/useProgressBannerSeen";

// The Progress banner's link outside the A/B test: a client island only so
// it can log "banner seen" (useProgressBannerSeen). The banner's content is
// still rendered on the server and passed in as children.
export default function ProgressBannerLink({
  banner,
  className,
  children,
}: {
  /** The ?b= value, e.g. progress-home. */
  banner: string;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  useProgressBannerSeen(ref, banner);
  return (
    <Link ref={ref} href={`/progress?b=${banner}`} className={className}>
      {children}
    </Link>
  );
}
