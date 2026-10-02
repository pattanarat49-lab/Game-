// Turns the built game into ONE self-contained HTML file (dist-solo/riftborn.html),
// so solo mode can be shared or opened without any server.
import { readFileSync, readdirSync, writeFileSync } from "fs";

const dir = "dist-solo";
let html = readFileSync(`${dir}/index.html`, "utf8");
html = html.replace(/<link rel="(manifest|apple-touch-icon)"[^>]*>\s*/g, "");
html = html.replace(/<script type="module" crossorigin src="\/assets\/([^"]+)"><\/script>/, (_m, file) => {
  const js = readFileSync(`${dir}/assets/${file}`, "utf8").replace(/<\/script/gi, "<\\/script");
  return `<script type="module">${js}</script>`;
});
if (/src="\/assets\//.test(html)) throw new Error("A script was not inlined");
writeFileSync(`${dir}/riftborn.html`, html);
console.log(`Wrote ${dir}/riftborn.html (${(html.length / 1024).toFixed(0)} KB) from`, readdirSync(`${dir}/assets`).join(", "));
