import { PlayerInput, StageId } from "../../shared/game";
import { RiftSim, SimBullet, SimEnemy, SimPlayer, SimState } from "../../shared/sim";

/**
 * Solo play: runs the same simulation as the server, inside the browser.
 * It looks like a Colyseus room to the game scenes (state, sessionId, send, onLeave).
 */
export class LocalRoom {
  readonly sessionId = "solo";
  readonly state: SimState<SimPlayer, SimEnemy, SimBullet> = {
    stage: "lava",
    players: new Map(),
    enemies: new Map(),
    bullets: new Map(),
    zones: new Map(),
    timeStop: 0,
    timeStopBy: "",
    reality: 0,
    realityBy: "",
    phase: "intermission",
    wave: 0,
    phaseTimer: 0,
    lavaRadius: 0,
    winner: "",
    notice: "",
  };
  private sim: RiftSim<SimPlayer, SimEnemy, SimBullet>;

  constructor(name: string, hero: string, stage: StageId, botHero = "superman") {
    this.sim = new RiftSim(this.state, {
      player: () => ({
        name: "",
        hero: "superman",
        x: 0,
        y: 0,
        aim: 0,
        hp: 0,
        maxHp: 0,
        dead: false,
        dashing: false,
        dashCooldown: 0,
        skillCooldown: 0,
        skill2Cooldown: 0,
        respawnIn: 0,
        score: 0,
        color: 0,
        attackSeq: 0,
        skillSeq: 0,
        skill2Seq: 0,
        owner: "",
        titan: 0,
        warp: 0,
        mt: 0,
        kbx: 0,
        kby: 0,
        kbSeq: 0,
        mode: 0,
        revive: 0,
        barrier: 0,
        latch: 0,
        beam: 0,
        buff: 0,
        power: 1,
        ready: false,
        stun: 0,
        big: 0,
      }),
      enemy: () => ({ kind: "cinderling", x: 0, y: 0, hp: 0, maxHp: 0, hitFlash: 0, beamState: 0, beamAngle: 0, move: 0, stun: 0, big: 0 }),
      bullet: () => ({ kind: "snipe", x: 0, y: 0, vx: 0, vy: 0, hostile: false }),
      zone: () => ({ kind: "", x: 0, y: 0, radius: 0, life: 0, maxLife: 0 }),
    }, stage);
    this.sim.addPlayer(this.sessionId, name, hero);
    if (stage === "duel") this.sim.addBot(botHero); // Bot Duel: the computer plays the hero you picked for it
  }

  /** Advance the world. Called from the game's render loop so every frame shows a fresh state. */
  step(dt: number) {
    this.sim.update(Math.min(dt, 0.1));
  }

  send(_type: "input", input: PlayerInput) {
    this.sim.setInput(this.sessionId, input);
  }

  onLeave(_cb: () => void) {
    // A solo game never disconnects.
  }
}
