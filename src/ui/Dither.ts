import { PALETTE } from "../data/palette";

const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;
export function dither(x: number, y: number, ratio: number): boolean {
  return BAYER_4[(y & 3) * 4 + (x & 3)]! < ratio * 16;
}
export function ombrePortee(ctx: CanvasRenderingContext2D, x: number, y: number, largeur: number, offY: number = 14): void {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(Math.round(x - largeur / 2), Math.round(y + offY), largeur, 3);
  ctx.restore();
}
export function melange(ctx: CanvasRenderingContext2D, sombre: string, clair: string, ratio: number, x: number, y: number, w: number, h: number): void {
  if (ratio <= 0) { ctx.fillStyle = sombre; ctx.fillRect(x, y, w, h); return; }
  if (ratio >= 1) { ctx.fillStyle = clair; ctx.fillRect(x, y, w, h); return; }
  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) {
      ctx.fillStyle = dither(x + px, y + py, ratio) ? clair : sombre;
      ctx.fillRect(x + px, y + py, 1, 1);
    }
  }
}
