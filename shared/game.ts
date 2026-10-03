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

// Players
export const PLAYER_RADIUS = 6;
export const DASH_SPEED = 340;
export const DASH_TIME = 0.15;
export const DASH_COOLDOWN = 1.2;

// Heroes. Every number here is safe to tweak for balance.
export type HeroId =
  | "superman"
  | "isekai"
  | "simo"
  | "killua"
  | "howl"
  | "ricardo"
  | "saitama"
  | "healer"
  | "deku"
  | "okita"
  | "gojo"
  | "starplatinum"
  | "rudeus"
  | "loki";
export type AttackStyle = "punch" | "sword" | "rifle" | "lightning" | "magic";
export type SkillKind =
  | "smash"
  | "wave"
  | "burst"
  | "storm"
  | "fireball"
  | "jab"
  | "onepunch" // one huge sweep that kills anything
  | "heal" // heal every ally nearby
  | "line" // a wide straight blast
  | "slashes" // many quick slashes all around
  | "domain" // hits every enemy on the map
  | "timestop" // everything but the caster freezes
  | "hurricane" // a storm cloud that keeps striking an area
  | "asgard" // an illusion kingdom that drains enemies standing in it
  | "clone"; // a copy that fights on its own

export interface SkillDef {
  kind: SkillKind;
  name: string;
  cooldown: number;
  damage: number; // for "heal": fraction of max HP restored; for "asgard": fraction of max HP lost per second
  radius: number; // area of effect, or reach for waves, jabs and lines
  width?: number; // for "line"
  duration?: number; // for lasting skills (time stop, storms, illusions, clones)
}

export interface HeroDef {
  name: string;
  role: string;
  blurb: string;
  stars: number; // overall strength, 1-5, shown on the hero card
  maxHp: number;
  speed: number;
  attack: AttackStyle;
  attackCooldown: number; // seconds between basic attacks
  damage: number;
  range: number; // reach for punch/sword/lightning, travel distance for rifle/magic
  arc: number; // radians covered by a punch or sword swing
  aoe: number; // blast radius for lightning strikes and magic explosions
  shotSpeed: number;
  pierce: number; // how many enemies one bullet can pass through
  shot?: string; // projectile look for magic attacks (default "magic")
  skill: SkillDef;
  skill2?: SkillDef; // a second skill (E key / second button)
}

