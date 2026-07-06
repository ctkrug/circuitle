import type { SignalRef } from "./types";
import { connect } from "./boardState";
import type { BoardState, ConnectResult, TargetPin } from "./boardState";

/** A clickable pin on the board: either a signal source or a wire target. */
export type PinId =
  | { kind: "input"; name: string }
  | { kind: "gateOutput"; gateId: string }
  | { kind: "gateInput"; gateId: string; inputIndex: number }
  | { kind: "output" };

type SourcePin = { kind: "input"; name: string } | { kind: "gateOutput"; gateId: string };
type TargetPinId = { kind: "gateInput"; gateId: string; inputIndex: number } | { kind: "output" };

export function isSourcePin(pin: PinId): pin is SourcePin {
  return pin.kind === "input" || pin.kind === "gateOutput";
}

function toSignalRef(pin: SourcePin): SignalRef {
  return pin.kind === "input" ? { kind: "input", name: pin.name } : { kind: "gate", id: pin.gateId };
}

function toTarget(pin: TargetPinId): TargetPin {
  return pin.kind === "output" ? { kind: "output" } : { kind: "gateInput", gateId: pin.gateId, inputIndex: pin.inputIndex };
}

/**
 * Attempts to wire two pins clicked in either order. Exactly one of the pair
 * must be a source (an input or a gate output) and the other a target (a
 * gate input or the circuit output) — clicking two sources or two targets is
 * a designed rejection, not a silent no-op.
 */
export function connectPins(state: BoardState, first: PinId, second: PinId): ConnectResult {
  const firstIsSource = isSourcePin(first);
  const secondIsSource = isSourcePin(second);

  if (firstIsSource && secondIsSource) {
    return { state, error: "connect an output to an input, not two outputs" };
  }
  if (!firstIsSource && !secondIsSource) {
    return { state, error: "connect an output to an input, not two inputs" };
  }

  const sourcePin = (firstIsSource ? first : second) as SourcePin;
  const targetPin = (firstIsSource ? second : first) as TargetPinId;
  return connect(state, toSignalRef(sourcePin), toTarget(targetPin));
}
