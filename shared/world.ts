// The Open World (user request 2026-10-06): a big meadow with a village, a river, a lake and mountains,
// where every online player meets, chats and walks to the dungeon portal. Also the dungeon itself.
// Both are built the same way on every machine (a fixed seed), so the server and the clients agree on
// where the walls, trees and water are.

import { BLOCK, ClassicMap, MapTheme, T_FENCE, T_FLOOR, T_WALL, T_WATER } from "./maps";

export const WORLD_COLS = 100;
export const WORLD_ROWS = 76;

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
export const L_CLIFF = 12; // the rock face at the foot of the mountains (in the new world: the cliff, two blocks tall)
export const L_RUIN = 13; // old stone flags (the ruins in front of the cave)
export const L_FALL = 14; // the waterfall down the cliff
export const L_MEADOW = L_GRASS2; // the lighter, yellower grass

export type PropKind = "tree" | "blossom" | "pine" | "house" | "well" | "lamp" | "rock" | "bush" | "sign" | "stall" | "crop" | "boat" | "log" | "windmill";

export interface WorldProp {
  /** The new world: the name of the user's picture (client/art/props/ow_<kind>.png). */
  kind: string;
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

/**
 * The Open World, second edition (2026-10-11, user request: a new map from their own 32x32 tileset, a hero
 * 1.5 tiles tall). One block is one of their tiles. A grassy valley under a cliff: the dungeon cave in the
 * cliff behind old ruins, a cobbled square with a well, a river from a waterfall under a stone bridge,
 * a lake with a sandy beach and a stream with a wooden bridge, a fenced sheep pasture, and woods all round.
 */
function buildWorld(): OpenMap {
  const C = WORLD_COLS;
  const R = WORLD_ROWS;
  const tiles = new Uint8Array(C * R).fill(T_FLOOR);
  const look = new Uint8Array(C * R).fill(L_GRASS);
  const props: WorldProp[] = [];
  const rand = rng(20261011);
  const idx = (c: number, r: number) => r * C + c;
  const inside = (c: number, r: number) => c >= 0 && r >= 0 && c < C && r < R;
  const set = (c: number, r: number, l: number, t: number) => {
    if (!inside(c, r)) return;
    look[idx(c, r)] = l;
    tiles[idx(c, r)] = t;
  };
  const at = (c: number, r: number) => (inside(c, r) ? look[idx(c, r)] : L_MOUNTAIN);
  const tileAt = (c: number, r: number) => (inside(c, r) ? tiles[idx(c, r)] : T_WALL);
  const px = (c: number) => (c + 0.5) * BLOCK;
  const wet = (l: number) => l === L_WATER || l === L_DEEP;
  /** A prop standing with its bottom centre on the bottom of block (c, r); `solid` blocks round its foot. */
  const place = (kind: string, c: number, r: number, solid: [number, number] = [0, 0], dx = 0) => {
    props.push({ kind, x: px(c) + dx, y: (r + 1) * BLOCK - 1, v: 0 });
    const [w, h] = solid;
    for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) if (inside(c - Math.floor((w - 1) / 2) + dc, r - dr)) tiles[idx(c - Math.floor((w - 1) / 2) + dc, r - dr)] = T_WALL;
  };
  /** Nothing here yet: plain ground (of these looks) with nothing solid round it. */
  const clear = (c: number, r: number, pad: number, ok: (l: number) => boolean = (l) => l === L_GRASS || l === L_MEADOW) => {
    for (let dr = -pad; dr <= pad; dr++)
      for (let dc = -pad; dc <= pad; dc++) if (!ok(at(c + dc, r + dr)) || tileAt(c + dc, r + dr) !== T_FLOOR || used.has(idx(c + dc, r + dr))) return false;
    return true;
  };
  const used = new Set<number>(); // blocks with a prop on them (kept clear of the next one)
  const claim = (c: number, r: number) => used.add(idx(c, r));