export const HEROES: Record<HeroId, HeroDef> = {
  superman: {
    name: "Superman",
    role: "Melee bruiser",
    blurb: "Hits hardest up close and has three times the HP.",
    stars: 3,
    maxHp: 300,
    speed: 100,
    attack: "punch",
    attackCooldown: 0.45,
    damage: 40,
    range: 22,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "smash", name: "SMASH", cooldown: 5, damage: 60, radius: 70 },
  },
  isekai: {
    name: "Isekai Hero",
    role: "Sword fighter",
    blurb: "Mid-range sword sweeps that hit every enemy in the arc.",
    stars: 3,
    maxHp: 120,
    speed: 110,
    attack: "sword",
    attackCooldown: 0.4,
    damage: 25,
    range: 42,
    arc: 2.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "wave", name: "SKY SLASH", cooldown: 4, damage: 40, radius: 230 },
  },
  simo: {
    name: "Simo Hayha",
    role: "Sniper",
    blurb: "Very long range and huge damage, but slow to reload. Shots pierce.",
    stars: 4,
    maxHp: 90,
    speed: 105,
    attack: "rifle",
    attackCooldown: 1.0,
    damage: 255,
    range: 900,
    arc: 0,
    aoe: 0,
    shotSpeed: 720,
    pierce: 3,
    skill: { kind: "burst", name: "WHITE DEATH", cooldown: 6, damage: 255, radius: 0 },
  },
  killua: {
    name: "Killua",
    role: "Lightning assassin",
    blurb: "Moves three times faster than anyone. Strikes call down lightning that hits an area.",
    stars: 4,
    maxHp: 100,
    speed: 320,
    attack: "lightning",
    attackCooldown: 0.5,
    damage: 22,
    range: 40,
    arc: 0,
    aoe: 26,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "storm", name: "THUNDERBOLT", cooldown: 5, damage: 50, radius: 95 },
  },
  howl: {
    name: "Howl",
    role: "Wizard",
    blurb: "Long-range magic orbs that explode in a wide blast.",
    stars: 3,
    maxHp: 100,
    speed: 105,
    attack: "magic",
    attackCooldown: 0.8,
    damage: 28,
    range: 260,
    arc: 0,
    aoe: 42,
    shotSpeed: 240,
    pierce: 0,
    skill: { kind: "fireball", name: "CALCIFER", cooldown: 6, damage: 70, radius: 90 },
  },
  ricardo: {
    name: "Ricardo Martinez",
    role: "Boxer",
    blurb: "His jab has no cooldown, but his reach is very short.",
    stars: 1,
    maxHp: 170,
    speed: 115,
    attack: "punch",
    attackCooldown: 0.55,
    damage: 45,
    range: 16,
    arc: 1.2,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // A jab is limited only by how fast fists move, not by a cooldown.
    skill: { kind: "jab", name: "JAB", cooldown: 0.12, damage: 11, radius: 16 },
  },
  saitama: {
    name: "Saitama",
    role: "Hero for fun",
    blurb: "A hundred times the HP of anyone else. ONE PUNCH ends any fight.",
    stars: 5,
    maxHp: 10000,
    speed: 105,
    attack: "punch",
    attackCooldown: 0.5,
    damage: 30,
    range: 20,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "onepunch", name: "ONE PUNCH", cooldown: 5, damage: Infinity, radius: 42 },
  },
  healer: {
    name: "Healer",
    role: "Support",
    blurb: "Holy bolts from afar. HEAL restores 50% HP to every ally nearby.",
    stars: 2,
    maxHp: 110,
    speed: 105,
    attack: "magic",
    attackCooldown: 0.6,
    damage: 18,
    range: 220,
    arc: 0,
    aoe: 0,
    shotSpeed: 260,
    pierce: 0,
    shot: "holy",
    skill: { kind: "heal", name: "HEAL", cooldown: 9, damage: 0.5, radius: 170 },
  },
  deku: {
    name: "Deku",
    role: "Brawler",
    blurb: "Runs 1.5x faster. 100% SMASH blasts a wide line straight ahead.",
    stars: 3,
    maxHp: 130,
    speed: 160,
    attack: "punch",
    attackCooldown: 0.4,
    damage: 32,
    range: 20,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "line", name: "100% SMASH", cooldown: 6, damage: 160, radius: 220, width: 48 },
  },
  okita: {
    name: "Okita Souji",
    role: "Swordswoman",
    blurb: "Lightning-fast sword. DIMENSION SLASH cuts everything around her again and again.",
    stars: 3,
    maxHp: 110,
    speed: 125,
    attack: "sword",
    attackCooldown: 0.3,
    damage: 26,
    range: 36,
    arc: 2.0,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "slashes", name: "DIMENSION SLASH", cooldown: 6, damage: 24, radius: 95, duration: 0.8 },
  },
  gojo: {
    name: "Gojo",
    role: "Sorcerer",
    blurb: "Fights up close. DOMAIN EXPANSION hits every enemy on the whole map.",
    stars: 4,
    maxHp: 140,
    speed: 115,
    attack: "punch",
    attackCooldown: 0.4,
    damage: 34,
    range: 22,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "domain", name: "DOMAIN EXPANSION", cooldown: 18, damage: 200, radius: 9999, duration: 1.6 },
  },
  starplatinum: {
    name: "Star Platinum",
    role: "Stand",
    blurb: "Punches incredibly fast. TIME STOP freezes the whole map for 4s; only he can move.",
    stars: 5,
    maxHp: 150,
    speed: 110,
    attack: "punch",
    attackCooldown: 0.07,
    damage: 9,
    range: 22,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "timestop", name: "TIME STOP", cooldown: 20, damage: 0, radius: 0, duration: 4 },
  },
  rudeus: {
    name: "Rudeus Greyrat",
    role: "Mage",
    blurb: "Casts magic bolts. HURRICANE summons a huge storm cloud that rains lightning on an area.",
    stars: 3,
    maxHp: 100,
    speed: 105,
    attack: "magic",
    attackCooldown: 0.6,
    damage: 26,
    range: 240,
    arc: 0,
    aoe: 0,
    shotSpeed: 280,
    pierce: 0,
    shot: "stone",
    skill: { kind: "hurricane", name: "HURRICANE", cooldown: 12, damage: 26, radius: 140, duration: 3.5 },
  },
  loki: {
    name: "Loki",
    role: "Trickster god",
    blurb: "Magic shots. ILLUSION raises Asgard for 10s (enemies inside lose 7% HP/s). CLONE makes a copy that fights.",
    stars: 5,
    maxHp: 120,
    speed: 110,
    attack: "magic",
    attackCooldown: 0.6,
    damage: 24,
    range: 230,
    arc: 0,
    aoe: 0,
    shotSpeed: 260,
    pierce: 0,
    shot: "loki",
    skill: { kind: "asgard", name: "ILLUSION", cooldown: 22, damage: 0.07, radius: 230, duration: 10 },
    skill2: { kind: "clone", name: "CLONE", cooldown: 12, damage: 0.25, radius: 0, duration: 20 },
  },
};

