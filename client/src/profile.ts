// Hero mastery and titles (user request 2026-10-07). Every match adds mastery points to the hero played;
// titles are earned by how the player plays (hidden conditions) and by the heroes they play most. A title
// can be worn: it shows over the hero on the home screen and in the Open World. Kept on the account when
// signed in, otherwise on this device.

import { HERO_CLASSES, HEROES, HeroId, heroClass, masteryLevel, masteryPoints } from "../../shared/game";
import { accountData, currentAccount, saveAccountData } from "./account";
import { toast } from "./toast";

export interface Profile {
  mastery: Record<string, number>; // hero id -> points
  titles: string[]; // earned, oldest first
  earned: string[]; // which title conditions are done (ids)
  title: string; // the one worn ("" = none)
  games: number;
  wins: number;
  losses: number;
  streak: number; // wins in a row
  mvps: number;
  classGames: Record<string, number>; // games per hero class
}

/** What one finished match adds to the profile. */
export interface MatchSummary {
  hero: string;
  won: boolean;
  rating: number;
  mvp: boolean;
  kos: number;
  assists: number;
  falls: number;
  dealt: number;
  taken: number;
  stand: boolean; // ended it in FINAL STAND
}

const KEY = "uv-profile";

function blank(): Profile {
  return { mastery: {}, titles: [], earned: [], title: "", games: 0, wins: 0, losses: 0, streak: 0, mvps: 0, classGames: {} };
}

function clean(p: Partial<Profile> | undefined): Profile {
  const b = blank();
  if (!p || typeof p !== "object") return b;
  return {
    mastery: p.mastery && typeof p.mastery === "object" ? p.mastery : {},
    titles: Array.isArray(p.titles) ? p.titles.filter((t) => typeof t === "string") : [],
    earned: Array.isArray(p.earned) ? p.earned : [],
    title: typeof p.title === "string" ? p.title : "",
    games: p.games ?? 0,
    wins: p.wins ?? 0,
    losses: p.losses ?? 0,
    streak: p.streak ?? 0,
    mvps: p.mvps ?? 0,
    classGames: p.classGames && typeof p.classGames === "object" ? p.classGames : {},
  };
}

export function loadProfile(): Profile {
  if (currentAccount()) return clean(accountData().profile as Partial<Profile>);
  try {
    return clean(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return blank();
  }
}

function saveProfile(p: Profile) {
  if (currentAccount()) return saveAccountData({ profile: p });
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage off: kept until the page closes only
  }
}

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

export function heroMastery(hero: string): { level: number; points: number; next: number; prev: number } {
  const points = loadProfile().mastery[hero] ?? 0;
  const level = masteryLevel(points);
  const steps = [0, 1, 60, 160, 320, 560, 900, 1400, 2100, 3000, 4200];
  return { level, points, prev: steps[level] ?? 0, next: steps[level + 1] ?? steps[steps.length - 1] };
}

/** Mastery badge colour by level: bronze, silver, gold, then the top rank. */
export function masteryColor(level: number): string {
  return level >= 10 ? "#ff6ad8" : level >= 7 ? "#ffd23f" : level >= 4 ? "#cfd8e8" : level >= 1 ? "#d8925a" : "#6a7090";
}

export function wornTitle(): string {
  return loadProfile().title;
}

export function wearTitle(title: string) {
  const p = loadProfile();
  p.title = p.titles.includes(title) ? title : "";
  saveProfile(p);
}

/**
 * Title conditions. Nobody is told how to earn them: a toast simply says a new title was earned.
 * Each one has a few wordings and one is picked at random when it is earned.
 */
