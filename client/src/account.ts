// Accounts (2026-10-06): sign up or sign in with a username and a password; the record and the
// last picks are saved on the server, so they follow the player to any device.

import { SERVER_PORT } from "../../shared/game";

export interface AccountData {
  stats?: unknown;
  prefs?: { hero?: string; stage?: string; bot?: string };
  tutorial?: boolean; // the tutorial was played (or skipped)
  owned?: string[]; // heroes unlocked (the server's to change)
  spins?: number; // slot spins waiting (the server's to change)
}

export interface Session {
  username: string;
  token: string;
}

const KEY = "uv-account";
let session: Session | undefined = read();
let data: AccountData = {};
const listeners: (() => void)[] = [];

function read(): Session | undefined {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "") as Session;
    return s && typeof s.username === "string" && typeof s.token === "string" ? s : undefined;
  } catch {
    return undefined;
  }
}

function write() {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    // storage off: signed in until the page closes
  }
}

function changed() {
  for (const f of listeners) f();
}

export function onAccountChange(f: () => void) {
  listeners.push(f);
}

export function currentAccount(): Session | undefined {
  return session;
}

export function accountData(): AccountData {
  return data;
}

function api(path: string): string {
  // The dev client (port 5173) talks to the game server on its own port.
  return location.port === "5173" ? `${location.protocol}//${location.hostname}:${SERVER_PORT}${path}` : path;
}

async function call(path: string, body?: unknown, token?: string): Promise<any> {
  const res = await fetch(api(path), {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = {};
  try {
    json = await res.json();
  } catch {
    // not JSON: the server isn't there
  }
  if (!res.ok) throw new Error(json.error ?? `Server said ${res.status}`);
  return json;
}

/** True once the account's saved data came back from the server (this page load). */
let loaded = false;
export function accountLoaded(): boolean {
  return loaded && !!session;
}

function signedIn(r: { username: string; token: string; data?: AccountData }) {
  session = { username: r.username, token: r.token };
  data = r.data ?? {};
  loaded = true;
  write();
  changed();
}

export async function signUp(username: string, password: string, start: AccountData) {
  signedIn(await call("/api/register", { username, password, data: start }));
}

export async function signIn(username: string, password: string) {
  signedIn(await call("/api/login", { username, password }));
}

export async function signOut() {
  const s = session;
  session = undefined;
  data = {};
  loaded = false;
  write();
  changed();
  if (s) await call("/api/logout", {}, s.token).catch(() => undefined);
}

/** On opening the game: check the saved sign-in still works and fetch the saved data. */
export async function restoreSession(): Promise<void> {
  if (!session) return;
  try {
    signedIn(await call("/api/me", undefined, session.token));
  } catch (e) {
    // Signed out on the server (or it is unreachable): only forget it when the server said so.
    if (String((e as Error).message).includes("Signed out")) {
      session = undefined;
      write();
      changed();
    }
  }
}

let saveTimer = 0;
/** Save part of the account's data (merged), a moment later. */
export function saveAccountData(patch: AccountData) {
  if (!session) return;
  data = { ...data, ...patch, prefs: { ...data.prefs, ...patch.prefs } };
  clearTimeout(saveTimer);
  const s = session;
  saveTimer = window.setTimeout(() => {
    call("/api/data", { data }, s.token).catch((e) => console.warn("could not save account", e));
  }, 400);
}

// ---- Heroes unlocked: 3 starters, then one more per slot spin (a spin per win). ----

/** The heroes this account may play; undefined = not signed in (every hero is open). */
export function ownedHeroes(): string[] | undefined {
  return session ? (data.owned ?? []) : undefined;
}

/** Whether a hero is locked for the player right now. */
export function heroLocked(id: string): boolean {
  const owned = ownedHeroes();
  return !!owned && owned.length > 0 && !owned.includes(id);
}

export function spinsLeft(): number {
  return session ? (data.spins ?? 0) : 0;
}

function unlocks(r: { owned?: string[]; spins?: number }) {
  if (r.owned) data.owned = r.owned;
  if (typeof r.spins === "number") data.spins = r.spins;
  changed();
}

/** The 10 random heroes a new player picks 3 starters from. */
export async function starterOffer(): Promise<string[]> {
  if (!session) return [];
  const r = await call("/api/starters", {}, session.token);
  return r.offer ?? [];
}

export async function pickStarters(heroes: string[]) {
  if (!session) return;
  unlocks(await call("/api/starters/pick", { heroes }, session.token));
}

/** A win: the server adds a spin (at most one per game). Returns how many were added. */
export async function reportWin(): Promise<number> {
  if (!session) return 0;
  try {
    const r = await call("/api/win", {}, session.token);
    unlocks(r);
    return r.added ?? 0;
  } catch {
    return 0;
  }
}

/** Spend a spin: the hero it unlocked. */
export async function spinSlot(): Promise<string> {
  if (!session) throw new Error("Log in first");
  const r = await call("/api/spin", {}, session.token);
  unlocks(r);
  return r.hero;
}