  // Meadow: the lighter, yellower grass in soft patches, most of all round the sheep pasture in the east.
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      const n = Math.sin(c * 0.19 + Math.sin(r * 0.15) * 2) + Math.sin(r * 0.21 - c * 0.08) + (c - 60) / 22;
      if (n > 1.2) look[idx(c, r)] = L_MEADOW;
    }

  // The cliff along the top: a high wooded plateau, its rock face two blocks tall, flat in short runs.
  const CAVE = 50;
  const edge: number[] = [];
  {
    let e = 11;
    for (let c = 0; c < C; ) {
      const run = 3 + Math.floor(rand() * 5);
      for (let k = 0; k < run && c < C; k++, c++) edge[c] = Math.abs(c - CAVE) <= 7 ? 12 : e;
      e = Math.max(9, Math.min(13, e + (rand() < 0.5 ? -1 : 1)));
    }
  }
  for (let c = 0; c < C; c++) for (let r = 0; r < edge[c]; r++) set(c, r, r >= edge[c] - 2 ? L_CLIFF : L_MOUNTAIN, T_WALL);

  // The river: off the plateau in a waterfall, winding south under the stone bridge and off the map.
  const FALL = 76;
  const riverX = (r: number) => FALL + 3.2 * Math.sin((r - edge[FALL]) / 8) + 1.6 * Math.sin(r / 3.9);
  const riverHalf = (r: number) => 1.9 + 0.35 * Math.sin(r / 6);
  for (let r = 0; r < R; r++) {
    const cx = r < edge[FALL] ? FALL + 0.5 : riverX(r);
    const half = r < edge[FALL] ? 1.4 : riverHalf(r);
    for (let c = Math.floor(cx - half - 1); c <= Math.ceil(cx + half); c++) {
      const d = Math.abs(c + 0.5 - cx);
      if (d > half) continue;
      if (r >= edge[FALL] - 2 && r < edge[FALL]) set(c, r, L_FALL, T_WALL); // the waterfall down the cliff
      else set(c, r, r >= edge[FALL] && d < half - 1.1 ? L_DEEP : L_WATER, T_WATER);
    }
  }

  // The lake in the west, with a sandy beach, and its stream east to the river.
  const lake = { c: 17, r: 44, rc: 10.5, rr: 7.5 };
  const lakeD = (c: number, r: number) => Math.hypot((c + 0.5 - lake.c) / lake.rc, (r + 0.5 - lake.r) / lake.rr) + 0.09 * Math.sin(c * 0.8) * Math.cos(r * 0.7);
  for (let r = lake.r - 12; r <= lake.r + 12; r++)
    for (let c = lake.c - 15; c <= lake.c + 15; c++) {
      const d = lakeD(c, r);
      if (d <= 0.62) set(c, r, L_DEEP, T_WATER);
      else if (d <= 1) set(c, r, L_WATER, T_WATER);
      else if (d <= 1.3 && !wet(at(c, r)) && at(c, r) < L_MOUNTAIN) set(c, r, L_SAND, T_FLOOR);
    }
  const streamY = (c: number) => 50 + (c - 25) * 0.17 + 1.3 * Math.sin(c / 4.5);
  for (let c = 24; c < FALL; c++) {
    const y = streamY(c);
    for (let r = Math.floor(y - 1); r <= Math.ceil(y + 1); r++) if (Math.abs(r + 0.5 - y) <= 1.05 && at(c, r) < L_MOUNTAIN) set(c, r, L_WATER, T_WATER);
  }

  // Dirt roads, three blocks wide, a little wobbly. Over water they become bridges.
  const bridges: { c0: number; r0: number; c1: number; r1: number }[] = [];
  const road = (pts: [number, number][], w = 1) => {
    for (let k = 0; k + 1 < pts.length; k++) {
      const [c0, r0] = pts[k];
      const [c1, r1] = pts[k + 1];
      const n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0)) * 2;
      for (let i = 0; i <= n; i++) {
        const c = Math.round(c0 + ((c1 - c0) * i) / n);
        const r = Math.round(r0 + ((r1 - r0) * i) / n);
        for (let dr = -w; dr <= w; dr++)
          for (let dc = -w; dc <= w; dc++) {
            const l = at(c + dc, r + dr);
            if (wet(l)) set(c + dc, r + dr, L_BRIDGE, T_FLOOR);
            else if (l !== L_BRIDGE && l !== L_PLAZA && l !== L_RUIN && l < L_MOUNTAIN && l !== L_FALL) set(c + dc, r + dr, L_PATH, T_FLOOR);
          }
      }
    }
  };
  const SQ = { c: 46, r: 34 }; // the village square
  const ROAD_E = 34; // the east road's row (over the stone bridge)
  road([[SQ.c + 2, SQ.r - 4], [CAVE - 1, 23], [CAVE, edge[CAVE] + 3]]); // up to the ruins and the cave
  road([[SQ.c + 6, ROAD_E], [FALL - 6, ROAD_E], [FALL + 6, ROAD_E], [83, ROAD_E]], 0); // east over the river (two wide, the bridge deck)
  road([[SQ.c + 6, ROAD_E + 1], [FALL - 6, ROAD_E + 1], [FALL + 6, ROAD_E + 1], [83, ROAD_E + 1]], 0);
  road([[SQ.c, SQ.r + 4], [SQ.c - 1, 46], [SQ.c - 1, 62], [SQ.c + 3, 70]]); // south, over the stream
  road([[SQ.c - 6, SQ.r + 1], [34, 38], [27, 41]]); // west to the beach
  road([[60, 46], [SQ.c, 46]], 0); // a lane east, to the woods by the river
  road([[60, 47], [SQ.c, 47]], 0);
  // Square up each bridge to the box round it (a slanted road over water leaves stair steps).
  {
    const seen = new Set<number>();
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++) {
        if (at(c, r) !== L_BRIDGE || seen.has(idx(c, r))) continue;
        const todo = [[c, r]];
        const b = { c0: c, c1: c, r0: r, r1: r };
        seen.add(idx(c, r));
        while (todo.length) {
          const [x, y] = todo.pop()!;
          b.c0 = Math.min(b.c0, x); b.c1 = Math.max(b.c1, x); b.r0 = Math.min(b.r0, y); b.r1 = Math.max(b.r1, y);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const k = idx(x + dx, y + dy);
            if (at(x + dx, y + dy) === L_BRIDGE && !seen.has(k)) { seen.add(k); todo.push([x + dx, y + dy]); }
          }
        }
        for (let y = b.r0; y <= b.r1; y++) for (let x = b.c0; x <= b.c1; x++) if (wet(at(x, y))) set(x, y, L_BRIDGE, T_FLOOR);
        bridges.push(b);
      }
  }
  for (const b of bridges) {
    // Water to its left or right: the road crosses a stream running east-west (the wooden bridge);
    // otherwise it crosses the river east-west (the stone arch bridge).
    const midR = Math.floor((b.r0 + b.r1) / 2);
    const across = !(wet(at(b.c0 - 1, midR)) || wet(at(b.c1 + 1, midR)));
    if (across) {
      // Its railings: solid along the top and bottom edges past the deck.
      for (let c = b.c0; c <= b.c1; c++) for (const r of [b.r0 - 1, b.r1 + 1]) if (wet(at(c, r))) set(c, r, at(c, r), T_WALL);
      props.push({ kind: "bridge", x: ((b.c0 + b.c1 + 1) / 2) * BLOCK, y: (b.r1 + 1) * BLOCK + 10, v: 1 });
    } else props.push({ kind: "woodbridge", x: ((b.c0 + b.c1 + 1) / 2) * BLOCK, y: (b.r1 + 1) * BLOCK + 8, v: 1 });
  }

  // The village square: round cobbles.
  for (let r = SQ.r - 7; r <= SQ.r + 7; r++)
    for (let c = SQ.c - 9; c <= SQ.c + 9; c++) if (Math.hypot((c + 0.5 - SQ.c) / 8.5, (r + 0.5 - SQ.r) / 6.2) <= 1 && !wet(at(c, r))) set(c, r, L_PLAZA, T_FLOOR);

  // The ruins in front of the cave: worn stone flags with grass coming through.
  for (let r = edge[CAVE]; r <= edge[CAVE] + 7; r++)
    for (let c = CAVE - 9; c <= CAVE + 9; c++) {
      const d = Math.hypot((c + 0.5 - CAVE) / 9.5, (r - edge[CAVE]) / 7.5);
      if (d <= 1 && (d < 0.7 || rand() < 0.6) && at(c, r) < L_MOUNTAIN && !wet(at(c, r))) set(c, r, L_RUIN, T_FLOOR);
    }

  // The cave: the way down to the dungeon, set into the cliff. The portal is its mouth.
  props.push({ kind: "cave", x: px(CAVE), y: edge[CAVE] * BLOCK + 6, v: 0 });
  const portal = { x: px(CAVE), y: (edge[CAVE] + 0.6) * BLOCK };
  const spawn = { x: px(SQ.c), y: px(SQ.r + 3) };
  for (let c = CAVE - 2; c <= CAVE + 2; c++) for (let r = edge[CAVE] - 3; r < edge[CAVE]; r++) set(c, r, L_CLIFF, T_WALL);
  for (let r = edge[CAVE]; r <= edge[CAVE] + 2; r++) for (let c = CAVE - 3; c <= CAVE + 3; c++) claim(c, r);
  // Old pillars and broken walls round the ruins.
  for (const [c, r] of [[CAVE - 7, edge[CAVE] + 2], [CAVE + 7, edge[CAVE] + 2], [CAVE - 6, edge[CAVE] + 6], [CAVE + 6, edge[CAVE] + 6]]) { place("pillar", c, r, [1, 1]); claim(c, r); }
  place("wall", CAVE - 12, edge[CAVE] + 3, [3, 1]);
  place("wall", CAVE + 12, edge[CAVE] + 4, [3, 1]);
  place("banner", CAVE - 3, edge[CAVE] + 1, [1, 1], 4);
  place("banner", CAVE + 3, edge[CAVE] + 1, [1, 1], -4);

  // Around the square: the well in the middle, lanterns, banners, carts, crates and a signpost.
  place("well_a", SQ.c, SQ.r, [2, 1], BLOCK / 2);
  const lamps: [number, number][] = [[SQ.c - 7, SQ.r - 4], [SQ.c + 7, SQ.r - 4], [SQ.c - 7, SQ.r + 4], [SQ.c + 7, SQ.r + 4]];
  for (const [c, r] of lamps) place("lantern", c, r, [1, 1], -6);
  place("banner", SQ.c - 3, SQ.r - 6, [1, 1]);
  place("banner", SQ.c + 4, SQ.r - 6, [1, 1]);
  place("cart_a", SQ.c + 4, SQ.r + 5, [2, 1]);
  place("crate_a", SQ.c - 5, SQ.r + 5, [1, 1]);
  place("crate_b", SQ.c - 4, SQ.r + 6, [1, 1]);
  place("sack", SQ.c - 6, SQ.r + 6, [1, 1]);
  place("firewood", SQ.c + 7, SQ.r - 1, [1, 1]);
  place("signboard", SQ.c + 2, SQ.r - 5, [1, 1]);
  place("signbarrel", SQ.c - 9, SQ.r + 1, [1, 1]);
  place("haycart", 80, 40, [2, 1]);

  // The sheep pasture east of the river: a fenced field (gate on the road side) with sheep wandering in it.
  const pen = { c0: 84, r0: 22, c1: 95, r1: 46 };
  for (let c = pen.c0; c <= pen.c1; c++)
    for (let r = pen.r0; r <= pen.r1; r++) {
      if (c > pen.c0 && c < pen.c1 && r > pen.r0 && r < pen.r1) {
        if (at(c, r) === L_GRASS) look[idx(c, r)] = L_MEADOW;
        continue;
      }
      const gate = c === pen.c0 && (r === ROAD_E || r === ROAD_E + 1);
      if (gate) { set(c, r, L_PATH, T_FLOOR); continue; }
      set(c, r, at(c, r) === L_PATH ? L_MEADOW : at(c, r), T_FENCE);
      claim(c, r);
      const side = c === pen.c0 || c === pen.c1;
      props.push({ kind: side ? "post" : ["fence_a", "fence_b", "fence_e", "fence_g"][(c * 7 + r) % 4], x: px(c), y: (r + 1) * BLOCK - 1, v: 0 });
    }
  for (let i = 0; i < 9; i++) {
    const c = pen.c0 + 3 + Math.floor(rand() * (pen.c1 - pen.c0 - 5));
    const r = pen.r0 + 3 + Math.floor(rand() * (pen.r1 - pen.r0 - 5));
    props.push({ kind: `sheep_${"abcdef"[i % 6]}`, x: px(c), y: (r + 1) * BLOCK, v: 2 }); // v 2: walks about (client)
  }
  place("scarecrow", pen.c0 - 3, 28, [1, 1]);

  // Buildings (2026-10-11, the user's building sheet): a castle in the north-west, cottages round the square,
  // a market stall, a windmill by the pasture and a fishing dock with a water wheel on the lake.
  // `w` x `h` blocks round the foot are solid; the picture (`tw` x `th` blocks) is kept clear of trees.
  const building = (kind: string, c: number, r: number, w: number, h: number, tw: number, th: number) => {
    place(kind, c, r, [w, h]);
    for (let dr = -th; dr <= 1; dr++) for (let dc = -Math.ceil(tw / 2); dc <= Math.ceil(tw / 2); dc++) claim(c + dc, r + dr);
  };
  building("castle", 14, 27, 9, 4, 10, 11);
  building("house", 34, 30, 5, 3, 6, 6);
  building("house", 58, 44, 5, 3, 6, 6);
  building("house", 38, 47, 5, 3, 6, 6);
  building("market", 57, 29, 6, 2, 7, 4);
  building("windmill", 82, 54, 3, 3, 6, 7);
  building("dock", 22, 38, 6, 3, 7, 6);

  // The woods: a thick belt round the edges (solid, so nobody walks off), groves, and a few lone trees.
  const tree = (c: number, r: number, kind?: string) => {
    const k = kind ?? (rand() < 0.35 ? "pine" : ["oak_a", "oak_b", "oak_c"][Math.floor(rand() * 3)]);
    place(k, c, r, [1, 1], Math.round((rand() - 0.5) * 8));
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) claim(c + dc, r + dr);
  };
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      if (!(c < 3 || c > C - 4 || r > R - 4)) continue;
      if (at(c, r) >= L_MOUNTAIN) continue;
      if (!wet(at(c, r)) && (c + r) % 2 === 0) {
        const k = rand() < 0.4 ? "pine" : ["oak_a", "oak_b", "oak_c"][Math.floor(rand() * 3)];
        props.push({ kind: k, x: px(c) + Math.round((rand() - 0.5) * 8), y: (r + 1) * BLOCK - 1, v: 0 });
      }
      tiles[idx(c, r)] = T_WALL;
      claim(c, r);
    }
  const groves: [number, number, number][] = [
    [30, 18, 5], [12, 64, 8], [28, 66, 6], [62, 60, 7], [91, 66, 6], [66, 20, 4], [92, 14, 4], [36, 52, 3],
  ];
  for (const [gc, gr, rad] of groves)
    for (let k = 0; k < rad * rad * 5; k++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * rad;
      const c = Math.round(gc + Math.cos(a) * d);
      const r = Math.round(gr + Math.sin(a) * d * 0.8);
      if (clear(c, r, 1)) tree(c, r);
    }
  for (let k = 0; k < 1500; k++) {
    const c = 3 + Math.floor(rand() * (C - 6));
    const r = 3 + Math.floor(rand() * (R - 6));
    if (Math.hypot(c - SQ.c, r - SQ.r) < 14 || !clear(c, r, 2)) continue;
    if (rand() < 0.3) tree(c, r);
  }
  // Trees along the top of the cliff (out of reach, for the look of it).
  for (let c = 1; c < C - 1; c += 2) {
    if (Math.abs(c - CAVE) < 4 || Math.abs(c - FALL) < 3) continue;
    const r = edge[c] - 3 - (c % 3 === 0 ? 1 : 0);
    if (r >= 1 && at(c, r) === L_MOUNTAIN) props.push({ kind: rand() < 0.5 ? "pine" : "oak_b", x: px(c) + Math.round((rand() - 0.5) * 10), y: (r + 1) * BLOCK, v: 0 });
  }

  // Lanterns along the roads, lit at night.
  for (let r = 1; r < R - 1; r++)
    for (let c = 1; c < C - 1; c++) {
      if (at(c, r) !== L_PATH) continue;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const lc = c + dc;
        const lr = r + dr;
        if (!clear(lc, lr, 0) || Math.hypot(lc - SQ.c, lr - SQ.r) < 11) continue;
        if (lamps.some(([oc, or]) => Math.hypot(oc - lc, or - lr) < 11)) continue;
        lamps.push([lc, lr]);
        place("lampbanner", lc, lr, [1, 1]);
        claim(lc, lr);
        break;
      }
    }

  // Little things on the ground: bushes, rocks, stumps and logs (solid), flowers, tufts and reeds (not).
  const SMALL = ["flower_cream", "flower_d", "flower_gold", "flower_pink", "flower_white", "flower_yellow", "flowers_b", "flowers_c", "flowers_d", "flowers_e", "grass_a", "grass_b", "grass_c", "clover", "clover_b", "clover_c", "clovers"];
  const SOLID = ["rock_a", "rock_c", "rocks", "boulder", "stump_a", "stump_b", "stump_c", "log", "mosslog", "bush_big"];
  const SOFT = ["bush_a", "bush_b", "bush_c", "bush_d", "bush_e", "bush_rose", "bush_white", "fern", "sapling", "deadbush", "mushroom", "twigs", "branch", "stickrock", "rock_b"];
  for (let k = 0; k < 3000; k++) {
    const c = 3 + Math.floor(rand() * (C - 6));
    const r = 3 + Math.floor(rand() * (R - 6));
    const l = at(c, r);
    const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => wet(at(c + dc, r + dr)));
    if (shore && (l === L_GRASS || l === L_MEADOW || l === L_SAND) && tileAt(c, r) === T_FLOOR && !used.has(idx(c, r))) {
      if (rand() < 0.35) props.push({ kind: rand() < 0.5 ? "reeds_a" : "reeds_b", x: px(c) + Math.round((rand() - 0.5) * 12), y: (r + 1) * BLOCK - Math.floor(rand() * 8), v: 0 });
      continue;
    }
    if (!clear(c, r, 0) || Math.hypot(c - SQ.c, r - SQ.r) < 10 || Math.hypot(portal.x / BLOCK - c, portal.y / BLOCK - r) < 4) continue;
    const roll = rand();
    if (roll < 0.62) props.push({ kind: SMALL[Math.floor(rand() * SMALL.length)], x: px(c) + Math.round((rand() - 0.5) * 14), y: (r + 1) * BLOCK - Math.floor(rand() * 10), v: 0 });
    else if (roll < 0.86) {
      if (!clear(c, r, 1)) continue;
      props.push({ kind: SOFT[Math.floor(rand() * SOFT.length)], x: px(c), y: (r + 1) * BLOCK - 2, v: 0 });
      claim(c, r);
    } else if (roll < 0.94) {
      if (!clear(c, r, 1)) continue;
      place(SOLID[Math.floor(rand() * SOLID.length)], c, r, [1, 1]);
      claim(c, r);
    }
  }
  props.sort((a, b) => a.y - b.y);
  return { name: "OPEN WORLD", theme: THEME, tiles, look, props, spawns: { 1: [spawn], 2: [spawn] }, cols: C, rows: R, ox: 0, oy: 0, spawn, portal };
}

