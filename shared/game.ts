import { NEW_HEROES, NewHeroId, newHeroDefs } from "./heroes2";
import { ClassicMap, classicMap, mapBlocksShot, moveOnMap } from "./maps";
import { DUNGEON, OPEN_WORLD } from "./world";
// Game rules shared by the client (prediction, rendering) and the server (authority).

export const TILE = 16;
export const MAP_COLS = 60;
export const MAP_ROWS = 45;
export const WORLD_W = MAP_COLS * TILE; // 960
export const WORLD_H = MAP_ROWS * TILE; // 720
export const CENTER_X = WORLD_W / 2;
export const CENTER_Y = WORLD_H / 2;

export const SERVER_PORT = 2567;
export const ROOM_NAME = "emberfall";
export const MAX_PLAYERS = 4;

// Players
/** Heroes are drawn this much bigger than their sprites (user request 2026-10-03); the hitbox grew with them. */
export const HERO_SCALE = 1.5;
export const PLAYER_RADIUS = 9;
/** BIG LIGHT: an enlarged target is this much bigger (and easier to hit) and moves at BIG_SLOW of its speed. */
export const BIG_SCALE = 1.8;
export const BIG_SLOW = 0.5;
// Soul Knight pace: everyone walks a bit slower and every shot flies slower (same reach), so shots can be
// dodged on foot and cut down with a swing.
/** Walking speed of heroes, summons and monsters, times their listed speed. */
export const MOVE_SCALE = 0.8;
/** Flying speed of every shot (heroes' and monsters'), times its listed speed; shots live longer to keep their reach. */
export const SHOT_SPEED_SCALE = 0.55 * 1.2; // x1.2 for every shot (user request 2026-10-07)
/** Heroes' own shots fly slower still (user request 2026-10-05), with the same reach. */
export const HERO_SHOT_SCALE = 0.75;
/** Every hero walks at the same pace (user request 2026-10-05); only the Speed Raptor and the motorcycle go faster. */
export const HERO_WALK = 90;
/** Every hero (and anything walking on hero speed) moves this much faster (user request 2026-10-07). */
export const HERO_SPEED_BOOST = 1.2;
export const DASH_SPEED = 340;
export const DASH_TIME = 0.15;
// Knockback for skills that throw foes back (basic attacks no longer knock back, user request 2026-10-06). Bosses don't budge.
export const KNOCKBACK_DISTANCE = 46; // pixels the push carries a target in total
export const KNOCKBACK_DECAY = 12; // how fast the push dies out (per second)
export const DASH_COOLDOWN = 0.5;

// Heroes. Every number here is safe to tweak for balance.
type BaseHeroId =
  | "superman"
  | "isekai"
  | "simo"
  | "killua"
  | "howl"
  | "ricardo"
  | "saitama"
  | "healer"
  | "deku"
  | "okita"
  | "gojo"
  | "starplatinum"
  | "rudeus"
  | "loki"
  | "lawliet"
  | "thorfinn"
  | "titan"
  | "yaotsu"
  | "sakamoto"
  | "joyboy"
  | "rick"
  | "doraemon"
  | "trainer"
  | "kid"
  | "hanuman"
  | "badigadi"
  | "gunbot"
  | "sparkmouse"
  | "flamedragon"
  | "agamemnon"
  | "vampire"
  | "rider"
  | "gladiator"
  | "taekwondo"
  | "theworld"
  | "steve"
  | "swordgod"
  | "omni"
  | "blaze"
  | "quad"
  | "echo"
  | "raptor"
  | "kaidodragon"
  | "zenitsu"
  | "pawn"
  | "queen"
  | "warrior"
  | "archer"
  | "ninja"
  | "paladin"
  | "druid"
  | "monk"
  | "robot"
  | "golem"
  | "hacker"
  | "reaper"
  | "mossgolem"
  | "berserker"
  | "jester"
  | "blacksmith"
  | "geomancer"
  | "pyromancer"
  | "cryomancer"
  | "lancer"
  | "oni";
/** Every hero: the hand-made ones above plus the big roster in heroes2.ts. */
export type HeroId = BaseHeroId | NewHeroId;
export type AttackStyle = "punch" | "sword" | "rifle" | "lightning" | "magic" | "flame";
export type SkillKind =
  | "smash"
  | "wave"
  | "burst"
  | "storm"
  | "fireball"
  | "jab"
  | "onepunch" // one huge sweep that kills anything
  | "heal" // heal every ally nearby
  | "line" // a wide straight blast
  | "slashes" // many quick slashes all around
  | "domain" // hits every enemy inside a big circle around him
  | "timestop" // everything but the caster freezes
  | "hurricane" // a storm cloud that keeps striking an area
  | "asgard" // an illusion kingdom that drains enemies standing in it
  | "mimic" // ILLUSION: takes on the look of the hero the aim picks (within `radius`) for `duration` s
  | "clone" // a copy that fights on its own
  | "passive" // no button: the hero's power is always on
  | "rush" // dash through enemies, cutting everything on the way
  | "titan" // transform into a giant: basic attacks hit all around
  | "city" // build a whole city that heals the caster inside it
  | "reality" // every enemy becomes an ordinary human for a while
  | "swap" // switch between the hero's normal attack and their gun
  | "gatling" // a storm of punches down a lane
  | "portal" // two linked portals: walk into one, come out of the other
  | "missiles" // homing missiles
  | "rewind" // everything goes back a couple of seconds
  | "summon" // call out helpers that fight on their own
  | "card" // a thrown card that takes a random share of the target's HP
  | "revive" // get straight back up if you fall soon after
  | "immortal" // a barrier that blocks all damage and heals
  | "latch" // leap onto a target, cling to it and drink its blood
  | "kick" // a flying kick along a line that stuns whoever it hits
  | "cross" // a huge straight punch that knocks targets far away
  | "dashkick" // dart in, kick and stun the nearest target in front, then hop back
  | "truck" // stop time, then drop a truck on the aimed spot
  | "godrush" // a lightning-fast lunge that ends in a full spin cut (the Sword God's dash and whirl)
  | "fan" // a fan of flying sword slashes
  | "castle" // a giant walking castle strides across the map, hitting and stunning whatever it walks into
  | "frost" // draw a frost sigil on the ground: whoever steps on it is frozen solid
  | "grapple" // 3D maneuver gear: fire a wire into the wall ahead and zip along it
  | "trojan" // a wooden horse that counts down, then bursts open in a huge blast
  | "sticky" // dart up to the nearest target and stick a bomb on it: it blows them far away
  | "spinkick" // spin on the spot and kick everything all around
  | "totem" // a healing totem on the ground: allies near it heal a share of max HP every half second
  | "palm" // a giant palm comes down from the sky and crushes (and stuns) the aimed spot
  | "doves" // vanish into a flock of doves: no damage taken for a moment
  | "invis" // turn invisible for a moment
  | "bat" // turn into a bat: very fast basic attacks that drink a share of the damage back as HP
  | "sacrifice" // stab yourself: you and the nearest enemy each lose half of your max HP
  | "yoyo" // switch basic attacks to a yoyo that locks on and never misses (use again to switch back)
  | "bike" // ride a motorcycle: much faster, and ramming stuns and knocks back
  | "excalibur" // light swords orbit you and cut whatever they touch
  | "grab" // dart in, grab the nearest target, leap and slam it down (stun)
  | "knives" // throw knives out in every direction
  | "rubberpunch" // a stretching fist that bounces off walls through everything, then snaps back
  | "purple" // one huge, crushing purple beam
  | "starfinger" // a straight volley of shots
  | "solve" // lock on to the nearest enemy anywhere in range and stun it
  | "biglight" // a flashlight beam: everything caught in it grows bigger (easier to hit) and slower
  | "diamond" // a diamond sword for a while: basic attacks become strong, fast, long sword swings
  | "build" // place a random block: dirt (a shield), TNT (explodes when hit) or a craft table (break it for 2x damage)
  | "eyebeam" // a laser from the eyes that keeps firing and follows the aim
  | "dragonform" // DRAGON FORM: turns into the hero named by `form` for `duration` s; the cooldown starts when he turns back
  | "omnitrix" // turn into a random alien for a while (no skills, except the alien's own)
  | "mitosis" // every copy of you splits in two, sharing its HP half and half
  | "eat" // eat a snack: heal a share of max HP
  | "thunderdash" // a lightning dash that cuts the lane; if it hits, it can be used once more within 2s
  | "seventh" // a lightning dash cutting a wide lane, which keeps crackling with lightning for a while
  | "whip" // a black whip locks on to the nearest target in range and ties its legs (it cannot walk)
  | "chargeslash" // hold to charge, let go for a wide sword cleave (bigger and harder the longer it charged)
  | "chargeshot" // hold until fully charged, then let go: one heavy arrow that pierces and stuns
  | "reflect" // for a moment, shots that hit him fly back at whoever fired them
  | "sprint" // runs faster for a while
  | "shadowstep" // dash ahead leaving a shadow; use again within the window to flash back to it
  | "shuriken" // throwing stars in a fan straight ahead
  | "shield" // a shield of light: he and nearby allies take no damage for a moment
  | "shieldcharge" // hold to charge, let go to rush ahead shield first; a full charge stuns
  | "tree" // plants a tree that never goes away and heals him while he stands near it
  | "leafstorm" // a storm of leaves that hits harder for every tree he has planted
  | "empower" // the next basic attack hits much harder and stuns
  | "leap" // jumps onto the aimed spot, crushing and stunning everything around the landing
  | "boost" // one more shot per basic attack (stacks)
  | "bluelaser" // one blue laser blast straight ahead
  | "harden" // takes less damage (stacks)
  | "barrage" // a flurry of punches ahead: stuns foes pinned against a wall, knocks back the rest
  | "petrify" // REALITY: the nearest foe turns into a plain rock (can't move or act) for `duration`
  | "error" // ERROR: glitches around the map at random for `duration`, hurting whatever each jump passes through
  | "reap" // SOUL REAP: a full scythe spin; each foe hit gives a soul and heals a share of max HP
  | "deathdoor" // DEATH'S DOOR: blink behind the nearest foe and cut, harder per soul (souls are used up)
  | "roots" // ROOT SNARE: roots burst out around him and tie every foe's legs
  | "gaia" // GAIA SHELL: moss armour that halves damage taken and heals over time
  | "rage" // BLOOD RAGE: faster, harder blows for a while, but takes more damage
  | "axethrow" // AXE BOOMERANG: a spinning axe that flies out and comes back, cutting both ways
  | "jackbox" // JACK-IN-THE-BOX: a box trap that springs when a foe comes close
  | "switch" // SWITCHEROO: swap places with the nearest foe, leaving a confetti bomb behind
  | "anvil" // ANVIL DROP: an anvil falls on the aimed spot
  | "sparks" // FORGE SPARKS: a cone of red-hot sparks
  | "wall" // STONE WALL: raises a wall of rocks across the aim
  | "quake" // EARTHQUAKE: the ground shakes around him, hurting and slowing
  | "meteor" // METEOR: a meteor falls on the aimed spot and leaves the ground burning
  | "flamedash" // FLAME DASH: dash ahead leaving a trail of fire
  | "iceprison" // ICE PRISON: the nearest foe is frozen in a block of ice
  | "blizzard" // BLIZZARD: a snowstorm on the aimed spot that hurts and slows
  | "lancecharge" // PIERCING CHARGE: charge ahead spear first, throwing foes back
  | "dive" // DRAGOON DIVE: leap out of reach, then crash down on the aimed spot
  | "roar" // DEMON ROAR: stuns and throws back everything nearby
  | "cyclone" // KANABO CYCLONE: three full spins of the club
  | "taunt" // ROOT SNARE (Moss Golem): every foe in the ring runs at him and attacks him
  | "deathnote" // NAME WRITTEN: he walks very slowly while a bar fills, then the nearest foe in range falls
  | "swapany" // SWAP (Surgeon Pirate): trade places with the hero picked by the aim, anywhere on the map
  | "possess" // DEATH'S DOOR (Reaper): vanish into a foe and walk it around
  | "kunai" // MARKED KUNAI: three kunai stick where they land; warp to the one picked by the aim, up to 3 times
  | "eater" // EATER (Slime Lord): swallow an ally; it takes no damage until it comes back out
  | "domainx" // DOMAIN EXPANSION (Cursed King): he and one foe leave the map for a duel in his domain
  | "copyskill" // SWALLOW (Darkness Pirate): take a foe's skill and use it once
  | "fakeclone" // FAKE CLONE: five harmless clones run around him; they copy his SPIRAL SPHERE
  | "piano" // PIANO (Skeleton Bard): a piano that fires notes all around for a while
  | "bloodtrap" // BLOOD TRAP: drop blood on the way, then pull it all back through foes
  | "bloodhammer" // BLOOD HAMMER: a blood hammer for a while: harder, longer swings
  | "combo" // a skill built from FX steps (dash, lane, ring, shots, drop, field, lock, buff, heal, shield, blink)
  | "charge"; // hold to charge (walking slower), let go to smash: the longer the charge, the harder and longer it hits

export interface SkillDef {
  kind: SkillKind;
  name: string;
  cooldown: number;
  damage: number; // for "heal": fraction of max HP restored; for "asgard": fraction of max HP lost per second
  radius: number; // area of effect, or reach for waves, jabs and lines
  width?: number; // for "line"
  duration?: number; // for lasting skills (time stop, storms, illusions, clones)
  count?: number; // how many missiles or summons
  pet2?: HeroId; // for "summon": a second, different helper that comes out with the first
  pet?: HeroId; // for "summon": which helper comes out (damage = its share of the summoner's max HP)
  max?: number; // for "summon": most of these helpers out at once (the oldest leaves); default `count`
  chargeTime?: number; // for charged skills: seconds to a full charge (default CHARGE_FULL)
  /** Charged skills: the hero walks at this share of their speed while charging (default CHARGE_SLOW). */
  chargeSlow?: number;
  /** The cooldown only starts once the helper ("pet") or the portals ("portal") from this skill are gone. */
  waitGone?: "pet" | "portal";
  /** What the skill does, in words (shown on the hero details). */
  desc?: string;
  /** DRAGON FORM: the form hero it turns into. */
  form?: HeroId;
  /** "combo" skills: what happens, in order (each step can wait a moment after the cast). */
  steps?: FxStep[];
  /** "combo" skills: bots use it when a foe is within `radius`, or (when set) only below this share of HP. */
  botHp?: number;
}

