// Player accounts (2026-10-06): a username and a password, and the player's record kept on the server.
// With DATABASE_URL set (a Postgres database) accounts last forever; without it they are kept in
// data/accounts.json next to the server, which a free host wipes whenever it restarts.

import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { promisify } from "util";
import type { Express, Request, Response } from "express";
import { HERO_IDS } from "../../shared/game";
import express from "express";
import { Pool } from "pg";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export interface Account {
  username: string; // as typed (shown in game)
  key: string; // lower case, for looking up
  salt: string; // hex
  hash: string; // hex scrypt of the password
  data: string; // JSON: { stats, prefs }
  tokens: string[]; // signed-in devices (newest last)
  created: number;
}

interface Store {
  get(key: string): Promise<Account | undefined>;
  byToken(token: string): Promise<Account | undefined>;
  create(a: Account): Promise<boolean>; // false if the name is taken
  save(a: Account): Promise<void>;
}

/** Accounts in a JSON file (local play, or a host without a database). */
class FileStore implements Store {
  private all = new Map<string, Account>();
  private tokens = new Map<string, string>();
  private writing = false;
  private again = false;
  constructor(private file: string) {
    try {
      if (existsSync(file)) for (const a of JSON.parse(readFileSync(file, "utf8")) as Account[]) this.put(a);
    } catch (e) {
      console.error("accounts file unreadable", e);
    }
  }
  private put(a: Account) {
    this.all.set(a.key, a);
    for (const t of a.tokens) this.tokens.set(t, a.key);
  }
  async get(key: string) {
    return this.all.get(key);
  }
  async byToken(token: string) {
    const key = this.tokens.get(token);
    return key ? this.all.get(key) : undefined;
  }
  async create(a: Account) {
    if (this.all.has(a.key)) return false;
    this.put(a);
    this.flush();
    return true;
  }
  async save(a: Account) {
    for (const [t, k] of this.tokens) if (k === a.key && !a.tokens.includes(t)) this.tokens.delete(t);
    this.put(a);
    this.flush();
  }
  private flush() {
    if (this.writing) {
      this.again = true;
      return;
    }
    this.writing = true;
    setTimeout(() => {
      try {
        mkdirSync(dirname(this.file), { recursive: true });
        writeFileSync(`${this.file}.tmp`, JSON.stringify([...this.all.values()]));
        renameSync(`${this.file}.tmp`, this.file);
      } catch (e) {
        console.error("could not save accounts", e);
      }
      this.writing = false;
      if (this.again) {
        this.again = false;
        this.flush();
      }
    }, 200);
  }
}

/** Accounts in Postgres (kept across restarts and deploys). */
class PgStore implements Store {
  private ready: Promise<void>;
  private pool: Pool;
  constructor(url: string) {
    const local = /localhost|127\.0\.0\.1/.test(url);
    this.pool = new Pool({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false }, max: 4 });
    this.ready = this.pool
      .query(
        `CREATE TABLE IF NOT EXISTS accounts (
          key TEXT PRIMARY KEY, username TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL,
          data TEXT NOT NULL DEFAULT '{}', tokens TEXT NOT NULL DEFAULT '[]', created BIGINT NOT NULL)`,
      )
      .then(() => undefined);
  }
  private row(r: any): Account | undefined {
    return r ? { key: r.key, username: r.username, salt: r.salt, hash: r.hash, data: r.data, tokens: JSON.parse(r.tokens), created: Number(r.created) } : undefined;
  }
  async get(key: string) {
    await this.ready;
    return this.row((await this.pool.query("SELECT * FROM accounts WHERE key = $1", [key])).rows[0]);
  }
  async byToken(token: string) {
    await this.ready;
    // tokens is a small JSON list of strings; LIKE finds the row, the check below makes it exact
    const r = this.row((await this.pool.query("SELECT * FROM accounts WHERE tokens LIKE $1 LIMIT 1", [`%"${token}"%`])).rows[0]);
    return r?.tokens.includes(token) ? r : undefined;
  }
  async create(a: Account) {
    await this.ready;
    const r = await this.pool.query(
      "INSERT INTO accounts (key, username, salt, hash, data, tokens, created) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (key) DO NOTHING",
      [a.key, a.username, a.salt, a.hash, a.data, JSON.stringify(a.tokens), a.created],
    );
    return r.rowCount === 1;
  }
  async save(a: Account) {
    await this.ready;
    await this.pool.query("UPDATE accounts SET data = $2, tokens = $3, hash = $4, salt = $5 WHERE key = $1", [a.key, a.data, JSON.stringify(a.tokens), a.hash, a.salt]);
  }
}

const store: Store = process.env.DATABASE_URL
  ? new PgStore(process.env.DATABASE_URL)
  : new FileStore(process.env.ACCOUNTS_FILE ?? resolve(__dirname, "../data/accounts.json"));
console.log(`Accounts kept in ${process.env.DATABASE_URL ? "the database" : "data/accounts.json"}`);

