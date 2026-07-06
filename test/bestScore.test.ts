import { describe, expect, it } from "vitest";
import { parseBestScores, recordScore, serializeBestScores } from "../src/bestScore";

describe("parseBestScores", () => {
  it("returns an empty record for null (no stored value yet)", () => {
    expect(parseBestScores(null)).toEqual({});
  });

  it("returns an empty record for an empty string", () => {
    expect(parseBestScores("")).toEqual({});
  });

  it("returns an empty record for malformed JSON", () => {
    expect(parseBestScores("{not json")).toEqual({});
  });

  it("returns an empty record when the JSON is not an object", () => {
    expect(parseBestScores("[1,2,3]")).toEqual({});
    expect(parseBestScores("42")).toEqual({});
    expect(parseBestScores('"hello"')).toEqual({});
    expect(parseBestScores("null")).toEqual({});
  });

  it("drops non-numeric, negative, and non-finite entries but keeps valid ones", () => {
    const raw = JSON.stringify({
      "2026-07-01": 4,
      "2026-07-02": "3",
      "2026-07-03": -1,
      "2026-07-04": Infinity,
      "2026-07-05": 0,
    });
    expect(parseBestScores(raw)).toEqual({ "2026-07-01": 4, "2026-07-05": 0 });
  });

  it("round-trips through serializeBestScores", () => {
    const scores = { "2026-07-01": 3, "2026-07-02": 5 };
    expect(parseBestScores(serializeBestScores(scores))).toEqual(scores);
  });
});

describe("recordScore", () => {
  it("sets a first-time score for a date", () => {
    expect(recordScore({}, "2026-07-06", 4)).toEqual({ "2026-07-06": 4 });
  });

  it("replaces an existing score with a strictly lower gate count", () => {
    const scores = { "2026-07-06": 5 };
    expect(recordScore(scores, "2026-07-06", 3)).toEqual({ "2026-07-06": 3 });
  });

  it("keeps the existing score when the new count is not an improvement", () => {
    const scores = { "2026-07-06": 3 };
    expect(recordScore(scores, "2026-07-06", 5)).toEqual({ "2026-07-06": 3 });
    expect(recordScore(scores, "2026-07-06", 3)).toEqual({ "2026-07-06": 3 });
  });

  it("does not mutate the input record", () => {
    const scores = { "2026-07-06": 5 };
    recordScore(scores, "2026-07-06", 3);
    expect(scores).toEqual({ "2026-07-06": 5 });
  });

  it("leaves other dates untouched", () => {
    const scores = { "2026-07-05": 2 };
    expect(recordScore(scores, "2026-07-06", 4)).toEqual({ "2026-07-05": 2, "2026-07-06": 4 });
  });
});
