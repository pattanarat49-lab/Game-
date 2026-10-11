// The new Open World on screen (2026-10-11): the ground (painted by owGround.ts in a worker, square by
// square as the camera comes near), the moving water under it (calm water drifting and two layers of the
// user's wave lines crossing), the waterfall, ripples, wandering sheep, and the props
// (client/art/props/ow_*.png) standing in front of or behind heroes by how far down they are.

import Phaser from "phaser";
import { BLOCK } from "../../shared/maps";
import { L_BRIDGE, L_DEEP, L_FALL, L_PATH, L_WATER, OPEN_WORLD } from "../../shared/world";
import { ART, CHUNK_BLOCKS, CHUNK_PX, TILE, hash, owPixels } from "./owGround";

const m = OPEN_WORLD;

/** The waterfall down the cliff, `frames` pictures of it falling (art pixels). */
function waterfallFrames(scene: Phaser.Scene, w: number, h: number, frames: number) {
  const COLS = [
    [0, 120, 150],
    [0, 150, 196],
    [0, 176, 220],
    [40, 200, 232],
    [150, 232, 246],
    [236, 252, 255],
  ];
  for (let f = 0; f < frames; f++) {
    const key = `owfall_${f}`;
    if (scene.textures.exists(key)) continue;
    const can = document.createElement("canvas");
    can.width = w;
    can.height = h + 12;
    const ctx = can.getContext("2d")!;
    const img = ctx.createImageData(w, h + 12);
    for (let y = 0; y < h + 12; y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        const side = Math.min(x, w - 1 - x);
        if (y >= h) {
          // the splash at the foot: white foam, bubbling
          const n = hash(x >> 1, (y >> 1) + f * 7, 3);
          const fall = (y - h) / 12;
          if (n > 0.25 + fall * 0.7) {
            img.data.set([236, 252, 255, 230 - fall * 150], o);
          }
          continue;
        }
        // streaks running down: two-pixel strands, each its own shade, with bright dashes sliding down them
        // (the pattern repeats every 24 pixels, so the six frames loop)
        const strand = x >> 1;
        const shade = hash(strand, 0, 11);
        const t = (((y + Math.floor(hash(strand, 1, 12) * 24) - f * 4) % 24) + 24) % 24;
        let ci = shade < 0.3 ? 1 : shade < 0.75 ? 2 : 3;
        if (t < 2) ci = 5;
        else if (t < 7) ci = Math.max(ci, 4);
        if (side === 0) ci = 0;
        else if (side === 1) ci = Math.min(ci, 1);
        if (y < 3) ci = Math.max(ci, 4); // the lip where it pours over
        img.data.set([...COLS[ci], 255], o);
      }
    ctx.putImageData(img, 0, 0);
    scene.textures.addCanvas(key, can);
  }
}

interface Sheep {
  img: Phaser.GameObjects.Image;
  home: { x: number; y: number };
  to: { x: number; y: number };
  wait: number;
}

/** Props are drawn at twice the tiles' pixel density (scripts/worldprops DENSITY), so at half the tile scale. */
const PROP_SCALE = ART / 2;

/** Where the windmill's hub is on its picture, from the bottom centre (prop pixels; printed by ow_windmill.py). */
const SAILS_HUB: [number, number] = [9.3, -330.1];

/** Cloud shadows (2026-10-11, made softer on the user's word): billowy patches of shade with soft edges,
 * from layered noise that repeats across the picture (so the tiling never shows a seam), drawn smooth. */
function cloudTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("ow_clouds")) return;
  const N = 256;
  // value noise on a grid of `g` cells that wraps round the picture
  const layer = (g: number, seed: number) => (x: number, y: number) => {
    const fx = (x / N) * g;
    const fy = (y / N) * g;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const v = (a: number, b: number) => hash(((a % g) + g) % g, ((b % g) + g) % g, seed);
    const top = v(ix, iy) + (v(ix + 1, iy) - v(ix, iy)) * sx;
    const bottom = v(ix, iy + 1) + (v(ix + 1, iy + 1) - v(ix, iy + 1)) * sx;
    return top + (bottom - top) * sy;
  };
  const octaves = [layer(3, 81), layer(6, 82), layer(12, 83), layer(24, 84), layer(48, 85)];
  const weights = [0.5, 0.25, 0.13, 0.08, 0.04];
  const can = document.createElement("canvas");
  can.width = can.height = N;
  const ctx = can.getContext("2d")!;
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let v = 0;
      for (let i = 0; i < octaves.length; i++) v += octaves[i](x, y) * weights[i];
      // thick in the middle of a cloud, fading off at its edge; clear sky between clouds
      const t = Math.max(0, Math.min(1, (v - 0.52) / 0.16));
      const a = t * t * (3 - 2 * t);
      img.data.set([16, 26, 48, Math.round(a * 255)], (y * N + x) * 4);
    }
  ctx.putImageData(img, 0, 0);
  scene.textures.addCanvas("ow_clouds", can);
  scene.textures.get("ow_clouds").setFilter(Phaser.Textures.FilterMode.LINEAR); // soft, not blocky
}

