import { PALETTE } from "../data/palette";
import { dither } from "./Dither";

/**
 * Dessine un cadre à 9 tranches (nine-slice) pour les boîtes de dialogue et menus.
 * Ajoute un relief et une texture tramée pour un rendu visuellement plus riche
 * qu'un simple rectangle.
 */
export function drawNineSlice(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  style: "dark" | "light" = "dark"
): void {
  const bg = style === "dark" ? PALETTE.ink : PALETTE.cream;
  const border = style === "dark" ? PALETTE.stoneDark : PALETTE.woodDark;
  const highlight = style === "dark" ? PALETTE.stone : PALETTE.wood;

  // Background
  ctx.fillStyle = bg;
  ctx.globalAlpha = style === "dark" ? 0.9 : 1;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.globalAlpha = 1;

  // Texture tramée sur le fond
  ctx.fillStyle = style === "dark" ? PALETTE.night : PALETTE.white;
  for (let dy = 2; dy < h - 2; dy++) {
    for (let dx = 2; dx < w - 2; dx++) {
      if (dither(x + dx, y + dy, 0.15)) {
        ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  }

  // Corners
  ctx.fillStyle = highlight;
  ctx.fillRect(x, y, 3, 1);
  ctx.fillRect(x, y + 1, 1, 2);
  ctx.fillRect(x + w - 3, y, 3, 1);
  ctx.fillRect(x + w - 1, y + 1, 1, 2);
  ctx.fillRect(x, y + h - 1, 3, 1);
  ctx.fillRect(x, y + h - 3, 1, 2);
  ctx.fillRect(x + w - 3, y + h - 1, 3, 1);
  ctx.fillRect(x + w - 1, y + h - 3, 1, 2);

  // Borders
  ctx.fillStyle = border;
  ctx.fillRect(x + 3, y, w - 6, 1);
  ctx.fillRect(x + 3, y + h - 1, w - 6, 1);
  ctx.fillRect(x, y + 3, 1, h - 6);
  ctx.fillRect(x + w - 1, y + 3, 1, h - 6);
}
