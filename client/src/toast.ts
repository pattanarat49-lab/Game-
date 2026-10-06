// A short message at the top of the screen, over the game or the menu.

let el: HTMLDivElement | undefined;
let timer = 0;

export function toast(text: string, ms = 3200) {
  if (!el) {
    el = document.createElement("div");
    el.style.cssText =
      "position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:60;background:rgba(10,6,14,0.92);color:#ffd23f;" +
      "border:2px solid #ffd23f;border-radius:4px;padding:9px 14px;font:10px 'Press Start 2P',monospace;pointer-events:none;" +
      "text-align:center;max-width:90vw;transition:opacity .3s";
    document.body.append(el);
  }
  el.textContent = text;
  el.style.opacity = "1";
  clearTimeout(timer);
  timer = window.setTimeout(() => el && (el.style.opacity = "0"), ms);
}
