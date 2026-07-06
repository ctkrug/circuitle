import { describe, expect, it } from "vitest";
import {
  connect,
  createBoardState,
  disconnect,
  gateCount,
  moveGate,
  placeGate,
  removeGate,
  toCircuit,
} from "../src/boardState";

describe("createBoardState", () => {
  it("starts empty with no output wired", () => {
    const state = createBoardState(["A", "B", "C"]);
    expect(state.gates).toEqual([]);
    expect(state.output).toBeNull();
    expect(toCircuit(state)).toBeNull();
  });
});

describe("placeGate", () => {
  it("adds a gate with the right arity of unwired input slots", () => {
    let state = createBoardState(["A", "B"]);
    state = placeGate(state, "g1", "AND", { x: 2, y: 3 });
    state = placeGate(state, "g2", "NOT", { x: 5, y: 1 });

    expect(gateCount(state)).toBe(2);
    expect(state.gates[0]).toEqual({ id: "g1", type: "AND", position: { x: 2, y: 3 }, inputs: [null, null] });
    expect(state.gates[1]?.inputs).toEqual([null]);
  });
});

describe("moveGate", () => {
  it("updates only the targeted gate's position", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    state = placeGate(state, "g2", "NOT", { x: 1, y: 1 });
    state = moveGate(state, "g1", { x: 9, y: 9 });

    expect(state.gates.find((g) => g.id === "g1")?.position).toEqual({ x: 9, y: 9 });
    expect(state.gates.find((g) => g.id === "g2")?.position).toEqual({ x: 1, y: 1 });
  });
});

describe("connect", () => {
  it("wires an input into a gate's slot", () => {
    let state = createBoardState(["A", "B"]);
    state = placeGate(state, "g1", "AND", { x: 0, y: 0 });
    const result = connect(state, { kind: "input", name: "A" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 });

    expect(result.error).toBeNull();
    expect(result.state.gates[0]?.inputs[0]).toEqual({ kind: "input", name: "A" });
  });

  it("wires a gate output into the circuit output sink", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    const result = connect(state, { kind: "gate", id: "g1" }, { kind: "output" });

    expect(result.error).toBeNull();
    expect(result.state.output).toEqual({ kind: "gate", id: "g1" });
  });

  it("rejects a source that does not exist", () => {
    const state = createBoardState(["A"]);
    const result = connect(state, { kind: "input", name: "Z" }, { kind: "output" });
    expect(result.error).toMatch(/unknown signal source/);
    expect(result.state).toBe(state);
  });

  it("rejects wiring into an unknown gate", () => {
    const state = createBoardState(["A"]);
    const result = connect(state, { kind: "input", name: "A" }, { kind: "gateInput", gateId: "missing", inputIndex: 0 });
    expect(result.error).toMatch(/unknown gate/);
  });

  it("rejects an out-of-range input index", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    const result = connect(state, { kind: "input", name: "A" }, { kind: "gateInput", gateId: "g1", inputIndex: 1 });
    expect(result.error).toMatch(/invalid input index/);
  });

  it("rejects a gate feeding its own input directly", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    const result = connect(state, { kind: "gate", id: "g1" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 });
    expect(result.error).toMatch(/own input/);
  });

  it("rejects a connection that would create a transitive cycle", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    state = placeGate(state, "g2", "NOT", { x: 1, y: 0 });
    // g2's input <- g1
    state = connect(state, { kind: "gate", id: "g1" }, { kind: "gateInput", gateId: "g2", inputIndex: 0 }).state;

    // g1's input <- g2 would close the loop g1 -> g2 -> g1
    const result = connect(state, { kind: "gate", id: "g2" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 });
    expect(result.error).toMatch(/cycle/);
  });

  it("allows re-wiring an already-wired slot (last connect wins)", () => {
    let state = createBoardState(["A", "B"]);
    state = placeGate(state, "g1", "AND", { x: 0, y: 0 });
    state = connect(state, { kind: "input", name: "A" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 }).state;
    const result = connect(state, { kind: "input", name: "B" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 });

    expect(result.error).toBeNull();
    expect(result.state.gates[0]?.inputs[0]).toEqual({ kind: "input", name: "B" });
  });
});

