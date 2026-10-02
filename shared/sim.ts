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
  INTERMISSION_TIME,
  LAVA_DPS,
  LAVA_MIN_RADIUS,
  LAVA_SHRINK_PER_SEC,
  LAVA_START_RADIUS,
  PLAYER_RADIUS,
  PlayerInput,
  RESPAWN_TIME,
  WAVES,
  WAVE_COUNT,
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
  respawnIn: number;
  score: number;
  color: number;
  /** Goes up by one on every basic attack, so clients can play the swing effect. */
  attackSeq: number;
  /** Goes up by one every time the skill is used. */
  skillSeq: number;
}

export interface SimEnemy {
  kind: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
}

export type BulletKind = "snipe" | "wave" | "enemy";

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

export interface SimState<P extends SimPlayer, E extends SimEnemy, B extends SimBullet> {
  players: SimCollection<P>;
  enemies: SimCollection<E>;
  bullets: SimCollection<B>;
  phase: string;
  wave: number;
  phaseTimer: number;
  lavaRadius: number;
}

export interface SimFactory<P, E, B> {
  player(): P;
  enemy(): E;
  bullet(): B;
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
}

interface EnemyBrain {
  shootTimer: number;
  burstAngle: number;
}

interface BulletBrain {
  owner?: string;
  damage: number;
  pierceLeft: number;
  life: number; // seconds left
  hit: Set<string>;
}

export class RiftSim<P extends SimPlayer, E extends SimEnemy, B extends SimBullet> {
  private brains = new Map<string, PlayerBrain>();
  private enemyBrains = new Map<string, EnemyBrain>();
  private bulletBrains = new Map<string, BulletBrain>();
  private nextId = 1;

  constructor(
    readonly state: SimState<P, E, B>,
    private make: SimFactory<P, E, B>,
  ) {
    this.startIntermission(0);
  }

  addPlayer(id: string, name: string, hero: string): P {
    const def = heroOf(hero);
    const player = this.make.player();
    player.name = name.slice(0, 16) || "Riftborn";
    player.hero = hero in HEROES ? hero : "superman";
    player.color = this.state.players.size % 4;
    this.placeAtSpawn(player);
    player.maxHp = def.maxHp;
    player.hp = def.maxHp;
    this.state.players.set(id, player);
    this.brains.set(id, {
      input: { ...EMPTY_INPUT },
      attackTimer: 0,
      dashTimer: 0,
      dashX: 0,
      dashY: 0,
      hurtTimer: 0,
      burstLeft: 0,
      burstTimer: 0,
    });
    return player;
  }

