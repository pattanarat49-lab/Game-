import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import {
  CENTER_X,
  CENTER_Y,
  ENEMIES,
  EnemyKind,
  MAP_COLS,
  MAP_ROWS,
  PLAYER_RADIUS,
  PlayerInput,
  ROOM_NAME,
  SERVER_PORT,
  TILE,
  WORLD_H,
  WORLD_W,
  BEAM_LENGTH,
  BEAM_WIDTH,
  HEROES,
  SkillDef,
  DASH_COOLDOWN,
  DASH_SPEED,
  DASH_TIME,
  stageOf,
  heroOf,
  inLava,
  inputDirection,
  moveCircle,
} from "../../../shared/game";
import type { HudScene } from "./HudScene";
import { LocalRoom } from "../localRoom";

interface PlayerView {
  body: Phaser.GameObjects.Image;
  weapon?: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Graphics;
  lastHp: number;
  hurtFlash: number;
  attackSeq: number;
  skillSeq: number;
  skill2Seq: number;
}

/** A short-lived swing, slash or shockwave drawn on top of the world. */
interface Effect {
  kind: "punch" | "sword" | "smash" | "muzzle" | "bolt" | "storm" | "blast" | "impact" | "heal" | "line" | "slashes" | "ripple";
  x: number;
  y: number;
  aim: number;
  range: number;
  arc: number;
  age: number;
  life: number;
}

const WEAPON_TEXTURE: Record<string, string | undefined> = { isekai: "sword", simo: "rifle", okita: "sword" };
const BULLET_TEXTURE: Record<string, string> = {
  snipe: "snipe",
  wave: "wave",
  magic: "magic",
  fireball: "calcifer",
  enemy: "eshot",
  holy: "holy",
  stone: "stone",
  loki: "lokishot",
};
const PLAYER_MARKERS = [0x3b7dd8, 0xd84b3b, 0x3bd87a, 0xc93bd8];

interface EnemyView {
  sprite: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number; // smoothed on-screen velocity, for L's foresight
  vy: number;
  ghost?: Phaser.GameObjects.Image;
}

/** A position, stamped with the time it was true (on our clock). */
interface Sample {
  t: number;
  x: number;
  y: number;
}

/**
 * Recent positions of one entity, drawn slightly in the past so there is always an update on
 * either side to blend between. Each update carries the clock time it was true on the machine
 * that produced it; we map that onto our clock using the smallest delay seen so far, so updates
 * that arrive late or in bunches still play back evenly spaced.
 */
class Track {
  list: Sample[] = [];
  warp = -1;
  private offset?: number;
  private lastStamp = 0;
  private gap = 33; // ms between updates
  private late = 20; // how far behind the fastest update they typically arrive

  add(now: number, stamp: number, x: number, y: number) {
    if (stamp <= this.lastStamp) return;
    const offset = now - stamp;
    if (this.offset === undefined || offset < this.offset) this.offset = offset;
    else this.offset += (offset - this.offset) * 0.002; // follow slow clock drift
    if (this.lastStamp) this.gap += (Math.min(250, stamp - this.lastStamp) - this.gap) * 0.1;
    this.lastStamp = stamp;
    const t = stamp + this.offset;
    this.late += (now - t - this.late) * 0.05;
    this.list.push({ t, x, y });
    if (this.list.length > 30) this.list.shift();
  }

  at(now: number): { x: number; y: number } | undefined {
    const list = this.list;
    if (list.length === 0) return undefined;
    const t = now - Math.min(300, Math.max(50, this.gap * 1.5 + this.late * 2 + 10));
    while (list.length > 2 && list[1].t <= t) list.shift();
    const [a, b] = list;
    if (!b || t <= a.t) return { x: a.x, y: a.y };
    if (t >= b.t) return { x: b.x, y: b.y };
    // A jump (respawn) is drawn as a jump, not a slide across the map.
    if (Math.hypot(b.x - a.x, b.y - a.y) > 120) return { x: b.x, y: b.y };
    const f = (t - a.t) / (b.t - a.t);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }
}

const ENEMY_SCALE: Record<EnemyKind, number> = { cinderling: 1, brute: 1.3, caster: 1, warden: 2.4, godzilla: 2.4 };

export function serverUrl(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  // In dev the client runs on Vite (5173) and the server on its own port.
  return location.port === "5173" ? `${proto}://${location.hostname}:${SERVER_PORT}` : `${proto}://${location.host}`;
}

export class GameScene extends Phaser.Scene {
  room?: Room<any> | LocalRoom;
  private players = new Map<string, PlayerView>();
  private enemies = new Map<string, EnemyView>();
  private bullets = new Map<string, Phaser.GameObjects.Image>();
  private lavaLayer!: Phaser.Tilemaps.TilemapLayer;
  private lavaDrawnRadius = -1;
  private lavaFrame = 0;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private predicted = { x: CENTER_X, y: CENTER_Y };
  private warp = -1;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDir = { x: 0, y: 0 };
  private driftTime = 0;
  private sendTimer = 0;
  private lastButtons = "";
  private lastSentPos = "";
  /** Recent positions of other players and enemies, for smooth interpolation online. */
  private tracks = new Map<string, Track>();
  private cameraTarget!: Phaser.GameObjects.Zone;
  private aim = 0;
  private effects: Effect[] = [];
  private fx!: Phaser.GameObjects.Graphics;
  private aimGuide!: Phaser.GameObjects.Graphics;
  private beams!: Phaser.GameObjects.Graphics;
  private zoneFloor!: Phaser.GameObjects.Graphics;
  private zoneSky!: Phaser.GameObjects.Graphics;
  private zoneImages = new Map<string, Phaser.GameObjects.Image>();
  private wasTimeStopped = false;

