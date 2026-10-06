// Classic 3v3 maps (user request 2026-10-06): tall Brawl-Stars-style arenas, Red spawns at the top and
// Blue at the bottom. Each map is drawn as its top half plus the middle row; the bottom half is the top
// turned half a circle, so both sides get the same map.

/** One map block, in world pixels. Heroes are about one and a half blocks tall. */
export const BLOCK = 21;
export const MAP_COLS_C = 21;
export const MAP_ROWS_C = 33;
/** Where the map's top-left corner sits in the 960x720 world (centred). */
export const MAP_X = 260;
export const MAP_Y = 14;
export const MAP_W = MAP_COLS_C * BLOCK;
export const MAP_H = MAP_ROWS_C * BLOCK;

export const T_FLOOR = 0;
export const T_WALL = 1; // stone wall: blocks walking and shots
export const T_CRATE = 2; // crates and barrels: block walking and shots
export const T_FENCE = 3; // fences and hedges: block walking and shots
export const T_BUSH = 4; // tall grass: walk through it and hide in it
export const T_WATER = 5; // water: blocks walking, shots fly over it

export type Team = 1 | 2; // 1 = Red (top), 2 = Blue (bottom)

export interface MapTheme {
  floor: string;
  floor2: string; // checker squares
  wall: string;
  wallTop: string;
  crate: string;
  crateTop: string;
  fence: string;
  fenceTop: string;
  bush: string;
  bushDark: string;
  water: string;
  waterLight: string;
}

export interface ClassicMap {
  name: string;
  theme: MapTheme;
  tiles: Uint8Array; // row by row
  spawns: Record<Team, { x: number; y: number }[]>;
}

const CODES: Record<string, number> = { ".": T_FLOOR, "#": T_WALL, C: T_CRATE, c: T_CRATE, F: T_FENCE, B: T_BUSH, W: T_WATER, r: T_FLOOR };

/** Builds a map from its top 16 rows and the middle row (which must read the same both ways). */
function build(name: string, theme: MapTheme, top: string[], middle: string): ClassicMap {
  const rows = [...top, middle, ...top.slice().reverse().map((r) => [...r].reverse().join(""))];
  if (rows.length !== MAP_ROWS_C || rows.some((r) => r.length !== MAP_COLS_C)) throw new Error(`map ${name}: bad size`);
  if ([...middle].reverse().join("") !== middle) throw new Error(`map ${name}: middle row is not symmetric`);
  const tiles = new Uint8Array(MAP_COLS_C * MAP_ROWS_C);
  const spawns: ClassicMap["spawns"] = { 1: [], 2: [] };
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      tiles[y * MAP_COLS_C + x] = CODES[ch] ?? T_FLOOR;
      if (ch === "r") spawns[y < MAP_ROWS_C / 2 ? 1 : 2].push(tileCenter(x, y));
    }),
  );
  // Blue's spawns are Red's turned round; list them left to right like Red's.
  spawns[1].sort((a, b) => a.x - b.x);
  spawns[2].sort((a, b) => a.x - b.x);
  return { name, theme, tiles, spawns };
}

export function tileCenter(col: number, row: number) {
  return { x: MAP_X + (col + 0.5) * BLOCK, y: MAP_Y + (row + 0.5) * BLOCK };
}

