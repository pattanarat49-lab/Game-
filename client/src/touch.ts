import Phaser from "phaser";
import { attackMode } from "./settings";

/**
 * Twin-stick touch controls for phones and tablets.
 * Left half of the screen: floating joystick to move.
 * Right half: floating joystick to aim; your hero attacks in that direction while it is held.
 * When only the left stick is used, your hero faces (and aims) where you walk.
 * Letting go of the move stick while it is pushed dashes that way (there is no dash button).
 * Buttons in the bottom-right corner: the hero's skill, and a second skill if the hero has one.
 * Under them sits the attack button (a pixel sword). In the DEFAULT attack mode (see settings.ts) it is a plain
 * button that aims at the closest foe by itself, and the right half of the screen has no aim stick. In ADVANCE
 * mode it is a stick: hold it to attack, drag it to aim (and the free aim stick on the right half works too).
 * Skill buttons work like small sticks: hold, drag to aim, and release to use the skill.
 * While a skill is held a CANCEL spot appears above it: let go there and the skill is not used.
 */

const STICK_RADIUS = 60;
const DEADZONE = 0.2;
const SKILL_DRAG = 46; // how far a skill button's knob can be dragged
const SKILL_AIM_DEADZONE = 10; // a tap (or tiny drag) keeps the current aim
const CAST_PULSE_MS = 160;
const ATTACK_R = 92; // the attack stick's circle (2x since 2026-10-08, user request)
const ATTACK_DRAG = 80; // how far its knob can be dragged
/** The pixel sword drawn in the attack stick (blade, guard, grip). */
const SWORD = [
  "..........WW",
  ".........WLW",
  "........WLW.",
  ".......WLW..",
  "......WLW...",
  ".....WLW....",
  "..G.WLW.....",
  "..GGLW......",
  "...GG.......",
  "..BBGG......",
  ".BB..G......",
  "BB..........",
];
const SWORD_COLORS: Record<string, number> = { W: 0xffffff, L: 0x9fc4e8, G: 0xffd23f, B: 0x8a4b2a }; // how long the skill "button" stays pressed after release, so the server sees it

interface Stick {
  pointerId: number | null;
  baseX: number;
  baseY: number;
  dx: number; // -1..1
  dy: number; // -1..1
}

interface Button {
  x: number;
  y: number;
  r: number;
  label: string;
  pointerId: number | null;
  /** Skill buttons: how far the finger has dragged from the button, and when the last release cast it. */
  dragX: number;
  dragY: number;
  castUntil: number;
  /** Skill buttons: the finger is over the CANCEL spot. */
  overCancel: boolean;
}

export class TouchControls {
  readonly move: Stick = { pointerId: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
  readonly aim: Stick = { pointerId: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
  readonly skillButton: Button;
  readonly skill2Button?: Button;
  /** The basic-attack stick under the skill buttons. */
  readonly attackButton: Button;
  /** ADVANCE attack mode: the sword is a joystick. Otherwise attacks aim themselves (GameScene.autoAim). */
  readonly advanced = attackMode() === "advance";
  /** A hero with no skills yet (Pen Blade): no skill button at all. */
  private noSkill = false;
  /** Last aim angle, kept after the aim stick is released. */
  aimAngle = 0;
  /** How far the skill knob (or aim stick) is pushed, 0-1: placed skills land that far out in their circle. */
  aimReach = 1;
  /** After a dragged skill is released, its direction holds until the cast has gone out. */
  private aimLockUntil = 0;
  /** Releasing the move stick dashes the way it was pushed: the dash input stays on until then. */
  private dashUntil = 0;
  private dashAngle = 0;

  /** Where to drop a held skill to call it off. */
  readonly cancelSpot: { x: number; y: number; r: number };
  private cancelLabel: Phaser.GameObjects.Text;
  private gfx: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(
    private scene: Phaser.Scene,
    skillName: string,
    skill2Name?: string,
  ) {
    scene.input.addPointer(3); // up to 4 fingers at once
    this.noSkill = !skillName;
    const { width, height } = scene.scale;
    const button = (x: number, y: number, r: number, label: string): Button => ({ x, y, r, label, pointerId: null, dragX: 0, dragY: 0, castUntil: 0, overCancel: false });
    // DEFAULT mode's sword button is 1.5x bigger (user request), so it sits lower right and the skills move up.
    const big = !this.advanced;
    // ADVANCE mode's attack stick is 2x bigger (user request 2026-10-08), so the skills sit higher above it.
    this.skillButton = button(width - 62, height - (big ? 205 : 240), 40, skillName);
    if (skill2Name) this.skill2Button = button(width - (big ? 172 : 202), height - (big ? 192 : 214), 36, skill2Name);
    this.attackButton = big ? button(width - 92, height - 80, 69, "") : button(width - 112, height - 102, ATTACK_R, "");
    this.cancelSpot = { x: width - 62, y: Math.max(60, height - 330), r: 34 };
    this.gfx = scene.add.graphics().setDepth(100);
    this.cancelLabel = scene.add
      .text(this.cancelSpot.x, this.cancelSpot.y, "CANCEL", { fontFamily: '"Press Start 2P", monospace', fontSize: "8px", color: "#ffffff" })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false);
    for (const b of this.buttons) {
      this.labels.push(
        scene.add
          .text(b.x, b.y, b.label, { fontFamily: '"Press Start 2P", monospace', fontSize: "8px", color: "#ffffff", align: "center", wordWrap: { width: 70 } })
          .setOrigin(0.5)
          .setDepth(101),
      );
    }

    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onDown(p));
    scene.input.on("pointermove", (p: Phaser.Input.Pointer) => this.onMove(p));
    scene.input.on("pointerup", (p: Phaser.Input.Pointer) => this.onUp(p));
    scene.input.on("pointerupoutside", (p: Phaser.Input.Pointer) => this.onUp(p));
  }

