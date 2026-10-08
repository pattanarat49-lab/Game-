// Pixel art for the Open World and the dungeon (2026-10-06), all painted in code so the single-file
// solo build carries it: the ground in big chunks, then every tree, house and lamp as its own picture
// so heroes can walk behind them.

import { BLOCK } from "../../shared/maps";
import {
  D_DOOR,
  D_POOL,
  DungeonMap,
  D_STAIRS,
  D_WALK,
  D_WALL,
  DUNGEON,
  L_BRIDGE,
  L_CLIFF,
  L_DEEP,
  L_FARM,
  L_FLOWERS,
  L_GRASS,
  L_GRASS2,
  L_MOUNTAIN,
  L_PATH,
  L_PLAZA,
  L_SAND,
  L_SNOW,
  L_WATER,
  OPEN_WORLD,
  PropKind,
} from "../../shared/world";

/** The same pseudo-random numbers for the same spot, so the ground looks the same every time. */
function hash(x: number, y: number, k = 0): number {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}
const baseShade = shade;

/** The Sunken Temple's stone: the dungeon's colours pulled toward an old sea-green. */
function sunken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.62);
  const g = Math.min(255, Math.round(((n >> 8) & 255) * 0.95 + 8));
  const b = Math.round((n & 255) * 0.8);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export const CHUNK = BLOCK * 25; // ground pictures are cut into squares this big

const GRASS = ["#62b043", "#58a53b", "#6cbb4a"];
const GRASS2 = ["#4e9a35", "#46902f", "#57a33d"];