// ---------------------------------------------------------------- dungeon

export const DUNGEON_COLS = 36;
export const DUNGEON_ROWS = 38;
export const D_FLOOR = 0; // the dark flagstones in the middle of the hall
export const D_WALL = 1;
export const D_DOOR = 2; // a golden gate (open)
export const D_WALK = 3; // the worn, mossy stone walk round the edge of the hall
export const D_STAIRS = 4; // the steps down to the way in

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
  /** Monsters standing guard. */
  guards: { kind: string; x: number; y: number }[];
  spawn: { x: number; y: number };
  exit: { x: number; y: number };
  boss: { x: number; y: number };
  torches: { x: number; y: number }[];
  /** The carved circle of runes in the middle of the floor. */
  rune: { x: number; y: number; r: number };
}

/**
 * The dungeon is one room now (user request 2026-10-07): the Ancient Knight's Sanctuary from the user's
 * top-down map. An eight-sided hall with a mossy stone walk round its edge, the knight's alcove at the top,
 * a circle of runes in the middle, a minion on either side and the steps in at the bottom.
 */
function buildDungeon(): DungeonMap {
  const C = DUNGEON_COLS;
  const R = DUNGEON_ROWS;
  const tiles = new Uint8Array(C * R).fill(T_WALL);
  const look = new Uint8Array(C * R).fill(D_WALL);
  const set = (c: number, r: number, l: number) => {
    if (c < 0 || r < 0 || c >= C || r >= R) return;
    tiles[r * C + c] = T_FLOOR;
    look[r * C + c] = l;
  };
  const room: DungeonRoom = { c0: 3, r0: 4, c1: 32, r1: 33, monsters: [], role: "boss" };
  const cut = 5; // the corners are cut off diagonally
  for (let r = room.r0; r <= room.r1; r++)
    for (let c = room.c0; c <= room.c1; c++) {
      const dx0 = c - room.c0;
      const dx1 = room.c1 - c;
      const dy0 = r - room.r0;
      const dy1 = room.r1 - r;
      const corner = Math.min(dx0 + dy0, dx1 + dy0, dx0 + dy1, dx1 + dy1);
      if (corner < cut) continue;
      const edge = Math.min(dx0, dx1, dy0, dy1) < 2 || corner < cut + 2;
      set(c, r, edge ? D_WALK : D_FLOOR);
    }
  for (let r = 1; r < room.r0; r++) for (let c = 15; c <= 20; c++) set(c, r, D_WALK); // the knight's alcove
  for (let r = room.r1 + 1; r < R; r++) for (let c = 16; c <= 19; c++) set(c, r, D_STAIRS); // the way in
  const b = BLOCK;
  const midX = 18 * b;
  const torches = [
    [3, 12], [3, 25], [33, 12], [33, 25], [10, 4], [26, 4], [10, 34], [26, 34],
  ].map(([c, r]) => ({ x: c * b, y: r * b }));
  const spawn = { x: midX, y: 35.5 * b };
  return {
    name: "DUNGEON",
    theme: { ...THEME, floor: "#34343a", floor2: "#2e2e33", wall: "#16171a", wallTop: "#5e6050" },
    tiles,
    look,
    rooms: [room],
    guards: [
      { kind: "stonecrawler", x: 8.5 * b, y: 16 * b },
      { kind: "stonecrawler", x: 27.5 * b, y: 16 * b },
    ],
    spawns: { 1: [spawn], 2: [spawn] },
    cols: C,
    rows: R,
    ox: 0,
    oy: 0,
    spawn,
    exit: { x: midX, y: 30.5 * b },
    boss: { x: midX, y: 9.5 * b },
    torches,
    rune: { x: midX, y: 19.5 * b, r: 86 },
  };
}

