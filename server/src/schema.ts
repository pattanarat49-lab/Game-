import { MapSchema, Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name = "";
  @type("string") hero = "superman";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") aim = 0;
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("boolean") dead = false;
  @type("boolean") dashing = false;
  @type("number") dashCooldown = 0;
  @type("number") skillCooldown = 0;
  @type("number") respawnIn = 0;
  @type("number") score = 0;
  @type("uint8") color = 0;
  @type("number") attackSeq = 0;
  @type("number") skillSeq = 0;
}

export class Enemy extends Schema {
  @type("string") kind = "cinderling";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("number") hitFlash = 0;
}

export class Bullet extends Schema {
  @type("string") kind = "snipe";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") vx = 0;
  @type("number") vy = 0;
  @type("boolean") hostile = false;
}

export type Phase = "intermission" | "fight" | "victory";

export class RiftState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
  @type("string") phase: Phase = "intermission";
  @type("uint8") wave = 0;
  @type("number") phaseTimer = 0;
  @type("number") lavaRadius = 0;
}