/** What an FX hit does to each foe it touches. */
export interface FxHit {
  dmg?: number;
  stun?: number;
  slow?: number;
  root?: number;
  /** Throw foes back (times a normal knockback); negative pulls them in. */
  knock?: number;
  /** How hard `slow` slows (0..1 of speed taken away); default BURN_SLOW's. */
  slowPct?: number;
  /** Seconds the foe cannot use skills (ANTI-MAGIC CUT). */
  silence?: number;
  /** Goes straight through armour, shields and immortality (ZOLTRAAK). */
  ignoreArmor?: boolean;
  /** WATER JET: hitting anything charges the caster's next basic attack (HeroDef.chargedHit). */
  empower?: boolean;
}

/**
 * The hero a drag-picked skill (SWAP, ILLUSION) takes: nearest the line of the aim, mostly by angle, a little by distance.
 * Shared so the client can light up the same hero the server will pick.
 */
export function aimPickScore(dx: number, dy: number, aim: number): number | undefined {
  let diff = Math.atan2(dy, dx) - aim;
  diff = Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff)));
  return diff < 1.2 ? diff * 200 + Math.hypot(dx, dy) * 0.15 : undefined;
}

/** Where a "drop" or "field" goes: this far ahead along the aim, on the caster ("self"), or on the nearest foe ("target"). */
/** Where a step lands: ahead by a fixed distance, on himself, on the nearest foe, or a spot the player picks
 * (aim + how far the stick / cursor is pushed) up to `upTo` away, `scatter` adding a random offset per hit. */
export type FxAt = number | "self" | "target" | { upTo: number; scatter?: number };

/**
 * One piece of a "combo" skill. Colours are hex strings without "#" ("ff6a1a"); `look` picks how it is drawn.
 * `wait`: seconds after the cast before this step goes off. `times`/`gap`: repeat it.
 */
export type FxStep = { wait?: number; times?: number; gap?: number; color: string } & (
  | ({ do: "dash"; len: number; width?: number; trail?: { n: number; radius: number; delay: number; dmg: number; look?: "meteor" | "pillar" | "bolt" | "fist" | "blade" | "skull" } } & FxHit)
  | { do: "blink"; to: "behind" | "aim" | "start"; range: number }
  | ({ do: "lane"; len: number; width: number; look?: "beam" | "slash" | "wave" | "chain" | "bolt" | "zoltrak" | "pinkbeam" | "tidal" | "waterjet" } & FxHit)
  | ({ do: "ring"; radius: number; look?: "burst" | "shock" | "petal" | "spin" | "pull" | "psychic" | "vortex" } & FxHit)
  | ({ do: "cone"; range: number; arc: number; reflect?: boolean; look?: "hawkcut1" | "hawkcut2" } & FxHit)
  | ({ do: "shots"; n: number; spread: number; speed: number; range: number; pierce?: number; shape?: "orb" | "blade" | "star" | "spike" | "roach" | "hawkwave"; size?: number; home?: boolean; hitSize?: number; bounce?: number; split?: { n: number; range: number; speed: number; shape: "orb" | "blade" | "star" | "spike" | "roach"; size: number; color: string } & FxHit } & FxHit)
  | ({ do: "drop"; at: FxAt; delay: number; radius: number; spots?: number; look?: "meteor" | "pillar" | "bolt" | "fist" | "blade" | "skull" | "icefall" } & FxHit)
  | ({ do: "field"; at: FxAt; follow?: boolean; radius: number; life: number; tick: number; heal?: number; cage?: boolean; fog?: boolean; look?: "storm" | "mist" | "flames" | "sand" | "petals" | "dark" | "ice" | "light" | "water" | "web" | "fog" | "flowerbed" | "lotus" } & FxHit)
  | ({ do: "push"; len: number; width: number; speed: number; wallStun: number; carrySelf?: boolean } & FxHit)
  | { do: "rewind"; secs: number }
  | ({ do: "lock"; range: number; drag?: boolean; look?: "chain" | "bolt" | "grab" | "eye" } & FxHit)
  | { do: "buff"; dur: number; speed?: number; dmg?: number; atk?: number; armor?: number; leech?: number; regen?: number; invuln?: boolean; ccImmune?: boolean }
  | { do: "heal"; pct: number; radius?: number }
  | { do: "shield"; dur: number; radius?: number }
);

/** The buff steps a hero has running now (skill 1 while `buff` ticks, skill 2 while `active2` ticks). */
export function fxBuffs(p: { hero: string; buff?: number; active2?: number }): Extract<FxStep, { do: "buff" }>[] {
  const hero = heroOf(p.hero);
  const out: Extract<FxStep, { do: "buff" }>[] = [];
  const add = (sk: SkillDef | undefined, on: boolean) => {
    if (!on || sk?.kind !== "combo") return;
    for (const st of sk.steps ?? []) if (st.do === "buff") out.push(st);
  };
  add(hero.skill, (p.buff ?? 0) > 0);
  add(hero.skill2, (p.active2 ?? 0) > 0);
  return out;
}

export interface HeroDef {
  name: string;
  role: string;
  blurb: string;
  stars: number; // overall strength, 1-5, shown on the hero card (6 = special)
  invincible?: boolean; // takes no damage at all (shown as infinite HP)
  maxHp: number;
  speed: number;
  attack: AttackStyle;
  attackCooldown: number; // seconds between basic attacks
  damage: number;
  range: number; // reach for punch/sword/lightning, travel distance for rifle/magic
  arc: number; // radians covered by a punch or sword swing
  aoe: number; // blast radius for lightning strikes and magic explosions
  shotSpeed: number;
  pierce: number; // how many enemies one bullet can pass through
  shot?: string; // projectile look for magic attacks (default "magic")
  skill: SkillDef;
  skill2?: SkillDef; // a second skill (E key / second button)
  /** A gun mode the "swap" skill switches to: basic attacks fire this instead. */
  gun?: { attackCooldown: number; damage: number; range: number; shotSpeed: number; spread: number };
  /** Basic attack is a straight kick (a lane `range` long and this wide) instead of a swing. */
  lineAttack?: number;
  /** DIAMOND SWORD: what basic attacks become while the sword is out. */
  sword?: { attackCooldown: number; damage: number; range: number; arc: number };
  /** Helpers called out by skills: not shown on the hero select screen. */
  summon?: boolean;
  /** A summon that never moves and fires at anything within `range` (THE QUEEN). */
  turret?: boolean;
  /** Stacks kept in `mode`, shown under the skill cooldowns: their name and how many at most. */
  stacks?: { label: string; max?: number };
  /** Poseidon: while mode is 1 (a WATER JET hit), the next basic attack hits x2 and stuns this many seconds. */
  chargedHit?: number;
  /** An alien form of this hero (ALIEN TRANSFORM): not on the hero select screen; turns back when the time runs out. */
  formOf?: HeroId;
  /** Melee knockback, times a normal one. */
  knock?: number;
  /** Basic attacks slow whatever they hit for this many seconds. */
  slowHit?: number;
  /** Running into a foe hits it for this much (again every RAM_REHIT seconds while still touching). */
  ram?: number;
  /** How hard a ram knocks back, times a normal knockback. */
  ramKnock?: number;
  /** A long body that rams with all of it: a box `len` long and `half` * 2 tall, lying left-right (the dragon). */
  ramBody?: { len: number; half: number };
  walk?: number; // walk speed multiplier on top of HERO_WALK (DIVINE DOGS run x1.5)
  /** Has no basic attack (DRAGON FORM). */
  noAttack?: boolean;
}