const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const MAX_TOKENS = 5; // devices signed in at once
const MAX_DATA = 12000;

async function hashPw(pw: string, salt: Buffer) {
  return scrypt(pw, salt, 32);
}

function newToken() {
  return randomBytes(24).toString("hex");
}

function publicView(a: Account, token: string) {
  let data: unknown = {};
  try {
    data = JSON.parse(a.data);
  } catch {
    // keep {}
  }
  // Accounts that play every hero see them all as owned.
  if (ALL_HEROES_ACCOUNTS.includes(a.key) && data && typeof data === "object") (data as Unlocks).owned = [...HERO_IDS];
  return { username: a.username, token, data };
}

/** The account a game client signed in as (when joining a room). */
export async function accountForToken(token: unknown): Promise<Account | undefined> {
  if (typeof token !== "string" || !/^[0-9a-f]{48}$/.test(token)) return undefined;
  try {
    return await store.byToken(token);
  } catch (e) {
    console.error("account lookup failed", e);
    return undefined;
  }
}

/** The stats part of an account's saved data, as the JSON the game shows in profiles. */
export function accountStats(a: Account): string {
  try {
    return JSON.stringify((JSON.parse(a.data) as { stats?: unknown }).stats ?? {}).slice(0, 800);
  } catch {
    return "";
  }
}

/** The saved hero mastery and titles (client/src/profile.ts writes them). */
export function accountProfile(a: Account): { title: string; titles: string[]; mastery: Record<string, number> } {
  const p = (readData(a).profile ?? {}) as { title?: unknown; titles?: unknown; mastery?: unknown };
  return {
    title: typeof p.title === "string" ? p.title : "",
    titles: Array.isArray(p.titles) ? p.titles.map(String) : [],
    mastery: p.mastery && typeof p.mastery === "object" ? (p.mastery as Record<string, number>) : {},
  };
}

// A few wrong passwords in a row from one address, then a short wait.
const tries = new Map<string, { n: number; until: number }>();
function slowDown(req: Request): boolean {
  const ip = req.ip ?? "?";
  const t = tries.get(ip);
  return !!t && t.n >= 8 && Date.now() < t.until;
}
function failed(req: Request) {
  const ip = req.ip ?? "?";
  const t = tries.get(ip) ?? { n: 0, until: 0 };
  if (Date.now() > t.until) t.n = 0;
  t.n++;
  t.until = Date.now() + 60_000;
  tries.set(ip, t);
}

