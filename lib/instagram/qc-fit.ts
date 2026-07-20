// Tier 3 (fit half): thin bridge to lib/instagram/slide-fit.ts, the SINGLE
// authoritative fit-measurement module, shared with Phase F's own pre-QC
// self-check (see that file's module comment for the full rationale and the
// real per-renderer geometry it replicates).
//
// This module keeps its own small API (FitCheckItem/FitFinding/checkFit)
// because qc-flow.ts's pre-Phase-F pipeline (content_queue.topic hook+
// points - a single plain string per point, parsed by qc-parse.ts, with no
// separate head/body field) is a simpler input shape than Phase F's
// generated slides. This just maps that shape onto slide-fit.ts's
// SlideFitInput (body always undefined, so slide-fit.ts's reel-core content
// measurement reduces to headline-only, exactly as before) and maps the
// result back onto the FitFinding shape qc-flow.ts's aggregation already
// expects, so that caller needs no changes.
//
// Previously this module duplicated the entire renderer-loading + geometry
// implementation for reel-core only. That implementation now lives in
// slide-fit.ts, which also covers single-slide-core and expert-quote-core
// for Phase F - see copy-qc-adapter.ts for how Phase F's QC path calls
// slide-fit.ts directly instead of through this bridge, since it has real
// head+body content this bridge's single-text-field shape can't carry.

import { checkSlideFit, SlideFitInput } from "./slide-fit";

export type SlideKind = "hook" | "content";

// Soft, editorial guidance (not a renderer constraint) for what reads well
// on a 1080x1920 vertical slide - tune freely.
const RECOMMENDED_MAX_LINES: Record<SlideKind, number> = { hook: 4, content: 3 };

export interface FitCheckItem {
  label: string;
  text: string;
  kind: SlideKind;
}

export interface FitFinding {
  label: string;
  kind: SlideKind;
  lines: number;
  hardMaxLines: number;
  recommendedMaxLines: number;
  overflow: boolean; // hard fail - would visually collide with the footer/handle at render time
  tooLong: boolean; // soft flag - fits, but more lines than good design wants
}

export function checkFit(items: FitCheckItem[]): FitFinding[] {
  return items.map((item) => {
    const input: SlideFitInput = { label: item.label, renderer: "reel-core", slideKind: item.kind, head: item.text };
    const result = checkSlideFit(input);
    const lines = result.headLines ?? 0;
    const hardMaxLines = result.headMaxLines ?? 0;
    const recommendedMaxLines = RECOMMENDED_MAX_LINES[item.kind];

    return {
      label: item.label,
      kind: item.kind,
      lines,
      hardMaxLines,
      recommendedMaxLines,
      overflow: !result.fits,
      tooLong: lines > recommendedMaxLines,
    };
  });
}
