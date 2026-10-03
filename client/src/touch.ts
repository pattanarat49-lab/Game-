import Phaser from "phaser";

/**
 * Twin-stick touch controls for phones and tablets.
 * Left half of the screen: floating joystick to move.
 * Right half: floating joystick to aim; your hero attacks in that direction while it is held.
 * When only the left stick is used, your hero faces (and aims) where you walk.
 * Buttons in the bottom-right corner: DASH, the hero's skill, and a second skill if the hero has one.
 * Skill buttons work like small sticks: hold, drag to aim, and release to use the skill.
 */

const STICK_RADIUS = 60;
const DEADZONE = 0.2;
const SKILL_DRAG = 46; // how far a skill button's knob can be dragged
const SKILL_AIM_DEADZONE = 10; // a tap (or tiny drag) keeps the current aim
const CAST_PULSE_MS = 160; // how long the skill "button" stays pressed after release, so the server sees it

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
}

export class TouchControls {
  readonly move: Stick = { pointerId: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
  readonly aim: Stick = { pointerId: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
  readonly dashButton: Button;
  readonly skillButton: Button;
  readonly skill2Button?: Button;
  /** Last aim angle, kept after the aim stick is released. */
  aimAngle = 0;

  private gfx: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(
    private scene: Phaser.Scene,
    skillName: string,
    skill2Name?: string,
  ) {
    scene.input.addPointer(3); // up to 4 fingers at once
    const { width, height } = scene.scale;
    const button = (x: number, y: number, r: number, label: string): Button => ({ x, y, r, label, pointerId: null, dragX: 0, dragY: 0, castUntil: 0 });
    this.dashButton = button(width - 170, height - 70, 42, "DASH");
    this.skillButton = button(width - 70, height - 150, 42, skillName);
    if (skill2Name) this.skill2Button = button(width - 165, height - 175, 38, skill2Name);
    this.gfx = scene.add.graphics().setDepth(100);
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

  get dashing() {
    return this.dashButton.pointerId !== null;
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
    if (this.skillButton.pointerId !== null) return 1;
    if (this.skill2Button?.pointerId != null) return 2;
    return 0;
  }

  private get buttons(): Button[] {
    return this.skill2Button ? [this.dashButton, this.skillButton, this.skill2Button] : [this.dashButton, this.skillButton];
  }

  get shooting() {
    return this.aim.pointerId !== null && Math.hypot(this.aim.dx, this.aim.dy) > DEADZONE;
  }

  /** Movement as keyboard-style booleans, matching PlayerInput. */
  get directions() {
    const { dx, dy } = this.move;
    const active = Math.hypot(dx, dy) > DEADZONE;
    return {
      left: active && dx < -0.38,
      right: active && dx > 0.38,
      up: active && dy < -0.38,
      down: active && dy > 0.38,
    };
  }

  private hitButton(p: Phaser.Input.Pointer): Button | undefined {
    return this.buttons.find((b) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + 10);
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
    if (stick.pointerId !== null) return;
    stick.pointerId = p.id;
    stick.baseX = p.x;
    stick.baseY = p.y;
    stick.dx = 0;
    stick.dy = 0;
  }

  private onMove(p: Phaser.Input.Pointer) {
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
      if (len > SKILL_AIM_DEADZONE) this.aimAngle = Math.atan2(dy, dx);
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
      if (pushed && (stick === this.aim || this.aim.pointerId === null) && !this.aimingSkill) {
        // The aim stick wins; otherwise face where you walk.
        this.aimAngle = Math.atan2(stick.dy, stick.dx);
      }
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    for (const stick of [this.move, this.aim]) {
      if (stick.pointerId === p.id) {
        stick.pointerId = null;
        stick.dx = 0;
        stick.dy = 0;
      }
    }
    for (const b of this.buttons) {
      if (b.pointerId !== p.id) continue;
      b.pointerId = null;
      if (b !== this.dashButton) b.castUntil = performance.now() + CAST_PULSE_MS; // release = cast
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
      g.lineStyle(2, 0xffffff, 0.35).strokeCircle(stick.baseX, stick.baseY, STICK_RADIUS);
      const color = stick === this.aim ? 0xffd23f : 0xffffff;
      g.fillStyle(color, 0.6).fillCircle(
        stick.baseX + stick.dx * STICK_RADIUS,
        stick.baseY + stick.dy * STICK_RADIUS,
        24,
      );
    }
    const buttons: [Button, number][] = [
      [this.dashButton, dashReady],
      [this.skillButton, skillReady],
    ];
    if (this.skill2Button) buttons.push([this.skill2Button, skill2Ready]);
    for (const [b, ready] of buttons) {
      const pressed = b.pointerId !== null;
      g.fillStyle(ready >= 1 ? 0xf07a22 : 0x5a4a50, pressed ? 0.9 : 0.55).fillCircle(b.x, b.y, b.r);
      if (pressed && b !== this.dashButton) {
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
  }
}

export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