function bearer(req: Request): string {
  const h = req.headers.authorization ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

// ---- Heroes: new players pick 3 starters out of 10 random ones; every win earns a spin that unlocks one more. ----
interface Unlocks {
  owned?: string[];
  spins?: number;
  offer?: string[];
  lastWin?: number;
}
type Data = Record<string, unknown> & Unlocks;
const STARTER_OFFER = 10;
/** Accounts (lower-case usernames) that play every hero, new ones included (user request 2026-10-06). */
const ALL_HEROES_ACCOUNTS = ["jedie", "naju", "ptc_tong"];
const STARTER_PICKS = 3;
const WIN_GAP_MS = 40_000; // a game takes longer than this, so one spin per real win

function readData(a: Account): Data {
  try {
    const d = JSON.parse(a.data);
    return d && typeof d === "object" ? d : {};
  } catch {
    return {};
  }
}

function serverPart(d: Data): Unlocks {
  return { owned: d.owned ?? [], spins: d.spins ?? 0, offer: d.offer, lastWin: d.lastWin };
}

/** The heroes an account may play (undefined = it still has to pick its starters). */
export function ownedHeroes(a: Account): string[] {
  if (ALL_HEROES_ACCOUNTS.includes(a.key)) return [...HERO_IDS];
  return (readData(a).owned ?? []).filter((h) => (HERO_IDS as string[]).includes(h));
}

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function withAccount(req: Request, res: Response, f: (a: Account, d: Data) => Promise<unknown> | unknown) {
  const a = await accountForToken(bearer(req));
  if (!a) return void res.status(401).json({ error: "Signed out" });
  try {
    const d = readData(a);
    const out = await f(a, d);
    if (res.headersSent) return;
    a.data = JSON.stringify(d);
    await store.save(a);
    res.json({ ...(out as object), owned: ownedHeroes(a), spins: d.spins ?? 0 });
  } catch (e) {
    console.error("unlock failed", e);
    if (!res.headersSent) res.status(500).json({ error: "Server error" });
  }
}

function unlockRoutes(app: Express) {
  // The 10 random heroes a new player picks 3 starters from (the same 10 until they pick).
  app.post("/api/starters", (req, res) =>
    withAccount(req, res, (_a, d) => {
      if (ownedHeroes(_a).length) return { offer: [] };
      if (!d.offer?.every((h) => (HERO_IDS as string[]).includes(h))) d.offer = shuffled([...HERO_IDS]).slice(0, STARTER_OFFER);
      return { offer: d.offer };
    }),
  );
  app.post("/api/starters/pick", (req, res) =>
    withAccount(req, res, (_a, d) => {
      const picks = [...new Set((Array.isArray(req.body?.heroes) ? req.body.heroes : []).map(String))] as string[];
      if (ownedHeroes(_a).length) return void res.status(409).json({ error: "Starters already picked" });
      if (picks.length !== STARTER_PICKS || !picks.every((h) => d.offer?.includes(h))) return void res.status(400).json({ error: `Pick ${STARTER_PICKS} of the heroes shown` });
      d.owned = picks;
      delete d.offer;
      return {};
    }),
  );
  // A win anywhere: one more spin.
  app.post("/api/win", (req, res) =>
    withAccount(req, res, (_a, d) => {
      const now = Date.now();
      if (now - (d.lastWin ?? 0) < WIN_GAP_MS) return { added: 0 };
      d.lastWin = now;
      d.spins = (d.spins ?? 0) + 1;
      return { added: 1 };
    }),
  );
  // Spend a spin: a random hero the player doesn't have yet.
  app.post("/api/spin", (req, res) =>
    withAccount(req, res, (a, d) => {
      const owned = new Set(ownedHeroes(a));
      const left = HERO_IDS.filter((h) => !owned.has(h));
      if (!(d.spins ?? 0)) return void res.status(400).json({ error: "No spins left. Win a game to get one!" });
      if (!left.length) return void res.status(400).json({ error: "You already have every hero!" });
      const hero = left[randomInt(left.length)];
      d.spins = (d.spins ?? 0) - 1;
      d.owned = [...owned, hero];
      return { hero };
    }),
  );
}

export function accountRoutes(app: Express) {
  app.use("/api", express.json({ limit: "16kb" }));
  app.use("/api", (_req, res, next) => {
    // the solo/dev client may sit on another origin
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (_req.method === "OPTIONS") return void res.sendStatus(204);
    next();
  });

  app.post("/api/register", async (req, res) => {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");
    if (!NAME_RE.test(username)) return void res.status(400).json({ error: "Username: 3-16 letters, numbers or _" });
    if (password.length < 4 || password.length > 64) return void res.status(400).json({ error: "Password: 4-64 characters" });
    try {
      const salt = randomBytes(16);
      const token = newToken();
      const a: Account = {
        username,
        key: username.toLowerCase(),
        salt: salt.toString("hex"),
        hash: (await hashPw(password, salt)).toString("hex"),
        data: JSON.stringify(req.body?.data ?? {}).slice(0, MAX_DATA),
        tokens: [token],
        created: Date.now(),
      };
      if (!(await store.create(a))) return void res.status(409).json({ error: "That username is taken" });
      res.json(publicView(a, token));
    } catch (e) {
      console.error("register failed", e);
      res.status(500).json({ error: "Server error, try again" });
    }
  });

  app.post("/api/login", async (req, res) => {
    if (slowDown(req)) return void res.status(429).json({ error: "Too many tries. Wait a minute." });
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");
    try {
      const a = await store.get(username.toLowerCase());
      const hash = a ? await hashPw(password, Buffer.from(a.salt, "hex")) : await hashPw(password, randomBytes(16));
      if (!a || !timingSafeEqual(hash, Buffer.from(a.hash, "hex"))) {
        failed(req);
        return void res.status(401).json({ error: "Wrong username or password" });
      }
      const token = newToken();
      a.tokens = [...a.tokens, token].slice(-MAX_TOKENS);
      await store.save(a);
      res.json(publicView(a, token));
    } catch (e) {
      console.error("login failed", e);
      res.status(500).json({ error: "Server error, try again" });
    }
  });

  app.get("/api/me", async (req, res) => {
    const token = bearer(req);
    const a = await accountForToken(token);
    if (!a) return void res.status(401).json({ error: "Signed out" });
    res.json(publicView(a, token));
  });

  // The game saves the player's record and settings here.
  app.post("/api/data", async (req, res) => {
    const token = bearer(req);
    const a = await accountForToken(token);
    if (!a) return void res.status(401).json({ error: "Signed out" });
    // The heroes owned and the spins are the server's to change (see the unlock routes below).
    const data = JSON.stringify({ ...(req.body?.data ?? {}), ...serverPart(readData(a)) });
    if (data.length > MAX_DATA) return void res.status(413).json({ error: "Too much data" });
    a.data = data;
    try {
      await store.save(a);
      res.json({ ok: true });
    } catch (e) {
      console.error("save failed", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  unlockRoutes(app);

  app.post("/api/logout", async (req, res) => {
    const token = bearer(req);
    const a = await accountForToken(token);
    if (a) {
      a.tokens = a.tokens.filter((t) => t !== token);
      await store.save(a).catch(() => undefined);
    }
    res.json({ ok: true });
  });
}
