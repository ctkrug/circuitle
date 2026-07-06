import type { AudioContextCtor, Synth } from "./audio";
import { createSynth } from "./audio";
import { BoardRenderer } from "./board";
import type { BoardState, GridPosition } from "./boardState";
import { createBoardState, moveGate, placeGate, removeGate, toCircuit } from "./boardState";
import type { BestScores } from "./bestScore";
import { parseBestScores, recordScore, serializeBestScores } from "./bestScore";
import { countGates, evaluateCircuit } from "./evaluator";
import {
  DEFAULT_GATE_LAYOUT,
  gateInputPinPosition,
  hitTestGateBody,
  hitTestPin,
  outputSinkPosition,
  resolvePinPosition,
  signalSourcePosition,
} from "./layout";
import type { Point } from "./layout";
import { computePar } from "./par";
import { formatShareText, scoreCircuit } from "./scorer";
import type { Score } from "./scorer";
import { dailyTruthTable, todayIsoDate } from "./truthTable";
import type { Circuit, GateType, SignalRef, TruthTable } from "./types";
import { GATE_ARITY } from "./types";
import type { PinId } from "./wiring";
import { connectPins, isSourcePin } from "./wiring";

const MUTE_STORAGE_KEY = "circuitle:muted";
const BEST_SCORE_STORAGE_KEY = "circuitle:bestScores";
const TOAST_VISIBLE_MS = 2400;
const WIN_STEP_MS = 600;

export interface GameRefs {
  canvas: HTMLCanvasElement;
  status: HTMLElement;
  truthTable: HTMLElement;
  palette: HTMLElement;
  muteButton: HTMLButtonElement;
  bestScore: HTMLElement;
  winOverlay: HTMLElement;
  winGateCount: HTMLElement;
  winPar: HTMLElement;
  winDelta: HTMLElement;
  winShare: HTMLButtonElement;
  winDismiss: HTMLButtonElement;
  toast: HTMLElement;
}

interface MovingGate {
  gateId: string;
  pointerStart: Point;
  gateStart: GridPosition;
}

interface PaletteDrag {
  type: GateType;
  ghost: HTMLElement;
}

const GATE_TYPES = Object.keys(GATE_ARITY) as GateType[];

function getAudioContextCtor(): AudioContextCtor | undefined {
  const win = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return win.AudioContext ?? win.webkitAudioContext;
}

/** Owns the daily puzzle's board state and drives every DOM/canvas interaction around it. */
export class GameController {
  private readonly refs: GameRefs;
  private readonly renderer: BoardRenderer;
  private readonly synth: Synth;
  private readonly todayIso: string;
  private readonly table: TruthTable;
  private readonly par: number;
  private readonly reducedMotion: boolean;

  private boardState: BoardState;
  private bestScores: BestScores;
  private selectedPin: PinId | null = null;
  private selectedGateId: string | null = null;
  private movingGate: MovingGate | null = null;
  private paletteDrag: PaletteDrag | null = null;
  private previousRowResults: boolean[] | null = null;
  private solvedPreviously = false;
  private toastTimer = 0;
  private gateCounter = 0;

  constructor(refs: GameRefs) {
    this.refs = refs;
    this.todayIso = todayIsoDate();
    this.table = dailyTruthTable(this.todayIso);
    this.par = computePar(this.table);
    this.boardState = createBoardState(this.table.inputNames);
    this.bestScores = parseBestScores(localStorage.getItem(BEST_SCORE_STORAGE_KEY));
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.synth = createSynth(getAudioContextCtor);

    this.renderer = new BoardRenderer(refs.canvas, this.boardState);
    this.renderer.resize();
    window.addEventListener("resize", () => this.renderer.resize());

    this.buildPalette();
    this.setupMuteToggle();
    this.updateBestScoreDisplay();

    refs.canvas.addEventListener("pointerdown", this.onCanvasPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);
    refs.winShare.addEventListener("click", () => this.handleShare());
    refs.winDismiss.addEventListener("click", () => this.hideWinOverlay());

    this.evaluateAndUpdate();
  }

