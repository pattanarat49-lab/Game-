import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const [from, to, out] = [+process.argv[2], +process.argv[3], process.argv[4]];
const b = await chromium.launch({ args: ["--use-gl=swiftshader","--enable-webgl"] }); const p = await b.newPage({ viewport: { width: 1400, height: 860 } });
p.on("pageerror", e => console.log("ERR", e.message));
await p.goto("http://127.0.0.1:5300/Riftborn%20Intro.dc.html"); await p.waitForTimeout(9000);
const el = await p.$("[data-om-exportable-video-with-duration-secs]");
for (let f = from; f < to; f++) {
  await p.evaluate(t => { document.querySelector("[data-om-exportable-video-with-duration-secs]").dispatchEvent(new CustomEvent("data-om-seek-to-time-frame", { detail: { time: t, sync: true } })); }, f / 30);
  await el.screenshot({ path: `${out}/f${String(f).padStart(4, "0")}.png` });
}
await b.close();
