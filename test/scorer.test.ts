import { describe, expect, it } from "vitest";
import { formatShareText, scoreCircuit } from "../src/scorer";

describe("scoreCircuit", () => {
  it("computes a positive delta when under par", () => {
    expect(scoreCircuit(3, 5)).toEqual({ gateCount: 3, par: 5, delta: 2 });
  });

  it("computes a zero delta at exact par", () => {
    expect(scoreCircuit(5, 5)).toEqual({ gateCount: 5, par: 5, delta: 0 });
  });

  it("computes a negative delta when over par", () => {
    expect(scoreCircuit(7, 5)).toEqual({ gateCount: 7, par: 5, delta: -2 });
  });
});

describe("formatShareText", () => {
  it("formats an under-par result without revealing the circuit", () => {
    const text = formatShareText("2026-07-06", scoreCircuit(3, 5));
    expect(text).toBe("Circuitle 2026-07-06 — 3 gates (+2)");
  });

  it("formats an exact-par result", () => {
    const text = formatShareText("2026-07-06", scoreCircuit(5, 5));
    expect(text).toBe("Circuitle 2026-07-06 — 5 gates (par)");
  });

  it("formats an over-par result", () => {
    const text = formatShareText("2026-07-06", scoreCircuit(7, 5));
    expect(text).toBe("Circuitle 2026-07-06 — 7 gates (-2)");
  });
});