const BASE_HEROES: Record<BaseHeroId, HeroDef> = {
  superman: {
    name: "Captain Steel",
    role: "Melee bruiser",
    blurb: "Hits hardest up close and has three times the HP.",
    stars: 3,
    maxHp: 300,
    speed: 100,
    attack: "punch",
    attackCooldown: 0.45,
    damage: 40,
    range: 22,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // SMASH also stuns everything it hits for `duration` seconds (bosses shrug it off).
    skill: { kind: "smash", name: "SMASH", cooldown: 5, damage: 60, radius: 70, duration: 1, desc: "slams the ground: hurts and stuns everything around him for 1s." },
    // HEAT VISION: a beam `radius` long that follows his aim for `duration` seconds, `damage` per second.
    skill2: { kind: "eyebeam", name: "HEAT VISION", cooldown: 8, damage: 140, radius: 220, width: 10, duration: 2.5, desc: "red laser beams from his eyes for 2.5s that follow his aim." },
  },
  isekai: {
    name: "Reborn Knight",
    role: "Sword fighter",
    blurb: "Mid-range sword sweeps that hit every enemy in the arc. EXCALIBUR (E): four light swords circle him for 6s and cut whatever they touch.",
    stars: 3,
    maxHp: 120,
    speed: 110,
    attack: "sword",
    attackCooldown: 0.4,
    damage: 25,
    range: 42,
    arc: 2.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "wave", name: "SKY SLASH", cooldown: 4, damage: 40, radius: 230, count: 3, desc: "three flying sword waves in a fan down the lane." },
    // EXCALIBUR: `count` light swords circle `radius` away for `duration` seconds.
    skill2: { kind: "excalibur", name: "EXCALIBUR", cooldown: 14, damage: 18, radius: 40, duration: 6, count: 4 },
  },
  simo: {
    name: "Frost Sniper",
    role: "Sniper",
    blurb: "Very long range and huge damage, but slow to reload. Shots stop at the first hero they hit. VANISH (E): invisible for 2s; monsters and rivals lose track of him.",
    stars: 5,
    maxHp: 90,
    speed: 105,
    attack: "rifle",
    attackCooldown: 1.0,
    damage: 255,
    range: 900,
    arc: 0,
    aoe: 0,
    shotSpeed: 720,
    pierce: 0,
    skill: { kind: "burst", name: "FROST VOLLEY", cooldown: 6, damage: 255, radius: 0, desc: "a rapid volley of piercing sniper shots." },
    // VANISH: invisible for `duration` seconds (monsters and rivals lose track of him).
    skill2: { kind: "invis", name: "VANISH", cooldown: 12, damage: 0, radius: 0, duration: 2 },
  },
  killua: {
    name: "Volt Kid",
    role: "Lightning assassin",
    blurb: "Strikes call down lightning that hits an area. YOYO MODE (E): basic attacks become a yoyo that locks on and never misses (weaker, no blast) and he runs 30% faster; use it again to switch back.",
    stars: 4,
    maxHp: 100,
    speed: 320,
    attack: "lightning",
    attackCooldown: 0.5,
    damage: 22,
    range: 40,
    arc: 0,
    aoe: 26,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "storm", name: "THUNDERBOLT", cooldown: 5, damage: 50, radius: 95, desc: "a storm of lightning strikes all around him." },
    // YOYO MODE: basic attacks lock on to the nearest target within `radius` for `damage` (no blast); use again to switch back.
    skill2: { kind: "yoyo", name: "YOYO MODE", cooldown: 0.8, damage: 15, radius: 140 },
  },
  howl: {
    name: "Sky Wizard",
    role: "Wizard",
    blurb: "Long-range magic orbs that explode in a wide blast. MOVING CASTLE (E) sends a giant walking castle striding the way he aims until it leaves the map: everything it walks into is hit and stunned for 1s.",
    stars: 3,
    maxHp: 100,
    speed: 105,
    attack: "magic",
    attackCooldown: 0.8,
    damage: 28,
    range: 260,
    arc: 0,
    aoe: 42,
    shotSpeed: 240,
    pierce: 0,
    skill: { kind: "fireball", name: "FIRE SPIRIT", cooldown: 6, damage: 119.6, radius: 90, desc: "a big fire spirit fireball that explodes in a wide blast." },
    // MOVING CASTLE: the castle is `radius` wide (each side), walks at CASTLE_SPEED and hits each target once.
    skill2: { kind: "castle", name: "MOVING CASTLE", cooldown: 16, damage: 60, radius: 40, duration: 1 },
  },
  ricardo: {
    name: "Champ Rico",
    role: "Boxer",
    blurb: "Fast boxer with very short reach. JAB fires a long straight jab that stuns enemies for 0.5s. DEATH CROSS: a crushing straight right that sends targets flying.",
    stars: 3,
    maxHp: 170,
    speed: 173, // 1.5x his old pace
    attack: "punch",
    attackCooldown: 0.3,
    damage: 45,
    range: 16,
    arc: 1.2,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // JAB: a long, narrow straight punch (radius = reach, width = thickness) that stuns for `duration`.
    skill: { kind: "jab", name: "JAB", cooldown: 1, damage: 30, radius: 62, width: 18, duration: 0.5 },
    // DEATH CROSS: `duration` here is how many times further than a normal knockback it throws targets.
    skill2: { kind: "cross", name: "DEATH CROSS", cooldown: 6, damage: 225, radius: 80, width: 26, duration: 4 },
  },
  saitama: {
    name: "Plain Hero",
    role: "Hobby hero",
    blurb: "Plain punches. FINAL BLOW: one punch, exactly as far and wide as his normal punch, that knocks out whatever it hits, but takes 30s to come back.",
    stars: 3,
    maxHp: 135,
    speed: 105,
    attack: "punch",
    attackCooldown: 0.5,
    damage: 30,
    range: 20,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "onepunch", name: "FINAL BLOW", cooldown: 30, damage: Infinity, radius: 42 },
  },
  healer: {
    name: "Holy Healer",
    role: "Support",
    blurb: "Holy bolts from afar. HEAL restores 20% HP to every ally nearby. HEAL TOTEM (E): a totem on the ground heals allies near it 2% HP every 0.5s for 5s.",
    stars: 3,
    maxHp: 110,
    speed: 105,
    attack: "magic",
    attackCooldown: 0.6,
    damage: 12.3,
    range: 220,
    arc: 0,
    aoe: 0,
    shotSpeed: 260,
    pierce: 0,
    shot: "holy",
    skill: { kind: "heal", name: "HEAL", cooldown: 9, damage: 0.5, radius: 170 },
    // TOTEM OF HEALING: allies within `radius` heal `damage` of max HP every 0.5s for `duration` seconds.
    skill2: { kind: "totem", name: "HEAL TOTEM", cooldown: 14, damage: 0.05, radius: 90, duration: 5 },
  },
  deku: {
    name: "Green Rookie",
    role: "Brawler",
    blurb: "SHADOW WHIP: a black whip shoots out to the nearest target and ties its legs, so it cannot walk for 2s. MAX SMASH (E): hold to charge (walking 60% slower) and let go to smash; the gauge shows how hard it will hit, up to 4x.",
    stars: 4,
    maxHp: 130,
    speed: 160,
    attack: "punch",
    attackCooldown: 0.4,
    damage: 32,
    range: 20,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // SHADOW WHIP: locks on to the nearest target within `radius`; its legs are tied for `duration` seconds.
    skill: { kind: "whip", name: "SHADOW WHIP", cooldown: 7, damage: 20, radius: 220, duration: 2 },
    // MAX SMASH: a smash lane `radius` long and `width` wide at no charge; a full charge multiplies it (chargePower).
    skill2: { kind: "charge", name: "MAX SMASH", cooldown: 8, damage: 60, radius: 120, width: 40 },
  },
  okita: {
    name: "Sakura Blade",
    role: "Swordswoman",
    blurb: "Lightning-fast sword. PHANTOM SLASH cuts everything around her again and again. SACRIFICE (E): she stabs herself for 50% of her max HP and the enemy with the least HP nearby loses 50% of theirs; if both fall, the round is a draw.",
    stars: 4,
    maxHp: 110,
    speed: 125,
    attack: "sword",
    attackCooldown: 0.3,
    damage: 26,
    range: 36,
    arc: 2.0,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "slashes", name: "PHANTOM SLASH", cooldown: 6, damage: 24, radius: 95, duration: 0.8 },
    // SACRIFICE: she and the nearest enemy within `radius` each lose `damage` of their max HP (bosses a fifth of that).
    skill2: { kind: "sacrifice", name: "SACRIFICE", cooldown: 20, damage: 0.5, radius: 220 },
  },
  gojo: {
    name: "Void Sorcerer",
    role: "Sorcerer",
    blurb: "Fights up close. VOID REALM opens a starry void in a small circle around him that hits every enemy inside it. PURPLE BEAM (E): one huge purple beam that hits everything in a long line for heavy damage.",
    stars: 4,
    maxHp: 140,
    speed: 115,
    attack: "punch",
    attackCooldown: 0.4,
    damage: 34,
    range: 22,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "domain", name: "VOID REALM", cooldown: 18, damage: 200, radius: 160, duration: 1.6 },
    skill2: { kind: "purple", name: "PURPLE BEAM", cooldown: 14, damage: 160, radius: 420, width: 40 },
  },
  starplatinum: {
    name: "Chrono Brawler",
    role: "Time brawler",
    blurb: "Punches incredibly fast. TIME STOP freezes the whole map for 4s; only he (and the Time Emperor) can move. STAR SHOT (E): fires 5 shots in a straight line.",
    stars: 4,
    maxHp: 150,
    speed: 110,
    attack: "punch",
    attackCooldown: 0.07,
    damage: 9,
    range: 22,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "timestop", name: "TIME STOP", cooldown: 20, damage: 0, radius: 0, duration: 4 },
    // STAR SHOT: `count` shots in a straight line, flying `radius` far.
    skill2: { kind: "starfinger", name: "STAR SHOT", cooldown: 6, damage: 48.1, radius: 280, count: 5 },
  },
  rudeus: {
    name: "Storm Mage",
    role: "Mage",
    blurb: "Casts magic bolts. HURRICANE summons a huge storm cloud that rains lightning on an area. FROST SIGIL (E) draws a magic circle on the ground: any enemy that steps on it is frozen solid for 3s.",
    stars: 3,
    maxHp: 100,
    speed: 105,
    attack: "magic",
    attackCooldown: 0.6,
    damage: 26,
    range: 240,
    arc: 0,
    aoe: 0,
    shotSpeed: 280,
    pierce: 0,
    shot: "stone",
    skill: { kind: "hurricane", name: "HURRICANE", cooldown: 12, damage: 26, radius: 140, duration: 3.5 },
    // FROST SIGIL: drawn FROST_SIGIL_REACH ahead, `radius` wide, lasts 10s; each enemy is frozen `duration` once.
    skill2: { kind: "frost", name: "FROST SIGIL", cooldown: 14, damage: 20, radius: 42, duration: 3 },
  },
  lawliet: {
    name: "The Detective",
    role: "Chess master",
    blurb: "Weak hits; fights through his chess pieces. PAWN: places a pawn that follows him and attacks up close (low HP, quick cooldown, up to 3). QUEEN (E): places a queen that stands still as a turret, with lots of HP, firing heavy shots across the whole arena.",
    stars: 4,
    maxHp: 100,
    speed: 116,
    attack: "punch",
    attackCooldown: 0.45,
    damage: 12,
    range: 20,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // PAWN: `damage` is its share of his max HP; up to `max` out at once, each for `duration` seconds.
    skill: { kind: "summon", name: "PAWN", cooldown: 4, damage: 0.105, radius: 0, count: 1, max: 3, duration: 20, pet: "pawn" },
    // QUEEN: a turret with `damage` times his max HP, for `duration` seconds.
    skill2: { kind: "summon", name: "QUEEN", cooldown: 22, damage: 0.45, radius: 0, count: 1, duration: 12, pet: "queen" },
  },
  thorfinn: {
    name: "Viking Kid",
    role: "Dagger warrior",
    blurb: "Quick twin-dagger slashes. DAGGER RUSH dashes forward, cutting every enemy on the way. KNIFE STORM (E): throws 12 knives out in every direction.",
    stars: 3,
    maxHp: 120,
    speed: 130,
    attack: "sword",
    attackCooldown: 0.28,
    damage: 20,
    range: 26,
    arc: 1.8,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "rush", name: "DAGGER RUSH", cooldown: 4, damage: 82.5, radius: 120, width: 24 },
    // KNIFE STORM: `count` knives in a ring, flying `radius` far.
    skill2: { kind: "knives", name: "KNIFE STORM", cooldown: 8, damage: 33, radius: 200, count: 12 },
  },
  titan: {
    name: "Giant Shifter",
    role: "Shifter",
    blurb: "Very weak hits as a human. GIANT FORM turns him into a 50m giant for 10s: every hit smashes everything around him. ODM GEAR (E, 0.5s): fire a wire into the wall ahead and zip along it.",
    stars: 4,
    maxHp: 165,
    speed: 105,
    attack: "punch",
    attackCooldown: 0.5,
    damage: 6,
    range: 20,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // In Titan form: damage and radius of each smash, and seconds between smashes.
    skill: { kind: "titan", name: "GIANT FORM", cooldown: 20, damage: 90, radius: 75, duration: 10 },
    // ODM GEAR: the wire reaches `radius`; he zips to where it hits a wall (or its end).
    skill2: { kind: "grapple", name: "ODM GEAR", cooldown: 0.5, damage: 0, radius: 260 },
  },
  yaotsu: {
    name: "Glitch God",
    role: "Indignia God",
    blurb: "2x HP. CREATOR builds a whole city: enemies inside lose 2% HP/s, he heals 0.8%/s. REALITY CHANGE turns every enemy into an ordinary human for 3s.",
    stars: 4,
    maxHp: 200,
    speed: 210,
    attack: "magic",
    attackCooldown: 0.5,
    damage: 60,
    range: 240,
    arc: 0,
    aoe: 0,
    shotSpeed: 300,
    pierce: 0,
    shot: "glitch",
    skill: { kind: "city", name: "CREATOR", cooldown: 20, damage: 0.02, radius: 380, duration: 15 },
    skill2: { kind: "reality", name: "REALITY CHANGE", cooldown: 25, damage: 1, radius: 0, duration: 3 },
  },
  loki: {
    name: "Trickster",
    role: "Trickster god",
    blurb: "Magic shots. ILLUSION: hold to pick any hero (a faint red light falls on it), let go and for 10s he looks just like it to his rivals. CLONE makes a copy that fights, and nobody can tell which one is real.",
    stars: 5,
    maxHp: 120,
    speed: 110,
    attack: "magic",
    attackCooldown: 0.6,
    damage: 24,
    range: 230,
    arc: 0,
    aoe: 0,
    shotSpeed: 260,
    pierce: 0,
    shot: "loki",
    // ILLUSION (user request 2026-10-07): hold to pick a hero (a faint red light falls on it), let go to look just like it.
    skill: { kind: "mimic", name: "ILLUSION", cooldown: 22, damage: 0, radius: 600, duration: 10 },
    // CLONE: an exact copy (same name, HP and look) that fights on its own for `duration` seconds.
    skill2: { kind: "clone", name: "CLONE", cooldown: 12, damage: 0.25, radius: 0, duration: 20 },
  },
  sakamoto: {
    name: "Retired Hitman",
    role: "Hitman",
    blurb: "Quick knife slashes. SWAP MODE pulls out a machine gun that fires very fast; use it again to go back to the knife. STICKY BOMB (E): darts up to the nearest target and sticks a bomb on it that blows them far away.",
    stars: 4,
    maxHp: 130,
    speed: 130,
    attack: "sword",
    attackCooldown: 0.25,
    damage: 22,
    range: 28,
    arc: 1.8,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    gun: { attackCooldown: 0.06, damage: 6, range: 240, shotSpeed: 520, spread: 0.08 },
    skill: { kind: "swap", name: "SWAP MODE", cooldown: 0.8, damage: 0, radius: 0 },
    // STICKY BOMB: dart up to `radius` away; the bomb goes off after `duration` seconds and throws the target `width` knockbacks far.
    skill2: { kind: "sticky", name: "STICKY BOMB", cooldown: 9, damage: 92.6, radius: 160, width: 5, duration: 0.8 },
  },
  joyboy: {
    name: "Rubber Pirate",
    role: "Rubber brawler",
    blurb: "1.5x HP. Stretchy punches reach further. GATLING PUNCH fires a storm of fists down a medium-range lane, smashing shots in it. RUBBER PUNCH (E): the arm shoots out fast; anyone the fist hits is stunned for 1s, then it snaps back.",
    stars: 4,
    maxHp: 180,
    speed: 110,
    attack: "punch",
    attackCooldown: 0.4,
    damage: 30,
    range: 30,
    arc: 1.2,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // GATLING PUNCH: `damage` per hit, every 0.1s for `duration`, in a lane `radius` long and `width` wide.
    skill: { kind: "gatling", name: "GATLING PUNCH", cooldown: 6, damage: 28, radius: 110, width: 40, duration: 1 },
    // RUBBER PUNCH: a fast stretching punch that stuns for 1s, then snaps back.
    skill2: { kind: "rubberpunch", name: "RUBBER PUNCH", cooldown: 10, damage: 40, radius: 0, duration: 3 },
  },
  rick: {
    name: "Mad Scientist",
    role: "Inventor",
    blurb: "Laser gun. PORTAL GUN: shoot one portal, then another; walk into one to come out of the other (only he can use them); the 7s cooldown only starts once the pair has closed. MISSILES: 10 homing missiles that chase targets until they hit.",
    stars: 5,
    maxHp: 110,
    speed: 110,
    attack: "magic",
    attackCooldown: 0.45,
    damage: 22,
    range: 260,
    arc: 0,
    aoe: 0,
    shotSpeed: 420,
    pierce: 0,
    shot: "laser",
    // PORTAL GUN: each press opens a portal up to `radius` ahead; the pair stays open `duration` seconds.
    skill: { kind: "portal", name: "PORTAL GUN", cooldown: 7, damage: 0, radius: 160, duration: 20, waitGone: "portal" },
    skill2: { kind: "missiles", name: "MISSILES", cooldown: 14, damage: 25, radius: 0, count: 10, duration: 8 },
  },
  doraemon: {
    name: "Gadget Cat",
    role: "Robot cat",
    blurb: "1.5x HP. Air cannon blasts. BIG LIGHT shines a flashlight ahead: enemies caught in it grow bigger (easier to hit) and walk at half speed for 5s. GUNNER BOTS: 6 little gunner robots (15% of his HP each).",
    stars: 3,
    maxHp: 180,
    speed: 100,
    attack: "magic",
    attackCooldown: 0.6,
    damage: 26,
    range: 220,
    arc: 0,
    aoe: 30,
    shotSpeed: 260,
    pierce: 0,
    shot: "air",
    // BIG LIGHT: a cone `radius` long and `width` radians wide (each side).
    skill: { kind: "biglight", name: "BIG LIGHT", cooldown: 12, damage: 0, radius: 170, width: 0.6, duration: 5 },
    skill2: { kind: "summon", name: "GUNNER BOTS", cooldown: 22, damage: 0.15, radius: 0, count: 6, duration: 15, pet: "gunbot" },
  },
  trainer: {
    name: "Monster Tamer",
    role: "Tamer",
    blurb: "Weak, slow punches. SPARK MOUSE: a fast electric mouse (30% HP) zaps enemies. FLAME DRAGON: a big fire dragon (100% HP). Pets stay until they fall or the Tamer does; each 10s cooldown only starts once its pet has fallen.",
    stars: 3,
    maxHp: 110,
    speed: 110,
    attack: "punch",
    attackCooldown: 0.9,
    damage: 10,
    range: 18,
    arc: 1.2,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "summon", name: "SPARK MOUSE", cooldown: 10, damage: 0.3, radius: 0, count: 1, pet: "sparkmouse", waitGone: "pet" },
    skill2: { kind: "summon", name: "FLAME DRAGON", cooldown: 10, damage: 1, radius: 0, count: 1, pet: "flamedragon", waitGone: "pet" },
  },
  kid: {
    name: "Phantom Thief",
    role: "Magician",
    blurb: "Card-gun shots. DRAW CARD throws a random card 1-9: the higher the number, the more of the target's max HP it takes. THE MAGICIAN (E): vanishes into a flock of doves for 2s and takes no damage.",
    stars: 4,
    maxHp: 115,
    speed: 143,
    attack: "magic",
    attackCooldown: 0.4,
    damage: 18,
    range: 220,
    arc: 0,
    aoe: 0,
    shotSpeed: 420,
    pierce: 0,
    shot: "bullet",
    skill: { kind: "card", name: "DRAW CARD", cooldown: 7, damage: 0.1, radius: 260 },
    // THE MAGICIAN: a flock of doves for `duration` seconds: no damage taken, no attacks.
    skill2: { kind: "doves", name: "THE MAGICIAN", cooldown: 12, damage: 0, radius: 0, duration: 2 },
  },
  hanuman: {
    name: "Hanuman",
    role: "Monkey god",
    blurb: "Quick trident thrusts. REVIVE: for 5s after pressing it, falling brings him straight back up. GIANT PALM (E): a giant palm comes down from the sky, crushing the spot and stunning for 2s.",
    stars: 3,
    maxHp: 130,
    speed: 165,
    attack: "sword",
    attackCooldown: 0.25,
    damage: 40,
    range: 44,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // REVIVE: if he falls within `duration` seconds, he gets back up with `damage` of his max HP.
    skill: { kind: "revive", name: "REVIVE", cooldown: 25, damage: 0.5, radius: 0, duration: 5 },
    // GIANT PALM: lands up to `width` ahead, crushes everything within `radius` and stuns it `duration` seconds.
    skill2: { kind: "palm", name: "GIANT PALM", cooldown: 12, damage: 80, radius: 70, width: 150, duration: 2 },
  },
  badigadi: {
    name: "Demon Lord",
    role: "Four-armed demon",
    blurb: "3x HP. Slow, crushing four-armed blows hit a wide area. IMMORTAL: a barrier blocks all damage for 3s and heals 4% HP/s. GRAB SLAM (E): darts in, grabs the nearest target in front, leaps and slams it down, stunning for 2s.",
    stars: 3,
    maxHp: 360,
    speed: 132,
    attack: "punch",
    attackCooldown: 1.1,
    damage: 65,
    range: 44,
    arc: 3.2,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "immortal", name: "IMMORTAL", cooldown: 18, damage: 0.1, radius: 0, duration: 3 },
    // GRAB SLAM: reaches `radius`; the slam stuns `duration` seconds.
    skill2: { kind: "grab", name: "GRAB SLAM", cooldown: 10, damage: 70, radius: 150, duration: 2 },
  },
  taekwondo: {
    name: "Taekwondo Master",
    role: "Kicker",
    blurb: "Fast straight kicks that reach mid range. FLASH KICK darts in to kick the nearest target in front, stuns it for 1s, and lands back where he started. SPINNING KICK (E): spins on the spot and kicks everything around him away.",
    stars: 4,
    maxHp: 125,
    speed: 125,
    attack: "punch",
    lineAttack: 14,
    attackCooldown: 0.25,
    damage: 14,
    range: 52,
    arc: 0.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "dashkick", name: "FLASH KICK", cooldown: 5, damage: 45, radius: 170, duration: 1 },
    skill2: { kind: "spinkick", name: "SPINNING KICK", cooldown: 6, damage: 55, radius: 62, duration: 0.45 },
  },
  zenitsu: {
    name: "Thunder Sleeper",
    role: "Lightning swordsman",
    blurb: "A jumpy swordsman who only shines when it counts. THUNDER DASH: a lightning-fast dash that cuts the whole lane; every hit lets him dash again within 2s, so he can chain dashes; when the 2s run out, the cooldown starts. SEVENTH FORM (E): a huge lightning dash cutting a wide lane, which keeps crackling with lightning for 3s.",
    stars: 4,
    maxHp: 115,
    speed: 135,
    attack: "sword",
    attackCooldown: 0.45,
    damage: 18,
    range: 40,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // THUNDER DASH: dashes `radius`, cutting a lane `width` wide; a hit opens a second dash for `duration` seconds.
    skill: { kind: "thunderdash", name: "THUNDER DASH", cooldown: 6, damage: 52, radius: 150, width: 26, duration: 2 },
    // SEVENTH FORM: dashes `radius` cutting a lane `width` wide; the lane crackles for `duration` seconds.
    skill2: { kind: "seventh", name: "SEVENTH FORM", cooldown: 12, damage: 78, radius: 230, width: 70, duration: 3 },
  },
  theworld: {
    name: "Time Emperor",
    role: "Time tyrant",
    blurb: "Punches incredibly fast. TRUCK SMASH drops a truck on the spot he aimed at 2s later. He and the Chrono Brawler can move in each other's stopped time. TIME STOP (E): stops time for 4s; only he (and the Chrono Brawler) can move.",
    stars: 4,
    maxHp: 150,
    speed: 110,
    attack: "punch",
    attackCooldown: 0.07,
    damage: 9,
    range: 22,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // TRUCK SMASH: the truck lands `radius` away at most and crushes everything within 60.
    skill: { kind: "truck", name: "TRUCK SMASH", cooldown: 18, damage: 140, radius: 170, duration: 2 },
    skill2: { kind: "timestop", name: "TIME STOP", cooldown: 20, damage: 0, radius: 0, duration: 4 },
  },
  swordgod: {
    name: "Sword God",
    role: "Sword saint",
    blurb: "The Sword Dojo's master, now on your side. Quick forward cuts like his flurry. LIGHTNING DASH lunges ahead cutting everything on the way and ends in a full spin cut. SLASH FAN (E) throws a fan of 5 flying sword slashes.",
    stars: 4,
    maxHp: 130,
    speed: 120,
    attack: "sword",
    attackCooldown: 0.3,
    damage: 22,
    range: 46,
    arc: 1.7,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // LIGHTNING DASH: `radius` is the lunge length; the spin at the end hits everything within 66.
    skill: { kind: "godrush", name: "LIGHTNING DASH", cooldown: 6, damage: 50, radius: 160, width: 26 },
    // SLASH FAN: `count` slashes, `width` radians apart, flying `radius` far.
    skill2: { kind: "fan", name: "SLASH FAN", cooldown: 7, damage: 26, radius: 260, width: 0.24, count: 5 },
  },
  steve: {
    name: "Block Crafter",
    role: "Builder",
    blurb: "Weak punches. DIAMOND SWORD: 10s of strong, long, fast sword swings. BUILD (E): place a random block where you aim: dirt (blocks a hit), TNT (explodes with a huge knockback when hit) or a craft table (break it yourself for 2x damage for good).",
    stars: 4,
    maxHp: 120,
    speed: 112,
    attack: "punch",
    attackCooldown: 0.45,
    damage: 8,
    range: 20,
    arc: 1.2,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    sword: { attackCooldown: 0.28, damage: 45, range: 44, arc: 2.2 },
    skill: { kind: "diamond", name: "DIAMOND SWORD", cooldown: 16, damage: 0, radius: 0, duration: 10 },
    skill2: { kind: "build", name: "BUILD", cooldown: 3, damage: 90, radius: 110 },
  },
  agamemnon: {
    name: "Agamemnon",
    role: "King of kings",
    blurb: "2x HP, bronze sword sweeps. SUMMON GLADIATORS calls 20 gladiators (10% of his HP each) to fight for 20 seconds. TROJAN HORSE (E): a wooden horse counts down 10s, then bursts open in a huge blast.",
    stars: 3,
    maxHp: 220,
    speed: 105,
    attack: "sword",
    attackCooldown: 0.45,
    damage: 28,
    range: 40,
    arc: 2.2,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "summon", name: "GLADIATORS", cooldown: 30, damage: 0.1, radius: 0, count: 20, duration: 20, pet: "gladiator" },
    // TROJAN HORSE: placed `width` ahead, it waits `duration` seconds, then blasts everything within `radius`.
    skill2: { kind: "trojan", name: "TROJAN HORSE", cooldown: 20, damage: 2250, radius: 120, width: 60, duration: 10 },
  },
  vampire: {
    name: "Vampire",
    role: "Night hunter",
    blurb: "Quick claw swipes. BLOOD LATCH leaps onto the nearest target in front, clings to it for 3s and drains its blood to heal. BAT FORM (E): 6s as a bat: attacks come about 3x as fast and heal 25% of the damage dealt.",
    stars: 3,
    maxHp: 120,
    speed: 130,
    attack: "sword",
    attackCooldown: 0.3,
    damage: 16,
    range: 26,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // BLOOD LATCH: leap up to `radius`, then `damage` per second for `duration`, healing the same.
    skill: { kind: "latch", name: "BLOOD LATCH", cooldown: 9, damage: 40, radius: 170, duration: 3 },
    // BAT FORM: for `duration` seconds attacks come `width` times as often and heal `damage` of the damage dealt.
    skill2: { kind: "bat", name: "BAT FORM", cooldown: 15, damage: 0.25, radius: 0, duration: 6, width: 0.35 },
  },
  rider: {
    name: "Hopper Rider",
    role: "Masked hero",
    blurb: "1.5x HP, very fast punches. RIDER KICK leaps into a flying kick that stuns everything it hits for 2s. MOTORCYCLE (E): rides for 4s, 2.2x faster; whoever he rams is stunned 1s and knocked back.",
    stars: 4,
    maxHp: 165,
    speed: 165,
    attack: "punch",
    attackCooldown: 0.18,
    damage: 12,
    range: 24,
    arc: 1.2,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "kick", name: "RIDER KICK", cooldown: 8, damage: 70, radius: 150, width: 30, duration: 2 },
    // MOTORCYCLE: `width` times faster for `duration` seconds; ramming hits for `damage`, stuns 1s and knocks back.
    skill2: { kind: "bike", name: "MOTORCYCLE", cooldown: 14, damage: 45, radius: 22, duration: 4, width: 2.2 },
  },
  // Summons (not pickable): their HP comes from the summoner's skill.
  gunbot: {
    name: "Gunner Bot",
    role: "Summon",
    blurb: "",
    stars: 1,
    summon: true,
    maxHp: 1,
    speed: 110,
    attack: "magic",
    attackCooldown: 0.5,
    damage: 8,
    range: 200,
    arc: 0,
    aoe: 0,
    shotSpeed: 380,
    pierce: 0,
    shot: "bullet",
    skill: { kind: "passive", name: "", cooldown: 1, damage: 0, radius: 0 },
  },
  sparkmouse: {
    name: "Spark Mouse",
    role: "Summon",
    blurb: "",
    stars: 1,
    summon: true,
    maxHp: 1,
    speed: 220,
    attack: "lightning",
    attackCooldown: 0.8,
    damage: 18,
    range: 60,
    arc: 0,
    aoe: 34,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "passive", name: "", cooldown: 1, damage: 0, radius: 0 },
  },
  warrior: {
    name: "Warrior",
    role: "Knight",
    blurb: "Sturdy swordsman. CLEAVE: hold to charge, let go for a wide sword cleave that grows with the charge. PARRY (E): for a moment, shots that hit him fly back at whoever fired them.",
    stars: 3,
    maxHp: 150,
    speed: 100,
    attack: "sword",
    attackCooldown: 0.55,
    damage: 30,
    range: 26,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // CLEAVE: a `width`-radian sword arc `radius` long; a full charge hits up to x4 and reaches further.
    skill: { kind: "chargeslash", name: "CLEAVE", cooldown: 6, damage: 40, radius: 46, width: 2.6 },
    // PARRY: `duration` seconds of reflecting shots, which fly back `damage` times as hard.
    skill2: { kind: "reflect", name: "PARRY", cooldown: 7, damage: 1.5, radius: 0, duration: 1 },
  },
  archer: {
    name: "Archer",
    role: "Bow ranger",
    blurb: "Shoots arrows from afar. POWER SHOT: hold until fully charged, then let go for one heavy arrow that pierces and stuns. SWIFT (E): runs 50% faster for 4s, and his next shot fires three arrows in a quick row.",
    stars: 4,
    maxHp: 95,
    speed: 110,
    attack: "magic",
    attackCooldown: 0.5,
    damage: 22,
    range: 260,
    arc: 0,
    aoe: 0,
    shotSpeed: 420,
    pierce: 0,
    shot: "arrow",
    // POWER SHOT: fires only at full charge (`chargeTime` s); flies `radius`, stuns `duration` s.
    skill: { kind: "chargeshot", name: "POWER SHOT", cooldown: 5, damage: 160, radius: 380, duration: 1.2, chargeTime: 1.2 },
    skill2: { kind: "sprint", name: "SWIFT", cooldown: 10, damage: 0, radius: 0, duration: 4, width: 1.5 },
  },
  ninja: {
    name: "Ninja",
    role: "Shadow assassin",
    blurb: "Quick dagger cuts. SHADOW STEP: dashes ahead, cutting the way and leaving a shadow behind; use it again within 3s to flash back to the shadow. SHURIKEN (E): five throwing stars in a fan straight ahead.",
    stars: 4,
    maxHp: 100,
    speed: 120,
    attack: "sword",
    attackCooldown: 0.4,
    damage: 20,
    range: 22,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // SHADOW STEP: a `radius` dash cutting a `width` lane; the shadow waits `duration` seconds.
    skill: { kind: "shadowstep", name: "SHADOW STEP", cooldown: 6, damage: 30, radius: 130, width: 24, duration: 3 },
    skill2: { kind: "shuriken", name: "SHURIKEN", cooldown: 5, damage: 20, radius: 240, count: 5, width: 0.2 },
  },
  paladin: {
    name: "Paladin",
    role: "Holy knight",
    blurb: "Very tough. HOLY SHIELD: a shield of light; he and allies nearby take no damage for 2.5s. SHIELD BASH (E): hold to charge, let go to drive ahead shield first, shoving every foe in front along with him; a full charge (or a wall) stuns them.",
    stars: 3,
    maxHp: 280,
    speed: 95,
    attack: "sword",
    attackCooldown: 0.7,
    damage: 26,
    range: 24,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "shield", name: "HOLY SHIELD", cooldown: 14, damage: 0, radius: 110, duration: 2.5 },
    // SHIELD BASH: rushes up to `radius` (by charge); a full charge stuns `duration` seconds.
    skill2: { kind: "shieldcharge", name: "SHIELD BASH", cooldown: 8, damage: 20, radius: 150, width: 30, duration: 2, chargeTime: 1.5 },
  },
  druid: {
    name: "Druid",
    role: "Forest keeper",
    blurb: "Leaf magic. GROW TREE: plants a tree that can't be destroyed and never goes away; standing near his trees heals him 1.2% HP a second for each. LEAF STORM (E): a storm of leaves that hits harder for every tree he has planted.",
    stars: 3,
    maxHp: 110,
    speed: 105,
    attack: "magic",
    attackCooldown: 0.6,
    damage: 20,
    range: 220,
    arc: 0,
    aoe: 0,
    shotSpeed: 300,
    pierce: 0,
    shot: "leaf",
    stacks: { label: "TREES" },
    // GROW TREE: planted `width` ahead; heals `damage` of max HP a second within `radius`.
    skill: { kind: "tree", name: "GROW TREE", cooldown: 6, damage: 0.03, radius: 100, width: 40 },
    // LEAF STORM: `damage`, plus `width` more of it for every tree.
    skill2: { kind: "leafstorm", name: "LEAF STORM", cooldown: 4, damage: 30, radius: 300, width: 0.35 },
  },
  monk: {
    name: "Monk",
    role: "Martial artist",
    blurb: "Fast palm strikes. FOCUS: the next basic attack hits 3x as hard and stuns for 1.2s. SKY LEAP (E): jumps onto the aimed spot, crushing and stunning everything around the landing.",
    stars: 4,
    maxHp: 130,
    speed: 110,
    attack: "punch",
    attackCooldown: 0.4,
    damage: 22,
    range: 20,
    arc: 1.5,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // FOCUS: next hit `damage` times as hard, stunning `duration` seconds.
    skill: { kind: "empower", name: "FOCUS", cooldown: 6, damage: 3, radius: 0, duration: 1.2 },
    // SKY LEAP: lands up to `width` away; hits everything within `radius`, stunning `duration` seconds.
    skill2: { kind: "leap", name: "SKY LEAP", cooldown: 9, damage: 50, radius: 55, width: 170, duration: 1 },
  },
  robot: {
    name: "Robot",
    role: "Battle bot",
    blurb: "Slow blue blaster shots, one at a time. BOOSTING: one more shot per attack, up to 3 times (4 shots at once). PLASMA LASER (E): one blue laser blast straight ahead.",
    stars: 3,
    maxHp: 120,
    speed: 100,
    attack: "magic",
    attackCooldown: 0.8,
    damage: 24,
    range: 260,
    arc: 0,
    aoe: 0,
    shotSpeed: 200,
    pierce: 0,
    shot: "bluebolt",
    stacks: { label: "BOOST", max: 3 },
    skill: { kind: "boost", name: "BOOSTING", cooldown: 12, damage: 0, radius: 0, count: 3 },
    skill2: { kind: "bluelaser", name: "PLASMA LASER", cooldown: 9, damage: 110, radius: 320, width: 14 },
  },
  golem: {
    name: "Stone Titan",
    role: "Living rock",
    blurb: "Huge HP, heavy punches. HARDEN: takes 5% less damage, stacking up to 10 times. ROCK BARRAGE (E): a flurry of punches ahead; foes pinned against a wall are stunned, the rest are knocked back.",
    stars: 3,
    maxHp: 300,
    speed: 85,
    attack: "punch",
    attackCooldown: 0.8,
    damage: 34,
    range: 24,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    stacks: { label: "ARMOR", max: 10 },
    // HARDEN: `damage` less damage taken per stack, up to `count` stacks.
    skill: { kind: "harden", name: "HARDEN", cooldown: 6, damage: 0.05, radius: 0, count: 10 },
    // ROCK BARRAGE: `count` punches down a `radius` x `width` lane over `duration`*0.5 s; pinned foes are stunned `duration` s.
    skill2: { kind: "barrage", name: "ROCK BARRAGE", cooldown: 9, damage: 14, radius: 50, width: 40, count: 6, duration: 1.5 },
  },
  // The eleven heroes of 2026-10-05 (second sheet + the Hacker).
  hacker: {
    name: "Hacker",
    role: "Code breaker",
    blurb: "Glitched code bolts. REALITY: rewrites the nearest foe into a plain rock for 3s (it can't move or act). ERROR (E): becomes a glitch and zips around the map at random for 5s, hurting whatever each jump passes through.",
    stars: 3,
    maxHp: 100,
    speed: 105,
    attack: "magic",
    shot: "glitch",
    attackCooldown: 0.5,
    damage: 22,
    range: 240,
    arc: 0,
    aoe: 0,
    shotSpeed: 380,
    pierce: 0,
    skill: { kind: "petrify", name: "REALITY", cooldown: 12, damage: 0, radius: 260, duration: 3 },
    // ERROR: a jump every `width` s, each `radius` long at most, hurting for `damage`.
    skill2: { kind: "error", name: "ERROR", cooldown: 14, damage: 18, radius: 220, width: 0.3, duration: 5 },
  },
  reaper: {
    name: "Reaper",
    role: "Soul collector",
    blurb: "Wide scythe cuts. SOUL REAP: a full spin; every foe hit gives a soul (up to 5) and heals him 5%. DEATH'S DOOR (E): vanishes into the nearest foe and walks it wherever he likes for 5s.",
    stars: 3,
    maxHp: 110,
    speed: 105,
    attack: "sword",
    attackCooldown: 0.55,
    damage: 24,
    range: 34,
    arc: 2.2,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    stacks: { label: "SOULS", max: 5 },
    // SOUL REAP: `damage` in a full circle of `radius`; heals `width` of max HP per foe hit.
    skill: { kind: "reap", name: "SOUL REAP", cooldown: 6, damage: 26, radius: 60, width: 0.125, count: 5 },
    skill2: { kind: "possess", name: "DEATH'S DOOR", cooldown: 10, damage: 0, radius: 200, duration: 5, desc: "vanishes into the nearest foe within 200 and walks it wherever he likes for 5s (it cannot attack or use skills); he is gone from the map meanwhile." },
  },
  mossgolem: {
    name: "Moss Golem",
    role: "Ancient guardian",
    blurb: "Huge HP, mossy fists. ROOT SNARE: roots burst out all around him; every foe caught must run at him and attack only him for 2s. GAIA SHELL (E): moss covers him for 5s; he takes half damage and heals 1.2% HP a second.",
    stars: 3,
    maxHp: 300,
    speed: 85,
    attack: "punch",
    attackCooldown: 0.8,
    damage: 30,
    range: 24,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "taunt", name: "ROOT SNARE", cooldown: 8, damage: 15, radius: 100, duration: 2, desc: "roots burst out around him: every foe within 100 must run at him and attack only him for 2s (no skills)." },
    // GAIA SHELL: takes `width` of normal damage, heals `damage` of max HP a second.
    skill2: { kind: "gaia", name: "GAIA SHELL", cooldown: 14, damage: 0.03, radius: 0, width: 0.5, duration: 5 },
  },
  berserker: {
    name: "Berserker",
    role: "Raging axeman",
    blurb: "Heavy axe swings. BLOOD RAGE: for 6s he swings much faster and 30% harder, but takes 15% more damage. AXE BOOMERANG (E): hurls his axe; it spins out and comes back, cutting everything both ways and dragging whoever it hits back with it.",
    stars: 4,
    maxHp: 160,
    speed: 100,
    attack: "sword",
    attackCooldown: 0.6,
    damage: 45,
    range: 30,
    arc: 1.8,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // BLOOD RAGE: for `duration` s attack cooldown x`width`, damage x`damage`, and he takes RAGE_TAKEN more damage.
    skill: { kind: "rage", name: "BLOOD RAGE", cooldown: 12, damage: 1.3, radius: 0, width: 0.6, duration: 6 },
    skill2: { kind: "axethrow", name: "AXE BOOMERANG", cooldown: 7, damage: 34, radius: 200 },
  },
  jester: {
    name: "Jester",
    role: "Prankster",
    blurb: "Juggling balls. JACK-IN-THE-BOX: drops a box trap (up to 3) that springs on the first foe to come close: a big hit that stuns and throws it back. SWITCHEROO (E): swaps places with the nearest foe and leaves a confetti bomb where he stood.",
    stars: 3,
    maxHp: 100,
    speed: 110,
    attack: "magic",
    shot: "ball",
    attackCooldown: 0.4,
    damage: 18,
    range: 220,
    arc: 0,
    aoe: 0,
    shotSpeed: 360,
    pierce: 0,
    // JACK-IN-THE-BOX: springs on a foe within `radius`; `damage`, stun `duration`; boxes last 20s.
    skill: { kind: "jackbox", name: "JACK-IN-THE-BOX", cooldown: 4, damage: 50, radius: 34, duration: 1, max: 3 },
    // SWITCHEROO: swaps with the nearest foe within `radius`; the bomb hits `damage` in `width` after 0.6s.
    skill2: { kind: "switch", name: "SWITCHEROO", cooldown: 10, damage: 40, radius: 300, width: 55 },
  },
  blacksmith: {
    name: "Blacksmith",
    role: "Master of the forge",
    blurb: "Hammer blows that throw foes back. ANVIL DROP: an anvil falls on the aimed spot, crushing and stunning. FORGE SPARKS (E): a hammer strike sends a cone of red-hot sparks flying.",
    stars: 4,
    maxHp: 150,
    speed: 95,
    attack: "punch",
    attackCooldown: 0.65,
    damage: 30,
    range: 26,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    knock: 1.5,
    // ANVIL DROP: lands `width` ahead after a moment: `damage` in `radius`, stun `duration`.
    skill: { kind: "anvil", name: "ANVIL DROP", cooldown: 7, damage: 60, radius: 45, width: 140, duration: 1.5 },
    skill2: { kind: "sparks", name: "FORGE SPARKS", cooldown: 6, damage: 16, radius: 180, count: 7, width: 0.9 },
  },
  geomancer: {
    name: "Geomancer",
    role: "Earth shaper",
    blurb: "Flings pebbles. STONE WALL: raises a wall of rocks across the aim for 6s that stops shots until broken. EARTHQUAKE (E): the ground shakes around him for 2s, hurting and slowing every foe nearby.",
    stars: 3,
    maxHp: 110,
    speed: 100,
    attack: "magic",
    shot: "pebble",
    attackCooldown: 0.55,
    damage: 22,
    range: 230,
    arc: 0,
    aoe: 0,
    shotSpeed: 340,
    pierce: 0,
    // STONE WALL: `count` rocks across the aim, `radius` ahead, for `duration` seconds.
    skill: { kind: "wall", name: "STONE WALL", cooldown: 10, damage: 0, radius: 50, count: 5, duration: 6 },
    skill2: { kind: "quake", name: "EARTHQUAKE", cooldown: 9, damage: 12, radius: 130, duration: 2 },
  },
  pyromancer: {
    name: "Pyromancer",
    role: "Fire witch",
    blurb: "Fireballs. METEOR: a meteor crashes down on the aimed spot and leaves the ground burning for 3s. FLAME DASH (E): dashes ahead through foes, leaving a trail of fire behind.",
    stars: 3,
    maxHp: 100,
    speed: 105,
    attack: "magic",
    shot: "firebolt",
    attackCooldown: 0.6,
    damage: 24,
    range: 230,
    arc: 0,
    aoe: 0,
    shotSpeed: 300,
    pierce: 0,
    // METEOR: falls `width` ahead: `damage` in `radius`, then burning ground for `duration`.
    skill: { kind: "meteor", name: "METEOR", cooldown: 8, damage: 70, radius: 60, width: 170, duration: 3 },
    skill2: { kind: "flamedash", name: "FLAME DASH", cooldown: 7, damage: 20, radius: 150, width: 28, duration: 3 },
  },
  cryomancer: {
    name: "Cryomancer",
    role: "Ice witch",
    blurb: "Ice shards that slow. ICE PRISON: freezes the nearest foe in a block of ice for 1.8s. BLIZZARD (E): a snowstorm on the aimed spot for 4s that hurts and slows everything in it.",
    stars: 3,
    maxHp: 100,
    speed: 105,
    attack: "magic",
    shot: "iceshard",
    attackCooldown: 0.5,
    damage: 20,
    range: 240,
    arc: 0,
    aoe: 0,
    shotSpeed: 380,
    pierce: 0,
    slowHit: 1,
    skill: { kind: "iceprison", name: "ICE PRISON", cooldown: 10, damage: 30, radius: 240, duration: 1.8 },
    // BLIZZARD: `width` ahead, `radius` wide, `damage` every 0.5s for `duration`.
    skill2: { kind: "blizzard", name: "BLIZZARD", cooldown: 11, damage: 10, radius: 90, width: 150, duration: 4 },
  },
  lancer: {
    name: "Lancer",
    role: "Spear knight",
    blurb: "Long spear thrusts down a lane. PIERCING CHARGE: charges ahead spear first, throwing everything in the way far back. DRAGOON DIVE (E): leaps out of reach for 1s, then crashes down on the aimed spot, stunning.",
    stars: 4,
    maxHp: 140,
    speed: 100,
    attack: "punch",
    lineAttack: 16,
    attackCooldown: 0.55,
    damage: 26,
    range: 48,
    arc: 0.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "lancecharge", name: "PIERCING CHARGE", cooldown: 7, damage: 30, radius: 180, width: 30 },
    // DRAGOON DIVE: in the air `duration`, lands `width` ahead: `damage` in `radius`, stun 1s.
    skill2: { kind: "dive", name: "DRAGOON DIVE", cooldown: 11, damage: 55, radius: 60, width: 200, duration: 1 },
  },
  oni: {
    name: "Oni",
    role: "Mountain demon",
    blurb: "Huge HP, a kanabo club that throws foes back. DEMON ROAR: a roar that stuns and throws back everything nearby. KANABO CYCLONE (E): spins the club around three times, smashing everything close.",
    stars: 5,
    maxHp: 290,
    speed: 90,
    attack: "punch",
    attackCooldown: 0.85,
    damage: 36,
    range: 28,
    arc: 1.8,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    knock: 2,
    skill: { kind: "roar", name: "DEMON ROAR", cooldown: 9, damage: 15, radius: 120, duration: 0.8 },
    skill2: { kind: "cyclone", name: "KANABO CYCLONE", cooldown: 8, damage: 28, radius: 55, count: 3 },
  },
  pawn: {
    name: "Pawn",
    role: "Summon",
    blurb: "",
    stars: 1,
    summon: true,
    maxHp: 1,
    speed: 110,
    attack: "punch",
    attackCooldown: 0.6,
    damage: 110,
    range: 22,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "passive", name: "", cooldown: 1, damage: 0, radius: 0 },
  },
  queen: {
    name: "Queen",
    role: "Summon",
    blurb: "",
    stars: 1,
    summon: true,
    turret: true,
    maxHp: 1,
    speed: 0,
    attack: "magic",
    attackCooldown: 1,
    damage: 320,
    range: 1200, // the whole PvP arena
    arc: 0,
    aoe: 0,
    shotSpeed: 330,
    pierce: 0,
    shot: "laser",
    skill: { kind: "passive", name: "", cooldown: 1, damage: 0, radius: 0 },
  },
  gladiator: {
    name: "Gladiator",
    role: "Summon",
    blurb: "",
    stars: 1,
    summon: true,
    maxHp: 1,
    speed: 115,
    attack: "sword",
    attackCooldown: 0.7,
    damage: 10,
    range: 24,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "passive", name: "", cooldown: 1, damage: 0, radius: 0 },
  },
  flamedragon: {
    name: "Flame Dragon",
    role: "Summon",
    blurb: "",
    stars: 1,
    summon: true,
    maxHp: 1,
    speed: 165,
    attack: "magic",
    attackCooldown: 1,
    damage: 30,
    range: 200,
    arc: 0,
    aoe: 40,
    shotSpeed: 200,
    pierce: 0,
    shot: "dragonfire",
    skill: { kind: "passive", name: "", cooldown: 1, damage: 0, radius: 0 },
  },
  omni: {
    name: "Omni Kid",
    role: "Alien shifter",
    blurb: "A kid with an alien watch. ALIEN TRANSFORM: hold and aim at the alien you want on the wheel, release to turn into it for 10s (no skills while an alien, except Echo Mite's MITOSIS): Blaze Alien (flamethrower that burns and slows), Quad Brute (huge HP, crushing punches that knock far), Echo Mite (long-range sonic blasts; MITOSIS splits every copy in two, sharing HP) or Speed Raptor (10x speed, running into foes hurts them). Turning back restores the HP he had before the transform. SNACK (E): eat to heal 4% HP.",
    stars: 4,
    maxHp: 110,
    speed: 112,
    attack: "punch",
    attackCooldown: 0.4,
    damage: 20,
    range: 22,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // ALIEN TRANSFORM: `duration` seconds as a random alien; `cooldown` counts from turning back.
    skill: { kind: "omnitrix", name: "ALIEN TRANSFORM", cooldown: 8, damage: 0, radius: 0, duration: 10 },
    // SNACK: heal `damage` of max HP.
    skill2: { kind: "eat", name: "SNACK", cooldown: 10, damage: 0.1, radius: 0 },
  },
  blaze: {
    name: "Blaze Alien",
    role: "Alien form",
    blurb: "",
    stars: 3,
    formOf: "omni",
    maxHp: 110,
    speed: 112,
    attack: "flame",
    attackCooldown: 0.12,
    damage: 6,
    range: 80,
    arc: 0.7,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    slowHit: 1.2,
    skill: { kind: "passive", name: "ALIEN", cooldown: 1, damage: 0, radius: 0 },
  },
  quad: {
    name: "Quad Brute",
    role: "Alien form",
    blurb: "",
    stars: 3,
    formOf: "omni",
    maxHp: 275,
    speed: 150,
    attack: "punch",
    attackCooldown: 0.28,
    damage: 34,
    range: 28,
    arc: 1.8,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    knock: 3,
    skill: { kind: "passive", name: "ALIEN", cooldown: 1, damage: 0, radius: 0 },
  },
  echo: {
    name: "Echo Mite",
    role: "Alien form",
    blurb: "",
    stars: 3,
    formOf: "omni",
    maxHp: 90,
    speed: 118,
    attack: "magic",
    attackCooldown: 0.45,
    damage: 12,
    range: 260,
    arc: 0,
    aoe: 30,
    shotSpeed: 320,
    pierce: 0,
    shot: "sonic",
    // MITOSIS: every copy splits in two (each keeps half its HP), up to `count` copies in all.
    skill: { kind: "mitosis", name: "MITOSIS", cooldown: 2, damage: 0, radius: 0, count: 16 },
  },
  raptor: {
    name: "Speed Raptor",
    role: "Alien form",
    blurb: "",
    stars: 3,
    formOf: "omni",
    maxHp: 100,
    speed: 1120, // ten times a normal hero
    attack: "punch",
    attackCooldown: 0.3,
    damage: 10,
    range: 22,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    ram: 14,
    skill: { kind: "passive", name: "ALIEN", cooldown: 1, damage: 0, radius: 0 },
  },
  kaidodragon: {
    // The Beast Emperor's DRAGON FORM (user request 2026-10-07): no basic attack, rams with the whole dragon.
    name: "Azure Dragon",
    role: "Dragon form",
    blurb: "",
    stars: 4,
    formOf: "kaido",
    maxHp: 170, // the same as the Beast Emperor (set again below)
    speed: 225, // twice a hero's walk (HERO_WALK / MOVE_SCALE * 2)
    attack: "punch",
    attackCooldown: 1,
    damage: 0,
    range: 20,
    arc: 0,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    noAttack: true,
    ram: 105, // 2.5 times his club swing (set again below)
    ramKnock: 3,
    ramBody: { len: 96, half: 20 },
    skill: { kind: "passive", name: "DRAGON", cooldown: 1, damage: 0, radius: 0 },
  },
};

