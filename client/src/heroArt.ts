// Heroes drawn from hand-made pictures (see scripts/embed-hero-art.mjs) instead of pixel grids.
// Each one has a front view, mirrored when the hero aims left; heroes with side and back views (4, or 8 with
// diagonals) show the one closest to where they aim instead.

import { HERO_SPRITES, renderPixelSprite } from "./art";
import { HERO_ART_DATA, HERO_ATTACK_DATA, PROP_ART_DATA } from "./heroArt.data";

export type Facing = "south" | "east" | "north" | "west" | "south-east" | "north-east" | "north-west" | "south-west";

// Facings in order of screen angle (0 = east; screen y grows downward, so +90 degrees is south).
const EIGHT: Facing[] = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];

/** How each picture sits in the world: its scale (vs. a pixel-grid hero) and where its feet are. */
interface ArtLayout {
  scale: number;
  originY: number;
}
const LAYOUT: Record<string, ArtLayout> = {
  golem: { scale: 1, originY: 0.97 },
  mossgolem: { scale: 0.8, originY: 0.97 },
  oni: { scale: 0.75, originY: 0.97 },
  kaido: { scale: 0.8, originY: 0.97 },
  bigmom: { scale: 0.8, originY: 0.97 },
  whitebeard: { scale: 0.75, originY: 0.97 },
  blackbeard: { scale: 0.75, originY: 0.97 },
  alphonse: { scale: 0.8, originY: 0.97 },
  ainz: { scale: 0.8, originY: 0.97 },
  rika: { scale: 0.55, originY: 0.97 },
  // The Detective's chess pieces (52px and 66px tall pictures): a small pawn, a queen taller than a hero.
  pawn: { scale: 1 / 3, originY: 0.97 },
  queen: { scale: 0.45, originY: 0.97 },
};
/** Same for the basic-attack swing frames, which can be a bigger canvas than the standing pictures. */
const ATTACK_LAYOUT: Record<string, ArtLayout> = {};
/** How long a basic-attack swing animation plays, in seconds. */
export const SWING_TIME = 0.25;

export function hasHeroArt(hero: string): boolean {
  return !!HERO_ART_DATA[hero];
}

export function heroArtLayout(hero: string): ArtLayout {
  // Front views are clean pixel sprites about 33px tall, feet on the bottom row. At 2/3 scale each sprite
  // pixel lands on exactly 2 screen pixels (x1.5 hero scale, x2 camera zoom), which keeps them crisp.
  return LAYOUT[hero] ?? { scale: 2 / 3, originY: 0.97 };
}

/** Whether the hero has only a front view (mirrored to face left instead of turning). */
export function frontOnly(hero: string): boolean {
  return !!HERO_ART_DATA[hero] && !HERO_ART_DATA[hero]!.east;
}

/** The facing for an aim angle: the nearest of 8 if the hero has diagonal pictures, else of 4. */
export function facingOf(aim: number, hero: string): Facing {
  if (frontOnly(hero)) return "south";
  const eight = !!HERO_ART_DATA[hero]?.["south-east"];
  const step = eight ? Math.PI / 4 : Math.PI / 2;
  const n = Math.round(aim / step);
  const i = (((n * (eight ? 1 : 2)) % 8) + 8) % 8;
  return EIGHT[i];
}

export function attackArtLayout(hero: string): ArtLayout {
  return ATTACK_LAYOUT[hero] ?? heroArtLayout(hero);
}

/**
 * The swing frame to show `t` (0..1) through a basic attack aimed at `aim`, and whether to mirror it,
 * or undefined if the hero has no swing frames. The front swing is used when he faces the camera;
 * otherwise the side swing (the east one, mirrored for the west side when there is no west one).
 */