export const D_POOL = 5; // the Sunken Temple's flooded pits (water you can't walk through)

/**
 * The Sunken Temple (2026-10-08): Cthulhu's ancient flooded hall, reached from his window on the home
 * screen. A round hall of old green stone with a mossy walk round its edge, four flooded pits, broken
 * pillars to hide behind from his beam, his dais at the top and the steps in at the bottom. No minions.
 */
/** The user's picture of Cthulhu's hall (client/public/abyss-room.jpg) is 1536x1024; one block is 24 of its pixels. */
export const ABYSS_ART = { w: 1536, h: 1024, scale: BLOCK / 24 };

type Rect = [number, number, number, number];
type Circle = [number, number, number];

/**
 * A boss room drawn by the user as one 1536x1024 picture: `open` rectangles (picture pixels) are floor,
 * `solid` circles are pillars, statues and braziers standing on it. Spawn, boss and torches are picture pixels too.
 */
function pictureRoom(
  name: string,
  open: Rect[],
  solid: Circle[],
  spawn: [number, number],
  boss: [number, number],
  torches: [number, number][],
  size: [number, number] = [1536, 1024],
  ovals: [number, number, number, number][] = [], // more open ground: [cx, cy, rx, ry]
): DungeonMap {
  const C = Math.ceil(size[0] / 24);
  const R = Math.ceil(size[1] / 24);
  const tiles = new Uint8Array(C * R).fill(T_WALL);
  const look = new Uint8Array(C * R).fill(D_WALL);
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      const x = c * 24 + 12;
      const y = r * 24 + 12;
      const inRect = open.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
      const inOval = ovals.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
      if (!inRect && !inOval) continue;
      if (solid.some(([sx, sy, sr]) => Math.hypot(x - sx, y - sy) < sr + 6)) continue;
      tiles[r * C + c] = T_FLOOR;
      look[r * C + c] = D_FLOOR;
    }
  const k = ABYSS_ART.scale;
  const at = (x: number, y: number) => ({ x: x * k, y: y * k });
  const where = at(...spawn);
  return {
    name,
    theme: { ...THEME, floor: "#22302c", floor2: "#1e2a27", wall: "#0c1412", wallTop: "#3e5a48" },
    tiles,
    look,
    rooms: [{ c0: 3, r0: 4, c1: 60, r1: 40, monsters: [], role: "boss" }],
    guards: [],
    spawns: { 1: [where], 2: [where] },
    cols: C,
    rows: R,
    ox: 0,
    oy: 0,
    spawn: where,
    exit: at(spawn[0], spawn[1] - 60),
    boss: at(...boss),
    torches: torches.map(([x, y]) => at(x, y)),
    rune: { ...at(...boss), r: 0 },
  };
}

