import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";
import { isTouchDevice } from "./touch";
import { HERO_IDS, HeroId, StageId } from "../../shared/game";
import { accountData, currentAccount, onAccountChange, restoreSession, saveAccountData, signIn, signOut, signUp } from "./account";
import { deviceStats } from "./stats";
import { accountLoaded, heroLocked, ownedHeroes, pickStarters, spinSlot, spinsLeft, starterOffer } from "./account";
import { showSlot, showStarterPicker } from "./unlocks";
import { Home } from "./home";

const menu = document.getElementById("menu")!;
const backButton = document.getElementById("back-btn")!;
const soloOnly = import.meta.env.VITE_SOLO_ONLY === "1";

let game: Phaser.Game | undefined;
let soloName = localStorageGet("riftborn-name") ?? `Rift${Math.floor(100 + Math.random() * 900)}`;

/** The favourite hero: on the home pedestal, the profile picture, and the hero you start with. */
function favHero(): HeroId {
  const owned = ownedHeroes();
  const saved = (currentAccount() ? accountData().prefs?.fav ?? accountData().prefs?.hero : undefined) ?? localStorageGet("uv-fav") ?? localStorageGet("riftborn-hero");
  if (saved && HERO_IDS.includes(saved as HeroId) && !heroLocked(saved)) return saved as HeroId;
  const first = owned?.find((id) => HERO_IDS.includes(id as HeroId));
  return (first as HeroId) ?? "superman";
}

const home = new Home(menu, {
  online: !soloOnly,
  name: () => currentAccount()?.username ?? soloName,
  fav: favHero,
  setFav: (id) => {
    localStorageSet("uv-fav", id);
    saveAccountData({ prefs: { fav: id, hero: id } });
  },
  locked: (id) => heroLocked(id),
  owned: () => ownedHeroes()?.length ?? HERO_IDS.length,
  spins: () => spinsLeft(),
  openSlot: () => {
    showSlot(spinsLeft, spinSlot, () => ownedHeroes() ?? []);
    // Redraw the home screen once the slot closes (a new hero, fewer spins).
    const watch = setInterval(() => {
      if (!document.getElementById("hero-slot")) {
        clearInterval(watch);
        home.refresh();
      }
    }, 300);
  },
  openWorld: () => void startGame("world", soloOnly, ""),
  play: (stage, solo, code) => void startGame(stage, solo, code),
  logout: soloOnly ? undefined : () => logOut(),
  rename: soloOnly
    ? () => {
        const n = prompt("Your name", soloName)?.trim().slice(0, 16);
        if (n) {
          soloName = n;
          localStorageSet("riftborn-name", n);
          home.refresh();
        }
      }
    : undefined,
});
const errorText = home.error;

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
  home.refresh();
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
}
backButton.addEventListener("click", backToMenu);