/** A soft, flat puff of mist (white in the middle, fading out), drawn smooth. */
function fogTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("ow_fog")) return;
  const W = 128;
  const H = 64;
  const can = document.createElement("canvas");
  can.width = W;
  can.height = H;
  const g = can.getContext("2d")!;
  // a few overlapping round puffs make a lumpy bank of mist
  for (let i = 0; i < 6; i++) {
    // kept well inside the picture, so no puff is cut off square at its edge
    const x = W * (0.36 + hash(i, 0, 600) * 0.28);
    const y = H * (0.45 + hash(i, 1, 600) * 0.1);
    const r = H * (0.22 + hash(i, 2, 600) * 0.1);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(205,218,236,0.5)");
    grad.addColorStop(1, "rgba(200,215,235,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }
  scene.textures.addCanvas("ow_fog", can);
  scene.textures.get("ow_fog").setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/** Light points of the lanterns (for the night), from the bottom of each lantern picture, in art pixels. */
const LAMP_HEAD: Record<string, [number, number]> = { lantern: [17, -26], lampbanner: [9, -18] };

export class OwWorld {
  private made = new Set<string>();
  private worker?: Worker;
  /** Ground squares asked for and not back yet; until the first ones are in, the water stays hidden. */
  private pending = 0;
  private dead = false;
  private groundIn = false;
  private water: Phaser.GameObjects.TileSprite[] = [];
  private falls: Phaser.GameObjects.Image[] = [];
  private sheep: Sheep[] = [];
  private sails: Phaser.GameObjects.Image[] = [];
  private clouds?: Phaser.GameObjects.TileSprite;
  /** Night mist lying along the roads (2026-10-11, user request): soft puffs that drift and breathe. */
  private fog: { img: Phaser.GameObjects.Image; x: number; y: number; ph: number }[] = [];
  private nextRipple = 0;
  /** Where the lanterns glow at night (world pixels). */
  lamps: { x: number; y: number }[] = [];

  constructor(private scene: Phaser.Scene) {
    try {
      this.worker = new Worker(new URL("./owGround.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e: MessageEvent<{ cx: number; cy: number; px: Uint8ClampedArray }>) => this.addGround(e.data.cx, e.data.cy, e.data.px);
    } catch {
      this.worker = undefined; // no workers here: paint on the spot
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroy());
    const w = m.cols * BLOCK;
    const h = m.rows * BLOCK;
    // Water, under the whole map: calm water drifting, and two layers of wave lines crossing over it.
    this.water.push(scene.add.tileSprite(0, 0, w, h, "owwater_base").setOrigin(0).setTileScale(ART).setDepth(-12));
    this.water.push(scene.add.tileSprite(0, 0, w, h, "owwater_glint").setOrigin(0).setTileScale(ART).setDepth(-11.5));
    this.water.push(scene.add.tileSprite(0, 0, w, h, "owwater_glint").setOrigin(0).setTileScale(ART).setDepth(-11.4).setFlipX(true));
    // The waterfall(s): each run of waterfall blocks along the cliff.
    for (let c = 0; c < m.cols; c++) {
      let r0 = -1;
      for (let r = 0; r < m.rows; r++) if (m.look[r * m.cols + c] === L_FALL) { r0 = r; break; }
      if (r0 < 0 || (c > 0 && m.look[r0 * m.cols + c - 1] === L_FALL)) continue;
      let c1 = c;
      while (c1 + 1 < m.cols && m.look[r0 * m.cols + c1 + 1] === L_FALL) c1++;
      let r1 = r0;
      while (r1 + 1 < m.rows && m.look[(r1 + 1) * m.cols + c] === L_FALL) r1++;
      const fw = (c1 - c + 1) * TILE;
      const fh = (r1 - r0 + 1) * TILE + 4;
      waterfallFrames(scene, fw, fh, 6);
      this.falls.push(scene.add.image(c * BLOCK, r0 * BLOCK - 4 * ART, "owfall_0").setOrigin(0).setScale(ART).setDepth(-9));
    }
    // Props: trees, rocks, fences, the well, the cave... in front of or behind heroes by how far down they are.
    // Flat things (bridges, flowers, tufts) lie under everyone.
    const FLAT = /^(bridge|woodbridge|flower|flowers|grass_|clover|reeds|twigs|branch|mushroom)/;
    for (const p of m.props) {
      if (p.kind === "stonebridge") {
        this.stoneBridge(p.x, p.y, Math.floor(p.v / 100), p.v % 100);
        continue;
      }
      const key = `ow_${p.kind}`;
      if (!scene.textures.exists(key)) continue;
      const img = scene.add.image(p.x, p.y, key).setOrigin(0.5, 1).setScale(PROP_SCALE);
      img.setDepth(FLAT.test(p.kind) ? (p.kind.includes("bridge") ? -8 : -7) : p.y);
      if (p.kind === "cave") img.setDepth(p.y - 30);
      if (p.kind === "windmill") {
        // The sails turn (client/scripts/worldprops/ow_windmill.py cut them off the user's windmill sheet).
        this.sails.push(scene.add.image(p.x + SAILS_HUB[0] * PROP_SCALE, p.y + SAILS_HUB[1] * PROP_SCALE, "ow_windmill_sails").setScale(PROP_SCALE).setDepth(p.y + 0.5));
      }
      if (p.v === 2) this.sheep.push({ img, home: { x: p.x, y: p.y }, to: { x: p.x, y: p.y }, wait: Math.random() * 3000 });
      const head = LAMP_HEAD[p.kind];
      if (head) this.lamps.push({ x: p.x + head[0] * ART, y: p.y + head[1] * ART });
    }
    // Cloud shadows drifting over everything (2026-10-11, user request).
    cloudTexture(scene);
    this.clouds = scene.add.tileSprite(0, 0, w, h, "ow_clouds").setOrigin(0).setTileScale(5).setDepth(3990).setAlpha(0.3);
    // Mist along the roads, seen only at night: a puff on every few road blocks.
    fogTexture(scene);
    for (let r = 0; r < m.rows; r++)
      for (let c = 0; c < m.cols; c++) {
        const l = m.look[r * m.cols + c];
        if ((l !== L_PATH && l !== L_BRIDGE) || hash(c, r, 500) > 0.22) continue;
        const x = (c + hash(c, r, 501)) * BLOCK;
        const y = (r + hash(c, r, 502)) * BLOCK;
        const img = scene.add.image(x, y, "ow_fog").setDepth(4002).setAlpha(0).setVisible(false);
        img.setScale(1.6 + hash(c, r, 503) * 1.4, 0.9 + hash(c, r, 504) * 0.5);
        this.fog.push({ img, x, y, ph: hash(c, r, 505) * 6.28 });
      }
    this.update(0, 16);
  }

  /**
   * The stone bridge over the river (2026-10-11, drawn in code: the sheet's bridge was a side view cut off at
   * the top). Seen from above like the rest of the map: a paved deck along the road from bank to bank, a low
   * wall on each side (the far one behind heroes, the near one in front), and under the near wall the face of
   * the bridge with its arches over the water.
   */
  private stoneBridge(c0: number, r0: number, cols: number, rows: number) {
    const scene = this.scene;
    const key = `ow_stonebridge_${c0}_${r0}`;
    const W = (cols + 2) * TILE; // a block onto each bank
    const D = rows * TILE; // the deck
    const WALL = 10; // how tall a side wall stands
    const FACE = 22; // the face with the arches, below the near wall
    const H = WALL + D + WALL + FACE;
    if (!scene.textures.exists(key)) {
      const can = document.createElement("canvas");
      can.width = W;
      can.height = H;
      const g = can.getContext("2d")!;
      const STONE = ["#8d8f86", "#9a9b90", "#7f8279", "#a4a597", "#878a80"];
      const pick = (x: number, y: number) => STONE[Math.floor(hash(x, y, 300) * STONE.length)];
      // Courses of cut stone: rows of blocks `bh` tall, offset every other row, dark mortar between.
      const masonry = (x0: number, y0: number, w: number, h: number, bw: number, bh: number, dark = 1) => {
        g.fillStyle = "#3e3f3c";
        g.fillRect(x0, y0, w, h);
        for (let row = 0; row * bh < h; row++)
          for (let x = -((row % 2) * bw) / 2; x < w; x += bw) {
            const bx = Math.max(0, x);
            const ww = Math.min(w, x + bw) - bx - 1;
            const hh = Math.min(bh, h - row * bh) - 1;
            if (ww <= 0 || hh <= 0) continue;
            g.globalAlpha = 1;
            g.fillStyle = pick(x0 + bx, y0 + row * bh);
            g.fillRect(x0 + bx, y0 + row * bh, ww, hh);
            g.fillStyle = "rgba(255,255,255,0.18)"; // lit top edge
            g.fillRect(x0 + bx, y0 + row * bh, ww, 1);
            g.fillStyle = `rgba(0,0,0,${0.18 * dark})`; // shaded bottom edge
            g.fillRect(x0 + bx, y0 + row * bh + hh - 1, ww, 1);
          }
      };
      // The face and its arches: one arch per two blocks of river, dark water showing through.
      const fy = WALL + D + WALL;
      masonry(0, fy, W, FACE, 10, 6, 1.6);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(0, fy, W, FACE);
      const arches = Math.max(1, Math.round(cols / 1.6));
      const span = (cols * TILE) / arches;
      for (let i = 0; i < arches; i++) {
        const cx = TILE + span * (i + 0.5);
        const rx = span * 0.36;
        g.fillStyle = "#0b2a3a";
        g.beginPath();
        g.moveTo(cx - rx, fy + FACE);
        g.lineTo(cx - rx, fy + FACE - 8);
        g.arc(cx, fy + FACE - 8, rx, Math.PI, 0);
        g.lineTo(cx + rx, fy + FACE);
        g.closePath();
        g.fill();
        // the water's sparkle in the shadow, and the arch stones round it
        g.fillStyle = "rgba(120,220,230,0.5)";
        g.fillRect(Math.round(cx - rx + 3), fy + FACE - 2, Math.round(rx * 2 - 6), 1);
        g.strokeStyle = "#b4b5a8";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(cx, fy + FACE - 8, rx + 1, Math.PI, 0);
        g.stroke();
      }
      // The deck: big paving slabs, worn darker down the middle where people walk.
      masonry(0, WALL, W, D, 16, 11, 0.6);
      g.fillStyle = "rgba(60,48,36,0.12)";
      g.fillRect(0, WALL + D * 0.3, W, D * 0.4);
      // The two side walls: a capstone on top, the side below it.
      for (const wy of [0, WALL + D]) {
        masonry(0, wy, W, WALL, 8, 5);
        g.fillStyle = "#c2c3b5";
        g.fillRect(0, wy, W, 2);
        g.fillStyle = "#2a2b29";
        g.fillRect(0, wy + WALL - 1, W, 1);
      }
      // Posts at the ends of each wall.
      for (const px of [0, W - 8])
        for (const wy of [0, WALL + D]) {
          g.fillStyle = "#2a2b29";
          g.fillRect(px, wy - 4, 8, WALL + 4);
          g.fillStyle = "#a7a89b";
          g.fillRect(px + 1, wy - 3, 6, WALL + 2);
          g.fillStyle = "#c9cabd";
          g.fillRect(px + 1, wy - 3, 6, 2);
        }
      // Outline round the ends.
      g.fillStyle = "#2a2b29";
      g.fillRect(0, 0, 1, H);
      g.fillRect(W - 1, 0, 1, H);
      scene.textures.addCanvas(key, can);
      // the near wall as its own picture, so it can stand in front of heroes on the deck
      const near = document.createElement("canvas");
      near.width = W;
      near.height = WALL + 4;
      near.getContext("2d")!.drawImage(can, 0, WALL + D - 4, W, WALL + 4, 0, 0, W, WALL + 4);
      scene.textures.addCanvas(`${key}_near`, near);
    }
    // The deck's top sits WALL art pixels above the road's first row; the near wall right under its last row.
    const x = (c0 - 1) * BLOCK;
    const y = r0 * BLOCK - WALL * ART;
    scene.add.image(x, y, key).setOrigin(0).setScale(ART).setDepth(-8);
    const nearY = (r0 + rows) * BLOCK;
    scene.add.image(x, nearY - 4 * ART, `${key}_near`).setOrigin(0).setScale(ART).setDepth(nearY + WALL * ART);
  }

  /** A square of ground is painted: put it on the map. */
  private addGround(cx: number, cy: number, px?: Uint8ClampedArray) {
    if (this.dead) return;
    const key = `ow_ground_${cx}_${cy}`;
    if (px) {
      this.pending = Math.max(0, this.pending - 1);
      if (!this.scene.textures.exists(key)) {
        const can = document.createElement("canvas");
        can.width = can.height = CHUNK_PX;
        can.getContext("2d")!.putImageData(new ImageData(px as unknown as Uint8ClampedArray<ArrayBuffer>, CHUNK_PX, CHUNK_PX), 0, 0);
        this.scene.textures.addCanvas(key, can);
      }
    }
    const span = CHUNK_BLOCKS * BLOCK;
    this.scene.add.image(cx * span, cy * span, key).setOrigin(0).setScale(ART).setDepth(-10);
  }

  destroy() {
    this.dead = true;
    this.worker?.terminate();
    this.worker = undefined;
  }

  /** Make the ground squares near the camera, move the water, the waterfall, the sheep and the ripples. */
  update(now: number, dt: number, night = 0) {
    const scene = this.scene;
    const view = scene.cameras.main.worldView;
    const span = CHUNK_BLOCKS * BLOCK;
    const pad = span * 0.5;
    for (let cy = Math.max(0, Math.floor((view.y - pad) / span)); cy * span < Math.min(m.rows * BLOCK, view.bottom + pad); cy++)
      for (let cx = Math.max(0, Math.floor((view.x - pad) / span)); cx * span < Math.min(m.cols * BLOCK, view.right + pad); cx++) {
        const key = `ow_ground_${cx}_${cy}`;
        if (this.made.has(key)) continue;
        this.made.add(key);
        if (scene.textures.exists(key)) this.addGround(cx, cy);
        else if (this.worker) {
          this.pending++;
          this.worker.postMessage({ cx, cy });
        } else this.addGround(cx, cy, owPixels(cx, cy));
      }
    if (this.pending === 0) this.groundIn = true;
    for (const wl of this.water) wl.setVisible(this.groundIn);
    const t = now / 1000;
    const [base, g1, g2] = this.water;
    base.setTilePosition(t * 2.2, t * 1.1);
    g1.setTilePosition(t * 7, t * 3).setAlpha(0.55 + 0.45 * Math.sin(t * 1.3));
    g2.setTilePosition(-t * 5 + 90, t * 4.5 + 60).setAlpha(0.55 - 0.45 * Math.sin(t * 1.3));
    for (const f of this.falls) f.setTexture(`owfall_${Math.floor(now / 90) % 6}`);
    for (const sl of this.sails) sl.setRotation(t * 0.6);
    this.clouds?.setTilePosition(-t * 1.6, -t * 0.6); // a slow breeze from the west
    this.clouds?.setAlpha(0.3 * (1 - night)); // no cloud shadows in the dark
    // The night mist: drifts east and back, swelling and thinning, only where the camera is.
    for (const f of this.fog) {
      const on = night > 0.02 && f.x > view.x - 90 && f.x < view.right + 90 && f.y > view.y - 60 && f.y < view.bottom + 60;
      f.img.setVisible(on);
      if (!on) continue;
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.35 + f.ph);
      f.img.setPosition(f.x + Math.sin(t * 0.12 + f.ph) * 14, f.y + Math.cos(t * 0.09 + f.ph) * 4);
      f.img.setAlpha(night * (0.08 + 0.12 * breathe));
    }
    // Sheep wander about their spot in the pasture, stopping to graze.
    for (const s of this.sheep) {
      if (s.wait > 0) {
        s.wait -= dt;
        continue;
      }
      const dx = s.to.x - s.img.x;
      const dy = s.to.y - s.img.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) {
        s.wait = 1500 + Math.random() * 4500;
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * BLOCK * 2.5;
        s.to = { x: s.home.x + Math.cos(a) * d, y: s.home.y + Math.sin(a) * d * 0.8 };
        continue;
      }
      const step = Math.min(dist, (dt / 1000) * 9);
      s.img.setPosition(s.img.x + (dx / dist) * step, s.img.y + (dy / dist) * step).setDepth(s.img.y);
      if (Math.abs(dx) > 0.5) s.img.setFlipX(dx < 0);
    }
    // Rings spreading on the water here and there.
    if (now > this.nextRipple) {
      this.nextRipple = now + 350;
      for (let tries = 0; tries < 6; tries++) {
        const c = Math.floor((view.x + Math.random() * view.width) / BLOCK);
        const r = Math.floor((view.y + Math.random() * view.height) / BLOCK);
        if (c < 0 || r < 0 || c >= m.cols || r >= m.rows) continue;
        const l = m.look[r * m.cols + c];
        if (l !== L_WATER && l !== L_DEEP) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const n = m.look[(r + b) * m.cols + c + a]; return n !== L_WATER && n !== L_DEEP; })) continue;
        const ring = scene.add.image((c + Math.random()) * BLOCK, (r + Math.random()) * BLOCK, "owripple").setDepth(-9.5).setScale(ART * 0.3).setAlpha(0.9);
        scene.tweens.add({ targets: ring, scale: ART * 1.1, alpha: 0, duration: 1800, ease: "Sine.easeOut", onComplete: () => ring.destroy() });
        break;
      }
    }
  }
}

