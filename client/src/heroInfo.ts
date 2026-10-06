import { DAMAGE_BALANCE, ENEMIES, FxStep, HERO_DAMAGE_SCALE, HERO_HIT_SCALE, HEROES, HERO_CLASSES, HeroDef, HeroId, SkillDef, heroClass, heroRatings } from "../../shared/game";
import { heroPortrait } from "./heroArt";

// A details popup for one hero: what its basic attack and both skills do (user request 2026-10-06).

const ATTACK_NAME: Record<string, string> = {
  punch: "Melee punch",
  sword: "Melee sword",
  rifle: "Gun",
  lightning: "Lightning strike",
  magic: "Ranged shot",
  flame: "Flame cone",
};

/** Splits an older hero's blurb into its basic-attack part and the part about each skill. */
function splitBlurb(hero: HeroDef): { basic: string; q: string; e: string } {
  const b = hero.blurb;
  const marks = [hero.skill, hero.skill2]
    .map((sk, i) => ({ i, at: sk ? b.indexOf(sk.name) : -1, name: sk?.name ?? "" }))
    .filter((m) => m.at >= 0)
    .sort((x, y) => x.at - y.at);
  const out = { basic: marks.length ? b.slice(0, marks[0].at).trim() : b, q: "", e: "" };
  marks.forEach((m, k) => {
    const end = k + 1 < marks.length ? marks[k + 1].at : b.length;
    const text = b.slice(m.at + m.name.length, end).replace(/^\s*(\([^)]*\))?\s*[:-]?\s*/, "").trim();
    if (m.i === 0) out.q = text;
    else out.e = text;
  });
  return out;
}


// ------------------------------------------------------------------ the numbers

/** A number for the popup: whole when big, one decimal when small. */
const num = (v: number) => (Math.abs(v) >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));

/**
 * The real numbers behind a skill, as they hit in game: damage after the hero's balance and HERO_DAMAGE_SCALE,
 * % heals after HERO_HIT_SCALE (the same in every mode).
 */
