"use client";

import { useState } from "react";
import CoachSignUpForm from "@/app/components/CoachSignUpForm";
import {
  stashCalculatorSquad,
  type CalculatorFormat,
} from "@/lib/coach-app-calculator-handoff";
import { buildPlan } from "@/lib/playing-time-plan";

// Equal playing time calculator, embedded at the top of
// /coaching/equal-playing-time-in-grassroots-football.
//
// Two jobs. First, answer "playing time calculator" searches on the page:
// the maths is the article's own Sheffield FA method (outfield places x match
// length / outfield players available), and the initial state is the
// article's worked example, so the first server render shows a real answer
// rather than an empty form. Second, hand off to the Coach App where one
// match stops being enough: the season preview under the result, then the
// sign-up form, which carries the squad into the app's onboarding wizard
// (lib/coach-app-calculator-handoff.ts).
//
// The season preview's labels follow the app's real paywall
// (src/domain/access/capabilities.ts in coach-app): game-time minutes are
// free for good, goals/assists/clean sheets are the trial/paid "stats"
// feature. Keep them in step if that line moves.

const FORMATS: { key: CalculatorFormat; label: string; onPitch: number; hasKeeper: boolean }[] = [
  { key: "3v3", label: "3v3", onPitch: 3, hasKeeper: false },
  { key: "5v5", label: "5v5", onPitch: 5, hasKeeper: true },
  { key: "7v7", label: "7v7", onPitch: 7, hasKeeper: true },
  { key: "9v9", label: "9v9", onPitch: 9, hasKeeper: true },
  { key: "11v11", label: "11v11", onPitch: 11, hasKeeper: true },
];

const MAX_SQUAD = 30;
const SEASON_PREVIEW_MATCHES = 4;

function fmt(n: number): string {
  return String(Math.round(n));
}

function parseNames(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, MAX_SQUAD);
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600";

