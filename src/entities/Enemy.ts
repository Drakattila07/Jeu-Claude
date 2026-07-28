import { PALETTE } from "../data/palette";
import { ENEMY_TYPES, type EnemySpawn } from "../data/enemies";
import type { Player } from "./Player";
import { Entity } from "./Entity";

export class Enemy extends Entity {
  readonly definition;
  hearts: number;
  aiFrame = 0;
  flashFrames = 0;
  knockbackFrames = 0;
  private knockback = { x: 0, y: 0 };

  constructor(readonly spawn: EnemySpawn, private readonly target: Player) {
    super({ x: spawn.x, y: spawn.y }, { x: 2, y: 4, width: 12, height: 11 });
    this.definition = ENEMY_TYPES[spawn.type];
    this.hearts = this.definition.hearts;
    this.depth = 9;
  }

  get bounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.position.x + 2, y: this.position.y + 4, width: 12, height: 11 };
  }

  update(): void {
    if (!this.active) return;
    this.aiFrame += 1;
    if (this.flashFrames > 0) this.flashFrames -= 1;
    if (this.knockbackFrames > 0) {
      const factor = this.knockbackFrames / 6;
      this.position.x += this.knockback.x * factor;
      this.position.y += this.knockback.y * factor;
      this.knockbackFrames -= 1;
      return;
    }
    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const near = distance <= (this.definition.behavior === "wake" ? 36
      : this.definition.behavior === "hunt" ? 96 : 56);
    const pulse = this.definition.behavior === "leap" ? this.aiFrame % 90 >= 72
      : this.definition.behavior === "hop" ? this.aiFrame % 60 >= 48
      : this.definition.behavior === "dive" ? near
      : near;
    if (pulse) {
      this.position.x += (dx / distance) * this.definition.speed;
      this.position.y += (dy / distance) * this.definition.speed;
    } else if (this.definition.behavior === "leap") {
      this.position.x += Math.sin(this.aiFrame / 24) * 0.2;
    }
  }

  hit(damage: number, from: Readonly<{ x: number; y: number }>): boolean {
    if (!this.active) return false;
    this.hearts -= damage;
    this.flashFrames = 4;
    const dx = this.position.x - from.x;
    const dy = this.position.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.knockback = { x: (dx / length) * 3, y: (dy / length) * 3 };
    this.knockbackFrames = 6;
    if (this.hearts <= 0) this.active = false;
    return !this.active;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y + (this.aiFrame % 60 > 50 ? -2 : 0));
    ctx.save();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 3, y + 13, 10, 2);
    ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE[this.definition.color];
    if (this.spawn.type === "castle_guard") {
      const stride = Math.floor(this.aiFrame / 8) % 2;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 3, y + 2, 11, 13);
      ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.stoneDark;
      ctx.fillRect(x + 4, y + 3, 9, 5);
      ctx.fillStyle = PALETTE.roof;
      ctx.fillRect(x + 4, y + 8, 9, 6);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(x + 5, y + 4, 7, 2);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 8, y + 5, 2, 2);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 14, y, 2, 16);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(x + 13, y, 4, 3);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 3 + stride, y + 13, 3, 3);
      ctx.fillRect(x + 10 - stride, y + 13, 3, 3);
    } else if (this.spawn.type === "ember_mage") {
      const flame = Math.floor(this.aiFrame / 9) % 2;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 3, y + 5, 11, 11);
      ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.purple;
      ctx.fillRect(x + 4, y + 4, 9, 11);
      ctx.fillStyle = PALETTE.roofDark;
      ctx.fillRect(x + 2, y + 2, 13, 4);
      ctx.fillRect(x + 6, y, 5, 4);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + 6, y + 6, 2, 2);
      ctx.fillRect(x + 11, y + 6, 2, 2);
      ctx.fillStyle = PALETTE.woodLight;
      ctx.fillRect(x + 15, y + 1, 2, 15);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + 13 + flame, y - 2, 6 - flame, 6);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 15, y - 1, 2, 4);
    } else if (this.spawn.type === "wolf") {
      const stride = Math.floor(this.aiFrame / 7) % 2;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 1, y + 6, 14, 8);
      ctx.fillRect(x + 12, y + 2, 6, 8);
      ctx.fillRect(x + 13, y, 2, 4);
      ctx.fillRect(x + 17, y + 1, 2, 4);
      ctx.fillRect(x - 3, y + 5, 6, 3);
      ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.stone;
      ctx.fillRect(x + 2, y + 7, 12, 6);
      ctx.fillRect(x + 12, y + 3, 5, 6);
      ctx.fillRect(x + 3 + stride, y + 12, 3, 4);
      ctx.fillRect(x + 10 - stride, y + 12, 3, 4);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(x + 13, y + 4, 3, 2);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 15, y + 5, 1, 1);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(x + 17, y + 8, 2, 1);
    } else if (this.spawn.type === "branch_bat") {
      ctx.fillRect(x, y + 5, 16, 5);
      ctx.fillRect(x + 5, y + 2, 6, 11);
    } else if (this.spawn.type === "hop_mushroom") {
      ctx.fillRect(x + 2, y + 3, 12, 6);
      ctx.fillRect(x + 6, y + 9, 5, 6);
    } else if (this.spawn.type === "gargoyle") {
      ctx.fillRect(x + 2, y + 2, 12, 13);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + 5, y + 5, 2, 2);
      ctx.fillRect(x + 10, y + 5, 2, 2);
    } else {
      ctx.fillRect(x + 3, y + 4, 10, 10);
      ctx.fillRect(x, y + 6, 4, 3);
      ctx.fillRect(x + 12, y + 6, 4, 3);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 5, y + 6, 2, 2);
      ctx.fillRect(x + 10, y + 6, 2, 2);
    }
    ctx.restore();
  }
}