describe("disconnect", () => {
  it("clears a gate input slot back to null", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    state = connect(state, { kind: "input", name: "A" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 }).state;
    state = disconnect(state, { kind: "gateInput", gateId: "g1", inputIndex: 0 });

    expect(state.gates[0]?.inputs[0]).toBeNull();
  });

  it("leaves other gates' inputs untouched", () => {
    let state = createBoardState(["A", "B"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    state = placeGate(state, "g2", "NOT", { x: 100, y: 0 });
    state = connect(state, { kind: "input", name: "A" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 }).state;
    state = connect(state, { kind: "input", name: "B" }, { kind: "gateInput", gateId: "g2", inputIndex: 0 }).state;

    state = disconnect(state, { kind: "gateInput", gateId: "g1", inputIndex: 0 });

    expect(state.gates.find((g) => g.id === "g1")?.inputs[0]).toBeNull();
    expect(state.gates.find((g) => g.id === "g2")?.inputs[0]).toEqual({ kind: "input", name: "B" });
  });

  it("clears the circuit output sink", () => {
    let state = createBoardState(["A"]);
    state = connect(state, { kind: "input", name: "A" }, { kind: "output" }).state;
    state = disconnect(state, { kind: "output" });
    expect(state.output).toBeNull();
  });
});

describe("removeGate", () => {
  it("drops the gate and clears references to it from other gates and the output", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    state = placeGate(state, "g2", "NOT", { x: 1, y: 0 });
    state = connect(state, { kind: "gate", id: "g1" }, { kind: "gateInput", gateId: "g2", inputIndex: 0 }).state;
    state = connect(state, { kind: "gate", id: "g2" }, { kind: "output" }).state;

    state = removeGate(state, "g1");

    expect(state.gates).toHaveLength(1);
    expect(state.gates[0]?.inputs[0]).toBeNull();
    expect(state.output).toEqual({ kind: "gate", id: "g2" });
  });

  it("clears the output when the removed gate drove it", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    state = connect(state, { kind: "gate", id: "g1" }, { kind: "output" }).state;
    state = removeGate(state, "g1");
    expect(state.output).toBeNull();
  });
});

describe("toCircuit", () => {
  it("returns null when the output is unwired", () => {
    let state = createBoardState(["A"]);
    state = placeGate(state, "g1", "NOT", { x: 0, y: 0 });
    expect(toCircuit(state)).toBeNull();
  });

  it("returns null when any gate has an unwired input", () => {
    let state = createBoardState(["A", "B"]);
    state = placeGate(state, "g1", "AND", { x: 0, y: 0 });
    state = connect(state, { kind: "input", name: "A" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 }).state;
    state = connect(state, { kind: "gate", id: "g1" }, { kind: "output" }).state;
    expect(toCircuit(state)).toBeNull();
  });

  it("builds a fully-wired circuit ready for evaluation", () => {
    let state = createBoardState(["A", "B"]);
    state = placeGate(state, "g1", "AND", { x: 0, y: 0 });
    state = connect(state, { kind: "input", name: "A" }, { kind: "gateInput", gateId: "g1", inputIndex: 0 }).state;
    state = connect(state, { kind: "input", name: "B" }, { kind: "gateInput", gateId: "g1", inputIndex: 1 }).state;
    state = connect(state, { kind: "gate", id: "g1" }, { kind: "output" }).state;

    expect(toCircuit(state)).toEqual({
      inputs: ["A", "B"],
      gates: [{ id: "g1", type: "AND", inputs: [{ kind: "input", name: "A" }, { kind: "input", name: "B" }] }],
      output: { kind: "gate", id: "g1" },
    });
  });

  it("allows wiring an input straight to the output with zero gates", () => {
    let state = createBoardState(["A"]);
    state = connect(state, { kind: "input", name: "A" }, { kind: "output" }).state;
    expect(toCircuit(state)).toEqual({ inputs: ["A"], gates: [], output: { kind: "input", name: "A" } });
  });
});