  constructor() {
    super("Game");
  }

  async create() {
    const stage = stageOf(this.registry.get("stage"));
    this.add.image(0, 0, `ground_${stage}`).setOrigin(0).setDepth(-10);

    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: MAP_COLS, height: MAP_ROWS });
    const tiles = map.addTilesetImage("lava", "lava", TILE, TILE, 0, 0)!;
    this.lavaLayer = map.createBlankLayer("lava", tiles)!.setDepth(-5);
    this.time.addEvent({ delay: 400, loop: true, callback: () => this.animateLava() });

    this.sparks = this.add.particles(0, 0, "spark", {
      speed: { min: 40, max: 140 },
      lifespan: 400,
      scale: { start: 1.5, end: 0 },
      emitting: false,
    });
    this.sparks.setDepth(50);
    this.fx = this.add.graphics().setDepth(950);
    this.aimGuide = this.add.graphics().setDepth(-1);
    this.beams = this.add.graphics().setDepth(940);
    this.zoneFloor = this.add.graphics().setDepth(-3);
    this.zoneSky = this.add.graphics().setDepth(960);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,E,ONE,TWO") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.input.mouse?.disableContextMenu();

    this.cameraTarget = this.add.zone(CENTER_X, CENTER_Y, 1, 1);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setZoom(2);
    // Lock the camera to our hero; smoothing on top of rounded pixels makes sprites shimmer.
    cam.startFollow(this.cameraTarget, true, 1, 1);
    cam.setRoundPixels(true);

    if (this.registry.get("solo")) {
      this.room = new LocalRoom(this.registry.get("playerName"), this.registry.get("hero"), stage);
      this.scene.launch("Hud");
      return;
    }
    try {
      const client = new Client(serverUrl());
      this.room = await client.joinOrCreate(ROOM_NAME, { name: this.registry.get("playerName"), hero: this.registry.get("hero"), stage });
    } catch (err) {
      console.error(err);
      this.game.events.emit("connection-error", err);
      return;
    }
    this.room.onLeave(() => this.game.events.emit("connection-error", new Error("Disconnected from server")));
    this.room.onStateChange((state: any) => this.recordSnapshot(state));
    this.scene.launch("Hud");
  }

  update(_time: number, deltaMs: number) {
    const room = this.room;
    if (!room?.state?.players) return;
    const dt = Math.min(deltaMs, 100) / 1000;
    const state = room.state;
    if (room instanceof LocalRoom) room.step(dt);

    const input = this.readInput();
    this.predictLocal(input, dt);
    this.sendInput(input, dt);

    this.syncPlayers(state, dt);
    this.syncEnemies(state, dt);
    this.syncBullets(state, dt);
    this.drawEffects(dt);
    this.drawAimGuide(state);
    this.drawLava(state.lavaRadius);
    this.drawZones(state, dt);
  }

  // --------------------------------------------------------------- input

  private readInput(): PlayerInput {
    const me = this.room?.state.players.get(this.room.sessionId);
    const alive = !!me && !me.dead;
    const touch = (this.scene.get("Hud") as HudScene | undefined)?.touch;

    if (touch) {
      this.aim = touch.aimAngle;
      const dir = touch.directions;
      return {
        left: alive && dir.left,
        right: alive && dir.right,
        up: alive && dir.up,
        down: alive && dir.down,
        aim: Math.round(this.aim * 1000) / 1000,
        shoot: alive && touch.shooting,
        dash: alive && touch.dashing,
        skill: alive && touch.skilling,
        skill2: alive && touch.skilling2,
      };
    }

    const k = this.keys;
    const pointer = this.input.activePointer;
    pointer.updateWorldPoint(this.cameras.main);
    this.aim = Math.atan2(pointer.worldY - this.predicted.y, pointer.worldX - this.predicted.x);
    return {
      left: alive && (k.A.isDown || k.LEFT.isDown),
      right: alive && (k.D.isDown || k.RIGHT.isDown),
      up: alive && (k.W.isDown || k.UP.isDown),
      down: alive && (k.S.isDown || k.DOWN.isDown),
      aim: Math.round(this.aim * 1000) / 1000,
      shoot: alive && pointer.leftButtonDown(),
      dash: alive && k.SPACE.isDown,
      // Heroes with two skills use E / 2 for the second one; otherwise E is another skill key.
      skill: alive && (k.Q.isDown || k.ONE.isDown || pointer.rightButtonDown() || (!this.hasSkill2(me) && k.E.isDown)),
      skill2: alive && this.hasSkill2(me) && (k.E.isDown || k.TWO.isDown),
    };
  }

  private hasSkill2(me: any): boolean {
    return !!me && !!heroOf(me.hero).skill2;
  }

  private sendInput(input: PlayerInput, dt: number) {
    this.sendTimer -= dt;
    const me = this.room!.state.players.get(this.room!.sessionId);
    const buttons = JSON.stringify({ ...input, aim: 0 });
    const pos = `${Math.round(this.predicted.x * 10)},${Math.round(this.predicted.y * 10)},${input.aim}`;
    // Button presses go out at once; movement and aim about 30 times a second; a heartbeat otherwise.
    const due = buttons !== this.lastButtons || (this.sendTimer <= 0 && pos !== this.lastSentPos) || this.sendTimer <= -0.1;
    if (!due) return;
    const msg: PlayerInput = { ...input };
    if (me && !me.dead) {
      msg.x = Math.round(this.predicted.x * 10) / 10;
      msg.y = Math.round(this.predicted.y * 10) / 10;
      msg.warp = me.warp;
      msg.t = Math.round(performance.now());
    }
    this.room!.send("input", msg);
    this.lastButtons = buttons;
    this.lastSentPos = pos;
    this.sendTimer = 1 / 30;
  }

  /**
   * Our own hero moves on this device, right away and at full frame rate (dash included).
   * The server follows the position we send and only overrides it on spawns or if we drift far off.
   */
  private predictLocal(input: PlayerInput, dt: number) {
    const me = this.room!.state.players.get(this.room!.sessionId);
    if (!me) return;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    const state = this.room!.state;
    const frozen = state.timeStop > 0 && state.timeStopBy !== this.room!.sessionId;
    if (me.dead || me.warp !== this.warp) {
      this.warp = me.warp;
      this.predicted = { x: me.x, y: me.y };
      this.dashTimer = 0;
    } else if (frozen) {
      // Someone stopped time: we cannot move until it flows again.
      this.dashTimer = 0;
    } else {
      const dir = inputDirection(input);
      if (input.dash && this.dashTimer <= 0 && this.dashCooldown <= 0 && me.dashCooldown <= 0) {
        this.dashDir = dir.x || dir.y ? dir : { x: Math.cos(input.aim), y: Math.sin(input.aim) };
        this.dashTimer = DASH_TIME;
        this.dashCooldown = DASH_COOLDOWN;
      }
      let vx = dir.x * heroOf(me.hero).speed;
      let vy = dir.y * heroOf(me.hero).speed;
      if (this.dashTimer > 0) {
        this.dashTimer -= dt;
        vx = this.dashDir.x * DASH_SPEED;
        vy = this.dashDir.y * DASH_SPEED;
      }
      this.predicted = moveCircle(this.predicted.x, this.predicted.y, vx * dt, vy * dt, PLAYER_RADIUS);

      // Safety net: if the server keeps us somewhere else, ease back to it.
      const err = Math.hypot(me.x - this.predicted.x, me.y - this.predicted.y);
      const allowed = heroOf(me.hero).speed * 0.5 + 40;
      this.driftTime = err > allowed ? this.driftTime + dt : 0;
      if (this.driftTime > 0.4) {
        const k = 1 - Math.exp(-8 * dt);
        this.predicted.x += (me.x - this.predicted.x) * k;
        this.predicted.y += (me.y - this.predicted.y) * k;
      }
    }
    this.cameraTarget.setPosition(this.predicted.x, this.predicted.y);
  }

  // ------------------------------------------------------- interpolation

  /** Store where the server says everyone is after each update. */
  private recordSnapshot(state: any) {
    const now = performance.now();
    // Enemies are stamped with the server's clock; other players with the clock of the device
    // that moved them. Either way network jitter does not turn into uneven movement.
    state.players?.forEach((p: any, id: string) => {
      if (id === this.room?.sessionId) return;
      const track = this.track(`p${id}`);
      if (track.warp !== p.warp) {
        track.warp = p.warp;
        track.list.length = 0;
      }
      track.add(now, p.mt > 0 ? p.mt : now, p.x, p.y);
    });
    state.enemies?.forEach((e: any, id: string) => this.track(`e${id}`).add(now, state.time > 0 ? state.time : now, e.x, e.y));
  }

  private track(key: string): Track {
    let track = this.tracks.get(key);
    if (!track) this.tracks.set(key, (track = new Track()));
    return track;
  }

  /** Where to draw an entity: a little in the past, blended between the updates around that moment. */
  private smoothed(key: string, x: number, y: number): { x: number; y: number } {
    const track = this.tracks.get(key);
    if (this.room instanceof LocalRoom || !track) return { x, y };
    return track.at(performance.now()) ?? { x, y };
  }

  // ------------------------------------------------------------- players

  private syncPlayers(state: any, dt: number) {
    const seen = new Set<string>();
    state.players.forEach((p: any, id: string) => {
      seen.add(id);
      let view = this.players.get(id);
      if (!view) {
        view = {
          body: this.add.image(p.x, p.y, `hero_${p.hero}`).setOrigin(0.5, 0.85),
          weapon: WEAPON_TEXTURE[p.hero] ? this.add.image(p.x, p.y, WEAPON_TEXTURE[p.hero]!).setOrigin(0.15, 0.5) : undefined,
          label: this.add
            .text(p.x, p.y, p.name, { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" })
            .setScale(0.4)
            .setOrigin(0.5, 1)
            .setResolution(2),
          bar: this.add.graphics(),
          lastHp: p.hp,
          hurtFlash: 0,
          attackSeq: p.attackSeq,
          skillSeq: p.skillSeq,
          skill2Seq: p.skill2Seq,
        };
        if (id === this.room!.sessionId) {
          this.predicted = { x: p.x, y: p.y };
          view.label.setColor("#ffd23f");
        }
        if (p.owner) {
          view.label.setColor("#9fffb0");
          this.sparks.explode(16, p.x, p.y - 6);
        }
        this.players.set(id, view);
      }

      const isMe = id === this.room!.sessionId;
      const body = view.body;
      if (isMe) body.setPosition(this.predicted.x, this.predicted.y);
      else {
        const at = this.smoothed(`p${id}`, p.x, p.y);
        body.setPosition(at.x, at.y);
      }

      // Walk bob and facing
      const aim = isMe ? this.aim : p.aim;
      body.setFlipX(Math.cos(aim) < 0);
      const bob = Math.sin(this.time.now / 90) * 0.6;
      body.setDepth(body.y);
      body.setAlpha(p.dead ? 0.25 : p.dashing ? 0.6 : 1);

      if (view.weapon) {
        view.weapon.setPosition(body.x, body.y - 5 + bob);
        view.weapon.setRotation(aim);
        view.weapon.setFlipY(Math.cos(aim) < 0);
        view.weapon.setDepth(body.y + 0.5);
        view.weapon.setVisible(!p.dead);
      }
      this.playAttackEffects(view, p, body.x, body.y - 5, aim);

      // Titan form: a giant body for the duration.
      const titanNow = p.titan > 0 && !p.dead;
      const texture = titanNow ? "titanform" : `hero_${p.hero}`;
      if (body.texture.key !== texture) {
        body.setTexture(texture).setScale(titanNow ? 2.6 : 1);
        if (titanNow) {
          this.effects.push({ kind: "bolt", x: body.x, y: body.y, aim: 0, range: 60, arc: 0, age: 0, life: 0.5 });
          this.cameras.main.shake(400, 0.02);
          this.cameras.main.flash(150, 255, 230, 160);
          this.sparks.explode(40, body.x, body.y - 20);
        } else this.sparks.explode(20, body.x, body.y - 6);
      }
      view.label.setPosition(body.x, body.y - (titanNow ? 66 : 18));
      view.label.setDepth(1000);

      if (p.hp < view.lastHp - 0.5) view.hurtFlash = 0.15;
      view.lastHp = p.hp;
      view.hurtFlash = Math.max(0, view.hurtFlash - dt);
      const stoppedHere = state.timeStop > 0 && state.timeStopBy !== id;
      if (view.hurtFlash > 0) body.setTintFill(0xff4040);
      else if (stoppedHere) body.setTint(0x8a93b8);
      else if (p.owner) body.setTint(0xb8ffc8);
      else body.clearTint();
      if (p.owner && !p.dead) body.setAlpha(0.8);

      view.bar.clear();
      if (!p.dead) {
        view.bar.fillStyle(PLAYER_MARKERS[p.color % 4], 0.5).fillEllipse(body.x, body.y + 1, 14, 5);
        view.bar.fillStyle(0x000000, 0.7).fillRect(body.x - 8, body.y + 4, 16, 2);
        view.bar.fillStyle(0x4cd964, 1).fillRect(body.x - 8, body.y + 4, 16 * (p.hp / p.maxHp), 2);
      }
      view.bar.setDepth(999);

      if (isMe && !p.dead && inLava(p.x, p.y, state.lavaRadius) && Math.random() < 0.15) {
        this.cameras.main.flash(80, 255, 80, 0, false);
      }
    });

    for (const [id, view] of this.players) {
      if (seen.has(id)) continue;
      view.body.destroy();
      view.weapon?.destroy();
      view.label.destroy();
      view.bar.destroy();
      this.players.delete(id);
      this.tracks.delete(`p${id}`);
    }
  }

  // ------------------------------------------------------------- effects

  /** Spot new attacks and skills (their counters went up) and start an effect for each. */
  private playAttackEffects(view: PlayerView, p: any, x: number, y: number, aim: number) {
    const hero = heroOf(p.hero);
    if (p.attackSeq !== view.attackSeq) {
      view.attackSeq = p.attackSeq;
      if (p.titan > 0) {
        this.effects.push({ kind: "smash", x, y: y + 5, aim, range: hero.skill.radius, arc: Math.PI * 2, age: 0, life: 0.35 });
        this.cameras.main.shake(150, 0.008);
        this.sparks.explode(12, x, y + 5);
      } else if (hero.attack === "rifle") {
        this.effects.push({ kind: "muzzle", x, y, aim, range: 16, arc: 0, age: 0, life: 0.08 });
        if (p === this.room?.state.players.get(this.room.sessionId)) this.cameras.main.shake(60, 0.004);
      } else if (hero.attack === "magic") {
        this.effects.push({ kind: "muzzle", x, y, aim, range: 10, arc: 0, age: 0, life: 0.1 });
      } else if (hero.attack === "lightning") {
        const tx = x + Math.cos(aim) * hero.range;
        const ty = y + 5 + Math.sin(aim) * hero.range;
        this.effects.push({ kind: "bolt", x: tx, y: ty, aim, range: hero.aoe, arc: 0, age: 0, life: 0.22 });
      } else {
        this.effects.push({ kind: hero.attack, x, y, aim, range: hero.range, arc: hero.arc, age: 0, life: hero.attack === "punch" ? 0.14 : 0.18 });
      }
    }
    if (p.skillSeq !== view.skillSeq) {
      view.skillSeq = p.skillSeq;
      this.playSkillEffect(hero.skill, x, y, aim);
    }
    if (hero.skill2 && p.skill2Seq !== view.skill2Seq) {
      view.skill2Seq = p.skill2Seq;
      this.playSkillEffect(hero.skill2, x, y, aim);
    }
  }

  private playSkillEffect(skill: SkillDef, x: number, y: number, aim: number) {
    const cam = this.cameras.main;
    switch (skill.kind) {
      case "smash":
        this.effects.push({ kind: "smash", x, y: y + 5, aim, range: skill.radius, arc: Math.PI * 2, age: 0, life: 0.35 });
        cam.shake(200, 0.012);
        this.sparks.explode(24, x, y + 5);
        break;
      case "storm":
        this.effects.push({ kind: "storm", x, y: y + 5, aim, range: skill.radius, arc: 0, age: 0, life: 0.4 });
        cam.shake(150, 0.008);
        break;
      case "jab":
        this.effects.push({ kind: "punch", x, y, aim, range: skill.radius, arc: 1.0, age: 0, life: 0.08 });
        break;
      case "onepunch":
        this.effects.push({ kind: "impact", x, y, aim, range: skill.radius * 2.2, arc: 2.4, age: 0, life: 0.5 });
        cam.shake(350, 0.025);
        cam.flash(120, 255, 255, 255);
        this.sparks.explode(40, x + Math.cos(aim) * 30, y + Math.sin(aim) * 30);
        break;
      case "heal":
        this.effects.push({ kind: "heal", x, y: y + 5, aim, range: skill.radius, arc: 0, age: 0, life: 0.8 });
        break;
      case "line":
        this.effects.push({ kind: "line", x, y, aim, range: skill.radius, arc: skill.width ?? 40, age: 0, life: 0.45 });
        cam.shake(250, 0.015);
        break;
      case "slashes":
        this.effects.push({ kind: "slashes", x, y: y + 5, aim, range: skill.radius, arc: 0, age: 0, life: skill.duration ?? 0.8 });
        break;
      case "timestop":
        this.effects.push({ kind: "ripple", x, y, aim, range: 700, arc: 0, age: 0, life: 0.7 });
        cam.shake(120, 0.006);
        break;
      case "domain":
        cam.flash(250, 120, 60, 200);
        break;
      case "hurricane":
      case "asgard":
        cam.shake(150, 0.006);
        break;
      case "clone":
        this.sparks.explode(20, x, y);
        break;
      case "rush":
        // We are already at the end of the dash: draw the cut back along the path.
        this.effects.push({ kind: "line", x: x - Math.cos(aim) * skill.radius, y: y - Math.sin(aim) * skill.radius, aim, range: skill.radius, arc: 10, age: 0, life: 0.3 });
        break;
      case "titan":
        break; // the transformation is drawn when the body changes
    }
  }

  private drawEffects(dt: number) {
    const g = this.fx;
    g.clear();
    this.effects = this.effects.filter((e) => (e.age += dt) < e.life);
    for (const e of this.effects) {
      const t = e.age / e.life;
      if (e.kind === "punch") {
        const r = e.range * (0.6 + 0.4 * t);
        g.fillStyle(0xffffff, 0.8 * (1 - t));
        g.fillCircle(e.x + Math.cos(e.aim) * r, e.y + Math.sin(e.aim) * r, 6 * (1 - t) + 2);
        g.lineStyle(2, 0xffd400, 1 - t);
        g.beginPath();
        g.arc(e.x, e.y, r, e.aim - e.arc / 2, e.aim + e.arc / 2);
        g.strokePath();
      } else if (e.kind === "sword") {
        // A crescent that sweeps across the swing.
        const sweep = e.aim - e.arc / 2 + e.arc * Math.min(1, t * 1.6);
        g.lineStyle(5, 0xbcd4ff, 0.8 * (1 - t));
        g.beginPath();
        g.arc(e.x, e.y, e.range, e.aim - e.arc / 2, sweep);
        g.strokePath();
        g.lineStyle(2, 0xffffff, 1 - t);
        g.beginPath();
        g.arc(e.x, e.y, e.range - 4, e.aim - e.arc / 2, sweep);
        g.strokePath();
      } else if (e.kind === "smash") {
        g.lineStyle(4, 0xffd400, 1 - t);
        g.strokeCircle(e.x, e.y, e.range * t);
        g.lineStyle(2, 0xd42020, 1 - t);
        g.strokeCircle(e.x, e.y, e.range * t * 0.7);
      } else if (e.kind === "bolt") {
        this.drawBolt(g, e.x, e.y, 1 - t);
        g.lineStyle(2, 0x9fd8ff, 1 - t);
        g.strokeCircle(e.x, e.y, e.range * (0.5 + 0.5 * t));
      } else if (e.kind === "storm") {
        g.lineStyle(3, 0x9fd8ff, 1 - t);
        g.strokeCircle(e.x, e.y, e.range * t);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + e.aim;
          this.drawBolt(g, e.x + Math.cos(a) * e.range * 0.6, e.y + Math.sin(a) * e.range * 0.6, 1 - t);
        }
      } else if (e.kind === "blast") {
        g.fillStyle(e.arc > 0 ? 0xff8a1f : 0xf4a6c4, 0.5 * (1 - t));
        g.fillCircle(e.x, e.y, e.range * (0.4 + 0.6 * t));
        g.lineStyle(2, e.arc > 0 ? 0xffd23f : 0xb4a0dc, 1 - t);
        g.strokeCircle(e.x, e.y, e.range * (0.4 + 0.6 * t));
      } else if (e.kind === "impact") {
        // ONE PUNCH: a giant white shockwave cone.
        const r = e.range * (0.3 + 0.7 * t);
        g.fillStyle(0xffffff, 0.7 * (1 - t));
        g.slice(e.x, e.y, r, e.aim - e.arc / 2, e.aim + e.arc / 2);
        g.fillPath();
        g.lineStyle(4, 0xffd400, 1 - t);
        g.beginPath();
        g.arc(e.x, e.y, r, e.aim - e.arc / 2, e.aim + e.arc / 2);
        g.strokePath();
        g.lineStyle(2, 0xd42020, 1 - t);
        g.strokeCircle(e.x, e.y, r * 0.5);
      } else if (e.kind === "heal") {
        g.lineStyle(3, 0x6dff8a, 1 - t);
        g.strokeCircle(e.x, e.y, e.range * Math.min(1, t * 2));
        g.fillStyle(0x6dff8a, 0.15 * (1 - t)).fillCircle(e.x, e.y, e.range * Math.min(1, t * 2));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t;
          const px = e.x + Math.cos(a) * e.range * 0.5 * t;
          const py = e.y + Math.sin(a) * e.range * 0.5 * t - 20 * t;
          g.fillStyle(0xb8ffc8, 1 - t).fillRect(px - 3, py - 1, 7, 2).fillRect(px - 1, py - 3, 2, 7);
        }
      } else if (e.kind === "line") {
        // 100% SMASH: a wide blast of green lightning straight ahead.
        const cos = Math.cos(e.aim);
        const sin = Math.sin(e.aim);
        const len = e.range * Math.min(1, t * 4);
        const pts = (w: number) => [
          { x: e.x - sin * w, y: e.y + cos * w },
          { x: e.x + cos * len - sin * w, y: e.y + sin * len + cos * w },
          { x: e.x + cos * len + sin * w, y: e.y + sin * len - cos * w },
          { x: e.x + sin * w, y: e.y - cos * w },
        ];
        const thin = e.arc <= 12; // Thorfinn's dagger rush is a silver streak, not green lightning
        g.fillStyle(thin ? 0xd8dde8 : 0x2fd07a, 0.35 * (1 - t)).fillPoints(pts(e.arc / 2), true);
        g.fillStyle(0xd8ffe8, 0.7 * (1 - t)).fillPoints(pts(e.arc / 6), true);
        g.lineStyle(2, 0x9fffc8, 1 - t);
        for (let k = 0; k < (thin ? 0 : 3); k++) {
          g.beginPath();
          g.moveTo(e.x, e.y);
          for (let d = 20; d <= len; d += 20) {
            const off = (Math.random() - 0.5) * e.arc;
            g.lineTo(e.x + cos * d - sin * off, e.y + sin * d + cos * off);
          }
          g.strokePath();
        }
      } else if (e.kind === "slashes") {
        // DIMENSION SLASH: cuts flicker everywhere around Okita.
        g.lineStyle(2, 0xbcd4ff, 0.9);
        for (let k = 0; k < 5; k++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * e.range;
          const cx = e.x + Math.cos(a) * r;
          const cy = e.y + Math.sin(a) * r;
          const b = Math.random() * Math.PI;
          g.lineBetween(cx - Math.cos(b) * 18, cy - Math.sin(b) * 18, cx + Math.cos(b) * 18, cy + Math.sin(b) * 18);
        }
        g.lineStyle(1, 0xffffff, 0.5 * (1 - t)).strokeCircle(e.x, e.y, e.range);
      } else if (e.kind === "ripple") {
        g.lineStyle(6, 0xe0e8ff, 0.8 * (1 - t));
        g.strokeCircle(e.x, e.y, e.range * t);
        g.lineStyle(2, 0x6a4aff, 1 - t);
        g.strokeCircle(e.x, e.y, e.range * t * 0.85);
      } else if (e.kind === "muzzle") {
        g.fillStyle(0xffd23f, 1 - t);
        g.fillCircle(e.x + Math.cos(e.aim) * e.range, e.y + Math.sin(e.aim) * e.range, 4);
      }
    }
  }

  /** A jagged lightning bolt falling from the sky onto (x, y). */
  private drawBolt(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number) {
    for (const [width, color] of [[4, 0x4aa8ff], [2, 0xffffff]] as const) {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      let px = x + (Math.random() - 0.5) * 8;
      let py = y - 70;
      g.moveTo(px, py);
      while (py < y) {
        py = Math.min(y, py + 10);
        px = py === y ? x : x + (Math.random() - 0.5) * 12;
        g.lineTo(px, py);
      }
      g.strokePath();
    }
  }

  /** A faint guide showing where your attack will land, so aiming with a thumb is easy. */
  private drawAimGuide(state: any) {
    const g = this.aimGuide;
    g.clear();
    const me = state.players.get(this.room!.sessionId);
    if (!me || me.dead) return;
    const hero = heroOf(me.hero);
    const x = this.predicted.x;
    const y = this.predicted.y - 5;
    if (hero.attack === "lightning") {
      const tx = x + Math.cos(this.aim) * hero.range;
      const ty = y + 5 + Math.sin(this.aim) * hero.range;
      g.fillStyle(0x9fd8ff, 0.12).fillCircle(tx, ty, hero.aoe);
      g.lineStyle(1, 0x9fd8ff, 0.4).strokeCircle(tx, ty, hero.aoe);
    } else if (hero.attack === "rifle" || hero.attack === "magic") {
      for (let d = 14; d < 150; d += 10) {
        g.fillStyle(0xffffff, 0.35 * (1 - d / 150));
        g.fillRect(x + Math.cos(this.aim) * d - 1, y + Math.sin(this.aim) * d - 1, 2, 2);
      }
    } else {
      g.fillStyle(0xffffff, 0.1);
      g.slice(x, y, hero.range, this.aim - hero.arc / 2, this.aim + hero.arc / 2);
      g.fillPath();
      g.lineStyle(1, 0xffffff, 0.3);
      g.beginPath();
      g.arc(x, y, hero.range, this.aim - hero.arc / 2, this.aim + hero.arc / 2);
      g.strokePath();
    }
  }

  // ------------------------------------------------------------- enemies

  private syncEnemies(state: any, dt: number) {
    const me = state.players.get(this.room!.sessionId);
    const foresight = !!me && !me.dead && heroOf(me.hero).skill.kind === "passive";
    const ahead = foresight ? heroOf(me.hero).skill.duration ?? 0.5 : 0;
    const seen = new Set<string>();
    this.beams.clear();
    state.enemies.forEach((e: any, id: string) => {
      seen.add(id);
      let view = this.enemies.get(id);
      if (!view) {
        const sprite = this.add.image(e.x, e.y, e.kind).setOrigin(0.5, 0.75).setScale(ENEMY_SCALE[e.kind as EnemyKind]);
        sprite.setAlpha(0);
        this.tweens.add({ targets: sprite, alpha: 1, duration: 300 });
        view = { sprite, bar: this.add.graphics(), x: e.x, y: e.y, vx: 0, vy: 0 };
        this.enemies.set(id, view);
      }
      const s = view.sprite;
      const at = this.smoothed(`e${id}`, e.x, e.y);
      if (Math.abs(at.x - s.x) > 0.05) s.setFlipX(at.x < s.x);
      if (dt > 0 && !(state.timeStop > 0)) {
        const k = 1 - Math.exp(-dt * 8);
        view.vx += ((at.x - s.x) / dt - view.vx) * k;
        view.vy += ((at.y - s.y) / dt - view.vy) * k;
      }
      s.setPosition(at.x, at.y);
      // L's foresight: a ghost shows where this monster will be in half a second.
      if (foresight) {
        if (!view.ghost) view.ghost = this.add.image(s.x, s.y, e.kind).setOrigin(0.5, 0.75).setScale(s.scale).setTint(0xd890ff);
        const gx = Phaser.Math.Clamp(s.x + view.vx * ahead, 0, WORLD_W);
        const gy = Phaser.Math.Clamp(s.y + view.vy * ahead, 0, WORLD_H);
        view.ghost.setPosition(gx, gy).setFlipX(s.flipX).setDepth(gy - 0.5).setAlpha(0.5 + 0.1 * Math.sin(this.time.now / 120)).setVisible(true);
        this.beams.lineStyle(1, 0xd070ff, 0.35).lineBetween(s.x, s.y - 3, gx, gy - 3);
      } else view.ghost?.setVisible(false);
      s.setDepth(s.y);
      if (e.hitFlash > 0) s.setTintFill(0xffffff);
      else if (state.timeStop > 0) s.setTint(0x8a93b8);
      else if (e.beamState === 1 && Math.floor(this.time.now / 80) % 2 === 0) s.setTint(0x9fd8ff);
      else s.clearTint();
      if (e.beamState > 0) {
        s.setFlipX(Math.cos(e.beamAngle) < 0);
        this.drawBeam(s.x, s.y - 14, e.beamAngle, e.beamState);
      }
      view.x = e.x;
      view.y = e.y;

      const def = ENEMIES[e.kind as EnemyKind];
      const w = Math.max(12, def.radius * 2);
      view.bar.clear();
      if (e.hp < e.maxHp) {
        view.bar.fillStyle(0x000000, 0.7).fillRect(s.x - w / 2, s.y + 4, w, 2);
        view.bar.fillStyle(0xff5a36, 1).fillRect(s.x - w / 2, s.y + 4, w * (e.hp / e.maxHp), 2);
      }
      view.bar.setDepth(999);
    });

    for (const [id, view] of this.enemies) {
      if (seen.has(id)) continue;
      this.sparks.explode(view.sprite.scale > 2 ? 60 : 14, view.sprite.x, view.sprite.y - 4);
      if (view.sprite.scale > 2) this.cameras.main.shake(400, 0.01);
      view.sprite.destroy();
      view.ghost?.destroy();
      view.bar.destroy();
      this.enemies.delete(id);
      this.tracks.delete(`e${id}`);
    }
  }

  /** Godzilla's atomic beam: a flickering warning line, then a thick glowing beam. */
  private drawBeam(x: number, y: number, angle: number, state: number) {
    const g = this.beams;
    const ex = x + Math.cos(angle) * BEAM_LENGTH;
    const ey = y + Math.sin(angle) * BEAM_LENGTH;
    if (state === 1) {
      g.lineStyle(2, 0xff4040, 0.4 + 0.4 * Math.sin(this.time.now / 40));
      g.lineBetween(x, y, ex, ey);
      return;
    }
    const flicker = 0.85 + 0.15 * Math.sin(this.time.now / 25);
    g.lineStyle(BEAM_WIDTH + 8, 0x2a7fff, 0.35 * flicker).lineBetween(x, y, ex, ey);
    g.lineStyle(BEAM_WIDTH, 0x7fd0ff, 0.85 * flicker).lineBetween(x, y, ex, ey);
    g.lineStyle(BEAM_WIDTH / 3, 0xffffff, flicker).lineBetween(x, y, ex, ey);
    g.fillStyle(0xbfe8ff, 0.9).fillCircle(x, y, BEAM_WIDTH * 0.8 * flicker);
    if (Math.random() < 0.3) this.cameras.main.shake(60, 0.003);
  }

  // ------------------------------------------------------------- bullets

  // --------------------------------------------------------------- zones

  /** Lasting skill areas, plus the stopped-time and domain overlays. */
  private drawZones(state: any, _dt: number) {
    const floor = this.zoneFloor;
    const sky = this.zoneSky;
    floor.clear();
    sky.clear();
    const now = this.time.now;
    if (state.timeStop > 0) floor.fillStyle(0x1a2050, 0.45).fillRect(0, 0, WORLD_W, WORLD_H);
    if (state.timeStop > 0 && !this.wasTimeStopped) this.cameras.main.flash(200, 200, 210, 255);
    this.wasTimeStopped = state.timeStop > 0;

    const seen = new Set<string>();
    state.zones?.forEach((z: any, id: string) => {
      seen.add(id);
      const age = z.maxLife - z.life;
      const fade = Math.max(0, Math.min(1, age / 0.4, z.life / 0.6));
      if (z.kind === "domain") {
        // Unlimited Void: the whole map becomes an endless starfield.
        floor.fillStyle(0x07000f, 0.85 * fade).fillRect(0, 0, WORLD_W, WORLD_H);
        for (let i = 0; i < 90; i++) {
          const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(now / 300 + i));
          floor.fillStyle(i % 3 ? 0xffffff : 0x9f7fff, fade * twinkle).fillRect((i * 137.5) % WORLD_W, (i * 271.3) % WORLD_H, 2, 2);
        }
        floor.lineStyle(3, 0x9f7fff, fade).strokeCircle(z.x, z.y, 40 + age * 420);
        floor.lineStyle(1, 0xffffff, fade * 0.6).strokeCircle(z.x, z.y, 20 + age * 260);
      } else if (z.kind === "hurricane") {
        floor.fillStyle(0x223040, 0.35 * fade).fillCircle(z.x, z.y, z.radius);
        floor.lineStyle(2, 0x9fd8ff, 0.5 * fade).strokeCircle(z.x, z.y, z.radius);
        sky.lineStyle(1, 0xaad4ff, 0.6 * fade);
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * z.radius;
          const rx = z.x + Math.cos(a) * r;
          const ry = z.y + Math.sin(a) * r;
          sky.lineBetween(rx, ry - 8, rx - 2, ry);
        }
        // The storm cloud, slowly turning.
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + now / 2000;
          sky.fillStyle(i % 2 ? 0x3a4250 : 0x4a5464, 0.55 * fade);
          sky.fillCircle(z.x + Math.cos(a) * z.radius * 0.5, z.y - 70 + Math.sin(a) * z.radius * 0.15, z.radius * 0.2);
        }
        sky.fillStyle(0x2a3040, 0.6 * fade).fillCircle(z.x, z.y - 70, z.radius * 0.25);
        if (Math.random() < 0.35) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * z.radius;
          this.drawBolt(sky, z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, fade);
        }
      } else if (z.kind === "asgard") {
        // Loki's illusion: golden Asgard rises out of the ground.
        floor.fillStyle(0xffd86a, 0.16 * fade).fillCircle(z.x, z.y, z.radius);
        floor.lineStyle(3, 0xe7b83a, 0.9 * fade).strokeCircle(z.x, z.y, z.radius);
        floor.lineStyle(1, 0xfff0b0, 0.6 * fade).strokeCircle(z.x, z.y, z.radius - 6 + Math.sin(now / 200) * 3);
        let img = this.zoneImages.get(id);
        if (!img) {
          img = this.add.image(z.x, z.y, "asgard").setOrigin(0.5, 0.75).setDepth(-2).setScale(1.6);
          this.zoneImages.set(id, img);
        }
        img.setAlpha(0.9 * fade);
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * z.radius;
          floor.fillStyle(0xfff4c0, fade).fillRect(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, 1, 1);
        }
      }
    });
    for (const [id, img] of this.zoneImages) {
      if (seen.has(id)) continue;
      img.destroy();
      this.zoneImages.delete(id);
    }
  }

  private syncBullets(state: any, dt: number) {
    const seen = new Set<string>();
    state.bullets.forEach((b: any, id: string) => {
      seen.add(id);
      let sprite = this.bullets.get(id);
      if (!sprite) {
        const texture = BULLET_TEXTURE[b.kind] ?? "snipe";
        sprite = this.add.image(b.x, b.y, texture).setDepth(900).setData("kind", b.kind);
        if (b.kind === "wave" || b.kind === "snipe") sprite.setRotation(Math.atan2(b.vy, b.vx));
        if (b.kind === "wave") sprite.setScale(1.6);
        if (b.kind === "fireball") sprite.setScale(1.6);
        if (b.kind === "stone") sprite.setScale(1.2);
        this.bullets.set(id, sprite);
      }
      // Bullets fly in straight lines, so extrapolate locally and drift toward the server.
      if (!(state.timeStop > 0)) {
        sprite.x += b.vx * dt;
        sprite.y += b.vy * dt;
      }
      sprite.x += (b.x - sprite.x) * 0.2;
      sprite.y += (b.y - sprite.y) * 0.2;
    });
    for (const [id, sprite] of this.bullets) {
      if (seen.has(id)) continue;
      const kind = sprite.getData("kind");
      if (kind === "magic" || kind === "fireball") {
        const big = kind === "fireball";
        const radius = big ? HEROES.howl.skill.radius : HEROES.howl.aoe;
        this.effects.push({ kind: "blast", x: sprite.x, y: sprite.y, aim: 0, range: radius, arc: big ? 1 : 0, age: 0, life: big ? 0.45 : 0.3 });
        if (big) this.cameras.main.shake(180, 0.01);
      }
      sprite.destroy();
      this.bullets.delete(id);
    }
  }

  // ---------------------------------------------------------------- lava

  private drawLava(radius: number) {
    const r = Math.round(radius / 4) * 4;
    if (r === this.lavaDrawnRadius) return;
    this.lavaDrawnRadius = r;
    for (let ty = 0; ty < MAP_ROWS; ty++) {
      for (let tx = 0; tx < MAP_COLS; tx++) {
        const cx = tx * TILE + TILE / 2;
        const cy = ty * TILE + TILE / 2;
        if (inLava(cx, cy, r)) this.lavaLayer.putTileAt((tx + ty + this.lavaFrame) % 2, tx, ty);
        else this.lavaLayer.removeTileAt(tx, ty);
      }
    }
  }

  private animateLava() {
    this.lavaFrame = 1 - this.lavaFrame;
    this.lavaLayer.forEachTile((tile) => {
      if (tile.index >= 0) tile.index = (tile.x + tile.y + this.lavaFrame) % 2;
    });
  }
}
