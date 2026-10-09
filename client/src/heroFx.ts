// Per-hero effect styles (2026-10-09): every hero gets its own colour and particle textures for the flash of a
// basic attack and the burst of casting a skill. The textures are Kenney's Particle Pack (CC0), white so they
// can be tinted (client/art/props/fx_*.png, sources in client/art/textures/SOURCES.md).
// A hero's element is read from its name, blurb and skill names (fire, ice, lightning...); heroes with no
// clear element get a look from their attack style and a colour of their own.

import Phaser from "phaser";
import { heroOf } from "../../shared/game";

export interface HeroFxStyle {
  color: number;
  /** a lighter colour for the core of flashes */
  core: number;
  /** flash at the hand on a basic attack (rotated along the aim) */
  attack: string;
  /** small particles thrown out by attacks and casts */
  bits: string[];
  /** the circle on the ground when a skill is cast */
  ring: string;
}

const ELEMENTS: { re: RegExp; color: number; core: number; bits: string[]; ring: string; attack?: string }[] = [
  { re: /\b(heal|healer|medic|holy|angel|saint|priest|paladin|cherry)\b/, color: 0xffe27a, core: 0xfffbe0, bits: ["fx_star_06", "fx_symbol_01"], ring: "fx_light_02" },
  { re: /\bfire\b|flame|burn|blaze|magma|pyro|ember|meteor|phoenix|lava|inferno|akainu|rengoku|\bace\b/, color: 0xff6a1a, core: 0xffe0a0, bits: ["fx_flame_05", "fx_fire_01"], ring: "fx_circle_02", attack: "fx_scorch_01" },
  { re: /\bice\b|frost|cryo|snow|freez|blizzard|glacier|aokiji/, color: 0x7ae0ff, core: 0xeafcff, bits: ["fx_star_06", "fx_flare_01"], ring: "fx_circle_02" },
  { re: /lightning|thunder|volt|\bbolt|electric|zap|static|kirin/, color: 0xffe23a, core: 0xffffd0, bits: ["fx_spark_01", "fx_spark_05"], ring: "fx_circle_02", attack: "fx_spark_01" },
  { re: /blood|vampire|crimson/, color: 0xff2a3a, core: 0xffb0b0, bits: ["fx_scorch_01", "fx_star_06"], ring: "fx_magic_01" },
  { re: /shadow|dark|curse|demon|void|death|soul|reaper|ghoul|necro|abyss|hollow|ninja/, color: 0xa04aff, core: 0xe8c8ff, bits: ["fx_twirl_01", "fx_smoke_07"], ring: "fx_magic_01" },
  { re: /water|\bsea\b|wave|ocean|rain|tide|fishman|jinbe/, color: 0x3a9aff, core: 0xd0f0ff, bits: ["fx_circle_05", "fx_star_06"], ring: "fx_circle_02" },
  { re: /tree|leaf|plant|druid|moss|nature|jungle|forest|flower|vine|wood style|toad|sage/, color: 0x5ae05a, core: 0xe0ffd0, bits: ["fx_star_06", "fx_magic_05"], ring: "fx_magic_01" },
  { re: /wind|storm|hurricane|tornado|\bair\b|\bsky\b|gale|cyclone/, color: 0xa8fff0, core: 0xffffff, bits: ["fx_twirl_01", "fx_trace_04"], ring: "fx_twirl_01" },
  { re: /rock|stone|earth|sand|golem|quake|titan|geo|mountain|iron|anvil|smith/, color: 0xd0a060, core: 0xfff0d0, bits: ["fx_dirt_02", "fx_smoke_07"], ring: "fx_circle_02" },
  { re: /robot|laser|cyber|plasma|tech|hacker|machine|mecha|cyborg|android|gadget|beam|genos/, color: 0x3affd0, core: 0xe0fff8, bits: ["fx_spark_05", "fx_flare_01"], ring: "fx_circle_02" },
  { re: /time|chrono|portal|space|cosmic|galaxy|star\b|gravity|dimension|world/, color: 0x9a8aff, core: 0xf0eaff, bits: ["fx_star_08", "fx_magic_03"], ring: "fx_magic_01" },
  { re: /poison|venom|toxic|insect|snake|acid/, color: 0xb0ff3a, core: 0xf0ffd0, bits: ["fx_smoke_07", "fx_circle_05"], ring: "fx_magic_01" },
  { re: /light\b|sun|solar|radiant|glow/, color: 0xfff07a, core: 0xffffff, bits: ["fx_star_09", "fx_flare_01"], ring: "fx_light_02" },
];

