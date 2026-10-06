import Phaser from "phaser";
import { BOT_LEVELS, CLASSIC_KOS_TO_WIN, DASH_COOLDOWN, PVP_KILLS_TO_WIN, WAVE_COUNT, heroOf, ringStage } from "../../../shared/game";
import { PLAYER_COATS } from "../art";
import type { GameScene } from "./GameScene";
import { TouchControls, isTouchDevice } from "../touch";

const FONT = { fontFamily: '"Press Start 2P", monospace', fontSize: "12px", color: "#ffffff" };

function realPlayers(state: any): number {
  let n = 0;
  state.players.forEach((p: any) => {
    if (!p.owner) n++;
  });
  return n;
}

export class HudScene extends Phaser.Scene {
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private pingText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private scores!: Phaser.GameObjects.Text;
  private skills!: Phaser.GameObjects.Text;
  private special!: Phaser.GameObjects.Text;
  touch?: TouchControls;

  constructor() {
    super("Hud");
  }

  create() {
    this.bars = this.add.graphics();
    this.hpText = this.add.text(20, 18, "", FONT);
    this.skills = this.add.text(20, 64, "", { ...FONT, fontSize: "10px", lineSpacing: 6 });
    this.waveText = this.add.text(this.scale.width / 2, 16, "", { ...FONT, color: "#ffd23f" }).setOrigin(0.5, 0);
    this.pingText = this.add.text(this.scale.width - 20, 4, "", { ...FONT, fontSize: "8px" }).setOrigin(1, 0);
    this.banner = this.add
      .text(this.scale.width / 2, 120, "", { ...FONT, fontSize: "20px", align: "center", stroke: "#000", strokeThickness: 4 })
      .setOrigin(0.5);
    this.special = this.add
      .text(this.scale.width / 2, this.scale.height * 0.68, "", { ...FONT, fontSize: "18px", align: "center", stroke: "#000", strokeThickness: 5 })
      .setOrigin(0.5);
    this.scores = this.add.text(this.scale.width - 20, 16, "", { ...FONT, fontSize: "10px", align: "right", lineSpacing: 6 }).setOrigin(1, 0);
    const hero = heroOf(this.registry.get("hero"));
    if (isTouchDevice()) {
      this.touch = new TouchControls(this, hero.skill.name, hero.skill2?.name);
      return;
    }
    this.add
      .text(20, this.scale.height - 20, `WASD move  MOUSE aim/attack  SPACE dash  Q/RMB ${hero.skill.name}${hero.skill2 ? `  E ${hero.skill2.name}` : ""}  (hold to aim, release to cast, Esc to cancel)`, {
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
    // Online only: the round trip to the server, green when it is quick and red when it is slow.
    const ping = Math.round(game.pingMs);
    this.pingText.setText(ping > 0 ? `PING ${ping}ms` : "");
    this.pingText.setColor(ping < 100 ? "#7dff8a" : ping < 200 ? "#ffd23f" : "#ff6a6a");
    if (!state?.players) return;
    const me = state.players.get(room!.sessionId);

    this.bars.clear();
    if (me) {
      const w = 200;
      this.bars.fillStyle(0x000000, 0.6).fillRect(16, 36, w + 8, 18);
      this.bars.fillStyle(0x7a1f1f, 1).fillRect(20, 40, w, 10);
      const invincible = !!heroOf(me.hero).invincible;
      this.bars.fillStyle(invincible ? 0xf6f6f6 : 0x4cd964, 1).fillRect(20, 40, w * (invincible ? 1 : Math.max(0, me.hp / me.maxHp)), 10);
      this.hpText.setText(`${me.name} (${heroOf(me.hero).name})  HP ${invincible ? "INFINITE" : `${Math.ceil(me.hp)}/${me.maxHp}`}`);
      const dash = me.dashCooldown > 0 ? `${me.dashCooldown.toFixed(1)}s` : "READY";
      const hero = heroOf(me.hero);
      // Lasting effects count for the skill that made them (a latch can be the Giant Shifter's wire, a barrier the doves).
      const active1 = Math.max(me.titan, hero.skill.kind === "immortal" ? me.barrier : 0, me.revive, hero.skill.kind === "latch" ? me.latch : 0, hero.formOf ? 0 : me.buff ?? 0);
      const active2 = Math.max(me.beam, hero.skill2?.kind === "doves" ? me.barrier : 0, me.active2 ?? 0);
      const skill = hero.skill.kind === "thunderdash" && me.mode === 1 ? "AGAIN! (chain)" : hero.skill.kind === "shadowstep" && me.mode === 1 ? "BACK! (shadow)" : hero.skill.kind === "empower" && me.mode === 1 ? "READY (next hit)" : hero.skill.kind === "swap" ? `NOW ${me.mode === 1 ? "GUN" : "KNIFE"}` : hero.skill.kind === "passive" ? "PASSIVE" : active1 > 0 ? `ACTIVE ${active1.toFixed(1)}s` : me.skillCooldown > 0 ? `${me.skillCooldown.toFixed(1)}s` : "READY";
      const lines = [`DASH   ${dash}`, `${hero.skill.name.padEnd(6)} ${skill}`];
      // ALIEN TRANSFORM: how long until the alien turns back into the kid.
      const formLeft = hero.formOf ? `ALIEN  BACK IN ${(me.buff ?? 0).toFixed(1)}s` : "";
      if (hero.formOf && hero.skill.kind === "passive") lines[1] = formLeft;
      else if (hero.formOf) lines.push(formLeft);
      const skill2Ready = hero.skill2 ? 1 - me.skill2Cooldown / hero.skill2.cooldown : 1;
      if (hero.skill2) lines.push(`${hero.skill2.name.padEnd(6)} ${hero.skill2.kind === "yoyo" ? `NOW ${me.mode === 1 ? "YOYO" : "BOLT"}` : active2 > 0 ? `ACTIVE ${active2.toFixed(1)}s` : me.skill2Cooldown > 0 ? `${me.skill2Cooldown.toFixed(1)}s` : "READY"}`);
      if ((me.power ?? 1) > 1) lines.push(`DMG x${me.power}  (CRAFTED)`);
      // Heroes that build stacks (BOOST, ARMOR, TREES) show them right under the cooldown bars.
      const stackRow = hero.stacks ? lines.length : -1;
      if (hero.stacks) lines.push(`${hero.stacks.label.padEnd(6)} ${hero.stacks.max ? `${me.mode}/${hero.stacks.max}` : `x${me.mode}`}`);
      this.skills.setText(lines.join("\n"));
      const barX = Math.max(220, 20 + this.skills.width + 12);
      this.drawCooldown(barX, 68, 1 - me.dashCooldown / DASH_COOLDOWN);
      const formTime = hero.formOf ? heroOf(hero.formOf).skill.duration ?? 10 : 10;
      if (hero.formOf && hero.skill.kind === "passive") this.drawCooldown(barX, 84, (me.buff ?? 0) / formTime);
      else this.drawCooldown(barX, 84, 1 - me.skillCooldown / hero.skill.cooldown);
      if (hero.formOf && hero.skill.kind !== "passive") this.drawCooldown(barX, 100, (me.buff ?? 0) / formTime);
      if (hero.skill2) this.drawCooldown(barX, 100, skill2Ready);
      if (hero.stacks && stackRow >= 0) this.drawStacks(barX, 68 + 16 * stackRow, me.mode ?? 0, hero.stacks.max);
      this.touch?.setLabels(hero.skill.kind === "passive" ? "ALIEN" : hero.skill.name, hero.skill2?.name ?? "");
      this.touch?.draw(1 - me.skillCooldown / hero.skill.cooldown, 1 - me.dashCooldown / DASH_COOLDOWN, skill2Ready);
    }

    const waveLabel = state.wave >= WAVE_COUNT ? "BOSS" : `${state.wave}/${WAVE_COUNT}`;
    let banner = "";
    if (state.stage === "classic") {
      // Classic 3v3: the two teams' KOs.
      this.waveText.setText(`CLASSIC 3V3  RED ${state.scoreA ?? 0} - ${state.scoreB ?? 0} BLUE  FIRST TO ${CLASSIC_KOS_TO_WIN}`);
      if (state.phase === "victory") banner = `${state.winner} TEAM WINS!\nBack to select in ${Math.ceil(state.phaseTimer)}`;
      else if (state.phase === "intermission") banner = `${me?.team === 1 ? "YOU ARE RED" : "YOU ARE BLUE"}\nFIGHT! in ${Math.ceil(state.phaseTimer)}`;
      else if (me?.dead) banner = `YOU FELL\nBack in ${Math.ceil(me.respawnIn)}`;
    } else if (ringStage(state.stage)) {
      const pve = state.stage === "pve";
      const level = pve ? `  ${BOT_LEVELS[state.botLevel ?? 2]?.name ?? ""}` : "";
      this.waveText.setText(`${pve ? "PVE SQUAD" : state.stage === "duel" ? "BOT DUEL" : "PVP ARENA"}  FIRST TO ${PVP_KILLS_TO_WIN} ${pve ? "ROUNDS" : "KILLS"}${level}`);
      if (state.phase === "victory") banner = `${state.winner === "TEAM" ? "YOUR TEAM" : state.winner} WINS!\nNext round in ${Math.ceil(state.phaseTimer)}`;
      else if (pve && state.phase === "intermission") {
        // PvE Squad: the team's rounds against the bot's.
        const bot = state.players.get("bot");
        let team = 0;
        state.players.forEach((p: any, id: string) => {
          if (!p.owner && id !== "bot") team = Math.max(team, p.score);
        });
        const round = team + (bot?.score ?? 0) + 1;
        banner = `ROUND ${round}${round > 1 ? `\nTEAM ${team} - ${bot?.score ?? 0} BOT` : ""}\nFIGHT! in ${Math.ceil(state.phaseTimer)}`;
      } else if (pve && me?.dead) banner = "YOU FELL\nYour team fights on!";
      else if (me?.dead) banner = `YOU FELL\nRespawning in ${Math.ceil(me.respawnIn)}`;
      else if (state.phase === "intermission") {
        // Every knockout resets the ring: show the round and the score so far.
        const fighters: any[] = [];
        state.players.forEach((p: any) => {
          if (!p.owner) fighters.push(p);
        });
        const round = fighters.reduce((n, p) => n + p.score, 0) + 1;
        const score = fighters.length === 2 ? `\n${fighters[0].name} ${fighters[0].score} - ${fighters[1].score} ${fighters[1].name}` : "";
        banner = `ROUND ${round}${round > 1 ? score : ""}\nFIGHT! in ${Math.ceil(state.phaseTimer)}`;
      }
      else if (!pve && realPlayers(state) < 2) banner = "Waiting for another player...\nShare the link with a friend";
    } else if (state.stage === "boss") {
      // Boss room: a big health bar for Godzilla instead of a wave counter.
      this.waveText.setText("BOSS ROOM  ATOMIC KAIJU");
      state.enemies.forEach((e: any) => {
        if (e.kind !== "godzilla") return;
        const w = Math.min(500, this.scale.width - 480);
        const x = (this.scale.width - w) / 2;
        this.bars.fillStyle(0x000000, 0.7).fillRect(x - 4, 36, w + 8, 14);
        this.bars.fillStyle(0x2a3d32, 1).fillRect(x, 40, w, 6);
        this.bars.fillStyle(0x7fd0ff, 1).fillRect(x, 40, w * Math.max(0, e.hp / e.maxHp), 6);
      });
      if (me?.dead) banner = `YOU FELL\nRespawning in ${Math.ceil(me.respawnIn)}`;
      else if (state.phase === "intermission") banner = `ATOMIC KAIJU APPROACHES\nin ${Math.ceil(state.phaseTimer)}`;
      else if (state.phase === "victory") banner = `ATOMIC KAIJU DEFEATED!\nRematch in ${Math.ceil(state.phaseTimer)}`;
    } else {
      const jungle = state.stage === "jungle";
      const dojo = state.stage === "dojo";
      this.waveText.setText(`${jungle ? "JUNGLE TEMPLE" : dojo ? "SWORD DOJO" : "EMBERFALL"}  WAVE ${state.wave === 0 ? "-" : waveLabel}  ENEMIES ${state.enemies.size}`);
      if (jungle || dojo) {
        // The Ape King and the Sword God get a big health bar.
        state.enemies.forEach((e: any) => {
          if (e.kind !== "kingkong" && e.kind !== "swordgod") return;
          const w = Math.min(500, this.scale.width - 480);
          const x = (this.scale.width - w) / 2;
          this.bars.fillStyle(0x000000, 0.7).fillRect(x - 4, 36, w + 8, 14);
          this.bars.fillStyle(0x3a2a1a, 1).fillRect(x, 40, w, 6);
          this.bars.fillStyle(dojo ? 0xe8e8f0 : 0xff9a3a, 1).fillRect(x, 40, w * Math.max(0, e.hp / e.maxHp), 6);
        });
      }
      if (me?.dead) banner = `YOU FELL\nRespawning in ${Math.ceil(me.respawnIn)}`;
      else if (state.phase === "intermission") {
        const next = state.wave + 1;
        const boss = jungle ? "THE APE KING AWAKENS" : dojo ? "THE SWORD GOD DRAWS HIS BLADE" : "THE PYRE WARDEN AWAKENS";
        banner = `${next === WAVE_COUNT ? boss : `WAVE ${next}`}\nin ${Math.ceil(state.phaseTimer)}`;
        if (state.wave > 0) banner = `Wave cleared! ${jungle ? "The jungle goes quiet..." : dojo ? "The students bow and step back..." : "The lava cools..."}\n\n${banner}`;
      } else if (state.phase === "victory") banner = `${jungle ? "JUNGLE TEMPLE CONQUERED!" : dojo ? "THE SWORD GOD IS DEFEATED!" : "EMBERFALL STABILISED!"}\nNew run in ${Math.ceil(state.phaseTimer)}`;
    }
    this.banner.setText(banner);

    // Big callouts for map-wide skills.
    let special = "";
    let color = "#ffffff";
    state.zones?.forEach((z: any) => {
      if (z.kind === "domain") [special, color] = ["VOID REALM", "#c9a8ff"];
      else if (z.kind === "city" && !special) [special, color] = [z.maxLife - z.life < 1.5 ? "CREATOR" : "", "#e8f0ff"];
      else if (z.kind === "rewind") [special, color] = ["TIME MACHINE", "#9fd8ff"];
      else if (z.kind === "asgard" && !special) [special, color] = [z.maxLife - z.life < 1.5 ? "ILLUSION: GOLDEN CITY" : "", "#ffd86a"];
    });
    if (state.reality > 0) {
      [special, color] = [`REALITY CHANGE  ${state.reality.toFixed(1)}s\nenemies are ordinary humans`, "#ff6a9a"];
    }
    if (state.timeStop > 0) {
      const by = state.players.get(state.timeStopBy);
      [special, color] = [`TIME STOP!\n${by?.name ?? ""} ${state.timeStop.toFixed(1)}s`, "#9fd8ff"];
    }
    this.special.setText(special).setColor(color);

    const rows: string[] = [];
    let count = 0;
    state.players.forEach((p: any, id: string) => {
      if (p.owner) return; // Loki's clones are not players
      count++;
      const marker = id === room!.sessionId ? ">" : " ";
      const side = state.stage === "classic" ? (p.team === 1 ? "R " : "B ") : "";
      rows.push(`${marker}${side}${p.name}  ${p.score}${ringStage(state.stage) ? " KO" : ""}`);
    });
    this.scores.setText(`RIFTBORN ${count}/${state.stage === "classic" ? 6 : 4}\n${rows.join("\n")}`);
    let i = 0;
    state.players.forEach((p: any) => {
      if (p.owner) return;
      this.bars.fillStyle(Phaser.Display.Color.HexStringToColor(PLAYER_COATS[p.color % 4][0]).color, 1);
      this.bars.fillRect(this.scale.width - 12, 32 + i * 16, 6, 8);
      i++;
    });
  }

  /** One pip per stack (up to the cap), or a pip per tree for the uncapped Druid. */
  private drawStacks(x: number, y: number, n: number, max?: number) {
    const slots = max ?? Math.max(n, 1);
    const shown = Math.min(slots, 12);
    const w = Math.min(10, Math.floor((60 - (shown - 1) * 2) / shown));
    for (let i = 0; i < shown; i++) {
      this.bars.fillStyle(0x000000, 0.6).fillRect(x + i * (w + 2), y - 1, w, 8);
      if (i < n) this.bars.fillStyle(0x6ad8ff, 1).fillRect(x + i * (w + 2) + 1, y, w - 2, 6);
    }
  }

  private drawCooldown(x: number, y: number, ready: number) {
    this.bars.fillStyle(0x000000, 0.6).fillRect(x, y, 60, 6);
    this.bars.fillStyle(ready >= 1 ? 0xffd23f : 0x8a7a50, 1).fillRect(x, y, 60 * Math.min(1, ready), 6);
  }
}
