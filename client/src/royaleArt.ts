// The Battle Royale island as crisp pixel art (2026-10-11, after the user's island tileset sheet):
// grass with tufts and flowers, tall grass, a sandy shore with foam, a deep blue sea and ponds with
// wave lines, grey stone walls, log fences and wooden crates. One art pixel is 3 screen pixels (7 per
// block), the same pixel size as the Open World, and the edges between grass, sand and water are
// rounded so the ground does not look like square tiles.

import { BLOCK, ClassicMap, T_BUSH, T_CRATE, T_FENCE, T_WALL, T_WATER } from "../../shared/maps";

const ART = 3;
const PER = BLOCK / ART; // art pixels per block (7)

type RGB = [number, number, number];
const hex = (h: number): RGB => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const C = {
  grass: hex(0x6cc04a),
  grass2: hex(0x62b444),
  grassRim: hex(0x3f8a36),
  grassLip: hex(0x52a23e),
  tuft: hex(0x9ad866),
  tuft2: hex(0x4e9e3a),
  tall: hex(0x2e8a34),
  tallLight: hex(0x4aae46),
  tallDark: hex(0x1d6428),
  tallTip: hex(0x7ccc5a),
  sand: hex(0xf2d898),
  sandDark: hex(0xe2c07c),
  sandSpeck: hex(0xd8b470),
  wet: hex(0xe8c888),
  foam: hex(0xf4fbff),
  shore: hex(0x40c0f0),
  shore2: hex(0x1ea4ec),
  sea: hex(0x1472dc),
  deep: hex(0x0f62c8),
  wave: hex(0x5ab8f8),
  stone: hex(0xc4c4d2),
  stoneLight: hex(0xe0e0ea),
  stoneDark: hex(0x9a9ab0),
  stoneFace: hex(0x7a7a92),
  stoneGap: hex(0x4a4a60),
  log: hex(0xc07a44),
  logLight: hex(0xdc9a5c),
  logDark: hex(0x8e542a),
  logGap: hex(0x4a2a16),
  ring: hex(0xe8b47a),
  crate: hex(0xd49a5a),
  crateLight: hex(0xecb874),
  crateDark: hex(0x9a6432),
  crateGap: hex(0x5a3618),
  shadow: hex(0x488c34),
  flowerW: hex(0xffffff),
  flowerP: hex(0xff8ac0),
  flowerY: hex(0xffd84a),
};

