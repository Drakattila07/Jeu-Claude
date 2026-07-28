import { PALETTE } from "../data/palette";
import type { Direction } from "./Player";

export class Fireball {
  active = true;
  life = 96;
  readonly position: { x: number; y: number };
  private readonly velocity: Readonly<{ x: number; y: number }>;

  constructor(origin: Readonly<{ x: number; y: number }>, direction: Direction) {
    this.position = { x: origin.x + 8, y: origin.y + 8 };
    const vector = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    }[direction];
    this.velocity = { x: vector.x * 3.1, y: vector.y * 3.1 };
  }

  get bounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.position.x - 4, y: this.position.y - 4, width: 8, height: 8 };
  }

  update(): void {
    if (!this.active) return;
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.life -= 1;
    if (this.life <= 0 || this.position.x < 0 || this.position.x > 256
      || this.position.y < 22 || this.position.y > 224) this.active = false;
  }

  destroy(): void { this.active = false; }

  draw(ctx: CanvasRenderingContext2D, frame: number): void {
    if (!this.active) return;
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const pulse = Math.floor(frame / 4) % 2;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(x - 7, y - 7, 14, 14);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(x - 5, y - 4, 10, 8);
    ctx.fillRect(x - 3, y - 6, 6, 12);
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(x - 3 + pulse, y - 3, 6 - pulse * 2, 6);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x - 1, y - 2, 3, 4);
    ctx.restore();
  }
}
