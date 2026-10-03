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
export const PLAYER_RADIUS = 6;
export const DASH_SPEED = 340;
export const DASH_TIME = 0.15;
// Melee basic attacks (punch and sword heroes) knock enemies and rival players back. Bosses don't budge.
export const KNOCKBACK_DISTANCE = 46; // pixels the push carries a target in total
export const KNOCKBACK_DECAY = 12; // how fast the push dies out (per second)
export const DASH_COOLDOWN = 1.2;

// Heroes. Every number here is safe to tweak for balance.
export type HeroId =
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
  | "gladiator";
export type AttackStyle = "punch" | "sword" | "rifle" | "lightning" | "magic";
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
  | "domain" // hits every enemy on the map
  | "timestop" // everything but the caster freezes
  | "hurricane" // a storm cloud that keeps striking an area
  | "asgard" // an illusion kingdom that drains enemies standing in it
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
  | "eyebeam"; // a laser from the eyes that keeps firing and follows the aim

export interface SkillDef {
  kind: SkillKind;
  name: string;
  cooldown: number;
  damage: number; // for "heal": fraction of max HP restored; for "asgard": fraction of max HP lost per second
  radius: number; // area of effect, or reach for waves, jabs and lines
  width?: number; // for "line"
  duration?: number; // for lasting skills (time stop, storms, illusions, clones)
  count?: number; // how many missiles or summons
  pet?: HeroId; // for "summon": which helper comes out (damage = its share of the summoner's max HP)
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
  /** Helpers called out by skills: not shown on the hero select screen. */
  summon?: boolean;
}