export function attackFrame(hero: string, aim: number, t: number): { texture: string; flip: boolean } | undefined {
  const swing = HERO_ATTACK_DATA[hero];
  if (!swing) return undefined;
  const facing = facingOf(aim, hero);
  const left = Math.cos(aim) < -0.01;
  let dir: string | undefined;
  let flip = false;
  if (swing[facing]) dir = facing;
  else if (facing === "south" && swing.south) dir = "south";
  else if (left && swing.west) dir = "west";
  else if (swing.east) {
    dir = "east";
    flip = left;
  } else if (swing.west) {
    dir = "west";
    flip = !left;
  } else dir = Object.keys(swing)[0];
  if (!dir) return undefined;
  const n = swing[dir]!.length;
  const i = Math.min(n - 1, Math.floor(Math.max(0, t) * n));
  return { texture: `hero_${hero}_atk_${dir}_${i}`, flip };
}

/** Load every facing picture as a Phaser texture named `hero_<id>_<facing>` (plus swing frames and prop pictures). */
export function loadHeroArt(load: Phaser.Loader.LoaderPlugin) {
  for (const [hero, frames] of Object.entries(HERO_ART_DATA)) {
    for (const [facing, uri] of Object.entries(frames)) load.image(`hero_${hero}_${facing}`, uri);
  }
  for (const [name, uri] of Object.entries(PROP_ART_DATA)) load.image(name, uri);
  for (const [hero, swing] of Object.entries(HERO_ATTACK_DATA)) {
    for (const [dir, list] of Object.entries(swing)) list!.forEach((uri, i) => load.image(`hero_${hero}_atk_${dir}_${i}`, uri));
  }
}

/** The picture for the hero select cards: the hand-made front view, or the pixel-grid sprite. */
export function heroPortrait(hero: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  // Same 8:9 shape as the pixel-grid portraits, so the cards keep their layout while the picture loads.
  canvas.width = 48;
  canvas.height = 54;
  paintPortrait(canvas, hero);
  return canvas;
}

/** Resize `canvas` to the hero's portrait and draw it there (a moment later for hand-made art, which loads first). */
export function paintPortrait(canvas: HTMLCanvasElement, hero: string) {
  const front = HERO_ART_DATA[hero]?.south;
  if (!front) {
    const sprite = renderPixelSprite(HERO_SPRITES[hero as keyof typeof HERO_SPRITES]);
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    canvas.getContext("2d")!.drawImage(sprite, 0, 0);
    return;
  }
  canvas.dataset.hero = hero;
  const img = new Image();
  img.onload = () => {
    if (canvas.dataset.hero !== hero) return; // another hero was painted here since
    // Pictures come in different sizes: fit them in the 8:9 frame, centred, feet on the bottom edge.
    canvas.width = Math.max(img.width, Math.ceil((img.height * 8) / 9));
    canvas.height = Math.round((canvas.width * 9) / 8);
    canvas.getContext("2d")!.drawImage(img, Math.floor((canvas.width - img.width) / 2), canvas.height - img.height);
  };
  img.src = front;
}

/** Heroes that walk with stepping feet (trial: one hero first, the rest once the user likes it). */
export const WALK_HEROES = new Set(["rider"]);

/**
 * The walk cycle, the classic 4 poses of a pixel-art walk seen from the front:
 * 0 contact (left foot forward, right foot back), 1 passing (right knee up), 2 contact (mirror), 3 passing (left knee up).
 * The body sits lowest on a contact pose and the head follows the body one frame late.
 * Offsets are in picture pixels, + is down.
 */
const WALK_POSES = [
  { left: 1, right: -1, body: 1, head: 0 },
  { left: 0, right: -3, body: 0, head: 1 },
  { left: -1, right: 1, body: 1, head: 0 },
  { left: -3, right: 0, body: 0, head: 1 },
];
export const WALK_FRAMES = WALK_POSES.length;
/** Seconds per pose at walking speed: two steps every 0.56 s. */
export const WALK_FRAME_TIME = 0.14;
const PAD_TOP = 1;
const PAD_BOTTOM = 1;
const walkOrigin = new Map<string, number>();

