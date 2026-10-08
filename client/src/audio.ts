// Music and sound effects (user request 2026-10-08), all made live with the Web Audio API: no sound files.
// Each screen and stage has its own chiptune song (a small step sequencer plays it), and every hero's
// skills get their own sound: a family by what the skill does (a slash, a blast, ice, a heal...) voiced
// in that hero's own pitch and colour, with a short two-note "signature" so no two heroes sound alike.
// Browsers only allow sound after the player touches the page, so nothing plays until the first tap or key.

import { HEROES, HeroId, SkillDef, heroOf } from "../../shared/game";

export type SongId = "login" | "home" | "ring" | "classic" | "royale" | "world" | "dungeon" | "tutorial";

const KEY = "uv-audio";

interface Levels {
  music: number;
  sfx: number;
}

function loadLevels(): Levels {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && typeof v.music === "number" && typeof v.sfx === "number") return { music: v.music, sfx: v.sfx };
  } catch {
    // no storage: defaults
  }
  return { music: 0.5, sfx: 0.7 };
}

let levels = loadLevels();
let ctx: AudioContext | undefined;
let musicBus: GainNode | undefined;
let sfxBus: GainNode | undefined;
let noise: AudioBuffer | undefined;

export function audioLevels(): Levels {
  return { ...levels };
}

export function setAudioLevels(next: Partial<Levels>) {
  levels = { ...levels, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(levels));
  } catch {
    // kept until the page closes
  }
  if (ctx && musicBus) musicBus.gain.setTargetAtTime(levels.music * MUSIC_GAIN, ctx.currentTime, 0.05);
  if (ctx && sfxBus) sfxBus.gain.setTargetAtTime(levels.sfx * SFX_GAIN, ctx.currentTime, 0.05);
}

/** Loudness of the two buses at full volume (phone speakers need it loud). */
const MUSIC_GAIN = 1.4;
const SFX_GAIN = 1.3;
let keepAlive: HTMLAudioElement | undefined;

/** Make the audio context on the first touch, click or key (browsers block sound before that). */
function unlock() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    comp.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = levels.music * MUSIC_GAIN;
    musicBus.connect(comp);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = levels.sfx * SFX_GAIN;
    sfxBus.connect(comp);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  // iPhone/iPad: Web Audio is muted by the silent switch unless a media element plays too, so loop a silent clip.
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (session && session.type !== "playback") session.type = "playback";
  if (!keepAlive) {
    keepAlive = new Audio(silentWav());
    keepAlive.loop = true;
    keepAlive.setAttribute("playsinline", "");
  }
  if (keepAlive.paused) void keepAlive.play().catch(() => undefined);
  if (ctx.state !== "running") void ctx.resume();
  if (wanted && !playing) startSong(wanted);
  else if (track && playing === track.id && track.el.paused) void track.el.play().catch(() => undefined);
}
/** Half a second of silence as a WAV data URL. */
function silentWav(): string {
  const n = 4000;
  const buf = new DataView(new ArrayBuffer(44 + n));
  const str = (o: number, t: string) => [...t].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  buf.setUint32(4, 36 + n, true);
  str(8, "WAVEfmt ");
  buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true);
  buf.setUint16(22, 1, true);
  buf.setUint32(24, 8000, true);
  buf.setUint32(28, 8000, true);
  buf.setUint16(32, 1, true);
  buf.setUint16(34, 8, true);
  str(36, "data");
  buf.setUint32(40, n, true);
  for (let i = 0; i < n; i++) buf.setUint8(44 + i, 128);
  let bin = "";
  new Uint8Array(buf.buffer).forEach((b) => (bin += String.fromCharCode(b)));
  return "data:audio/wav;base64," + btoa(bin);
}
for (const ev of ["pointerdown", "pointerup", "click", "keydown", "touchstart", "touchend"]) addEventListener(ev, unlock, { capture: true, passive: true });
// Back from another tab or app: carry on.
document.addEventListener("visibilitychange", () => {
  if (!ctx) return;
  if (document.hidden) void ctx.suspend();
  else void ctx.resume();
});

// ------------------------------------------------------------------ voices

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