  /** Rename the skill buttons (ALIEN TRANSFORM changes what they do without a new HUD). */
  setLabels(skillName: string, skill2Name = "") {
    const names = [skillName, skill2Name];
    this.labels.forEach((l, i) => {
      if (l.text !== names[i]) l.setText(names[i]);
    });
  }

    get dashing() {
    return performance.now() < this.dashUntil;
  }

  /** True for a moment after a skill button is released: that is when the skill goes off. */
  get skilling() {
    return performance.now() < this.skillButton.castUntil;
  }

  get skilling2() {
    return !!this.skill2Button && performance.now() < this.skill2Button.castUntil;
  }

  /** Which skill is being held and aimed right now (1 or 2), or 0. */
  get aimingSkill(): 0 | 1 | 2 {
    if (this.skillButton.pointerId !== null && !this.skillButton.overCancel) return 1;
    if (this.skill2Button?.pointerId != null && !this.skill2Button.overCancel) return 2;
    return 0;
  }

  /** Every button a finger can grab: the skills and the attack stick. */
  private get allButtons(): Button[] {
    return [...this.buttons, this.attackButton];
  }

  private get buttons(): Button[] {
    if (this.noSkill) return this.skill2Button ? [this.skill2Button] : [];
    return this.skill2Button ? [this.skillButton, this.skill2Button] : [this.skillButton];
  }

  get shooting() {
    if (this.attackButton.pointerId !== null) return true; // holding the attack stick attacks
    return this.aim.pointerId !== null && Math.hypot(this.aim.dx, this.aim.dy) > DEADZONE;
  }

  /** Movement as keyboard-style booleans, matching PlayerInput. */
  get directions() {
    // While a release-dash goes out, keep pointing the way the stick was pushed.
    const dashing = this.dashing && this.move.pointerId === null;
    const dx = dashing ? Math.cos(this.dashAngle) : this.move.dx;
    const dy = dashing ? Math.sin(this.dashAngle) : this.move.dy;
    const active = Math.hypot(dx, dy) > DEADZONE;
    return {
      left: active && dx < -0.38,
      right: active && dx > 0.38,
      up: active && dy < -0.38,
      down: active && dy > 0.38,
    };
  }

  private hitButton(p: Phaser.Input.Pointer): Button | undefined {
    return this.allButtons.find((b) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + 10);
  }

  private onDown(p: Phaser.Input.Pointer) {
    if (!p.wasTouch) return;
    const button = this.hitButton(p);
    if (button) {
      button.pointerId = p.id;
      button.dragX = 0;
      button.dragY = 0;
      return;
    }
    const stick = p.x < this.scene.scale.width / 2 ? this.move : this.aim;
    if (stick === this.aim && !this.advanced) return; // DEFAULT mode: the sword button aims for you
    if (stick.pointerId !== null) return;
    stick.pointerId = p.id;
    stick.baseX = p.x;
    stick.baseY = p.y;
    stick.dx = 0;
    stick.dy = 0;
  }

