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
const LAYOUT: Record<string, ArtLayout> = {};
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