interface ToneOpts {
  wave?: OscillatorType;
  vol?: number;
  attack?: number;
  release?: number;
  slideTo?: number; // frequency at the end
  vibrato?: number; // cents
  dest?: AudioNode;
  detune?: number;
  filter?: number; // low-pass cutoff
}

function tone(t: number, freq: number, dur: number, o: ToneOpts = {}) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = o.wave ?? "square";
  osc.frequency.setValueAtTime(freq, t);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t + dur);
  if (o.detune) osc.detune.value = o.detune;
  const g = ctx.createGain();
  const vol = o.vol ?? 0.2;
  const a = o.attack ?? 0.005;
  const r = o.release ?? Math.min(0.12, dur * 0.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.setValueAtTime(vol, t + Math.max(a, dur - r));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let last: AudioNode = osc;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.filter;
    osc.connect(f);
    last = f;
  }
  last.connect(g);
  if (o.vibrato) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.value = o.vibrato;
    lfo.connect(lg).connect(osc.detune);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }
  g.connect(o.dest ?? sfxBus!);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

interface NoiseOpts {
  vol?: number;
  type?: BiquadFilterType;
  from?: number; // filter frequency at the start
  to?: number; // and at the end
  q?: number;
  attack?: number;
  dest?: AudioNode;
}

function hiss(t: number, dur: number, o: NoiseOpts = {}) {
  if (!ctx || !noise) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  f.frequency.setValueAtTime(o.from ?? 2000, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t + dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  const vol = o.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(o.dest ?? sfxBus!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

// ------------------------------------------------------------------ music

interface Song {
  bpm: number;
  key: number; // midi note of the key's root (bass octave)
  minor: boolean;
  prog: number[]; // chord roots as scale steps, one per bar
  lead: OscillatorType;
  bass: "pulse" | "eighths" | "walk" | "drone";
  kick: string; // 16 steps, x = hit
  snare: string;
  hat: string;
  arp?: boolean;
  seed: number;
  density: number; // 0..1, how busy the melody is
  leadVol?: number;
}

const SONGS: Record<SongId, Song> = {
  login: { bpm: 84, key: 45, minor: true, prog: [0, 5, 3, 4], lead: "triangle", bass: "drone", kick: "x...............", snare: "................", hat: "....x.......x...", arp: true, seed: 11, density: 0.35 },
  home: { bpm: 112, key: 48, minor: false, prog: [0, 4, 5, 3], lead: "square", bass: "eighths", kick: "x.......x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", arp: true, seed: 7, density: 0.55 },
  ring: { bpm: 142, key: 45, minor: true, prog: [0, 0, 5, 6], lead: "square", bass: "pulse", kick: "x..x..x.x..x..x.", snare: "....x.......x..x", hat: "xxxxxxxxxxxxxxxx", seed: 23, density: 0.7 },
  classic: { bpm: 128, key: 50, minor: true, prog: [0, 5, 2, 6], lead: "sawtooth", bass: "eighths", kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", arp: true, seed: 31, density: 0.6, leadVol: 0.07 },
  royale: { bpm: 134, key: 43, minor: true, prog: [0, 0, 3, 4], lead: "square", bass: "pulse", kick: "x.....x.x.......", snare: "....x.......x...", hat: "x.xxx.xxx.xxx.xx", seed: 47, density: 0.5 },
  world: { bpm: 96, key: 53, minor: false, prog: [0, 3, 4, 0], lead: "triangle", bass: "walk", kick: "x.......x.......", snare: "........x.......", hat: "x...x...x...x...", arp: true, seed: 5, density: 0.5 },
  dungeon: { bpm: 100, key: 40, minor: true, prog: [0, 1, 0, 4], lead: "triangle", bass: "drone", kick: "x.......x..x....", snare: "....x.......x...", hat: "..x...x...x...x.", seed: 61, density: 0.4 },
  tutorial: { bpm: 104, key: 52, minor: false, prog: [0, 3, 0, 4], lead: "triangle", bass: "eighths", kick: "x.......x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", seed: 3, density: 0.45 },
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

function seeded(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** A song's notes for 8 bars: the melody is a 2-bar idea, repeated, varied and answered (A A' B A). */
interface Score {
  lead: (number | null)[]; // midi per 16th step, null = rest, -1 = hold
  bass: (number | null)[];
  arp: (number | null)[];
}

function compose(song: Song): Score {
  const rand = seeded(song.seed);
  const scale = song.minor ? MINOR : MAJOR;
  const deg = (d: number, oct = 0) => {
    const o = Math.floor(d / 7);
    const i = ((d % 7) + 7) % 7;
    return song.key + scale[i] + 12 * (o + oct);
  };
  const bars = 8;
  const steps = bars * 16;
  const chordOf = (bar: number) => song.prog[bar % song.prog.length];
  const phrase = (variant: number) => {
    const out: (number | null)[] = [];
    let at = 4 + Math.floor(rand() * 3);
    for (let s = 0; s < 32; s++) {
      const strong = s % 4 === 0;
      if (s % 2 === 1 && rand() > song.density * 0.6) {
        out.push(-1);
        continue;
      }
      if (!strong && rand() > song.density) {
        out.push(rand() < 0.5 ? -1 : null);
        continue;
      }
      const step = Math.floor(rand() * 5) - 2;
      at = Math.max(2, Math.min(11, at + step + (variant && s > 24 ? variant : 0)));
      out.push(at);
    }
    return out;
  };
  const a = phrase(0);
  const a2 = a.map((v, i) => (i >= 24 && typeof v === "number" && v >= 0 ? v + 1 : v));
  const b = phrase(2);
  const melody = [...a, ...a2, ...b, ...a];
  const lead: (number | null)[] = [];
  const bass: (number | null)[] = [];
  const arp: (number | null)[] = [];
  for (let s = 0; s < steps; s++) {
    const bar = Math.floor(s / 16);
    const root = chordOf(bar);
    const m = melody[s];
    // Snap strong beats to a chord tone so the tune sits on the harmony.
    if (typeof m === "number" && m >= 0) {
      let d = m;
      if (s % 4 === 0) {
        const tones = [root, root + 2, root + 4, root + 7].map((x) => x);
        d = tones.reduce((best, t) => (Math.abs(t - m) < Math.abs(best - m) ? t : best), tones[0]);
      }
      lead.push(deg(d, 1));
    } else lead.push(m ?? null);
    const beat = s % 16;
    switch (song.bass) {
      case "pulse":
        bass.push(beat % 2 === 0 ? deg(root, beat === 14 ? 1 : 0) : null);
        break;
      case "eighths":
        bass.push(beat % 2 === 0 ? deg(root + (beat === 6 || beat === 14 ? 4 : 0)) : null);
        break;
      case "walk":
        bass.push(beat % 4 === 0 ? deg(root + [0, 2, 4, 5][beat / 4]) : null);
        break;
      default:
        bass.push(beat === 0 ? deg(root) : -1);
    }
    arp.push(song.arp && beat % 2 === 0 ? deg(root + [0, 2, 4, 7][(beat / 2) % 4], 1) : null);
  }
  return { lead, bass, arp };
}

let wanted: SongId | undefined;
let playing: SongId | undefined;
let songGain: GainNode | undefined;
let timer = 0;

/** Play this screen's song (no-op if it is already on). */
export function playMusic(id: SongId) {
  wanted = id;
  if (!ctx || playing === id) return;
  startSong(id);
}

export function stopMusic() {
  wanted = undefined;
  fadeOut();
}

function fadeOut() {
  clearInterval(timer);
  playing = undefined;
  if (ctx && songGain) {
    const g = songGain;
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
    setTimeout(() => {
      g.disconnect();
      if (track && trackGain === g && playing !== track.id) track.el.pause();
    }, 1500);
  }
  songGain = undefined;
}

/** Recorded songs (user's own tracks), played instead of the made-up ones. Relative paths so the solo page finds them too. */
const TRACKS: Partial<Record<SongId, string>> = { home: "soundtrack-home.mp3" };
/** Recorded songs sit lower than full scale next to the synth ones. */
const TRACK_LEVEL = 0.8;
let track: { el: HTMLAudioElement; src: MediaElementAudioSourceNode; id: SongId } | undefined;
let trackGain: GainNode | undefined;

function startTrack(id: SongId, url: string, gain: GainNode) {
  if (!ctx) return;
  if (!track || track.id !== id) {
    track?.el.pause();
    track?.src.disconnect();
    const el = new Audio(url);
    el.loop = true;
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    track = { el, src: ctx.createMediaElementSource(el), id };
  } else track.src.disconnect();
  const level = ctx.createGain();
  level.gain.value = TRACK_LEVEL;
  track.src.connect(level).connect(gain);
  trackGain = gain;
  if (track.el.paused) {
    track.el.currentTime = 0;
    void track.el.play().catch(() => undefined); // blocked until a tap: unlock() starts it again
  }
}

function startSong(id: SongId) {
  if (!ctx || !musicBus) return;
  fadeOut();
  playing = id;
  const song = SONGS[id];
  const score = compose(song);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2);
  gain.connect(musicBus);
  songGain = gain;
  const url = TRACKS[id];
  if (url) return startTrack(id, url, gain);
  const stepLen = 60 / song.bpm / 4;
  let step = 0;
  let next = ctx.currentTime + 0.1;
  const len = (line: (number | null)[], s: number) => {
    let n = 1;
    while (line[(s + n) % line.length] === -1 && n < 16) n++;
    return n * stepLen;
  };
  const tick = () => {
    if (!ctx || songGain !== gain) return;
    while (next < ctx.currentTime + 0.15) {
      const s = step % score.lead.length;
      const beat = s % 16;
      const l = score.lead[s];
      if (typeof l === "number" && l > 0) tone(next, hz(l), len(score.lead, s) * 0.95, { wave: song.lead, vol: song.leadVol ?? 0.1, vibrato: 8, dest: gain, filter: song.lead === "sawtooth" ? 2400 : undefined });
      const b = score.bass[s];
      if (typeof b === "number" && b > 0) tone(next, hz(b), Math.min(len(score.bass, s), song.bass === "drone" ? 16 * stepLen : 2 * stepLen) * 0.95, { wave: song.bass === "drone" ? "sawtooth" : "triangle", vol: song.bass === "drone" ? 0.07 : 0.2, dest: gain, filter: 900 });
      const a = score.arp[s];
      if (typeof a === "number" && a > 0) tone(next, hz(a + 12), stepLen * 0.8, { wave: "square", vol: 0.025, dest: gain, filter: 3000 });
      if (song.kick[beat] === "x") tone(next, 140, 0.18, { wave: "sine", vol: 0.5, slideTo: 40, dest: gain, release: 0.15 });
      if (song.snare[beat] === "x") hiss(next, 0.14, { vol: 0.16, type: "highpass", from: 1500, dest: gain });
      if (song.hat[beat] === "x") hiss(next, 0.04, { vol: beat % 4 === 0 ? 0.06 : 0.035, type: "highpass", from: 7000, dest: gain });
      next += stepLen;
      step++;
    }
  };
  tick();
  timer = window.setInterval(tick, 40);
}

/** A short tune when a match ends. */
export function playJingle(won: boolean) {
  if (!ctx || !sfxBus) return;
  const t = ctx.currentTime + 0.05;
  const notes = won ? [60, 64, 67, 72, 76, 79, 84] : [67, 63, 60, 55];
  notes.forEach((n, i) => tone(t + i * (won ? 0.09 : 0.18), hz(n), won && i === notes.length - 1 ? 0.6 : 0.2, { wave: "square", vol: 0.12, vibrato: won ? 10 : 20 }));
}

// ------------------------------------------------------------------ sound effects

/** A number from a hero's id, so each hero gets the same voice every time. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Family =
  | "slash" | "punch" | "shot" | "beam" | "boom" | "dash" | "heal" | "ice" | "fire" | "thunder" | "summon"
  | "time" | "buff" | "shield" | "dark" | "wind" | "magic" | "water" | "earth";

/** What a skill sounds like, from what it does and what it is called. */
function familyOf(skill: SkillDef): Family {
  // The skill's own name says it best; only when it says nothing, look at what the skill does.
  const byName = familyOfText(`${skill.name} ${skill.kind}`.toLowerCase());
  if (byName !== "magic") return byName;
  return familyOfText(skillText(skill));
}

function skillText(skill: SkillDef): string {
  // From the steps of a combo skill: its words (what each step does, its look) and a few telling settings.
  const words: string[] = [];
  const walk = (o: unknown) => {
    if (typeof o === "string") words.push(o);
    else if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object")
      for (const [k, x] of Object.entries(o)) {
        if (["heal", "regen", "armor", "invuln", "reflect", "fog"].includes(k)) words.push(k === "invuln" || k === "armor" || k === "reflect" ? "shield" : k === "fog" ? "shadow" : "heal");
        walk(x);
      }
  };
  walk(skill.steps);
  return `${skill.kind} ${skill.name} ${skill.desc ?? ""} ${words.join(" ")}`.toLowerCase();
}

function familyOfText(text: string): Family {
  const has = (...w: string[]) => w.some((x) => text.includes(x));
  if (has("heal", "regen", "revive", "medic", "totem", "snack")) return "heal";
  if (has("time stop", "rewind", "the world", "clock", "chrono", "time ")) return "time";
  if (has("summon", "pet", "clone", "decoy", "gladiator", "gunbot", "pawn", "queen")) return "summon";
  if (has("ice", "frost", "freeze", "snow", "blizzard", "glacier", "crystal")) return "ice";
  if (has("fire", "flame", "burn", "meteor", "ember", "lava", "blaze", "sun", "inferno")) return "fire";
  if (has("thunder", "lightning", "volt", "bolt", "spark", "electric", "shock")) return "thunder";
  if (has("water", "wave", "tide", "rain", "bubble", "aqua", "sea")) return "water";
  if (has("rock", "stone", "earth", "quake", "wall", "sand", "golem", "anvil")) return "earth";
  if (has("shadow", "dark", "void", "curse", "death", "soul", "blood", "abyss", "demon", "night")) return "dark";
  if (has("shield", "barrier", "parry", "armor", "armour", "guard", "harden")) return "shield";
  if (has("beam", "laser", "ray", "cannon", "kamehameha", "purple", "vision")) return "beam";
  if (has("blast", "smash", "bomb", "explo", "slam", "drop", "nuke", "crater")) return "boom";
  if (has("dash", "blink", "rush", "leap", "jump", "teleport", "warp", "charge", "step", "dive")) return "dash";
  if (has("wind", "storm", "tornado", "spin", "cyclone", "hurricane", "gust")) return "wind";
  if (has("buff", "rage", "focus", "power", "boost", "form", "mode", "transform", "sprint")) return "buff";
  if (has("slash", "blade", "sword", "cut", "katana", "cleave", "knife", "dagger", "scythe")) return "slash";
  if (has("punch", "kick", "fist", "jab", "palm", "strike")) return "punch";
  if (has("shot", "shoot", "gun", "arrow", "bullet", "missile", "shuriken", "kunai", "card")) return "shot";
  return "magic";
}

/** The sound itself: one family, in this hero's pitch (`p`, about 0.75 to 1.5) and tone colour (`w`). */
function voice(f: Family, t: number, p: number, w: OscillatorType, v: number) {
  switch (f) {
    case "slash":
      hiss(t, 0.16, { vol: 0.5 * v, from: 3500 * p, to: 700 * p, q: 2 });
      tone(t, 900 * p, 0.06, { wave: w, vol: 0.08 * v, slideTo: 400 * p });
      break;
    case "punch":
      tone(t, 170 * p, 0.14, { wave: "sine", vol: 0.6 * v, slideTo: 45 });
      hiss(t, 0.05, { vol: 0.35 * v, from: 1800 * p, type: "lowpass" });
      break;
    case "shot":
      tone(t, 1100 * p, 0.1, { wave: w, vol: 0.15 * v, slideTo: 260 * p });
      hiss(t, 0.04, { vol: 0.2 * v, from: 4000, type: "highpass" });
      break;
    case "beam":
      tone(t, 220 * p, 0.45, { wave: "sawtooth", vol: 0.14 * v, slideTo: 1500 * p, vibrato: 40, filter: 3500 });
      tone(t, 440 * p, 0.45, { wave: w, vol: 0.06 * v, slideTo: 3000 * p });
      break;
    case "boom":
      tone(t, 110 * p, 0.55, { wave: "sine", vol: 0.7 * v, slideTo: 30 });
      hiss(t, 0.6, { vol: 0.5 * v, type: "lowpass", from: 1600 * p, to: 120 });
      break;
    case "dash":
      hiss(t, 0.24, { vol: 0.4 * v, from: 600 * p, to: 4000 * p, q: 3, attack: 0.04 });
      tone(t, 300 * p, 0.12, { wave: w, vol: 0.05 * v, slideTo: 900 * p });
      break;
    case "heal":
      [0, 4, 7, 12].forEach((n, i) => tone(t + i * 0.07, 520 * p * 2 ** (n / 12), 0.25, { wave: "sine", vol: 0.12 * v }));
      hiss(t + 0.1, 0.3, { vol: 0.06 * v, type: "highpass", from: 8000 });
      break;
    case "ice":
      for (let i = 0; i < 5; i++) tone(t + i * 0.035, (1800 + Math.random() * 1600) * p, 0.12, { wave: "triangle", vol: 0.07 * v });
      hiss(t, 0.3, { vol: 0.15 * v, type: "highpass", from: 6000, to: 9000 });
      break;
    case "fire":
      hiss(t, 0.5, { vol: 0.45 * v, from: 900 * p, to: 300, q: 0.8, attack: 0.03 });
      for (let i = 0; i < 6; i++) hiss(t + Math.random() * 0.4, 0.03, { vol: 0.25 * v, type: "highpass", from: 3000 });
      tone(t, 90 * p, 0.4, { wave: "sawtooth", vol: 0.08 * v, slideTo: 60, filter: 500 });
      break;
    case "thunder":
      for (let i = 0; i < 6; i++) tone(t + i * 0.03, (300 + Math.random() * 1500) * p, 0.04, { wave: "square", vol: 0.08 * v });
      hiss(t, 0.35, { vol: 0.4 * v, from: 5000, to: 400, q: 0.7 });
      break;
    case "water":
      for (let i = 0; i < 4; i++) tone(t + i * 0.05, (500 + i * 180) * p, 0.08, { wave: "sine", vol: 0.12 * v, slideTo: (900 + i * 200) * p });
      hiss(t, 0.4, { vol: 0.25 * v, type: "lowpass", from: 1200, to: 400, attack: 0.05 });
      break;
    case "earth":
      tone(t, 70 * p, 0.5, { wave: "triangle", vol: 0.5 * v, slideTo: 40 });
      hiss(t, 0.45, { vol: 0.45 * v, type: "lowpass", from: 500, to: 100 });
      hiss(t + 0.05, 0.1, { vol: 0.2 * v, from: 1500 });
      break;
    case "dark":
      tone(t, 160 * p, 0.6, { wave: "sawtooth", vol: 0.12 * v, slideTo: 55, vibrato: 60, filter: 1200 });
      tone(t, 163 * p, 0.6, { wave: "sawtooth", vol: 0.08 * v, slideTo: 50, filter: 900 });
      hiss(t, 0.5, { vol: 0.15 * v, type: "lowpass", from: 700, to: 200, attack: 0.1 });
      break;
    case "shield":
      tone(t, 1300 * p, 0.35, { wave: "square", vol: 0.06 * v, filter: 5000 });
      tone(t, 1307 * p * 1.5, 0.35, { wave: "triangle", vol: 0.06 * v });
      tone(t, 260 * p, 0.2, { wave: "sine", vol: 0.25 * v, slideTo: 200 * p });
      break;
    case "time":
      tone(t, 1200 * p, 0.6, { wave: "triangle", vol: 0.1 * v, slideTo: 150 * p, attack: 0.3, vibrato: 30 });
      [0, 3, 6, 9].forEach((n, i) => tone(t + 0.35 + i * 0.06, 880 * p * 2 ** (-n / 12), 0.1, { wave: "square", vol: 0.04 * v }));
      break;
    case "summon":
      [0, 7, 12, 16].forEach((n) => tone(t, 330 * p * 2 ** (n / 12), 0.55, { wave: "sine", vol: 0.07 * v, attack: 0.15 }));
      tone(t + 0.15, 1320 * p, 0.4, { wave: "triangle", vol: 0.08 * v });
      break;
    case "buff":
      tone(t, 200 * p, 0.4, { wave: "sawtooth", vol: 0.1 * v, slideTo: 900 * p, filter: 2500 });
      [0, 5, 10].forEach((n, i) => tone(t + 0.15 + i * 0.06, 600 * p * 2 ** (n / 12), 0.1, { wave: w, vol: 0.06 * v }));
      break;
    case "wind":
      hiss(t, 0.5, { vol: 0.4 * v, from: 400 * p, to: 2500 * p, q: 4, attack: 0.1 });
      hiss(t + 0.15, 0.35, { vol: 0.3 * v, from: 2500 * p, to: 500 * p, q: 4 });
      break;
    default:
      [0, 7, 12].forEach((n, i) => tone(t + i * 0.05, 660 * p * 2 ** (n / 12), 0.18, { wave: w, vol: 0.08 * v, vibrato: 20 }));
      hiss(t, 0.25, { vol: 0.1 * v, type: "highpass", from: 5000 });
  }
}

const WAVES: OscillatorType[] = ["square", "triangle", "sawtooth", "sine"];
const SIGNATURE = [3, 4, 5, 7, -5, -3, 12, 9];

/** How loud a sound is by how far from the camera it happened (0 when well off screen). */
export type Near = number;

/** A hero used a skill: its family's sound in the hero's own voice, then the hero's two-note signature. */
export function skillSound(heroId: string, slot: 1 | 2, near: Near = 1) {
  if (!ctx || near <= 0.02) return;
  const hero = heroOf(heroId);
  const skill = slot === 1 ? hero.skill : hero.skill2;
  if (!skill || skill.kind === "passive") return;
  const h = hash(`${heroId}:${slot}`);
  const p = 0.75 + ((h % 1000) / 1000) * 0.75;
  const w = WAVES[(h >>> 10) % WAVES.length];
  const t = ctx.currentTime + 0.01;
  voice(familyOf(skill), t, p, w, near);
  // The signature: two quick notes only this hero (and this skill) plays.
  const base = 72 + ((h >>> 14) % 12);
  const step = SIGNATURE[(h >>> 18) % SIGNATURE.length] * (slot === 2 ? -1 : 1);
  tone(t + 0.02, hz(base), 0.07, { wave: w, vol: 0.05 * near });
  tone(t + 0.09, hz(base + step), 0.09, { wave: w, vol: 0.05 * near });
}

/** A basic attack: by weapon type, pitched by hero. */
export function attackSound(heroId: string, near: Near = 1) {
  if (!ctx || near <= 0.02) return;
  const hero = HEROES[heroId as HeroId] ?? heroOf(heroId);
  const p = 0.8 + ((hash(heroId) % 1000) / 1000) * 0.5;
  const t = ctx.currentTime + 0.005;
  const v = near * 0.55;
  const a = String(hero.attack);
  if (a === "sword") voice("slash", t, p, "square", v);
  else if (a === "punch") voice("punch", t, p, "square", v);
  else if (a === "lightning") voice("thunder", t, p, "square", v * 0.6);
  else tone(t, 1000 * p, 0.07, { wave: WAVES[hash(heroId) % 4], vol: 0.07 * v, slideTo: 380 * p });
}

export function dashSound(near: Near = 1) {
  if (!ctx || near <= 0.02) return;
  hiss(ctx.currentTime, 0.18, { vol: 0.25 * near, from: 800, to: 3500, q: 2, attack: 0.03 });
}

let lastHurt = 0;
export function hurtSound(mine: boolean, near: Near = 1) {
  if (!ctx || near <= 0.02) return;
  const now = ctx.currentTime;
  if (now - lastHurt < 0.06) return;
  lastHurt = now;
  tone(now, mine ? 220 : 320, 0.09, { wave: "square", vol: (mine ? 0.12 : 0.05) * near, slideTo: mine ? 110 : 200 });
  hiss(now, 0.05, { vol: (mine ? 0.2 : 0.08) * near, type: "lowpass", from: 2000 });
}

export function koSound(near: Near = 1) {
  if (!ctx || near <= 0.02) return;
  const t = ctx.currentTime;
  tone(t, 600, 0.5, { wave: "square", vol: 0.12 * near, slideTo: 80, vibrato: 50 });
  hiss(t, 0.4, { vol: 0.3 * near, type: "lowpass", from: 2500, to: 200 });
}

export function uiClick() {
  if (!ctx || ctx.state !== "running") return;
  tone(ctx.currentTime, 880, 0.05, { wave: "square", vol: 0.05, slideTo: 1320 });
}

/** For checking: which sound family each skill falls in. */
export const _familyOf = familyOf;
