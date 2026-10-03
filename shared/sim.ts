// The Emberfall game simulation. It has no networking code, so the same rules run
// on the multiplayer server (with Colyseus schema objects) and in the browser for
// solo play (with plain objects).

import {
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
  hitsRock,
  inLava,
  inputDirection,
  moveCircle,
} from "./game";

export const TICK_MS = 1000 / 30;
const HURT_IFRAMES = 0.5;
const WAVE_CLEAR_HEAL = 0.3;
const SNIPER_BURST = 3;
const SNIPER_BURST_GAP = 0.15;
const OKITA_SLASHES = 8;
const ONE_PUNCH_DAMAGE = 1e9; // "infinity", but still a number the network can send
const MAX_CLONES = 2;
export const TITAN_ATTACK_COOLDOWN = 0.6;
const BULLET_CUT_SLACK = 8; // shots are small and fast, so melee reaches them a little further out
const ENEMY = "#enemy"; // attacker id for damage dealt by monsters
const CLONE_SIGHT = 300;
const GATLING_GAP = 0.1; // seconds between GATLING PUNCH hits
const PORTAL_REACH = 14; // how close to a portal's centre you must walk to go through
const PORTAL_WAIT = 10; // seconds a lone portal waits for its partner
const MISSILE_SPEED = 210;
const MISSILE_TURN = 5; // radians per second a homing missile can turn
const MISSILE_LAUNCH = 0.25; // seconds missiles fly straight out before homing in
const REWIND_EVERY = 0.1; // seconds between TIME MACHINE snapshots

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
  /** 1 while a hero with a gun mode (SWAP MODE) has the gun out. */
  mode: number;
  /** Seconds left in which falling brings the hero straight back up (REVIVE). */
  revive: number;
  /** Seconds left behind a barrier that blocks all damage (IMMORTAL). */
  barrier: number;
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
}

export type BulletKind =
  | "snipe" | "wave" | "magic" | "fireball" | "enemy" | "banana" | "boulder" | "holy" | "stone" | "loki" | "glitch" | "bullet" | "slash"
  | "laser" | "missile" | "air" | "dragonfire"
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
}

interface ZoneBrain {
  owner: string;
  tick: number; // seconds until the next hit
  every: number;
  damage: number;
  /** Portals: the id of the portal this one leads to. */
  link?: string;
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

