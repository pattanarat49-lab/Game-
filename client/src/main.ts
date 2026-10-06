import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";
import { isTouchDevice } from "./touch";
import { HEROES, HERO_CLASSES, HERO_IDS, HeroId, STAGES, STAGE_IDS, StageId, heroClass, heroRatings } from "../../shared/game";
import { GODZILLA, KINGKONG, SWORD_GOD, HERO_SPRITES, WARDEN, renderPixelSprite } from "./art";
import { heroPortrait } from "./heroArt";
import { showHeroInfo } from "./heroInfo";
import { COVER_PNG } from "./cover.data";
import { accountData, currentAccount, onAccountChange, restoreSession, saveAccountData, signIn, signOut, signUp } from "./account";
import { deviceStats } from "./stats";

(document.getElementById("cover") as HTMLImageElement | null)?.setAttribute("src", COVER_PNG);

const menu = document.getElementById("menu")!;
const form = document.getElementById("join-form") as HTMLFormElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const errorText = document.getElementById("error")!;
const roomInput = document.getElementById("room-code") as HTMLInputElement;
const backButton = document.getElementById("back-btn")!;

nameInput.value = localStorageGet("riftborn-name") ?? `Rift${Math.floor(100 + Math.random() * 900)}`;

let game: Phaser.Game | undefined;
let selectedHero: HeroId = (localStorageGet("riftborn-hero") as HeroId) ?? "superman";
if (!HERO_IDS.includes(selectedHero)) selectedHero = "superman";
let selectedBot: HeroId = (localStorageGet("riftborn-bot") as HeroId) ?? "superman";
if (!HERO_IDS.includes(selectedBot)) selectedBot = "superman";
let selectedStage: StageId = (localStorageGet("riftborn-stage") as StageId) ?? "classic";
if (!STAGE_IDS.includes(selectedStage)) selectedStage = "classic";
buildStagePicker();
buildHeroPicker();

/** Two heroes facing each other, for the PvP Arena card. */
function versus(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 18;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(renderPixelSprite(HERO_SPRITES.isekai), 0, 0);
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(renderPixelSprite(HERO_SPRITES.killua), -40, 0);
  ctx.restore();
  return canvas;
}

/** Stage cards: a tiny preview of the floor with that stage's boss on it. */
function buildStagePicker() {
  const container = document.getElementById("stages")!;
  const previews: Partial<Record<StageId, { floor: string[]; boss: HTMLCanvasElement }>> = {
    lava: { floor: ["#2b2026", "#e5501b", "#ff8a1f"], boss: renderPixelSprite(WARDEN) },
    jungle: { floor: ["#3e4a36", "#43503a", "#5aa23a"], boss: renderPixelSprite(KINGKONG) },
    dojo: { floor: ["#8a5a32", "#9a6a40", "#4a2e18"], boss: renderPixelSprite(SWORD_GOD) },
    boss: { floor: ["#2a2f36", "#31373f", "#4a5562"], boss: renderPixelSprite(GODZILLA) },
    pvp: { floor: ["#3f5fa8", "#d42020", "#4a6ab4"], boss: versus() },
    duel: { floor: ["#3f5fa8", "#2a6ad8", "#4a6ab4"], boss: versus() },
    pve: { floor: ["#3f5fa8", "#2fae6a", "#4a6ab4"], boss: versus() },
    classic: { floor: ["#b0604c", "#d055c0", "#c9965f"], boss: versus() },
  };
  for (const id of STAGE_IDS) {
    const stage = STAGES[id];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "stage";
    card.id = `stage-${id}`;
    card.setAttribute("aria-pressed", String(id === selectedStage));
    card.innerHTML = `<span class="name">${stage.name}</span><span class="blurb">${stage.blurb}</span>`;

    const preview = document.createElement("canvas");
    preview.width = 48;
    preview.height = 32;
    const ctx = preview.getContext("2d")!;
    const { floor, boss } = previews[id]!;
    for (let y = 0; y < 32; y += 4) {
      for (let x = 0; x < 48; x += 4) {
        // Lava creeps in from the edges; the boss room is plain concrete.
        // The ring stages show the mat with ropes round the edge.
        const edge = (id === "lava" || id === "pvp" || id === "duel" || id === "pve" || id === "classic") && (x < 8 || x > 36 || y < 4 || y > 24);
        ctx.fillStyle = edge ? floor[1 + ((x + y) % 8 === 0 ? 1 : 0)] : floor[(x * 7 + y * 3) % 3 === 0 && id !== "lava" ? 1 : 0];
        ctx.fillRect(x, y, 4, 4);
      }
    }
    ctx.drawImage(boss, (48 - boss.width) / 2, 30 - boss.height);
    card.prepend(preview);

    card.addEventListener("click", () => {
      selectedStage = id;
      localStorageSet("riftborn-stage", id);
      container.querySelectorAll(".stage").forEach((c) => c.setAttribute("aria-pressed", String(c === card)));
      botPick.style.display = id === "duel" ? "block" : "none";
    });
    container.append(card);
  }
  // Bot Duel: which hero the bot plays.
  const botPick = document.createElement("label");
  botPick.id = "bot-pick";
  botPick.style.cssText = `display:${selectedStage === "duel" ? "block" : "none"};margin:8px 0;font-size:12px`;
  botPick.textContent = "Bot plays: ";
  const select = document.createElement("select");
  select.id = "bot-hero";
  select.style.cssText = "font:inherit;padding:4px;background:#241a20;color:#fff;border:2px solid #6b5842";
  for (const id of HERO_IDS) select.add(new Option(HEROES[id].name, id, false, id === selectedBot));
  select.addEventListener("change", () => {
    selectedBot = select.value as HeroId;
    localStorageSet("riftborn-bot", selectedBot);
  });
  botPick.append(select);
  container.after(botPick);
}

