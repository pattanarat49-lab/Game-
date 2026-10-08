// Battle Royale (user request 2026-10-07): 8 heroes on a big round island with tall grass, walls, crates
// and ponds. One life each; the last one standing wins. After a while a storm ring closes in on the
// middle and hurts everyone caught outside it. Built from a fixed seed, so every machine has the same map.

import { BLOCK, ClassicMap, T_BUSH, T_CRATE, T_FENCE, T_FLOOR, T_WALL, T_WATER, distanceField } from "./maps";

export const ROYALE_PLAYERS = 8;
export const ROYALE_COLS = 66;
export const ROYALE_ROWS = 66;
/** The island's radius in blocks (the sea is outside it). */
const ISLAND = 30.5;
/** Seconds of fighting before the ring starts to close, and how long it takes to close. */
export const ROYALE_SAFE_TIME = 45;
export const ROYALE_SHRINK_TIME = 90;
/** The ring stops shrinking at this radius (world pixels). */
export const ROYALE_MIN_RADIUS = 70;
/** Outside the ring: this share of max HP lost every half second. */
export const ROYALE_BURN = 0.04;
/** Bots only notice rivals this close (the island is big). */
export const ROYALE_SIGHT = 340;

/** Heal pads (user request 2026-10-08): one on each of the island's four sides. Standing on one heals this share of max HP every half second. */
export const ROYALE_HEAL = 0.025;
export const ROYALE_HEAL_RADIUS = 30;

