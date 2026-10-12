"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  progressBannerArmValue,
  type ProgressBannerArm,
  type ProgressBannerPlacement,
} from "@/lib/progress-banner-test";

// The client island of the Progress banner A/B test (lib/progress-banner-
// test.ts). Both arms arrive already rendered on the server; this only
// picks one, 50/50, once per mount, i.e. once per page view, and stores
// nothing. The server render, and the first render while hydrating, is arm
// A with the plain pre-test link; useSyncExternalStore then swaps in the
// drawn arm straight after hydration.

const noSubscribe = () => () => {};
const draw = (): ProgressBannerArm => (Math.random() < 0.5 ? "a" : "b");

export default function ProgressBannerTestArm({
  placement,
  className,
  a,
  b,
}: {
  placement: ProgressBannerPlacement;
  className: string;
  a: ReactNode;
  b: ReactNode;
}) {
  // One draw per mount: the holder lives as long as this component does.
  const [holder] = useState<{ arm?: ProgressBannerArm }>(() => ({}));
  const arm = useSyncExternalStore(
    noSubscribe,
    () => (holder.arm ??= draw()),
    () => null
  );
  const value = arm ? progressBannerArmValue(placement, arm) : `progress-${placement}`;
  return (
    <Link href={`/progress?b=${value}`} className={className}>
      {arm === "b" ? b : a}
    </Link>
  );
}