function hash(x: number, y: number, k = 0): number {
  let h = (x * 374761393 + y * 668265263 + k * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function wobble(x: number, y: number, k: number): number {
  return 0.3 * Math.sin(x * 0.29 + k + Math.sin(y * 0.21 + k * 2)) + 0.17 * Math.sin(y * 0.53 - x * 0.37 + k * 3);
}

const K_WATER = 1;
const K_SAND = 2;
const K_GRASS = 3;
const K_TALL = 4;
const RING: [number, number][] = [[0, 0], ...Array.from({ length: 8 }, (_, i): [number, number] => [0.62 * Math.cos((i * Math.PI) / 4), 0.62 * Math.sin((i * Math.PI) / 4)])];

/** The whole island at full size (66 x 66 blocks), drawn into a new canvas. */
export function drawRoyaleIsland(m: ClassicMap): HTMLCanvasElement {
  const W = m.cols * PER;
  const H = m.rows * PER;
  const tileAt = (c: number, r: number) => (c < 0 || r < 0 || c >= m.cols || r >= m.rows ? T_WATER : m.tiles[r * m.cols + c]);
  const solid = (t: number) => t === T_WALL || t === T_FENCE || t === T_CRATE;
  // Sand: dry ground within two blocks of the sea round the island (not round the ponds).
  const shoreBlock = new Uint8Array(m.cols * m.rows);
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++) {
      if (tileAt(c, r) === T_WATER) continue;
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++)
          if (Math.hypot(dc, dr) <= 2.2 && tileAt(c + dc, r + dr) === T_WATER && Math.hypot(c + dc - m.cols / 2, r + dr - m.rows / 2) > m.cols / 2 - 6) shoreBlock[r * m.cols + c] = 1;
    }
  const groundOf = (c: number, r: number): number => {
    const t = tileAt(c, r);
    if (t === T_WATER) return K_WATER;
    if (t === T_BUSH) return K_TALL;
    if (c >= 0 && r >= 0 && c < m.cols && r < m.rows && shoreBlock[r * m.cols + c]) return K_SAND;
    return K_GRASS;
  };
  // Kind of ground of every art pixel, with rounded, wobbly edges (a vote of nearby spots).
  const kind = new Uint8Array(W * H);
  const deepSea = new Uint8Array(W * H);
  for (let ay = 0; ay < H; ay++)
    for (let ax = 0; ax < W; ax++) {
      const fx = (ax + 0.5) / PER + wobble(ax / PER, ay / PER, 1) + (hash(ax, ay, 7) - 0.5) * 0.18;
      const fy = (ay + 0.5) / PER + wobble(ay / PER, ax / PER, 4) + (hash(ax, ay, 8) - 0.5) * 0.18;
      const votes = [0, 0, 0, 0, 0];
      for (const [ox, oy] of RING) votes[groundOf(Math.floor(fx + ox), Math.floor(fy + oy))] += ox === 0 && oy === 0 ? 1.5 : 1;
      let best = groundOf(Math.floor(ax / PER), Math.floor(ay / PER));
      for (let k = 1; k < votes.length; k++) if (votes[k] > votes[best]) best = k;
      kind[ay * W + ax] = best;
      deepSea[ay * W + ax] = Math.hypot(ax / PER - m.cols / 2, ay / PER - m.rows / 2) > m.cols / 2 - 0.5 ? 1 : 0;
    }
  const kAt = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? K_WATER : kind[y * W + x]);
  const distOut = (x: number, y: number, k: number, max: number) => {
    for (let d = 1; d <= max; d++)
      for (let t = -d; t <= d; t++)
        if (kAt(x + t, y - d) !== k || kAt(x + t, y + d) !== k || kAt(x - d, y + t) !== k || kAt(x + d, y + t) !== k) return d;
    return max + 1;
  };
  const near = (x: number, y: number, k: number, max: number) => {
    for (let d = 1; d <= max; d++)
      for (let t = -d; t <= d; t++)
        if (kAt(x + t, y - d) === k || kAt(x + t, y + d) === k || kAt(x - d, y + t) === k || kAt(x + d, y + t) === k) return d;
    return max + 1;
  };

  const pix = new Uint8ClampedArray(W * H * 4);
  const set = (x: number, y: number, c: RGB) => {
    const o = (y * W + x) * 4;
    pix[o] = c[0];
    pix[o + 1] = c[1];
    pix[o + 2] = c[2];
    pix[o + 3] = 255;
  };
  for (let ay = 0; ay < H; ay++)
    for (let ax = 0; ax < W; ax++) {
      const k = kind[ay * W + ax];
      const h = hash(ax, ay, 3);
      let c: RGB;
      if (k === K_WATER) {
        const d = distOut(ax, ay, K_WATER, 3);
        if (d === 1) c = C.foam;
        else if (d === 2) c = C.shore;
        else if (d === 3) c = (ax + ay) % 2 ? C.shore2 : C.shore;
        else {
          c = deepSea[ay * W + ax] ? C.deep : C.sea;
          // little wave arcs
          const wr = Math.floor(ay / 6);
          const wc = Math.floor((ax + wr * 5) / 11);
          if (hash(wc, wr, 21) < 0.3) {
            const t = (ax + wr * 5) % 11;
            if (t < 5 && ay % 6 === (t === 0 || t === 4 ? 1 : 0)) c = C.wave;
          }
        }
      } else if (k === K_SAND) {
        const toWater = near(ax, ay, K_WATER, 2);
        const shade = kAt(ax, ay - 1) === K_GRASS || kAt(ax, ay - 1) === K_TALL;
        c = toWater === 1 ? C.wet : shade ? C.sandDark : h < 0.05 ? C.sandSpeck : C.sand;
      } else if (k === K_TALL) {
        // tall grass: rows of blades, light tips, dark roots, a dark rim
        const d = distOut(ax, ay, K_TALL, 1);
        const col = ax % 3;
        const off = Math.floor(hash(Math.floor(ax / 3), 0, 5) * 3);
        const row = (ay + off) % 4;
        if (d === 1) c = kAt(ax, ay - 1) !== K_TALL ? C.tallTip : C.tallDark;
        else if (col === 1 && row === 0) c = C.tallTip;
        else if (col === 1) c = C.tallLight;
        else if (row === 3) c = C.tallDark;
        else c = C.tall;
      } else {
        // grass: a dark rim and lip where it meets sand or water, tufts and a few flowers
        const d = distOut(ax, ay, K_GRASS, 1);
        const below = kAt(ax, ay + 1) === K_SAND || kAt(ax, ay + 1) === K_WATER;
        if (d === 1 && kAt(ax, ay + 1) !== K_TALL && kAt(ax, ay - 1) !== K_TALL && kAt(ax - 1, ay) !== K_TALL && kAt(ax + 1, ay) !== K_TALL) c = C.grassRim;
        else if (below) c = C.grassLip;
        else {
          // soft darker patches, shaped by waves rather than squares
          const patch = Math.sin(ax * 0.045 + Math.sin(ay * 0.03) * 2) + Math.sin(ay * 0.052 - ax * 0.021 + 1.7);
          c = patch > 0.7 + (hash(ax, ay, 2) - 0.5) * 0.25 ? C.grass2 : C.grass;
          const tc = Math.floor(ax / 5);
          const tr = Math.floor(ay / 4);
          const th = hash(tc, tr, 11);
          if (th < 0.15) {
            const tx = tc * 5 + 1 + Math.floor(hash(tc, tr, 12) * 3);
            const ty = tr * 4 + 1;
            if ((ay === ty && (ax === tx - 1 || ax === tx + 1)) || (ay === ty + 1 && ax === tx)) c = th < 0.08 ? C.tuft : C.tuft2;
          }
          // now and then a little flower: a plus of petals round a yellow middle
          const fc = Math.floor(ax / 13);
          const fr = Math.floor(ay / 11);
          const fh = hash(fc, fr, 31);
          if (fh < 0.18) {
            const fx = fc * 13 + 2 + Math.floor(hash(fc, fr, 32) * 9);
            const fy = fr * 11 + 2 + Math.floor(hash(fc, fr, 33) * 7);
            const petal = fh < 0.09 ? C.flowerW : C.flowerP;
            if (ax === fx && ay === fy) c = C.flowerY;
            else if (Math.abs(ax - fx) + Math.abs(ay - fy) === 1) c = petal;
          }
        }
      }
      set(ax, ay, c);
    }

  // Walls, fences and crates, block by block, with a shadow on the ground under them.
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++) {
      const t = tileAt(c, r);
      if (!solid(t)) continue;
      const x0 = c * PER;
      const y0 = r * PER;
      const same = (dc: number, dr: number) => tileAt(c + dc, r + dr) === t;
      if (!solid(tileAt(c, r + 1)) && r + 1 < m.rows) for (let i = 0; i < PER; i++) set(x0 + i, y0 + PER, C.shadow);
      for (let j = 0; j < PER; j++)
        for (let i = 0; i < PER; i++) {
          const x = x0 + i;
          const y = y0 + j;
          const edgeL = i === 0 && !same(-1, 0);
          const edgeR = i === PER - 1 && !same(1, 0);
          const edgeT = j === 0 && !same(0, -1);
          const edgeB = j === PER - 1 && !same(0, 1);
          const face = j >= PER - 2 && !same(0, 1); // the front of the block, seen from above at a slant
          let col: RGB;
          if (t === T_WALL) {
            // grey stone bricks, two rows a block, staggered
            if (edgeL || edgeR || edgeT || edgeB) col = C.stoneGap;
            else if (face) col = (x + (j === PER - 2 ? 0 : 2)) % 4 === 0 ? C.stoneGap : C.stoneFace;
            else {
              const by = y % 7 < 3 ? 0 : 1;
              const bx = (x + by * 2) % 4;
              const jy = y % 7;
              if (jy === 2 || jy === 5 - (face ? 1 : 0) || bx === 3) col = C.stoneDark;
              else if (bx === 0 && (jy === 0 || jy === 3)) col = C.stoneLight;
              else col = C.stone;
            }
          } else if (t === T_FENCE) {
            // logs: along the fence's run, rings at the ends
            const horiz = same(-1, 0) || same(1, 0) || !(same(0, -1) || same(0, 1));
            const u = horiz ? j : i; // across the log
            if (edgeL || edgeR || edgeT || edgeB) col = C.logGap;
            else if ((horiz && ((i === 1 && !same(-1, 0)) || (i === PER - 2 && !same(1, 0)))) || (!horiz && ((j === 1 && !same(0, -1)) || (j === PER - 2 && !same(0, 1))))) col = C.ring;
            else if (u === 3) col = C.logGap;
            else if (u === 1 || u === 4) col = C.logLight;
            else if (face && horiz) col = C.logDark;
            else col = hash(horiz ? Math.floor(x / 5) : Math.floor(y / 5), u, 9) < 0.2 ? C.logDark : C.log;
          } else {
            // a wooden crate: frame, planks and a cross brace
            const ci = i;
            const cj = j;
            if (edgeL || edgeR || edgeT || edgeB || ci === 0 || ci === PER - 1 || cj === 0 || cj === PER - 1) col = C.crateGap;
            else if (face) col = C.crateDark;
            else if (ci === 1 || cj === 1 || ci === PER - 2) col = C.crateDark;
            else if (ci === cj || ci === PER - 1 - cj) col = C.crateDark;
            else col = (cj % 2 === 0) ? C.crateLight : C.crate;
          }
          set(x, y, col);
        }
    }

  // Blow the art pixels up to 3x3 screen pixels.
  const small = document.createElement("canvas");
  small.width = W;
  small.height = H;
  small.getContext("2d")!.putImageData(new ImageData(pix, W, H), 0, 0);
  const canvas = document.createElement("canvas");
  canvas.width = m.cols * BLOCK;
  canvas.height = m.rows * BLOCK;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  return canvas;
}