export const HERO_IDS = Object.keys(HEROES) as HeroId[];

export function heroOf(id: string): HeroDef {
  return HEROES[id as HeroId] ?? HEROES.superman;
}

export const RESPAWN_TIME = 5;

// Emberfall rule twist: lava creeps in from the edges during a wave.
export const LAVA_START_RADIUS = 520;
export const LAVA_MIN_RADIUS = 110;
export const LAVA_SHRINK_PER_SEC = 9;
export const LAVA_DPS = 25;

export const WAVE_COUNT = 5; // last wave is the boss
export const INTERMISSION_TIME = 6;

export type EnemyKind = "cinderling" | "brute" | "caster" | "warden" | "godzilla";

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
  godzilla: { hp: 3500, speed: 24, radius: 22, touchDamage: 35, score: 2000, shootEvery: 3 },
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
  skill: boolean;
  skill2?: boolean;
  /** Where the client has moved its own hero. The server follows it, within the hero's speed. */
  x?: number;
  y?: number;
  /** The player's `warp` count the client has seen; positions sent before a teleport are ignored. */
  warp?: number;
  /** The sender's clock (ms) when it was at x, y; other players use it to replay the path evenly. */
  t?: number;
}

export const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  aim: 0,
  shoot: false,
  dash: false,
  skill: false,
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

// Stages
export type StageId = "lava" | "boss" | "pvp";

export interface StageDef {
  name: string;
  blurb: string;
}

export const STAGES: Record<StageId, StageDef> = {
  lava: { name: "Lava Stage", blurb: "Survive 4 waves while lava creeps in, then slay the Pyre Warden." },
  boss: { name: "Boss Room", blurb: "No waves. Fight Godzilla straight away. Dodge the atomic beam!" },
  pvp: { name: "PvP Arena", blurb: "Players fight each other. First to 3 kills wins. Online only." },
};

export const STAGE_IDS = Object.keys(STAGES) as StageId[];

export function stageOf(id: string): StageId {
  return id in STAGES ? (id as StageId) : "lava";
}

// Godzilla's atomic beam: a warning line, then a long beam that slowly turns toward its target.
export const BEAM_EVERY = 6; // seconds between beams
export const BEAM_CHARGE = 1.1; // warning time before it fires
export const BEAM_FIRE = 1.6; // how long the beam lasts
export const BEAM_LENGTH = 520;
export const BEAM_WIDTH = 16;
export const BEAM_TURN_SPEED = 0.45; // radians per second while firing
export const BEAM_DAMAGE = 20; // per hit; players get a short invulnerability after each hit
export const BOSS_INTRO_TIME = 4;

// PvP Arena
export const PVP_KILLS_TO_WIN = 3;
export const PVP_DAMAGE_SCALE = 0.6; // player-vs-player hits are softened so fights last a few seconds
export const PVP_COUNTDOWN = 3;