/** The character select cards, built from the hero list in shared/game.ts. */
function buildHeroPicker() {
  const container = document.getElementById("heroes")!;
  // Class filter: ALL, or one class at a time.
  const tabs = document.createElement("div");
  tabs.id = "hero-classes";
  const show = (cls: string) => {
    tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cls === cls)));
    container.querySelectorAll<HTMLElement>(".hero").forEach((c) => (c.hidden = cls !== "all" && c.dataset.cls !== cls));
  };
  for (const c of [{ id: "all", name: "ALL", color: "#ffd23f" }, ...HERO_CLASSES]) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.cls = c.id;
    b.id = `class-${c.id}`;
    b.textContent = c.name;
    b.style.setProperty("--c", c.color);
    b.addEventListener("click", () => show(c.id));
    tabs.append(b);
  }
  container.before(tabs);
  const bars = (value: number) => `<div class="bar"><span style="width:${Math.round(Math.min(1, value) * 100)}%"></span></div>`;
  for (const id of HERO_IDS) {
    const hero = HEROES[id];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "hero";
    card.id = `hero-${id}`;
    card.setAttribute("aria-pressed", String(id === selectedHero));
    const rate = heroRatings(id);
    const cls = HERO_CLASSES.find((c) => c.id === heroClass(id))!;
    card.dataset.cls = cls.id;
    card.innerHTML = `
      <span class="name">${hero.name}</span>
      ${
        hero.stars > 5
          ? `<span class="stars special" title="${hero.stars} stars, special">${"★".repeat(hero.stars)} SPECIAL</span>`
          : `<span class="stars" title="${hero.stars} of 5 stars">${"★".repeat(hero.stars)}<span class="dim">${"★".repeat(5 - hero.stars)}</span></span>`
      }
      <span class="role"><b class="cls" style="--c:${cls.color}">${cls.name}</b> ${hero.role}</span>
      <span class="role">Skill: ${hero.skill.name}${hero.skill2 ? ` + ${hero.skill2.name}` : ""}</span>
      <div class="stats">
        <span>HP ${rate.hp}</span>${bars(rate.hp / 10)}
        <span>DAMAGE ${rate.damage}</span>${bars(rate.damage / 10)}
        <span>ATK SPEED ${rate.speed}</span>${bars(rate.speed / 10)}
        <span>RANGE ${rate.range}</span>${bars(rate.range / 10)}
      </div>
      <span class="blurb">${hero.blurb}</span>`;
    card.prepend(heroPortrait(id));
    if (hero.stars > 5) card.classList.add("special");
    card.addEventListener("click", () => {
      selectedHero = id;
      localStorageSet("riftborn-hero", id);
      container.querySelectorAll(".hero").forEach((c) => c.setAttribute("aria-pressed", String(c === card)));
      showHeroInfo(id);
    });
    container.append(card);
  }
  show("all");
}

