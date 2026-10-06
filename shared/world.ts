// The Open World (user request 2026-10-06): a big meadow with a village, a river, a lake and mountains,
// where every online player meets, chats and walks to the dungeon portal. Also the dungeon itself.
// Both are built the same way on every machine (a fixed seed), so the server and the clients agree on
// where the walls, trees and water are.

import { BLOCK, ClassicMap, MapTheme, T_FENCE, T_FLOOR, T_WALL, T_WATER } from "./maps";

export const WORLD_COLS = 150;
export const WORLD_ROWS = 110;

// What each block looks like (the collision is in `tiles`).
export const L_GRASS = 0;
export const L_GRASS2 = 1; // darker meadow
export const L_PATH = 2; // dirt path
export const L_PLAZA = 3; // village square stones
export const L_WATER = 4;
export const L_DEEP = 5;
export const L_SAND = 6;
export const L_BRIDGE = 7;
export const L_MOUNTAIN = 8;
export const L_SNOW = 9;
export const L_FARM = 10; // tilled soil with crops
export const L_FLOWERS = 11;
export const L_CLIFF = 12; // the rock face at the foot of the mountains

export type PropKind = "tree" | "blossom" | "pine" | "house" | "well" | "lamp" | "rock" | "bush" | "sign" | "stall" | "crop" | "boat" | "log";

export interface WorldProp {
  kind: PropKind;
  x: number; // world pixels: the bottom centre (where it stands)
  y: number;
  v: number; // a variant (colour, size)
}

export interface OpenMap extends ClassicMap {
  look: Uint8Array;
  props: WorldProp[];
  /** Where heroes appear, and the dungeon portal. */
  spawn: { x: number; y: number };
  portal: { x: number; y: number };
}

const THEME: MapTheme = {
  floor: "#5aa83a", floor2: "#4f9a34", wall: "#6a6a72", wallTop: "#9a9aa4", crate: "#a0703a", crateTop: "#c89058",
  fence: "#9a6a3a", fenceTop: "#c8945a", bush: "#3a8a2a", bushDark: "#2a6a1a", water: "#3a8ad0", waterLight: "#7ac0f0",
};

/** A small, fixed random number generator (the same numbers everywhere). */
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

