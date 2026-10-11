// The new Open World's ground (2026-10-11): painted from the user's 32x32 tiles, one tile to a block, at the
// tiles' own pixel size, with soft ragged edges between grass, dirt, stone, sand and water, and the cliff.
// Water is left clear (the moving water is drawn under the ground). Painted in a worker (owGround.worker.ts)
// so walking into new ground never stalls the game; owWorld.ts puts it on screen.

import { BLOCK } from "../../shared/maps";
import { L_BRIDGE, L_CLIFF, L_DEEP, L_FALL, L_MEADOW, L_MOUNTAIN, L_PATH, L_PLAZA, L_RUIN, L_SAND, L_WATER, OPEN_WORLD } from "../../shared/world";
import { OW_CLIFF, OW_DIRT, OW_GRASS, OW_STONE, OwTileSet } from "./owTiles.data";

/** Art pixels per block (the user's tiles are 32x32), and world pixels per art pixel. */
export const TILE = 32;
export const ART = BLOCK / TILE;
/** Ground is made in squares of this many blocks, as the camera comes near them. */
export const CHUNK_BLOCKS = 20;
export const CHUNK_PX = CHUNK_BLOCKS * TILE;

const m = OPEN_WORLD;

// What a spot of ground is made of.
const K_GRASS = 0;
const K_MEADOW = 1;
const K_DIRT = 2;
const K_COBBLE = 3;
const K_SAND = 4;
const K_WATER = 5;
const K_RUIN = 7;
const K_TOP = 8; // the plateau above the cliff
const K_CLIFF = 9;
const SOFT = new Set([K_GRASS, K_MEADOW, K_DIRT, K_COBBLE, K_SAND, K_WATER, K_RUIN]);
const wetK = (k: number) => k === K_WATER;
const greenK = (k: number) => k === K_GRASS || k === K_MEADOW || k === K_TOP;

function kindOfLook(l: number): number {
  switch (l) {
    case L_MEADOW: return K_MEADOW;
    case L_PATH: return K_DIRT;
    case L_PLAZA: return K_COBBLE;
    case L_SAND: return K_SAND;
    case L_WATER: case L_DEEP: case L_BRIDGE: return K_WATER; // deep water: shaded by deepAt
    case L_RUIN: return K_RUIN;
    case L_MOUNTAIN: return K_TOP;
    case L_CLIFF: case L_FALL: return K_CLIFF;
    default: return K_GRASS;
  }
}
let BK: Uint8Array | undefined;
const blockKind = (c: number, r: number) => {
  if (c < 0 || r < 0 || c >= m.cols || r >= m.rows) return K_GRASS;
  if (!BK) BK = Uint8Array.from(m.look, kindOfLook);
  return BK[r * m.cols + c];
};

export function hash(x: number, y: number, s = 0): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Smooth noise, -1..1, changing over about `cell` pixels. */
function noise(x: number, y: number, cell: number, s: number): number {
  const fx = x / cell;
  const fy = y / cell;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash(ix, iy, s);
  const b = hash(ix + 1, iy, s);
  const c = hash(ix, iy + 1, s);
  const d = hash(ix + 1, iy + 1, s);
  return (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * 2 - 1;
}

/** A tile set's pixels (RGB bytes, tile after tile). */
interface Tiles { w: number; h: number; n: number; px: Uint8Array }
function decode(t: OwTileSet, flatten = true): Tiles {
  const bin = atob(t.d);
  const px = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) px[i] = bin.charCodeAt(i);
  if (!flatten) return { w: t.w, h: t.h, n: t.n, px };
  // The tiles were cut from a picture with light and shade across each one, so side by side they show a
  // grid. Take out each tile's own slow light (a wide blur of it, wrapping round) and give every tile the
  // set's average colour instead: the detail stays, the squares go.
  const { w, h, n } = t;
  const mean = [0, 0, 0];
  for (let i = 0; i < px.length; i++) mean[i % 3] += px[i] / (px.length / 3);
  const out = new Uint8Array(px.length);
  const RAD = 7;
  for (let k = 0; k < n; k++)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let ch = 0; ch < 3; ch++) {
          let sum = 0;
          for (let dy = -RAD; dy <= RAD; dy += 2) for (let dx = -RAD; dx <= RAD; dx += 2) sum += px[(k * w * h + ((y + dy + h) % h) * w + ((x + dx + w) % w)) * 3 + ch];
          const blur = sum / 64;
          const o = (k * w * h + y * w + x) * 3 + ch;
          out[o] = Math.max(0, Math.min(255, px[o] - blur + mean[ch]));
        }
  return { w, h, n, px: out };
}
/** The cliff tiles: the same light along each row for every tile (the grassy lip on top, the rock darker
 * below), so the cliff reads as one wall rather than a row of separate blocks. */
