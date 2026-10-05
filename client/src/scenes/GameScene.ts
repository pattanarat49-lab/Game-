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
  KONG_CHARGE_SPEED,
  KONG_CHARGE_TIME,
  KONG_CHARGE_WIDTH,
  BEAM_WIDTH,
  HEROES,
  SkillDef,
  DASH_COOLDOWN,
  DASH_SPEED,
  DASH_TIME,
  KNOCKBACK_DECAY,
  ROCKS,
  SWORD_GOD,
  stageOf,
  ringStage,
  selectStage,
  EMPTY_INPUT,
  heroOf,
  inLava,
  inputDirection,
  moveCircle,
  movesInStoppedTime,
  HERO_SCALE,
  BIG_SCALE,
  BIG_SLOW,
  heroSpeed,
  CHARGE_FULL,
  CHARGE_SLOW,
  chargePower,
  chargeReach,
  alienForms,
  formAngle,
  formFromAim,
} from "../../../shared/game";
import type { HudScene } from "./HudScene";
import { LocalRoom } from "../localRoom";
import { Lobby } from "../lobby";
import { RiftSim, TITAN_ATTACK_COOLDOWN } from "../../../shared/sim";
import { attackArtLayout, attackFrame, facingOf, frontOnly, hasHeroArt, heroArtLayout, SWING_TIME } from "../heroArt";

interface PlayerView {
  body: Phaser.GameObjects.Image;
  /** Where another player's dash began, until we see which way it goes (for the dash burst). */
  dashFrom?: { x: number; y: number; t: number };
  wasDashing?: boolean;
  weapon?: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Graphics;
  lastHp: number;
  hurtFlash: number;
  attackSeq: number;
  skillSeq: number;
  skill2Seq: number;
  glitch?: Phaser.GameObjects.Image[]; // Yaotsu's "error" afterimages
  trail?: Phaser.GameObjects.Image[]; // Speed Raptor's afterimages
  trailPts?: { x: number; y: number }[]; // where the body was over the last frames
  heroId: string; // a hero swap (PvP player select) rebuilds the view
  spin?: number; // SPINNING KICK: seconds of the spin animation left
  bike?: Phaser.GameObjects.Image; // MOTORCYCLE: the bike under the Hopper Rider
  look?: string; // the body's look without its facing, so turning around does not count as a transformation
  walkX?: number; // where the body was last frame, to tell walking from standing
  walkY?: number;
  swing?: number; // seconds left of a hand-made basic-attack swing animation
}

/** A short-lived swing, slash or shockwave drawn on top of the world. */
interface Effect {
  kind: "punch" | "sword" | "smash" | "muzzle" | "bolt" | "storm" | "blast" | "impact" | "heal" | "line" | "slashes" | "ripple" | "jab" | "gatling" | "rewind" | "kick" | "tkick" | "biglight" | "spinkick" | "purple" | "flame" | "thunder";
  x: number;
  y: number;
  aim: number;
  range: number;
  arc: number;
  age: number;
  life: number;
  /** Stays on this player as they move (GATLING PUNCH). */
  follow?: PlayerView;
}

const WEAPON_TEXTURE: Record<string, string | undefined> = { isekai: "sword", simo: "rifle", okita: "sword", sakamoto: "knife", hanuman: "trident", rick: "raygun", kid: "pistol", doraemon: "aircannon", agamemnon: "bronzesword", gladiator: "gladius", steve: "diamondsword", zenitsu: "sword" };
const BULLET_TEXTURE: Record<string, string> = {
  snipe: "snipe",
  wave: "wave",
  magic: "magic",
  fireball: "calcifer",
  enemy: "eshot",
  holy: "holy",
  stone: "stone",
  loki: "lokishot",
  glitch: "glitchshot",
  banana: "banana",
  boulder: "boulder",
  bullet: "bullet",
  slash: "slash",
  godslash: "wave",
  laser: "laser",
  missile: "missile",
  air: "air",
  dragonfire: "dragonfire",
  knife: "knife",
  fist: "fist",
  star: "starshot",
  sonic: "sonic",
};
/** Summons drawn bigger than their pixel art. */
const SUMMON_SCALE: Record<string, number> = { flamedragon: 1.4, quad: 1.25, echo: 0.85 };
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

const ENEMY_SCALE: Record<EnemyKind, number> = {
  cinderling: 1,
  brute: 1.3,
  caster: 1,
  warden: 2.4,
  godzilla: 2.4,
  monkey: 1,
  bananamonkey: 1,
  kingkong: 2.2,
  swordsman: 1,
  swordmaster: 1,
  swordgod: 1.3,
  dirtblock: 1.3,
  tntblock: 1.3,
  craftblock: 1.3,
};

export function serverUrl(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  // In dev the client runs on Vite (5173) and the server on its own port.
  return location.port === "5173" ? `${proto}://${location.hostname}:${SERVER_PORT}` : `${proto}://${location.host}`;
}