export default function PlayingTimeCalculator() {
  const [format, setFormat] = useState<CalculatorFormat>("7v7");
  const [periodType, setPeriodType] = useState<"halves" | "quarters">("halves");
  const [periodMinutes, setPeriodMinutes] = useState(25);
  const [squadSize, setSquadSize] = useState(10);
  const [namesRaw, setNamesRaw] = useState("");
  const [keeperStays, setKeeperStays] = useState(true);
  const [keeperName, setKeeperName] = useState("");

  const formatInfo = FORMATS.find((f) => f.key === format)!;
  const names = parseNames(namesRaw);
  const squad = names.length > 0 ? names.length : squadSize;
  const periods = periodType === "halves" ? 2 : 4;
  const matchMinutes = periods * periodMinutes;
  const keeperPinned = formatInfo.hasKeeper && keeperStays;

  // Named players, or "Player 1..n". With the keeper pinned, the chosen (or
  // first) name is the keeper and the rest rotate outfield.
  const allNames = names.length > 0 ? names : Array.from({ length: squad }, (_, i) => `Player ${i + 1}`);
  const keeper = keeperPinned ? (allNames.includes(keeperName) ? keeperName : allNames[0]) : null;
  const rotating = keeper ? allNames.filter((n, i) => n !== keeper || i !== allNames.indexOf(keeper)) : allNames;

  const valid = squad >= 1 && periodMinutes >= 1 && periodMinutes <= 60 && (!keeperPinned || squad >= 2);

  const plan = valid ? buildPlan(squad, formatInfo.onPitch, keeperPinned, matchMinutes, periods) : null;

  const minMinutes = plan ? Math.min(...plan.minutesByPlayer) : 0;
  const maxMinutes = plan ? Math.max(...plan.minutesByPlayer) : 0;

  function carrySquadToApp() {
    stashCalculatorSquad({
      format,
      periodType,
      periodMinutes,
      // Only real names travel. "Player 1" placeholders would just have to
      // be deleted again in the app.
      players: names,
      goalkeeper: names.length > 0 ? keeper : null,
      keeperPlaysWholeGame: keeperPinned,
    });
  }

  return (
    <section
      aria-labelledby="playing-time-calculator-heading"
      className="my-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 id="playing-time-calculator-heading" className="!mt-0 text-xl font-bold text-gray-900">
        Equal playing time calculator
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Enter your match and squad to get fair minutes for every player and a simple rotation plan.
      </p>

      {/* Inputs */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-1 text-sm font-semibold text-gray-800">Format</legend>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={format === f.key}
                onClick={() => setFormat(f.key)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  format === f.key ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300 text-gray-800 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-gray-800">
            Periods
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as "halves" | "quarters")}
              className={`${inputClass} mt-1 font-normal`}
            >
              <option value="halves">2 halves</option>
              <option value="quarters">4 quarters</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-800">
            Minutes each
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={periodMinutes}
              onChange={(e) => setPeriodMinutes(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
              className={`${inputClass} mt-1 font-normal`}
            />
          </label>
        </div>

        <label className="text-sm font-semibold text-gray-800 sm:col-span-2">
          Player names <span className="font-normal text-gray-500">(optional, comma or one per line)</span>
          <textarea
            rows={2}
            value={namesRaw}
            onChange={(e) => setNamesRaw(e.target.value)}
            placeholder="e.g. Alfie, Bea, Cal, Dev"
            className={`${inputClass} mt-1 font-normal`}
          />
        </label>

        {names.length === 0 && (
          <label className="text-sm font-semibold text-gray-800">
            Players available
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_SQUAD}
              value={squadSize}
              onChange={(e) => setSquadSize(Math.max(0, Math.min(MAX_SQUAD, Number(e.target.value) || 0)))}
              className={`${inputClass} mt-1 font-normal`}
            />
          </label>
        )}

        {formatInfo.hasKeeper && (
          <fieldset>
            <legend className="mb-1 text-sm font-semibold text-gray-800">Goalkeeper</legend>
            <div className="flex flex-wrap gap-2">
              {[
                { value: true, label: "Stays in goal all match" },
                { value: false, label: "Rotates too" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={keeperStays === o.value}
                  onClick={() => setKeeperStays(o.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    keeperStays === o.value ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300 text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {keeperStays && names.length > 1 && (
              <label className="mt-2 block text-sm text-gray-700">
                Who&apos;s in goal?
                <select value={keeper ?? ""} onChange={(e) => setKeeperName(e.target.value)} className={`${inputClass} mt-1`}>
                  {names.map((n, i) => (
                    <option key={`${n}-${i}`} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </fieldset>
        )}
      </div>

      {/* Result */}
      {!plan ? (
        <p className="mt-6 text-sm text-red-700" role="alert">
          Enter at least {keeperPinned ? "two players" : "one player"} and a period length between 1 and 60 minutes.
        </p>
      ) : (
        <div className="mt-6" aria-live="polite">
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              {plan.everyonePlaysAll ? "Everyone plays the whole match" : "Target per player"}
            </p>
            <p className="text-3xl font-bold text-blue-900">
              {fmt(plan.targetMinutes)} <span className="text-lg font-semibold">minutes</span>
            </p>
            <p className="mt-1 text-sm text-blue-900">
              {plan.outfieldPlaces} {keeperPinned ? "outfield " : ""}places x {matchMinutes} minutes ={" "}
              {plan.outfieldPlaces * matchMinutes} minutes, shared between {plan.outfieldPlayers}{" "}
              {keeperPinned ? "outfield players" : "players"}
              {keeper ? `. ${keeper} plays all ${matchMinutes} in goal.` : "."}
            </p>
          </div>

          {!plan.everyonePlaysAll && (
            <>
              <h3 className="mt-6 text-base font-semibold text-gray-900">Rotation plan</h3>
              <p className="text-sm text-gray-600">
                {plan.exact
                  ? `${plan.blocks.length} equal blocks. Everyone gets exactly the same minutes.`
                  : `Exactly equal minutes isn't possible in one match with ${plan.outfieldPlayers} players for ${plan.outfieldPlaces} places without constant subs, so this plan uses ${plan.blocks.length} blocks and minutes range from ${fmt(minMinutes)} to ${fmt(maxMinutes)}. Over a season, the difference can be evened out.`}
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="border-b border-gray-200 py-2 pr-3 font-semibold">Player</th>
                      {plan.blocks.map((b, i) => (
                        <th key={i} className="whitespace-nowrap border-b border-gray-200 px-2 py-2 text-center font-semibold">
                          {fmt(b.start)}-{fmt(b.end)}&apos;
                        </th>
                      ))}
                      <th className="border-b border-gray-200 py-2 pl-3 text-right font-semibold">Minutes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keeper && (
                      <tr>
                        <td className="border-b border-gray-100 py-2 pr-3 font-medium text-gray-900">{keeper} (GK)</td>
                        {plan.blocks.map((_, i) => (
                          <td key={i} className="border-b border-gray-100 px-2 py-2 text-center text-gray-900">
                            GK
                          </td>
                        ))}
                        <td className="border-b border-gray-100 py-2 pl-3 text-right font-semibold text-gray-900">{matchMinutes}</td>
                      </tr>
                    )}
                    {rotating.map((name, p) => (
                      <tr key={`${name}-${p}`}>
                        <td className="border-b border-gray-100 py-2 pr-3 font-medium text-gray-900">{name}</td>
                        {plan.blocks.map((b, i) => (
                          <td
                            key={i}
                            className={`border-b border-gray-100 px-2 py-2 text-center ${b.on.has(p) ? "text-gray-900" : "text-gray-400"}`}
                          >
                            {b.on.has(p) ? "On" : "Off"}
                          </td>
                        ))}
                        <td className="border-b border-gray-100 py-2 pl-3 text-right font-semibold text-gray-900">
                          {fmt(plan.minutesByPlayer[p])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Season preview: where one match stops being enough */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-base font-semibold text-gray-900">That&apos;s one match. Now do it all season.</h3>
            <p className="mt-1 text-sm text-gray-600">
              Next week someone&apos;s missing, someone arrives late, and one child has come off first three weeks
              running. The Coach App carries every player&apos;s minutes from match to match and builds each lineup
              to even them out.
            </p>
            <div className="mt-3 overflow-x-auto" aria-hidden="true">
              <table className="w-full border-collapse text-sm text-gray-500">
                <thead>
                  <tr className="text-left">
                    <th className="border-b border-gray-200 py-2 pr-3 font-semibold">Player</th>
                    {Array.from({ length: SEASON_PREVIEW_MATCHES }, (_, i) => (
                      <th key={i} className="border-b border-gray-200 px-2 py-2 text-center font-semibold">
                        M{i + 1}
                      </th>
                    ))}
                    <th className="border-b border-gray-200 px-2 py-2 text-center font-semibold">
                      Season
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-green-700">Free</span>
                    </th>
                    <th className="border-b border-gray-200 px-2 py-2 text-center font-semibold">
                      Goals
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-blue-700">Trial</span>
                    </th>
                    <th className="border-b border-gray-200 px-2 py-2 text-center font-semibold">
                      Assists
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-blue-700">Trial</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(keeper ? [keeper, ...rotating] : rotating).slice(0, 4).map((name, i) => {
                    const m1 = keeper && i === 0 ? matchMinutes : plan.minutesByPlayer[keeper ? i - 1 : i];
                    return (
                      <tr key={`${name}-${i}`}>
                        <td className="border-b border-gray-100 py-2 pr-3 text-gray-700">{name}</td>
                        <td className="border-b border-gray-100 px-2 py-2 text-center text-gray-900">{fmt(m1)}</td>
                        {Array.from({ length: SEASON_PREVIEW_MATCHES - 1 }, (_, j) => (
                          <td key={j} className="border-b border-gray-100 px-2 py-2 text-center">
                            -
                          </td>
                        ))}
                        <td className="border-b border-gray-100 px-2 py-2 text-center">-</td>
                        <td className="border-b border-gray-100 px-2 py-2 text-center">-</td>
                        <td className="border-b border-gray-100 px-2 py-2 text-center">-</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Fair game time is free in the app for good. Goals, assists and other match stats come with the free trial.
            </p>

            <div className="mt-5">
              <CoachSignUpForm
                heading={
                  names.length > 0
                    ? `Track ${names.length === 1 ? "this player" : `these ${names.length} players`} all season, free`
                    : "Track your squad's minutes all season, free"
                }
                source="calculator"
                onBeforeSignUp={carrySquadToApp}
              />
              {names.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Your squad and match setup carry straight into the app, so you won&apos;t type them in again. Names stay
                  in your browser until then.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