export const HEROES: Record<HeroId, HeroDef> = {
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
    skill: { kind: "smash", name: "SMASH", cooldown: 5, damage: 60, radius: 70, duration: 1 },
    // HEAT VISION: a beam `radius` long that follows his aim for `duration` seconds, `damage` per second.
    skill2: { kind: "eyebeam", name: "HEAT VISION", cooldown: 8, damage: 70, radius: 220, width: 10, duration: 2.5 },
  },
  isekai: {
    name: "Reborn Knight",
    role: "Sword fighter",
    blurb: "Mid-range sword sweeps that hit every enemy in the arc.",
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
    skill: { kind: "wave", name: "SKY SLASH", cooldown: 4, damage: 40, radius: 230 },
  },
  simo: {
    name: "Frost Sniper",
    role: "Sniper",
    blurb: "Very long range and huge damage, but slow to reload. Shots pierce.",
    stars: 4,
    maxHp: 90,
    speed: 105,
    attack: "rifle",
    attackCooldown: 1.0,
    damage: 255,
    range: 900,
    arc: 0,
    aoe: 0,
    shotSpeed: 720,
    pierce: 3,
    skill: { kind: "burst", name: "FROST VOLLEY", cooldown: 6, damage: 255, radius: 0 },
  },
  killua: {
    name: "Volt Kid",
    role: "Lightning assassin",
    blurb: "Moves three times faster than anyone. Strikes call down lightning that hits an area.",
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
    skill: { kind: "storm", name: "THUNDERBOLT", cooldown: 5, damage: 50, radius: 95 },
  },
  howl: {
    name: "Sky Wizard",
    role: "Wizard",
    blurb: "Long-range magic orbs that explode in a wide blast.",
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
    skill: { kind: "fireball", name: "FIRE SPIRIT", cooldown: 6, damage: 70, radius: 90 },
  },
  ricardo: {
    name: "Champ Rico",
    role: "Boxer",
    blurb: "Fast boxer (1.5x speed) with very short reach. JAB fires a long straight jab that stuns enemies for 0.5s. DEATH CROSS: a crushing straight right that sends targets flying.",
    stars: 4,
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
    skill2: { kind: "cross", name: "DEATH CROSS", cooldown: 6, damage: 150, radius: 80, width: 26, duration: 4 },
  },
  saitama: {
    name: "Plain Hero",
    role: "Hobby hero",
    blurb: "A hundred times the HP of anyone else. FINAL BLOW ends any fight.",
    stars: 5,
    maxHp: 10000,
    speed: 105,
    attack: "punch",
    attackCooldown: 0.5,
    damage: 30,
    range: 20,
    arc: 1.6,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "onepunch", name: "FINAL BLOW", cooldown: 5, damage: Infinity, radius: 42 },
  },
  healer: {
    name: "Holy Healer",
    role: "Support",
    blurb: "Holy bolts from afar. HEAL restores 50% HP to every ally nearby.",
    stars: 2,
    maxHp: 110,
    speed: 105,
    attack: "magic",
    attackCooldown: 0.6,
    damage: 18,
    range: 220,
    arc: 0,
    aoe: 0,
    shotSpeed: 260,
    pierce: 0,
    shot: "holy",
    skill: { kind: "heal", name: "HEAL", cooldown: 9, damage: 0.5, radius: 170 },
  },
  deku: {
    name: "Green Rookie",
    role: "Brawler",
    blurb: "Runs 1.5x faster. FULL POWER SMASH blasts a wide line straight ahead.",
    stars: 3,
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
    skill: { kind: "line", name: "FULL POWER SMASH", cooldown: 6, damage: 160, radius: 220, width: 48 },
  },
  okita: {
    name: "Sakura Blade",
    role: "Swordswoman",
    blurb: "Lightning-fast sword. PHANTOM SLASH cuts everything around her again and again.",
    stars: 3,
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
  },
  gojo: {
    name: "Void Sorcerer",
    role: "Sorcerer",
    blurb: "Fights up close. VOID REALM hits every enemy on the whole map.",
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
    skill: { kind: "domain", name: "VOID REALM", cooldown: 18, damage: 200, radius: 9999, duration: 1.6 },
  },
  starplatinum: {
    name: "Chrono Brawler",
    role: "Time brawler",
    blurb: "Punches incredibly fast. TIME STOP freezes the whole map for 4s; only he can move.",
    stars: 5,
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
  },
  rudeus: {
    name: "Storm Mage",
    role: "Mage",
    blurb: "Casts magic bolts. HURRICANE summons a huge storm cloud that rains lightning on an area.",
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
  },
  lawliet: {
    name: "The Detective",
    role: "Detective",
    blurb: "Weak hits, runs 1.1x faster. PASSIVE: sees where every monster and boss will be 0.5s ahead (ghost images).",
    stars: 2,
    maxHp: 100,
    speed: 116,
    attack: "punch",
    attackCooldown: 0.45,
    damage: 8,
    range: 20,
    arc: 1.4,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    skill: { kind: "passive", name: "FORESIGHT", cooldown: 1, damage: 0, radius: 0, duration: 0.5 },
  },
  thorfinn: {
    name: "Viking Kid",
    role: "Dagger warrior",
    blurb: "Quick twin-dagger slashes. DAGGER RUSH dashes forward, cutting every enemy on the way.",
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
    skill: { kind: "rush", name: "DAGGER RUSH", cooldown: 4, damage: 55, radius: 120, width: 24 },
  },
  titan: {
    name: "Giant Shifter",
    role: "Shifter",
    blurb: "Very weak hits as a human. GIANT FORM turns him into a 50m giant for 10s: every hit smashes everything around him.",
    stars: 4,
    maxHp: 140,
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
  },
  yaotsu: {
    name: "Glitch God",
    role: "Indignia God",
    blurb: "Captain Steel's HP, moves 2x faster. CREATOR builds a whole city: enemies inside lose 10% HP/s, he heals 10%/s. REALITY CHANGE turns every enemy into an ordinary human for 10s.",
    stars: 6,
    maxHp: 300,
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
    skill: { kind: "city", name: "CREATOR", cooldown: 20, damage: 0.1, radius: 380, duration: 15 },
    skill2: { kind: "reality", name: "REALITY CHANGE", cooldown: 25, damage: 1, radius: 0, duration: 10 },
  },
  loki: {
    name: "Trickster",
    role: "Trickster god",
    blurb: "Magic shots. ILLUSION raises a golden city for 10s (enemies inside lose 7% HP/s). CLONE makes a copy that fights.",
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
    skill: { kind: "asgard", name: "ILLUSION", cooldown: 22, damage: 0.07, radius: 230, duration: 10 },
    skill2: { kind: "clone", name: "CLONE", cooldown: 12, damage: 0.25, radius: 0, duration: 20 },
  },
  sakamoto: {
    name: "Retired Hitman",
    role: "Hitman",
    blurb: "Runs 1.2x faster. Quick knife slashes. SWAP MODE pulls out a machine gun that fires very fast; use it again to go back to the knife.",
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
  },
  joyboy: {
    name: "Rubber Pirate",
    role: "Rubber brawler",
    blurb: "1.5x HP. Stretchy punches reach further. GATLING PUNCH fires a storm of fists down a medium-range lane.",
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
    skill: { kind: "gatling", name: "GATLING PUNCH", cooldown: 6, damage: 14, radius: 110, width: 40, duration: 1 },
  },
  rick: {
    name: "Mad Scientist",
    role: "Inventor",
    blurb: "Laser gun. PORTAL GUN: shoot one portal, then another; walk into one to come out of the other. MISSILES: 10 homing missiles that chase targets until they hit.",
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
    skill: { kind: "portal", name: "PORTAL GUN", cooldown: 8, damage: 0, radius: 160, duration: 20 },
    skill2: { kind: "missiles", name: "MISSILES", cooldown: 14, damage: 25, radius: 0, count: 10, duration: 8 },
  },
  doraemon: {
    name: "Gadget Cat",
    role: "Robot cat",
    blurb: "1.5x HP. Air cannon blasts. TIME MACHINE turns everything back 2 seconds. GUNNER BOTS: 6 little gunner robots (15% of his HP each).",
    stars: 5,
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
    skill: { kind: "rewind", name: "TIME MACHINE", cooldown: 20, damage: 0, radius: 0, duration: 2 },
    skill2: { kind: "summon", name: "GUNNER BOTS", cooldown: 22, damage: 0.15, radius: 0, count: 6, duration: 15, pet: "gunbot" },
  },
  trainer: {
    name: "Monster Tamer",
    role: "Tamer",
    blurb: "Weak, slow punches. SPARK MOUSE: a fast electric mouse (60% HP) zaps enemies. FLAME DRAGON: a big fire dragon (200% HP). Pets stay until they fall or the Tamer does.",
    stars: 4,
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
    skill: { kind: "summon", name: "SPARK MOUSE", cooldown: 15, damage: 0.6, radius: 0, count: 1, pet: "sparkmouse" },
    skill2: { kind: "summon", name: "FLAME DRAGON", cooldown: 18, damage: 2, radius: 0, count: 1, pet: "flamedragon" },
  },
  kid: {
    name: "Phantom Thief",
    role: "Magician",
    blurb: "Runs 1.3x faster, card-gun shots. DRAW CARD throws a random card 1-9: it takes 10-90% of the target's max HP (1-9% on bosses).",
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
  },
  hanuman: {
    name: "Hanuman",
    role: "Monkey god",
    blurb: "Runs 1.5x faster, quick trident thrusts. REVIVE: for 5s after pressing it, falling brings him straight back up.",
    stars: 4,
    maxHp: 130,
    speed: 165,
    attack: "sword",
    attackCooldown: 0.25,
    damage: 20,
    range: 36,
    arc: 0.9,
    aoe: 0,
    shotSpeed: 0,
    pierce: 0,
    // REVIVE: if he falls within `duration` seconds, he gets back up with `damage` of his max HP.
    skill: { kind: "revive", name: "REVIVE", cooldown: 25, damage: 0.5, radius: 0, duration: 5 },
  },
  badigadi: {
    name: "Demon Lord",
    role: "Four-armed demon",
    blurb: "3x HP, runs 1.2x faster. Slow, crushing four-armed blows hit a wide area. IMMORTAL: a barrier blocks all damage for 3s and heals 10% HP/s.",
    stars: 5,
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
  },
  agamemnon: {
    name: "Agamemnon",
    role: "King of kings",
    blurb: "2x HP, bronze sword sweeps. SUMMON GLADIATORS calls 20 gladiators (10% of his HP each) to fight for 20 seconds.",
    stars: 5,
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
  },
  vampire: {
    name: "Vampire",
    role: "Night hunter",
    blurb: "Quick claw swipes. BLOOD LATCH leaps onto the nearest target in front, clings to it for 3s and drains its blood to heal.",
    stars: 4,
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
  },
  rider: {
    name: "Hopper Rider",
    role: "Masked hero",
    blurb: "1.5x HP, runs 1.5x faster, very fast punches. RIDER KICK leaps into a flying kick that stuns everything it hits for 2s.",
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
};

