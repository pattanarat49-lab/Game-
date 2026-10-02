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
  PLAYER_SPEED,
  PlayerInput,
  ROOM_NAME,
  SERVER_PORT,
  TILE,
  WORLD_H,
  WORLD_W,
  inLava,
  inputDirection,
  moveCircle,
} from "../../../shared/game";
import type { HudScene } from "./HudScene";

interface PlayerView {
  body: Phaser.GameObjects.Image;
  gun: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Graphics;
  lastHp: number;
  hurtFlash: number;
}

interface EnemyView {
  sprite: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
}

const ENEMY_SCALE: Record<EnemyKind, number> = { cinderling: 1, brute: 1.3, caster: 1, warden: 2.4 };

export function serverUrl(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  // In dev the client runs on Vite (5173) and the server on its own port.
  return location.port === "5173" ? `${proto}://${location.hostname}:${SERVER_PORT}` : `${proto}://${location.host}`;
}

export class GameScene extends Phaser.Scene {
  room?: Room<any>;
  private players = new Map<string, PlayerView>();
  private enemies = new Map<string, EnemyView>();
  private bullets = new Map<string, Phaser.GameObjects.Image>();
  private lavaLayer!: Phaser.Tilemaps.TilemapLayer;
  private lavaDrawnRadius = -1;
  private lavaFrame = 0;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private predicted = { x: CENTER_X, y: CENTER_Y };
  private sendTimer = 0;
  private lastSent = "";
  private cameraTarget!: Phaser.GameObjects.Zone;
  private aim = 0;

  constructor() {
    super("Game");
  }

  async create() {
    this.add.image(0, 0, "ground").setOrigin(0).setDepth(-10);

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

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,ONE") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.input.mouse?.disableContextMenu();

    this.cameraTarget = this.add.zone(CENTER_X, CENTER_Y, 1, 1);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setZoom(2);
    cam.startFollow(this.cameraTarget, true, 0.15, 0.15);
    cam.setRoundPixels(true);

    try {
      const client = new Client(serverUrl());
      this.room = await client.joinOrCreate(ROOM_NAME, { name: this.registry.get("playerName") });
    } catch (err) {
      console.error(err);
      this.game.events.emit("connection-error", err);
      return;
    }
    this.room.onLeave(() => this.game.events.emit("connection-error", new Error("Disconnected from server")));
    this.scene.launch("Hud");
  }

