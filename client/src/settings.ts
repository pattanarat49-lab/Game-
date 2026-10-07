// Player settings kept on this device (localStorage), set from the SETTING button on the home screen.

/** How the touch attack button works: "default" = tap/hold the sword and it aims at the closest foe by itself;
 * "advance" = the sword is a joystick you drag to aim. */
export type AttackMode = "default" | "advance";

const KEY = "uv-attack-mode";

export function attackMode(): AttackMode {
  try {
    return localStorage.getItem(KEY) === "advance" ? "advance" : "default";
  } catch {
    return "default";
  }
}

export function setAttackMode(mode: AttackMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // private mode: the choice lasts until the page closes
  }
}