export const HEROES: Record<HeroId, HeroDef> = { ...BASE_HEROES, ...newHeroDefs() };
// Kick Chef fights with the Taekwondo Master's kit and stats (user request 2026-10-06); his own look and name stay.
HEROES.sanji = { ...BASE_HEROES.taekwondo, name: HEROES.sanji.name, role: HEROES.sanji.role };

/** Every hero has this many times the HP written above (user request 2026-10-03: triple HP, nothing else changed). */
export const HP_SCALE = 3;
for (const def of Object.values(HEROES)) def.maxHp *= HP_SCALE;

/**
 * Melee feel (user request 2026-10-05): punches and swords swing faster (so they can cut shots down),
 * reach a little further, and cover a wider arc (a sword cuts with its whole blade, not just the tip).
 * The numbers written in HEROES are before this.
 */
export const MELEE_SPEED = 0.7; // attack cooldown multiplier
export const MELEE_REACH = 10; // extra reach in pixels
for (const def of Object.values(HEROES)) {
  if (def.attack !== "punch" && def.attack !== "sword") continue;
  def.attackCooldown = Math.round(def.attackCooldown * MELEE_SPEED * 100) / 100;
  def.range += MELEE_REACH;
  if (!def.lineAttack) def.arc = Math.max(def.arc, def.attack === "sword" ? 2.4 : 1.7);
}

