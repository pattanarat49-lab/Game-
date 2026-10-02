import Phaser from "phaser";
import { MAP_COLS, MAP_ROWS, ROCKS, TILE, WORLD_H, WORLD_W } from "../../../shared/game";
import {
  BRUTE,
  CASTER,
  CINDERLING,
  ENEMY_SHOT,
  HERO_SPRITES,
  RIFLE,
  SNIPE_SHOT,
  SPARK,
  SWORD,
  SWORD_WAVE,
  WARDEN,
  renderPixelSprite,
} from "../art";

/** Small seeded random so the map looks the same for everyone. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    for (const [id, sprite] of Object.entries(HERO_SPRITES)) this.addCanvas(`hero_${id}`, renderPixelSprite(sprite));
    this.addCanvas("sword", renderPixelSprite(SWORD));
    this.addCanvas("rifle", renderPixelSprite(RIFLE));
    this.addCanvas("wave", renderPixelSprite(SWORD_WAVE));
    this.addCanvas("snipe", renderPixelSprite(SNIPE_SHOT));
    this.addCanvas("cinderling", renderPixelSprite(CINDERLING));
    this.addCanvas("brute", renderPixelSprite(BRUTE));
    this.addCanvas("caster", renderPixelSprite(CASTER));
    this.addCanvas("warden", renderPixelSprite(WARDEN));
    this.addCanvas("eshot", renderPixelSprite(ENEMY_SHOT));
    this.addCanvas("spark", renderPixelSprite(SPARK));
    this.addCanvas("ground", this.drawGround());
    this.addCanvas("lava", this.drawLavaTiles());

    this.scene.start("Game");
  }

  private addCanvas(key: string, canvas: HTMLCanvasElement) {
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }

  /** Emberfall ground: dark volcanic rock with glowing cracks and basalt pillars. */
  private drawGround(): HTMLCanvasElement {
    const rand = seeded(1337);
    const canvas = document.createElement("canvas");
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
    const ctx = canvas.getContext("2d")!;
    const shades = ["#2b2026", "#30242a", "#33262c", "#2e2228"];

    for (let ty = 0; ty < MAP_ROWS; ty++) {
      for (let tx = 0; tx < MAP_COLS; tx++) {
        const x0 = tx * TILE;
        const y0 = ty * TILE;
        ctx.fillStyle = shades[Math.floor(rand() * shades.length)];
        ctx.fillRect(x0, y0, TILE, TILE);
        // pebbles
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = rand() < 0.5 ? "#3d2e35" : "#241a1f";
          ctx.fillRect(x0 + Math.floor(rand() * TILE), y0 + Math.floor(rand() * TILE), 1, 1);
        }
        // tile edge shading for a subtle grid
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(x0, y0 + TILE - 1, TILE, 1);
        ctx.fillRect(x0 + TILE - 1, y0, 1, TILE);
        // occasional glowing crack
        if (rand() < 0.08) {
          let cx = x0 + 3 + Math.floor(rand() * 10);
          let cy = y0 + 3 + Math.floor(rand() * 10);
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = i % 3 === 0 ? "#ffb347" : "#d9531e";
            ctx.fillRect(cx, cy, 1, 1);
            cx += Math.floor(rand() * 3) - 1;
            cy += 1;
          }
        }
      }
    }

    for (const rock of ROCKS) {
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      this.pixelCircle(ctx, rock.x + 3, rock.y + 4, rock.r);
      // body and highlight
      ctx.fillStyle = "#1c1418";
      this.pixelCircle(ctx, rock.x, rock.y, rock.r);
      ctx.fillStyle = "#4a3a42";
      this.pixelCircle(ctx, rock.x, rock.y, rock.r - 2);
      ctx.fillStyle = "#62505a";
      this.pixelCircle(ctx, rock.x - rock.r / 4, rock.y - rock.r / 4, rock.r / 2);
      ctx.fillStyle = "#ff7b1c";
      ctx.fillRect(Math.round(rock.x), Math.round(rock.y - 2), 1, 5);
    }
    return canvas;
  }

  private pixelCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
      }
    }
  }

  /** Two 16x16 lava tiles side by side (used as a tileset). */
  private drawLavaTiles(): HTMLCanvasElement {
    const rand = seeded(42);
    const canvas = document.createElement("canvas");
    canvas.width = TILE * 2;
    canvas.height = TILE;
    const ctx = canvas.getContext("2d")!;
    for (let t = 0; t < 2; t++) {
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const wave = Math.sin((x + t * 5) * 0.7) + Math.cos((y + t * 3) * 0.6);
          ctx.fillStyle = wave > 1 ? "#ffd23f" : wave > 0 ? "#ff8a1f" : wave > -1 ? "#e5501b" : "#b3311a";
          ctx.fillRect(t * TILE + x, y, 1, 1);
        }
      }
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "#fff2b0";
        ctx.fillRect(t * TILE + Math.floor(rand() * TILE), Math.floor(rand() * TILE), 1, 1);
      }
    }
    return canvas;
  }
}
