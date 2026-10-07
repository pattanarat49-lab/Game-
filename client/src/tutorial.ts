// Tutorial for new players (2026-10-06): walk, attack, both skills, dash, then a short fight.
// A panel at the top says what to do next; SKIP TUTORIAL leaves at any time.

import Phaser from "phaser";
import { heroOf } from "../../shared/game";

interface Step {
  title: string;
  text: string;
  done: (me: any, state: any) => boolean;
  start?: () => void;
}

const CSS = `
#tut { position: fixed; left: 50%; top: 58px; transform: translateX(-50%); z-index: 22; width: min(92vw, 520px);
  background: rgba(14, 10, 24, 0.9); border: 3px solid #ffd23f; border-radius: 6px; padding: 10px 14px;
  font-family: "Press Start 2P", monospace; color: #fff; text-align: center; }
#tut .tut-k { font-size: 8px; color: #c9b8c0; margin-bottom: 6px; }
#tut .tut-t { font-size: 13px; color: #ffd23f; margin-bottom: 8px; }
#tut .tut-x { font-size: 10px; line-height: 1.7; }
#tut .tut-x b { color: #7dff8a; font-weight: normal; }
#tut .tut-row { display: flex; gap: 8px; justify-content: center; margin-top: 10px; }
#tut button { font: inherit; font-size: 9px; padding: 7px 12px; border-radius: 3px; cursor: pointer; color: #fff; background: #3a2e46; border: 2px solid #4a3e56; }
#tut button.tut-go { background: #2fae6a; border-color: #1d7a48; font-size: 11px; padding: 9px 18px; }
#tut.tut-yay { border-color: #7dff8a; }
@media (max-height: 460px) { #tut { top: 40px; padding: 6px 10px; } #tut .tut-t { font-size: 11px; margin-bottom: 4px; } #tut .tut-x { font-size: 8px; } }
`;

export class TutorialView {
  private root: HTMLDivElement;
  private steps: Step[];
  private i = 0;
  private startX?: number;
  private startY?: number;
  private walked = 0;
  private dummyHp = new Map<string, number>();
  private hits = 0;
  private fightStarted = 0;
  private finished = false;

  private arrows: Phaser.GameObjects.Graphics;

  constructor(
    private scene: Phaser.Scene,
    private room: any,
    touch: boolean,
    private done: (skipped: boolean) => void,
  ) {
    if (!document.getElementById("tut-css")) {
      const style = document.createElement("style");
      style.id = "tut-css";
      style.textContent = CSS;
      document.head.append(style);
    }
    const me = room.state.players.get(room.sessionId);
    const hero = heroOf(me?.hero ?? "superman");
    const q = hero.skill.kind === "passive" ? undefined : hero.skill.name;
    const e = hero.skill2?.name;
    this.steps = [
      {
        title: "MOVE",
        text: touch ? "Drag the <b>left stick</b> to walk around." : "Walk with <b>W A S D</b> (or the arrow keys).",
        done: () => this.walked >= 90,
      },
      {
        title: "ATTACK",
        text: touch
          ? "Hold the <b>sword stick</b> (bottom right) to attack, and drag it toward a straw dummy to aim. Hit it 3 times."
          : "Aim with the <b>mouse</b> and <b>click</b> (or hold) to attack a straw dummy. Hit it 3 times.",
        done: () => this.hits >= 3,
      },
      ...(q
        ? [
            {
              title: "SKILL 1",
              text: touch ? `Tap the <b>${q}</b> button to use your first skill.` : `Press <b>Q</b> (or the right mouse button) to use <b>${q}</b>.`,
              done: (m: any) => m.skillCooldown > 0,
            },
          ]
        : []),
      ...(e
        ? [
            {
              title: "SKILL 2",
              text: touch ? `Tap the <b>${e}</b> button to use your second skill.` : `Press <b>E</b> to use <b>${e}</b>.`,
              done: (m: any) => m.skill2Cooldown > 0,
            },
          ]
        : []),
      {
        title: "DASH",
        text: touch ? "Tap <b>DASH</b> to dash. Dashing gets you out of danger fast." : "Press <b>SPACE</b> to dash. Dashing gets you out of danger fast.",
        done: (m: any) => m.dashCooldown > 0,
      },
      {
        title: "FIGHT",
        text: "Monsters are coming! Use everything you learned and defeat all <b>3</b> of them.",
        start: () => {
          this.room.send("tutfight", 1);
          this.fightStarted = performance.now();
        },
        done: (_m: any, state: any) => {
          if (performance.now() - this.fightStarted < 800) return false;
          let left = 0;
          state.enemies.forEach((en: any) => {
            if (en.kind !== "dummy") left++;
          });
          return left === 0;
        },
      },
    ];

    this.arrows = scene.add.graphics().setDepth(2000);
    this.root = document.createElement("div");
    this.root.id = "tut";
    document.body.append(this.root);
    this.draw();
  }

