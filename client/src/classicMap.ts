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
  // Spawn circles (Classic only).
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
  return canvas;
}
