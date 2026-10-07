import type { FxStep, HeroClass, HeroDef, SkillDef } from "./game";

// The big roster (user request 2026-10-05): heroes from the user's character sheets, under original names.
// Every skill here is a "combo" skill: a list of FX steps (see FxStep in game.ts) with its own colours.
// HP and damage are written before HP_SCALE / DAMAGE_BALANCE, like the heroes in game.ts.

type Basic = Pick<HeroDef, "attack" | "attackCooldown" | "damage" | "range" | "arc" | "aoe" | "shotSpeed" | "pierce"> &
  Partial<Pick<HeroDef, "shot" | "lineAttack" | "knock" | "slowHit">>;

const punch = (damage: number, attackCooldown = 0.45, range = 22, arc = 1.6): Basic => ({ attack: "punch", attackCooldown, damage, range, arc, aoe: 0, shotSpeed: 0, pierce: 0 });
const kick = (damage: number, attackCooldown = 0.5, range = 40): Basic => ({ ...punch(damage, attackCooldown, range, 0.4), lineAttack: 14 });
const blade = (damage: number, attackCooldown = 0.5, range = 30, arc = 2.2): Basic => ({ attack: "sword", attackCooldown, damage, range, arc, aoe: 0, shotSpeed: 0, pierce: 0 });
const shoot = (shot: string, damage: number, attackCooldown = 0.55, range = 230, shotSpeed = 300): Basic => ({ attack: "magic", shot, attackCooldown, damage, range, arc: 0, aoe: 0, shotSpeed, pierce: 0 });
/** A combo shot look: shape, colour, size. */
const orb = (color: string, size = 3) => `fxo:orb:${color}:${size}`;
const star = (color: string, size = 3) => `fxo:star:${color}:${size}`;
const spike = (color: string, size = 3) => `fxo:spike:${color}:${size}`;
const bladeShot = (color: string, size = 4) => `fxo:blade:${color}:${size}`;

/** How far a combo skill reaches, from its first step (bots use it when a foe is that close). */
function reach(steps: FxStep[]): number {
  for (const st of steps) {
    switch (st.do) {
      case "dash":
        return st.len;
      case "lane":
        return st.len;
      case "ring":
        return st.radius;
      case "cone":
        return st.range;
      case "shots":
        return st.range * 0.85;
      case "drop":
      case "field":
        return st.at === "self" ? st.radius : st.at === "target" ? 300 : typeof st.at === "object" ? st.at.upTo : st.at + st.radius * 0.5;
      case "lock":
        return st.range;
      case "blink":
        return st.to === "behind" ? st.range : 160;
    }
  }
  return 140; // buffs, heals and shields: used when a foe is close
}

type Skill = [name: string, cooldown: number, text: string, steps: FxStep[], botHp?: number];
const combo = ([name, cooldown, desc, steps, botHp]: Skill): SkillDef => ({ kind: "combo", name, cooldown, damage: 0, radius: reach(steps), steps, botHp, desc });

interface Entry {
  cls: HeroClass;
  /** Damage multiplier from the bot-duel tuning (DAMAGE_BALANCE). */
  bal: number;
  /** Bot-duel win rate after tuning (places the hero in the PvP ranking). */
  win: number;
  def: HeroDef;
}

/** A skill: combo steps, or a ready-made skill of its own kind. */
type AnySkill = Skill | SkillDef;
const toSkill = (k: AnySkill): SkillDef => (Array.isArray(k) ? combo(k) : k);
const nameOf = (k: AnySkill): string => (Array.isArray(k) ? k[0] : k.name);
const descOf = (k: AnySkill): string => (Array.isArray(k) ? k[2] : k.desc ?? "");

/** A combo skill held to charge (walking at `slow` of his speed): it hits harder the longer it charged. */
function charged(k: Skill, chargeTime: number, chargeSlow?: number): SkillDef {
  return { ...combo(k), chargeTime, chargeSlow };
}

function hero(cls: HeroClass, name: string, role: string, maxHp: number, basic: Basic, basicText: string, q: AnySkill, e: AnySkill | null, more: Partial<HeroDef> = {}): Entry {
  return {
    cls,
    bal: 1,
    win: 50,
    def: {
      name,
      role,
      blurb: `${basicText} ${nameOf(q)}: ${descOf(q)}${e ? ` ${nameOf(e)} (E): ${descOf(e)}` : ""}`,
      stars: 4,
      maxHp,
      speed: 100,
      ...basic,
      skill: toSkill(q),
      ...(e ? { skill2: toSkill(e) } : {}),
      ...more,
    },
  };
}

/** Queen's Bond's CURSED QUEEN: calls out the big curse (HP = this share of his max HP) for `duration`. */
const NO_SKILL: SkillDef = { kind: "passive", name: "NO SKILL YET", cooldown: 1, damage: 0, radius: 0, desc: "no skill yet: everything is in his sword." };
const DOGS_SKILL: SkillDef = { kind: "summon", name: "DIVINE DOGS", cooldown: 12, damage: 0.4, radius: 0, count: 1, duration: 10, pet: "whitewolf" as SkillDef["pet"], pet2: "blackwolf" as SkillDef["pet"], desc: "calls a white and a black shadow wolf for 10s: they run 1.5x as fast as a hero, chase down his foes and bite them." };
const RIKA_SKILL: SkillDef = { kind: "summon", name: "CURSED QUEEN", cooldown: 16, damage: 2, radius: 0, count: 1, duration: 10, pet: "rika" as SkillDef["pet"], desc: "calls out his giant curse queen for 10s (as much HP as twice his own): she follows him and smashes his foes with huge claws that knock them back, and fires PURE LOVE with him." };

/** ODM GEAR (same as the Giant Shifter's): a wire into the wall ahead, and he zips along it. */
const ODM_TEXT = "fires a wire into the wall (or rock) ahead and zips along it at high speed (0.5s cooldown).";
const ODM: SkillDef = { kind: "grapple", name: "ODM GEAR", cooldown: 0.5, damage: 0, radius: 260, desc: ODM_TEXT };
const odm: Skill = ["ODM GEAR", 0.5, ODM_TEXT, []];

const DOMAIN_EXPANSION_SKILL: SkillDef = { kind: "domainx", name: "DOMAIN EXPANSION", cooldown: 20, damage: 2, radius: 220, duration: 10, desc: "locks onto the nearest foe within 220 and pulls it into his domain for 10s: both vanish from the map and nobody else can get in; inside he hits twice as hard but cannot use FIRE ARROW." };
const FAKE_CLONE_SKILL: SkillDef = { kind: "fakeclone", name: "FAKE CLONE", cooldown: 10, damage: 0, radius: 220, count: 5, duration: 8, desc: "five clones of him run around him for 8s; they look just like him but deal no damage and vanish in one hit. When he uses SPIRAL SPHERE, every clone does it too, at the same foe." };
const PIANO_SKILL: SkillDef = { kind: "piano", name: "PIANO", cooldown: 10, damage: 60, radius: 200, count: 24, desc: "a piano appears in front of him and plays: 24 notes (C D E F G) fly out all around it one after another, each hitting very hard." };
const SWALLOW_SKILL: SkillDef = { kind: "copyskill", name: "SWALLOW", cooldown: 10, damage: 20, radius: 180, desc: "darkness grabs the nearest foe within 180 and copies its first skill; his next E uses that skill once." };
const SWAP_SKILL: SkillDef = { kind: "swapany", name: "SWAP", cooldown: 10, damage: 0, radius: 2000, desc: "swaps places with any hero on the map: drag the skill toward the one to swap with." };
const NAME_WRITTEN_SKILL: SkillDef = { kind: "deathnote", name: "NAME WRITTEN", cooldown: 12, damage: 0, radius: 280, duration: 10, desc: "writes in the notebook for 10s (a bar fills over his head and he walks 80% slower); when it is full, the nearest foe within 280 falls at once." };
const BLOOD_HAMMER_SKILL: SkillDef = { kind: "bloodhammer", name: "BLOOD HAMMER", cooldown: 12, damage: 0, radius: 0, duration: 7, desc: "pays 10% of her HP for a hammer of blood: her swings hit twice as hard and reach twice as far for 7s." };
const BLOOD_TRAP_SKILL: SkillDef = { kind: "bloodtrap", name: "BLOOD TRAP", cooldown: 8, damage: 60.2, radius: 160, desc: "pays 5% of her HP and leaves a trail of blood wherever she walks for 4s; press again to pull all the blood back to her at once: every drop that passes through a foe hits it." };
const EATER_SKILL: SkillDef = { kind: "eater", name: "EATER", cooldown: 11, damage: 0, radius: 160, desc: "swallows the ally he aims at (within 160): inside him it takes no damage at all, for as long as it likes; it comes back out when it presses any button." };
const MARKED_KUNAI_SKILL: SkillDef = { kind: "kunai", name: "MARKED KUNAI", cooldown: 8, damage: 20, radius: 250, width: 0.6, count: 3, desc: "throws three spread kunai that fly out, hurting every foe they pass through, and stick in where they stop (walls stop them); for 6s, press again to flash to the kunai a line points at (aim to pick it), up to 3 times. Then the cooldown starts." };