/** Paints one block of Open World ground at (x, y) on the canvas. */
function paintWorldBlock(ctx: CanvasRenderingContext2D, c: number, r: number, x: number, y: number) {
  const m = OPEN_WORLD;
  const at = (cc: number, rr: number) => (cc < 0 || rr < 0 || cc >= m.cols || rr >= m.rows ? L_MOUNTAIN : m.look[rr * m.cols + cc]);
  const l = at(c, r);
  const b = BLOCK;
  const dots = (colors: string[], n: number, size = 1, k = 0) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = colors[Math.floor(hash(c, r, i * 7 + k) * colors.length)];
      ctx.fillRect(x + Math.floor(hash(c, r, i * 3 + 1 + k) * (b - size)), y + Math.floor(hash(c, r, i * 5 + 2 + k) * (b - size)), size, size);
    }
  };
  const grassy = (pal: string[]) => {
    ctx.fillStyle = pal[0];
    ctx.fillRect(x, y, b, b);
    dots(pal, 18, 2);
    // Little tufts of grass.
    for (let i = 0; i < 3; i++) {
      const tx = x + 2 + Math.floor(hash(c, r, 40 + i) * (b - 5));
      const ty = y + 3 + Math.floor(hash(c, r, 50 + i) * (b - 6));
      ctx.fillStyle = shade(pal[0], 0.78);
      ctx.fillRect(tx, ty, 1, 3);
      ctx.fillRect(tx + 2, ty - 1, 1, 4);
      ctx.fillStyle = shade(pal[0], 1.18);
      ctx.fillRect(tx + 1, ty, 1, 2);
    }
  };
  switch (l) {
    case L_GRASS:
      grassy(GRASS);
      break;
    case L_GRASS2:
      grassy(GRASS2);
      break;
    case L_FLOWERS: {
      grassy(GRASS);
      const colors = ["#ffffff", "#ffe14a", "#ff8ac8", "#b88aff", "#ff6a5a"];
      for (let i = 0; i < 4; i++) {
        const fx = x + 2 + Math.floor(hash(c, r, 60 + i) * (b - 5));
        const fy = y + 2 + Math.floor(hash(c, r, 70 + i) * (b - 5));
        ctx.fillStyle = colors[Math.floor(hash(c, r, 80 + i) * colors.length)];
        ctx.fillRect(fx, fy + 1, 3, 1);
        ctx.fillRect(fx + 1, fy, 1, 3);
        ctx.fillStyle = "#ffe14a";
        ctx.fillRect(fx + 1, fy + 1, 1, 1);
      }
      break;
    }
    case L_PATH: {
      ctx.fillStyle = "#c9a36a";
      ctx.fillRect(x, y, b, b);
      dots(["#b8935c", "#d6b07a", "#a8844e", "#dcc090"], 22, 2);
      // Grass creeping in at the edges.
      for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const n = at(c + dc, r + dr);
        if (n !== L_GRASS && n !== L_GRASS2 && n !== L_FLOWERS) continue;
        ctx.fillStyle = n === L_GRASS2 ? GRASS2[0] : GRASS[0];
        for (let i = 0; i < b; i += 2) {
          const d = 1 + Math.floor(hash(c * 3 + dc, r * 3 + dr, i) * 3);
          if (dc === -1) ctx.fillRect(x, y + i, d, 2);
          if (dc === 1) ctx.fillRect(x + b - d, y + i, d, 2);
          if (dr === -1) ctx.fillRect(x + i, y, 2, d);
          if (dr === 1) ctx.fillRect(x + i, y + b - d, 2, d);
        }
      }
      break;
    }
    case L_PLAZA: {
      ctx.fillStyle = "#9a948a";
      ctx.fillRect(x, y, b, b);
      // Cobbles in rows.
      const w = 7;
      for (let yy = 0; yy < b; yy += 5) {
        const off = ((r * 4 + yy / 5) % 2) * 3;
        for (let xx = -off; xx < b; xx += w) {
          const f = 0.92 + hash(c * 31 + xx, r * 17 + yy) * 0.2;
          ctx.fillStyle = shade("#c4bcae", f);
          ctx.fillRect(x + Math.max(0, xx) + 1, y + yy + 1, Math.min(w - 1, b - Math.max(0, xx) - 1), 4);
        }
      }
      break;
    }
    case L_WATER:
    case L_DEEP: {
      ctx.fillStyle = l === L_DEEP ? "#2e6fc0" : "#3d8ad6";
      ctx.fillRect(x, y, b, b);
      dots(l === L_DEEP ? ["#2a64b0", "#3478c8"] : ["#4a96de", "#3580cc"], 10, 2);
      // Foam where the water meets the bank.
      for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const n = at(c + dc, r + dr);
        if (n === L_WATER || n === L_DEEP || n === L_BRIDGE) continue;
        ctx.fillStyle = "#a8dcff";
        if (dc === -1) ctx.fillRect(x, y, 2, b);
        if (dc === 1) ctx.fillRect(x + b - 2, y, 2, b);
        if (dr === -1) ctx.fillRect(x, y, b, 2);
        if (dr === 1) ctx.fillRect(x, y + b - 2, b, 2);
      }
      break;
    }
    case L_SAND:
      ctx.fillStyle = "#e6d39a";
      ctx.fillRect(x, y, b, b);
      dots(["#d8c286", "#f0e0b0", "#cfb878"], 16, 1);
      break;
    case L_BRIDGE: {
      // Planks across the river, with rails on the water side.
      const vertical = at(c, r - 1) === L_BRIDGE || at(c, r + 1) === L_BRIDGE ? at(c - 1, r) === L_WATER || at(c + 1, r) === L_WATER : false;
      ctx.fillStyle = "#8a5a2e";
      ctx.fillRect(x, y, b, b);
      ctx.fillStyle = "#a8743e";
      for (let i = 0; i < b; i += 4) {
        if (vertical) ctx.fillRect(x, y + i, b, 3);
        else ctx.fillRect(x + i, y, 3, b);
      }
      ctx.fillStyle = "#5a3a1a";
      for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const n = at(c + dc, r + dr);
        if (n !== L_WATER && n !== L_DEEP) continue;
        if (dc === -1) ctx.fillRect(x, y, 3, b);
        if (dc === 1) ctx.fillRect(x + b - 3, y, 3, b);
        if (dr === -1) ctx.fillRect(x, y, b, 3);
        if (dr === 1) ctx.fillRect(x, y + b - 3, b, 3);
      }
      break;
    }
    case L_FARM:
      ctx.fillStyle = "#7a5230";
      ctx.fillRect(x, y, b, b);
      ctx.fillStyle = "#5e3c20";
      for (let i = 2; i < b; i += 5) ctx.fillRect(x, y + i, b, 2);
      dots(["#8a6038", "#6a4628"], 8, 1);
      break;
    case L_MOUNTAIN:
    case L_SNOW:
    case L_CLIFF: {
      const snow = l === L_SNOW;
      const base = snow ? "#e8eef8" : l === L_CLIFF ? "#5a5058" : "#8a7e86";
      ctx.fillStyle = base;
      ctx.fillRect(x, y, b, b);
      // Rocky facets: light from the top left.
      for (let i = 0; i < 5; i++) {
        const fx = x + Math.floor(hash(c, r, 90 + i) * (b - 6));
        const fy = y + Math.floor(hash(c, r, 95 + i) * (b - 6));
        ctx.fillStyle = shade(base, snow ? 1.06 : 1.25);
        ctx.fillRect(fx, fy, 5, 2);
        ctx.fillStyle = shade(base, snow ? 0.86 : 0.7);
        ctx.fillRect(fx + 1, fy + 2, 5, 2);
      }
      if (l === L_CLIFF) {
        // The cliff face: dark streaks and a grassy lip at the bottom.
        ctx.fillStyle = "#3e363e";
        for (let i = 1; i < b; i += 4) ctx.fillRect(x + i, y + 2, 1, b - 4);
        ctx.fillStyle = "#2a242a";
        ctx.fillRect(x, y + b - 3, b, 3);
      } else if (!snow && (at(c, r - 1) === L_SNOW)) {
        // Snow melting into rock.
        ctx.fillStyle = "#e8eef8";
        for (let i = 0; i < b; i += 3) ctx.fillRect(x + i, y, 3, 1 + Math.floor(hash(c, r, i) * 5));
      }
      break;
    }
    default:
      ctx.fillStyle = GRASS[0];
      ctx.fillRect(x, y, b, b);
  }
}

