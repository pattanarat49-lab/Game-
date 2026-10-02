import { Client, Room } from "colyseus";
import { MAX_PLAYERS, PlayerInput } from "../../shared/game";
import { RiftSim, TICK_MS } from "../../shared/sim";
import { Bullet, Enemy, Player, RiftState } from "./schema";

export class RiftRoom extends Room<RiftState> {
  maxClients = MAX_PLAYERS;
  private sim!: RiftSim<Player, Enemy, Bullet>;

  onCreate() {
    this.setState(new RiftState());
    this.sim = new RiftSim(this.state, {
      player: () => new Player(),
      enemy: () => new Enemy(),
      bullet: () => new Bullet(),
    });
    this.onMessage("input", (client, input: Partial<PlayerInput>) => this.sim.setInput(client.sessionId, input));
    this.setSimulationInterval((deltaMs) => this.sim.update(Math.min(deltaMs, 100) / 1000), TICK_MS);
  }

  onJoin(client: Client, options: { name?: string }) {
    const player = this.sim.addPlayer(client.sessionId, String(options?.name || "Riftborn"));
    console.log(`${player.name} entered Emberfall (${this.state.players.size}/${MAX_PLAYERS})`);
  }

  onLeave(client: Client) {
    this.sim.removePlayer(client.sessionId);
  }
}