export const CLASSIC_MAPS: ClassicMap[] = [
  build(
    "CANYON CLASH",
    { floor: "#b0604c", floor2: "#a65a47", wall: "#8a4a3a", wallTop: "#c88a6a", crate: "#c9965f", crateTop: "#f0c890", fence: "#c07a50", fenceTop: "#f0b080",
      bush: "#d055c0", bushDark: "#9a2e8e", water: "#3a8ad0", waterLight: "#7ac0f0" },
    [
      "B.......r.r.r......BB",
      "..##..............BB.",
      "...##BB..............",
      "...BBBB....CC.CC.....",
      "..BBBBBB.CCCCCC......",
      ".BBBBB...CCCC........",
      "BBBB....CCC.....BBBB.",
      "BBB....CCC.....BBBBBB",
      "BBBB..CCC.......BBBBB",
      ".BBBB..............cc",
      "..BBBBB..........CCCC",
      "...BBB..........CCCC.",
      "..............CCCC...",
      ".....................",
      "........B............",
      ".....................",
    ],
    "..cc......#......cc..",
  ),
  build(
    "ROSE FORTRESS",
    { floor: "#8a4a5e", floor2: "#824458", wall: "#c0606e", wallTop: "#f0a0aa", crate: "#7a7a8a", crateTop: "#b0b0c0", fence: "#c0606e", fenceTop: "#f0a0aa",
      bush: "#2ab0b8", bushDark: "#14787e", water: "#3a8ad0", waterLight: "#7ac0f0" },
    [
      "........r.r.r...BBBBB",
      "...................BB",
      ".......CC.....#......",
      ".....................",
      ".....................",
      "................#....",
      ".......##.....####...",
      "..BBBBBBBBBBBBBBBB...",
      "..BBBBBBBBBBBBBBBB...",
      "..BB.....#######.#...",
      "..BB.....BBBB....#...",
      ".........BBBB........",
      ".....................",
      "..#..................",
      ".....................",
      ".....................",
    ],
    ".........#.#.........",
  ),
  build(
    "FROST LAKE",
    { floor: "#24386e", floor2: "#203266", wall: "#3a8ad8", wallTop: "#8ad0ff", crate: "#3a8ad8", crateTop: "#8ad0ff", fence: "#2a6ad0", fenceTop: "#6ab0ff",
      bush: "#8a9aff", bushDark: "#5a62c8", water: "#3ab0e0", waterLight: "#9ae8ff" },
    [
      "BBBBBBBBBBBBBBB......",
      "BBBBBBBBBBBBBBBB.....",
      ".......FFFFFFFB......",
      "........r.r.r........",
      ".....................",
      ".....................",
      "BB...................",
      "BBB###...............",
      "BB..###..............",
      "B....###......##W....",
      "......###.....WW.....",
      ".....BBBBBBBBBBBBBBB.",
      "......BBBBBBBBBBBBBBF",
      "...............##..BF",
      "...................BF",
      ".F..................F",
    ],
    ".F.......#.#.......F.",
  ),
  build(
    "BUBBLEGUM GARDEN",
    { floor: "#f4b0c8", floor2: "#eca4be", wall: "#2ab0a8", wallTop: "#7ae8d8", crate: "#e8d060", crateTop: "#fff0a0", fence: "#2ab0a8", fenceTop: "#7ae8d8",
      bush: "#c040b0", bushDark: "#8a2080", water: "#3a9ad8", waterLight: "#8ad0ff" },
    [
      "BBBBBB..r.r.r....B...",
      "BBBBB................",
      "BB...............####",
      "B.............######.",
      ".................##..",
      "....CC.BBBB......##..",
      "....CC.BBBBB.....##B.",
      "...BB.BBBB..WWW..##B.",
      "...##.......WW...##BB",
      ".................##BB",
      "BB...............##BB",
      "BBBB.............##BB",
      "BBBBB...........BBBBB",
      "BBBBB...........BBBBB",
      "BBBB..............BB.",
      "BB...................",
    ],
    "BB........#........BB",
  ),
  build(
    "RIVERSIDE",
    { floor: "#8a4a5e", floor2: "#824458", wall: "#c0606e", wallTop: "#f0a0aa", crate: "#5a5a8a", crateTop: "#9a9ac8", fence: "#2a9a3a", fenceTop: "#6ad86a",
      bush: "#2ab0b8", bushDark: "#14787e", water: "#3a9ad8", waterLight: "#8ad0ff" },
    [
      "........r.r.r........",
      ".....................",
      "...BBB.........####..",
      "..BBBBB....WWWWWW....",
      "..BBBB...........BB..",
      "..BBB.............B..",
      "..BBBB...........BBFF",
      "..BBB.....B......BBFF",
      "...BB#####BB.....BBFF",
      "...BB.....BB........F",
      "FF..B..BB.........FFF",
      "FF.....BBB...........",
      "FF.....WWWWW.........",
      "FF.....WWWWW.BB......",
      "FF.......BBBBB.......",
      "FF.........BB........",
    ],
    "FF.......B.B.......FF",
  ),
  build(
    "SANDY RANCH",
    { floor: "#e8c48a", floor2: "#e0ba80", wall: "#c0703a", wallTop: "#f0a86a", crate: "#d0803a", crateTop: "#f8b870", fence: "#2a9a3a", fenceTop: "#6ad86a",
      bush: "#3ab83a", bushDark: "#1e7e24", water: "#3a9ad8", waterLight: "#8ad0ff" },
    [
      "CCCCC...r.r.r.....BBB",
      "BBB...............BBB",
      "BB......CCC.......CCC",
      "BB...c.............BB",
      "BBBBBBBBBBBBBBBBBBBBB",
      "B...................B",
      "B...CC.CC......C....B",
      "B...C...C......C....B",
      "B..............C...BB",
      "BB....BBBBBBBBCC...BB",
      "BB.............C...BB",
      "BBB..C.............BB",
      "BB...CC.............B",
      "B...................B",
      "B..........c........B",
      "BB..............CC..B",
    ],
    "BB........C........BB",
  ),
];