function flattenAcross(t: Tiles): Tiles {
  const { w, h, n, px } = t;
  const out = new Uint8Array(px.length);
  const RAD = 6;
  for (let y = 0; y < h; y++) {
    const mean = [0, 0, 0];
    for (let k = 0; k < n; k++) for (let x = 0; x < w; x++) for (let ch = 0; ch < 3; ch++) mean[ch] += px[(k * w * h + y * w + x) * 3 + ch] / (n * w);
    for (let k = 0; k < n; k++)
      for (let x = 0; x < w; x++)
        for (let ch = 0; ch < 3; ch++) {
          let sum = 0;
          for (let dx = -RAD; dx <= RAD; dx++) sum += px[(k * w * h + y * w + ((x + dx + w) % w)) * 3 + ch];
          const o = (k * w * h + y * w + x) * 3 + ch;
          out[o] = Math.max(0, Math.min(255, px[o] - sum / (RAD * 2 + 1) + mean[ch]));
        }
  }
  return { w, h, n, px: out };
}
let SETS: Record<number, Tiles> | undefined;
let CLIFF: Tiles;
function sets() {
  if (!SETS) {
    // The square and the ruins are paved with the stone flags (the ruins darker, broken up by grass).
    SETS = { [K_GRASS]: decode(OW_GRASS), [K_MEADOW]: decode(OW_GRASS), [K_DIRT]: decode(OW_DIRT), [K_COBBLE]: decode(OW_STONE), [K_RUIN]: decode(OW_STONE) };
    SETS[K_TOP] = SETS[K_GRASS];
    CLIFF = flattenAcross(decode(OW_CLIFF, false));
  }
  return SETS;
}

/** The sand: the user's sand colours, speckled (their sand tile was too small to cut cleanly). */
const SAND = [
  [236, 200, 132],
  [226, 186, 118],
  [244, 214, 150],
  [212, 170, 104],
];

/** How much meadow there is round an art pixel, 0..1, blended smoothly between blocks. */
function meadowAt(x: number, y: number): number {
  const fx = x / TILE - 0.5;
  const fy = y / TILE - 0.5;
  const c = Math.floor(fx);
  const r = Math.floor(fy);
  const tx = fx - c;
  const ty = fy - r;
  const v = (cc: number, rr: number) => (blockKind(cc, rr) === K_MEADOW ? 1 : 0);
  return (v(c, r) * (1 - tx) + v(c + 1, r) * tx) * (1 - ty) + (v(c, r + 1) * (1 - tx) + v(c + 1, r + 1) * tx) * ty;
}

/** Which kind of ground an art pixel shows: the kinds of the four blocks round it, blended by how near each
 * block's middle is (so corners come out round), with a little noise so the edges are ragged. */
function pixelKind(x: number, y: number): number {
  const own = blockKind(Math.floor(x / TILE), Math.floor(y / TILE));
  if (!SOFT.has(own)) return own;
  const fx = x / TILE - 0.5;
  const fy = y / TILE - 0.5;
  const c = Math.floor(fx);
  const r = Math.floor(fy);
  const tx = fx - c;
  const ty = fy - r;
  const ks = [blockKind(c, r), blockKind(c + 1, r), blockKind(c, r + 1), blockKind(c + 1, r + 1)];
  if (ks[0] === ks[1] && ks[0] === ks[2] && ks[0] === ks[3]) return SOFT.has(ks[0]) ? ks[0] : own;
  const ws = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
  let best = own;
  let bestW = -1;
  for (let i = 0; i < 4; i++) {
    const k = ks[i];
    if (!SOFT.has(k)) continue;
    let w = 0;
    for (let j = 0; j < 4; j++) if (ks[j] === k) w += ws[j];
    w += noise(x, y, 7, 50 + k) * 0.13 + noise(x, y, 2.5, 60 + k) * 0.05;
    if (w > bestW) [best, bestW] = [k, w];
  }
  return best;
}

