// Classic 3v3 maps drawn as pixel art: checkered floor, walls, crates, fences, tall grass, water and
// the spawn circles (Red at the top, Blue at the bottom).

import { WORLD_H, WORLD_W } from "../../shared/game";
import {
  BLOCK,
  ClassicMap,
  MAP_COLS_C,
  MAP_H,
  MAP_ROWS_C,
  MAP_W,
  MAP_X,
  MAP_Y,
  T_BUSH,
  T_CRATE,
  T_FENCE,
  T_WALL,
  T_WATER,
} from "../../shared/maps";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** Draws the map's blocks onto `ctx` with its top-left corner at (ox, oy), `b` pixels per block. */
export function paintMap(ctx: CanvasRenderingContext2D, m: ClassicMap, ox: number, oy: number, b: number, spawnRings = true) {
  // In the game: textured stone, wood, grass and water. Small pictures (the lobby's map buttons) stay flat.
  if (b >= 12) paintRich(ctx, m, ox, oy, b);
  else paintFlat(ctx, m, ox, oy, b);
  paintSpawns(ctx, m, ox, oy, b, spawnRings);
}

function paintSpawns(ctx: CanvasRenderingContext2D, m: ClassicMap, ox: number, oy: number, b: number, spawnRings: boolean) {
  const px = Math.max(1, Math.round(b / 10));
  for (const [team, color] of spawnRings ? ([[1, "#ff4a5a"], [2, "#3a9aff"]] as const) : []) {
    for (const s of m.spawns[team]) {
      const cx = ox + ((s.x - MAP_X) / BLOCK) * b;
      const cy = oy + ((s.y - MAP_Y) / BLOCK) * b;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, b * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, px * 1.5);
      ctx.beginPath();
      ctx.arc(cx, cy, b * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** The old flat look: checkered floor and simple blocks (used for small map pictures). */
function paintFlat(ctx: CanvasRenderingContext2D, m: ClassicMap, ox: number, oy: number, b: number) {
  const t = m.theme;
  const rand = seeded(91);
  const at = (c: number, r: number) => (c < 0 || r < 0 || c >= m.cols || r >= m.rows ? -1 : m.tiles[r * m.cols + c]);
  const px = Math.max(1, Math.round(b / 10)); // one "art pixel"
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) {
      const x = ox + c * b;
      const y = oy + r * b;
      ctx.fillStyle = (c + r) % 2 ? t.floor2 : t.floor;
      ctx.fillRect(x, y, b, b);
    }
  }
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) {
      const tile = at(c, r);
      const x = ox + c * b;
      const y = oy + r * b;
      if (tile === T_WATER) {
        ctx.fillStyle = t.water;
        ctx.fillRect(x, y, b, b);
        ctx.fillStyle = t.waterLight;
        for (let i = 0; i < 2; i++) ctx.fillRect(x + Math.floor(rand() * (b - 6 * px)), y + Math.floor(rand() * (b - 2 * px)), 5 * px, px);
        // a darker rim where the water meets dry land
        ctx.fillStyle = shade(t.water, 0.6);
        if (at(c, r - 1) !== T_WATER) ctx.fillRect(x, y, b, 2 * px);
        if (at(c - 1, r) !== T_WATER) ctx.fillRect(x, y, px, b);
        if (at(c + 1, r) !== T_WATER) ctx.fillRect(x + b - px, y, px, b);
        if (at(c, r + 1) !== T_WATER) ctx.fillRect(x, y + b - px, b, px);
      } else if (tile === T_BUSH) {
        ctx.fillStyle = t.bushDark;
        ctx.fillRect(x, y + 2 * px, b, b - 2 * px);
        ctx.fillStyle = t.bush;
        ctx.fillRect(x, y + 3 * px, b, b - 6 * px);
        // grass blades sticking up
        for (let i = 0; i < 4; i++) {
          const bx = x + i * (b / 4) + px;
          ctx.fillStyle = t.bush;
          ctx.fillRect(bx, y, 2 * px, 4 * px);
          ctx.fillStyle = t.bushDark;
          ctx.fillRect(bx + px, y + 4 * px + Math.floor(rand() * 4) * px, px, 3 * px);
        }
      } else if (tile === T_WALL || tile === T_CRATE || tile === T_FENCE) {
        const side = tile === T_WALL ? t.wall : tile === T_CRATE ? t.crate : t.fence;
        const top = tile === T_WALL ? t.wallTop : tile === T_CRATE ? t.crateTop : t.fenceTop;
        const lip = Math.round(b * 0.28);
        // shadow on the floor, the block's front face, then its top
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x + px * 2, y + b, b, px * 2);
        ctx.fillStyle = shade(side, 0.75);
        ctx.fillRect(x, y + b - lip, b, lip);
        ctx.fillStyle = top;
        ctx.fillRect(x, y, b, b - lip);
        if (tile === T_CRATE) {
          // planks and a cross brace
          ctx.fillStyle = shade(top, 0.78);
          ctx.fillRect(x, y, b, px);
          ctx.fillRect(x, y + Math.round((b - lip) / 2), b, px);
          ctx.fillRect(x, y, px, b - lip);
          ctx.fillRect(x + b - px, y, px, b - lip);
        } else if (tile === T_FENCE) {
          ctx.fillStyle = shade(top, 0.8);
          for (let i = 0; i < 3; i++) ctx.fillRect(x + i * (b / 3) + px, y + px, px, b - lip - 2 * px);
        } else {
          // stone joints
          ctx.fillStyle = shade(top, 0.85);
          ctx.fillRect(x, y + Math.round((b - lip) / 2), b, px);
          ctx.fillRect(x + Math.round(b / 2), y, px, Math.round((b - lip) / 2));
        }
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(x, y + b - px, b, px);
      }
    }
  }
}