/** Start (or move to) a game: a stage, solo or online, and a room number ("" = any open room). */
async function startGame(stage: StageId, solo: boolean, code: string) {
  const signedIn = currentAccount();
  const account = solo ? undefined : signedIn;
  const name = signedIn?.username ?? soloName;
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
  game.registry.set("hero", favHero());
  game.registry.set("stage", stage);
  // Same mode + same room number = same room; no number = any open room of that mode.
  game.registry.set("roomCode", code);
  backButton.classList.remove("hidden");
  const mine = game;
  // The Open World's portal, the dungeon's way out, or an accepted duel: off to that room.
  game.events.on("switch-room", (to: { stage: StageId; code: string }) => {
    if (mine !== game) return;
    setTimeout(() => startGame(to.stage, solo, to.code), 0);
  });
  // Tutorial finished or skipped: never shown again, back to the menu.
  game.events.on("tutorial-done", () => {
    if (mine !== game) return;
    if (currentAccount()) saveAccountData({ tutorial: true });
    localStorageSet("uv-tutorial", "1");
    setTimeout(backToMenu, 0);
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
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable; ignore
  }
}

// ---- Accounts (online builds): sign in before the menu, or create a new account. ----
const accountModal = document.getElementById("account-modal")!;
const accountForm = document.getElementById("account-form") as HTMLFormElement;
const accUser = document.getElementById("acc-user") as HTMLInputElement;
const accPass = document.getElementById("acc-pass") as HTMLInputElement;
const accPass2 = document.getElementById("acc-pass2") as HTMLInputElement;
const accError = document.getElementById("acc-error")!;
const accGo = document.getElementById("acc-go-text")!;
let signupMode = false;
let fitLogin = () => {}; // set by setupLoginScene

function setSignupMode(on: boolean) {
  signupMode = on;
  accountForm.classList.toggle("signup", on);
  const title = document.getElementById("acc-title")!;
  title.textContent = on ? "NEW ACCOUNT" : "LOGIN";
  title.classList.toggle("small", on);
  accGo.textContent = on ? "CREATE & PLAY" : "LOGIN";
  document.getElementById("acc-pass2-row")!.style.display = on ? "" : "none";
  accPass.autocomplete = on ? "new-password" : "current-password";
  document.getElementById("acc-switch-text")!.textContent = on ? "Already have an account?" : "No account yet?";
  document.getElementById("acc-switch-label")!.textContent = on ? "BACK TO LOGIN" : "CREATE NEW ACCOUNT";
  accError.textContent = "";
  accPass2.value = "";
  fitLogin();
}

/** Signed out: the login screen covers the home screen. */
function drawAccount() {
  const a = currentAccount();
  accountModal.classList.toggle("hidden", !!a);
  home.refresh();
  if (!a) {
    fitLogin(); // sized now that the panel is on screen
    setTimeout(() => accUser.focus(), 0);
    return;
  }
  void welcomeNewPlayer();
}

function logOut() {
  newPlayerFlow = false;
  accUser.value = currentAccount()?.username ?? "";
  accPass.value = "";
  setSignupMode(false);
  void signOut();
}

/** A new player: pick 3 starters out of 10, then the tutorial (once). */
let newPlayerFlow = false;
async function welcomeNewPlayer() {
  if (newPlayerFlow || game || !accountLoaded()) return;
  const owned = ownedHeroes() ?? [];
  if (owned.length && accountData().tutorial) return;
  newPlayerFlow = true;
  try {
    if (!owned.length) {
      const offer = await starterOffer();
      if (offer.length) await showStarterPicker(offer, (picks) => pickStarters(picks));
    }
    if (!accountData().tutorial && !game) startTutorial();
  } catch (e) {
    errorText.textContent = (e as Error).message === "Failed to fetch" ? "Can't reach the server." : (e as Error).message;
    newPlayerFlow = false;
  }
}

function startTutorial() {
  void startGame("tutorial", true, "");
}

if (soloOnly) {
  // The solo build has no server to keep accounts on (nor the login screen's video).
  accountModal.remove();
  // First visit: the tutorial (every hero is open in the solo build).
  if (!localStorageGet("uv-tutorial")) startTutorial();
} else {
  setupLoginScene();
  setSignupMode(false);
  drawAccount();
  onAccountChange(() => drawAccount());
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
    accError.textContent = signupMode ? "Creating account..." : "Logging in...";
    try {
      // A new account starts with this device's record and picks.
      if (signupMode) await signUp(user, pass, { stats: deviceStats(), prefs: { fav: favHero() } });
      else await signIn(user, pass);
      accPass.value = accPass2.value = "";
      accError.textContent = "";
    } catch (e) {
      accError.textContent = (e as Error).message === "Failed to fetch" ? "Can't reach the server. Try again in a moment." : (e as Error).message;
    }
  });
}

/** The login screen's animated scene: a 1280x720 stage scaled to fill the screen while keeping the panel in view. */
function setupLoginScene() {
  const stage = document.getElementById("acc-stage")!;
  const video = document.createElement("video");
  Object.assign(video, { src: "/login-bg.mp4", muted: true, loop: true, autoplay: true, playsInline: true });
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");
  stage.prepend(video);
  video.addEventListener("loadeddata", () => stage.querySelector(".poster")?.remove());
  const form = document.getElementById("account-form")!;
  const fit = () => {
    const w = innerWidth;
    const h = innerHeight;
    // The panel (in 1280x720 scene pixels) must always be fully on screen; the logo above it when there is room.
    const top = 186;
    const bottom = top + form.offsetHeight + 12;
    const s = Math.min(Math.max(w / 1280, h / 720), (w * 0.96) / 520, (h * 0.98) / (bottom - top + 16));
    const vw = w / s;
    const vh = h / s;
    const left = vw >= 1280 ? (1280 - vw) / 2 : Math.min(Math.max(0, 642 - vw / 2), 1280 - vw);
    const up = vh >= 720 ? (720 - vh) / 2 : Math.min(Math.max(0, bottom - vh), 720 - vh);
    stage.style.transform = `scale(${s}) translate(${-left}px, ${-up}px)`;
  };
  fitLogin = fit;
  void document.fonts?.ready.then(fit);
  fit();
  addEventListener("resize", fit);
}
