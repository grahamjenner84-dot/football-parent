// Rotation maths for the equal playing time calculator
// (app/components/mdx/PlayingTimeCalculator.tsx), kept apart from the UI so
// it can be checked on its own.

// Most rotation blocks a plan will use to get minutes exactly equal. Beyond
// this the plan stops being something a coach can run from the touchline, so
// it settles for a few blocks and says the minutes are uneven by one block.
const MAX_BLOCKS = 8;

export type Block = { start: number; end: number; on: Set<number> };

export type Plan = {
  outfieldPlaces: number;
  outfieldPlayers: number;
  targetMinutes: number;
  blocks: Block[];
  minutesByPlayer: number[];
  exact: boolean;
  everyonePlaysAll: boolean;
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Round-robin rotation over equal blocks: block b puts players
 * (b*places + j) mod players on for j < places, so nobody sits out twice
 * before everyone has sat out once. Indices are into the rotating group
 * (outfield players, or the whole squad when the keeper rotates too). */
export function buildPlan(squad: number, onPitch: number, keeperStays: boolean, matchMinutes: number, periods: number): Plan {
  const places = keeperStays ? onPitch - 1 : onPitch;
  const players = keeperStays ? squad - 1 : squad;

  if (players <= places) {
    const on = new Set(Array.from({ length: players }, (_, i) => i));
    return {
      outfieldPlaces: places,
      outfieldPlayers: players,
      targetMinutes: matchMinutes,
      blocks: [{ start: 0, end: matchMinutes, on }],
      minutesByPlayer: Array(players).fill(matchMinutes),
      exact: true,
      everyonePlaysAll: true,
    };
  }

  const perfect = players / gcd(players, places);
  const exact = perfect <= MAX_BLOCKS;
  // Not exact: two blocks per period keeps subs at halves/quarter breaks and
  // their midpoints, which a coach can actually run.
  const count = exact ? perfect : Math.min(MAX_BLOCKS, periods * 2);
  const length = matchMinutes / count;

  const blocks: Block[] = [];
  const minutes = Array(players).fill(0);
  for (let b = 0; b < count; b++) {
    const on = new Set<number>();
    for (let j = 0; j < places; j++) on.add((b * places + j) % players);
    on.forEach((p) => (minutes[p] += length));
    blocks.push({ start: b * length, end: (b + 1) * length, on });
  }

  return {
    outfieldPlaces: places,
    outfieldPlayers: players,
    targetMinutes: (places * matchMinutes) / players,
    blocks,
    minutesByPlayer: minutes,
    exact,
    everyonePlaysAll: false,
  };
}