// DRAGON FORM (user request 2026-10-07): 12 s as a dragon twice as fast, no basic attack, ramming for 2.5x his club
// swing with knockback; the cooldown counts from turning back. His DRAGON BREATH still works as a dragon.
HEROES.kaido.skill = { kind: "dragonform", name: "DRAGON FORM", cooldown: HEROES.kaido.skill.cooldown, damage: 0, radius: 0, duration: 12, form: "kaidodragon",
  desc: "turns into a huge dragon for 12s: twice as fast, no basic attack, ramming into foes with the whole body hits for 2.5x his club swing and knocks them back. The cooldown starts once he turns back." };
HEROES.kaidodragon.maxHp = HEROES.kaido.maxHp;
HEROES.kaidodragon.ram = HEROES.kaido.damage * 2.5;
HEROES.kaidodragon.speed = (HERO_WALK / MOVE_SCALE) * 2;
HEROES.kaidodragon.skill2 = HEROES.kaido.skill2;

/**
 * Pickable heroes, ranked by how strong they are in the PvP Arena: weakest first, strongest last.
 * The character select shows them in this order. Heroes missing here go at the end.
 */
const PVP_RANKING: HeroId[] = [
  "doraemon", "rudeus", "ricardo", "thorfinn", "healer", "superman", "trainer", "agamemnon", "mossgolem", "robot",
  "saitama", "golem", "howl", "hanuman", "isekai", "warrior", "pyromancer", "jester", "hacker", "geomancer",
  "cryomancer", "reaper", "druid", "vampire", "paladin", "steve", "omni", "titan", "lawliet", "berserker",
  "gojo", "okita", "lancer", "ninja", "starplatinum", "taekwondo", "archer", "rider", "deku", "blacksmith",
  "killua", "joyboy", "zenitsu", "monk", "sakamoto", "theworld", "kid", "loki", "oni", "simo",
  "rick",
  "swordgod", "yaotsu", "badigadi",
];
// The big roster (heroes2.ts) slots into the ranking by its bot-duel win rate (old heroes span about 44-56%).
for (const [id, e] of Object.entries(NEW_HEROES).sort((a, b) => a[1].win - b[1].win)) {
  const at = Math.round(Math.max(0, Math.min(1, (e.win - 44) / 12)) * PVP_RANKING.length);
  PVP_RANKING.splice(at, 0, id as HeroId);
}
/** Heroes taken out of the game (user request 2026-10-04): not on any hero select; their code is kept. */
const REMOVED_HEROES: HeroId[] = ["swordgod", "yaotsu", "badigadi",
  // removed 2026-10-06 (user list)
  "nobara", "marco", "cell", "hinata", "geto", "leorio", "roger", "akaza", "shinra", "anya", "byakuya", "momo", "denji", "reigen", "jiraiya", "stark", "aokiji", "itachi", "hancock", "armin", "kurapika", "alphonse", "hijikata", "kirito", "sakura", "toji", "yuno", "rukia", "robin", "kagura", "gohan", "okarun", "trunks", "albedo", "makima", "franky", "ryuk", "sabo", "kakashi", "mikasa", "ace", "aki", "vegeta", "taekwondo", "oni",
];
export const HERO_IDS = [
  ...PVP_RANKING,
  ...(Object.keys(HEROES) as HeroId[]).filter((id) => !PVP_RANKING.includes(id)),
].filter((id) => !HEROES[id].summon && !HEROES[id].formOf && !REMOVED_HEROES.includes(id));

