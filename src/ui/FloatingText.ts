import { PALETTE } from "../data/palette";
import { drawText } from "./Font";

interface Floater {
  x: number; y: number; vy: number; life: number; maxLife: number;
  text: string; color: string; scale: number;
}

/**
 * Chiffres de dégâts et gains qui montent depuis le point d'impact. Sans eux,
 * un coup porté ne produit aucun retour : on ne sait ni s'il a touché, ni ce
 * qu'il a coûté.
 */
export class FloatingText {
  private readonly items: Floater[] = [];

  push(x: number, y: number, text: string, color: string = PALETTE.cream, big = false): void {
    this.items.push({
      x, y, vy: big ? -1.1 : -0.8, life: big ? 56 : 42,
      maxLife: big ? 56 : 42, text, color, scale: big ? 1 : 0,
    });
    if (this.items.length > 24) this.items.shift();
  }

  damage(x: number, y: number, amount: number, critical = false): void {
    this.push(x, y, critical ? `${amount} !` : `${amount}`,
      critical ? PALETTE.yellow : PALETTE.white, critical);
  }

  reward(x: number, y: number, text: string): void {
    this.push(x, y, text, PALETTE.leafLight);
  }

  update(): void {
    for (const item of this.items) {
      item.y += item.vy;
      item.vy *= 0.93;
      item.life -= 1;
    }
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      if (this.items[index]!.life <= 0) this.items.splice(index, 1);
    }
  }

  clear(): void { this.items.length = 0; }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const item of this.items) {
      const ratio = item.life / item.maxLife;
      ctx.globalAlpha = Math.min(1, ratio * 2.2);
      drawText(ctx, item.text, Math.round(item.x), Math.round(item.y), {
        color: item.color, align: "center", outline: "rgba(10,8,16,0.85)", shadow: null,
      });
    }
    ctx.restore();
  }
}
