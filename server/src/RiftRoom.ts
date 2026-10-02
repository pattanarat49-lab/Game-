import { Client, Room } from "colyseus";
import { MAX_PLAYERS, PlayerInput, stageOf } from "../../shared/game";
import { RiftSim, TICK_MS } from "../../shared/sim";
import { Bullet, Enemy, Player, RiftState } from "./schema";

export class RiftRoom extends Room<RiftState> {
  maxClients = MAX_PLAYERS;
  private sim!: RiftSim<Player, Enemy, Bullet>;

  onCreate(options: { stage?: string }) {
    this.setState(new RiftState());
    this.sim = new RiftSim(this.state, {
      player: () => new Player(),
      enemy: () => new Enemy(),
      bullet: () => new Bullet(),
    }, stageOf(String(options?.stage ?? "")));
    this.onMessage("input", (client, input: Partial<PlayerInput>) => this.sim.setInput(client.sessionId, input));
    this.setSimulationInterval((deltaMs) => this.sim.update(Math.min(deltaMs, 100) / 1000), TICK_MS);
  }

  onJoin(client: Client, options: { name?: string; hero?: string }) {
    const player = this.sim.addPlayer(client.sessionId, String(options?.name || "Riftborn"), String(options?.hero || ""));
    console.log(`${player.name} (${player.hero}) entered Emberfall (${this.state.players.size}/${MAX_PLAYERS})`);
  }

  onLeave(client: Client) {
    this.sim.removePlayer(client.sessionId);
  }
}
