// The new Open World on screen (2026-10-11): the ground (painted by owGround.ts in a worker, square by
// square as the camera comes near), the moving water under it (calm water drifting and two layers of the
// user's wave lines crossing), the waterfall, ripples, wandering sheep, and the props
// (client/art/props/ow_*.png) standing in front of or behind heroes by how far down they are.

import Phaser from "phaser";
import { BLOCK } from "../../shared/maps";
import { L_DEEP, L_FALL, L_WATER, OPEN_WORLD } from "../../shared/world";
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

/** Where the windmill's hub is on its picture, from the bottom centre (art pixels; printed by ow_windmill.py). */
const SAILS_HUB: [number, number] = [4.7, -165.6];

/** Cloud shadows: soft round patches of shade, a picture that repeats every CLOUD_PX art pixels both ways. */
function cloudTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("ow_clouds")) return;
  const N = 128; // drawn in 2x2 blocks, so the shade has a pixel-art edge
  const can = document.createElement("canvas");
  can.width = can.height = N;
  const ctx = can.getContext("2d")!;
  const img = ctx.createImageData(N, N);
  // a few waves that all repeat across the picture, so the tiling never shows a seam
  const waves: [number, number, number, number][] = [];
  for (let i = 0; i < 7; i++) waves.push([1 + Math.floor(hash(i, 1, 70) * 3), Math.floor(hash(i, 2, 71) * 5) - 2, hash(i, 3, 72) * 6.28, 1 / (1 + i * 0.35)]);
  for (let y = 0; y < N; y += 2)
    for (let x = 0; x < N; x += 2) {
      let v = 0;
      for (const [fx, fy, ph, w] of waves) v += Math.sin(((fx * x + fy * y) / N) * Math.PI * 2 + ph) * w + Math.cos(((fy * x - fx * y) / N) * Math.PI * 2 + ph * 1.7) * w * 0.6;
      const a = v > 1.35 ? 1 : v > 1.05 ? 0.5 : 0;
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 2; i++) img.data.set([12, 20, 44, Math.round(a * 255)], ((y + j) * N + x + i) * 4);
    }
  ctx.putImageData(img, 0, 0);
  scene.textures.addCanvas("ow_clouds", can);
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
      const key = `ow_${p.kind}`;
      if (!scene.textures.exists(key)) continue;
      const img = scene.add.image(p.x, p.y, key).setOrigin(0.5, 1).setScale(ART);
      img.setDepth(FLAT.test(p.kind) ? (p.kind.includes("bridge") ? -8 : -7) : p.y);
      if (p.kind === "cave") img.setDepth(p.y - 30);
      if (p.kind === "windmill") {
        // The sails turn (client/scripts/worldprops/ow_windmill.py cut them off the user's windmill sheet).
        this.sails.push(scene.add.image(p.x + SAILS_HUB[0] * ART, p.y + SAILS_HUB[1] * ART, "ow_windmill_sails").setScale(ART).setDepth(p.y + 0.5));
      }
      if (p.v === 2) this.sheep.push({ img, home: { x: p.x, y: p.y }, to: { x: p.x, y: p.y }, wait: Math.random() * 3000 });
      const head = LAMP_HEAD[p.kind];
      if (head) this.lamps.push({ x: p.x + head[0] * ART, y: p.y + head[1] * ART });
    }
    // Cloud shadows drifting over everything (2026-10-11, user request).
    cloudTexture(scene);
    this.clouds = scene.add.tileSprite(0, 0, w, h, "ow_clouds").setOrigin(0).setTileScale(6).setDepth(3990).setAlpha(0.24);
    this.update(0, 16);
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
  update(now: number, dt: number) {
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
    this.clouds?.setTilePosition(-t * 2.2, -t * 0.9);
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