  private createGateId(): string {
    this.gateCounter += 1;
    return `gate-${this.gateCounter}`;
  }

  private nextDefaultPosition(): GridPosition {
    const index = this.boardState.gates.length;
    return { x: 6 + (index % 3) * 5, y: 1 + Math.floor(index / 3) * 4 };
  }

  // --- palette --------------------------------------------------------

  private buildPalette(): void {
    GATE_TYPES.forEach((type) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gate-button";
      button.textContent = type;
      button.setAttribute("aria-label", `Place a ${type} gate`);
      button.addEventListener("pointerdown", (e) => this.startPaletteDrag(type, e));
      button.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const id = this.createGateId();
        this.commitState(placeGate(this.boardState, id, type, this.nextDefaultPosition()));
        this.synth.play("place");
      });
      this.refs.palette.appendChild(button);
    });
  }

  private startPaletteDrag(type: GateType, e: PointerEvent): void {
    e.preventDefault();
    const ghost = document.createElement("div");
    ghost.className = "gate-ghost";
    ghost.textContent = type;
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    document.body.appendChild(ghost);
    this.paletteDrag = { type, ghost };
  }

  private finishPaletteDrag(e: PointerEvent): void {
    const drag = this.paletteDrag;
    if (!drag) return;
    drag.ghost.remove();
    this.paletteDrag = null;

    const rect = this.refs.canvas.getBoundingClientRect();
    const withinCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!withinCanvas) return;

    const spacing = DEFAULT_GATE_LAYOUT.gridSpacing;
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const gridX = Math.round((localX - (DEFAULT_GATE_LAYOUT.widthCells * spacing) / 2) / spacing);
    const gridY = Math.round((localY - (DEFAULT_GATE_LAYOUT.heightCells * spacing) / 2) / spacing);

    const id = this.createGateId();
    this.commitState(placeGate(this.boardState, id, drag.type, { x: gridX, y: gridY }));
    this.synth.play("place");
  }

  // --- canvas pointer interaction --------------------------------------

  private canvasPoint(e: PointerEvent): Point {
    const rect = this.refs.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private readonly onCanvasPointerDown = (e: PointerEvent): void => {
    const rect = this.refs.canvas.getBoundingClientRect();
    const point = this.canvasPoint(e);
    const pin = hitTestPin(this.boardState, point, rect.width, rect.height);
    if (pin) {
      this.handlePinClick(pin);
      return;
    }

    const gateId = hitTestGateBody(this.boardState, point);
    if (gateId) {
      this.selectedPin = null;
      this.selectedGateId = gateId;
      this.renderer.setSelection(null, gateId);
      const gate = this.boardState.gates.find((g) => g.id === gateId)!;
      this.movingGate = { gateId, pointerStart: point, gateStart: { ...gate.position } };
      return;
    }

    this.selectedPin = null;
    this.selectedGateId = null;
    this.renderer.setSelection(null, null);
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (this.movingGate) {
      const spacing = DEFAULT_GATE_LAYOUT.gridSpacing;
      const point = this.canvasPoint(e);
      const dx = (point.x - this.movingGate.pointerStart.x) / spacing;
      const dy = (point.y - this.movingGate.pointerStart.y) / spacing;
      this.boardState = moveGate(this.boardState, this.movingGate.gateId, {
        x: this.movingGate.gateStart.x + dx,
        y: this.movingGate.gateStart.y + dy,
      });
      this.renderer.setState(this.boardState);
      return;
    }
    if (this.paletteDrag) {
      this.paletteDrag.ghost.style.left = `${e.clientX}px`;
      this.paletteDrag.ghost.style.top = `${e.clientY}px`;
    }
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (this.movingGate) {
      const { gateId } = this.movingGate;
      const spacing = DEFAULT_GATE_LAYOUT.gridSpacing;
      const gate = this.boardState.gates.find((g) => g.id === gateId)!;
      const fromPixel = { x: gate.position.x * spacing, y: gate.position.y * spacing };
      const snappedX = Math.round(gate.position.x);
      const snappedY = Math.round(gate.position.y);
      const toPixel = { x: snappedX * spacing, y: snappedY * spacing };

      this.commitState(moveGate(this.boardState, gateId, { x: snappedX, y: snappedY }));
      this.renderer.triggerSnap(gateId, fromPixel, toPixel);
      this.movingGate = null;
      return;
    }
    if (this.paletteDrag) this.finishPaletteDrag(e);
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if ((e.key === "Delete" || e.key === "Backspace") && this.selectedGateId) {
      const gateId = this.selectedGateId;
      this.selectedGateId = null;
      this.renderer.setSelection(null, null);
      this.commitState(removeGate(this.boardState, gateId));
      return;
    }
    if (e.key === "Escape") {
      this.selectedPin = null;
      this.selectedGateId = null;
      this.renderer.setSelection(null, null);
    }
  };

  private handlePinClick(pin: PinId): void {
    if (!this.selectedPin) {
      this.selectedPin = pin;
      this.selectedGateId = null;
      this.renderer.setSelection(pin, null);
      return;
    }

    const first = this.selectedPin;
    this.selectedPin = null;
    this.renderer.setSelection(null, null);

    if (JSON.stringify(first) === JSON.stringify(pin)) return;

    const result = connectPins(this.boardState, first, pin);
    if (result.error) {
      this.showStatus(result.error);
      const shakeTarget = pin.kind === "gateInput" ? pin.gateId : first.kind === "gateInput" ? first.gateId : null;
      if (shakeTarget) this.renderer.triggerShake(shakeTarget);
      return;
    }

    this.showStatus("");
    const rect = this.refs.canvas.getBoundingClientRect();
    const fromPos = resolvePinPosition(this.boardState, isSourcePin(first) ? first : pin, rect.width, rect.height);
    const toPos = resolvePinPosition(this.boardState, isSourcePin(first) ? pin : first, rect.width, rect.height);
    this.commitState(result.state);
    this.synth.play("connect");
    if (fromPos && toPos) this.renderer.triggerPulse(fromPos, toPos);
  }

  // --- evaluation & win -------------------------------------------------

  private commitState(next: BoardState): void {
    this.boardState = next;
    this.renderer.setState(next);
    this.evaluateAndUpdate();
  }

  private evaluateAndUpdate(): void {
    const circuit = toCircuit(this.boardState);
    const rowResults = circuit
      ? this.table.rows.map((row) => evaluateCircuit(circuit, row.inputs) === row.output)
      : this.table.rows.map(() => false);

    if (this.previousRowResults) {
      rowResults.forEach((pass, i) => {
        if (pass && !this.previousRowResults![i]) this.synth.play("pass");
      });
    }
    this.previousRowResults = rowResults;
    this.renderTruthTable(rowResults);

    if (circuit && rowResults.every(Boolean)) {
      if (!this.solvedPreviously) {
        this.solvedPreviously = true;
        this.onFreshWin(circuit);
      }
    } else if (this.solvedPreviously) {
      this.solvedPreviously = false;
      this.hideWinOverlay();
    }
  }

  private topologicalGateIds(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const gatesById = new Map(this.boardState.gates.map((g) => [g.id, g]));

    const visit = (ref: SignalRef | null): void => {
      if (!ref || ref.kind !== "gate" || visited.has(ref.id)) return;
      visited.add(ref.id);
      const gate = gatesById.get(ref.id);
      if (!gate) return;
      gate.inputs.forEach(visit);
      order.push(ref.id);
    };

    visit(this.boardState.output);
    return order;
  }

  private onFreshWin(circuit: Circuit): void {
    const gateCount = countGates(circuit);
    this.bestScores = recordScore(this.bestScores, this.todayIso, gateCount);
    localStorage.setItem(BEST_SCORE_STORAGE_KEY, serializeBestScores(this.bestScores));
    this.updateBestScoreDisplay();
    this.synth.play("win");
    this.celebrateWin(() => this.showWinOverlay(scoreCircuit(gateCount, this.par)));
  }

  private celebrateWin(onDone: () => void): void {
    if (this.reducedMotion) {
      onDone();
      return;
    }
    const rect = this.refs.canvas.getBoundingClientRect();
    const order = this.topologicalGateIds();
    const gatesById = new Map(this.boardState.gates.map((g) => [g.id, g]));

    order.forEach((gateId, i) => {
      window.setTimeout(() => {
        const gate = gatesById.get(gateId);
        if (!gate) return;
        gate.inputs.forEach((ref, idx) => {
          if (!ref) return;
          const from = signalSourcePosition(this.boardState, ref, rect.height, DEFAULT_GATE_LAYOUT);
          if (!from) return;
          this.renderer.triggerPulse(from, gateInputPinPosition(gate, idx, DEFAULT_GATE_LAYOUT));
        });
      }, i * WIN_STEP_MS);
    });

    window.setTimeout(() => {
      if (this.boardState.output) {
        const from = signalSourcePosition(this.boardState, this.boardState.output, rect.height, DEFAULT_GATE_LAYOUT);
        if (from) this.renderer.triggerPulse(from, outputSinkPosition(rect.width, rect.height));
      }
      onDone();
    }, order.length * WIN_STEP_MS);
  }

  private showWinOverlay(score: Score): void {
    this.refs.winGateCount.textContent = String(score.gateCount);
    this.refs.winPar.textContent = String(score.par);
    this.refs.winDelta.textContent =
      score.delta === 0 ? "— exactly par" : score.delta > 0 ? `— ${score.delta} under par` : `— ${Math.abs(score.delta)} over par`;
    this.refs.winOverlay.hidden = false;
  }

  private hideWinOverlay(): void {
    this.refs.winOverlay.hidden = true;
  }

  private handleShare(): void {
    const circuit = toCircuit(this.boardState);
    if (!circuit) return;
    const text = formatShareText(this.todayIso, scoreCircuit(countGates(circuit), this.par));
    const clipboard = (navigator as Navigator & { clipboard?: { writeText(text: string): Promise<void> } }).clipboard;
    if (clipboard?.writeText) {
      clipboard.writeText(text).then(
        () => this.showToast("Copied to clipboard!"),
        () => this.showToast(text),
      );
    } else {
      this.showToast(text);
    }
  }

  // --- misc DOM ---------------------------------------------------------

  private renderTruthTable(rowResults: boolean[]): void {
    const headerCells = [...this.table.inputNames, "OUT", ""].map((name) => `<th>${name}</th>`).join("");
    const rows = this.table.rows
      .map((row, i) => {
        const inputCells = row.inputs.map((v) => `<td>${v ? 1 : 0}</td>`).join("");
        const passed = rowResults[i] ?? false;
        return `<tr class="${passed ? "row-pass" : "row-fail"}">${inputCells}<td>${row.output ? 1 : 0}</td><td aria-hidden="true">${passed ? "✓" : "✕"}</td></tr>`;
      })
      .join("");

    this.refs.truthTable.innerHTML = `
      <table class="truth-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  private showStatus(message: string): void {
    this.refs.status.textContent = message;
  }

  private showToast(message: string): void {
    window.clearTimeout(this.toastTimer);
    this.refs.toast.textContent = message;
    this.refs.toast.hidden = false;
    this.toastTimer = window.setTimeout(() => {
      this.refs.toast.hidden = true;
    }, TOAST_VISIBLE_MS);
  }

  private setupMuteToggle(): void {
    const stored = localStorage.getItem(MUTE_STORAGE_KEY) === "true";
    this.synth.setMuted(stored);
    this.applyMuteState(stored);

    this.refs.muteButton.addEventListener("click", () => {
      const next = !this.synth.isMuted();
      this.synth.setMuted(next);
      this.applyMuteState(next);
      localStorage.setItem(MUTE_STORAGE_KEY, String(next));
    });
  }

  private applyMuteState(muted: boolean): void {
    this.refs.muteButton.setAttribute("aria-pressed", String(muted));
    this.refs.muteButton.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
    this.refs.muteButton.textContent = muted ? "🔇" : "🔊";
  }

  private updateBestScoreDisplay(): void {
    const best = this.bestScores[this.todayIso];
    this.refs.bestScore.textContent = best !== undefined ? `Best today: ${best} gate${best === 1 ? "" : "s"}` : "";
  }
}
