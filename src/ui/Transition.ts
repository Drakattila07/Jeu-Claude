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
    const progress = this.frame <= 8 ? this.frame / 8 : (16 - this.frame) / 8;
    const width = (VIEW_WIDTH / 2) * progress;

    ctx.save();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, width, VIEW_HEIGHT);
    ctx.fillRect(VIEW_WIDTH - width, 0, width, VIEW_HEIGHT);
    ctx.restore();
  }
}