const soloOnly = import.meta.env.VITE_SOLO_ONLY === "1";
if (soloOnly) {
  document.getElementById("join-online")?.remove();
  roomInput.remove(); // room numbers are for online play
}

/** BACK: leave the room (or the solo game) and return to the menu. */
function backToMenu() {
  if (!game) return;
  game.registry.set("leaving", true);
  const room = game.registry.get("room") as { leave?: () => unknown } | undefined;
  try {
    room?.leave?.();
  } catch {
    // already gone
  }
  game.destroy(true);
  game = undefined;
  backButton.classList.add("hidden");
  errorText.textContent = "";
  menu.classList.remove("hidden");
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
}
backButton.addEventListener("click", backToMenu);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
  const solo = soloOnly || submitter?.id === "join-solo";
  if (solo && selectedStage === "pvp") {
    errorText.textContent = soloOnly
      ? "PvP needs other players. Play it online at riftborn-s7tf.onrender.com"
      : "PvP needs other players. Press PLAY ONLINE.";
    return;
  }
  if (!solo && selectedStage === "duel") {
    errorText.textContent = "Bot Duel is played solo. Press PLAY SOLO.";
    return;
  }
  await startGame(selectedStage, solo, solo ? "" : roomInput.value.trim().slice(0, 8).toUpperCase());
});

// OPEN WORLD: everyone online meets in one big village (solo build: walk it alone and take the dungeon portal).
document.getElementById("open-world")?.addEventListener("click", () => startGame("world", soloOnly, ""));

/** Start (or move to) a game: a stage, solo or online, and a room number ("" = any open room). */
async function startGame(stage: StageId, solo: boolean, code: string) {
  const account = solo ? undefined : currentAccount();
  const name = account?.username ?? (nameInput.value.trim().slice(0, 16) || "Player");
  if (!account) localStorageSet("riftborn-name", name);
  errorText.textContent = "";
  menu.classList.add("hidden");
  const touch = isTouchDevice();
  if (touch && !document.fullscreenElement) await goFullscreenLandscape();
  await document.fonts?.ready;

  // Match the game's shape to the screen (always landscape) so phones are not letterboxed.
  const height = touch ? 440 : 600;
  const aspect = Math.max(innerWidth, innerHeight) / Math.min(innerWidth, innerHeight);
  const width = Math.round(Math.min(1300, Math.max(720, height * aspect)));

  if (game) {
    // Moving on from another room (a portal or a duel): leave it first.
    game.registry.set("leaving", true);
    try {
      (game.registry.get("room") as { leave?: () => unknown } | undefined)?.leave?.();
    } catch {
      // already gone
    }
    game.destroy(true);
  }
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
  (window as unknown as { riftGame?: Phaser.Game }).riftGame = game; // handy for debugging and tests
  game.registry.set("playerName", name);
  game.registry.set("token", account?.token ?? "");
  game.registry.set("solo", solo);
  game.registry.set("hero", selectedHero);
  game.registry.set("stage", stage);
  game.registry.set("botHero", selectedBot);
  // Same mode + same room number = same room; no number = any open room of that mode.
  game.registry.set("roomCode", code);
  backButton.classList.remove("hidden");
  const mine = game;
  // The Open World's portal, the dungeon's way out, or an accepted duel: off to that room.
  game.events.on("switch-room", (to: { stage: StageId; code: string }) => {
    if (mine !== game) return;
    setTimeout(() => startGame(to.stage, solo, to.code), 0);
  });
  game.events.on("connection-error", (err: Error) => {
    if (mine !== game || mine.registry.get("leaving")) return; // we pressed BACK
    errorText.textContent = `Could not reach the rift: ${err?.message ?? err}. Is the server running?`;
    menu.classList.remove("hidden");
    backButton.classList.add("hidden");
    game?.destroy(true);
    game = undefined;
  });
}

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
  // Signed in: the last picks are saved with the account too.
  if (key === "riftborn-hero") saveAccountData({ prefs: { hero: value } });
  if (key === "riftborn-stage") saveAccountData({ prefs: { stage: value } });
  if (key === "riftborn-bot") saveAccountData({ prefs: { bot: value } });
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable; ignore
  }
}