/**
 * Balance pass (user request 2026-10-03): everything a hero (and its summons) hits for is multiplied by this.
 * Tuned from bot duels so no hero wins far more or far less than half its PvP fights.
 */
export const DAMAGE_BALANCE: Partial<Record<HeroId, number>> = {
  trainer: 5.53,
  howl: 4.18,
  healer: 4.07,
  superman: 0.78,
  agamemnon: 0.43,
  rudeus: 2.48,
  lawliet: 0.47,
  isekai: 1.63,
  ricardo: 0.98,
  saitama: 0.55,
  thorfinn: 2.69,
  hanuman: 1.25,
  doraemon: 0.77,
  joyboy: 1.27,
  zenitsu: 1.59,
  steve: 1.74,
  taekwondo: 1.41,
  vampire: 0.72,
  gojo: 1.99,
  rider: 1.22,
  simo: 0.72, // +20% on user request 2026-10-07
  rick: 2.52,
  okita: 1.31,
  deku: 2.52,
  killua: 4.19,
  omni: 3.99,
  theworld: 1.44,
  sakamoto: 1.8,
  starplatinum: 1.3,
  loki: 1.29,
  titan: 1.4,
  kid: 3.14,
  badigadi: 0.32,
  yaotsu: 0.5,
  swordgod: 1.15,
  // The eight heroes of 2026-10-05, tuned alone (everyone else untouched).
  warrior: 2.31,
  archer: 3.85,
  ninja: 5.53,
  paladin: 1.86,
  druid: 3.28,
  monk: 5.12,
  robot: 2.72,
  golem: 1.47,
  // The eleven heroes of the second 2026-10-05 batch, tuned alone.
  hacker: 3.88,
  reaper: 2.69,
  mossgolem: 2.17,
  berserker: 2.14,
  jester: 2.92,
  blacksmith: 3.16,
  geomancer: 4.39,
  pyromancer: 4.05,
  cryomancer: 3.11,
  lancer: 1.86,
  oni: 1.86,
};

