export interface Score {
  gateCount: number;
  par: number;
  /** Positive = under par (better than the reference solution), 0 = exact par. */
  delta: number;
}

/**
 * Scores a solved circuit against par (the gate count of a known-good
 * minimal solution for that day's truth table). Lower gate counts are
 * better, matching golf-style scoring.
 */
export function scoreCircuit(gateCount: number, par: number): Score {
  return { gateCount, par, delta: par - gateCount };
}

/** Renders a score as a short, spoiler-free share string, Wordle-style. */
export function formatShareText(isoDate: string, score: Score): string {
  const sign = score.delta > 0 ? "-" : score.delta < 0 ? "+" : "";
  const relative = score.delta === 0 ? "par" : `${sign}${Math.abs(score.delta)}`;
  return `Circuitle ${isoDate} — ${score.gateCount} gates (${relative})`;
}
