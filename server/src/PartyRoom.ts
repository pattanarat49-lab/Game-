import { Client, Room } from "colyseus";

/**
 * A party (2026-10-08): friends who joined the same party code. When the leader starts a mode online,
 * everyone else is told which room to follow them into. No game state, only messages.
 */
export class PartyRoom extends Room {
  maxClients = 6;
  private names = new Map<string, string>();
  private order: string[] = [];

  onCreate() {
    // The leader went into a game room: the others follow (stage + the room's id to join).
    this.onMessage("go", (client, to: { stage?: string; roomId?: string }) => {
      if (client.sessionId !== this.order[0]) return;
      const stage = String(to?.stage ?? "");
      const roomId = String(to?.roomId ?? "");
      if (!stage || !roomId) return;
      this.broadcast("go", { stage, roomId }, { except: client });
    });
  }

  onJoin(client: Client, options: { name?: string }) {
    this.names.set(client.sessionId, String(options?.name ?? "Player").slice(0, 20));
    this.order.push(client.sessionId);
    this.sendMembers();
  }

  onLeave(client: Client) {
    this.names.delete(client.sessionId);
    this.order = this.order.filter((id) => id !== client.sessionId);
    this.sendMembers();
  }

  private sendMembers() {
    const members = this.order.map((id, i) => ({ id, name: this.names.get(id) ?? "", leader: i === 0 }));
    this.broadcast("members", members);
  }
}