const BY_ATTACK: Record<string, { attack: string; bits: string[]; ring: string }> = {
  punch: { attack: "fx_star_08", bits: ["fx_star_06", "fx_dirt_02"], ring: "fx_circle_02" },
  sword: { attack: "fx_slash_03", bits: ["fx_star_06", "fx_scratch_01"], ring: "fx_circle_02" },
  rifle: { attack: "fx_muzzle_02", bits: ["fx_flare_01", "fx_smoke_07"], ring: "fx_circle_02" },
  lightning: { attack: "fx_spark_01", bits: ["fx_spark_05", "fx_star_06"], ring: "fx_circle_02" },
  magic: { attack: "fx_magic_05", bits: ["fx_star_06", "fx_magic_03"], ring: "fx_magic_01" },
  flame: { attack: "fx_scorch_01", bits: ["fx_flame_05", "fx_fire_01"], ring: "fx_circle_02" },
};

/** A few heroes whose look the words above get wrong. */
const OVERRIDES: Record<string, Partial<HeroFxStyle>> = {
  bakugo: { color: 0xff8a2a, core: 0xfff0c0, bits: ["fx_fire_01", "fx_smoke_07"], ring: "fx_circle_02" }, // explosions
  deku: { color: 0x5aff7a, core: 0xe8ffe8, bits: ["fx_spark_01", "fx_spark_05"] }, // green sparks of power
  killua: { color: 0x7ad8ff, core: 0xffffff }, // blue lightning
  gojo: { color: 0x4aa8ff, core: 0xe0f4ff }, // blue and purple void
  omni: { color: 0x5aff6a, core: 0xe8ffe8, bits: ["fx_spark_05", "fx_star_06"], ring: "fx_circle_02" },
};

const cache = new Map<string, HeroFxStyle>();

function hashHue(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 360) / 360;
}

export function heroFxStyle(id: string): HeroFxStyle {
  let s = cache.get(id);
  if (s) return s;
  const hero = heroOf(id);
  // the name says the most, then the skill names, then the blurb
  const texts = [`${id} ${hero.name}`, `${hero.skill?.name ?? ""} ${hero.skill2?.name ?? ""}`, hero.blurb].map((t) => t.toLowerCase());
  const base = BY_ATTACK[hero.attack] ?? BY_ATTACK.magic;
  let el: (typeof ELEMENTS)[number] | undefined;
  for (const t of texts) if ((el = ELEMENTS.find((e) => e.re.test(t)))) break;
  if (el) s = { color: el.color, core: el.core, attack: hero.attack === "sword" || hero.attack === "punch" || hero.attack === "rifle" ? base.attack : el.attack ?? base.attack, bits: el.bits, ring: el.ring };
  else {
    // no element: a colour of its own, picked from the id so it stays the same every game
    const c = Phaser.Display.Color.HSVToRGB(hashHue(id), 0.65, 1) as Phaser.Types.Display.ColorObject;
    const k = Phaser.Display.Color.HSVToRGB(hashHue(id), 0.15, 1) as Phaser.Types.Display.ColorObject;
    s = { color: Phaser.Display.Color.GetColor(c.r, c.g, c.b), core: Phaser.Display.Color.GetColor(k.r, k.g, k.b), ...base };
  }
  s = { ...s, ...OVERRIDES[id] };
  cache.set(id, s);
  return s;
}