const ROSTER = {
  // ---------------------------------------------------------------- sheet 1
  nagi: hero("carry", "Ball Prodigy", "Striker", 95, shoot("ball", 22, 0.55, 220), "Kicks footballs.",
    ["DIRECT VOLLEY", 6, "one rocket of a shot that flies through up to 3 foes, knocks them flying and bounces off walls 5 times.", [
      { do: "shots", n: 1, spread: 0, speed: 1040, range: 900, pierce: 3, shape: "orb", size: 5, color: "ffffff", dmg: 82.5, knock: 2, bounce: 5 },
    ]],
    ["FLOW STATE", 11, "enters the flow: runs 35% faster and shoots 40% faster for 4s.", [
      { do: "buff", dur: 4, speed: 1.35, atk: 0.6, color: "3a8aff" },
      { do: "ring", radius: 30, look: "shock", color: "3a8aff" },
    ]]),
  roger: hero("fighter", "Pirate King", "Legend captain", 115, blade(32, 0.55, 32), "Cutlass swings.",
    ["DIVINE DEPARTURE", 7, "a flash of black haki that stuns close foes, then a huge red cut down the lane.", [
      { do: "ring", radius: 50, look: "shock", color: "202020", stun: 0.4 },
      { do: "lane", wait: 0.25, len: 180, width: 40, look: "slash", color: "ff3030", dmg: 80, knock: 1.5 },
    ]],
    ["KING'S WILL", 12, "a wave of will that stuns everything around for 1.2s, and he takes 30% less damage for 3s.", [
      { do: "ring", radius: 120, look: "shock", color: "8a00ff", dmg: 20, stun: 1.2 },
      { do: "buff", dur: 3, armor: 0.7, color: "8a00ff" },
    ]]),
  mihawk: hero("carry", "Hawkeye Swordsman", "World's best blade", 100, blade(37.5, 0.6, 44, 1.4), "Long black-blade swings.",
    ["BLACK BLADE WAVE", 6, "a huge crimson flying cut that passes through everything in its way.", [
      { do: "shots", n: 1, spread: 0, speed: 450, range: 320, pierce: 9, shape: "hawkwave", size: 28, hitSize: 24, color: "ff3050", dmg: 225 },
    ]],
    ["CROSS CUT", 10, "two wide sweeping cuts, one after the other, that send shots back the way they came; the second one stuns.", [
      { do: "cone", range: 90, arc: 2.8, reflect: true, color: "ff6080", dmg: 65, look: "hawkcut1" },
      { do: "cone", wait: 0.25, range: 90, arc: 2.8, reflect: true, color: "ff3050", dmg: 65, stun: 0.6, look: "hawkcut2" },
    ]]),
  sukuna: hero("fighter", "Cursed King", "King of curses", 105, { ...punch(30), knock: 0 }, "Cursed punches (no knockback).",
    // DOMAIN EXPANSION: `damage` = how much harder he hits inside; `radius` = how far the target can be.
    DOMAIN_EXPANSION_SKILL,
    ["FIRE ARROW", 13, "a burning arrow, then the aimed ground bursts into flames for 3s.", [
      { do: "shots", n: 1, spread: 0, speed: 420, range: 200, shape: "spike", size: 6, color: "ff6a00", dmg: 30 },
      { do: "field", wait: 0.4, at: 170, radius: 70, life: 3, tick: 0.5, look: "flames", color: "ff5a00", dmg: 18 },
    ]]),
  goku: hero("fighter", "Spirit Brawler", "Martial artist", 105, punch(30, 0.4), "Fast martial-arts punches.",
    charged(["SPIRIT WAVE", 7, "hold to charge (walking 40% slower) and aim; let go for a huge blue energy beam, stronger the longer the charge.", [
      { do: "lane", len: 260, width: 30, look: "beam", color: "40a8ff", dmg: 95 },
    ]], 1.5, 0.6),
    ["INSTANT STEP", 8, "teleports behind the nearest foe and blasts it away.", [
      { do: "blink", to: "behind", range: 250, color: "ffe060" },
      { do: "ring", radius: 40, look: "burst", color: "ffe060", dmg: 45, knock: 2 },
    ]]),
  naruto: hero("fighter", "Fox Ninja", "Loud ninja", 110, punch(28), "Ninja punches.",
    ["SPIRAL SPHERE", 6, "flickers forward with a spinning sphere that blows foes away.", [
      { do: "blink", to: "aim", range: 100, color: "ffa030" },
      { do: "ring", radius: 50, look: "spin", color: "3ad8ff", dmg: 70, knock: 3 },
    ]],
    // FAKE CLONE: `count` decoys for `duration` seconds.
    FAKE_CLONE_SKILL),
  angrybird: hero("assassin", "Furious Bird", "Angry red bird", 90, punch(26), "Pecks.",
    charged(["SLINGSHOT", 5, "sets up the sling and pulls back (standing still) while held; let go to launch across the lane and crash into everything, harder the longer the pull.", [
      { do: "dash", len: 220, width: 30, color: "ff3030", dmg: 50, knock: 2.5 },
    ]], 1.5, 0),
    ["EGG BOMB", 9, "an egg falls on the nearest foe and blows up, stunning.", [
      { do: "drop", at: "target", delay: 0.6, radius: 60, look: "meteor", color: "fff4d0", dmg: 70, stun: 0.8 },
    ]]),
  zoro: hero("fighter", "Three-Blade Ronin", "Lost swordsman", 110, blade(30, 0.45), "Three-sword swings.",
    ["DEMON CUT", 6, "dashes through the lane, then a spinning cut where he lands.", [
      { do: "dash", len: 150, width: 30, color: "30d060", dmg: 40 },
      { do: "ring", wait: 0.25, radius: 35, look: "spin", color: "30d060", dmg: 30 },
    ]],
    ["DRAGON TWISTER", 10, "spins into a tornado that drags foes in, then flings them out.", [
      { do: "ring", times: 4, gap: 0.3, radius: 60, look: "spin", color: "60ff90", dmg: 16, knock: -0.4 },
      { do: "ring", wait: 1.2, radius: 60, look: "burst", color: "60ff90", dmg: 30, knock: 3 },
    ]]),
  sanji: hero("fighter", "Kick Chef", "Cook who only kicks", 105, kick(30), "Straight kicks.",
    ["DEVIL LEG", 7, "three spinning kicks on fire.", [
      { do: "ring", times: 3, gap: 0.2, radius: 45, look: "spin", color: "ff6020", dmg: 25, knock: 0.5 },
    ]],
    ["SKY WALK", 7, "leaps through the air to the aimed spot and stomps down, stunning.", [
      { do: "blink", to: "aim", range: 140, color: "ffffff" },
      { do: "drop", at: "self", delay: 0.25, radius: 55, look: "fist", color: "ff8040", dmg: 60, stun: 0.7 },
    ]]),
  usopp: hero("carry", "Sling Sniper", "Liar with great aim", 90, shoot("pebble", 22, 0.5, 280), "Sling shots from far away.",
    ["FIRE BIRD STAR", 7, "a blast shaped like a red skull goes off on the aimed spot.", [
      { do: "drop", at: 160, delay: 0.5, radius: 65, look: "skull", color: "ff2020", dmg: 70 },
    ]],
    ["COCKROACH SHOT", 10, "a shot that bursts into cockroaches where it lands; anyone they touch freezes in fright for 2s.", [
      { do: "shots", n: 1, spread: 0, speed: 380, range: 200, shape: "orb", size: 5, color: "6a4020", dmg: 10, split: { n: 10, range: 70, speed: 200, shape: "roach", size: 3, color: "3a2010", stun: 2 } },
    ]]),
  chopper: hero("support", "Reindeer Doctor", "Tiny doctor", 100, punch(22), "Hoof punches.",
    ["RUMBLE BALL", 12, "turns huge: 40% less damage taken and 30% harder hits for 5s, and heals 6%.", [
      { do: "buff", dur: 5, armor: 0.6, dmg: 1.3, color: "ff80b0" },
      { do: "heal", pct: 0.15, color: "ff80b0" },
    ]],
    ["CHERRY CURE", 11, "heals himself and allies nearby 8%, and cherry petals keep healing for 3s.", [
      { do: "heal", pct: 0.2, radius: 120, color: "ff80c0" },
      { do: "field", at: "self", radius: 90, life: 3, tick: 0.5, look: "petals", color: "ff80c0", heal: 0.03 },
    ]]),
  nami: hero("mage", "Weather Witch", "Navigator", 90, shoot(orb("6ad0ff"), 22), "Weather orbs.",
    ["THUNDER TEMPO", 7, "lightning strikes the nearest foe, stunning.", [
      { do: "drop", at: "target", delay: 0.5, radius: 45, look: "bolt", color: "fff060", dmg: 60, stun: 0.8 },
    ]],
    ["MIRAGE CLOUD", 11, "a rain cloud over the aimed spot: hurts and slows for 4s.", [
      { do: "field", at: 140, radius: 80, life: 4, tick: 0.5, look: "storm", color: "8090b0", dmg: 12, slow: 1 },
    ]]),
  robin: hero("mage", "Bloom Scholar", "Archaeologist", 95, shoot(star("ff8ad8"), 22), "Petal stars.",
    ["CLUTCH", 7, "arms bloom on the nearest foe and lock it in place.", [
      { do: "lock", range: 220, look: "grab", color: "ff8ad8", dmg: 40, stun: 1.2 },
    ]],
    ["GIANT BLOOM", 12, "arms sprout around the nearest foe and hold it, then a giant hand slams down.", [
      { do: "field", at: "target", radius: 70, life: 1.4, tick: 0.4, look: "petals", color: "ff8ad8", dmg: 14, root: 0.5 },
      { do: "drop", at: "target", delay: 1.4, radius: 70, look: "fist", color: "ff8ad8", dmg: 50 },
    ]]),
  franky: hero("tank", "Cyborg Shipwright", "Cola-powered cyborg", 140, punch(32, 0.5), "Big steel fists.",
    ["RADICAL BEAM", 8, "a blue laser from his arms down the lane.", [
      { do: "lane", wait: 0.3, len: 240, width: 22, look: "beam", color: "40c8ff", dmg: 80 },
    ]],
    ["STRONG RIGHT", 6, "a rocket fist on a chain grabs the nearest foe and drags it to him.", [
      { do: "lock", range: 200, look: "chain", color: "ff4040", dmg: 45, drag: true },
    ]]),
  brook: hero("assassin", "Skeleton Bard", "Musician swordsman", 90, blade(24, 0.35), "Quick cane-sword cuts.",
    // PIANO: `count` notes, `damage` each, flying `radius` far.
    PIANO_SKILL,
    ["FROST CUT", 7, "dashes through the lane slowing and stunning what he cuts, and the cut freezes and bursts a moment later.", [
      { do: "dash", len: 170, width: 22, color: "a0f0ff", dmg: 30, slow: 2, stun: 0.8 },
      { do: "ring", wait: 0.8, radius: 40, look: "burst", color: "a0f0ff", dmg: 35 },
    ]]),
  jinbe: hero("tank", "Sea Knight", "Fishman karate master", 150, punch(30, 0.5), "Karate punches.",
    ["FISHMAN KARATE", 7, "a wave punch that throws everything in the lane back.", [
      { do: "lane", len: 180, width: 50, look: "wave", color: "3a8aff", dmg: 110, knock: 2.5 },
    ]],
    ["WHIRLPOOL", 12, "a whirlpool around him slows and hurts foes for 3s, and water shields him for 1.5s.", [
      { do: "shield", dur: 1.5, color: "3a8aff" },
      { do: "field", at: "self", radius: 100, life: 3, tick: 0.5, look: "water", color: "3a8aff", dmg: 8, slow: 1 },
    ]]),
  shanks: hero("carry", "Crimson Captain", "Red-haired captain", 105, blade(30, 0.5, 34), "Saber swings.",
    ["DIVINE SLASH", 7, "one long red slash down the lane.", [
      { do: "lane", len: 220, width: 26, look: "slash", color: "ff2020", dmg: 128 },
    ]],
    ["HAKI PRESSURE", 13, "his will stuns everyone around for 1s, then he attacks 30% faster for 3s.", [
      { do: "ring", radius: 140, look: "shock", color: "300010", dmg: 15, stun: 1 },
      { do: "buff", dur: 3, atk: 0.7, color: "ff2020" },
    ]]),
  kaido: hero("tank", "Beast Emperor", "Dragon king", 170, blade(42, 0.8, 34, 2), "Heavy club swings.",
    ["THUNDER CLUB", 7, "charges with the club through the lane, stunning, and the ground shakes where he stops.", [
      { do: "dash", len: 120, width: 34, color: "ffd040", dmg: 50, stun: 0.8 },
      { do: "ring", radius: 55, look: "shock", color: "ffd040", dmg: 30 },
    ]],
    ["DRAGON BREATH", 10, "breathes fire ahead three times.", [
      { do: "cone", times: 3, gap: 0.25, range: 140, arc: 0.8, color: "ff7020", dmg: 25 },
    ]]),
  bigmom: hero("tank", "Soul Empress", "Sweet-toothed empress", 160, punch(34, 0.55), "Heavy slaps.",
    ["SOUL STEAL", 9, "pulls at the souls ahead, hurting and slowing them, and heals herself 2.4%.", [
      { do: "cone", range: 130, arc: 1.2, color: "ff70c0", dmg: 30, slow: 2 },
      { do: "heal", pct: 0.06, color: "ff70c0" },
    ]],
    ["SUN & FLAMES", 12, "five little suns fly out all around her, and she burns everything close for 3s.", [
      { do: "shots", n: 5, spread: Math.PI * 2, speed: 200, range: 160, shape: "orb", size: 5, color: "ff7a20", dmg: 30 },
      { do: "field", at: "self", follow: true, radius: 50, life: 3, tick: 0.5, look: "flames", color: "ff7a20", dmg: 10 },
    ]]),
  whitebeard: hero("fighter", "Quake Captain", "Strongest man", 130, blade(36, 0.65, 38, 1.8), "Naginata swings.",
    charged(["SEA QUAKE", 7, "hold to wind up the naginata (walking slower); let go for a huge, wide, far-reaching quake swing that throws everything back, stronger the longer the wind-up.", [
      { do: "cone", range: 210, arc: 2.4, color: "e0f0ff", dmg: 75, knock: 3 },
    ]], 1.5),
    ["GREAT CRACK", 12, "the ground around him cracks three times, hurting and slowing.", [
      { do: "ring", times: 3, gap: 0.4, radius: 130, look: "shock", color: "f0f0ff", dmg: 20, slow: 1 },
    ]]),
  blackbeard: hero("tank", "Darkness Pirate", "Darkness eater", 150, punch(32, 0.5), "Dark punches.",
    ["BLACK HOLE", 9, "a black hole on the aimed spot pulls foes in and hurts them for 3s.", [
      { do: "field", at: 120, radius: 80, life: 3, tick: 0.3, look: "dark", color: "6020a0", dmg: 6, knock: -0.6 },
    ]],
    // SWALLOW: grabs the nearest foe within `radius` for `damage` and copies its first skill.
    SWALLOW_SKILL),
  sabo: hero("fighter", "Flame Revolutionary", "Chief of staff", 110, punch(30), "Dragon-claw strikes.",
    ["DRAGON CLAW", 5, "a burning claw strike ahead, and the ground there catches fire.", [
      { do: "cone", range: 70, arc: 1.4, color: "ff8020", dmg: 55, knock: 1.5 },
      { do: "field", at: 60, radius: 45, life: 1.5, tick: 0.5, look: "flames", color: "ff8020", dmg: 10 },
    ]],
    ["FLAME FIST", 10, "three fireballs that chase their targets.", [
      { do: "shots", n: 3, spread: 0.3, speed: 330, range: 260, shape: "orb", size: 5, color: "4aa8ff", dmg: 32, home: true },
    ]]),
  ace: hero("mage", "Blaze Fist", "Fire man", 100, shoot(orb("ff6000", 4), 24), "Fireballs.",
    ["FIRE FIST", 6, "a huge column of fire down the lane.", [
      { do: "lane", len: 230, width: 34, look: "beam", color: "ff6000", dmg: 75, knock: 1.5 },
    ]],
    ["FIREFLIES", 11, "ten little fire lights fly out around him and chase foes down.", [
      { do: "shots", n: 10, spread: Math.PI * 2, speed: 180, range: 180, shape: "orb", size: 2, color: "ffd040", dmg: 14, home: true },
    ]]),
  itachi: hero("mage", "Crow Ninja", "Prodigy of the eye", 95, shoot("shuriken", 22), "Shuriken.",
    ["BLACK FLAMES", 9, "stares at the nearest foe and sets black flames on it for 3s.", [
      { do: "lock", range: 240, look: "eye", color: "c00000", dmg: 20 },
      { do: "field", at: "target", radius: 40, life: 3, tick: 0.5, look: "flames", color: "200020", dmg: 14 },
    ]],
    ["CROW ILLUSION", 12, "foes around him are trapped in an illusion (stunned 1.4s) while he scatters into crows and reappears ahead.", [
      { do: "ring", radius: 90, look: "shock", color: "c00000", dmg: 10, stun: 1.4 },
      { do: "blink", wait: 0.1, to: "aim", range: 110, color: "101010" },
    ]]),
  kakashi: hero("assassin", "Copy Ninja", "Masked ninja", 95, blade(24, 0.35, 26), "Kunai cuts.",
    ["LIGHTNING BLADE", 6, "charges through the lane with a hand of lightning, stunning.", [
      { do: "dash", len: 160, width: 22, color: "80d0ff", dmg: 70, stun: 0.5 },
    ]],
    ["WARP EYE", 12, "phases out of reach for 0.8s while a warp vortex twists the nearest foe.", [
      { do: "buff", dur: 0.8, invuln: true, color: "8040c0" },
      { do: "drop", at: "target", delay: 0.8, radius: 40, look: "pillar", color: "8040c0", dmg: 80, knock: -1 },
    ]]),
  sasuke: hero("assassin", "Lightning Avenger", "Last of his clan", 95, blade(26, 0.4), "Katana cuts.",
    ["PURPLE FLAME", 6, "breathes a stream of purple fire ahead that burns and slows.", [
      { do: "cone", times: 4, gap: 0.12, range: 120, arc: 0.9, color: "a040ff", dmg: 16, slow: 1.5 },
    ]],
    ["LIGHTNING DASH", 9, "dashes through the lane wrapped in lightning: whoever he hits is stunned, then lightning strikes down on them.", [
      { do: "dash", len: 190, width: 28, color: "c0a0ff", dmg: 40, stun: 1 },
      { do: "drop", at: "target", delay: 0.35, radius: 40, look: "bolt", color: "c0a0ff", dmg: 70 },
    ]]),
  madara: hero("mage", "Ancient Warlord", "Ghost of the war", 110, shoot(orb("ff4000", 4), 26, 0.6), "Fire jutsu.",
    ["SKY METEOR", 12, "a meteor falls on the aimed spot.", [
      { do: "drop", at: 160, delay: 1.2, radius: 80, look: "meteor", color: "8a5a3a", dmg: 120, stun: 0.5 },
    ]],
    ["SPIRIT ARMOR", 14, "a blue spirit armour: half damage taken for 4s, and its arm swings ahead.", [
      { do: "buff", dur: 4, armor: 0.5, color: "3060ff" },
      { do: "cone", wait: 0.2, range: 120, arc: 1.3, color: "3060ff", dmg: 40 },
    ]]),
  obito: hero("assassin", "Masked Ninja", "Man behind the mask", 100, blade(26, 0.4), "Kunai cuts.",
    ["PHASE", 9, "everything passes through him for 1.5s, and he moves 30% faster.", [
      { do: "buff", dur: 1.5, invuln: true, speed: 1.3, color: "ff8020" },
    ]],
    ["WOOD SPIKES", 8, "a fan of wooden spikes that tie foes' legs.", [
      { do: "shots", n: 6, spread: 1, speed: 380, range: 200, shape: "spike", size: 4, color: "9a6a3a", dmg: 22, root: 0.5 },
    ]]),
  pain: hero("mage", "Rain Lord", "God of the rain village", 100, shoot(spike("404050"), 24), "Black rods.",
    ["ALMIGHTY PUSH", 8, "repels everything around him far away.", [
      { do: "ring", radius: 120, look: "shock", color: "e0d0ff", dmg: 40, knock: 4 },
    ]],
    ["UNIVERSAL PULL", 9, "a wide ring of gravity pulls every foe inside it right up to him and stuns them.", [
      { do: "ring", radius: 200, look: "pull", color: "6a5a8a", dmg: 20, stun: 0.6 },
    ]]),
  gaara: hero("tank", "Sand Ninja", "Sand gourd", 130, shoot(orb("d8b070"), 22, 0.6, 200), "Sand bullets.",
    ["SAND COFFIN", 8, "sand wraps the nearest foe and holds it, then crushes it.", [
      { do: "field", at: "target", radius: 40, life: 1.4, tick: 0.5, look: "sand", color: "d8b070", dmg: 10, root: 1.5 },
      { do: "drop", at: "target", delay: 1.4, radius: 45, look: "pillar", color: "d8b070", dmg: 70 },
    ]],
    ["SAND SHIELD", 10, "sand blocks all damage for 2s and swirls around him for 4s, slowing foes.", [
      { do: "shield", dur: 2, color: "d8b070" },
      { do: "field", at: "self", follow: true, radius: 50, life: 4, tick: 0.5, look: "sand", color: "d8b070", dmg: 6, slow: 1 },
    ]]),
  levi: hero("assassin", "Captain Blade", "Strongest soldier", 90, blade(24, 0.35), "Fast twin-blade cuts.",
    ["SPINNING CUT", 6, "rushes through the lane and spins where he lands.", [
      { do: "dash", len: 160, width: 30, color: "c0c0c0", dmg: 51.5 },
      { do: "ring", radius: 45, look: "spin", color: "ffffff", dmg: 51.5 },
    ]],
    odm, { skill2: ODM }),
  mikasa: hero("assassin", "Scarf Soldier", "Elite soldier", 95, blade(26, 0.4), "Twin-blade cuts.",
    ["THUNDER SPEAR", 8, "a spear sticks in the nearest foe, then explodes.", [
      { do: "lock", range: 230, look: "bolt", color: "ffd040", dmg: 20 },
      { do: "drop", at: "target", delay: 0.5, radius: 45, look: "pillar", color: "ffd040", dmg: 60 },
    ]],
    odm, { skill2: ODM }),
  tanjiro: hero("fighter", "Flowing Blade", "Demon slayer", 105, blade(28, 0.45), "Katana cuts.",
    ["WATER WHEEL", 6, "a rolling wave of a cut down the lane.", [
      { do: "lane", len: 160, width: 36, look: "wave", color: "3aa8ff", dmg: 55 },
    ]],
    ["SUN DANCE", 11, "a burst of sun flames, then every hit is 35% harder for 5s.", [
      { do: "ring", radius: 50, look: "burst", color: "ff7020", dmg: 30 },
      { do: "buff", dur: 5, dmg: 1.35, color: "ff7020" },
    ]]),
  inosuke: hero("assassin", "Boar Mask", "Wild boy", 95, blade(24, 0.4), "Jagged twin-blade cuts.",
    ["CRAZY CUTTING", 7, "five wild cuts ahead.", [
      { do: "cone", times: 5, gap: 0.1, range: 70, arc: 1.6, color: "b0c0d0", dmg: 36 },
    ]],
    ["WILD SENSE", 10, "feels out the nearest foe and slows it, and runs 40% faster for 3s.", [
      { do: "lock", range: 300, look: "eye", color: "ffffff", slow: 2 },
      { do: "buff", dur: 3, speed: 1.4, color: "8a8aa0" },
    ]]),
  nezuko: hero("fighter", "Demon Sister", "Demon girl", 110, kick(28), "Kicks.",
    ["BLOOD FLAME", 9, "her blood bursts into pink flames around her for 3s.", [
      { do: "field", at: "self", follow: true, radius: 55, life: 3, tick: 0.5, look: "flames", color: "ff3a8a", dmg: 12 },
    ]],
    ["DEMON FORM", 14, "grows into her demon form: heals 1.6% a second, hits 20% harder, runs 15% faster for 5s.", [
      { do: "buff", dur: 5, regen: 0.04, dmg: 1.2, speed: 1.15, color: "ff6aa0" },
    ]]),
  rengoku: hero("carry", "Flame Pillar", "Flame hashira", 105, blade(30, 0.5), "Flame-blade cuts.",
    ["RISING SUN", 6, "a rising flame cut ahead that leaves the ground burning.", [
      { do: "cone", range: 90, arc: 1, color: "ff8020", dmg: 50, knock: 1 },
      { do: "field", at: 60, radius: 45, life: 1.5, tick: 0.5, look: "flames", color: "ff8020", dmg: 10 },
    ]],
    ["PURGATORY", 12, "gathers his flame, then a blazing dash through the lane.", [
      { do: "dash", wait: 0.4, len: 200, width: 40, color: "ff5010", dmg: 95, knock: 2 },
      { do: "ring", wait: 0.42, radius: 40, look: "shock", color: "ffd040" },
    ]]),
  // ---------------------------------------------------------------- sheet 2 (Part 2)
  armin: hero("support", "Tactician", "Strategist", 90, shoot(orb("ffe060"), 20), "Flare shots.",
    ["COLOSSAL BLAST", 14, "turns into a giant for a moment: a huge blast all around him throws everything far away.", [
      { do: "buff", dur: 0.6, invuln: true, color: "ff8040" },
      { do: "drop", at: "self", delay: 0.6, radius: 110, look: "pillar", color: "ff8040", dmg: 90, knock: 3 },
    ]],
    ["BATTLE PLAN", 10, "spots the nearest foe's weak point (slowed 3s) and patches up himself and allies nearby 4%.", [
      { do: "lock", range: 300, look: "eye", color: "ffe060", dmg: 10, slow: 3 },
      { do: "heal", pct: 0.1, radius: 120, color: "ffe060" },
    ]]),
  todoroki: hero("mage", "Fire & Ice Hero", "Half-cold half-hot", 100, shoot(orb("8ad8ff"), 22), "Ice and fire shots in turn: blue ones slow 10%, red ones burn once more after the hit.",
    ["GLACIER", 7, "a wave of ice down the lane that freezes foes solid (stunned).", [
      { do: "lane", len: 200, width: 40, look: "wave", color: "a0e8ff", dmg: 40, stun: 1.2 },
    ]],
    ["FLASHFIRE", 8, "a blast of fire from his left side.", [
      { do: "cone", range: 150, arc: 0.9, color: "ff5020", dmg: 84 },
    ]]),
  bakugo: hero("fighter", "Blast Hero", "Explosive hothead", 105, punch(30), "Exploding punches.",
    ["AP SHOT", 6, "a narrow piercing blast straight down the lane that throws foes far back.", [
      { do: "lane", len: 200, width: 14, look: "beam", color: "ffb040", dmg: 70, knock: 4 },
    ]],
    ["HOWITZER", 9, "rockets forward and spins into a huge explosion.", [
      { do: "dash", len: 140, color: "ff8020", dmg: 20 },
      { do: "ring", wait: 0.1, radius: 70, look: "spin", color: "ffb040", dmg: 70, knock: 3 },
    ]]),
  allmight: hero("fighter", "Smiling Hero", "Symbol of peace", 120, punch(38, 0.5), "Mighty punches.",
    ["TEXAS SMASH", 7, "a punch so strong the air pressure throws everything ahead far back.", [
      { do: "cone", range: 160, arc: 0.7, color: "c8e0ff", dmg: 105, knock: 4 },
    ]],
    ["DETROIT TYPHOON", 12, "a typhoon of a punch down a wide lane, wherever he aims.", [
      { do: "lane", len: 280, width: 70, look: "wave", color: "e0f0ff", dmg: 90, knock: 5 },
    ]]),
  law: hero("mage", "Surgeon Pirate", "Surgeon of death", 100, blade(28, 0.5, 34), "Long nodachi cuts.",
    ["SHAMBLES", 9, "opens a ROOM and swaps the nearest foe right next to him, stunned.", [
      { do: "field", at: "self", radius: 130, life: 1, tick: 1, look: "light", color: "60c0ff" },
      { do: "lock", range: 250, look: "eye", color: "60c0ff", dmg: 30, stun: 0.5, drag: true },
    ]],
    // SWAP: anyone on the map; dragging the skill picks who.
    SWAP_SKILL),
  marco: hero("support", "Phoenix", "Blue-flame phoenix", 105, kick(26), "Talon kicks.",
    ["REBIRTH FLAME", 13, "blue flames heal him 10%, then 1.2% a second for 4s.", [
      { do: "heal", pct: 0.25, color: "40c8ff" },
      { do: "buff", dur: 4, regen: 0.03, color: "40c8ff" },
    ], 0.6],
    ["PHOENIX TALON", 7, "swoops through the lane, healing 2% as he goes.", [
      { do: "dash", len: 180, width: 30, color: "40c8ff", dmg: 50 },
      { do: "heal", pct: 0.05, color: "40c8ff" },
    ]]),
  kizaru: hero("carry", "Light Admiral", "Speed of light", 95, shoot(orb("ffe860"), 20, 0.4, 260, 500), "Light beams.",
    ["LIGHT KICK", 8, "a kick at the speed of light, flashing across the lane.", [
      { do: "dash", len: 240, width: 24, color: "fff080", dmg: 60 },
    ]],
    ["SACRED JEWELS", 2, "a beam of light straight down the lane.", [
      { do: "lane", len: 250, width: 14, look: "beam", color: "ffe860", dmg: 40 },
    ]]),
  aokiji: hero("mage", "Ice Admiral", "Lazy ice admiral", 105, shoot(spike("a0e8ff"), 22), "Ice spikes.",
    ["ICE AGE", 9, "freezes everything ahead solid for 1.2s.", [
      { do: "cone", range: 160, arc: 1.2, color: "c0f0ff", dmg: 30, stun: 1.2 },
    ]],
    ["ICE PHEASANT", 9, "a big bird of ice that flies through everything, slowing it.", [
      { do: "shots", n: 1, spread: 0, speed: 300, range: 280, pierce: 9, shape: "blade", size: 9, color: "a0e8ff", dmg: 55, slow: 3 },
    ]]),
  akainu: hero("fighter", "Magma Admiral", "Absolute justice", 120, punch(36, 0.5), "Magma punches.",
    ["GREAT ERUPTION", 8, "six magma fists burst out ahead.", [
      { do: "shots", n: 6, spread: 0.8, speed: 260, range: 220, shape: "orb", size: 5, color: "ff4010", dmg: 25 },
    ]],
    ["MAGMA BODY", 12, "his body turns to magma for 4s: burns everything close and takes 20% less damage.", [
      { do: "buff", dur: 4, armor: 0.8, color: "ff3000" },
      { do: "field", at: "self", follow: true, radius: 70, life: 4, tick: 0.5, look: "flames", color: "ff3000", dmg: 15 },
    ]]),
  hancock: hero("assassin", "Snake Empress", "Pirate empress", 95, kick(30), "Kicks.",
    ["SLAVE ARROW", 7, "shoots a fan of heart arrows that stun.", [
      { do: "shots", n: 7, spread: 1.2, speed: 400, range: 230, shape: "spike", size: 3, color: "ff60b0", dmg: 14, stun: 0.6 },
    ]],
    ["LOVE-LOVE BEAM", 12, "a heart-shaped beam that turns foes ahead to stone for 2s.", [
      { do: "cone", wait: 0.3, range: 150, arc: 1.2, color: "ff80c0", dmg: 20, stun: 2 },
    ]]),
  crocodile: hero("mage", "Sand King", "Desert warlord", 110, shoot(orb("c8a060"), 22), "Sand shots.",
    ["DESERT BLADE", 7, "a blade of sand that cuts the lane and dries foes out (slowed).", [
      { do: "lane", len: 220, width: 30, look: "wave", color: "c8a060", dmg: 55, slow: 2 },
    ]],
    ["SANDSTORM", 11, "a sand tornado on the aimed spot that pulls foes in for 4s.", [
      { do: "field", at: 130, radius: 70, life: 4, tick: 0.3, look: "sand", color: "c8a060", dmg: 6, knock: -0.3 },
    ]]),
  doflamingo: hero("mage", "String Puppeteer", "Heavenly demon", 105, shoot(spike("ffffff", 2), 22), "String bullets.",
    ["OVERHEAT", 6, "five strings whip down the lane one after another.", [
      { do: "lane", times: 5, gap: 0.06, len: 220, width: 10, look: "slash", color: "ff80c0", dmg: 14 },
    ]],
    ["BIRDCAGE", 13, "a small cage of strings around him for 4s: foes caught inside cannot walk out and get sliced.", [
      { do: "field", at: "self", radius: 85, life: 4, tick: 0.5, look: "web", color: "ff80c0", dmg: 14, cage: true },
    ]]),
  // ---------------------------------------------------------------- sheet 3 (Non One Piece)
  gon: hero("fighter", "Jungle Boy", "Wild hunter", 105, punch(30), "Punches.",
    ["ROCK!", 7, "one huge punch at once that bursts in a very small circle around him.", [
      { do: "ring", radius: 40, look: "burst", color: "ffd040", dmg: 110, knock: 3 },
    ]],
    ["GROWN UP", 15, "grows up all at once: 50% harder hits, 20% faster, 20% less damage taken for 4s.", [
      { do: "ring", radius: 60, look: "shock", color: "ffd040" },
      { do: "buff", dur: 4, dmg: 1.5, speed: 1.2, armor: 0.8, color: "ffd040" },
    ]]),
  hisoka: hero("assassin", "Bungee Clown", "Magician", 95, blade(26, 0.4, 28, 1.8), "Card-edge slashes up close.",
    ["ELASTIC LOVE", 7, "sticky gum snaps the nearest foe to him and stuns it.", [
      { do: "lock", range: 240, look: "chain", color: "ff60c0", dmg: 25, stun: 0.4, knock: -2 },
    ]],
    ["CARD TRICK", 9, "vanishes and pops up ahead, cards flying out all around.", [
      { do: "blink", to: "aim", range: 120, color: "ff60c0" },
      { do: "shots", n: 6, spread: Math.PI * 2, speed: 300, range: 150, shape: "star", size: 3, color: "ff60c0", dmg: 20 },
    ]]),
  kurapika: hero("support", "Chain Avenger", "Last of his clan", 100, blade(24, 0.4), "Chain strikes.",
    ["CHAIN JAIL", 9, "a chain binds the nearest foe: it can't walk for 2.5s.", [
      { do: "lock", range: 220, look: "chain", color: "c0c0d0", dmg: 20, root: 2.5 },
    ]],
    ["HOLY CHAIN", 12, "heals 8% and blocks all damage for 1s.", [
      { do: "heal", pct: 0.2, color: "80ffc0" },
      { do: "shield", dur: 1, color: "80ffc0" },
    ], 0.6]),
  leorio: hero("support", "Doctor Brawler", "Doctor to be", 110, punch(28), "Punches.",
    ["WARP PUNCH", 6, "punches into a portal: a fist hits the nearest foe out of nowhere.", [
      { do: "drop", at: "target", delay: 0.3, radius: 35, look: "fist", color: "80ff80", dmg: 55, stun: 0.5 },
    ]],
    ["FIRST AID", 11, "heals him and allies nearby 7.2%, then 0.8% a second for 4s.", [
      { do: "heal", pct: 0.18, radius: 120, color: "80ff80" },
      { do: "buff", dur: 4, regen: 0.02, color: "80ff80" },
    ], 0.7]),
  genos: hero("carry", "Cyborg Disciple", "Demon cyborg", 100, shoot(orb("ffb040"), 24, 0.45), "Arm cannon shots.",
    ["INCINERATE", 7, "a wide stream of fire from his arms.", [
      { do: "lane", wait: 0.2, len: 230, width: 36, look: "beam", color: "ff9020", dmg: 80 },
    ]],
    ["MACHINE GUN BLOWS", 8, "eight punches in a blur.", [
      { do: "cone", times: 8, gap: 0.06, range: 60, arc: 1, color: "ffd080", dmg: 10 },
    ]]),
  lelouch: hero("support", "Rebel Prince", "Masked rebel", 90, shoot(orb("c040ff"), 20), "Pistol shots.",
    ["ABSOLUTE ORDER", 10, "commands the nearest foe to stand still for 1.8s.", [
      { do: "lock", range: 260, look: "eye", color: "ff2040", dmg: 10, stun: 1.8 },
    ]],
    ["ARTILLERY", 10, "his knights shell the nearest foe four times.", [
      { do: "drop", times: 4, gap: 0.25, at: "target", delay: 0.4, radius: 30, look: "meteor", color: "6040c0", dmg: 25 },
    ]]),
  cc: hero("support", "Immortal Witch", "Pizza-loving witch", 100, shoot(orb("80ff80"), 20), "Witch shots.",
    ["SHOCK IMAGE", 9, "shows everyone around their worst memories: stunned 1s.", [
      { do: "ring", radius: 90, look: "shock", color: "80ff80", dmg: 15, stun: 1 },
    ]],
    ["UNDYING", 14, "heals 10%, then 6% a second for 4s.", [
      { do: "heal", pct: 0.25, color: "80ff80" },
      { do: "buff", dur: 4, regen: 0.15, color: "80ff80" },
    ], 0.6]),
  light: hero("mage", "Notebook Judge", "Self-made god", 90, shoot(orb("f0f0f0"), 20), "Pen shots.",
    // NAME WRITTEN: writes for `duration` s (walking 80% slower), then the nearest foe within `radius` falls.
    NAME_WRITTEN_SKILL,
    null),
  geto: hero("summoner", "Curse Collector", "Curse user", 100, shoot(orb("6a4a8a", 4), 22), "Curse shots.",
    ["CURSE SWARM", 8, "lets six cursed spirits loose to hunt foes down.", [
      { do: "shots", n: 6, spread: Math.PI * 2, speed: 160, range: 220, shape: "orb", size: 4, color: "6a4a8a", dmg: 22, home: true },
    ]],
    ["MAXIMUM SWIRL", 12, "squeezes his curses into one huge ball that rolls through everything.", [
      { do: "shots", wait: 0.5, n: 1, spread: 0, speed: 200, range: 250, pierce: 9, shape: "orb", size: 10, color: "302040", dmg: 90 },
    ]]),
  megumi: hero("summoner", "Shadow Summoner", "Ten shadows", 95, blade(24, 0.45), "Short blade cuts.",
    DOGS_SKILL,
    ["SHADOW GARDEN", 13, "floods the ground with shadow for 4s: foes slow down, he runs 30% faster.", [
      { do: "field", at: "self", radius: 100, life: 4, tick: 0.5, look: "dark", color: "202030", dmg: 8, slow: 1 },
      { do: "buff", dur: 4, speed: 1.3, color: "404060" },
    ]]),
  nobara: hero("carry", "Nail Hammer", "Straw-doll user", 95, shoot(spike("c0c0c0"), 22), "Hammered nails.",
    ["HAIRPIN", 7, "four nails fly out, then burst on the nearest foe.", [
      { do: "shots", n: 4, spread: 0.5, speed: 360, range: 220, shape: "spike", size: 3, color: "c0c0c0", dmg: 15 },
      { do: "drop", at: "target", delay: 0.5, radius: 40, look: "pillar", color: "ff6060", dmg: 40 },
    ]],
    ["RESONANCE", 10, "hammers a nail into a straw doll: the nearest foe feels it and is stunned.", [
      { do: "lock", range: 300, look: "chain", color: "ff4040", dmg: 60, stun: 0.6 },
    ]]),
  yuji: hero("fighter", "Divergent Fist", "Vessel boy", 110, punch(32), "Strong punches.",
    ["BLACK SPARK", 6, "a perfectly timed punch: black sparks and a huge hit.", [
      { do: "cone", wait: 0.15, range: 45, arc: 1.2, color: "202020", dmg: 100, knock: 2 },
      { do: "ring", wait: 0.15, radius: 30, look: "burst", color: "ff2040" },
    ]],
    ["DIVERGENT COMBO", 7, "three quick hits, then the cursed energy lands a moment later as a second impact.", [
      { do: "cone", times: 3, gap: 0.2, range: 45, arc: 1.4, color: "4060ff", dmg: 20 },
      { do: "cone", wait: 0.7, range: 45, arc: 1.4, color: "8090ff", dmg: 30 },
    ]]),
  denji: hero("fighter", "Chainsaw Boy", "Devil hunter", 105, blade(26, 0.3), "Chainsaw cuts.",
    ["CHAINSAW RUSH", 6, "three short rushes, saws first.", [
      { do: "dash", times: 3, gap: 0.15, len: 70, width: 30, color: "ff6020", dmg: 15 },
    ]],
    ["REV UP", 12, "revs the saws for 4s: 30% faster cuts that drink back 30% of their damage.", [
      { do: "buff", dur: 4, leech: 0.3, atk: 0.7, color: "ff4020" },
    ]]),
  makima: hero("mage", "Puppet Mistress", "Control devil", 100, shoot(orb("ff4060"), 22), "Finger shots.",
    ["BANG", 8, "points at the nearest foe and says bang.", [
      { do: "lock", wait: 0.3, range: 300, look: "eye", color: "ff4060", dmg: 80 },
    ]],
    ["KNEEL", 12, "the ground under the nearest foe forces it to kneel (can't walk 2s).", [
      { do: "field", at: "target", radius: 50, life: 2, tick: 0.5, look: "dark", color: "c03050", dmg: 10, root: 2 },
    ]]),
  power: hero("fighter", "Blood Fiend", "Loud fiend", 105, blade(30, 0.55), "Blood-hammer swings.",
    BLOOD_HAMMER_SKILL,
    // BLOOD TRAP: `damage` per drop of blood that passes through a foe on the way back.
    BLOOD_TRAP_SKILL),
  aki: hero("summoner", "Fox Contractor", "Devil hunter", 95, blade(26, 0.45), "Katana cuts.",
    ["FOX BITE", 7, "a giant fox head bites down on the nearest foe.", [
      { do: "drop", at: "target", delay: 0.5, radius: 50, look: "pillar", color: "ff9a40", dmg: 70 },
    ]],
    ["CURSE NAILS", 12, "pins a curse on the nearest foe: 1.2s later giant nails come down on it.", [
      { do: "lock", range: 220, look: "eye", color: "802020", dmg: 15 },
      { do: "drop", at: "target", delay: 1.2, radius: 35, look: "blade", color: "802020", dmg: 100 },
    ]]),
  ichigo: hero("carry", "Moon Fang", "Soul reaper", 105, blade(30, 0.5, 34), "Big-blade cuts.",
    ["MOON FANG", 6, "a wave of blue spirit energy down the lane that slows what it hits by 60%.", [
      { do: "lane", len: 240, width: 40, look: "wave", color: "3050ff", dmg: 75, slow: 2, slowPct: 0.6 },
    ]],
    ["SWORD DANCE", 13, "three slashing steps forward: everyone in the way is stunned, and nothing can stop or slow him while he dances.", [
      { do: "buff", dur: 1.2, ccImmune: true, color: "202020" },
      { do: "dash", times: 3, gap: 0.3, len: 60, width: 40, color: "202020", dmg: 30, stun: 0.6 },
    ]]),
  rukia: hero("mage", "Snow Dancer", "Ice soul reaper", 95, blade(26, 0.45), "Snow-white cuts.",
    ["FIRST DANCE", 8, "an ice circle on the aimed spot freezes foes' legs, then bursts.", [
      { do: "field", at: 120, radius: 60, life: 1, tick: 0.3, look: "ice", color: "e0f8ff", dmg: 20, root: 1 },
      { do: "drop", at: 120, delay: 1, radius: 60, look: "pillar", color: "e0f8ff", dmg: 60, stun: 0.5 },
    ]],
    ["WHITE RIPPLE", 7, "a white beam of cold straight ahead, slowing.", [
      { do: "lane", len: 220, width: 18, look: "beam", color: "e0f8ff", dmg: 60, slow: 2 },
    ]]),
  byakuya: hero("mage", "Petal Lord", "Noble captain", 100, blade(26, 0.45), "Precise cuts.",
    ["SCATTER", 7, "his blade scatters into a spray of petal blades.", [
      { do: "shots", n: 12, spread: 1.2, speed: 300, range: 200, shape: "blade", size: 2, color: "ff90c0", dmg: 9 },
    ]],
    ["THOUSAND PETALS", 12, "a storm of petal blades swirls around him for 3s.", [
      { do: "field", at: "self", follow: true, radius: 80, life: 3, tick: 0.25, look: "petals", color: "ff90c0", dmg: 7 },
    ]]),
  edward: hero("fighter", "Steel Alchemist", "Youngest state alchemist", 100, punch(30), "Automail punches.",
    ["TRANSMUTE SPIKES", 7, "claps his hands: stone spikes shoot out of the ground ahead.", [
      { do: "shots", n: 3, spread: 0.4, speed: 500, range: 160, shape: "spike", size: 6, color: "a09080", dmg: 30, knock: 2 },
    ]],
    ["STONE FIST", 9, "a giant stone fist shoots straight ahead and sweeps foes along; slammed into a wall, they are stunned for 1.5s.", [
      { do: "push", len: 220, width: 40, speed: 420, wallStun: 1.5, color: "a09080", dmg: 70 },
    ]]),
  alphonse: hero("tank", "Armor Brother", "Soul in armour", 150, punch(28, 0.55), "Iron punches.",
    ["ARMOR GUARD", 12, "blocks all damage for 1.8s for himself and allies nearby, then takes 40% less for 3s.", [
      { do: "shield", dur: 1.8, radius: 100, color: "a0b0c0" },
      { do: "buff", dur: 3, armor: 0.6, color: "a0b0c0" },
    ]],
    ["IRON CHARGE", 8, "charges through the lane, armour first.", [
      { do: "dash", len: 150, width: 36, color: "a0b0c0", dmg: 40, knock: 2.5, stun: 0.3 },
    ]]),
  gintoki: hero("fighter", "Silver Samurai", "Odd-jobs samurai", 105, blade(30, 0.5), "Wooden-sword swings.",
    ["BOKUTO BASH", 6, "a crushing wooden-sword hit that stuns.", [
      { do: "lane", len: 80, width: 50, look: "slash", color: "e0e0e0", dmg: 60, stun: 0.7 },
    ]],
    ["SUGAR RUSH", 12, "eats something sweet: heals 8% and runs 30% faster for 3s.", [
      { do: "heal", pct: 0.2, color: "ffe0f0" },
      { do: "buff", dur: 3, speed: 1.3, color: "ffe0f0" },
    ]]),
  kagura: hero("fighter", "Umbrella Girl", "Night-rabbit girl", 105, shoot(orb("ffa0a0"), 22, 0.4, 200), "Umbrella gun shots.",
    ["UMBRELLA BARRAGE", 7, "a burst of eight umbrella bullets.", [
      { do: "shots", n: 8, spread: 0.5, speed: 450, range: 220, shape: "orb", size: 2, color: "ffa0a0", dmg: 10 },
    ]],
    ["YATO SMASH", 8, "rushes in and kicks foes far away.", [
      { do: "dash", len: 120, width: 30, color: "ff6040", dmg: 30, knock: 1 },
      { do: "cone", range: 60, arc: 1.4, color: "ff6040", dmg: 50, knock: 3 },
    ]]),
  hijikata: hero("carry", "Demon Vice", "Vice commander", 100, blade(30, 0.5), "Katana cuts.",
    ["MAYO SHIELD", 12, "blocks all damage for 1.5s and heals 4%.", [
      { do: "shield", dur: 1.5, color: "fff0a0" },
      { do: "heal", pct: 0.1, color: "fff0a0" },
    ], 0.6],
    ["DEMON CUT", 9, "a wide cut, then 30% faster swings for 3s.", [
      { do: "cone", range: 80, arc: 1.6, color: "4040ff", dmg: 60, knock: 1 },
      { do: "buff", dur: 3, atk: 0.7, color: "4040ff" },
    ]]),
  mob: hero("mage", "Psychic Kid", "Psychic middle-schooler", 95, shoot(orb("a080ff"), 22), "Psychic shots.",
    ["PSYCHIC LIFT", 8, "lifts the nearest foe into the air and drops it, stunned.", [
      { do: "drop", at: "target", delay: 0.6, radius: 60, look: "pillar", color: "a080ff", dmg: 60, stun: 1 },
    ]],
    ["100%", 15, "hits 100%: a psychic explosion throws everything away, then 60% harder hits for 3s.", [
      { do: "ring", radius: 140, look: "psychic", color: "c060ff", dmg: 30, knock: 3 },
      { do: "buff", dur: 3, dmg: 1.6, armor: 0.7, color: "e0e0ff" },
    ]]),
  reigen: hero("support", "Fake Psychic", "Great psychic (not)", 95, punch(22), "Slaps.",
    ["SALT SPLASH", 7, "throws salt ahead: hurts and slows.", [
      { do: "cone", range: 100, arc: 0.9, color: "ffffff", dmg: 30, slow: 2 },
    ]],
    ["SPECIAL MASSAGE", 13, "heals himself and allies nearby 8% and shields them for 0.8s.", [
      { do: "heal", pct: 0.2, radius: 120, color: "80ffc0" },
      { do: "shield", dur: 0.8, radius: 120, color: "80ffc0" },
    ], 0.6]),
  rimuru: hero("support", "Slime Lord", "Reborn slime", 200, shoot(orb("60c0ff", 4), 22), "Water bullets.",
    ["PREDATOR", 9, "a mouth on the aimed spot swallows foes in for 2s, and he heals 3.2%.", [
      { do: "field", at: 110, radius: 60, life: 2, tick: 0.25, look: "dark", color: "3060c0", dmg: 8, knock: -0.6 },
      { do: "heal", pct: 0.08, color: "60c0ff" },
    ]],
    // EATER: an ally within `radius`, picked by the aim.
    EATER_SKILL),
  diablo: hero("mage", "Demon Butler", "Primordial demon", 100, shoot(orb("c02040"), 22), "Dark shots.",
    ["DEATH DANCE", 8, "two spinning dark sweeps around him.", [
      { do: "ring", times: 2, gap: 0.3, radius: 70, look: "spin", color: "800020", dmg: 30 },
    ]],
    ["TEMPTATION", 12, "a dark world around him for 3s: foes in it slow down and hurt.", [
      { do: "field", at: "self", radius: 130, life: 3, tick: 0.5, look: "dark", color: "400020", dmg: 10, slow: 2 },
    ]]),
  ainz: hero("mage", "Skeleton Overlord", "Undead king", 105, shoot(orb("8040c0", 4), 26, 0.65), "Death magic.",
    ["GRASP HEART", 9, "crushes the nearest foe's heart in his hand.", [
      { do: "lock", range: 260, look: "grab", color: "c00030", dmg: 80, stun: 0.6 },
    ]],
    ["FALLEN DOWN", 15, "a column of white light from the sky burns the aimed spot.", [
      { do: "drop", at: 150, delay: 1.5, radius: 90, look: "pillar", color: "ffffff", dmg: 140 },
    ]]),
  albedo: hero("tank", "Dark Succubus", "Guardian overseer", 150, blade(32, 0.6), "Bardiche swings.",
    ["WALL OF JUSTICE", 11, "blocks all damage for 2s and pushes foes back.", [
      { do: "shield", dur: 2, color: "6020a0" },
      { do: "ring", radius: 60, look: "shock", color: "6020a0", knock: 2 },
    ]],
    ["BARDICHE CHARGE", 8, "charges through the lane, stunning.", [
      { do: "dash", len: 140, width: 34, color: "6020a0", dmg: 55, stun: 0.5 },
    ]]),
  subaru: hero("support", "Loop Boy", "Returns by death", 95, punch(22), "Punches.",
    ["REWIND", 15, "turns back time on himself: his HP and where he stands go back to 2s ago, and he can't be hurt for 0.5s.", [
      { do: "rewind", secs: 2, color: "8080ff" },
      { do: "buff", dur: 0.5, invuln: true, color: "8080ff" },
    ], 0.4],
    ["SHADOW SMOKE", 10, "a cloud of shadow smoke slows foes for 2.5s while he slips away.", [
      { do: "field", at: "self", radius: 110, life: 2.5, tick: 0.5, look: "mist", color: "302040", dmg: 6, slow: 2 },
      { do: "blink", wait: 0.1, to: "aim", range: 120, color: "302040" },
    ]]),
  emilia: hero("mage", "Frost Elf", "Half-elf", 95, shoot(spike("c0e8ff"), 22), "Ice spikes.",
    ["ICE PILLARS", 7, "five ice pillars shoot out ahead, slowing.", [
      { do: "shots", n: 5, spread: 0.8, speed: 360, range: 200, shape: "spike", size: 5, color: "c0e8ff", dmg: 20, slow: 1 },
    ]],
    ["SPIRIT FROST", 12, "her spirit freezes the aimed spot for 4s.", [
      { do: "field", at: 130, radius: 80, life: 4, tick: 0.5, look: "ice", color: "c0e8ff", dmg: 10, slow: 1 },
    ]]),
  kirito: hero("carry", "Black Swordsman", "Beater", 100, blade(26, 0.4), "Dual-sword cuts.",
    ["STARBURST STREAM", 9, "a flurry of eight dual-sword cuts.", [
      { do: "cone", times: 8, gap: 0.08, range: 60, arc: 1.4, color: "80c0ff", dmg: 10 },
    ]],
    ["VORPAL STRIKE", 7, "a lunge through the lane.", [
      { do: "dash", len: 180, width: 22, color: "202040", dmg: 70 },
    ]]),
  asuna: hero("assassin", "Flash Fencer", "Lightning flash", 90, blade(22, 0.3, 30, 1), "Rapier thrusts.",
    ["FLASHING PENETRATOR", 6, "a lightning-fast lunge across the lane.", [
      { do: "dash", len: 220, width: 20, color: "fff0c0", dmg: 55 },
    ]],
    ["ROSARIO", 10, "five thrusts and a final big one.", [
      { do: "lane", times: 5, gap: 0.07, len: 90, width: 14, look: "slash", color: "fff0c0", dmg: 14 },
      { do: "lane", wait: 0.45, len: 120, width: 18, look: "slash", color: "ff80c0", dmg: 40 },
    ]]),
  minato: hero("assassin", "Yellow Flash", "Fastest ninja", 95, shoot(spike("ffe040"), 22), "Kunai.",
    ["FLYING THUNDER", 7, "teleports behind the nearest foe and strikes.", [
      { do: "blink", to: "behind", range: 300, color: "ffe040" },
      { do: "cone", range: 40, arc: 1.4, color: "ffe040", dmg: 60 },
    ]],
    // MARKED KUNAI: `count` kunai, `damage` each, thrown `radius` far over `width` radians.
    MARKED_KUNAI_SKILL),
  okarun: hero("assassin", "Ghost Boy", "Cursed kid", 95, punch(26), "Punches.",
    ["TURBO RUSH", 6, "races through the lane and keeps running 40% faster for 2s.", [
      { do: "dash", len: 260, width: 26, color: "60ff90", dmg: 45 },
      { do: "buff", dur: 2, speed: 1.4, color: "60ff90" },
    ]],
    ["CURSED FORM", 12, "his ghost form: 40% faster attacks that drink 20% back, for 4s.", [
      { do: "buff", dur: 4, atk: 0.6, leech: 0.2, color: "80ffa0" },
    ]]),
  momo: hero("support", "Psychic Girl", "Spirit medium", 95, shoot(orb("ffa0d0"), 20), "Psychic shots.",
    ["PSYCHIC HANDS", 8, "giant ghost hands drag the nearest foe to her.", [
      { do: "lock", range: 240, look: "grab", color: "ffa0d0", dmg: 20, drag: true },
    ]],
    ["SPIRIT BARRIER", 12, "a barrier blocks all damage for 1.5s for her and allies nearby, and heals them 4%.", [
      { do: "shield", dur: 1.5, radius: 120, color: "ffa0d0" },
      { do: "heal", pct: 0.1, radius: 120, color: "ffa0d0" },
    ]]),
  frieren: hero("mage", "Elf Mage", "Thousand-year elf", 95, shoot(orb("e0e0ff"), 26, 0.65, 260), "Magic bolts.",
    ["ZOLTRAAK", 3, "the killing magic: a magic circle fires a violet beam that goes through armour, shields and immortality.", [
      { do: "lane", len: 280, width: 14, look: "zoltrak", color: "b8a0ff", dmg: 87.5, ignoreArmor: true },
    ]],
    ["FLOWER FIELD", 13, "a field of mana flowers around her for 4s: hurts foes and heals friends.", [
      { do: "field", at: "self", radius: 100, life: 4, tick: 0.5, look: "flowerbed", color: "ffd0dc", dmg: 8, heal: 0.075 },
    ]]),
  fern: hero("carry", "Apprentice Mage", "Fastest caster", 90, shoot(orb("c080ff"), 18, 0.35, 240, 380), "Rapid magic bolts.",
    ["MACHINE ZOLTRAAK", 8, "ten killing-magic bolts in a stream.", [
      { do: "shots", times: 10, gap: 0.05, n: 1, spread: 0.15, speed: 420, range: 250, shape: "orb", size: 2, color: "c080ff", dmg: 9 },
    ]],
    ["HIDDEN MANA", 12, "stops hiding her mana: twice as fast casts and 20% faster steps for 4s.", [
      { do: "buff", dur: 4, atk: 0.5, speed: 1.2, color: "c080ff" },
    ]]),
  stark: hero("tank", "Timid Warrior", "Scared but strong", 140, blade(36, 0.7, 34), "Axe swings.",
    ["LIGHTNING STRIKE", 7, "shakes, then one tremendous axe blow.", [
      { do: "ring", radius: 30, look: "shock", color: "ffd040" },
      { do: "cone", wait: 0.5, range: 110, arc: 1.1, color: "ffd040", dmg: 85, knock: 2 },
    ]],
    ["SCARED STIFF", 11, "flinches so hard it hurts everyone close, and takes half damage for 3s.", [
      { do: "ring", radius: 50, look: "burst", color: "c08040", dmg: 30 },
      { do: "buff", dur: 3, armor: 0.5, color: "c08040" },
    ]]),
  anya: hero("support", "Mind Reader", "Telepath girl", 110, punch(26, 0.4), "Little punches.",
    ["WAKU WAKU", 12, "cheers everyone nearby: heals 6% and 30% faster for 3s.", [
      { do: "heal", pct: 0.15, radius: 120, color: "ff9ac0" },
      { do: "buff", dur: 3, speed: 1.3, color: "ff9ac0" },
    ]],
    ["PEANUT TOSS", 7, "a handful of peanuts that sting (short stun).", [
      { do: "shots", n: 6, spread: 1, speed: 300, range: 180, shape: "orb", size: 2, color: "d0a060", dmg: 18, stun: 0.5 },
    ]]),
  vegeta: hero("fighter", "Prince Warrior", "Proud prince", 105, punch(32), "Punches.",
    ["BIG BANG", 7, "a big ball of energy from one hand.", [
      { do: "shots", n: 1, spread: 0, speed: 300, range: 260, shape: "orb", size: 9, color: "60c0ff", dmg: 90 },
    ]],
    ["FINAL FLASH", 14, "gathers everything, then a giant yellow beam.", [
      { do: "ring", radius: 40, look: "shock", color: "ffe060" },
      { do: "lane", wait: 0.7, len: 300, width: 50, look: "beam", color: "ffe060", dmg: 120 },
    ]]),
  trunks: hero("assassin", "Future Swordsman", "From the future", 100, blade(28, 0.45), "Sword cuts.",
    ["BURNING ATTACK", 7, "three burning energy balls.", [
      { do: "shots", n: 3, spread: 0.3, speed: 350, range: 230, shape: "orb", size: 4, color: "ffd040", dmg: 25 },
    ]],
    ["SHINING SWORD", 9, "dashes in and cuts four times.", [
      { do: "dash", len: 140, width: 20, color: "80c0ff", dmg: 20 },
      { do: "cone", times: 4, gap: 0.07, range: 60, arc: 2, color: "80c0ff", dmg: 12 },
    ]]),
  frieza: hero("mage", "Galaxy Tyrant", "Emperor of the universe", 100, shoot(orb("ff60ff", 2), 20, 0.35, 260, 500), "Death beams.",
    ["DEATH SAUCERS", 8, "two spinning energy discs that chase foes and cut through everything.", [
      { do: "shots", n: 2, spread: 0.6, speed: 300, range: 280, pierce: 9, shape: "blade", size: 7, color: "ff60ff", dmg: 45, home: true },
    ]],
    ["DEATH BEAM", 8, "two thin piercing beams.", [
      { do: "lane", times: 2, gap: 0.25, len: 300, width: 6, look: "beam", color: "ff40ff", dmg: 64 },
    ]]),
  cell: hero("fighter", "Perfect Bio", "Perfect being", 115, punch(30), "Punches.",
    ["ABSORB", 9, "stabs the nearest foe with his tail and drinks 4% HP.", [
      { do: "lock", range: 160, look: "grab", color: "80c040", dmg: 45 },
      { do: "heal", pct: 0.1, color: "80c040" },
    ]],
    ["PERFECT BARRIER", 11, "a green barrier bursts out, blocking damage for 0.8s and throwing foes away.", [
      { do: "shield", dur: 0.8, color: "80ff60" },
      { do: "ring", radius: 90, look: "shock", color: "80ff60", dmg: 40, knock: 3 },
    ]]),
  yuno: hero("mage", "Wind Prodigy", "Wind spirit mage", 95, shoot(bladeShot("80ffa0", 3), 22), "Wind blades.",
    ["TORNADO", 9, "a tornado on the aimed spot pulls foes in for 2s.", [
      { do: "field", at: 130, radius: 60, life: 2, tick: 0.3, look: "storm", color: "80ffa0", dmg: 10, knock: -0.3 },
    ]],
    ["SPIRIT DIVE", 8, "rides the wind through the lane and spins.", [
      { do: "dash", len: 200, width: 30, color: "80ffa0", dmg: 40 },
      { do: "ring", radius: 50, look: "spin", color: "80ffa0", dmg: 20 },
    ]]),
  asta: hero("fighter", "Anti-Magic Boy", "Magicless knight", 110, blade(48, 0.55), "Big anti-magic sword swings.",
    ["ANTI-MAGIC CUT", 5, "a wide cut that also slices every shot in front of him; whoever it hits cannot use skills for 5s.", [
      { do: "cone", range: 80, arc: 1.6, color: "303030", dmg: 50, silence: 5 },
    ]],
    ["BLACK DIVIDER", 13, "black anti-magic covers him: 30% harder, 30% less damage taken for 4s, and he rushes in.", [
      { do: "buff", dur: 4, dmg: 1.3, armor: 0.7, color: "202020" },
      { do: "dash", len: 120, width: 30, color: "202020", dmg: 30 },
    ]]),
  yami: hero("carry", "Dark Captain", "Bull captain", 110, blade(32, 0.55, 34), "Katana cuts.",
    ["DIMENSION SLASH", 9, "a dark slash that cuts space itself down the whole lane.", [
      { do: "lane", wait: 0.25, len: 260, width: 18, look: "slash", color: "400060", dmg: 85 },
    ]],
    ["DARK CLOAK", 10, "darkness blocks all damage for 1s, then a wide dark sweep.", [
      { do: "shield", dur: 1, color: "300040" },
      { do: "cone", wait: 0.2, range: 90, arc: 2, color: "300040", dmg: 45 },
    ]]),
  shinra: hero("assassin", "Fire Kick", "Devil's footprints", 95, kick(26), "Fire kicks.",
    ["DEVIL'S FOOTPRINTS", 6, "blasts off his feet across the lane.", [
      { do: "dash", len: 240, width: 26, color: "ff6020", dmg: 40 },
    ]],
    ["RAPID KICKS", 9, "flies behind the nearest foe and kicks three times.", [
      { do: "blink", to: "behind", range: 240, color: "ff6020" },
      { do: "cone", times: 3, gap: 0.1, range: 50, arc: 1.2, color: "ff6020", dmg: 25 },
    ]]),
  koro: hero("support", "Octo Teacher", "Mach-20 teacher", 100, punch(22, 0.3), "Tentacle slaps.",
    ["MACH 20", 8, "zooms ahead hitting everything on the way, stands there for 1s, then zooms right back.", [
      { do: "dash", len: 200, width: 30, color: "ffe040", dmg: 35 },
      { do: "blink", wait: 1, to: "start", range: 0, color: "ffe040" },
    ]],
    ["TENTACLE CARE", 9, "three wide tentacle slaps, then patches himself up 7%.", [
      { do: "cone", times: 3, gap: 0.12, range: 70, arc: 2.2, color: "ffe040", dmg: 31.5 },
      { do: "heal", pct: 0.175, color: "ffe040" },
    ]]),
  // ---------------------------------------------------------------- sheet 4 (Non One Piece 50)
  gohan: hero("fighter", "Hidden Potential", "Scholar fighter", 105, punch(30), "Punches.",
    ["MASENKO", 6, "a yellow energy beam from both hands.", [
      { do: "lane", len: 230, width: 22, look: "beam", color: "ffe060", dmg: 70 },
    ]],
    ["BEAST AWAKENING", 14, "his hidden power bursts out: 40% harder hits and 0.8% heal a second for 4s.", [
      { do: "ring", radius: 60, look: "shock", color: "c0c0ff", dmg: 20 },
      { do: "buff", dur: 4, dmg: 1.4, regen: 0.02, color: "c0c0ff" },
    ]]),
  piccolo: hero("fighter", "Green Sage", "Wise warrior", 110, punch(28), "Punches.",
    charged(["PIERCING CANNON", 10, "hold to charge a finger (walking at half speed); let go for a thin spiralling beam through everything, much stronger at a full charge.", [
      { do: "lane", len: 300, width: 6, look: "bolt", color: "ffe040", dmg: 120 },
    ]], 1.5, 0.5),
    ["REGENERATION", 14, "regrows his wounds: heals 12%.", [
      { do: "heal", pct: 0.3, color: "50c050" },
    ], 0.5]),
  garou: hero("fighter", "Hero Hunter", "Monster martial artist", 105, punch(30, 0.4), "Fast punches.",
    ["FLOWING ROCK FIST", 7, "six flowing strikes in a blur.", [
      { do: "cone", times: 6, gap: 0.08, range: 50, arc: 1.4, color: "c0e0ff", dmg: 18 },
    ]],
    ["COSMIC FEAR", 13, "a burst of cosmic power stuns everyone around, and he takes 30% less damage for 3s.", [
      { do: "ring", radius: 100, look: "shock", color: "4020a0", dmg: 50, stun: 0.6 },
      { do: "buff", dur: 3, armor: 0.7, color: "4020a0" },
    ]]),
  sakura: hero("support", "Cherry Medic", "Medic ninja", 105, punch(32, 0.5), "Super-strong punches.",
    ["CHERRY IMPACT", 8, "smashes the ground: everything around flies away.", [
      { do: "drop", at: "self", delay: 0.2, radius: 80, look: "fist", color: "ff80b0", dmg: 60, knock: 2.5 },
    ]],
    ["MEDICAL PALM", 11, "heals herself and allies nearby 8.8%.", [
      { do: "heal", pct: 0.22, radius: 110, color: "80ffa0" },
    ], 0.7]),
  jiraiya: hero("mage", "Toad Sage", "Legendary sage", 105, shoot(orb("ff8040"), 22), "Fire shots.",
    ["TOAD OIL FLAME", 8, "spits fire on toad oil: flames ahead, and the ground burns for 2s.", [
      { do: "cone", range: 150, arc: 0.9, color: "ff6020", dmg: 40 },
      { do: "field", at: 100, radius: 50, life: 2, tick: 0.5, look: "flames", color: "ff6020", dmg: 12 },
    ]],
    ["NEEDLE HAIR", 10, "his hair turns hard, blocking damage for 0.6s, and shoots out as needles.", [
      { do: "shield", dur: 0.6, color: "ffffff" },
      { do: "shots", n: 10, spread: 1.4, speed: 380, range: 180, shape: "spike", size: 3, color: "ffffff", dmg: 9 },
    ]]),
  hinata: hero("assassin", "Gentle Palm", "Heir of the eye", 90, punch(24, 0.35), "Palm strikes.",
    ["64 PALMS", 8, "eight quick palm strikes that block the flow of chakra (slowed).", [
      { do: "cone", times: 8, gap: 0.07, range: 50, arc: 1, color: "a0a0ff", dmg: 8, slow: 1 },
    ]],
    ["TWIN LIONS", 9, "two lion-shaped palms burst out around her.", [
      { do: "ring", radius: 60, look: "shock", color: "a0a0ff", dmg: 50, knock: 2 },
    ]]),
  tengen: hero("fighter", "Sound Pillar", "Flashy swordsman", 110, blade(30, 0.5, 32), "Twin cleaver swings.",
    ["SOUND BOMBS", 8, "dashes through the lane cutting everything, dropping sound bombs all along the way that go off a moment later.", [
      { do: "dash", len: 170, width: 26, color: "ffd040", dmg: 30, trail: { n: 4, radius: 32, delay: 0.5, dmg: 28, look: "meteor" } },
    ]],
    ["SOUND SLASH", 12, "a wide slash ahead, then three sound bombs go off where the blades passed.", [
      { do: "cone", range: 80, arc: 2.4, color: "ffd040", dmg: 40 },
      { do: "drop", at: 60, spots: 3, delay: 0.4, radius: 32, look: "meteor", color: "ffd040", dmg: 28 },
    ]]),
  muichiro: hero("assassin", "Mist Pillar", "Mist hashira", 90, blade(26, 0.4), "Katana cuts.",
    ["OBSCURING CLOUDS", 10, "a wide fog rolls out around him for 3s: nobody inside can be seen except by him, foes inside take small hits and slow down, and he runs 30% faster.", [
      { do: "field", at: "self", radius: 160, life: 3, tick: 0.5, look: "fog", color: "c0f0f0", dmg: 6, slow: 2, fog: true },
      { do: "buff", dur: 3, speed: 1.3, color: "c0f0f0" },
    ]],
    ["MIST SPIN", 8, "two spinning mist cuts around him, slowing.", [
      { do: "ring", times: 2, gap: 0.25, radius: 60, look: "spin", color: "c0f0f0", dmg: 30, slow: 1 },
    ]]),
  shinobu: hero("assassin", "Insect Pillar", "Poison hashira", 85, blade(18, 0.3, 32, 0.8), "Stinger thrusts.",
    ["BUTTERFLY STING", 7, "darts through the lane, then poison eats at the nearest foe for 3s.", [
      { do: "dash", len: 180, width: 18, color: "c080ff", dmg: 30 },
      { do: "field", at: "target", radius: 30, life: 3, tick: 0.5, look: "mist", color: "80ff80", dmg: 14 },
    ]],
    ["CENTIPEDE DANCE", 9, "four zigzag stings in a row.", [
      { do: "dash", times: 4, gap: 0.12, len: 60, width: 18, color: "c080ff", dmg: 12 },
    ]]),
  akaza: hero("fighter", "Martial Demon", "Demon martial artist", 110, punch(30, 0.35), "Demon punches.",
    ["DESTRUCTIVE DEATH", 6, "air punches fly out ahead.", [
      { do: "shots", n: 6, spread: 0.8, speed: 450, range: 160, shape: "orb", size: 4, color: "40a0ff", dmg: 15 },
    ]],
    ["COMPASS NEEDLE", 13, "his fighting spirit compass: 1.2% heal a second and 25% faster blows for 5s.", [
      { do: "ring", radius: 50, look: "shock", color: "60c0ff" },
      { do: "buff", dur: 5, regen: 0.03, atk: 0.75, color: "60c0ff" },
    ]]),
  doma: hero("mage", "Ice Fan Demon", "Smiling demon", 100, shoot(bladeShot("c0e8ff", 3), 22), "Ice fan cuts.",
    ["WINTER ICICLES", 8, "four icicles fall from the sky around the spot he aims at (anywhere in his circle), slowing.", [
      { do: "drop", times: 4, gap: 0.2, at: { upTo: 220, scatter: 30 }, delay: 0.4, radius: 30, look: "icefall", color: "c0e8ff", dmg: 25, slow: 1 },
    ]],
    ["FROZEN LOTUS", 12, "an ice lotus blooms for 3s on the spot he picks in his circle (near or far), freezing feet.", [
      { do: "field", at: { upTo: 200 }, radius: 50, life: 3, tick: 0.5, look: "lotus", color: "c0e8ff", dmg: 10, root: 0.5 },
    ]]),
  mahito: hero("assassin", "Soul Shaper", "Cursed spirit", 100, punch(28), "Shape-shifting punches.",
    ["IDLE TRANSFIGURATION", 8, "touches the nearest foe's soul and twists it (slowed 3s).", [
      { do: "lock", range: 100, look: "grab", color: "80a0c0", dmg: 60, slow: 3 },
    ]],
    ["SOUL BULLETS", 9, "throws five twisted souls that chase foes.", [
      { do: "shots", n: 5, spread: 0.9, speed: 250, range: 200, shape: "orb", size: 6, color: "7080a0", dmg: 35, home: true },
    ]]),
  toji: hero("assassin", "Sorcerer Killer", "Heavenly restriction", 100, blade(30, 0.4), "Cursed-tool cuts.",
    ["INVERTED SPEAR", 6, "a lunge with the spear that cuts through anything.", [
      { do: "dash", len: 200, width: 20, color: "9060c0", dmg: 60 },
    ]],
    ["HEAVENLY BODY", 12, "his body takes over: 40% faster and 20% harder hits for 4s.", [
      { do: "buff", dur: 4, speed: 1.4, dmg: 1.2, color: "404040" },
    ]]),
  yuta: hero("carry", "Queen's Bond", "Special grade", 100, blade(28, 0.5), "Katana cuts.",
    ["CURSED QUEEN", 16, "calls out his giant curse queen for 10s: she follows him and smashes his foes with huge claws that knock them back.", [
      { do: "ring", radius: 50, look: "shock", color: "e0e0f0" },
    ]],
    ["PURE LOVE", 14, "one huge, strong pink beam of cursed energy, wherever he aims. If his Cursed Queen is out, she fires the same beam at the same target.", [
      { do: "lane", len: 280, width: 44, look: "pinkbeam", color: "ff60d0", dmg: 110 },
    ]], { skill: RIKA_SKILL }),
  maki: hero("fighter", "Cursed Tool Master", "Weapon expert", 105, blade(30, 0.45, 40, 1.4), "Polearm swings.",
    ["PLAYFUL CLOUD", 8, "three wide staff swings.", [
      { do: "cone", times: 3, gap: 0.15, range: 70, arc: 2.4, color: "c0c0a0", dmg: 25, knock: 1 },
    ]],
    ["SPEAR THROW", 7, "throws a spear that goes through three foes.", [
      { do: "shots", n: 1, spread: 0, speed: 520, range: 300, pierce: 3, shape: "spike", size: 7, color: "ffffff", dmg: 70 },
    ]]),
  ryuk: hero("mage", "Apple Shinigami", "Bored death god", 105, shoot(orb("ff2030"), 22), "Apples.",
    ["DEATH WINGS", 7, "flaps ahead and lands in a gust of death.", [
      { do: "blink", to: "aim", range: 180, color: "202030" },
      { do: "ring", radius: 50, look: "burst", color: "202030", dmg: 35 },
    ]],
    ["APPLE BINGE", 12, "eats apples: heals 8% and hits 30% harder for 3s.", [
      { do: "heal", pct: 0.2, color: "ff2030" },
      { do: "buff", dur: 3, dmg: 1.3, color: "ff2030" },
    ]]),
  roy: hero("mage", "Flame Alchemist", "Flame colonel", 100, shoot(orb("ff7020"), 24), "Small fire bursts.",
    ["SNAP", 6, "snaps his fingers: the air around the nearest foe explodes.", [
      { do: "drop", at: "target", delay: 0.25, radius: 45, look: "pillar", color: "ff7020", dmg: 60 },
    ]],
    ["FLAME WALL", 11, "a wave of fire down the lane that leaves a wall of flames for 3s.", [
      { do: "lane", len: 200, width: 50, look: "wave", color: "ff5010", dmg: 30 },
      { do: "field", at: 100, radius: 60, life: 3, tick: 0.5, look: "flames", color: "ff5010", dmg: 12 },
    ]]),
  // 2026-10-07 (user's picture and wave frames): the sea god.
  poseidon: hero("mage", "Poseidon", "God of the sea", 105, { ...blade(28, 0.55, 46, 0.6), attack: "punch", lineAttack: 16 }, "Trident thrusts down a lane.",
    ["WAVE CRASH", 8, "whips up a whirlpool around him, then hurls a huge wave down the lane: everything it crashes into is hit hard and slowed by 30% for 2.5s.", [
      { do: "lane", wait: 0.42, len: 250, width: 110, look: "tidal", color: "3a8cff", dmg: 85, slow: 2.5, slowPct: 0.3, knock: 1 },
      { do: "ring", radius: 70, look: "vortex", color: "3a8cff" },
    ]],
    ["WATER JET", 3, "dashes far ahead until a wall or an obstacle stops him, hitting every foe on the way; hitting a foe resets WAVE CRASH.", [
      { do: "dash", len: 380, width: 30, color: "3a8cff", dmg: 25, resetSkill1: true },
    ]],
    { laneParry: true }),
  // 2026-10-07 (user's sheet, ref Goo Kim, renamed): no skills yet, just a very strong, very fast, wide, long sword swing.
  penblade: hero("fighter", "Pen Blade", "Street swordsman", 110, blade(30, 0.3, 64, 3.0), "Very fast, very strong, wide sword swings that reach far.",
    NO_SKILL,
    null,
    { noSkills: true }),
  // 2026-10-07 (user's picture): the Shinsengumi captain. Okita Souji is a historical figure.
  souji: hero("assassin", "Okita Souji", "Shinsengumi first captain", 100, blade(28, 0.4, 34), "Quick katana cuts.",
    ["SANDANZUKI", 7, "three thrusts down the lane so fast they land almost as one; the third pierces armor and stuns 0.5s.", [
      { do: "lane", len: 120, width: 22, look: "slash", color: "7fc8ff", dmg: 30 },
      { do: "lane", wait: 0.06, len: 120, width: 22, look: "slash", color: "a0d8ff", dmg: 30 },
      { do: "lane", wait: 0.12, len: 120, width: 22, look: "slash", color: "ffffff", dmg: 30, ignoreArmor: true, stun: 0.5 },
    ]],
    ["SHUKUCHI", 9, "steps through space to the aimed spot, cutting everything around where he lands, then moves 40% faster and attacks faster for 3s.", [
      { do: "blink", to: "aim", range: 170, color: "7fc8ff" },
      { do: "ring", radius: 60, look: "spin", color: "7fc8ff", dmg: 35 },
      { do: "buff", dur: 3, speed: 1.4, atk: 0.6, color: "7fc8ff" },
    ]]),
  // 2026-10-07 (user's picture): the London fog killer. Jack the Ripper is a historical figure.
  ripper: hero("assassin", "Jack the Ripper", "Whitechapel phantom", 95, shoot(bladeShot("d0d0e0", 3), 18, 0.35, 180, 340), "Throws scalpels fast.",
    ["WHITECHAPEL FOG", 12, "breathes out a blood-red fog that follows him for 5s: foes inside can't see him and take damage every 0.5s, and his hits deal 50% more.", [
      { do: "field", at: "self", follow: true, radius: 120, life: 5, tick: 0.5, fog: true, look: "fog", color: "8a1020", dmg: 6 },
      { do: "buff", dur: 5, dmg: 1.5, color: "c01030" },
    ]],
    ["MARIA THE RIPPER", 10, "appears behind the nearest foe and cuts four times in a flash; the cuts slow by 50% for 2s.", [
      { do: "blink", to: "behind", range: 200, color: "c01030" },
      { do: "cone", times: 4, gap: 0.08, range: 50, arc: 2.5, color: "c01030", dmg: 20, slow: 2, slowPct: 0.5 },
    ]]),
} satisfies Record<string, Entry>;

