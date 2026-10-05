import Phaser from "phaser";
import { FxStep, SkillDef } from "../../shared/game";

// Drawing for "combo" skills. The server sends their zones and shots as kind strings that carry
// the look, colour and shape (fxl:/fx:/fxc:/fxd:/fxf: zones, fxo: shots), and this draws them all.

type G = Phaser.GameObjects.Graphics;

export const fxColor = (c: string) => parseInt(c, 16) || 0xffffff;

/** A lighter tint of a colour, for bright cores. */
export function fxLight(c: number, t = 0.55) {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  return (Math.round(r + (255 - r) * t) << 16) | (Math.round(g + (255 - g) * t) << 8) | Math.round(b + (255 - b) * t);
}

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function jagged(g: G, x0: number, y0: number, x1: number, y1: number, jitter: number, parts = 7) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  let px = x0;
  let py = y0;
  for (let i = 1; i <= parts; i++) {
    const t = i / parts;
    const off = i === parts ? 0 : (Math.random() - 0.5) * jitter;
    const qx = x0 + dx * t + nx * off;
    const qy = y0 + dy * t + ny * off;
    g.lineBetween(px, py, qx, qy);
    [px, py] = [qx, qy];
  }
}

/** Draws one combo zone. Returns false when the kind is not a combo zone. */
export function drawFxZone(floor: G, sky: G, z: any, now: number): boolean {
  const kind: string = z.kind;
  if (!kind.startsWith("fx")) return false;
  const parts = kind.split(":");
  const head = parts[0];
  const t = Math.max(0, z.life / (z.maxLife || 1)); // 1 at the start, 0 at the end
  const age = (z.maxLife || 0) - z.life;
  if (head === "fxl") {
    const [, look, col, angS, lenS, widthS] = parts;
    const c = fxColor(col);
    const light = fxLight(c);
    const a = Number(angS);
    const len = Number(lenS);
    const w = Number(widthS);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const ex = z.x + cos * len;
    const ey = z.y + sin * len;
    const lane = (width: number, color: number, alpha: number) => {
      const h = width / 2;
      const pts = [
        { x: z.x - sin * h, y: z.y + cos * h },
        { x: ex - sin * h, y: ey + cos * h },
        { x: ex + sin * h, y: ey - cos * h },
        { x: z.x + sin * h, y: z.y - cos * h },
      ];
      sky.fillStyle(color, alpha).fillPoints(pts, true);
    };
    switch (look) {
      case "dash": {
        // A speed streak with afterimage lines along the dash.
        lane(w, c, 0.25 * t);
        sky.lineStyle(3, light, 0.9 * t).lineBetween(z.x, z.y, ex, ey);
        for (let i = 0; i < 6; i++) {
          const off = (rnd(i + len) - 0.5) * w;
          const s0 = rnd(i * 3 + 1) * 0.4;
          sky.lineStyle(1, i % 2 ? c : 0xffffff, 0.7 * t).lineBetween(z.x - sin * off + cos * len * s0, z.y + cos * off + sin * len * s0, ex - sin * off, ey + cos * off);
        }
        break;
      }
      case "slash": {
        // A thin, bright cut that thins out from the middle.
        const grow = Math.min(1, age / 0.08);
        const mx = z.x + cos * len * grow;
        const my = z.y + sin * len * grow;
        sky.lineStyle(Math.max(2, w * 0.5) * t, c, 0.45 * t).lineBetween(z.x, z.y, mx, my);
        sky.lineStyle(Math.max(1.5, w * 0.18) * t, 0xffffff, t).lineBetween(z.x, z.y, mx, my);
        // Little cross cuts along the blade.
        for (let i = 1; i < 4; i++) {
          const px = z.x + cos * len * (i / 4) * grow;
          const py = z.y + sin * len * (i / 4) * grow;
          const k = w * 0.6;
          sky.lineStyle(1, light, 0.8 * t).lineBetween(px - sin * k + cos * 6, py + cos * k + sin * 6, px + sin * k - cos * 6, py - cos * k - sin * 6);
        }
        break;
      }
      case "wave": {
        // A rolling wave band with crests.
        lane(w, c, 0.3 * t);
        sky.lineStyle(2, light, 0.85 * t);
        for (let k = -1; k <= 1; k += 2) {
          let px = z.x;
          let py = z.y;
          for (let i = 1; i <= 16; i++) {
            const d = (len * i) / 16;
            const off = k * (w / 2) * (0.6 + 0.4 * Math.sin(i * 1.3 + now / 80));
            const qx = z.x + cos * d - sin * off;
            const qy = z.y + sin * d + cos * off;
            sky.lineBetween(px, py, qx, qy);
            [px, py] = [qx, qy];
          }
        }
        break;
      }
      case "chain": {
        // Chain links from the caster to the target.
        const links = Math.max(2, Math.floor(len / 9));
        for (let i = 0; i < links; i++) {
          const px = z.x + cos * (len * (i + 0.5)) / links;
          const py = z.y + sin * (len * (i + 0.5)) / links;
          sky.lineStyle(2, i % 2 ? c : light, t).strokeEllipse(px, py, i % 2 ? 8 : 4, i % 2 ? 4 : 8);
        }
        break;
      }
      case "bolt":
        sky.lineStyle(5, c, 0.35 * t);
        jagged(sky, z.x, z.y, ex, ey, 18);
        sky.lineStyle(2, 0xffffff, t);
        jagged(sky, z.x, z.y, ex, ey, 14);
        break;
      case "grab": {
        // A long arm of energy, with a hand at the end.
        sky.lineStyle(6, c, 0.6 * t).lineBetween(z.x, z.y, ex, ey);
        sky.lineStyle(2, light, t).lineBetween(z.x, z.y, ex, ey);
        sky.fillStyle(c, t).fillCircle(ex, ey, 7);
        for (let i = -1; i <= 1; i++) sky.lineStyle(2, c, t).lineBetween(ex, ey, ex + Math.cos(a + i * 0.6) * 9, ey + Math.sin(a + i * 0.6) * 9);
        break;
      }
      case "eye":
        // A thin gaze line and a mark on the target.
        sky.lineStyle(1, c, 0.8 * t).lineBetween(z.x, z.y - 10, ex, ey);
        sky.lineStyle(2, c, t).strokeEllipse(ex, ey - 10, 16, 8);
        sky.fillStyle(c, t).fillCircle(ex, ey - 10, 2.5);
        break;
      default: {
        // "beam": a glowing beam with a white core.
        const flick = 0.8 + Math.random() * 0.2;
        lane(w * 1.4, c, 0.18 * t);
        lane(w, c, 0.5 * t * flick);
        lane(Math.max(2, w * 0.35), 0xffffff, 0.9 * t * flick);
        sky.fillStyle(light, 0.7 * t).fillCircle(z.x, z.y, w * 0.6);
      }
    }
    return true;
  }
  if (head === "fx") {
    const [, look, col] = parts;
    const c = fxColor(col);
    const light = fxLight(c);
    const r = z.radius;
    const grow = 1 - t;
    switch (look) {
      case "shock":
        for (let i = 0; i < 3; i++) {
          const k = Math.min(1, grow * 1.3 + i * 0.15);
          sky.lineStyle(3 - i, i ? light : c, t).strokeCircle(z.x, z.y, r * k);
        }
        floor.fillStyle(c, 0.15 * t).fillCircle(z.x, z.y, r);
        break;
      case "petal":
        floor.fillStyle(c, 0.12 * t).fillCircle(z.x, z.y, r);
        for (let i = 0; i < 18; i++) {
          const a = rnd(i) * Math.PI * 2 + grow * 2;
          const d = r * (0.3 + 0.7 * rnd(i + 9)) * (0.4 + grow * 0.6);
          sky.fillStyle(i % 3 ? c : light, t).fillEllipse(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, 6, 3);
        }
        break;
      case "spin":
        for (let i = 0; i < 3; i++) {
          const a0 = grow * 9 + (i * Math.PI * 2) / 3;
          sky.lineStyle(4, c, 0.6 * t).beginPath().arc(z.x, z.y, r * 0.85, a0, a0 + 1.4).strokePath();
          sky.lineStyle(2, 0xffffff, t).beginPath().arc(z.x, z.y, r * 0.85, a0 + 0.6, a0 + 1.4).strokePath();
        }
        floor.fillStyle(c, 0.12 * t).fillCircle(z.x, z.y, r);
        break;
      case "puff":
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          sky.fillStyle(i % 2 ? c : light, 0.6 * t).fillCircle(z.x + Math.cos(a) * r * grow, z.y - 6 + Math.sin(a) * r * grow * 0.6, 6 * t + 2);
        }
        break;
      case "heal":
        floor.fillStyle(c, 0.18 * t).fillCircle(z.x, z.y, r);
        floor.lineStyle(2, light, 0.8 * t).strokeCircle(z.x, z.y, r * (0.5 + grow * 0.5));
        for (let i = 0; i < 6; i++) {
          const px = z.x + (rnd(i) - 0.5) * r * 1.2;
          const py = z.y - grow * 30 - rnd(i + 4) * 14;
          sky.fillStyle(light, t).fillRect(px - 1, py - 4, 2, 8).fillRect(px - 4, py - 1, 8, 2);
        }
        break;
      default: {
        // "burst": a flash, a ring rushing out and scattered sparks.
        floor.fillStyle(c, 0.35 * t).fillCircle(z.x, z.y, r * (0.4 + grow * 0.6));
        sky.fillStyle(0xffffff, 0.6 * t * t).fillCircle(z.x, z.y, r * 0.35);
        sky.lineStyle(3, light, t).strokeCircle(z.x, z.y, r * (0.5 + grow * 0.5));
        for (let i = 0; i < 12; i++) {
          const a = rnd(i + r) * Math.PI * 2;
          const d = r * (0.3 + grow * 0.9);
          sky.fillStyle(i % 2 ? c : 0xffffff, t).fillRect(z.x + Math.cos(a) * d - 1, z.y + Math.sin(a) * d - 1, 3, 3);
        }
      }
    }
    return true;
  }
  if (head === "fxc") {
    const [, col, angS, arcS] = parts;
    const c = fxColor(col);
    const a = Number(angS);
    const arc = Number(arcS);
    const r = z.radius * (0.7 + 0.3 * (1 - t));
    sky.fillStyle(c, 0.35 * t).slice(z.x, z.y, r, a - arc / 2, a + arc / 2, false).fillPath();
    sky.lineStyle(2, fxLight(c), t).beginPath().arc(z.x, z.y, r, a - arc / 2, a + arc / 2).strokePath();
    for (let i = 0; i < 8; i++) {
      const aa = a + (rnd(i) - 0.5) * arc;
      const d = r * (0.4 + 0.6 * rnd(i + 3));
      sky.fillStyle(0xffffff, t).fillRect(z.x + Math.cos(aa) * d - 1, z.y + Math.sin(aa) * d - 1, 2, 2);
    }
    return true;
  }
  if (head === "fxd") {
    // Something falls on this spot: a warning circle on the ground, the thing coming down from the sky.
    const [, look, col] = parts;
    const c = fxColor(col);
    const light = fxLight(c);
    const r = z.radius;
    const k = 1 - t; // 0 at the cast, 1 when it lands
    floor.fillStyle(c, 0.12).fillCircle(z.x, z.y, r);
    floor.fillStyle(c, 0.22).fillCircle(z.x, z.y, r * k);
    floor.lineStyle(2, c, 0.8).strokeCircle(z.x, z.y, r);
    const h = 220 * (1 - k * k);
    const y = z.y - h;
    switch (look) {
      case "pillar":
        sky.fillStyle(c, 0.25 + 0.4 * k).fillRect(z.x - r * 0.5 * k, z.y - 260, r * k, 260);
        sky.fillStyle(0xffffff, 0.5 * k).fillRect(z.x - r * 0.15 * k, z.y - 260, r * 0.3 * k, 260);
        break;
      case "bolt":
        if (Math.random() < 0.2 + k * 0.6) {
          sky.lineStyle(2, light, 0.5 + 0.5 * k);
          jagged(sky, z.x + (Math.random() - 0.5) * r, z.y - 240, z.x + (Math.random() - 0.5) * r * 0.5, z.y, 30, 9);
        }
        break;
      case "fist":
        sky.fillStyle(c, 0.9).fillRoundedRect(z.x - r * 0.45, y - r * 0.5, r * 0.9, r * 0.8, 6);
        sky.fillStyle(light, 0.9).fillRect(z.x - r * 0.45, y + r * 0.1, r * 0.9, 4);
        sky.lineStyle(2, 0x000000, 0.5).strokeRoundedRect(z.x - r * 0.45, y - r * 0.5, r * 0.9, r * 0.8, 6);
        break;
      case "blade":
        sky.fillStyle(light, 0.95).fillTriangle(z.x - 6, y - 70, z.x + 6, y - 70, z.x, y);
        sky.fillStyle(c, 1).fillRect(z.x - 14, y - 76, 28, 6).fillRect(z.x - 3, y - 96, 6, 22);
        break;
      default:
        // "meteor": a burning rock with a tail.
        sky.fillStyle(c, 0.35).fillCircle(z.x + 20 * (1 - k), y - 18, r * 0.35);
        sky.fillStyle(c, 1).fillCircle(z.x, y, r * 0.3);
        sky.fillStyle(light, 1).fillCircle(z.x - r * 0.08, y - r * 0.08, r * 0.15);
    }
    return true;
  }
  if (head === "fxf") {
    const [, look, col] = parts;
    const c = fxColor(col);
    const light = fxLight(c);
    const r = z.radius;
    const fade = Math.max(0, Math.min(1, age / 0.3, z.life / 0.5));
    const spin = now / 900;
    floor.fillStyle(c, (look === "dark" ? 0.4 : 0.18) * fade).fillCircle(z.x, z.y, r);
    floor.lineStyle(2, c, 0.7 * fade).strokeCircle(z.x, z.y, r);
    const scatter = (n: number, draw: (x: number, y: number, i: number) => void) => {
      for (let i = 0; i < n; i++) {
        const a = rnd(i) * Math.PI * 2 + spin * (i % 2 ? 1 : -1);
        const d = Math.sqrt(rnd(i + 17)) * r * 0.92;
        draw(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, i);
      }
    };
    switch (look) {
      case "storm":
        sky.lineStyle(1, light, 0.7 * fade);
        for (let i = 0; i < 18; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.sqrt(Math.random()) * r;
          const x = z.x + Math.cos(a) * d;
          const y = z.y + Math.sin(a) * d;
          sky.lineBetween(x, y - 9, x - 2, y);
        }
        if (Math.random() < 0.15) {
          sky.lineStyle(2, 0xffffff, fade);
          const x = z.x + (Math.random() - 0.5) * r;
          jagged(sky, x, z.y - 200, x + (Math.random() - 0.5) * 20, z.y + (Math.random() - 0.5) * r * 0.6, 24);
        }
        break;
      case "mist":
        scatter(10, (x, y, i) => sky.fillStyle(i % 2 ? c : light, 0.22 * fade).fillCircle(x, y, 10 + rnd(i) * 10));
        break;
      case "flames":
        scatter(14, (x, y, i) => {
          const h = 8 + 6 * Math.abs(Math.sin(now / 90 + i));
          sky.fillStyle(c, 0.8 * fade).fillTriangle(x - 4, y, x + 4, y, x, y - h);
          sky.fillStyle(light, 0.9 * fade).fillTriangle(x - 2, y, x + 2, y, x, y - h * 0.5);
        });
        break;
      case "sand":
        scatter(30, (x, y, i) => sky.fillStyle(i % 3 ? c : light, 0.8 * fade).fillRect(x, y, 2, 2));
        sky.lineStyle(1, light, 0.4 * fade).beginPath().arc(z.x, z.y, r * 0.6, spin * 3, spin * 3 + 2).strokePath();
        break;
      case "petals":
        scatter(16, (x, y, i) => sky.fillStyle(i % 2 ? c : light, 0.9 * fade).fillEllipse(x, y, 6, 3));
        break;
      case "dark":
        for (let i = 0; i < 4; i++) {
          const a0 = spin * 2 + (i * Math.PI) / 2;
          floor.lineStyle(2, light, 0.6 * fade).beginPath().arc(z.x, z.y, r * (0.3 + i * 0.17), a0, a0 + 2.2).strokePath();
        }
        scatter(8, (x, y) => sky.fillStyle(0x000000, 0.5 * fade).fillCircle(x, y - 4, 3));
        break;
      case "ice":
        scatter(10, (x, y, i) => {
          const h = 6 + rnd(i) * 8;
          sky.fillStyle(light, 0.85 * fade).fillTriangle(x - 3, y, x + 3, y, x, y - h);
          sky.lineStyle(1, c, fade).strokeTriangle(x - 3, y, x + 3, y, x, y - h);
        });
        break;
      case "light":
        scatter(6, (x, y, i) => sky.fillStyle(0xffffff, (0.15 + 0.15 * Math.sin(now / 150 + i)) * fade).fillRect(x - 3, y - 70, 6, 70));
        floor.lineStyle(1, light, 0.6 * fade).strokeCircle(z.x, z.y, r * (0.5 + 0.5 * ((now / 600) % 1)));
        break;
      case "water":
        for (let i = 0; i < 3; i++) floor.lineStyle(2, light, 0.5 * fade).strokeCircle(z.x, z.y, r * (((now / 700 + i / 3) % 1) || 0.01));
        break;
      case "web":
        floor.lineStyle(1, light, 0.8 * fade);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          floor.lineBetween(z.x, z.y, z.x + Math.cos(a) * r, z.y + Math.sin(a) * r);
        }
        for (let k = 1; k <= 3; k++) floor.strokeCircle(z.x, z.y, (r * k) / 3);
        break;
    }
    return true;
  }
  return false;
}