function flash(scene: Phaser.Scene, key: string, x: number, y: number, tint: number, opts: { scale: number; to: number; ms: number; rot?: number; alpha?: number; depth?: number; spin?: number; dx?: number; dy?: number; add?: boolean; shadow?: boolean }) {
  if (!scene.textures.exists(key)) return;
  const depth = opts.depth ?? 958;
  const make = (t: number, a: number, d: number, blend: number, grow: number) => {
    const img = scene.add.image(x, y + (grow > 1 ? 1 : 0), key).setTint(t).setBlendMode(blend).setScale(opts.scale * grow).setRotation(opts.rot ?? 0).setAlpha(a).setDepth(d);
    // the shape keeps its strength most of the way, then fades out at the end
    scene.tweens.add({ targets: img, scale: opts.to * grow, x: x + (opts.dx ?? 0), y: y + (grow > 1 ? 1 : 0) + (opts.dy ?? 0), rotation: (opts.rot ?? 0) + (opts.spin ?? 0), duration: opts.ms, ease: "Cubic.easeOut", onComplete: () => img.destroy() });
    scene.tweens.add({ targets: img, alpha: 0, duration: opts.ms, ease: "Quad.easeIn" });
  };
  // a dark copy underneath so the colour reads on bright floors too
  if (opts.shadow) make(0x000000, 0.45 * (opts.alpha ?? 1), depth - 0.5, Phaser.BlendModes.NORMAL, 1.12);
  make(tint, opts.alpha ?? 1, depth, opts.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL, 1);
}

/** A basic attack: a coloured flash at the hand, along the aim, and a couple of sparks. */
export function playHeroAttackFx(scene: Phaser.Scene, heroId: string, x: number, y: number, aim: number) {
  const s = heroFxStyle(heroId);
  const hx = x + Math.cos(aim) * 22; // out in front, clear of the hero's face
  const hy = y - 6 + Math.sin(aim) * 22;
  const rot = s.attack === "fx_muzzle_02" ? aim + Math.PI / 2 : s.attack === "fx_slash_03" ? aim : Math.random() * Math.PI;
  flash(scene, s.attack, hx, hy, s.color, { scale: 0.5, to: 0.95, ms: 230, rot, alpha: 1, shadow: true });
  flash(scene, "fx_circle_05", hx, hy, s.core, { scale: 0.4, to: 0.8, ms: 170, alpha: 0.8, add: true });
  for (let i = 0; i < 2; i++) {
    const a = aim + (Math.random() - 0.5) * 1.2;
    const d = 18 + Math.random() * 18;
    flash(scene, s.bits[i % s.bits.length], hx, hy, s.color, { shadow: true, scale: 0.6, to: 0.2, ms: 360, dx: Math.cos(a) * d, dy: Math.sin(a) * d, spin: 2 });
  }
}

/** Casting a skill: a spinning circle on the ground, a glow on the hero and a ring of rising particles. */
export function playHeroCastFx(scene: Phaser.Scene, heroId: string, x: number, y: number) {
  const s = heroFxStyle(heroId);
  flash(scene, s.ring, x, y + 2, s.color, { scale: 0.35, to: 0.95, ms: 600, spin: 1.5, alpha: 1, depth: y - 1, shadow: true });
  flash(scene, s.ring, x, y + 2, s.core, { scale: 0.3, to: 0.8, ms: 450, spin: -1, alpha: 0.6, depth: y - 1, add: true });
  flash(scene, "fx_light_02", x, y - 8, s.color, { scale: 0.2, to: 0.6, ms: 400, alpha: 0.7, add: true });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
    const r = 10;
    flash(scene, s.bits[i % s.bits.length], x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, s.color, {
      shadow: true,
      scale: 1,
      to: 0.3,
      ms: 560 + Math.random() * 220,
      dx: Math.cos(a) * 26,
      dy: Math.sin(a) * 13 - 34,
      spin: 3,
    });
  }
}

/** Getting hit: a quick white star where the hit landed. */
export function playHitFx(scene: Phaser.Scene, x: number, y: number) {
  flash(scene, "fx_star_08", x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, 0xfff0c0, { scale: 0.5, to: 0.9, ms: 180, rot: Math.random() * Math.PI, alpha: 0.95, add: true, shadow: true });
}
