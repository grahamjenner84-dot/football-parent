"use client";

import { useEffect, useState } from "react";

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
// - The "?run=1" hand-off to the full page is produced by the frame itself;
//   it must never be put on the src.
const CALCULATOR_PATH = "/coach-app/game-time-calculator";
const HEIGHT_MESSAGE = "fp-calculator-height";
// Roughly the calculator with no squad entered, so the page does not jump
// when the first real height arrives.
const STARTING_HEIGHT = 700;
const MIN_HEIGHT = 320;

export default function CalculatorEmbed() {
  const [height, setHeight] = useState(STARTING_HEIGHT);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: unknown; height?: unknown } | null;
      if (!data || data.type !== HEIGHT_MESSAGE) return;
      if (typeof data.height !== "number" || !Number.isFinite(data.height)) return;
      setHeight(Math.max(MIN_HEIGHT, Math.ceil(data.height)));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div>
      <iframe
        src={CALCULATOR_PATH}
        title="Equal playing time calculator"
        className="block w-full rounded-2xl border border-gray-200"
        style={{ height, border: 0 }}
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