function skillNumbers(id: string, hero: HeroDef, sk: SkillDef): string {
  const bal = DAMAGE_BALANCE[id as HeroId] ?? 1;
  const D = (v: number) => num(v * bal * HERO_DAMAGE_SCALE);
  const H = (share: number) => `${num(share * 100 * HERO_HIT_SCALE)}%`;
  const s = (v: number | undefined, d: number) => `${num(v ?? d)}s`;
  const dmg = `Damage ${D(sk.damage)}`;
  const n = sk.count;
  switch (sk.kind) {
    case "combo": {
      const nums = comboNumbers(sk.steps ?? [], D, H);
      return sk.chargeTime ? `Charge: x0.6 (tap) to x1.5 (full) · ${nums}` : nums;
    }
    case "taunt": return `${dmg} · Taunted ${s(sk.duration, 2)}`;
    case "possess": return `Controls the foe for ${s(sk.duration, 5)}`;
    case "eater": return "The ally takes no damage while inside";
    case "swapany": return "Any hero on the map";
    case "domainx": return `x${num(sk.damage)} damage inside · Lasts ${s(sk.duration, 10)}`;
    case "deathnote": return `Writes for ${s(sk.duration, 10)} · Then the nearest foe within ${sk.radius} falls`;
    case "kunai": return `${n ?? 3} kunai · Damage ${D(sk.damage)} each · Up to 3 warps within 6s`;
    case "bloodtrap": return `Costs 5% HP · Damage ${D(sk.damage)} per drop of blood · Up to 12 drops`;
    case "bloodhammer": return `Costs 10% HP · x2 damage and reach · Lasts ${s(sk.duration, 7)}`;
    case "copyskill": return `${dmg} · Copies its Q for one use`;
    case "fakeclone": return `${n ?? 5} clones · Last ${s(sk.duration, 8)} · One hit and they vanish`;
    case "piano": return `${n ?? 24} notes · Damage ${D(sk.damage)} each`;
    case "smash": case "leap": case "palm": case "anvil": case "grab": case "dashkick": case "jab": case "kick": case "roar":
      return `${dmg} · Stun ${s(sk.duration, 1)}`;
    case "cross": case "storm": case "wave": case "fireball": case "domain": case "rush": case "bluelaser": case "lancecharge":
    case "spinkick": case "purple": case "rubberpunch": case "yoyo":
      return sk.kind === "rubberpunch" ? `${dmg} · Stun 1s` : sk.kind === "yoyo" ? `Yoyo damage ${D(sk.damage)} per hit` : dmg;
    case "truck": return `${dmg} · Lands after ${s(sk.duration, 2)}`;
    case "omnitrix": return `Alien for ${s(sk.duration, 10)}`;
    case "eat": return `Heals ${H(sk.damage)} HP`;
    case "diamond": return `Sword for ${s(sk.duration, 10)} · Damage ${D(hero.sword?.damage ?? 0)} per swing`;
    case "build": return `TNT blast damage ${D(sk.damage)}`;
    case "eyebeam": return `Damage ${D(sk.damage)} per second · Lasts ${s(sk.duration, 2.5)}`;
    case "burst": return `3 shots · Damage ${D(sk.damage)} each`;
    case "onepunch": return "Knocks out in one hit";
    case "heal": return `Heals ${H(sk.damage)} HP`;
    case "slashes": return `8 cuts · Damage ${D(sk.damage)} each`;
    case "timestop": return `Lasts ${s(sk.duration, 4)}`;
    case "hurricane": return `Damage ${D(sk.damage)} every 0.35s · Lasts ${s(sk.duration, 3.5)}`;
    case "asgard": return `Foes lose ${num(sk.damage * 100 * bal * HERO_DAMAGE_SCALE)}% of max HP a second · Lasts ${s(sk.duration, 10)}`;
    case "clone": return `Lasts ${s(sk.duration, 20)} · Up to 2`;
    case "swap": return `Gun damage ${D(hero.gun?.damage ?? 0)} per shot`;
    case "thunderdash": return `${dmg} · ${s(sk.duration, 2)} to dash again`;
    case "seventh": return `${dmg} · Then ${D(sk.damage * 0.2)} every 0.5s for ${s(sk.duration, 3)}`;
    case "chargeslash": case "charge": return `Damage ${D(sk.damage)} to ${D(sk.damage * 4)} (full charge)`;
    case "chargeshot": return `${dmg} · Stun ${s(sk.duration, 1)}`;
    case "reflect": return `Lasts ${s(sk.duration, 1)} · Shots fly back x${num(sk.damage)}`;
    case "sprint": return `+${num(((sk.width ?? 1.5) - 1) * 100)}% speed · Lasts ${s(sk.duration, 4)} · Next shot x3`;
    case "shadowstep": return `${dmg} · ${s(sk.duration, 3)} to flash back`;
    case "shuriken": case "knives": case "sparks": case "starfinger": case "missiles":
      return `${n ?? 1} shots · Damage ${D(sk.damage)} each`;
    case "shield": return `No damage for ${s(sk.duration, 2.5)}`;
    case "shieldcharge": return `${dmg} · Full charge stuns ${s(sk.duration, 2)}`;
    case "tree": return `Heals ${H(sk.damage)} HP a second per tree`;
    case "leafstorm": return `${dmg} · +${num((sk.width ?? 0.35) * 100)}% per tree`;
    case "empower": return `Next hit x${num(sk.damage)} · Stun ${s(sk.duration, 1.2)}`;
    case "boost": return `Up to +${n ?? 3} shots`;
    case "harden": return `-${num(sk.damage * 100)}% damage taken per stack · Up to ${n ?? 10}`;
    case "petrify": return `Stun ${s(sk.duration, 3)}`;
    case "error": return `Damage ${D(sk.damage)} per jump · Lasts ${s(sk.duration, 5)}`;
    case "reap": return `${dmg} · Heals ${H(sk.width ?? 0.06)} per foe hit · Up to ${n ?? 5} souls`;
    case "deathdoor": return `${dmg} · +${num((sk.width ?? 0.4) * 100)}% per soul · x2 under 35% HP`;
    case "roots": case "whip": return `${dmg} · Root ${s(sk.duration, 2)}`;
    case "gaia": return `Half damage taken · Heals ${H(sk.damage)} HP a second · Lasts ${s(sk.duration, 5)}`;
    case "rage": return `x${num(sk.damage)} damage, faster swings · Takes +15% damage · Lasts ${s(sk.duration, 6)}`;
    case "axethrow": return `Damage ${D(sk.damage)} going out and coming back`;
    case "jackbox": return `${dmg} · Stun ${s(sk.duration, 1)} · Up to ${sk.max ?? 3}`;
    case "switch": return `Confetti bomb damage ${D(sk.damage)}`;
    case "wall": return `${n ?? 5} rocks · ${ENEMIES.rockwall.hp} HP each · Lasts ${s(sk.duration, 6)}`;
    case "quake": return `Damage ${D(sk.damage)} every 0.4s · Slow · Lasts ${s(sk.duration, 2)}`;
    case "meteor": return `${dmg} · Burns ${s(sk.duration, 3)}`;
    case "flamedash": return `${dmg} · Fire ${D(sk.damage * 0.4)} every 0.5s for ${s(sk.duration, 3)}`;
    case "iceprison": return `${dmg} · Frozen ${s(sk.duration, 1.8)}`;
    case "blizzard": return `Damage ${D(sk.damage)} every 0.5s · Slow · Lasts ${s(sk.duration, 4)}`;
    case "dive": return `${dmg} · Stun 1s · In the air ${s(sk.duration, 1)}`;
    case "cyclone": return `${n ?? 3} spins · Damage ${D(sk.damage)} each`;
    case "barrage": return `${n ?? 6} punches · Damage ${D(sk.damage)} each`;
    case "titan": return `Giant for ${s(sk.duration, 10)} · Damage ${D(sk.damage)} per hit`;
    case "gatling": return `${Math.round((sk.duration ?? 1) / 0.1)} hits · Damage ${D(sk.damage)} each`;
    case "portal": return `Portals last ${s(sk.duration, 20)}${sk.waitGone ? " · Cooldown starts once they close" : ""}`;
    case "biglight": return `Bigger x1.8, half speed · Lasts ${s(sk.duration, 5)}`;
    case "grapple": return `Range ${sk.radius}`;
    case "trojan": return `${dmg} · Bursts after ${s(sk.duration, 10)}`;
    case "sticky": return `${dmg} · Blows up after ${s(sk.duration, 0.8)}`;
    case "totem": return `Heals ${H(sk.damage)} HP every 0.5s · Lasts ${s(sk.duration, 5)}`;
    case "invis": case "doves": return `Lasts ${s(sk.duration, 2)}`;
    case "bat": return `Heals ${num(sk.damage * 100)}% of damage dealt · Lasts ${s(sk.duration, 6)}`;
    case "bike": return `x${num(sk.width ?? 2.2)} speed · Ram damage ${D(sk.damage)}, stun 1s · Lasts ${s(sk.duration, 4)}`;
    case "excalibur": return `${n ?? 4} swords · Damage ${D(sk.damage)} per cut · Lasts ${s(sk.duration, 6)}`;
    case "sacrifice": return `Both lose ${num(sk.damage * 100)}% of max HP`;
    case "frost": return `${dmg} · Frozen ${s(sk.duration, 3)}`;
    case "castle": return `${dmg} · Stun ${s(sk.duration, 1)}`;
    case "summon": return `${n && n > 1 ? `${n} pets` : "Pet"} with ${num(sk.damage * 100)}% of his HP${sk.duration ? ` · Lasts ${s(sk.duration, 0)}` : ""}${sk.max && sk.max > 1 ? ` · Up to ${sk.max}` : ""}${sk.waitGone ? " · Cooldown starts once it falls" : ""}`;
    case "card": return `Card 1-9 takes ${num(sk.damage * 100 * bal * HERO_DAMAGE_SCALE)}%-${num(sk.damage * 900 * bal * HERO_DAMAGE_SCALE)}% of max HP`;
    case "revive": return `Lasts ${s(sk.duration, 5)}`;
    case "immortal": return `No damage for ${s(sk.duration, 3)} · Heals ${H(sk.damage)} HP a second`;
    case "latch": return `Drains ${D(sk.damage)} a second · Lasts ${s(sk.duration, 3)}`;
    case "mitosis": return `Up to ${n ?? 16} copies`;
    default:
      return sk.damage >= 1 ? dmg : "";
  }
}

