import { describe, expect, it } from "vitest";
import { easeOutCubic, lerp, snapToGrid } from "../src/easing";

describe("easeOutCubic", () => {
  it("starts at 0 and ends at 1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("clamps values outside [0, 1]", () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });

  it("is monotonically non-decreasing across the range", () => {
    let prev = -Infinity;
    for (let t = 0; t <= 1; t += 0.05) {
      const value = easeOutCubic(t);
      expect(value).toBeGreaterThanOrEqual(prev);
      prev = value;
    }
  });

  it("front-loads progress (ease-out is faster than linear early on)", () => {
    expect(easeOutCubic(0.25)).toBeGreaterThan(0.25);
  });
});

describe("lerp", () => {
  it("returns a at t=0 and b at t=1", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it("interpolates the midpoint", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it("extrapolates outside [0, 1]", () => {
    expect(lerp(0, 10, 1.5)).toBe(15);
  });
});

describe("snapToGrid", () => {
  it("snaps to the nearest multiple of the spacing", () => {
    expect(snapToGrid(10, 24)).toBe(0);
    expect(snapToGrid(13, 24)).toBe(24);
    expect(snapToGrid(24, 24)).toBe(24);
  });

  it("handles negative values", () => {
    expect(snapToGrid(-10, 24)).toBe(-0);
    expect(snapToGrid(-20, 24)).toBe(-24);
  });

  it("handles zero spacing input of zero", () => {
    expect(snapToGrid(0, 24)).toBe(0);
  });
});