function buildWorld(): OpenMap {
  const C = WORLD_COLS;
  const R = WORLD_ROWS;
  const tiles = new Uint8Array(C * R).fill(T_FLOOR);
  const look = new Uint8Array(C * R).fill(L_GRASS);
  const props: WorldProp[] = [];
  const rand = rng(20261006);
  const idx = (c: number, r: number) => r * C + c;
  const inside = (c: number, r: number) => c >= 0 && r >= 0 && c < C && r < R;
  const set = (c: number, r: number, l: number, t: number) => {
    if (!inside(c, r)) return;
    look[idx(c, r)] = l;
    tiles[idx(c, r)] = t;
  };
  const at = (c: number, r: number) => (inside(c, r) ? look[idx(c, r)] : L_MOUNTAIN);
  const px = (c: number) => (c + 0.5) * BLOCK;

  // Meadow: two shades of grass in soft patches.
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      const n = Math.sin(c * 0.21 + Math.sin(r * 0.13) * 2) + Math.sin(r * 0.17 - c * 0.07) + Math.sin((c + r) * 0.05);
      if (n > 1.1) look[idx(c, r)] = L_GRASS2;
    }

  // Mountains along the top and down the left side, with snowy peaks and a cliff at their foot.
  const mountainEdge = (c: number) => Math.round(13 + 3 * Math.sin(c / 9) + 2 * Math.sin(c / 4.3 + 1) + 1.5 * Math.sin(c / 2.1));
  const leftEdge = (r: number) => Math.round(7 + 2.5 * Math.sin(r / 7) + 1.5 * Math.sin(r / 3.1 + 2));
  for (let c = 0; c < C; c++) {
    const edge = mountainEdge(c);
    for (let r = 0; r < edge; r++) set(c, r, r < edge - 7 + Math.round(2 * Math.sin(c / 3)) ? L_SNOW : r === edge - 1 ? L_CLIFF : L_MOUNTAIN, T_WALL);
  }
  for (let r = 0; r < R; r++) {
    const edge = leftEdge(r);
    for (let c = 0; c < edge; c++) if (at(c, r) !== L_SNOW) set(c, r, c === edge - 1 ? L_CLIFF : L_MOUNTAIN, T_WALL);
  }

  // The river: from a waterfall under the mountains, winding down to the lake in the bottom right.
  const lake = { c: 118, r: 96, rc: 24, rr: 10 };
  const riverX = (r: number) => 96 + 9 * Math.sin(r / 13) + 3.5 * Math.sin(r / 5.2 + 1);
  for (let r = mountainEdge(96) - 1; r < lake.r; r++) {
    const cx = riverX(r);
    const half = 2.4 + 0.6 * Math.sin(r / 7);
    for (let c = Math.floor(cx - half - 1); c <= Math.ceil(cx + half + 1); c++) {
      const d = Math.abs(c + 0.5 - cx);
      if (d <= half) set(c, r, d < half - 1.2 ? L_DEEP : L_WATER, T_WATER);
      else if (d <= half + 1 && at(c, r) !== L_WATER && at(c, r) !== L_DEEP && at(c, r) < L_MOUNTAIN) set(c, r, L_SAND, T_FLOOR);
    }
  }
  for (let r = lake.r - lake.rr - 2; r <= lake.r + lake.rr + 2; r++)
    for (let c = lake.c - lake.rc - 2; c <= lake.c + lake.rc + 2; c++) {
      const d = Math.hypot((c - lake.c) / lake.rc, (r - lake.r) / lake.rr) + 0.08 * Math.sin(c * 0.7) * Math.cos(r * 0.9);
      if (d <= 0.72) set(c, r, L_DEEP, T_WATER);
      else if (d <= 1) set(c, r, L_WATER, T_WATER);
      else if (d <= 1.14 && at(c, r) !== L_WATER && at(c, r) !== L_DEEP) set(c, r, L_SAND, T_FLOOR);
    }
  // A small pond west of the village.
  for (let r = 66; r <= 76; r++)
    for (let c = 16; c <= 30; c++) {
      const d = Math.hypot((c - 23) / 6.5, (r - 71) / 4.2);
      if (d <= 1) set(c, r, d < 0.6 ? L_DEEP : L_WATER, T_WATER);
      else if (d <= 1.25 && at(c, r) < L_WATER) set(c, r, L_SAND, T_FLOOR);
    }

  // Paths (drawn before the village so the houses sit on grass beside them).
  const path = (c0: number, r0: number, c1: number, r1: number, w = 1) => {
    const n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let i = 0; i <= n; i++) {
      const c = Math.round(c0 + ((c1 - c0) * i) / n);
      const r = Math.round(r0 + ((r1 - r0) * i) / n);
      for (let dr = -w; dr <= w; dr++)
        for (let dc = -w; dc <= w; dc++) {
          const l = at(c + dc, r + dr);
          if (l === L_WATER || l === L_DEEP) set(c + dc, r + dr, L_BRIDGE, T_FLOOR);
          else if (l < L_MOUNTAIN && l !== L_BRIDGE && l !== L_PLAZA) set(c + dc, r + dr, L_PATH, T_FLOOR);
        }
    }
  };
  const village = { c: 52, r: 54 };
  path(village.c, village.r, 140, 50); // east, over the river
  path(village.c, village.r, village.c, 100); // south
  path(village.c, 96, 100, 104); // along the south to the lake shore
  path(village.c, village.r, 12, 54); // west to the hills
  path(village.c, village.r, village.c, 22); // north, up to the mountain trail
  path(village.c, 30, 80, 24); // the trail along the foot of the mountains
  path(108, 50, 112, 80); // east bank down to the lake
  // The square.
  for (let r = village.r - 8; r <= village.r + 8; r++)
    for (let c = village.c - 10; c <= village.c + 10; c++) {
      const d = Math.hypot((c - village.c) / 10.5, (r - village.r) / 8.5);
      if (d <= 1) set(c, r, L_PLAZA, T_FLOOR);
    }

  const portal = { x: px(village.c), y: px(village.r - 5) };
  const spawn = { x: px(village.c), y: px(village.r + 4) };

  // Houses around the square: solid walls, the door side open onto a short path.
  const houses: [number, number][] = [
    [34, 40], [44, 38], [64, 38], [72, 42],
    [32, 62], [72, 62], [36, 76], [66, 76], [80, 52],
  ];
  houses.forEach(([c, r], i) => {
    // A house is 7 blocks wide and 5 deep; (c, r) is its door.
    for (let dr = -4; dr <= 0; dr++) for (let dc = -3; dc <= 3; dc++) set(c + dc, r + dr, at(c + dc, r + dr) === L_PATH ? L_GRASS : at(c + dc, r + dr), T_WALL);
    path(c, r + 1, village.c + Math.sign(c - village.c) * 4, r + Math.sign(village.r - r) * 2 + 1, 0);
    props.push({ kind: "house", x: px(c), y: (r + 1) * BLOCK, v: i % 4 });
  });

  // Farm fields south-west of the square, fenced in.
  const farm = { c0: 18, r0: 82, c1: 40, r1: 96 };
  for (let r = farm.r0; r <= farm.r1; r++)
    for (let c = farm.c0; c <= farm.c1; c++) {
      const edge = r === farm.r0 || r === farm.r1 || c === farm.c0 || c === farm.c1;
      const gate = r === farm.r0 && (c === 29 || c === 30);
      if (edge && !gate) set(c, r, L_GRASS, T_FENCE);
      else if (!edge) {
        set(c, r, L_FARM, T_FLOOR);
        if (r % 2 === 0 && c % 2 === 1 && c > farm.c0 + 1 && c < farm.c1 - 1) props.push({ kind: "crop", x: px(c), y: (r + 1) * BLOCK - 2, v: (c + r) % 3 });
      }
    }
  path(29, farm.r0 - 1, village.c, 84, 0);
  // A market stall and a well in the square, lamps around it.
  props.push({ kind: "well", x: px(village.c - 6), y: px(village.r + 2), v: 0 });
  set(village.c - 6, village.r + 2, L_PLAZA, T_WALL);
  props.push({ kind: "stall", x: px(village.c + 6), y: px(village.r + 3), v: 0 });
  for (let dc = 5; dc <= 7; dc++) set(village.c + dc, village.r + 3, L_PLAZA, T_WALL);
  for (const [dc, dr] of [[-9, -3], [9, -3], [-9, 4], [9, 4], [-3, -8], [3, -8]]) {
    props.push({ kind: "lamp", x: px(village.c + dc), y: px(village.r + dr), v: 0 });
    set(village.c + dc, village.r + dr, L_PLAZA, T_WALL);
  }
  props.push({ kind: "sign", x: px(village.c + 3), y: px(village.r - 4), v: 0 });
  props.push({ kind: "boat", x: px(lake.c - 6), y: px(lake.r + 2), v: 0 });

  // Trees: forest on the edges, blossoms near the village, pines under the mountains. Only the trunk is solid.
  const free = (c: number, r: number, pad: number) => {
    for (let dr = -pad; dr <= pad; dr++)
      for (let dc = -pad; dc <= pad; dc++) {
        const l = at(c + dc, r + dr);
        if (tiles[idx(Math.max(0, Math.min(C - 1, c + dc)), Math.max(0, Math.min(R - 1, r + dr)))] !== T_FLOOR) return false;
        if (l !== L_GRASS && l !== L_GRASS2 && l !== L_FLOWERS) return false;
      }
    return true;
  };
  const nearVillage = (c: number, r: number) => Math.hypot(c - village.c, (r - village.r) * 1.2) < 30;
  for (let tries = 0; tries < 9000; tries++) {
    const c = 2 + Math.floor(rand() * (C - 4));
    const r = 2 + Math.floor(rand() * (R - 4));
    if (!free(c, r, 1)) continue;
    const edgeForest = c > C - 16 || r > R - 10 || c < leftEdge(r) + 9 || r < mountainEdge(c) + 7 || (c > 120 && r < 70);
    const p = nearVillage(c, r) ? 0.05 : edgeForest ? 0.9 : 0.12;
    if (rand() > p) continue;
    const kind: PropKind = r < mountainEdge(c) + 9 || c > 132 ? "pine" : nearVillage(c, r) || rand() < 0.22 ? "blossom" : "tree";
    set(c, r, at(c, r), T_WALL);
    props.push({ kind, x: px(c), y: (r + 1) * BLOCK - 3, v: Math.floor(rand() * 3) });
  }
  // A solid line of forest round the right and bottom edges, so nobody walks off the map.
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      if (c < C - 2 && r < R - 2) continue;
      if (at(c, r) >= L_WATER && at(c, r) !== L_SAND) {
        set(c, r, at(c, r), T_WALL);
        continue;
      }
      set(c, r, L_GRASS2, T_WALL);
      if ((c + r) % 2 === 0) props.push({ kind: "pine", x: px(c), y: (r + 1) * BLOCK, v: (c * 7 + r) % 3 });
    }
  // Flowers, bushes and rocks to dress the meadow (only rocks are solid).
  for (let i = 0; i < 2600; i++) {
    const c = Math.floor(rand() * C);
    const r = Math.floor(rand() * R);
    const l = at(c, r);
    if ((l !== L_GRASS && l !== L_GRASS2) || tiles[idx(c, r)] !== T_FLOOR) continue;
    const roll = rand();
    if (roll < 0.7) {
      // A patch of flowers.
      for (let k = 0; k < 6; k++) {
        const fc = c + Math.floor(rand() * 4) - 2;
        const fr = r + Math.floor(rand() * 3) - 1;
        if ((at(fc, fr) === L_GRASS || at(fc, fr) === L_GRASS2) && tiles[idx(Math.max(0, Math.min(C - 1, fc)), Math.max(0, Math.min(R - 1, fr)))] === T_FLOOR) look[idx(fc, fr)] = L_FLOWERS;
      }
    } else if (roll < 0.9) props.push({ kind: "bush", x: px(c), y: (r + 1) * BLOCK - 4, v: Math.floor(rand() * 2) });
    else if (roll < 0.97) {
      props.push({ kind: "rock", x: px(c), y: (r + 1) * BLOCK - 4, v: Math.floor(rand() * 2) });
      tiles[idx(c, r)] = T_WALL;
    } else props.push({ kind: "log", x: px(c), y: (r + 1) * BLOCK - 4, v: 0 });
  }
  // Keep the square, the portal and the paths clear.
  props.splice(0, props.length, ...props.filter((p) => p.kind === "house" || p.kind === "lamp" || p.kind === "well" || p.kind === "stall" || p.kind === "sign" || Math.hypot(p.x - portal.x, p.y - portal.y) > 60));

  return { name: "OPEN WORLD", theme: THEME, tiles, look, props, spawns: { 1: [spawn], 2: [spawn] }, cols: C, rows: R, ox: 0, oy: 0, spawn, portal };
}