// ---- Accounts (online builds): sign in before the menu, or create a new account. ----
const accountBar = document.getElementById("account-bar")!;
const accountModal = document.getElementById("account-modal")!;
const accountForm = document.getElementById("account-form") as HTMLFormElement;
const accUser = document.getElementById("acc-user") as HTMLInputElement;
const accPass = document.getElementById("acc-pass") as HTMLInputElement;
const accPass2 = document.getElementById("acc-pass2") as HTMLInputElement;
const accError = document.getElementById("acc-error")!;
const accGo = document.getElementById("acc-go")!;
let signupMode = false;

function setSignupMode(on: boolean) {
  signupMode = on;
  accountForm.classList.toggle("signup", on);
  document.getElementById("acc-title")!.textContent = on ? "CREATE NEW ACCOUNT" : "SIGN IN";
  accGo.textContent = on ? "CREATE ACCOUNT & PLAY" : "SIGN IN";
  accPass2.style.display = on ? "" : "none";
  accPass.autocomplete = on ? "new-password" : "current-password";
  document.getElementById("acc-switch-text")!.textContent = on ? "Already have an account?" : "No account yet?";
  document.getElementById("acc-switch")!.textContent = on ? "BACK TO SIGN IN" : "CREATE NEW ACCOUNT";
  accError.textContent = "";
  accPass2.value = "";
}

/** Signed out: the sign-in screen covers the menu. Signed in: the menu, with the name and LOG OUT. */
function drawAccount() {
  const a = currentAccount();
  accountModal.classList.toggle("hidden", !!a);
  accountBar.innerHTML = "";
  nameInput.style.display = a ? "none" : "";
  if (!a) {
    setTimeout(() => accUser.focus(), 0);
    return;
  }
  accountBar.append("Signed in as ");
  const b = document.createElement("b");
  b.textContent = a.username;
  accountBar.append(b);
  const out = document.createElement("button");
  out.type = "button";
  out.id = "acc-logout";
  out.textContent = "LOG OUT";
  out.addEventListener("click", () => {
    accUser.value = a.username;
    accPass.value = "";
    setSignupMode(false);
    void signOut();
  });
  accountBar.append(out);
}

/** The account's saved picks become the menu's picks. */
function applyPrefs() {
  const p = accountData().prefs ?? {};
  if (p.hero && HERO_IDS.includes(p.hero as HeroId)) {
    selectedHero = p.hero as HeroId;
    document.querySelectorAll("#heroes .hero").forEach((c) => c.setAttribute("aria-pressed", String(c.id === `hero-${selectedHero}`)));
  }
  if (p.stage && STAGE_IDS.includes(p.stage as StageId)) {
    selectedStage = p.stage as StageId;
    document.querySelectorAll("#stages .stage").forEach((c) => c.setAttribute("aria-pressed", String(c.id === `stage-${selectedStage}`)));
    const bot = document.getElementById("bot-pick");
    if (bot) bot.style.display = selectedStage === "duel" ? "block" : "none";
  }
  if (p.bot && HERO_IDS.includes(p.bot as HeroId)) {
    selectedBot = p.bot as HeroId;
    const sel = document.getElementById("bot-hero") as HTMLSelectElement | null;
    if (sel) sel.value = selectedBot;
  }
}

if (soloOnly) {
  accountBar.remove(); // the solo build has no server to keep accounts on
  accountModal.remove();
} else {
  (document.getElementById("acc-cover") as HTMLImageElement).src = COVER_PNG;
  setSignupMode(false);
  drawAccount();
  onAccountChange(() => {
    drawAccount();
    applyPrefs();
  });
  void restoreSession();
  document.getElementById("acc-switch")!.addEventListener("click", () => setSignupMode(!signupMode));
  accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = accUser.value.trim();
    const pass = accPass.value;
    if (!user || !pass) {
      accError.textContent = "Type a username and a password";
      return;
    }
    if (signupMode && pass !== accPass2.value) {
      accError.textContent = "The passwords don't match";
      return;
    }
    accError.textContent = signupMode ? "Creating account..." : "Signing in...";
    try {
      // A new account starts with this device's record and picks.
      if (signupMode) await signUp(user, pass, { stats: deviceStats(), prefs: { hero: selectedHero, stage: selectedStage, bot: selectedBot } });
      else await signIn(user, pass);
      accPass.value = accPass2.value = "";
      accError.textContent = "";
    } catch (e) {
      accError.textContent = (e as Error).message === "Failed to fetch" ? "Can't reach the server. Try again in a moment." : (e as Error).message;
    }
  });
}
