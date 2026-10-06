// Accounts (2026-10-06): sign up or sign in with a username and a password; the record and the
// last picks are saved on the server, so they follow the player to any device.

import { SERVER_PORT } from "../../shared/game";

export interface AccountData {
  stats?: unknown;
  prefs?: { hero?: string; stage?: string; bot?: string };
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

function signedIn(r: { username: string; token: string; data?: AccountData }) {
  session = { username: r.username, token: r.token };
  data = r.data ?? {};
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
