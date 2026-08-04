import { PALETTE } from "../data/palette";
import type { Vec2 } from "./Entity";

export class LanternCat {
  readonly position: Vec2;
  private frame = 0;

  constructor(private readonly anchor: Readonly<Vec2>) {
    this.position = { ...anchor };
  }

  update(): void {
    this.frame += 1;
    this.position.x = this.anchor.x + Math.sin(this.frame / 38) * 22;
    this.position.y = this.anchor.y + Math.cos(this.frame / 27) * 9;
  }

  distanceTo(position: Readonly<Vec2>): number {
    return Math.hypot(this.position.x - position.x, this.position.y - position.y);
  }

  blessingMessage(alreadyBlessed: boolean): string {
    return alreadyBlessed
      ? "Le Chat-Lanterne ronronne. Sa flamme rend tous vos cœurs."
      : "Le Chat-Lanterne vous choisit. Sa bénédiction restaure tous vos cœurs.";
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const bob = Math.floor(this.frame / 10) % 2;
    const sway = Math.floor(this.frame / 15) % 3;

    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(x - 9, y - 8, 34, 30);
    ctx.globalAlpha = 0.24;
    ctx.fillRect(x - 4, y - 4, 24, 22);
    ctx.globalAlpha = 1;

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 3, y + 3 - bob, 14, 12);
    ctx.fillRect(x + 5, y - 1 - bob, 10, 8);
    ctx.fillRect(x + 5, y - 4 - bob, 4, 5);
    ctx.fillRect(x + 12, y - 4 - bob, 4, 5);
    ctx.fillRect(x - 1 - sway, y + 7 - bob, 7, 4);
    ctx.fillRect(x - 3 - sway, y + 4 - bob, 4, 5);

    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(x + 5, y + 4 - bob, 10, 9);
    ctx.fillRect(x + 7, y - bob, 7, 6);
    ctx.fillRect(x + 7, y - 2 - bob, 2, 3);
    ctx.fillRect(x + 13, y - 2 - bob, 2, 3);
    ctx.fillRect(x + 1 - sway, y + 7 - bob, 5, 2);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 8, y + 1 - bob, 2, 2);
    ctx.fillRect(x + 12, y + 1 - bob, 2, 2);
    ctx.fillStyle = PALETTE.purple;
    ctx.fillRect(x + 9, y + 8 - bob, 4, 4);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(x + 9, y + 8 - bob, 2, 2);

    ctx.fillStyle = PALETTE.rose;
    ctx.fillRect(x + 8 + sway * 3, y - 9 - bob, 3, 4);
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(x + 9 + sway * 2, y - 11 - bob, 2, 4);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 9 + sway * 2, y - 10 - bob, 1, 2);
    ctx.restore();
  }
}