/** Tuning results (DAMAGE_BALANCE, win %, stars) per hero, filled in from the bot duels. */
const TUNED: Record<string, [bal: number, win: number, stars: number]> = {
  penblade: [1, 55.6, 5],
  souji: [2.38, 47.4, 3], // 1.83 x1.3 (user buff)
  ripper: [2.48, 50.0, 4], // 1.91 x1.3 (user buff)
  poseidon: [2.28, 49.5, 3],
  ace: [2.87, 52.9, 4],
  ainz: [3.27, 52.9, 4],
  akainu: [3.0, 49.0, 3],
  akaza: [3.57, 49.0, 3],
  aki: [3.13, 52.9, 4],
  albedo: [2.02, 52.9, 4],
  allmight: [2.84, 53.9, 4],
  alphonse: [3.0, 51.0, 4],
  angrybird: [3.89, 51.0, 4],
  anya: [4.63, 49.0, 3],
  aokiji: [4.24, 50.5, 4],
  armin: [4.63, 51.0, 4],
  asta: [2.16, 50.0, 4],
  asuna: [2.83, 50.0, 4],
  bakugo: [3.27, 52.9, 4],
  bigmom: [2.92, 53.9, 4],
  blackbeard: [2.36, 52.0, 4],
  brook: [2.97, 50.0, 4],
  byakuya: [3.48, 49.0, 3],
  cc: [4.94, 47.5, 3],
  cell: [3.61, 48.0, 3],
  chopper: [4.63, 48.0, 3],
  crocodile: [3.15, 51.0, 4],
  denji: [2.36, 50.0, 4],
  diablo: [4.24, 50.0, 4],
  doflamingo: [3.41, 51.0, 4],
  doma: [2.52, 48.0, 3],
  edward: [4.25, 49.0, 3],
  emilia: [4.24, 51.0, 4],
  fern: [4.13, 45.1, 3],
  franky: [2.63, 52.0, 4],
  frieren: [3.93, 46.6, 3],
  frieza: [2.52, 48.5, 3],
  gaara: [2.11, 51.0, 4],
  garou: [3.57, 48.0, 3],
  genos: [3.09, 49.0, 3],
  geto: [3.97, 48.0, 3],
  gintoki: [2.36, 51.0, 4],
  gohan: [3.64, 52.0, 4],
  goku: [4.28, 48.0, 3],
  gon: [4.47, 49.0, 3],
  hancock: [2.31, 51.0, 4],
  hijikata: [2.63, 51.0, 4],
  hinata: [5.74, 48.0, 3],
  hisoka: [3.73, 50.0, 4],
  ichigo: [1.94, 52.0, 4],
  inosuke: [3.09, 52.9, 4],
  itachi: [4.06, 51.0, 4],
  jinbe: [2.44, 50.0, 4],
  jiraiya: [3.8, 50.0, 4],
  kagura: [3.8, 52.0, 4],
  kaido: [1.45, 50.0, 4],
  kakashi: [2.97, 47.1, 3],
  kirito: [2.69, 51.0, 4],
  kizaru: [3.12, 49.0, 3],
  koro: [4.63, 49.0, 3],
  kurapika: [3.34, 51.0, 4],
  law: [2.36, 51.0, 4],
  lelouch: [3.61, 49.0, 3],
  leorio: [3.57, 48.0, 3],
  levi: [3.64, 50.0, 4],
  light: [5.99, 50.0, 4],
  madara: [3.89, 47.1, 3],
  mahito: [4.15, 47.1, 3],
  maki: [1.96, 52.0, 4],
  makima: [3.0, 52.5, 4],
  marco: [1.94, 48.0, 3],
  megumi: [3.52, 47.1, 3],
  mihawk: [2.07, 50.0, 4],
  mikasa: [3.41, 52.9, 4],
  minato: [3.73, 52.0, 4],
  mob: [3.3, 56.4, 5],
  momo: [6.26, 49.5, 3],
  muichiro: [3.27, 52.0, 4],
  nagi: [5.26, 51.0, 4],
  nami: [3.13, 52.9, 4],
  naruto: [3.17, 49.0, 3],
  nezuko: [1.94, 48.0, 3],
  nobara: [3.37, 47.1, 3],
  obito: [3.0, 52.0, 4],
  okarun: [4.07, 52.9, 4],
  pain: [3.8, 50.0, 4],
  piccolo: [5.99, 47.1, 3],
  power: [2.77, 50.0, 4],
  reigen: [6.54, 50.0, 4],
  rengoku: [2.52, 48.0, 3],
  rimuru: [2.84, 51.0, 4],
  robin: [2.8, 48.0, 3],
  roger: [2.16, 49.0, 3],
  roy: [2.86, 47.5, 3],
  rukia: [2.31, 51.0, 4],
  ryuk: [4.54, 52.5, 4],
  sabo: [3.13, 47.1, 3],
  sakura: [4.07, 51.0, 4],
  sanji: [2.21, 52.9, 4],
  sasuke: [2.75, 52.0, 4],
  shanks: [2.12, 48.0, 3],
  shinobu: [3.89, 48.0, 3],
  shinra: [2.41, 49.0, 3],
  stark: [2.34, 50.0, 4],
  subaru: [5.99, 47.1, 3],
  sukuna: [3.57, 49.0, 3],
  tanjiro: [2.31, 48.0, 3],
  tengen: [2.31, 51.0, 4],
  todoroki: [3.23, 48.0, 3],
  toji: [2.36, 51.0, 4],
  trunks: [3.42, 52.9, 4],
  usopp: [4.64, 51.0, 4],
  vegeta: [4.73, 52.9, 4],
  whitebeard: [1.82, 48.0, 3],
  yami: [2.2, 52.0, 4],
  yuji: [5.84, 57.8, 5], // all damage x1.3 (user request 2026-10-06)
  yuno: [3.82, 51.0, 4],
  yuta: [1.78, 52.9, 4],
  zoro: [2.36, 47.1, 3],
};

