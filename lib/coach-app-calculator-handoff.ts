// Hands the squad from the equal playing time calculator to the Coach App's
// onboarding wizard, so a coach who signs up from the calculator doesn't
// retype their players.
//
// Same shared-origin localStorage route as lib/coach-app-handoff.ts: the app
// is served at /coach-app/ via a Vercel rewrite, so it can read what this
// site writes.
//
// Keep STORAGE_KEY and the shape below in sync with
// src/data/calculatorHandoff.ts in the coach-app repo. There is no shared
// package between the two, so that pair of files is the contract.
//
// Children's first names, so:
//  - written only when the coach taps a sign-up button under the calculator
//    (never while typing, never on page load);
//  - never sent anywhere by this site: it sits in the coach's own browser
//    until the app reads it, and the app deletes it once the team exists;
//  - not consent-gated like the landing handoff, because it isn't
//    measurement. It is the thing the coach just asked for ("carry my squad
//    over"), and without it the feature doesn't exist.

const STORAGE_KEY = "fp-calculator-squad";

export type CalculatorFormat = "3v3" | "5v5" | "7v7" | "9v9" | "11v11";

export type CalculatorSquad = {
  format: CalculatorFormat;
  periodType: "halves" | "quarters";
  periodMinutes: number;
  players: string[];
  /** One of `players`, or null. Only meaningful when keeperPlaysWholeGame. */
  goalkeeper: string | null;
  keeperPlaysWholeGame: boolean;
  /** The app's "Position rotation" rule: true = Rotate positions. */
  rotatePositions: boolean;
};

export function stashCalculatorSquad(squad: CalculatorSquad): void {
  const players = squad.players.map((p) => p.trim()).filter(Boolean);
  // Nothing worth carrying: the wizard's own empty squad step is no worse.
  if (players.length === 0) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...squad, players, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Private mode or site data blocked: the coach types the names in the
    // app instead. Never let this get between someone and signing up.
  }
}