  update(_time: number, deltaMs: number) {
    const room = this.room;
    if (!room?.state?.players) return;
    const dt = deltaMs / 1000;
    const state = room.state;

    const input = this.readInput();
    this.predictLocal(input, dt);
    this.sendInput(input, dt);

    this.syncPlayers(state, dt);
    this.syncEnemies(state);
    this.syncBullets(state, dt);
    this.drawLava(state.lavaRadius);
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
        volley: alive && touch.volleying,
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
      volley: alive && (k.Q.isDown || k.ONE.isDown || pointer.rightButtonDown()),
    };
  }

  private sendInput(input: PlayerInput, dt: number) {
    this.sendTimer -= dt;
    const encoded = JSON.stringify(input);
    if (encoded !== this.lastSent || this.sendTimer <= 0) {
      this.room!.send("input", input);
      this.lastSent = encoded;
      this.sendTimer = 0.1;
    }
  }

  /** Move our own character immediately, then gently correct toward the server. */
  private predictLocal(input: PlayerInput, dt: number) {
    const me = this.room!.state.players.get(this.room!.sessionId);
    if (!me) return;
    const dir = inputDirection(input);
    const moving = dir.x !== 0 || dir.y !== 0;
    if (me.dead || me.dashing) {
      this.predicted.x += (me.x - this.predicted.x) * 0.5;
      this.predicted.y += (me.y - this.predicted.y) * 0.5;
    } else {
      const p = moveCircle(this.predicted.x, this.predicted.y, dir.x * PLAYER_SPEED * dt, dir.y * PLAYER_SPEED * dt, PLAYER_RADIUS);
      const err = Math.hypot(me.x - p.x, me.y - p.y);
      const k = err > 40 ? 1 : moving ? 0.03 : 0.2;
      this.predicted.x = p.x + (me.x - p.x) * k;
      this.predicted.y = p.y + (me.y - p.y) * k;
    }
    this.cameraTarget.setPosition(this.predicted.x, this.predicted.y);
  }

  // ------------------------------------------------------------- players

  private syncPlayers(state: any, dt: number) {
    const seen = new Set<string>();
    state.players.forEach((p: any, id: string) => {
      seen.add(id);
      let view = this.players.get(id);
      if (!view) {
        view = {
          body: this.add.image(p.x, p.y, `player${p.color}`).setOrigin(0.5, 0.8),
          gun: this.add.image(p.x, p.y, "gun").setOrigin(0.1, 0.5),
          label: this.add
            .text(p.x, p.y, p.name, { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" })
            .setScale(0.4)
            .setOrigin(0.5, 1)
            .setResolution(2),
          bar: this.add.graphics(),
          lastHp: p.hp,
          hurtFlash: 0,
        };
        if (id === this.room!.sessionId) {
          this.predicted = { x: p.x, y: p.y };
          view.label.setColor("#ffd23f");
        }
        this.players.set(id, view);
      }

      const isMe = id === this.room!.sessionId;
      const tx = isMe ? this.predicted.x : p.x;
      const ty = isMe ? this.predicted.y : p.y;
      const body = view.body;
      if (isMe) body.setPosition(tx, ty);
      else body.setPosition(body.x + (tx - body.x) * 0.3, body.y + (ty - body.y) * 0.3);

      // Walk bob and facing
      const aim = isMe ? this.aim : p.aim;
      body.setFlipX(Math.cos(aim) < 0);
      const bob = Math.sin(this.time.now / 90) * 0.6;
      body.setDepth(body.y);
      body.setAlpha(p.dead ? 0.25 : p.dashing ? 0.6 : 1);

      view.gun.setPosition(body.x, body.y - 4 + bob);
      view.gun.setRotation(aim);
      view.gun.setFlipY(Math.cos(aim) < 0);
      view.gun.setDepth(body.y + 0.5);
      view.gun.setVisible(!p.dead);

      view.label.setPosition(body.x, body.y - 16);
      view.label.setDepth(1000);

      if (p.hp < view.lastHp - 0.5) view.hurtFlash = 0.15;
      view.lastHp = p.hp;
      view.hurtFlash = Math.max(0, view.hurtFlash - dt);
      if (view.hurtFlash > 0) body.setTintFill(0xff4040);
      else body.clearTint();

      view.bar.clear();
      if (!p.dead) {
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
      view.gun.destroy();
      view.label.destroy();
      view.bar.destroy();
      this.players.delete(id);
    }
  }

  // ------------------------------------------------------------- enemies

  private syncEnemies(state: any) {
    const seen = new Set<string>();
    state.enemies.forEach((e: any, id: string) => {
      seen.add(id);
      let view = this.enemies.get(id);
      if (!view) {
        const sprite = this.add.image(e.x, e.y, e.kind).setOrigin(0.5, 0.75).setScale(ENEMY_SCALE[e.kind as EnemyKind]);
        sprite.setAlpha(0);
        this.tweens.add({ targets: sprite, alpha: 1, duration: 300 });
        view = { sprite, bar: this.add.graphics(), x: e.x, y: e.y };
        this.enemies.set(id, view);
      }
      const s = view.sprite;
      const nx = s.x + (e.x - s.x) * 0.3;
      if (Math.abs(nx - s.x) > 0.05) s.setFlipX(nx < s.x);
      s.setPosition(nx, s.y + (e.y - s.y) * 0.3);
      s.setDepth(s.y);
      if (e.hitFlash > 0) s.setTintFill(0xffffff);
      else s.clearTint();
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
      view.bar.destroy();
      this.enemies.delete(id);
    }
  }

  // ------------------------------------------------------------- bullets

  private syncBullets(state: any, dt: number) {
    const seen = new Set<string>();
    state.bullets.forEach((b: any, id: string) => {
      seen.add(id);
      let sprite = this.bullets.get(id);
      if (!sprite) {
        sprite = this.add.image(b.x, b.y, b.hostile ? "eshot" : "shot").setDepth(900);
        this.bullets.set(id, sprite);
      }
      // Bullets fly in straight lines, so extrapolate locally and drift toward the server.
      sprite.x += b.vx * dt;
      sprite.y += b.vy * dt;
      sprite.x += (b.x - sprite.x) * 0.2;
      sprite.y += (b.y - sprite.y) * 0.2;
    });
    for (const [id, sprite] of this.bullets) {
      if (seen.has(id)) continue;
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
