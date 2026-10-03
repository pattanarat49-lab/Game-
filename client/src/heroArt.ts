// Heroes drawn from hand-made pictures (see scripts/embed-hero-art.mjs) instead of pixel grids.
// Each one has a picture per facing: the game shows the one closest to where the hero aims.

import { HERO_SPRITES, renderPixelSprite } from "./art";
import { HERO_ART_DATA } from "./heroArt.data";

export type Facing = "south" | "east" | "north" | "west";

/** How each picture sits in the world: its scale (vs. a pixel-grid hero) and where its feet are. */
interface ArtLayout {
  scale: number;
  originY: number;
}
const LAYOUT: Record<string, ArtLayout> = {
  // 48x48 PixelLab frames; the figure stands about 46px tall with its feet on the bottom row.
  superman: { scale: 0.45, originY: 0.97 },
};

export function hasHeroArt(hero: string): boolean {
  return !!HERO_ART_DATA[hero];
}

export function heroArtLayout(hero: string): ArtLayout {
  return LAYOUT[hero] ?? { scale: 1, originY: 0.95 };
}

/** The facing for an aim angle (screen y grows downward, so south faces the viewer). */
export function facingOf(aim: number): Facing {
  const c = Math.cos(aim);
  const s = Math.sin(aim);
  if (Math.abs(c) >= Math.abs(s)) return c >= 0 ? "east" : "west";
  return s >= 0 ? "south" : "north";
}

/** Load every facing picture as a Phaser texture named `hero_<id>_<facing>`. */
export function loadHeroArt(load: Phaser.Loader.LoaderPlugin) {
  for (const [hero, frames] of Object.entries(HERO_ART_DATA)) {
    for (const [facing, uri] of Object.entries(frames)) load.image(`hero_${hero}_${facing}`, uri);
  }
}

/** The picture for the hero select cards: the hand-made front view, or the pixel-grid sprite. */
export function heroPortrait(hero: string): HTMLCanvasElement {
  const front = HERO_ART_DATA[hero]?.south;
  if (!front) return renderPixelSprite(HERO_SPRITES[hero as keyof typeof HERO_SPRITES]);
  // Same 8:9 shape as the pixel-grid portraits, so the cards keep their layout.
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 54;
  const img = new Image();
  img.onload = () => canvas.getContext("2d")!.drawImage(img, 0, 6);
  img.src = front;
  return canvas;
}