export function classicMap(i: number): ClassicMap {
  return CLASSIC_MAPS[((i % CLASSIC_MAPS.length) + CLASSIC_MAPS.length) % CLASSIC_MAPS.length];
}

/** The tile at a world spot; everything outside the map counts as wall. */
export function tileAt(m: ClassicMap, x: number, y: number): number {
  const c = Math.floor((x - MAP_X) / BLOCK);
  const r = Math.floor((y - MAP_Y) / BLOCK);
  if (c < 0 || r < 0 || c >= MAP_COLS_C || r >= MAP_ROWS_C) return T_WALL;
  return m.tiles[r * MAP_COLS_C + c];
}

function solidTile(t: number) {
  return t === T_WALL || t === T_CRATE || t === T_FENCE || t === T_WATER;
}

/** Can a shot pass this spot? Walls, crates and fences stop it; water and grass don't. */
export function mapBlocksShot(m: ClassicMap, x: number, y: number): boolean {
  const t = tileAt(m, x, y);
  return t === T_WALL || t === T_CRATE || t === T_FENCE;
}

export function inBush(m: ClassicMap, x: number, y: number): boolean {
  return tileAt(m, x, y) === T_BUSH;
}

/** Push a circle out of every solid block it overlaps. */
function pushOut(m: ClassicMap, x: number, y: number, r: number): { x: number; y: number } {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    const c0 = Math.floor((x - r - MAP_X) / BLOCK);
    const c1 = Math.floor((x + r - MAP_X) / BLOCK);
    const r0 = Math.floor((y - r - MAP_Y) / BLOCK);
    const r1 = Math.floor((y + r - MAP_Y) / BLOCK);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const t = col < 0 || row < 0 || col >= MAP_COLS_C || row >= MAP_ROWS_C ? T_WALL : m.tiles[row * MAP_COLS_C + col];
        if (!solidTile(t)) continue;
        const left = MAP_X + col * BLOCK;
        const top = MAP_Y + row * BLOCK;
        const cx = Math.max(left, Math.min(left + BLOCK, x));
        const cy = Math.max(top, Math.min(top + BLOCK, y));
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.hypot(dx, dy);
        if (d >= r) continue;
        moved = true;
        if (d > 0.0001) {
          x = cx + (dx / d) * r;
          y = cy + (dy / d) * r;
        } else {
          // Centre inside the block: out through the nearest side.
          const outs = [x - left + r, left + BLOCK - x + r, y - top + r, top + BLOCK - y + r];
          const i = outs.indexOf(Math.min(...outs));
          if (i === 0) x = left - r;
          else if (i === 1) x = left + BLOCK + r;
          else if (i === 2) y = top - r;
          else y = top + BLOCK + r;
        }
      }
    }
    if (!moved) break;
  }
  return { x, y };
}

/** The nearest walkable block centre to a spot (for anything that lands deep inside walls). */
function nearestOpen(m: ClassicMap, x: number, y: number): { x: number; y: number } {
  const c = Math.max(0, Math.min(MAP_COLS_C - 1, Math.floor((x - MAP_X) / BLOCK)));
  const r = Math.max(0, Math.min(MAP_ROWS_C - 1, Math.floor((y - MAP_Y) / BLOCK)));
  for (let ring = 0; ring < 34; ring++) {
    let best: { x: number; y: number } | undefined;
    let bestD = Infinity;
    for (let row = r - ring; row <= r + ring; row++) {
      for (let col = c - ring; col <= c + ring; col++) {
        if (Math.max(Math.abs(row - r), Math.abs(col - c)) !== ring) continue;
        if (col < 0 || row < 0 || col >= MAP_COLS_C || row >= MAP_ROWS_C || solidTile(m.tiles[row * MAP_COLS_C + col])) continue;
        const p = tileCenter(col, row);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) [best, bestD] = [p, d];
      }
    }
    if (best) return best;
  }
  return { x, y };
}

/** Move a circle on a Classic map: slides along walls, never through them (fast moves go in small steps). */
export function moveOnMap(m: ClassicMap, x: number, y: number, dx: number, dy: number, r: number): { x: number; y: number } {
  if (solidTile(tileAt(m, x, y))) ({ x, y } = nearestOpen(m, x, y)); // dropped inside a wall: out to open ground first
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (BLOCK * 0.4)));
  for (let i = 0; i < steps; i++) ({ x, y } = pushOut(m, x + dx / steps, y + dy / steps, r));
  if (solidTile(tileAt(m, x, y))) ({ x, y } = nearestOpen(m, x, y));
  return { x, y };
}