/** Frames in each PORTAL GUN animation (art/props/portalblue_N.png, portalpink_N.png). */
const PORTAL_FRAMES = 9;

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
  private localAttackTimer = 0;
  private localSkillLock = 0;
  private localSkill2Lock = 0;
  private predictedAttacks: number[] = [];
  private predictedSkills: number[] = [];
  private predictedSkills2: number[] = [];
  /** Round trip to the server in ms (online only), shown on the HUD. */
  pingMs = 0;
  private kbSeq = -1;
  private skillHeld = { 1: false, 2: false };
  private skillCastUntil = { 1: 0, 2: 0 };
  /** MAX SMASH: when the charge started (ms, 0 = not charging), and how long it has been held (s). */
  private chargeStart = 0;
  private charge2 = 0;
  private charging2 = false;
  private skillCancelled = { 1: false, 2: false }; // last knockback we applied to our own hero
  private kbVel = { x: 0, y: 0 };
  private sendTimer = 0;
  private lastButtons = "";
  private lastSentPos = "";
  /** Recent positions of other players and enemies, for smooth interpolation online. */
  private tracks = new Map<string, Track>();
  private cameraTarget!: Phaser.GameObjects.Zone;
  private aim = 0;
  private lobby?: Lobby;
  private effects: Effect[] = [];
  private fx!: Phaser.GameObjects.Graphics;
  private aimGuide!: Phaser.GameObjects.Graphics;
  /** ALIEN TRANSFORM's pick wheel: one icon and name per alien. */
  private formIcons: { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  private beams!: Phaser.GameObjects.Graphics;
  private zoneFloor!: Phaser.GameObjects.Graphics;
  private zoneSky!: Phaser.GameObjects.Graphics;
  private zoneImages = new Map<string, Phaser.GameObjects.Image>();
  private zoneTexts = new Map<string, Phaser.GameObjects.Text>(); // countdowns over zones (the Trojan Horse)
  private wasTimeStopped = false;

  constructor() {
    super("Game");
  }

  async create() {
    const stage = stageOf(this.registry.get("stage"));
    this.add.image(0, 0, `ground_${stage}`).setOrigin(0).setDepth(-10);
    if (stage === "dojo") {
      // Straw training dummies stand where the other stages have pillars.
      for (const rock of ROCKS) this.add.image(rock.x, rock.y + rock.r * 0.4, "dummy").setOrigin(0.5, 1).setScale(rock.r / 8).setDepth(rock.y);
    }

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
    this.formIcons = [];
    this.beams = this.add.graphics().setDepth(940);
    this.zoneFloor = this.add.graphics().setDepth(-3);
    this.zoneSky = this.add.graphics().setDepth(960);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,E,ONE,TWO,ESC") as Record<
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
      this.room = new LocalRoom(this.registry.get("playerName"), this.registry.get("hero"), stage, this.registry.get("botHero"));
      if (stage === "pve") this.openLobby(stage);
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
    // Measure the round trip to the server every couple of seconds (shown on the HUD).
    const room = this.room;
    room.onMessage("pong", (sent: number) => {
      const rtt = performance.now() - sent;
      this.pingMs = this.pingMs ? this.pingMs + (rtt - this.pingMs) * 0.3 : rtt;
    });
    const ping = () => room.send("ping", performance.now());
    ping();
    this.time.addEvent({ delay: 2000, loop: true, callback: ping });
    this.room.onLeave(() => this.game.events.emit("connection-error", new Error("Disconnected from server")));
    this.room.onStateChange((state: any) => this.recordSnapshot(state));
    if (selectStage(stage)) this.openLobby(stage);
    this.scene.launch("Hud");
  }

  /** PvP and PvE Squad player select screen (everyone picks, then READY). */
  private openLobby(stage: string) {
    const room = this.room!;
    const lobby = new Lobby(
      {
        pick: (hero) => room.send("pick", hero),
        setReady: (ready) => room.send("ready", ready),
        botHero: (hero) => room.send("bothero", hero),
        botLevel: (level) => room.send("botlevel", level),
      },
      stage === "pve" ? "pve" : "pvp",
    );
    this.lobby = lobby;
    this.events.once(Phaser.Scenes.Events.DESTROY, () => lobby.destroy());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => lobby.destroy());
  }

  update(_time: number, deltaMs: number) {
    const room = this.room;
    if (!room?.state?.players) return;
    const dt = Math.min(deltaMs, 100) / 1000;
    const state = room.state;
    if (room instanceof LocalRoom) room.step(dt);

    this.lobby?.update(state, room.sessionId);
    this.tickPopups(dt);
    const selecting = state.phase === "select";
    const me = state.players.get(room.sessionId);
    // (An ALIEN TRANSFORM is still the same hero: the HUD stays, so held sticks and buttons carry on.)
    const baseHero = me ? heroOf(me.hero).formOf ?? me.hero : undefined;
    if (me && baseHero !== this.registry.get("hero") && !selecting) {
      // We picked a different hero on the select screen: rebuild the HUD and buttons for it.
      this.registry.set("hero", baseHero);
      this.scene.get("Hud").scene.restart();
    }
    // Nobody moves or attacks while picking heroes.
    const input = selecting ? { ...EMPTY_INPUT, aim: this.aim } : this.readInput();
    this.predictLocal(input, dt);
    this.predictEffects(input, dt);
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
    this.updateCharge(me, alive);

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
        charge2: Math.round(this.charge2 * 10) / 10,
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
      skill: alive && this.castOnRelease(1, k.Q.isDown || k.ONE.isDown || pointer.rightButtonDown() || (!this.hasSkill2(me) && k.E.isDown)),
      skill2: alive && this.hasSkill2(me) && this.castOnRelease(2, k.E.isDown || k.TWO.isDown),
      charge2: Math.round(this.charge2 * 10) / 10,
    };
  }

  /** MAX SMASH: while its button is held (and ready) the charge builds up and the hero slows down. */
  private updateCharge(me: any, alive: boolean) {
    const now = performance.now();
    this.charging2 = alive && heroOf(me.hero).skill2?.kind === "charge" && this.aimingSkill() === 2 && me.skill2Cooldown <= 0;
    if (!this.charging2) {
      this.chargeStart = 0; // the last charge stays in charge2 while the cast goes out
      return;
    }
    if (!this.chargeStart) this.chargeStart = now;
    this.charge2 = Math.min(CHARGE_FULL, (now - this.chargeStart) / 1000);
  }

  /**
   * Skills are aimed while their key is held (the mouse points the way) and go off when it is let go.
   * Heroes with two skills use E / 2 for the second one; otherwise E is another skill key.
   * Pressing Esc while holding calls the skill off.
   */
  private castOnRelease(slot: 1 | 2, held: boolean): boolean {
    const now = performance.now();
    if (held && this.keys.ESC.isDown) this.skillCancelled[slot] = true;
    if (this.skillHeld[slot] && !held) {
      if (!this.skillCancelled[slot]) this.skillCastUntil[slot] = now + 160;
      this.skillCancelled[slot] = false;
    }
    this.skillHeld[slot] = held;
    return now < this.skillCastUntil[slot];
  }

  /** Which skill is being held and aimed (1 or 2), or 0. */
  private aimingSkill(): 0 | 1 | 2 {
    const touch = (this.scene.get("Hud") as HudScene | undefined)?.touch;
    if (touch) return touch.aimingSkill;
    return this.skillHeld[1] && !this.skillCancelled[1] ? 1 : this.skillHeld[2] && !this.skillCancelled[2] ? 2 : 0;
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
    // Someone stopped time, or a rival's jab stunned us: we cannot move until it passes.
    const frozen = (state.timeStop > 0 && state.timeStopBy !== this.room!.sessionId && !movesInStoppedTime(me.hero)) || me.stun > 0;
    if (me.dead || me.warp !== this.warp) {
      this.warp = me.warp;
      this.predicted = { x: me.x, y: me.y };
      this.dashTimer = 0;
    } else if (me.latch > 0) {
      // BLOOD LATCH: we ride along on our victim, wherever the server says it is.
      const k = Math.min(1, dt * 20);
      this.predicted = { x: this.predicted.x + (me.x - this.predicted.x) * k, y: this.predicted.y + (me.y - this.predicted.y) * k };
      this.dashTimer = 0;
    } else if (frozen) {
      // Someone stopped time: we cannot move until it flows again.
      this.dashTimer = 0;
      if (me.stun > 0 && !(state.timeStop > 0)) {
        // Stunned, but a ram (the motorcycle) still sends us flying.
        if (me.kbSeq !== this.kbSeq) {
          if (this.kbSeq >= 0) this.kbVel = { x: me.kbx, y: me.kby };
          this.kbSeq = me.kbSeq;
        }
        if (Math.abs(this.kbVel.x) + Math.abs(this.kbVel.y) > 1) {
          this.predicted = moveCircle(this.predicted.x, this.predicted.y, this.kbVel.x * dt, this.kbVel.y * dt, PLAYER_RADIUS, ringStage(state.stage));
          const fade = Math.exp(-KNOCKBACK_DECAY * dt);
          this.kbVel.x *= fade;
          this.kbVel.y *= fade;
        }
      }
    } else {
      const dir = inputDirection(input);
      if (input.dash && this.dashTimer <= 0 && this.dashCooldown <= 0 && me.dashCooldown <= 0 && !(me.root > 0)) {
        this.dashDir = dir.x || dir.y ? dir : { x: Math.cos(input.aim), y: Math.sin(input.aim) };
        this.dashTimer = DASH_TIME;
        this.dashCooldown = DASH_COOLDOWN;
        this.playDashBurst(this.predicted.x, this.predicted.y, Math.atan2(this.dashDir.y, this.dashDir.x));
      }
      const slow = this.charging2 ? CHARGE_SLOW : 1; // charging MAX SMASH
      let vx = dir.x * heroSpeed(me) * slow;
      let vy = dir.y * heroSpeed(me) * slow;
      if (this.dashTimer > 0) {
        this.dashTimer -= dt;
        vx = this.dashDir.x * DASH_SPEED;
        vy = this.dashDir.y * DASH_SPEED;
      }
      // A melee hit from a rival knocks us back.
      if (me.kbSeq !== this.kbSeq) {
        if (this.kbSeq >= 0) this.kbVel = { x: me.kbx, y: me.kby };
        this.kbSeq = me.kbSeq;
      }
      if (Math.abs(this.kbVel.x) + Math.abs(this.kbVel.y) > 1) {
        vx += this.kbVel.x;
        vy += this.kbVel.y;
        const fade = Math.exp(-KNOCKBACK_DECAY * dt);
        this.kbVel.x *= fade;
        this.kbVel.y *= fade;
      }
      this.predicted = moveCircle(this.predicted.x, this.predicted.y, vx * dt, vy * dt, PLAYER_RADIUS, ringStage(state.stage));

      // Safety net: if the server keeps us somewhere else, ease back to it.
      const err = Math.hypot(me.x - this.predicted.x, me.y - this.predicted.y);
      const allowed = heroSpeed(me) * 0.5 + 40;
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
      // ALIEN TRANSFORM (in or out): a green flash where the hero stands.
      if (view && view.heroId !== p.hero && (heroOf(p.hero).formOf || heroOf(view.heroId).formOf)) {
        this.effects.push({ kind: "smash", x: view.body.x, y: view.body.y, aim: 0, range: 34, arc: Math.PI * 2, age: 0, life: 0.35 });
        this.sparks.explode(30, view.body.x, view.body.y - 8);
      }
      if (view && view.heroId !== p.hero) {
        this.destroyView(view);
        this.players.delete(id);
        view = undefined;
      }
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
          heroId: p.hero,
        };
        if (id === this.room!.sessionId) {
          this.predicted = { x: p.x, y: p.y };
          view.label.setColor("#ffd23f");
        }
        if (p.owner) {
          // Helpers get a green name tag; the Trickster's copy looks exactly like him.
          if (heroOf(p.hero).summon) view.label.setColor("#9fffb0");
          this.sparks.explode(16, p.x, p.y - 6);
          view.body.setScale(SUMMON_SCALE[p.hero] ?? 1);
          if (p.hero === "gunbot" || p.hero === "gladiator") view.label.setVisible(false); // a crowd of name tags would bury the squad
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
      // Heroes are drawn HERO_SCALE times their sprite; BIG LIGHT makes them bigger still.
      const k = HERO_SCALE * (p.big > 0 && !p.dead ? BIG_SCALE : 1);
      body.setDepth(body.y);
      body.setAlpha(p.dead ? 0.25 : p.dashing ? 0.6 : 1);
      // Other players' dashes: a burst where the dash began, pointing the way they went (ours plays on the key press).
      if (!isMe) {
        if (p.dashing && !view.wasDashing && !p.dead) view.dashFrom = { x: body.x, y: body.y, t: this.time.now };
        view.wasDashing = !!p.dashing;
        const from = view.dashFrom;
        if (from) {
          const dx = body.x - from.x;
          const dy = body.y - from.y;
          if (dx * dx + dy * dy > 9 || this.time.now - from.t > 150) {
            this.playDashBurst(from.x, from.y, dx * dx + dy * dy > 9 ? Math.atan2(dy, dx) : aim);
            view.dashFrom = undefined;
          }
        }
      }

      if (view.weapon) {
        if (heroOf(p.hero).gun) view.weapon.setTexture(p.mode === 1 ? "machinegun" : WEAPON_TEXTURE[p.hero]!);
        view.weapon.setPosition(body.x, body.y - 5 * k + bob).setScale(k);
        view.weapon.setRotation(aim);
        view.weapon.setFlipY(Math.cos(aim) < 0);
        view.weapon.setDepth(body.y + 0.5);
        // The diamond sword only while crafted; hand-made art already holds its own weapon.
        view.weapon.setVisible(!p.dead && (!heroOf(p.hero).sword || p.buff > 0) && !hasHeroArt(p.hero));
      }
      this.playAttackEffects(view, p, body.x, body.y - 5 * k, aim);
      const helper = !!heroOf(p.hero).summon; // pets and gunner bots look like themselves, not ghostly clones

      // Titan form: a giant body for the duration.
      const titanNow = p.titan > 0 && !p.dead;
      // Under Yaotsu's reality change, rival players are ordinary humans too.
      const humanized = state.reality > 0 && ringStage(state.stage) && (p.owner || id) !== state.realityBy && !p.dead;
      const skill2 = heroOf(p.hero).skill2;
      const batNow = !p.dead && p.active2 > 0 && skill2?.kind === "bat";
      const look = humanized ? "human" : titanNow ? "titanform" : batNow ? "batform" : `hero_${p.hero}`;
      // Heroes with hand-made art: a front view mirrored to the aim side, or turning to face it (4 or 8 facings).
      const art = look === `hero_${p.hero}` && hasHeroArt(p.hero);
      // A basic attack plays the hero's hand-made swing frames, if he has them.
      if (view.swing) view.swing = Math.max(0, view.swing - dt);
      const swing = art && view.swing && !p.dead ? attackFrame(p.hero, aim, 1 - view.swing / SWING_TIME) : undefined;
      const layout = swing ? attackArtLayout(p.hero) : art ? heroArtLayout(p.hero) : undefined;
      const texture = swing ? swing.texture : art ? `${look}_${facingOf(aim, p.hero)}` : look;
      if (art) body.setFlipX(swing ? swing.flip : frontOnly(p.hero) && Math.cos(aim) < 0);
      const artScale = layout ? layout.scale : 1;
      body.setScale(k * artScale * (titanNow && !humanized ? 2.6 : humanized ? 1 : SUMMON_SCALE[p.hero] ?? 1));
      if (body.texture.key !== texture) {
        body.setTexture(texture);
        body.setOrigin(0.5, layout ? layout.originY : 0.85);
      }
      if (art) {
        // Walking: a little step bounce and sway while the hero moves.
        const moved = Math.hypot(body.x - (view.walkX ?? body.x), body.y - (view.walkY ?? body.y));
        view.walkX = body.x;
        view.walkY = body.y;
        const step = this.time.now / 85;
        if (moved > 0.15 && !p.dead) {
          body.y -= Math.abs(Math.sin(step)) * 1.2 * k;
          body.setRotation(Math.sin(step) * 0.06);
        } else body.setRotation(0);
      }
      if (view.look !== look) {
        const first = view.look === undefined;
        view.look = look;
        if (first) {
          // nothing to celebrate on the first frame
        } else if (titanNow) {
          this.effects.push({ kind: "bolt", x: body.x, y: body.y, aim: 0, range: 60, arc: 0, age: 0, life: 0.5 });
          this.cameras.main.shake(400, 0.02);
          this.cameras.main.flash(150, 255, 230, 160);
          this.sparks.explode(40, body.x, body.y - 20);
        } else this.sparks.explode(20, body.x, body.y - 6);
      }
      if (view.spin && view.spin > 0) {
        // SPINNING KICK: two quick turns on the spot (the sprite squashes through its edge-on frames).
        view.spin = Math.max(0, view.spin - dt);
        const turn = (1 - view.spin / (heroOf(p.hero).skill2?.duration ?? 0.45)) * Math.PI * 4;
        body.setScale(body.scaleY * Math.cos(turn), body.scaleY);
      }
      // THE MAGICIAN: while he is a flock of doves, the hero himself is gone.
      const doveForm = p.barrier > 0 && heroOf(p.hero).skill2?.kind === "doves" && !p.dead;
      if (doveForm || batNow) {
        if (doveForm) body.setAlpha(0);
        view.weapon?.setVisible(false);
      }
      // VANISH: invisible to everyone else; a faint ghost on our own screen.
      const vanished = !p.dead && p.active2 > 0 && skill2?.kind === "invis";
      const unseen = vanished && !isMe;
      if (vanished) {
        body.setAlpha(isMe ? 0.3 : 0);
        view.weapon?.setVisible(isMe);
      }
      view.label.setVisible(!unseen && !(p.owner && (p.hero === "gunbot" || p.hero === "gladiator")));
      // MOTORCYCLE: the bike under him while he rides.
      const riding = !p.dead && p.active2 > 0 && skill2?.kind === "bike";
      if (riding && !view.bike) view.bike = this.add.image(body.x, body.y, "motorbike").setOrigin(0.5, 1);
      if (view.bike) {
        view.bike.setVisible(riding).setScale(k).setFlipX(Math.cos(aim) < 0);
        view.bike.setPosition(body.x, body.y + 2 * k).setDepth(body.depth + 0.3);
        if (riding && Math.random() < 0.3) this.sparks.explode(1, body.x - Math.sign(Math.cos(aim)) * 12 * k, body.y);
      }
      view.label.setPosition(body.x, body.y - (titanNow ? 66 : 18) * k);
      if (p.hero === "yaotsu") this.drawGlitch(view, p.dead);
      if (heroOf(p.hero).ram) this.drawTrail(view, p.dead);
      view.label.setDepth(1000);

      if (p.hp < view.lastHp - 0.5) {
        view.hurtFlash = 0.15;
        const mine = id === this.room?.sessionId;
        if (!p.owner || p.hp > 0) this.popDamage(body.x, body.y - 20, view.lastHp - p.hp, mine ? "#ff5a5a" : "#ffffff");
        if (mine) this.cameras.main.shake(80, 0.004);
      } else if (p.hp > view.lastHp + 1 && p.hp - view.lastHp < p.maxHp * 0.5 && view.lastHp > 0 && !p.dead) this.popDamage(body.x, body.y - 20, p.hp - view.lastHp, "#5aff7a", "+");
      view.lastHp = p.hp;
      view.hurtFlash = Math.max(0, view.hurtFlash - dt);
      const stoppedHere = state.timeStop > 0 && state.timeStopBy !== id && !movesInStoppedTime(p.hero);
      if (view.hurtFlash > 0) body.setTintFill(0xff4040);
      else if (stoppedHere) body.setTint(0x8a93b8);
      else body.clearTint();

      view.bar.clear();
      if (!p.dead && !unseen) {
        if (p.active2 > 0 && skill2?.kind === "excalibur") {
          // EXCALIBUR: light swords circling him (the same spots the server cuts with).
          for (let i = 0; i < (skill2.count ?? 4); i++) {
            const sw = RiftSim.swordSpot(body.x, body.y - 6, skill2, p.active2, i);
            const tx = Math.cos(sw.a + Math.PI / 2) * 9;
            const ty = Math.sin(sw.a + Math.PI / 2) * 9;
            view.bar.lineStyle(6, 0x9fd8ff, 0.3).lineBetween(sw.x - tx, sw.y - ty, sw.x + tx, sw.y + ty);
            view.bar.lineStyle(2, 0xffffff, 1).lineBetween(sw.x - tx, sw.y - ty, sw.x + tx, sw.y + ty);
            view.bar.fillStyle(0xffd23f, 1).fillRect(sw.x - tx * 0.7 - 1, sw.y - ty * 0.7 - 1, 3, 3);
          }
        }
        if (skill2?.kind === "rubberpunch") {
          // RUBBER PUNCH: the arm stretches all the way to the fist.
          state.bullets.forEach((b: any, bid: string) => {
            const fist = b.kind === "fist" ? this.bullets.get(bid) : undefined;
            if (!fist) return;
            view.bar.lineStyle(5, 0x7a4e22, 0.8).lineBetween(body.x, body.y - 6 * k, fist.x, fist.y);
            view.bar.lineStyle(3, 0xf0b88a, 1).lineBetween(body.x, body.y - 6 * k, fist.x, fist.y);
          });
        }
        view.bar.fillStyle(PLAYER_MARKERS[p.color % 4], 0.5).fillEllipse(body.x, body.y + 1, 14 * k, 5 * k);
        view.bar.fillStyle(0x000000, 0.7).fillRect(body.x - 12, body.y + 3 + 2 * k, 24, 2);
        view.bar.fillStyle(0x4cd964, 1).fillRect(body.x - 12, body.y + 3 + 2 * k, 24 * (p.hp / p.maxHp), 2);
        if (p.big > 0) {
          // BIG LIGHT: a soft yellow glow while enlarged.
          view.bar.lineStyle(1, 0xfff07a, 0.6).strokeEllipse(body.x, body.y + 1, 18 * k, 7 * k);
        }
        const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 120);
        if (doveForm) this.drawDoves(view.bar, body.x, body.y - 12 * k);
        else if (p.barrier > 0) {
          // IMMORTAL: a dark-violet barrier around the Demon Lord.
          view.bar.fillStyle(0x9a4aff, 0.18 + 0.1 * pulse).fillCircle(body.x, body.y - 9 * k, 17 * k);
          view.bar.lineStyle(2, 0xd8a8ff, 0.7 + 0.3 * pulse).strokeCircle(body.x, body.y - 9 * k, 17 * k);
        }
        if (p.beam > 0) {
          // HEAT VISION: twin red beams from the eyes, following his aim.
          const eb = heroOf(p.hero).skill2 ?? heroOf(p.hero).skill;
          const cos = Math.cos(aim);
          const sin = Math.sin(aim);
          const ex = body.x;
          const ey = body.y - 13 * k;
          const tx = ex + cos * eb.radius;
          const ty = ey + 8 + sin * eb.radius;
          const flick = 0.75 + Math.random() * 0.25;
          view.bar.lineStyle(eb.width ?? 10, 0xff2a1a, 0.35 * flick).lineBetween(ex, ey, tx, ty);
          view.bar.lineStyle(3, 0xff5a3a, flick).lineBetween(ex - 2, ey, tx, ty);
          view.bar.lineStyle(3, 0xff5a3a, flick).lineBetween(ex + 2, ey, tx, ty);
          view.bar.lineStyle(1, 0xfff0c0, 1).lineBetween(ex, ey, tx, ty);
          view.bar.fillStyle(0xffd23f, 0.8).fillCircle(tx, ty, 4 + Math.random() * 3);
          if (Math.random() < 0.3) this.sparks.explode(1, tx, ty);
        }
        if (p.latch > 0 && heroOf(p.hero).skill2?.kind === "grapple") {
          // ODM GEAR: the wire runs from his belt to the hook in the wall.
          let hook: any;
          let best = Infinity;
          state.zones?.forEach((z: any) => {
            const d = z.kind === "anchor" ? Math.hypot(z.x - p.x, z.y - p.y) : Infinity;
            if (d < best) [best, hook] = [d, z];
          });
          if (hook) {
            view.bar.lineStyle(2, 0x2a2a30, 0.9).lineBetween(body.x, body.y - 8 * k, hook.x, hook.y);
            view.bar.lineStyle(1, 0xd8dce8, 0.9).lineBetween(body.x, body.y - 8 * k - 1, hook.x, hook.y - 1);
          }
          if (Math.random() < 0.5) this.sparks.explode(1, body.x, body.y - 4);
        } else if (p.latch > 0 && Math.random() < 0.5) {
          // BLOOD LATCH: drops of blood fly off the bite.
          view.bar.fillStyle(0xe02a3a, 1).fillRect(body.x + (Math.random() - 0.5) * 14, body.y - 8 - Math.random() * 10, 2, 2);
        }
        if (p.revive > 0) {
          // REVIVE is armed: a golden halo.
          view.bar.lineStyle(1, 0xffd23f, 0.6 + 0.4 * pulse).strokeEllipse(body.x, body.y - 22 * k, 12 * k, 4 * k);
        }
      }
      view.bar.setDepth(999);

      if (isMe && !p.dead && inLava(p.x, p.y, state.lavaRadius) && Math.random() < 0.15) {
        this.cameras.main.flash(80, 255, 80, 0, false);
      }
    });

    for (const [id, view] of this.players) {
      if (seen.has(id)) continue;
      this.destroyView(view);
      this.players.delete(id);
      this.tracks.delete(`p${id}`);
    }
  }

  /** THE MAGICIAN: a flock of white doves fluttering where the Phantom Thief was. */
  private drawDoves(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    const now = this.time.now;
    for (let i = 0; i < 6; i++) {
      const a = now / 260 + (i * Math.PI * 2) / 6;
      const dx = Math.round(x + Math.cos(a) * (10 + (i % 3) * 4));
      const dy = Math.round(y + Math.sin(a) * 5 - (i % 2) * 6 + Math.sin(now / 90 + i) * 2);
      const up = Math.sin(now / 45 + i * 1.7) > 0;
      g.fillStyle(0xffffff, 1).fillRect(dx - 2, dy, 5, 2); // body
      g.fillStyle(0xe8ecf4, 1).fillRect(dx - 3, up ? dy - 2 : dy + 2, 3, 2).fillRect(dx + 1, up ? dy - 2 : dy + 2, 3, 2); // wings
      g.fillStyle(0xffa040, 1).fillRect(Math.cos(a) > 0 ? dx - 3 : dx + 3, dy, 1, 1); // beak
    }
    if (Math.random() < 0.2) g.fillStyle(0xffffff, 0.8).fillRect(x + (Math.random() - 0.5) * 30, y + Math.random() * 14, 2, 1); // a falling feather
  }

  private destroyView(view: PlayerView) {
    view.body.destroy();
    view.weapon?.destroy();
    view.bike?.destroy();
    view.glitch?.forEach((g) => g.destroy());
    view.trail?.forEach((g) => g.destroy());
    view.label.destroy();
    view.bar.destroy();
  }

  /** Speed Raptor: a fading line of afterimages along the way it just ran. */
  private drawTrail(view: PlayerView, dead: boolean) {
    const body = view.body;
    const pts = (view.trailPts ??= []);
    pts.unshift({ x: body.x, y: body.y });
    if (pts.length > 16) pts.pop();
    if (!view.trail) {
      view.trail = [0, 1, 2, 3, 4].map(() => this.add.image(body.x, body.y, body.texture.key).setOrigin(body.originX, body.originY).setTint(0x5af0ff));
    }
    view.trail.forEach((g, i) => {
      const at = pts[Math.min(pts.length - 1, (i + 1) * 3)];
      const gap = Math.hypot(at.x - body.x, at.y - body.y);
      g.setTexture(body.texture.key)
        .setScale(body.scaleX, body.scaleY)
        .setFlipX(body.flipX)
        .setPosition(at.x, at.y)
        .setDepth(body.depth - 0.1 - i * 0.01)
        .setAlpha(0.45 * (1 - i / 5))
        .setVisible(!dead && gap > 6); // only while running
    });
  }

  /** Yaotsu looks like a rendering error: red and cyan copies jitter around the body. */
  private drawGlitch(view: PlayerView, dead: boolean) {
    const body = view.body;
    if (!view.glitch) {
      view.glitch = [0xff2a6a, 0x2affea].map((tint) =>
        this.add.image(body.x, body.y, body.texture.key).setOrigin(0.5, 0.85).setTint(tint).setBlendMode(Phaser.BlendModes.ADD),
      );
    }
    const burst = Math.random() < 0.12; // every so often the image tears badly
    view.glitch.forEach((g, i) => {
      const spread = burst ? 4 : 1.5;
      g.setTexture(body.texture.key)
        .setScale(body.scaleX * (burst && i === 0 ? 1.15 : 1), body.scaleY)
        .setFlipX(body.flipX)
        .setPosition(body.x + (Math.random() - 0.5) * spread * 2 + (i === 0 ? -1 : 1), body.y + (Math.random() - 0.5) * spread)
        .setDepth(body.depth - 0.1)
        .setAlpha(dead ? 0 : burst ? 0.8 : 0.45)
        .setVisible(!dead);
    });
    if (burst && !dead) {
      // a torn scanline across the body
      const y = body.y - 4 - Math.random() * 12;
      this.fx.fillStyle(Math.random() < 0.5 ? 0xff2a6a : 0x2affea, 0.8).fillRect(body.x - 10 + (Math.random() - 0.5) * 8, y, 20, 1);
    }
  }

  // ------------------------------------------------------------- effects

  /** Spot new attacks and skills (their counters went up) and start an effect for each. */
  private playAttackEffects(view: PlayerView, p: any, x: number, y: number, aim: number) {
    const hero = heroOf(p.hero);
    const isMe = p === this.room?.state.players.get(this.room.sessionId);
    if (p.attackSeq !== view.attackSeq) {
      view.attackSeq = p.attackSeq;
      view.swing = SWING_TIME;
      // Online, our own swings were already drawn the moment we pressed attack.
      if (!(isMe && this.takePredicted(this.predictedAttacks))) this.playAttack(p, x, y, aim);
    }
    if (p.skillSeq !== view.skillSeq) {
      view.skillSeq = p.skillSeq;
      if (!(isMe && this.takePredicted(this.predictedSkills))) this.playSkillEffect(hero.skill, x, y, aim, view);
    }
    if (hero.skill2 && p.skill2Seq !== view.skill2Seq) {
      view.skill2Seq = p.skill2Seq;
      if (!(isMe && this.takePredicted(this.predictedSkills2))) this.playSkillEffect(hero.skill2, x, y, aim, view);
    }
  }

  /** Use up one effect we already drew ahead of the server (entries older than a second have expired). */
  private takePredicted(list: number[]): boolean {
    const now = performance.now();
    while (list.length && now - list[0] > 1000) list.shift();
    return list.shift() !== undefined;
  }

  /**
   * Online, draw our own attacks and skills as soon as they are pressed instead of waiting a round
   * trip for the server. The server still decides the hits; its echo of these effects is skipped.
   */
  private predictEffects(input: PlayerInput, dt: number) {
    this.localAttackTimer = Math.max(0, this.localAttackTimer - dt);
    this.localSkillLock = Math.max(0, this.localSkillLock - dt);
    this.localSkill2Lock = Math.max(0, this.localSkill2Lock - dt);
    const room = this.room;
    if (!room || room instanceof LocalRoom) return;
    const me = room.state.players.get(room.sessionId);
    const state = room.state;
    if (!me || me.dead || me.stun > 0 || (state.timeStop > 0 && state.timeStopBy !== room.sessionId && !movesInStoppedTime(me.hero))) return;
    const hero = heroOf(me.hero);
    const x = this.predicted.x;
    const y = this.predicted.y - 5 * HERO_SCALE;
    if (input.shoot && this.localAttackTimer <= 0) {
      this.localAttackTimer = me.titan > 0 ? TITAN_ATTACK_COOLDOWN : hero.gun && me.mode === 1 ? hero.gun.attackCooldown : hero.sword && me.buff > 0 ? hero.sword.attackCooldown : hero.attackCooldown;
      this.predictedAttacks.push(performance.now());
      this.playAttack(me, x, y, this.aim);
    }
    // Ordinary humans (a rival's reality change) cannot use skills.
    if (state.reality > 0 && state.realityBy !== room.sessionId && ringStage(state.stage)) return;
    // Lock the button until the server's cooldown has had time to reach us.
    const lock = Math.max(0.4, (this.pingMs * 1.5) / 1000);
    if (input.skill && me.skillCooldown <= 0 && this.localSkillLock <= 0 && hero.skill.kind !== "passive") {
      this.localSkillLock = lock;
      this.predictedSkills.push(performance.now());
      this.playSkillEffect(hero.skill, x, y, this.aim, this.players.get(room.sessionId));
    }
    if (hero.skill2 && input.skill2 && me.skill2Cooldown <= 0 && this.localSkill2Lock <= 0) {
      this.localSkill2Lock = lock;
      this.predictedSkills2.push(performance.now());
      this.playSkillEffect(hero.skill2, x, y, this.aim, this.players.get(room.sessionId));
    }
  }

  private playAttack(p: any, x: number, y: number, aim: number) {
    const hero = heroOf(p.hero);
    if (p.titan > 0) {
      this.effects.push({ kind: "smash", x, y: y + 5, aim, range: hero.skill.radius, arc: Math.PI * 2, age: 0, life: 0.35 });
      this.cameras.main.shake(150, 0.008);
      this.sparks.explode(12, x, y + 5);
    } else if (hero.gun && p.mode === 1) {
      this.effects.push({ kind: "muzzle", x, y, aim, range: 20, arc: 0, age: 0, life: 0.05 });
    } else if (hero.sword && p.buff > 0) {
      this.effects.push({ kind: "sword", x, y, aim, range: hero.sword.range, arc: hero.sword.arc, age: 0, life: 0.18 });
      this.playSwordSlash(x, y, aim, hero.sword.range);
    } else if (hero.lineAttack) {
      this.effects.push({ kind: "tkick", x, y, aim, range: hero.range, arc: hero.lineAttack, age: 0, life: 0.14 });
    } else if (hero.attack === "rifle") {
      this.effects.push({ kind: "muzzle", x, y, aim, range: 16, arc: 0, age: 0, life: 0.08 });
      if (p === this.room?.state.players.get(this.room.sessionId)) this.cameras.main.shake(60, 0.004);
    } else if (hero.attack === "magic") {
      this.effects.push({ kind: "muzzle", x, y, aim, range: 10, arc: 0, age: 0, life: 0.1 });
    } else if (hero.skill2?.kind === "yoyo" && p.mode === 1) {
      // YOYO MODE: the string is drawn where the yoyo lands.
    } else if (hero.attack === "lightning") {
      const tx = x + Math.cos(aim) * hero.range;
      const ty = y + 5 + Math.sin(aim) * hero.range;
      this.effects.push({ kind: "bolt", x: tx, y: ty, aim, range: hero.aoe, arc: 0, age: 0, life: 0.22 });
    } else {
      this.effects.push({ kind: hero.attack, x, y, aim, range: hero.range, arc: hero.arc, age: 0, life: hero.attack === "punch" ? 0.14 : 0.18 });
      if (hero.attack === "sword") this.playSwordSlash(x, y, aim, hero.range);
    }
  }

  private playSkillEffect(skill: SkillDef, x: number, y: number, aim: number, view?: PlayerView) {
    const cam = this.cameras.main;
    switch (skill.kind) {
      case "smash":
        if (skill.duration) cam.flash(80, 255, 240, 160);
        this.effects.push({ kind: "smash", x, y: y + 5, aim, range: skill.radius, arc: Math.PI * 2, age: 0, life: 0.35 });
        cam.shake(200, 0.012);
        this.sparks.explode(24, x, y + 5);
        break;
      case "storm":
        this.effects.push({ kind: "storm", x, y: y + 5, aim, range: skill.radius, arc: 0, age: 0, life: 0.4 });
        cam.shake(150, 0.008);
        break;
      case "jab":
        this.effects.push({ kind: "jab", x, y, aim, range: skill.radius, arc: skill.width ?? 16, age: 0, life: 0.18 });
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
      case "charge": {
        // MAX SMASH: as big as our own charge (someone else's charge is not known: drawn half charged).
        const mine = !!view && view === this.players.get(this.room?.sessionId ?? "");
        const power = chargePower(mine ? this.charge2 : CHARGE_FULL / 2);
        const reach = chargeReach(power);
        this.effects.push({ kind: "line", x, y, aim, range: skill.radius * reach, arc: (skill.width ?? 40) * reach, age: 0, life: 0.45 });
        cam.shake(150 + power * 60, 0.006 * power);
        break;
      }
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
        // We are already at the end of the dash: play the dagger-dash animation back along the path.
        this.playDaggerDash(x - Math.cos(aim) * skill.radius, y - Math.sin(aim) * skill.radius, aim, skill.radius);
        break;
      case "titan":
        break; // the transformation is drawn when the body changes
      case "city":
        cam.shake(400, 0.01);
        this.sparks.explode(30, x, y);
        break;
      case "reality":
        this.effects.push({ kind: "ripple", x, y, aim, range: 900, arc: 0, age: 0, life: 0.9 });
        cam.flash(300, 255, 255, 255);
        cam.shake(200, 0.01);
        break;
      case "swap": // a quick flourish as the weapon changes hands
        this.sparks.explode(6, x, y);
        break;
      case "gatling":
        this.effects.push({ kind: "gatling", x, y, aim, range: skill.radius, arc: skill.width ?? 40, age: 0, life: skill.duration ?? 1, follow: view });
        cam.shake(150, 0.005);
        break;
      case "portal":
        this.effects.push({ kind: "muzzle", x, y, aim, range: 12, arc: 0, age: 0, life: 0.12 });
        break;
      case "missiles":
        this.sparks.explode(14, x, y);
        cam.shake(120, 0.006);
        break;
      case "rewind":
        // TIME MACHINE: the world spins back.
        this.effects.push({ kind: "rewind", x, y, aim, range: 420, arc: 0, age: 0, life: 0.8 });
        cam.flash(250, 140, 190, 255);
        break;
      case "summon":
        this.sparks.explode(24, x, y);
        break;
      case "card":
        this.effects.push({ kind: "muzzle", x, y, aim, range: 10, arc: 0, age: 0, life: 0.1 });
        break;
      case "revive":
        this.effects.push({ kind: "heal", x, y: y + 5, aim, range: 30, arc: 0, age: 0, life: 0.6 });
        break;
      case "cross":
        // DEATH CROSS: a huge red straight with a shockwave where it lands.
        this.effects.push({ kind: "jab", x, y, aim, range: skill.radius, arc: skill.width ?? 26, age: 0, life: 0.3 });
        this.effects.push({ kind: "impact", x: x + Math.cos(aim) * skill.radius * 0.6, y: y + Math.sin(aim) * skill.radius * 0.6, aim, range: skill.radius * 0.8, arc: 1.2, age: 0, life: 0.35 });
        cam.shake(220, 0.016);
        this.sparks.explode(18, x + Math.cos(aim) * skill.radius, y + Math.sin(aim) * skill.radius);
        break;
      case "eyebeam":
        this.effects.push({ kind: "muzzle", x, y: y - 8, aim, range: 6, arc: 0, age: 0, life: 0.15 });
        break;
      case "latch":
        this.effects.push({ kind: "ripple", x, y, aim, range: 30, arc: 0, age: 0, life: 0.3 });
        break;
      case "kick":
        // We already landed: draw the flying kick back along the path.
        this.effects.push({ kind: "kick", x: x - Math.cos(aim) * skill.radius, y: y - Math.sin(aim) * skill.radius, aim, range: skill.radius, arc: skill.width ?? 30, age: 0, life: 0.4 });
        cam.shake(200, 0.012);
        this.sparks.explode(16, x, y);
        break;
      case "immortal":
        this.effects.push({ kind: "ripple", x, y, aim, range: 60, arc: 0, age: 0, life: 0.4 });
        cam.shake(150, 0.008);
        break;
      case "dashkick":
        this.effects.push({ kind: "ripple", x, y, aim, range: 26, arc: 0, age: 0, life: 0.25 });
        break;
      case "thunderdash":
      case "seventh":
        // We are already at the end of the dash: lightning back along the path.
        this.effects.push({ kind: "thunder", x: x - Math.cos(aim) * skill.radius, y: y - Math.sin(aim) * skill.radius, aim, range: skill.radius, arc: skill.width ?? 26, age: 0, life: skill.kind === "seventh" ? 0.5 : 0.3 });
        cam.shake(skill.kind === "seventh" ? 200 : 100, skill.kind === "seventh" ? 0.012 : 0.006);
        break;
      case "godrush":
        // LIGHTNING DASH: a silver streak back along the lunge, then the spin cut where he landed.
        this.effects.push({ kind: "line", x: x - Math.cos(aim) * skill.radius, y: y - Math.sin(aim) * skill.radius, aim, range: skill.radius, arc: 10, age: 0, life: 0.3 });
        this.effects.push({ kind: "sword", x, y, aim, range: 66, arc: Math.PI * 2, age: 0, life: 0.3 });
        cam.shake(150, 0.008);
        break;
      case "fan":
        this.effects.push({ kind: "muzzle", x, y, aim, range: 10, arc: 0, age: 0, life: 0.1 });
        break;
      case "invis":
        this.effects.push({ kind: "ripple", x, y, aim, range: 30, arc: 0, age: 0, life: 0.3 });
        break;
      case "bat":
      case "yoyo":
      case "excalibur":
        this.sparks.explode(14, x, y);
        if (skill.kind === "excalibur") cam.flash(120, 200, 230, 255);
        break;
      case "bike":
        cam.shake(120, 0.006);
        this.sparks.explode(10, x, y + 4);
        break;
      case "sacrifice":
        cam.flash(150, 160, 0, 0);
        cam.shake(200, 0.01);
        break;
      case "grab":
        break; // the slam is drawn in the zone
      case "knives":
      case "rubberpunch":
      case "starfinger":
        this.effects.push({ kind: "muzzle", x, y, aim, range: 10, arc: 0, age: 0, life: 0.12 });
        break;
      case "purple":
        // PURPLE BEAM: a huge violet blast straight ahead.
        this.effects.push({ kind: "purple", x, y, aim, range: skill.radius, arc: skill.width ?? 40, age: 0, life: 0.5 });
        cam.shake(300, 0.02);
        cam.flash(120, 160, 60, 255);
        break;
      case "grapple":
        this.effects.push({ kind: "muzzle", x, y, aim, range: 10, arc: 0, age: 0, life: 0.12 });
        break;
      case "trojan":
        this.sparks.explode(10, x + Math.cos(aim) * (skill.width ?? 60), y + Math.sin(aim) * (skill.width ?? 60));
        break;
      case "sticky":
        this.effects.push({ kind: "ripple", x, y, aim, range: 22, arc: 0, age: 0, life: 0.2 });
        break;
      case "spinkick":
        if (view) view.spin = skill.duration ?? 0.45;
        this.effects.push({ kind: "spinkick", x, y: y + 2, aim, range: skill.radius, arc: 0, age: 0, life: skill.duration ?? 0.45, follow: view });
        cam.shake(120, 0.006);
        break;
      case "totem":
        this.effects.push({ kind: "heal", x, y: y + 5, aim, range: 30, arc: 0, age: 0, life: 0.5 });
        break;
      case "eat":
        // SNACK: a quick bite and some HP back.
        this.effects.push({ kind: "heal", x, y: y + 5, aim, range: 22, arc: 0, age: 0, life: 0.4 });
        break;
      case "mitosis":
        this.effects.push({ kind: "ripple", x, y, aim, range: 26, arc: 0, age: 0, life: 0.25 });
        break;
      case "omnitrix":
        break; // the green flash plays when the view swaps to the alien
      case "palm":
        break; // the palm falls in the zone drawing
      case "doves":
        // THE MAGICIAN: a puff of smoke and he is gone.
        this.effects.push({ kind: "ripple", x, y, aim, range: 34, arc: 0, age: 0, life: 0.35 });
        this.sparks.explode(20, x, y);
        break;
      case "biglight":
        // BIG LIGHT: a flashlight beam sweeps out ahead.
        this.effects.push({ kind: "biglight", x, y, aim, range: skill.radius, arc: skill.width ?? 0.6, age: 0, life: 0.5 });
        break;
      case "truck":
        // TRUCK SMASH: the truck falls in the zone drawing.
        this.effects.push({ kind: "ripple", x, y, aim, range: 40, arc: 0, age: 0, life: 0.4 });
        cam.shake(120, 0.006);
        break;
      case "diamond":
        cam.flash(150, 120, 240, 255);
        this.sparks.explode(18, x, y);
        break;
      case "build":
        this.sparks.explode(6, x + Math.cos(aim) * skill.radius, y + Math.sin(aim) * skill.radius);
        break;
    }
  }

  /** Stars circling the heads of stunned monsters and players. */
  private drawStuns(g: Phaser.GameObjects.Graphics) {
    const state = this.room?.state;
    if (!state) return;
    const spin = this.time.now / 150;
    const stars = (x: number, y: number) => {
      for (let i = 0; i < 3; i++) {
        const a = spin + (i * Math.PI * 2) / 3;
        g.fillStyle(0xffe14a, 1).fillRect(Math.round(x + Math.cos(a) * 7) - 1, Math.round(y + Math.sin(a) * 2.5) - 1, 3, 3);
      }
    };
    state.enemies.forEach((e: any, id: string) => {
      const view = this.enemies.get(id);
      if (e.stun > 0 && view) stars(view.sprite.x, view.sprite.y - view.sprite.displayHeight * 0.75 - 3);
    });
    state.players.forEach((p: any, id: string) => {
      const view = this.players.get(id);
      if (p.stun > 0 && !p.dead && view) stars(view.body.x, view.body.y - view.body.displayHeight * 0.85 - 3);
    });
  }

  private drawEffects(dt: number) {
    const g = this.fx;
    g.clear();
    this.effects = this.effects.filter((e) => (e.age += dt) < e.life);
    this.drawStuns(g);
    for (const e of this.effects) {
      const t = e.age / e.life;
      if (e.follow?.body.active) {
        e.x = e.follow.body.x;
        e.y = e.follow.body.y - 5;
      }
      if (e.kind === "flame") {
        // Flamethrower: a flickering cone of fire.
        for (let i = 0; i < 12; i++) {
          const d = e.range * (0.12 + 0.88 * Math.random());
          const a = e.aim + (Math.random() - 0.5) * e.arc;
          const color = [0xffe14a, 0xff8a1a, 0xe0401a][Math.floor(Math.random() * 3)];
          g.fillStyle(color, 0.85 * (1 - t));
          g.fillCircle(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, (2 + (d / e.range) * 5) * (1 - t * 0.5));
        }
      } else if (e.kind === "punch") {
        // A punch pushes a gust of wind: streaks rushing forward and a shock ring where the fist lands.
        const r = e.range * (0.6 + 0.4 * t);
        const cos = Math.cos(e.aim);
        const sin = Math.sin(e.aim);
        g.fillStyle(0xffffff, 0.18 * (1 - t));
        g.slice(e.x, e.y, r + 6, e.aim - e.arc / 2, e.aim + e.arc / 2);
        g.fillPath();
        for (let i = -2; i <= 2; i++) {
          const side = (i / 2) * Math.min(e.arc, 1.2) * 0.5;
          const a = e.aim + side;
          const from = e.range * (0.25 + 0.5 * t) - Math.abs(i) * 3;
          const to = from + 10 + 8 * (1 - t);
          g.lineStyle(i === 0 ? 2 : 1, 0xe8f4ff, 0.9 * (1 - t));
          g.lineBetween(e.x + Math.cos(a) * from, e.y + Math.sin(a) * from, e.x + Math.cos(a) * to, e.y + Math.sin(a) * to);
        }
        g.lineStyle(2, 0xffffff, 0.9 * (1 - t));
        g.strokeEllipse(e.x + cos * r, e.y + sin * r, 6 + 14 * t, 10 + 18 * t);
        g.fillStyle(0xffd400, 0.8 * (1 - t));
        g.fillCircle(e.x + cos * r, e.y + sin * r, 4 * (1 - t) + 2);
      } else if (e.kind === "sword") {
        // A wind slash: a filled crescent sweeps across the whole blade, with gusts flying off its edge.
        const start = e.aim - e.arc / 2;
        const sweep = start + e.arc * Math.min(1, t * 1.8);
        const steps = 10;
        const outer: { x: number; y: number }[] = [];
        const inner: { x: number; y: number }[] = [];
        for (let i = 0; i <= steps; i++) {
          const a = start + ((sweep - start) * i) / steps;
          const thick = Math.sin((i / steps) * Math.PI) * 0.45 + 0.1; // thickest in the middle of the swing
          outer.push({ x: e.x + Math.cos(a) * e.range, y: e.y + Math.sin(a) * e.range });
          inner.push({ x: e.x + Math.cos(a) * e.range * (1 - thick), y: e.y + Math.sin(a) * e.range * (1 - thick) });
        }
        g.fillStyle(0xbcd4ff, 0.45 * (1 - t)).fillPoints([...outer, ...inner.reverse()], true);
        g.lineStyle(2, 0xffffff, 1 - t);
        g.beginPath();
        g.arc(e.x, e.y, e.range, start, sweep);
        g.strokePath();
        for (let i = 0; i < 3; i++) {
          const a = start + e.arc * (0.25 + i * 0.25);
          if (a > sweep) break;
          const from = e.range + 2 + 6 * t;
          g.lineStyle(1, 0xe8f4ff, 0.8 * (1 - t));
          g.lineBetween(e.x + Math.cos(a) * from, e.y + Math.sin(a) * from, e.x + Math.cos(a + 0.25) * (from + 10), e.y + Math.sin(a + 0.25) * (from + 10));
        }
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
      } else if (e.kind === "jab") {
        // A straight jab: a narrow band shoots out to full reach, with a flash where the fist lands.
        const cos = Math.cos(e.aim);
        const sin = Math.sin(e.aim);
        const len = e.range * Math.min(1, t * 5);
        const w = (e.arc / 2) * (1 - t * 0.5);
        const pts = [
          { x: e.x - sin * w, y: e.y + cos * w },
          { x: e.x + cos * len - sin * w, y: e.y + sin * len + cos * w },
          { x: e.x + cos * len + sin * w, y: e.y + sin * len - cos * w },
          { x: e.x + sin * w, y: e.y - cos * w },
        ];
        g.fillStyle(0xffd400, 0.35 * (1 - t)).fillPoints(pts, true);
        g.lineStyle(1, 0xffffff, 0.8 * (1 - t)).strokePoints(pts, true);
        g.fillStyle(0xffffff, 0.9 * (1 - t)).fillCircle(e.x + cos * len, e.y + sin * len, 5 * (1 - t) + 2);
      } else if (e.kind === "thunder") {
        // THUNDER DASH / SEVENTH FORM: a golden band with jagged lightning down the lane.
        const cos = Math.cos(e.aim);
        const sin = Math.sin(e.aim);
        const w = e.arc / 2;
        const pts = [
          { x: e.x - sin * w, y: e.y + cos * w },
          { x: e.x + cos * e.range - sin * w, y: e.y + sin * e.range + cos * w },
          { x: e.x + cos * e.range + sin * w, y: e.y + sin * e.range - cos * w },
          { x: e.x + sin * w, y: e.y - cos * w },
        ];
        g.fillStyle(0xffd400, 0.3 * (1 - t)).fillPoints(pts, true);
        for (const [lw, color] of [[3, 0xffc400], [1, 0xffffff]] as const) {
          for (let k = 0; k < 2; k++) {
            g.lineStyle(lw, color, 1 - t).beginPath();
            g.moveTo(e.x, e.y);
            for (let d = 14; d < e.range; d += 14) {
              const off = (Math.random() - 0.5) * e.arc * 0.8;
              g.lineTo(e.x + cos * d - sin * off, e.y + sin * d + cos * off);
            }
            g.lineTo(e.x + cos * e.range, e.y + sin * e.range);
            g.strokePath();
          }
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
      } else if (e.kind === "gatling") {
        // GATLING PUNCH: a blur of fists all down the lane.
        const cos = Math.cos(e.aim);
        const sin = Math.sin(e.aim);
        const w = e.arc / 2;
        const lane = [
          { x: e.x - sin * w, y: e.y + cos * w },
          { x: e.x + cos * e.range - sin * w, y: e.y + sin * e.range + cos * w },
          { x: e.x + cos * e.range + sin * w, y: e.y + sin * e.range - cos * w },
          { x: e.x + sin * w, y: e.y - cos * w },
        ];
        g.fillStyle(0xffd400, 0.12).fillPoints(lane, true);
        for (let k = 0; k < 7; k++) {
          const d = 10 + Math.random() * (e.range - 10);
          const off = (Math.random() - 0.5) * e.arc * 0.9;
          const fx = e.x + cos * d - sin * off;
          const fy = e.y + sin * d + cos * off;
          g.lineStyle(2, 0xf6e2c8, 0.5).lineBetween(e.x - sin * off * 0.3, e.y + cos * off * 0.3, fx, fy); // stretchy arm
          g.fillStyle(0xe8a878, 1).fillCircle(fx, fy, 4);
          g.lineStyle(1, 0x1a0f14, 1).strokeCircle(fx, fy, 4);
        }
        if (Math.random() < 0.5) this.sparks.explode(1, e.x + cos * e.range * Math.random(), e.y + sin * e.range * Math.random());
      } else if (e.kind === "kick") {
        // RIDER KICK: a streak of green energy ending in a burst where the foot lands.
        const cos = Math.cos(e.aim);
        const sin = Math.sin(e.aim);
        const ex = e.x + cos * e.range;
        const ey = e.y + sin * e.range;
        g.lineStyle(e.arc * 0.6 * (1 - t), 0x3aff6a, 0.35 * (1 - t)).lineBetween(e.x, e.y, ex, ey);
        g.lineStyle(4, 0xe02a3a, 1 - t).lineBetween(e.x + cos * e.range * 0.3, e.y + sin * e.range * 0.3, ex, ey);
        g.lineStyle(2, 0xffffff, 1 - t).lineBetween(e.x + cos * e.range * 0.5, e.y + sin * e.range * 0.5, ex, ey);
        g.fillStyle(0xffd400, 0.8 * (1 - t)).fillCircle(ex, ey, 6 + 18 * t);
      } else if (e.kind === "biglight") {
        // A cone of warm light from the flashlight, fading out.
        g.fillStyle(0xfff07a, 0.35 * (1 - t));
        g.slice(e.x, e.y, e.range, e.aim - e.arc, e.aim + e.arc);
        g.fillPath();
        g.fillStyle(0xffffff, 0.3 * (1 - t));
        g.slice(e.x, e.y, e.range * 0.6, e.aim - e.arc * 0.4, e.aim + e.arc * 0.4);
        g.fillPath();
      } else if (e.kind === "purple") {
        // A thick violet beam that flares, then thins out.
        const cos = Math.cos(e.aim);
        const sin = Math.sin(e.aim);
        const ex = e.x + cos * e.range;
        const ey = e.y + sin * e.range;
        const w = e.arc * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85);
        g.lineStyle(w + 10, 0x6a1aff, 0.35).lineBetween(e.x, e.y, ex, ey);
        g.lineStyle(w, 0xa04aff, 0.85).lineBetween(e.x, e.y, ex, ey);
        g.lineStyle(Math.max(1, w / 3), 0xf0d8ff, 1).lineBetween(e.x, e.y, ex, ey);
        g.fillStyle(0xd0a0ff, 1 - t).fillCircle(e.x + cos * 10, e.y + sin * 10, e.arc * 0.6 * (1 - t));
      } else if (e.kind === "spinkick") {
        // SPINNING KICK: the kicking leg's trail whirls around him, ending in a shockwave.
        const turn = t * Math.PI * 4 + e.aim;
        g.lineStyle(6, 0xf6f6f6, 0.35 * (1 - t)).beginPath().arc(e.x, e.y, e.range * 0.75, turn - 1.6, turn).strokePath();
        g.lineStyle(3, 0xe8b48a, 1 - t * 0.5).beginPath().arc(e.x, e.y, e.range * 0.75, turn - 0.7, turn).strokePath();
        g.fillStyle(0xffffff, 1 - t).fillCircle(e.x + Math.cos(turn) * e.range * 0.75, e.y + Math.sin(turn) * e.range * 0.75, 4);
        if (t > 0.6) g.lineStyle(2, 0xffffff, (1 - t) * 2.5).strokeCircle(e.x, e.y, e.range * (0.6 + t * 0.5));
      } else if (e.kind === "tkick") {
        // A quick straight kick: a white streak with a snap at the end.
        const cos = Math.cos(e.aim);
        const sin = Math.sin(e.aim);
        const reach = e.range * Math.min(1, t * 3);
        const ex = e.x + cos * reach;
        const ey = e.y + sin * reach;
        g.lineStyle(e.arc * 0.7, 0xf6f6f6, 0.3 * (1 - t)).lineBetween(e.x, e.y, ex, ey);
        g.lineStyle(3, 0xe8b48a, 1 - t).lineBetween(e.x + cos * reach * 0.4, e.y + sin * reach * 0.4, ex, ey);
        g.lineStyle(1, 0xffffff, 1 - t).strokeCircle(ex, ey, 3 + 8 * t);
      } else if (e.kind === "rewind") {
        // A ring closing back in, with a clock hand spinning backwards.
        g.lineStyle(4, 0x9fd8ff, 0.8 * (1 - t)).strokeCircle(e.x, e.y, e.range * (1 - t));
        g.lineStyle(2, 0xffffff, 1 - t).strokeCircle(e.x, e.y, 26);
        const hand = -t * Math.PI * 6;
        g.lineBetween(e.x, e.y, e.x + Math.cos(hand) * 20, e.y + Math.sin(hand) * 20);
        g.lineBetween(e.x, e.y, e.x + Math.cos(hand / 12) * 13, e.y + Math.sin(hand / 12) * 13);
      } else if (e.kind === "muzzle") {
        g.fillStyle(0xffd23f, 1 - t);
        g.fillCircle(e.x + Math.cos(e.aim) * e.range, e.y + Math.sin(e.aim) * e.range, 4);
      }
    }
  }

  /** A jagged lightning bolt falling from the sky onto (x, y). */
  private drawBolt(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, glow = 0x4aa8ff) {
    for (const [width, color] of [[4, glow], [2, 0xffffff]] as const) {
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
    this.chargeLabel?.setVisible(false);
    const g = this.aimGuide;
    g.clear();
    this.drawFormWheel(undefined, 0, 0);
    const me = state.players.get(this.room!.sessionId);
    if (!me || me.dead) return;
    const hero = heroOf(me.hero);
    const x = this.predicted.x;
    const y = this.predicted.y - 5 * HERO_SCALE;
    const aiming = this.aimingSkill();
    const skill = aiming === 2 ? hero.skill2 : aiming === 1 ? hero.skill : undefined;
    this.drawFormWheel(skill?.kind === "omnitrix" ? me.hero : undefined, x, y);
    if (skill) {
      this.drawSkillGuide(g, skill, hero.range, x, y);
      if (skill.kind === "charge" && this.charging2) this.drawChargeGauge(g, x, y);
      return;
    }
    if (hero.attack === "lightning") {
      const tx = x + Math.cos(this.aim) * hero.range;
      const ty = y + 5 + Math.sin(this.aim) * hero.range;
      g.fillStyle(0x9fd8ff, 0.12).fillCircle(tx, ty, hero.aoe);
      g.lineStyle(1, 0x9fd8ff, 0.4).strokeCircle(tx, ty, hero.aoe);
    } else if (hero.attack === "rifle" || hero.attack === "magic" || (hero.gun && me.mode === 1)) {
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

  /** ALIEN TRANSFORM held: the aliens on a wheel around the hero; the one aimed at lights up. */
  private drawFormWheel(hero: string | undefined, x: number, y: number) {
    const forms = hero ? alienForms(hero) : [];
    const picked = hero ? formFromAim(hero, this.aim) : undefined;
    while (this.formIcons.length < forms.length) {
      this.formIcons.push({
        img: this.add.image(0, 0, "hero_omni").setDepth(1200),
        label: this.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" }).setScale(0.4).setOrigin(0.5, 0).setResolution(2).setDepth(1200),
      });
    }
    this.formIcons.forEach((icon, i) => {
      const show = i < forms.length;
      icon.img.setVisible(show);
      icon.label.setVisible(show);
      if (!show) return;
      const a = formAngle(i, forms.length);
      const ix = x + Math.cos(a) * 46;
      const iy = y + Math.sin(a) * 46;
      const on = forms[i] === picked;
      this.aimGuide.fillStyle(on ? 0x3ad13a : 0x000000, on ? 0.45 : 0.35).fillCircle(ix, iy, 15);
      this.aimGuide.lineStyle(on ? 2 : 1, on ? 0x9fff9f : 0xffffff, on ? 1 : 0.4).strokeCircle(ix, iy, 15);
      icon.img.setTexture(`hero_${forms[i]}`).setPosition(ix, iy + 1).setScale(on ? 1.15 : 0.9).setAlpha(on ? 1 : 0.6);
      icon.label.setText(heroOf(forms[i]).name).setPosition(ix, iy + 15).setAlpha(on ? 1 : 0.5);
    });
  }

  /** While a skill is held: where it will land (a lane for straight skills, an area for the rest). */
  /** MAX SMASH: a gauge over the hero's head fills up (green, yellow, red) with the power it will hit with. */
  private drawChargeGauge(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    const share = Math.min(1, this.charge2 / CHARGE_FULL);
    const w = 34;
    const top = y - 42; // above the name tag
    g.fillStyle(0x1a0f14, 0.9).fillRect(x - w / 2 - 1, top - 1, w + 2, 6);
    const color = share >= 1 ? (Math.floor(performance.now() / 120) % 2 ? 0xffffff : 0xff3a2a) : share > 0.66 ? 0xff3a2a : share > 0.33 ? 0xffd23f : 0x5aff7a;
    g.fillStyle(color, 1).fillRect(x - w / 2, top, w * share, 4);
    for (let i = 1; i < 3; i++) g.fillStyle(0x1a0f14, 1).fillRect(x - w / 2 + (w * i) / 3, top, 1, 4);
    if (!this.chargeLabel) {
      this.chargeLabel = this.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "8px", color: "#ffffff", stroke: "#1a0f14", strokeThickness: 2 }).setOrigin(0.5, 1).setDepth(10000);
    }
    this.chargeLabel.setText(`x${chargePower(this.charge2).toFixed(1)}`).setPosition(x, top - 1).setVisible(true);
  }

  private chargeLabel?: Phaser.GameObjects.Text;
  private seenParry = new Set<string>();
  private enemyHp = new Map<string, number>();
  private popups: { text: Phaser.GameObjects.Text; life: number; vx: number }[] = [];

  /** A number pops up and floats away wherever someone takes damage (or heals). */
  /**
   * Play one of the user's hand-drawn effect animations (art/props/<name>_0..N-1.png) once at `x,y`,
   * turned to `angle`, then remove it. Pictures are drawn pointing right; `flip` mirrors them across that line (`flipX` across the other).
   */
  private playFrames(name: string, frames: number, delay: number, x: number, y: number, angle: number, originX: number, originY: number, scale: number, flip: boolean, flipX = false) {
    const img = this.add.image(x, y, `${name}_0`).setOrigin(originX, originY).setRotation(angle);
    img.setScale(scale).setFlipY(flip).setFlipX(flipX).setDepth(955);
    let frame = 0;
    this.time.addEvent({
      delay,
      repeat: frames - 1,
      callback: () => {
        frame++;
        if (frame >= frames) img.destroy();
        else img.setTexture(`${name}_${frame}`);
      },
    });
  }

  /** DAGGER RUSH, from `x,y` along `aim` for `len`. In the frames the dash starts at (40, 58) and its streak runs 206px. */
  private playDaggerDash(x: number, y: number, aim: number, len: number) {
    this.playFrames("daggerdash", 12, 70, x, y, aim, 40 / 246, 58 / 100, len / 206, Math.cos(aim) < 0);
  }

  /**
   * A sword or knife basic attack: the blade comes down onto the spot `reach` ahead. The frames show it falling
   * from the top-left onto (80, 122), so they are turned a quarter turn back to make "down" point along the aim.
   */
  private playSwordSlash(x: number, y: number, aim: number, reach: number) {
    const tx = x + Math.cos(aim) * reach * 0.8;
    const ty = y + Math.sin(aim) * reach * 0.8;
    // Mirrored when aiming left, so the blade always comes over the top.
    const left = Math.cos(aim) < 0;
    this.playFrames("swordslash", 4, 70, tx, ty, aim - Math.PI / 2, left ? 48 / 128 : 80 / 128, 122 / 128, (reach * 0.9) / 90, false, left);
  }

  /** The normal dash: a burst left where the dash began, its point along `angle` and its trail behind. */
  private playDashBurst(x: number, y: number, angle: number) {
    // The frames point left with the burst's front at (5, 38); turn them half round to point along the dash.
    this.playFrames("dashburst", 11, 45, x, y, angle + Math.PI, 5 / 100, 38 / 75, 0.55, Math.cos(angle) > 0);
  }

  private popDamage(x: number, y: number, amount: number, color: string, sign = "") {
    if (amount < 1) return;
    let pop = this.popups.find((q) => q.life <= 0);
    if (!pop) {
      if (this.popups.length >= 40) return;
      const text = this.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "9px", fontStyle: "bold", stroke: "#1a0f14", strokeThickness: 3 }).setOrigin(0.5).setDepth(10001);
      pop = { text, life: 0, vx: 0 };
      this.popups.push(pop);
    }
    const big = amount >= 60;
    pop.text.setText(`${sign}${Math.round(amount)}`).setColor(color).setFontSize(big ? 12 : 9).setPosition(x + (Math.random() - 0.5) * 10, y).setAlpha(1).setVisible(true);
    pop.life = 0.7;
    pop.vx = (Math.random() - 0.5) * 30;
  }

  private tickPopups(dt: number) {
    for (const pop of this.popups) {
      if (pop.life <= 0) continue;
      pop.life -= dt;
      pop.text.x += pop.vx * dt;
      pop.text.y -= 28 * dt;
      pop.text.setAlpha(Math.min(1, pop.life / 0.3));
      if (pop.life <= 0) pop.text.setVisible(false);
    }
  }

  private drawSkillGuide(g: Phaser.GameObjects.Graphics, skill: SkillDef, heroRange: number, x: number, y: number) {
    const cos = Math.cos(this.aim);
    const sin = Math.sin(this.aim);
    const lane = (len: number, width: number) => {
      const w = width / 2;
      const pts = [
        { x: x - sin * w, y: y + cos * w },
        { x: x + cos * len - sin * w, y: y + sin * len + cos * w },
        { x: x + cos * len + sin * w, y: y + sin * len - cos * w },
        { x: x + sin * w, y: y - cos * w },
      ];
      g.fillStyle(0xffd23f, 0.16).fillPoints(pts, true);
      g.lineStyle(1, 0xffd23f, 0.7).strokePoints(pts, true);
    };
    const area = (cx: number, cy: number, r: number) => {
      g.fillStyle(0xffd23f, 0.12).fillCircle(cx, cy, r);
      g.lineStyle(1, 0xffd23f, 0.7).strokeCircle(cx, cy, r);
    };
    switch (skill.kind) {
      case "wave":
      case "line":
      case "jab":
      case "rush":
        lane(skill.radius, skill.width ?? 16);
        break;
      case "grapple":
        lane(skill.radius, 3);
        break;
      case "purple":
      case "starfinger":
        lane(skill.radius, skill.width ?? 8);
        break;
      case "rubberpunch":
        lane(200, 10);
        break;
      case "trojan":
      case "palm": {
        const w = skill.width ?? 60;
        lane(w, 4);
        area(x + cos * w, y + sin * w, skill.radius);
        break;
      }
      case "frost":
        lane(110, 4);
        area(x + cos * 110, y + sin * 110, skill.radius);
        break;
      case "thunderdash":
      case "seventh":
        lane(skill.radius, skill.width ?? 26);
        break;
      case "charge": {
        const reach = chargeReach(chargePower(this.charging2 ? this.charge2 : 0));
        lane(skill.radius * reach, (skill.width ?? 40) * reach);
        break;
      }
      case "godrush":
        lane(skill.radius, skill.width ?? 26);
        area(x + cos * skill.radius, y + sin * skill.radius, 66);
        break;
      case "fan": {
        const n = skill.count ?? 5;
        g.lineStyle(2, 0xffd23f, 0.6);
        for (let i = 0; i < n; i++) {
          const a = this.aim + (i - (n - 1) / 2) * (skill.width ?? 0.24);
          g.lineBetween(x, y, x + Math.cos(a) * skill.radius, y + Math.sin(a) * skill.radius);
        }
        break;
      }
      case "fireball":
      case "burst":
        lane(heroRange, skill.kind === "fireball" ? 14 : 6);
        break;
      case "onepunch":
        lane(skill.radius * 1.5, skill.radius * 1.4);
        break;
      case "gatling":
        lane(skill.radius, skill.width ?? 40);
        break;
      case "card":
        lane(skill.radius, 8);
        break;
      case "kick":
      case "cross":
      case "eyebeam":
        lane(skill.radius, skill.width ?? 30);
        break;
      case "truck":
        lane(skill.radius, 4);
        area(x + cos * skill.radius, y + sin * skill.radius, 60);
        break;
      case "build":
        lane(skill.radius, 4);
        area(x + cos * skill.radius, y + sin * skill.radius, 10);
        break;
      case "biglight":
        g.fillStyle(0xfff07a, 0.12);
        g.slice(x, y, skill.radius, this.aim - (skill.width ?? 0.6), this.aim + (skill.width ?? 0.6));
        g.fillPath();
        g.lineStyle(1, 0xfff07a, 0.6).beginPath();
        g.arc(x, y, skill.radius, this.aim - (skill.width ?? 0.6), this.aim + (skill.width ?? 0.6));
        g.strokePath();
        break;
      case "dashkick":
      case "sticky":
      case "grab":
      case "latch": {
        // A cone: the nearest target inside it gets bitten (or kicked).
        g.fillStyle(0xe02a3a, 0.12);
        g.slice(x, y, skill.radius, this.aim - 0.7, this.aim + 0.7);
        g.fillPath();
        g.lineStyle(1, 0xe02a3a, 0.6).beginPath();
        g.arc(x, y, skill.radius, this.aim - 0.7, this.aim + 0.7);
        g.strokePath();
        break;
      }
      case "portal":
        lane(skill.radius, 4);
        area(x + cos * skill.radius, y + sin * skill.radius, 16);
        break;
      case "hurricane":
        lane(120, 4);
        area(x + cos * 120, y + sin * 120, skill.radius);
        break;
      default:
        // Skills that hit all around you: show their reach (map-wide ones just get an arrow).
        if (skill.radius > 0 && skill.radius < 500) area(x, y + 5, skill.radius);
        lane(40, 4);
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
      const asHuman = state.reality > 0;
      const etex = asHuman ? "human" : e.kind;
      if (s.texture.key !== etex) {
        s.setTexture(etex).setScale(asHuman ? 1.2 : ENEMY_SCALE[e.kind as EnemyKind]);
        this.sparks.explode(8, s.x, s.y - 4);
      }
      const at = this.smoothed(`e${id}`, e.x, e.y);
      if (Math.abs(at.x - s.x) > 0.05) s.setFlipX(at.x < s.x);
      if (dt > 0 && !(state.timeStop > 0)) {
        const k = 1 - Math.exp(-dt * 8);
        view.vx += ((at.x - s.x) / dt - view.vx) * k;
        view.vy += ((at.y - s.y) / dt - view.vy) * k;
      }
      s.setPosition(at.x, at.y);
      // BIG LIGHT: enlarged monsters are drawn bigger.
      s.setScale((asHuman ? 1.2 : ENEMY_SCALE[e.kind as EnemyKind]) * (e.big > 0 ? BIG_SCALE : 1));
      // L's foresight: a ghost shows where this monster will be in half a second.
      if (foresight) {
        if (!view.ghost) view.ghost = this.add.image(s.x, s.y, e.kind).setOrigin(0.5, 0.75).setScale(s.scale).setTint(0xd890ff);
        const gx = Phaser.Math.Clamp(s.x + view.vx * ahead, 0, WORLD_W);
        const gy = Phaser.Math.Clamp(s.y + view.vy * ahead, 0, WORLD_H);
        view.ghost.setPosition(gx, gy).setFlipX(s.flipX).setDepth(gy - 0.5).setAlpha(0.5 + 0.1 * Math.sin(this.time.now / 120)).setVisible(true);
        this.beams.lineStyle(1, 0xd070ff, 0.35).lineBetween(s.x, s.y - 3, gx, gy - 3);
      } else view.ghost?.setVisible(false);
      s.setDepth(s.y);
      const was = this.enemyHp.get(id);
      if (was !== undefined && e.hp < was - 0.5) this.popDamage(s.x, s.y - s.displayHeight * 0.7, was - e.hp, "#ffe27a");
      if (this.enemyHp.size > 400) this.enemyHp.clear();
      this.enemyHp.set(id, e.hp);
      if (e.hitFlash > 0) s.setTintFill(0xffffff);
      else if (state.timeStop > 0) s.setTint(0x8a93b8);
      else if (e.beamState === 1 && Math.floor(this.time.now / 80) % 2 === 0) s.setTint(0x9fd8ff);
      else s.clearTint();
      if (e.beamState > 0) {
        s.setFlipX(Math.cos(e.beamAngle) < 0);
        if (e.kind === "kingkong") this.drawCharge(s.x, s.y, e.beamAngle, e.beamState);
        else if (e.kind === "swordgod") this.drawSwordGod(s.x, s.y, e.beamAngle, e.beamState, e.move);
        else this.drawBeam(s.x, s.y - 14, e.beamAngle, e.beamState);
      }
      view.x = e.x;
      view.y = e.y;

      const def = ENEMIES[e.kind as EnemyKind];
      const w = Math.max(12, def.radius * 2);
      view.bar.clear();
      if (e.big > 0) view.bar.lineStyle(1, 0xfff07a, 0.6).strokeEllipse(s.x, s.y + 1, def.radius * 2 * BIG_SCALE + 6, def.radius * BIG_SCALE + 3);
      if (e.hp < e.maxHp) {
        view.bar.fillStyle(0x000000, 0.7).fillRect(s.x - w / 2, s.y + 4, w, 2);
        view.bar.fillStyle(0xff5a36, 1).fillRect(s.x - w / 2, s.y + 4, w * (e.hp / e.maxHp), 2);
      }
      view.bar.setDepth(999);
    });

    for (const [id, view] of this.enemies) {
      if (seen.has(id)) continue;
      const big = !!ENEMIES[view.sprite.texture.key as EnemyKind]?.boss;
      this.sparks.explode(big ? 60 : 14, view.sprite.x, view.sprite.y - 4);
      if (big) this.cameras.main.shake(400, 0.01);
      view.sprite.destroy();
      view.ghost?.destroy();
      view.bar.destroy();
      this.enemies.delete(id);
      this.tracks.delete(`e${id}`);
    }
  }

  /** King Kong's charge: a flashing warning lane, then dust trailing behind him. */
  private drawCharge(x: number, y: number, angle: number, state: number) {
    const g = this.beams;
    const len = KONG_CHARGE_SPEED * KONG_CHARGE_TIME;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const w = KONG_CHARGE_WIDTH / 2 + 10;
    if (state === 1) {
      const pts = [
        { x: x - sin * w, y: y + cos * w },
        { x: x + cos * len - sin * w, y: y + sin * len + cos * w },
        { x: x + cos * len + sin * w, y: y + sin * len - cos * w },
        { x: x + sin * w, y: y - cos * w },
      ];
      g.fillStyle(0xff3030, 0.15 + 0.15 * Math.sin(this.time.now / 50)).fillPoints(pts, true);
      g.lineStyle(1, 0xff6040, 0.8).strokePoints(pts, true);
      return;
    }
    for (let i = 1; i <= 4; i++) {
      g.fillStyle(0xc8b48a, 0.4 - i * 0.08).fillCircle(x - cos * i * 12 + (Math.random() - 0.5) * 6, y - sin * i * 12, 8 - i);
    }
    if (Math.random() < 0.4) this.cameras.main.shake(60, 0.004);
  }

  /**
   * The Sword God's moves: a red warning while he winds up (where the cut will land),
   * then white sword light as it strikes.
   */
  private drawSwordGod(x: number, y: number, angle: number, state: number, move: number) {
    const g = this.beams;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const pulse = 0.18 + 0.14 * Math.sin(this.time.now / 45);
    y -= 4;
    if (move === 1) {
      // Dash: a straight lane.
      const d = SWORD_GOD.dash;
      const len = d.speed * d.active;
      const w = d.width / 2 + 6;
      if (state === 1) {
        const pts = [
          { x: x - sin * w, y: y + cos * w },
          { x: x + cos * len - sin * w, y: y + sin * len + cos * w },
          { x: x + cos * len + sin * w, y: y + sin * len - cos * w },
          { x: x + sin * w, y: y - cos * w },
        ];
        g.fillStyle(0xff3030, pulse).fillPoints(pts, true);
        g.lineStyle(1, 0xff6040, 0.8).strokePoints(pts, true);
      } else {
        for (let i = 1; i <= 5; i++) g.lineStyle(4 - i * 0.6, 0xffffff, 0.7 - i * 0.12).lineBetween(x - cos * i * 10, y - sin * i * 10, x - cos * (i + 1) * 10, y - sin * (i + 1) * 10);
      }
    } else if (move === 2) {
      // Whirl: everything around him.
      const r = SWORD_GOD.whirl.radius;
      if (state === 1) {
        g.fillStyle(0xff3030, pulse).fillCircle(x, y, r);
        g.lineStyle(1, 0xff6040, 0.8).strokeCircle(x, y, r);
      } else {
        const spin = this.time.now / 40;
        g.lineStyle(4, 0xbcd4ff, 0.8).beginPath().arc(x, y, r - 4, spin, spin + 2.6).strokePath();
        g.lineStyle(2, 0xffffff, 1).beginPath().arc(x, y, r - 8, spin + Math.PI, spin + Math.PI + 2.6).strokePath();
      }
    } else if (move === 3 && state === 1) {
      // Waves: the fan the slashes will fly along.
      const w = SWORD_GOD.waves;
      g.lineStyle(2, 0xff4040, 0.35 + pulse);
      for (let i = 0; i < w.count; i++) {
        const a = angle + (i - (w.count - 1) / 2) * w.spread;
        g.lineBetween(x + Math.cos(a) * 12, y + Math.sin(a) * 12, x + Math.cos(a) * 90, y + Math.sin(a) * 90);
      }
    } else if (move === 4) {
      // Flurry: a cone in front of him.
      const f = SWORD_GOD.flurry;
      if (state === 1) {
        const pts = [{ x, y }];
        for (let i = 0; i <= 12; i++) {
          const a = angle - f.arc / 2 + (f.arc * i) / 12;
          pts.push({ x: x + Math.cos(a) * f.range, y: y + Math.sin(a) * f.range });
        }
        g.fillStyle(0xff3030, pulse).fillPoints(pts, true);
        g.lineStyle(1, 0xff6040, 0.8).strokePoints(pts, true);
      } else if (Math.floor(this.time.now / 60) % 2 === 0) {
        g.lineStyle(3, 0xffffff, 0.9).beginPath().arc(x, y, f.range - 6, angle - f.arc / 2, angle + f.arc / 2).strokePath();
      }
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
      } else if (z.kind === "city") {
        // Yaotsu's CREATOR: streets fill the ground and a skyline rises.
        floor.fillStyle(0x3a3e48, 0.55 * fade).fillCircle(z.x, z.y, z.radius);
        floor.lineStyle(1, 0xf2e6a0, 0.35 * fade);
        for (let d = -z.radius; d <= z.radius; d += 48) {
          const half = Math.sqrt(Math.max(0, z.radius * z.radius - d * d));
          floor.lineBetween(z.x + d, z.y - half, z.x + d, z.y + half);
          floor.lineBetween(z.x - half, z.y + d, z.x + half, z.y + d);
        }
        floor.lineStyle(3, 0xc8d4ec, 0.9 * fade).strokeCircle(z.x, z.y, z.radius);
        let img = this.zoneImages.get(id);
        if (!img) {
          img = this.add.image(z.x, z.y, "city").setOrigin(0.5, 0.72).setDepth(-2).setScale(2);
          this.zoneImages.set(id, img);
        }
        img.setAlpha(0.92 * fade);
      } else if (z.kind === "portalA" || z.kind === "portalB") {
        // PORTAL GUN: the user's swirling portal animations (blue in, pink out), standing on a glow on the ground.
        const color = z.kind === "portalA" ? "portalblue" : "portalpink";
        floor.fillStyle(z.kind === "portalA" ? 0x3aa8ff : 0xff3ad8, 0.3 * fade).fillEllipse(z.x, z.y, z.radius * 2, z.radius * 0.8);
        let img = this.zoneImages.get(id);
        if (!img) {
          img = this.add.image(z.x, z.y, `${color}_0`).setOrigin(0.5, 0.85).setDepth(z.y);
          this.zoneImages.set(id, img);
        }
        img.setTexture(`${color}_${Math.floor(now / 100) % PORTAL_FRAMES}`).setAlpha(fade);
      } else if (z.kind === "rewind") {
        floor.fillStyle(0x2a4aa0, 0.25 * fade).fillRect(0, 0, WORLD_W, WORLD_H);
      } else if (z.kind === "revive") {
        // REVIVE: a pillar of golden light where he got back up.
        sky.fillStyle(0xffe08a, 0.35 * fade).fillRect(z.x - 10, z.y - 120 * fade, 20, 120 * fade);
        sky.fillStyle(0xffffff, 0.5 * fade).fillRect(z.x - 3, z.y - 120 * fade, 6, 120 * fade);
        floor.lineStyle(2, 0xffd23f, fade).strokeCircle(z.x, z.y, z.radius * (1 - z.life / z.maxLife));
      } else if (z.kind === "truck") {
        // TRUCK SMASH: a shadow grows on the ground while the truck drops out of the sky.
        const left = z.life / z.maxLife;
        floor.fillStyle(0x000000, 0.35 * (1 - left)).fillEllipse(z.x, z.y, z.radius * 2 * (1.2 - left * 0.7), z.radius * (1.2 - left * 0.7));
        floor.lineStyle(1, 0xff4040, 0.6).strokeCircle(z.x, z.y, z.radius);
        let img = this.zoneImages.get(id);
        if (!img) {
          img = this.add.image(z.x, z.y, "truck").setOrigin(0.5, 0.9).setScale(3).setData("truck", true);
          this.zoneImages.set(id, img);
        }
        const drop = left * left * 420;
        img.setPosition(z.x, z.y - drop).setRotation(0.25 * left).setDepth(z.y + 50);
      } else if (z.kind === "frost") {
        // FROST SIGIL: a slowly turning circle of icy runes on the ground.
        const spin = now / 900;
        floor.fillStyle(0x9fe8ff, 0.14 * fade).fillCircle(z.x, z.y, z.radius);
        floor.lineStyle(2, 0xbff4ff, 0.85 * fade).strokeCircle(z.x, z.y, z.radius);
        floor.lineStyle(1, 0x6ad0ff, 0.8 * fade).strokeCircle(z.x, z.y, z.radius * 0.7);
        const star: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          const a = spin + (i * Math.PI * 2) / 6;
          star.push({ x: z.x + Math.cos(a) * z.radius * 0.7, y: z.y + Math.sin(a) * z.radius * 0.7 });
          floor.fillStyle(0xe8fbff, fade).fillRect(z.x + Math.cos(-a) * z.radius * 0.86 - 1, z.y + Math.sin(-a) * z.radius * 0.86 - 1, 3, 3);
        }
        floor.lineStyle(1, 0xbff4ff, 0.7 * fade);
        for (let i = 0; i < 6; i++) floor.lineBetween(star[i].x, star[i].y, star[(i + 2) % 6].x, star[(i + 2) % 6].y);
      } else if (z.kind === "ice") {
        // Frozen solid: a block of ice around the victim, cracking as it thaws.
        const r = z.radius + 6;
        const thaw = z.life / z.maxLife;
        sky.fillStyle(0x9fe8ff, 0.45 * Math.min(1, thaw * 3)).fillRect(z.x - r, z.y - r * 2.2, r * 2, r * 2.4);
        sky.lineStyle(1, 0xe8fbff, 0.9 * Math.min(1, thaw * 3)).strokeRect(z.x - r, z.y - r * 2.2, r * 2, r * 2.4);
        sky.lineStyle(1, 0xffffff, 0.8 * thaw).lineBetween(z.x - r + 3, z.y - r * 2.2 + 3, z.x - r + 3, z.y - r);
        if (thaw < 0.35) sky.lineStyle(1, 0x3a8ac8, 0.8).lineBetween(z.x - r * 0.4, z.y - r * 1.8, z.x + r * 0.3, z.y - r * 0.3);
      } else if (z.kind === "castle") {
        // MOVING CASTLE: a huge walking castle, glided smoothly between server updates, with a shadow and dust.
        let img = this.zoneImages.get(id);
        if (!img) {
          img = this.add.image(z.x, z.y, "castle").setOrigin(0.5, 0.85).setScale(3.4);
          this.zoneImages.set(id, img);
          this.cameras.main.shake(200, 0.006);
        }
        const nx = img.x + (z.x - img.x) * 0.35;
        if (Math.abs(nx - img.x) > 0.01) img.setFlipX(nx < img.x);
        const gy: number = img.getData("gy") ?? z.y;
        const ny = gy + (z.y - gy) * 0.35;
        const step = Math.abs(Math.sin(now / 140));
        img.setPosition(nx, ny).setDepth(ny + 1);
        img.y = ny - step * 3;
        img.setData("gy", ny);
        img.setAlpha(Math.min(1, age / 0.3));
        floor.fillStyle(0x000000, 0.3).fillEllipse(nx, ny + 2, z.radius * 2.4, z.radius * 0.9);
        if (Math.random() < 0.4) this.sparks.explode(1, nx + (Math.random() - 0.5) * z.radius * 2, ny);
        if (Math.random() < 0.05) this.cameras.main.shake(80, 0.003);
      } else if (z.kind === "trojan") {
        // TROJAN HORSE: the wooden horse with its countdown; it shakes harder as the end nears.
        let img = this.zoneImages.get(id);
        if (!img) {
          img = this.add.image(z.x, z.y, "trojan").setOrigin(0.5, 0.92).setScale(2.4);
          this.zoneImages.set(id, img);
          const label = this.add.text(z.x, z.y, "", { fontFamily: "monospace", fontSize: "32px", color: "#ffd23f", stroke: "#000000", strokeThickness: 6 });
          this.zoneTexts.set(id, label.setOrigin(0.5, 1).setScale(0.5).setResolution(2).setDepth(1001));
          this.sparks.explode(16, z.x, z.y);
        }
        const left = Math.ceil(z.life);
        const shake = z.life < 3 ? (3 - z.life) * 1.2 : 0;
        img.setPosition(z.x + (Math.random() - 0.5) * shake, z.y).setDepth(z.y);
        if (z.life < 3 && Math.floor(now / 120) % 2 === 0) img.setTintFill(0xff6040);
        else img.clearTint();
        const label = this.zoneTexts.get(id)!;
        label.setText(String(left)).setPosition(z.x, z.y - img.displayHeight - 2).setColor(z.life < 3 ? "#ff5040" : "#ffd23f");
        floor.lineStyle(1, 0xff4040, 0.25 + (z.life < 3 ? 0.4 : 0)).strokeCircle(z.x, z.y, z.radius);
      } else if (z.kind === "totem") {
        // HEAL TOTEM: a carved post with green rings pulsing out over the healing area.
        let img = this.zoneImages.get(id);
        if (!img) {
          img = this.add.image(z.x, z.y, "totem").setOrigin(0.5, 0.95).setScale(2);
          this.zoneImages.set(id, img);
        }
        img.setDepth(z.y).setAlpha(fade);
        const pulse = (now / 500) % 1;
        floor.fillStyle(0x5aff8a, 0.1 * fade).fillCircle(z.x, z.y, z.radius);
        floor.lineStyle(2, 0x5aff8a, 0.7 * fade).strokeCircle(z.x, z.y, z.radius);
        floor.lineStyle(2, 0xb8ffc8, (1 - pulse) * fade).strokeCircle(z.x, z.y, z.radius * pulse);
        if (Math.random() < 0.3) {
          // little green crosses float up
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * z.radius;
          const px = z.x + Math.cos(a) * r;
          const py = z.y + Math.sin(a) * r - ((now / 10) % 12);
          sky.fillStyle(0x5aff8a, 0.9 * fade).fillRect(px - 2, py, 5, 1).fillRect(px, py - 2, 1, 5);
        }
      } else if (z.kind === "palm") {
        // GIANT PALM: a shadow grows while the huge hand comes down out of the sky.
        const left = z.life / z.maxLife;
        floor.fillStyle(0x000000, 0.4 * (1 - left)).fillEllipse(z.x, z.y, z.radius * 2 * (1.1 - left * 0.6), z.radius * (1.1 - left * 0.6));
        floor.lineStyle(1, 0xffd23f, 0.7).strokeCircle(z.x, z.y, z.radius);
        let img = this.zoneImages.get(id);
        if (!img) {
          img = this.add.image(z.x, z.y, "palm").setOrigin(0.5, 0.9).setScale(3.4).setData("slam", z.radius);
          this.zoneImages.set(id, img);
        }
        img.setPosition(z.x, z.y - left * left * 380).setDepth(z.y + 50);
      } else if (z.kind === "sticky") {
        // STICKY BOMB: a little bomb with a blinking light, getting faster.
        const blink = Math.floor(now / (40 + 160 * (z.life / z.maxLife))) % 2 === 0;
        sky.fillStyle(0x2a2a30, 1).fillCircle(z.x, z.y - 8, 4);
        sky.fillStyle(blink ? 0xff3030 : 0x601010, 1).fillRect(z.x - 1, z.y - 13, 2, 2);
        if (blink) sky.lineStyle(1, 0xff3030, 0.6).strokeCircle(z.x, z.y - 8, 7);
      } else if (z.kind === "yoyo") {
        // YOYO: the string runs from the Volt Kid's hand to the yoyo.
        let best = Infinity;
        let hand: Phaser.GameObjects.Image | undefined;
        state.players.forEach((q: any, qid: string) => {
          const v = this.players.get(qid);
          if (!v || heroOf(q.hero).skill2?.kind !== "yoyo") return;
          const d = Math.hypot(v.body.x - z.x, v.body.y - z.y);
          if (d < best) [best, hand] = [d, v.body];
        });
        if (hand) sky.lineStyle(1, 0xffffff, 0.9).lineBetween(hand.x, hand.y - 8, z.x, z.y - 6);
        sky.fillStyle(0x3aa8ff, 1).fillCircle(z.x, z.y - 6, 4);
        sky.lineStyle(1, 0xffffff, 1).strokeCircle(z.x, z.y - 6, 4);
      } else if (z.kind === "sacrifice") {
        // SACRIFICE: a blade runs through, and blood sprays.
        const t = 1 - z.life / z.maxLife;
        sky.lineStyle(3, 0xd8dce8, 1 - t).lineBetween(z.x - 14, z.y - 22, z.x + 10, z.y + 2);
        sky.lineStyle(1, 0xffffff, 1 - t).lineBetween(z.x - 14, z.y - 23, z.x + 10, z.y + 1);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          sky.fillStyle(0xd0202a, 1 - t).fillRect(z.x + Math.cos(a) * 18 * t, z.y - 10 + Math.sin(a) * 12 * t + 10 * t * t, 2, 2);
        }
      } else if (z.kind === "slam") {
        // GRAB SLAM: dust and a shockwave where the target hits the ground.
        const t = 1 - z.life / z.maxLife;
        if (!this.zoneImages.has(id)) {
          this.zoneImages.set(id, this.add.image(z.x, z.y, "spark").setVisible(false));
          this.cameras.main.shake(300, 0.02);
          this.sparks.explode(24, z.x, z.y);
        }
        floor.lineStyle(3, 0xc8a878, 1 - t).strokeEllipse(z.x, z.y, z.radius * 2 * (0.4 + t), z.radius * (0.4 + t));
        floor.fillStyle(0x6a5a4a, 0.4 * (1 - t)).fillEllipse(z.x, z.y, z.radius * 1.4, z.radius * 0.6);
      } else if (z.kind === "anchor") {
        // ODM GEAR: the hook bitten into the wall.
        sky.fillStyle(0x8a8a92, 1).fillCircle(z.x, z.y - 6, 2.5);
        sky.lineStyle(1, 0xffffff, 0.8).strokeCircle(z.x, z.y - 6, 4 * fade);
      } else if (z.kind === "parry") {
        // A shot knocked away by a swing: a bright star burst and a ring.
        const t = 1 - z.life / z.maxLife;
        sky.lineStyle(2, 0xffffff, 1 - t).strokeCircle(z.x, z.y, 3 + 12 * t);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          const r0 = 2 + 8 * t;
          sky.lineStyle(2, i % 2 ? 0xffd400 : 0xffffff, 1 - t);
          sky.lineBetween(z.x + Math.cos(a) * r0, z.y + Math.sin(a) * r0, z.x + Math.cos(a) * (r0 + 6), z.y + Math.sin(a) * (r0 + 6));
        }
        if (!this.seenParry.has(id)) {
          this.seenParry.add(id);
          this.sparks.explode(6, z.x, z.y);
          if (this.seenParry.size > 200) this.seenParry.clear();
        }
      } else if (z.kind === "whip") {
        // SHADOW WHIP: a black whip lashes out from the Green Rookie, then coils around the target's legs.
        const age = z.maxLife - z.life;
        if (age < 0.35) {
          let from: any;
          let best = Infinity;
          state.players.forEach((q: any) => {
            if (q.dead || (heroOf(q.hero).formOf ?? q.hero) !== "deku") return;
            const d = Math.hypot(q.x - z.x, q.y - z.y);
            if (d < best && d > 4) [best, from] = [d, q];
          });
          if (from) {
            const reach = Math.min(1, age / 0.12);
            const ex = from.x + (z.x - from.x) * reach;
            const ey = from.y + (z.y - from.y) * reach;
            for (const [w, c] of [[4, 0x2a1240], [2, 0x0a0a0a]] as const) {
              sky.lineStyle(w, c, 1 - age / 0.35).beginPath();
              sky.moveTo(from.x, from.y - 6);
              for (let i = 1; i <= 8; i++) {
                const k = i / 8;
                const wave = Math.sin(k * Math.PI * 3 + now / 40) * 4 * (1 - k);
                const lx = from.x + (ex - from.x) * k;
                const ly = from.y - 6 + (ey - from.y) * k;
                const len = Math.hypot(ex - from.x, ey - from.y) || 1;
                sky.lineTo(lx - ((ey - from.y) / len) * wave, ly + ((ex - from.x) / len) * wave);
              }
              sky.strokePath();
            }
          }
        }
        // Coils round the legs, with a dark glow while they hold.
        const fade = Math.min(1, z.life / 0.3);
        floor.fillStyle(0x6a2aa0, 0.45 * fade).fillEllipse(z.x, z.y + 4, 34, 11);
        for (let i = 0; i < 3; i++) {
          const yy = z.y - 4 + i * 4;
          sky.lineStyle(3, 0x9a4aff, 0.5 * fade).strokeEllipse(z.x, yy, 24 + Math.sin(now / 90 + i) * 2, 7);
          sky.lineStyle(2, 0x0a0a0a, 0.95 * fade).strokeEllipse(z.x, yy, 22 + Math.sin(now / 90 + i) * 2, 6);
        }
      } else if (z.kind === "solve") {
        // SOLVE IT: a lock-on reticle snaps shut around the target.
        const t = 1 - z.life / z.maxLife;
        const r = z.radius * (1 + 2 * Math.max(0, 1 - t * 4));
        sky.lineStyle(2, 0xff2a3a, 1 - t * 0.6).strokeCircle(z.x, z.y - 8, r);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + t * 2;
          sky.lineBetween(z.x + Math.cos(a) * (r - 4), z.y - 8 + Math.sin(a) * (r - 4), z.x + Math.cos(a) * (r + 6), z.y - 8 + Math.sin(a) * (r + 6));
        }
        sky.fillStyle(0xff2a3a, 1 - t).fillCircle(z.x, z.y - 8, 2);
      } else if (z.kind === "bolt") {
        // SEVENTH FORM: the lane keeps crackling with golden lightning.
        const fade = Math.min(1, z.life / 0.4);
        floor.fillStyle(0xffd400, 0.06 * fade).fillCircle(z.x, z.y, z.radius);
        if (Math.random() < 0.18) this.drawBolt(sky, z.x + (Math.random() - 0.5) * z.radius, z.y + (Math.random() - 0.5) * z.radius, fade, 0xffc400);
        sky.lineStyle(1, 0xfff07a, 0.7 * fade).beginPath();
        let bx = z.x - z.radius * 0.6;
        let by = z.y + (Math.random() - 0.5) * z.radius;
        sky.moveTo(bx, by);
        for (let i = 0; i < 4; i++) {
          bx += z.radius * 0.3;
          by = z.y + (Math.random() - 0.5) * z.radius;
          sky.lineTo(bx, by);
        }
        sky.strokePath();
      } else if (z.kind === "dashkick") {
        // FLASH KICK: the kick lands with a starburst.
        const t = 1 - z.life / z.maxLife;
        sky.lineStyle(2, 0xffffff, 1 - t);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          sky.lineBetween(z.x + Math.cos(a) * 6, z.y - 6 + Math.sin(a) * 6, z.x + Math.cos(a) * (10 + 22 * t), z.y - 6 + Math.sin(a) * (10 + 22 * t));
        }
        sky.fillStyle(0xffd23f, 0.8 * (1 - t)).fillCircle(z.x, z.y - 6, 6 + 10 * t);
      } else if (z.kind === "boom") {
        // TNT: a fireball and a shockwave ring.
        const t = 1 - z.life / z.maxLife;
        if (!this.zoneImages.has(id)) {
          this.zoneImages.set(id, this.add.image(z.x, z.y, "spark").setVisible(false));
          this.cameras.main.shake(250, 0.015);
          this.sparks.explode(30, z.x, z.y);
        }
        sky.fillStyle(0xffd23f, 0.8 * (1 - t)).fillCircle(z.x, z.y - 4, z.radius * 0.5 * (0.5 + t));
        sky.fillStyle(0xff6a2a, 0.6 * (1 - t)).fillCircle(z.x, z.y - 4, z.radius * (0.4 + 0.6 * t));
        floor.lineStyle(3, 0xffffff, 1 - t).strokeCircle(z.x, z.y, z.radius * t);
      } else if (z.kind === "build") {
        const t = 1 - z.life / z.maxLife;
        floor.lineStyle(2, 0xc8ffc8, 1 - t).strokeRect(z.x - 10 - 8 * t, z.y - 10 - 8 * t, 20 + 16 * t, 20 + 16 * t);
      } else if (z.kind === "craftbuff") {
        // Crafted! Golden rings rise around him: damage x2 for good.
        const t = 1 - z.life / z.maxLife;
        for (let i = 0; i < 3; i++) sky.lineStyle(2, 0xffd23f, 1 - t).strokeEllipse(z.x, z.y - 40 * t - i * 10, 30, 10);
      } else if (z.kind === "asgard") {
        // Loki's illusion: golden Asgard rises out of the ground.
        floor.fillStyle(0xffd86a, 0.16 * fade).fillCircle(z.x, z.y, z.radius);
        floor.lineStyle(3, 0xe7b83a, 0.9 * fade).strokeCircle(z.x, z.y, z.radius);
        floor.lineStyle(1, 0xfff0b0, 0.6 * fade).strokeCircle(z.x, z.y, z.radius - 6 + Math.sin(now / 200) * 3);
        let img = this.zoneImages.get(id);
        if (!img) {
          img = this.add.image(z.x, z.y, "asgard").setOrigin(0.5, 0.8).setDepth(-2).setScale(2.6);
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
      if (img.getData("slam")) {
        // The giant palm hits the ground.
        this.effects.push({ kind: "blast", x: img.x, y: img.y, aim: 0, range: img.getData("slam"), arc: 1, age: 0, life: 0.45 });
        this.cameras.main.shake(300, 0.02);
        this.sparks.explode(30, img.x, img.y);
      }
      if (img.getData("truck")) {
        // The truck hits the ground.
        this.effects.push({ kind: "blast", x: img.x, y: img.y, aim: 0, range: 60, arc: 1, age: 0, life: 0.45 });
        this.cameras.main.shake(400, 0.025);
        this.sparks.explode(40, img.x, img.y);
      }
      img.destroy();
      this.zoneImages.delete(id);
    }
    for (const [id, label] of this.zoneTexts) {
      if (seen.has(id)) continue;
      label.destroy();
      this.zoneTexts.delete(id);
    }
  }

  private syncBullets(state: any, dt: number) {
    const seen = new Set<string>();
    state.bullets.forEach((b: any, id: string) => {
      seen.add(id);
      let sprite = this.bullets.get(id);
      if (!sprite) {
        const texture = b.kind.startsWith("card") ? b.kind : BULLET_TEXTURE[b.kind] ?? "snipe";
        sprite = this.add.image(b.x, b.y, texture).setDepth(900).setData("kind", b.kind);
        if (b.kind === "wave" || b.kind === "snipe" || b.kind === "bullet" || b.kind === "slash" || b.kind === "godslash" || b.kind === "laser" || b.kind === "knife") sprite.setRotation(Math.atan2(b.vy, b.vx));
        if (b.kind.startsWith("card")) sprite.setScale(1.3);
        if (b.kind === "wave") sprite.setScale(1.6);
        if (b.kind === "godslash") sprite.setScale(1.1); // his own slashes look like the heroes' sword waves, not the boss's red ones
        if (b.kind === "fireball") sprite.setScale(1.6);
        if (b.kind === "stone") sprite.setScale(1.2);
        if (b.kind === "sonic") sprite.setScale(1.3).setRotation(Math.atan2(b.vy, b.vx));
        if (b.kind === "boulder") sprite.setScale(1.6);
        this.bullets.set(id, sprite);
      }
      // Bullets fly in straight lines, so extrapolate locally and drift toward the server.
      if (!(state.timeStop > 0)) {
        sprite.x += b.vx * dt;
        sprite.y += b.vy * dt;
      }
      if (b.kind === "banana" || b.kind === "boulder") sprite.rotation += dt * 12; // spinning throws
      if (b.kind === "missile") {
        sprite.setRotation(Math.atan2(b.vy, b.vx)); // homing missiles turn as they chase
        if (Math.random() < 0.4) this.sparks.explode(1, sprite.x - b.vx * 0.03, sprite.y - b.vy * 0.03);
      }
      sprite.x += (b.x - sprite.x) * 0.2;
      sprite.y += (b.y - sprite.y) * 0.2;
    });
    for (const [id, sprite] of this.bullets) {
      if (seen.has(id)) continue;
      const kind = sprite.getData("kind");
      if (kind === "air" || kind === "dragonfire") {
        const radius = kind === "air" ? HEROES.doraemon.aoe : HEROES.flamedragon.aoe;
        this.effects.push({ kind: "blast", x: sprite.x, y: sprite.y, aim: 0, range: radius, arc: kind === "dragonfire" ? 1 : 0, age: 0, life: 0.3 });
      }
      if (kind === "missile") {
        this.effects.push({ kind: "blast", x: sprite.x, y: sprite.y, aim: 0, range: 14, arc: 1, age: 0, life: 0.25 });
        this.sparks.explode(6, sprite.x, sprite.y);
      }
      if (kind === "magic" || kind === "fireball") {
        const big = kind === "fireball";
        const radius = big ? HEROES.howl.skill.radius : HEROES.howl.aoe;
        this.effects.push({ kind: "blast", x: sprite.x, y: sprite.y, aim: 0, range: radius, arc: big ? 1 : 0, age: 0, life: big ? 0.45 : 0.3 });
        if (big) this.cameras.main.shake(180, 0.01);
      }
      // Enemy shots burst into sparks when they hit something or get cut down by a melee swing.
      if (kind === "enemy" || kind === "banana" || kind === "boulder" || kind === "slash") this.sparks.explode(5, sprite.x, sprite.y);
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