export interface RoyaleMap extends ClassicMap {
  center: { x: number; y: number };
  heals: { x: number; y: number }[];
  /** The ring's radius before it starts closing (covers the whole island). */
  radius: number;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(): RoyaleMap {
  const C = ROYALE_COLS;
  const R = ROYALE_ROWS;
  const mid = (C - 1) / 2;
  const tiles = new Uint8Array(C * R).fill(T_FLOOR);
  const rand = rng(20261007);
  const inside = (c: number, r: number) => c >= 0 && r >= 0 && c < C && r < R;
  const land = (c: number, r: number) => Math.hypot(c - mid, r - mid) <= ISLAND + 0.9 * Math.sin(Math.atan2(r - mid, c - mid) * 5);
  const set = (c: number, r: number, t: number) => {
    if (inside(c, r) && land(c, r)) tiles[r * C + c] = t;
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (!land(c, r)) tiles[r * C + c] = T_WATER;

  // Spawn spots: eight round the island, plus the middle, kept clear.
  const spots: { c: number; r: number }[] = [];
  for (let i = 0; i < ROYALE_PLAYERS; i++) {
    const a = (i / ROYALE_PLAYERS) * Math.PI * 2 - Math.PI / 2;
    spots.push({ c: Math.round(mid + Math.cos(a) * 26), r: Math.round(mid + Math.sin(a) * 26) });
  }
  const pads = [0, 1, 2, 3].map((i) => ({ c: Math.round(mid + Math.cos((i * Math.PI) / 2) * 15), r: Math.round(mid + Math.sin((i * Math.PI) / 2) * 15) }));
  const clear = [...spots.map((s) => ({ ...s, rad: 2.5 })), ...pads.map((s) => ({ ...s, rad: 2.6 })), { c: Math.round(mid), r: Math.round(mid), rad: 3.5 }];
  const free = (c: number, r: number) => clear.every((s) => Math.hypot(c - s.c, r - s.r) > s.rad);
  const blob = (c0: number, r0: number, rad: number, t: number) => {
    for (let r = Math.floor(r0 - rad - 1); r <= r0 + rad + 1; r++)
      for (let c = Math.floor(c0 - rad - 1); c <= c0 + rad + 1; c++) {
        const d = Math.hypot(c - c0, (r - r0) * 1.15) + (rand() - 0.5) * 0.9;
        if (d <= rad && free(c, r) && tiles[r * C + c] !== T_WATER) set(c, r, t);
      }
  };
  const spot = (pad: number) => {
    for (let k = 0; k < 50; k++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * (ISLAND - pad);
      const c = Math.round(mid + Math.cos(a) * d);
      const r = Math.round(mid + Math.sin(a) * d);
      if (free(c, r)) return { c, r };
    }
    return { c: Math.round(mid), r: Math.round(mid) };
  };

  // Ponds first, then tall grass, then cover.
  for (let i = 0; i < 4; i++) {
    const s = spot(7);
    blob(s.c, s.r, 1.8 + rand() * 1.4, T_WATER);
  }
  for (let i = 0; i < 30; i++) {
    const s = spot(3);
    blob(s.c, s.r, 1.4 + rand() * 1.9, T_BUSH);
  }
  // Stone walls: short lines and L shapes.
  for (let i = 0; i < 20; i++) {
    const s = spot(4);
    const len = 3 + Math.floor(rand() * 4);
    const horiz = rand() < 0.5;
    for (let k = 0; k < len; k++) if (free(horiz ? s.c + k : s.c, horiz ? s.r : s.r + k)) set(horiz ? s.c + k : s.c, horiz ? s.r : s.r + k, T_WALL);
    if (rand() < 0.5) for (let k = 1; k < 3; k++) if (free(horiz ? s.c : s.c + k, horiz ? s.r + k : s.r)) set(horiz ? s.c : s.c + k, horiz ? s.r + k : s.r, T_WALL);
  }
  // Crates in little stacks.
  for (let i = 0; i < 18; i++) {
    const s = spot(3);
    for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (rand() < 0.8 && free(s.c + dc, s.r + dr)) set(s.c + dc, s.r + dr, T_CRATE);
  }
  // Fences.
  for (let i = 0; i < 8; i++) {
    const s = spot(4);
    const horiz = rand() < 0.5;
    for (let k = 0; k < 5; k++) if (free(horiz ? s.c + k : s.c, horiz ? s.r : s.r + k)) set(horiz ? s.c + k : s.c, horiz ? s.r : s.r + k, T_FENCE);
  }
  // A ring of grass round the middle and a cross of walls in it, for a fight in the last circle.
  for (const [dc, dr] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
    const c = Math.round(mid) + dc * 3;
    const r = Math.round(mid) + dr * 3;
    blob(c, r, 1.3, T_BUSH);
  }

  const px = (c: number, r: number) => ({ x: (c + 0.5) * BLOCK, y: (r + 0.5) * BLOCK });
  const center = px(Math.round(mid), Math.round(mid));
  // Nothing walled off: fill any pocket that can't be walked to from the middle, and open a way to every spawn.
  const solid = (t: number) => t === T_WALL || t === T_CRATE || t === T_FENCE || t === T_WATER;
  const m: RoyaleMap = {
    name: "ROYALE ISLAND",
    theme: {
      floor: "#6aa84a", floor2: "#639e44", wall: "#7a7468", wallTop: "#aaa294", crate: "#a0703a", crateTop: "#d09858",
      fence: "#8a5a32", fenceTop: "#b88050", bush: "#2e8a3a", bushDark: "#155a22", water: "#2a7ac8", waterLight: "#7ac0f0",
    },
    tiles,
    spawns: { 1: spots.map((s) => px(s.c, s.r)), 2: spots.map((s) => px(s.c, s.r)) },
    cols: C,
    rows: R,
    ox: 0,
    oy: 0,
    center,
    heals: pads.map((s) => px(s.c, s.r)),
    radius: (ISLAND + 2) * BLOCK,
  };
  for (const s of spots) {
    let dist = distanceField(m, center.x, center.y);
    if (dist[s.r * C + s.c] >= 0) continue;
    // Walk straight in, clearing what is in the way (never the sea).
    const n = Math.ceil(Math.hypot(mid - s.c, mid - s.r));
    for (let k = 0; k <= n; k++) {
      const c = Math.round(s.c + ((mid - s.c) * k) / n);
      const r = Math.round(s.r + ((mid - s.r) * k) / n);
      for (const [dc, dr] of [[0, 0], [1, 0], [0, 1]]) if (inside(c + dc, r + dr) && land(c + dc, r + dr) && solid(tiles[(r + dr) * C + c + dc])) tiles[(r + dr) * C + c + dc] = T_FLOOR;
    }
    dist = distanceField(m, center.x, center.y);
  }
  const dist = distanceField(m, center.x, center.y);
  for (let i = 0; i < tiles.length; i++) if (dist[i] < 0 && !solid(tiles[i])) tiles[i] = T_WALL;
  return m;
}

export const ROYALE_MAP: RoyaleMap = build();

/** The storm ring's radius this many seconds into the fight. */
export function royaleRadius(t: number): number {
  const full = ROYALE_MAP.radius;
  if (t <= ROYALE_SAFE_TIME) return full;
  const k = Math.min(1, (t - ROYALE_SAFE_TIME) / ROYALE_SHRINK_TIME);
  return full + (ROYALE_MIN_RADIUS - full) * k;
}