function buildAbyss(): DungeonMap {
  return pictureRoom(
    "SUNKEN TEMPLE",
    // Only the stonework (2026-10-08, user: no wading into the water): the stairs, the bridges and side rooms...
    [
      [705, 20, 835, 260], // north stairs
      [705, 740, 835, 1000], // south stairs (the way in)
      [260, 440, 450, 565], // west bridge
      [85, 385, 265, 600], // west room
      [1090, 440, 1280, 565], // east bridge
      [1270, 385, 1455, 600], // east room
    ],
    // The lanterns on the dais and the posts round its rim and beside the stairs.
    [
      [620, 335, 28], [905, 335, 28], [625, 630, 28], [905, 630, 28],
      [455, 340, 20], [1075, 335, 20], [465, 672, 20], [1062, 672, 20],
      [660, 190, 26], [870, 190, 26], [660, 770, 26], [870, 770, 26],
      [230, 400, 18], [230, 580, 18], [1305, 400, 18], [1305, 580, 18],
    ],
    [770, 960],
    [765, 480],
    [
      [665, 55], [860, 55], [660, 180], [870, 180], [620, 325], [905, 325], [625, 625], [905, 625],
      [455, 335], [1075, 335], [465, 670], [1060, 670], [660, 765], [870, 765], [660, 930], [870, 930],
      [80, 395], [230, 400], [75, 570], [230, 560], [1455, 395], [1305, 400], [1455, 570], [1305, 560],
    ],
    undefined,
    [[768, 505, 332, 296]], // ...and the round dais
  );
}