/** The origin (0-1 of the frame's height) that puts a walk frame's feet where the standing picture's feet are. */
export function walkOriginY(hero: string): number {
  return walkOrigin.get(hero) ?? heroArtLayout(hero).originY;
}

/** A contact pose (a foot just landed): the moment for the squash and a puff of dust. */
export function walkContact(frame: number): boolean {
  return frame % 2 === 0;
}

/**
 * Build the walk frames `hero_<id>_walk_<n>` from the front picture. The picture is cut into head, body and the
 * two legs (split at the gap between the feet, or down the middle when there is none) and each part is moved by
 * the pose: the stepping foot comes 1 pixel toward the camera, the other goes back, the passing knee lifts 3.
 */
export function makeWalkFrames(textures: Phaser.Textures.TextureManager, hero: string) {
  const key = `hero_${hero}_south`;
  if (!textures.exists(key)) return;
  const img = textures.get(key).getSourceImage() as HTMLImageElement;
  const w = img.width;
  const h = img.height;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d")!;
  sctx.drawImage(img, 0, 0);
  const alpha = sctx.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number) => alpha[(y * w + x) * 4 + 3] > 0;
  const gapIn = (y: number): [number, number] | undefined => {
    let l = 0;
    while (l < w && !solid(l, y)) l++;
    let r = w - 1;
    while (r > l && !solid(r, y)) r--;
    let best: [number, number] | undefined;
    for (let x = l + 1; x < r; x++) {
      if (solid(x, y)) continue;
      let e = x;
      while (e < r && !solid(e, y)) e++;
      if (!best || e - x > best[1] - best[0]) best = [x, e];
      x = e;
    }
    return best;
  };
  // The bottom of the figure (pictures may have empty rows under the feet).
  let bottom = h - 1;
  while (bottom > 0 && ![...Array(w).keys()].some((x) => solid(x, bottom))) bottom--;
  const feetGap = gapIn(bottom);
  let split: number;
  let legTop: number;
  if (feetGap) {
    split = Math.round((feetGap[0] + feetGap[1]) / 2);
    let top = bottom;
    while (top > bottom - h * 0.3 && gapIn(top - 1)) top--;
    legTop = Math.max(top - 1, bottom - Math.round(h * 0.22));
  } else {
    // A long robe or one big foot: the bottom part still steps, split down the middle of the figure.
    let l = 0;
    while (l < w && !solid(l, bottom)) l++;
    let r = w - 1;
    while (r > l && !solid(r, bottom)) r--;
    split = Math.round((l + r + 1) / 2);
    legTop = bottom - Math.max(3, Math.round(h * 0.14));
  }
  const headEnd = Math.round(h * 0.47); // chibi heroes: the head is about half the picture
  const H = h + PAD_TOP + PAD_BOTTOM;
  walkOrigin.set(hero, (PAD_TOP + heroArtLayout(hero).originY * h) / H);
  WALK_POSES.forEach((pose, f) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const part = (x0: number, x1: number, y0: number, y1: number, dy: number) => {
      if (x1 > x0 && y1 > y0) ctx.drawImage(src, x0, y0, x1 - x0, y1 - y0, x0, PAD_TOP + y0 + dy, x1 - x0, y1 - y0);
    };
    const leg = (x0: number, x1: number, dy: number) => {
      part(x0, x1, legTop, h, dy);
      // A leg that comes forward gets longer: repeat its top row into the space it left.
      for (let i = 0; i < dy; i++) part(x0, x1, legTop, legTop + 1, i);
    };
    leg(0, split, pose.left);
    leg(split, w, pose.right);
    // The body covers the tops of the legs (a lifted knee tucks under it); one row more on top so a head
    // that lags above it never leaves a hole at the neck.
    part(0, w, headEnd - 1, legTop, pose.body);
    part(0, w, 0, headEnd, pose.head);
    const name = `hero_${hero}_walk_${f}`;
    if (textures.exists(name)) textures.remove(name);
    textures.addCanvas(name, c);
  });
}
