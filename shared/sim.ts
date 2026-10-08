// The Emberfall game simulation. It has no networking code, so the same rules run
// on the multiplayer server (with Colyseus schema objects) and in the browser for
// solo play (with plain objects).

import {
  movesInStoppedTime,
  CHARGE_FULL,
  chargePower,
  chargeTimeOf,
  comboChargeMul,
  isChargeSkill,
  fxBuffs,
  type FxStep,
  type FxHit,
  type FxAt,
  chargeReach,
  BOT_LEVELS,
  DEFAULT_BOT_LEVEL,
  selectStage,
  CENTER_X,
  CENTER_Y,
  DASH_COOLDOWN,
  DASH_SPEED,
  DASH_TIME,
  EMPTY_INPUT,
  ENEMIES,
  ENEMY_SHOT_DAMAGE,
  ENEMY_SHOT_SPEED,
  EnemyKind,
  HEROES,
  HERO_IDS,
  HeroDef,
  SkillDef,
  INTERMISSION_TIME,
  LAVA_DPS,
  LAVA_MIN_RADIUS,
  LAVA_SHRINK_PER_SEC,
  LAVA_START_RADIUS,
  BEAM_CHARGE,
  BEAM_DAMAGE,
  BEAM_EVERY,
  BEAM_FIRE,
  BEAM_LENGTH,
  BEAM_TURN_SPEED,
  BEAM_WIDTH,
  BOSS_INTRO_TIME,
  PVP_COUNTDOWN,
  PVP_DAMAGE_SCALE,
  PVP_KILLS_TO_WIN,
  StageId,
  PLAYER_RADIUS,
  BIG_SCALE,
  BIG_SLOW,
  PlayerInput,
  RESPAWN_TIME,
  WAVE_COUNT,
  wavesOf,
  KONG_CHARGE_EVERY,
  KONG_CHARGE_WINDUP,
  KONG_CHARGE_TIME,
  KONG_CHARGE_SPEED,
  KONG_CHARGE_WIDTH,
  KNOCKBACK_DECAY,
  SWORD_GOD,
  ANCIENT_KNIGHT,
  CTHULHU,
  beamReach,
  KNOCKBACK_DISTANCE,
  WORLD_H,
  WORLD_W,
  heroOf,
  heroSpeed,
  BURN_SLOW,
  formFromAim,
  MOVE_SCALE,
  SHOT_SPEED_SCALE,
  HERO_SHOT_SCALE,
  DAMAGE_BALANCE,
  HeroId,
  hitsRock,
  inLava,
  inputDirection,
  moveCircle,
  ringStage,
  areaOf,
  CLASSIC_LIVES,
  HERO_HIT_SCALE,
  HERO_DAMAGE_SCALE,
  CLASSIC_RESPAWN,
  DRAFT_BANS,
  DRAFT_BAN_TIME,
  DRAFT_PICK_TIME,
  draftOrder,
  SPAWN_SHIELD,
  FINAL_STAND_BOOST,
  ASSIST_WINDOW,
  CLASSIC_TEAM_SIZE,
  aimPickScore,
} from "./game";
import { ABYSS, DUNGEON, GLITCH, HEAVEN, OPEN_WORLD, PORTAL_COUNTDOWN, PORTAL_RADIUS } from "./world";
import { ROYALE_MAP, ROYALE_PLAYERS, ROYALE_SIGHT, ROYALE_BURN, ROYALE_HEAL, ROYALE_HEAL_RADIUS, royaleRadius } from "./royale";
import { BLOCK, CLASSIC_MAPS, ClassicMap, MAP_X, MAP_Y, Team, bushPatches, classicMap, distanceField, seesInto, mapLineClear, stepAlong } from "./maps";

