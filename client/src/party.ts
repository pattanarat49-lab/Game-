import { Client, Room } from "colyseus.js";
import { serverUrl } from "./scenes/GameScene";

/**
 * Parties (2026-10-08): friends join one party code; when the leader starts 3v3 (ranked or not), Training,
 * Battle Royale or a dungeon online, everyone else in the party warps into the same room with them.
 */

/** The modes a party follows its leader into. */
const FOLLOW = new Set(["classic", "pve", "royale", "dungeon", "abyss", "heaven", "glitch"]);

interface Member {
  id: string;
  name: string;
  leader: boolean;
}

let room: Room | undefined;
let code = "";
let members: Member[] = [];
let follow: (stage: string, roomId: string) => void = () => undefined;
const listeners = new Set<() => void>();

const changed = () => listeners.forEach((f) => f());

/** Called when the leader goes somewhere this player should follow. */
export function onPartyGo(f: (stage: string, roomId: string) => void) {
  follow = f;
}

/** Party size for the home button (0 = no party). */
export function partySize(): number {
  return room ? members.length : 0;
}

function amLeader(): boolean {
  return !!room && members[0]?.id === room.sessionId;
}

/** The leader went into a game room: tell the party where. */
export function partyEntered(stage: string, roomId: string) {
  if (!room || !amLeader() || !FOLLOW.has(stage) || !roomId) return;
  room.send("go", { stage, roomId });
}

async function connect(join: string | undefined, name: string) {
  await leaveParty();
  const client = new Client(serverUrl());
  const c = join ?? String(Math.floor(10000 + Math.random() * 90000));
  const r = join ? await client.join("party", { code: c, name }) : await client.create("party", { code: c, name });
  room = r;
  code = c;
  members = [];
  r.onMessage("members", (list: Member[]) => {
    members = list;
    changed();
  });
  r.onMessage("go", (to: { stage: string; roomId: string }) => follow(to.stage, to.roomId));
  r.onLeave(() => {
    if (room !== r) return;
    room = undefined;
    members = [];
    changed();
  });
  changed();
}

export async function leaveParty() {
  const r = room;
  room = undefined;
  members = [];
  code = "";
  if (r) await r.leave().catch(() => undefined);
  changed();
}

const CSS = `
#party-panel { position: fixed; inset: 0; z-index: 9000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, .6);
  font-family: "Press Start 2P", monospace; }
#party-panel .box { width: min(92vw, 520px); padding: 22px; background: linear-gradient(#2a1a22f4, #120a10f8); border: 4px solid #c9932e; border-radius: 8px;
  color: #fff; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 0 40px rgba(0, 0, 0, .7); }
#party-panel h3 { margin: 0; font-size: 18px; color: #ffd23f; text-align: center; font-weight: normal; }
#party-panel .code { text-align: center; font-size: 30px; letter-spacing: 6px; color: #9ae8ff; }
#party-panel .hint { font-size: 10px; line-height: 1.8; color: #c8c2dc; text-align: center; }
#party-panel ul { list-style: none; margin: 0; padding: 10px; background: rgba(0, 0, 0, .35); border-radius: 6px; font-size: 12px; line-height: 2; min-height: 30px; }
#party-panel .row { display: flex; gap: 8px; }
#party-panel input { flex: 1; min-width: 0; font: inherit; font-size: 14px; padding: 10px; color: #fff; background: #0a0816; border: 2px solid #b8862c; border-radius: 6px; }
#party-panel button { font: inherit; font-size: 12px; padding: 10px 14px; color: #fff; background: #3a2a5a; border: 3px solid #8a7ac0; border-radius: 6px; cursor: pointer; }
#party-panel button.gold { background: #6a4a12; border-color: #ffd23f; }
#party-panel .err { color: #ff7a6a; font-size: 10px; min-height: 12px; text-align: center; }
`;

/** The PARTY window: your party code and who is in it, a box for a friend's code, and LEAVE. */
export function showParty(name: string, refreshHome: () => void) {
  if (!document.getElementById("party-css")) {
    const style = document.createElement("style");
    style.id = "party-css";
    style.textContent = CSS;
    document.head.append(style);
  }
  document.getElementById("party-panel")?.remove();
  const panel = document.createElement("div");
  panel.id = "party-panel";
  panel.innerHTML = `<div class="box">
    <h3>PARTY</h3>
    <div class="hint">Give friends your party code. When the leader starts 3v3, 3v3 Ranked, Training, Battle Royale or a dungeon (online), everyone warps in together.</div>
    <div class="code"></div>
    <ul></ul>
    <div class="row"><input inputmode="numeric" maxlength="5" placeholder="Friend's code" /><button type="button" class="gold join">JOIN</button></div>
    <div class="err"></div>
    <div class="row"><button type="button" class="leave">LEAVE PARTY</button><button type="button" class="close" style="margin-left:auto">CLOSE</button></div>
  </div>`;
  document.body.append(panel);
  const err = panel.querySelector<HTMLElement>(".err")!;
  const input = panel.querySelector<HTMLInputElement>("input")!;
  const draw = () => {
    panel.querySelector(".code")!.textContent = room ? code : "...";
    panel.querySelector("ul")!.innerHTML = members
      .map((m) => `<li>${m.leader ? "★ " : "• "}${m.name.replace(/[<>&]/g, "")}${m.id === room?.sessionId ? " (you)" : ""}${m.leader ? " - leader" : ""}</li>`)
      .join("");
    refreshHome();
  };
  listeners.add(draw);
  const close = () => {
    listeners.delete(draw);
    panel.remove();
  };
  panel.addEventListener("click", (e) => {
    if (e.target === panel) close();
  });
  panel.querySelector(".close")!.addEventListener("click", close);
  panel.querySelector(".leave")!.addEventListener("click", async () => {
    await leaveParty();
    close();
  });
  panel.querySelector(".join")!.addEventListener("click", async () => {
    const want = input.value.trim();
    if (!/^\d{5}$/.test(want)) {
      err.textContent = "Type your friend's 5-digit party code";
      return;
    }
    if (want === code) return;
    err.textContent = "Joining...";
    try {
      await connect(want, name);
      err.textContent = "";
    } catch {
      err.textContent = "No party with that code";
      if (!room) void connect(undefined, name).catch(() => undefined);
    }
  });
  draw();
  // Opening the window starts your own party (if you are not in one yet).
  if (!room)
    connect(undefined, name).catch(() => {
      err.textContent = "Can't reach the server";
    });
}
