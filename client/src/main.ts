import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";
import { isTouchDevice } from "./touch";
import { HEROES, HERO_IDS, HeroId } from "../../shared/game";
import { HERO_SPRITES, renderPixelSprite } from "./art";

const menu = document.getElementById("menu")!;
const form = document.getElementById("join-form") as HTMLFormElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const errorText = document.getElementById("error")!;

nameInput.value = localStorageGet("riftborn-name") ?? `Rift${Math.floor(100 + Math.random() * 900)}`;

let game: Phaser.Game | undefined;
let selectedHero: HeroId = (localStorageGet("riftborn-hero") as HeroId) ?? "superman";
if (!HERO_IDS.includes(selectedHero)) selectedHero = "superman";
buildHeroPicker();

/** The character select cards, built from the hero list in shared/game.ts. */
function buildHeroPicker() {
  const container = document.getElementById("heroes")!;
  const bars = (value: number) => `<div class="bar"><span style="width:${Math.round(Math.min(1, value) * 100)}%"></span></div>`;
  for (const id of HERO_IDS) {
    const hero = HEROES[id];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "hero";
    card.id = `hero-${id}`;
    card.setAttribute("aria-pressed", String(id === selectedHero));
    const reach = Math.min(1, (hero.range + hero.aoe) / 600 + 0.15);
    card.innerHTML = `
      <span class="name">${hero.name}</span>
      <span class="role">${hero.role}</span>
      <span class="role">Skill: ${hero.skill.name}</span>
      <div class="stats">
        <span>HP</span>${bars(hero.maxHp / 300)}
        <span>DAMAGE</span>${bars(hero.damage / 90)}
        <span>RANGE</span>${bars(reach)}
        <span>ATK SPEED</span>${bars(1 / hero.attackCooldown / 2.5)}
        <span>MOVE</span>${bars(hero.speed / 320)}
      </div>
      <span class="blurb">${hero.blurb}</span>`;
    card.prepend(renderPixelSprite(HERO_SPRITES[id]));
    card.addEventListener("click", () => {
      selectedHero = id;
      localStorageSet("riftborn-hero", id);
      container.querySelectorAll(".hero").forEach((c) => c.setAttribute("aria-pressed", String(c === card)));
    });
    container.append(card);
  }
}

const soloOnly = import.meta.env.VITE_SOLO_ONLY === "1";
if (soloOnly) document.getElementById("join-online")?.remove();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
  const solo = soloOnly || submitter?.id === "join-solo";
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
  game.registry.set("solo", solo);
  game.registry.set("hero", selectedHero);
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