  private onMove(p: Phaser.Input.Pointer) {
    const a = this.attackButton;
    if (a.pointerId === p.id && this.advanced) {
      // Dragging the attack stick aims the attacks; a plain hold attacks the way you face.
      let dx = p.x - a.x;
      let dy = p.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len > ATTACK_DRAG) {
        dx = (dx / len) * ATTACK_DRAG;
        dy = (dy / len) * ATTACK_DRAG;
      }
      a.dragX = dx;
      a.dragY = dy;
      const locked = !!this.aimingSkill || performance.now() < this.aimLockUntil;
      if (len > SKILL_AIM_DEADZONE && !locked) this.aimAngle = Math.atan2(dy, dx);
    }
    for (const b of [this.skillButton, this.skill2Button]) {
      if (!b || b.pointerId !== p.id) continue;
      // Dragging a skill button aims the skill.
      let dx = p.x - b.x;
      let dy = p.y - b.y;
      const len = Math.hypot(dx, dy);
      if (len > SKILL_DRAG) {
        dx = (dx / len) * SKILL_DRAG;
        dy = (dy / len) * SKILL_DRAG;
      }
      b.dragX = dx;
      b.dragY = dy;
      const c = this.cancelSpot;
      b.overCancel = Math.hypot(p.x - c.x, p.y - c.y) < c.r + 8;
      if (len > SKILL_AIM_DEADZONE && !b.overCancel) this.aimAngle = Math.atan2(dy, dx);
      if (!b.overCancel) this.aimReach = Math.min(1, len / SKILL_DRAG);
    }
    for (const stick of [this.move, this.aim]) {
      if (stick.pointerId !== p.id) continue;
      let dx = p.x - stick.baseX;
      let dy = p.y - stick.baseY;
      const len = Math.hypot(dx, dy);
      if (len > STICK_RADIUS) {
        // Drag the base along so the stick never "runs out".
        stick.baseX = p.x - (dx / len) * STICK_RADIUS;
        stick.baseY = p.y - (dy / len) * STICK_RADIUS;
        dx = (dx / len) * STICK_RADIUS;
        dy = (dy / len) * STICK_RADIUS;
      }
      stick.dx = dx / STICK_RADIUS;
      stick.dy = dy / STICK_RADIUS;
      const pushed = Math.hypot(stick.dx, stick.dy) > DEADZONE;
      const locked = !!this.aimingSkill || performance.now() < this.aimLockUntil;
      const attackAiming = this.attackButton.pointerId !== null && Math.hypot(this.attackButton.dragX, this.attackButton.dragY) > SKILL_AIM_DEADZONE;
      if (pushed && (stick === this.aim || (this.aim.pointerId === null && !attackAiming)) && !locked) {
        // The aim stick wins; otherwise face where you walk.
        this.aimAngle = Math.atan2(stick.dy, stick.dx);
      }
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    const a = this.attackButton;
    if (a.pointerId === p.id) {
      a.pointerId = null;
      a.dragX = 0;
      a.dragY = 0;
    }
    for (const stick of [this.move, this.aim]) {
      if (stick.pointerId === p.id) {
        if (stick === this.move && Math.hypot(stick.dx, stick.dy) > DEADZONE) {
          this.dashUntil = performance.now() + CAST_PULSE_MS;
          this.dashAngle = Math.atan2(stick.dy, stick.dx);
        }
        stick.pointerId = null;
        stick.dx = 0;
        stick.dy = 0;
      }
    }
    for (const b of this.buttons) {
      if (b.pointerId !== p.id) continue;
      b.pointerId = null;
      if (b.overCancel) {
        b.overCancel = false; // dropped on CANCEL: no skill
      } else {
        b.castUntil = performance.now() + CAST_PULSE_MS; // release = cast
        // A dragged skill goes where it was aimed, not where you happen to be walking.
        if (Math.hypot(b.dragX, b.dragY) <= SKILL_AIM_DEADZONE) this.aimReach = 0.6; // a quick tap: a little way ahead
        if (Math.hypot(b.dragX, b.dragY) > SKILL_AIM_DEADZONE) {
          this.aimAngle = Math.atan2(b.dragY, b.dragX);
          this.aimLockUntil = b.castUntil + 350; // keep facing the skill while it plays out
        }
      }
      b.dragX = 0;
      b.dragY = 0;
    }
  }