function comboNumbers(steps: FxStep[], D: (v: number) => string, H: (v: number) => string): string {
  const out: string[] = [];
  for (const st of steps) {
    const times = st.times && st.times > 1 ? ` x${st.times}` : "";
    if (st.do === "buff") {
      const b: string[] = [];
      const pct = (v: number) => `${v > 0 ? "+" : ""}${num(v * 100)}%`;
      if (st.dmg) b.push(`${pct(st.dmg - 1)} damage`);
      if (st.speed) b.push(`${pct(st.speed - 1)} speed`);
      if (st.atk) b.push(`${pct(1 / st.atk - 1)} attack speed`);
      if (st.armor) b.push(`${pct(st.armor - 1)} damage taken`);
      if (st.leech) b.push(`heals ${num(st.leech * 100)}% of damage dealt`);
      if (st.regen) b.push(`heals ${H(st.regen)} a second`);
      if (st.invuln) b.push("can't be hurt");
      if (st.ccImmune) b.push("can't be stunned or slowed");
      out.push(`${b.join(", ")} for ${num(st.dur)}s`);
    } else if (st.do === "heal") out.push(`Heals ${H(st.pct)} HP`);
    else if (st.do === "shield") out.push(`No damage for ${num(st.dur)}s`);
    else if (st.do === "blink") continue;
    else if (st.do === "rewind") out.push(`Back to where he was ${num(st.secs)}s ago, with that HP`);
    else {
      const b: string[] = [];
      if (st.dmg) b.push(st.do === "shots" ? (st.n > 1 ? `${st.n} shots, damage ${D(st.dmg)} each` : `damage ${D(st.dmg)}`) : st.do === "field" ? `damage ${D(st.dmg)} every ${num(st.tick)}s` : `damage ${D(st.dmg)}`);
      else if (st.do === "shots" && st.n > 1) b.push(`${st.n} shots`);
      if (st.stun) b.push(`stun ${num(st.stun)}s`);
      if (st.root) b.push(`root ${num(st.root)}s`);
      if (st.slow) b.push(st.slowPct ? `slow ${num(st.slowPct * 100)}% ${num(st.slow)}s` : `slow ${num(st.slow)}s`);
      if (st.silence) b.push(`no skills ${num(st.silence)}s`);
      if (st.do === "push") b.push(`wall stun ${num(st.wallStun)}s`);
      if (st.do === "dash" && st.trail) b.push(`${st.trail.n} bombs, damage ${D(st.trail.dmg)} each`);
      if (st.do === "drop" && st.spots && st.spots > 1) b.push(`${st.spots} spots`);
      if (st.do === "shots" && st.bounce) b.push(`bounces ${st.bounce} times`);
      if (st.do === "shots" && st.split) b.push(`bursts into ${st.split.n}${st.split.stun ? `, stun ${num(st.split.stun)}s` : ""}`);
      if (st.do === "field" && st.heal) b.push(`heals ${H(st.heal)} every ${num(st.tick)}s`);
      if (st.do === "field") b.push(`lasts ${num(st.life)}s`);
      if (b.length) out.push(b.join(", ") + times);
    }
  }
  return out.map((t) => t[0].toUpperCase() + t.slice(1)).join(" · ");
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function skillBlock(id: string, hero: HeroDef, key: string, sk: SkillDef | undefined, text: string) {
  if (!sk) return "";
  const nums = skillNumbers(id, hero, sk);
  const t = sk.desc ?? text;
  const cap = t ? t[0].toUpperCase() + t.slice(1) : "";
  return `<div class="hi-skill"><div class="hi-key">${key}</div><div><div class="hi-sname">${esc(sk.name)} <span class="hi-cd">CD ${sk.cooldown}s</span></div><div class="hi-text">${esc(cap) || "-"}</div>${nums ? `<div class="hi-num">${esc(nums)}</div>` : ""}</div></div>`;
}

let styled = false;
function addStyles() {
  if (styled) return;
  styled = true;
  const st = document.createElement("style");
  st.textContent = `
  .hi-back { position: fixed; inset: 0; z-index: 1000; background: rgba(8,4,8,0.75); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .hi-box { width: min(460px, 100%); max-height: 90vh; overflow-y: auto; background: #241a20; border: 3px solid #ffd23f; box-shadow: 6px 6px 0 #1a0f14; color: #fff; padding: 16px; font-family: "Press Start 2P", monospace; font-size: 10px; line-height: 1.7; position: relative; }
  .hi-head { display: grid; grid-template-columns: 72px 1fr; gap: 12px; align-items: center; margin-bottom: 10px; }
  .hi-head canvas { width: 72px; height: 72px; image-rendering: pixelated; }
  .hi-name { color: #ffd23f; font-size: 13px; }
  .hi-cls { display: inline-block; padding: 1px 4px; background: var(--c); color: #1a0f14; margin-right: 6px; }
  .hi-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0 12px; text-align: center; }
  .hi-stats div { background: #1a0f14; padding: 4px 2px; }
  .hi-stats b { display: block; color: #ffd23f; font-size: 12px; }
  .hi-sec { color: #ffb070; margin-top: 8px; }
  .hi-skill { display: grid; grid-template-columns: 30px 1fr; gap: 10px; background: #1a0f14; padding: 8px; margin-top: 8px; }
  .hi-key { width: 28px; height: 28px; border: 2px solid #ffd23f; color: #ffd23f; display: flex; align-items: center; justify-content: center; font-size: 12px; }
  .hi-sname { color: #ffd23f; }
  .hi-cd { color: #a0a0b0; font-size: 9px; margin-left: 6px; }
  .hi-text { color: #e8dde2; }
  .hi-num { color: #7fe0ff; margin-top: 2px; }
  .hi-act { display: block; width: 100%; margin-top: 12px; padding: 10px; font-family: inherit; font-size: 11px; cursor: pointer; color: #fff; background: #e8487a; border: 2px solid #a82a52; border-radius: 4px; }
  .hi-act.on { background: #ffd23f; color: #1a1220; border-color: #b8901a; }
  .hi-act:disabled { background: #3a2e46; border-color: #4a3e56; color: #9a8aa8; cursor: default; }
  .hi-note { margin-top: 6px; font-size: 8px; color: #c9b8c0; text-align: center; }
  .hi-close { position: absolute; top: 8px; right: 8px; background: #3a2418; color: #fff; border: 2px solid #ffd23f; font-family: inherit; font-size: 10px; padding: 4px 8px; cursor: pointer; }
  `;
  document.head.append(st);
}

/** Opens the details popup for a hero (tap outside or CLOSE to close it). */
/** An extra button under the details (the Character screen's FAVORITE). */
export interface HeroInfoAction {
  label: string;
  on?: boolean; // shown as already done (gold)
  note?: string; // why it can't be pressed
  click?: () => void;
}

export function showHeroInfo(id: string, action?: HeroInfoAction) {
  const hero = HEROES[id as keyof typeof HEROES];
  if (!hero) return;
  addStyles();
  document.querySelector(".hi-back")?.remove();
  const parts = splitBlurb(hero);
  const cls = HERO_CLASSES.find((c) => c.id === heroClass(id))!;
  const rate = heroRatings(id);
  const back = document.createElement("div");
  back.className = "hi-back";
  const box = document.createElement("div");
  box.className = "hi-box";
  const ranged = hero.attack === "magic" || hero.attack === "rifle";
  box.innerHTML = `
    <button type="button" class="hi-close">CLOSE</button>
    <div class="hi-head"><div class="hi-pic"></div><div>
      <div class="hi-name">${esc(hero.name)}</div>
      <div>${"★".repeat(Math.min(5, hero.stars))}<span style="opacity:.3">${"★".repeat(Math.max(0, 5 - hero.stars))}</span></div>
      <div><span class="hi-cls" style="--c:${cls.color}">${cls.name}</span>${esc(hero.role)}</div>
      <div>HP ${hero.invincible ? "∞" : hero.maxHp}</div>
    </div></div>
    <div class="hi-stats">
      <div>HP<b>${rate.hp}</b></div><div>DMG<b>${rate.damage}</b></div><div>SPD<b>${rate.speed}</b></div><div>RANGE<b>${rate.range}</b></div>
    </div>
    <div class="hi-sec">BASIC ATTACK</div>
    <div class="hi-text">${esc(ATTACK_NAME[hero.attack] ?? hero.attack)}${ranged ? "" : hero.lineAttack ? " (straight kick)" : ""}. ${esc(parts.basic)}</div>
    <div class="hi-num">Damage ${num(hero.damage * (DAMAGE_BALANCE[id as HeroId] ?? 1) * HERO_DAMAGE_SCALE)} per hit · ${num(1 / hero.attackCooldown)} hits a second</div>
    <div class="hi-sec">SKILLS</div>
    ${skillBlock(id, hero, "Q", hero.skill, parts.q)}
    ${skillBlock(id, hero, "E", hero.skill2, parts.e)}`;
  box.querySelector(".hi-pic")!.append(heroPortrait(id));
  back.append(box);
  const close = () => back.remove();
  if (action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `hi-act${action.on ? " on" : ""}`;
    b.textContent = action.label;
    b.disabled = !action.click;
    box.append(b);
    if (action.note) box.insertAdjacentHTML("beforeend", `<div class="hi-note">${esc(action.note)}</div>`);
    b.addEventListener("click", () => {
      action.click?.();
      close();
    });
  }
  back.addEventListener("click", (ev) => {
    if (ev.target === back) close();
  });
  box.querySelector(".hi-close")!.addEventListener("click", close);
  document.body.append(back);
}