const RULES: { id: string; names: string[]; done: (m: MatchSummary, p: Profile) => boolean }[] = [
  { id: "firstwin", names: ["Rookie of the Rift", "Fresh Blood", "New Challenger"], done: (m) => m.won },
  { id: "5kos", names: ["Executioner", "Headhunter", "Rift Reaper"], done: (m) => m.kos >= 5 },
  { id: "5assists", names: ["Guardian Angel", "Team Player", "The Helping Hand"], done: (m) => m.assists >= 5 },
  { id: "flawless", names: ["Untouchable", "Flawless", "Ghost Step"], done: (m) => m.won && m.falls === 0 && m.kos >= 2 },
  { id: "clutch", names: ["Last One Standing", "Lone Wolf", "Clutch King"], done: (m) => m.won && m.stand },
  { id: "3mvp", names: ["Star Player", "Crowd Favourite", "Rift Idol"], done: (_m, p) => p.mvps >= 3 },
  { id: "perfect", names: ["Perfect Ten", "Living Legend"], done: (m) => m.rating >= 10 },
  { id: "4kdmg", names: ["Berserker", "Walking Disaster", "Damage Dealer"], done: (m) => m.dealt >= 4000 },
  { id: "wall", names: ["Iron Wall", "Unbreakable", "The Shield"], done: (m) => m.won && m.taken >= 4000 },
  { id: "streak5", names: ["Unstoppable", "On Fire", "Rampage"], done: (_m, p) => p.streak >= 5 },
  { id: "50games", names: ["Veteran", "Rift Walker", "Old Soldier"], done: (_m, p) => p.games >= 50 },
  { id: "10losses", names: ["Never Give Up", "Stubborn Spirit", "Iron Will"], done: (_m, p) => p.losses >= 10 },
];

const HERO_TITLES: [number, string[]][] = [
  [3, ["Apprentice", "Disciple", "Student"]],
  [6, ["Master", "Expert", "Veteran"]],
  [10, ["Legend", "Grandmaster", "Avatar"]],
];

const CLASS_TITLES = ["Soul of the", "Heart of the", "Born"];

/** A match ended: mastery for the hero played, the play-style record, and any new titles. */
export function recordMatch(m: MatchSummary) {
  const p = loadProfile();
  const before = masteryLevel(p.mastery[m.hero] ?? 0);
  p.mastery[m.hero] = (p.mastery[m.hero] ?? 0) + masteryPoints(m.rating, m.won);
  const after = masteryLevel(p.mastery[m.hero]);
  p.games++;
  if (m.won) [p.wins, p.streak] = [p.wins + 1, p.streak + 1];
  else [p.losses, p.streak] = [p.losses + 1, 0];
  if (m.mvp) p.mvps++;
  const cls = heroClass(m.hero as HeroId);
  if (cls) p.classGames[cls] = (p.classGames[cls] ?? 0) + 1;

  const fresh: string[] = [];
  const earn = (id: string, title: string) => {
    if (p.earned.includes(id)) return;
    p.earned.push(id);
    p.titles.push(title);
    fresh.push(title);
  };
  for (const r of RULES) if (r.done(m, p)) earn(r.id, pick(r.names));
  // The heroes the player keeps coming back to.
  const name = HEROES[m.hero as HeroId]?.name;
  for (const [lv, words] of HERO_TITLES) if (name && after >= lv) earn(`hero:${m.hero}:${lv}`, `${name} ${pick(words)}`);
  // The class they play most, once they have played enough.
  if (p.games >= 20) {
    const top = Object.entries(p.classGames).sort((a, b) => b[1] - a[1])[0];
    const c = top && HERO_CLASSES.find((x) => x.id === top[0]);
    if (c) {
      const word = pick(CLASS_TITLES);
      earn(`class:${c.id}`, word === "Born" ? `Born ${c.name}` : `${word} ${c.name}`);
    }
  }
  saveProfile(p);
  if (after > before) setTimeout(() => toast(`${name ?? "Hero"} MASTERY Lv.${after}!`), 600);
  fresh.forEach((t, i) => setTimeout(() => toast(`NEW TITLE: ${t}`), 1800 + i * 1600));
}
