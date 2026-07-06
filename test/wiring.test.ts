import { describe, expect, it } from "vitest";
import { createBoardState, placeGate } from "../src/boardState";
import { connectPins, isSourcePin } from "../src/wiring";

describe("isSourcePin", () => {
  it("classifies input and gate-output pins as sources", () => {
    expect(isSourcePin({ kind: "input", name: "A" })).toBe(true);
    expect(isSourcePin({ kind: "gateOutput", gateId: "g1" })).toBe(true);
  });

  it("classifies gate-input and circuit-output pins as targets", () => {
    expect(isSourcePin({ kind: "gateInput", gateId: "g1", inputIndex: 0 })).toBe(false);
    expect(isSourcePin({ kind: "output" })).toBe(false);
  });
});

describe("connectPins", () => {
  it("wires an input pin to a gate input regardless of click order", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });

    const forward = connectPins(state, { kind: "input", name: "A" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 });
    expect(forward.error).toBeNull();
    expect(forward.state.gates[0]?.inputs[0]).toEqual({ kind: "input", name: "A" });

    const backward = connectPins(state, { kind: "gateInput", gateId: "g1", inputIndex: 0 }, { kind: "input", name: "A" });
    expect(backward.error).toBeNull();
    expect(backward.state.gates[0]?.inputs[0]).toEqual({ kind: "input", name: "A" });
  });

  it("wires a gate output to the circuit output sink", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });

    const result = connectPins(state, { kind: "gateOutput", gateId: "g1" }, { kind: "output" });
    expect(result.error).toBeNull();
    expect(result.state.output).toEqual({ kind: "gate", id: "g1" });
  });

  it("rejects clicking two source pins (output to output)", () => {
    let state = createBoardState(["A", "B"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    const result = connectPins(state, { kind: "input", name: "A" }, { kind: "gateOutput", gateId: "g1" });
    expect(result.error).toMatch(/not two outputs/);
    expect(result.state).toBe(state);
  });

  it("rejects clicking two target pins (input to input)", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "AND", { x: 0, y: 0 });
    const result = connectPins(state, { kind: "output" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 });
    expect(result.error).toMatch(/not two inputs/);
  });

  it("propagates board-state validation errors (e.g. a cycle)", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    const result = connectPins(state, { kind: "gateOutput", gateId: "g1" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 });
    expect(result.error).toMatch(/own input/);
  });
});
