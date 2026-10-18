"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The Coach App's public game time calculator, embedded on the site's own
// calculator page. /coach-app is a Vercel rewrite to the app's deployment
// (vercel.json), so the frame is same-origin with this page: it shares
// localStorage (the saved squad, the cookie choice, the team hand-off at
// sign-up) and the app's X-Frame-Options: SAMEORIGIN allows it. The app
// detects that it is framed and adapts (src/data/embed.ts in the coach-app
// repo): no cookie sheet, no analytics tag, no heading of its own, Google
// sign-in and the touchline runner leave the frame for the top window.
//
// The contract with the app, kept in sync with that file:
// - src is the plain calculator path. No UTM parameters: inside the frame
//   they would be read as the visit's campaign and overwrite the real one.
// - The frame posts { type: "fp-calculator-height", height } to this page
//   whenever its content changes size, and this page sizes the iframe to
//   it. Only messages from our own origin are trusted.
// - This page posts { type: "fp-calculator-height-request" } to the frame
//   once it is listening and again when the frame loads, and the frame
//   answers with its height even if unchanged. The frame loads in parallel
//   with this page's JavaScript, so its first message can arrive before the
//   listener exists; it never re-sends an unchanged height, so without the
//   request the frame stayed at STARTING_HEIGHT with the calculator cut off
//   (seen 2026-10-18, fixed by zooming).
// - The "?run=1" hand-off to the full page is produced by the frame itself;
//   it must never be put on the src.
const CALCULATOR_PATH = "/coach-app/game-time-calculator";
const HEIGHT_MESSAGE = "fp-calculator-height";
const HEIGHT_REQUEST = "fp-calculator-height-request";
// Roughly the calculator with no squad entered, so the page does not jump
// when the first real height arrives.
const STARTING_HEIGHT = 700;
const MIN_HEIGHT = 320;
const FRAME_BORDER = 1;

export default function CalculatorEmbed() {
  const [height, setHeight] = useState(STARTING_HEIGHT);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Harmless if the calculator inside hasn't started yet: it sends its own
  // height when it does, and by then this page is listening.
  const requestHeight = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: HEIGHT_REQUEST }, window.location.origin);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: unknown; height?: unknown } | null;
      if (!data || data.type !== HEIGHT_MESSAGE) return;
      if (typeof data.height !== "number" || !Number.isFinite(data.height)) return;
      setHeight(Math.max(MIN_HEIGHT, Math.ceil(data.height)));
    };
    window.addEventListener("message", onMessage);
    requestHeight();
    return () => window.removeEventListener("message", onMessage);
  }, [requestHeight]);

  // The app lays the calculator out as a phone-width column (.calc-page is
  // max-width 480px, flush left), so the frame is that wide too: wider and
  // it is a dark box with the calculator pinned to its left edge. Full
  // width on a phone, where the page is narrower than this anyway.
  //
  // The outline is the theme's --border (globals.css), so it shows in both
  // modes: in light mode the calculator's white panels run edge to edge and
  // would otherwise meet the white page with nothing between them. The box
  // is border-box, so the frame is the reported height plus the two border
  // lines, or the content would scroll inside it by 2px.
  return (
    <div className="max-w-[480px]">
      <iframe
        ref={frameRef}
        onLoad={requestHeight}
        src={CALCULATOR_PATH}
        title="Equal playing time calculator"
        className="block w-full rounded-2xl"
        style={{ height: height + 2 * FRAME_BORDER, border: `${FRAME_BORDER}px solid var(--border)` }}
      />
      {/* A plain <a>, not next/link: /coach-app is outside the Next router
          (see ToolCallout.tsx). Doubles as the fallback if the frame fails. */}
      <p className="mt-3 text-sm text-gray-500">
        <a
          href={CALCULATOR_PATH}
          className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900"
        >
          Open the calculator full screen
        </a>
      </p>
    </div>
  );
}
