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
const combo = ([name, cooldown, , steps, botHp]: Skill): SkillDef => ({ kind: "combo", name, cooldown, damage: 0, radius: reach(steps), steps, botHp });

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
} satisfies Record<string, Entry>;

/** Tuning results (DAMAGE_BALANCE, win %, stars) per hero, filled in from the bot duels. */
const TUNED: Record<string, [bal: number, win: number, stars: number]> = {
  ace: [2.12, 50.0, 4],
  angrybird: [3.27, 51.0, 4],
  bigmom: [2.54, 49.5, 3],
  blackbeard: [2.12, 51.0, 4],
  brook: [2.72, 51.0, 4],
  chopper: [3.89, 52.0, 4],
  franky: [2.26, 50.5, 4],
  gaara: [1.61, 49.5, 3],
  goku: [3.93, 51.0, 4],
  inosuke: [2.66, 49.0, 3],
  itachi: [3.0, 48.5, 3],
  jinbe: [2.1, 50.0, 4],
  kaido: [1.22, 51.0, 4],
  kakashi: [2.5, 45.6, 3],
  levi: [2.52, 50.0, 4],
  madara: [3.0, 51.5, 4],
  mihawk: [1.86, 51.5, 4],
  mikasa: [2.46, 50.0, 4],
  nagi: [4.62, 51.0, 4],
  nami: [2.41, 50.5, 4],
  naruto: [2.55, 51.5, 4],
  nezuko: [1.78, 51.0, 4],
  obito: [2.52, 48.5, 3],
  pain: [2.93, 50.5, 4],
  rengoku: [2.12, 50.0, 4],
  robin: [2.07, 48.3, 3],
  roger: [1.94, 48.5, 3],
  sabo: [2.63, 49.5, 3],
  sanji: [1.94, 52.0, 4],
  sasuke: [2.52, 52.0, 4],
  shanks: [1.94, 51.0, 4],
  sukuna: [3.0, 51.0, 4],
  tanjiro: [2.12, 50.5, 4],
  usopp: [3.42, 51.0, 4],
  whitebeard: [1.53, 49.0, 3],
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
