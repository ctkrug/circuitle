import { describe, expect, it } from "vitest";
import { createBoardState, placeGate } from "../src/boardState";
import { connect } from "../src/boardState";
import {
  DEFAULT_GATE_LAYOUT,
  findOverlappingGateId,
  gateBounds,
  gateInputPinPosition,
  gateOutputPinPosition,
  hitTestGateBody,
  hitTestPin,
  inputPinPosition,
  outputSinkPosition,
  resolvePinPosition,
  signalSourcePosition,
} from "../src/layout";

describe("gateBounds", () => {
  it("scales grid position and size by the grid spacing", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "AND", { x: 2, y: 1 });
    const bounds = gateBounds(state.gates[0]!);
    expect(bounds).toEqual({ x: 48, y: 24, width: 96, height: 72 });
  });
});

describe("gateInputPinPosition", () => {
  it("centers a unary gate's single input on the left edge", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    const pos = gateInputPinPosition(state.gates[0]!, 0);
    expect(pos).toEqual({ x: 0, y: 36 });
  });

  it("spreads a binary gate's two inputs top and bottom on the left edge", () => {
    let state = createBoardState(["A", "B"]);
    state = placeGate(state, "g1", "AND", { x: 0, y: 0 });
    const gate = state.gates[0]!;
    expect(gateInputPinPosition(gate, 0)).toEqual({ x: 0, y: 18 });
    expect(gateInputPinPosition(gate, 1)).toEqual({ x: 0, y: 54 });
  });
});

describe("gateOutputPinPosition", () => {
  it("sits at the vertical center of the right edge", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 1, y: 2 });
    expect(gateOutputPinPosition(state.gates[0]!)).toEqual({ x: 24 + 96, y: 48 + 36 });
  });
});

describe("inputPinPosition / outputSinkPosition", () => {
  it("spaces circuit inputs evenly down the left edge", () => {
    expect(inputPinPosition(0, 3, 400)).toEqual({ x: 0, y: 100 });
    expect(inputPinPosition(1, 3, 400)).toEqual({ x: 0, y: 200 });
    expect(inputPinPosition(2, 3, 400)).toEqual({ x: 0, y: 300 });
  });

  it("puts the output sink at the vertical center of the right edge", () => {
    expect(outputSinkPosition(600, 400)).toEqual({ x: 600, y: 200 });
  });
});

describe("hitTestPin", () => {
  it("finds a circuit input pin within hit range", () => {
    const state = createBoardState(["A", "B"]);
    const hit = hitTestPin(state, { x: 1, y: 133 }, 600, 400);
    expect(hit).toEqual({ kind: "input", name: "A" });
  });

  it("finds the output sink within hit range", () => {
    const state = createBoardState(["A"]);
    const hit = hitTestPin(state, { x: 598, y: 200 }, 600, 400);
    expect(hit).toEqual({ kind: "output" });
  });

  it("finds a gate's output pin", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    const outPos = gateOutputPinPosition(state.gates[0]!);
    const hit = hitTestPin(state, outPos, 600, 400);
    expect(hit).toEqual({ kind: "gateOutput", gateId: "g1" });
  });

  it("finds a gate's specific input pin among several", () => {
    let state = createBoardState(["A", "B"]);
    state = placeGate(state, "g1", "AND", { x: 0, y: 0 });
    const secondInput = gateInputPinPosition(state.gates[0]!, 1);
    const hit = hitTestPin(state, secondInput, 600, 400);
    expect(hit).toEqual({ kind: "gateInput", gateId: "g1", inputIndex: 1 });
  });

  it("returns null when no pin is near the point", () => {
    const state = createBoardState(["A"]);
    expect(hitTestPin(state, { x: 300, y: 300 }, 600, 400)).toBeNull();
  });

  it("returns null when a gate is placed but the point misses all of its pins", () => {
    let state = createBoardState(["A", "B"]);
    state = placeGate(state, "g1", "AND", { x: 0, y: 0 });
    expect(hitTestPin(state, { x: 300, y: 350 }, 600, 400)).toBeNull();
  });

  it("respects the configured hit radius boundary", () => {
    const state = createBoardState(["A"]);
    const tightLayout = { ...DEFAULT_GATE_LAYOUT, pinHitRadius: 2 };
    // the input pin for a single input at index 0 sits at (0, 200) on a 400-tall canvas
    expect(hitTestPin(state, { x: 0, y: 205 }, 600, 400, tightLayout)).toBeNull();
    expect(hitTestPin(state, { x: 0, y: 201 }, 600, 400, tightLayout)).toEqual({ kind: "input", name: "A" });
  });
});