/**
 * Pickable heroes, ranked by how strong they are in the PvP Arena: weakest first, strongest last.
 * The character select shows them in this order. Heroes missing here go at the end.
 */
const PVP_RANKING: HeroId[] = [
  "lawliet", "healer", "titan", "trainer", "howl", "rudeus", "loki", "isekai", "vampire", "kid",
  "rick", "thorfinn", "deku", "okita", "sakamoto", "hanuman", "joyboy", "doraemon", "agamemnon", "killua",
  "rider", "gojo", "badigadi", "superman", "starplatinum", "simo", "ricardo", "yaotsu", "saitama",
];
export const HERO_IDS = [
  ...PVP_RANKING,
  ...(Object.keys(HEROES) as HeroId[]).filter((id) => !PVP_RANKING.includes(id)),
].filter((id) => !HEROES[id].summon);

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

export type EnemyKind = "cinderling" | "brute" | "caster" | "warden" | "godzilla" | "monkey" | "bananamonkey" | "kingkong" | "swordsman" | "swordmaster" | "swordgod";

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

/** Move a circle by (dx, dy), keeping it inside the world and out of rocks. */
export function moveCircle(x: number, y: number, dx: number, dy: number, r: number): { x: number; y: number } {
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

export function hitsRock(x: number, y: number): boolean {
  return ROCKS.some((rock) => Math.hypot(x - rock.x, y - rock.y) < rock.r);
}

export function inLava(x: number, y: number, lavaRadius: number): boolean {
  return Math.hypot(x - CENTER_X, y - CENTER_Y) > lavaRadius;
}

// Stages
export type StageId = "lava" | "jungle" | "dojo" | "boss" | "pvp";

export interface StageDef {
  name: string;
  blurb: string;
}

export const STAGES: Record<StageId, StageDef> = {
  lava: { name: "Stage 1: Lava Stage", blurb: "Survive 4 waves while lava creeps in, then slay the Pyre Warden." },
  jungle: { name: "Stage 2: Jungle Temple", blurb: "Harder! Hordes of monkeys, banana throwers, then the Ape King." },
  dojo: { name: "Stage 3: Sword Dojo", blurb: "Much harder! Sword students in white, then the Sword God himself." },
  boss: { name: "Boss Room", blurb: "No waves. Fight the Atomic Kaiju straight away. Dodge the atomic beam!" },
  pvp: { name: "PvP Arena", blurb: "Players fight each other. First to 3 kills wins. Online only." },
};

export const STAGE_IDS = Object.keys(STAGES) as StageId[];

/** Wave stages: which enemies come in each wave. */
export function wavesOf(stage: string): Partial<Record<EnemyKind, number>>[] {
  return stage === "jungle" ? JUNGLE_WAVES : stage === "dojo" ? DOJO_WAVES : WAVES;
}

export function stageOf(id: string): StageId {
  return id in STAGES ? (id as StageId) : "lava";
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
export const PVP_COUNTDOWN = 3;
