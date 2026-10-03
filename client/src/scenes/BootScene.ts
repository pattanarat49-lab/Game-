import Phaser from "phaser";
import { MAP_COLS, MAP_ROWS, ROCKS, TILE, WORLD_H, WORLD_W } from "../../../shared/game";
import {
  BRUTE,
  CALCIFER,
  CASTER,
  CINDERLING,
  GODZILLA,
  ENEMY_SHOT,
  HERO_SPRITES,
  HOLY_ORB,
  LOKI_ORB,
  MAGIC_ORB,
  WATER_ORB,
  RIFLE,
  SNIPE_SHOT,
  SPARK,
  SWORD,
  SWORD_WAVE,
  TITAN_FORM,
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

/** Colours for each stage's floor. */
interface GroundTheme {
  seed: number;
  shades: string[];
  pebbles: [string, string];
  cracks: [string, string];
  crackChance: number;
  pillar: [string, string, string, string]; // outline, body, highlight, glow
}

const LAVA_THEME: GroundTheme = {
  seed: 1337,
  shades: ["#2b2026", "#30242a", "#33262c", "#2e2228"],
  pebbles: ["#3d2e35", "#241a1f"],
  cracks: ["#ffb347", "#d9531e"],
  crackChance: 0.08,
  pillar: ["#1c1418", "#4a3a42", "#62505a", "#ff7b1c"],
};

// A ruined city plaza at night: cracked concrete and broken pillars.
const BOSS_THEME: GroundTheme = {
  seed: 2024,
  shades: ["#2a2f36", "#2e343c", "#31373f", "#2b3138"],
  pebbles: ["#3e4650", "#1f242a"],
  cracks: ["#171b20", "#4a5562"],
  crackChance: 0.14,
  pillar: ["#15191e", "#4d5661", "#6b7682", "#7fd0ff"],
};

// The PvP Arena: a sandstone colosseum floor.
const ARENA_THEME: GroundTheme = {
  seed: 77,
  shades: ["#4a3b2c", "#4f3f2f", "#544332", "#4c3d2e"],
  pebbles: ["#5f4d3a", "#3a2e22"],
  cracks: ["#30261c", "#6b5842"],
  crackChance: 0.06,
  pillar: ["#2a2018", "#8a7556", "#a89070", "#ffd23f"],
};

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
    this.addCanvas("magic", renderPixelSprite(MAGIC_ORB));
    this.addCanvas("calcifer", renderPixelSprite(CALCIFER));
    this.addCanvas("holy", renderPixelSprite(HOLY_ORB));
    this.addCanvas("stone", renderPixelSprite(WATER_ORB));
    this.addCanvas("lokishot", renderPixelSprite(LOKI_ORB));
    this.addCanvas("asgard", this.drawAsgard());
    this.addCanvas("titanform", renderPixelSprite(TITAN_FORM));
    this.addCanvas("cinderling", renderPixelSprite(CINDERLING));
    this.addCanvas("brute", renderPixelSprite(BRUTE));
    this.addCanvas("caster", renderPixelSprite(CASTER));
    this.addCanvas("warden", renderPixelSprite(WARDEN));
    this.addCanvas("eshot", renderPixelSprite(ENEMY_SHOT));
    this.addCanvas("spark", renderPixelSprite(SPARK));
    this.addCanvas("ground_lava", this.drawGround(LAVA_THEME));
    this.addCanvas("ground_boss", this.drawGround(BOSS_THEME));
    this.addCanvas("ground_pvp", this.drawGround(ARENA_THEME));
    this.addCanvas("godzilla", renderPixelSprite(GODZILLA));
    this.addCanvas("lava", this.drawLavaTiles());

    this.scene.start("Game");
  }

  private addCanvas(key: string, canvas: HTMLCanvasElement) {
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }

  /** A stage floor: tiles with pebbles, occasional cracks, and the pillars from ROCKS. */
  private drawGround(theme: GroundTheme): HTMLCanvasElement {
    const rand = seeded(theme.seed);
    const canvas = document.createElement("canvas");
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
    const ctx = canvas.getContext("2d")!;
    const shades = theme.shades;

    for (let ty = 0; ty < MAP_ROWS; ty++) {
      for (let tx = 0; tx < MAP_COLS; tx++) {
        const x0 = tx * TILE;
        const y0 = ty * TILE;
        ctx.fillStyle = shades[Math.floor(rand() * shades.length)];
        ctx.fillRect(x0, y0, TILE, TILE);
        // pebbles
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = theme.pebbles[rand() < 0.5 ? 0 : 1];
          ctx.fillRect(x0 + Math.floor(rand() * TILE), y0 + Math.floor(rand() * TILE), 1, 1);
        }
        // tile edge shading for a subtle grid
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(x0, y0 + TILE - 1, TILE, 1);
        ctx.fillRect(x0 + TILE - 1, y0, 1, TILE);
        // occasional glowing crack
        if (rand() < theme.crackChance) {
          let cx = x0 + 3 + Math.floor(rand() * 10);
          let cy = y0 + 3 + Math.floor(rand() * 10);
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = theme.cracks[i % 3 === 0 ? 0 : 1];
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
      ctx.fillStyle = theme.pillar[0];
      this.pixelCircle(ctx, rock.x, rock.y, rock.r);
      ctx.fillStyle = theme.pillar[1];
      this.pixelCircle(ctx, rock.x, rock.y, rock.r - 2);
      ctx.fillStyle = theme.pillar[2];
      this.pixelCircle(ctx, rock.x - rock.r / 4, rock.y - rock.r / 4, rock.r / 2);
      ctx.fillStyle = theme.pillar[3];
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

  /** Loki's illusion: the golden city of Asgard, towers and spires catching the light. */
  private drawAsgard(): HTMLCanvasElement {
    const W = 200;
    const H = 150;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const rand = seeded(9);
    const px = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };
    // Rainbow bridge (Bifrost) running out of the city.
    const bifrost = ["#ff5a5a", "#ffb04a", "#ffe86a", "#6ae08a", "#5ab4ff", "#9a7aff"];
    bifrost.forEach((c, i) => px(0, H - 18 + i, W * 0.42, 1, c));
    // Towers, back to front: [centre x, width, height]
    const towers: [number, number, number][] = [
      [30, 14, 60], [170, 14, 64], [55, 16, 82], [145, 16, 86], [78, 18, 104], [122, 18, 100], [100, 26, 136],
    ];
    for (const [cx, w, h] of towers) {
      const x0 = cx - w / 2;
      const top = H - 12 - h;
      // body with light on the left, shade on the right
      px(x0 - 1, top, w + 2, h, "#5a3a0a");
      px(x0, top, w, h, "#e0a832");
      px(x0, top, w * 0.3, h, "#ffd86a");
      px(x0 + w * 0.75, top, w * 0.25, h, "#b07a1e");
      // gold bands and glowing windows
      for (let y = top + 6; y < H - 16; y += 10) {
        px(x0, y, w, 1, "#fff0b0");
        for (let x = x0 + 3; x < x0 + w - 3; x += 5) if (rand() < 0.8) px(x, y + 3, 2, 3, "#fff8d8");
      }
      // spire
      for (let i = 0; i < w / 2 + 6; i++) {
        const half = Math.max(0.5, w / 2 - i * (w / (w + 12)));
        px(cx - half, top - i, half * 2, 1, i % 3 === 0 ? "#fff0b0" : "#e7b83a");
      }
      px(cx, top - w / 2 - 10, 1, 4, "#ffffff");
    }
    // Dome on the great hall
    for (let i = 0; i < 12; i++) {
      const half = Math.sqrt(144 - i * i) * 1.3;
      px(100 - half, H - 52 - i, half * 2, 1, i < 4 ? "#ffd86a" : "#e0a832");
    }
    // The wall and gate in front
    px(10, H - 22, W - 20, 12, "#5a3a0a");
    px(11, H - 21, W - 22, 10, "#c99428");
    for (let x = 12; x < W - 12; x += 6) px(x, H - 24, 3, 3, "#e7b83a");
    px(92, H - 20, 16, 10, "#3a2400");
    px(94, H - 18, 12, 8, "#ffe9a0");
    // Sparkles
    for (let i = 0; i < 40; i++) px(rand() * W, rand() * (H - 30), 1, 1, "#ffffff");
    return canvas;
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