/** Hero classes (user request 2026-10-05), shown and filterable on the hero select. */
export type HeroClass = "fighter" | "tank" | "mage" | "carry" | "support" | "summoner" | "assassin";
export const HERO_CLASSES: { id: HeroClass; name: string; color: string }[] = [
  { id: "fighter", name: "FIGHTER", color: "#ff7a3a" },
  { id: "tank", name: "TANK", color: "#ffd23f" },
  { id: "mage", name: "MAGE", color: "#9a7aff" },
  { id: "carry", name: "CARRY", color: "#ff3a5a" },
  { id: "support", name: "SUPPORT", color: "#5aff9a" },
  { id: "summoner", name: "SUMMONER", color: "#3ad8ff" },
  { id: "assassin", name: "ASSASSIN", color: "#c8c8d8" },
];
const CLASS_OF: Partial<Record<HeroId, HeroClass>> = {
  // Fighters: up close, hard to kill or hard-hitting brawlers.
  ricardo: "fighter", rider: "fighter", titan: "fighter", joyboy: "fighter", taekwondo: "fighter", superman: "fighter",
  saitama: "fighter", deku: "fighter", hanuman: "fighter", theworld: "fighter", starplatinum: "fighter", steve: "fighter",
  omni: "fighter", badigadi: "fighter", warrior: "fighter", monk: "fighter", berserker: "fighter", blacksmith: "fighter", lancer: "fighter",
  // Tanks: huge HP, protect and hold the line.
  paladin: "tank", golem: "tank", mossgolem: "tank", oni: "tank",
  // Mages: spells and areas from a distance.
  rudeus: "mage", gojo: "mage", howl: "mage", rick: "mage", yaotsu: "mage", druid: "mage", hacker: "mage", geomancer: "mage", pyromancer: "mage", cryomancer: "mage",
  // Carries: steady, heavy damage that grows a fight in their favour.
  simo: "carry", sakamoto: "carry", isekai: "carry", swordgod: "carry", archer: "carry", robot: "carry",
  // Assassins: fast, fragile, dart in and burst one target down.
  killua: "assassin", okita: "assassin", zenitsu: "assassin", vampire: "assassin", thorfinn: "assassin", kid: "assassin", ninja: "assassin", reaper: "assassin", jester: "assassin",
  // Supports: heal, lock down or weaken enemies.
  healer: "support", doraemon: "support",
  // Summoners: fight through the helpers and copies they call out.
  trainer: "summoner", agamemnon: "summoner", loki: "summoner", lawliet: "summoner",
};
for (const [id, e] of Object.entries(NEW_HEROES)) {
  CLASS_OF[id as HeroId] = e.cls;
  DAMAGE_BALANCE[id as HeroId] ??= e.bal;
}
CLASS_OF.sanji = CLASS_OF.taekwondo;
DAMAGE_BALANCE.sanji = DAMAGE_BALANCE.taekwondo;
export function heroClass(id: string): HeroClass {
  const base = HEROES[id as HeroId]?.formOf ?? id;
  return CLASS_OF[base as HeroId] ?? "fighter";
}

/** A hero's estimated stats on a 1-10 scale, ranked against every pickable hero (shown on the hero select). */
export interface HeroRatings {
  hp: number;
  damage: number;
  speed: number;
  range: number;
}

let ratingCache: Record<string, HeroRatings> | undefined;
export function heroRatings(id: string): HeroRatings {
  if (!ratingCache) {
    const raw = (h: HeroId) => {
      const def = HEROES[h];
      return {
        hp: def.invincible ? 1e9 : def.maxHp,
        damage: def.damage * (DAMAGE_BALANCE[h] ?? 1) * (def.attack === "lightning" || def.aoe > 0 ? 1.3 : 1),
        speed: 1 / def.attackCooldown,
        range: def.range + def.aoe,
      };
    };
    const all = HERO_IDS.map((h) => [h, raw(h)] as const);
    // Each stat becomes 1-10 by its place in the line-up (ties share a score).
    const score = (key: keyof HeroRatings, v: number) => {
      const below = all.filter(([, r]) => r[key] < v).length;
      return 1 + Math.round((below / Math.max(1, all.length - 1)) * 9);
    };
    ratingCache = {};
    for (const [h, r] of all) {
      ratingCache[h] = { hp: score("hp", r.hp), damage: score("damage", r.damage), speed: score("speed", r.speed), range: score("range", r.range) };
    }
  }
  return ratingCache[id] ?? { hp: 5, damage: 5, speed: 5, range: 5 };
}

export function heroOf(id: string): HeroDef {
  return HEROES[id as HeroId] ?? HEROES.superman;
}

export const RESPAWN_TIME = 5;

// Emberfall rule twist: lava creeps in from the edges during a wave.
export const LAVA_START_RADIUS = 520;
export const LAVA_MIN_RADIUS = 110;
export const LAVA_SHRINK_PER_SEC = 9;
export const LAVA_DPS = 25;

export const WAVE_COUNT = 5; // last wave is the boss
export const INTERMISSION_TIME = 6;

export type EnemyKind =
  | "cinderling" | "brute" | "caster" | "warden" | "godzilla" | "monkey" | "bananamonkey" | "kingkong" | "swordsman" | "swordmaster" | "swordgod"
  | "dirtblock" | "tntblock" | "craftblock" | "rockwall" | "dummy"
  | "knight" | "stonecrawler" | "stonewisp";

export interface EnemyDef {
  hp: number;
  speed: number;
  radius: number;
  touchDamage: number;
  score: number;
  shootEvery?: number; // seconds between shots
  shotDamage?: number; // damage per shot (default ENEMY_SHOT_DAMAGE)
  shot?: "banana" | "boulder" | "slash"; // what it throws (default: a fireball)
  keepAway?: number; // ranged enemies back off when closer than this
  boss?: boolean; // bosses shrug off knockback
  block?: boolean; // the Block Crafter's blocks: they sit still and break on the first hit
}

const ENEMY_SHOT_DAMAGE_BASE = 12;

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  cinderling: { hp: 20, speed: 70, radius: 5, touchDamage: 8, score: 10 },
  brute: { hp: 90, speed: 38, radius: 9, touchDamage: 20, score: 30 },
  caster: { hp: 35, speed: 45, radius: 6, touchDamage: 6, score: 20, shootEvery: 2.2 },
  warden: { hp: 1400, speed: 30, radius: 18, touchDamage: 30, score: 500, shootEvery: 1.6, boss: true },
  // Godzilla: basic attacks (stomp and fireballs) hit 3x harder than other bosses; the beam is BEAM_DAMAGE.
  // Jungle Temple: faster, tougher monkeys, and King Kong.
  monkey: { hp: 34, speed: 100, radius: 5, touchDamage: 11, score: 12 },
  bananamonkey: { hp: 45, speed: 55, radius: 6, touchDamage: 8, score: 22, shootEvery: 1.6, shotDamage: 14, shot: "banana", keepAway: 130 },
  kingkong: { hp: 5000, speed: 42, radius: 22, touchDamage: 40, score: 1500, shootEvery: 2.4, shotDamage: 24, shot: "boulder", boss: true },
  // Sword Dojo: sword students in white training clothes, far tougher than the jungle, and the Sword God.
  swordsman: { hp: 70, speed: 95, radius: 6, touchDamage: 16, score: 20 },
  swordmaster: { hp: 80, speed: 70, radius: 6, touchDamage: 14, score: 35, shootEvery: 1.7, shotDamage: 20, shot: "slash", keepAway: 90 },
  swordgod: { hp: 6000, speed: 80, radius: 8, touchDamage: 30, score: 3000, boss: true },
  // The Block Crafter's blocks (BUILD).
  dirtblock: { hp: 1, speed: 0, radius: 8, touchDamage: 0, score: 0, block: true },
  // STONE WALL: the Geomancer's rocks; they stop shots until broken.
  rockwall: { hp: 200, speed: 0, radius: 8, touchDamage: 0, score: 0, block: true },
  // Tutorial: straw dummies that stand still and never hit back.
  dummy: { hp: 300, speed: 0, radius: 11, touchDamage: 0, score: 0 },
  tntblock: { hp: 1, speed: 0, radius: 8, touchDamage: 0, score: 0, block: true },
  craftblock: { hp: 1, speed: 0, radius: 8, touchDamage: 0, score: 0, block: true },
  // Dungeon: the Ancient Knight, a moss-covered stone knight, and the stone minions he raises.
  knight: { hp: 4000, speed: 34, radius: 16, touchDamage: 25, score: 3000, boss: true },
  stonecrawler: { hp: 90, speed: 80, radius: 9, touchDamage: 14, score: 20 },
  stonewisp: { hp: 60, speed: 45, radius: 6, touchDamage: 6, score: 20, shootEvery: 2, shotDamage: 14, shot: "boulder", keepAway: 120 },
  godzilla: { hp: 7000, speed: 24, radius: 22, touchDamage: 105, score: 2000, shootEvery: 3, shotDamage: ENEMY_SHOT_DAMAGE_BASE * 3, boss: true },
};

export const ENEMY_SHOT_SPEED = 140;
export const ENEMY_SHOT_DAMAGE = ENEMY_SHOT_DAMAGE_BASE;

// Waves: how many of each enemy type spawn.
// Jungle Temple waves: more enemies than the Lava Stage, and King Kong at the end.
export const JUNGLE_WAVES: Partial<Record<EnemyKind, number>>[] = [
  { monkey: 10 },
  { monkey: 12, bananamonkey: 4 },
  { monkey: 14, bananamonkey: 6 },
  { monkey: 18, bananamonkey: 8 },
  { kingkong: 1, monkey: 8, bananamonkey: 4 },
];

// Sword Dojo waves: much harder than the Jungle Temple, with the Sword God at the end.
export const DOJO_WAVES: Partial<Record<EnemyKind, number>>[] = [
  { swordsman: 12 },
  { swordsman: 14, swordmaster: 5 },
  { swordsman: 18, swordmaster: 8 },
  { swordsman: 22, swordmaster: 11 },
  { swordgod: 1, swordsman: 8, swordmaster: 5 },
];

/**
 * The Sword God's moves. Each one winds up (beamState 1, a red warning shows) and then strikes
 * (beamState 2). `windup` and `active` are seconds; damage is per hit.
 */
export const SWORD_GOD = {
  rest: 1.1, // seconds between moves, chasing you with the blade
  dash: { windup: 0.55, active: 0.3, speed: 650, width: 26, damage: 60 }, // a lightning-fast lunge in a straight line
  whirl: { windup: 0.5, active: 0.3, radius: 66, damage: 55 }, // a full spin cutting everything around him
  waves: { windup: 0.45, active: 0.2, count: 5, spread: 0.24, speed: 270, damage: 26 }, // a fan of flying sword slashes
  flurry: { windup: 0.35, active: 0.9, cuts: 3, range: 58, arc: 1.7, lunge: 26, damage: 32 }, // three quick forward cuts
};
/**
 * The Ancient Knight's moves, one for each animation on the user's sheet. Each winds up first
 * (beamState 1, a warning shows), then strikes (beamState 2). Seconds, pixels and damage per hit.
 */
export const ANCIENT_KNIGHT = {
  rest: 1.2, // walking after you between moves
  cleave: { windup: 0.7, active: 0.35, length: 135, width: 48, damage: 70 }, // sword raised high, brought straight down
  sweep: { windup: 0.6, active: 0.3, radius: 120, arc: 3.6, damage: 45, knock: 1.6 }, // a wide sideways swing
  leap: { windup: 0.45, air: 0.85, range: 320, radius: 110, damage: 60, stun: 1 }, // jumps on you, rocks burst up
  summon: { windup: 1.1, active: 0.4, crawlers: 2, wisps: 1, max: 6 }, // calls stone minions out of the ground
  guard: { windup: 0.25, active: 2.4, arc: 2.6, cut: 0.2 }, // shield up: hits from the front do 20%
};
export const ANCIENT_KNIGHT_MOVES = ["", "cleave", "sweep", "leap", "summon", "guard"] as const;

export const SWORD_GOD_MOVES = ["", "dash", "whirl", "waves", "flurry"] as const;

// King Kong's charge: he winds up (a warning lane shows), then rushes along it.
export const KONG_CHARGE_EVERY = 5;
export const KONG_CHARGE_WINDUP = 0.8;
export const KONG_CHARGE_TIME = 0.6;
export const KONG_CHARGE_SPEED = 280;
export const KONG_CHARGE_WIDTH = 30;

export const WAVES: Partial<Record<EnemyKind, number>>[] = [
  { cinderling: 6 },
  { cinderling: 8, caster: 2 },
  { cinderling: 8, brute: 2, caster: 3 },
  { cinderling: 10, brute: 4, caster: 4 },
  { warden: 1, cinderling: 6 },
];

// Obstacles: basalt pillars (circles).
export interface Rock {
  x: number;
  y: number;
  r: number;
}

export const ROCKS: Rock[] = [
  { x: 300, y: 220, r: 18 },
  { x: 660, y: 220, r: 18 },
  { x: 300, y: 500, r: 18 },
  { x: 660, y: 500, r: 18 },
  { x: 480, y: 160, r: 12 },
  { x: 480, y: 560, r: 12 },
  { x: 200, y: 360, r: 14 },
  { x: 760, y: 360, r: 14 },
];

