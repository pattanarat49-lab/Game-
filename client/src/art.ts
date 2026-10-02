// Pixel art defined as text grids so it is easy to tweak without an image editor.
// Each character maps to a colour in the sprite's palette; "." is transparent.
// Replace these with Aseprite sprite sheets later (see README).

export interface PixelSprite {
  grid: string[];
  palette: Record<string, string>;
}

const OUTLINE = "#1a0f14";

// Marker colours for players 1-4 (shown under each hero's feet).
export const PLAYER_COATS = [
  ["#3b7dd8", "#24508f"],
  ["#d84b3b", "#8f2a24"],
  ["#3bd87a", "#248f4c"],
  ["#c93bd8", "#7d248f"],
];

// Hero sprites, drawn in the style of the reference pictures (chibi, big heads, bold outline).
export const HERO_SPRITES: Record<string, PixelSprite> = {
  superman: {
    grid: [
      "...kkkkkkk......",
      "..khhhHHhhk.....",
      ".khhhhhhhhhk....",
      ".khhssshhhhk....",
      ".kssssssshhk....",
      ".ksesssesshk....",
      ".kssssssssk.....",
      ".kSssmmsssk.....",
      "..kSssssskk.....",
      ".kRrbbbbbrRk....",
      "kRkbrbybrbkRk...",
      "kRkbbrrrbbkRRk..",
      "ksbbbbbbbbbsRk..",
      ".kyyoyyyyykRRk..",
      ".kbbbkkbbbkRRRk.",
      ".kbbk..kbbkkkk..",
      ".krrk..krrk.....",
      ".kkkk..kkkk.....",
    ],
    palette: {
      k: OUTLINE,
      h: "#262626",
      H: "#4a4a4a",
      s: "#eba57a",
      S: "#d98d64",
      e: "#1a0f14",
      m: "#7a2a1a",
      b: "#2f6fd6",
      r: "#d42020",
      R: "#9a1414",
      y: "#ffd400",
      o: "#f0a020",
    },
  },
  isekai: {
    grid: [
      "..k.k..k.k......",
      ".kykykkykyk.....",
      ".kyyyyyyyyyk....",
      "kyyyYyyyyYyyk...",
      ".kyysssssyyk....",
      ".kysgsssgsyk....",
      "..ksssssssk.....",
      "..kkSsssSkk.....",
      ".kCwwwowwwCk....",
      "kCCwwwowwwCCk...",
      "kCswwwwwwwsCCk..",
      "kCkWwwwwwWkCCk..",
      ".kkdooooodkCCCk.",
      "..kdddkdddkCCk..",
      "..kddk.kddkkk...",
      "..knnk.knnk.....",
      "..knnk.knnk.....",
      "..kkkk.kkkk.....",
    ],
    palette: {
      k: OUTLINE,
      y: "#f5d36b",
      Y: "#c8961e",
      s: "#f6c9a0",
      S: "#e0a982",
      g: "#2fa34f",
      w: "#f2f2f2",
      W: "#b9c0cc",
      o: "#d9a53a",
      C: "#2a4ea8",
      d: "#2a2a3a",
      n: "#6b4226",
    },
  },
  simo: {
    grid: [
      ".....kkkkk......",
      "....kwwwwwk.....",
      "...kwwwGwwwk....",
      "..kwwwGGGwwwk...",
      "..kwwkkkkkwwk...",
      "..kwkmemmemkwk..",
      "..kwkmmmmmmkwk..",
      "..kwWkMMMMkWwk..",
      ".kwwwWkkkkWwwwk.",
      "kwwwwwwwwwwwwWk.",
      "kwWwwwwwwwwwwWk.",
      "kwwwwwwwwwwwwWk.",
      ".kwwwWwwwwWwwk..",
      ".kwwwwwwwwwwwk..",
      "..kGwwwkwwwGk...",
      "..kddk...kddk...",
      "..kwwk...kwwk...",
      "..kkkk...kkkk...",
    ],
    palette: {
      k: OUTLINE,
      w: "#f4f6f8",
      W: "#c9d1d9",
      G: "#8f9aa6",
      m: "#5a6b3a",
      M: "#3e4a28",
      e: "#1a0f14",
      d: "#1f2440",
    },
  },
  killua: {
    grid: [
      "...k.k.kk.k.....",
      "..kwkwkwwkwk....",
      ".kwwwwwwwwwwk...",
      "kwwWwwwwwwWwwk..",
      ".kwwwwwwwwwwk...",
      ".kwWsssssWwk....",
      "..ksesssesk.....",
      "..ksssssssk.....",
      "...kssnssk......",
      "..knttnttnk.....",
      ".knntttttnnk....",
      ".ksntttttnsk....",
      "..kTtttttTk.....",
      "..kppppppk......",
      "..kppkkppk......",
      "..ksk..ksk......",
      "..khPk.khPk.....",
      "..kkkk.kkkk.....",
    ],
    palette: {
      k: OUTLINE,
      w: "#f0f0f5",
      W: "#b8b8c8",
      s: "#f6d2b0",
      e: "#4a5a8a",
      n: "#1f2a5a",
      t: "#f4f4f4",
      T: "#cfd3dc",
      p: "#6a6a9a",
      h: "#ffffff",
      P: "#7a4a8a",
    },
  },
  howl: {
    grid: [
      ".......k........",
      "......kyk.k.....",
      "...kkkyykkyk....",
      "..kyyyyyyyyyk...",
      ".kyyyYyyyYyyyk..",
      ".kyYsssssssYyk..",
      ".kyseesssseesyk.",
      ".kysbsssssbsyk..",
      "..kkssssssskk...",
      ".kcvkwwwwwkvck..",
      "kcvckwwdwwkcvck.",
      "kvcvckwwwkcvcvk.",
      "kcvcvkddddkvcvck",
      ".kkkkkddddkkkkk.",
      ".....kddkdk.....",
      ".....kddkdk.....",
      ".....kkkkkk.....",
      "................",
    ],
    palette: {
      k: OUTLINE,
      y: "#f7dc7a",
      Y: "#d9b44a",
      s: "#fbe0d0",
      b: "#f2a0a0",
      e: "#1a0f14",
      w: "#ffffff",
      d: "#222222",
      c: "#f4a6c4",
      v: "#b4a0dc",
    },
  },
  ricardo: {
    grid: [
      "....kkkkkk......",
      "...khhhhhhk.....",
      "..khhhhhhhhk....",
      "..khhssssshk....",
      "..ksesssesk.....",
      "..ksssssssk.....",
      "...kSsssSk......",
      "..kkssssskk.....",
      ".kRrksssskrRk...",
      ".krrkSsSskrrk...",
      ".kRrksssskrRk...",
      "..kkkSsSskkk....",
      "...kwwwwwk......",
      "...knnnnnk......",
      "...knnknnk......",
      "...ksk.ksk......",
      "...kbk.kbk......",
      "...kkk.kkk......",
    ],
    palette: {
      k: OUTLINE,
      h: "#2a1a14",
      s: "#c98a5a",
      S: "#a86c42",
      e: "#1a0f14",
      r: "#d42020",
      R: "#8a1010",
      n: "#1f2a6a",
      w: "#f4f4f4",
      b: "#222222",
    },
  },
};