/** Paints one chunk of the Open World's ground. */
export function worldChunk(cx: number, cy: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CHUNK;
  canvas.height = CHUNK;
  const ctx = canvas.getContext("2d")!;
  const n = CHUNK / BLOCK;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const col = cx * n + c;
      const row = cy * n + r;
      if (col >= OPEN_WORLD.cols || row >= OPEN_WORLD.rows) continue;
      paintWorldBlock(ctx, col, row, c * BLOCK, r * BLOCK);
    }
  return canvas;
}

/**
 * Paints one chunk of the dungeon, the Ancient Knight's Sanctuary from the user's map: dark slate
 * flagstones, a worn stone walk round the edge with moss in the cracks, mossy walls, a carved circle
 * of runes in the middle and the steps down to the way in.
 */
export function dungeonChunk(cx: number, cy: number, map: DungeonMap = DUNGEON): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CHUNK;
  canvas.height = CHUNK;
  const ctx = canvas.getContext("2d")!;
  const m = map;
  const abyss = m !== DUNGEON; // the Sunken Temple: the same stonework, older, greener and flooded
  const shade = (hex: string, f: number) => baseShade(abyss ? sunken(hex) : hex, f);
  const n = CHUNK / BLOCK;
  const at = (c: number, r: number) => (c < 0 || r < 0 || c >= m.cols || r >= m.rows ? D_WALL : m.look[r * m.cols + c]);
  const b = BLOCK;
  const moss = (col: number, row: number, x: number, y: number, amount: number) => {
    // Little clumps of moss, two greens.
    for (let i = 0; i < 6; i++) {
      if (hash(col, row, 20 + i) > amount) continue;
      const mx = x + Math.floor(hash(col, row, 30 + i) * (b - 4));
      const my = y + Math.floor(hash(col, row, 40 + i) * (b - 3));
      ctx.fillStyle = "#4a5e22";
      ctx.fillRect(mx, my, 4, 2);
      ctx.fillStyle = "#6e8a30";
      ctx.fillRect(mx + 1, my, 2, 1);
    }
  };
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const col = cx * n + c;
      const row = cy * n + r;
      const x = c * b;
      const y = r * b;
      const l = at(col, row);
      if (l === D_WALL) {
        const floorBelow = at(col, row + 1) !== D_WALL;
        const nearFloor = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].some(([dc, dr]) => at(col + dc, row + dr) !== D_WALL);
        ctx.fillStyle = nearFloor ? "#25262a" : "#0b0c0e";
        ctx.fillRect(x, y, b, b);
        if (floorBelow) {
          // The wall's face in big old stone blocks, moss creeping down from the top.
          ctx.fillStyle = "#4a4b46";
          ctx.fillRect(x, y + 6, b, b - 6);
          ctx.fillStyle = "#33342f";
          for (let yy = 9; yy < b; yy += 6) {
            ctx.fillRect(x, y + yy, b, 1);
            const off = ((yy / 6) % 2) * 6;
            for (let xx = off; xx < b; xx += 12) ctx.fillRect(x + xx, y + yy, 1, 6);
          }
          ctx.fillStyle = "#62645a";
          ctx.fillRect(x, y + 5, b, 2);
          ctx.fillStyle = "#4e6624";
          for (let xx = 0; xx < b; xx += 3) {
            const drip = Math.floor(hash(col * 7 + xx, row, 5) * 7);
            if (drip > 2) ctx.fillRect(x + xx, y + 6, 2, drip);
          }
        } else if (nearFloor) {
          ctx.fillStyle = "#3e3f3a";
          ctx.fillRect(x + 1, y + 1, b - 2, b - 2);
          ctx.fillStyle = "#2e2f2b";
          ctx.fillRect(x + 3, y + 3, b - 6, b - 6);
          moss(col, row, x, y, 0.45);
        }
        continue;
      }
      const f = 0.9 + hash(col, row) * 0.2;
      if (l === D_POOL) {
        // A flooded pit: deep green-black water, lighter at its edges.
        const edge = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dc, dr]) => at(col + dc, row + dr) !== D_POOL);
        ctx.fillStyle = edge ? "#1e5a4a" : "#0e2e28";
        ctx.fillRect(x, y, b, b);
        ctx.fillStyle = edge ? "#2e7a64" : "#14403a";
        if (hash(col, row, 9) < 0.5) ctx.fillRect(x + 3 + Math.floor(hash(col, row, 10) * 10), y + 5 + Math.floor(hash(col, row, 11) * 10), 6, 1);
        continue;
      }
      if (l === D_STAIRS) {
        // Steps going down to the way in.
        for (let yy = 0; yy < b; yy += 7) {
          ctx.fillStyle = shade("#5c5d55", f);
          ctx.fillRect(x, y + yy, b, 4);
          ctx.fillStyle = shade("#3a3b36", f);
          ctx.fillRect(x, y + yy + 4, b, 3);
        }
        continue;
      }
      if (l === D_WALK) {
        // The raised walk: big worn slabs, mossy.
        ctx.fillStyle = shade("#55574e", f);
        ctx.fillRect(x, y, b, b);
        ctx.fillStyle = shade("#61635a", f);
        ctx.fillRect(x + 1, y + 1, b - 2, 9);
        ctx.fillStyle = shade("#4a4c44", f);
        ctx.fillRect(x + 1, y + 11, b - 2, 9);
        ctx.fillStyle = "#3a3b35";
        ctx.fillRect(x, y + 10, b, 1);
        ctx.fillRect(x + (row % 2 ? 7 : 14), y, 1, b);
        moss(col, row, x, y, 0.3);
        continue;
      }
      // The hall floor: dark slate flagstones, a little uneven, the odd crack.
      ctx.fillStyle = shade("#2b2c31", f);
      ctx.fillRect(x, y, b, b);
      ctx.fillStyle = shade("#34353b", f);
      ctx.fillRect(x + 1, y + 1, 9, 9);
      ctx.fillRect(x + 11, y + 11, 9, 9);
      ctx.fillStyle = shade("#303136", f);
      ctx.fillRect(x + 11, y + 1, 9, 9);
      ctx.fillRect(x + 1, y + 11, 9, 9);
      if (hash(col, row, 3) < 0.12) {
        ctx.fillStyle = "#1c1d21";
        ctx.fillRect(x + 4, y + 6, 6, 1);
        ctx.fillRect(x + 9, y + 7, 1, 4);
      }
      if (hash(col, row, 4) < 0.1) moss(col, row, x, y, 0.25);
      if (l === D_DOOR) {
        ctx.fillStyle = "#c8902a";
        for (let i = 2; i < b; i += 5) ctx.fillRect(x + i, y, 2, 4);
        ctx.fillStyle = "#ffd25a";
        ctx.fillRect(x, y, b, 2);
      }
    }
  paintRune(ctx, cx * CHUNK, cy * CHUNK, m, abyss);
  return canvas;
}

