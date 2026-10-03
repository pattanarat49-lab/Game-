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
  saitama: {
    grid: [
      "...kkkkkkkkk....",
      "..kssssssssSk...",
      "..kssssssssSk...",
      "..kssesssessk...",
      "..ksssssssssk...",
      "..ksssmmmsssk...",
      "...ksssssssk....",
      ".kwyyyyyyyyywk..",
      ".kwyyyyyyyyywk..",
      ".kwyybbbbbyywk..",
      ".kwryyyyyyyrwk..",
      ".kwwyyyyyyywwk..",
      "...kyyyk.kyyyk..",
      "...kyyyk.kyyyk..",
      "...krrrk.krrrk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, s: "#f2c49a", S: "#d9a479", e: "#1a0f14", m: "#a0604a", y: "#ffd21f", b: "#2a2a2a", r: "#d42020", w: "#f4f4f4" },
  },
  healer: {
    grid: [
      "...kkkkkkkkk....",
      "..krrrrrrrrrk...",
      "..khhhhhhhhhk...",
      "..khssssssshk...",
      "..khsessseshk...",
      "..kddsssssddk...",
      "...kdddwdddk....",
      ".krgwwdddwwgrk..",
      ".krgwwwywwwgrk..",
      ".krgwwyyywwgrk..",
      ".ksgwwwowwwgsk..",
      ".krrrrrrrrrrrk..",
      "...knnnk.knnnk..",
      "...knnnk.knnnk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, r: "#e2302e", h: "#b06d28", d: "#7a3a1c", s: "#f5d3b0", e: "#1a0f14", w: "#ffffff", g: "#ddd6d0", y: "#ffd54a", o: "#ef9550", n: "#3f3536" },
  },
  deku: {
    grid: [
      "..k.kkkkk.k.....",
      "..kGkGGGGkGk....",
      "..kGGGGGGGGGk...",
      "..kGsssssssGk...",
      "..kssesssessk...",
      "..ksfsssssfsk...",
      "...kssmmmssk....",
      ".kgggglllggggk..",
      ".kgglgggggglgk..",
      ".kgggnnnnngggk..",
      ".kwgggggggggwk..",
      ".kwgggggggggwk..",
      "...kgggk.kgggk..",
      "...kgggk.kgggk..",
      "...krrrk.krrrk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, G: "#1f4a35", s: "#f2c49a", e: "#1f6b45", f: "#c98a6a", m: "#8a4030", g: "#2f8a5a", l: "#57c48a", n: "#8a8f98", w: "#f4f4f4", r: "#d42020" },
  },
  okita: {
    grid: [
      "...kkkkkkkkk....",
      "..kpppppppppk...",
      "..kpppbbppppk...",
      "..kppsssssppk...",
      "..kpsysssyspk...",
      "..kpssssssspk...",
      "...kpssssspk....",
      ".kpcccwwwcccpk..",
      ".kpcccwwwcccpk..",
      ".kpcWcwwwcWcpk..",
      ".kscWcnnncWcsk..",
      ".kcWcWnnnWcWck..",
      "...knnnk.knnnk..",
      "...knnnk.knnnk..",
      "...kbbbk.kbbbk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, p: "#f3dbe0", b: "#1a1a1a", s: "#f7d7bd", y: "#e8c040", c: "#7fc4ec", W: "#ffffff", w: "#f0f0f0", n: "#2a2a3a" },
  },
  gojo: {
    grid: [
      "..k.kk.kk.k.....",
      "..kwkwwkwwkwk...",
      "..kwwwwwwwwwk...",
      "..kwsssssssWk...",
      "..kbbbbbbbbbk...",
      "..ksssssssssk...",
      "...ksssmsssk....",
      ".knnnnnnnnnnnk..",
      ".knNnnnnnnnNnk..",
      ".knNnnnnnnnNnk..",
      ".ksNnnnnnnnNsk..",
      ".knnnnnnnnnnnk..",
      "...knnnk.knnnk..",
      "...knnnk.knnnk..",
      "...kNNNk.kNNNk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, w: "#f4f6ff", W: "#c9d2ea", s: "#f2d2b6", b: "#111111", m: "#a0604a", n: "#1c1f33", N: "#3a3f66" },
  },
  starplatinum: {
    grid: [
      "...kkkkkkkkk....",
      "..khhhhhhhhhk...",
      "..khyyyyyyyhk...",
      "..khuuuuuuuhk...",
      "..khucuuucuhk...",
      "..khuuuuuuuhk...",
      "...khuuuuuhk....",
      ".khrrrrrrrrrhk..",
      ".kuuyuuuuuyuuk..",
      ".kuuuUUUUUuuuk..",
      ".kyuuUUUUUuuyk..",
      ".kuuuwwwwwuuuk..",
      "...kuuuk.kuuuk..",
      "...kuuuk.kuuuk..",
      "...kyyyk.kyyyk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, h: "#151020", y: "#e8c040", u: "#7a6fd0", U: "#5c52b0", c: "#7ff0ff", r: "#d42040", w: "#f4f4f4" },
  },
  rudeus: {
    grid: [
      "...kkkkkkkkk....",
      "..khhhhhhhhhk...",
      "..khhhhhhhhhk...",
      "..khhssssshhk...",
      "..khsessseshk...",
      "..khssssssshk...",
      "...ksssmsssk....",
      ".kgggwwwwwgggk..",
      ".kggggwwwggggk..",
      ".kgggggbgggggk..",
      ".ksggggbggggsk..",
      ".kGGGGGGGGGGGk..",
      "...knnnk.knnnk..",
      "...knnnk.knnnk..",
      "...kbbbk.kbbbk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, h: "#6b4426", s: "#f2c9a5", e: "#2a6a4a", m: "#a0604a", g: "#5a6a8a", G: "#3f4b66", w: "#f0f0f0", b: "#c9a040", n: "#3a3a46" },
  },
  loki: {
    grid: [
      "..kk.......kk...",
      "..kyk.....kyk...",
      "...kyk...kyk....",
      "...kyykkkyyk....",
      "..kyyyyyyyyyk...",
      "..kyysssssyyk...",
      "..kyscsssscyk...",
      "..khssssssshk...",
      "...khsmmmshk....",
      ".kGyygggggyyGk..",
      ".kGygyyyyygyGk..",
      ".kGgggyyygggGk..",
      ".ksGgggggggGsk..",
      ".kGGgggyyggGGk..",
      "...kgggk.kgggk..",
      "...kyyyk.kyyyk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, y: "#e7b83a", s: "#f4d2b4", c: "#1d5a5a", h: "#151515", m: "#8a4030", G: "#1f5a28", g: "#3a8a3a" },
  },
  lawliet: {
    grid: [
      "..k.kkkkkk.k....",
      "..khkhhhhhkhk...",
      "..khhhhhhhhhk...",
      "..khhppppphhk...",
      "..khpeppppehk...",
      "..khpEpppEphk...",
      "...kppmmmppk....",
      ".kwwwwwwwwwwwk..",
      ".kwwwwwwwwwwwk..",
      ".kwwwwwwwwwwwk..",
      ".kpwwwwwwwwwpk..",
      ".kbbbbbbbbbbbk..",
      "...kbbbk.kbbbk..",
      "...kbbbk.kbbbk..",
      "...kpppk.kpppk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, h: "#141418", p: "#f4e4d8", E: "#4a3a4a", e: "#111111", m: "#9a7a70", w: "#f2f2f2", b: "#3d5e9e" },
  },
  thorfinn: {
    grid: [
      "..k.kkkkkk.k....",
      "..kykyyyyykyk...",
      "..kyyyyyyyyyk...",
      "..kyysssssyyk...",
      "..kyseSsseyyk...",
      "..kysssssssyk...",
      "...kssmmmssk....",
      ".ktttbbbbbtttk..",
      ".kttttbtbttttk..",
      ".kttttnnnttttk..",
      "dkstttnnntttskd.",
      "dkttttttttttttkd",
      "...knnnk.knnnk..",
      "...knnnk.knnnk..",
      "...kbbbk.kbbbk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, y: "#e8c86a", s: "#e9b48c", S: "#b05a4a", e: "#1a3a4a", m: "#8a4030", t: "#3f6f6a", b: "#7a5030", n: "#4a3a2a", d: "#d8dde8" },
  },
  // Retired Hitman: slicked-back hair, round glasses, white shirt and a shop apron.
  sakamoto: {
    grid: [
      "....kkkkkkk.....",
      "...khhhhhhhk....",
      "..khhhhhhhhhk...",
      "..khhssssshhk...",
      "..kgggsssgggk...",
      "..ksGgsssgGsk...",
      "..ksssssssssk...",
      "...kssmmmssk....",
      "..kwwwkkkwwwk...",
      ".kwwaaaaaaawwk..",
      ".kswaaaaaaawsk..",
      ".kswaaaaaaawsk..",
      "..kkaaaaaaakk...",
      "...kbbbkbbbk....",
      "...kbbbkbbbk....",
      "...knnnknnnk....",
      "...kkkkkkkkk....",
    ],
    palette: { k: OUTLINE, h: "#1e1e24", s: "#f0c8a0", g: "#2a2a2a", G: "#cfe8ff", m: "#a0645a", w: "#f2f2f2", a: "#d8b04a", b: "#3a3a4a", n: "#2a1a14" },
  },
  titan: {
    grid: [
      "...kkkkkkkkk....",
      "..khhhhhhhhhk...",
      "..khhhhhhhhhk...",
      "..khssssssshk...",
      "..kseGsssGesk...",
      "..ksssssssssk...",
      "...kssmmmssk....",
      ".kgjjjwwwjjjgk..",
      ".kgjjbwwwbjjgk..",
      ".kgjjbbbbbjjgk..",
      ".ksjjbwwwbjjsk..",
      ".kgwwwwwwwwwgk..",
      "...kwwwk.kwwwk..",
      "...kwwwk.kwwwk..",
      "...knnnk.knnnk..",
      "...kkkkk.kkkkk..",
    ],
    palette: { k: OUTLINE, h: "#4a2c18", s: "#f2c49a", e: "#1a4a2a", G: "#2fae6a", m: "#8a4030", g: "#2f6a3a", j: "#b08a5a", b: "#5a3a1a", w: "#efe8dc", n: "#3a2a1a" },
  },
  yaotsu: {
    grid: [
      ".kk.kkkkkk.kk...",
      "kwwkwwwwwwkwwk..",
      "kwwwwwwwwwwwwwk.",
      "kwwwsssssssswwk.",
      "kwwsesssssesswk.",
      "kwwssssssssswwk.",
      "kwwwssssmssswwk.",
      ".kwwksssssskwwk.",
      ".kbbbbswwwwbbk..",
      ".kbwbbbwwbwbbk..",
      ".kbbwbwbbwbbbk..",
      ".kbbbwbbwbwwbk..",
      ".ksbwbbwbbwbsk..",
      "..kbbbwbwbbbk...",
      "..kbwbk.kbwbk...",
      "..kbbwk.kwbbk...",
      "..kbbbk.kbwbk...",
      "..kkkkk.kkkkk...",
    ],
    palette: { k: OUTLINE, w: "#f6f6f6", s: "#dcd8d2", e: "#111111", m: "#6a6a6a", b: "#141414" },
  },
};

// Titan form: a 50m Attack Titan (drawn bigger and scaled up in game).
export const TITAN_FORM: PixelSprite = {
    grid: [
      "......kkkkkkkkkk........",
      ".....khhhhhhhhhhk.......",
      "....khhhhhhhhhhhhk......",
      "...khhhssssssssshhk.....",
      "...khhsSssssssSshhk.....",
      "...khhsGGsssssGGshk.....",
      "...khhsssssSssssshk.....",
      "...khhsrrrrrrrrrshk.....",
      "...khhswtwtwtwtwshk.....",
      "...khh.ssssssssshk......",
      "..kkk..kssssssskkkk.....",
      ".kssskkssSssSsskssk.....",
      "kssSsssssSssSssssSsk....",
      "kssSssSSsssssSSssSsk....",
      "kssSssSsssssssSssSsk....",
      "kssk.sSSSsSsSSSskssk....",
      "kssk.ssSsssssSsskssk....",
      "kssk.sssSSsSSssskssk....",
      "kRRk.ssssssssssskRRk....",
      "kRRk..ksssSsssk..RRk....",
      ".kk...kssskssssk..kk....",
      "......ksssk.sssk........",
      "......ksSsk.sSsk........",
      "......ksSsk.sSsk........",
      "......ksssk.sssk........",
      ".....kssssk.ssssk.......",
      ".....kkkkkk.kkkkk.......",
    ],
    palette: { k: OUTLINE, h: "#2a1a12", s: "#d9a07a", S: "#a8704e", G: "#4dff9a", r: "#7a2a1a", w: "#fff4e0", t: "#3a1a10", R: "#c97a5a" },
  };

// Jungle Temple enemies.
export const MONKEY: PixelSprite = {
  grid: [
    "..kkk..kkk..",
    ".kbbbkkbbbk.",
    ".kbttbbttbk.",
    "..kbtttttbk.",
    "..ktetttetk.",
    "..kbtmmmtbk.",
    "...kbbbbbk..",
    "..kbbttbbbk.",
    ".kbkbttbkbk.",
    ".kbkbbbbkbkk",
    "...kbkkbk.kb",
    "...kk..kk..k",
  ],
  palette: { k: OUTLINE, b: "#7a4a24", t: "#e2b07a", e: "#1a0f14", m: "#a0604a" },
};

export const BANANA_MONKEY: PixelSprite = {
  grid: [
    "..kkk..kkk...",
    ".kbbbkkbbbk..",
    ".kbttbbttbk..",
    "..kbtttttbk.y",
    "..ktetttetk.y",
    "..kbtmmmtbkyy",
    "...kbbbbbkyy.",
    "..kbbttbbbk..",
    ".kbkbttbbbk..",
    ".kbkbbbbbbk..",
    "...kbkkbk....",
    "...kk..kk....",
  ],
  palette: { k: OUTLINE, b: "#5a3a1c", t: "#d8a46a", e: "#1a0f14", m: "#a0604a", y: "#ffe14a" },
};

export const KINGKONG: PixelSprite = {
  grid: [
    ".......kkkkkkkk.........",
    "......kffffffffk........",
    ".....kffffffffffk.......",
    ".....kfggggggggfk.......",
    ".....kgeggggggeg k......".replace(" ", "k"),
    ".....kgggggggggk........",
    ".....kgmmmmmmmgk........",
    "...kkkkgwwwwwgkkkk......",
    "..kffffkgggggkffffk.....",
    ".kffffffkkkkkffffffk....",
    "kffffffgggggggffffffk...",
    "kfffffggggggggggffffk...",
    "kffffkgggggggggkffffk...",
    "kfffk.kgggggggk.kfffk...",
    "kfffk.kfffffffk.kfffk...",
    "kgggk.kfffffffk.kgggk...",
    ".kkk..kfffkfffk..kkk....",
    "......kfffkfffk.........",
    ".....kffffkffffk........",
    ".....kkkkkkkkkkk........",
  ],
  palette: { k: OUTLINE, f: "#2e2a2c", g: "#6a5a54", e: "#ffb000", m: "#3a1a1a", w: "#f2ead8" },
};

export const BANANA: PixelSprite = {
  grid: ["k.....k", "yk...ky", ".yyyyy.", "..kkk.."],
  palette: { k: "#5a4a10", y: "#ffe14a" },
};

export const BOULDER: PixelSprite = {
  grid: [".kkkk.", "kggGgk", "kgGggk", "kggggk", "kgggGk", ".kkkk."],
  palette: { k: "#1a1418", g: "#7a6e66", G: "#a09488" },
};

// An ordinary person: what monsters turn into under Yaotsu's REALITY CHANGE.
export const HUMAN: PixelSprite = {
  grid: [
    "..kkkkk...",
    ".khhhhhk..",
    ".khssssk..",
    ".ksesesk..",
    ".kssmssk..",
    "..kssskk..",
    ".kbbbbbbk.",
    "kbkbbbbkbk",
    "ksk bbbksk".replace(" ", "b"),
    "..kbbbbk..",
    "..kgggk...",
    "..kgkgk...",
    "..kgkgk...",
    "..kkkkk...",
  ],
  palette: { k: OUTLINE, h: "#5a3a22", s: "#e9b48c", e: "#1a0f14", m: "#8a4030", b: "#6a8ac8", g: "#5a5a64" },
};

// Projectiles for the newer casters: the same orb shape in their own colours.
const ORB_GRID = ["..kkk..", ".kpvpk.", "kpwwvpk", "kvwwwvk", "kpvwvpk", ".kpvpk.", "..kkk.."];
export const HOLY_ORB: PixelSprite = { grid: ORB_GRID, palette: { k: "#b8862a", p: "#ffe28a", v: "#fff4c0", w: "#ffffff" } };
export const WATER_ORB: PixelSprite = { grid: ORB_GRID, palette: { k: "#1f4a8a", p: "#4aa8ff", v: "#9fd8ff", w: "#ffffff" } };
export const GLITCH_ORB: PixelSprite = { grid: ORB_GRID, palette: { k: "#ff2a6a", p: "#141414", v: "#2affea", w: "#ffffff" } };
export const LOKI_ORB: PixelSprite = { grid: ORB_GRID, palette: { k: "#1f5a28", p: "#3a8a3a", v: "#e7b83a", w: "#fff4c0" } };

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

export const KNIFE: PixelSprite = {
  grid: [
    "kkk.kkkkkk..",
    "knnkwwwwwwkk",
    "kkk.kkkkkk..",
  ],
  palette: { k: OUTLINE, n: "#3a2a20", w: "#e8eef7" },
};

export const MACHINE_GUN: PixelSprite = {
  grid: [
    "......kk..........",
    "kkkkkkkkkkkkkkkkk.",
    "kddddddddGGGGGGGGk",
    "kddkkkkddkkkkkkkk.",
    "kkk..kddk.........",
    "......kkk.........",
  ],
  palette: { k: OUTLINE, d: "#3a3d44", G: "#8f9aa6" },
};

export const MG_SHOT: PixelSprite = {
  grid: ["oyyw"],
  palette: { o: "#f07a22", y: "#ffd23f", w: "#ffffff" },
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