/** How deep the water is round an art pixel, 0..1 (blended like the meadow). */
function deepAt(x: number, y: number): number {
  const fx = x / TILE - 0.5;
  const fy = y / TILE - 0.5;
  const c = Math.floor(fx);
  const r = Math.floor(fy);
  const tx = fx - c;
  const ty = fy - r;
  const v = (cc: number, rr: number) => (cc >= 0 && rr >= 0 && cc < m.cols && rr < m.rows && m.look[rr * m.cols + cc] === L_DEEP ? 1 : 0);
  return (v(c, r) * (1 - tx) + v(c + 1, r) * tx) * (1 - ty) + (v(c, r + 1) * (1 - tx) + v(c + 1, r + 1) * tx) * ty;
}

/** One square of the ground at the tiles' own size (CHUNK_PX across), as RGBA pixels: water is left clear,
 * to show the water under it. */
export function owPixels(cx: number, cy: number): Uint8ClampedArray {
  const S = sets();
  const M = 4; // margin, for edges that look at their neighbours
  const W = CHUNK_PX + M * 2;
  const x0 = cx * CHUNK_PX - M;
  const y0 = cy * CHUNK_PX - M;
  const K = new Uint8Array(W * W);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) K[j * W + i] = pixelKind(x0 + i, y0 + j);
  const kAt = (i: number, j: number) => K[Math.max(0, Math.min(W - 1, j)) * W + Math.max(0, Math.min(W - 1, i))];
  // How far each pixel is (in pixels, up to 9) from the other side of the shore: two sweeps over the square.
  const DW = new Uint8Array(W * W);
  for (let i = 0; i < W * W; i++) DW[i] = 9;
  const shore = (i: number, j: number) => {
    const w = wetK(K[j * W + i]);
    return (i > 0 && wetK(K[j * W + i - 1]) !== w) || (i < W - 1 && wetK(K[j * W + i + 1]) !== w) || (j > 0 && wetK(K[(j - 1) * W + i]) !== w) || (j < W - 1 && wetK(K[(j + 1) * W + i]) !== w);
  };
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) if (shore(i, j)) DW[j * W + i] = 1;
  for (let j = 0; j < W; j++)
    for (let i = 0; i < W; i++) {
      let v = DW[j * W + i];
      if (i > 0) v = Math.min(v, DW[j * W + i - 1] + 1);
      if (j > 0) v = Math.min(v, DW[(j - 1) * W + i] + 1, i > 0 ? DW[(j - 1) * W + i - 1] + 1 : 9, i < W - 1 ? DW[(j - 1) * W + i + 1] + 1 : 9);
      DW[j * W + i] = v;
    }
  for (let j = W - 1; j >= 0; j--)
    for (let i = W - 1; i >= 0; i--) {
      let v = DW[j * W + i];
      if (i < W - 1) v = Math.min(v, DW[j * W + i + 1] + 1);
      if (j < W - 1) v = Math.min(v, DW[(j + 1) * W + i] + 1, i < W - 1 ? DW[(j + 1) * W + i + 1] + 1 : 9, i > 0 ? DW[(j + 1) * W + i - 1] + 1 : 9);
      DW[j * W + i] = v;
    }
  // The cliff's top and bottom row in each column of blocks here.
  const cliffTop = new Map<number, [number, number]>();
  const cliffSpan = (c: number, r: number) => {
    const key = c * 4096 + r;
    let v = cliffTop.get(key);
    if (!v) {
      let top = r;
      while (top > 0 && blockKind(c, top - 1) === K_CLIFF) top--;
      let bottom = r;
      while (bottom + 1 < m.rows && blockKind(c, bottom + 1) === K_CLIFF) bottom++;
      v = [top, bottom];
      cliffTop.set(key, v);
    }
    return v;
  };

  const d = new Uint8ClampedArray(CHUNK_PX * CHUNK_PX * 4);
  for (let j = 0; j < CHUNK_PX; j++)
    for (let i = 0; i < CHUNK_PX; i++) {
      const x = x0 + M + i;
      const y = y0 + M + j;
      const I = i + M;
      const J = j + M;
      const k = K[J * W + I];
      const o = (j * CHUNK_PX + i) * 4;
      const c = Math.floor(x / TILE);
      const r = Math.floor(y / TILE);
      let R = 0, G = 0, B = 0, A = 255;
      if (wetK(k)) {
        // Water: clear, but for foam along the bank, lighter shallows near it and darker deeps.
        const near = DW[J * W + I] - 1; // 0: right at the bank
        const ripple = noise(x, y + 0.0, 5, 9);
        if (near <= 1 || (near === 2 && ripple > 0.35)) { R = 222; G = 246; B = 248; A = 235; }
        else if (near <= 3) { R = 70; G = 200; B = 210; A = 110; }
        else {
          const deep = deepAt(x, y);
          { R = 4; G = 30; B = 58; A = Math.round(deep * deep * 80); }
        }
      } else if (k === K_CLIFF) {
        // The cliff: the user's cliff tile, its grassy lip on the top row, bare rock below.
        const [top, bottom] = cliffSpan(c, r);
        const t = Math.floor(hash(c, 7) * CLIFF.n);
        const tx = x % TILE;
        // the top block: the tile's lip and the start of the rock; below it, the rock part stretched
        const ty = r === top ? y % TILE : 14 + Math.floor(((y % TILE) * (CLIFF.h - 14)) / TILE);
        const p = (t * CLIFF.w * CLIFF.h + ty * CLIFF.w + tx) * 3;
        R = CLIFF.px[p]; G = CLIFF.px[p + 1]; B = CLIFF.px[p + 2];
        if (r !== top) {
          // the rock face below the lip: a bit darker the lower it goes
          const f = 0.92 - ((y - top * TILE) / ((bottom - top + 1) * TILE)) * 0.18;
          R *= f; G *= f; B *= f;
        }
        if (y >= (bottom + 1) * TILE - 2) { R = R * 0.55; G = G * 0.55; B = B * 0.55; }
      } else if (k === K_SAND) {
        const n = noise(x, y, 6, 21) + (hash(x, y, 5) - 0.5) * 0.9;
        const sc = SAND[n > 0.45 ? 2 : n < -0.45 ? 3 : n < -0.1 ? 1 : 0];
        R = sc[0]; G = sc[1]; B = sc[2];
      } else {
        const set = S[k];
        // Each block a tile of its set, some flipped, so the same tile doesn't line up.
        const h = hash(c, r, k);
        const t = Math.floor(h * set.n);
        const flip = hash(c, r, 99) < 0.5;
        const flipY = k === K_RUIN && hash(c, r, 98) < 0.5;
        const tx = flip ? TILE - 1 - (x % TILE) : x % TILE;
        const ty = flipY ? TILE - 1 - (y % TILE) : y % TILE;
        const p = (t * set.w * set.h + ty * set.w + tx) * 3;
        // and a slow wash of light and shade over the whole ground
        const wash = 1 + noise(x, y, 70, 31) * 0.07;
        R = set.px[p] * wash; G = set.px[p + 1] * wash; B = set.px[p + 2] * wash;
        if (k === K_RUIN) { R = R * 0.9; G = G * 0.92; B = B * 0.9; }
        if (k === K_TOP) { R = R * 0.78; G = G * 0.84; B = B * 0.8; }
        if (k === K_MEADOW || k === K_GRASS) {
          // Meadow: the grass turned sunny yellow, fading in and out softly (not block by block).
          const f = meadowAt(x, y) * (0.85 + 0.15 * noise(x, y, 12, 41));
          { R = R * (1 + 0.5 * f); G = G * (1 + 0.2 * f); B = B * (1 - 0.25 * f); }
        }
      }
      if (!wetK(k)) {
        // Edges: banks dark beside water, a dark rim round grass, grass shading the ground below it,
        // and the cliff's shadow at its foot.
        const water = DW[J * W + I];
        if (k !== K_CLIFF) {
          if (wetK(kAt(I, J + 1)) || wetK(kAt(I, J + 2))) { if (k === K_SAND) { R = 176; G = 132; B = 80; } else { R = 88; G = 60; B = 40; } }
          else if (water <= 2) { R = R * 0.78; G = G * 0.8; B = B * 0.82; }
          if (greenK(k) && !greenK(kAt(I, J + 1)) && kAt(I, J + 1) !== K_CLIFF && !wetK(kAt(I, J + 1))) { R = R * 0.72; G = G * 0.78; B = B * 0.7; }
          else if (!greenK(k) && (greenK(kAt(I, J - 1)) || greenK(kAt(I, J - 2)))) { R = R * 0.78; G = G * 0.78; B = B * 0.8; }
          for (let dj = 1; dj <= 5; dj++)
            if (kAt(I, J - dj) === K_CLIFF) {
              const f = 0.55 + dj * 0.08;
              { R = R * f; G = G * f; B = B * f * 1.05; }
              break;
            }
        }
      }
      d[o] = R;
      d[o + 1] = G;
      d[o + 2] = B;
      d[o + 3] = A;
    }
  return d;
}

