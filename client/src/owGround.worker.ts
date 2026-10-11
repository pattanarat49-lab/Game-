// Paints squares of the new Open World's ground off the main thread (owGround.ts), so walking into new
// ground never makes the game stutter.
import { owPixels } from "./owGround";

self.onmessage = (e: MessageEvent<{ cx: number; cy: number }>) => {
  const { cx, cy } = e.data;
  const px = owPixels(cx, cy);
  (self as unknown as Worker).postMessage({ cx, cy, px }, [px.buffer]);
};
