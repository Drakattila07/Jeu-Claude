import { PALETTE } from "../data/palette";
import type { Player } from "./Player";
import { Entity } from "./Entity";

interface SeedProjectile { x: number; y: number; vx: number; vy: number; active: boolean }

export class MotherTreeBoss extends Entity {
  maxHearts = 18;
  hearts = 18;
  flashFrames = 0;
  private frame = 0;
  readonly seeds: SeedProjectile[] = [];

  constructor(private readonly target: Player) {
    super({ x: 96, y: 48 }, { x: 8, y: 18, width: 48, height: 56 });
    this.depth = 20;
  }

  get phase(): 1 | 2 | 3 {
    if (this.hearts > 12) return 1;
    if (this.hearts > 6) return 2;
    return 3;
  }

  get bounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.position.x + 8, y: this.position.y + 18, width: 48, height: 56 };
  }

  update(): void {
    if (!this.active) return;
    this.frame += 1;
    if (this.flashFrames > 0) this.flashFrames -= 1;
    if (this.phase === 1) this.position.x = 96 + Math.round(Math.sin(this.frame / 40) * 18);
    if (this.phase >= 2 && this.frame % (this.phase === 2 ? 72 : 45) === 0) {
      const dx = this.target.position.x - (this.position.x + 32);
      const dy = this.target.position.y - (this.position.y + 40);
      const length = Math.max(1, Math.hypot(dx, dy));
      this.seeds.push({
        x: this.position.x + 32, y: this.position.y + 40,
        vx: (dx / length) * 1.4, vy: (dy / length) * 1.4, active: true,
      });
    }
    for (const seed of this.seeds) {
      seed.x += seed.vx;
      seed.y += seed.vy;
      if (seed.x < 0 || seed.x > 256 || seed.y < 0 || seed.y > 224) seed.active = false;
    }
  }

  hit(): boolean {
    if (!this.active || this.flashFrames > 0) return false;
    this.hearts -= 1;
    this.flashFrames = 4;
    if (this.hearts <= 0) this.active = false;
    return !this.active;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    ctx.save();
    ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.woodDark;
    ctx.fillRect(x + 24, y + 26, 18, 48);
    ctx.fillRect(x + 10, y + 50, 18, 8);
    ctx.fillRect(x + 38, y + 42, 18, 8);
    ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.leafDark;
    ctx.fillRect(x + 5, y + 7, 54, 31);
    ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.leaf;
    ctx.fillRect(x + 12, y, 40, 28);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(x + 25, y + 30, 3, 3);
    ctx.fillRect(x + 39, y + 30, 3, 3);
    if (this.phase === 3) {
      ctx.fillStyle = PALETTE.purple;
      ctx.fillRect(x, y + 58, 64, 5);
      ctx.fillRect(x + 5, y + 68, 54, 4);
    }
    ctx.fillStyle = PALETTE.yellow;
    for (const seed of this.seeds) if (seed.active) ctx.fillRect(Math.round(seed.x), Math.round(seed.y), 3, 3);
    ctx.restore();
  }
}
