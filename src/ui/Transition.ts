import { PALETTE } from "../data/palette";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/Renderer";

export class Transition {
  private frame = 0;
  private callback: (() => void) | null = null;
  active = false;

  start(onMidpoint: () => void): void {
    if (this.active) return;
    this.active = true;
    this.frame = 0;
    this.callback = onMidpoint;
  }

  update(): void {
    if (!this.active) return;
    this.frame += 1;
    if (this.frame === 8) {
      this.callback?.();
      this.callback = null;
    }
    if (this.frame >= 16) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const alpha = this.frame <= 8 ? this.frame / 8 : (16 - this.frame) / 8;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.restore();
  }
}