/** The Celestial Sanctum (2026-10-08): the God Knight's hall in the clouds, from the user's picture (heaven-room.jpg). */
function buildHeaven(): DungeonMap {
  return pictureRoom(
    "CELESTIAL SANCTUM",
    [
      [255, 150, 1285, 780], // the great floor
      [380, 780, 1160, 880], // ...down to the steps
      [700, 100, 835, 160], // up toward the throne
      [705, 860, 830, 1000], // the steps in
      [130, 250, 255, 400], [110, 420, 255, 560], [180, 640, 255, 770], // west wing
      [1285, 250, 1410, 400], [1285, 420, 1430, 560], [1285, 640, 1360, 770], // east wing
    ],
    [
      [330, 200, 45], [1195, 200, 45], [300, 770, 45], [1230, 770, 45], // the angel statues
      [660, 170, 35], [870, 170, 35], [660, 860, 35], [870, 860, 35], // braziers by the stairs
      [605, 330, 35], [930, 330, 35], [605, 670, 35], [930, 670, 35], // the four pedestals round the star
      [430, 525, 30], [1105, 525, 30], [460, 840, 30], [1075, 840, 30], // pillars
      [270, 420, 22], [270, 560, 22], [1265, 420, 22], [1265, 560, 22],
    ],
    [768, 960],
    [768, 505],
    [
      [660, 150], [870, 150], [605, 305], [930, 305], [605, 645], [930, 645], [430, 450], [1105, 450],
      [460, 790], [1075, 790], [660, 840], [870, 840], [270, 410], [270, 545], [1265, 410], [1265, 545],
    ],
  );
}