/** The circle of runes carved in the middle of the sanctuary floor, pixel by pixel. */
function paintRune(ctx: CanvasRenderingContext2D, ox: number, oy: number, map: DungeonMap = DUNGEON, glow = false) {
  const { x: rx, y: ry, r: R } = map.rune;
  if (rx + R < ox || rx - R > ox + CHUNK || ry + R < oy || ry - R > oy + CHUNK) return;
  const x0 = Math.floor(rx - R - 2);
  const y0 = Math.floor(ry - R - 2);
  const size = Math.ceil(R * 2 + 5);
  // First find the grooves: rings, eight spokes, and runes dotted round the outer band.
  const groove = new Uint8Array(size * size);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const dx = x0 + i + 0.5 - rx;
      const dy = y0 + j + 0.5 - ry;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const ring = Math.abs(d - R) < 1.5 || Math.abs(d - R * 0.82) < 1 || Math.abs(d - R * 0.34) < 1 || d < 5;
      const spoke = d > R * 0.34 && d < R * 0.82 && Math.abs(Math.sin(a * 4)) * d < 4.4; // about 1px either side of each spoke
      const rune = d > R * 0.84 && d < R * 0.98 && Math.sin(a * 24) > 0.86 && Math.abs(d - R * 0.91) < 2.5;
      if (ring || spoke || rune) groove[j * size + i] = 1;
    }
  // Then paint them dark, with a lit edge just below each one so they read as carved into the stone.
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const x = x0 + i - ox;
      const y = y0 + j - oy;
      if (x < 0 || y < 0 || x >= CHUNK || y >= CHUNK) continue;
      const here = groove[j * size + i];
      const above = j > 0 && groove[(j - 1) * size + i];
      if (!here && !above) continue;
      ctx.fillStyle = glow ? (here ? "#2aff9a" : "#0e3a2a") : here ? "#1a1b1e" : "#5a5d52";
      ctx.fillRect(x, y, 1, 1);
    }
}

