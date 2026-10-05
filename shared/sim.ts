// The Emberfall game simulation. It has no networking code, so the same rules run
// on the multiplayer server (with Colyseus schema objects) and in the browser for
// solo play (with plain objects).

import {
  movesInStoppedTime,
  CHARGE_FULL,
  chargePower,
  chargeTimeOf,
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
} from "./game";

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
const FIST_SPEED = 340;
const FIST_RETURN = 560;
const ONE_PUNCH_DAMAGE = 1e9; // "infinity", but still a number the network can send
const MAX_CLONES = 2;
export const TITAN_ATTACK_COOLDOWN = 0.6;
const SHOT_HIT_SLACK = 3;
const BULLET_CUT_SLACK = 8; // shots are small and fast, so melee reaches them a little further out
const ENEMY = "#enemy"; // attacker id for damage dealt by monsters
const CLONE_SIGHT = 300;
const GATLING_GAP = 0.1; // seconds between GATLING PUNCH hits
const BARRAGE_GAP = 0.12; // seconds between ROCK BARRAGE punches
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
const EYEBEAM_TICK = 0.1; // seconds between HEAT VISION hits

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
  /** STAR SHOT: shots of the volley still to fire. */
  volleyLeft?: number;
  volleyTimer?: number;
  volleyAim?: number;
  eyebeamTick: number;
  /** Bot Duel: this player is driven by the simulation itself. */
  bot?: { strafe: number; strafeTimer: number; think: number; aimErr: number; level: number; hp: number };
  /** The portal we just came out of: it cannot send us back until we step off it. */
  portalLock?: string;
  cloneLife: number; // seconds a clone has left
  /** Position the client says it moved to (client-side movement), and how far the server lets it go. */
  target?: { x: number; y: number; t: number };
  moveBudget: number;
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
  /** A placed block: who built it. */
  owner?: string;
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
  /** SEVENTH FORM: the crackling lane (start, direction, length, width). */
  lane?: { x: number; y: number; angle: number; len: number; width: number };
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
  /** RUBBER PUNCH: bounces off walls until `back` seconds old, then flies home to its owner. */
  bounce?: boolean;
  back?: number;
  /** POWER SHOT: stuns whatever it hits for this many seconds. */
  stun?: number;
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
  }

  /** Hero-against-hero stages are fought inside the boxing ring's ropes. */
  private get ring() {
    return ringStage(this.state.stage);
  }

  private move(x: number, y: number, dx: number, dy: number, r: number) {
    return moveCircle(x, y, dx, dy, r, this.ring);
  }

  private blocked(x: number, y: number) {
    return hitsRock(x, y, this.ring);
  }

  addPlayer(id: string, name: string, hero: string): P {
    const def = heroOf(hero);
    const player = this.make.player();
    player.name = name.slice(0, 16) || "Riftborn";
    player.hero = (HERO_IDS as string[]).includes(hero) ? hero : "superman";
    player.color = this.realPlayerCount() % 4;
    this.placeAtSpawn(player);
    player.maxHp = def.maxHp;
    player.hp = def.maxHp;
    this.state.players.set(id, player);
    this.brains.set(id, this.newBrain());
    return player;
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

  /** PvE Squad player select: anyone can change the bot's hero and difficulty. */
  setBot(hero?: string, level?: number) {
    const s = this.state;
    if (s.stage !== "pve" || s.phase !== "select") return;
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
    const voids = !!leaver && !leaver.owner && s.stage === "pvp" && (s.phase === "intermission" || s.phase === "fight");
    s.players.delete(id);
    this.brains.delete(id);
    // A player's clones vanish with them.
    this.state.players.forEach((p, cid) => {
      if (p.owner === id) this.removePlayer(cid);
    });
    if (voids) {
      this.startSelect();
      s.notice = `MATCH VOID: ${leaver!.name} left`;
    }
  }

  /** PvP player select: change hero (only before locking in). */
  pickHero(id: string, hero: string) {
    const p = this.state.players.get(id);
    const def = HEROES[hero as keyof typeof HEROES];
    if (!p || p.owner || p.ready || this.state.phase !== "select" || !def || !(HERO_IDS as string[]).includes(hero)) return;
    p.hero = hero;
    p.maxHp = def.maxHp;
    p.hp = def.maxHp;
    p.mode = 0;
  }

  /** PvP player select: lock in (or unlock) the current hero. */
  setReady(id: string, ready: boolean) {
    const p = this.state.players.get(id);
    if (p && !p.owner && this.state.phase === "select") p.ready = !!ready;
  }

  /** PvP: back to player select; nobody is ready, everyone is healed and nothing is left on the floor. */
  private startSelect() {
    const s = this.state;
    s.phase = "select";
    s.phaseTimer = 0;
    s.winner = "";
    s.timeStop = 0;
    s.reality = 0;
    const helpers: string[] = [];
    s.players.forEach((p, pid) => {
      if (p.owner || pid === "bot") return helpers.push(pid); // the PvE bot is added when the match starts
      p.ready = false;
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
      p.score = 0;
      p.dead = false;
      p.hp = p.maxHp;
      p.ready = false;
      p.power = 1;
      this.placeAtSpawn(p);
      const brain = this.brains.get(id);
      if (brain) brain.target = undefined;
    });
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
    return (bot ? BOT_LEVELS[bot.level].damage : 1) * (p.power || 1) * (DAMAGE_BALANCE[(heroOf(p.hero).formOf ?? p.hero) as HeroId] ?? 1); // an alien form hits like its hero
  }

  /** How far from its centre an enemy can be hit (BIG LIGHT makes it bigger). */
  private er(e: E): number {
    return ENEMIES[e.kind as EnemyKind].radius * (e.big > 0 ? BIG_SCALE : 1);
  }

  /** How far from its centre a player can be hit. */
  private pr(v: P): number {
    return PLAYER_RADIUS * (v.big > 0 ? BIG_SCALE : 1);
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
      if (!v.dead && this.isFoe(id, vid) && inCone(v.x, v.y, PLAYER_RADIUS)) v.big = Math.max(v.big, t);
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
      if (hit.has(vid) || v.dead || !this.isFoe(brain.owner, vid) || Math.hypot(v.x - z.x, v.y - z.y) > z.radius + this.pr(v)) return;
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
      if (hit.has(vid) || v.dead || !this.isFoe(brain.owner, vid) || Math.hypot(v.x - z.x, v.y - z.y) > z.radius) return;
      hit.add(vid);
      this.damagePlayer(vid, brain.damage * PVP_DAMAGE_SCALE, true, brain.owner);
      if (v.dead) return;
      v.stun = Math.max(v.stun, freeze);
      iceAt(v.x, v.y, this.pr(v));
    });
  }

  /** VANISH: an invisible hero cannot be seen or targeted (shots can still hit him by chance). */
  private hidden(p: P): boolean {
    return p.active2 > 0 && heroOf(p.hero).skill2?.kind === "invis";
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
      if (v.dead || !this.isFoe(id, vid) || Math.hypot(v.x - p.x, v.y - p.y) > skill.radius + this.pr(v) || !this.canRehit(brain, `p:${vid}`, BIKE_REHIT)) return;
      this.damagePlayer(vid, skill.damage * PVP_DAMAGE_SCALE, true, id);
      this.stunKnockPlayer(vid, v.x - p.x, v.y - p.y, BIKE_STUN, BIKE_KNOCK);
    });
  }

  /** Speed Raptor's charge: hit every foe it is touching (each one again only every RAM_REHIT seconds). */
  private ramInto(id: string, p: P, brain: PlayerBrain, damage: number) {
    this.state.enemies.forEach((e, eid) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (def.block || Math.hypot(e.x - p.x, e.y - p.y) > PLAYER_RADIUS + this.er(e) + 4 || !this.canRehit(brain, eid, RAM_REHIT)) return;
      this.damageEnemy(eid, damage, id);
      if (!def.boss && this.state.enemies.has(eid)) this.knockEnemy(eid, e.x - p.x, e.y - p.y, 1);
    });
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid) || Math.hypot(v.x - p.x, v.y - p.y) > PLAYER_RADIUS + this.pr(v) + 4 || !this.canRehit(brain, `p:${vid}`, RAM_REHIT)) return;
      this.damagePlayer(vid, damage * PVP_DAMAGE_SCALE, true, id);
      this.knockPlayer(vid, v.x - p.x, v.y - p.y, 1);
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
        if (v.dead || !this.isFoe(id, vid) || Math.hypot(v.x - s.x, v.y - s.y) > ORBIT_REACH + this.pr(v) || !this.canRehit(brain, `p:${vid}`, ORBIT_REHIT)) return;
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
  private sacrifice(id: string, p: P, skill: SkillDef) {
    const share = skill.damage;
    const t = this.findTarget(id, p, skill.radius, true);
    this.addZone("sacrifice", p.x, p.y, 16, 0.7, { owner: id, every: Infinity, damage: 0 });
    if (t?.key.startsWith("p:")) {
      const vid = t.key.slice(2);
      const v = this.state.players.get(vid)!;
      this.addZone("sacrifice", v.x, v.y, 16, 0.7, { owner: id, every: Infinity, damage: 0 });
      const shielded = heroOf(v.hero).invincible || v.barrier > 0 || v.dashing;
      const bothFall = !shielded && v.hp <= v.maxHp * share && p.hp <= p.maxHp * share && p.revive <= 0 && v.revive <= 0;
      if (bothFall && this.ring && this.state.stage !== "pve" && this.state.phase === "fight") {
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
    // PvE Squad: the players are one team; only the bot (and what it summons) is on the other side.
    if (this.state.stage === "pve") return (a === "bot") !== (v === "bot");
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
    };
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
      if (fighters >= (s.stage === "pve" ? 1 : 2) && ready === fighters) this.beginMatch();
    } else if (s.phase === "intermission") {
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) s.phase = "fight";
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
  private updatePlayers(dt: number, only?: Set<string>) {
    const s = this.state;
    s.players.forEach((p, id) => {
      if (only && !only.has(id)) return;
      const brain = this.brains.get(id);
      if (!brain) return;
      if (brain.bot) this.botThink(id, p, brain, dt);
      // ALIEN TRANSFORM: back to human when the time is up (or on falling).
      if (!p.owner && heroOf(p.hero).formOf && (p.dead || p.buff <= 0)) this.endForm(p, brain);
      const input = brain.input;
      const hero = heroOf(p.hero);
      brain.hurtTimer = Math.max(0, brain.hurtTimer - dt);
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
        if (p.respawnIn <= 0 && s.stage !== "pve") {
          p.dead = false;
          p.hp = Math.round(p.maxHp / 2);
          this.placeAtSpawn(p);
          brain.target = undefined;
          brain.hurtTimer = 1.5;
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
      p.active2 = Math.max(0, p.active2 - dt);
      p.big = Math.max(0, p.big - dt);
      p.slow = Math.max(0, p.slow - dt);
      p.root = Math.max(0, p.root - dt);
      if (p.barrier > 0) {
        // IMMORTAL: untouchable, and healing fast. (THE MAGICIAN's doves are just untouchable.)
        p.barrier = Math.max(0, p.barrier - dt);
        if (hero.skill.kind === "immortal") p.hp = Math.min(p.maxHp, p.hp + p.maxHp * hero.skill.damage * dt);
      }
      const doves = p.barrier > 0 && hero.skill2?.kind === "doves";

      p.aim = input.aim;
      const dir = inputDirection(input);

      // Dash
      if (input.dash && p.dashCooldown <= 0 && brain.dashTimer <= 0 && !(p.root > 0)) {
        const d = dir.x || dir.y ? dir : { x: Math.cos(input.aim), y: Math.sin(input.aim) };
        brain.dashTimer = DASH_TIME;
        brain.dashX = d.x;
        brain.dashY = d.y;
        p.dashCooldown = DASH_COOLDOWN;
      }

      let moved;
      const dashingNow = brain.dashTimer > 0;
      if (dashingNow) brain.dashTimer -= dt;
      if (brain.zip) {
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
      if (input.shoot && brain.attackTimer <= 0 && !doves) {
        const bat = p.active2 > 0 && hero.skill2?.kind === "bat";
        brain.attackTimer = hero.attackCooldown * (bat ? hero.skill2!.width ?? 0.35 : 1);
        p.attackSeq++;
        if (p.titan > 0) {
          // A 50m Titan's blows crush everything around it.
          brain.attackTimer = TITAN_ATTACK_COOLDOWN;
          this.sweep(id, p.x, p.y, 0, hero.skill.radius, Math.PI * 2, hero.skill.damage, true);
        } else if (hero.gun && p.mode === 1) {
          // Machine gun: a stream of small, slightly scattered bullets.
          const gun = hero.gun;
          brain.attackTimer = gun.attackCooldown;
          const angle = input.aim + (Math.random() - 0.5) * 2 * gun.spread;
          this.spawnBullet("bullet", p.x, p.y, angle, gun.shotSpeed, { owner: id, damage: gun.damage, pierce: 0, life: gun.range / gun.shotSpeed });
        } else if (hero.sword && p.buff > 0) {
          // DIAMOND SWORD: big, fast swings.
          brain.attackTimer = hero.sword.attackCooldown;
          this.sweep(id, p.x, p.y, input.aim, hero.sword.range, hero.sword.arc, hero.sword.damage, true);
        } else if (hero.lineAttack) {
          // A straight kick down a lane.
          this.lineHit(id, p.x, p.y, input.aim, hero.range, hero.lineAttack, hero.damage, 0, 1);
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
        } else if (hero.attack === "magic") {
          this.spawnBullet((hero.shot ?? "magic") as BulletKind, p.x, p.y, input.aim, hero.shotSpeed, { owner: id, damage: hero.damage, pierce: 0, life: hero.range / hero.shotSpeed, blast: hero.aoe });
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
          this.sweep(id, p.x, p.y, input.aim, hero.range, hero.arc, hero.damage, hero.knock ?? true);
        }
      }

      // Skills (ordinary humans under a reality change cannot use any)
      const powerless = s.reality > 0 && this.isFoe(s.realityBy, id);
      if (input.skill && p.skillCooldown <= 0 && hero.skill.kind !== "passive" && !powerless && this.chargedEnough(hero.skill, brain)) {
        p.skillCooldown = hero.skill.cooldown;
        p.skillSeq++;
        this.useSkill(id, p, hero, hero.skill, brain);
      }
      if (hero.skill2 && input.skill2 && p.skill2Cooldown <= 0 && !powerless && this.chargedEnough(hero.skill2, brain)) {
        p.skill2Cooldown = hero.skill2.cooldown;
        p.skill2Seq++;
        this.useSkill(id, p, hero, hero.skill2, brain);
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
      if (inLava(p.x, p.y, s.lavaRadius)) this.damagePlayer(id, LAVA_DPS * dt, true);
    });
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
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * skill.damage);
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
        this.spawnBullet("wave", p.x, p.y, p.aim, speed, { owner: id, damage: skill.damage, pierce: 99, life: skill.radius / speed });
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
        this.sweep(id, p.x, p.y, p.aim, skill.radius, 2.4, ONE_PUNCH_DAMAGE);
        break;
      case "heal":
        s.players.forEach((q, qid) => {
          if (q.dead || Math.hypot(q.x - p.x, q.y - p.y) > skill.radius) return;
          if (this.rootOf(qid) !== id && this.isFoe(id, qid)) return; // no healing your rivals
          q.hp = Math.min(q.maxHp, q.hp + q.maxHp * skill.damage);
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
        // Unlimited Void: every enemy on the map is hit at once.
        s.enemies.forEach((_e, eid) => this.damageEnemy(eid, skill.damage, id));
        s.players.forEach((_v, vid) => {
          if (this.isFoe(id, vid)) this.damagePlayer(vid, skill.damage * PVP_DAMAGE_SCALE, true, id);
        });
        this.addZone("domain", p.x, p.y, skill.radius, skill.duration ?? 1.5, { owner: id, every: Infinity, damage: 0 });
        break;
      case "timestop":
        s.timeStop = skill.duration ?? 4;
        s.timeStopBy = id;
        break;
      case "hurricane": {
        // The storm gathers a little way ahead, where you aim.
        const x = Math.min(WORLD_W - 20, Math.max(20, p.x + Math.cos(p.aim) * 120));
        const y = Math.min(WORLD_H - 20, Math.max(20, p.y + Math.sin(p.aim) * 120));
        this.addZone("hurricane", x, y, skill.radius, skill.duration ?? 3.5, { owner: id, every: 0.35, damage: skill.damage });
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
        const end = this.move(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
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
        const end = this.move(p.x, p.y, Math.cos(p.aim) * dist, Math.sin(p.aim) * dist, PLAYER_RADIUS);
        this.lineHit(id, p.x, p.y, p.aim, Math.hypot(end.x - p.x, end.y - p.y) + 10, skill.width ?? 30, skill.damage, full ? skill.duration ?? 2 : 0, full ? 0 : 1);
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256;
        brain.target = undefined;
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
        const x = Math.min(WORLD_W - 60, Math.max(60, p.x));
        const y = Math.min(WORLD_H - 60, Math.max(60, p.y));
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
          if (this.blocked(x, y) || x < 0 || y < 0 || x > WORLD_W || y > WORLD_H) break;
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
        // RUBBER PUNCH: the arm stretches out, the fist ricochets around, then it all snaps back.
        const t = skill.duration ?? 3;
        const bid = this.spawnBullet("fist", p.x, p.y, p.aim, FIST_SPEED, { owner: id, damage: skill.damage, pierce: 999, life: t + 3 });
        Object.assign(this.bulletBrains.get(bid)!, { bounce: true, back: t, age: 0 });
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
        const tx = vx > 0 ? (WORLD_W + skill.radius - x) / vx : vx < 0 ? (-skill.radius - x) / vx : Infinity;
        const ty = vy > 0 ? (WORLD_H + skill.radius - y) / vy : vy < 0 ? (-skill.radius - y) / vy : Infinity;
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
      if (!v.dead && this.isFoe(owner, vid) && Math.hypot(v.x - x, v.y - y) <= radius + this.pr(v)) v.stun = Math.max(v.stun, seconds);
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
      if (!v.dead && this.isFoe(id, vid) && !this.hidden(v)) consider(`p:${vid}`, v.x, v.y);
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
    if (near > 0 && !p.dead) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * skill.damage * near * dt);
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
      if (v.dead || !this.isFoe(id, vid) || !inLane(v.x, v.y, this.pr(v))) return;
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
      if (v.dead || !this.isFoe(owner, vid) || !inLine(v.x, v.y, this.pr(v))) return;
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
      if (!v.dead && this.isFoe(id, vid) && inCone(v.x, v.y, this.pr(v))) v.slow = Math.max(v.slow, t);
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
      if (v.dead || !this.isFoe(id, vid) || this.hidden(v)) return;
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
    if (inLava(c.x, c.y, this.state.lavaRadius)) this.damagePlayer(id, LAVA_DPS * dt, true);
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
      if ((z.kind === "sticky" || z.kind === "whip") && brain.stick) {
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
            q.hp = Math.min(q.maxHp, q.hp + q.maxHp * brain.damage);
          });
        } else if (z.kind === "thunderlane" && brain.lane) {
          const l = brain.lane;
          this.lineHit(brain.owner, l.x, l.y, l.angle, l.len, l.width, brain.damage);
        } else if (z.kind === "hurricane") {
          this.sweep(brain.owner, z.x, z.y, 0, z.radius, Math.PI * 2, brain.damage);
        } else if (z.kind === "asgard" || z.kind === "city") {
          if (z.kind === "city") {
            // Yaotsu heals inside their own city.
            const p = s.players.get(brain.owner);
            if (p && !p.dead && Math.hypot(p.x - z.x, p.y - z.y) <= z.radius) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * brain.damage * brain.every);
          }
          // Everyone hostile inside the illusion loses a share of their max HP.
          const share = brain.damage * brain.every;
          s.enemies.forEach((e, eid) => {
            if (Math.hypot(e.x - z.x, e.y - z.y) <= z.radius) this.damageEnemy(eid, e.maxHp * share, brain.owner);
          });
          s.players.forEach((v, vid) => {
            if (!v.dead && this.isFoe(brain.owner, vid) && Math.hypot(v.x - z.x, v.y - z.y) <= z.radius) {
              this.damagePlayer(vid, v.maxHp * share, true, brain.owner);
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
      if (z.life <= 0 && z.kind === "truck") {
        // The truck lands: everything under it is crushed and thrown back.
        this.sweep(brain.owner, z.x, z.y, 0, z.radius, Math.PI * 2, brain.damage, 2);
      }
      if (z.life <= 0 || (brain.link && !s.zones.has(brain.link))) this.removeZone(id);
    });
  }
  /** Hit every enemy inside a slice of a circle (a punch, a sword swing, or a full circle). */
  /** `knock`: true for a normal melee knockback, or a number for that many times as far. */
  private sweep(owner: string, x: number, y: number, aim: number, range: number, arc: number, damage: number, knock: boolean | number = false, stun = 0) {
    const kb = knock === true ? 1 : Number(knock) || 0;
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
      const dx = v.x - x;
      const dy = v.y - y;
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

  private damagePlayer(id: string, amount: number, ignoreIframes = false, attacker?: string, raw = false) {
    const p = this.state.players.get(id);
    const brain = this.brains.get(id);
    if (!p || !brain || p.dead || p.dashing) return;
    if (heroOf(p.hero).invincible || p.barrier > 0) return;
    if (attacker && attacker !== ENEMY && !raw) amount *= this.dmgMul(attacker);
    // HARDEN: each stack takes a share off every hit.
    const hard = heroOf(p.hero).skill;
    if (hard.kind === "harden" && !raw) amount *= Math.max(0, 1 - hard.damage * p.mode);
    // Under Yaotsu's reality change, ordinary humans hit for 1.
    if (this.state.reality > 0 && attacker && (attacker === ENEMY || this.isFoe(this.state.realityBy, attacker))) {
      amount = Math.min(amount, 1);
    }
    if (!ignoreIframes) {
      if (brain.hurtTimer > 0) return;
      brain.hurtTimer = HURT_IFRAMES;
    }
    this.leech(attacker, Math.min(p.hp, amount));
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
      p.respawnIn = RESPAWN_TIME;
      const root = this.rootOf(attacker);
      const killer = root && root !== id ? this.state.players.get(root) : undefined;
      if (this.state.stage === "pve") {
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
      if (this.ring && this.state.stage !== "pve" && this.state.phase === "fight") this.roundOver = true;
    }
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
    if (!v || v.dead || v.active2 <= 0 || bat?.kind !== "bat") return;
    v.hp = Math.min(v.maxHp, v.hp + dealt * bat.damage);
  }

  private placeAtSpawn(p: P) {
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
        e.x = Math.min(WORLD_W - 20, Math.max(20, CENTER_X + Math.cos(a) * r));
        e.y = Math.min(WORLD_H - 20, Math.max(20, CENTER_Y + Math.sin(a) * r));
        if (!this.blocked(e.x, e.y)) break;
      }
    }
    const id = `e${this.nextId++}`;
    this.state.enemies.set(id, e);
    this.enemyBrains.set(id, { shootTimer: (def.shootEvery ?? 0) * Math.random() + 1, burstAngle: 0, beamTimer: 3, kbx: 0, kby: 0 });
  }

  private damageEnemy(eid: string, damage: number, owner?: string) {
    const e = this.state.enemies.get(eid);
    if (!e) return;
    const killer = this.state.players.get(this.rootOf(owner));
    this.leech(owner, Math.min(Math.max(0, e.hp), damage * this.dmgMul(owner)));
    e.hp -= damage * this.dmgMul(owner);
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
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      brain.life -= dt;
      // Sword waves and missiles fly over rocks; bullets do not.
      const blocked = b.kind !== "wave" && b.kind !== "godslash" && b.kind !== "missile" && !brain.bounce && this.blocked(b.x, b.y);
      if (brain.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H || blocked) {
        if (brain.blast > 0) this.sweep(brain.owner ?? "", b.x, b.y, 0, brain.blast, Math.PI * 2, brain.damage);
        this.removeBullet(id);
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
          if (Math.hypot(p.x - b.x, p.y - b.y) < PLAYER_RADIUS + 2) {
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
      const hitRadius = SHOT_HIT_SLACK + (b.kind === "fist" ? 7 : b.kind === "wave" ? 14 : b.kind === "godslash" ? 8 : b.kind === "fireball" ? 8 : b.kind === "missile" || b.kind.startsWith("card") ? 5 : 2);
      if (this.pvpLive()) {
        s.players.forEach((v, vid) => {
          if (!s.bullets.has(id) || !this.isFoe(brain.owner, vid) || v.dead || brain.hit.has(vid)) return;
          if (Math.hypot(v.x - b.x, v.y - b.y) >= this.pr(v) + hitRadius) return;
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
          if (brain.pierceLeft <= 0) this.removeBullet(id);
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
          if (brain.pierceLeft <= 0) this.removeBullet(id);
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
    const out = (x: number, y: number) => x < 4 || y < 4 || x > WORLD_W - 4 || y > WORLD_H - 4 || this.blocked(x, y);
    if (out(b.x + b.vx * dt, b.y)) {
      b.vx = -b.vx;
      brain.hit.clear();
    }
    if (out(b.x, b.y + b.vy * dt)) {
      b.vy = -b.vy;
      brain.hit.clear();
    }
    return false;
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
      if (v.dead || !this.isFoe(brain.owner, vid) || this.hidden(v)) return;
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
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid) || this.hidden(v)) return;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < dist) [dist, foe] = [d, v];
    });
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