  /** Redraw sticks and buttons. Buttons show their cooldown as a filling ring. */
  draw(skillReady: number, dashReady: number, skill2Ready = 1) {
    const g = this.gfx;
    g.clear();
    for (const stick of [this.move, this.aim]) {
      if (stick.pointerId === null) continue;
      g.fillStyle(0xffffff, 0.12).fillCircle(stick.baseX, stick.baseY, STICK_RADIUS);
      // The move stick's rim glows orange when letting go would dash.
      const dashRim = stick === this.move && dashReady >= 1;
      g.lineStyle(2, dashRim ? 0xf07a22 : 0xffffff, dashRim ? 0.8 : 0.35).strokeCircle(stick.baseX, stick.baseY, STICK_RADIUS);
      const color = stick === this.aim ? 0xffd23f : 0xffffff;
      g.fillStyle(color, 0.6).fillCircle(
        stick.baseX + stick.dx * STICK_RADIUS,
        stick.baseY + stick.dy * STICK_RADIUS,
        24,
      );
    }
    // While a skill is held, show the CANCEL spot (it lights up red under the finger).
    const held = [this.skillButton, this.skill2Button].find((b) => b && b.pointerId !== null);
    this.cancelLabel.setVisible(!!held);
    if (held) {
      const c = this.cancelSpot;
      g.fillStyle(held.overCancel ? 0xd83a3a : 0x2a2028, held.overCancel ? 0.9 : 0.6).fillCircle(c.x, c.y, c.r);
      g.lineStyle(2, held.overCancel ? 0xffffff : 0xd83a3a, 0.9).strokeCircle(c.x, c.y, c.r);
    }
    const buttons: [Button, number][] = this.noSkill ? [] : [[this.skillButton, skillReady]];
    if (this.skill2Button) buttons.push([this.skill2Button, skill2Ready]);
    for (const [b, ready] of buttons) {
      const pressed = b.pointerId !== null;
      g.fillStyle(ready >= 1 ? 0xf07a22 : 0x5a4a50, pressed ? 0.9 : 0.55).fillCircle(b.x, b.y, b.r);
      if (pressed) {
        // An aiming ring and a knob that follows the finger.
        g.lineStyle(2, 0xffffff, 0.4).strokeCircle(b.x, b.y, b.r + SKILL_DRAG - 20);
        g.fillStyle(0xffd23f, 0.75).fillCircle(b.x + b.dragX, b.y + b.dragY, 14);
      }
      if (ready < 1) {
        g.lineStyle(4, 0xffd23f, 0.9);
        g.beginPath();
        g.arc(b.x, b.y, b.r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, ready));
        g.strokePath();
      }
    }
    this.drawAttack(g);
  }

  /** The attack stick: a dark circle with a pixel sword on the knob, which follows the finger. */
  private drawAttack(g: Phaser.GameObjects.Graphics) {
    const a = this.attackButton;
    const pressed = a.pointerId !== null;
    g.fillStyle(0x1c1418, pressed ? 0.7 : 0.45).fillCircle(a.x, a.y, a.r);
    g.lineStyle(3, pressed ? 0xffd23f : 0xffffff, pressed ? 0.9 : 0.5).strokeCircle(a.x, a.y, a.r);
    const kx = a.x + a.dragX;
    const ky = a.y + a.dragY;
    const knob = this.advanced ? 52 : 51; // a plain button (DEFAULT mode) is one big knob
    g.fillStyle(pressed ? 0xd83a3a : 0x6a2a2a, pressed ? 0.95 : 0.85).fillCircle(kx, ky, pressed && !this.advanced ? knob - 3 : knob);
    g.lineStyle(2, 0x000000, 0.6).strokeCircle(kx, ky, knob);
    const px = this.advanced ? 6 : 4.5; // one sword pixel = 6 screen pixels in ADVANCE mode, 4.5 in DEFAULT
    const ox = Math.round(kx - (SWORD[0].length * px) / 2);
    const oy = Math.round(ky - (SWORD.length * px) / 2);
    // A dark drop shadow first, then the sword, so it reads on any background.
    for (const [shift, shadow] of [[1, true], [0, false]] as const) {
      SWORD.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const c = SWORD_COLORS[row[x]];
          if (c === undefined) continue;
          g.fillStyle(shadow ? 0x000000 : c, shadow ? 0.6 : 1).fillRect(ox + x * px + shift, oy + y * px + shift, px, px);
        }
      });
    }
  }
}

export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