/** The whole Classic stage floor: the map in the middle of the world, a dark border all round. */
export function drawClassicGround(m: ClassicMap): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = shade(m.theme.wall, 0.35);
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  const rand = seeded(7);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = shade(m.theme.wall, 0.25 + rand() * 0.2);
    ctx.fillRect(Math.floor(rand() * WORLD_W), Math.floor(rand() * WORLD_H), 4, 4);
  }
  // a raised rim round the map
  ctx.fillStyle = shade(m.theme.wall, 0.55);
  ctx.fillRect(MAP_X - 6, MAP_Y - 6, MAP_W + 12, MAP_H + 12);
  ctx.fillStyle = shade(m.theme.wallTop, 0.8);
  ctx.fillRect(MAP_X - 4, MAP_Y - 4, MAP_W + 8, MAP_H + 8);
  paintMap(ctx, m, MAP_X, MAP_Y, BLOCK);
  return canvas;
}

/** A small picture of a map for the lobby's map buttons. */
export function drawMapThumb(m: ClassicMap, b = 3): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = MAP_COLS_C * b;
  canvas.height = MAP_ROWS_C * b;
  paintMap(canvas.getContext("2d")!, m, 0, 0, b);
  return canvas;
}

/** Battle Royale: the whole island at full size (the sea round it is part of the map). */
export function drawRoyaleGround(m: ClassicMap): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = m.cols * BLOCK;
  canvas.height = m.rows * BLOCK;
  const ctx = canvas.getContext("2d")!;
  paintMap(ctx, m, 0, 0, BLOCK, false);
  // Sand along the shore: floor blocks next to the sea get a lighter, speckled edge.
  const at = (c: number, r: number) => (c < 0 || r < 0 || c >= m.cols || r >= m.rows ? T_WATER : m.tiles[r * m.cols + c]);
  const rand = seeded(5);
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++) {
      if (at(c, r) === T_WATER) continue;
      let shore = false;
      for (let dr = -2; dr <= 2 && !shore; dr++) for (let dc = -2; dc <= 2; dc++) if (Math.hypot(dc, dr) <= 2.2 && at(c + dc, r + dr) === T_WATER && Math.hypot(c + dc - m.cols / 2, r + dr - m.rows / 2) > m.cols / 2 - 6) shore = true;
      if (!shore || at(c, r) !== 0) continue;
      ctx.fillStyle = (c + r) % 2 ? "#ead9a0" : "#e2d096";
      ctx.fillRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
      ctx.fillStyle = "#c8b47a";
      for (let i = 0; i < 3; i++) ctx.fillRect(c * BLOCK + Math.floor(rand() * (BLOCK - 2)), r * BLOCK + Math.floor(rand() * (BLOCK - 2)), 2, 2);
    }
  // Foam where the sea meets the island.
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++) {
      if (at(c, r) !== T_WATER) continue;
      const x = c * BLOCK;
      const y = r * BLOCK;
      if (at(c, r - 1) !== T_WATER) ctx.fillRect(x, y + 2, BLOCK, 2);
      if (at(c, r + 1) !== T_WATER) ctx.fillRect(x, y + BLOCK - 4, BLOCK, 2);
      if (at(c - 1, r) !== T_WATER) ctx.fillRect(x + 2, y, 2, BLOCK);
      if (at(c + 1, r) !== T_WATER) ctx.fillRect(x + BLOCK - 4, y, 2, BLOCK);
    }
  // Heal pads: a round stone slab with a green cross.
  for (const h of (m as ClassicMap & { heals?: { x: number; y: number }[] }).heals ?? []) {
    ctx.fillStyle = "#8a8e86";
    ctx.beginPath();
    ctx.arc(h.x, h.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c8ccc0";
    ctx.beginPath();
    ctx.arc(h.x, h.y - 2, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e9a3e";
    ctx.fillRect(h.x - 5, h.y - 17, 10, 30);
    ctx.fillRect(h.x - 15, h.y - 7, 30, 10);
    ctx.fillStyle = "#4cff7a";
    ctx.fillRect(h.x - 3, h.y - 15, 6, 26);
    ctx.fillRect(h.x - 13, h.y - 5, 26, 6);
  }
  return canvas;
}

// ---- The textured look (2026-10-09): stone floors, brick walls, wooden crates, hedges, tall grass and water. ----

type RGB = [number, number, number];

function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function css([r, g, b]: RGB, f = 1, a = 1): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return a < 1 ? `rgba(${c(r)},${c(g)},${c(b)},${a})` : `rgb(${c(r)},${c(g)},${c(b)})`;
}