/** MAX SMASH charge: full after this many seconds; the hero walks at this share of their speed while charging. */
export const CHARGE_FULL = 2.5;
export const CHARGE_SLOW = 0.4;

/** How much a MAX SMASH charged for `held` seconds hits (x1 at once, up to x4 at full charge). */
export function chargePower(held: number, full = CHARGE_FULL): number {
  return 1 + 3 * Math.min(1, Math.max(0, held) / full);
}

/** Skills that are held to charge and go off when let go. */
const CHARGE_KINDS: SkillKind[] = ["charge", "chargeslash", "chargeshot", "shieldcharge"];
export function isChargeSkill(skill?: SkillDef): boolean {
  return !!skill && (CHARGE_KINDS.includes(skill.kind) || (skill.kind === "combo" && skill.chargeTime !== undefined));
}
/** A charged combo skill: its hits are this many times as strong (0.6x let go at once, up to 1.5x at full charge). */
export function comboChargeMul(held: number, full: number): number {
  return 0.6 + 0.9 * Math.min(1, Math.max(0, held) / full);
}
/** Seconds a charged skill takes to charge fully. */
export function chargeTimeOf(skill: SkillDef): number {
  return skill.chargeTime ?? CHARGE_FULL;
}

/** How long (and wide) the MAX SMASH lane is at that power: up to 1.8x. */
export function chargeReach(power: number): number {
  return 1 + ((power - 1) / 3) * 0.8;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  aim: number; // radians
  shoot: boolean;
  dash: boolean;
  skill: boolean;
  skill2?: boolean;
  /** Charged skills (either slot): seconds the skill was held (charged) before it was let go. */
  charge2?: number;
  /** Placed skills (FxAt upTo): how far out the player aims, 0 (at his feet) to 1 (the edge of the circle). */
  reach?: number;
  /** Milliseconds behind the server that this player sees other heroes (ping + smoothing): hits on heroes are judged where they saw them. */
  lag?: number;
  /** Where the client has moved its own hero. The server follows it, within the hero's speed. */
  x?: number;
  y?: number;
  /** The player's `warp` count the client has seen; positions sent before a teleport are ignored. */
  warp?: number;
  /** The sender's clock (ms) when it was at x, y; other players use it to replay the path evenly. */
  t?: number;
}

export const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  aim: 0,
  shoot: false,
  dash: false,
  skill: false,
};

/** Normalised movement direction from input keys. */
export function inputDirection(input: PlayerInput): { x: number; y: number } {
  let x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(x, y);
  if (len > 0) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

/** Heroes who can move while time is stopped (their own time stop, or each other's). */
export function movesInStoppedTime(hero: string): boolean {
  const kind = heroOf(hero).skill.kind;
  return kind === "timestop" || kind === "truck";
}

/** How fast a hero runs right now (BIG LIGHT slows, the Hopper Rider's motorcycle speeds up). */
/** ALIEN TRANSFORM: a hero's alien forms, in wheel order (the first at the top, then clockwise). */
export function alienForms(hero: string): HeroId[] {
  return (Object.keys(HEROES) as HeroId[]).filter((h) => HEROES[h].formOf === hero);
}

/** Where alien form `i` of `n` sits on the pick wheel (screen angle). */
export function formAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i * Math.PI * 2) / n;
}

/** ALIEN TRANSFORM: the form picked by aiming at it on the wheel. */
export function formFromAim(hero: string, aim: number): HeroId | undefined {
  const forms = alienForms(hero);
  let best: HeroId | undefined;
  let bestDiff = Infinity;
  forms.forEach((f, i) => {
    let d = aim - formAngle(i, forms.length);
    d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
    if (d < bestDiff) [best, bestDiff] = [f, d];
  });
  return best;
}

/** Burned by the Blaze Alien's flamethrower: moves this much slower. */
export const BURN_SLOW = 0.55;

/** How far a placed skill (FxAt upTo) reaches, or 0 when it has none. */
export function placeRangeOf(skill?: SkillDef): number {
  for (const st of skill?.steps ?? []) {
    if ((st.do === "drop" || st.do === "field") && typeof st.at === "object") return st.at.upTo;
  }
  return 0;
}

export function heroSpeed(p: { hero: string; big: number; active2?: number; buff?: number; slow?: number; slowPct?: number; root?: number; mode?: number }): number {
  if ((p.root ?? 0) > 0) return 0; // SHADOW WHIP: legs tied
  const hero = heroOf(p.hero);
  let bike = (p.active2 ?? 0) > 0 && (hero.skill2?.kind === "bike" || hero.skill2?.kind === "sprint") ? hero.skill2.width ?? 2 : 1;
  for (const b of fxBuffs(p)) bike *= b.speed ?? 1; // combo speed buffs
  const base = hero.ram ? hero.speed * MOVE_SCALE : HERO_WALK; // the Speed Raptor keeps its own speed
  if (hero.skill2?.kind === "yoyo" && p.mode === 1) bike *= 1.3; // YOYO MODE: lighter on his feet
  if (hero.skill.kind === "deathnote" && (p.buff ?? 0) > 0) bike *= 0.2; // NAME WRITTEN: writing, barely moving
  const slowed = (p.slow ?? 0) > 0 ? 1 - ((p.slowPct ?? 0) > 0 ? p.slowPct! : 1 - BURN_SLOW) : 1;
  return base * HERO_SPEED_BOOST * (hero.walk ?? 1) * (p.big > 0 ? BIG_SLOW : 1) * slowed * bike;
}

/** The boxing ring the PvP Arena and Bot Duel are fought in: a small square with no cover. */
export const RING = { x: CENTER_X, y: CENTER_Y, half: 150 };

/** Stages fought in the boxing ring (hero against hero). */
export function ringStage(stage: string): boolean {
  return stage === "pvp" || stage === "duel" || stage === "pve" || stage === "classic";
}

/** Where heroes can go on a stage: the open field (false), the boxing ring (true) or a Classic map. */
export type Area = boolean | ClassicMap;
export function areaOf(stage: string, map = 0): Area {
  if (stage === "world") return OPEN_WORLD;
  if (stage === "dungeon") return DUNGEON;
  return stage === "classic" ? classicMap(map) : ringStage(stage);
}

/** Classic 3v3: Red against Blue on a map with walls, grass and water. Heroes come back after a short wait. */
export const CLASSIC_TEAM_SIZE = 3;
/** Classic 3v3: lives per hero; out of lives means out of the match. The last team standing wins. */
export const CLASSIC_LIVES = 3;
export const CLASSIC_RESPAWN = 3;

/** Stages that open on the player select screen. */
export function selectStage(stage: string): boolean {
  return stage === "pvp" || stage === "pve" || stage === "classic";
}

/** PvE Squad bot difficulty, Easy to Nightmare. Hard is the Bot Duel bot as it always was. */
export interface BotLevel {
  name: string;
  think: [number, number]; // reaction time between skill decisions (min, extra random)
  aimErr: number; // how far off its aim can wobble (radians, full spread)
  damage: number; // multiplier on everything it hits for
  hp: number; // multiplier on its max HP (on top of one share per player)
  dash: number; // chance per second to dash when it wants to
}

export const BOT_LEVELS: BotLevel[] = [
  { name: "EASY", think: [0.9, 0.8], aimErr: 0.7, damage: 0.5, hp: 0.6, dash: 0.3 },
  { name: "MEDIUM", think: [0.5, 0.5], aimErr: 0.35, damage: 0.75, hp: 0.8, dash: 0.5 },
  { name: "HARD", think: [0.25, 0.35], aimErr: 0.16, damage: 1, hp: 1, dash: 0.8 },
  { name: "NIGHTMARE", think: [0.08, 0.12], aimErr: 0.03, damage: 1.5, hp: 1.6, dash: 1.6 },
];
export const DEFAULT_BOT_LEVEL = 2;

/**
 * Move a circle by (dx, dy), keeping it inside the world and out of rocks; in the boxing ring
 * (`ring`), inside the ropes instead.
 */
export function moveCircle(x: number, y: number, dx: number, dy: number, r: number, ring: Area = false): { x: number; y: number } {
  if (typeof ring === "object") return moveOnMap(ring, x, y, dx, dy, r);
  if (ring) {
    return {
      x: Math.min(RING.x + RING.half - r, Math.max(RING.x - RING.half + r, x + dx)),
      y: Math.min(RING.y + RING.half - r, Math.max(RING.y - RING.half + r, y + dy)),
    };
  }
  let nx = Math.min(WORLD_W - r, Math.max(r, x + dx));
  let ny = Math.min(WORLD_H - r, Math.max(r, y + dy));
  for (const rock of ROCKS) {
    const ddx = nx - rock.x;
    const ddy = ny - rock.y;
    const dist = Math.hypot(ddx, ddy);
    const min = rock.r + r;
    if (dist < min && dist > 0.0001) {
      nx = rock.x + (ddx / dist) * min;
      ny = rock.y + (ddy / dist) * min;
    }
  }
  return { x: nx, y: ny };
}

/** True if a shot at (x, y) hits a rock (or, in the boxing ring, the ropes). */
export function hitsRock(x: number, y: number, ring: Area = false): boolean {
  if (typeof ring === "object") return mapBlocksShot(ring, x, y);
  if (ring) return Math.abs(x - RING.x) > RING.half || Math.abs(y - RING.y) > RING.half;
  return ROCKS.some((rock) => Math.hypot(x - rock.x, y - rock.y) < rock.r);
}

export function inLava(x: number, y: number, lavaRadius: number): boolean {
  return Math.hypot(x - CENTER_X, y - CENTER_Y) > lavaRadius;
}

// Stages
export type StageId = "lava" | "jungle" | "dojo" | "boss" | "pvp" | "duel" | "pve" | "classic" | "world" | "dungeon" | "tutorial";

export interface StageDef {
  name: string;
  blurb: string;
}

export const STAGES: Record<StageId, StageDef> = {
  lava: { name: "Stage 1: Lava Stage", blurb: "Survive 4 waves while lava creeps in, then slay the Pyre Warden." },
  jungle: { name: "Stage 2: Jungle Temple", blurb: "Harder! Hordes of monkeys, banana throwers, then the Ape King." },
  dojo: { name: "Stage 3: Sword Dojo", blurb: "Much harder! Sword students in white, then the Sword God himself." },
  boss: { name: "Boss Room", blurb: "No waves. Fight the Atomic Kaiju straight away. Dodge the atomic beam!" },
  pvp: { name: "PvP Arena", blurb: "Players fight each other in a small boxing ring. First to 3 kills wins. Online only." },
  duel: { name: "Bot Duel", blurb: "1v1 in the boxing ring against a bot playing the hero you pick. First to 3 KOs. Solo." },
  pve: { name: "Training", blurb: "1 to 4 players team up against one bot. Pick its hero and difficulty. First to 3 KOs. Solo or online." },
  world: { name: "Open World", blurb: "Meet everyone in a big meadow village: chat, look up players, ask for duels, and take the portal to the dungeon together." },
  tutorial: { name: "Tutorial", blurb: "Learn to move, attack, use skills and dash on training dummies." },
  dungeon: { name: "Dungeon", blurb: "Rooms full of monsters and a boss at the end. Beat it and the way back opens." },
  classic: { name: "Classic 3v3", blurb: "Red vs Blue, 3 heroes a side, on 6 maps with walls, tall grass and water. Bots fill empty slots. 3 lives each; the last team standing wins. Solo or online." },
};

/** Stages taken out of the game (user request 2026-10-05: the Boss Room); their code is kept. */
const REMOVED_STAGES: StageId[] = ["boss", "lava", "jungle", "dojo"];
/** The Open World and its dungeon have their own button, not a stage card. */
const OWN_BUTTON: StageId[] = ["world", "dungeon", "tutorial"];
export const STAGE_IDS = (Object.keys(STAGES) as StageId[]).filter((id) => !REMOVED_STAGES.includes(id) && !OWN_BUTTON.includes(id));

/** Wave stages: which enemies come in each wave. */
export function wavesOf(stage: string): Partial<Record<EnemyKind, number>>[] {
  return stage === "jungle" ? JUNGLE_WAVES : stage === "dojo" ? DOJO_WAVES : WAVES;
}

export function stageOf(id: string): StageId {
  return (STAGE_IDS as string[]).includes(id) || OWN_BUTTON.includes(id as StageId) ? (id as StageId) : "classic";
}

// Godzilla's atomic beam: a warning line, then a long beam that slowly turns toward its target.
export const BEAM_EVERY = 6; // seconds between beams
export const BEAM_CHARGE = 1.1; // warning time before it fires
export const BEAM_FIRE = 1.6; // how long the beam lasts
export const BEAM_LENGTH = 520;
export const BEAM_WIDTH = 16;
export const BEAM_TURN_SPEED = 0.45; // radians per second while firing
export const BEAM_DAMAGE = 20; // per hit; players get a short invulnerability after each hit
export const BOSS_INTRO_TIME = 4;

// PvP Arena
export const PVP_KILLS_TO_WIN = 3;
export const PVP_DAMAGE_SCALE = 0.6; // player-vs-player hits are softened so fights last a few seconds
/**
 * Everything heroes (and their summons) hit other heroes for, basic attacks and skills alike, in every
 * hero-against-hero mode (user request 2026-10-06: Classic matches ended too fast). Monsters are not affected.
 */
export const HERO_HIT_SCALE = 0.4;
/** Everything a hero deals, to monsters and heroes alike: the PvP softening times HERO_HIT_SCALE (user request 2026-10-06). */
export const HERO_DAMAGE_SCALE = PVP_DAMAGE_SCALE * HERO_HIT_SCALE;
export const PVP_COUNTDOWN = 3;
