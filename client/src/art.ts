// Pixel art defined as text grids so it is easy to tweak without an image editor.
// Each character maps to a colour in the sprite's palette; "." is transparent.
// Replace these with Aseprite sprite sheets later (see README).

export interface PixelSprite {
  grid: string[];
  palette: Record<string, string>;
}

const OUTLINE = "#1a0f14";

// Coat colours for players 1-4.
export const PLAYER_COATS = [
  ["#3b7dd8", "#24508f"],
  ["#d84b3b", "#8f2a24"],
  ["#3bd87a", "#248f4c"],
  ["#c93bd8", "#7d248f"],
];

export function gunslinger(color: number): PixelSprite {
  const [coat, coatDark] = PLAYER_COATS[color % PLAYER_COATS.length];
  return {
    grid: [
      "...kkkkkk...",
      "..khhhhhhk..",
      ".kkhhhhhhkk.",
      "khhhhhhhhhhk",
      ".kkkkkkkkkk.",
      "..ksessesk..",
      "..kssssssk..",
      "..kkggggkk..",
      ".kccggggcck.",
      "kccccccccddk",
      "kscccccccdsk",
      ".kccccccddk.",
      ".kccccccddk.",
      "..kddkkddk..",
      "..kbbk.kbbk.",
      "..kkkk.kkkk.",
    ],
    palette: {
      k: OUTLINE,
      h: "#6b4226",
      s: "#f1c27d",
      e: "#1a0f14",
      g: "#f5c542",
      c: coat,
      d: coatDark,
      b: "#3d2a1e",
    },
  };
}

export const GUN: PixelSprite = {
  grid: ["kkkkkkk.", "kmmmmmmk", "kkkmkkk.", "..kk...."],
  palette: { k: OUTLINE, m: "#9aa3ad" },
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

export const PLAYER_SHOT: PixelSprite = {
  grid: [".yy.", "ywwy", "ywwy", ".yy."],
  palette: { y: "#ffd23f", w: "#ffffff" },
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
