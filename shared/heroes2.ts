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
        return st.at === "self" ? st.radius : st.at === "target" ? 300 : st.at + st.radius * 0.5;
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

function hero(cls: HeroClass, name: string, role: string, maxHp: number, basic: Basic, basicText: string, q: Skill, e: Skill, more: Partial<HeroDef> = {}): Entry {
  return {
    cls,
    bal: 1,
    win: 50,
    def: {
      name,
      role,
      blurb: `${basicText} ${q[0]}: ${q[2]} ${e[0]} (E): ${e[2]}`,
      stars: 4,
      maxHp,
      speed: 100,
      ...basic,
      skill: combo(q),
      skill2: combo(e),
      ...more,
    },
  };
}

const ROSTER = {
  // ---------------------------------------------------------------- sheet 1
  nagi: hero("carry", "Ball Prodigy", "Striker", 95, shoot("ball", 22, 0.55, 220), "Kicks footballs.",
    ["DIRECT VOLLEY", 6, "one rocket of a shot that flies through up to 3 foes and knocks them flying.", [
      { do: "shots", n: 1, spread: 0, speed: 520, range: 300, pierce: 3, shape: "orb", size: 5, color: "ffffff", dmg: 55, knock: 2 },
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
  mihawk: hero("carry", "Hawkeye Swordsman", "World's best blade", 100, blade(30, 0.6, 44, 1.4), "Long black-blade swings.",
    ["BLACK BLADE WAVE", 6, "a green flying cut that passes through everything in its way.", [
      { do: "shots", n: 1, spread: 0, speed: 450, range: 320, pierce: 9, shape: "blade", size: 7, color: "40ff60", dmg: 75 },
    ]],
    ["CROSS CUT", 10, "two long slashes, one after the other, the second one stunning.", [
      { do: "lane", len: 200, width: 20, look: "slash", color: "e0ffe0", dmg: 45 },
      { do: "lane", wait: 0.25, len: 200, width: 20, look: "slash", color: "40ff60", dmg: 45, stun: 0.6 },
    ]]),
  sukuna: hero("fighter", "Cursed King", "King of curses", 105, punch(30), "Cursed punches.",
    ["DISMANTLE", 5, "four invisible cuts down the lane, one after another.", [
      { do: "lane", times: 4, gap: 0.1, len: 160, width: 12, look: "slash", color: "ff2a2a", dmg: 22 },
    ]],
    ["FIRE ARROW", 13, "a burning arrow, then the aimed ground bursts into flames for 3s.", [
      { do: "shots", n: 1, spread: 0, speed: 420, range: 200, shape: "spike", size: 6, color: "ff6a00", dmg: 30 },
      { do: "field", wait: 0.4, at: 170, radius: 70, life: 3, tick: 0.5, look: "flames", color: "ff5a00", dmg: 18 },
    ]]),
  goku: hero("fighter", "Spirit Brawler", "Martial artist", 105, punch(30, 0.4), "Fast martial-arts punches.",
    ["SPIRIT WAVE", 7, "charges for a breath, then fires a huge blue energy beam.", [
      { do: "ring", radius: 30, look: "shock", color: "40a8ff" },
      { do: "lane", wait: 0.45, len: 260, width: 30, look: "beam", color: "40a8ff", dmg: 95 },
    ]],
    ["INSTANT STEP", 8, "teleports behind the nearest foe and blasts it away.", [
      { do: "blink", to: "behind", range: 250, color: "ffe060" },
      { do: "ring", radius: 40, look: "burst", color: "ffe060", dmg: 45, knock: 2 },
    ]]),
  naruto: hero("fighter", "Fox Ninja", "Loud ninja", 110, punch(28), "Ninja punches.",
    ["SPIRAL SPHERE", 6, "flickers forward with a spinning sphere that blows foes away.", [
      { do: "blink", to: "aim", range: 100, color: "ffa030" },
      { do: "ring", radius: 50, look: "spin", color: "3ad8ff", dmg: 70, knock: 3 },
    ]],
    ["CLONE BARRAGE", 10, "shadow clones drop out of the sky onto the nearest foe, three times.", [
      { do: "drop", times: 3, gap: 0.3, at: "target", delay: 0.4, radius: 35, look: "fist", color: "ffa030", dmg: 30 },
    ]]),
  angrybird: hero("assassin", "Furious Bird", "Angry red bird", 90, punch(26), "Pecks.",
    ["SLINGSHOT", 5, "launches itself across the lane, knocking everything aside.", [
      { do: "dash", len: 220, width: 30, color: "ff3030", dmg: 50, knock: 2.5 },
    ]],
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
    ["FIRE BIRD STAR", 7, "a flaming bird shot that pierces two foes.", [
      { do: "shots", n: 1, spread: 0, speed: 380, range: 320, pierce: 2, shape: "orb", size: 7, color: "ff6a00", dmg: 70 },
    ]],
    ["POP GREEN", 10, "plants thorny weeds on the aimed spot that tie the legs of foes for 3s.", [
      { do: "field", at: 140, radius: 60, life: 3, tick: 0.4, look: "web", color: "60d040", dmg: 6, root: 0.6 },
    ]]),
  chopper: hero("support", "Reindeer Doctor", "Tiny doctor", 100, punch(22), "Hoof punches.",
    ["RUMBLE BALL", 12, "turns huge: 40% less damage taken and 30% harder hits for 5s, and heals 15%.", [
      { do: "buff", dur: 5, armor: 0.6, dmg: 1.3, color: "ff80b0" },
      { do: "heal", pct: 0.15, color: "ff80b0" },
    ]],
    ["CHERRY CURE", 11, "heals himself and allies nearby 20%, and cherry petals keep healing for 3s.", [
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
    ["SOUL LULLABY", 10, "plays a lullaby: everyone around falls asleep (stunned) for 1.6s.", [
      { do: "ring", wait: 0.4, radius: 100, look: "shock", color: "80ffe0", dmg: 10, stun: 1.6 },
    ]],
    ["FROST CUT", 7, "dashes through the lane slowing what he cuts, and the cut freezes and bursts a moment later.", [
      { do: "dash", len: 170, width: 22, color: "a0f0ff", dmg: 30, slow: 2 },
      { do: "ring", wait: 0.8, radius: 40, look: "burst", color: "a0f0ff", dmg: 35 },
    ]]),
  jinbe: hero("tank", "Sea Knight", "Fishman karate master", 150, punch(30, 0.5), "Karate punches.",
    ["FISHMAN KARATE", 7, "a wave punch that throws everything in the lane back.", [
      { do: "lane", len: 180, width: 50, look: "wave", color: "3a8aff", dmg: 55, knock: 2.5 },
    ]],
    ["WHIRLPOOL", 12, "a whirlpool around him slows and hurts foes for 3s, and water shields him for 1.5s.", [
      { do: "shield", dur: 1.5, color: "3a8aff" },
      { do: "field", at: "self", radius: 100, life: 3, tick: 0.5, look: "water", color: "3a8aff", dmg: 8, slow: 1 },
    ]]),
  shanks: hero("carry", "Crimson Captain", "Red-haired captain", 105, blade(30, 0.5, 34), "Saber swings.",
    ["DIVINE SLASH", 7, "one long red slash down the lane.", [
      { do: "lane", len: 220, width: 26, look: "slash", color: "ff2020", dmg: 80 },
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
    ["SOUL STEAL", 9, "pulls at the souls ahead, hurting and slowing them, and heals herself 6%.", [
      { do: "cone", range: 130, arc: 1.2, color: "ff70c0", dmg: 30, slow: 2 },
      { do: "heal", pct: 0.06, color: "ff70c0" },
    ]],
    ["SUN & FLAMES", 12, "five little suns fly out all around her, and she burns everything close for 3s.", [
      { do: "shots", n: 5, spread: Math.PI * 2, speed: 200, range: 160, shape: "orb", size: 5, color: "ff7a20", dmg: 30 },
      { do: "field", at: "self", follow: true, radius: 50, life: 3, tick: 0.5, look: "flames", color: "ff7a20", dmg: 10 },
    ]]),
  whitebeard: hero("fighter", "Quake Captain", "Strongest man", 130, blade(36, 0.65, 38, 1.8), "Naginata swings.",
    ["SEA QUAKE", 7, "punches the air: a quake wave ahead throws everything back.", [
      { do: "cone", range: 170, arc: 1, color: "e0f0ff", dmg: 60, knock: 3 },
    ]],
    ["GREAT CRACK", 12, "the ground around him cracks three times, hurting and slowing.", [
      { do: "ring", times: 3, gap: 0.4, radius: 130, look: "shock", color: "f0f0ff", dmg: 20, slow: 1 },
    ]]),
  blackbeard: hero("tank", "Darkness Pirate", "Darkness eater", 150, punch(32, 0.5), "Dark punches.",
    ["BLACK HOLE", 9, "a black hole on the aimed spot pulls foes in and hurts them for 3s.", [
      { do: "field", at: 120, radius: 80, life: 3, tick: 0.3, look: "dark", color: "6020a0", dmg: 6, knock: -0.6 },
    ]],
    ["SWALLOW", 10, "a dark burst that stuns, and his hits drink back 40% of their damage for 4s.", [
      { do: "ring", radius: 50, look: "burst", color: "6020a0", dmg: 30, stun: 0.6 },
      { do: "buff", dur: 4, leech: 0.4, color: "6020a0" },
    ]]),
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
    ["THUNDER SPEAR", 6, "a spear of lightning down the lane, stunning.", [
      { do: "lane", len: 200, width: 16, look: "bolt", color: "a060ff", dmg: 65, stun: 0.5 },
    ]],
    ["SKY DRAGON", 13, "calls a lightning dragon down on the nearest foe.", [
      { do: "drop", at: "target", delay: 1, radius: 60, look: "bolt", color: "c0a0ff", dmg: 110, stun: 1 },
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
    ["UNIVERSAL PULL", 9, "pulls the nearest foe into his hand and stuns it.", [
      { do: "lock", range: 260, look: "chain", color: "6a5a8a", dmg: 20, stun: 0.6, drag: true },
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
      { do: "dash", len: 160, width: 30, color: "c0c0c0", dmg: 30 },
      { do: "ring", radius: 45, look: "spin", color: "ffffff", dmg: 30 },
    ]],
    ["WIRE SPIRAL", 9, "zips behind the nearest foe on wires and cuts three times.", [
      { do: "blink", to: "behind", range: 220, color: "c0c0c0" },
      { do: "lane", times: 3, gap: 0.12, len: 60, width: 50, look: "slash", color: "ffffff", dmg: 22 },
    ]]),
  mikasa: hero("assassin", "Scarf Soldier", "Elite soldier", 95, blade(26, 0.4), "Twin-blade cuts.",
    ["THUNDER SPEAR", 8, "a spear sticks in the nearest foe, then explodes.", [
      { do: "lock", range: 230, look: "bolt", color: "ffd040", dmg: 20 },
      { do: "drop", at: "target", delay: 0.5, radius: 45, look: "pillar", color: "ffd040", dmg: 60 },
    ]],
    ["DOUBLE RUSH", 6, "two quick dashes through the lane.", [
      { do: "dash", times: 2, gap: 0.25, len: 110, width: 26, color: "c02020", dmg: 32 },
    ]]),
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
      { do: "cone", times: 5, gap: 0.1, range: 70, arc: 1.6, color: "b0c0d0", dmg: 18 },
    ]],
    ["WILD SENSE", 10, "feels out the nearest foe and slows it, and runs 40% faster for 3s.", [
      { do: "lock", range: 300, look: "eye", color: "ffffff", slow: 2 },
      { do: "buff", dur: 3, speed: 1.4, color: "8a8aa0" },
    ]]),
  nezuko: hero("fighter", "Demon Sister", "Demon girl", 110, kick(28), "Kicks.",
    ["BLOOD FLAME", 9, "her blood bursts into pink flames around her for 3s.", [
      { do: "field", at: "self", follow: true, radius: 55, life: 3, tick: 0.5, look: "flames", color: "ff3a8a", dmg: 12 },
    ]],
    ["DEMON FORM", 14, "grows into her demon form: heals 4% a second, hits 20% harder, runs 15% faster for 5s.", [
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
    ["BATTLE PLAN", 10, "spots the nearest foe's weak point (slowed 3s) and patches up himself and allies nearby 10%.", [
      { do: "lock", range: 300, look: "eye", color: "ffe060", dmg: 10, slow: 3 },
      { do: "heal", pct: 0.1, radius: 120, color: "ffe060" },
    ]]),
  todoroki: hero("mage", "Fire & Ice Hero", "Half-cold half-hot", 100, shoot(orb("8ad8ff"), 22), "Ice shots.",
    ["GLACIER", 7, "a wave of ice down the lane that freezes foes' legs.", [
      { do: "lane", len: 200, width: 40, look: "wave", color: "a0e8ff", dmg: 40, root: 1.2 },
    ]],
    ["FLASHFIRE", 8, "a blast of fire from his left side.", [
      { do: "cone", range: 150, arc: 0.9, color: "ff5020", dmg: 70 },
    ]]),
  bakugo: hero("fighter", "Blast Hero", "Explosive hothead", 105, punch(30), "Exploding punches.",
    ["AP SHOT", 6, "a narrow piercing blast straight down the lane.", [
      { do: "lane", len: 200, width: 14, look: "beam", color: "ffb040", dmg: 70 },
    ]],
    ["HOWITZER", 9, "rockets forward and spins into a huge explosion.", [
      { do: "dash", len: 140, color: "ff8020", dmg: 20 },
      { do: "ring", wait: 0.1, radius: 70, look: "spin", color: "ffb040", dmg: 70, knock: 3 },
    ]]),
  allmight: hero("fighter", "Smiling Hero", "Symbol of peace", 120, punch(38, 0.5), "Mighty punches.",
    ["TEXAS SMASH", 7, "a punch so strong the air pressure throws everything ahead far back.", [
      { do: "cone", range: 160, arc: 0.7, color: "c8e0ff", dmg: 70, knock: 4 },
    ]],
    ["DETROIT TYPHOON", 12, "winds up, then a typhoon of a punch down a wide lane.", [
      { do: "ring", radius: 30, look: "shock", color: "ffd040" },
      { do: "lane", wait: 0.3, len: 280, width: 70, look: "wave", color: "e0f0ff", dmg: 60, knock: 5 },
    ]]),
  law: hero("mage", "Surgeon Pirate", "Surgeon of death", 100, blade(28, 0.5, 34), "Long nodachi cuts.",
    ["SHAMBLES", 9, "opens a ROOM and swaps the nearest foe right next to him, stunned.", [
      { do: "field", at: "self", radius: 130, life: 1, tick: 1, look: "light", color: "60c0ff" },
      { do: "lock", range: 250, look: "eye", color: "60c0ff", dmg: 30, stun: 0.5, drag: true },
    ]],
    ["GAMMA KNIFE", 10, "a blade of energy straight through the nearest foe's insides.", [
      { do: "lock", range: 200, look: "bolt", color: "80ff80", dmg: 90 },
    ]]),
  marco: hero("support", "Phoenix", "Blue-flame phoenix", 105, kick(26), "Talon kicks.",
    ["REBIRTH FLAME", 13, "blue flames heal him 25%, then 3% a second for 4s.", [
      { do: "heal", pct: 0.25, color: "40c8ff" },
      { do: "buff", dur: 4, regen: 0.03, color: "40c8ff" },
    ], 0.6],
    ["PHOENIX TALON", 7, "swoops through the lane, healing 5% as he goes.", [
      { do: "dash", len: 180, width: 30, color: "40c8ff", dmg: 50 },
      { do: "heal", pct: 0.05, color: "40c8ff" },
    ]]),
  kizaru: hero("carry", "Light Admiral", "Speed of light", 95, shoot(orb("ffe860"), 20, 0.4, 260, 500), "Light beams.",
    ["LIGHT KICK", 6, "a kick at the speed of light, flashing across the lane.", [
      { do: "dash", len: 240, width: 24, color: "fff080", dmg: 60 },
    ]],
    ["SACRED JEWELS", 9, "a spray of nine light bullets.", [
      { do: "shots", n: 9, spread: 0.9, speed: 520, range: 250, shape: "orb", size: 3, color: "ffe860", dmg: 16 },
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
    ["BIRDCAGE", 13, "a cage of strings around him slices everything inside for 4s.", [
      { do: "field", at: "self", radius: 140, life: 4, tick: 0.5, look: "web", color: "ff80c0", dmg: 14 },
    ]]),
  // ---------------------------------------------------------------- sheet 3 (Non One Piece)
  gon: hero("fighter", "Jungle Boy", "Wild hunter", 105, punch(30), "Punches.",
    ["ROCK!", 7, "charges his fist for a breath, then one huge punch.", [
      { do: "ring", radius: 25, look: "shock", color: "ffd040" },
      { do: "cone", wait: 0.6, range: 60, arc: 1, color: "ffd040", dmg: 110, knock: 3 },
    ]],
    ["GROWN UP", 15, "grows up all at once: 50% harder hits, 20% faster, 20% less damage taken for 4s.", [
      { do: "ring", radius: 60, look: "shock", color: "ffd040" },
      { do: "buff", dur: 4, dmg: 1.5, speed: 1.2, armor: 0.8, color: "ffd040" },
    ]]),
  hisoka: hero("assassin", "Bungee Clown", "Magician", 95, shoot(star("ff60c0"), 22), "Throwing cards.",
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
    ["HOLY CHAIN", 12, "heals 20% and blocks all damage for 1s.", [
      { do: "heal", pct: 0.2, color: "80ffc0" },
      { do: "shield", dur: 1, color: "80ffc0" },
    ], 0.6]),
  leorio: hero("support", "Doctor Brawler", "Doctor to be", 110, punch(28), "Punches.",
    ["WARP PUNCH", 6, "punches into a portal: a fist hits the nearest foe out of nowhere.", [
      { do: "drop", at: "target", delay: 0.3, radius: 35, look: "fist", color: "80ff80", dmg: 55, stun: 0.5 },
    ]],
    ["FIRST AID", 11, "heals him and allies nearby 18%, then 2% a second for 4s.", [
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
      { do: "heal", pct: 0.1, color: "80ff80" },
      { do: "buff", dur: 4, regen: 0.06, color: "80ff80" },
    ], 0.6]),
  light: hero("mage", "Notebook Judge", "Self-made god", 90, shoot(orb("f0f0f0"), 20), "Pen shots.",
    ["NAME WRITTEN", 12, "writes the nearest foe's name: 2s later its heart gives out.", [
      { do: "lock", range: 280, look: "eye", color: "ff2020", dmg: 10 },
      { do: "drop", at: "target", delay: 2, radius: 30, look: "pillar", color: "202020", dmg: 120 },
    ]],
    ["GOD'S SHADOW", 11, "a dark shadow on the aimed spot slows and hurts foes for 3s.", [
      { do: "field", at: 120, radius: 60, life: 3, tick: 0.5, look: "dark", color: "302030", dmg: 8, slow: 2 },
    ]]),
  geto: hero("summoner", "Curse Collector", "Curse user", 100, shoot(orb("6a4a8a", 4), 22), "Curse shots.",
    ["CURSE SWARM", 8, "lets six cursed spirits loose to hunt foes down.", [
      { do: "shots", n: 6, spread: Math.PI * 2, speed: 160, range: 220, shape: "orb", size: 4, color: "6a4a8a", dmg: 22, home: true },
    ]],
    ["MAXIMUM SWIRL", 12, "squeezes his curses into one huge ball that rolls through everything.", [
      { do: "shots", wait: 0.5, n: 1, spread: 0, speed: 200, range: 250, pierce: 9, shape: "orb", size: 10, color: "302040", dmg: 90 },
    ]]),
  megumi: hero("summoner", "Shadow Summoner", "Ten shadows", 95, blade(24, 0.45), "Short blade cuts.",
    ["DIVINE DOGS", 7, "two shadow dogs chase down foes.", [
      { do: "shots", n: 2, spread: 0.4, speed: 280, range: 220, shape: "spike", size: 6, color: "303040", dmg: 35, home: true },
    ]],
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
    ["BLOOD HAMMER", 7, "a giant blood hammer slams down ahead, stunning.", [
      { do: "drop", at: 70, delay: 0.3, radius: 55, look: "fist", color: "c01020", dmg: 75, stun: 0.5 },
    ]],
    ["BLOOD SPEARS", 8, "five blood spears fly out, and she drinks back 5% HP.", [
      { do: "shots", n: 5, spread: 0.7, speed: 380, range: 220, shape: "spike", size: 4, color: "c01020", dmg: 22 },
      { do: "heal", pct: 0.05, color: "c01020" },
    ]]),
  aki: hero("summoner", "Fox Contractor", "Devil hunter", 95, blade(26, 0.45), "Katana cuts.",
    ["FOX BITE", 7, "a giant fox head bites down on the nearest foe.", [
      { do: "drop", at: "target", delay: 0.5, radius: 50, look: "pillar", color: "ff9a40", dmg: 70 },
    ]],
    ["CURSE NAILS", 12, "pins a curse on the nearest foe: 1.2s later giant nails come down on it.", [
      { do: "lock", range: 220, look: "eye", color: "802020", dmg: 15 },
      { do: "drop", at: "target", delay: 1.2, radius: 35, look: "blade", color: "802020", dmg: 100 },
    ]]),
  ichigo: hero("carry", "Moon Fang", "Soul reaper", 105, blade(30, 0.5, 34), "Big-blade cuts.",
    ["MOON FANG", 6, "a wave of blue spirit energy down the lane.", [
      { do: "lane", len: 240, width: 40, look: "wave", color: "3050ff", dmg: 75 },
    ]],
    ["HOLLOW MASK", 13, "puts on the mask: 30% harder, 20% faster, faster swings for 5s.", [
      { do: "buff", dur: 5, dmg: 1.3, speed: 1.2, atk: 0.8, color: "202020" },
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
    ["STONE FIST", 9, "a giant stone fist rises out of the ground ahead.", [
      { do: "drop", at: 110, delay: 0.4, radius: 50, look: "fist", color: "a09080", dmg: 70, stun: 0.8 },
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
    ["SUGAR RUSH", 12, "eats something sweet: heals 20% and runs 30% faster for 3s.", [
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
    ["MAYO SHIELD", 12, "blocks all damage for 1.5s and heals 10%.", [
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
      { do: "ring", radius: 140, look: "shock", color: "e0e0ff", dmg: 30, knock: 3 },
      { do: "buff", dur: 3, dmg: 1.6, armor: 0.7, color: "e0e0ff" },
    ]]),
  reigen: hero("support", "Fake Psychic", "Great psychic (not)", 95, punch(22), "Slaps.",
    ["SALT SPLASH", 7, "throws salt ahead: hurts and slows.", [
      { do: "cone", range: 100, arc: 0.9, color: "ffffff", dmg: 30, slow: 2 },
    ]],
    ["SPECIAL MASSAGE", 13, "heals himself and allies nearby 20% and shields them for 0.8s.", [
      { do: "heal", pct: 0.2, radius: 120, color: "80ffc0" },
      { do: "shield", dur: 0.8, radius: 120, color: "80ffc0" },
    ], 0.6]),
  rimuru: hero("mage", "Slime Lord", "Reborn slime", 105, shoot(orb("60c0ff", 4), 22), "Water bullets.",
    ["PREDATOR", 9, "a mouth on the aimed spot swallows foes in for 2s, and he heals 8%.", [
      { do: "field", at: 110, radius: 60, life: 2, tick: 0.25, look: "dark", color: "3060c0", dmg: 8, knock: -0.6 },
      { do: "heal", pct: 0.08, color: "60c0ff" },
    ]],
    ["MEGIDO", 11, "five rays of light fall on the nearest foe.", [
      { do: "drop", times: 5, gap: 0.15, at: "target", delay: 0.3, radius: 25, look: "bolt", color: "80e0ff", dmg: 22 },
    ]]),
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
    ["REWIND", 15, "rewinds his luck: heals 35% and can't be hurt for 0.5s.", [
      { do: "heal", pct: 0.35, color: "8080ff" },
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
    ["MARKED KUNAI", 8, "throws three marked kunai and flashes ahead after them.", [
      { do: "shots", n: 3, spread: 0.6, speed: 500, range: 250, shape: "spike", size: 4, color: "ffe040", dmg: 20 },
      { do: "blink", wait: 0.3, to: "aim", range: 160, color: "ffe040" },
    ]]),
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
    ["SPIRIT BARRIER", 12, "a barrier blocks all damage for 1.5s for her and allies nearby, and heals them 10%.", [
      { do: "shield", dur: 1.5, radius: 120, color: "ffa0d0" },
      { do: "heal", pct: 0.1, radius: 120, color: "ffa0d0" },
    ]]),
  frieren: hero("mage", "Elf Mage", "Thousand-year elf", 95, shoot(orb("e0e0ff"), 26, 0.65, 260), "Magic bolts.",
    ["ZOLTRAAK", 6, "the killing magic: a thin white beam.", [
      { do: "lane", len: 280, width: 14, look: "beam", color: "e8f0ff", dmg: 70 },
    ]],
    ["FLOWER FIELD", 13, "a field of mana flowers around her for 4s: hurts foes and heals friends.", [
      { do: "field", at: "self", radius: 100, life: 4, tick: 0.5, look: "petals", color: "b0d0ff", dmg: 8, heal: 0.02 },
    ]]),
  fern: hero("carry", "Apprentice Mage", "Fastest caster", 90, shoot(orb("c080ff"), 18, 0.35, 240, 380), "Rapid magic bolts.",
    ["MACHINE ZOLTRAAK", 8, "ten killing-magic bolts in a stream.", [
      { do: "shots", times: 10, gap: 0.05, n: 1, spread: 0.15, speed: 420, range: 250, shape: "orb", size: 2, color: "c080ff", dmg: 9 },
    ]],
    ["HIDDEN MANA", 12, "stops hiding her mana: 40% faster casts and 20% faster steps for 4s.", [
      { do: "buff", dur: 4, atk: 0.6, speed: 1.2, color: "c080ff" },
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
    ["WAKU WAKU", 12, "cheers everyone nearby: heals 15% and 30% faster for 3s.", [
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
      { do: "lane", times: 2, gap: 0.25, len: 300, width: 6, look: "beam", color: "ff40ff", dmg: 40 },
    ]]),
  cell: hero("fighter", "Perfect Bio", "Perfect being", 115, punch(30), "Punches.",
    ["ABSORB", 9, "stabs the nearest foe with his tail and drinks 10% HP.", [
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
  asta: hero("fighter", "Anti-Magic Boy", "Magicless knight", 110, blade(32, 0.55), "Big anti-magic sword swings.",
    ["ANTI-MAGIC CUT", 5, "a wide cut that also slices every shot in front of him.", [
      { do: "cone", range: 80, arc: 1.6, color: "303030", dmg: 50 },
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
    ["MACH 20", 8, "zooms ahead hitting everything around, then zooms right back.", [
      { do: "blink", to: "aim", range: 200, color: "ffe040" },
      { do: "ring", radius: 40, look: "burst", color: "ffe040", dmg: 35 },
      { do: "blink", wait: 0.35, to: "start", range: 0, color: "ffe040" },
    ]],
    ["TENTACLE CARE", 9, "three wide tentacle slaps, then patches himself up 8%.", [
      { do: "cone", times: 3, gap: 0.12, range: 70, arc: 2.2, color: "ffe040", dmg: 18 },
      { do: "heal", pct: 0.08, color: "ffe040" },
    ]]),
  // ---------------------------------------------------------------- sheet 4 (Non One Piece 50)
  gohan: hero("fighter", "Hidden Potential", "Scholar fighter", 105, punch(30), "Punches.",
    ["MASENKO", 6, "a yellow energy beam from both hands.", [
      { do: "lane", len: 230, width: 22, look: "beam", color: "ffe060", dmg: 70 },
    ]],
    ["BEAST AWAKENING", 14, "his hidden power bursts out: 40% harder hits and 2% heal a second for 4s.", [
      { do: "ring", radius: 60, look: "shock", color: "c0c0ff", dmg: 20 },
      { do: "buff", dur: 4, dmg: 1.4, regen: 0.02, color: "c0c0ff" },
    ]]),
  piccolo: hero("fighter", "Green Sage", "Wise warrior", 110, punch(28), "Punches.",
    ["PIERCING CANNON", 10, "charges a finger, then a thin spiralling beam through everything.", [
      { do: "ring", radius: 25, look: "shock", color: "ffe040" },
      { do: "lane", wait: 0.8, len: 300, width: 10, look: "bolt", color: "ffe040", dmg: 120 },
    ]],
    ["REGENERATION", 14, "regrows his wounds: heals 30%.", [
      { do: "heal", pct: 0.3, color: "50c050" },
    ], 0.5]),
  garou: hero("fighter", "Hero Hunter", "Monster martial artist", 105, punch(30, 0.4), "Fast punches.",
    ["FLOWING ROCK FIST", 7, "six flowing strikes in a blur.", [
      { do: "cone", times: 6, gap: 0.08, range: 50, arc: 1.4, color: "c0e0ff", dmg: 12 },
    ]],
    ["COSMIC FEAR", 13, "a burst of cosmic power stuns everyone around, and he takes 30% less damage for 3s.", [
      { do: "ring", radius: 100, look: "shock", color: "4020a0", dmg: 50, stun: 0.6 },
      { do: "buff", dur: 3, armor: 0.7, color: "4020a0" },
    ]]),
  sakura: hero("support", "Cherry Medic", "Medic ninja", 105, punch(32, 0.5), "Super-strong punches.",
    ["CHERRY IMPACT", 8, "smashes the ground: everything around flies away.", [
      { do: "drop", at: "self", delay: 0.2, radius: 80, look: "fist", color: "ff80b0", dmg: 60, knock: 2.5 },
    ]],
    ["MEDICAL PALM", 11, "heals herself and allies nearby 22%.", [
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
    ["SOUND BOMBS", 8, "three exploding beads go off around the nearest foe.", [
      { do: "drop", times: 3, gap: 0.2, at: "target", delay: 0.4, radius: 35, look: "meteor", color: "ffd040", dmg: 28 },
    ]],
    ["MUSICAL SCORE", 12, "reads the rhythm of the fight: 35% faster swings, 15% faster steps for 4s.", [
      { do: "buff", dur: 4, atk: 0.65, speed: 1.15, color: "ffd040" },
    ]]),
  muichiro: hero("assassin", "Mist Pillar", "Mist hashira", 90, blade(26, 0.4), "Katana cuts.",
    ["OBSCURING CLOUDS", 10, "mist rolls out around him for 3s: foes slow, he runs 30% faster.", [
      { do: "field", at: "self", radius: 100, life: 3, tick: 0.5, look: "mist", color: "c0f0f0", dmg: 6, slow: 2 },
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
    ["COMPASS NEEDLE", 13, "his fighting spirit compass: 3% heal a second and 25% faster blows for 5s.", [
      { do: "ring", radius: 50, look: "shock", color: "60c0ff" },
      { do: "buff", dur: 5, regen: 0.03, atk: 0.75, color: "60c0ff" },
    ]]),
  doma: hero("mage", "Ice Fan Demon", "Smiling demon", 100, shoot(bladeShot("c0e8ff", 3), 22), "Ice fan cuts.",
    ["WINTER ICICLES", 8, "four icicles fall around the nearest foe, slowing.", [
      { do: "drop", times: 4, gap: 0.2, at: "target", delay: 0.4, radius: 30, look: "blade", color: "c0e8ff", dmg: 25, slow: 1 },
    ]],
    ["FROZEN LOTUS", 12, "an ice lotus blooms on the aimed spot for 3s, freezing feet.", [
      { do: "field", at: 120, radius: 70, life: 3, tick: 0.5, look: "ice", color: "c0e8ff", dmg: 10, root: 0.5 },
    ]]),
  mahito: hero("assassin", "Soul Shaper", "Cursed spirit", 100, punch(28), "Shape-shifting punches.",
    ["IDLE TRANSFIGURATION", 8, "touches the nearest foe's soul and twists it (slowed 3s).", [
      { do: "lock", range: 100, look: "grab", color: "80a0c0", dmg: 60, slow: 3 },
    ]],
    ["SOUL BULLETS", 9, "throws three twisted souls that chase foes.", [
      { do: "shots", n: 3, spread: 0.6, speed: 250, range: 200, shape: "orb", size: 6, color: "7080a0", dmg: 35, home: true },
    ]]),
  toji: hero("assassin", "Sorcerer Killer", "Heavenly restriction", 100, blade(30, 0.4), "Cursed-tool cuts.",
    ["INVERTED SPEAR", 6, "a lunge with the spear that cuts through anything.", [
      { do: "dash", len: 200, width: 20, color: "9060c0", dmg: 60 },
    ]],
    ["HEAVENLY BODY", 12, "his body takes over: 40% faster and 20% harder hits for 4s.", [
      { do: "buff", dur: 4, speed: 1.4, dmg: 1.2, color: "404040" },
    ]]),
  yuta: hero("carry", "Queen's Bond", "Special grade", 100, blade(28, 0.5), "Katana cuts.",
    ["CURSED QUEEN", 8, "his curse queen's hand smashes the nearest foe away.", [
      { do: "drop", at: "target", delay: 0.5, radius: 55, look: "fist", color: "e0e0f0", dmg: 70, knock: 2 },
    ]],
    ["PURE LOVE", 14, "gathers love, then a huge beam of cursed energy.", [
      { do: "ring", radius: 35, look: "shock", color: "b0a0ff" },
      { do: "lane", wait: 0.6, len: 280, width: 40, look: "beam", color: "b0a0ff", dmg: 110 },
    ]]),
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
    ["APPLE BINGE", 12, "eats apples: heals 20% and hits 30% harder for 3s.", [
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
} satisfies Record<string, Entry>;

/** Tuning results (DAMAGE_BALANCE, win %, stars) per hero, filled in from the bot duels. */
const TUNED: Record<string, [bal: number, win: number, stars: number]> = {
  ace: [2.12, 50.0, 4],
  ainz: [2.52, 51.5, 4],
  akainu: [2.63, 50.5, 4],
  akaza: [3.57, 48.0, 3],
  aki: [2.63, 49.5, 3],
  albedo: [1.7, 50.5, 4],
  allmight: [2.52, 48.5, 3],
  alphonse: [2.31, 49.5, 3],
  angrybird: [3.27, 51.0, 4],
  anya: [3.89, 51.0, 4],
  aokiji: [3.27, 48.3, 3],
  armin: [3.57, 51.0, 4],
  asta: [1.94, 51.5, 4],
  asuna: [2.54, 50.5, 4],
  bakugo: [2.75, 51.5, 4],
  bigmom: [2.54, 49.5, 3],
  blackbeard: [2.12, 51.0, 4],
  brook: [2.72, 51.0, 4],
  byakuya: [2.93, 48.5, 3],
  cc: [3.81, 49.5, 3],
  cell: [3.0, 49.0, 3],
  chopper: [3.89, 52.0, 4],
  crocodile: [2.46, 50.5, 4],
  denji: [2.16, 49.5, 3],
  diablo: [3.27, 49.5, 3],
  doflamingo: [2.63, 50.5, 4],
  doma: [1.94, 49.5, 3],
  edward: [3.73, 50.0, 4],
  emilia: [3.27, 52.0, 4],
  fern: [3.59, 54.9, 4],
  franky: [2.26, 50.5, 4],
  frieren: [3.13, 49.5, 3],
  frieza: [1.94, 48.5, 3],
  gaara: [1.61, 49.5, 3],
  garou: [3.0, 52.0, 4],
  genos: [2.38, 50.5, 4],
  geto: [3.06, 49.8, 3],
  gintoki: [1.99, 48.5, 3],
  gohan: [2.93, 49.0, 3],
  goku: [3.93, 51.0, 4],
  gon: [4.47, 51.5, 4],
  hancock: [2.03, 51.5, 4],
  hijikata: [2.21, 50.5, 4],
  hinata: [4.83, 50.0, 4],
  hisoka: [3.69, 50.0, 4],
  ichigo: [1.63, 49.5, 3],
  inosuke: [2.66, 49.0, 3],
  itachi: [3.0, 48.5, 3],
  jinbe: [2.1, 50.0, 4],
  jiraiya: [2.93, 51.5, 4],
  kagura: [3.13, 48.5, 3],
  kaido: [1.22, 51.0, 4],
  kakashi: [2.5, 45.6, 3],
  kirito: [2.36, 49.5, 3],
  kizaru: [2.46, 49.8, 3],
  koro: [3.89, 51.5, 4],
  kurapika: [2.75, 48.0, 3],
  law: [1.94, 48.5, 3],
  lelouch: [2.78, 48.0, 3],
  leorio: [3.0, 51.5, 4],
  levi: [2.52, 50.0, 4],
  light: [4.43, 51.5, 4],
  madara: [3.0, 51.5, 4],
  mahito: [3.49, 50.0, 4],
  maki: [1.78, 51.0, 4],
  makima: [2.21, 51.7, 4],
  marco: [1.63, 49.5, 3],
  megumi: [3.06, 49.5, 3],
  mihawk: [1.86, 51.5, 4],
  mikasa: [2.46, 50.0, 4],
  minato: [3.0, 49.3, 3],
  mob: [2.31, 48.5, 3],
  momo: [4.83, 50.5, 4],
  muichiro: [2.75, 51.5, 4],
  nagi: [4.62, 51.0, 4],
  nami: [2.41, 50.5, 4],
  naruto: [2.55, 51.5, 4],
  nezuko: [1.78, 51.0, 4],
  nobara: [2.49, 51.0, 4],
  obito: [2.52, 48.5, 3],
  okarun: [3.57, 48.0, 3],
  pain: [2.93, 50.5, 4],
  piccolo: [5.04, 51.0, 4],
  power: [2.33, 50.0, 4],
  reigen: [5.04, 50.5, 4],
  rengoku: [2.12, 50.0, 4],
  rimuru: [2.1, 49.5, 3],
  robin: [2.07, 48.3, 3],
  roger: [1.94, 48.5, 3],
  roy: [2.23, 50.2, 4],
  rukia: [1.94, 49.0, 3],
  ryuk: [3.42, 48.0, 3],
  sabo: [2.63, 49.5, 3],
  sakura: [3.42, 52.0, 4],
  sanji: [1.94, 52.0, 4],
  sasuke: [2.52, 52.0, 4],
  shanks: [1.94, 51.0, 4],
  shinobu: [3.0, 48.0, 3],
  shinra: [2.41, 50.0, 4],
  stark: [2.14, 52.0, 4],
  subaru: [5.04, 48.5, 3],
  sukuna: [3.0, 51.0, 4],
  tanjiro: [2.12, 50.5, 4],
  tengen: [1.94, 51.0, 4],
  todoroki: [2.52, 50.7, 4],
  toji: [2.07, 48.0, 3],
  trunks: [3.0, 50.0, 4],
  usopp: [3.42, 51.0, 4],
  vegeta: [4.43, 48.0, 3],
  whitebeard: [1.53, 49.0, 3],
  yami: [1.85, 49.5, 3],
  yuji: [3.73, 49.0, 3],
  yuno: [2.94, 52.0, 4],
  yuta: [2.69, 50.0, 4],
  zoro: [2.12, 50.5, 4],
};

for (const [id, e] of Object.entries(ROSTER)) {
  const t = TUNED[id];
  if (t) [e.bal, e.win, e.def.stars] = t;
}

export type NewHeroId = keyof typeof ROSTER;
export const NEW_HEROES: Record<NewHeroId, Entry> = ROSTER;
export function newHeroDefs(): Record<NewHeroId, HeroDef> {
  return Object.fromEntries(Object.entries(ROSTER).map(([id, e]) => [id, e.def])) as Record<NewHeroId, HeroDef>;
}