export const MAGIC_ORB: PixelSprite = {
  grid: ["..kkk..", ".kpvpk.", "kpwwvpk", "kvwwwvk", "kpvwvpk", ".kpvpk.", "..kkk.."],
  palette: { k: "#5a3a8a", p: "#f4a6c4", v: "#b4a0dc", w: "#ffffff" },
};

// Calcifer, the fire demon, used for Howl's skill.
export const CALCIFER: PixelSprite = {
  grid: [
    "....r.....r.",
    "...rr....rr.",
    "..rror..ror.",
    ".rooorrroor.",
    "rooyyyyyyoor",
    "royykyykyyor",
    "royyyyyyyyor",
    "royyykkyyyor",
    "rooyyyyyyoor",
    ".rooooooorr.",
    "..rrrrrrr...",
  ],
  palette: { r: "#d9531e", o: "#f5892a", y: "#ffd06a", k: "#1a0f14" },
};

export const SWORD: PixelSprite = {
  grid: [
    "kk..kkkkkkkkkkkk..",
    "kokkwwwwwwwwwwwwkk",
    "kooobbbbbbbbbbbbbk",
    "kokkwwwwwwwwwwwwkk",
    "kk..kkkkkkkkkkkk..",
  ],
  palette: { k: OUTLINE, o: "#d9a53a", w: "#e8eef7", b: "#3b5bc4" },
};

export const RIFLE: PixelSprite = {
  grid: [
    "....kk..............",
    "kkkkkkkkkkkkkkkkkkk.",
    "knnnnnnkGGGGGGGGGGGk",
    "knnnkkkkkkkkkkkkkkk.",
    "kkkk................",
  ],
  palette: { k: OUTLINE, n: "#7a4a26", G: "#8f9aa6" },
};

export const SWORD_WAVE: PixelSprite = {
  grid: [
    "kk......",
    ".kbk....",
    "..kbk...",
    "..kwbk..",
    "...kwbk.",
    "...kwwbk",
    "...kwwbk",
    "...kwwbk",
    "...kwwbk",
    "...kwbk.",
    "..kwbk..",
    "..kbk...",
    ".kbk....",
    "kk......",
  ],
  palette: { k: "#1f3f8f", b: "#6fa8ff", w: "#ffffff" },
};

export const SNIPE_SHOT: PixelSprite = {
  grid: [".ooyyyyww.", "oyyyyywwww", ".ooyyyyww."],
  palette: { o: "#f07a22", y: "#ffd23f", w: "#ffffff" },
};