// ------------------------------------------------------------------ props

function canvasOf(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
}

function shadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.globalAlpha = 0.28;
  blob(ctx, cx, cy, rx, ry, "#000000");
  ctx.globalAlpha = 1;
}

function tree(v: number, palette: string[]): HTMLCanvasElement {
  const s = [1, 1.15, 0.88][v];
  const w = Math.round(46 * s);
  const h = Math.round(58 * s);
  const [c, ctx] = canvasOf(w, h);
  const cx = w / 2;
  shadow(ctx, cx, h - 4, 15 * s, 4);
  ctx.fillStyle = "#6a4426";
  ctx.fillRect(cx - 3, h - 22 * s, 6, 20 * s);
  ctx.fillStyle = "#523218";
  ctx.fillRect(cx + 1, h - 22 * s, 2, 20 * s);
  const top = h - 26 * s;
  blob(ctx, cx, top, 20 * s, 15 * s, palette[0]);
  blob(ctx, cx - 7 * s, top - 7 * s, 12 * s, 10 * s, palette[1]);
  blob(ctx, cx + 7 * s, top - 4 * s, 12 * s, 10 * s, palette[1]);
  blob(ctx, cx - 3 * s, top - 12 * s, 9 * s, 7 * s, palette[2]);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = palette[3];
    ctx.fillRect(Math.round(cx - 14 * s + hash(v, i) * 22 * s), Math.round(top - 16 * s + hash(i, v) * 20 * s), 2, 2);
  }
  return c;
}

