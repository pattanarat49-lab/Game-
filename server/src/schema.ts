import { MapSchema, Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name = "";
  @type("string") hero = "superman";
  @type("float32") x = 0;
  @type("float32") y = 0;
  @type("float32") aim = 0;
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("boolean") dead = false;
  @type("boolean") dashing = false;
  @type("float32") dashCooldown = 0;
  @type("float32") skillCooldown = 0;
  @type("float32") skill2Cooldown = 0;
  @type("float32") respawnIn = 0;
  @type("number") score = 0;
  @type("uint8") color = 0;
  @type("number") attackSeq = 0;
  @type("number") skillSeq = 0;
  @type("number") skill2Seq = 0;
  @type("string") owner = "";
  @type("float32") titan = 0;
  @type("uint8") warp = 0;
  @type("float64") mt = 0;
  @type("float32") kbx = 0;
  @type("float32") kby = 0;
  @type("uint8") kbSeq = 0;
  @type("uint8") mode = 0;
  @type("float32") revive = 0;
  @type("float32") barrier = 0;
  @type("float32") latch = 0;
  @type("boolean") ready = false;
  @type("float32") beam = 0;
  @type("float32") buff = 0;
  @type("float32") power = 1;
  @type("float32") stun = 0;
}

export class Enemy extends Schema {
  @type("string") kind = "cinderling";
  @type("float32") x = 0;
  @type("float32") y = 0;
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("float32") hitFlash = 0;
  @type("uint8") beamState = 0;
  @type("float32") beamAngle = 0;
  @type("uint8") move = 0;
  @type("float32") stun = 0;
}

export class Bullet extends Schema {
  @type("string") kind = "snipe";
  @type("float32") x = 0;
  @type("float32") y = 0;
  @type("float32") vx = 0;
  @type("float32") vy = 0;
  @type("boolean") hostile = false;
}

export class Zone extends Schema {
  @type("string") kind = "";
  @type("float32") x = 0;
  @type("float32") y = 0;
  @type("float32") radius = 0;
  @type("float32") life = 0;
  @type("float32") maxLife = 0;
}

export type Phase = "select" | "intermission" | "fight" | "victory";

export class RiftState extends Schema {
  @type("string") stage = "lava";
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
  @type({ map: Zone }) zones = new MapSchema<Zone>();
  @type("float32") timeStop = 0;
  @type("string") timeStopBy = "";
  @type("float32") reality = 0;
  @type("string") realityBy = "";
  @type("string") phase: Phase = "intermission";
  @type("string") notice = "";
  @type("uint8") wave = 0;
  @type("float32") phaseTimer = 0;
  @type("float32") lavaRadius = 0;
  @type("string") winner = "";
  /** Server clock (ms) at this update, so clients can space updates evenly however they arrive. */
  @type("float64") time = 0;
}