export const CINDERLING: PixelSprite = {
  grid: [
    "....y.....",
    "...yoy..y.",
    "..yooo.yo.",
    ".koooooook",
    "krrwrrwrrk",
    "krrrrrrrrk",
    "krrkrrkrrk",
    ".krrrrrrk.",
    "..krrrrk..",
    "...kkkk...",
  ],
  palette: { k: OUTLINE, r: "#c4361f", o: "#f07a22", y: "#ffd23f", w: "#fff6c2" },
};

export const BRUTE: PixelSprite = {
  grid: [
    "....kkkkkk....",
    "...knnnnnnk...",
    "..knmmmmmmnk..",
    "..kmyymmyymk..",
    "..knmmoommnk..",
    ".kknnnoonnnkk.",
    "knnmkmmmmkmnnk",
    "knmmonmmnommnk",
    "knmmmnooommmnk",
    ".kmmnmmmmnmmk.",
    ".knnkmoomknnk.",
    "..kkknmmnkkk..",
    "...knnkknnk...",
    "...kkk..kkk...",
  ],
  palette: { k: OUTLINE, n: "#3a3236", m: "#5e5257", o: "#ff7b1c", y: "#ffe14d" },
};

export const CASTER: PixelSprite = {
  grid: [
    ".....kk.....",
    "....kaak....",
    "...kaaaak...",
    "..kaddddak..",
    "..kdydydak..",
    "..kaddddak..",
    ".kaaaaaaaak.",
    "okaaaaaaaak.",
    "ookaaaaaak..",
    "oykaaaaaak..",
    ".kkaaaaaaak.",
    ".kaaaaaaaak.",
    ".kaaakaaaak.",
    ".kkkk.kkkk..",
  ],
  palette: { k: OUTLINE, a: "#7a6f78", d: "#241b22", y: "#ff9d2e", o: "#ffcf4a" },
};

export const WARDEN: PixelSprite = {
  grid: [
    ".k............k.",
    ".kk..........kk.",
    "..kk.kkkkkk.kk..",
    "...kknnnnnnkk...",
    "...knnnnnnnnk...",
    "..knnywnnwynnk..",
    "..knnnnnnnnnnk..",
    "..knnoooooonnk..",
    ".kknnnooooonnkk.",
    "knnnknnnnnnknnnk",
    "knoonknoonknoonk",
    "knnnknnnnnnknnnk",
    ".kk.knnoonnk.kk.",
    "....knnnnnnk....",
    "....knnkknnk....",
    "....kkk..kkk....",
  ],
  palette: { k: OUTLINE, n: "#4a1d1d", o: "#ff6a00", y: "#ffe14d", w: "#ffffff" },
};

// Godzilla, the boss of the Boss Room (drawn facing right, shown at about 2x).
export const GODZILLA: PixelSprite = {
  grid: [
    ".............kkkkk......",
    "....k.......kgggggk.....",
    "...kpk.....kggggggGk....",
    "...kpk.k...kgggyggggk...",
    "..kppkpk...kggggggggwk..",
    "..kppkppk..kgggggkwkwk..",
    ".kppkppk..kGgggggggkk...",
    ".kpkppkpk.kGggggggk.....",
    "..kpkppkkkGgggggbk......",
    "..kkpkkgggggggggbbk.....",
    "...kkggggggggggbbbgk....",
    "...kgggggggggggbbbggk...",
    "..kGgggggggggggbbbgggk..",
    "..kGggggggggggbbbggkgk..",
    ".kGGgggggggggbbbbgk.kk..",
    ".kGgggggggggggbbbgk.....",
    "kGGggggggggggggbgk......",
    "kGgggkkGggggggggk.......",
    "kGgk..kGgggkGgggk.......",
    "kGk...kGggk.kGggk.......",
    "kk....kGggk.kGggk.......",
    "......kGGgk.kGGgk.......",
    "......kkkkk.kkkkk.......",
    "........................",
  ],
  palette: { k: "#0f1412", g: "#3f5a4a", G: "#2a3d32", b: "#6f8a6a", p: "#a8d8ff", y: "#ffe14d", w: "#f4f4f4" },
};

export const ENEMY_SHOT: PixelSprite = {
  grid: [".rrr.", "royor", "ryyyr", "royor", ".rrr."],
  palette: { r: "#c4361f", o: "#f07a22", y: "#ffd23f" },
};

export const SPARK: PixelSprite = {
  grid: ["y.y", ".w.", "y.y"],
  palette: { y: "#ffd23f", w: "#ffffff" },
};

/** Draw a pixel grid onto a new canvas. */
export function renderPixelSprite(sprite: PixelSprite): HTMLCanvasElement {
  const h = sprite.grid.length;
  const w = Math.max(...sprite.grid.map((r) => r.length));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  sprite.grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = sprite.palette[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return canvas;
}
