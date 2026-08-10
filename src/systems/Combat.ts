import { PALETTE } from "../data/palette";
import { dither } from "../ui/Dither";
import type { Rect } from "../entities/Entity";

export function overlaps(a: Readonly<Rect>, b: Readonly<Rect>): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Retour de coup.
 *
 * Le gel d'image durait trois frames quelle que soit la puissance du coup :
 * tout se ressentait pareil. La durée suit maintenant le poids de l'impact, et
 * la caméra tremble avec lui.
 */
export class Combat {
  hitstopFrames = 0;
  shakeFrames = 0;
  shakeStrength = 0;
  criticalFlashFrames = 0;
  private readonly hitThisSwing = new Set<string>();

  get frozen(): boolean { return this.hitstopFrames > 0; }

  update(): void {
    if (this.hitstopFrames > 0) this.hitstopFrames -= 1;
    if (this.shakeFrames > 0) {
      this.shakeFrames -= 1;
      if (this.shakeFrames === 0) this.shakeStrength = 0;
    }
    if (this.criticalFlashFrames > 0) this.criticalFlashFrames -= 1;
  }

  beginSwing(): void { this.hitThisSwing.clear(); }

  /** Enregistre un coup, une seule fois par cible et par coup d'épée. */
  confirmHit(targetId: string, heavy = false): boolean {
    if (this.hitThisSwing.has(targetId)) return false;
    this.hitThisSwing.add(targetId);
    this.hitstopFrames = Math.max(this.hitstopFrames, heavy ? 7 : 3);
    if (heavy) this.impact(3, 8);
    return true;
  }

  /** Secousse libre, pour les explosions et les chutes de décor. */
  impact(strength: number, frames: number): void {
    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeFrames = Math.max(this.shakeFrames, frames);
  }

  freeze(frames: number): void {
    this.hitstopFrames = Math.max(this.hitstopFrames, frames);
  }

  shakeOffset(frame: number): { x: number; y: number } {
    if (this.shakeFrames <= 0) return { x: 0, y: 0 };
    const decay = this.shakeStrength * (this.shakeFrames / 10);
    return {
      x: Math.round(Math.sin(frame * 2.1) * decay),
      y: Math.round(Math.cos(frame * 2.9) * decay * 0.6),
    };
  }

  drawFlash(ctx: CanvasRenderingContext2D): void {
    if (this.criticalFlashFrames <= 0) return;
    ctx.save();
    ctx.fillStyle = PALETTE.white; // PALETTE.white
    const ratio = this.criticalFlashFrames / 8;
    for (let y = 0; y < 216; y+=2) {
      for (let x = 0; x < 384; x+=2) {
        if (dither(x, y, ratio * 0.5)) ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.restore();
  }
}