describe("signalSourcePosition", () => {
  it("resolves an input reference to its pin position", () => {
    const state = createBoardState(["A", "B"]);
    expect(signalSourcePosition(state, { kind: "input", name: "B" }, 400)).toEqual(inputPinPosition(1, 2, 400));
  });

  it("resolves a gate reference to that gate's output pin", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    expect(signalSourcePosition(state, { kind: "gate", id: "g1" }, 400)).toEqual(gateOutputPinPosition(state.gates[0]!));
  });

  it("returns null for a reference to a gate that no longer exists", () => {
    const state = createBoardState(["A"]);
    expect(signalSourcePosition(state, { kind: "gate", id: "missing" }, 400)).toBeNull();
  });
});

describe("resolvePinPosition", () => {
  it("resolves every pin kind to a concrete position", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    state = connect(state, { kind: "input", name: "A" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 }).state;

    expect(resolvePinPosition(state, { kind: "input", name: "A" }, 600, 400)).toEqual(inputPinPosition(0, 1, 400));
    expect(resolvePinPosition(state, { kind: "output" }, 600, 400)).toEqual(outputSinkPosition(600, 400));
    expect(resolvePinPosition(state, { kind: "gateOutput", gateId: "g1" }, 600, 400)).toEqual(
      gateOutputPinPosition(state.gates[0]!),
    );
    expect(resolvePinPosition(state, { kind: "gateInput", gateId: "g1", inputIndex: 0 }, 600, 400)).toEqual(
      gateInputPinPosition(state.gates[0]!, 0),
    );
  });

  it("returns null when the referenced gate no longer exists", () => {
    const state = createBoardState(["A"]);
    expect(resolvePinPosition(state, { kind: "gateInput", gateId: "missing", inputIndex: 0 }, 600, 400)).toBeNull();
  });
});

describe("findOverlappingGateId", () => {
  it("returns null when the drop position is clear", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    expect(findOverlappingGateId(state, { x: 20, y: 20 })).toBeNull();
  });

  it("finds an exact-position overlap", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 3, y: 3 });
    expect(findOverlappingGateId(state, { x: 3, y: 3 })).toBe("g1");
  });

  it("finds a partial-overlap (not just an exact match)", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    // gate occupies grid x in [0,4), y in [0,3); a drop at (2, 1) overlaps it.
    expect(findOverlappingGateId(state, { x: 2, y: 1 })).toBe("g1");
  });

  it("does not flag gates that are merely adjacent, not overlapping", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    // gate footprint is 4 cells wide (widthCells=4) starting at x=0, so x=4 is flush adjacent.
    expect(findOverlappingGateId(state, { x: 4, y: 0 })).toBeNull();
  });
});

describe("hitTestGateBody", () => {
  it("finds a gate whose body contains the point", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    expect(hitTestGateBody(state, { x: 10, y: 10 })).toBe("g1");
  });

  it("returns null for a point outside every gate", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    expect(hitTestGateBody(state, { x: 1000, y: 1000 })).toBeNull();
  });

  it("prefers the last-placed (topmost) gate when bodies overlap", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    state = placeGate(state, "g2", "NOT", { x: 0, y: 0 });
    expect(hitTestGateBody(state, { x: 10, y: 10 })).toBe("g2");
  });
});
