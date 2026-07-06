import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32, randInt } from "../src/rng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toEqual(b);
  });

  it("stays within [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("hashSeed", () => {
  it("is deterministic for the same string", () => {
    expect(hashSeed("circuitle:2026-07-06")).toEqual(hashSeed("circuitle:2026-07-06"));
  });

  it("differs across distinct strings", () => {
    expect(hashSeed("circuitle:2026-07-06")).not.toEqual(hashSeed("circuitle:2026-07-07"));
  });
});

describe("randInt", () => {
  it("stays within [0, max)", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const value = randInt(rng, 10);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(10);
    }
  });
});
