/** Best gate count achieved so far, keyed by ISO date. */
export type BestScores = Record<string, number>;

/**
 * Parses a stored best-scores blob, falling back to an empty record for
 * anything malformed (missing, invalid JSON, wrong shape, bad entries)
 * instead of throwing and breaking the app on load.
 */
export function parseBestScores(raw: string | null): BestScores {
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const result: BestScores = {};
  for (const [date, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      result[date] = value;
    }
  }
  return result;
}

/** Records `gateCount` for `isoDate` only if it improves (or sets) the best. */
export function recordScore(scores: BestScores, isoDate: string, gateCount: number): BestScores {
  const existing = scores[isoDate];
  if (existing !== undefined && existing <= gateCount) return scores;
  return { ...scores, [isoDate]: gateCount };
}

export function serializeBestScores(scores: BestScores): string {
  return JSON.stringify(scores);
}
