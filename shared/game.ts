// Game rules shared by the client (prediction, rendering) and the server (authority).

export const TILE = 16;
export const MAP_COLS = 60;
export const MAP_ROWS = 45;
export const WORLD_W = MAP_COLS * TILE; // 960
export const WORLD_H = MAP_ROWS * TILE; // 720
export const CENTER_X = WORLD_W / 2;
export const CENTER_Y = WORLD_H / 2;

export const SERVER_PORT = 2567;
export const ROOM_NAME = "emberfall";
export const MAX_PLAYERS = 4;

// Player (Gunslinger)
export const PLAYER_RADIUS = 6;
export const PLAYER_SPEED = 110;
export const PLAYER_MAX_HP = 100;
export const DASH_SPEED = 340;
export const DASH_TIME = 0.15;
export const DASH_COOLDOWN = 1.2;
export const SHOT_COOLDOWN = 0.18;
export const SHOT_SPEED = 360;
export const SHOT_DAMAGE = 10;
export const VOLLEY_COOLDOWN = 4;
export const VOLLEY_COUNT = 7;
export const VOLLEY_SPREAD = 0.6; // radians, total
export const RESPAWN_TIME = 5;

// Emberfall rule twist: lava creeps in from the edges during a wave.
export const LAVA_START_RADIUS = 520;
export const LAVA_MIN_RADIUS = 110;
export const LAVA_SHRINK_PER_SEC = 9;
export const LAVA_DPS = 25;

export const WAVE_COUNT = 5; // last wave is the boss
export const INTERMISSION_TIME = 6;

export type EnemyKind = "cinderling" | "brute" | "caster" | "warden";

export interface EnemyDef {
  hp: number;
  speed: number;
  radius: number;
  touchDamage: number;
  score: number;
  shootEvery?: number; // seconds between shots
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  cinderling: { hp: 20, speed: 70, radius: 5, touchDamage: 8, score: 10 },
  brute: { hp: 90, speed: 38, radius: 9, touchDamage: 20, score: 30 },
  caster: { hp: 35, speed: 45, radius: 6, touchDamage: 6, score: 20, shootEvery: 2.2 },
  warden: { hp: 1400, speed: 30, radius: 18, touchDamage: 30, score: 500, shootEvery: 1.6 },
};

export const ENEMY_SHOT_SPEED = 140;
export const ENEMY_SHOT_DAMAGE = 12;

// Waves: how many of each enemy type spawn.
export const WAVES: Partial<Record<EnemyKind, number>>[] = [
  { cinderling: 6 },
  { cinderling: 8, caster: 2 },
  { cinderling: 8, brute: 2, caster: 3 },
  { cinderling: 10, brute: 4, caster: 4 },
  { warden: 1, cinderling: 6 },
];

// Obstacles: basalt pillars (circles).
export interface Rock {
  x: number;
  y: number;
  r: number;
}

export const ROCKS: Rock[] = [
  { x: 300, y: 220, r: 18 },
  { x: 660, y: 220, r: 18 },
  { x: 300, y: 500, r: 18 },
  { x: 660, y: 500, r: 18 },
  { x: 480, y: 160, r: 12 },
  { x: 480, y: 560, r: 12 },
  { x: 200, y: 360, r: 14 },
  { x: 760, y: 360, r: 14 },
];

export interface PlayerInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  aim: number; // radians
  shoot: boolean;
  dash: boolean;
  volley: boolean;
}

export const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  aim: 0,
  shoot: false,
  dash: false,
  volley: false,
};

/** Normalised movement direction from input keys. */
export function inputDirection(input: PlayerInput): { x: number; y: number } {
  let x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(x, y);
  if (len > 0) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

/** Move a circle by (dx, dy), keeping it inside the world and out of rocks. */
export function moveCircle(x: number, y: number, dx: number, dy: number, r: number): { x: number; y: number } {
  let nx = Math.min(WORLD_W - r, Math.max(r, x + dx));
  let ny = Math.min(WORLD_H - r, Math.max(r, y + dy));
  for (const rock of ROCKS) {
    const ddx = nx - rock.x;
    const ddy = ny - rock.y;
    const dist = Math.hypot(ddx, ddy);
    const min = rock.r + r;
    if (dist < min && dist > 0.0001) {
      nx = rock.x + (ddx / dist) * min;
      ny = rock.y + (ddy / dist) * min;
    }
  }
  return { x: nx, y: ny };
}

export function hitsRock(x: number, y: number): boolean {
  return ROCKS.some((rock) => Math.hypot(x - rock.x, y - rock.y) < rock.r);
}

export function inLava(x: number, y: number, lavaRadius: number): boolean {
  return Math.hypot(x - CENTER_X, y - CENTER_Y) > lavaRadius;
}