/** Nothing solid for shots between two spots? */
export function mapLineClear(m: ClassicMap, x0: number, y0: number, x1: number, y1: number): boolean {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
  for (let i = 1; i < n; i++) if (mapBlocksShot(m, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
  return true;
}

/** Walking distance (in blocks) from every block to the target's block; -1 where it can't be reached. */
export function distanceField(m: ClassicMap, x: number, y: number): Int16Array {
  const dist = new Int16Array(MAP_COLS_C * MAP_ROWS_C).fill(-1);
  const c = Math.floor((x - MAP_X) / BLOCK);
  const r = Math.floor((y - MAP_Y) / BLOCK);
  if (c < 0 || r < 0 || c >= MAP_COLS_C || r >= MAP_ROWS_C) return dist;
  const queue = [r * MAP_COLS_C + c];
  dist[queue[0]] = 0;
  for (let q = 0; q < queue.length; q++) {
    const at = queue[q];
    const ac = at % MAP_COLS_C;
    const ar = (at - ac) / MAP_COLS_C;
    for (const [nc, nr] of [[ac + 1, ar], [ac - 1, ar], [ac, ar + 1], [ac, ar - 1]]) {
      if (nc < 0 || nr < 0 || nc >= MAP_COLS_C || nr >= MAP_ROWS_C) continue;
      const ni = nr * MAP_COLS_C + nc;
      if (dist[ni] >= 0 || solidTile(m.tiles[ni])) continue;
      dist[ni] = dist[at] + 1;
      queue.push(ni);
    }
  }
  return dist;
}

/** Which way to walk from (x, y) to get closer along a distance field (a unit vector, or 0,0). */
export function stepAlong(dist: Int16Array, x: number, y: number): { x: number; y: number } {
  const c = Math.floor((x - MAP_X) / BLOCK);
  const r = Math.floor((y - MAP_Y) / BLOCK);
  const here = c >= 0 && r >= 0 && c < MAP_COLS_C && r < MAP_ROWS_C ? dist[r * MAP_COLS_C + c] : -1;
  let best: { x: number; y: number } | undefined;
  let bestD = here < 0 ? 9999 : here;
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= MAP_COLS_C || nr >= MAP_ROWS_C) continue;
    const d = dist[nr * MAP_COLS_C + nc];
    // Diagonals only when both sides are open, so we don't snag on corners.
    if (d < 0 || (dc && dr && (dist[r * MAP_COLS_C + nc] < 0 || dist[nr * MAP_COLS_C + c] < 0))) continue;
    if (d < bestD) [bestD, best] = [d, tileCenter(nc, nr)];
  }
  if (!best) return { x: 0, y: 0 };
  const len = Math.hypot(best.x - x, best.y - y) || 1;
  return { x: (best.x - x) / len, y: (best.y - y) / len };
}

const regionCache = new WeakMap<ClassicMap, Int16Array>();

/** Which patch of tall grass a spot is in (touching grass blocks form one patch); -1 outside grass. */
export function bushPatch(m: ClassicMap, x: number, y: number): number {
  let ids = regionCache.get(m);
  if (!ids) {
    ids = new Int16Array(m.tiles.length).fill(-1);
    let next = 0;
    for (let i = 0; i < m.tiles.length; i++) {
      if (m.tiles[i] !== T_BUSH || ids[i] >= 0) continue;
      const queue = [i];
      ids[i] = next;
      for (let q = 0; q < queue.length; q++) {
        const at = queue[q];
        const c = at % MAP_COLS_C;
        const r = (at - c) / MAP_COLS_C;
        for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
          if (nc < 0 || nr < 0 || nc >= MAP_COLS_C || nr >= MAP_ROWS_C) continue;
          const ni = nr * MAP_COLS_C + nc;
          if (m.tiles[ni] === T_BUSH && ids[ni] < 0) {
            ids[ni] = next;
            queue.push(ni);
          }
        }
      }
      next++;
    }
    regionCache.set(m, ids);
  }
  if (tileAt(m, x, y) !== T_BUSH) return -1;
  return ids[Math.floor((y - MAP_Y) / BLOCK) * MAP_COLS_C + Math.floor((x - MAP_X) / BLOCK)];
}

/** Can someone at (ax, ay) see a hero at (bx, by)? Not into grass, unless both stand in the same patch. */
export function seesInto(m: ClassicMap, ax: number, ay: number, bx: number, by: number): boolean {
  const patch = bushPatch(m, bx, by);
  return patch < 0 || patch === bushPatch(m, ax, ay);
}
