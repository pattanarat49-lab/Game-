import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";
import { isTouchDevice } from "./touch";

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
  const touch = isTouchDevice();
  if (touch) await goFullscreenLandscape();
  await document.fonts?.ready;

  // Match the game's shape to the screen (always landscape) so phones are not letterboxed.
  const height = touch ? 440 : 600;
  const aspect = Math.max(innerWidth, innerHeight) / Math.min(innerWidth, innerHeight);
  const width = Math.round(Math.min(1300, Math.max(720, height * aspect)));

  game?.destroy(true);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width,
    height,
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

/** On phones, go fullscreen and lock to landscape where the browser allows it. */
async function goFullscreenLandscape() {
  try {
    await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
  } catch {
    // Not supported (e.g. iPhone Safari); the rotate-your-phone hint covers it.
  }
}

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