function pine(v: number): HTMLCanvasElement {
  const s = [1, 1.2, 0.85][v];
  const w = Math.round(34 * s);
  const h = Math.round(62 * s);
  const [c, ctx] = canvasOf(w, h);
  const cx = w / 2;
  shadow(ctx, cx, h - 4, 11 * s, 3);
  ctx.fillStyle = "#5a3a20";
  ctx.fillRect(cx - 2, h - 12 * s, 4, 10 * s);
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const y0 = h - 12 * s - i * 11 * s;
    const half = (16 - i * 3) * s;
    for (let y = 0; y < 16 * s; y++) {
      const ww = Math.round(half * (y / (16 * s)));
      ctx.fillStyle = y % 5 === 0 ? "#3a7a3a" : "#2a6232";
      ctx.fillRect(Math.round(cx - ww), Math.round(y0 - 16 * s + y), ww * 2, 1);
      ctx.fillStyle = "#1e4a26";
      ctx.fillRect(Math.round(cx + ww * 0.3), Math.round(y0 - 16 * s + y), Math.round(ww * 0.7), 1);
    }
  }
  return c;
}

function house(v: number): HTMLCanvasElement {
  const roofs = [["#c84a3a", "#a83428"], ["#3a6ac8", "#2a50a0"], ["#4a9a4a", "#357a35"], ["#9a6a3a", "#7a5028"]][v];
  const w = 7 * BLOCK + 6;
  const h = 5 * BLOCK + 44;
  const [c, ctx] = canvasOf(w, h);
  const wallTop = h - 46;
  shadow(ctx, w / 2, h - 3, w / 2 - 2, 5);
  // Front wall: timber frame and plaster.
  ctx.fillStyle = "#efe0c0";
  ctx.fillRect(6, wallTop, w - 12, 44);
  ctx.fillStyle = "#7a5230";
  ctx.fillRect(6, wallTop, w - 12, 3);
  ctx.fillRect(6, h - 4, w - 12, 3);
  for (const x of [6, w / 2 - 2, w - 10]) ctx.fillRect(x, wallTop, 4, 44);
  // Door and windows.
  ctx.fillStyle = "#6a3e1e";
  ctx.fillRect(w / 2 - 9, h - 30, 18, 27);
  ctx.fillStyle = "#8a5428";
  ctx.fillRect(w / 2 - 7, h - 28, 14, 25);
  ctx.fillStyle = "#ffd25a";
  ctx.fillRect(w / 2 + 3, h - 16, 2, 2);
  for (const x of [22, w - 44]) {
    ctx.fillStyle = "#5a3a1e";
    ctx.fillRect(x - 2, wallTop + 10, 26, 20);
    ctx.fillStyle = "#8ad0ff";
    ctx.fillRect(x, wallTop + 12, 22, 16);
    ctx.fillStyle = "#c8ecff";
    ctx.fillRect(x + 2, wallTop + 14, 6, 5);
    ctx.fillStyle = "#5a3a1e";
    ctx.fillRect(x + 10, wallTop + 12, 2, 16);
    ctx.fillRect(x, wallTop + 19, 22, 2);
    // Flower box.
    ctx.fillStyle = "#7a5230";
    ctx.fillRect(x - 2, wallTop + 30, 26, 4);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ["#ff6a8a", "#ffe14a", "#ffffff"][i % 3];
      ctx.fillRect(x + i * 4, wallTop + 28, 3, 2);
    }
  }
  // Roof: shingles in rows, overhanging the wall.
  for (let y = 0; y < wallTop + 2; y++) {
    const inset = Math.max(0, 14 - y * 0.4);
    ctx.fillStyle = Math.floor(y / 5) % 2 === 0 ? roofs[0] : roofs[1];
    ctx.fillRect(inset, y, w - inset * 2, 1);
    if (y % 5 === 4) {
      ctx.fillStyle = shade(roofs[1], 0.8);
      for (let x = inset + ((y / 5) % 2) * 6; x < w - inset; x += 12) ctx.fillRect(x, y - 4, 1, 5);
    }
  }
  ctx.fillStyle = shade(roofs[1], 0.7);
  ctx.fillRect(0, wallTop - 2, w, 4);
  // Chimney.
  ctx.fillStyle = "#8a7a72";
  ctx.fillRect(w - 40, 0, 12, 22);
  ctx.fillStyle = "#6a5a54";
  ctx.fillRect(w - 42, 0, 16, 4);
  return c;
}

