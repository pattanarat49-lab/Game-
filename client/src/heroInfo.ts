import { HEROES, HERO_CLASSES, HeroDef, SkillDef, heroClass, heroRatings } from "../../shared/game";
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

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function skillBlock(key: string, sk: SkillDef | undefined, text: string) {
  if (!sk) return "";
  const t = sk.desc ?? text;
  const cap = t ? t[0].toUpperCase() + t.slice(1) : "";
  return `<div class="hi-skill"><div class="hi-key">${key}</div><div><div class="hi-sname">${esc(sk.name)} <span class="hi-cd">CD ${sk.cooldown}s</span></div><div class="hi-text">${esc(cap) || "-"}</div></div></div>`;
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
  .hi-note { color: #a0a0b0; font-size: 8px; margin-top: 10px; }
  .hi-close { position: absolute; top: 8px; right: 8px; background: #3a2418; color: #fff; border: 2px solid #ffd23f; font-family: inherit; font-size: 10px; padding: 4px 8px; cursor: pointer; }
  `;
  document.head.append(st);
}

/** Opens the details popup for a hero (tap outside or CLOSE to close it). */
export function showHeroInfo(id: string) {
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
    <div class="hi-sec">SKILLS</div>
    ${skillBlock("Q", hero.skill, parts.q)}
    ${skillBlock("E", hero.skill2, parts.e)}
    <div class="hi-note">Against other heroes (PvP, Duel, Squad, Classic) damage and % heals are much lower than against monsters.</div>`;
  box.querySelector(".hi-pic")!.append(heroPortrait(id));
  back.append(box);
  const close = () => back.remove();
  back.addEventListener("click", (ev) => {
    if (ev.target === back) close();
  });
  box.querySelector(".hi-close")!.addEventListener("click", close);
  document.body.append(back);
}
