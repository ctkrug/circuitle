import "./styles.css";
import { BoardRenderer } from "./board";
import { dailyTruthTable, todayIsoDate } from "./truthTable";

const MUTE_STORAGE_KEY = "circuitle:muted";

function renderTruthTable(container: HTMLElement, table: ReturnType<typeof dailyTruthTable>): void {
  const headerCells = [...table.inputNames, "OUT"].map((name) => `<th>${name}</th>`).join("");
  const rows = table.rows
    .map((row) => {
      const inputCells = row.inputs.map((v) => `<td>${v ? 1 : 0}</td>`).join("");
      return `<tr>${inputCells}<td>${row.output ? 1 : 0}</td></tr>`;
    })
    .join("");

  container.innerHTML = `
    <table class="truth-table">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function setupMuteToggle(button: HTMLButtonElement): void {
  const stored = localStorage.getItem(MUTE_STORAGE_KEY) === "true";
  applyMuteState(button, stored);

  button.addEventListener("click", () => {
    const muted = button.getAttribute("aria-pressed") === "true";
    applyMuteState(button, !muted);
    localStorage.setItem(MUTE_STORAGE_KEY, String(!muted));
  });
}

function applyMuteState(button: HTMLButtonElement, muted: boolean): void {
  button.setAttribute("aria-pressed", String(muted));
  button.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
  button.textContent = muted ? "🔇" : "🔊";
}

function main(): void {
  const canvas = document.getElementById("board") as HTMLCanvasElement | null;
  const truthTableContainer = document.getElementById("truth-table");
  const muteButton = document.getElementById("mute-toggle") as HTMLButtonElement | null;

  if (canvas) {
    const board = new BoardRenderer(canvas);
    board.resize();
    window.addEventListener("resize", () => board.resize());
  }

  if (truthTableContainer) {
    const table = dailyTruthTable(todayIsoDate());
    renderTruthTable(truthTableContainer, table);
  }

  if (muteButton) {
    setupMuteToggle(muteButton);
  }
}

main();
