// A player's record (2026-10-06), kept on their own device and shown to others in the Open World.

export interface Result {
  mode: string; // "PvP", "Bot Duel", "PvE Squad", "3v3", "Dungeon"
  won: boolean | null; // null for a draw
  hero: string; // hero name
  at: number; // when (ms since 1970)
}

export interface Stats {
  games: number;
  wins: number;
  losses: number;
  dungeons: number; // dungeon bosses beaten
  recent: Result[]; // newest first
}

const KEY = "uv-stats";

export function loadStats(): Stats {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "") as Stats;
    if (s && typeof s.games === "number") return { games: s.games, wins: s.wins ?? 0, losses: s.losses ?? 0, dungeons: s.dungeons ?? 0, recent: (s.recent ?? []).slice(0, 8) };
  } catch {
    // nothing saved yet, or storage is off
  }
  return { games: 0, wins: 0, losses: 0, dungeons: 0, recent: [] };
}

export function recordResult(r: Result) {
  const s = loadStats();
  s.games++;
  if (r.won === true) s.wins++;
  if (r.won === false) s.losses++;
  if (r.mode === "Dungeon" && r.won) s.dungeons++;
  s.recent = [r, ...s.recent].slice(0, 8);
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage unavailable; the record just isn't kept
  }
}

/** The record as sent to the server (kept short). */
export function statsJson(): string {
  const s = loadStats();
  return JSON.stringify({ ...s, recent: s.recent.slice(0, 6) });
}

export function parseStats(json: string): Stats | undefined {
  try {
    const s = JSON.parse(json) as Stats;
    return s && typeof s.games === "number" ? s : undefined;
  } catch {
    return undefined;
  }
}
