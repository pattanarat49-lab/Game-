// The Open World and the dungeon on screen (2026-10-06): ground, trees and houses, the portals,
// torches, chat bubbles, and the chat / portal / profile / duel screens (worldUi.ts).

import Phaser from "phaser";
import { BLOCK } from "../../shared/maps";
import { ABYSS, ABYSS_ART, D_POOL, DUNGEON, GLITCH, HEAVEN, L_DEEP, L_WATER, OPEN_WORLD, PORTAL_RADIUS } from "../../shared/world";
import { CHUNK, dungeonChunk, propCanvas, worldChunk } from "./worldArt";
import { WorldUi } from "./worldUi";
import { playSanctuaryIntro } from "./cutscene";

interface Bubble {
  text: Phaser.GameObjects.Text;
  until: number;
}

export class WorldView {
  private fx: Phaser.GameObjects.Graphics;
  private floorFx: Phaser.GameObjects.Graphics;
  private bubbles = new Map<string, Bubble>();
  ui?: WorldUi;
  /** True while the chat box has the keyboard. */
  typing = false;

  constructor(
    private scene: Phaser.Scene,
    private stage: "world" | "dungeon" | "abyss" | "heaven" | "glitch",
    private room: any,
    private bodyOf: (id: string) => { x: number; y: number } | undefined,
    switchRoom: (stage: string, code: string) => void,
    online: boolean,
  ) {
    const map = stage === "world" ? OPEN_WORLD : stage === "abyss" ? ABYSS : stage === "heaven" ? HEAVEN : stage === "glitch" ? GLITCH : DUNGEON;
    const picture = stage === "abyss" || stage === "heaven" || stage === "glitch"; // boss rooms drawn as one picture by the user
    if (stage === "dungeon") playSanctuaryIntro();
    const w = map.cols * BLOCK;
    const h = map.rows * BLOCK;
    if (picture) {
      // Cthulhu's and the God Knight's halls are the user's own pictures of them (loaded on first visit).
      const key = `${stage}_room`;
      const show = () => scene.add.image(0, 0, key).setOrigin(0).setScale(ABYSS_ART.scale).setDepth(-10);
      if (scene.textures.exists(key)) show();
      else {
        scene.load.image(key, `${stage}-room.jpg`);
        scene.load.once(Phaser.Loader.Events.COMPLETE, show);
        scene.load.start();
      }
    }
    // The ground, in squares.
    for (let cy = 0; !picture && cy * CHUNK < h; cy++)
      for (let cx = 0; cx * CHUNK < w; cx++) {
        const key = `${stage}_chunk_${cx}_${cy}`;
        if (!scene.textures.exists(key)) scene.textures.addCanvas(key, stage === "world" ? worldChunk(cx, cy) : dungeonChunk(cx, cy, DUNGEON));
        scene.add.image(cx * CHUNK, cy * CHUNK, key).setOrigin(0).setDepth(-10);
      }
    if (stage === "world") {
      // Trees, houses and the rest stand in front of or behind heroes by how far down the map they are.
      for (const p of OPEN_WORLD.props) {
        const key = `prop_${p.kind}_${p.v}`;
        if (!scene.textures.exists(key)) scene.textures.addCanvas(key, propCanvas(p.kind, p.v));
        const flat = p.kind === "crop" || p.kind === "boat";
        scene.add.image(p.x, p.y, key).setOrigin(0.5, 1).setDepth(flat ? -4 : p.y);
      }
    }
    this.floorFx = scene.add.graphics().setDepth(-3);
    this.fx = scene.add.graphics().setDepth(stage === "world" ? OPEN_WORLD.portal.y + 1 : 900);

    // Messages from the room.
    room.onMessage("chat", (m: { id: string; name: string; text: string }) => {
      this.ui?.addChat(m.name, m.text, m.id === room.sessionId);
      this.say(m.id, m.text);
    });
    room.onMessage("goto", (m: { stage: string; code: string }) => switchRoom(m.stage, m.code));
    room.onMessage("duelreq", (m: { from: string; name: string; hero: string }) => this.ui?.duelRequest(m.from, m.name, m.hero));
    room.onMessage("dueldeny", (m: { name: string }) => this.ui?.toast(`${m.name} said no thanks`));

    this.ui = new WorldUi(
      {
        chat: (text) => room.send("chat", text),
        ready: (on) => room.send("ready", on),
        duel: (id) => room.send("duel", id),
        answer: (from, ok) => room.send("duelans", { from, ok }),
      },
      (on) => {
        this.typing = on;
        const kb = scene.input?.keyboard;
        // Gone already when the game is being torn down (switching rooms).
        if (!kb || !(kb as any).manager?.captures || !scene.sys.isActive()) return;
        try {
          if (on) kb.disableGlobalCapture();
          else kb.enableGlobalCapture();
          kb.resetKeys();
        } catch {
          // the keyboard is shutting down
        }
      },
      online || stage === "world",
    );
    if (stage === "world") {
      scene.time.delayedCall(800, () => this.ui?.toast("Tap a hero to see their record"));
      // Tap or click a hero to see who they are (and ask for a duel).
      scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.updateWorldPoint(scene.cameras.main);
        let best: string | undefined;
        let bestD = 24;
        room.state.players.forEach((p: any, id: string) => {
          if (p.owner) return;
          const b = this.bodyOf(id) ?? p;
          const d = Math.hypot(pointer.worldX - b.x, pointer.worldY - (b.y - 14));
          if (d < bestD) [best, bestD] = [id, d];
        });
        if (!best) return;
        const p = room.state.players.get(best);
        this.ui?.showProfile(best, p.name, p.hero, p.stats ?? "", best === room.sessionId);
      });
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroy());
  }

  /** A speech bubble over a hero's head for a few seconds. */
  private say(id: string, text: string) {
    const old = this.bubbles.get(id);
    old?.text.destroy();
    const t = this.scene.add
      .text(0, 0, text.length > 40 ? `${text.slice(0, 38)}...` : text, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "6px",
        color: "#1a1220",
        backgroundColor: "#ffffff",
        padding: { x: 3, y: 2 },
        wordWrap: { width: 110 },
        align: "center",
      })
      .setOrigin(0.5, 1)
      .setDepth(5000)
      .setResolution(3);
    this.bubbles.set(id, { text: t, until: this.scene.time.now + 5000 });
  }

  update(state: any) {
    const now = this.scene.time.now;
    const g = this.fx;
    const floor = this.floorFx;
    g.clear();
    floor.clear();
    const myId = this.room.sessionId;
    const me = state.players.get(myId);

    for (const [id, b] of this.bubbles) {
      const at = this.bodyOf(id);
      if (!at || now > b.until) {
        b.text.destroy();
        this.bubbles.delete(id);
        continue;
      }
      b.text.setPosition(Math.round(at.x), Math.round(at.y - 42));
    }

    if (this.stage === "world") {
      // The dungeon portal: a stone ring with a blue swirl.
      const { x, y } = OPEN_WORLD.portal;
      floor.fillStyle(0x6a6a72, 1).fillEllipse(x, y + 4, PORTAL_RADIUS * 2 + 8, PORTAL_RADIUS + 6);
      floor.fillStyle(0x8a8a94, 1).fillEllipse(x, y + 2, PORTAL_RADIUS * 2, PORTAL_RADIUS);
      floor.fillStyle(0x1a2a6a, 1).fillEllipse(x, y + 2, PORTAL_RADIUS * 1.6, PORTAL_RADIUS * 0.8);
      for (let i = 0; i < 5; i++) {
        const a = now / 400 + (i * Math.PI * 2) / 5;
        const r = PORTAL_RADIUS * (0.25 + 0.12 * i);
        floor.lineStyle(2, i % 2 ? 0x5a9aff : 0x9ad8ff, 0.8).strokeEllipse(x + Math.cos(a) * 3, y + 2 + Math.sin(a) * 1.5, r * 1.6, r * 0.8);
      }
      // Its light, rising.
      for (let i = 0; i < 8; i++) {
        const t = ((now / 1200 + i / 8) % 1);
        const a = i * 2.4;
        g.fillStyle(0x9ad8ff, 1 - t).fillRect(x + Math.cos(a) * PORTAL_RADIUS * 0.6, y - t * 50, 2, 2);
      }
      // Heroes who pressed READY at the portal get a green tick.
      state.players.forEach((p: any, id: string) => {
        if (!p.ready || p.owner) return;
        const b = this.bodyOf(id) ?? p;
        g.lineStyle(2, 0x7dff8a, 1).lineBetween(b.x - 4, b.y - 50, b.x - 1, b.y - 47).lineBetween(b.x - 1, b.y - 47, b.x + 5, b.y - 54);
      });
      // Glints on the water near us.
      const view = this.scene.cameras.main.worldView;
      const c0 = Math.max(0, Math.floor(view.x / BLOCK));
      const c1 = Math.min(OPEN_WORLD.cols - 1, Math.ceil(view.right / BLOCK));
      const r0 = Math.max(0, Math.floor(view.y / BLOCK));
      const r1 = Math.min(OPEN_WORLD.rows - 1, Math.ceil(view.bottom / BLOCK));
      const tick = Math.floor(now / 350);
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++) {
          const l = OPEN_WORLD.look[r * OPEN_WORLD.cols + c];
          if (l !== L_WATER && l !== L_DEEP) continue;
          const h = ((c * 73856093) ^ (r * 19349663) ^ (tick * 83492791)) >>> 0;
          if (h % 7 !== 0) continue;
          floor.fillStyle(0xd8f0ff, 0.8).fillRect(c * BLOCK + (h % 15) + 2, r * BLOCK + ((h >> 4) % 15) + 2, 4, 1);
        }
      // The portal panel, while we stand at the portal.
      if (me && this.ui) {
        let here = 0;
        let ready = 0;
        state.players.forEach((p: any) => {
          if (p.owner || p.dead || Math.hypot(p.x - x, p.y - y) > PORTAL_RADIUS + 12) return;
          here++;
          if (p.ready) ready++;
        });
        const near = Math.hypot(me.x - x, me.y - y) <= PORTAL_RADIUS + 12;
        this.ui.setPortal(near, here, ready, !!me.ready, state.notice ?? "");
      }
    } else {
      // Torches on the room corners, flickering.
      // (The Sunken Temple's braziers burn a ghostly green.)
      const abyss = this.stage === "abyss" || this.stage === "heaven" || this.stage === "glitch";
      const heaven = this.stage === "heaven";
      const rift = this.stage === "glitch";
      for (const t of (rift ? GLITCH : heaven ? HEAVEN : abyss ? ABYSS : DUNGEON).torches) {
        const f = 0.7 + 0.3 * Math.sin(now / 90 + t.x * 0.13 + t.y * 0.07);
        floor.fillStyle(rift ? 0xff2a3a : heaven ? 0xffe070 : abyss ? 0x40d8ff : 0xffa040, (abyss ? 0.14 : 0.08) * f).fillCircle(t.x, t.y, 46);
        floor.fillStyle(rift ? 0xff8a8a : heaven ? 0xfff0b0 : abyss ? 0x90f0ff : 0xffc060, (abyss ? 0.1 : 0.12) * f).fillCircle(t.x, t.y, 24);
        if (abyss) continue; // the picture has its own lanterns: just their glow
        g.fillStyle(0x5a3a1a, 1).fillRect(t.x - 2, t.y - 4, 4, 8);
        g.fillStyle(0xff8a2a, 1).fillRect(t.x - 2, t.y - 9 - f * 2, 4, 5);
        g.fillStyle(0xffe08a, 1).fillRect(t.x - 1, t.y - 8 - f * 2, 2, 3);
      }
      if (abyss) {
        // Ripples on the flooded pits.
        const tick = Math.floor(now / 350);
        for (let r = 0; r < ABYSS.rows; r++)
          for (let c = 0; c < ABYSS.cols; c++) {
            if (ABYSS.look[r * ABYSS.cols + c] !== D_POOL) continue;
            const h = ((c * 73856093) ^ (r * 19349663) ^ (tick * 83492791)) >>> 0;
            if (h % 5 !== 0) continue;
            floor.fillStyle(0x9affd8, 0.6).fillRect(c * BLOCK + (h % 15) + 2, r * BLOCK + ((h >> 4) % 15) + 2, 4, 1);
          }
      }
      // The way home, once the boss is down.
      state.zones?.forEach((z: any) => {
        if (z.kind !== "exitportal") return;
        floor.fillStyle(0x0a1a4a, 1).fillEllipse(z.x, z.y, z.radius * 1.4, z.radius * 1.6);
        for (let i = 0; i < 6; i++) {
          const a = now / 300 + i;
          floor.lineStyle(2, i % 2 ? 0x3a7aff : 0x9ad8ff, 0.9).strokeEllipse(z.x + Math.cos(a) * 2, z.y + Math.sin(a) * 2, z.radius * (0.4 + i * 0.16), z.radius * (0.5 + i * 0.18));
        }
        floor.fillStyle(0xffffff, 0.5 + 0.3 * Math.sin(now / 150)).fillEllipse(z.x, z.y, 8, 14);
      });
    }
  }

  destroy() {
    for (const b of this.bubbles.values()) b.text.destroy();
    this.bubbles.clear();
    this.ui?.destroy();
    this.ui = undefined;
  }
}
