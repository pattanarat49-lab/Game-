import Phaser from "phaser";
import { DASH_COOLDOWN, WAVE_COUNT, heroOf } from "../../../shared/game";
import { PLAYER_COATS } from "../art";
import type { GameScene } from "./GameScene";
import { TouchControls, isTouchDevice } from "../touch";

const FONT = { fontFamily: '"Press Start 2P", monospace', fontSize: "12px", color: "#ffffff" };

export class HudScene extends Phaser.Scene {
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private scores!: Phaser.GameObjects.Text;
  private skills!: Phaser.GameObjects.Text;
  touch?: TouchControls;

  constructor() {
    super("Hud");
  }

  create() {
    this.bars = this.add.graphics();
    this.hpText = this.add.text(20, 18, "", FONT);
    this.skills = this.add.text(20, 64, "", { ...FONT, fontSize: "10px", lineSpacing: 6 });
    this.waveText = this.add.text(this.scale.width / 2, 16, "", { ...FONT, color: "#ffd23f" }).setOrigin(0.5, 0);
    this.banner = this.add
      .text(this.scale.width / 2, 120, "", { ...FONT, fontSize: "20px", align: "center", stroke: "#000", strokeThickness: 4 })
      .setOrigin(0.5);
    this.scores = this.add.text(this.scale.width - 20, 16, "", { ...FONT, fontSize: "10px", align: "right", lineSpacing: 6 }).setOrigin(1, 0);
    const hero = heroOf(this.registry.get("hero"));
    if (isTouchDevice()) {
      this.touch = new TouchControls(this, hero.skill.name);
      return;
    }
    this.add
      .text(20, this.scale.height - 20, `WASD move  MOUSE aim/attack  SPACE dash  Q/RMB ${hero.skill.name}`, {
        ...FONT,
        fontSize: "9px",
        color: "#c9b8c0",
      })
      .setOrigin(0, 1);
  }

  update() {
    const game = this.scene.get("Game") as GameScene;
    const room = game.room;
    const state = room?.state;
    if (!state?.players) return;
    const me = state.players.get(room!.sessionId);

    this.bars.clear();
    if (me) {
      const w = 200;
      this.bars.fillStyle(0x000000, 0.6).fillRect(16, 36, w + 8, 18);
      this.bars.fillStyle(0x7a1f1f, 1).fillRect(20, 40, w, 10);
      this.bars.fillStyle(0x4cd964, 1).fillRect(20, 40, w * Math.max(0, me.hp / me.maxHp), 10);
      this.hpText.setText(`${me.name} (${heroOf(me.hero).name})  HP ${Math.ceil(me.hp)}/${me.maxHp}`);
      const dash = me.dashCooldown > 0 ? `${me.dashCooldown.toFixed(1)}s` : "READY";
      const hero = heroOf(me.hero);
      const skill = me.skillCooldown > 0 ? `${me.skillCooldown.toFixed(1)}s` : "READY";
      this.skills.setText(`DASH   ${dash}\n${hero.skill.name.padEnd(6)} ${skill}`);
      this.drawCooldown(220, 68, 1 - me.dashCooldown / DASH_COOLDOWN);
      this.drawCooldown(220, 84, 1 - me.skillCooldown / hero.skill.cooldown);
      this.touch?.draw(1 - me.skillCooldown / hero.skill.cooldown, 1 - me.dashCooldown / DASH_COOLDOWN);
    }

    const waveLabel = state.wave >= WAVE_COUNT ? "BOSS" : `${state.wave}/${WAVE_COUNT}`;
    this.waveText.setText(`EMBERFALL  WAVE ${state.wave === 0 ? "-" : waveLabel}  ENEMIES ${state.enemies.size}`);

    let banner = "";
    if (me?.dead) banner = `YOU FELL\nRespawning in ${Math.ceil(me.respawnIn)}`;
    else if (state.phase === "intermission") {
      const next = state.wave + 1;
      banner = `${next === WAVE_COUNT ? "THE PYRE WARDEN AWAKENS" : `WAVE ${next}`}\nin ${Math.ceil(state.phaseTimer)}`;
      if (state.wave > 0) banner = `Wave cleared! The lava cools...\n\n${banner}`;
    } else if (state.phase === "victory") banner = `EMBERFALL STABILISED!\nNew run in ${Math.ceil(state.phaseTimer)}`;
    this.banner.setText(banner);

    const rows: string[] = [];
    state.players.forEach((p: any, id: string) => {
      const marker = id === room!.sessionId ? ">" : " ";
      rows.push(`${marker}${p.name}  ${p.score}`);
    });
    this.scores.setText(`RIFTBORN ${state.players.size}/4\n${rows.join("\n")}`);
    let i = 0;
    state.players.forEach((p: any) => {
      this.bars.fillStyle(Phaser.Display.Color.HexStringToColor(PLAYER_COATS[p.color % 4][0]).color, 1);
      this.bars.fillRect(this.scale.width - 12, 32 + i * 16, 6, 8);
      i++;
    });
  }

  private drawCooldown(x: number, y: number, ready: number) {
    this.bars.fillStyle(0x000000, 0.6).fillRect(x, y, 60, 6);
    this.bars.fillStyle(ready >= 1 ? 0xffd23f : 0x8a7a50, 1).fillRect(x, y, 60 * Math.min(1, ready), 6);
  }
}
