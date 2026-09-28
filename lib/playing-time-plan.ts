// Rotation maths for the equal playing time calculator
// (app/components/mdx/PlayingTimeCalculator.tsx), kept apart from the UI so
// it can be checked on its own.
//
// Deliberately plans the way the Coach App does: one lineup per half or
// quarter, changes only at the breaks, each period going to whoever has
// played least so far (coach-app src/domain/lineup/generateLineup.ts,
// selectForPeriod). A coach who signs up from the calculator then sees the
// same split in the app, rather than a mid-period plan the app never builds.
// That means minutes are only exactly equal when the places divide evenly;
// otherwise they differ by one period, as they would in the app.

export type Period = { index: number; start: number; end: number; on: Set<number> };

export type Plan = {
  outfieldPlaces: number;
  outfieldPlayers: number;
  /** The fair share with perfect rotation: places x match length / players.
   * The article's formula. Only reachable per match when `exact`. */
  fairShareMinutes: number;
  periods: Period[];
  minutesByPlayer: number[];
  /** Everyone in the rotation gets the same minutes. */
  exact: boolean;
  everyonePlaysAll: boolean;
};

export type PositionCategory = "GK" | "DEF" | "MID" | "FWD";

/** Each format's default formation in the app's onboarding wizard (the first
 * one listed per format in coach-app src/domain/lineup/formations.ts), as the
 * positions a team fields. */
export const DEFAULT_FORMATION: Record<string, { label: string; slots: PositionCategory[] }> = {
  "3v3": { label: "1-1-1", slots: ["DEF", "MID", "FWD"] },
  "5v5": { label: "1-2-1", slots: ["GK", "DEF", "MID", "MID", "FWD"] },
  "7v7": { label: "2-3-1", slots: ["GK", "DEF", "DEF", "MID", "MID", "MID", "FWD"] },
  "9v9": { label: "3-3-2", slots: ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD"] },
  "11v11": { label: "4-4-2", slots: ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD"] },
};

/** Rotates positions across the plan's periods, the idea behind the app's
 * "Rotate positions" rule: each period, every slot goes to the player on the
 * pitch who has played that position least so far this match, avoiding a
 * repeat of their last position where there's a choice. Returns, per period,
 * player index -> position. `slots` are the positions the rotating group
 * fills: the formation without GK when the keeper stays in goal. */
export function rotatePositions(plan: Plan, slots: PositionCategory[]): Map<number, PositionCategory>[] {
  const played = new Map<number, Record<PositionCategory, number>>();
  const last = new Map<number, PositionCategory>();
  const countFor = (p: number) => {
    if (!played.has(p)) played.set(p, { GK: 0, DEF: 0, MID: 0, FWD: 0 });
    return played.get(p)!;
  };

  // Cheapest (player, slot) pair first, across the whole period, rather than
  // filling slots in order: filling in order leaves the last slots to
  // whoever's left, which repeats positions more than it needs to.
  const cost = (p: number, slot: PositionCategory) => countFor(p)[slot] * 10 + (last.get(p) === slot ? 5 : 0);

  return plan.periods.map((period) => {
    const freePlayers = [...period.on].sort((a, b) => a - b);
    const freeSlots = slots.slice(0, freePlayers.length);
    const assigned = new Map<number, PositionCategory>();
    while (freePlayers.length > 0 && freeSlots.length > 0) {
      let bestP = 0;
      let bestS = 0;
      for (let i = 0; i < freePlayers.length; i++)
        for (let j = 0; j < freeSlots.length; j++)
          if (cost(freePlayers[i], freeSlots[j]) < cost(freePlayers[bestP], freeSlots[bestS])) {
            bestP = i;
            bestS = j;
          }
      const p = freePlayers.splice(bestP, 1)[0];
      const slot = freeSlots.splice(bestS, 1)[0];
      assigned.set(p, slot);
    }
    for (const [p, slot] of assigned) {
      countFor(p)[slot] += 1;
      last.set(p, slot);
    }
    return assigned;
  });
}

/** Round-robin over the periods: period k puts players
 * (k*places + j) mod players on for j < places. That is one valid
 * "fewest periods so far goes next" order, so nobody sits out twice before
 * everyone has sat out once, and the counts match the app's. Indices are
 * into the rotating group (outfield players, or the whole squad when the
 * keeper rotates too). */
export function buildPlan(squad: number, onPitch: number, keeperStays: boolean, periodMinutes: number, periodCount: number): Plan {
  const places = keeperStays ? onPitch - 1 : onPitch;
  const players = keeperStays ? squad - 1 : squad;
  const matchMinutes = periodMinutes * periodCount;

  const periods: Period[] = [];
  const minutes = Array(Math.max(0, players)).fill(0);
  for (let k = 0; k < periodCount; k++) {
    const on = new Set<number>();
    for (let j = 0; j < Math.min(places, players); j++) on.add((k * places + j) % players);
    on.forEach((p) => (minutes[p] += periodMinutes));
    periods.push({ index: k, start: k * periodMinutes, end: (k + 1) * periodMinutes, on });
  }

  const everyonePlaysAll = players <= places;
  const exact = minutes.every((m) => m === minutes[0]);

  return {
    outfieldPlaces: places,
    outfieldPlayers: players,
    fairShareMinutes: everyonePlaysAll ? matchMinutes : (places * matchMinutes) / players,
    periods,
    minutesByPlayer: minutes,
    exact,
    everyonePlaysAll,
  };
}
