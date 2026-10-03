// Heroes drawn from hand-made pictures (see scripts/embed-hero-art.mjs) instead of pixel grids.
// Each one has a picture per facing (4, or 8 with diagonals): the game shows the one closest to where the hero aims.

import { HERO_SPRITES, renderPixelSprite } from "./art";
import { HERO_ART_DATA } from "./heroArt.data";

export type Facing = "south" | "east" | "north" | "west" | "south-east" | "north-east" | "north-west" | "south-west";

// Facings in order of screen angle (0 = east; screen y grows downward, so +90 degrees is south).
const EIGHT: Facing[] = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];

/** How each picture sits in the world: its scale (vs. a pixel-grid hero) and where its feet are. */
interface ArtLayout {
  scale: number;
  originY: number;
}
const LAYOUT: Record<string, ArtLayout> = {
  // 48x48 PixelLab frames; the figure stands about 46px tall with its feet on the bottom row.
  superman: { scale: 0.45, originY: 0.97 },
  // 32x32 frames; about 30px tall.
  hanuman: { scale: 0.7, originY: 0.95 },
};

export function hasHeroArt(hero: string): boolean {
  return !!HERO_ART_DATA[hero];
}

export function heroArtLayout(hero: string): ArtLayout {
  return LAYOUT[hero] ?? { scale: 1, originY: 0.95 };
}

/** The facing for an aim angle: the nearest of 8 if the hero has diagonal pictures, else of 4. */
export function facingOf(aim: number, hero: string): Facing {
  const eight = !!HERO_ART_DATA[hero]?.["south-east"];
  const step = eight ? Math.PI / 4 : Math.PI / 2;
  const n = Math.round(aim / step);
  const i = (((n * (eight ? 1 : 2)) % 8) + 8) % 8;
  return EIGHT[i];
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
  img.onload = () => {
    // Pictures come in different sizes (48x48, 32x32...): draw them square with a gap on top.
    canvas.width = img.width;
    canvas.height = Math.round((img.width * 9) / 8);
    canvas.getContext("2d")!.drawImage(img, 0, canvas.height - img.height);
  };
  img.src = front;
  return canvas;
}