for (const [id, e] of Object.entries(ROSTER)) {
  const t = TUNED[id];
  if (t) [e.bal, e.win, e.def.stars] = t;
}

/** Helpers the new heroes call out (not pickable). */
const SUMMONS = {
  // DIVINE DOGS: Shadow Summoner's two wolves, fast biters.
  whitewolf: {
    name: "White Shadow Wolf",
    role: "Summon",
    blurb: "",
    stars: 1,
    summon: true,
    maxHp: 1,
    speed: 150,
    walk: 1.5,
    attack: "punch",
    attackCooldown: 0.7,
    damage: 12,
    range: 26,
    arc: 1.8,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "passive", name: "", cooldown: 1, damage: 0, radius: 0 },
  },
  // DIVINE DOGS: Shadow Summoner's two wolves, fast biters.
  blackwolf: {
    name: "Black Shadow Wolf",
    role: "Summon",
    blurb: "",
    stars: 1,
    summon: true,
    maxHp: 1,
    speed: 150,
    walk: 1.5,
    attack: "punch",
    attackCooldown: 0.7,
    damage: 12,
    range: 26,
    arc: 1.8,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "passive", name: "", cooldown: 1, damage: 0, radius: 0 },
  },
  // CURSED QUEEN: Queen's Bond's giant curse; HP is a share of his max HP (the skill's damage).
  rika: {
    name: "Cursed Queen",
    role: "Summon",
    blurb: "",
    stars: 1,
    summon: true,
    maxHp: 1,
    speed: 105,
    attack: "punch",
    attackCooldown: 0.8,
    damage: 45,
    range: 34,
    arc: 2.2,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    knock: 2,
    skill: { kind: "passive", name: "", cooldown: 1, damage: 0, radius: 0 },
  },
} satisfies Record<string, HeroDef>;

export type NewHeroId = keyof typeof ROSTER | keyof typeof SUMMONS;
export const NEW_HEROES: Record<keyof typeof ROSTER, Entry> = ROSTER;
export function newHeroDefs(): Record<NewHeroId, HeroDef> {
  return { ...Object.fromEntries(Object.entries(ROSTER).map(([id, e]) => [id, e.def])), ...SUMMONS } as Record<NewHeroId, HeroDef>;
}