export const OPEN_WORLD: OpenMap = buildWorld();
export const DUNGEON: DungeonMap = buildDungeon();
export const ABYSS: DungeonMap = buildAbyss();
export const HEAVEN: DungeonMap = buildHeaven();
/** The Glitch's rift (2026-10-08): a round black platform over the void, from the user's picture (glitch-room.jpg, 1312x1199). */
export const GLITCH: DungeonMap = pictureRoom(
  "THE RIFT",
  [
    [325, 245, 990, 905], // the round platform (trimmed to a circle below)
    [605, 140, 705, 260], // north stairs
    [600, 790, 710, 1185], // the long bridge in from the south
    [0, 500, 335, 640], // west bridge
    [985, 500, 1312, 640], // east bridge
  ],
  [
    [656, 575, 60], // the black hole in the middle
    // The platform is round: block its square corners.
    [325, 245, 150], [990, 245, 150], [325, 905, 150], [990, 905, 150],
  ],
  [656, 1120],
  [656, 575],
  [[370, 200], [940, 200], [370, 845], [940, 845], [656, 575]],
  [1312, 1199],
);

/** How close to the portal a hero must stand to get on the list for the dungeon. */
export const PORTAL_RADIUS = 46;
/** Seconds between everyone at the portal being ready and the warp. */
export const PORTAL_COUNTDOWN = 3;
/** Players in one Open World room (more get another copy of the world). */
export const WORLD_MAX_PLAYERS = 40;