/** Smooth value noise in 0..1 (a few octaves), the same every time for the same seed. */
function noiseField(seed: number) {
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = smooth(x - xi);
    const ty = smooth(y - yi);
    const a = hash(xi, yi) + (hash(xi + 1, yi) - hash(xi, yi)) * tx;
    const b = hash(xi, yi + 1) + (hash(xi + 1, yi + 1) - hash(xi, yi + 1)) * tx;
    return a + (b - a) * ty;
  };
  return (x: number, y: number, scale = 8) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1 / scale;
    for (let o = 0; o < 3; o++, amp /= 2, f *= 2) sum += value(x * f, y * f) * amp;
    return sum / 0.875;
  };
}

function paintRich(ctx: CanvasRenderingContext2D, m: ClassicMap, ox: number, oy: number, b: number) {
  const t = m.theme;
  const rand = seeded(91);
  const noise = noiseField(17);
  const at = (c: number, r: number) => (c < 0 || r < 0 || c >= m.cols || r >= m.rows ? T_WALL : m.tiles[r * m.cols + c]);
  const solid = (v: number) => v === T_WALL || v === T_CRATE || v === T_FENCE;
  const W = m.cols * b;
  const H = m.rows * b;

  // 1. The floor: big flagstones in a running bond, each a little lighter or darker, with worn grain.
  const floor = rgb(t.floor);
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const stoneH = b;
  const stoneW = b * 2;
  const tint = new Map<string, number>();
  for (let y = 0; y < H; y++) {
    const row = Math.floor(y / stoneH);
    const shift = row % 2 ? stoneW / 2 : 0;
    const iy = y - row * stoneH;
    for (let x = 0; x < W; x++) {
      const col = Math.floor((x + shift) / stoneW);
      const ix = x + shift - col * stoneW;
      const key = `${col},${row}`;
      let k = tint.get(key);
      if (k === undefined) tint.set(key, (k = 0.93 + rand() * 0.12));
      let f = k * (0.9 + noise(x, y, 6) * 0.2);
      if (iy === 0 || ix === 0) f *= 0.72; // mortar
      else if (iy === 1 || ix === 1) f *= 1.1; // the lit top and left edges of each stone
      else if (iy === stoneH - 1 || ix === stoneW - 1) f *= 0.88;
      const i = (y * W + x) * 4;
      d[i] = Math.min(255, floor[0] * f);
      d[i + 1] = Math.min(255, floor[1] * f);
      d[i + 2] = Math.min(255, floor[2] * f);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, ox, oy);
  // Cracks and pebbles here and there.
  for (let i = 0; i < (m.cols * m.rows) / 6; i++) {
    const x = ox + rand() * W;
    const y = oy + rand() * H;
    if (at(Math.floor((x - ox) / b), Math.floor((y - oy) / b)) !== 0) continue;
    if (rand() < 0.5) {
      ctx.strokeStyle = css(floor, 0.7, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5);
      let cx = x;
      let cy = y;
      for (let s = 0; s < 3; s++) ctx.lineTo(Math.round((cx += (rand() - 0.5) * 8)) + 0.5, Math.round((cy += rand() * 5)) + 0.5);
      ctx.stroke();
    } else {
      ctx.fillStyle = css(floor, 0.75);
      ctx.fillRect(Math.round(x), Math.round(y) + 1, 3, 2);
      ctx.fillStyle = css(floor, 1.25);
      ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
    }
  }

  // 2. Soft shadows that walls, crates and hedges throw down and to the right.
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++) if (solid(at(c, r))) ctx.fillRect(ox + c * b + 4, oy + r * b + 5, b, b);

  // 3. Water: deeper (darker) away from the bank, light ripples, a dark lip under the bank and foam.
  const water = rgb(t.water);
  const waterLight = rgb(t.waterLight);
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++) {
      if (at(c, r) !== T_WATER) continue;
      const x = ox + c * b;
      const y = oy + r * b;
      let shoreDist = 3;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (at(c + dc, r + dr) !== T_WATER) shoreDist = Math.min(shoreDist, Math.max(Math.abs(dc), Math.abs(dr)));
      const grad = ctx.createLinearGradient(x, y, x, y + b);
      grad.addColorStop(0, css(water, 1.05 - shoreDist * 0.08));
      grad.addColorStop(1, css(water, 0.97 - shoreDist * 0.08));
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, b, b);
      for (let i = 0; i < 3; i++) {
        const wx = x + 2 + Math.floor(rand() * (b - 9));
        const wy = y + 3 + Math.floor(rand() * (b - 6));
        ctx.fillStyle = css(waterLight, 1, 0.75);
        ctx.fillRect(wx, wy, 3, 1);
        ctx.fillRect(wx + 3, wy - 1, 3, 1);
      }
      if (at(c, r - 1) !== T_WATER) {
        ctx.fillStyle = "rgba(0,0,0,0.35)"; // the bank's shadow on the water
        ctx.fillRect(x, y, b, 4);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillRect(x, y + 4, b, 1);
      }
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      if (at(c, r + 1) !== T_WATER) ctx.fillRect(x, y + b - 2, b, 2);
      if (at(c - 1, r) !== T_WATER) ctx.fillRect(x, y, 2, b);
      if (at(c + 1, r) !== T_WATER) ctx.fillRect(x + b - 2, y, 2, b);
    }

  // 4. Tall grass: a carpet of blades, darker at the roots, lighter at the tips.
  const bush = rgb(t.bush);
  const bushDark = rgb(t.bushDark);
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++) {
      if (at(c, r) !== T_BUSH) continue;
      const x = ox + c * b;
      const y = oy + r * b;
      ctx.fillStyle = css(bushDark, 0.9);
      const top = at(c, r - 1) === T_BUSH ? 0 : 3;
      ctx.fillRect(x, y + top, b, b - top);
      for (let i = 0; i < 16; i++) {
        const bx = x + rand() * b;
        const by = y + b * 0.35 + rand() * b * 0.75;
        const h = b * (0.35 + rand() * 0.35);
        const lean = (rand() - 0.5) * 5;
        const shadeF = 0.85 + rand() * 0.35;
        ctx.fillStyle = css(rand() < 0.35 ? bushDark : bush, shadeF);
        ctx.beginPath();
        ctx.moveTo(bx - 1.6, by);
        ctx.lineTo(bx + lean, by - h);
        ctx.lineTo(bx + 1.6, by);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = css(bush, 1.35, 0.9);
        ctx.fillRect(Math.round(bx + lean) - 0.5, Math.round(by - h), 1, 2);
      }
    }

  // 5. Walls (stone bricks), crates (planks with iron corners) and hedges, each with a lit top and a darker face.
  const lip = Math.round(b * 0.3);
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++) {
      const tile = at(c, r);
      if (!solid(tile)) continue;
      const x = ox + c * b;
      const y = oy + r * b;
      const below = at(c, r + 1) === tile && r + 1 < m.rows;
      const faceH = below ? 0 : lip;
      const topH = b - faceH;
      if (tile === T_WALL) {
        const top = rgb(t.wallTop);
        const side = rgb(t.wall);
        ctx.fillStyle = css(top, 0.95);
        ctx.fillRect(x, y, b, topH);
        // bricks on the top face, staggered, each its own shade
        const bh = Math.max(4, Math.round(b / 3));
        for (let by = 0; by < topH; by += bh) {
          const off = ((r * 3 + by / bh) % 2) * (b / 4);
          for (let bx = -off; bx < b; bx += b / 2) {
            const x0 = Math.max(0, bx);
            const x1 = Math.min(b, bx + b / 2);
            ctx.fillStyle = css(top, 0.9 + rand() * 0.18);
            ctx.fillRect(x + x0 + 1, y + by + 1, x1 - x0 - 1, Math.min(bh, topH - by) - 1);
            ctx.fillStyle = css(top, 1.15);
            ctx.fillRect(x + x0 + 1, y + by + 1, x1 - x0 - 1, 1);
          }
        }
        if (faceH) {
          const g = ctx.createLinearGradient(x, y + topH, x, y + b);
          g.addColorStop(0, css(side, 0.85));
          g.addColorStop(1, css(side, 0.55));
          ctx.fillStyle = g;
          ctx.fillRect(x, y + topH, b, faceH);
          ctx.fillStyle = css(side, 0.45);
          ctx.fillRect(x + Math.round(b / 3), y + topH, 1, faceH);
          ctx.fillRect(x + Math.round((2 * b) / 3), y + topH, 1, faceH);
        }
        if (at(c, r - 1) !== T_WALL) {
          ctx.fillStyle = css(top, 1.3);
          ctx.fillRect(x, y, b, 1);
        }
      } else if (tile === T_CRATE) {
        const top = rgb(t.crateTop);
        const side = rgb(t.crate);
        const pad = 1;
        ctx.fillStyle = css(top, 0.55);
        ctx.fillRect(x + pad - 1, y + pad - 1, b - 2 * pad + 2, topH - pad + 1);
        const planks = 3;
        const ph = (topH - 2 * pad) / planks;
        for (let i = 0; i < planks; i++) {
          const py = y + pad + i * ph;
          ctx.fillStyle = css(top, 0.92 + rand() * 0.14);
          ctx.fillRect(x + pad, Math.round(py), b - 2 * pad, Math.round(ph) - 1);
          ctx.fillStyle = css(top, 1.12);
          ctx.fillRect(x + pad, Math.round(py), b - 2 * pad, 1);
          ctx.fillStyle = css(top, 0.75);
          for (let g = 0; g < 2; g++) ctx.fillRect(x + pad + 2 + Math.floor(rand() * (b - 10)), Math.round(py + ph / 2), 4 + Math.floor(rand() * 3), 1);
        }
        // iron corner plates and nails
        ctx.fillStyle = "#4a4a52";
        for (const [cx, cy] of [[x + pad, y + pad], [x + b - pad - 4, y + pad], [x + pad, y + topH - 4], [x + b - pad - 4, y + topH - 4]]) ctx.fillRect(cx, cy, 4, 4);
        ctx.fillStyle = "#b8b8c4";
        for (const [cx, cy] of [[x + pad + 1, y + pad + 1], [x + b - pad - 3, y + pad + 1], [x + pad + 1, y + topH - 3], [x + b - pad - 3, y + topH - 3]]) ctx.fillRect(cx, cy, 1, 1);
        if (faceH) {
          ctx.fillStyle = css(side, 0.7);
          ctx.fillRect(x, y + topH, b, faceH);
          ctx.fillStyle = css(side, 0.5);
          ctx.fillRect(x, y + topH, b, 1);
          ctx.fillRect(x + Math.round(b / 2), y + topH, 1, faceH);
        }
      } else {
        // a trimmed hedge: leafy clumps over a darker body
        const top = rgb(t.fenceTop);
        const side = rgb(t.fence);
        ctx.fillStyle = css(side, 0.75);
        ctx.fillRect(x, y + 2, b, topH - 2);
        for (let i = 0; i < 9; i++) {
          const lx = x + 3 + rand() * (b - 6);
          const ly = y + 4 + rand() * (topH - 7);
          const lr = 3 + rand() * 2.5;
          ctx.fillStyle = css(top, 0.8 + rand() * 0.15);
          ctx.beginPath();
          ctx.arc(lx, ly, lr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = css(top, 1.2, 0.9);
          ctx.fillRect(Math.round(lx - lr / 2), Math.round(ly - lr / 2), 2, 1);
        }
        if (faceH) {
          ctx.fillStyle = css(side, 0.6);
          ctx.fillRect(x, y + topH, b, faceH);
          ctx.fillStyle = css(side, 0.45);
          for (let i = 0; i < 4; i++) ctx.fillRect(x + 2 + i * (b / 4), y + topH + 1, 2, faceH - 2);
        }
      }
      if (faceH) {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(x, y + b - 1, b, 1);
      }
    }
}