  private draw() {
    if (this.i >= this.steps.length) {
      this.root.className = "tut-yay";
      this.root.innerHTML = `<div class="tut-t">TUTORIAL COMPLETE!</div><div class="tut-x">You know the basics. Win games to earn spins and unlock more heroes!</div><div class="tut-row"><button class="tut-go">LET'S PLAY</button></div>`;
      this.root.querySelector(".tut-go")!.addEventListener("click", () => this.finish(false));
      return;
    }
    const s = this.steps[this.i];
    this.root.className = "";
    this.root.innerHTML = `<div class="tut-k">STEP ${this.i + 1} / ${this.steps.length}</div><div class="tut-t">${s.title}</div><div class="tut-x">${s.text}</div><div class="tut-row"><button class="tut-skip">SKIP TUTORIAL</button></div>`;
    this.root.querySelector(".tut-skip")!.addEventListener("click", () => this.finish(true));
  }

  private finish(skipped: boolean) {
    if (this.finished) return;
    this.finished = true;
    this.destroy();
    this.done(skipped);
  }

  update(state: any) {
    // Yellow arrows bob over the training dummies (the ones to hit) and the monsters.
    const g = this.arrows;
    g.clear();
    if (!this.finished && this.i < this.steps.length) {
      const bob = Math.sin(this.scene.time.now / 160) * 3;
      state.enemies.forEach((en: any) => {
        const y = en.y - (en.kind === "dummy" ? 44 : 22) + bob;
        g.fillStyle(en.kind === "dummy" ? 0xffd23f : 0xff5a4a, 1).fillTriangle(en.x - 6, y - 8, en.x + 6, y - 8, en.x, y);
      });
    }
    if (this.finished || this.i >= this.steps.length) return;
    const me = state.players.get(this.room.sessionId);
    if (!me) return;
    // How far we have walked.
    if (this.startX !== undefined) this.walked += Math.min(30, Math.hypot(me.x - this.startX, me.y - (this.startY ?? me.y)));
    [this.startX, this.startY] = [me.x, me.y];
    // Hits on the dummies: their health going down (or one falling).
    const seen = new Set<string>();
    state.enemies.forEach((en: any, id: string) => {
      if (en.kind !== "dummy") return;
      seen.add(id);
      const before = this.dummyHp.get(id);
      if (before !== undefined && en.hp < before - 0.5) this.hits++;
      this.dummyHp.set(id, en.hp);
    });
    for (const id of this.dummyHp.keys()) {
      if (!seen.has(id)) {
        this.dummyHp.delete(id);
        this.hits++;
      }
    }
    if (this.steps[this.i].done(me, state)) {
      this.i++;
      this.steps[this.i]?.start?.();
      this.draw();
    }
  }

  destroy() {
    this.root.remove();
    if (this.arrows.active) this.arrows.destroy();
  }
}
