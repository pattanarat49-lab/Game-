import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";

const menu = document.getElementById("menu")!;
const form = document.getElementById("join-form") as HTMLFormElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const errorText = document.getElementById("error")!;

nameInput.value = localStorageGet("riftborn-name") ?? `Rift${Math.floor(100 + Math.random() * 900)}`;

let game: Phaser.Game | undefined;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = nameInput.value.trim().slice(0, 16) || "Riftborn";
  localStorageSet("riftborn-name", name);
  errorText.textContent = "";
  menu.classList.add("hidden");
  await document.fonts?.ready;

  game?.destroy(true);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: 960,
    height: 600,
    backgroundColor: "#120b0f",
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, GameScene, HudScene],
  });
  game.registry.set("playerName", name);
  game.events.on("connection-error", (err: Error) => {
    errorText.textContent = `Could not reach the rift: ${err?.message ?? err}. Is the server running?`;
    menu.classList.remove("hidden");
    game?.destroy(true);
    game = undefined;
  });
});

function localStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable; ignore
  }
}
