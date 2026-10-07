import { accountForToken, accountStats, ownedHeroes } from "./accounts";
import { Client, Room } from "colyseus";
import { CLASSIC_TEAM_SIZE, MAX_PLAYERS, PlayerInput, stageOf } from "../../shared/game";
import { RiftSim, TICK_MS, newRoomCode } from "../../shared/sim";
import { WORLD_MAX_PLAYERS } from "../../shared/world";
import { Bullet, Enemy, Player, RiftState, Zone } from "./schema";

export class RiftRoom extends Room<RiftState> {
  maxClients = MAX_PLAYERS;
  private sim!: RiftSim<Player, Enemy, Bullet, Zone>;
  /** Open World: when each player last chatted (a little flood control). */
  private lastChat = new Map<string, number>();
  /** Open World: open duel requests, asker -> asked. */
  private duels = new Map<string, string>();

  onCreate(options: { stage?: string }) {
    this.setState(new RiftState());
    this.sim = new RiftSim(this.state, {
      player: () => new Player(),
      enemy: () => new Enemy(),
      bullet: () => new Bullet(),
      zone: () => new Zone(),
    }, stageOf(String(options?.stage ?? "")));
    this.onMessage("ping", (client, sent: number) => client.send("pong", sent));
    this.onMessage("input", (client, input: Partial<PlayerInput>) => this.sim.setInput(client.sessionId, input));
    // PvP player select (and the Open World portal's READY).
    this.onMessage("pick", (client, hero: string) => {
      // Accounts play only the heroes they have unlocked.
      const owned = this.owned.get(client.sessionId);
      if (owned?.length && !owned.includes(String(hero))) return;
      this.sim.pickHero(client.sessionId, String(hero));
    });
    this.onMessage("ready", (client, ready: boolean) => this.sim.setReady(client.sessionId, !!ready));
    // PvE Squad player select: anyone picks the bot's hero and difficulty.
    this.onMessage("bothero", (_client, hero: string) => this.sim.setBot(String(hero)));
    this.onMessage("botlevel", (_client, level: number) => this.sim.setBot(undefined, Number(level)));
    // Classic 3v3: pick a side and the map.
    this.onMessage("team", (client, team: number) => this.sim.setTeam(client.sessionId, Number(team)));
    this.onMessage("map", (_client, map: number) => this.sim.setMap(Number(map)));
    // Open World: chat, and duel requests between two players.
    this.onMessage("chat", (client, text: string) => this.chat(client, String(text ?? "")));
    this.onMessage("duel", (client, to: string) => this.askDuel(client, String(to ?? "")));
    this.onMessage("duelans", (client, ans: { from?: string; ok?: boolean }) => this.answerDuel(client, String(ans?.from ?? ""), !!ans?.ok));
    if (this.state.stage === "pvp") this.maxClients = 2; // the PvP Arena is a 1v1
    if (this.state.stage === "classic") this.maxClients = CLASSIC_TEAM_SIZE * 2;
    if (this.state.stage === "world") this.maxClients = WORLD_MAX_PLAYERS;
    // ~30 updates a second so other players and enemies move smoothly.
    this.setPatchRate(TICK_MS);
    this.setSimulationInterval((deltaMs) => {
      try {
        this.sim.update(Math.min(deltaMs, 100) / 1000);
      } catch (err) {
        // One bad tick must not take the whole server (and every player on it) down.
        console.error(`sim error in ${this.state.stage}:`, err);
      }
      this.state.time = this.clock.elapsedTime;
      // The portal or the dungeon's way out: tell those players' devices where to go.
      for (const w of this.sim.warps.splice(0)) for (const id of w.ids) this.clientOf(id)?.send("goto", { stage: w.stage, code: w.code });
    }, TICK_MS);
  }

  private clientOf(id: string): Client | undefined {
    return this.clients.find((c) => c.sessionId === id);
  }

  private chat(client: Client, raw: string) {
    const text = raw.replace(/\s+/g, " ").trim().slice(0, 120);
    const now = Date.now();
    if (!text || now - (this.lastChat.get(client.sessionId) ?? 0) < 400) return;
    this.lastChat.set(client.sessionId, now);
    const name = this.state.players.get(client.sessionId)?.name ?? "?";
    this.broadcast("chat", { id: client.sessionId, name, text });
  }

  private askDuel(client: Client, to: string) {
    const target = this.clientOf(to);
    const me = this.state.players.get(client.sessionId);
    if (this.state.stage !== "world" || !target || to === client.sessionId || !me) return;
    this.duels.set(client.sessionId, to);
    target.send("duelreq", { from: client.sessionId, name: me.name, hero: me.hero });
  }

  private answerDuel(client: Client, from: string, ok: boolean) {
    if (this.duels.get(from) !== client.sessionId) return;
    this.duels.delete(from);
    const asker = this.clientOf(from);
    if (!asker) return;
    if (!ok) {
      asker.send("dueldeny", { name: this.state.players.get(client.sessionId)?.name ?? "" });
      return;
    }
    // Both go to a fresh PvP Arena room of their own.
    const code = newRoomCode();
    for (const c of [asker, client]) c.send("goto", { stage: "pvp", code });
  }

  async onJoin(client: Client, options: { name?: string; hero?: string; stats?: string; token?: string }) {
    // Signed in: play under the account's name with the record saved on the server.
    const account = await accountForToken(options?.token);
    const owned = account ? ownedHeroes(account) : [];
    if (owned.length) this.owned.set(client.sessionId, owned);
    let hero = String(options?.hero || "");
    if (owned.length && !owned.includes(hero)) hero = owned[0];
    const player = this.sim.addPlayer(client.sessionId, account?.username ?? String(options?.name || "Player"), hero);
    player.stats = account ? accountStats(account) : String(options?.stats ?? "").slice(0, 800);
    console.log(`${player.name} (${player.hero}) entered ${this.state.stage} (${this.sim.realPlayerCount()})`);
  }

  /** The heroes each signed-in player has unlocked. */
  private owned = new Map<string, string[]>();

  async onLeave(client: Client, consented: boolean) {
    if (!consented) {
      // The connection dropped (not the BACK button): keep the seat a little while so the device can come back.
      this.sim.setInput(client.sessionId, { aim: this.state.players.get(client.sessionId)?.aim ?? 0 });
      try {
        await this.allowReconnection(client, 20);
        return; // back in the same seat
      } catch {
        // gone for good
      }
    }
    this.owned.delete(client.sessionId);
    this.sim.removePlayer(client.sessionId);
    this.lastChat.delete(client.sessionId);
    this.duels.delete(client.sessionId);
  }
}
