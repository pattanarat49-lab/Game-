import { PlayerInput, StageId } from "../../shared/game";
import { RiftSim, SimBullet, SimEnemy, SimPlayer, SimState, TICK_MS } from "../../shared/sim";

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
    phase: "intermission",
    wave: 0,
    phaseTimer: 0,
    lavaRadius: 0,
  };
  private sim: RiftSim<SimPlayer, SimEnemy, SimBullet>;
  private last = performance.now();

  constructor(name: string, hero: string, stage: StageId) {
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
        respawnIn: 0,
        score: 0,
        color: 0,
        attackSeq: 0,
        skillSeq: 0,
      }),
      enemy: () => ({ kind: "cinderling", x: 0, y: 0, hp: 0, maxHp: 0, hitFlash: 0, beamState: 0, beamAngle: 0 }),
      bullet: () => ({ kind: "snipe", x: 0, y: 0, vx: 0, vy: 0, hostile: false }),
    }, stage);
    this.sim.addPlayer(this.sessionId, name, hero);
    setInterval(() => {
      const now = performance.now();
      this.sim.update(Math.min(now - this.last, 100) / 1000);
      this.last = now;
    }, TICK_MS);
  }

  send(_type: "input", input: PlayerInput) {
    this.sim.setInput(this.sessionId, input);
  }

  onLeave(_cb: () => void) {
    // A solo game never disconnects.
  }
}
