import "./styles.css";
import { GameController } from "./game";
import type { GameRefs } from "./game";

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing required element #${id}`);
  return el as T;
}

function main(): void {
  const canvas = document.getElementById("board") as HTMLCanvasElement | null;
  if (!canvas || !canvas.getContext("2d")) {
    const fallback = document.getElementById("app");
    if (fallback) {
      fallback.innerHTML =
        '<p class="muted" style="padding: 2rem;">Circuitle needs a browser with 2D canvas support to run.</p>';
    }
    return;
  }

  const refs: GameRefs = {
    canvas,
    status: requireElement("board-status"),
    truthTable: requireElement("truth-table"),
    palette: requireElement("gate-palette"),
    muteButton: requireElement("mute-toggle"),
    bestScore: requireElement("best-score"),
    winOverlay: requireElement("win-overlay"),
    winGateCount: requireElement("win-gate-count"),
    winPar: requireElement("win-par"),
    winDelta: requireElement("win-delta"),
    winShare: requireElement("win-share"),
    winDismiss: requireElement("win-dismiss"),
    toast: requireElement("toast"),
  };

  new GameController(refs);
}

main();