  removePlayer(id: string) {
    this.state.players.delete(id);
    this.brains.delete(id);
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
    };
  }

  // ---------------------------------------------------------------- loop

  update(dt: number) {
    const s = this.state;

    if (s.phase === "intermission") {
      s.phaseTimer -= dt;
      s.lavaRadius = Math.min(LAVA_START_RADIUS, s.lavaRadius + LAVA_SHRINK_PER_SEC * 6 * dt);
      if (s.phaseTimer <= 0) this.startWave(s.wave + 1);
    } else if (s.phase === "fight") {
      s.lavaRadius = Math.max(LAVA_MIN_RADIUS, s.lavaRadius - LAVA_SHRINK_PER_SEC * dt);
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
  }

  private startIntermission(wave: number) {
    this.state.phase = "intermission";
    this.state.wave = wave;
    this.state.phaseTimer = INTERMISSION_TIME;
    if (wave === 0) this.state.lavaRadius = LAVA_START_RADIUS;
  }

  private startWave(wave: number) {
    const s = this.state;
    s.phase = "fight";
    s.wave = wave;
    s.phaseTimer = 0;
    const counts = WAVES[wave - 1] ?? {};
    for (const [kind, count] of Object.entries(counts) as [EnemyKind, number][]) {
      for (let i = 0; i < count; i++) this.spawnEnemy(kind);
    }
  }

  // ------------------------------------------------------------- players

  private updatePlayers(dt: number) {
    const s = this.state;
    s.players.forEach((p, id) => {
      const brain = this.brains.get(id)!;
      const input = brain.input;
      const hero = heroOf(p.hero);
      brain.hurtTimer = Math.max(0, brain.hurtTimer - dt);
      brain.attackTimer = Math.max(0, brain.attackTimer - dt);
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      p.skillCooldown = Math.max(0, p.skillCooldown - dt);

      if (p.dead) {
        brain.burstLeft = 0;
        p.respawnIn = Math.max(0, p.respawnIn - dt);
        if (p.respawnIn <= 0) {
          p.dead = false;
          p.hp = Math.round(p.maxHp / 2);
          this.placeAtSpawn(p);
          brain.hurtTimer = 1.5;
        }
        return;
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
      if (brain.dashTimer > 0) {
        brain.dashTimer -= dt;
        moved = moveCircle(p.x, p.y, brain.dashX * DASH_SPEED * dt, brain.dashY * DASH_SPEED * dt, PLAYER_RADIUS);
      } else {
        moved = moveCircle(p.x, p.y, dir.x * hero.speed * dt, dir.y * hero.speed * dt, PLAYER_RADIUS);
      }
      p.x = moved.x;
      p.y = moved.y;
      p.dashing = brain.dashTimer > 0;

      // Basic attack
      if (input.shoot && brain.attackTimer <= 0) {
        brain.attackTimer = hero.attackCooldown;
        p.attackSeq++;
        if (hero.attack === "rifle") {
          this.spawnBullet("snipe", p.x, p.y, input.aim, hero.shotSpeed, { owner: id, damage: hero.damage, pierce: hero.pierce, life: hero.range / hero.shotSpeed });
        } else {
          this.sweep(id, p.x, p.y, input.aim, hero.range, hero.arc, hero.damage);
        }
      }

      // Skill
      if (input.skill && p.skillCooldown <= 0) {
        p.skillCooldown = hero.skill.cooldown;
        p.skillSeq++;
        this.useSkill(id, p, hero, brain);
      }

      // Sniper burst continues over a few ticks.
      if (brain.burstLeft > 0) {
        brain.burstTimer -= dt;
        if (brain.burstTimer <= 0) {
          brain.burstLeft--;
          brain.burstTimer = SNIPER_BURST_GAP;
          p.attackSeq++;
          this.spawnBullet("snipe", p.x, p.y, input.aim, hero.shotSpeed, { owner: id, damage: hero.skill.damage, pierce: 99, life: hero.range / hero.shotSpeed });
        }
      }

      // Emberfall twist: the lava burns.
      if (inLava(p.x, p.y, s.lavaRadius)) this.damagePlayer(id, LAVA_DPS * dt, true);
    });
  }

  private useSkill(id: string, p: P, hero: HeroDef, brain: PlayerBrain) {
    if (hero.attack === "punch") {
      // SMASH: ground pound that hits everything around you.
      this.sweep(id, p.x, p.y, 0, hero.skill.radius, Math.PI * 2, hero.skill.damage);
    } else if (hero.attack === "sword") {
      // SKY SLASH: a flying sword wave that cuts through every enemy in its path.
      const speed = 300;
      this.spawnBullet("wave", p.x, p.y, p.aim, speed, { owner: id, damage: hero.skill.damage, pierce: 99, life: hero.skill.radius / speed });
    } else {
      // WHITE DEATH: three rapid piercing shots.
      brain.burstLeft = SNIPER_BURST;
      brain.burstTimer = 0;
    }
  }

  /** Hit every enemy inside a slice of a circle (a punch, a sword swing, or a full circle). */
  private sweep(owner: string, x: number, y: number, aim: number, range: number, arc: number, damage: number) {
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
    });
  }

  private damagePlayer(id: string, amount: number, ignoreIframes = false) {
    const p = this.state.players.get(id);
    const brain = this.brains.get(id);
    if (!p || !brain || p.dead || p.dashing) return;
    if (!ignoreIframes) {
      if (brain.hurtTimer > 0) return;
      brain.hurtTimer = HURT_IFRAMES;
    }
    p.hp = Math.max(0, p.hp - amount);
    if (p.hp <= 0) {
      p.dead = true;
      p.respawnIn = RESPAWN_TIME;
    }
  }

  private placeAtSpawn(p: P) {
    const a = Math.random() * Math.PI * 2;
    p.x = CENTER_X + Math.cos(a) * 30;
    p.y = CENTER_Y + Math.sin(a) * 30;
  }

  // ------------------------------------------------------------- enemies

  private spawnEnemy(kind: EnemyKind) {
    const def = ENEMIES[kind];
    const e = this.make.enemy();
    e.kind = kind;
    e.hp = def.hp * this.hpScale();
    e.maxHp = e.hp;
    if (kind === "warden") {
      e.x = CENTER_X;
      e.y = CENTER_Y - 160;
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
    this.enemyBrains.set(id, { shootTimer: (def.shootEvery ?? 0) * Math.random() + 1, burstAngle: 0 });
  }

  private damageEnemy(eid: string, damage: number, owner?: string) {
    const e = this.state.enemies.get(eid);
    if (!e) return;
    e.hp -= damage;
    e.hitFlash = 0.1;
    if (e.hp <= 0) {
      this.state.enemies.delete(eid);
      this.enemyBrains.delete(eid);
      const killer = owner && this.state.players.get(owner);
      if (killer) killer.score += ENEMIES[e.kind as EnemyKind].score;
    }
  }

  /** More players means tougher enemies. */
  private hpScale() {
    return 1 + 0.5 * Math.max(0, this.state.players.size - 1);
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
      const target = this.nearestPlayer(e.x, e.y);
      if (!target) return;
      const [targetId, p] = target;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Casters keep their distance; everyone else charges.
      let dirX = dx / dist;
      let dirY = dy / dist;
      if (e.kind === "caster" && dist < 110) {
        dirX = -dirX;
        dirY = -dirY;
      }
      const moved = moveCircle(e.x, e.y, dirX * def.speed * dt, dirY * def.speed * dt, def.radius);
      e.x = moved.x;
      e.y = moved.y;

      if (dist < def.radius + PLAYER_RADIUS) this.damagePlayer(targetId, def.touchDamage);

      if (def.shootEvery) {
        brain.shootTimer -= dt;
        if (brain.shootTimer <= 0) {
          brain.shootTimer = def.shootEvery;
          const aim = Math.atan2(dy, dx);
          const shot = { damage: ENEMY_SHOT_DAMAGE, pierce: 0, life: 6 };
          if (e.kind === "warden") {
            // Rotating ring of fire plus a shot aimed at the target.
            brain.burstAngle += 0.25;
            for (let i = 0; i < 14; i++) {
              this.spawnBullet("enemy", e.x, e.y, brain.burstAngle + (i * Math.PI * 2) / 14, ENEMY_SHOT_SPEED * 0.8, shot);
            }
            for (const off of [-0.15, 0, 0.15]) this.spawnBullet("enemy", e.x, e.y, aim + off, ENEMY_SHOT_SPEED * 1.3, shot);
          } else {
            this.spawnBullet("enemy", e.x, e.y, aim, ENEMY_SHOT_SPEED, shot);
          }
        }
      }
    });
  }

  // ------------------------------------------------------------- bullets

  private spawnBullet(
    kind: BulletKind,
    x: number,
    y: number,
    angle: number,
    speed: number,
    opts: { owner?: string; damage: number; pierce: number; life: number },
  ) {
    const b = this.make.bullet();
    b.kind = kind;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.hostile = kind === "enemy";
    const id = `b${this.nextId++}`;
    this.state.bullets.set(id, b);
    this.bulletBrains.set(id, { owner: opts.owner, damage: opts.damage, pierceLeft: opts.pierce, life: opts.life, hit: new Set() });
    return id;
  }

  private removeBullet(id: string) {
    this.state.bullets.delete(id);
    this.bulletBrains.delete(id);
  }

  private updateBullets(dt: number) {
    const s = this.state;
    s.bullets.forEach((b, id) => {
      const brain = this.bulletBrains.get(id)!;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      brain.life -= dt;
      // Sword waves fly over rocks; bullets do not.
      const blocked = b.kind !== "wave" && hitsRock(b.x, b.y);
      if (brain.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H || blocked) {
        this.removeBullet(id);
        return;
      }

      if (b.hostile) {
        s.players.forEach((p, pid) => {
          if (!s.bullets.has(id) || p.dead || p.dashing) return;
          if (Math.hypot(p.x - b.x, p.y - b.y) < PLAYER_RADIUS + 2) {
            this.damagePlayer(pid, brain.damage);
            this.removeBullet(id);
          }
        });
        return;
      }

      const hitRadius = b.kind === "wave" ? 14 : 2;
      s.enemies.forEach((e, eid) => {
        if (!s.bullets.has(id) || brain.hit.has(eid)) return;
        const def = ENEMIES[e.kind as EnemyKind];
        if (Math.hypot(e.x - b.x, e.y - b.y) < def.radius + hitRadius) {
          brain.hit.add(eid);
          this.damageEnemy(eid, brain.damage, brain.owner);
          if (brain.pierceLeft <= 0) this.removeBullet(id);
          else brain.pierceLeft--;
        }
      });
    });
  }
}