function well(): HTMLCanvasElement {
  const [c, ctx] = canvasOf(32, 40);
  shadow(ctx, 16, 36, 14, 3);
  ctx.fillStyle = "#8a8a92";
  ctx.fillRect(3, 22, 26, 14);
  ctx.fillStyle = "#a8a8b0";
  for (let x = 3; x < 29; x += 6) ctx.fillRect(x, 22, 5, 6);
  ctx.fillStyle = "#2a5a9a";
  ctx.fillRect(6, 20, 20, 4);
  ctx.fillStyle = "#6a4426";
  ctx.fillRect(4, 6, 3, 18);
  ctx.fillRect(25, 6, 3, 18);
  ctx.fillStyle = "#b8483a";
  ctx.fillRect(0, 2, 32, 6);
  ctx.fillStyle = "#8a3028";
  ctx.fillRect(2, 0, 28, 3);
  return c;
}

function lamp(): HTMLCanvasElement {
  const [c, ctx] = canvasOf(14, 44);
  shadow(ctx, 7, 41, 5, 2);
  ctx.fillStyle = "#2a2a30";
  ctx.fillRect(6, 10, 2, 32);
  ctx.fillRect(4, 40, 6, 3);
  ctx.fillStyle = "#3a3a42";
  ctx.fillRect(2, 2, 10, 10);
  ctx.fillStyle = "#ffe08a";
  ctx.fillRect(4, 4, 6, 6);
  ctx.fillStyle = "#fff6d0";
  ctx.fillRect(5, 5, 2, 2);
  return c;
}

function rock(v: number): HTMLCanvasElement {
  const [c, ctx] = canvasOf(22, 18);
  shadow(ctx, 11, 15, 10, 3);
  blob(ctx, 11, 10, v ? 9 : 7, v ? 7 : 6, "#8a8a94");
  blob(ctx, 9, 8, v ? 6 : 5, v ? 4 : 3, "#a8a8b2");
  ctx.fillStyle = "#6a6a74";
  ctx.fillRect(12, 12, 6, 2);
  return c;
}

function bush(v: number): HTMLCanvasElement {
  const [c, ctx] = canvasOf(24, 18);
  shadow(ctx, 12, 15, 10, 3);
  blob(ctx, 12, 10, 10, 7, v ? "#3a8a3a" : "#4a9a32");
  blob(ctx, 9, 8, 6, 4, v ? "#4aa04a" : "#5ab040");
  if (v) {
    for (const [x, y] of [[6, 9], [14, 7], [17, 11]]) {
      ctx.fillStyle = "#e83a4a";
      ctx.fillRect(x, y, 2, 2);
    }
  }
  return c;
}