// ---------------------------------------------------------------- dungeon

export const DUNGEON_COLS = 90;
export const DUNGEON_ROWS = 92;
export const D_FLOOR = 0;
export const D_WALL = 1;
export const D_DOOR = 2; // a golden gate (open)

export interface DungeonRoom {
  c0: number;
  r0: number;
  c1: number;
  r1: number;
  /** What waits inside. */
  monsters: string[];
  role: "start" | "boss" | "exit" | "fight";
}

export interface DungeonMap extends ClassicMap {
  look: Uint8Array;
  rooms: DungeonRoom[];
  /** Monsters standing guard in the corridors. */
  guards: { kind: string; x: number; y: number }[];
  spawn: { x: number; y: number };
  exit: { x: number; y: number };
  boss: { x: number; y: number };
  torches: { x: number; y: number }[];
}

/** The dungeon from the user's picture: seven rooms joined by corridors, entered top centre, boss bottom left, way out top left. */
function buildDungeon(): DungeonMap {
  const C = DUNGEON_COLS;
  const R = DUNGEON_ROWS;
  const tiles = new Uint8Array(C * R).fill(T_WALL);
  const look = new Uint8Array(C * R).fill(D_WALL);
  const open = (c0: number, r0: number, c1: number, r1: number, l = D_FLOOR) => {
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        if (c < 0 || r < 0 || c >= C || r >= R) continue;
        tiles[r * C + c] = T_FLOOR;
        look[r * C + c] = l;
      }
  };
  const rooms: DungeonRoom[] = [
    { c0: 10, r0: 6, c1: 20, r1: 15, monsters: [], role: "exit" }, // A: the way out (portal)
    { c0: 41, r0: 3, c1: 53, r1: 15, monsters: [], role: "start" }, // F: where heroes come in
    { c0: 8, r0: 40, c1: 21, r1: 55, monsters: ["brute", "cinderling", "cinderling", "caster", "swordsman"], role: "fight" }, // B
    { c0: 39, r0: 40, c1: 56, r1: 56, monsters: ["swordsman", "swordsman", "caster", "caster", "brute", "cinderling"], role: "fight" }, // E: the big hall
    { c0: 73, r0: 44, c1: 82, r1: 52, monsters: ["swordmaster", "caster", "cinderling"], role: "fight" }, // G
    { c0: 43, r0: 74, c1: 52, r1: 83, monsters: ["brute", "brute", "caster"], role: "fight" }, // D
    { c0: 8, r0: 72, c1: 21, r1: 85, monsters: [], role: "boss" }, // C: the boss
  ];
  for (const room of rooms) open(room.c0, room.r0, room.c1, room.r1);
  const corridor = (c0: number, r0: number, c1: number, r1: number) => open(Math.min(c0, c1), Math.min(r0, r1), Math.max(c0, c1), Math.max(r0, r1));
  corridor(14, 16, 16, 39); // A - B
  corridor(46, 16, 48, 39); // F - E
  corridor(22, 46, 38, 48); // B - E
  corridor(57, 47, 72, 49); // E - G
  corridor(46, 57, 48, 73); // E - D
  corridor(14, 56, 16, 71); // B - C
  corridor(22, 78, 42, 80); // C - D
  // Golden gates where corridors meet rooms (just for looks).
  const gates: [number, number, number, number][] = [
    [14, 16, 16, 16], [14, 39, 16, 39], [46, 16, 48, 16], [46, 39, 48, 39], [22, 46, 22, 48], [38, 46, 38, 48],
    [57, 47, 57, 49], [72, 47, 72, 49], [46, 57, 48, 57], [46, 73, 48, 73], [14, 56, 14 + 2, 56], [14, 71, 16, 71], [22, 78, 22, 80], [42, 78, 42, 80],
  ];
  for (const [c0, r0, c1, r1] of gates) open(c0, r0, c1, r1, D_DOOR);
  const ox = 0;
  const oy = 0;
  const center = (room: DungeonRoom) => ({ x: ox + ((room.c0 + room.c1 + 1) / 2) * BLOCK, y: oy + ((room.r0 + room.r1 + 1) / 2) * BLOCK });
  const start = rooms.find((r) => r.role === "start")!;
  const exitRoom = rooms.find((r) => r.role === "exit")!;
  const bossRoom = rooms.find((r) => r.role === "boss")!;
  const guards = [
    { kind: "cinderling", x: 15.5 * BLOCK, y: 28 * BLOCK },
    { kind: "caster", x: 47.5 * BLOCK, y: 26 * BLOCK },
    { kind: "cinderling", x: 30 * BLOCK, y: 47.5 * BLOCK },
    { kind: "swordsman", x: 65 * BLOCK, y: 48.5 * BLOCK },
    { kind: "cinderling", x: 47.5 * BLOCK, y: 65 * BLOCK },
    { kind: "swordsman", x: 15.5 * BLOCK, y: 64 * BLOCK },
    { kind: "caster", x: 32 * BLOCK, y: 79.5 * BLOCK },
  ];
  const torches: { x: number; y: number }[] = [];
  for (const room of rooms) {
    for (const [c, r] of [[room.c0, room.r0], [room.c1 + 1, room.r0], [room.c0, room.r1 + 1], [room.c1 + 1, room.r1 + 1]]) torches.push({ x: c * BLOCK, y: r * BLOCK });
  }
  const spawn = center(start);
  return {
    name: "DUNGEON",
    theme: { ...THEME, floor: "#3a2a40", floor2: "#33243a", wall: "#1a141e", wallTop: "#4a3e56" },
    tiles,
    look,
    rooms,
    guards,
    spawns: { 1: [spawn], 2: [spawn] },
    cols: C,
    rows: R,
    ox,
    oy,
    spawn,
    exit: center(exitRoom),
    boss: center(bossRoom),
    torches,
  };
}

export const OPEN_WORLD: OpenMap = buildWorld();
export const DUNGEON: DungeonMap = buildDungeon();

/** How close to the portal a hero must stand to get on the list for the dungeon. */
export const PORTAL_RADIUS = 46;
/** Seconds between everyone at the portal being ready and the warp. */
export const PORTAL_COUNTDOWN = 3;
/** Players in one Open World room (more get another copy of the world). */
export const WORLD_MAX_PLAYERS = 40;
