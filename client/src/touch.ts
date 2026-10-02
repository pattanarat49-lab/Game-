import Phaser from "phaser";

/**
 * Twin-stick touch controls for phones and tablets.
 * Left half of the screen: floating joystick to move.
 * Right half: floating joystick to aim; your hero attacks in that direction while it is held.
 * When only the left stick is used, your hero faces (and aims) where you walk.
 * Two buttons in the bottom-right corner: DASH and the hero's skill.
 */

const STICK_RADIUS = 60;
const DEADZONE = 0.2;

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
}

export class TouchControls {
  readonly move: Stick = { pointerId: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
  readonly aim: Stick = { pointerId: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
  readonly dashButton: Button;
  readonly skillButton: Button;
  /** Last aim angle, kept after the aim stick is released. */
  aimAngle = 0;

  private gfx: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(
    private scene: Phaser.Scene,
    skillName: string,
  ) {
    scene.input.addPointer(3); // up to 4 fingers at once
    const { width, height } = scene.scale;
    this.dashButton = { x: width - 170, y: height - 70, r: 42, label: "DASH", pointerId: null };
    this.skillButton = { x: width - 70, y: height - 150, r: 42, label: skillName, pointerId: null };
    this.gfx = scene.add.graphics().setDepth(100);
    for (const b of [this.dashButton, this.skillButton]) {
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

  get skilling() {
    return this.skillButton.pointerId !== null;
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
    return [this.dashButton, this.skillButton].find((b) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + 10);
  }

  private onDown(p: Phaser.Input.Pointer) {
    if (!p.wasTouch) return;
    const button = this.hitButton(p);
    if (button) {
      button.pointerId = p.id;
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
      if (pushed && (stick === this.aim || this.aim.pointerId === null)) {
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
    for (const b of [this.dashButton, this.skillButton]) {
      if (b.pointerId === p.id) b.pointerId = null;
    }
  }

  /** Redraw sticks and buttons. Buttons show their cooldown as a filling ring. */
  draw(skillReady: number, dashReady: number) {
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
    for (const [b, ready] of buttons) {
      const pressed = b.pointerId !== null;
      g.fillStyle(ready >= 1 ? 0xf07a22 : 0x5a4a50, pressed ? 0.9 : 0.55).fillCircle(b.x, b.y, b.r);
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