  addPlayer(id: string, name: string, hero: string): P {
    const def = heroOf(hero);
    const player = this.make.player();
    player.name = name.slice(0, 16) || "Riftborn";
    player.hero = hero in HEROES && !HEROES[hero as keyof typeof HEROES].summon ? hero : "superman";
    player.color = this.realPlayerCount() % 4;
    this.placeAtSpawn(player);
    player.maxHp = def.maxHp;
    player.hp = def.maxHp;
    this.state.players.set(id, player);
    this.brains.set(id, this.newBrain());
    return player;
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
      cloneLife: 0,
      moveBudget: 0,
      kbExtra: 0,
      kbx: 0,
      kby: 0,
    };
  }

  removePlayer(id: string) {
    this.state.players.delete(id);
    this.brains.delete(id);
    // A player's clones vanish with them.
    this.state.players.forEach((p, cid) => {
      if (p.owner === id) this.removePlayer(cid);
    });
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
    return this.pvpLive() && !!attacker && this.rootOf(attacker) !== this.rootOf(victim);
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
    };
    const p = this.state.players.get(id);
    if (p && Number.isFinite(input.x) && Number.isFinite(input.y) && input.warp === p.warp) {
      brain.target = { x: Number(input.x), y: Number(input.y), t: Number(input.t) || 0 };
    }
  }

  // ---------------------------------------------------------------- loop

  update(dt: number) {
    const s = this.state;

    if (s.timeStop > 0) {
      // ZA WARUDO: only the one who stopped time (and their own attacks) moves.
      s.timeStop = Math.max(0, s.timeStop - dt);
      const by = s.timeStopBy;
      if (s.timeStop <= 0 || !s.players.has(by)) {
        s.timeStop = 0;
        s.timeStopBy = "";
      } else {
        this.updatePlayers(dt, by);
        this.updateBullets(dt, by);
        this.updateZones(dt, by);
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
    else if (s.stage === "pvp") this.updatePvp(dt);
    else if (s.phase === "intermission") {
      s.phaseTimer -= dt;
      if (s.stage === "lava") s.lavaRadius = Math.min(LAVA_START_RADIUS, s.lavaRadius + LAVA_SHRINK_PER_SEC * 6 * dt);
      if (s.phaseTimer <= 0) this.startWave(s.wave + 1);
    } else if (s.phase === "fight") {
      if (s.stage === "lava") s.lavaRadius = Math.max(LAVA_MIN_RADIUS, s.lavaRadius - LAVA_SHRINK_PER_SEC * dt);
      if (s.enemies.size === 0) {
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
    if (s.stage === "boss" || s.stage === "pvp") {
      // No lava and no waves in the boss room or the arena.
      s.phaseTimer = s.stage === "pvp" ? PVP_COUNTDOWN : BOSS_INTRO_TIME;
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
    if (s.phase === "intermission") {
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
          this.placeAtSpawn(p);
          const brain = this.brains.get(id);
          if (brain) brain.target = undefined;
        });
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
    } else if (s.phase === "fight" && s.enemies.size === 0) {
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
  private updatePlayers(dt: number, only?: string) {
    const s = this.state;
    s.players.forEach((p, id) => {
      if (only && id !== only) return;
      const brain = this.brains.get(id);
      if (!brain) return;
      const input = brain.input;
      const hero = heroOf(p.hero);
      brain.hurtTimer = Math.max(0, brain.hurtTimer - dt);
      brain.attackTimer = Math.max(0, brain.attackTimer - dt);
      brain.kbExtra = Math.max(0, brain.kbExtra - KNOCKBACK_DISTANCE * 2 * dt);
      if (Math.abs(brain.kbx) + Math.abs(brain.kby) > 1) {
        const pushed = moveCircle(p.x, p.y, brain.kbx * dt, brain.kby * dt, PLAYER_RADIUS);
        p.x = pushed.x;
        p.y = pushed.y;
        const fade = Math.exp(-KNOCKBACK_DECAY * dt);
        brain.kbx *= fade;
        brain.kby *= fade;
      }
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      p.skillCooldown = Math.max(0, p.skillCooldown - dt);
      p.skill2Cooldown = Math.max(0, p.skill2Cooldown - dt);

      if (p.owner) {
        this.updateClone(id, p, brain, hero, dt);
        return;
      }

      if (p.dead) {
        brain.burstLeft = 0;
        brain.slashLeft = 0;
        brain.gatlingLeft = 0;
        p.titan = 0;
        p.barrier = 0;
        p.revive = 0;
        p.respawnIn = Math.max(0, p.respawnIn - dt);
        if (p.respawnIn <= 0) {
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
      if (p.barrier > 0) {
        // IMMORTAL: untouchable, and healing fast.
        p.barrier = Math.max(0, p.barrier - dt);
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * hero.skill.damage * dt);
      }

      p.aim = input.aim;
      const dir = inputDirection(input);

      // Dash
      if (input.dash && p.dashCooldown <= 0 && brain.dashTimer <= 0) {
        const d = dir.x || dir.y ? dir : { x: Math.cos(input.aim), y: Math.sin(input.aim) };
        brain.dashTimer = DASH_TIME;
        brain.dashX = d.x;
        brain.dashY = d.y;
        p.dashCooldown = DASH_COOLDOWN;
      }

      let moved;
      const dashingNow = brain.dashTimer > 0;
      if (dashingNow) brain.dashTimer -= dt;
      if (brain.target) {
        // The client moves its own hero (no rubber-banding); the server follows, but never
        // faster than the hero could run. The budget absorbs messages arriving in bursts.
        const speed = dashingNow ? DASH_SPEED : hero.speed;
        const cap = hero.speed * 0.5 + DASH_SPEED * DASH_TIME + brain.kbExtra;
        brain.moveBudget = Math.min(cap, brain.moveBudget + speed * 1.25 * dt);
        const dx = brain.target.x - p.x;
        const dy = brain.target.y - p.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(dist, brain.moveBudget);
        moved = dist > 0 ? moveCircle(p.x, p.y, (dx / dist) * step, (dy / dist) * step, PLAYER_RADIUS) : { x: p.x, y: p.y };
        brain.moveBudget -= Math.hypot(moved.x - p.x, moved.y - p.y);
        if (step === dist && Math.hypot(moved.x - brain.target.x, moved.y - brain.target.y) < 0.5) p.mt = brain.target.t;
      } else if (dashingNow) {
        moved = moveCircle(p.x, p.y, brain.dashX * DASH_SPEED * dt, brain.dashY * DASH_SPEED * dt, PLAYER_RADIUS);
      } else {
        moved = moveCircle(p.x, p.y, dir.x * hero.speed * dt, dir.y * hero.speed * dt, PLAYER_RADIUS);
      }
      p.x = moved.x;
      p.y = moved.y;
      p.dashing = brain.dashTimer > 0;

      // Basic attack
      p.titan = Math.max(0, p.titan - dt);
      if (input.shoot && brain.attackTimer <= 0) {
        brain.attackTimer = hero.attackCooldown;
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
        } else if (hero.attack === "rifle") {
          this.spawnBullet("snipe", p.x, p.y, input.aim, hero.shotSpeed, { owner: id, damage: hero.damage, pierce: hero.pierce, life: hero.range / hero.shotSpeed });
        } else if (hero.attack === "magic") {
          this.spawnBullet((hero.shot ?? "magic") as BulletKind, p.x, p.y, input.aim, hero.shotSpeed, { owner: id, damage: hero.damage, pierce: 0, life: hero.range / hero.shotSpeed, blast: hero.aoe });
        } else if (hero.attack === "lightning") {
          // Lightning strikes the ground a short way ahead and hits everything nearby.
          const tx = p.x + Math.cos(input.aim) * hero.range;
          const ty = p.y + Math.sin(input.aim) * hero.range;
          this.sweep(id, tx, ty, 0, hero.aoe, Math.PI * 2, hero.damage);
        } else {
          this.sweep(id, p.x, p.y, input.aim, hero.range, hero.arc, hero.damage, true);
        }
      }

      // Skills (ordinary humans under a reality change cannot use any)
      const powerless = s.reality > 0 && this.isFoe(s.realityBy, id);
      if (input.skill && p.skillCooldown <= 0 && hero.skill.kind !== "passive" && !powerless) {
        p.skillCooldown = hero.skill.cooldown;
        p.skillSeq++;
        this.useSkill(id, p, hero, hero.skill, brain);
      }
      if (hero.skill2 && input.skill2 && p.skill2Cooldown <= 0 && !powerless) {
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

      // Emberfall twist: the lava burns.
      if (inLava(p.x, p.y, s.lavaRadius)) this.damagePlayer(id, LAVA_DPS * dt, true);
    });
  }

  private useSkill(id: string, p: P, hero: HeroDef, skill: SkillDef, brain: PlayerBrain) {
    const s = this.state;
    switch (skill.kind) {
      case "smash": // ground pound that hits everything around you
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
          if (this.pvpLive() && this.rootOf(qid) !== id) return; // no healing your rivals
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
        const end = moveCircle(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
        const len = Math.hypot(end.x - p.x, end.y - p.y);
        this.lineHit(id, p.x, p.y, p.aim, len, skill.width ?? 24, skill.damage);
        p.x = end.x;
        p.y = end.y;
        p.warp = (p.warp + 1) % 256; // the client jumps with us
        brain.target = undefined;
        brain.hurtTimer = Math.max(brain.hurtTimer, 0.3);
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
      case "rewind":
        this.rewind(skill.duration ?? 2);
        this.addZone("rewind", p.x, p.y, 400, 0.8, { owner: id, every: Infinity, damage: 0 });
        break;
      case "summon":
        this.spawnSummon(id, p, skill.pet!, skill.damage, skill.count ?? 1, skill.duration ?? Infinity);
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
    }
  }

  /** PORTAL GUN: the first shot opens a portal, the second opens its partner and links them. */
  private openPortal(id: string, p: P, skill: SkillDef) {
    const end = moveCircle(p.x, p.y, Math.cos(p.aim) * skill.radius, Math.sin(p.aim) * skill.radius, PLAYER_RADIUS);
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

  /** Anyone who walks into a linked portal comes out of its partner. */
  private usePortal(zid: string, z: Z, link: string) {
    const out = this.state.zones.get(link);
    if (!out) return;
    this.state.players.forEach((p, pid) => {
      const brain = this.brains.get(pid);
      if (!brain || p.dead) return;
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
  private lineHit(owner: string, x: number, y: number, angle: number, length: number, width: number, damage: number, stun = 0) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const inLine = (tx: number, ty: number, r: number) => {
      const along = (tx - x) * cos + (ty - y) * sin;
      const across = Math.abs(-(tx - x) * sin + (ty - y) * cos);
      return along >= -r && along <= length + r && across <= width / 2 + r;
    };
    this.state.enemies.forEach((e, eid) => {
      const def = ENEMIES[e.kind as EnemyKind];
      if (!inLine(e.x, e.y, def.radius)) return;
      this.damageEnemy(eid, damage, owner);
      if (stun > 0 && !def.boss) e.stun = Math.max(e.stun, stun); // bosses shrug it off
    });
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(owner, vid) || !inLine(v.x, v.y, PLAYER_RADIUS)) return;
      this.damagePlayer(vid, damage * PVP_DAMAGE_SCALE, true, owner);
      if (stun > 0 && !v.dead) v.stun = Math.max(v.stun, stun);
    });
  }

  // -------------------------------------------------------------- clones

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
      c.name = hero === owner.hero ? "Clone" : def.name;
      c.hero = hero;
      c.owner = ownerId;
      c.color = owner.color;
      const a = owner.aim + Math.PI / 2 + (i * Math.PI * 2) / count;
      const spot = moveCircle(owner.x + Math.cos(a) * 20, owner.y + Math.sin(a) * 20, 0, 0, PLAYER_RADIUS);
      c.x = spot.x;
      c.y = spot.y;
      c.aim = owner.aim;
      c.maxHp = Math.max(1, Math.round(owner.maxHp * hpShare));
      c.hp = c.maxHp;
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
    if (!owner || owner.dead || brain.cloneLife <= 0 || c.dead) {
      this.removePlayer(id);
      return;
    }
    // Find something to fight: the nearest enemy, or a rival player in the arena.
    let tx = 0;
    let ty = 0;
    let best = CLONE_SIGHT;
    this.state.enemies.forEach((e) => {
      const d = Math.hypot(e.x - c.x, e.y - c.y);
      if (d < best) [best, tx, ty] = [d, e.x, e.y];
    });
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(id, vid)) return;
      const d = Math.hypot(v.x - c.x, v.y - c.y);
      if (d < best) [best, tx, ty] = [d, v.x, v.y];
    });
    let mx = 0;
    let my = 0;
    if (best < CLONE_SIGHT) {
      c.aim = Math.atan2(ty - c.y, tx - c.x);
      // Keep at casting distance.
      const want = best > hero.range * 0.7 ? 1 : best < hero.range * 0.35 ? -1 : 0;
      mx = Math.cos(c.aim) * want;
      my = Math.sin(c.aim) * want;
      if (brain.attackTimer <= 0 && best <= hero.range) {
        brain.attackTimer = hero.attackCooldown * (hero.summon ? 1 : 1.3);
        c.attackSeq++;
        if (hero.attack === "lightning") this.sweep(id, tx, ty, 0, hero.aoe, Math.PI * 2, hero.damage); // a bolt right on the target
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
    const moved = moveCircle(c.x, c.y, mx * hero.speed * dt, my * hero.speed * dt, PLAYER_RADIUS);
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

  private updateZones(dt: number, onlyOwner?: string) {
    const s = this.state;
    s.zones.forEach((z, id) => {
      const brain = this.zoneBrains.get(id);
      if (!brain || (onlyOwner && brain.owner !== onlyOwner)) return;
      z.life -= dt;
      brain.tick -= dt;
      if (brain.link) this.usePortal(id, z, brain.link);
      if (brain.tick <= 0) {
        brain.tick += brain.every;
        if (z.kind === "hurricane") {
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
      if (z.life <= 0 || (brain.link && !s.zones.has(brain.link))) this.removeZone(id);
    });
  }
  /** Hit every enemy inside a slice of a circle (a punch, a sword swing, or a full circle). */
  private sweep(owner: string, x: number, y: number, aim: number, range: number, arc: number, damage: number, knock = false) {
    if (knock) this.cutBullets(owner, x, y, aim, range, arc);
    this.state.enemies.forEach((e, eid) => {
      const def = ENEMIES[e.kind as EnemyKind];
      const dx = e.x - x;
      const dy = e.y - y;
      if (Math.hypot(dx, dy) > range + def.radius) return;
      if (arc < Math.PI * 2) {
        let diff = Math.atan2(dy, dx) - aim;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > arc / 2) return;
      }
      this.damageEnemy(eid, damage, owner);
      if (knock && !def.boss) this.knockEnemy(eid, dx, dy);
    });
    if (!this.pvpLive()) return;
    this.state.players.forEach((v, vid) => {
      if (!this.isFoe(owner, vid) || v.dead) return;
      const dx = v.x - x;
      const dy = v.y - y;
      if (Math.hypot(dx, dy) > range + PLAYER_RADIUS) return;
      if (arc < Math.PI * 2) {
        let diff = Math.atan2(dy, dx) - aim;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > arc / 2) return;
      }
      this.damagePlayer(vid, damage * PVP_DAMAGE_SCALE, true, owner);
      if (knock) this.knockPlayer(vid, dx, dy);
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
    for (const id of cut) this.removeBullet(id);
  }

  /** Push an enemy away along (dx, dy). */
  private knockEnemy(eid: string, dx: number, dy: number) {
    const brain = this.enemyBrains.get(eid);
    if (!brain) return; // it died from the hit
    const d = Math.hypot(dx, dy) || 1;
    brain.kbx = (dx / d) * KNOCKBACK_DISTANCE * KNOCKBACK_DECAY;
    brain.kby = (dy / d) * KNOCKBACK_DISTANCE * KNOCKBACK_DECAY;
  }

  /**
   * Push a player away along (dx, dy). Real players move on their own device, so the push is sent
   * to it (kbSeq) and the server lets them move that much further; clones are pushed here.
   */
  private knockPlayer(id: string, dx: number, dy: number) {
    const p = this.state.players.get(id);
    const brain = this.brains.get(id);
    if (!p || !brain || p.dead) return;
    const d = Math.hypot(dx, dy) || 1;
    p.kbx = (dx / d) * KNOCKBACK_DISTANCE * KNOCKBACK_DECAY;
    p.kby = (dy / d) * KNOCKBACK_DISTANCE * KNOCKBACK_DECAY;
    p.kbSeq = (p.kbSeq + 1) % 256;
    brain.kbExtra = KNOCKBACK_DISTANCE;
    brain.moveBudget += KNOCKBACK_DISTANCE;
    if (p.owner || !brain.target) {
      brain.kbx = p.kbx;
      brain.kby = p.kby;
    }
  }

  /** True while players can hurt each other. */
  private pvpLive() {
    return this.state.stage === "pvp" && this.state.phase === "fight";
  }

  private damagePlayer(id: string, amount: number, ignoreIframes = false, attacker?: string) {
    const p = this.state.players.get(id);
    const brain = this.brains.get(id);
    if (!p || !brain || p.dead || p.dashing) return;
    if (heroOf(p.hero).invincible || p.barrier > 0) return;
    // Under Yaotsu's reality change, ordinary humans hit for 1.
    if (this.state.reality > 0 && attacker && (attacker === ENEMY || this.isFoe(this.state.realityBy, attacker))) {
      amount = Math.min(amount, 1);
    }
    if (!ignoreIframes) {
      if (brain.hurtTimer > 0) return;
      brain.hurtTimer = HURT_IFRAMES;
    }
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
      if (killer && this.pvpLive()) {
        killer.score++;
        if (killer.score >= PVP_KILLS_TO_WIN) {
          this.state.phase = "victory";
          this.state.phaseTimer = 8;
          this.state.winner = killer.name;
        }
      }
    }
  }

  private placeAtSpawn(p: P) {
    const a = Math.random() * Math.PI * 2;
    // In the arena, spread players out so nobody spawns on top of an enemy player.
    const r = this.state.stage === "pvp" ? 120 + Math.random() * 160 : 30;
    const spot = moveCircle(CENTER_X + Math.cos(a) * r, CENTER_Y + Math.sin(a) * r, 0, 0, PLAYER_RADIUS);
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
        if (!hitsRock(e.x, e.y)) break;
      }
    }
    const id = `e${this.nextId++}`;
    this.state.enemies.set(id, e);
    this.enemyBrains.set(id, { shootTimer: (def.shootEvery ?? 0) * Math.random() + 1, burstAngle: 0, beamTimer: 3, kbx: 0, kby: 0 });
  }

  private damageEnemy(eid: string, damage: number, owner?: string) {
    const e = this.state.enemies.get(eid);
    if (!e) return;
    e.hp -= damage;
    e.hitFlash = 0.1;
    if (e.hp <= 0) {
      this.state.enemies.delete(eid);
      this.enemyBrains.delete(eid);
      const killer = this.state.players.get(this.rootOf(owner));
      if (killer) killer.score += ENEMIES[e.kind as EnemyKind].score;
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
      if (p.dead) return;
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
      if (Math.abs(brain.kbx) + Math.abs(brain.kby) > 1) {
        const pushed = moveCircle(e.x, e.y, brain.kbx * dt, brain.kby * dt, def.radius);
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
      const moved = moveCircle(e.x, e.y, dirX * def.speed * dt, dirY * def.speed * dt, def.radius);
      e.x = moved.x;
      e.y = moved.y;

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
      const moved = moveCircle(e.x, e.y, Math.cos(e.beamAngle) * d.speed * dt, Math.sin(e.beamAngle) * d.speed * dt, def.radius);
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
        const moved = moveCircle(e.x, e.y, Math.cos(e.beamAngle) * f.lunge, Math.sin(e.beamAngle) * f.lunge, def.radius);
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
    const moved = moveCircle(e.x, e.y, Math.cos(e.beamAngle) * KONG_CHARGE_SPEED * dt, Math.sin(e.beamAngle) * KONG_CHARGE_SPEED * dt, def.radius);
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
    const b = this.make.bullet();
    b.kind = kind;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.hostile = kind === "enemy" || kind === "banana" || kind === "boulder" || kind === "slash";
    const id = `b${this.nextId++}`;
    this.state.bullets.set(id, b);
    this.bulletBrains.set(id, { owner: opts.owner, damage: opts.damage, pierceLeft: opts.pierce, life: opts.life, hit: new Set(), blast: opts.blast ?? 0 });
    return id;
  }

  private removeBullet(id: string) {
    this.state.bullets.delete(id);
    this.bulletBrains.delete(id);
  }

  private updateBullets(dt: number, onlyOwner?: string) {
    const s = this.state;
    s.bullets.forEach((b, id) => {
      const brain = this.bulletBrains.get(id)!;
      if (onlyOwner && brain.owner !== onlyOwner) return;
      if (brain.homing) this.steerMissile(b, brain, dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      brain.life -= dt;
      // Sword waves and missiles fly over rocks; bullets do not.
      const blocked = b.kind !== "wave" && b.kind !== "missile" && hitsRock(b.x, b.y);
      if (brain.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H || blocked) {
        if (brain.blast > 0) this.sweep(brain.owner ?? "", b.x, b.y, 0, brain.blast, Math.PI * 2, brain.damage);
        this.removeBullet(id);
        return;
      }

      if (b.hostile) {
        s.players.forEach((p, pid) => {
          if (!s.bullets.has(id) || p.dead || p.dashing) return;
          if (Math.hypot(p.x - b.x, p.y - b.y) < PLAYER_RADIUS + 2) {
            this.damagePlayer(pid, brain.damage, false, ENEMY);
            this.removeBullet(id);
          }
        });
        return;
      }

      const hitRadius = b.kind === "wave" ? 14 : b.kind === "fireball" ? 8 : b.kind === "missile" || b.kind.startsWith("card") ? 5 : 2;
      if (this.pvpLive()) {
        s.players.forEach((v, vid) => {
          if (!s.bullets.has(id) || !this.isFoe(brain.owner, vid) || v.dead || brain.hit.has(vid)) return;
          if (Math.hypot(v.x - b.x, v.y - b.y) >= PLAYER_RADIUS + hitRadius) return;
          if (brain.blast > 0) {
            this.sweep(brain.owner ?? "", b.x, b.y, 0, brain.blast, Math.PI * 2, brain.damage);
            this.removeBullet(id);
            return;
          }
          brain.hit.add(vid);
          this.damagePlayer(vid, (brain.pct ? v.maxHp * brain.pct : brain.damage) * PVP_DAMAGE_SCALE, true, brain.owner);
          if (brain.pierceLeft <= 0) this.removeBullet(id);
          else brain.pierceLeft--;
        });
        if (!s.bullets.has(id)) return;
      }
      s.enemies.forEach((e, eid) => {
        if (!s.bullets.has(id) || brain.hit.has(eid)) return;
        const def = ENEMIES[e.kind as EnemyKind];
        if (Math.hypot(e.x - b.x, e.y - b.y) < def.radius + hitRadius) {
          if (brain.blast > 0) {
            // Magic explodes on the first enemy it touches.
            this.sweep(brain.owner ?? "", b.x, b.y, 0, brain.blast, Math.PI * 2, brain.damage);
            this.removeBullet(id);
            return;
          }
          brain.hit.add(eid);
          // A drawn card takes its share of the monster's max HP (a tenth of that on bosses).
          this.damageEnemy(eid, brain.pct ? e.maxHp * brain.pct * (def.boss ? 0.1 : 1) : brain.damage, brain.owner);
          if (brain.pierceLeft <= 0) this.removeBullet(id);
          else brain.pierceLeft--;
        }
      });
    });
  }

  /** Turn a homing missile toward the nearest monster (or rival, in PvP). */
  private steerMissile(b: B, brain: BulletBrain, dt: number) {
    brain.age = (brain.age ?? 0) + dt;
    if (brain.age < MISSILE_LAUNCH) return;
    let best = Infinity;
    let tx = 0;
    let ty = 0;
    this.state.enemies.forEach((e) => {
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < best) [best, tx, ty] = [d, e.x, e.y];
    });
    this.state.players.forEach((v, vid) => {
      if (v.dead || !this.isFoe(brain.owner, vid)) return;
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
}