function sign(): HTMLCanvasElement {
  const [c, ctx] = canvasOf(30, 30);
  shadow(ctx, 15, 27, 8, 2);
  ctx.fillStyle = "#6a4426";
  ctx.fillRect(14, 12, 3, 16);
  ctx.fillStyle = "#a8743e";
  ctx.fillRect(1, 2, 28, 13);
  ctx.fillStyle = "#7a5230";
  ctx.fillRect(1, 2, 28, 2);
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(5, 7, 20, 1);
  ctx.fillRect(5, 10, 14, 1);
  return c;
}

function stall(): HTMLCanvasElement {
  const [c, ctx] = canvasOf(66, 50);
  shadow(ctx, 33, 46, 30, 4);
  ctx.fillStyle = "#8a5a2e";
  ctx.fillRect(4, 28, 58, 18);
  ctx.fillStyle = "#a8743e";
  ctx.fillRect(4, 28, 58, 4);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = ["#ff6a3a", "#ffd23f", "#7ad04a", "#e83a6a"][i % 4];
    blob(ctx, 10 + i * 8, 26, 3, 3, ctx.fillStyle as string);
  }
  ctx.fillStyle = "#6a4426";
  ctx.fillRect(4, 8, 3, 22);
  ctx.fillRect(59, 8, 3, 22);
  for (let x = 0; x < 66; x += 8) {
    ctx.fillStyle = (x / 8) % 2 === 0 ? "#e8483a" : "#fff0e0";
    ctx.fillRect(x, 2, 8, 10);
  }
  return c;
}

function crop(v: number): HTMLCanvasElement {
  const [c, ctx] = canvasOf(12, 12);
  if (v === 0) {
    ctx.fillStyle = "#e8c84a";
    for (const x of [2, 5, 8]) ctx.fillRect(x, 1, 2, 10);
  } else if (v === 1) {
    blob(ctx, 6, 7, 5, 4, "#6ac84a");
    blob(ctx, 6, 6, 3, 2, "#9ae86a");
  } else {
    blob(ctx, 6, 8, 5, 3, "#ff8a2a");
    ctx.fillStyle = "#3a8a2a";
    ctx.fillRect(5, 3, 2, 3);
  }
  return c;
}

function boat(): HTMLCanvasElement {
  const [c, ctx] = canvasOf(44, 18);
  ctx.fillStyle = "#6a4426";
  ctx.fillRect(4, 6, 36, 8);
  ctx.fillRect(0, 4, 44, 3);
  ctx.fillStyle = "#8a5a2e";
  ctx.fillRect(6, 8, 32, 4);
  ctx.fillStyle = "#a8743e";
  ctx.fillRect(14, 2, 2, 10);
  return c;
}

function log(): HTMLCanvasElement {
  const [c, ctx] = canvasOf(30, 12);
  shadow(ctx, 15, 10, 14, 2);
  ctx.fillStyle = "#7a5230";
  ctx.fillRect(2, 3, 26, 6);
  ctx.fillStyle = "#c8a070";
  blob(ctx, 27, 6, 3, 3, "#c8a070");
  ctx.fillStyle = "#5a3a20";
  ctx.fillRect(2, 7, 24, 2);
  return c;
}

/** The picture for a prop (made once per kind and variant). */
export function propCanvas(kind: PropKind, v: number): HTMLCanvasElement {
  switch (kind) {
    case "tree":
      return tree(v, ["#2e7a32", "#3a9038", "#4aa844", "#62c052"]);
    case "blossom":
      return tree(v, ["#d86a9a", "#f08ab4", "#ffb0d0", "#ffffff"]);
    case "pine":
      return pine(v);
    case "house":
      return house(v);
    case "well":
      return well();
    case "lamp":
      return lamp();
    case "rock":
      return rock(v);
    case "bush":
      return bush(v);
    case "sign":
      return sign();
    case "stall":
      return stall();
    case "crop":
      return crop(v);
    case "boat":
      return boat();
    case "log":
      return log();
  }
}