export const TICK_MS = 1000 / 30;
const HURT_IFRAMES = 0.5;
const WAVE_CLEAR_HEAL = 0.3;
const SNIPER_BURST = 3;
const SNIPER_BURST_GAP = 0.15;
const OKITA_SLASHES = 8;
/** PvP / Bot Duel: the pause after a knockout before the next round starts. */
const ROUND_RESET_PAUSE = 2;
/** SEVENTH FORM: the lane strikes again every this many seconds, for this share of the dash's damage. */
const SEVENTH_TICK = 0.5;
const SEVENTH_TICK_SHARE = 0.2;
/** PvE Squad: the bot gets (players ^ this) shares of HP, since a team also splits its attention. */
const PVE_BOT_HP_EXP = 1.6;
/** MOVING CASTLE walking speed (pixels/s). */
const CASTLE_SPEED = 95;
/** FROST SIGIL: how far ahead it is drawn, and how long it waits on the ground. */
const FROST_SIGIL_REACH = 110;
const FROST_SIGIL_LIFE = 10;
/** ODM GEAR: how fast the wire reels the Giant Shifter in (pixels/s). */
const GRAPPLE_SPEED = 620;
/** GIANT PALM: seconds the palm takes to come down. */
const PALM_FALL = 0.7;
/** STICKY BOMB: how far around the bomb the blast reaches. */
const STICKY_BLAST = 40;
/** MOTORCYCLE: how long a rammed target is stunned, how far it flies, and how soon the same target can be rammed again. */
const BIKE_STUN = 1;
const BIKE_KNOCK = 2.5;
const BIKE_REHIT = 0.8;
/** Speed Raptor: how often running into the same foe hurts it again. */
const RAM_REHIT = 0.5;
/** EXCALIBUR: how fast the light swords circle (radians/s), how close they cut, and how often each target can be cut. */
export const ORBIT_SPEED = 5;
const ORBIT_REACH = 12;
const ORBIT_REHIT = 0.4;
/** STAR SHOT: speed and spacing of the volley. */
const STAR_SPEED = 520;
const STAR_GAP = 0.06;
/** RUBBER PUNCH: how fast the fist flies out and snaps back. */
const FIST_SPEED = 1600; // fast stretch (user request 2026-10-05)
const FIST_REACH = 230;
const FIST_RETURN = 900;
const ONE_PUNCH_DAMAGE = 1e9; // "infinity", but still a number the network can send
const MAX_CLONES = 2;
export const TITAN_ATTACK_COOLDOWN = 0.6;
const SHOT_HIT_SLACK = 3;
const BULLET_CUT_SLACK = 8; // shots are small and fast, so melee reaches them a little further out
const ENEMY = "#enemy"; // attacker id for damage dealt by monsters
const CLONE_SIGHT = 300;
const GATLING_GAP = 0.1; // seconds between GATLING PUNCH hits
const BARRAGE_GAP = 0.12;
/** KANABO CYCLONE: seconds between spins. */
const CYCLONE_GAP = 0.35;
/** BLOOD RAGE: damage taken while raging, times normal. */
const RAGE_TAKEN = 1.15;
/** ANVIL / METEOR / confetti: seconds until they land. */
const ANVIL_FALL = 0.7;
const METEOR_FALL = 0.9;
const CONFETTI_FUSE = 0.6;
/** JACK-IN-THE-BOX: seconds a box waits for a victim. */
const JACKBOX_LIFE = 20; // seconds between ROCK BARRAGE punches
const PORTAL_REACH = 14; // how close to a portal's centre you must walk to go through
const PORTAL_WAIT = 10; // seconds a lone portal waits for its partner
const MISSILE_SPEED = 210;
const MISSILE_TURN = 5; // radians per second a homing missile can turn
const MISSILE_LAUNCH = 0.25; // seconds missiles fly straight out before homing in
const REWIND_EVERY = 0.1; // seconds between TIME MACHINE snapshots
const LATCH_CONE = 0.7; // BLOOD LATCH finds targets within this angle of the aim (radians, each side)
const LATCH_TICK = 0.25; // seconds between bites
const SQUAD_SPACING = 12; // helpers keep this far apart
const MAX_BLOCKS = 6; // the Block Crafter's blocks on the map at once (the oldest goes)
const TNT_RADIUS = 60;
const TNT_KNOCK = 3.5; // times a normal knockback
const TRUCK_RADIUS = 60;
/** How tall a hero's hitbox is above its feet (world pixels; heroes are drawn about 33 tall). */
const BODY_HEIGHT = 24;
const EYEBEAM_TICK = 0.1; // seconds between HEAT VISION hits
const DOMAIN_RADIUS = 110; // DOMAIN EXPANSION: how big the closed-off duel circle is
const PIANO_GAP = 0.12; // seconds between PIANO notes
const PIANO_NOTE_SPEED = 260;
/** A new room number for a dungeon run or a duel (letters and digits nobody types by hand). */
export function newRoomCode(): string {
  return `R${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
/** Tutorial: where the training dummies stand (right of the hero). */
export const TUTORIAL_DUMMIES = [
  { x: CENTER_X + 40, y: CENTER_Y - 60 },
  { x: CENTER_X + 70, y: CENTER_Y },
  { x: CENTER_X + 40, y: CENTER_Y + 60 },
];
const DUNGEON_AGGRO = 230; // how close a hero must come before a dungeon monster notices
const MAX_LAG_COMP = 0.25; // seconds: the most an online hit is judged in the past
const KUNAI_SPEED = 1100; // MARKED KUNAI throw speed (before the shot slow-down)
const KUNAI_WINDOW = 6; // seconds to warp to the MARKED KUNAI before the cooldown starts
const BLOOD_WINDOW = 8; // seconds the BLOOD TRAP blood waits to be called back
const BLOOD_LAY_TIME = 4; // seconds she keeps laying blood after the first press
const IGNITE_DELAY = 0.7; // the red shot's burn goes off this long after the hit
/** Heroes whose skills look back in time (REWIND): their recent path is kept. */
const REWINDERS = new Set(
  Object.entries(HEROES)
    .filter(([, h]) => [h.skill, h.skill2].some((sk) => sk?.steps?.some((st) => st.do === "rewind")))
    .map(([id]) => id),
);

export interface SimPlayer {
  name: string;
  hero: string;
  x: number;
  y: number;
  aim: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  dashing: boolean;
  dashCooldown: number;
  skillCooldown: number;
  skill2Cooldown: number;
  respawnIn: number;
  score: number;
  color: number;
  /** Goes up by one on every basic attack, so clients can play the swing effect. */
  attackSeq: number;
  /** Goes up by one every time the skill is used. */
  skillSeq: number;
  skill2Seq: number;
  /** For a summoned copy (Loki's clone): the id of the player who made it. Empty for real players. */
  owner: string;
  /** Seconds left in Titan form (0 = human). */
  titan: number;
  /** Goes up whenever the server teleports the player (spawn), so the client snaps instead of sliding. */
  warp: number;
  /** The owner's clock (ms) when they were at x, y, for smooth playback on other screens. */
  mt: number;
  /** A melee knockback push (pixels/s); `kbSeq` goes up with each one so the player's own device applies it. */
  kbx: number;
  kby: number;
  kbSeq: number;
  /** Seconds left stunned (a rival's jab): no moving, attacking or skills. */
  stun: number;
  /** Seconds left enlarged by BIG LIGHT: bigger hitbox, half speed. */
  big: number;
  /** Seconds left burned by the Blaze Alien's flamethrower: slower. */
  slow: number;
  /** SHADOW WHIP: legs tied, cannot walk (seconds left). */
  root: number;
  /** 1 while a hero with a gun mode (SWAP MODE) has the gun out. */
  mode: number;
  /** Classic 3v3: 1 = Red, 2 = Blue (0 elsewhere). */
  team: number;
  /** Classic 3v3: lives left; at 0 the hero stays down until the match ends. */
  lives: number;
  /** Classic 3v3: joined after the match began; picks a hero, then takes a bot's place. */
  late: boolean;
  /** Open World: the player's record as JSON (games, wins, recent results). */
  stats: string;
  /** Seconds left in which falling brings the hero straight back up (REVIVE). */
  revive: number;
  /** Seconds left behind a barrier that blocks all damage (IMMORTAL). */
  barrier: number;
  /** Seconds left clinging to a target (BLOOD LATCH); the server moves the hero meanwhile. */
  latch: number;
  /** Seconds left of HEAT VISION: the eye laser fires along the hero's aim. */
  beam: number;
  /** PvP player select: this player has locked in their hero. */
  ready: boolean;
  /** Seconds left of a timed power-up (the Block Crafter's DIAMOND SWORD). */
  buff: number;
  /** Damage multiplier (the Block Crafter's craft table makes it 2). */
  power: number;
  /** Seconds left of a lasting second skill (VANISH, BAT FORM, MOTORCYCLE, EXCALIBUR). */
  active2: number;
  /** How hard the current slow is (0 = the usual burn slow). */
  slowPct: number;
  /** Seconds left unable to use skills (ANTI-MAGIC CUT). */
  silence: number;
  /** Seconds left taunted (ROOT SNARE): runs at `link` and attacks it. */
  taunt: number;
  /** Seconds left gone from the map (eaten, possessing...): nothing can see or hit the hero. */
  vanish: number;
  /** Seconds left inside a DOMAIN EXPANSION (off the map, with `link`). */
  domain: number;
  /** Who the hero is tied to right now (taunt, eaten by, possessing, domain rival). */
  link: string;
  /** The hero this one looks like to rivals (the Trickster's disguise). */
  disguise: string;
  /** Classic 3v3: seconds left of the spawn shield (no damage taken). */
  shield: number;
  /** Classic 3v3 FINAL STAND: the last hero of a team, on the last life (+50% damage and HP). */
  stand: boolean;
  /** This match so far (for the scores at the end): KOs, assists, falls, damage dealt and taken. */
  kos: number;
  assists: number;
  falls: number;
  dealt: number;
  taken: number;
  /** The title the player wears, and their mastery level with this hero (shown in the Open World). */
  title: string;
  mastery: number;
}

export interface SimEnemy {
  kind: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
  /** Godzilla's beam: 0 = idle, 1 = charging (warning line), 2 = firing. */
  beamState: number;
  beamAngle: number;
  /** The Sword God's current move (index into SWORD_GOD_MOVES; 0 = none). */
  move: number;
  /** Seconds left stunned (Champ Rico's jab): a stunned enemy cannot move or attack. */
  stun: number;
  /** Seconds left enlarged by BIG LIGHT: bigger hitbox, half speed. */
  big: number;
  /** Seconds left burned by the Blaze Alien's flamethrower: slower. */
  slow: number;
  /** SHADOW WHIP: legs tied, cannot walk (seconds left). */
  root: number;
}

export type BulletKind =
  | "snipe" | "wave" | "godslash" | "magic" | "fireball" | "enemy" | "banana" | "boulder" | "holy" | "stone" | "loki" | "glitch" | "bullet" | "slash"
  | "laser" | "missile" | "air" | "dragonfire" | "knife" | "fist" | "star"
  | "arrow" | "bigarrow" | "shuriken" | "leaf" | "leafstorm" | "bluebolt"
  | "ball" | "pebble" | "iceshard" | "axe" | "ember" | "firebolt"
  | `fxo:${string}` // combo shots: fxo:<shape>:<colour>:<size>
  | `card${number}`; // DRAW CARD: the number on the card (1-9)

/** A lasting area on the map: a storm cloud, an illusion kingdom, a domain. */
export interface SimZone {
  kind: string;
  x: number;
  y: number;
  radius: number;
  life: number; // seconds left
  maxLife: number;
}

export interface SimBullet {
  kind: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hostile: boolean;
}

/** The subset of Map (and Colyseus MapSchema) the simulation uses. */
export interface SimCollection<T> {
  get(id: string): T | undefined;
  set(id: string, value: T): unknown;
  delete(id: string): unknown;
  has(id: string): boolean;
  forEach(cb: (value: T, key: string) => void): void;
  readonly size: number;
}

export interface SimState<P extends SimPlayer, E extends SimEnemy, B extends SimBullet, Z extends SimZone = SimZone> {
  stage: string;
  players: SimCollection<P>;
  enemies: SimCollection<E>;
  bullets: SimCollection<B>;
  zones: SimCollection<Z>;
  /** Classic 3v3: which map (index into CLASSIC_MAPS) and each team's KOs (Red, Blue). */
  map: number;
  scoreA: number;
  scoreB: number;
  /** Seconds of stopped time left, and who stopped it (they alone can move). */
  timeStop: number;
  timeStopBy: string;
  /** Yaotsu's reality change: seconds left, and who cast it. Their enemies become ordinary humans. */
  reality: number;
  realityBy: string;
  phase: string;
  wave: number;
  phaseTimer: number;
  lavaRadius: number;
  /** PvP Arena: name of the player who won the round. */
  winner: string;
  /** PvP Arena: a message for the player select screen (a voided match). */
  notice: string;
  /** PvE Squad: the hero the bot plays, and its difficulty (index into BOT_LEVELS). */
  botHero: string;
  botLevel: number;
  /** Ranked: this room is a Ranked one (drafted heroes, rank points). */
  ranked?: boolean;
  /** Ranked draft as JSON (see Draft), and seconds left for the current step. */
  draft?: string;
  draftTimer?: number;
}

/** Ranked draft: everyone bans 3 heroes at once, then the sides take turns picking one hero each. */
export interface Draft {
  stage: "ban" | "pick";
  order: string[]; // pick order (player ids)
  turn: number; // whose pick it is (index into order)
  bans: Record<string, string[]>;
  picks: Record<string, string>;
}

export interface SimFactory<P, E, B, Z = SimZone> {
  player(): P;
  enemy(): E;
  bullet(): B;
  zone(): Z;
}

// Data that players do not need to see.
interface PlayerBrain {
  input: PlayerInput;
  /** Who hit this hero lately (root player id -> sim clock), for assists. */
  hitBy?: Map<string, number>;
  /** ALIEN TRANSFORM: HP when the transform started; turning back restores it. */
  formHp?: number;
  attackTimer: number;
  dashTimer: number;
  dashX: number;
  dashY: number;
  hurtTimer: number;
  burstLeft: number;
  burstTimer: number;
  burstAim: number; // the sniper burst keeps firing where the skill was aimed
  slashLeft: number; // Okita's dimension slash: hits still to come
  slashTimer: number;
  gatlingLeft: number; // GATLING PUNCH: hits still to come
  gatlingTimer: number;
  gatlingAim: number;
  /** BLOOD LATCH: who we cling to ("p:" + id for a player), where on them, and the next bite. */
  latchOn?: string;
  latchDx: number;
  latchDy: number;
  latchTick: number;
  /** ODM GEAR: the spot the wire bit into; the hero is reeled toward it. */
  zip?: { x: number; y: number };
  /** When each target was last hit by a lasting skill (motorcycle rams, light swords), on the sim clock. */
  hitAt?: Map<string, number>;
  /** THUNDER DASH hit: seconds left to dash a second time before the cooldown starts. */
  thunderWindow?: number;
  /** SHADOW STEP: where the shadow waits, its zone, and seconds left to flash back to it. */
  shadow?: { x: number; y: number; zone: string; left: number };
  /** ROCK BARRAGE: punches still to come, the time to the next, and the lane they go down. */
  barrageLeft?: number;
  barrageTimer?: number;
  barrageAim?: number;
  /** ERROR: seconds to the next glitch jump. */
  errorTimer?: number;
  /** DRAGOON DIVE: where he will come down. */
  diveTo?: { x: number; y: number };
  /** KANABO CYCLONE: spins still to come and the time to the next. */
  cycloneLeft?: number;
  cycloneTimer?: number;
  /** Combo skills: steps still to go off, seconds until each, and the aim they were cast with. */
  /** Set when a combo blinked behind a foe: its later steps aim at that foe. */
  fxAim?: number;
  fxQueue?: { t: number; step: FxStep; aim: number; sx: number; sy: number; power?: number }[];
  /** STONE WALL: the rocks standing and seconds until they crumble. */
  walls?: { ids: string[]; left: number };
  /** STAR SHOT: shots of the volley still to fire. */
  volleyLeft?: number;
  volleyTimer?: number;
  volleyAim?: number;
  eyebeamTick: number;
  /** Charged combo skills: how hard the cast going out hits (comboChargeMul). */
  fxPower?: number;
  /** REWIND: where he was (and how hurt) over the last few seconds. */
  trail?: { t: number; x: number; y: number; hp: number }[];
  /** DEATH'S DOOR: the Reaper walking us around. */
  possessedBy?: string;
  /** EATER: the Slime Lord holding us, and seconds before we may come out. */
  eatenBy?: string;
  eatGrace?: number;
  /** DOMAIN EXPANSION: where we stood before, and the domain we are in. */
  domainHome?: { x: number; y: number };
  domainSpot?: { x: number; y: number };
  /** SWALLOW: a foe's skill, ready to use once. */
  stolen?: SkillDef;
  /** MARKED KUNAI: the kunai zones, warps left, and seconds left to use them. */
  kunai?: { zones: string[]; warps: number; left: number; flying: { x: number; y: number; a: number; t: number }[] };
  /** BLOOD TRAP: blood drops laid down the way, and seconds left to lay more / call them back. */
  blood?: { zones: string[]; lay: number; left: number };
  /** SWIFT: the next basic attack fires three arrows in a row. */
  triple?: number;
  tripleLeft?: number;
  tripleTimer?: number;
  /** Fire & Ice Hero: which colour the next basic shot is. */
  altShot?: number;
  /** SHIELD BASH and pushing shots: hitboxes moving forward, carrying foes. */
  pushes?: { x: number; y: number; angle: number; left: number; speed: number; width: number; carried: Set<string>; dmg: number; stun: number; wallStun: number; self: boolean; zone: string; knockSlow?: number }[];
  /** PIANO: notes still to play, time to the next, and where the piano stands. */
  piano?: { left: number; timer: number; x: number; y: number; note: number };
  /** NAME WRITTEN: seconds until the bar is full. */
  note?: number;
  /** FAKE CLONE: this clone is a harmless decoy that runs around (where to, and when it turns). */
  decoy?: { angle: number; timer: number };
  /** Bot Duel: this player is driven by the simulation itself. */
  bot?: { strafe: number; strafeTimer: number; think: number; aimErr: number; level: number; hp: number; path?: Int16Array; pathTo?: number; pathTimer?: number;
    /** Classic: where it last saw a rival, where it is searching now, and when it last checked each patch of grass. */
    lastSeen?: { x: number; y: number }; search?: { x: number; y: number; patch?: number }; searchTimer?: number; checked?: Map<number, number> };
  /** The portal we just came out of: it cannot send us back until we step off it. */
  portalLock?: string;
  cloneLife: number; // seconds a clone has left
  /** Position the client says it moved to (client-side movement), and how far the server lets it go. */
  target?: { x: number; y: number; t: number };
  moveBudget: number;
  /** Seconds behind the server this player sees other heroes (from the client; 0 for bots). */
  lag?: number;
  /** Extra distance a knockback lets the client move us, and the push the server applies itself to clones. */
  kbExtra: number;
  kbx: number;
  kby: number;
}

interface EnemyBrain {
  shootTimer: number;
  burstAngle: number;
  beamTimer: number; // counts down to the next beam phase
  kbx: number; // knockback push (pixels/s), fading out
  kby: number;
  /** Sword God: players already cut by the current strike, and cuts of a flurry still to come. */
  hit?: Set<string>;
  cutsLeft?: number;
  cutTimer?: number;
  /** Ancient Knight: where his leap comes down. */
  leapTo?: { x: number; y: number };
  /** A placed block: who built it. */
  owner?: string;
  /** Dungeon: where it stands guard, whether it has noticed a hero, and its way through the corridors. */
  home?: { x: number; y: number };
  awake?: boolean;
  path?: Int16Array;
  pathTo?: number;
  pathTimer?: number;
  /** Cthulhu: his tidal wave, the sigils and poison clouds he has left, whether he has gone mad. */
  cth?: {
    wave?: { x: number; y: number; aim: number; dist: number; zone: string };
    sigils: { x: number; y: number; t: number }[];
    clouds: { x: number; y: number; t: number; tick: number }[];
    mad: boolean;
    last: number;
  };
}

/** Someone has to change rooms: the Open World's portal, the dungeon's way out, or an accepted duel. */
export interface Warp {
  ids: string[];
  stage: StageId | "home"; // "home": back to the home screen
  code: string;
}

interface ZoneBrain {
  owner: string;
  tick: number; // seconds until the next hit
  every: number;
  damage: number;
  /** Portals: the id of the portal this one leads to. */
  link?: string;
  /** MOVING CASTLE: it walks this fast (pixels/s) and hits each target once, stunning it this long. */
  vx?: number;
  vy?: number;
  stun?: number;
  hit?: Set<string>;
  /** STICKY BOMB: what the bomb is stuck to (an enemy id, or "p:" + a player id). */
  stick?: string;
  /** Lands when the zone runs out (ANVIL, METEOR, confetti, DRAGOON DIVE): hit `damage` within the radius, throw back, stun. */
  blast?: { knock: number; stun: number };
  /** METEOR: burning ground left behind (radius, seconds, damage per tick). */
  embers?: { radius: number; life: number; damage: number };
  /** DRAGOON DIVE: the owner comes down here when the zone runs out. */
  moveOwner?: boolean;
  /** Ticking ground zones (EARTHQUAKE, BLIZZARD): seconds of slow each tick puts on foes inside. */
  slow?: number;
  /** Combo fields: what each tick does to foes inside (and the share of max HP it heals friends). */
  fxHit?: FxHit & { heal?: number };
  /** Combo drops: what lands when the zone runs out. */
  fxEnd?: FxHit & { color: string };
  /** Combo fields that move with their caster. */
  follow?: boolean;
  /** SEVENTH FORM: the crackling lane (start, direction, length, width). */
  lane?: { x: number; y: number; angle: number; len: number; width: number };
  /** BIRDCAGE: the foes caught inside, who cannot walk out. */
  cage?: Set<string>;
  /** Obscuring fog: heroes inside cannot be seen (except by its owner). */
  fog?: boolean;
  /** Fire & Ice Hero: a burn that goes off once (target key). */
  ignite?: string;
}

interface BulletBrain {
  owner?: string;
  damage: number;
  pierceLeft: number;
  life: number; // seconds left
  hit: Set<string>;
  blast: number; // explosion radius when it hits or runs out (0 = no explosion)
  homing?: boolean; // missiles steer toward the nearest target
  age?: number;
  pct?: number; // DRAW CARD: takes this share of the target's max HP instead of `damage`
  /** Seconds of slow it puts on whatever it hits (Cryomancer's shards). */
  slow?: number;
  /** AXE BOOMERANG: may hit everyone again on the way back. */
  rehit?: boolean;
  /** RUBBER PUNCH: flies out until `back` seconds old (or a wall), then flies home to its owner. */
  bounce?: boolean;
  back?: number;
  /** POWER SHOT: stuns whatever it hits for this many seconds. */
  stun?: number;
  /** How hard `slow` slows (0..1), and seconds of no skills on hit. */
  slowPct?: number;
  silence?: number;
  /** Extra hit radius (big combo shots). */
  hitSize?: number;
  /** Wall bounces left (DIRECT VOLLEY). */
  bounces?: number;
  /** Bursts into these shots where it ends (COCKROACH SHOT). */
  split?: { n: number; range: number; speed: number; shape: string; size: number; color: string } & FxHit;
  /** AXE BOOMERANG: foes it caught, dragged home with it. */
  carry?: Set<string>;
  /** Fire & Ice Hero's red shot: sets the target alight (one more hit a moment later). */
  ignite?: number;
}

/** Where everyone was at one moment, for the TIME MACHINE. */
interface Snapshot {
  players: Map<string, { x: number; y: number; hp: number; dead: boolean }>;
  enemies: Map<string, { x: number; y: number; hp: number }>;
}

export class RiftSim<P extends SimPlayer, E extends SimEnemy, B extends SimBullet, Z extends SimZone = SimZone> {
  private brains = new Map<string, PlayerBrain>();
  private zoneBrains = new Map<string, ZoneBrain>();
  private enemyBrains = new Map<string, EnemyBrain>();
  /** A fighter was knocked out in the ring: reset the round on the next tick. */
  private roundOver = false;
  private clock = 0; // seconds of simulation, for per-target hit cooldowns
  /** Lag compensation: where each hero was over the last moments, and whose attack is being judged right now (with their lag). */
  private trail = new WeakMap<P, { t: number; x: number; y: number }[]>();
  private judgeLag = 0;
  private bulletBrains = new Map<string, BulletBrain>();
  private history: Snapshot[] = [];
  private historyTimer = 0;
  private nextId = 1;

  constructor(
    readonly state: SimState<P, E, B, Z>,
    private make: SimFactory<P, E, B, Z>,
    stage: StageId = "lava",
  ) {
    state.stage = stage;
    this.startIntermission(0);
    if (stage === "world" || stage === "dungeon" || stage === "abyss" || stage === "heaven" || stage === "glitch") {
      state.phase = "fight";
      state.lavaRadius = 5000;
      if (stage === "dungeon") this.fillDungeon();
      if (stage === "abyss") {
        this.spawnEnemyAt("cthulhu", ABYSS.boss.x, ABYSS.boss.y);
        state.notice = "Cthulhu sleeps on his dais...";
      }
      if (stage === "heaven") {
        this.spawnEnemyAt("godknight", HEAVEN.boss.x, HEAVEN.boss.y);
        state.notice = "The God Knight stands watch...";
      }
      if (stage === "glitch") state.notice = "The Glitch has not shown itself... yet.";
    }
    if (stage === "tutorial") {
      state.phase = "fight";
      state.lavaRadius = 5000;
      for (const d of TUTORIAL_DUMMIES) this.spawnEnemyAt("dummy", d.x, d.y);
    }
  }

  /** Tutorial: knocked-down dummies stand back up; the last step sends a few weak monsters. */
  private updateTutorial(dt: number) {
    let dummies = 0;
    this.state.enemies.forEach((e) => {
      if (e.kind === "dummy") dummies++;
    });
    if (dummies < TUTORIAL_DUMMIES.length) {
      this.dummyTimer += dt;
      if (this.dummyTimer >= 1.5) {
        this.dummyTimer = 0;
        for (const d of TUTORIAL_DUMMIES) {
          let taken = false;
          this.state.enemies.forEach((e) => {
            if (e.kind === "dummy" && Math.hypot(e.x - d.x, e.y - d.y) < 20) taken = true;
          });
          if (!taken) this.spawnEnemyAt("dummy", d.x, d.y);
        }
      }
    }
  }
  private dummyTimer = 0;

  /** Tutorial's last step: monsters that fight back (weak ones). */
  tutorialFight(count = 3) {
    if (this.state.stage !== "tutorial") return;
    for (let i = 0; i < count; i++) this.spawnEnemy("cinderling");
  }

  /** Room changes waiting to be sent out (the server tells each player's device where to go). */
  readonly warps: Warp[] = [];

  /** Open World: when everyone at the portal is ready, a short countdown, then they all warp to a new dungeon. */
  private updateWorld(dt: number) {
    const s = this.state;
    const at: string[] = [];
    s.players.forEach((p, id) => {
      if (p.owner || p.dead) return;
      if (Math.hypot(p.x - OPEN_WORLD.portal.x, p.y - OPEN_WORLD.portal.y) <= PORTAL_RADIUS + 12) at.push(id);
      else p.ready = false; // walked away from the portal
    });
    const ready = at.filter((id) => s.players.get(id)!.ready);
    if (at.length && ready.length === at.length) {
      if (s.phaseTimer <= 0) s.phaseTimer = PORTAL_COUNTDOWN;
      s.phaseTimer -= dt;
      s.notice = `PORTAL OPENS IN ${Math.max(1, Math.ceil(s.phaseTimer))}`;
      if (s.phaseTimer <= 0) {
        this.warps.push({ ids: at, stage: "dungeon", code: newRoomCode() });
        for (const id of at) s.players.get(id)!.ready = false;
        s.notice = "";
      }
    } else {
      s.phaseTimer = 0;
      s.notice = "";
    }
  }

  /** Dungeon: the Ancient Knight waits in his sanctuary with a stone minion on either side. */
  private fillDungeon() {
    for (const room of DUNGEON.rooms) {
      room.monsters.forEach((kind, i) => {
        const a = (i / room.monsters.length) * Math.PI * 2;
        const cx = ((room.c0 + room.c1 + 1) / 2) * BLOCK;
        const cy = ((room.r0 + room.r1 + 1) / 2) * BLOCK;
        const rx = ((room.c1 - room.c0) / 2 - 1.5) * BLOCK;
        const ry = ((room.r1 - room.r0) / 2 - 1.5) * BLOCK;
        this.spawnEnemyAt(kind as EnemyKind, cx + Math.cos(a) * rx * 0.6, cy + Math.sin(a) * ry * 0.6);
      });
    }
    for (const g of DUNGEON.guards) this.spawnEnemyAt(g.kind as EnemyKind, g.x, g.y);
    this.spawnEnemyAt("knight", DUNGEON.boss.x, DUNGEON.boss.y);
    this.state.notice = "Defeat the Ancient Knight";
  }

  private spawnEnemyAt(kind: EnemyKind, x: number, y: number) {
    this.spawnEnemy(kind);
    let last: E | undefined;
    let lastId = "";
    this.state.enemies.forEach((e, id) => {
      last = e;
      lastId = id;
    });
    if (!last) return;
    const e = last as E;
    [e.x, e.y] = [x, y];
    const brain = this.enemyBrains.get(lastId)!;
    brain.home = { x, y };
    brain.awake = false;
  }

  /** Dungeon: once the boss falls the way out opens; stepping into it takes a hero back to the Open World. */
  private updateDungeon() {
    const s = this.state;
    let boss = false;
    s.enemies.forEach((e) => {
      if (e.kind === "knight") boss = true;
    });
    if (boss) return;
    if (!this.dungeonCleared) {
      this.dungeonCleared = true;
      s.notice = "BOSS DEFEATED! The portal home is open by the stairs";
      this.addZone("exitportal", DUNGEON.exit.x, DUNGEON.exit.y, PORTAL_RADIUS, Infinity, { owner: "", every: Infinity, damage: 0 });
    }
    s.players.forEach((p, id) => {
      if (p.owner || p.dead || this.leaving.has(id)) return;
      if (Math.hypot(p.x - DUNGEON.exit.x, p.y - DUNGEON.exit.y) <= PORTAL_RADIUS) {
        this.leaving.add(id);
        this.warps.push({ ids: [id], stage: "world", code: "" });
      }
    });
  }
  private dungeonCleared = false;
  private leaving = new Set<string>();

  /** The Sunken Temple: once Cthulhu falls, he sinks back into the deep (BACK takes you home). */
  private updateAbyss() {
    const s = this.state;
    let boss = false;
    s.enemies.forEach((e) => {
      if (e.kind === "cthulhu" || e.kind === "godknight") boss = true;
    });
    if (boss) return;
    if (!this.dungeonCleared) {
      this.dungeonCleared = true;
      s.notice = s.stage === "heaven" ? "BOSS DEFEATED! The God Knight falls" : "BOSS DEFEATED! A rift home opens in the middle of the temple";
      // Cthulhu's temple: a rift opens on the dais that takes everyone home.
      if (s.stage === "abyss") this.addZone("exitportal", ABYSS.boss.x, ABYSS.boss.y, PORTAL_RADIUS, Infinity, { owner: "", every: Infinity, damage: 0 });
    }
    if (s.stage !== "abyss") return;
    s.players.forEach((p, id) => {
      if (p.owner || p.dead || this.leaving.has(id)) return;
      if (Math.hypot(p.x - ABYSS.boss.x, p.y - ABYSS.boss.y) <= PORTAL_RADIUS) {
        this.leaving.add(id);
        this.warps.push({ ids: [id], stage: "home", code: "" });
      }
    });
  }

  /** Hero-against-hero stages are fought inside the boxing ring's ropes. */
  private get ring() {
    return ringStage(this.state.stage);
  }

  /** Classic 3v3 (and Battle Royale) is fought on a map with walls, not in the ring. */
  private get classic() {
    return this.state.stage === "classic" || this.state.stage === "royale";
  }

  /** Battle Royale: everyone for themselves (each hero is its own team), one life, a closing storm ring. */
  private get royale() {
    return this.state.stage === "royale";
  }
  /** Battle Royale: seconds since the fight began (for the storm ring). */
  private royaleClock = 0;
  private royaleTick = 0;
  /** Battle Royale: the walking distance to the middle of the island, for bots fleeing the storm. */
  private royaleField?: Int16Array;

  /** Where heroes can move: the field, the ring's ropes, or the Classic map's walls and water. */
  private get area() {
    return areaOf(this.state.stage, this.state.map);
  }

  /** The playing field's size: the usual 960x720, or a bigger map (the Open World, the dungeon). */
  private get W() {
    const a = this.area;
    return typeof a === "object" ? Math.max(WORLD_W, a.ox + a.cols * BLOCK) : WORLD_W;
  }
  private get H() {
    const a = this.area;
    return typeof a === "object" ? Math.max(WORLD_H, a.oy + a.rows * BLOCK) : WORLD_H;
  }

  private move(x: number, y: number, dx: number, dy: number, r: number) {
    return moveCircle(x, y, dx, dy, r, this.area);
  }

  /** The farthest open spot up to len along aim, ignoring anything in between (a dash through walls). */
  private passThrough(x: number, y: number, aim: number, len: number): { x: number; y: number } {
    for (let d = len; d > 0; d -= 4) {
      const tx = x + Math.cos(aim) * d;
      const ty = y + Math.sin(aim) * d;
      const at = this.move(tx, ty, 0, 0, PLAYER_RADIUS);
      if (Math.hypot(at.x - tx, at.y - ty) < 0.5) return at;
    }
    return this.move(x, y, Math.cos(aim) * len, Math.sin(aim) * len, PLAYER_RADIUS);
  }

  private blocked(x: number, y: number) {
    return hitsRock(x, y, this.area);
  }

  addPlayer(id: string, name: string, hero: string): P {
    const def = heroOf(hero);
    const player = this.make.player();
    player.name = name.slice(0, 16) || "Player";
    player.hero = (HERO_IDS as string[]).includes(hero) ? hero : "superman";
    player.color = this.realPlayerCount() % 4;
    if (this.classic) player.team = this.openTeam();
    this.placeAtSpawn(player);
    player.maxHp = def.maxHp;
    player.hp = def.maxHp;
    this.state.players.set(id, player);
    this.brains.set(id, this.newBrain());
    if (this.classic && (this.state.phase === "intermission" || this.state.phase === "fight")) {
      // Joined a match already under way: wait off the field on the side with fewer people, pick a hero, then replace a bot.
      const real: Record<number, number> = { 1: 0, 2: 0 };
      this.state.players.forEach((q, qid) => {
        if (!q.owner && qid !== id && !this.brains.get(qid)?.bot) real[q.team] = (real[q.team] ?? 0) + 1;
      });
      player.team = this.royale ? this.openTeam() : real[1] <= real[2] ? 1 : 2;
      player.late = true;
      player.dead = true;
      player.lives = 0;
      player.respawnIn = 0;
    }
    return player;
  }

  /** Classic 3v3: a late joiner takes over a bot on their side (its lives and spot), or the other side's if theirs has none. */
  private joinLate(id: string) {
    const p = this.state.players.get(id);
    if (!p || !p.late || this.royale) return; // Battle Royale: wait for the next match
    let bot: string | undefined;
    for (const team of [p.team, 3 - p.team]) {
      this.state.players.forEach((q, qid) => {
        if (!bot && !q.owner && q.team === team && this.brains.get(qid)?.bot && (q.lives > 0 || !q.dead)) bot = qid;
      });
      if (bot) break;
    }
    const b = bot ? this.state.players.get(bot) : undefined;
    if (!b) return; // no bot left to replace: keep waiting
    p.team = b.team;
    p.lives = Math.max(1, b.lives);
    p.score = b.score;
    this.removePlayer(bot!);
    p.late = false;
    p.ready = false;
    p.dead = false;
    p.hp = p.maxHp;
    this.placeAtSpawn(p);
    const brain = this.brains.get(id);
    if (brain) brain.target = undefined;
    p.warp = (p.warp + 1) % 256;
  }

  /** Bot Duel: a computer-controlled hero that fights the other players. */
  addBot(hero: string, id = "bot", level = DEFAULT_BOT_LEVEL, hpMul = 1): P {
    const def = heroOf(hero);
    const p = this.addPlayer(id, "BOT", hero);
    p.name = `BOT ${def.name}`;
    const hp = BOT_LEVELS[level].hp * hpMul;
    this.brains.get(id)!.bot = { strafe: 1, strafeTimer: 0, think: 0, aimErr: 0, level, hp };
    p.maxHp = p.hp = Math.round(def.maxHp * hp);
    return p;
  }

  /** A hero's max HP for this player (the PvE bot gets more, by difficulty and team size). */
  private maxHpOf(id: string, hero: string): number {
    return Math.round(heroOf(hero).maxHp * (this.brains.get(id)?.bot?.hp ?? 1));
  }

  /** Classic 3v3: the side with fewer players (Red first). */
  private openTeam(): number {
    const n = this.teamCounts();
    if (this.royale) {
      for (let t = 1; t <= 255; t++) if (!n[t]) return t;
    }
    return n[1] <= n[2] ? 1 : 2;
  }

  /** Classic 3v3: players (not clones) on Red and Blue. */
  private teamCounts(): Record<number, number> {
    const n: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    this.state.players.forEach((p) => {
      if (!p.owner) n[p.team] = (n[p.team] ?? 0) + 1;
    });
    return n;
  }

  /** Classic 3v3 player select: switch sides while there is room on the other one. */
  setTeam(id: string, team: number) {
    const p = this.state.players.get(id);
    if (!this.classic || this.royale || !p || p.owner || this.state.phase !== "select" || (team !== 1 && team !== 2) || p.team === team) return;
    if (this.teamCounts()[team] >= CLASSIC_TEAM_SIZE) return;
    p.team = team;
    p.ready = false;
  }

  /** Classic 3v3 player select: pick the map. */
  setMap(map: number) {
    if (this.classic && !this.royale && this.state.phase === "select" && Number.isInteger(map) && map >= 0 && map < CLASSIC_MAPS.length) this.state.map = map;
  }

  /** PvE Squad player select: anyone can change the bot's hero and difficulty. */
  setBot(hero?: string, level?: number) {
    const s = this.state;
    if ((s.stage !== "pve" && s.stage !== "classic") || s.phase !== "select") return;
    if (hero !== undefined && (HERO_IDS as string[]).includes(hero)) s.botHero = hero;
    if (level !== undefined && Number.isInteger(level) && level >= 0 && level < BOT_LEVELS.length) s.botLevel = level;
  }

  private newBrain(): PlayerBrain {
    return {
      input: { ...EMPTY_INPUT },
      attackTimer: 0,
      dashTimer: 0,
      dashX: 0,
      dashY: 0,
      hurtTimer: 0,
      burstLeft: 0,
      burstTimer: 0,
      burstAim: 0,
      slashLeft: 0,
      slashTimer: 0,
      gatlingLeft: 0,
      gatlingTimer: 0,
      gatlingAim: 0,
      latchDx: 0,
      latchDy: 0,
      latchTick: 0,
      eyebeamTick: 0,
      cloneLife: 0,
      moveBudget: 0,
      kbExtra: 0,
      kbx: 0,
      kby: 0,
    };
  }

  removePlayer(id: string) {
    const s = this.state;
    const leaver = s.players.get(id);
    // PvP: if a fighter leaves mid-match, the match is void and everyone goes back to player select.
    const voids = !!leaver && !leaver.owner && ((s.stage === "pvp" && (s.phase === "intermission" || s.phase === "fight")) || (s.phase === "draft" && !this.brains.get(id)?.bot));
    s.players.delete(id);
    this.brains.delete(id);
    this.owned.delete(id);
    // A player's clones vanish with them.
    this.state.players.forEach((p, cid) => {
      if (p.owner === id) this.removePlayer(cid);
    });
    if (voids) {
      this.startSelect();
      s.notice = `MATCH VOID: ${leaver!.name} left`;
    }
  }

  // ---------------------------------------------------------------- ranked draft

  /** Heroes each signed-in player may pick (set by the server; empty = every hero). */
  private owned = new Map<string, string[]>();
  private draftState?: Draft;

  setOwned(id: string, heroes: string[]) {
    this.owned.set(id, heroes);
  }

  private publishDraft() {
    this.state.draft = this.draftState ? JSON.stringify(this.draftState) : "";
  }

  /** Every Ranked player is ready: bots fill Classic's empty seats, then the bans begin. */
  private startDraft() {
    const s = this.state;
    const sideA: string[] = [];
    const sideB: string[] = [];
    if (this.classic) {
      const n = this.teamCounts();
      let k = 0;
      for (const team of [1, 2]) {
        for (let i = n[team]; i < CLASSIC_TEAM_SIZE; i++) {
          const bot = this.addBot(HERO_IDS[Math.floor(Math.random() * HERO_IDS.length)], `bot${++k}`, s.botLevel);
          bot.team = team;
        }
      }
      s.players.forEach((p, id) => {
        if (!p.owner) (p.team === 1 ? sideA : sideB).push(id);
      });
    } else {
      s.players.forEach((p, id) => {
        if (!p.owner) (sideA.length ? sideB : sideA).push(id);
      });
    }
    this.draftState = { stage: "ban", order: draftOrder(sideA, sideB), turn: 0, bans: {}, picks: {} };
    s.phase = "draft";
    s.draftTimer = DRAFT_BAN_TIME;
    s.notice = "";
    this.publishDraft();
  }

  private draftTaken(hero: string): boolean {
    const d = this.draftState!;
    return Object.values(d.bans).some((b) => b.includes(hero)) || Object.values(d.picks).includes(hero);
  }

  /** Ban phase: up to three heroes nobody may pick. */
  draftBan(id: string, hero: string) {
    const d = this.draftState;
    if (this.state.phase !== "draft" || !d || d.stage !== "ban" || !d.order.includes(id) || this.brains.get(id)?.bot) return;
    if (!(HERO_IDS as string[]).includes(hero) || this.draftTaken(hero)) return;
    const mine = (d.bans[id] ??= []);
    if (mine.length >= DRAFT_BANS) return;
    mine.push(hero);
    // Every player has banned 3: the bots ban theirs, then on to the picks at once.
    if (d.order.every((pid) => this.brains.get(pid)?.bot || (d.bans[pid]?.length ?? 0) >= DRAFT_BANS)) this.startPicks();
    this.publishDraft();
  }

  /** Picks only start once every side has all 3 bans in (user request 2026-10-08): bots and anyone out of time get random ones. */
  private startPicks() {
    const d = this.draftState!;
    for (const pid of d.order) {
      const mine = (d.bans[pid] ??= []);
      while (mine.length < DRAFT_BANS) {
        const open = HERO_IDS.filter((h) => !this.draftTaken(h));
        if (!open.length) break;
        mine.push(open[Math.floor(Math.random() * open.length)]);
      }
    }
    this.draftState!.stage = "pick";
    this.draftState!.turn = 0;
    this.state.draftTimer = DRAFT_PICK_TIME;
  }

  /** Pick phase: the player whose turn it is locks in a hero (not banned, not taken, one they own). */
  private draftPick(id: string, hero: string) {
    const d = this.draftState;
    if (!d || d.stage !== "pick" || d.order[d.turn] !== id || !(HERO_IDS as string[]).includes(hero) || this.draftTaken(hero)) return;
    const owned = this.owned.get(id);
    if (owned?.length && !owned.includes(hero)) return;
    d.picks[id] = hero;
    this.setHero(id, hero);
    d.turn++;
    this.state.draftTimer = DRAFT_PICK_TIME;
    if (d.turn >= d.order.length) {
      this.draftState = undefined;
      this.publishDraft();
      this.beginMatch();
      return;
    }
    this.publishDraft();
  }

  /** A hero for a player outside player select (the draft): stats as for that hero (bots keep their HP share). */
  private setHero(id: string, hero: string) {
    const p = this.state.players.get(id);
    const def = HEROES[hero as keyof typeof HEROES];
    if (!p || !def) return;
    const bot = this.brains.get(id)?.bot;
    p.hero = hero;
    p.maxHp = p.hp = Math.round(def.maxHp * (bot?.hp ?? 1));
    p.mode = 0;
    if (bot) p.name = `BOT ${def.name}`;
  }

  /** Draft clock: bans end when time runs out; a pick not made in time (or a bot's) is made at random. */
  private updateDraft(dt: number) {
    const s = this.state;
    const d = this.draftState;
    if (!d) return this.startSelect();
    s.draftTimer = Math.max(0, (s.draftTimer ?? 0) - dt);
    if (d.stage === "ban") {
      if (s.draftTimer <= 0) {
        this.startPicks();
        this.publishDraft();
      }
      return;
    }
    const id = d.order[d.turn];
    const bot = !!this.brains.get(id)?.bot;
    if (s.draftTimer > 0 && !(bot && s.draftTimer < DRAFT_PICK_TIME - 1.5)) return;
    const owned = this.owned.get(id);
    const open = HERO_IDS.filter((h) => !this.draftTaken(h) && (!owned?.length || owned.includes(h)));
    const pool = open.length ? open : HERO_IDS.filter((h) => !this.draftTaken(h));
    this.draftPick(id, pool[Math.floor(Math.random() * pool.length)]);
  }

  /** PvP player select: change hero (only before locking in). */
  pickHero(id: string, hero: string) {
    if (this.state.phase === "draft") return this.draftPick(id, hero);
    const p = this.state.players.get(id);
    const def = HEROES[hero as keyof typeof HEROES];
    if (!p || p.owner || p.ready || (this.state.phase !== "select" && !p.late) || !def || !(HERO_IDS as string[]).includes(hero)) return;
    p.hero = hero;
    p.maxHp = def.maxHp;
    p.hp = def.maxHp;
    p.mode = 0;
  }

  /** PvP player select: lock in (or unlock) the current hero. */
  setReady(id: string, ready: boolean) {
    const p = this.state.players.get(id);
    if (p && !p.owner && this.state.phase === "select") p.ready = !!ready;
    else if (p && !p.owner && this.state.stage === "world") p.ready = !!ready && Math.hypot(p.x - OPEN_WORLD.portal.x, p.y - OPEN_WORLD.portal.y) <= PORTAL_RADIUS + 12;
    else if (p?.late && ready) this.joinLate(id);
  }

  /** PvP: back to player select; nobody is ready, everyone is healed and nothing is left on the floor. */
  private startSelect() {
    const s = this.state;
    s.phase = "select";
    this.draftState = undefined;
    this.publishDraft();
    s.phaseTimer = 0;
    s.winner = "";
    s.timeStop = 0;
    s.reality = 0;
    const helpers: string[] = [];
    s.players.forEach((p, pid) => {
      if (p.owner || pid === "bot" || this.brains.get(pid)?.bot) return helpers.push(pid); // bots are added when the match starts
      p.ready = false;
      p.late = false;
      p.dead = false;
      p.hp = p.maxHp;
      p.titan = p.barrier = p.revive = p.latch = p.beam = p.stun = 0;
    });
    for (const h of helpers) this.removePlayer(h);
    const shots: string[] = [];
    s.bullets.forEach((_b, bid) => shots.push(bid));
    for (const b of shots) this.removeBullet(b);
    const zones: string[] = [];
    s.zones.forEach((_z, zid) => zones.push(zid));
    for (const z of zones) this.removeZone(z);
    this.clearEnemies();
  }

  /** Remove everything from the enemy map (in the arena that is only the Block Crafter's blocks). */
  private clearEnemies() {
    const ids: string[] = [];
    this.state.enemies.forEach((_e, eid) => ids.push(eid));
    for (const eid of ids) this.state.enemies.delete(eid);
    this.enemyBrains.clear();
  }

  /**
   * PvP and Bot Duel, after a knockout: both fighters go back to their corners at full HP and fight on
   * after a short pause. Summons, shots, skill areas and blocks are cleared; the score stays.
   */
  private resetRound() {
    const s = this.state;
    this.roundOver = false;
    s.timeStop = 0;
    s.timeStopBy = "";
    s.reality = 0;
    s.realityBy = "";
    const helpers: string[] = [];
    s.players.forEach((p, id) => {
      if (p.owner) return helpers.push(id);
      if (heroOf(p.hero).formOf) this.endForm(p, this.brains.get(id));
      const b0 = this.brains.get(id);
      if (b0) {
        // Swallowed, possessed, domains, kunai, blood, the piano...: all over with the round.
        this.endStates(id, p, b0);
        [b0.stolen, b0.trail, b0.triple] = [undefined, undefined, 0];
        if (b0.stolen === undefined && heroOf(p.hero).skill2?.kind === "copyskill") p.mode = 0;
      }
      p.taunt = p.vanish = p.domain = p.silence = p.slowPct = 0;
      p.link = "";
      p.dead = false;
      p.respawnIn = 0;
      p.hp = p.maxHp;
      p.titan = p.barrier = p.revive = p.latch = p.beam = p.stun = p.big = p.buff = p.active2 = p.slow = p.root = 0;
      p.dashing = false;
      this.placeAtSpawn(p);
      const brain = this.brains.get(id);
      if (brain) {
        brain.target = undefined;
        brain.zip = undefined;
        brain.dashTimer = 0;
        brain.kbx = brain.kby = 0;
        if (brain.thunderWindow) [brain.thunderWindow, p.mode] = [0, 0];
        brain.shadow = undefined;
        brain.barrageLeft = 0;
        brain.cycloneLeft = 0;
        brain.errorTimer = 0;
        brain.diveTo = undefined;
        brain.walls = undefined;
        brain.fxQueue = undefined;
      }
      // Stacks and charged-up hits start over each round.
      const h = heroOf(p.hero);
      if (h.stacks || h.skill.kind === "empower" || h.skill.kind === "shadowstep") p.mode = 0;
      p.kbx = p.kby = 0;
    });
    for (const h of helpers) this.removePlayer(h);
    const shots: string[] = [];
    s.bullets.forEach((_b, bid) => shots.push(bid));
    for (const b of shots) this.removeBullet(b);
    const zones: string[] = [];
    s.zones.forEach((_z, zid) => zones.push(zid));
    for (const z of zones) this.removeZone(z);
    this.clearEnemies();
    s.phase = "intermission";
    s.phaseTimer = ROUND_RESET_PAUSE;
  }

  /** PvP: everyone is ready; fresh start positions and the countdown begins. */
  private beginMatch() {
    const s = this.state;
    s.players.forEach((p, id) => {
      this.endStand(p);
      p.score = 0;
      p.kos = p.assists = p.falls = p.dealt = p.taken = p.shield = 0;
      const b = this.brains.get(id);
      if (b) b.hitBy = undefined;
      p.dead = false;
      p.hp = p.maxHp;
      p.ready = false;
      p.power = 1;
      this.placeAtSpawn(p);
      const brain = this.brains.get(id);
      if (brain) brain.target = undefined;
    });
    if (this.royale) {
      // Battle Royale: bots fill the island up to eight, each on its own; one life each.
      s.scoreA = s.scoreB = 0;
      let k = 0;
      for (let n = this.realPlayerCount(); n < ROYALE_PLAYERS; n++) {
        this.addBot(HERO_IDS[Math.floor(Math.random() * HERO_IDS.length)], `bot${++k}`, s.botLevel); // its own team (addPlayer)
      }
      s.players.forEach((p) => {
        p.lives = 1;
        if (!p.owner) this.placeAtSpawn(p);
      });
      this.royaleClock = 0;
      s.lavaRadius = ROYALE_MAP.radius;
    } else if (this.classic) {
      // Classic 3v3: bots playing random heroes fill the empty slots on both sides.
      s.scoreA = s.scoreB = 0;
      s.players.forEach((p) => (p.lives = CLASSIC_LIVES));
      const n = this.teamCounts();
      let k = 0;
      for (const team of [1, 2]) {
        for (let i = n[team]; i < CLASSIC_TEAM_SIZE; i++) {
          const hero = HERO_IDS[Math.floor(Math.random() * HERO_IDS.length)];
          const bot = this.addBot(hero, `bot${++k}`, s.botLevel);
          bot.team = team;
          bot.lives = CLASSIC_LIVES;
          this.placeAtSpawn(bot);
        }
      }
    }
    if (s.stage === "pve") {
      // PvE Squad: one bot against the whole team, with a share of HP for every player.
      const bot = this.addBot(s.botHero || "superman", "bot", s.botLevel, this.realPlayerCount() ** PVE_BOT_HP_EXP);
      this.placeAtSpawn(bot);
    }
    s.notice = "";
    s.phase = "intermission";
    s.phaseTimer = PVP_COUNTDOWN;
  }

  /** Everything this attacker (or its summoner) hits for is scaled by its hero's balance and any crafted power. */
  private dmgMul(attacker: string | undefined): number {
    const p = this.state.players.get(this.rootOf(attacker));
    if (!p) return 1;
    const bot = this.brains.get(this.rootOf(attacker))?.bot;
    let rage = p.buff > 0 && heroOf(p.hero).skill.kind === "rage" ? heroOf(p.hero).skill.damage : 1; // BLOOD RAGE
    for (const b of fxBuffs(p)) rage *= b.dmg ?? 1; // combo damage buffs
    const hero = heroOf(p.hero);
    if (p.domain > 0 && hero.skill.kind === "domainx") rage *= hero.skill.damage; // twice as deadly in his own domain
    if (p.hero === "mob" && p.maxHp > 0) rage *= 1 + 4 * Math.max(0, 1 - p.hp / p.maxHp); // Psychic Kid: up to 500% when nearly down
    if (p.stand) rage *= FINAL_STAND_BOOST;
    return rage * (bot ? BOT_LEVELS[bot.level].damage : 1) * (p.power || 1) * (DAMAGE_BALANCE[(heroOf(p.hero).formOf ?? p.hero) as HeroId] ?? 1); // an alien form hits like its hero
  }

  /** How far from its centre an enemy can be hit (BIG LIGHT makes it bigger). */
  private er(e: E): number {
    return ENEMIES[e.kind as EnemyKind].radius * (e.big > 0 ? BIG_SCALE : 1);
  }

  /** How far from its centre a player can be hit. */
  private pr(v: P): number {
    return PLAYER_RADIUS * (v.big > 0 ? BIG_SCALE : 1);
  }

  /**
   * A hero is hit anywhere on its body, not just at its feet: the hitbox is a column from the feet
   * (x, y) up to head height, as wide as the hero. This is the spot on it closest to (x, y).
   */
  private bodyPoint(v: P, x: number, y: number): { x: number; y: number } {
    const at = this.seen(v);
    const top = at.y - BODY_HEIGHT * (v.big > 0 ? BIG_SCALE : 1);
    return { x: at.x, y: Math.max(top, Math.min(at.y, y)) };
  }

  /**
   * Lag compensation: where the attacker saw this hero on their screen (a moment ago), or where it
   * is now. Online, other heroes are drawn slightly in the past, so a hit lands where it was aimed.
   */
  private seen(v: P): { x: number; y: number } {
    if (this.judgeLag <= 0) return v;
    const list = this.trail.get(v);
    if (!list?.length) return v;
    const t = this.clock - this.judgeLag;
    let at: { x: number; y: number } = list[0];
    for (const s of list) {
      if (s.t > t) break;
      at = s;
    }
    // A teleport since then: judge the hero where it is now.
    return Math.hypot(at.x - v.x, at.y - v.y) > 120 ? v : at;
  }

  /** How far (x, y) is from a hero's body (0 at its middle, not just its feet). */
  private bodyDist(v: P, x: number, y: number): number {
    const at = this.bodyPoint(v, x, y);
    return Math.hypot(at.x - x, at.y - y);
  }

  /** Does a shape test (taking a spot) touch the hero anywhere from feet to head? */
  private onBody(v: P, test: (x: number, y: number) => boolean): boolean {
    const h = BODY_HEIGHT * (v.big > 0 ? BIG_SCALE : 1);
    const at = this.seen(v);
    for (let k = 0; k <= 2; k++) if (test(at.x, at.y - (h * k) / 2)) return true;
    return false;
  }

  /** BIG LIGHT: everything hostile in the flashlight's cone grows and slows down. */
  private bigLight(id: string, p: P, skill: SkillDef) {
    const half = skill.width ?? 0.6;
    const t = skill.duration ?? 5;
    const inCone = (x: number, y: number, r: number) => {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d > skill.radius + r) return false;
      let diff = Math.atan2(y - p.y, x - p.x) - p.aim;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      return Math.abs(diff) <= half || d <= r + 8;
    };
    this.state.enemies.forEach((e) => {
      if (!ENEMIES[e.kind as EnemyKind].block && inCone(e.x, e.y, this.er(e))) e.big = Math.max(e.big, t);
    });
    this.state.players.forEach((v, vid) => {
      if (!v.dead && this.isFoe(id, vid) && this.onBody(v, (bx, by) => inCone(bx, by, PLAYER_RADIUS))) v.big = Math.max(v.big, t);
    });
  }

  /** MOVING CASTLE: stride on, and hit (and stun) everything hostile it walks into, once each. */
  private walkCastle(z: Z, brain: ZoneBrain, dt: number) {
    z.x += (brain.vx ?? 0) * dt;
    z.y += (brain.vy ?? 0) * dt;
    const hit = brain.hit!;
    const stun = brain.stun ?? 1;
    this.state.enemies.forEach((e, eid) => {
      if (hit.has(eid) || Math.hypot(e.x - z.x, e.y - z.y) > z.radius + this.er(e)) return;
      hit.add(eid);
      const def = ENEMIES[e.kind as EnemyKind];
      this.damageEnemy(eid, brain.damage, brain.owner);
      if (!def.boss && this.state.enemies.has(eid)) e.stun = Math.max(e.stun, stun);
    });
    if (!this.pvpLive()) return;
    this.state.players.forEach((v, vid) => {
      if (hit.has(vid) || v.dead || !this.isFoe(brain.owner, vid) || this.bodyDist(v, z.x, z.y) > z.radius + this.pr(v)) return;
      hit.add(vid);
      this.damagePlayer(vid, brain.damage * PVP_DAMAGE_SCALE, true, brain.owner);
      if (!v.dead) v.stun = Math.max(v.stun, stun);
    });
  }

  /** FROST SIGIL: anything hostile standing on the circle is frozen solid (once per sigil). */
  private frostSigil(z: Z, brain: ZoneBrain) {
    const hit = brain.hit!;
    const freeze = brain.stun ?? 3;
    const iceAt = (x: number, y: number, r: number) => this.addZone("ice", x, y, r, freeze, { owner: brain.owner, every: Infinity, damage: 0 });
    this.state.enemies.forEach((e, eid) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (def.block || hit.has(eid) || Math.hypot(e.x - z.x, e.y - z.y) > z.radius + this.er(e) * 0.5) return;
      hit.add(eid);
      this.damageEnemy(eid, brain.damage, brain.owner);
      if (def.boss || !this.state.enemies.has(eid)) return;
      e.stun = Math.max(e.stun, freeze);
      iceAt(e.x, e.y, this.er(e));
    });
    if (!this.pvpLive()) return;
    this.state.players.forEach((v, vid) => {
      if (hit.has(vid) || v.dead || !this.isFoe(brain.owner, vid) || this.bodyDist(v, z.x, z.y) > z.radius) return;
      hit.add(vid);
      this.damagePlayer(vid, brain.damage * PVP_DAMAGE_SCALE, true, brain.owner);
      if (v.dead) return;
      v.stun = Math.max(v.stun, freeze);
      iceAt(v.x, v.y, this.pr(v));
    });
  }

  /** VANISH: an invisible hero cannot be seen or targeted (shots can still hit him by chance). */
  private hidden(p: P, by?: string): boolean {
    if (p.vanish > 0) return true; // eaten, or inside a foe
    if (p.active2 > 0 && heroOf(p.hero).skill2?.kind === "invis") return true;
    // Inside an obscuring fog, only its maker can see.
    let fogged = false;
    const me = this.rootOf(by);
    this.state.zones.forEach((z, zid) => {
      const zb = this.zoneBrains.get(zid);
      if (!fogged && zb?.fog && zb.owner !== me && Math.hypot(p.x - z.x, p.y - z.y) <= z.radius) fogged = true;
    });
    return fogged;
  }

  /** Can this target be hit by a lasting skill again yet? Marks it hit if so. */
  private canRehit(brain: PlayerBrain, key: string, every: number): boolean {
    const map = (brain.hitAt ??= new Map());
    const last = map.get(key);
    if (last !== undefined && this.clock - last < every) return false;
    map.set(key, this.clock);
    return true;
  }

  /** Stun a player and knock them back at once (the push still lands while they see stars). */
  private stunKnockPlayer(vid: string, dx: number, dy: number, stun: number, knock: number) {
    const v = this.state.players.get(vid);
    const vb = this.brains.get(vid);
    if (!v || !vb || v.dead) return;
    vb.target = undefined;
    this.knockPlayer(vid, dx, dy, knock);
    v.stun = Math.max(v.stun, stun);
  }

  /** MOTORCYCLE: ram everything hostile the bike runs into. */
  private rideBike(id: string, p: P, brain: PlayerBrain, skill: SkillDef) {
    this.state.enemies.forEach((e, eid) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (def.block || Math.hypot(e.x - p.x, e.y - p.y) > skill.radius + this.er(e) || !this.canRehit(brain, eid, BIKE_REHIT)) return;
      this.damageEnemy(eid, skill.damage, id);
      if (def.boss || !this.state.enemies.has(eid)) return;
      this.knockEnemy(eid, e.x - p.x, e.y - p.y, BIKE_KNOCK);
      e.stun = Math.max(e.stun, BIKE_STUN);
    });
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid) || this.bodyDist(v, p.x, p.y) > skill.radius + this.pr(v) || !this.canRehit(brain, `p:${vid}`, BIKE_REHIT)) return;
      this.damagePlayer(vid, skill.damage * PVP_DAMAGE_SCALE, true, id);
      this.stunKnockPlayer(vid, v.x - p.x, v.y - p.y, BIKE_STUN, BIKE_KNOCK);
    });
  }

  /** Speed Raptor's charge: hit every foe it is touching (each one again only every RAM_REHIT seconds). */
  private ramInto(id: string, p: P, brain: PlayerBrain, damage: number) {
    const hero = heroOf(p.hero);
    const knock = hero.ramKnock ?? 1;
    // How far a spot is from the rammer's body: its feet, or the whole long body (the dragon, drawn level).
    const body = hero.ramBody;
    const away = (x: number, y: number) => {
      if (!body) return Math.hypot(x - p.x, y - p.y);
      const dx = Math.max(0, Math.abs(x - p.x) - body.len / 2);
      const dy = Math.max(0, Math.abs(y - (p.y - body.half)) - body.half);
      return Math.hypot(dx, dy);
    };
    const reach = body ? 0 : PLAYER_RADIUS;
    this.state.enemies.forEach((e, eid) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (def.block || away(e.x, e.y) > reach + this.er(e) + 4 || !this.canRehit(brain, eid, RAM_REHIT)) return;
      this.damageEnemy(eid, damage, id);
      if (!def.boss && this.state.enemies.has(eid)) this.knockEnemy(eid, e.x - p.x, e.y - p.y, knock);
    });
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid)) return;
      const at = this.bodyPoint(v, p.x, p.y - (body?.half ?? 0));
      if ((body ? away(at.x, at.y) : this.bodyDist(v, p.x, p.y)) > reach + this.pr(v) + 4 || !this.canRehit(brain, `p:${vid}`, RAM_REHIT)) return;
      this.damagePlayer(vid, damage * PVP_DAMAGE_SCALE, true, id);
      this.knockPlayer(vid, v.x - p.x, v.y - p.y, knock);
    });
  }

  /** EXCALIBUR: where light sword `i` is now (shared with the client, which draws them from `active2`). */
  static swordSpot(x: number, y: number, skill: SkillDef, active2: number, i: number) {
    const a = ((skill.duration ?? 6) - active2) * ORBIT_SPEED + (i * Math.PI * 2) / (skill.count ?? 4);
    return { x: x + Math.cos(a) * skill.radius, y: y + Math.sin(a) * skill.radius, a };
  }

  private spinSwords(id: string, p: P, brain: PlayerBrain, skill: SkillDef) {
    for (let i = 0; i < (skill.count ?? 4); i++) {
      const s = RiftSim.swordSpot(p.x, p.y, skill, p.active2, i);
      this.state.enemies.forEach((e, eid) => {
        if (ENEMIES[e.kind as EnemyKind].block || Math.hypot(e.x - s.x, e.y - s.y) > ORBIT_REACH + this.er(e) || !this.canRehit(brain, eid, ORBIT_REHIT)) return;
        this.damageEnemy(eid, skill.damage, id);
      });
      this.state.players.forEach((v, vid) => {
        if (v.dead || !this.isFoe(id, vid) || this.bodyDist(v, s.x, s.y) > ORBIT_REACH + this.pr(v) || !this.canRehit(brain, `p:${vid}`, ORBIT_REHIT)) return;
        this.damagePlayer(vid, skill.damage * PVP_DAMAGE_SCALE, true, id);
      });
    }
  }

  /** YOYO MODE: the yoyo locks on to the nearest target in reach and always connects. */
  private throwYoyo(id: string, p: P, skill: SkillDef) {
    const t = this.findTarget(id, p, skill.radius, true);
    if (!t) {
      const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius * 0.6, Math.sin(p.aim) * skill.radius * 0.6, 2);
      this.addZone("yoyo", end.x, end.y, 4, 0.18, { owner: id, every: Infinity, damage: 0 });
      return;
    }
    if (t.key.startsWith("p:")) this.damagePlayer(t.key.slice(2), skill.damage * PVP_DAMAGE_SCALE, true, id);
    else this.damageEnemy(t.key, skill.damage, id);
    this.addZone("yoyo", t.x, t.y, 4, 0.18, { owner: id, every: Infinity, damage: 0 });
  }

  /** SACRIFICE: she drives the sword into herself, and the nearest enemy loses the same share of HP. */
  /** The rival with the least HP within `radius` (SACRIFICE picks them). */
  private weakestFoe(id: string, p: P, radius: number): { key: string; x: number; y: number } | undefined {
    let best = Infinity;
    let out: { key: string; x: number; y: number } | undefined;
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid) || this.hidden(v, id) || Math.hypot(v.x - p.x, v.y - p.y) > radius) return;
      if (v.hp < best) [best, out] = [v.hp, { key: `p:${vid}`, x: v.x, y: v.y }];
    });
    return out;
  }

  private sacrifice(id: string, p: P, skill: SkillDef) {
    const share = skill.damage;
    const t = this.weakestFoe(id, p, skill.radius) ?? this.findTarget(id, p, skill.radius, true);
    this.addZone("sacrifice", p.x, p.y, 16, 0.7, { owner: id, every: Infinity, damage: 0 });
    if (t?.key.startsWith("p:")) {
      const vid = t.key.slice(2);
      const v = this.state.players.get(vid)!;
      this.addZone("sacrifice", v.x, v.y, 16, 0.7, { owner: id, every: Infinity, damage: 0 });
      const shielded = heroOf(v.hero).invincible || v.barrier > 0 || v.dashing;
      const bothFall = !shielded && v.hp <= v.maxHp * share && p.hp <= p.maxHp * share && p.revive <= 0 && v.revive <= 0;
      if (bothFall && this.ring && this.state.stage !== "pve" && !this.classic && this.state.phase === "fight") {
        // Both fall together: a draw. Nobody scores and a fresh round starts.
        for (const q of [p, v]) {
          q.hp = 0;
          q.dead = true;
          q.respawnIn = RESPAWN_TIME;
        }
        this.roundOver = true;
        return;
      }
      this.damagePlayer(vid, v.maxHp * share, true, id, true);
      this.damagePlayer(id, p.maxHp * share, true, vid, true); // falling to your own blade counts for the rival
      return;
    }
    if (t) {
      const e = this.state.enemies.get(t.key)!;
      const cut = e.maxHp * share * (ENEMIES[e.kind as EnemyKind].boss ? 0.2 : 1);
      this.damageEnemy(t.key, cut / this.dmgMul(id), id);
      this.addZone("sacrifice", t.x, t.y, 16, 0.7, { owner: id, every: Infinity, damage: 0 });
    }
    this.damagePlayer(id, p.maxHp * share, true, undefined, true);
  }

  /** GRAB SLAM: dart in, seize the nearest target in front, leap and slam it into the ground. */
  private grabSlam(id: string, p: P, skill: SkillDef, brain: PlayerBrain) {
    const t = this.findTarget(id, p, skill.radius);
    if (!t) {
      const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius * 0.5, Math.sin(p.aim) * skill.radius * 0.5, PLAYER_RADIUS);
      [p.x, p.y] = [end.x, end.y];
    } else {
      const d = Math.hypot(t.x - p.x, t.y - p.y) || 1;
      const gap = Math.max(0, d - 16);
      const end = this.move(p.x, p.y, ((t.x - p.x) / d) * gap, ((t.y - p.y) / d) * gap, PLAYER_RADIUS);
      [p.x, p.y] = [end.x, end.y];
      const stun = skill.duration ?? 2;
      if (t.key.startsWith("p:")) {
        const vid = t.key.slice(2);
        this.damagePlayer(vid, skill.damage * PVP_DAMAGE_SCALE, true, id);
        const v = this.state.players.get(vid);
        if (v && !v.dead) v.stun = Math.max(v.stun, stun);
      } else {
        const e = this.state.enemies.get(t.key);
        this.damageEnemy(t.key, skill.damage, id);
        if (e && !ENEMIES[e.kind as EnemyKind].boss && this.state.enemies.has(t.key)) e.stun = Math.max(e.stun, stun);
      }
      this.addZone("slam", t.x, t.y, 40, 0.6, { owner: id, every: Infinity, damage: 0 });
    }
    p.warp = (p.warp + 1) % 256;
    brain.target = undefined;
    brain.hurtTimer = Math.max(brain.hurtTimer, 0.4);
  }

  // ------------------------------------------------------------- combo skills

  /** Start a combo skill: its steps go into the queue (repeats spread out), and those due now go off at once. */
  private castCombo(id: string, p: P, skill: SkillDef, brain: PlayerBrain) {
    const q = (brain.fxQueue ??= []);
    brain.fxAim = undefined;
    // A charged combo hits harder the longer it was held (bots let go halfway).
    const full = chargeTimeOf(skill);
    const power = isChargeSkill(skill) ? comboChargeMul(brain.bot ? full / 2 : brain.input.charge2 ?? 0, full) : 1;
    for (const step of skill.steps ?? []) {
      const n = step.times ?? 1;
      for (let i = 0; i < n; i++) q.push({ t: (step.wait ?? 0) + i * (step.gap ?? 0.15), step, aim: p.aim, sx: p.x, sy: p.y, power });
      if (step.do === "buff") {
        if (skill === heroOf(p.hero).skill) p.buff = Math.max(p.buff, step.dur);
        else p.active2 = Math.max(p.active2, step.dur);
        brain.attackTimer = 0;
      }
    }
    this.runFxQueue(id, p, brain, 0);
    const hero = heroOf(p.hero);
    if (hero.skill2?.kind === "fakeclone" && skill === hero.skill) this.decoysCopy(id, p, skill); // the clones copy the SPIRAL SPHERE
  }

  private runFxQueue(id: string, p: P, brain: PlayerBrain, dt: number) {
    const q = brain.fxQueue!;
    const due: typeof q = [];
    for (let i = q.length - 1; i >= 0; i--) {
      q[i].t -= dt;
      if (q[i].t <= 0) due.unshift(...q.splice(i, 1));
    }
    for (const e of due) {
      if (p.dead) continue;
      const st = e.power && e.power !== 1 && "dmg" in e.step && e.step.dmg ? ({ ...e.step, dmg: e.step.dmg * e.power } as FxStep) : e.step;
      this.fxStep(id, p, brain, st, brain.fxAim ?? e.aim, e.sx, e.sy);
    }
    if (!q.length) brain.fxAim = undefined;
  }

  /** Where a drop or field goes. */
  private fxSpot(id: string, p: P, at: FxAt, aim: number): { x: number; y: number } {
    if (at === "self") return { x: p.x, y: p.y };
    if (typeof at === "object") {
      // A spot the player picked inside the circle (bots: the nearest foe in range).
      const brain = this.brains.get(id);
      let dist = at.upTo * (brain?.input.reach ?? 1);
      if (brain?.bot) {
        const t = this.findTarget(id, p, at.upTo + 60, true);
        dist = t ? Math.min(at.upTo, Math.hypot(t.x - p.x, t.y - p.y)) : at.upTo * 0.7;
      }
      const sa = Math.random() * Math.PI * 2;
      const sr = at.scatter ? Math.sqrt(Math.random()) * at.scatter : 0;
      return this.move(p.x, p.y, Math.cos(aim) * dist + Math.cos(sa) * sr, Math.sin(aim) * dist + Math.sin(sa) * sr, 4);
    }
    if (at === "target") {
      const t = this.findTarget(id, p, 320, true);
      if (t) return { x: t.x, y: t.y };
      at = 120;
    }
    return this.move(p.x, p.y, Math.cos(aim) * at, Math.sin(aim) * at, 4);
  }

  /** Hit every foe for which `inside` says yes: damage, stun, slow, root, and a push away from (or pull toward) `from`. */
  private fxArea(owner: string, inside: (x: number, y: number, r: number) => boolean, h: FxHit, from: { x: number; y: number }, dir?: number) {
    const s = this.state;
    const push = (x: number, y: number): [number, number] => (dir !== undefined ? [Math.cos(dir), Math.sin(dir)] : [x - from.x, y - from.y]);
    let hit = false;
    // WATER JET: hitting a foe resets the caster's Q.
    const charge = () => {
      const o = s.players.get(owner);
      if (h.resetSkill1 && !hit && o) o.skillCooldown = 0;
      hit = true;
    };
    s.enemies.forEach((e, eid) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (!inside(e.x, e.y, this.er(e))) return;
      if (!def.block) charge();
      if (h.dmg) this.damageEnemy(eid, h.dmg, owner, h.ignoreArmor);
      if (!s.enemies.has(eid) || def.block) return;
      if (h.slow) e.slow = Math.max(e.slow, h.slow);
      if (def.boss) return;
      if (h.stun) e.stun = Math.max(e.stun, h.stun);
      if (h.root) e.root = Math.max(e.root, h.root);
      if (h.knock) {
        const [dx, dy] = push(e.x, e.y);
        this.knockEnemy(eid, h.knock > 0 ? dx : -dx, h.knock > 0 ? dy : -dy, Math.abs(h.knock));
      }
    });
    if (!this.pvpLive()) return;
    s.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(owner, vid) || !this.onBody(v, (bx, by) => inside(bx, by, this.pr(v)))) return;
      charge();
      if (h.dmg) this.damagePlayer(vid, h.dmg * PVP_DAMAGE_SCALE, true, owner, false, h.ignoreArmor);
      if (v.dead) return;
      if (h.stun) v.stun = Math.max(v.stun, h.stun);
      if (h.slow) this.slowPlayer(v, h.slow, h.slowPct);
      if (h.root) v.root = Math.max(v.root, h.root);
      if (h.silence) v.silence = Math.max(v.silence, h.silence);
      if (h.knock) {
        const [dx, dy] = push(v.x, v.y);
        this.knockPlayer(vid, h.knock > 0 ? dx : -dx, h.knock > 0 ? dy : -dy, Math.abs(h.knock));
      }
    });
  }

  /** Slow a hero for `seconds`; `pct` is how hard (0..1 of speed taken away), the usual burn slow when left out. */
  private slowPlayer(v: P, seconds: number, pct?: number) {
    if (pct && (v.slow <= 0 || pct >= v.slowPct)) v.slowPct = pct;
    else if (!pct && v.slow <= 0) v.slowPct = 0;
    v.slow = Math.max(v.slow, seconds);
  }

  /** A hit test for a lane from (x, y) along `angle`. */
  private laneTest(x: number, y: number, angle: number, len: number, width: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return (tx: number, ty: number, r: number) => {
      const along = (tx - x) * cos + (ty - y) * sin;
      const across = Math.abs(-(tx - x) * sin + (ty - y) * cos);
      return along >= -r && along <= len + r && across <= width / 2 + r;
    };
  }

  /**
   * PURE LOVE with the Cursed Queen out: she fires the same beam too, from where she floats, at the same target
   * (the first foe in his beam, or the end of it when it hit nobody).
   */
  private queenBeam(id: string, p: P, st: FxStep & { do: "lane" }, aim: number) {
    const s = this.state;
    const inLane = this.laneTest(p.x, p.y, aim, st.len, st.width);
    const along = (x: number, y: number) => (x - p.x) * Math.cos(aim) + (y - p.y) * Math.sin(aim);
    let target = { x: p.x + Math.cos(aim) * st.len, y: p.y + Math.sin(aim) * st.len };
    let best = Infinity;
    s.enemies.forEach((e) => {
      if (ENEMIES[e.kind as EnemyKind].block || !inLane(e.x, e.y, this.er(e))) return;
      const d = along(e.x, e.y);
      if (d < best) [best, target] = [d, { x: e.x, y: e.y }];
    });
    s.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid) || !inLane(v.x, v.y, this.pr(v))) return;
      const d = along(v.x, v.y);
      if (d < best) [best, target] = [d, { x: v.x, y: v.y - BODY_HEIGHT / 2 }];
    });
    s.players.forEach((q) => {
      if (q.owner !== id || q.hero !== "rika" || q.dead) return;
      const from = { x: q.x, y: q.y - 20 }; // from her chest, not her feet
      const a = Math.atan2(target.y - from.y, target.x - from.x);
      const len = Math.max(st.len, Math.hypot(target.x - from.x, target.y - from.y) + 20);
      this.fxArea(id, this.laneTest(from.x, from.y, a, len, st.width), st, from, a);
      this.fxLaneZone(id, "pinkbeam", st.color, from.x, from.y, a, len, st.width, 0.55);
    });
  }

  private fxLaneZone(owner: string, look: string, color: string, x: number, y: number, angle: number, len: number, width: number, life = 0.45) {
    this.addZone(`fxl:${look}:${color}:${angle.toFixed(3)}:${Math.round(len)}:${Math.round(width)}`, x, y, len, life, { owner, every: Infinity, damage: 0 });
  }

  /** One step of a combo skill. */
  private fxStep(id: string, p: P, brain: PlayerBrain, st: FxStep, aim: number, sx: number, sy: number) {
    const s = this.state;
    switch (st.do) {
      case "dash": {
        const end = this.move(p.x, p.y, Math.cos(aim) * st.len, Math.sin(aim) * st.len, PLAYER_RADIUS);
        const len = Math.hypot(end.x - p.x, end.y - p.y);
        const w = st.width ?? 26;
        this.fxArea(id, this.laneTest(p.x, p.y, aim, len, w), st, { x: p.x, y: p.y }, aim);
        if (!st.quiet) this.fxLaneZone(id, "dash", st.color, p.x, p.y, aim, len, w);
        if (st.trail) {
          // Bombs dropped all along the way go off a moment later.
          const tr = st.trail;
          for (let i = 0; i < tr.n; i++) {
            const k = (i + 0.5) / tr.n;
            const zid = this.addZone(`fxd:${tr.look ?? "meteor"}:${st.color}`, p.x + Math.cos(aim) * len * k, p.y + Math.sin(aim) * len * k, tr.radius, tr.delay + i * 0.08, { owner: id, every: Infinity, damage: 0 });
            this.zoneBrains.get(zid)!.fxEnd = { dmg: tr.dmg, color: st.color };
          }
        }
        [p.x, p.y] = [end.x, end.y];
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.25);
        break;
      }
      case "blink": {
        let to: { x: number; y: number } | undefined;
        if (st.to === "behind") {
          const t = this.findTarget(id, p, st.range, true);
          if (t) {
            const d = Math.hypot(t.x - p.x, t.y - p.y) || 1;
            to = this.move(t.x, t.y, ((t.x - p.x) / d) * 18, ((t.y - p.y) / d) * 18, PLAYER_RADIUS);
            p.aim = Math.atan2(t.y - to.y, t.x - to.x);
            brain.fxAim = p.aim; // the rest of the combo turns to face the foe
          }
        } else if (st.to === "start") to = { x: sx, y: sy };
        to ??= this.move(p.x, p.y, Math.cos(aim) * st.range, Math.sin(aim) * st.range, PLAYER_RADIUS);
        this.addZone(`fx:puff:${st.color}`, p.x, p.y, 16, 0.4, { owner: id, every: Infinity, damage: 0 });
        [p.x, p.y] = [to.x, to.y];
        this.addZone(`fx:puff:${st.color}`, p.x, p.y, 16, 0.4, { owner: id, every: Infinity, damage: 0 });
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        break;
      }
      case "lane":
        this.fxArea(id, this.laneTest(p.x, p.y, aim, st.len, st.width), st, { x: p.x, y: p.y }, aim);
        this.fxLaneZone(id, st.look ?? "beam", st.color, p.x, p.y, aim, st.len, st.width, 0.55);
        if (st.knock || st.dmg) this.cutBulletsInLane(id, p.x, p.y, aim, st.len, st.width);
        if (st.look === "pinkbeam") this.queenBeam(id, p, st, aim);
        break;
      case "ring":
        if (st.look === "pull") {
          // UNIVERSAL PULL: everything in the ring is yanked right up to him.
          this.fxArea(id, (x, y, r) => Math.hypot(x - p.x, y - p.y) <= st.radius + r, { ...st, knock: 0 }, { x: p.x, y: p.y });
          this.pullAll(id, p, st.radius);
          this.addZone(`fx:pull:${st.color}`, p.x, p.y, st.radius, 0.6, { owner: id, every: Infinity, damage: 0 });
          break;
        }
        this.fxArea(id, (x, y, r) => Math.hypot(x - p.x, y - p.y) <= st.radius + r, st, { x: p.x, y: p.y });
        this.addZone(`fx:${st.look ?? "burst"}:${st.color}`, p.x, p.y, st.radius, 0.55, { owner: id, every: Infinity, damage: 0 });
        break;
      case "cone": {
        const inCone = (x: number, y: number, r: number) => {
          if (Math.hypot(x - p.x, y - p.y) > st.range + r) return false;
          let diff = Math.atan2(y - p.y, x - p.x) - aim;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          return Math.abs(diff) <= st.arc / 2;
        };
        this.fxArea(id, inCone, st, { x: p.x, y: p.y });
        if (st.reflect) this.reflectInCone(id, p, aim, st.range, st.arc);
        else this.cutBullets(id, p.x, p.y, aim, st.range, st.arc);
        this.addZone(`fxc:${st.color}:${aim.toFixed(3)}:${st.arc.toFixed(3)}${st.look ? `:${st.look}` : ""}`, p.x, p.y, st.range, 0.35, { owner: id, every: Infinity, damage: 0 });
        break;
      }
      case "shots": {
        for (let i = 0; i < st.n; i++) {
          const a = st.spread >= Math.PI * 2 - 0.01 ? aim + (i / st.n) * Math.PI * 2 : aim + (st.n > 1 ? (i / (st.n - 1) - 0.5) * st.spread : 0);
          const bid = this.spawnBullet(`fxo:${st.shape ?? "orb"}:${st.color}:${st.size ?? 3}`, p.x, p.y, a, st.speed, { owner: id, damage: st.dmg ?? 0, pierce: st.pierce ?? 0, life: st.range / st.speed });
          const b = this.bulletBrains.get(bid)!;
          if (st.stun) b.stun = st.stun;
          if (st.slow) [b.slow, b.slowPct] = [st.slow, st.slowPct];
          if (st.silence) b.silence = st.silence;
          if (st.home) [b.homing, b.age] = [true, 0];
          if (st.hitSize) b.hitSize = st.hitSize;
          if (st.bounce) b.bounces = st.bounce;
          if (st.split) b.split = st.split;
        }
        break;
      }
      case "drop": {
        // Several spots: spread across the front (SOUND SLASH's bombs); otherwise just the one.
        const n = st.spots ?? 1;
        for (let i = 0; i < n; i++) {
          const a = aim + (n > 1 ? (i / (n - 1) - 0.5) * 1.6 : 0);
          const spot = this.fxSpot(id, p, st.at, a);
          const zid = this.addZone(`fxd:${st.look ?? "meteor"}:${st.color}`, spot.x, spot.y, st.radius, st.delay, { owner: id, every: Infinity, damage: 0 });
          this.zoneBrains.get(zid)!.fxEnd = { dmg: st.dmg, stun: st.stun, slow: st.slow, root: st.root, knock: st.knock, color: st.color };
        }
        break;
      }
      case "field": {
        const spot = this.fxSpot(id, p, st.at, aim);
        const zid = this.addZone(`fxf:${st.look ?? "storm"}:${st.color}`, spot.x, spot.y, st.radius, st.life, { owner: id, every: st.tick, damage: 0 });
        const zb = this.zoneBrains.get(zid)!;
        zb.fxHit = { dmg: st.dmg, stun: st.stun, slow: st.slow, root: st.root, knock: st.knock, heal: st.heal };
        if (st.follow) zb.follow = true;
        if (st.fog) {
          zb.fog = true;
          const z = s.zones.get(zid);
          if (z) z.kind += `:${this.rootOf(id)}`; // the client hides heroes inside from everyone but its maker
        }
        if (st.cage) {
          // BIRDCAGE: every foe inside when it closes is shut in.
          zb.cage = new Set();
          s.players.forEach((v, vid) => {
            if (!v.dead && this.isFoe(id, vid) && Math.hypot(v.x - spot.x, v.y - spot.y) <= st.radius) zb.cage!.add(vid);
          });
          const z = s.zones.get(zid);
          if (z) z.kind += `:cage:${this.rootOf(id)}`; // drawn as bars; the client keeps the caught ones in too
        }
        break;
      }
      case "push":
        this.startPush(id, p, brain, { len: st.len, width: st.width, speed: st.speed, dmg: st.dmg ?? 0, stun: st.stun ?? 0, wallStun: st.wallStun, self: !!st.carrySelf, look: `fxp:fist:${st.color}` });
        break;
      case "rewind": {
        // REWIND: back to where he stood, as healthy as he was, `secs` ago.
        const then = brain.trail?.find((t) => t.t >= this.clock - st.secs);
        if (!then) break;
        this.addZone(`fx:puff:${st.color}`, p.x, p.y, 16, 0.4, { owner: id, every: Infinity, damage: 0 });
        const at = this.move(then.x, then.y, 0, 0, PLAYER_RADIUS);
        [p.x, p.y] = [at.x, at.y];
        p.hp = Math.max(p.hp, Math.min(p.maxHp, then.hp));
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        brain.trail = [];
        this.addZone(`fx:shock:${st.color}`, p.x, p.y, 24, 0.5, { owner: id, every: Infinity, damage: 0 });
        break;
      }
      case "lock": {
        const t = this.findTarget(id, p, st.range, true);
        if (!t) break;
        this.fxArea(id, (x, y) => Math.hypot(x - t.x, y - t.y) < 1, st, { x: p.x, y: p.y });
        this.fxLaneZone(id, st.look ?? "chain", st.color, p.x, p.y, Math.atan2(t.y - p.y, t.x - p.x), Math.hypot(t.x - p.x, t.y - p.y), 6, 0.5);
        if (st.drag) {
          // Dragged right up to the caster.
          const d = Math.hypot(t.x - p.x, t.y - p.y) || 1;
          const to = this.move(p.x, p.y, ((t.x - p.x) / d) * 22, ((t.y - p.y) / d) * 22, PLAYER_RADIUS);
          if (t.key.startsWith("p:")) {
            const v = s.players.get(t.key.slice(2));
            const vb = this.brains.get(t.key.slice(2));
            if (v && !v.dead) {
              [v.x, v.y] = [to.x, to.y];
              v.warp = (v.warp + 1) % 256;
              if (vb) [vb.target, vb.dashTimer] = [undefined, 0];
            }
          } else {
            const e = s.enemies.get(t.key);
            if (e && !ENEMIES[e.kind as EnemyKind].boss) [e.x, e.y] = [to.x, to.y];
          }
        }
        break;
      }
      case "buff":
        break; // set up when cast (its timer is the skill's buff / active2)
      case "heal":
        s.players.forEach((q, qid) => {
          if (q.dead) return;
          const mine = qid === id;
          if (!mine && (!st.radius || this.isFoe(id, qid) || Math.hypot(q.x - p.x, q.y - p.y) > st.radius)) return;
          this.healBy(q, q.maxHp * st.pct);
        });
        this.addZone(`fx:heal:${st.color}`, p.x, p.y, st.radius ?? 30, 0.6, { owner: id, every: Infinity, damage: 0 });
        break;
      case "shield":
        s.players.forEach((q, qid) => {
          if (q.dead) return;
          if (qid !== id && (!st.radius || this.isFoe(id, qid) || Math.hypot(q.x - p.x, q.y - p.y) > st.radius)) return;
          q.barrier = Math.max(q.barrier, st.dur);
        });
        this.addZone(`fx:shock:${st.color}`, p.x, p.y, st.radius ?? 30, 0.5, { owner: id, every: Infinity, damage: 0 });
        break;
    }
  }

  /** UNIVERSAL PULL: every foe within `radius` lands right next to him. */
  private pullAll(id: string, p: P, radius: number) {
    const s = this.state;
    const near = (x: number, y: number) => {
      const d = Math.hypot(x - p.x, y - p.y) || 1;
      return this.move(p.x, p.y, ((x - p.x) / d) * 22, ((y - p.y) / d) * 22, PLAYER_RADIUS);
    };
    s.enemies.forEach((e) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (def.block || def.boss || Math.hypot(e.x - p.x, e.y - p.y) > radius + this.er(e)) return;
      const at = near(e.x, e.y);
      [e.x, e.y] = [at.x, at.y];
    });
    if (!this.pvpLive()) return;
    s.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid) || this.bodyDist(v, p.x, p.y) > radius + this.pr(v)) return;
      const at = near(v.x, v.y);
      [v.x, v.y] = [at.x, at.y];
      v.warp = (v.warp + 1) % 256;
      const vb = this.brains.get(vid);
      if (vb) [vb.target, vb.dashTimer] = [undefined, 0];
    });
  }

  /** CROSS CUT: hostile shots inside the swing are sent back at whoever fired them. */
  private reflectInCone(id: string, p: P, aim: number, range: number, arc: number) {
    this.state.bullets.forEach((b, bid) => {
      const bb = this.bulletBrains.get(bid);
      if (!bb) return;
      const theirs = b.hostile || (bb.owner !== undefined && this.isFoe(bb.owner, id));
      if (!theirs) return;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d > range + BULLET_CUT_SLACK) return;
      let diff = Math.atan2(b.y - p.y, b.x - p.x) - aim;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) > arc / 2) return;
      const sp = Math.hypot(b.vx, b.vy);
      [b.vx, b.vy] = [Math.cos(aim) * sp, Math.sin(aim) * sp];
      b.hostile = false;
      bb.owner = id;
      bb.hit.clear();
      bb.life = Math.max(bb.life, 0.8);
      this.addZone("parry", b.x, b.y, 10, 0.3, { owner: id, every: Infinity, damage: 0 });
    });
  }

  /** Hit one target by key (a monster id, or "p:" + a player id), stunning it (bosses shrug stuns off). */
  private strike(owner: string, key: string, damage: number, stun = 0) {
    const s = this.state;
    if (key.startsWith("p:")) {
      const vid = key.slice(2);
      this.damagePlayer(vid, damage * PVP_DAMAGE_SCALE, true, owner);
      const v = s.players.get(vid);
      if (stun > 0 && v && !v.dead) v.stun = Math.max(v.stun, stun);
    } else {
      const e = s.enemies.get(key);
      if (damage > 0) this.damageEnemy(key, damage, owner);
      if (stun > 0 && e && s.enemies.has(key) && !ENEMIES[e.kind as EnemyKind].boss) e.stun = Math.max(e.stun, stun);
    }
  }

  /** How many foes (monsters and, in PvP, rivals) stand within `radius`. */
  private foesAround(owner: string, x: number, y: number, radius: number): number {
    let n = 0;
    this.state.enemies.forEach((e) => {
      if (!ENEMIES[e.kind as EnemyKind].block && Math.hypot(e.x - x, e.y - y) <= radius + this.er(e)) n++;
    });
    if (this.pvpLive()) {
      this.state.players.forEach((v, vid) => {
        if (!v.dead && this.isFoe(owner, vid) && this.bodyDist(v, x, y) <= radius + this.pr(v)) n++;
      });
    }
    return n;
  }

  /** Tie the legs of every foe within `radius` (ROOT SNARE). */
  private rootAround(owner: string, x: number, y: number, radius: number, seconds: number) {
    this.state.enemies.forEach((e) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (!def.block && !def.boss && Math.hypot(e.x - x, e.y - y) <= radius + this.er(e)) e.root = Math.max(e.root, seconds);
    });
    this.state.players.forEach((v, vid) => {
      if (!v.dead && this.isFoe(owner, vid) && this.bodyDist(v, x, y) <= radius + this.pr(v)) v.root = Math.max(v.root, seconds);
    });
  }

  /** Slow every foe within `radius` (EARTHQUAKE, BLIZZARD). */
  private slowAround(owner: string, x: number, y: number, radius: number, seconds: number) {
    this.state.enemies.forEach((e) => {
      if (!ENEMIES[e.kind as EnemyKind].block && Math.hypot(e.x - x, e.y - y) <= radius + this.er(e)) e.slow = Math.max(e.slow, seconds);
    });
    this.state.players.forEach((v, vid) => {
      if (!v.dead && this.isFoe(owner, vid) && this.bodyDist(v, x, y) <= radius + this.pr(v)) v.slow = Math.max(v.slow, seconds);
    });
  }

  /** JACK-IN-THE-BOX: the first foe to come close sets it off. */
  private jackInTheBox(zid: string, z: Z, brain: ZoneBrain) {
    if (z.life <= 0 || this.foesAround(brain.owner, z.x, z.y, z.radius) === 0) return;
    const r = z.radius + 10;
    this.sweep(brain.owner, z.x, z.y, 0, r, Math.PI * 2, brain.damage, 2);
    this.stunAround(brain.owner, z.x, z.y, r, brain.stun ?? 1);
    this.addZone("jackpop", z.x, z.y, r, 0.6, { owner: brain.owner, every: Infinity, damage: 0 });
    z.life = 0; // gone once sprung
    void zid;
  }

  /** ANVIL, METEOR, the confetti bomb, DRAGOON DIVE: it comes down now. */
  private landBlast(z: Z, brain: ZoneBrain) {
    const blast = brain.blast!;
    if (brain.moveOwner) {
      const p = this.state.players.get(brain.owner);
      if (!p || p.dead) return;
      const at = this.move(z.x, z.y, 0, 0, PLAYER_RADIUS);
      [p.x, p.y] = [at.x, at.y];
      p.warp = (p.warp + 1) % 256;
      p.active2 = 0;
      const b = this.brains.get(brain.owner);
      if (b) b.target = undefined;
    }
    this.sweep(brain.owner, z.x, z.y, 0, z.radius, Math.PI * 2, brain.damage, blast.knock || false);
    if (blast.stun > 0) this.stunAround(brain.owner, z.x, z.y, z.radius, blast.stun);
    this.addZone(z.kind === "confetti" ? "confettiboom" : z.kind === "meteor" ? "boom" : "landing", z.x, z.y, z.radius, 0.5, { owner: brain.owner, every: Infinity, damage: 0 });
    if (brain.embers) {
      const e = brain.embers;
      this.addZone("embers", z.x, z.y, e.radius, e.life, { owner: brain.owner, every: 0.5, damage: e.damage });
    }
  }

  /** ERROR and DRAGOON DIVE move him by themselves (no walking, attacks or skills). Returns true while they do. */
  private autoMove(id: string, p: P, brain: PlayerBrain, hero: HeroDef, dt: number): boolean {
    const s2 = hero.skill2;
    if (!(p.active2 > 0) || !s2) return false;
    if (s2.kind === "dive") return true;
    if (s2.kind !== "error") return false;
    brain.errorTimer = (brain.errorTimer ?? 0) - dt;
    if (brain.errorTimer > 0) return true;
    brain.errorTimer += s2.width ?? 0.3;
    // A glitch jump: half the time somewhere at random, half the time through the nearest foe.
    const t = Math.random() < 0.5 ? this.findTarget(id, p, s2.radius * 1.5, true) : undefined;
    const a = t ? Math.atan2(t.y - p.y, t.x - p.x) + (Math.random() - 0.5) * 0.5 : Math.random() * Math.PI * 2;
    const len = t ? Math.min(s2.radius, Math.hypot(t.x - p.x, t.y - p.y) + 40) : s2.radius * (0.5 + Math.random() * 0.5);
    const end = this.move(p.x, p.y, Math.cos(a) * len, Math.sin(a) * len, PLAYER_RADIUS);
    const d = Math.hypot(end.x - p.x, end.y - p.y);
    if (d > 1) this.lineHit(id, p.x, p.y, Math.atan2(end.y - p.y, end.x - p.x), d, 26, s2.damage);
    [p.x, p.y] = [end.x, end.y];
    p.warp = (p.warp + 1) % 256;
    brain.target = undefined;
    return true;
  }

  /** STICKY BOMB goes off: a small blast, and whatever it was stuck to is thrown far along the dash. */
  private stickyBlast(z: Z, brain: ZoneBrain) {
    this.sweep(brain.owner, z.x, z.y, 0, z.radius, Math.PI * 2, brain.damage, 1.5);
    const key = brain.stick;
    const scale = brain.stun ?? 5;
    if (key?.startsWith("p:")) {
      const vid = key.slice(2);
      if (this.isFoe(brain.owner, vid)) this.knockPlayer(vid, brain.vx ?? 1, brain.vy ?? 0, scale);
    } else if (key) {
      const e = this.state.enemies.get(key);
      const def = e && ENEMIES[e.kind as EnemyKind];
      if (def && !def.boss && !def.block) this.knockEnemy(key, brain.vx ?? 1, brain.vy ?? 0, scale);
    }
    this.addZone("boom", z.x, z.y, z.radius, 0.4, { owner: brain.owner, every: Infinity, damage: 0 });
  }

  /** Monsters on the map (the Block Crafter's blocks do not count). */
  private monsterCount() {
    let n = 0;
    this.state.enemies.forEach((e) => {
      if (!ENEMIES[e.kind as EnemyKind].block) n++;
    });
    return n;
  }

  /** A dirt block in the way of something of this radius at (x, y)? Walls off monsters and their shots. */
  private blockAt(x: number, y: number, radius: number): string | undefined {
    let hit: string | undefined;
    this.state.enemies.forEach((b, bid) => {
      if (!hit && b.kind === "dirtblock" && Math.hypot(b.x - x, b.y - y) < radius + ENEMIES.dirtblock.radius) hit = bid;
    });
    return hit;
  }

  /** Players actually connected (not clones). */
  realPlayerCount() {
    let n = 0;
    this.state.players.forEach((p) => {
      if (!p.owner) n++;
    });
    return n;
  }

  /** Who gets the credit for an attack: a clone's attacks count as its owner's. */
  private rootOf(id: string | undefined): string {
    if (!id) return "";
    return this.state.players.get(id)?.owner || id;
  }

  /** True if attacks from `attacker` can hurt player `victim` (PvP, and never your own side). */
  private isFoe(attacker: string | undefined, victim: string): boolean {
    if (!this.pvpLive() || !attacker) return false;
    const a = this.rootOf(attacker);
    const v = this.rootOf(victim);
    const ap = this.state.players.get(a);
    const vp = this.state.players.get(victim);
    if (vp && vp.vanish > 0) return false; // gone from the map
    if (ap && vp && (ap.domain > 0 || vp.domain > 0) && !(ap.domain > 0 && vp.domain > 0 && (ap.link === this.rootOf(victim) || vp.link === a))) return false; // a domain shuts the world out
    // PvE Squad: the players are one team; only the bot (and what it summons) is on the other side.
    if (this.state.stage === "pve") return (a === "bot") !== (v === "bot");
    if (this.classic) return (this.state.players.get(a)?.team ?? 0) !== (this.state.players.get(v)?.team ?? -1);
    return a !== v;
  }

  setInput(id: string, input: Partial<PlayerInput>) {
    const brain = this.brains.get(id);
    if (!brain) return;
    brain.input = {
      left: !!input.left,
      right: !!input.right,
      up: !!input.up,
      down: !!input.down,
      aim: Number.isFinite(input.aim) ? Number(input.aim) : 0,
      shoot: !!input.shoot,
      dash: !!input.dash,
      skill: !!input.skill,
      skill2: !!input.skill2,
      charge2: Math.min(CHARGE_FULL, Math.max(0, Number(input.charge2) || 0)),
      reach: Math.min(1, Math.max(0, Number.isFinite(input.reach) ? Number(input.reach) : 1)),
    };
    brain.lag = Math.min(MAX_LAG_COMP, Math.max(0, Number(input.lag) || 0) / 1000);
    const p = this.state.players.get(id);
    if (p && Number.isFinite(input.x) && Number.isFinite(input.y) && input.warp === p.warp) {
      brain.target = { x: Number(input.x), y: Number(input.y), t: Number(input.t) || 0 };
    }
  }

  // ---------------------------------------------------------------- loop

  update(dt: number) {
    const s = this.state;
    this.clock += dt;

    if (s.timeStop > 0) {
      // ZA WARUDO: only the one who stopped time (and their own attacks) moves.
      s.timeStop = Math.max(0, s.timeStop - dt);
      const by = s.timeStopBy;
      if (s.timeStop <= 0 || !s.players.has(by)) {
        s.timeStop = 0;
        s.timeStopBy = "";
      } else {
        // Those who can move in stopped time (the one who stopped it, and other time-stop heroes).
        const movers = new Set<string>([by]);
        s.players.forEach((p, pid) => {
          if (!p.owner && movesInStoppedTime(p.hero)) movers.add(pid);
        });
        this.updatePlayers(dt, movers);
        this.afterPlayers();
        this.updateBullets(dt, movers);
        this.updateZones(dt, movers);
        return;
      }
    }

    if (s.reality > 0) {
      s.reality = Math.max(0, s.reality - dt);
      if (s.reality <= 0 || !s.players.has(s.realityBy)) {
        s.reality = 0;
        s.realityBy = "";
      }
    }

    if (s.stage === "boss") this.updateBossRoom(dt);
    else if (s.stage === "world") this.updateWorld(dt);
    else if (s.stage === "tutorial") this.updateTutorial(dt);
    else if (s.stage === "dungeon") this.updateDungeon();
    else if (s.stage === "abyss" || s.stage === "heaven") this.updateAbyss();
    else if (this.ring) this.updatePvp(dt);
    else if (s.phase === "intermission") {
      s.phaseTimer -= dt;
      if (s.stage === "lava") s.lavaRadius = Math.min(LAVA_START_RADIUS, s.lavaRadius + LAVA_SHRINK_PER_SEC * 6 * dt);
      if (s.phaseTimer <= 0) this.startWave(s.wave + 1);
    } else if (s.phase === "fight") {
      if (s.stage === "lava") s.lavaRadius = Math.max(LAVA_MIN_RADIUS, s.lavaRadius - LAVA_SHRINK_PER_SEC * dt);
      if (this.monsterCount() === 0) {
        if (s.wave >= WAVE_COUNT) {
          s.phase = "victory";
          s.phaseTimer = 12;
        } else {
          this.startIntermission(s.wave);
          // Clearing a wave patches everyone up a little.
          s.players.forEach((p) => {
            if (!p.dead) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * WAVE_CLEAR_HEAL);
          });
        }
      }
    } else if (s.phase === "victory") {
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) this.startIntermission(0);
    }

    this.updatePlayers(dt);
    this.afterPlayers();
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateZones(dt);
    this.recordHistory(dt);
  }

  /** Keep a couple of seconds of snapshots for the TIME MACHINE (only while someone could use it). */
  private recordHistory(dt: number) {
    let needed = false;
    this.state.players.forEach((p) => {
      if (HEROES[p.hero as keyof typeof HEROES]?.skill.kind === "rewind") needed = true;
    });
    if (!needed) {
      this.history.length = 0;
      return;
    }
    this.historyTimer -= dt;
    if (this.historyTimer > 0) return;
    this.historyTimer += REWIND_EVERY;
    const snap: Snapshot = { players: new Map(), enemies: new Map() };
    this.state.players.forEach((p, id) => snap.players.set(id, { x: p.x, y: p.y, hp: p.hp, dead: p.dead }));
    this.state.enemies.forEach((e, id) => snap.enemies.set(id, { x: e.x, y: e.y, hp: e.hp }));
    this.history.push(snap);
    const keep = Math.ceil(2 / REWIND_EVERY) + 1;
    if (this.history.length > keep) this.history.splice(0, this.history.length - keep);
  }

  /** TIME MACHINE: everyone and everything still here goes back to where it was `seconds` ago. */
  private rewind(seconds: number) {
    const back = Math.round(seconds / REWIND_EVERY);
    const snap = this.history[Math.max(0, this.history.length - 1 - back)];
    if (!snap) return;
    snap.players.forEach((was, id) => {
      const p = this.state.players.get(id);
      const brain = this.brains.get(id);
      if (!p || !brain) return;
      if (p.dead && !was.dead) {
        p.dead = false;
        p.respawnIn = 0;
      }
      if (p.dead) return;
      p.hp = Math.max(1, Math.min(p.maxHp, was.hp));
      p.x = was.x;
      p.y = was.y;
      p.warp = (p.warp + 1) % 256; // their device jumps back too
      brain.target = undefined;
      brain.kbx = brain.kby = 0;
    });
    snap.enemies.forEach((was, id) => {
      const e = this.state.enemies.get(id);
      if (!e) return;
      e.x = was.x;
      e.y = was.y;
      e.hp = Math.min(e.maxHp, was.hp);
    });
    // Every shot in the air un-fires.
    const shots: string[] = [];
    this.state.bullets.forEach((_b, id) => shots.push(id));
    for (const id of shots) this.removeBullet(id);
    this.history.length = 0;
  }

  private startIntermission(wave: number) {
    const s = this.state;
    s.phase = "intermission";
    s.wave = wave;
    if (selectStage(s.stage)) {
      // PvP Arena and PvE Squad: pick heroes and get ready before each match.
      s.lavaRadius = 5000;
      this.startSelect();
      return;
    }
    if (s.stage === "boss" || this.ring) {
      // No lava and no waves in the boss room or the arena.
      s.phaseTimer = this.ring ? PVP_COUNTDOWN : BOSS_INTRO_TIME;
      s.lavaRadius = 5000;
      s.winner = "";
      return;
    }
    s.phaseTimer = INTERMISSION_TIME;
    if (s.stage !== "lava") s.lavaRadius = 5000; // the jungle has no lava
    else if (wave === 0) s.lavaRadius = LAVA_START_RADIUS;
  }

  /** PvP Arena: a countdown, then free-for-all until someone reaches the kill target. */
  private updatePvp(dt: number) {
    const s = this.state;
    if (this.roundOver) this.resetRound();
    if (s.phase === "select") {
      let fighters = 0;
      let ready = 0;
      s.players.forEach((p) => {
        if (p.owner || p === s.players.get("bot")) return;
        fighters++;
        if (p.ready) ready++;
      });
      if (s.ranked) {
        // Ranked: everyone ready (two players for 1v1, someone on each side for 3v3), then the draft.
        const sides = this.teamCounts();
        const enough = this.classic ? fighters >= 2 && sides[1] > 0 && sides[2] > 0 : fighters === 2;
        if (enough && ready === fighters) this.startDraft();
      } else if (fighters >= (s.stage === "pve" || this.classic ? 1 : 2) && ready === fighters) this.beginMatch();
    } else if (s.phase === "draft") {
      this.updateDraft(dt);
    } else if (s.phase === "intermission") {
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) s.phase = "fight";
    } else if (s.phase === "fight" && this.royale) {
      this.updateRoyale(dt);
    } else if (s.phase === "victory") {
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) {
        // New round: reset kills and put everyone back at full health.
        s.players.forEach((p, id) => {
          if (p.owner) return this.removePlayer(id);
          p.score = 0;
          p.dead = false;
          p.hp = p.maxHp;
          p.power = 1;
          this.placeAtSpawn(p);
          const brain = this.brains.get(id);
          if (brain) brain.target = undefined;
        });
        this.clearEnemies();
        this.startIntermission(0);
      }
    }
  }

  /** Boss room: a short intro, then Godzilla; beat it to win. */
  private updateBossRoom(dt: number) {
    const s = this.state;
    if (s.phase === "intermission") {
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) {
        s.phase = "fight";
        this.spawnEnemy("godzilla");
      }
    } else if (s.phase === "fight" && this.monsterCount() === 0) {
      s.phase = "victory";
      s.phaseTimer = 12;
    } else if (s.phase === "victory") {
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) {
        s.players.forEach((p) => {
          if (!p.dead) p.hp = p.maxHp;
        });
        this.startIntermission(0);
      }
    }
  }

  private startWave(wave: number) {
    const s = this.state;
    s.phase = "fight";
    s.wave = wave;
    s.phaseTimer = 0;
    const counts = wavesOf(s.stage)[wave - 1] ?? {};
    for (const [kind, count] of Object.entries(counts) as [EnemyKind, number][]) {
      for (let i = 0; i < count; i++) this.spawnEnemy(kind);
    }
  }

  // ------------------------------------------------------------- players

  /** Move and fight for every player. With `only`, just that one (time is stopped). */
  /** Lag compensation: stop judging as one player saw it, and remember where every hero is now. */
  private afterPlayers() {
    this.judgeLag = 0;
    this.state.players.forEach((p) => {
      let list = this.trail.get(p);
      if (!list) this.trail.set(p, (list = []));
      list.push({ t: this.clock, x: p.x, y: p.y });
      while (list.length > 2 && list[1].t < this.clock - MAX_LAG_COMP - 0.05) list.shift();
    });
  }

  private updatePlayers(dt: number, only?: Set<string>) {
    const s = this.state;
    s.players.forEach((p, id) => {
      if (only && !only.has(id)) return;
      const brain = this.brains.get(id);
      if (!brain) return;
      this.judgeLag = this.brains.get(this.rootOf(id))?.lag ?? 0; // this hero's hits are judged as its player saw the others
      if (brain.bot) this.botThink(id, p, brain, dt);
      // ALIEN TRANSFORM: back to human when the time is up (or on falling).
      if (!p.owner && heroOf(p.hero).formOf && (p.dead || p.buff <= 0)) this.endForm(p, brain);
      const hero = heroOf(p.hero);
      if (this.tickStates(id, p, brain, hero, dt)) return; // eaten, possessing, ...
      const steered = this.steerInput(id, p, brain, hero);
      // The Open World is peaceful: walking and dashing only.
      const input = this.state.stage === "world" ? { ...steered, shoot: false, skill: false, skill2: false } : steered;
      brain.hurtTimer = Math.max(0, brain.hurtTimer - dt);
      p.shield = Math.max(0, p.shield - dt);
      brain.attackTimer = Math.max(0, brain.attackTimer - dt);
      brain.kbExtra = Math.max(0, brain.kbExtra - KNOCKBACK_DISTANCE * 2 * dt);
      if (Math.abs(brain.kbx) + Math.abs(brain.kby) > 1) {
        const pushed = this.move(p.x, p.y, brain.kbx * dt, brain.kby * dt, PLAYER_RADIUS);
        p.x = pushed.x;
        p.y = pushed.y;
        const fade = Math.exp(-KNOCKBACK_DECAY * dt);
        brain.kbx *= fade;
        brain.kby *= fade;
      }
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      p.skillCooldown = Math.max(0, p.skillCooldown - dt);
      p.skill2Cooldown = Math.max(0, p.skill2Cooldown - dt);
      if (brain.thunderWindow) {
        // THUNDER DASH: the second dash was not used in time, so the cooldown starts now.
        brain.thunderWindow = Math.max(0, brain.thunderWindow - dt);
        if (brain.thunderWindow <= 0 || p.dead) {
          brain.thunderWindow = 0;
          p.mode = 0;
          p.skillCooldown = Math.max(p.skillCooldown, hero.skill.cooldown);
        }
      }
      if (brain.shadow) {
        // SHADOW STEP: the shadow fades if he does not flash back in time; then the cooldown starts.
        brain.shadow.left -= dt;
        if (brain.shadow.left <= 0 || p.dead) {
          this.removeZone(brain.shadow.zone);
          brain.shadow = undefined;
          p.mode = 0;
          p.skillCooldown = Math.max(p.skillCooldown, hero.skill.cooldown);
        }
      }
      if (hero.skill.kind === "tree" && !p.owner) this.tendTrees(id, p, hero.skill, dt);

      if (p.owner) {
        this.updateClone(id, p, brain, hero, dt);
        return;
      }

      if (p.dead) {
        brain.burstLeft = 0;
        brain.slashLeft = 0;
        brain.gatlingLeft = 0;
        brain.barrageLeft = 0;
        brain.cycloneLeft = 0;
        brain.diveTo = undefined;
        brain.fxQueue = undefined;
        if (hero.stacks && hero.skill.kind !== "tree") p.mode = 0; // BOOST and ARMOR stacks are lost on falling
        if (hero.skill.kind === "empower") p.mode = 0;
        p.titan = 0;
        p.barrier = 0;
        p.revive = 0;
        p.latch = 0;
        p.beam = 0;
        p.buff = 0;
        p.active2 = 0;
        brain.volleyLeft = 0;
        brain.zip = undefined;
        p.respawnIn = Math.max(0, p.respawnIn - dt);
        if (p.respawnIn <= 0 && s.stage !== "pve" && !(this.classic && p.lives <= 0)) {
          p.dead = false;
          p.hp = this.classic ? p.maxHp : Math.round(p.maxHp / 2);
          this.placeAtSpawn(p);
          brain.target = undefined;
          brain.hurtTimer = 1.5;
          if (this.classic) {
            p.shield = SPAWN_SHIELD;
            this.updateStands();
          }
        }
        return;
      }

      if (p.stun > 0) {
        // Stunned by a rival's jab: no moving, attacking or skills for a moment.
        p.stun = Math.max(0, p.stun - dt);
        brain.target = undefined;
        brain.dashTimer = 0;
        return;
      }

      p.revive = Math.max(0, p.revive - dt);
      p.buff = Math.max(0, p.buff - dt);
      const auto = this.autoMove(id, p, brain, hero, dt); // ERROR / DRAGOON DIVE move him themselves
      p.active2 = Math.max(0, p.active2 - dt);
      if (p.active2 > 0 && hero.skill2?.kind === "gaia") this.healBy(p, p.maxHp * hero.skill2.damage * dt);
      for (const b of fxBuffs(p)) if (b.regen) this.healBy(p, p.maxHp * b.regen * dt);
      if (brain.fxQueue?.length) this.runFxQueue(id, p, brain, dt);
      if (brain.walls) {
        brain.walls.left -= dt;
        if (brain.walls.left <= 0) {
          for (const eid of brain.walls.ids) {
            this.state.enemies.delete(eid);
            this.enemyBrains.delete(eid);
          }
          brain.walls = undefined;
        }
      }
      p.big = Math.max(0, p.big - dt);
      p.slow = Math.max(0, p.slow - dt);
      p.root = Math.max(0, p.root - dt);
      if (p.barrier > 0) {
        // IMMORTAL: untouchable, and healing fast. (THE MAGICIAN's doves are just untouchable.)
        p.barrier = Math.max(0, p.barrier - dt);
        if (hero.skill.kind === "immortal") this.healBy(p, p.maxHp * hero.skill.damage * dt);
      }
      const doves = (p.barrier > 0 && hero.skill2?.kind === "doves") || auto;

      p.aim = input.aim;
      const dir = inputDirection(input);

      // Dash
      if (input.dash && p.dashCooldown <= 0 && brain.dashTimer <= 0 && !(p.root > 0) && !auto) {
        const d = dir.x || dir.y ? dir : { x: Math.cos(input.aim), y: Math.sin(input.aim) };
        brain.dashTimer = DASH_TIME;
        brain.dashX = d.x;
        brain.dashY = d.y;
        p.dashCooldown = DASH_COOLDOWN;
      }

      let moved;
      const dashingNow = brain.dashTimer > 0;
      if (dashingNow) brain.dashTimer -= dt;
      if (auto) {
        moved = { x: p.x, y: p.y };
        brain.target = undefined;
      } else if (brain.zip) {
        // ODM GEAR: the wire reels him in; the server moves him (the client follows, as with a latch).
        const dx = brain.zip.x - p.x;
        const dy = brain.zip.y - p.y;
        const d = Math.hypot(dx, dy);
        const step = GRAPPLE_SPEED * dt;
        moved = d <= step ? this.move(p.x, p.y, dx, dy, PLAYER_RADIUS) : this.move(p.x, p.y, (dx / d) * step, (dy / d) * step, PLAYER_RADIUS);
        const went = Math.hypot(moved.x - p.x, moved.y - p.y);
        brain.target = undefined;
        brain.dashTimer = 0;
        p.latch = Math.max(0.01, (d - went) / GRAPPLE_SPEED);
        if (d <= step + 1 || went < step * 0.2) {
          brain.zip = undefined;
          p.latch = 0;
        }
      } else if (brain.target) {
        // The client moves its own hero (no rubber-banding); the server follows, but never
        // faster than the hero could run. The budget absorbs messages arriving in bursts.
        const speed = dashingNow ? DASH_SPEED : heroSpeed(p);
        const cap = heroSpeed(p) * 0.5 + DASH_SPEED * DASH_TIME + brain.kbExtra;
        brain.moveBudget = Math.min(cap, brain.moveBudget + speed * 1.25 * dt);
        const dx = brain.target.x - p.x;
        const dy = brain.target.y - p.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(dist, brain.moveBudget);
        moved = dist > 0 ? this.move(p.x, p.y, (dx / dist) * step, (dy / dist) * step, PLAYER_RADIUS) : { x: p.x, y: p.y };
        brain.moveBudget -= Math.hypot(moved.x - p.x, moved.y - p.y);
        if (step === dist && Math.hypot(moved.x - brain.target.x, moved.y - brain.target.y) < 0.5) p.mt = brain.target.t;
      } else if (dashingNow) {
        moved = this.move(p.x, p.y, brain.dashX * DASH_SPEED * dt, brain.dashY * DASH_SPEED * dt, PLAYER_RADIUS);
      } else {
        const speed = heroSpeed(p);
        moved = this.move(p.x, p.y, dir.x * speed * dt, dir.y * speed * dt, PLAYER_RADIUS);
      }
      p.x = moved.x;
      p.y = moved.y;
      if (p.domain > 0) this.keepInDomain(p, brain);
      if (p.latch > 0 && !brain.zip && hero.skill.kind === "latch") this.updateLatch(id, p, brain, hero, dt);
      p.dashing = brain.dashTimer > 0;
      // Speed Raptor: running into a foe hurts it.
      if (hero.ram && (dir.x !== 0 || dir.y !== 0)) this.ramInto(id, p, brain, hero.ram);
      if (p.active2 > 0 && hero.skill2) {
        if (hero.skill2.kind === "bike") this.rideBike(id, p, brain, hero.skill2);
        if (hero.skill2.kind === "excalibur") this.spinSwords(id, p, brain, hero.skill2);
      }

      // Basic attack
      p.titan = Math.max(0, p.titan - dt);
      if (input.shoot && brain.attackTimer <= 0 && !doves && !hero.noAttack) {
        const bat = p.active2 > 0 && hero.skill2?.kind === "bat";
        const rage = p.buff > 0 && hero.skill.kind === "rage";
        brain.attackTimer = hero.attackCooldown * (bat ? hero.skill2!.width ?? 0.35 : 1) * (rage ? hero.skill.width ?? 0.6 : 1);
        for (const b of fxBuffs(p)) brain.attackTimer *= b.atk ?? 1; // combo attack-speed buffs
        p.attackSeq++;
        if (p.titan > 0) {
          // A 50m Titan's blows crush everything around it.
          brain.attackTimer = TITAN_ATTACK_COOLDOWN;
          this.sweep(id, p.x, p.y, 0, hero.skill.radius, Math.PI * 2, hero.skill.damage, "cut");
        } else if (hero.gun && p.mode === 1) {
          // Machine gun: a stream of small, slightly scattered bullets.
          const gun = hero.gun;
          brain.attackTimer = gun.attackCooldown;
          const angle = input.aim + (Math.random() - 0.5) * 2 * gun.spread;
          this.spawnBullet("bullet", p.x, p.y, angle, gun.shotSpeed, { owner: id, damage: gun.damage, pierce: 0, life: gun.range / gun.shotSpeed });
        } else if (hero.sword && p.buff > 0) {
          // DIAMOND SWORD: big, fast swings.
          brain.attackTimer = hero.sword.attackCooldown;
          this.sweep(id, p.x, p.y, input.aim, hero.sword.range, hero.sword.arc, hero.sword.damage, "cut");
        } else if (hero.lineAttack) {
          // A straight kick down a lane (Poseidon's trident also cuts down the shots in it).
          this.lineHit(id, p.x, p.y, input.aim, hero.range, hero.lineAttack, hero.damage, 0, 0);
          if (hero.laneParry) this.cutBulletsInLane(id, p.x, p.y, input.aim, hero.range, hero.lineAttack + 10);
        } else if (hero.attack === "rifle") {
          this.spawnBullet("snipe", p.x, p.y, input.aim, hero.shotSpeed, { owner: id, damage: hero.damage, pierce: hero.pierce, life: hero.range / hero.shotSpeed });
        } else if (hero.attack === "magic" && hero.skill.kind === "boost") {
          // BOOSTING: one more shot side by side for every stack.
          const n = 1 + p.mode;
          for (let i = 0; i < n; i++) {
            const off = (i - (n - 1) / 2) * 7;
            const bx = p.x - Math.sin(input.aim) * off;
            const by = p.y + Math.cos(input.aim) * off;
            this.spawnBullet((hero.shot ?? "magic") as BulletKind, bx, by, input.aim, hero.shotSpeed, { owner: id, damage: hero.damage, pierce: 0, life: hero.range / hero.shotSpeed });
          }
        } else if (hero.attack === "magic" && p.hero === "todoroki") {
          // Fire & Ice Hero: blue (ice, slows 10%) and red (fire, burns once more after the hit), in turn.
          brain.altShot = brain.altShot ? 0 : 1;
          const red = brain.altShot === 0;
          const bid = this.spawnBullet((red ? "fxo:orb:ff5020:3" : hero.shot ?? "magic") as BulletKind, p.x, p.y, input.aim, hero.shotSpeed, { owner: id, damage: hero.damage, pierce: 0, life: hero.range / hero.shotSpeed });
          const bb = this.bulletBrains.get(bid)!;
          if (red) bb.ignite = hero.damage * 0.5;
          else [bb.slow, bb.slowPct] = [1.5, 0.1];
        } else if (hero.attack === "magic") {
          const bid = this.spawnBullet((hero.shot ?? "magic") as BulletKind, p.x, p.y, input.aim, hero.shotSpeed, { owner: id, damage: hero.damage, pierce: 0, life: hero.range / hero.shotSpeed, blast: hero.aoe });
          if (hero.slowHit) this.bulletBrains.get(bid)!.slow = hero.slowHit; // ice shards slow
          if (brain.triple) {
            // SWIFT: this shot is the first of three in a row.
            brain.triple = 0;
            [brain.tripleLeft, brain.tripleTimer] = [2, 0.09];
          }
        } else if (hero.skill2?.kind === "yoyo" && p.mode === 1) {
          this.throwYoyo(id, p, hero.skill2);
        } else if (hero.attack === "flame") {
          // Flamethrower: a short cone of fire that burns (slows) whatever it touches.
          this.sweep(id, p.x, p.y, input.aim, hero.range, hero.arc, hero.damage);
          this.burn(id, p.x, p.y, input.aim, hero.range, hero.arc / 2, hero.slowHit ?? 1);
        } else if (hero.attack === "lightning") {
          // Lightning strikes the ground a short way ahead and hits everything nearby.
          const tx = p.x + Math.cos(input.aim) * hero.range;
          const ty = p.y + Math.sin(input.aim) * hero.range;
          this.sweep(id, tx, ty, 0, hero.aoe, Math.PI * 2, hero.damage);
        } else if (hero.skill.kind === "empower" && p.mode === 1) {
          // FOCUS: this blow hits much harder and stuns.
          p.mode = 0;
          this.sweep(id, p.x, p.y, input.aim, hero.range, hero.arc, hero.damage * hero.skill.damage, 2, hero.skill.duration ?? 1);
        } else {
          const hammer = p.buff > 0 && hero.skill.kind === "bloodhammer" ? 2 : 1; // BLOOD HAMMER: twice as hard and as long
          this.sweep(id, p.x, p.y, input.aim, hero.range * hammer, hero.arc, hero.damage * hammer, hero.knock ?? "cut");
        }
      }

      // Skills (ordinary humans under a reality change cannot use any)
      const powerless = (s.reality > 0 && this.isFoe(s.realityBy, id)) || auto || p.silence > 0 || p.taunt > 0;
      if (input.skill && p.skillCooldown <= 0 && hero.skill.kind !== "passive" && !powerless && this.chargedEnough(hero.skill, brain) && !this.skillLocked(p, hero.skill)) {
        p.skillCooldown = hero.skill.cooldown;
        p.skillSeq++;
        this.useSkill(id, p, hero, hero.skill, brain);
      }
      if (hero.skill2 && input.skill2 && p.skill2Cooldown <= 0 && !powerless && this.chargedEnough(hero.skill2, brain) && !this.skillLocked(p, hero.skill2)) {
        p.skill2Cooldown = hero.skill2.cooldown;
        p.skill2Seq++;
        if (brain.stolen) {
          // SWALLOW: the stolen skill goes off instead, once.
          const stolen = brain.stolen;
          brain.stolen = undefined;
          p.mode = 0;
          this.useSkill(id, p, hero, stolen, brain);
        } else this.useSkill(id, p, hero, hero.skill2, brain);
      }

      // Okita's dimension slash keeps cutting for a moment.
      if (brain.slashLeft > 0) {
        brain.slashTimer -= dt;
        if (brain.slashTimer <= 0) {
          brain.slashLeft--;
          brain.slashTimer = (hero.skill.duration ?? 0.8) / OKITA_SLASHES;
          this.sweep(id, p.x, p.y, 0, hero.skill.radius, Math.PI * 2, hero.skill.damage);
        }
      }

      // HEAT VISION keeps burning along wherever he looks.
      if (p.beam > 0) {
        const eb = hero.skill2?.kind === "eyebeam" ? hero.skill2 : hero.skill;
        p.beam = Math.max(0, p.beam - dt);
        brain.eyebeamTick -= dt;
        if (brain.eyebeamTick <= 0) {
          brain.eyebeamTick += EYEBEAM_TICK;
          this.lineHit(id, p.x, p.y, p.aim, eb.radius, eb.width ?? 10, eb.damage * EYEBEAM_TICK);
        }
      }

      // GATLING PUNCH keeps pounding the lane it was aimed down.
      if (brain.gatlingLeft > 0) {
        brain.gatlingTimer -= dt;
        if (brain.gatlingTimer <= 0) {
          brain.gatlingLeft--;
          brain.gatlingTimer += GATLING_GAP;
          const g = hero.skill;
          this.lineHit(id, p.x, p.y, brain.gatlingAim, g.radius, g.width ?? 40, g.damage);
          this.cutBulletsInLane(id, p.x, p.y, brain.gatlingAim, g.radius, g.width ?? 40); // the fists smash shots too
        }
      }

      // KANABO CYCLONE keeps spinning.
      if ((brain.cycloneLeft ?? 0) > 0 && hero.skill2) {
        brain.cycloneTimer = (brain.cycloneTimer ?? 0) - dt;
        if (brain.cycloneTimer <= 0) {
          brain.cycloneLeft!--;
          brain.cycloneTimer += CYCLONE_GAP;
          p.attackSeq++;
          this.sweep(id, p.x, p.y, 0, hero.skill2.radius, Math.PI * 2, hero.skill2.damage, 1);
        }
      }

      // ROCK BARRAGE keeps punching down its lane.
      if ((brain.barrageLeft ?? 0) > 0 && hero.skill2) {
        brain.barrageTimer = (brain.barrageTimer ?? 0) - dt;
        if (brain.barrageTimer <= 0) {
          brain.barrageLeft!--;
          brain.barrageTimer += BARRAGE_GAP;
          p.attackSeq++;
          this.barragePunch(id, p, brain.barrageAim ?? p.aim, hero.skill2);
        }
      }

      // Sniper burst continues over a few ticks.
      if (brain.burstLeft > 0) {
        brain.burstTimer -= dt;
        if (brain.burstTimer <= 0) {
          brain.burstLeft--;
          brain.burstTimer = SNIPER_BURST_GAP;
          p.attackSeq++;
          this.spawnBullet("snipe", p.x, p.y, brain.burstAim, hero.shotSpeed, { owner: id, damage: hero.skill.damage, pierce: 99, life: hero.range / hero.shotSpeed });
        }
      }

      // STAR SHOT keeps firing down the line it was aimed along.
      if ((brain.volleyLeft ?? 0) > 0 && hero.skill2) {
        brain.volleyTimer = (brain.volleyTimer ?? 0) - dt;
        if (brain.volleyTimer <= 0) {
          brain.volleyLeft!--;
          brain.volleyTimer += STAR_GAP;
          const sk = hero.skill2;
          this.spawnBullet("star", p.x, p.y, brain.volleyAim ?? p.aim, STAR_SPEED, { owner: id, damage: sk.damage, pierce: 0, life: sk.radius / STAR_SPEED });
        }
      }

      // Emberfall twist: the lava burns.
      if (!this.royale && inLava(p.x, p.y, s.lavaRadius)) this.damagePlayer(id, LAVA_DPS * dt, true); // Battle Royale's ring is the storm (updateRoyale)
    });
  }

  // ------------------------------------------------- lasting states (2026-10-06 skills)

  /**
   * Timers and states that run before anything else each tick: silence, taunts, possession,
   * being eaten, domains, pushes, the piano, kunai and blood. Returns true when the hero
   * does nothing else this tick (eaten, or possessing a foe).
   */
  private tickStates(id: string, p: P, brain: PlayerBrain, hero: HeroDef, dt: number): boolean {
    const s = this.state;
    p.silence = Math.max(0, p.silence - dt);
    if (p.slow <= 0) p.slowPct = 0;
    // ILLUSION: the Trickster looks like the hero he copied until it runs out (or that hero is gone).
    if (p.hero === "loki" && !p.owner && p.disguise && (p.buff <= 0 || !s.players.has(p.disguise))) p.disguise = "";
    if (hero.skill.kind !== "latch") p.latch = Math.max(0, p.latch - dt); // carried along by a push or an axe
    if (fxBuffs(p).some((b) => b.ccImmune)) {
      // Sword dance: nothing holds him.
      p.stun = 0;
      p.root = 0;
      p.slow = 0;
      if (!brain.possessedBy) p.taunt = 0;
    }
    // The cooldown only starts once the pet is gone (or the portals have closed).
    if (hero.skill.waitGone && this.stillOut(id, hero.skill)) p.skillCooldown = Math.max(p.skillCooldown, hero.skill.cooldown);
    if (hero.skill2?.waitGone && this.stillOut(id, hero.skill2)) p.skill2Cooldown = Math.max(p.skill2Cooldown, hero.skill2.cooldown);
    if (REWINDERS.has(p.hero) && !p.dead) {
      // REWIND: remember where he was, and how hurt, for the last few seconds.
      const trail = (brain.trail ??= []);
      trail.push({ t: this.clock, x: p.x, y: p.y, hp: p.hp });
      while (trail.length && trail[0].t < this.clock - 3) trail.shift();
    }
    if (p.dead) {
      this.endStates(id, p, brain);
      return false;
    }
    // Being walked around by a Reaper, or taunted.
    if (p.taunt > 0) {
      p.taunt = Math.max(0, p.taunt - dt);
      const by = s.players.get(p.link);
      if (!by || by.dead || p.taunt <= 0) this.endTaunt(p, brain);
    }
    if (p.domain > 0) {
      p.domain = Math.max(0, p.domain - dt);
      const rival = s.players.get(p.link);
      if (p.domain <= 0 || !rival || rival.dead || !(rival.domain > 0)) this.endDomain(id);
      else this.keepInDomain(p, brain);
    }
    if (brain.pushes?.length) this.updatePushes(id, p, brain, dt);
    if (brain.piano) this.playPiano(id, p, brain, hero, dt);
    if (brain.kunai) {
      // Kunai still in the air stick in where they land.
      for (const k of brain.kunai.flying) {
        k.t -= dt;
        if (k.t <= 0) brain.kunai.zones.push(this.addZone(`kunai:${k.a.toFixed(2)}:${id}`, k.x, k.y, 8, brain.kunai.left + 0.5, { owner: id, every: Infinity, damage: 0 }));
      }
      brain.kunai.flying = brain.kunai.flying.filter((k) => k.t > 0);
      brain.kunai.left -= dt;
      if (brain.kunai.left <= 0) this.endKunai(id, p, brain, hero);
    }
    if (brain.blood) {
      brain.blood.left -= dt;
      this.layBlood(id, p, brain, dt);
      if (brain.blood.left <= 0) this.endBlood(p, brain, hero);
    }
    if (brain.note !== undefined) {
      // NAME WRITTEN: when the bar is full, the nearest foe in range falls.
      brain.note -= dt;
      if (brain.note <= 0) {
        brain.note = undefined;
        p.buff = 0;
        this.writeName(id, p, hero.skill);
      }
    }
    if (brain.tripleLeft) {
      // SWIFT: the rest of the triple shot.
      brain.tripleTimer = (brain.tripleTimer ?? 0) - dt;
      if (brain.tripleTimer <= 0) {
        brain.tripleLeft--;
        brain.tripleTimer = 0.09;
        p.attackSeq++;
        this.basicShot(id, p, hero, p.aim);
      }
    }
    if (p.vanish > 0) {
      const cooldowns = () => {
        p.dashCooldown = Math.max(0, p.dashCooldown - dt);
        p.skillCooldown = Math.max(0, p.skillCooldown - dt);
        p.skill2Cooldown = Math.max(0, p.skill2Cooldown - dt);
      };
      if (brain.eatenBy) {
        // Inside the Slime Lord: safe, riding along, until any button lets us out.
        const eater = s.players.get(brain.eatenBy);
        brain.eatGrace = Math.max(0, (brain.eatGrace ?? 0) - dt);
        const input = brain.input;
        const out = brain.eatGrace <= 0 && (input.dash || input.skill || !!input.skill2 || input.shoot);
        if (!eater || eater.dead || out) this.popOut(id, p, brain);
        else {
          [p.x, p.y] = [eater.x, eater.y];
          brain.target = undefined;
          cooldowns();
          return true;
        }
      } else if (p.link) {
        // DEATH'S DOOR: inside a foe, walking it around.
        p.vanish = Math.max(0, p.vanish - dt);
        const v = s.players.get(p.link);
        if (!v || v.dead || p.vanish <= 0) this.endPossess(id, p, brain);
        else {
          [p.x, p.y] = [v.x, v.y];
          brain.target = undefined;
          cooldowns();
          return true;
        }
      } else p.vanish = Math.max(0, p.vanish - dt);
    }
    return false;
  }

  /** What the hero does this tick: its own buttons, or a taunt / a possessing Reaper steering it. */
  private steerInput(id: string, p: P, brain: PlayerBrain, hero: HeroDef): PlayerInput {
    const s = this.state;
    if (brain.possessedBy) {
      const r = this.brains.get(brain.possessedBy);
      brain.target = undefined;
      const i = r?.input ?? EMPTY_INPUT;
      return { ...EMPTY_INPUT, left: i.left, right: i.right, up: i.up, down: i.down, aim: i.aim };
    }
    if (p.taunt > 0) {
      const t = s.players.get(p.link);
      brain.target = undefined;
      if (!t) return { ...EMPTY_INPUT, aim: p.aim };
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const near = d < Math.max(hero.range * 0.8, 20);
      return {
        ...EMPTY_INPUT,
        aim: Math.atan2(dy, dx),
        left: !near && dx / d < -0.38,
        right: !near && dx / d > 0.38,
        up: !near && dy / d < -0.38,
        down: !near && dy / d > 0.38,
        shoot: d < hero.range + 30 || hero.attack === "magic" || hero.attack === "rifle",
      };
    }
    return brain.input;
  }

  /** Skills that cannot go off right now (FIRE ARROW inside his own domain). */
  private skillLocked(p: P, sk: SkillDef): boolean {
    const hero = heroOf(p.hero);
    if (p.domain > 0 && hero.skill.kind === "domainx" && sk === hero.skill2) return true;
    return false;
  }

  /** Is what this skill made still around (its pet, or its pair of portals)? */
  private stillOut(id: string, sk: SkillDef): boolean {
    let out = false;
    if (sk.waitGone === "pet") {
      this.state.players.forEach((q) => {
        if (q.owner === id && q.hero === sk.pet && !q.dead) out = true;
      });
    } else if (sk.waitGone === "portal") {
      this.state.zones.forEach((z, zid) => {
        const zb = this.zoneBrains.get(zid);
        if (zb && zb.owner === id && zb.link && (z.kind === "portalA" || z.kind === "portalB")) out = true;
      });
    }
    return out;
  }

  /** Falling ends every lasting state. */
  private endStates(id: string, p: P, brain: PlayerBrain) {
    if (brain.eatenBy) this.popOut(id, p, brain);
    if (p.vanish > 0 && p.link) this.endPossess(id, p, brain);
    if (p.domain > 0) this.endDomain(id);
    if (p.taunt > 0) this.endTaunt(p, brain);
    if (brain.kunai) this.endKunai(id, p, brain, heroOf(p.hero));
    if (brain.blood) this.endBlood(p, brain, heroOf(p.hero));
    brain.piano = undefined;
    brain.pushes = undefined;
    brain.note = undefined;
    brain.tripleLeft = 0;
    p.silence = 0;
  }

  private endTaunt(p: P, brain: PlayerBrain) {
    p.taunt = 0;
    if (brain.possessedBy) {
      const rid = brain.possessedBy;
      const r = this.state.players.get(rid);
      const rb = this.brains.get(rid);
      brain.possessedBy = undefined;
      if (r && rb && r.vanish > 0) this.endPossess(rid, r, rb);
    }
    if (!(p.domain > 0) && !(p.vanish > 0)) p.link = "";
  }

  /** ROOT SNARE: every foe within reach must come at him and attack only him. */
  private tauntAround(id: string, p: P, skill: SkillDef) {
    this.sweep(id, p.x, p.y, 0, skill.radius, Math.PI * 2, skill.damage);
    this.addZone("roots", p.x, p.y, skill.radius, 0.6, { owner: id, every: Infinity, damage: 0 });
    if (!this.pvpLive()) {
      this.rootAround(id, p.x, p.y, skill.radius, skill.duration ?? 2); // monsters just get tied up
      return;
    }
    this.state.players.forEach((v, vid) => {
      if (v.dead || v.owner || !this.isFoe(id, vid) || this.bodyDist(v, p.x, p.y) > skill.radius + this.pr(v)) return;
      const vb = this.brains.get(vid);
      if (!vb || vb.possessedBy) return;
      v.taunt = Math.max(v.taunt, skill.duration ?? 2);
      v.link = id;
    });
  }

  /** DEATH'S DOOR: the Reaper slips into the nearest foe and walks it around. */
  private possess(id: string, p: P, brain: PlayerBrain, skill: SkillDef) {
    const t = this.findTarget(id, p, skill.radius, true);
    const vid = t?.key.startsWith("p:") ? t.key.slice(2) : undefined;
    const v = vid ? this.state.players.get(vid) : undefined;
    const vb = vid ? this.brains.get(vid) : undefined;
    if (!vid || !v || !vb || v.owner || vb.possessedBy || v.vanish > 0) {
      p.skill2Cooldown = 0.5; // nobody to take: try again soon
      return;
    }
    this.addZone("fx:puff:6a2a8a", p.x, p.y, 18, 0.5, { owner: id, every: Infinity, damage: 0 });
    p.vanish = skill.duration ?? 5;
    p.link = vid;
    vb.possessedBy = id;
    v.taunt = skill.duration ?? 5;
    v.link = id;
    const zid = this.addZone("possess", v.x, v.y, 16, skill.duration ?? 5, { owner: id, every: Infinity, damage: 0 });
    this.zoneBrains.get(zid)!.stick = `p:${vid}`;
  }

  private endPossess(id: string, p: P, brain: PlayerBrain) {
    const s = this.state;
    const v = s.players.get(p.link);
    const vb = this.brains.get(p.link);
    if (v && vb && vb.possessedBy === id) {
      vb.possessedBy = undefined;
      v.taunt = 0;
      if (!(v.domain > 0)) v.link = "";
    }
    s.zones.forEach((z, zid) => {
      if (z.kind === "possess" && this.zoneBrains.get(zid)?.owner === id) this.removeZone(zid);
    });
    const at = v ? this.move(v.x, v.y, -Math.cos(p.aim) * 22, -Math.sin(p.aim) * 22, PLAYER_RADIUS) : { x: p.x, y: p.y };
    [p.x, p.y] = [at.x, at.y];
    p.vanish = 0;
    p.link = "";
    p.warp = (p.warp + 1) % 256;
    brain.target = undefined;
    brain.hurtTimer = Math.max(brain.hurtTimer, 0.4);
    this.addZone("fx:puff:6a2a8a", p.x, p.y, 18, 0.5, { owner: id, every: Infinity, damage: 0 });
  }

  /** EATER: the Slime Lord swallows the ally his aim picks; inside, it cannot be hurt. */
  private eatAlly(id: string, p: P, skill: SkillDef) {
    const pick = this.pickByAim(id, p, skill.radius, (qid, q) => qid !== id && !q.owner && !this.isFoe(id, qid) && !(q.vanish > 0) && !(q.domain > 0));
    const qb = pick && this.brains.get(pick);
    const q = pick && this.state.players.get(pick);
    if (!pick || !q || !qb) {
      p.skill2Cooldown = 0.5; // no ally near: nothing used up
      return;
    }
    q.vanish = 9999;
    q.link = id;
    qb.eatenBy = id;
    qb.eatGrace = 0.6;
    q.stun = 0;
    q.taunt = 0;
    this.addZone("fx:burst:60c0ff", q.x, q.y, 22, 0.5, { owner: id, every: Infinity, damage: 0 });
  }

  private popOut(id: string, p: P, brain: PlayerBrain) {
    const eater = brain.eatenBy ? this.state.players.get(brain.eatenBy) : undefined;
    brain.eatenBy = undefined;
    p.vanish = 0;
    p.link = "";
    if (eater) {
      const at = this.move(eater.x, eater.y, Math.cos(p.aim) * 22, Math.sin(p.aim) * 22, PLAYER_RADIUS);
      [p.x, p.y] = [at.x, at.y];
    }
    p.warp = (p.warp + 1) % 256;
    brain.target = undefined;
    brain.dashTimer = 0;
    brain.hurtTimer = Math.max(brain.hurtTimer, 0.5);
    this.addZone("fx:burst:60c0ff", p.x, p.y, 22, 0.5, { owner: id, every: Infinity, damage: 0 });
  }

  /** The hero (anywhere on the map) nearest to the line of the aim, for skills picked by dragging. */
  private pickByAim(id: string, p: P, range: number, ok: (qid: string, q: P) => boolean): string | undefined {
    let best = Infinity;
    let pick: string | undefined;
    this.state.players.forEach((q, qid) => {
      if (q.dead || !ok(qid, q)) return;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d > range) return;
      const score = aimPickScore(q.x - p.x, q.y - p.y, p.aim);
      if (score !== undefined && score < best) [best, pick] = [score, qid];
    });
    return pick;
  }

  /** SWAP: trade places with the hero the aim picks, anywhere on the map. */
  private swapAny(id: string, p: P, skill: SkillDef) {
    const pick = this.pickByAim(id, p, skill.radius, (qid, q) => qid !== id && !(q.vanish > 0) && !(q.domain > 0) && !this.hidden(q, id));
    const q = pick && this.state.players.get(pick);
    if (!pick || !q) {
      p.skillCooldown = Math.min(p.skillCooldown, 0.5);
      p.skill2Cooldown = Math.min(p.skill2Cooldown, 0.5);
      return;
    }
    this.addZone("fx:puff:60c0ff", p.x, p.y, 18, 0.45, { owner: id, every: Infinity, damage: 0 });
    this.addZone("fx:puff:60c0ff", q.x, q.y, 18, 0.45, { owner: id, every: Infinity, damage: 0 });
    [p.x, p.y, q.x, q.y] = [q.x, q.y, p.x, p.y];
    p.warp = (p.warp + 1) % 256;
    q.warp = (q.warp + 1) % 256;
    for (const who of [id, pick]) {
      const b = this.brains.get(who);
      if (b) [b.target, b.dashTimer] = [undefined, 0];
    }
    if (skill.damage && this.isFoe(id, pick)) this.damagePlayer(pick, skill.damage * PVP_DAMAGE_SCALE, true, id);
  }

  /** DOMAIN EXPANSION: he and the foe the aim picks leave the fight for a duel inside his domain. */
  private openDomain(id: string, p: P, skill: SkillDef) {
    const t = this.findTarget(id, p, skill.radius, true);
    const vid = t?.key.startsWith("p:") ? t.key.slice(2) : undefined;
    const v = vid ? this.state.players.get(vid) : undefined;
    const vb = vid ? this.brains.get(vid) : undefined;
    const pb = this.brains.get(id)!;
    if (!vid || !v || !vb || v.owner || v.domain > 0 || v.vanish > 0) {
      p.skillCooldown = 0.5;
      return;
    }
    const life = skill.duration ?? 10;
    const spot = { x: p.x, y: p.y };
    this.addZone(`domainx:${id}:${vid}`, spot.x, spot.y, DOMAIN_RADIUS, life, { owner: id, every: Infinity, damage: 0 });
    for (const [q, qb, qid] of [[p, pb, id], [v, vb, vid]] as [P, PlayerBrain, string][]) {
      q.domain = life;
      q.link = qid === id ? vid : id;
      qb.domainSpot = spot;
      qb.target = undefined;
      qb.dashTimer = 0;
    }
    // The foe is pulled in right in front of him.
    const at = this.move(p.x, p.y, Math.cos(p.aim) * 50, Math.sin(p.aim) * 50, PLAYER_RADIUS);
    [v.x, v.y] = [at.x, at.y];
    v.warp = (v.warp + 1) % 256;
  }

  private keepInDomain(p: P, brain: PlayerBrain) {
    const c = brain.domainSpot;
    if (!c) return;
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d = Math.hypot(dx, dy);
    const max = DOMAIN_RADIUS - PLAYER_RADIUS;
    if (d > max) [p.x, p.y] = [c.x + (dx / d) * max, c.y + (dy / d) * max];
  }

  private endDomain(id: string) {
    const s = this.state;
    const p = s.players.get(id);
    if (!p) return;
    const partner = p.link;
    for (const qid of [id, partner]) {
      const q = s.players.get(qid);
      const qb = this.brains.get(qid);
      if (!q || !qb || !(q.domain > 0 || qb.domainSpot)) continue;
      q.domain = 0;
      qb.domainSpot = undefined;
      if (!(q.taunt > 0) && !(q.vanish > 0)) q.link = "";
    }
    s.zones.forEach((z, zid) => {
      if (z.kind.startsWith("domainx:") && (z.kind.includes(`:${id}`) || z.kind.includes(`:${partner}`))) this.removeZone(zid);
    });
  }

  /** NAME WRITTEN goes off: the nearest foe within reach simply falls (bosses lose a big chunk). */
  private writeName(id: string, p: P, skill: SkillDef) {
    const t = this.findTarget(id, p, skill.radius, true);
    if (!t) return;
    this.addZone("fxd:pillar:202020", t.x, t.y, 24, 0.05, { owner: id, every: Infinity, damage: 0 });
    if (t.key.startsWith("p:")) {
      const v = this.state.players.get(t.key.slice(2));
      if (v) this.damagePlayer(t.key.slice(2), v.hp + 1, true, id, true);
    } else {
      const e = this.state.enemies.get(t.key);
      if (e) this.damageEnemy(t.key, ENEMIES[e.kind as EnemyKind].boss ? e.maxHp * 0.2 : e.hp + 1, id);
    }
  }

  /** SHIELD BASH and the STONE FIST: a hitbox sliding forward that carries foes along until a wall stops it. */
  private startPush(id: string, p: P, brain: PlayerBrain, o: { len: number; width: number; speed: number; dmg: number; stun: number; wallStun: number; self: boolean; look: string }) {
    const zone = this.addZone(o.look, p.x, p.y, o.width / 2, o.len / o.speed + 0.1, { owner: id, every: Infinity, damage: 0 });
    (brain.pushes ??= []).push({ x: p.x, y: p.y, angle: p.aim, left: o.len, speed: o.speed, width: o.width, carried: new Set(), dmg: o.dmg, stun: o.stun, wallStun: o.wallStun, self: o.self, zone });
  }

  private updatePushes(id: string, p: P, brain: PlayerBrain, dt: number) {
    const s = this.state;
    for (const push of [...brain.pushes!]) {
      const step = Math.min(push.left, push.speed * dt);
      const cos = Math.cos(push.angle);
      const sin = Math.sin(push.angle);
      const next = this.move(push.x, push.y, cos * step, sin * step, PLAYER_RADIUS);
      const wall = Math.hypot(next.x - push.x, next.y - push.y) < step * 0.5;
      push.left -= step;
      [push.x, push.y] = [next.x, next.y];
      const z = s.zones.get(push.zone);
      if (z) [z.x, z.y] = [push.x + cos * 10, push.y + sin * 10];
      if (push.self) {
        [p.x, p.y] = [push.x, push.y];
        p.latch = Math.max(p.latch, 0.15); // the client rides along
        brain.target = undefined;
      }
      // Catch foes in front, then carry them along.
      const fx = push.x + cos * 14;
      const fy = push.y + sin * 14;
      const catchR = push.width / 2;
      s.enemies.forEach((e, eid) => {
        const def = ENEMIES[e.kind as EnemyKind];
        if (def.block || def.boss) return;
        if (!push.carried.has(eid) && Math.hypot(e.x - fx, e.y - fy) <= catchR + this.er(e)) {
          push.carried.add(eid);
          if (push.dmg) this.damageEnemy(eid, push.dmg, id);
        }
        if (push.carried.has(eid) && s.enemies.has(eid)) [e.x, e.y] = [push.x + cos * 18, push.y + sin * 18];
      });
      if (this.pvpLive()) {
        s.players.forEach((v, vid) => {
          if (v.dead || !this.isFoe(id, vid)) return;
          if (!push.carried.has(vid) && this.bodyDist(v, fx, fy) <= catchR + this.pr(v)) {
            push.carried.add(vid);
            if (push.dmg) this.damagePlayer(vid, push.dmg * PVP_DAMAGE_SCALE, true, id);
          }
          if (push.carried.has(vid) && !v.dead) {
            const at = this.move(push.x, push.y, cos * 20, sin * 20, PLAYER_RADIUS);
            [v.x, v.y] = [at.x, at.y];
            v.latch = Math.max(v.latch, 0.15);
            const vb = this.brains.get(vid);
            if (vb) [vb.target, vb.dashTimer] = [undefined, 0];
          }
        });
      }
      if (wall || push.left <= 0) {
        // Slammed into the wall (or the push ran out): stunned.
        const stun = wall ? push.wallStun : push.stun;
        for (const key of push.carried) {
          if (s.enemies.has(key)) this.strike(id, key, 0, stun);
          else {
            const v = s.players.get(key);
            if (v && !v.dead && stun > 0) v.stun = Math.max(v.stun, stun);
          }
        }
        if (wall) this.addZone("parry", push.x + cos * 20, push.y + sin * 20, 14, 0.3, { owner: id, every: Infinity, damage: 0 });
        this.removeZone(push.zone);
        brain.pushes!.splice(brain.pushes!.indexOf(push), 1);
        if (push.self) p.warp = (p.warp + 1) % 256;
      }
    }
  }

  /** PIANO: the piano plays its notes, one after another, all around it. */
  private playPiano(id: string, p: P, brain: PlayerBrain, hero: HeroDef, dt: number) {
    const pn = brain.piano!;
    const sk = hero.skill.kind === "piano" ? hero.skill : hero.skill2!;
    pn.timer -= dt;
    while (pn.timer <= 0 && pn.left > 0) {
      pn.timer += PIANO_GAP;
      pn.left--;
      const a = pn.note * 2.39996; // the golden angle: notes spread evenly all the way round
      const letter = "CDEFG"[pn.note % 5];
      pn.note++;
      this.spawnBullet(`note:${letter}` as BulletKind, pn.x, pn.y - 6, a, PIANO_NOTE_SPEED, { owner: id, damage: sk.damage, pierce: 0, life: sk.radius / PIANO_NOTE_SPEED });
    }
    if (pn.left <= 0) brain.piano = undefined;
  }

  /** MARKED KUNAI: three kunai stick where they land; then the next presses warp to one of them. */
  private throwKunai(id: string, p: P, brain: PlayerBrain, skill: SkillDef) {
    if (brain.kunai) {
      // Warp to the kunai closest to where he aims.
      let best = Infinity;
      let pick = -1;
      brain.kunai.zones.forEach((zid, i) => {
        const z = this.state.zones.get(zid);
        if (!z) return;
        let diff = Math.atan2(z.y - p.y, z.x - p.x) - p.aim;
        diff = Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff)));
        if (diff < best) [best, pick] = [diff, i];
      });
      const zid = pick >= 0 ? brain.kunai.zones[pick] : undefined;
      const z = zid ? this.state.zones.get(zid) : undefined;
      if (z && zid) {
        this.addZone("fx:puff:ffe040", p.x, p.y, 16, 0.4, { owner: id, every: Infinity, damage: 0 });
        [p.x, p.y] = [z.x, z.y];
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        this.sweep(id, p.x, p.y, 0, 30, Math.PI * 2, skill.damage); // a flash strike where he lands
        this.addZone("fx:puff:ffe040", p.x, p.y, 16, 0.4, { owner: id, every: Infinity, damage: 0 });
        this.removeZone(zid);
        brain.kunai.zones.splice(pick, 1);
        brain.kunai.warps--;
      }
      p.mode = brain.kunai.warps;
      if (brain.kunai.warps <= 0 || (!brain.kunai.zones.length && !brain.kunai.flying.length)) this.endKunai(id, p, brain, heroOf(p.hero));
      else p.skill2Cooldown = 0.3;
      return;
    }
    // Three real kunai fly out in a spread, hurting whoever they pass through, and stick in where they stop.
    const flying: { x: number; y: number; a: number; t: number }[] = [];
    const n = skill.count ?? 3;
    for (let i = 0; i < n; i++) {
      const a = p.aim + (n > 1 ? (i / (n - 1) - 0.5) * (skill.width ?? 0.6) : 0);
      const end = this.move(p.x, p.y, Math.cos(a) * skill.radius, Math.sin(a) * skill.radius, 4);
      const d = Math.hypot(end.x - p.x, end.y - p.y);
      const speed = KUNAI_SPEED * SHOT_SPEED_SCALE * HERO_SHOT_SCALE; // how fast spawnBullet really flies it
      this.spawnBullet("knife", p.x, p.y, a, KUNAI_SPEED, { owner: id, damage: skill.damage, pierce: 99, life: d / KUNAI_SPEED });
      flying.push({ x: end.x, y: end.y, a, t: d / speed });
    }
    brain.kunai = { zones: [], warps: 3, left: KUNAI_WINDOW, flying };
    p.mode = 3;
    p.skill2Cooldown = 0.3;
  }

  private endKunai(id: string, p: P, brain: PlayerBrain, hero: HeroDef) {
    for (const zid of brain.kunai?.zones ?? []) this.removeZone(zid);
    brain.kunai = undefined;
    p.mode = 0;
    const sk = hero.skill2?.kind === "kunai" ? hero.skill2 : undefined;
    if (sk) p.skill2Cooldown = Math.max(p.skill2Cooldown, sk.cooldown);
  }

  /** BLOOD TRAP: first press starts laying blood along the way; the second calls it all back through foes. */
  private bloodTrap(id: string, p: P, brain: PlayerBrain, skill: SkillDef) {
    if (brain.blood) {
      for (const zid of brain.blood.zones) {
        const z = this.state.zones.get(zid);
        if (!z) continue;
        const a = Math.atan2(p.y - z.y, p.x - z.x);
        const d = Math.hypot(p.x - z.x, p.y - z.y);
        this.fxArea(id, this.laneTest(z.x, z.y, a, d, 18), { dmg: skill.damage }, { x: z.x, y: z.y }, a);
        this.fxLaneZone(id, "chain", "c01020", z.x, z.y, a, d, 6, 0.35);
      }
      this.endBlood(p, brain, heroOf(p.hero));
      return;
    }
    p.hp = Math.max(1, p.hp - p.maxHp * 0.05);
    brain.blood = { zones: [], lay: 0, left: BLOOD_WINDOW };
    p.mode = 1;
    p.skill2Cooldown = 0.3;
  }

  private layBlood(id: string, p: P, brain: PlayerBrain, dt: number) {
    const b = brain.blood!;
    b.lay -= dt;
    if (b.lay > 0 || b.left < BLOOD_WINDOW - BLOOD_LAY_TIME || b.zones.length >= 12) return;
    const last = b.zones.length ? this.state.zones.get(b.zones[b.zones.length - 1]) : undefined;
    if (last && Math.hypot(last.x - p.x, last.y - p.y) < 18) return;
    b.lay = 0.2;
    b.zones.push(this.addZone("blood", p.x, p.y, 8, BLOOD_WINDOW + 0.5, { owner: id, every: Infinity, damage: 0 }));
  }

  private endBlood(p: P, brain: PlayerBrain, hero: HeroDef) {
    for (const zid of brain.blood?.zones ?? []) this.removeZone(zid);
    brain.blood = undefined;
    p.mode = 0;
    const sk = hero.skill2?.kind === "bloodtrap" ? hero.skill2 : undefined;
    if (sk) p.skill2Cooldown = Math.max(p.skill2Cooldown, sk.cooldown);
  }

  /** SWALLOW: takes the nearest foe's first skill; the next E uses it once. */
  private copySkill(id: string, p: P, brain: PlayerBrain, skill: SkillDef) {
    const t = this.findTarget(id, p, skill.radius, true);
    const v = t?.key.startsWith("p:") ? this.state.players.get(t.key.slice(2)) : undefined;
    if (!t || !v) {
      p.skill2Cooldown = 0.5;
      return;
    }
    this.fxLaneZone(id, "grab", "6020a0", p.x, p.y, Math.atan2(t.y - p.y, t.x - p.x), Math.hypot(t.x - p.x, t.y - p.y), 8, 0.5);
    this.strike(id, t.key, skill.damage);
    const stolen = heroOf(v.hero).skill;
    if (stolen.kind === "passive" || stolen.kind === "copyskill") return;
    brain.stolen = stolen;
    p.mode = 1;
    p.skill2Cooldown = 0.5;
  }

  /** FAKE CLONE: five harmless clones run around him (one hit and they are gone). */
  private fakeClones(id: string, p: P, skill: SkillDef) {
    const before = new Set<string>();
    this.state.players.forEach((_q, qid) => before.add(qid));
    this.state.players.forEach((q, qid) => {
      if (q.owner === id && this.brains.get(qid)?.decoy) this.removePlayer(qid);
    });
    this.spawnSummon(id, p, p.hero, 1, skill.count ?? 5, skill.duration ?? 8);
    this.state.players.forEach((q, qid) => {
      if (before.has(qid) || q.owner !== id) return;
      const b = this.brains.get(qid)!;
      b.decoy = { angle: Math.random() * Math.PI * 2, timer: 0 };
      this.addZone("fx:puff:ffa030", q.x, q.y, 14, 0.4, { owner: id, every: Infinity, damage: 0 });
    });
  }

  /** A decoy clone runs around near its owner and never attacks. */
  private runDecoy(id: string, c: P, brain: PlayerBrain, owner: P, dt: number) {
    const d = brain.decoy!;
    d.timer -= dt;
    if (d.timer <= 0) {
      d.timer = 0.6 + Math.random() * 0.8;
      d.angle = Math.random() * Math.PI * 2;
    }
    const tx = owner.x + Math.cos(d.angle) * 60;
    const ty = owner.y + Math.sin(d.angle) * 60;
    const dx = tx - c.x;
    const dy = ty - c.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      const sp = heroSpeed(c) * dt;
      const moved = this.move(c.x, c.y, (dx / dist) * Math.min(sp, dist), (dy / dist) * Math.min(sp, dist), PLAYER_RADIUS);
      [c.x, c.y] = [moved.x, moved.y];
    }
    c.aim = owner.aim;
    [c.hp, c.maxHp] = [owner.hp, owner.maxHp]; // looks just like him
  }

  /** The SPIRAL SPHERE: his decoys copy it at the same foe. */
  private decoysCopy(id: string, p: P, skill: SkillDef) {
    const t = this.findTarget(id, p, 320);
    this.state.players.forEach((c, cid) => {
      const cb = this.brains.get(cid);
      if (c.owner !== id || !cb?.decoy || c.dead) return;
      const aim = t ? Math.atan2(t.y - c.y, t.x - c.x) : p.aim;
      c.aim = aim;
      c.skillSeq++;
      for (const st of skill.steps ?? []) this.fxStep(cid, c, cb, st, aim, c.x, c.y);
    });
  }

  /** The Fire & Ice Hero's red shot burns its target once more a moment after the hit. */
  private igniteTarget(owner: string, key: string, damage: number, x: number, y: number) {
    const zid = this.addZone("ignite", x, y, 8, IGNITE_DELAY, { owner, every: Infinity, damage });
    this.zoneBrains.get(zid)!.stick = key;
    this.zoneBrains.get(zid)!.ignite = key;
  }

  /** A hero's normal shot (used again for SWIFT's extra arrows). */
  private basicShot(id: string, p: P, hero: HeroDef, aim: number) {
    const kind = (hero.attack === "rifle" ? "snipe" : hero.shot ?? "magic") as BulletKind;
    this.spawnBullet(kind, p.x, p.y, aim, hero.shotSpeed, { owner: id, damage: hero.damage, pierce: hero.attack === "rifle" ? hero.pierce : 0, life: hero.range / hero.shotSpeed, blast: hero.aoe });
  }

  /** Where a shot ends (wall, time, or its last hit): COCKROACH SHOT bursts into roaches. */
  private endBullet(id: string) {
    const b = this.state.bullets.get(id);
    const brain = this.bulletBrains.get(id);
    if (b && brain?.split) {
      const sp = brain.split;
      for (let i = 0; i < sp.n; i++) {
        const a = (i / sp.n) * Math.PI * 2 + Math.random() * 0.3;
        const bid = this.spawnBullet(`fxo:${sp.shape}:${sp.color}:${sp.size}` as BulletKind, b.x, b.y, a, sp.speed, { owner: brain.owner, damage: sp.dmg ?? 0, pierce: 0, life: sp.range / sp.speed });
        const nb = this.bulletBrains.get(bid)!;
        if (sp.stun) nb.stun = sp.stun;
      }
    }
    this.removeBullet(id);
  }

  private useSkill(id: string, p: P, hero: HeroDef, skill: SkillDef, brain: PlayerBrain) {
    const s = this.state;
    switch (skill.kind) {
      case "smash": // ground pound that hits everything around you (and can stun it)
        this.sweep(id, p.x, p.y, 0, skill.radius, Math.PI * 2, skill.damage);
        if (skill.duration) this.stunAround(id, p.x, p.y, skill.radius, skill.duration);
        break;
      case "cross": // DEATH CROSS: crushing damage down a short lane, and everything hit goes flying
        this.lineHit(id, p.x, p.y, p.aim, skill.radius, skill.width ?? 26, skill.damage, 0, skill.duration ?? 4);
        break;
      case "dashkick": {
        // FLASH KICK: dart to the nearest target in front, kick and stun it, and land back here.
        const t = this.findTarget(id, p, skill.radius);
        if (!t) {
          this.lineHit(id, p.x, p.y, p.aim, skill.radius * 0.4, 20, skill.damage, skill.duration ?? 1);
          break;
        }
        if (t.key.startsWith("p:")) {
          const vid = t.key.slice(2);
          this.damagePlayer(vid, skill.damage * PVP_DAMAGE_SCALE, true, id);
          const v = s.players.get(vid);
          if (v && !v.dead) v.stun = Math.max(v.stun, skill.duration ?? 1);
        } else {
          const e = s.enemies.get(t.key);
          const def = e && ENEMIES[e.kind as EnemyKind];
          this.damageEnemy(t.key, skill.damage, id);
          if (e && def && !def.boss && s.enemies.has(t.key)) e.stun = Math.max(e.stun, skill.duration ?? 1);
        }
        this.addZone("dashkick", t.x, t.y, 12, 0.35, { owner: id, every: Infinity, damage: 0 });
        break;
      }
      case "truck": {
        // TRUCK SMASH: a truck falls on the spot he aimed at (time keeps flowing: it can be dodged).
        const spot = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, 4);
        this.addZone("truck", spot.x, spot.y, TRUCK_RADIUS, Math.max(0.1, (skill.duration ?? 2) - 0.05), { owner: id, every: Infinity, damage: skill.damage });
        break;
      }
      case "dragonform": {
        // DRAGON FORM: into the dragon with the same share of HP; back with the HP he had (endForm).
        if (!skill.form) break;
        const share = p.hp / p.maxHp;
        brain.formHp = p.hp;
        p.hero = skill.form;
        p.maxHp = this.maxHpOf(id, skill.form);
        p.hp = Math.max(1, Math.round(p.maxHp * share));
        p.buff = skill.duration ?? 12;
        p.skillCooldown = 0.5;
        brain.attackTimer = 0;
        break;
      }
      case "omnitrix": {
        // ALIEN TRANSFORM: the alien picked on the wheel (by aiming at it), keeping the same share of HP.
        const form = formFromAim(p.hero, p.aim);
        if (!form) break;
        const share = p.hp / p.maxHp;
        brain.formHp = p.hp;
        p.hero = form;
        p.maxHp = this.maxHpOf(id, form);
        p.hp = Math.max(1, Math.round(p.maxHp * share));
        p.buff = skill.duration ?? 10;
        p.skillCooldown = 0.5; // the alien's own skill (if any) is ready almost at once
        brain.attackTimer = 0;
        break;
      }
      case "mitosis":
        this.mitosis(id, p, skill);
        break;
      case "eat":
        this.healBy(p, p.maxHp * skill.damage);
        break;
      case "diamond":
        p.buff = skill.duration ?? 10;
        brain.attackTimer = 0;
        break;
      case "build":
        this.placeBlock(id, p, skill);
        break;
      case "eyebeam":
        p.beam = skill.duration ?? 2.5;
        brain.eyebeamTick = 0;
        break;
      case "storm": // lightning rains on everything around you
        this.sweep(id, p.x, p.y, 0, skill.radius, Math.PI * 2, skill.damage);
        break;
      case "wave": {
        // a flying sword wave that cuts through every enemy in its path
        const speed = 300;
        const n = skill.count ?? 1; // SKY SLASH: three waves in a fan
        for (let i = 0; i < n; i++) {
          const a = p.aim + (n > 1 ? (i / (n - 1) - 0.5) * 0.45 : 0);
          this.spawnBullet("wave", p.x, p.y, a, speed, { owner: id, damage: skill.damage, pierce: 99, life: skill.radius / speed });
        }
        break;
      }
      case "burst": // three rapid piercing shots
        brain.burstLeft = SNIPER_BURST;
        brain.burstTimer = 0;
        brain.burstAim = p.aim;
        break;
      case "fireball": {
        // a slow, big fireball with a huge explosion
        const speed = 170;
        this.spawnBullet("fireball", p.x, p.y, p.aim, speed, { owner: id, damage: skill.damage, pierce: 0, life: hero.range / speed, blast: skill.radius });
        break;
      }
      case "jab": // a long straight jab that stuns whoever it hits
        this.lineHit(id, p.x, p.y, p.aim, skill.radius, skill.width ?? 16, skill.damage, skill.duration ?? 0);
        break;
      case "onepunch": // whatever is in front of Saitama simply stops existing
        this.sweep(id, p.x, p.y, p.aim, hero.range, hero.arc, ONE_PUNCH_DAMAGE); // as far and as wide as his normal punch
        break;
      case "heal":
        s.players.forEach((q, qid) => {
          if (q.dead || Math.hypot(q.x - p.x, q.y - p.y) > skill.radius) return;
          if (this.rootOf(qid) !== id && this.isFoe(id, qid)) return; // no healing your rivals
          this.healBy(q, q.maxHp * skill.damage);
        });
        break;
      case "line":
        this.lineHit(id, p.x, p.y, p.aim, skill.radius, skill.width ?? 40, skill.damage);
        break;
      case "slashes":
        brain.slashLeft = OKITA_SLASHES;
        brain.slashTimer = 0;
        break;
      case "domain":
        // Unlimited Void: every enemy inside the void (a big circle around him) is hit at once.
        s.enemies.forEach((e, eid) => {
          if (Math.hypot(e.x - p.x, e.y - p.y) <= skill.radius + ENEMIES[e.kind as EnemyKind].radius) this.damageEnemy(eid, skill.damage, id);
        });
        s.players.forEach((v, vid) => {
          if (this.isFoe(id, vid) && this.bodyDist(v, p.x, p.y) <= skill.radius + this.pr(v)) this.damagePlayer(vid, skill.damage * PVP_DAMAGE_SCALE, true, id);
        });
        this.addZone("domain", p.x, p.y, skill.radius, skill.duration ?? 1.5, { owner: id, every: Infinity, damage: 0 });
        break;
      case "timestop":
        s.timeStop = skill.duration ?? 4;
        s.timeStopBy = id;
        break;
      case "hurricane": {
        // The storm gathers a little way ahead, where you aim.
        const x = Math.min(this.W - 20, Math.max(20, p.x + Math.cos(p.aim) * 120));
        const y = Math.min(this.H - 20, Math.max(20, p.y + Math.sin(p.aim) * 120));
        this.addZone("hurricane", x, y, skill.radius, skill.duration ?? 3.5, { owner: id, every: 0.35, damage: skill.damage });
        break;
      }
      case "mimic": {
        // ILLUSION: copy the look of the hero the aim picks (friend or foe).
        const pick = this.pickByAim(id, p, skill.radius, (qid, q) => qid !== id && !q.owner && !(q.vanish > 0) && !(q.domain > 0) && !this.hidden(q, id));
        if (!pick) {
          p.skillCooldown = Math.min(p.skillCooldown, 0.5);
          break;
        }
        p.disguise = pick;
        p.buff = skill.duration ?? 10;
        this.addZone("fx:puff:ff4040", p.x, p.y, 20, 0.45, { owner: id, every: Infinity, damage: 0 });
        break;
      }
      case "asgard":
        this.addZone("asgard", p.x, p.y, skill.radius, skill.duration ?? 10, { owner: id, every: 0.5, damage: skill.damage });
        break;
      case "clone":
        this.spawnSummon(id, p, p.hero, skill.damage, 1, skill.duration ?? 20, MAX_CLONES);
        break;
      case "swap": // knife <-> machine gun
        p.mode = p.mode === 1 ? 0 : 1;
        brain.attackTimer = 0;
        break;
      case "rush": {
        // Dash straight ahead (rocks stop you), cutting through everything on the way.
        const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
        const len = Math.hypot(end.x - p.x, end.y - p.y);
        this.lineHit(id, p.x, p.y, p.aim, len, skill.width ?? 24, skill.damage);
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256; // the client jumps with us
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.3);
        break;
      }
      case "thunderdash": {
        // THUNDER DASH: a lightning dash cutting the lane. Every hit opens another dash for a moment.
        // It goes straight through walls and rocks (user request 2026-10-08), landing on the farthest open spot.
        const end = this.passThrough(p.x, p.y, p.aim, skill.radius);
        const len = Math.hypot(end.x - p.x, end.y - p.y);
        const hits = this.lineHit(id, p.x, p.y, p.aim, len, skill.width ?? 26, skill.damage);
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.25);
        if (hits > 0) {
          brain.thunderWindow = skill.duration ?? 2;
          p.mode = 1; // shown on the HUD: one more dash ready
          p.skillCooldown = 0.25;
        } else {
          brain.thunderWindow = 0;
          p.mode = 0;
        }
        break;
      }
      case "seventh": {
        // SEVENTH FORM: a huge lightning dash cutting a wide lane, which keeps crackling for a while.
        const sx = p.x;
        const sy = p.y;
        const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
        const len = Math.hypot(end.x - p.x, end.y - p.y);
        const width = skill.width ?? 70;
        this.lineHit(id, sx, sy, p.aim, len, width, skill.damage);
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.3);
        const life = skill.duration ?? 3;
        const zid = this.addZone("thunderlane", sx + Math.cos(p.aim) * len * 0.5, sy + Math.sin(p.aim) * len * 0.5, len / 2, life, {
          owner: id,
          every: SEVENTH_TICK,
          damage: skill.damage * SEVENTH_TICK_SHARE,
        });
        const zb = this.zoneBrains.get(zid)!;
        zb.tick = SEVENTH_TICK;
        zb.lane = { x: sx, y: sy, angle: p.aim, len, width };
        // Bolts along the lane, for the eye only.
        const n = Math.max(1, Math.round(len / 34));
        for (let i = 0; i <= n; i++) {
          const d = (len * i) / n;
          this.addZone("bolt", sx + Math.cos(p.aim) * d, sy + Math.sin(p.aim) * d, width / 2, life, { owner: id, every: Infinity, damage: 0 });
        }
        break;
      }
      case "chargeslash": {
        // CLEAVE: a wide sword arc, bigger and harder the longer it was charged.
        const power = this.chargeOf(skill, brain);
        this.sweep(id, p.x, p.y, p.aim, skill.radius * chargeReach(power), skill.width ?? 2.4, skill.damage * power, 1 + power / 2);
        break;
      }
      case "chargeshot": {
        // POWER SHOT: a heavy arrow that goes through everything and stuns.
        const speed = 520;
        const bid = this.spawnBullet("bigarrow", p.x, p.y, p.aim, speed, { owner: id, damage: skill.damage, pierce: 99, life: skill.radius / speed });
        this.bulletBrains.get(bid)!.stun = skill.duration ?? 1;
        break;
      }
      case "reflect":
      case "sprint":
        p.active2 = skill.duration ?? 1;
        brain.triple = 1; // SWIFT: the next shot is three arrows in a row
        brain.attackTimer = 0;
        break;
      case "shadowstep": {
        if (brain.shadow) {
          // Flash back to the shadow; now the cooldown starts.
          const back = this.move(brain.shadow.x, brain.shadow.y, 0, 0, PLAYER_RADIUS);
          this.addZone("smoke", p.x, p.y, 16, 0.4, { owner: id, every: Infinity, damage: 0 });
          p.x = back.x;
          p.y = back.y;
          p.warp = (p.warp + 1) % 256;
          brain.target = undefined;
          this.removeZone(brain.shadow.zone);
          brain.shadow = undefined;
          p.mode = 0;
          break;
        }
        // Dash ahead cutting the lane; a shadow stays where he started.
        const zone = this.addZone("shadow", p.x, p.y, 10, (skill.duration ?? 3) + 0.1, { owner: id, every: Infinity, damage: 0 });
        brain.shadow = { x: p.x, y: p.y, zone, left: skill.duration ?? 3 };
        const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
        this.lineHit(id, p.x, p.y, p.aim, Math.hypot(end.x - p.x, end.y - p.y), skill.width ?? 24, skill.damage);
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.25);
        p.mode = 1; // shown on the HUD: the flash back is ready
        p.skillCooldown = 0.3;
        break;
      }
      case "shuriken": {
        const n = skill.count ?? 5;
        const speed = 380;
        for (let i = 0; i < n; i++) {
          const a = p.aim + (i - (n - 1) / 2) * (skill.width ?? 0.2);
          this.spawnBullet("shuriken", p.x, p.y, a, speed, { owner: id, damage: skill.damage, pierce: 0, life: skill.radius / speed });
        }
        break;
      }
      case "shield":
        // HOLY SHIELD: he and every ally close by are untouchable for a moment.
        this.state.players.forEach((q, qid) => {
          if (q.dead || (qid !== id && this.isFoe(id, qid))) return;
          if (Math.hypot(q.x - p.x, q.y - p.y) > skill.radius) return;
          q.barrier = Math.max(q.barrier, skill.duration ?? 2.5);
        });
        this.addZone("holyshield", p.x, p.y, skill.radius, 0.6, { owner: id, every: Infinity, damage: 0 });
        break;
      case "shieldcharge": {
        // SHIELD BASH: the longer the charge, the further the rush; a full one stuns.
        const held = brain.bot ? chargeTimeOf(skill) : brain.input.charge2 ?? 0;
        const share = Math.min(1, held / chargeTimeOf(skill));
        const full = share >= 0.999;
        const dist = skill.radius * (0.35 + 0.65 * share);
        // He drives forward step by step, shoving everything in front of him along (a wall stops them, stunned).
        this.startPush(id, p, brain, { len: dist, width: skill.width ?? 30, speed: 260, dmg: skill.damage, stun: full ? skill.duration ?? 2 : 0, wallStun: full ? skill.duration ?? 2 : 1, self: true, look: "fxp:shield:f0e0a0" });
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.3);
        break;
      }
      case "tree": {
        // GROW TREE: it takes root a little way ahead and stays for good.
        const w = skill.width ?? 40;
        const spot = this.move(p.x, p.y, Math.cos(p.aim) * w, Math.sin(p.aim) * w, 6);
        this.addZone("tree", spot.x, spot.y, 14, Infinity, { owner: id, every: Infinity, damage: 0 });
        p.mode++;
        break;
      }
      case "leafstorm": {
        // LEAF STORM: every tree he has planted adds to the storm.
        const speed = 300;
        const bid = this.spawnBullet("leafstorm", p.x, p.y, p.aim, speed, { owner: id, damage: skill.damage * (1 + (skill.width ?? 0.35) * p.mode), pierce: 99, life: skill.radius / speed });
        void bid;
        break;
      }
      case "empower":
        p.mode = 1;
        brain.attackTimer = 0;
        break;
      case "leap": {
        // SKY LEAP: up and over onto the aimed spot (rocks stop the jump short), then a crushing landing.
        const w = skill.width ?? 170;
        const end = this.move(p.x, p.y, Math.cos(p.aim) * w, Math.sin(p.aim) * w, PLAYER_RADIUS);
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        this.sweep(id, p.x, p.y, 0, skill.radius, Math.PI * 2, skill.damage, 1, skill.duration ?? 1);
        this.addZone("landing", p.x, p.y, skill.radius, 0.5, { owner: id, every: Infinity, damage: 0 });
        break;
      }
      case "boost":
        p.mode = Math.min(skill.count ?? 3, p.mode + 1);
        break;
      case "bluelaser":
        this.lineHit(id, p.x, p.y, p.aim, skill.radius, skill.width ?? 14, skill.damage);
        break;
      case "harden":
        p.mode = Math.min(skill.count ?? 10, p.mode + 1);
        break;
      case "taunt":
        this.tauntAround(id, p, skill);
        break;
      case "possess":
        this.possess(id, p, brain, skill);
        break;
      case "eater":
        this.eatAlly(id, p, skill);
        break;
      case "swapany":
        this.swapAny(id, p, skill);
        break;
      case "domainx":
        this.openDomain(id, p, skill);
        break;
      case "deathnote":
        // NAME WRITTEN: he writes (walking slowly) while the bar fills; then the nearest foe in range falls.
        p.buff = skill.duration ?? 10;
        brain.note = skill.duration ?? 10;
        break;
      case "kunai":
        this.throwKunai(id, p, brain, skill);
        break;
      case "bloodtrap":
        this.bloodTrap(id, p, brain, skill);
        break;
      case "bloodhammer":
        // BLOOD HAMMER: pays 10% HP for a hammer of blood (twice the damage and reach) for a while.
        p.hp = Math.max(1, p.hp - p.maxHp * 0.1);
        p.buff = skill.duration ?? 7;
        brain.attackTimer = 0;
        this.addZone("fx:burst:c01020", p.x, p.y, 26, 0.45, { owner: id, every: Infinity, damage: 0 });
        break;
      case "copyskill":
        this.copySkill(id, p, brain, skill);
        break;
      case "fakeclone":
        this.fakeClones(id, p, skill);
        break;
      case "piano": {
        // PIANO: a piano appears in front of him and plays a run of notes all around.
        const spot = this.move(p.x, p.y, Math.cos(p.aim) * 24, Math.sin(p.aim) * 24, 10);
        const n = skill.count ?? 24;
        brain.piano = { left: n, timer: 0.15, x: spot.x, y: spot.y, note: 0 };
        this.addZone("piano", spot.x, spot.y, 18, n * PIANO_GAP + 0.4, { owner: id, every: Infinity, damage: 0 });
        break;
      }
      case "combo":
        this.castCombo(id, p, skill, brain);
        break;
      case "petrify": {
        // REALITY: the code of the nearest foe is rewritten; it is now a plain rock.
        const t = this.findTarget(id, p, skill.radius, true);
        if (!t) break;
        this.strike(id, t.key, skill.damage, skill.duration ?? 3);
        const zid = this.addZone("petrify", t.x, t.y, 12, skill.duration ?? 3, { owner: id, every: Infinity, damage: 0 });
        this.zoneBrains.get(zid)!.stick = t.key;
        break;
      }
      case "error":
        p.active2 = skill.duration ?? 5;
        brain.errorTimer = 0;
        break;
      case "reap": {
        // SOUL REAP: a full spin of the scythe. Every foe it cuts gives a soul and heals him.
        const n = this.foesAround(id, p.x, p.y, skill.radius);
        this.sweep(id, p.x, p.y, 0, skill.radius, Math.PI * 2, skill.damage, true);
        p.mode = Math.min(skill.count ?? 5, p.mode + n);
        this.healBy(p, p.maxHp * (skill.width ?? 0.06) * n);
        this.addZone("reap", p.x, p.y, skill.radius, 0.35, { owner: id, every: Infinity, damage: 0 });
        break;
      }
      case "deathdoor": {
        // DEATH'S DOOR: blink behind the nearest foe and cut, harder for every soul (and twice as hard on the nearly dead).
        const t = this.findTarget(id, p, skill.radius, true);
        if (!t) break;
        const v = t.key.startsWith("p:") ? s.players.get(t.key.slice(2)) : s.enemies.get(t.key);
        const low = v ? v.hp / v.maxHp < 0.35 : false;
        const d = Math.hypot(t.x - p.x, t.y - p.y) || 1;
        const end = this.move(t.x, t.y, ((t.x - p.x) / d) * 18, ((t.y - p.y) / d) * 18, PLAYER_RADIUS);
        this.addZone("smoke", p.x, p.y, 16, 0.4, { owner: id, every: Infinity, damage: 0 });
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        p.aim = Math.atan2(t.y - p.y, t.x - p.x);
        this.strike(id, t.key, skill.damage * (1 + (skill.width ?? 0.4) * p.mode) * (low ? 2 : 1));
        this.addZone("scythecut", t.x, t.y, 20, 0.4, { owner: id, every: Infinity, damage: 0 });
        p.mode = 0;
        break;
      }
      case "roots":
        // ROOT SNARE: roots burst out of the ground and tie every foe nearby.
        this.sweep(id, p.x, p.y, 0, skill.radius, Math.PI * 2, skill.damage);
        this.rootAround(id, p.x, p.y, skill.radius, skill.duration ?? 2);
        this.addZone("roots", p.x, p.y, skill.radius, 0.7, { owner: id, every: Infinity, damage: 0 });
        break;
      case "gaia":
        p.active2 = skill.duration ?? 5;
        break;
      case "rage":
        p.buff = skill.duration ?? 6;
        brain.attackTimer = 0;
        break;
      case "axethrow": {
        // AXE BOOMERANG: out to `radius`, then home again, cutting both ways.
        const speed = 520;
        const out = skill.radius / (speed * SHOT_SPEED_SCALE * HERO_SHOT_SCALE);
        const bid = this.spawnBullet("axe", p.x, p.y, p.aim, speed, { owner: id, damage: skill.damage, pierce: 999, life: out + 3 });
        Object.assign(this.bulletBrains.get(bid)!, { bounce: true, back: out, age: 0, rehit: true, carry: new Set() }); // and drags whoever it hits home with it
        break;
      }
      case "jackbox": {
        // JACK-IN-THE-BOX: a box at his feet that waits for a victim; only so many at once.
        const mine: string[] = [];
        s.zones.forEach((z, zid) => {
          if (z.kind === "jackbox" && this.zoneBrains.get(zid)?.owner === id) mine.push(zid);
        });
        while (mine.length >= (skill.max ?? 3)) this.removeZone(mine.shift()!);
        const zid = this.addZone("jackbox", p.x, p.y, skill.radius, JACKBOX_LIFE, { owner: id, every: Infinity, damage: skill.damage });
        this.zoneBrains.get(zid)!.stun = skill.duration ?? 1;
        break;
      }
      case "switch": {
        // SWITCHEROO: trade places with the nearest foe; a confetti bomb goes off where he stood.
        const t = this.findTarget(id, p, skill.radius, true);
        if (!t) break;
        const [ox, oy] = [p.x, p.y];
        if (t.key.startsWith("p:")) {
          const v = s.players.get(t.key.slice(2))!;
          [v.x, v.y] = [ox, oy];
          v.warp = (v.warp + 1) % 256;
          const vb = this.brains.get(t.key.slice(2));
          if (vb) [vb.target, vb.dashTimer] = [undefined, 0];
        } else {
          const e = s.enemies.get(t.key)!;
          if (!ENEMIES[e.kind as EnemyKind].boss) [e.x, e.y] = [ox, oy];
        }
        [p.x, p.y] = [t.x, t.y];
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        this.addZone("smoke", ox, oy, 16, 0.4, { owner: id, every: Infinity, damage: 0 });
        this.addZone("smoke", t.x, t.y, 16, 0.4, { owner: id, every: Infinity, damage: 0 });
        const zid = this.addZone("confetti", ox, oy, skill.width ?? 55, CONFETTI_FUSE, { owner: id, every: Infinity, damage: skill.damage });
        this.zoneBrains.get(zid)!.blast = { knock: 1, stun: 0 };
        break;
      }
      case "anvil": {
        const w = skill.width ?? 140;
        const spot = this.move(p.x, p.y, Math.cos(p.aim) * w, Math.sin(p.aim) * w, 4);
        const zid = this.addZone("anvil", spot.x, spot.y, skill.radius, ANVIL_FALL, { owner: id, every: Infinity, damage: skill.damage });
        this.zoneBrains.get(zid)!.blast = { knock: 0, stun: skill.duration ?? 1.5 };
        break;
      }
      case "sparks": {
        // FORGE SPARKS: a fan of red-hot sparks off the anvil.
        const n = skill.count ?? 7;
        const spread = skill.width ?? 0.9;
        const speed = 330;
        for (let i = 0; i < n; i++) {
          const a = p.aim + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
          this.spawnBullet("ember", p.x, p.y, a, speed, { owner: id, damage: skill.damage, pierce: 0, life: skill.radius / speed });
        }
        break;
      }
      case "wall": {
        // STONE WALL: rocks rise across the aim; they stop shots until broken (or they crumble).
        if (brain.walls) for (const eid of brain.walls.ids) [s.enemies.delete(eid), this.enemyBrains.delete(eid)];
        const cx = p.x + Math.cos(p.aim) * skill.radius;
        const cy = p.y + Math.sin(p.aim) * skill.radius;
        const n = skill.count ?? 5;
        const ids: string[] = [];
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * 16;
          const x = cx - Math.sin(p.aim) * off;
          const y = cy + Math.cos(p.aim) * off;
          if (this.blocked(x, y) || x < 8 || y < 8 || x > this.W - 8 || y > this.H - 8) continue;
          const e = this.make.enemy();
          e.kind = "rockwall";
          e.hp = e.maxHp = ENEMIES.rockwall.hp;
          [e.x, e.y] = [x, y];
          const eid = `e${this.nextId++}`;
          s.enemies.set(eid, e);
          this.enemyBrains.set(eid, { shootTimer: 999, burstAngle: 0, beamTimer: 999, kbx: 0, kby: 0, owner: id });
          ids.push(eid);
        }
        brain.walls = { ids, left: skill.duration ?? 6 };
        this.addZone("build", cx, cy, 30, 0.3, { owner: id, every: Infinity, damage: 0 });
        break;
      }
      case "quake": {
        const zid = this.addZone("quake", p.x, p.y, skill.radius, skill.duration ?? 2, { owner: id, every: 0.4, damage: skill.damage });
        this.zoneBrains.get(zid)!.slow = 1;
        break;
      }
      case "meteor": {
        const w = skill.width ?? 170;
        const spot = this.move(p.x, p.y, Math.cos(p.aim) * w, Math.sin(p.aim) * w, 4);
        const zid = this.addZone("meteor", spot.x, spot.y, skill.radius, METEOR_FALL, { owner: id, every: Infinity, damage: skill.damage });
        Object.assign(this.zoneBrains.get(zid)!, { blast: { knock: 1.5, stun: 0 }, embers: { radius: skill.radius, life: skill.duration ?? 3, damage: skill.damage * 0.12 } });
        break;
      }
      case "flamedash": {
        // FLAME DASH: through the foes, and the way behind him burns.
        const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
        const len = Math.hypot(end.x - p.x, end.y - p.y);
        const w = skill.width ?? 28;
        this.lineHit(id, p.x, p.y, p.aim, len, w, skill.damage);
        const zid = this.addZone("firetrail", p.x, p.y, 4, skill.duration ?? 3, { owner: id, every: 0.5, damage: skill.damage * 0.4 });
        this.zoneBrains.get(zid)!.lane = { x: p.x, y: p.y, angle: p.aim, len, width: w };
        for (let d = 0; d <= len; d += 22) {
          this.addZone("flame", p.x + Math.cos(p.aim) * d, p.y + Math.sin(p.aim) * d, 10, skill.duration ?? 3, { owner: id, every: Infinity, damage: 0 });
        }
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.25);
        break;
      }
      case "iceprison": {
        const t = this.findTarget(id, p, skill.radius, true);
        if (!t) break;
        this.strike(id, t.key, skill.damage, skill.duration ?? 1.8);
        const zid = this.addZone("iceblock", t.x, t.y, 12, skill.duration ?? 1.8, { owner: id, every: Infinity, damage: 0 });
        this.zoneBrains.get(zid)!.stick = t.key;
        break;
      }
      case "blizzard": {
        const w = skill.width ?? 150;
        const spot = this.move(p.x, p.y, Math.cos(p.aim) * w, Math.sin(p.aim) * w, 4);
        const zid = this.addZone("blizzard", spot.x, spot.y, skill.radius, skill.duration ?? 4, { owner: id, every: 0.5, damage: skill.damage });
        this.zoneBrains.get(zid)!.slow = 1;
        break;
      }
      case "lancecharge": {
        // PIERCING CHARGE: spear first down a lane; everything in it is thrown far back.
        const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
        const len = Math.hypot(end.x - p.x, end.y - p.y);
        this.lineHit(id, p.x, p.y, p.aim, len, skill.width ?? 30, skill.damage, 0, 2.5);
        this.addZone("lancetrail", (p.x + end.x) / 2, (p.y + end.y) / 2, len / 2, 0.35, { owner: id, every: Infinity, damage: 0 });
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.3);
        break;
      }
      case "dive": {
        // DRAGOON DIVE: up out of reach; he comes down on the aimed spot when the zone runs out.
        const w = skill.width ?? 200;
        const spot = this.move(p.x, p.y, Math.cos(p.aim) * w, Math.sin(p.aim) * w, PLAYER_RADIUS);
        p.active2 = skill.duration ?? 1;
        const zid = this.addZone("dive", spot.x, spot.y, skill.radius, skill.duration ?? 1, { owner: id, every: Infinity, damage: skill.damage });
        Object.assign(this.zoneBrains.get(zid)!, { blast: { knock: 0, stun: 1 }, moveOwner: true });
        break;
      }
      case "roar":
        this.sweep(id, p.x, p.y, 0, skill.radius, Math.PI * 2, skill.damage, 1.5);
        this.stunAround(id, p.x, p.y, skill.radius, skill.duration ?? 0.8);
        this.addZone("roar", p.x, p.y, skill.radius, 0.6, { owner: id, every: Infinity, damage: 0 });
        break;
      case "cyclone":
        brain.cycloneLeft = skill.count ?? 3;
        brain.cycloneTimer = 0;
        break;
      case "barrage":
        brain.barrageLeft = skill.count ?? 6;
        brain.barrageTimer = 0;
        brain.barrageAim = p.aim;
        break;
      case "charge": {
        // MAX SMASH: the longer it was charged, the harder and further it hits (the bot charges halfway).
        const power = this.chargeOf(skill, brain);
        const reach = chargeReach(power);
        this.lineHit(id, p.x, p.y, p.aim, skill.radius * reach, (skill.width ?? 40) * reach, skill.damage * power, 0, 1 + power / 2);
        break;
      }
      case "godrush": {
        // LIGHTNING DASH: the Sword God's lunge, cutting the whole lane, then a full spin where he lands.
        const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
        const len = Math.hypot(end.x - p.x, end.y - p.y);
        this.lineHit(id, p.x, p.y, p.aim, len, skill.width ?? 26, skill.damage);
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.3);
        this.sweep(id, p.x, p.y, 0, SWORD_GOD.whirl.radius, Math.PI * 2, skill.damage);
        break;
      }
      case "fan": {
        // SLASH FAN: flying sword slashes in a fan, each cutting through everything it meets.
        const speed = SWORD_GOD.waves.speed;
        const n = skill.count ?? 5;
        for (let i = 0; i < n; i++) {
          const a = p.aim + (i - (n - 1) / 2) * (skill.width ?? 0.24);
          this.spawnBullet("godslash", p.x, p.y, a, speed, { owner: id, damage: skill.damage, pierce: 99, life: skill.radius / speed });
        }
        break;
      }
      case "titan":
        p.titan = skill.duration ?? 10;
        brain.attackTimer = 0;
        break;
      case "city": {
        // CREATOR: a whole city appears around Yaotsu.
        const x = Math.min(this.W - 60, Math.max(60, p.x));
        const y = Math.min(this.H - 60, Math.max(60, p.y));
        this.addZone("city", x, y, skill.radius, skill.duration ?? 15, { owner: id, every: 0.5, damage: skill.damage });
        break;
      }
      case "reality":
        s.reality = skill.duration ?? 10;
        s.realityBy = id;
        break;
      case "gatling":
        brain.gatlingLeft = Math.round((skill.duration ?? 1) / GATLING_GAP);
        brain.gatlingTimer = 0;
        brain.gatlingAim = p.aim;
        break;
      case "portal":
        this.openPortal(id, p, skill);
        break;
      case "missiles": {
        // A fan of missiles bursts out, then each one hunts down a target.
        const n = skill.count ?? 10;
        for (let i = 0; i < n; i++) {
          const a = p.aim + (i - (n - 1) / 2) * 0.32;
          const bid = this.spawnBullet("missile", p.x, p.y, a, MISSILE_SPEED, { owner: id, damage: skill.damage, pierce: 0, life: skill.duration ?? 8 });
          const mb = this.bulletBrains.get(bid)!;
          mb.homing = true;
          mb.age = 0;
        }
        break;
      }
      case "biglight":
        this.bigLight(id, p, skill);
        break;
      case "grapple": {
        // ODM GEAR: the wire flies ahead until it bites into a wall (a rock, the map edge or the ring ropes).
        const cos = Math.cos(p.aim);
        const sin = Math.sin(p.aim);
        let ax = p.x;
        let ay = p.y;
        for (let d = 4; d <= skill.radius; d += 4) {
          const x = p.x + cos * d;
          const y = p.y + sin * d;
          if (this.blocked(x, y) || x < 0 || y < 0 || x > this.W || y > this.H) break;
          [ax, ay] = [x, y];
        }
        const len = Math.hypot(ax - p.x, ay - p.y);
        if (len < 6) break;
        brain.zip = { x: ax, y: ay };
        brain.target = undefined;
        p.latch = len / GRAPPLE_SPEED;
        this.addZone("anchor", ax + cos * 3, ay + sin * 3, 3, p.latch + 0.15, { owner: id, every: Infinity, damage: 0 });
        break;
      }
      case "trojan": {
        // TROJAN HORSE: a wooden horse a little way ahead. When its countdown ends it bursts open.
        const w = skill.width ?? 60;
        const spot = this.move(p.x, p.y, Math.cos(p.aim) * w, Math.sin(p.aim) * w, 16);
        this.addZone("trojan", spot.x, spot.y, skill.radius, skill.duration ?? 10, { owner: id, every: Infinity, damage: skill.damage });
        break;
      }
      case "sticky": {
        // STICKY BOMB: dart up to the nearest target in front and stick a bomb on it.
        const t = this.findTarget(id, p, skill.radius);
        let ux = Math.cos(p.aim);
        let uy = Math.sin(p.aim);
        let bx: number;
        let by: number;
        if (t) {
          const d = Math.hypot(t.x - p.x, t.y - p.y) || 1;
          [ux, uy] = [(t.x - p.x) / d, (t.y - p.y) / d];
          const gap = Math.max(0, d - 18);
          const end = this.move(p.x, p.y, ux * gap, uy * gap, PLAYER_RADIUS);
          [p.x, p.y] = [end.x, end.y];
          [bx, by] = [t.x, t.y];
        } else {
          const end = this.move(p.x, p.y, ux * skill.radius * 0.5, uy * skill.radius * 0.5, PLAYER_RADIUS);
          [p.x, p.y] = [end.x, end.y];
          [bx, by] = [p.x + ux * 14, p.y + uy * 14];
        }
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.3);
        const zid = this.addZone("sticky", bx, by, STICKY_BLAST, skill.duration ?? 0.8, { owner: id, every: Infinity, damage: skill.damage });
        Object.assign(this.zoneBrains.get(zid)!, { stick: t?.key, vx: ux, vy: uy, stun: skill.width ?? 5 });
        break;
      }
      case "spinkick":
        // SPINNING KICK: a full turn, kicking everything around him away.
        this.sweep(id, p.x, p.y, 0, skill.radius, Math.PI * 2, skill.damage, 2.5);
        break;
      case "totem":
        this.addZone("totem", p.x, p.y, skill.radius, skill.duration ?? 5, { owner: id, every: 0.5, damage: skill.damage });
        break;
      case "palm": {
        // GIANT PALM: a hand the size of a house comes down on the aimed spot.
        const w = skill.width ?? 150;
        const spot = this.move(p.x, p.y, Math.cos(p.aim) * w, Math.sin(p.aim) * w, 4);
        const zid = this.addZone("palm", spot.x, spot.y, skill.radius, PALM_FALL, { owner: id, every: Infinity, damage: skill.damage });
        this.zoneBrains.get(zid)!.stun = skill.duration ?? 2;
        break;
      }
      case "invis":
      case "bat":
      case "bike":
      case "excalibur":
        p.active2 = skill.duration ?? 4;
        brain.hitAt = new Map();
        if (skill.kind === "bat") brain.attackTimer = 0;
        break;
      case "yoyo":
        p.mode = p.mode === 1 ? 0 : 1;
        brain.attackTimer = 0;
        break;
      case "sacrifice":
        this.sacrifice(id, p, skill);
        break;
      case "grab":
        this.grabSlam(id, p, skill, brain);
        break;
      case "knives": {
        // KNIFE STORM: knives fly out in a full ring.
        const n = skill.count ?? 12;
        const speed = 360;
        for (let i = 0; i < n; i++) {
          this.spawnBullet("knife", p.x, p.y, p.aim + (i * Math.PI * 2) / n, speed, { owner: id, damage: skill.damage, pierce: 0, life: skill.radius / speed });
        }
        break;
      }
      case "rubberpunch": {
        // RUBBER PUNCH: the arm shoots out fast to FIST_REACH and snaps back; anyone it hits is stunned for 1s.
        const out = FIST_REACH / (FIST_SPEED * SHOT_SPEED_SCALE * HERO_SHOT_SCALE);
        const bid = this.spawnBullet("fist", p.x, p.y, p.aim, FIST_SPEED, { owner: id, damage: skill.damage, pierce: 999, life: out + 3 });
        Object.assign(this.bulletBrains.get(bid)!, { bounce: true, back: out, age: 0, stun: 1 });
        break;
      }
      case "purple":
        // PURPLE BEAM: one crushing blast straight ahead.
        this.lineHit(id, p.x, p.y, p.aim, skill.radius, skill.width ?? 40, skill.damage);
        break;
      case "starfinger":
        brain.volleyLeft = skill.count ?? 5;
        brain.volleyTimer = 0;
        brain.volleyAim = p.aim;
        break;
      case "doves":
        // THE MAGICIAN: gone in a flock of doves. Nothing can hurt him until he reappears.
        p.barrier = skill.duration ?? 2;
        break;
      case "frost": {
        // FROST SIGIL: a magic circle on the ground, a little way ahead. It waits for someone to step on it.
        const spot = this.move(p.x, p.y, Math.cos(p.aim) * FROST_SIGIL_REACH, Math.sin(p.aim) * FROST_SIGIL_REACH, 4);
        const zid = this.addZone("frost", spot.x, spot.y, skill.radius, FROST_SIGIL_LIFE, { owner: id, every: 0, damage: skill.damage });
        Object.assign(this.zoneBrains.get(zid)!, { stun: skill.duration ?? 3, hit: new Set<string>() });
        break;
      }
      case "castle": {
        // MOVING CASTLE: it rises behind the wizard and walks straight on until it has left the map.
        const vx = Math.cos(p.aim) * CASTLE_SPEED;
        const vy = Math.sin(p.aim) * CASTLE_SPEED;
        const x = p.x - Math.cos(p.aim) * 30;
        const y = p.y - Math.sin(p.aim) * 30;
        const tx = vx > 0 ? (this.W + skill.radius - x) / vx : vx < 0 ? (-skill.radius - x) / vx : Infinity;
        const ty = vy > 0 ? (this.H + skill.radius - y) / vy : vy < 0 ? (-skill.radius - y) / vy : Infinity;
        const life = Math.min(14, tx, ty);
        const zid = this.addZone("castle", x, y, skill.radius, life, { owner: id, every: 0, damage: skill.damage });
        Object.assign(this.zoneBrains.get(zid)!, { vx, vy, stun: skill.duration ?? 1, hit: new Set<string>() });
        break;
      }
      case "whip": {
        // SHADOW WHIP: a black whip shoots out to the nearest target in range and ties its legs.
        const t = this.findTarget(id, p, skill.radius, true);
        if (!t) break;
        const hold = skill.duration ?? 2;
        if (t.key.startsWith("p:")) {
          const vid = t.key.slice(2);
          this.damagePlayer(vid, skill.damage * PVP_DAMAGE_SCALE, true, id);
          const v = s.players.get(vid);
          if (v && !v.dead) v.root = Math.max(v.root, hold);
        } else {
          const e = s.enemies.get(t.key);
          this.damageEnemy(t.key, skill.damage, id);
          if (e && s.enemies.has(t.key)) e.root = Math.max(e.root, hold);
        }
        const zid = this.addZone("whip", t.x, t.y, 12, hold, { owner: id, every: Infinity, damage: 0 });
        this.zoneBrains.get(zid)!.stick = t.key;
        break;
      }
      case "solve": {
        // SOLVE IT: the Detective has worked it out. The nearest target is locked on and stunned.
        const t = this.findTarget(id, p, skill.radius, true);
        if (!t) break;
        const stun = skill.duration ?? 5;
        if (t.key.startsWith("p:")) {
          const vid = t.key.slice(2);
          this.damagePlayer(vid, skill.damage * PVP_DAMAGE_SCALE, true, id);
          const v = s.players.get(vid);
          if (v && !v.dead) v.stun = Math.max(v.stun, stun);
        } else {
          const e = s.enemies.get(t.key);
          this.damageEnemy(t.key, skill.damage, id);
          if (e && !ENEMIES[e.kind as EnemyKind].boss && s.enemies.has(t.key)) e.stun = Math.max(e.stun, stun);
        }
        this.addZone("solve", t.x, t.y, 14, 1, { owner: id, every: Infinity, damage: 0 });
        break;
      }
      case "rewind":
        this.rewind(skill.duration ?? 2);
        this.addZone("rewind", p.x, p.y, 400, 0.8, { owner: id, every: Infinity, damage: 0 });
        break;
      case "summon":
        this.spawnSummon(id, p, skill.pet!, skill.damage, skill.count ?? 1, skill.duration ?? Infinity, skill.max ?? skill.count ?? 1);
        if (skill.pet2) this.spawnSummon(id, p, skill.pet2, skill.damage, skill.count ?? 1, skill.duration ?? Infinity, skill.max ?? skill.count ?? 1);
        break;
      case "card": {
        // Draw a card: its number is the share of the target's HP it takes (x10%).
        const n = 1 + Math.floor(Math.random() * 9);
        const speed = 380;
        const bid = this.spawnBullet(`card${n}`, p.x, p.y, p.aim, speed, { owner: id, damage: 0, pierce: 0, life: skill.radius / speed });
        this.bulletBrains.get(bid)!.pct = n * skill.damage;
        break;
      }
      case "revive":
        p.revive = skill.duration ?? 5;
        break;
      case "immortal":
        p.barrier = skill.duration ?? 3;
        break;
      case "latch":
        this.startLatch(id, p, skill, brain);
        break;
      case "kick": {
        // RIDER KICK: leap along the aim, kicking through everything and stunning it.
        const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
        const len = Math.hypot(end.x - p.x, end.y - p.y);
        this.lineHit(id, p.x, p.y, p.aim, len, skill.width ?? 30, skill.damage, skill.duration ?? 2);
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.4);
        break;
      }
    }
  }

  /** Stun every monster (not bosses) and, in PvP, every rival within `radius`. */
  private stunAround(owner: string, x: number, y: number, radius: number, seconds: number) {
    this.state.enemies.forEach((e) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (!def.boss && Math.hypot(e.x - x, e.y - y) <= radius + this.er(e)) e.stun = Math.max(e.stun, seconds);
    });
    this.state.players.forEach((v, vid) => {
      if (!v.dead && this.isFoe(owner, vid) && this.bodyDist(v, x, y) <= radius + this.pr(v)) v.stun = Math.max(v.stun, seconds);
    });
  }

  /** BLOOD LATCH: leap onto the nearest target in front (monster, or rival in PvP); with none, just leap. */
  private startLatch(id: string, p: P, skill: SkillDef, brain: PlayerBrain) {
    const t = this.findTarget(id, p, skill.radius);
    const pick = t?.key;
    const tx = t?.x ?? 0;
    const ty = t?.y ?? 0;
    if (!pick) {
      const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius * 0.6, Math.sin(p.aim) * skill.radius * 0.6, PLAYER_RADIUS);
      p.x = end.x;
      p.y = end.y;
      p.warp = (p.warp + 1) % 256;
      brain.target = undefined;
      return;
    }
    // Cling to the side we came from.
    const a = Math.atan2(p.y - ty, p.x - tx);
    brain.latchOn = pick;
    brain.latchDx = Math.cos(a) * 6;
    brain.latchDy = Math.sin(a) * 6;
    brain.latchTick = 0;
    p.latch = skill.duration ?? 3;
    this.updateLatch(id, p, brain, heroOf(p.hero), 0);
  }

  /** The nearest monster (or rival, in PvP) within `radius` and roughly where `p` is aiming. Blocks are ignored. */
  private findTarget(id: string, p: P, radius: number, anyDirection = false): { key: string; x: number; y: number } | undefined {
    let best = Infinity;
    let pick: string | undefined;
    let tx = 0;
    let ty = 0;
    const consider = (key: string, x: number, y: number) => {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d > radius || d >= best) return;
      let diff = Math.atan2(y - p.y, x - p.x) - p.aim;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (!anyDirection && Math.abs(diff) > LATCH_CONE && d > 30) return;
      [best, pick, tx, ty] = [d, key, x, y];
    };
    this.state.enemies.forEach((e, eid) => {
      if (!ENEMIES[e.kind as EnemyKind].block) consider(eid, e.x, e.y);
    });
    this.state.players.forEach((v, vid) => {
      if (!v.dead && this.isFoe(id, vid) && !this.hidden(v, id)) consider(`p:${vid}`, v.x, v.y);
    });
    return pick ? { key: pick, x: tx, y: ty } : undefined;
  }

  /** Clinging on: ride along with the target and bite it every LATCH_TICK, healing what we drink. */
  private updateLatch(id: string, p: P, brain: PlayerBrain, hero: HeroDef, dt: number) {
    const key = brain.latchOn ?? "";
    const victim = key.startsWith("p:") ? this.state.players.get(key.slice(2)) : this.state.enemies.get(key);
    p.latch = Math.max(0, p.latch - dt);
    if (!victim || (key.startsWith("p:") && ((victim as P).dead || !this.isFoe(id, key.slice(2)))) || p.latch <= 0) {
      p.latch = 0;
      brain.latchOn = undefined;
      return;
    }
    p.x = victim.x + brain.latchDx;
    p.y = victim.y + brain.latchDy;
    brain.target = undefined;
    brain.dashTimer = 0;
    brain.latchTick -= dt;
    if (brain.latchTick > 0) return;
    brain.latchTick += LATCH_TICK;
    const bite = hero.skill.damage * LATCH_TICK;
    if (key.startsWith("p:")) this.damagePlayer(key.slice(2), bite * PVP_DAMAGE_SCALE, true, id);
    else this.damageEnemy(key, bite, id);
    p.hp = Math.min(p.maxHp, p.hp + bite);
  }

  /** PORTAL GUN: the first shot opens a portal, the second opens its partner and links them. */
  private openPortal(id: string, p: P, skill: SkillDef) {
    const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
    const mine: string[] = [];
    let waiting: string | undefined;
    this.state.zones.forEach((z, zid) => {
      const zb = this.zoneBrains.get(zid);
      if (!zb || zb.owner !== id || (z.kind !== "portalA" && z.kind !== "portalB")) return;
      mine.push(zid);
      if (!zb.link) waiting = zid;
    });
    if (waiting) {
      const second = this.addZone("portalB", end.x, end.y, 16, skill.duration ?? 20, { owner: id, every: Infinity, damage: 0 });
      const first = this.state.zones.get(waiting)!;
      first.life = first.maxLife = skill.duration ?? 20;
      this.zoneBrains.get(waiting)!.link = second;
      this.zoneBrains.get(second)!.link = waiting;
      return;
    }
    // A new pair replaces the old one; the second portal can be shot right away.
    for (const zid of mine) this.removeZone(zid);
    this.addZone("portalA", end.x, end.y, 16, PORTAL_WAIT, { owner: id, every: Infinity, damage: 0 });
    p.skillCooldown = 0.4;
  }

  /** How hard a charged skill hits (x1..x4): from how long it was held (bots charge halfway, or fully when they must). */
  private chargeOf(skill: SkillDef, brain: PlayerBrain): number {
    const full = chargeTimeOf(skill);
    const held = brain.bot ? (skill.kind === "chargeshot" ? full : full / 2) : brain.input.charge2 ?? 0;
    return chargePower(held, full);
  }

  /** POWER SHOT only goes off at full charge; every other skill goes off whenever. */
  private chargedEnough(skill: SkillDef, brain: PlayerBrain): boolean {
    if (skill.kind !== "chargeshot" || brain.bot) return true;
    return (brain.input.charge2 ?? 0) >= chargeTimeOf(skill) - 0.05;
  }

  /** GROW TREE: count his trees (for LEAF STORM and the HUD) and heal him for each one he stands near. */
  private tendTrees(id: string, p: P, skill: SkillDef, dt: number) {
    let n = 0;
    let near = 0;
    this.state.zones.forEach((z, zid) => {
      if (z.kind !== "tree" || this.zoneBrains.get(zid)?.owner !== id) return;
      n++;
      if (Math.hypot(z.x - p.x, z.y - p.y) <= skill.radius) near++;
    });
    p.mode = n;
    if (near > 0 && !p.dead) this.healBy(p, p.maxHp * skill.damage * near * dt);
  }

  /** ROCK BARRAGE: one punch down the lane. A foe with a wall right behind it is stunned; the rest fly back. */
  private barragePunch(id: string, p: P, aim: number, skill: SkillDef) {
    const cos = Math.cos(aim);
    const sin = Math.sin(aim);
    const pinned = (x: number, y: number) => {
      const pushed = this.move(x, y, cos * 24, sin * 24, PLAYER_RADIUS);
      return Math.hypot(pushed.x - x, pushed.y - y) < 12;
    };
    const len = skill.radius;
    const half = (skill.width ?? 40) / 2;
    const inLane = (tx: number, ty: number, r: number) => {
      const along = (tx - p.x) * cos + (ty - p.y) * sin;
      const across = Math.abs(-(tx - p.x) * sin + (ty - p.y) * cos);
      return along >= -r && along <= len + r && across <= half + r;
    };
    this.state.enemies.forEach((e, eid) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (!inLane(e.x, e.y, this.er(e))) return;
      this.damageEnemy(eid, skill.damage, id);
      if (def.boss || def.block) return;
      if (pinned(e.x, e.y)) e.stun = Math.max(e.stun, skill.duration ?? 1.5);
      else this.knockEnemy(eid, cos, sin, 0.6);
    });
    if (!this.pvpLive()) return;
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid) || !this.onBody(v, (bx, by) => inLane(bx, by, this.pr(v)))) return;
      this.damagePlayer(vid, skill.damage * PVP_DAMAGE_SCALE, true, id);
      if (v.dead) return;
      if (pinned(v.x, v.y)) v.stun = Math.max(v.stun, skill.duration ?? 1.5);
      else this.knockPlayer(vid, cos, sin, 0.6);
    });
  }

  /** PARRY: a shot that hits a parrying Warrior turns round and flies back, now his, and harder. */
  private reflectBullet(b: B, brain: BulletBrain, by: string) {
    const hero = heroOf(this.state.players.get(by)?.hero ?? "");
    b.vx = -b.vx;
    b.vy = -b.vy;
    b.hostile = false;
    brain.owner = by;
    brain.hit = new Set([by]);
    brain.damage *= hero.skill2?.damage ?? 1.5;
    brain.life = Math.max(brain.life, 1.5);
    brain.homing = false;
  }

  private reflecting(p: P): boolean {
    return p.active2 > 0 && heroOf(p.hero).skill2?.kind === "reflect" && !p.dead;
  }

  /** The portals' owner (only he can use them) walks into a linked portal and comes out of its partner. */
  private usePortal(zid: string, z: Z, link: string, owner: string) {
    const out = this.state.zones.get(link);
    if (!out) return;
    this.state.players.forEach((p, pid) => {
      const brain = this.brains.get(pid);
      if (!brain || p.dead || pid !== owner) return;
      const d = Math.hypot(p.x - z.x, p.y - z.y);
      if (brain.portalLock === zid) {
        if (d > PORTAL_REACH + 10) brain.portalLock = undefined; // stepped off: it works again
        return;
      }
      if (d > PORTAL_REACH) return;
      p.x = out.x;
      p.y = out.y;
      p.warp = (p.warp + 1) % 256;
      brain.target = undefined;
      brain.portalLock = link;
    });
  }

  /** Hit everything in a wide straight line (Deku's 100% SMASH). */
  private lineHit(owner: string, x: number, y: number, angle: number, length: number, width: number, damage: number, stun = 0, knock = 0): number {
    let hits = 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const inLine = (tx: number, ty: number, r: number) => {
      const along = (tx - x) * cos + (ty - y) * sin;
      const across = Math.abs(-(tx - x) * sin + (ty - y) * cos);
      return along >= -r && along <= length + r && across <= width / 2 + r;
    };
    this.state.enemies.forEach((e, eid) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (!inLine(e.x, e.y, this.er(e))) return;
      hits++;
      this.damageEnemy(eid, damage, owner);
      if (stun > 0 && !def.boss) e.stun = Math.max(e.stun, stun); // bosses shrug it off
      if (knock > 0 && !def.boss) this.knockEnemy(eid, cos, sin, knock); // sent flying along the line
    });
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(owner, vid) || !this.onBody(v, (bx, by) => inLine(bx, by, this.pr(v)))) return;
      hits++;
      this.damagePlayer(vid, damage * PVP_DAMAGE_SCALE, true, owner);
      if (stun > 0 && !v.dead) v.stun = Math.max(v.stun, stun);
      if (knock > 0) this.knockPlayer(vid, cos, sin, knock);
    });
    return hits;
  }

  // -------------------------------------------------------------- clones

  /** ALIEN TRANSFORM is over: back to the human hero, with the HP he had before transforming. */
  private endForm(p: P, brain?: PlayerBrain) {
    const base = heroOf(p.hero).formOf;
    if (!base) return;
    const share = p.hp / p.maxHp;
    p.hero = base;
    p.maxHp = this.maxHpOf(this.idOf(p), base);
    const back = brain?.formHp ?? p.maxHp * share;
    p.hp = p.dead ? 0 : Math.max(1, Math.min(p.maxHp, Math.round(back)));
    if (brain) brain.formHp = undefined;
    p.buff = 0;
    p.skillCooldown = heroOf(base).skill.cooldown;
  }

  /** MITOSIS: every copy of the Echo Mite (the real one too) splits in two, each half keeping half its HP. */
  private mitosis(id: string, p: P, skill: SkillDef) {
    const copies: P[] = [p];
    this.state.players.forEach((q) => {
      if (q.owner === id && q.hero === p.hero && !q.dead) copies.push(q);
    });
    let total = copies.length;
    for (const c of copies) {
      if (total >= (skill.count ?? 16)) break;
      if (c.hp < 2) continue;
      c.hp = c.hp / 2;
      const n = this.make.player();
      n.name = p.name; // nobody can tell which one is real
      n.hero = p.hero;
      n.owner = id;
      n.color = p.color;
      const a = Math.random() * Math.PI * 2;
      const spot = this.move(c.x + Math.cos(a) * 16, c.y + Math.sin(a) * 16, 0, 0, PLAYER_RADIUS);
      n.x = spot.x;
      n.y = spot.y;
      n.aim = c.aim;
      n.maxHp = p.maxHp;
      n.hp = c.hp;
      const nid = `c${this.nextId++}`;
      this.state.players.set(nid, n);
      const brain = this.newBrain();
      brain.cloneLife = Math.max(0.1, p.buff);
      brain.attackTimer = Math.random() * heroOf(p.hero).attackCooldown;
      this.brains.set(nid, brain);
      total++;
    }
  }

  /** The Blaze Alien's flames: whatever hostile is in the cone is burned (slowed) for `t` seconds. */
  private burn(id: string, x: number, y: number, aim: number, range: number, half: number, t: number) {
    const inCone = (tx: number, ty: number, r: number) => {
      const d = Math.hypot(tx - x, ty - y);
      if (d > range + r) return false;
      let diff = Math.atan2(ty - y, tx - x) - aim;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      return Math.abs(diff) <= half || d <= r + 8;
    };
    this.state.enemies.forEach((e) => {
      if (!ENEMIES[e.kind as EnemyKind].block && inCone(e.x, e.y, this.er(e))) e.slow = Math.max(e.slow, t);
    });
    this.state.players.forEach((v, vid) => {
      if (!v.dead && this.isFoe(id, vid) && this.onBody(v, (bx, by) => inCone(bx, by, this.pr(v)))) v.slow = Math.max(v.slow, t);
    });
  }

  /**
   * Helpers that fight on their own: Loki's clone (a copy of him), Gadget Cat's gunner bots and
   * the Monster Tamer's pets. Each has `hpShare` of the summoner's max HP. Calling more than
   * `max` of one kind replaces the oldest.
   */
  private spawnSummon(ownerId: string, owner: P, hero: string, hpShare: number, count: number, life: number, max = count) {
    const mine: string[] = [];
    this.state.players.forEach((q, qid) => {
      if (q.owner === ownerId && q.hero === hero) mine.push(qid);
    });
    while (mine.length + count > max && mine.length) this.removePlayer(mine.shift()!);
    const def = heroOf(hero);
    for (let i = 0; i < count; i++) {
      const c = this.make.player();
      const copy = hero === owner.hero;
      c.name = copy ? owner.name : def.name; // a copy carries the real name: nobody can tell them apart
      c.hero = hero;
      c.owner = ownerId;
      c.color = owner.color;
      // A turret is set down just ahead; the rest come out around him.
      const a = def.turret ? owner.aim : owner.aim + Math.PI / 2 + (i * Math.PI * 2) / count;
      const out = def.turret ? 30 : 20;
      const spot = this.move(owner.x + Math.cos(a) * out, owner.y + Math.sin(a) * out, 0, 0, PLAYER_RADIUS);
      c.x = spot.x;
      c.y = spot.y;
      c.aim = owner.aim;
      c.maxHp = copy ? owner.maxHp : Math.max(1, Math.round(owner.maxHp * hpShare));
      c.hp = copy ? Math.max(1, Math.round(owner.hp)) : c.maxHp;
      const id = `c${this.nextId++}`;
      this.state.players.set(id, c);
      const brain = this.newBrain();
      brain.cloneLife = life;
      brain.attackTimer = Math.random() * def.attackCooldown; // so a squad does not fire in lockstep
      this.brains.set(id, brain);
    }
  }

  private updateClone(id: string, c: P, brain: PlayerBrain, hero: HeroDef, dt: number) {
    const owner = this.state.players.get(c.owner);
    brain.cloneLife -= dt;
    // Helpers leave with their summoner: when time runs out, or when the summoner falls.
    // MITOSIS copies also vanish as soon as the real one turns back into a human.
    const formGone = !!hero.formOf && owner?.hero !== c.hero;
    if (!owner || owner.dead || brain.cloneLife <= 0 || c.dead || formGone) {
      this.removePlayer(id);
      return;
    }
    c.big = Math.max(0, c.big - dt);
    c.slow = Math.max(0, c.slow - dt);
    c.root = Math.max(0, c.root - dt);
    if (c.stun > 0) {
      // Stuns and freezes hold copies and summons too.
      c.stun = Math.max(0, c.stun - dt);
      return;
    }
    if (brain.decoy) {
      this.runDecoy(id, c, brain, owner, dt);
      return;
    }
    if (c.hero === owner.hero) c.disguise = owner.disguise; // the Trickster's copy wears the same disguise
    // Find something to fight: the nearest enemy, or a rival player in the arena.
    let tx = 0;
    let ty = 0;
    // A turret (THE QUEEN) sees as far as it shoots; everything else looks around itself.
    const sight = hero.turret ? hero.range : CLONE_SIGHT;
    let best = sight;
    this.state.enemies.forEach((e) => {
      if (ENEMIES[e.kind as EnemyKind].block) return;
      const r = ENEMIES[e.kind as EnemyKind].radius;
      const d = Math.hypot(e.x - c.x, e.y - c.y) - r;
      if (d < best) [best, tx, ty] = [d, e.x, e.y]; // measured to its edge, so melee helpers close in
    });
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid) || this.hidden(v, id)) return;
      const d = Math.hypot(v.x - c.x, v.y - c.y) - PLAYER_RADIUS;
      if (d < best) [best, tx, ty] = [d, v.x, v.y];
    });
    const melee = hero.attack === "sword" || hero.attack === "punch";
    let mx = 0;
    let my = 0;
    if (best < sight) {
      c.aim = Math.atan2(ty - c.y, tx - c.x);
      // Keep at casting distance.
      const want = melee ? (best > hero.range * 0.6 ? 1 : 0) : best > hero.range * 0.7 ? 1 : best < hero.range * 0.35 ? -1 : 0;
      mx = Math.cos(c.aim) * want;
      my = Math.sin(c.aim) * want;
      if (brain.attackTimer <= 0 && best <= hero.range) {
        brain.attackTimer = hero.attackCooldown * (hero.summon ? 1 : 1.3);
        c.attackSeq++;
        if (melee) this.sweep(id, c.x, c.y, c.aim, hero.range, hero.arc, hero.damage);
        else if (hero.attack === "lightning") this.sweep(id, tx, ty, 0, hero.aoe, Math.PI * 2, hero.damage); // a bolt right on the target
        else this.spawnBullet((hero.shot ?? "magic") as BulletKind, c.x, c.y, c.aim, hero.shotSpeed, { owner: id, damage: hero.damage, pierce: 0, life: hero.range / hero.shotSpeed, blast: hero.aoe });
      }
    } else {
      // Nothing to fight: stay close to Loki.
      const d = Math.hypot(owner.x - c.x, owner.y - c.y);
      if (d > 40) {
        mx = (owner.x - c.x) / d;
        my = (owner.y - c.y) / d;
        c.aim = Math.atan2(my, mx);
      }
    }
    // Spread out from the rest of the squad instead of piling onto one spot.
    this.state.players.forEach((q, qid) => {
      if (qid === id || q.owner !== c.owner) return;
      const dx = c.x - q.x;
      const dy = c.y - q.y;
      const d = Math.hypot(dx, dy);
      if (d >= SQUAD_SPACING) return;
      if (d < 0.01) [mx, my] = [mx + Math.random() - 0.5, my + Math.random() - 0.5];
      else [mx, my] = [mx + (dx / d) * (1 - d / SQUAD_SPACING) * 1.5, my + (dy / d) * (1 - d / SQUAD_SPACING) * 1.5];
    });
    if (hero.turret) [mx, my] = [0, 0]; // it stands where it was placed
    const len = Math.hypot(mx, my);
    if (len > 1) [mx, my] = [mx / len, my / len];
    const speed = heroSpeed(c); // BIG LIGHT and burns slow them as well
    const moved = this.move(c.x, c.y, mx * speed * dt, my * speed * dt, PLAYER_RADIUS);
    c.x = moved.x;
    c.y = moved.y;
    if (!this.royale && inLava(c.x, c.y, this.state.lavaRadius)) this.damagePlayer(id, LAVA_DPS * dt, true);
  }

  // --------------------------------------------------------------- zones

  private addZone(kind: string, x: number, y: number, radius: number, life: number, brain: { owner: string; every: number; damage: number }) {
    const z = this.make.zone();
    z.kind = kind;
    z.x = x;
    z.y = y;
    z.radius = radius;
    z.life = life;
    z.maxLife = life;
    const id = `z${this.nextId++}`;
    this.state.zones.set(id, z);
    this.zoneBrains.set(id, { ...brain, tick: 0 });
    return id;
  }

  private removeZone(id: string) {
    this.state.zones.delete(id);
    this.zoneBrains.delete(id);
  }

  private updateZones(dt: number, onlyOwner?: Set<string>) {
    const s = this.state;
    s.zones.forEach((z, id) => {
      const brain = this.zoneBrains.get(id);
      if (!brain || (onlyOwner && !onlyOwner.has(brain.owner))) return;
      z.life -= dt;
      brain.tick -= dt;
      if (brain.link) this.usePortal(id, z, brain.link, brain.owner);
      if (z.kind === "castle") this.walkCastle(z, brain, dt);
      if (z.kind === "frost") this.frostSigil(z, brain);
      if (z.kind === "jackbox") this.jackInTheBox(id, z, brain);
      if (brain.follow) {
        const o = s.players.get(brain.owner);
        if (o && !o.dead) [z.x, z.y] = [o.x, o.y];
      }
      if ((z.kind === "sticky" || z.kind === "whip" || z.kind === "petrify" || z.kind === "iceblock" || z.kind === "ignite" || z.kind === "possess") && brain.stick) {
        // The bomb rides along on whatever it is stuck to.
        const key = brain.stick;
        const v = key.startsWith("p:") ? s.players.get(key.slice(2)) : s.enemies.get(key);
        if (v && !(v as P).dead) [z.x, z.y] = [v.x, v.y];
      }
      if (brain.tick <= 0) {
        brain.tick += brain.every;
        if (z.kind === "totem") {
          // HEAL TOTEM: everyone on the healer's side near it heals a share of their max HP.
          s.players.forEach((q, qid) => {
            if (q.dead || Math.hypot(q.x - z.x, q.y - z.y) > z.radius) return;
            if (this.rootOf(qid) !== this.rootOf(brain.owner) && this.isFoe(brain.owner, qid)) return;
            this.healBy(q, q.maxHp * brain.damage);
          });
        } else if (brain.fxHit) {
          // A combo field: hurts (and slows, roots...) foes inside, heals friends inside.
          const fx = brain.fxHit;
          this.fxArea(brain.owner, (x, y, r) => Math.hypot(x - z.x, y - z.y) <= z.radius + r, fx, { x: z.x, y: z.y });
          if (fx.heal) {
            s.players.forEach((q, qid) => {
              if (q.dead || Math.hypot(q.x - z.x, q.y - z.y) > z.radius || this.isFoe(brain.owner, qid)) return;
              this.healBy(q, q.maxHp * fx.heal!);
            });
          }
        } else if (z.kind === "embers" || z.kind === "quake" || z.kind === "blizzard") {
          // Burning ground, a shaking quake, a snowstorm: everyone hostile inside is hurt (and slowed).
          this.sweep(brain.owner, z.x, z.y, 0, z.radius, Math.PI * 2, brain.damage);
          if (brain.slow) this.slowAround(brain.owner, z.x, z.y, z.radius, brain.slow);
        } else if (brain.lane) {
          const l = brain.lane;
          this.lineHit(brain.owner, l.x, l.y, l.angle, l.len, l.width, brain.damage);
        } else if (z.kind === "hurricane") {
          this.sweep(brain.owner, z.x, z.y, 0, z.radius, Math.PI * 2, brain.damage);
        } else if (z.kind === "asgard" || z.kind === "city") {
          if (z.kind === "city") {
            // Yaotsu heals inside their own city.
            const p = s.players.get(brain.owner);
            if (p && !p.dead && Math.hypot(p.x - z.x, p.y - z.y) <= z.radius) this.healBy(p, p.maxHp * brain.damage * brain.every);
          }
          // Everyone hostile inside the illusion loses a share of their max HP.
          const share = brain.damage * brain.every;
          s.enemies.forEach((e, eid) => {
            if (Math.hypot(e.x - z.x, e.y - z.y) <= z.radius) this.damageEnemy(eid, e.maxHp * share, brain.owner);
          });
          s.players.forEach((v, vid) => {
            if (!v.dead && this.isFoe(brain.owner, vid) && this.bodyDist(v, z.x, z.y) <= z.radius) {
              this.damagePlayer(vid, v.maxHp * share * PVP_DAMAGE_SCALE, true, brain.owner);
            }
          });
        }
      }
      if (z.life <= 0 && z.kind === "trojan") {
        // The horse bursts open: a huge blast that throws everything back.
        this.sweep(brain.owner, z.x, z.y, 0, z.radius, Math.PI * 2, brain.damage, 2.5);
        this.addZone("boom", z.x, z.y, z.radius, 0.5, { owner: brain.owner, every: Infinity, damage: 0 });
      }
      if (z.life <= 0 && z.kind === "palm") {
        // The palm lands: crushed, and stunned under it.
        this.sweep(brain.owner, z.x, z.y, 0, z.radius, Math.PI * 2, brain.damage);
        this.stunAround(brain.owner, z.x, z.y, z.radius, brain.stun ?? 2);
      }
      if (z.life <= 0 && z.kind === "sticky") this.stickyBlast(z, brain);
      if (z.life <= 0 && brain.ignite) {
        // The red shot's burn flares up once more.
        this.strike(brain.owner, brain.ignite, brain.damage);
        this.addZone("fx:burst:ff5020", z.x, z.y, 14, 0.35, { owner: brain.owner, every: Infinity, damage: 0 });
      }
      if (brain.cage) {
        // BIRDCAGE: those caught inside cannot walk out.
        for (const vid of brain.cage) {
          const v = s.players.get(vid);
          if (!v || v.dead) continue;
          const dx = v.x - z.x;
          const dy = v.y - z.y;
          const d = Math.hypot(dx, dy);
          const max = z.radius - PLAYER_RADIUS;
          if (d > max) [v.x, v.y] = [z.x + (dx / d) * max, z.y + (dy / d) * max];
        }
      }
      if (z.life <= 0 && brain.blast) this.landBlast(z, brain);
      if (z.life <= 0 && brain.fxEnd) {
        // A combo drop lands.
        this.fxArea(brain.owner, (x, y, r) => Math.hypot(x - z.x, y - z.y) <= z.radius + r, brain.fxEnd, { x: z.x, y: z.y });
        this.addZone(`fx:burst:${brain.fxEnd.color}`, z.x, z.y, z.radius, 0.45, { owner: brain.owner, every: Infinity, damage: 0 });
      }
      if (z.life <= 0 && z.kind === "truck") {
        // The truck lands: everything under it is crushed and thrown back.
        this.sweep(brain.owner, z.x, z.y, 0, z.radius, Math.PI * 2, brain.damage, 2);
      }
      if (z.life <= 0 || (brain.link && !s.zones.has(brain.link))) this.removeZone(id);
    });
  }
  /** Hit every enemy inside a slice of a circle (a punch, a sword swing, or a full circle). */
  /** `knock`: true for a normal melee knockback, a number for that many times as far, or "cut" to only cut down shots (basic attacks: no knockback). */
  private sweep(owner: string, x: number, y: number, aim: number, range: number, arc: number, damage: number, knock: boolean | number | "cut" = false, stun = 0) {
    const kb = knock === true ? 1 : knock === "cut" ? 0 : Number(knock) || 0;
    if (knock) this.cutBullets(owner, x, y, aim, range, arc);
    this.state.enemies.forEach((e, eid) => {
      const def = ENEMIES[e.kind as EnemyKind];
      const dx = e.x - x;
      const dy = e.y - y;
      if (Math.hypot(dx, dy) > range + this.er(e)) return;
      if (arc < Math.PI * 2) {
        let diff = Math.atan2(dy, dx) - aim;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > arc / 2) return;
      }
      this.damageEnemy(eid, damage, owner);
      if (stun > 0 && !def.boss && !def.block && this.state.enemies.has(eid)) e.stun = Math.max(e.stun, stun);
      if (kb && !def.boss && !def.block) this.knockEnemy(eid, dx, dy, kb);
    });
    if (!this.pvpLive()) return;
    this.state.players.forEach((v, vid) => {
      if (!this.isFoe(owner, vid) || v.dead) return;
      const at = this.bodyPoint(v, x, y);
      const dx = at.x - x;
      const dy = at.y - y;
      if (Math.hypot(dx, dy) > range + this.pr(v)) return;
      if (arc < Math.PI * 2) {
        let diff = Math.atan2(dy, dx) - aim;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > arc / 2) return;
      }
      this.damagePlayer(vid, damage * PVP_DAMAGE_SCALE, true, owner);
      if (stun > 0 && !v.dead) v.stun = Math.max(v.stun, stun);
      if (kb) this.knockPlayer(vid, dx, dy, kb);
    });
  }

  /** GATLING PUNCH: knock out hostile shots (and a rival's) anywhere in the punching lane. */
  private cutBulletsInLane(owner: string, x: number, y: number, aim: number, length: number, width: number) {
    const cos = Math.cos(aim);
    const sin = Math.sin(aim);
    const cut: string[] = [];
    this.state.bullets.forEach((b, id) => {
      const brain = this.bulletBrains.get(id);
      if (!brain || !(b.hostile || this.isFoe(brain.owner, owner))) return;
      const along = (b.x - x) * cos + (b.y - y) * sin;
      const side = Math.abs(-(b.x - x) * sin + (b.y - y) * cos);
      if (along < -BULLET_CUT_SLACK || along > length + BULLET_CUT_SLACK || side > width / 2 + BULLET_CUT_SLACK) return;
      cut.push(id);
    });
    for (const id of cut) {
      const b = this.state.bullets.get(id)!;
      this.addZone("parry", b.x, b.y, 10, 0.3, { owner, every: Infinity, damage: 0 });
      this.removeBullet(id);
    }
  }

  /** A melee swing also cuts down hostile shots (and, in PvP, a rival's shots) inside its arc. */
  private cutBullets(owner: string, x: number, y: number, aim: number, range: number, arc: number) {
    const cut: string[] = [];
    this.state.bullets.forEach((b, id) => {
      const brain = this.bulletBrains.get(id);
      if (!brain || !(b.hostile || this.isFoe(brain.owner, owner))) return;
      const dx = b.x - x;
      const dy = b.y - y;
      if (Math.hypot(dx, dy) > range + BULLET_CUT_SLACK) return;
      if (arc < Math.PI * 2) {
        let diff = Math.atan2(dy, dx) - aim;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > arc / 2) return;
      }
      cut.push(id);
    });
    for (const id of cut) {
      // A spark where the shot was knocked away, so the parry can be seen.
      const b = this.state.bullets.get(id)!;
      this.addZone("parry", b.x, b.y, 10, 0.3, { owner, every: Infinity, damage: 0 });
      this.removeBullet(id);
    }
  }

  /** Push an enemy away along (dx, dy). */
  private knockEnemy(eid: string, dx: number, dy: number, scale = 1) {
    const brain = this.enemyBrains.get(eid);
    if (!brain) return; // it died from the hit
    const d = Math.hypot(dx, dy) || 1;
    brain.kbx = (dx / d) * KNOCKBACK_DISTANCE * scale * KNOCKBACK_DECAY;
    brain.kby = (dy / d) * KNOCKBACK_DISTANCE * scale * KNOCKBACK_DECAY;
  }

  /**
   * Push a player away along (dx, dy). Real players move on their own device, so the push is sent
   * to it (kbSeq) and the server lets them move that much further; clones are pushed here.
   */
  private knockPlayer(id: string, dx: number, dy: number, scale = 1) {
    const p = this.state.players.get(id);
    const brain = this.brains.get(id);
    if (!p || !brain || p.dead) return;
    const d = Math.hypot(dx, dy) || 1;
    p.kbx = (dx / d) * KNOCKBACK_DISTANCE * scale * KNOCKBACK_DECAY;
    p.kby = (dy / d) * KNOCKBACK_DISTANCE * scale * KNOCKBACK_DECAY;
    p.kbSeq = (p.kbSeq + 1) % 256;
    brain.kbExtra = KNOCKBACK_DISTANCE * scale;
    brain.moveBudget += KNOCKBACK_DISTANCE * scale;
    if (p.owner || !brain.target) {
      brain.kbx = p.kbx;
      brain.kby = p.kby;
    }
  }

  /** True while players can hurt each other. */
  private pvpLive() {
    return this.ring && this.state.phase === "fight";
  }

  /** Heal a hero; healing is scaled down with damage (HERO_HIT_SCALE) in every mode so it keeps pace. */
  private healBy(q: P, amount: number) {
    q.hp = Math.min(q.maxHp, q.hp + amount * HERO_HIT_SCALE);
  }

  /** `pierce`: goes straight through armour, shields and immortality (ZOLTRAAK). */
  private damagePlayer(id: string, amount: number, ignoreIframes = false, attacker?: string, raw = false, pierce = false) {
    const p = this.state.players.get(id);
    const brain = this.brains.get(id);
    if (!p || !brain || p.dead || p.dashing) return;
    if (p.shield > 0) return; // fresh off the spawn: untouchable for a moment
    if (!pierce && (heroOf(p.hero).invincible || p.barrier > 0)) return;
    if (p.vanish > 0) return; // eaten (safe inside) or inside a foe
    if (attacker && attacker !== ENEMY && (p.domain > 0) !== (this.state.players.get(this.rootOf(attacker))?.domain ?? 0) > 0) return; // a domain shuts the world out
    if (brain.decoy && amount > 0) {
      // FAKE CLONE: one hit and it is gone.
      this.addZone("fx:puff:ffffff", p.x, p.y, 14, 0.4, { owner: id, every: Infinity, damage: 0 });
      this.removePlayer(id);
      return;
    }
    if (attacker && attacker !== ENEMY && !raw) amount *= this.dmgMul(attacker) * HERO_HIT_SCALE;
    // HARDEN: each stack takes a share off every hit.
    const hard = heroOf(p.hero).skill;
    if (hard.kind === "harden" && !raw && !pierce) amount *= Math.max(0, 1 - hard.damage * p.mode);
    const s2 = heroOf(p.hero).skill2;
    if (p.active2 > 0 && s2?.kind === "dive") return; // DRAGOON DIVE: high in the air, out of reach
    if (p.active2 > 0 && s2?.kind === "gaia" && !raw && !pierce) amount *= s2.width ?? 0.5; // GAIA SHELL
    if (p.buff > 0 && hard.kind === "rage" && !raw) amount *= RAGE_TAKEN; // BLOOD RAGE leaves him open
    if (!pierce)
      for (const b of fxBuffs(p)) {
        if (b.invuln) return;
        if (!raw) amount *= b.armor ?? 1;
      }
    // Under Yaotsu's reality change, ordinary humans hit for 1.
    if (this.state.reality > 0 && attacker && (attacker === ENEMY || this.isFoe(this.state.realityBy, attacker))) {
      amount = Math.min(amount, 1);
    }
    if (!ignoreIframes) {
      if (brain.hurtTimer > 0) return;
      brain.hurtTimer = HURT_IFRAMES;
    }
    this.leech(attacker, Math.min(p.hp, amount));
    this.noteHit(id, p, brain, attacker, Math.min(p.hp, amount));
    p.hp = Math.max(0, p.hp - amount);
    if (p.hp <= 0 && p.revive > 0 && !p.owner) {
      // REVIVE: back on his feet at once.
      p.revive = 0;
      p.hp = Math.round(p.maxHp * heroOf(p.hero).skill.damage);
      brain.hurtTimer = 1;
      this.addZone("revive", p.x, p.y, 40, 1, { owner: id, every: Infinity, damage: 0 });
      return;
    }
    if (p.hp <= 0) {
      if (p.owner) {
        // Clones just vanish, and are worth no kills.
        this.removePlayer(id);
        return;
      }
      p.dead = true;
      p.respawnIn = this.classic ? CLASSIC_RESPAWN : RESPAWN_TIME;
      const root = this.rootOf(attacker);
      const killer = root && root !== id ? this.state.players.get(root) : undefined;
      this.noteFall(id, p, brain, root);
      if (this.classic) {
        if (this.pvpLive()) this.classicKnockout(p, killer);
      } else if (this.state.stage === "pve") {
        if (this.pvpLive()) this.pveKnockout();
      } else if (killer && this.pvpLive()) {
        killer.score++;
        if (killer.score >= PVP_KILLS_TO_WIN) {
          this.state.phase = "victory";
          this.state.phaseTimer = 8;
          this.state.winner = killer.name;
        }
      }
      // PvP and Bot Duel: every knockout starts a fresh round (handled at the start of the next tick).
      if (this.ring && this.state.stage !== "pve" && !this.classic && this.state.phase === "fight") this.roundOver = true;
    }
  }

  /** Match scores: damage dealt and taken, and who helped bring this hero down. */
  private noteHit(id: string, p: P, brain: PlayerBrain, attacker: string | undefined, dealt: number) {
    if (dealt <= 0 || p.owner) return;
    p.taken += dealt;
    const root = attacker && attacker !== ENEMY ? this.rootOf(attacker) : "";
    const a = root && root !== id ? this.state.players.get(root) : undefined;
    if (!a) return;
    a.dealt += dealt;
    (brain.hitBy ??= new Map()).set(root, this.clock);
  }

  private noteFall(id: string, p: P, brain: PlayerBrain, killerId: string) {
    p.falls++;
    const killer = killerId && killerId !== id ? this.state.players.get(killerId) : undefined;
    if (killer) killer.kos++;
    brain.hitBy?.forEach((t, rid) => {
      const helper = this.state.players.get(rid);
      if (helper && rid !== killerId && rid !== id && this.clock - t <= ASSIST_WINDOW) helper.assists++;
    });
    brain.hitBy = undefined;
  }

  /** Classic 3v3 FINAL STAND: the last hero standing on a side, on their last life, gets +50% HP and damage. */
  private updateStands() {
    if (!this.classic || this.royale || !this.pvpLive()) return;
    for (const team of [1, 2]) {
      const left: P[] = [];
      this.state.players.forEach((q) => {
        if (!q.owner && q.team === team && (!q.dead || q.lives > 0)) left.push(q);
      });
      const last = left.length === 1 ? left[0] : undefined;
      if (!last || last.dead || last.stand || last.lives > 1) continue;
      last.stand = true;
      last.maxHp = Math.round(last.maxHp * FINAL_STAND_BOOST);
      last.hp = Math.round(last.hp * FINAL_STAND_BOOST);
      this.addZone("fx:shock:ffb020", last.x, last.y, 50, 1, { owner: this.idOf(last), every: Infinity, damage: 0 });
    }
  }

  /** FINAL STAND is over (a new match): back to the hero's own HP. */
  private endStand(p: P) {
    if (!p.stand) return;
    p.stand = false;
    p.maxHp = Math.round(p.maxHp / FINAL_STAND_BOOST);
    p.hp = Math.min(p.hp, p.maxHp);
  }

  /** Classic 3v3: a hero fell; the other team scores (whoever landed the blow), first to the target wins. */
  private classicKnockout(fallen: P, killer?: P) {
    const s = this.state;
    if (killer && killer.team !== fallen.team) killer.score++;
    if (this.royale) {
      fallen.lives = 0;
      this.royaleCheck();
      return;
    }
    if (fallen.team === 1) s.scoreB++;
    else s.scoreA++;
    fallen.lives = Math.max(0, fallen.lives - 1);
    // A team is out when every one of its heroes is down with no lives left.
    const standing: Record<number, number> = { 1: 0, 2: 0 };
    s.players.forEach((p) => {
      if (!p.owner && (p.lives > 0 || !p.dead)) standing[p.team] = (standing[p.team] ?? 0) + 1;
    });
    if (!standing[1] || !standing[2]) {
      s.phase = "victory";
      s.phaseTimer = 8;
      s.winner = standing[1] ? "RED" : standing[2] ? "BLUE" : "NO";
    } else this.updateStands();
  }

  /** Battle Royale: one hero (or nobody) left standing ends the match. */
  private royaleCheck() {
    const s = this.state;
    if (!this.pvpLive()) return;
    const standing: P[] = [];
    s.players.forEach((p) => {
      if (!p.owner && !p.late && !p.dead) standing.push(p);
    });
    if (standing.length > 1) return;
    s.phase = "victory";
    s.phaseTimer = 8;
    s.winner = standing[0]?.name ?? "NO";
  }

  /** Battle Royale: the storm ring closes in once the fight has gone on a while; outside it, heroes burn. */
  private updateRoyale(dt: number) {
    const s = this.state;
    this.royaleClock += dt;
    s.phaseTimer = this.royaleClock; // the HUD counts down to the storm from this
    s.lavaRadius = royaleRadius(this.royaleClock);
    this.royaleTick += dt;
    if (this.royaleTick >= 0.5) {
      this.royaleTick -= 0.5;
      const { x, y } = ROYALE_MAP.center;
      const burn: [string, P][] = [];
      s.players.forEach((p, id) => {
        if (!p.dead && Math.hypot(p.x - x, p.y - y) > s.lavaRadius) burn.push([id, p]);
      });
      for (const [id, p] of burn) this.damagePlayer(id, p.maxHp * ROYALE_BURN, true, undefined, true, true);
      // Heal pads on the four sides of the island.
      s.players.forEach((p) => {
        if (!p.dead && p.hp < p.maxHp && ROYALE_MAP.heals.some((h) => Math.hypot(p.x - h.x, p.y - h.y) <= ROYALE_HEAL_RADIUS)) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * ROYALE_HEAL);
      });
    }
    this.royaleCheck();
  }

  /** PvE Squad: someone fell. The round goes to the team when the bot is down, to the bot when every player is. */
  private pveKnockout() {
    const s = this.state;
    const bot = s.players.get("bot");
    const team: P[] = [];
    s.players.forEach((p, id) => {
      if (!p.owner && id !== "bot") team.push(p);
    });
    let won: P[] = [];
    if (bot?.dead) won = team;
    else if (bot && team.every((p) => p.dead)) won = [bot];
    if (!won.length) return;
    for (const p of won) p.score++;
    this.roundOver = true;
    if (won[0].score >= PVP_KILLS_TO_WIN) {
      s.phase = "victory";
      s.phaseTimer = 8;
      s.winner = won[0] === bot ? bot.name : "TEAM";
    }
  }

  /** The id this player is stored under. */
  private idOf(p: P): string {
    let found = "";
    this.state.players.forEach((q, id) => {
      if (q === p) found = id;
    });
    return found;
  }

  /** BAT FORM: the vampire drinks back a share of all the damage he deals. */
  private leech(attacker: string | undefined, dealt: number) {
    if (!attacker || attacker === ENEMY || dealt <= 0) return;
    const v = this.state.players.get(attacker);
    const bat = v && heroOf(v.hero).skill2;
    if (v && !v.dead) for (const b of fxBuffs(v)) if (b.leech) v.hp = Math.min(v.maxHp, v.hp + dealt * b.leech); // combo lifesteal
    if (!v || v.dead || v.active2 <= 0 || bat?.kind !== "bat") return;
    v.hp = Math.min(v.maxHp, v.hp + dealt * bat.damage);
  }

  private placeAtSpawn(p: P) {
    const s = this.state;
    if (s.stage === "tutorial") {
      [p.x, p.y] = [CENTER_X - 120, CENTER_Y];
      p.warp = (p.warp + 1) % 256;
      return;
    }
    if (s.stage === "world" || s.stage === "dungeon" || s.stage === "abyss" || s.stage === "heaven" || s.stage === "glitch") {
      const spot = s.stage === "world" ? OPEN_WORLD.spawn : s.stage === "abyss" ? ABYSS.spawn : s.stage === "heaven" ? HEAVEN.spawn : s.stage === "glitch" ? GLITCH.spawn : DUNGEON.spawn;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 40;
      const at = this.move(spot.x, spot.y, Math.cos(a) * r, Math.sin(a) * r, PLAYER_RADIUS);
      [p.x, p.y] = [at.x, at.y];
      p.warp = (p.warp + 1) % 256;
      return;
    }
    if (this.royale) {
      // Battle Royale: eight spots round the island, in join order.
      let mine = 0;
      let n = 0;
      this.state.players.forEach((q) => {
        if (q.owner) return;
        if (q === p) mine = n;
        n++;
      });
      const spot = ROYALE_MAP.spawns[1][mine % ROYALE_MAP.spawns[1].length];
      [p.x, p.y] = [spot.x, spot.y];
      p.warp = (p.warp + 1) % 256;
      return;
    }
    if (this.classic) {
      // Classic 3v3: each side has three spawn circles; take them in join order.
      const map = classicMap(this.state.map);
      const team = (p.team === 2 ? 2 : 1) as Team;
      let mine = -1;
      let n = 0;
      this.state.players.forEach((q) => {
        if (q.owner || q.team !== p.team) return;
        if (q === p) mine = n;
        n++;
      });
      if (mine < 0) mine = n;
      const spots = map.spawns[team];
      const spot = spots[mine % spots.length];
      [p.x, p.y] = [spot.x, spot.y];
      p.warp = (p.warp + 1) % 256;
      return;
    }
    let a = Math.random() * Math.PI * 2;
    if (this.ring) {
      // In the ring everyone has a fixed corner: the first fighter starts on the left, the second on the right.
      let index = 0;
      let seen = false;
      this.state.players.forEach((q) => {
        if (q.owner || seen) return;
        if (q === p) seen = true;
        else index++;
      });
      a = index === 0 ? Math.PI : index === 1 ? 0 : (index * Math.PI) / 2 + Math.PI / 4;
      if (this.state.stage === "pve") {
        // PvE Squad: the team lines up on the left, the bot waits in the right corner.
        if (p === this.state.players.get("bot")) a = 0;
        else {
          let team = 0;
          let mine = 0;
          this.state.players.forEach((q, qid) => {
            if (q.owner || qid === "bot") return;
            if (q === p) mine = team;
            team++;
          });
          if (!this.state.players.has(this.idOf(p))) mine = team++; // not stored yet: joins at the end of the line
          const spot = this.move(CENTER_X - 110, CENTER_Y + (mine - (team - 1) / 2) * 50, 0, 0, PLAYER_RADIUS);
          [p.x, p.y] = [spot.x, spot.y];
          p.warp = (p.warp + 1) % 256;
          return;
        }
      }
    }
    // In the arena, spread players out so nobody spawns on top of an enemy player.
    const r = this.ring ? 110 : 30;
    const spot = this.move(CENTER_X + Math.cos(a) * r, CENTER_Y + Math.sin(a) * r, 0, 0, PLAYER_RADIUS);
    p.x = spot.x;
    p.y = spot.y;
    p.warp = (p.warp + 1) % 256;
  }

  // ------------------------------------------------------------- enemies

  private spawnEnemy(kind: EnemyKind) {
    const def = ENEMIES[kind];
    const e = this.make.enemy();
    e.kind = kind;
    e.hp = def.hp * this.hpScale();
    e.maxHp = e.hp;
    if (ENEMIES[kind].boss) {
      e.x = CENTER_X;
      e.y = CENTER_Y - 170;
    } else {
      for (let tries = 0; tries < 20; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.min(this.state.lavaRadius, 340) * (0.7 + Math.random() * 0.25);
        e.x = Math.min(this.W - 20, Math.max(20, CENTER_X + Math.cos(a) * r));
        e.y = Math.min(this.H - 20, Math.max(20, CENTER_Y + Math.sin(a) * r));
        if (!this.blocked(e.x, e.y)) break;
      }
    }
    const id = `e${this.nextId++}`;
    this.state.enemies.set(id, e);
    this.enemyBrains.set(id, { shootTimer: (def.shootEvery ?? 0) * Math.random() + 1, burstAngle: 0, beamTimer: 3, kbx: 0, kby: 0 });
  }

  private damageEnemy(eid: string, damage: number, owner?: string, pierce = false) {
    const e = this.state.enemies.get(eid);
    if (!e) return;
    const killer = this.state.players.get(this.rootOf(owner));
    if (e.kind === "knight" && e.move === 3 && e.beamState === 2) return; // in the air: nothing reaches him
    if (e.kind === "cthulhu" && e.move === 4 && e.beamState === 2) return; // Cthulhu in the air too
    if (e.kind === "knight" && e.move === 5 && e.beamState === 2 && killer && !pierce) {
      // Shield up: blows from the front glance off.
      let diff = Math.atan2(killer.y - e.y, killer.x - e.x) - e.beamAngle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) < ANCIENT_KNIGHT.guard.arc / 2) damage *= ANCIENT_KNIGHT.guard.cut;
    }
    // Heroes hit monsters exactly as softly as they hit each other (HERO_DAMAGE_SCALE).
    const dealt = damage * this.dmgMul(owner) * (killer ? HERO_DAMAGE_SCALE : 1);
    this.leech(owner, Math.min(Math.max(0, e.hp), dealt));
    e.hp -= dealt;
    e.hitFlash = 0.1;
    if (e.hp <= 0) {
      const brain = this.enemyBrains.get(eid);
      this.state.enemies.delete(eid);
      this.enemyBrains.delete(eid);
      if (killer) killer.score += ENEMIES[e.kind as EnemyKind].score;
      if (ENEMIES[e.kind as EnemyKind].block) this.breakBlock(e, brain?.owner ?? "", owner);
    }
  }

  /** BUILD: drop a random block (dirt wall, TNT or crafting table) where the Block Crafter aimed. */
  private placeBlock(id: string, p: P, skill: SkillDef) {
    const spot = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, 8);
    const kinds: EnemyKind[] = ["dirtblock", "tntblock", "craftblock"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    // Only so many at once: the oldest one crumbles.
    const mine: string[] = [];
    this.enemyBrains.forEach((b, eid) => {
      if (b.owner === id) mine.push(eid);
    });
    while (mine.length >= MAX_BLOCKS) {
      const old = mine.shift()!;
      this.state.enemies.delete(old);
      this.enemyBrains.delete(old);
    }
    const e = this.make.enemy();
    e.kind = kind;
    e.hp = e.maxHp = 1;
    e.x = spot.x;
    e.y = spot.y;
    const eid = `e${this.nextId++}`;
    this.state.enemies.set(eid, e);
    this.enemyBrains.set(eid, { shootTimer: 999, burstAngle: 0, beamTimer: 999, kbx: 0, kby: 0, owner: id });
    this.addZone("build", spot.x, spot.y, 10, 0.3, { owner: id, every: Infinity, damage: 0 });
  }

  /** A block was broken: TNT blows up, and a crafting table broken by its builder doubles his damage for good. */
  private breakBlock(e: E, builder: string, breaker?: string) {
    if (e.kind === "tntblock") {
      this.addZone("boom", e.x, e.y, TNT_RADIUS, 0.45, { owner: builder, every: Infinity, damage: 0 });
      const p = this.state.players.get(builder);
      const dmg = p ? heroOf(p.hero).skill2?.damage ?? 90 : 90;
      this.sweep(builder, e.x, e.y, 0, TNT_RADIUS, Math.PI * 2, dmg, TNT_KNOCK);
    } else if (e.kind === "craftblock" && builder && this.rootOf(breaker) === builder) {
      const p = this.state.players.get(builder);
      if (p && !p.dead) {
        p.power = 2;
        this.addZone("craftbuff", p.x, p.y, 30, 1, { owner: builder, every: Infinity, damage: 0 });
      }
    }
  }

  /** More players means tougher enemies. */
  private hpScale() {
    return 1 + 0.5 * Math.max(0, this.realPlayerCount() - 1);
  }

  private nearestPlayer(x: number, y: number): [string, P] | undefined {
    let best: [string, P] | undefined;
    let bestDist = Infinity;
    this.state.players.forEach((p, id) => {
      if (p.dead || this.hidden(p)) return;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = [id, p];
      }
    });
    return best;
  }

  /**
   * Dungeon monsters wait where they stand until a hero comes close and in sight, then hunt
   * along the corridors. Returns true while it is asleep or walking round a wall this tick.
   */
  private dungeonEnemy(e: E, brain: EnemyBrain, def: (typeof ENEMIES)[EnemyKind], p: P, dist: number, dt: number): boolean {
    if (!brain.awake) {
      if (dist > DUNGEON_AGGRO || !mapLineClear(DUNGEON, e.x, e.y, p.x, p.y)) return true;
      brain.awake = true;
      // Waking one wakes its friends close by.
      this.state.enemies.forEach((o) => {
        const ob = this.enemyBrains.get(this.enemyId(o));
        if (ob && !ob.awake && Math.hypot(o.x - e.x, o.y - e.y) < 140) ob.awake = true;
      });
    }
    if (mapLineClear(DUNGEON, e.x, e.y, p.x, p.y)) return false; // in sight: the usual chase and shooting
    const to = Math.floor(p.x / BLOCK) + Math.floor(p.y / BLOCK) * 1000;
    brain.pathTimer = (brain.pathTimer ?? 0) - dt;
    if (!brain.path || brain.pathTo !== to || brain.pathTimer <= 0) [brain.path, brain.pathTo, brain.pathTimer] = [distanceField(DUNGEON, p.x, p.y), to, 0.6];
    const step = stepAlong(brain.path, e.x, e.y, DUNGEON);
    const speed = e.root > 0 ? 0 : def.speed * MOVE_SCALE * (e.big > 0 ? BIG_SLOW : 1) * (e.slow > 0 ? BURN_SLOW : 1);
    const moved = this.move(e.x, e.y, step.x * speed * dt, step.y * speed * dt, def.radius);
    [e.x, e.y] = [moved.x, moved.y];
    return true;
  }

  private enemyId(e: E): string {
    let found = "";
    this.state.enemies.forEach((o, id) => {
      if (o === e) found = id;
    });
    return found;
  }

  private updateEnemies(dt: number) {
    this.state.enemies.forEach((e, id) => {
      const def = ENEMIES[e.kind as EnemyKind];
      const brain = this.enemyBrains.get(id)!;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.big = Math.max(0, e.big - dt);
      e.slow = Math.max(0, e.slow - dt);
      e.root = Math.max(0, e.root - dt);
      if (def.block) return; // blocks just sit there
      if (Math.abs(brain.kbx) + Math.abs(brain.kby) > 1) {
        const pushed = this.move(e.x, e.y, brain.kbx * dt, brain.kby * dt, def.radius);
        e.x = pushed.x;
        e.y = pushed.y;
        const fade = Math.exp(-KNOCKBACK_DECAY * dt);
        brain.kbx *= fade;
        brain.kby *= fade;
      }
      if (e.stun > 0) {
        e.stun = Math.max(0, e.stun - dt);
        return; // seeing stars
      }
      const target = this.nearestPlayer(e.x, e.y);
      if (!target) return;
      const [targetId, p] = target;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (this.state.stage === "dungeon" && this.dungeonEnemy(e, brain, def, p, dist, dt)) return;

      const human = this.state.reality > 0;
      if (human) {
        // ordinary humans have no atomic breath or sword arts
        e.beamState = 0;
        e.move = 0;
      }
      if (e.kind === "godzilla" && !human && this.updateBeam(e, brain, dx, dy, dt)) {
        if (dist < def.radius + PLAYER_RADIUS) this.damagePlayer(targetId, def.touchDamage, false, ENEMY);
        return;
      }
      if (e.kind === "kingkong" && !human && this.updateCharge(e, brain, dx, dy, dt)) return;
      if (e.kind === "swordgod" && !human && this.updateSwordGod(e, brain, dx, dy, dist, dt)) return;
      if (e.kind === "knight" && !human && this.updateKnight(e, brain, p, dx, dy, dist, dt)) return;
      if (e.kind === "cthulhu" && !human && this.updateCthulhu(e, brain, dx, dy, dist, dt)) return;
      if (e.kind === "godknight") return; // stands still for now (his moves come later)

      // Ranged enemies keep their distance; everyone else charges.
      let dirX = dx / dist;
      let dirY = dy / dist;
      const keepAway = e.kind === "caster" ? 110 : def.keepAway ?? 0;
      if (dist < keepAway) {
        dirX = -dirX;
        dirY = -dirY;
      }
      const speed = e.root > 0 ? 0 : def.speed * MOVE_SCALE * (e.big > 0 ? BIG_SLOW : 1) * (e.slow > 0 ? BURN_SLOW : 1);
      const moved = this.move(e.x, e.y, dirX * speed * dt, dirY * speed * dt, def.radius);
      const walled = this.blockAt(moved.x, moved.y, def.radius);
      if (!walled) {
        e.x = moved.x;
        e.y = moved.y;
      }

      if (dist < def.radius + PLAYER_RADIUS) this.damagePlayer(targetId, def.touchDamage, false, ENEMY);

      if (def.shootEvery && !human) {
        brain.shootTimer -= dt;
        if (brain.shootTimer <= 0) {
          brain.shootTimer = def.shootEvery;
          const aim = Math.atan2(dy, dx);
          const shot = { damage: def.shotDamage ?? ENEMY_SHOT_DAMAGE, pierce: 0, life: 6 };
          if (e.kind === "godzilla") {
            // A fan of atomic fireballs between beams.
            for (let i = -2; i <= 2; i++) this.spawnBullet("enemy", e.x, e.y, aim + i * 0.22, ENEMY_SHOT_SPEED * 1.1, shot);
          } else if (e.kind === "warden") {
            // Rotating ring of fire plus a shot aimed at the target.
            brain.burstAngle += 0.25;
            for (let i = 0; i < 14; i++) {
              this.spawnBullet("enemy", e.x, e.y, brain.burstAngle + (i * Math.PI * 2) / 14, ENEMY_SHOT_SPEED * 0.8, shot);
            }
            for (const off of [-0.15, 0, 0.15]) this.spawnBullet("enemy", e.x, e.y, aim + off, ENEMY_SHOT_SPEED * 1.3, shot);
          } else if (e.kind === "kingkong") {
            // Three boulders hurled in a spread.
            for (const off of [-0.25, 0, 0.25]) this.spawnBullet("boulder", e.x, e.y, aim + off, ENEMY_SHOT_SPEED * 1.2, shot);
          } else {
            this.spawnBullet(def.shot ?? "enemy", e.x, e.y, aim, ENEMY_SHOT_SPEED * (def.shot === "banana" ? 1.15 : def.shot === "slash" ? 1.6 : 1), shot);
          }
        }
      }
    });
  }

  /**
   * The Sword God. Rests (chasing) between moves, then picks one that suits the distance:
   * far away a dash or a fan of flying slashes, up close a spin or a flurry of cuts.
   * Each move winds up first (beamState 1) so it can be dodged, then strikes (beamState 2).
   * Returns true while a move is underway.
   */
  private updateSwordGod(e: E, brain: EnemyBrain, dx: number, dy: number, dist: number, dt: number): boolean {
    const def = ENEMIES[e.kind as EnemyKind];
    brain.beamTimer -= dt;
    if (e.beamState === 0) {
      if (brain.beamTimer > 0) return false;
      const far = dist > 150;
      const pick = far ? (Math.random() < 0.55 ? 1 : 3) : Math.random() < 0.5 ? 2 : 4;
      e.move = Math.random() < 0.15 ? 1 + Math.floor(Math.random() * 4) : pick; // sometimes a surprise
      e.beamState = 1;
      e.beamAngle = Math.atan2(dy, dx);
      brain.beamTimer = [0, SWORD_GOD.dash.windup, SWORD_GOD.whirl.windup, SWORD_GOD.waves.windup, SWORD_GOD.flurry.windup][e.move];
      return true;
    }
    if (e.beamState === 1) {
      // Keep tracking the target a little during the wind-up, except for the dash (its lane is locked).
      if (e.move !== 1) e.beamAngle = Math.atan2(dy, dx);
      if (brain.beamTimer > 0) return true;
      e.beamState = 2;
      brain.hit = new Set();
      brain.beamTimer = [0, SWORD_GOD.dash.active, SWORD_GOD.whirl.active, SWORD_GOD.waves.active, SWORD_GOD.flurry.active][e.move];
      if (e.move === 2) this.swordGodCut(e, brain, SWORD_GOD.whirl.radius, Math.PI * 2, SWORD_GOD.whirl.damage);
      if (e.move === 3) {
        const w = SWORD_GOD.waves;
        const shot = { damage: w.damage, pierce: 0, life: 2.5 };
        for (let i = 0; i < w.count; i++) {
          this.spawnBullet("slash", e.x, e.y, e.beamAngle + (i - (w.count - 1) / 2) * w.spread, w.speed, shot);
        }
      }
      if (e.move === 4) {
        brain.cutsLeft = SWORD_GOD.flurry.cuts;
        brain.cutTimer = 0;
      }
      return true;
    }
    // Striking.
    if (e.move === 1) {
      const d = SWORD_GOD.dash;
      const moved = this.move(e.x, e.y, Math.cos(e.beamAngle) * d.speed * dt, Math.sin(e.beamAngle) * d.speed * dt, def.radius);
      e.x = moved.x;
      e.y = moved.y;
      this.swordGodCut(e, brain, def.radius + d.width / 2, Math.PI * 2, d.damage);
    } else if (e.move === 4) {
      const f = SWORD_GOD.flurry;
      brain.cutTimer = (brain.cutTimer ?? 0) - dt;
      if ((brain.cutsLeft ?? 0) > 0 && brain.cutTimer <= 0) {
        brain.cutsLeft = (brain.cutsLeft ?? 0) - 1;
        brain.cutTimer = f.active / f.cuts;
        brain.hit = new Set(); // every cut can land
        e.beamAngle = Math.atan2(dy, dx);
        const moved = this.move(e.x, e.y, Math.cos(e.beamAngle) * f.lunge, Math.sin(e.beamAngle) * f.lunge, def.radius);
        e.x = moved.x;
        e.y = moved.y;
        this.swordGodCut(e, brain, f.range, f.arc, f.damage);
      }
    }
    if (brain.beamTimer <= 0) {
      e.beamState = 0;
      e.move = 0;
      brain.beamTimer = SWORD_GOD.rest;
    }
    return true;
  }

  /**
   * The Ancient Knight. Walks after you between moves, then picks one that suits the distance:
   * close in, the overhead cleave, the wide sweep or his shield; further off, the leap or a summons.
   * Each move winds up (beamState 1) so it can be dodged, then strikes (beamState 2).
   * Returns true while a move is underway.
   */
  private updateKnight(e: E, brain: EnemyBrain, p: P, dx: number, dy: number, dist: number, dt: number): boolean {
    const K = ANCIENT_KNIGHT;
    const def = ENEMIES.knight;
    brain.beamTimer -= dt;
    if (e.beamState === 0) {
      if (brain.beamTimer > 0) return false;
      let minions = 0;
      this.state.enemies.forEach((o) => {
        if (o.kind === "stonecrawler" || o.kind === "stonewisp") minions++;
      });
      const r = Math.random();
      if (dist > 150) e.move = r < 0.55 && dist < K.leap.range ? 3 : minions < K.summon.max && r < 0.85 ? 4 : 1;
      else e.move = r < 0.4 ? 1 : r < 0.75 ? 2 : r < 0.88 || minions >= K.summon.max ? 5 : 4;
      e.beamState = 1;
      e.beamAngle = Math.atan2(dy, dx);
      brain.beamTimer = [0, K.cleave.windup, K.sweep.windup, K.leap.windup, K.summon.windup, K.guard.windup][e.move];
      if (e.move === 3) {
        // Where he will come down: on you, as far as he can jump.
        const reach = Math.min(dist, K.leap.range);
        const spot = this.move(e.x, e.y, (dx / dist) * reach, (dy / dist) * reach, def.radius);
        brain.leapTo = { x: spot.x, y: spot.y };
        this.addZone("knightmark", spot.x, spot.y, K.leap.radius, K.leap.windup + K.leap.air, { owner: "", every: Infinity, damage: 0 });
      }
      return true;
    }
    if (e.beamState === 1) {
      // The cleave and the sweep keep turning to you while he winds up; the leap is locked on its spot.
      if (e.move === 1 || e.move === 2 || e.move === 5) e.beamAngle = Math.atan2(dy, dx);
      if (brain.beamTimer > 0) return true;
      e.beamState = 2;
      brain.hit = new Set();
      brain.beamTimer = [0, K.cleave.active, K.sweep.active, K.leap.air, K.summon.active, K.guard.active][e.move];
      if (e.move === 1) this.knightLane(e, brain, K.cleave.length, K.cleave.width, K.cleave.damage);
      if (e.move === 2) {
        this.swordGodCut(e, brain, K.sweep.radius, K.sweep.arc, K.sweep.damage);
        brain.hit.forEach((pid) => {
          const v = this.state.players.get(pid);
          if (v) this.knockPlayer(pid, v.x - e.x, v.y - e.y, K.sweep.knock);
        });
      }
      if (e.move === 4) this.knightSummon(e);
      return true;
    }
    // Striking.
    if (e.move === 3 && brain.leapTo) {
      // In the air, gliding to the spot; he lands when the time runs out.
      const left = Math.max(brain.beamTimer, dt);
      const k = Math.min(1, dt / left);
      e.x += (brain.leapTo.x - e.x) * k;
      e.y += (brain.leapTo.y - e.y) * k;
    }
    if (e.move === 5) {
      // Shield up: turn to face you, edging forward slowly.
      e.beamAngle = Math.atan2(dy, dx);
      const moved = this.move(e.x, e.y, (dx / dist) * def.speed * 0.4 * MOVE_SCALE * dt, (dy / dist) * def.speed * 0.4 * MOVE_SCALE * dt, def.radius);
      [e.x, e.y] = [moved.x, moved.y];
    }
    if (brain.beamTimer <= 0) {
      if (e.move === 3) {
        // Landing: the ground bursts all around him.
        brain.hit = new Set();
        this.swordGodCut(e, brain, K.leap.radius, Math.PI * 2, K.leap.damage);
        brain.hit.forEach((pid) => {
          const v = this.state.players.get(pid);
          if (v && !v.dead) v.stun = Math.max(v.stun, K.leap.stun);
        });
        brain.leapTo = undefined;
      }
      e.beamState = 0;
      e.move = 0;
      brain.beamTimer = K.rest;
    }
    return true;
  }

  /**
   * Cthulhu (2026-10-08). Sleeps until a hero comes near, then walks after you between moves and picks one
   * that suits the distance: tentacle lash, beam of madness, tidal wave, leap, elder sigils or poison miasma.
   * Once, at low health, he roars and goes mad (faster moves from then on). No minions.
   * Returns true while he is busy (asleep or in a move).
   */
  private updateCthulhu(e: E, brain: EnemyBrain, dx: number, dy: number, dist: number, dt: number): boolean {
    const K = CTHULHU;
    const def = ENEMIES.cthulhu;
    const c = (brain.cth ??= { sigils: [], clouds: [], mad: false, last: 0 });
    this.cthulhuHazards(c, dt);
    if (brain.awake === false) {
      if (dist > 380 && e.hp >= e.maxHp) return true;
      brain.awake = true;
      brain.beamTimer = 0.8;
      this.state.notice = "CTHULHU HAS AWOKEN";
    }
    brain.beamTimer -= dt;
    if (e.beamState === 0) {
      if (this.state.notice === "CTHULHU HAS AWOKEN" && brain.beamTimer < -2) this.state.notice = "";
      if (brain.beamTimer > 0) return false;
      const r = Math.random();
      let move: number;
      if (!c.mad && e.hp < e.maxHp * K.madness.below) move = 7;
      else if (dist < 150) move = r < 0.42 ? 1 : r < 0.6 ? 6 : r < 0.78 ? 5 : 3;
      else move = r < 0.3 ? 2 : r < 0.5 ? 3 : r < 0.7 && dist < K.leap.range ? 4 : r < 0.88 ? 5 : 6;
      if (move === c.last && move !== 7) move = move === 2 ? 3 : 2; // never the same move twice in a row
      c.last = move;
      e.move = move;
      e.beamState = 1;
      e.beamAngle = Math.atan2(dy, dx);
      brain.beamTimer = [0, K.lash.windup, K.beam.windup, K.wave.windup, K.leap.windup, K.sigil.windup, K.gas.windup, K.madness.windup][move];
      if (move === 4) {
        const reach = Math.min(dist, K.leap.range);
        const spot = this.move(e.x, e.y, (dx / dist) * reach, (dy / dist) * reach, def.radius);
        brain.leapTo = { x: spot.x, y: spot.y };
        this.addZone("cthmark", spot.x, spot.y, K.leap.radius, K.leap.windup + K.leap.air, { owner: "", every: Infinity, damage: 0 });
      }
      if (move === 5) {
        // Sigils light up under every hero (and a few more near them).
        const spots: { x: number; y: number }[] = [];
        this.state.players.forEach((p) => {
          if (!p.owner && !p.dead) spots.push({ x: p.x, y: p.y });
        });
        while (spots.length && spots.length < K.sigil.count) {
          const base = spots[Math.floor(Math.random() * spots.length)];
          const a = Math.random() * Math.PI * 2;
          spots.push({ x: base.x + Math.cos(a) * K.sigil.spread, y: base.y + Math.sin(a) * K.sigil.spread });
        }
        for (const sp of spots) {
          c.sigils.push({ x: sp.x, y: sp.y, t: K.sigil.windup + K.sigil.fuse });
          this.addZone("cthsigil", sp.x, sp.y, K.sigil.radius, K.sigil.windup + K.sigil.fuse, { owner: "", every: Infinity, damage: 0 });
        }
      }
      return true;
    }
    if (e.beamState === 1) {
      if (e.move === 1 || e.move === 2 || e.move === 3) e.beamAngle = Math.atan2(dy, dx); // turns to follow you while winding up
      if (e.move === 2 && brain.beamTimer < 0.3) e.beamAngle = e.beamAngle; // the last moment it locks
      if (brain.beamTimer > 0) return true;
      e.beamState = 2;
      brain.hit = new Set();
      brain.beamTimer = [0, K.lash.active, K.beam.active, K.wave.active, K.leap.air, 0.4, K.gas.active, K.madness.active][e.move];
      if (e.move === 1) {
        this.knightLane(e, brain, K.lash.length, K.lash.width, K.lash.damage);
        brain.hit.forEach((pid) => {
          const v = this.state.players.get(pid);
          if (v) this.knockPlayer(pid, v.x - e.x, v.y - e.y, K.lash.knock);
        });
      }
      if (e.move === 3) {
        const zone = this.addZone(`cthwave:${e.beamAngle.toFixed(2)}`, e.x, e.y, K.wave.width / 2, K.wave.active, { owner: "", every: Infinity, damage: 0 });
        c.wave = { x: e.x, y: e.y, aim: e.beamAngle, dist: 20, zone };
      }
      if (e.move === 6) {
        for (let i = 0; i < K.gas.clouds; i++) {
          const a = e.beamAngle + (i - (K.gas.clouds - 1) / 2) * 0.55;
          const d = 60 + Math.random() * K.gas.spread;
          const at = this.move(e.x, e.y, Math.cos(a) * d, Math.sin(a) * d, 4);
          c.clouds.push({ x: at.x, y: at.y, t: K.gas.life, tick: 0 });
          this.addZone("cthgas", at.x, at.y, K.gas.radius, K.gas.life, { owner: "", every: Infinity, damage: 0 });
        }
      }
      if (e.move === 7) {
        c.mad = true;
        this.swordGodCut(e, brain, K.madness.radius, Math.PI * 2, K.madness.damage);
        brain.hit.forEach((pid) => {
          const v = this.state.players.get(pid);
          if (v) this.knockPlayer(pid, v.x - e.x, v.y - e.y, 2.5);
        });
        this.state.notice = "CTHULHU HAS GONE MAD";
      }
      return true;
    }
    // Striking.
    if (e.move === 2) {
      // The beam burns everyone in its line, stopped by walls and pillars.
      const len = beamReach(e.x, e.y, e.beamAngle, K.beam.length, this.area);
      this.cthulhuLane(e, brain, e.y, len, K.beam.width, K.beam.damage);
    }
    if (e.move === 4 && brain.leapTo) {
      const left = Math.max(brain.beamTimer, dt);
      const k = Math.min(1, dt / left);
      e.x += (brain.leapTo.x - e.x) * k;
      e.y += (brain.leapTo.y - e.y) * k;
    }
    if (brain.beamTimer <= 0) {
      if (e.move === 4) {
        brain.hit = new Set();
        this.swordGodCut(e, brain, K.leap.radius, Math.PI * 2, K.leap.damage);
        brain.hit.forEach((pid) => {
          const v = this.state.players.get(pid);
          if (v && !v.dead) v.stun = Math.max(v.stun, K.leap.stun);
        });
        brain.leapTo = undefined;
      }
      e.beamState = 0;
      e.move = 0;
      brain.beamTimer = K.rest * (c.mad ? 0.6 : 1);
      if (this.state.notice === "CTHULHU HAS GONE MAD") this.state.notice = "";
    }
    return true;
  }

  /** Cthulhu's beam: everyone in the lane from him out to `len`. */
  private cthulhuLane(e: E, brain: EnemyBrain, fromY: number, len: number, width: number, damage: number) {
    const cos = Math.cos(e.beamAngle);
    const sin = Math.sin(e.beamAngle);
    this.state.players.forEach((p, pid) => {
      if (p.dead || brain.hit?.has(pid)) return;
      const along = (p.x - e.x) * cos + (p.y - fromY) * sin;
      const side = Math.abs(-(p.x - e.x) * sin + (p.y - fromY) * cos);
      if (along < 0 || along > len || side > width / 2 + PLAYER_RADIUS) return;
      brain.hit?.add(pid);
      this.damagePlayer(pid, damage, true, ENEMY);
    });
  }

  /** What Cthulhu leaves behind: the rolling wave, the sigils about to burst and the poison clouds. */
  private cthulhuHazards(c: NonNullable<EnemyBrain["cth"]>, dt: number) {
    const K = CTHULHU;
    const hitAll = (test: (p: P) => boolean, damage: number, knock?: { x: number; y: number; k: number }) => {
      this.state.players.forEach((p, pid) => {
        if (p.dead || p.owner || !test(p)) return;
        this.damagePlayer(pid, damage, true, ENEMY);
        if (knock) this.knockPlayer(pid, knock.x, knock.y, knock.k);
      });
    };
    if (c.wave) {
      const w = c.wave;
      const before = w.dist;
      w.dist += K.wave.speed * dt;
      const cos = Math.cos(w.aim);
      const sin = Math.sin(w.aim);
      const zx = w.x + cos * w.dist;
      const zy = w.y + sin * w.dist;
      const z = this.state.zones.get(w.zone);
      if (z) [z.x, z.y] = [zx, zy];
      // Everyone the wave's front passes over this frame.
      hitAll((p) => {
        const along = (p.x - w.x) * cos + (p.y - w.y) * sin;
        const side = Math.abs(-(p.x - w.x) * sin + (p.y - w.y) * cos);
        return along > before - 14 && along <= w.dist + 14 && side < K.wave.width / 2;
      }, K.wave.damage, { x: cos, y: sin, k: K.wave.knock });
      if (!z || hitsRock(zx, zy, this.area) && w.dist > 200) {
        if (z) this.removeZone(w.zone);
        c.wave = undefined;
      }
    }
    for (const sg of c.sigils) {
      sg.t -= dt;
      if (sg.t <= 0) {
        hitAll((p) => Math.hypot(p.x - sg.x, p.y - sg.y) < K.sigil.radius + PLAYER_RADIUS, K.sigil.damage);
        this.addZone("cthburst", sg.x, sg.y, K.sigil.radius, 0.5, { owner: "", every: Infinity, damage: 0 });
      }
    }
    c.sigils = c.sigils.filter((sg) => sg.t > 0);
    for (const cl of c.clouds) {
      cl.t -= dt;
      cl.tick -= dt;
      if (cl.tick <= 0) {
        cl.tick = K.gas.tick;
        hitAll((p) => Math.hypot(p.x - cl.x, p.y - cl.y) < K.gas.radius, K.gas.damage);
      }
    }
    c.clouds = c.clouds.filter((cl) => cl.t > 0);
  }

  /** The Ancient Knight's overhead cleave: everyone in the lane in front of him. */
  private knightLane(e: E, brain: EnemyBrain, length: number, width: number, damage: number) {
    const cos = Math.cos(e.beamAngle);
    const sin = Math.sin(e.beamAngle);
    this.state.players.forEach((p, pid) => {
      if (p.dead || brain.hit?.has(pid)) return;
      const along = (p.x - e.x) * cos + (p.y - e.y) * sin;
      const side = Math.abs(-(p.x - e.x) * sin + (p.y - e.y) * cos);
      if (along < -10 || along > length || side > width / 2 + PLAYER_RADIUS) return;
      brain.hit?.add(pid);
      this.damagePlayer(pid, damage, true, ENEMY);
    });
  }

  /** The Ancient Knight calls Stone Crawlers and a Stone Wisp up out of the ground around him. */
  private knightSummon(e: E) {
    const K = ANCIENT_KNIGHT.summon;
    const kinds: EnemyKind[] = [...Array(K.crawlers).fill("stonecrawler"), ...Array(K.wisps).fill("stonewisp")];
    kinds.forEach((kind, i) => {
      const a = e.beamAngle + Math.PI / 2 + (i * Math.PI * 2) / kinds.length;
      const spot = this.move(e.x, e.y, Math.cos(a) * 46, Math.sin(a) * 46, ENEMIES[kind].radius);
      this.spawnEnemyAt(kind, spot.x, spot.y);
      // spawnEnemyAt leaves dungeon monsters asleep; these come out fighting.
      let lastId = "";
      this.state.enemies.forEach((_o, id) => (lastId = id));
      const b = this.enemyBrains.get(lastId);
      if (b) b.awake = true;
    });
  }

  /** One Sword God cut: hits each player in range (and arc) once per strike. Dashing dodges it. */
  private swordGodCut(e: E, brain: EnemyBrain, range: number, arc: number, damage: number) {
    this.state.players.forEach((p, pid) => {
      if (p.dead || brain.hit?.has(pid)) return;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      if (Math.hypot(dx, dy) > range + PLAYER_RADIUS) return;
      if (arc < Math.PI * 2) {
        let diff = Math.atan2(dy, dx) - e.beamAngle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > arc / 2) return;
      }
      brain.hit?.add(pid);
      this.damagePlayer(pid, damage, true, ENEMY);
    });
  }

  /**
   * King Kong's charge. Returns true while busy. Idle -> winding up (beamState 1, a warning lane
   * toward the target) -> charging along that lane (beamState 2), trampling anyone in the way.
   */
  private updateCharge(e: E, brain: EnemyBrain, dx: number, dy: number, dt: number): boolean {
    brain.beamTimer -= dt;
    if (e.beamState === 0) {
      if (brain.beamTimer > 0) return false;
      e.beamState = 1;
      e.beamAngle = Math.atan2(dy, dx);
      brain.beamTimer = KONG_CHARGE_WINDUP;
      return true;
    }
    if (e.beamState === 1) {
      if (brain.beamTimer <= 0) {
        e.beamState = 2;
        brain.beamTimer = KONG_CHARGE_TIME;
      }
      return true;
    }
    const def = ENEMIES[e.kind as EnemyKind];
    const moved = this.move(e.x, e.y, Math.cos(e.beamAngle) * KONG_CHARGE_SPEED * dt, Math.sin(e.beamAngle) * KONG_CHARGE_SPEED * dt, def.radius);
    e.x = moved.x;
    e.y = moved.y;
    this.state.players.forEach((p, pid) => {
      if (Math.hypot(p.x - e.x, p.y - e.y) < def.radius + KONG_CHARGE_WIDTH / 2) this.damagePlayer(pid, def.touchDamage * 1.5, false, ENEMY);
    });
    if (brain.beamTimer <= 0) {
      e.beamState = 0;
      brain.beamTimer = KONG_CHARGE_EVERY;
    }
    return true;
  }

  /**
   * Godzilla's atomic beam. Returns true while the beam is busy (Godzilla stands still).
   * Idle -> charging (a warning line locks on) -> firing (the beam slowly turns toward its target).
   */
  private updateBeam(e: E, brain: EnemyBrain, dx: number, dy: number, dt: number): boolean {
    const toTarget = Math.atan2(dy, dx);
    brain.beamTimer -= dt;
    if (e.beamState === 0) {
      if (brain.beamTimer > 0) return false;
      e.beamState = 1;
      e.beamAngle = toTarget;
      brain.beamTimer = BEAM_CHARGE;
      return true;
    }
    if (e.beamState === 1) {
      if (brain.beamTimer <= 0) {
        e.beamState = 2;
        brain.beamTimer = BEAM_FIRE;
      }
      return true;
    }
    // Firing: turn toward the target, slowly enough to outrun.
    let diff = toTarget - e.beamAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const turn = BEAM_TURN_SPEED * dt;
    e.beamAngle += Math.max(-turn, Math.min(turn, diff));
    const cos = Math.cos(e.beamAngle);
    const sin = Math.sin(e.beamAngle);
    this.state.players.forEach((p, pid) => {
      // Distance from the player to the beam's line segment.
      const along = (p.x - e.x) * cos + (p.y - e.y) * sin;
      if (along < 0 || along > BEAM_LENGTH) return;
      const across = Math.abs(-(p.x - e.x) * sin + (p.y - e.y) * cos);
      if (across < BEAM_WIDTH / 2 + PLAYER_RADIUS) this.damagePlayer(pid, BEAM_DAMAGE, false, ENEMY);
    });
    if (brain.beamTimer <= 0) {
      e.beamState = 0;
      brain.beamTimer = BEAM_EVERY;
    }
    return true;
  }

  // ------------------------------------------------------------- bullets

  private spawnBullet(
    kind: BulletKind,
    x: number,
    y: number,
    angle: number,
    speed: number,
    opts: { owner?: string; damage: number; pierce: number; life: number; blast?: number },
  ) {
    // Slower shots, same reach (homing missiles and the rubber fist keep their own timers).
    const hostileShot = kind === "enemy" || kind === "banana" || kind === "boulder" || kind === "slash";
    const scale = SHOT_SPEED_SCALE * (hostileShot ? 1 : HERO_SHOT_SCALE); // heroes' shots are slower still
    speed *= scale;
    const life = kind === "missile" || kind === "fist" ? opts.life : opts.life / scale;
    const b = this.make.bullet();
    b.kind = kind;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.hostile = hostileShot;
    const id = `b${this.nextId++}`;
    this.state.bullets.set(id, b);
    this.bulletBrains.set(id, { owner: opts.owner, damage: opts.damage, pierceLeft: opts.pierce, life, hit: new Set(), blast: opts.blast ?? 0 });
    return id;
  }

  private removeBullet(id: string) {
    this.state.bullets.delete(id);
    this.bulletBrains.delete(id);
  }

  private updateBullets(dt: number, onlyOwner?: Set<string>) {
    const s = this.state;
    s.bullets.forEach((b, id) => {
      const brain = this.bulletBrains.get(id)!;
      if (onlyOwner && !onlyOwner.has(brain.owner ?? "")) return;
      if (brain.homing) this.steerMissile(b, brain, dt);
      if (brain.bounce && this.flyFist(id, b, brain, dt)) return;
      if (brain.carry?.size) this.carryAlong(b, brain);
      if (brain.bounces) {
        // DIRECT VOLLEY: off the walls it goes, and may hit everyone again.
        const nx = b.x + b.vx * dt;
        const ny = b.y + b.vy * dt;
        const out = (x: number, y: number) => x < 4 || y < 4 || x > this.W - 4 || y > this.H - 4 || this.blocked(x, y);
        if (out(nx, ny)) {
          if (out(nx, b.y)) b.vx = -b.vx;
          if (out(b.x, ny)) b.vy = -b.vy;
          if (!out(nx, b.y) && !out(b.x, ny)) [b.vx, b.vy] = [-b.vx, -b.vy];
          brain.bounces--;
          brain.hit.clear();
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      brain.life -= dt;
      // Sword waves and missiles fly over rocks; bullets do not.
      const blocked = b.kind !== "wave" && b.kind !== "godslash" && b.kind !== "missile" && !brain.bounce && this.blocked(b.x, b.y);
      if (brain.life <= 0 || b.x < 0 || b.y < 0 || b.x > this.W || b.y > this.H || blocked) {
        if (brain.blast > 0) this.sweep(brain.owner ?? "", b.x, b.y, 0, brain.blast, Math.PI * 2, brain.damage);
        this.endBullet(id);
        return;
      }

      if (b.hostile) {
        const wall = this.blockAt(b.x, b.y, 2);
        if (wall) {
          this.damageEnemy(wall, brain.damage);
          this.removeBullet(id);
          return;
        }
        s.players.forEach((p, pid) => {
          if (!s.bullets.has(id) || p.dead || p.dashing || !b.hostile) return;
          if (this.bodyDist(p, b.x, b.y) < PLAYER_RADIUS + 2) {
            if (this.reflecting(p)) {
              this.reflectBullet(b, brain, pid);
              return;
            }
            this.damagePlayer(pid, brain.damage, false, ENEMY);
            this.removeBullet(id);
          }
        });
        return;
      }

      // Heroes' shots hit a little generously, so fights between heroes connect more often.
      const hitRadius = SHOT_HIT_SLACK + (b.kind === "fist" ? 7 : b.kind === "wave" ? 14 : b.kind === "godslash" ? 8 : b.kind === "fireball" ? 8 : b.kind === "missile" || b.kind.startsWith("card") ? 5 : 2) + (brain.hitSize ?? 0);
      if (this.pvpLive()) {
        s.players.forEach((v, vid) => {
          if (!s.bullets.has(id) || !this.isFoe(brain.owner, vid) || v.dead || brain.hit.has(vid)) return;
          if (this.bodyDist(v, b.x, b.y) >= this.pr(v) + hitRadius) return;
          if (this.reflecting(v) && !b.kind.startsWith("card")) {
            this.reflectBullet(b, brain, vid);
            return;
          }
          if (brain.blast > 0) {
            this.sweep(brain.owner ?? "", b.x, b.y, 0, brain.blast, Math.PI * 2, brain.damage);
            this.removeBullet(id);
            return;
          }
          brain.hit.add(vid);
          this.damagePlayer(vid, (brain.pct ? v.maxHp * brain.pct : brain.damage) * PVP_DAMAGE_SCALE, true, brain.owner);
          if (brain.stun && !v.dead) v.stun = Math.max(v.stun, brain.stun); // POWER SHOT
          if (brain.slow && !v.dead) this.slowPlayer(v, brain.slow, brain.slowPct); // ice shards
          if (brain.silence && !v.dead) v.silence = Math.max(v.silence, brain.silence);
          if (brain.ignite && !v.dead) this.igniteTarget(brain.owner ?? "", `p:${vid}`, brain.ignite, v.x, v.y);
          if (brain.carry && !v.dead) brain.carry.add(`p:${vid}`);
          if (brain.pierceLeft <= 0) this.endBullet(id);
          else brain.pierceLeft--;
        });
        if (!s.bullets.has(id)) return;
      }
      s.enemies.forEach((e, eid) => {
        if (!s.bullets.has(id) || brain.hit.has(eid)) return;
        const def = ENEMIES[e.kind as EnemyKind];
        if (Math.hypot(e.x - b.x, e.y - b.y) < this.er(e) + hitRadius) {
          if (brain.blast > 0) {
            // Magic explodes on the first enemy it touches.
            this.sweep(brain.owner ?? "", b.x, b.y, 0, brain.blast, Math.PI * 2, brain.damage);
            this.removeBullet(id);
            return;
          }
          brain.hit.add(eid);
          // A drawn card takes its share of the monster's max HP (a tenth of that on bosses).
          this.damageEnemy(eid, brain.pct ? e.maxHp * brain.pct * (def.boss ? 0.1 : 1) : brain.damage, brain.owner);
          if (brain.stun && !def.boss && s.enemies.has(eid)) e.stun = Math.max(e.stun, brain.stun);
          if (brain.slow && !def.block && s.enemies.has(eid)) e.slow = Math.max(e.slow, brain.slow);
          if (brain.ignite && s.enemies.has(eid)) this.igniteTarget(brain.owner ?? "", eid, brain.ignite, e.x, e.y);
          if (brain.carry && !def.boss && !def.block && s.enemies.has(eid)) brain.carry.add(eid);
          if (brain.pierceLeft <= 0) this.endBullet(id);
          else brain.pierceLeft--;
        }
      });
    });
  }

  /**
   * RUBBER PUNCH: bounce off walls (each bounce lets it hit everyone again), and once its time is up
   * fly home to the owner's hand. Returns true when the fist is gone.
   */
  private flyFist(id: string, b: B, brain: BulletBrain, dt: number): boolean {
    brain.age = (brain.age ?? 0) + dt;
    const owner = this.state.players.get(brain.owner ?? "");
    if (!owner || owner.dead) {
      this.removeBullet(id);
      return true;
    }
    if (brain.age >= (brain.back ?? 3)) {
      if (brain.rehit) {
        // AXE BOOMERANG: on the way home it cuts everyone again.
        brain.rehit = false;
        brain.hit.clear();
      }
      // Snap back: straight home, through everything.
      const dx = owner.x - b.x;
      const dy = owner.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d < 14) {
        this.removeBullet(id);
        return true;
      }
      b.vx = (dx / d) * FIST_RETURN;
      b.vy = (dy / d) * FIST_RETURN;
      return false;
    }
    // A wall stops the fist (no more bouncing): it snaps straight back.
    const nx = b.x + b.vx * dt;
    const ny = b.y + b.vy * dt;
    if (nx < 4 || ny < 4 || nx > this.W - 4 || ny > this.H - 4 || this.blocked(nx, ny)) {
      brain.age = brain.back ?? 0;
      b.vx = 0;
      b.vy = 0;
    }
    return false;
  }

  /** AXE BOOMERANG: whoever it caught is dragged along with it. */
  private carryAlong(b: B, brain: BulletBrain) {
    for (const key of brain.carry!) {
      if (key.startsWith("p:")) {
        const v = this.state.players.get(key.slice(2));
        const vb = this.brains.get(key.slice(2));
        if (!v || v.dead) continue;
        const at = this.move(v.x, v.y, b.x - v.x, b.y - v.y, PLAYER_RADIUS);
        [v.x, v.y] = [at.x, at.y];
        v.latch = Math.max(v.latch, 0.15);
        if (vb) [vb.target, vb.dashTimer] = [undefined, 0];
      } else {
        const e = this.state.enemies.get(key);
        if (e) [e.x, e.y] = [b.x, b.y];
      }
    }
  }

  /** Turn a homing missile toward the nearest monster (or rival, in PvP). */
  private steerMissile(b: B, brain: BulletBrain, dt: number) {
    brain.age = (brain.age ?? 0) + dt;
    if (brain.age < MISSILE_LAUNCH) return;
    let best = Infinity;
    let tx = 0;
    let ty = 0;
    this.state.enemies.forEach((e) => {
      if (ENEMIES[e.kind as EnemyKind].block) return;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < best) [best, tx, ty] = [d, e.x, e.y];
    });
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(brain.owner, vid) || this.hidden(v, brain.owner)) return;
      const d = Math.hypot(v.x - b.x, v.y - b.y);
      if (d < best) [best, tx, ty] = [d, v.x, v.y];
    });
    if (best === Infinity) return;
    const speed = Math.hypot(b.vx, b.vy);
    const now = Math.atan2(b.vy, b.vx);
    let diff = Math.atan2(ty - b.y, tx - b.x) - now;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const turn = Math.max(-MISSILE_TURN * dt, Math.min(MISSILE_TURN * dt, diff));
    b.vx = Math.cos(now + turn) * speed;
    b.vy = Math.sin(now + turn) * speed;
  }

  // ----------------------------------------------------------------- bot

  /** Bot Duel: decide this tick's input like a player would (close in or keep range, circle, attack, use skills). */
  private botThink(id: string, p: P, brain: PlayerBrain, dt: number) {
    const bot = brain.bot!;
    const hero = heroOf(p.hero);
    const input: PlayerInput = { ...EMPTY_INPUT, aim: p.aim };
    let foe: P | undefined;
    let dist = Infinity;
    const map = this.classic ? (this.area as ClassicMap) : undefined;
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid) || this.hidden(v, id)) return;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (this.royale && d > ROYALE_SIGHT) return; // the island is big: only rivals close by
      if (map && !seesInto(map, p.x, p.y, v.x, v.y)) return; // Classic: no seeing into tall grass (unless in the same patch)
      if (d < dist) [dist, foe] = [d, v];
    });
    if (this.royale && !p.dead && this.pvpLive()) {
      // Battle Royale: caught outside the storm ring (or about to be), head for the middle first.
      const c = ROYALE_MAP.center;
      if (Math.hypot(p.x - c.x, p.y - c.y) > this.state.lavaRadius - BLOCK * 2) {
        const step = stepAlong((this.royaleField ??= distanceField(ROYALE_MAP, c.x, c.y)), p.x, p.y, ROYALE_MAP);
        input.left = step.x < -0.3;
        input.right = step.x > 0.3;
        input.up = step.y < -0.3;
        input.down = step.y > 0.3;
        if (foe && dist < 220) {
          input.aim = Math.atan2(foe.y - p.y, foe.x - p.x);
          input.shoot = true;
        } else if (step.x || step.y) input.aim = Math.atan2(step.y, step.x);
        brain.input = input;
        return;
      }
    }
    if (map && foe) [bot.lastSeen, bot.search] = [{ x: foe.x, y: foe.y }, undefined];
    if (map && !foe && !p.dead && this.pvpLive()) {
      // Classic: nobody in sight. Go where a rival was last seen, then search the tall grass patch by patch.
      bot.searchTimer = (bot.searchTimer ?? 0) - dt;
      const arrived = bot.search && Math.hypot(bot.search.x - p.x, bot.search.y - p.y) < BLOCK * 0.6;
      if (!bot.search || arrived || bot.searchTimer <= 0) {
        if (bot.search?.patch !== undefined) (bot.checked ??= new Map()).set(bot.search.patch, this.clock);
        bot.search = this.nextSearch(map, p, bot);
        bot.searchTimer = 8;
      }
      const goal = bot.search;
      bot.pathTimer = (bot.pathTimer ?? 0) - dt;
      const to = -10000 - Math.floor((goal.x - MAP_X) / BLOCK) - Math.floor((goal.y - MAP_Y) / BLOCK) * 100;
      if (!bot.path || bot.pathTo !== to || bot.pathTimer <= 0) [bot.path, bot.pathTo, bot.pathTimer] = [distanceField(map, goal.x, goal.y), to, 2];
      const step = stepAlong(bot.path, p.x, p.y, map);
      input.left = step.x < -0.3;
      input.right = step.x > 0.3;
      input.up = step.y < -0.3;
      input.down = step.y > 0.3;
      if (step.x || step.y) input.aim = Math.atan2(step.y, step.x);
      brain.input = input;
      return;
    }
    if (!foe || p.dead || !this.pvpLive()) {
      brain.input = input;
      return;
    }
    const ux = (foe.x - p.x) / (dist || 1);
    const uy = (foe.y - p.y) / (dist || 1);
    bot.strafeTimer -= dt;
    if (bot.strafeTimer <= 0) {
      // Every so often change which way to circle, and wobble the aim a little: no perfect shots.
      bot.strafe = Math.random() < 0.5 ? -1 : 1;
      bot.strafeTimer = 0.8 + Math.random() * 1.2;
      bot.aimErr = (Math.random() - 0.5) * BOT_LEVELS[bot.level].aimErr;
    }
    const gun = !!hero.gun && p.mode === 1;
    const melee = p.titan > 0 || (!gun && (hero.attack === "punch" || hero.attack === "sword"));
    const reach = p.titan > 0 ? hero.skill.radius : gun ? hero.gun!.range : hero.attack === "lightning" ? hero.range + hero.aoe : hero.range;
    const want = melee ? Math.max(6, reach * 0.6) : Math.min(reach * 0.7, 200);
    let mx = 0;
    let my = 0;
    const fleeing = p.hp < p.maxHp * 0.25 && dist < 90 && !melee;
    if (fleeing || (!melee && dist < want - 20)) [mx, my] = [-ux, -uy];
    else if (dist > want + 8) [mx, my] = [ux, uy];
    mx += -uy * bot.strafe * 0.7;
    my += ux * bot.strafe * 0.7;
    if (map && !mapLineClear(map, p.x, p.y, foe.x, foe.y)) {
      // Classic: a wall in the way, so walk round it (the route is worked out again every half second).
      bot.pathTimer = (bot.pathTimer ?? 0) - dt;
      const to = Math.floor((foe.x - MAP_X) / BLOCK) + Math.floor((foe.y - MAP_Y) / BLOCK) * 1000;
      if (!bot.path || bot.pathTo !== to || bot.pathTimer <= 0) [bot.path, bot.pathTo, bot.pathTimer] = [distanceField(map, foe.x, foe.y), to, 0.5];
      const step = stepAlong(bot.path, p.x, p.y, map);
      if (step.x || step.y) [mx, my] = [step.x, step.y];
    }
    input.left = mx < -0.3;
    input.right = mx > 0.3;
    input.up = my < -0.3;
    input.down = my > 0.3;
    input.aim = Math.atan2(uy, ux) + bot.aimErr;
    input.shoot = dist <= reach + PLAYER_RADIUS + 6;
    if (p.dashCooldown <= 0 && Math.random() < dt * BOT_LEVELS[bot.level].dash && ((melee && dist > 120) || fleeing)) input.dash = true;
    bot.think -= dt;
    if (bot.think <= 0) {
      const [least, extra] = BOT_LEVELS[bot.level].think;
      bot.think = least + Math.random() * extra; // reaction time
      if (p.skillCooldown <= 0 && this.botWants(hero.skill, p, dist)) input.skill = true;
      else if (hero.skill2 && p.skill2Cooldown <= 0 && this.botWants(hero.skill2, p, dist)) input.skill2 = true;
    }
    brain.input = input;
  }

  /**
   * Classic: where a bot that can't see anyone looks next. First the spot a rival was last seen, then
   * the nearest patch of tall grass it hasn't checked lately (one of the closest few, so bots spread out),
   * and with nothing left to check, the other side's spawn.
   */
  private nextSearch(map: ClassicMap, p: P, bot: NonNullable<PlayerBrain["bot"]>): { x: number; y: number; patch?: number } {
    if (bot.lastSeen) {
      const seen = bot.lastSeen;
      bot.lastSeen = undefined;
      if (Math.hypot(seen.x - p.x, seen.y - p.y) > BLOCK) return seen;
    }
    const options: { x: number; y: number; patch: number; d: number }[] = [];
    const ring = ROYALE_MAP.center;
    bushPatches(map).forEach((tiles, patch) => {
      if (this.clock - (bot.checked?.get(patch) ?? -Infinity) < 20) return;
      if (this.royale && Math.hypot(tiles[0].x - ring.x, tiles[0].y - ring.y) > this.state.lavaRadius - BLOCK * 3) return; // not out in the storm
      let best = tiles[0];
      for (const t of tiles) if (Math.hypot(t.x - p.x, t.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y)) best = t;
      // Step a little into the patch, not just onto its edge.
      const deep = tiles.reduce((a, t) => (Math.hypot(t.x - best.x, t.y - best.y) <= BLOCK * 1.5 && Math.hypot(t.x - p.x, t.y - p.y) > Math.hypot(a.x - p.x, a.y - p.y) ? t : a), best);
      options.push({ x: deep.x, y: deep.y, patch, d: Math.hypot(best.x - p.x, best.y - p.y) });
    });
    options.sort((a, b) => a.d - b.d);
    const pick = options[Math.floor(Math.random() * Math.min(3, options.length))];
    if (pick) return pick;
    bot.checked?.clear();
    if (this.royale) return ROYALE_MAP.center;
    return classicMap(this.state.map).spawns[p.team === 1 ? 2 : 1][1];
  }

  /** Would the bot use this skill now, `dist` away from its opponent? */
  private botWants(skill: SkillDef, p: P, dist: number): boolean {
    const hpLeft = p.hp / p.maxHp;
    const reach = skill.radius * 0.95 + PLAYER_RADIUS;
    switch (skill.kind) {
      case "passive":
      case "portal":
        return false;
      case "heal":
      case "rewind":
        return hpLeft < 0.5;
      case "revive":
        return hpLeft < 0.35;
      case "immortal":
        return hpLeft < 0.55 && dist < 150;
      case "swap":
        return p.mode === 1 ? dist < 40 : dist > 90;
      case "wave":
      case "line":
      case "jab":
      case "rush":
      case "godrush":
      case "fan":
      case "kick":
      case "cross":
      case "gatling":
      case "card":
      case "latch":
      case "dashkick":
      case "truck":
      case "biglight":
      case "solve":
      case "castle":
      case "frost":
      case "eyebeam":
      case "onepunch":
      case "smash":
      case "storm":
      case "slashes":
      case "sticky":
      case "spinkick":
      case "thunderdash":
        return dist <= reach;
      case "seventh":
        return dist <= reach * 0.8;
      case "domain":
        return dist <= skill.radius * 0.85;
      case "whip":
        return dist <= skill.radius * 0.9;
      case "charge":
        return dist <= skill.radius * chargeReach(chargePower(CHARGE_FULL / 2));
      case "grapple":
        return dist > 130;
      case "chargeslash":
        return dist <= skill.radius * 1.3 + PLAYER_RADIUS;
      case "chargeshot":
      case "leafstorm":
      case "bluelaser":
      case "shuriken":
        return dist <= skill.radius * 0.8;
      case "reflect":
        return dist > 50 && dist < 260 && Math.random() < 0.3;
      case "sprint":
        return dist > 160;
      case "shadowstep":
        return p.mode === 1 ? hpLeft < 0.5 || dist > 140 : dist <= reach;
      case "shield":
        return hpLeft < 0.7 && dist < 160;
      case "shieldcharge":
        return dist <= skill.radius;
      case "tree":
        return true;
      case "empower":
        return dist < 60;
      case "leap":
        return dist <= (skill.width ?? 170) + 20 && dist > 40;
      case "boost":
        return p.mode < (skill.count ?? 3);
      case "harden":
        return p.mode < (skill.count ?? 10);
      case "combo":
        return skill.botHp !== undefined ? hpLeft < skill.botHp && dist < Math.max(skill.radius, 200) : dist <= skill.radius;
      case "petrify":
      case "iceprison":
      case "deathdoor":
      case "possess":
      case "domainx":
      case "copyskill":
        return dist <= skill.radius;
      case "taunt":
        return dist <= skill.radius + 10;
      case "deathnote":
        return dist <= skill.radius * 0.8;
      case "swapany":
        return dist > 150 && Math.random() < 0.3;
      case "kunai":
        return dist <= skill.radius;
      case "eater":
        return false; // bots fight alone
      case "fakeclone":
        return dist < 220;
      case "piano":
        return dist < (skill.radius ?? 200) * 0.7;
      case "bloodtrap":
        return dist < 160;
      case "bloodhammer":
        return dist < 70 && hpLeft > 0.3;
      case "error":
        return dist < 240;
      case "reap":
      case "roots":
      case "roar":
      case "quake":
        return dist <= skill.radius + 10;
      case "cyclone":
        return dist <= skill.radius + 15;
      case "gaia":
        return hpLeft < 0.6 && dist < 200;
      case "rage":
        return dist < 90;
      case "axethrow":
      case "lancecharge":
      case "flamedash":
        return dist <= skill.radius;
      case "sparks":
        return dist <= skill.radius * 0.8;
      case "jackbox":
        return dist < 90;
      case "switch":
        return dist <= skill.radius && dist > 80;
      case "anvil":
      case "meteor":
      case "blizzard":
      case "dive":
        return dist <= (skill.width ?? 150) + 40 && dist > 50;
      case "wall":
        return dist > 120 && dist < 320;
      case "barrage":
        return dist <= skill.radius + 10;
      case "trojan":
        return dist < 140;
      case "totem":
        return hpLeft < 0.7;
      case "palm":
        return dist <= (skill.width ?? 150) + 40;
      case "doves":
        return hpLeft < 0.6 && dist < 150;
      case "invis":
        return hpLeft < 0.6 && dist < 200;
      case "bat":
      case "excalibur":
        return dist < 110;
      case "sacrifice":
        return hpLeft > 0.55 && dist <= reach;
      case "yoyo":
        return p.mode === 1 ? dist < 45 : dist > 80;
      case "bike":
        return dist > 60 && dist < 260;
      case "grab":
      case "purple":
      case "starfinger":
        return dist <= reach;
      case "knives":
        return dist < 180;
      case "rubberpunch":
        return dist < 260;
      case "titan":
        return dist < 120;
      case "diamond":
        return dist < 140;
      case "frost":
        return dist < 160;
      case "build":
        return dist < 200;
      case "omnitrix":
        return dist < 220;
      case "mimic":
        return dist < 400;
      case "dragonform":
        return dist < 240;
      case "mitosis":
        return dist < 280 && hpLeft > 0.4; // split while there is HP to share
      case "eat":
        return hpLeft < 0.8;
      case "hurricane":
        return dist > 60 && dist < 220;
      default:
        return dist < 260;
    }
  }
}
