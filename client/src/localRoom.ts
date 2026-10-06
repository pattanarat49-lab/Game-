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
    botHero: "superman",
    botLevel: 2,
    map: 0,
    scoreA: 0,
    scoreB: 0,
  };
  private sim: RiftSim<SimPlayer, SimEnemy, SimBullet>;

  private handlers = new Map<string, (data: any) => void>();

  constructor(name: string, hero: string, stage: StageId, botHero = "superman", stats = "") {
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
        active2: 0,
        ready: false,
        stun: 0,
        big: 0,
        slow: 0,
        root: 0,
        slowPct: 0,
        silence: 0,
        taunt: 0,
        vanish: 0,
        domain: 0,
        link: "",
        disguise: "",
        team: 0,
        lives: 0,
        late: false,
        stats: "",
      }),
      enemy: () => ({ kind: "cinderling", x: 0, y: 0, hp: 0, maxHp: 0, hitFlash: 0, beamState: 0, beamAngle: 0, move: 0, stun: 0, big: 0, slow: 0, root: 0 }),
      bullet: () => ({ kind: "snipe", x: 0, y: 0, vx: 0, vy: 0, hostile: false }),
      zone: () => ({ kind: "", x: 0, y: 0, radius: 0, life: 0, maxLife: 0 }),
    }, stage);
    this.sim.addPlayer(this.sessionId, name, hero).stats = stats;
    if (stage === "duel") this.sim.addBot(botHero); // Bot Duel: the computer plays the hero you picked for it
  }

  /** Advance the world. Called from the game's render loop so every frame shows a fresh state. */
  step(dt: number) {
    this.sim.update(Math.min(dt, 0.1));
    // The portal or the dungeon's way out: off to another stage.
    for (const w of this.sim.warps.splice(0)) if (w.ids.includes(this.sessionId)) this.handlers.get("goto")?.({ stage: w.stage, code: w.code });
  }

  /** Messages the server would send (here only to ourselves): chat lines and room changes. */
  onMessage(type: string, cb: (data: any) => void) {
    this.handlers.set(type, cb);
  }

  send(type: string, data: any) {
    if (type === "input") this.sim.setInput(this.sessionId, data as PlayerInput);
    else if (type === "pick") this.sim.pickHero(this.sessionId, String(data));
    else if (type === "ready") this.sim.setReady(this.sessionId, !!data);
    else if (type === "bothero") this.sim.setBot(String(data));
    else if (type === "botlevel") this.sim.setBot(undefined, Number(data));
    else if (type === "team") this.sim.setTeam(this.sessionId, Number(data));
    else if (type === "map") this.sim.setMap(Number(data));
    else if (type === "chat") {
      const text = String(data ?? "").trim().slice(0, 120);
      if (text) this.handlers.get("chat")?.({ id: this.sessionId, name: this.state.players.get(this.sessionId)?.name ?? "", text });
    }
  }

  onLeave(_cb: () => void) {
    // A solo game never disconnects.
  }
}