/** The texture key for a combo shot ("fxo:<shape>:<colour>:<size>"), drawn the first time it is needed. */
export function fxShotTexture(scene: Phaser.Scene, kind: string): string {
  if (scene.textures.exists(kind)) return kind;
  const [, shape, col, sizeS] = kind.split(":");
  const c = fxColor(col);
  const light = fxLight(c, 0.6);
  const s = Math.max(2, Number(sizeS) || 3);
  const W = Math.ceil(s * 2 + 4) * (shape === "blade" || shape === "spike" ? 2 : 1);
  const H = Math.ceil(s * 2 + 4);
  const tex = scene.textures.createCanvas(kind, W, H);
  if (!tex) return "snipe";
  const ctx = tex.getContext();
  const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");
  const cx = W / 2;
  const cy = H / 2;
  ctx.fillStyle = hex(c);
  ctx.strokeStyle = hex(c);
  switch (shape) {
    case "blade":
      // A crescent cut, facing right.
      ctx.beginPath();
      ctx.arc(cx - s * 0.6, cy, s * 1.5, -1.2, 1.2);
      ctx.arc(cx - s * 1.4, cy, s * 1.5, 0.9, -0.9, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hex(light);
      ctx.fillRect(cx + s * 0.5, cy - 1, 2, 2);
      break;
    case "star":
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const d = i % 2 ? s * 0.4 : s;
        ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hex(light);
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
      break;
    case "spike":
      ctx.beginPath();
      ctx.moveTo(W - 1, cy);
      ctx.lineTo(cx - s * 0.5, cy - s * 0.6);
      ctx.lineTo(1, cy);
      ctx.lineTo(cx - s * 0.5, cy + s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hex(light);
      ctx.fillRect(cx, cy - 0.5, s, 1);
      break;
    default: {
      // "orb": a glowing ball with a bright core.
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s + 1);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, hex(light));
      grad.addColorStop(0.75, hex(c));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  }
  tex.refresh();
  return kind;
}

/** The buff step of a combo skill, if it has one. */
export function fxBuffStep(skill: SkillDef | undefined) {
  if (skill?.kind !== "combo") return undefined;
  return skill.steps?.find((s) => s.do === "buff") as (FxStep & { do: "buff" }) | undefined;
}

/** A glowing aura while a combo buff lasts. */
export function drawFxAura(g: G, step: FxStep & { do: "buff" }, x: number, y: number, k: number, now: number) {
  const c = fxColor(step.color);
  const pulse = 0.5 + 0.5 * Math.sin(now / 120);
  if (step.invuln) {
    g.fillStyle(0xffffff, 0.15 + 0.1 * pulse).fillCircle(x, y - 9 * k, 15 * k);
    g.lineStyle(2, c, 0.8).strokeCircle(x, y - 9 * k, 15 * k);
  }
  if (step.armor !== undefined && step.armor < 1) g.lineStyle(2, c, 0.6 + 0.3 * pulse).strokeCircle(x, y - 9 * k, 14 * k);
  g.lineStyle(2, c, 0.45 + 0.45 * pulse).strokeEllipse(x, y + 1, 22 * k, 8 * k);
  if (Math.random() < 0.5) g.fillStyle(Math.random() < 0.5 ? c : fxLight(c), 0.9).fillRect(x + (Math.random() - 0.5) * 18 * k, y - 2 - Math.random() * 20 * k, 2, 3);
}

/** Aim guide for a combo skill: shows its first step that reaches out. */
export function fxGuide(
  skill: SkillDef,
  aim: number,
  x: number,
  y: number,
  lane: (len: number, width: number) => void,
  area: (cx: number, cy: number, r: number) => void,
  cone: (range: number, arc: number) => void,
) {
  for (const st of skill.steps ?? []) {
    switch (st.do) {
      case "dash":
        return lane(st.len, st.width ?? 26);
      case "blink":
        if (st.to === "aim") return lane(st.range, 3);
        return area(x, y, st.range);
      case "lane":
        return lane(st.len, st.width);
      case "ring":
        return area(x, y, st.radius);
      case "cone":
        return cone(st.range, st.arc);
      case "shots":
        if (st.spread >= Math.PI * 2 - 0.01) return area(x, y, st.range);
        if (st.spread > 0.3) return cone(st.range, st.spread);
        return lane(st.range, 8);
      case "drop":
      case "field":
        if (st.at === "self") return area(x, y, st.radius);
        if (st.at === "target") return area(x, y, 320);
        return area(x + Math.cos(aim) * st.at, y + Math.sin(aim) * st.at, st.radius);
      case "lock":
        return area(x, y, st.range);
      case "heal":
      case "shield":
        if (st.radius) return area(x, y, st.radius);
    }
  }
}

/** The main colour of a combo skill (its first step's). */
export const fxMainColor = (skill: SkillDef) => fxColor(skill.steps?.[0]?.color ?? "ffffff");
