import { accountData, currentAccount, saveAccountData } from "./account";

/** The story so far: beating the Ancient Knight (Open World dungeon) opens Cthulhu's Sunken Temple. */
const KEY = "uv-knight-beaten";

export function cthulhuUnlocked(): boolean {
  if (currentAccount() && accountData().knight) return true;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Marks the Ancient Knight beaten; true the first time (so Chapter II plays once). */
export function beatKnight(): boolean {
  const first = !cthulhuUnlocked();
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // private window: the account still keeps it
  }
  if (currentAccount()) saveAccountData({ knight: true });
  return first;
}

/** Cthulhu beaten (Sunken Temple); true the first time (so Chapter III plays once). */
const CTHULHU_KEY = "uv-cthulhu-beaten";
export function beatCthulhu(): boolean {
  let first = !(currentAccount() && accountData().cthulhu);
  try {
    if (localStorage.getItem(CTHULHU_KEY) === "1") first = false;
    localStorage.setItem(CTHULHU_KEY, "1");
  } catch {
    // private window: the account still keeps it
  }
  if (currentAccount()) saveAccountData({ cthulhu: true });
  return first;
}
