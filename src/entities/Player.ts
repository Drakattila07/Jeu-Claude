import { PALETTE } from "../data/palette";
import type { Input } from "../core/Input";
import type { TileMap } from "../world/TileMap";
import { moveOnGrid } from "../world/Collision";
import { Entity } from "./Entity";

export type Direction = "up" | "down" | "left" | "right";

export class Player extends Entity {
  direction: Direction = "down";
  walkFrame = 0;
  hearts = 6;
  maxHearts = 6;
  rupees = 12;
  private demon = false;
  attackFrame = -1;
  invulnerabilityFrames = 0;
  flashFrames = 0;
  knockbackFrames = 0;

  constructor(private readonly input: Input, private map: TileMap) {
    super({ x: 120, y: 168 }, { x: 3, y: 7, width: 10, height: 9 });
    this.depth = 10;
  }

  setMap(map: TileMap): void { this.map = map; }
  setDemon(active: boolean): void { this.demon = active; }
  toggleDemon(): boolean {
    this.demon = !this.demon;
    return this.demon;
  }
  get isDemon(): boolean { return this.demon; }
  get speed(): number { return this.demon ? 2.35 : 1.5; }
  get attackDamage(): number { return this.demon ? 2 : 1; }
  get fireRadius(): number { return this.demon ? 36 : 0; }

  update(): void {
    if (this.invulnerabilityFrames > 0) this.invulnerabilityFrames -= 1;
    if (this.flashFrames > 0) this.flashFrames -= 1;
    if (this.attackFrame >= 0) {
      this.attackFrame += 1;
      if (this.attackFrame >= 18) this.attackFrame = -1;
    }
    let dx = (this.input.isDown("Right") ? 1 : 0) - (this.input.isDown("Left") ? 1 : 0);
    let dy = (this.input.isDown("Down") ? 1 : 0) - (this.input.isDown("Up") ? 1 : 0);
    if (this.attackFrame >= 0 && this.attackFrame <= 4) { dx = 0; dy = 0; }
    if (dx !== 0 && dy !== 0) {
      const diagonal = Math.SQRT1_2;
      dx *= diagonal;
      dy *= diagonal;
    }
    if (Math.abs(dx) > Math.abs(dy) && dx !== 0) this.direction = dx > 0 ? "right" : "left";
    else if (dy !== 0) this.direction = dy > 0 ? "down" : "up";
    this.velocity = { x: dx * this.speed, y: dy * this.speed };
    this.position = moveOnGrid(this.position, this.velocity, this.hitbox,
      (tileX, tileY) => this.map.isSolid(tileX, tileY));
    if (dx !== 0 || dy !== 0) this.walkFrame = (this.walkFrame + 1) % 32;
    else this.walkFrame = 0;
  }

  startAttack(): boolean {
    if (this.attackFrame >= 0) return false;
    this.attackFrame = 0;
    return true;
  }

  get swordActive(): boolean { return this.attackFrame >= 4 && this.attackFrame < 12; }

  attackHitbox(): { x: number; y: number; width: number; height: number } {
    const x = this.position.x;
    const y = this.position.y;
    if (this.direction === "up") return { x: x + 2, y: y - 12, width: 12, height: 16 };
    if (this.direction === "down") return { x: x + 2, y: y + 12, width: 12, height: 16 };
    if (this.direction === "left") return { x: x - 12, y: y + 2, width: 16, height: 12 };
    return { x: x + 12, y: y + 2, width: 16, height: 12 };
  }

  takeDamage(hearts: number, direction: Readonly<{ x: number; y: number }>): boolean {
    if (this.invulnerabilityFrames > 0) return false;
    this.hearts = Math.max(0, this.hearts - hearts);
    this.invulnerabilityFrames = 40;
    this.flashFrames = 4;
    this.knockbackFrames = 8;
    this.position.x += direction.x * 4;
    this.position.y += direction.y * 4;
    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.invulnerabilityFrames > 0 && Math.floor(this.invulnerabilityFrames / 4) % 2 === 0) return;
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const step = Math.floor(this.walkFrame / 8) % 2;
    const walking = this.walkFrame > 0;
    const bob = walking && step === 1 ? -1 : 0;
    ctx.save();

    ctx.globalAlpha = 0.32;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 2, y + 14, 12, 2);
    ctx.fillRect(x + 4, y + 16, 8, 1);
    ctx.globalAlpha = 1;

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 3 + step, y + 12, 4, 4);
    ctx.fillRect(x + 9 - step, y + 12, 4, 4);
    ctx.fillRect(x + 2, y + 6 + bob, 12, 8);
    ctx.fillStyle = this.demon ? PALETTE.purple : PALETTE.pineDark;
    ctx.fillRect(x + 3, y + 7 + bob, 10, 7);
    ctx.fillStyle = this.demon ? PALETTE.red : PALETTE.leaf;
    ctx.fillRect(x + 4, y + 7 + bob, 3, 6);
    ctx.fillStyle = this.demon ? PALETTE.yellow : PALETTE.leafLight;
    ctx.fillRect(x + 5, y + 8 + bob, 1, 4);

    if (this.direction !== "up") {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 4, y + 1 + bob, 9, 7);
      ctx.fillStyle = this.demon ? PALETTE.rose : PALETTE.sandLight;
      ctx.fillRect(x + 5, y + 3 + bob, 7, 6);
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(x + 6, y + 3 + bob, 4, 2);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 4, y + 1 + bob, 9, 3);
      ctx.fillRect(x + 11, y + 3 + bob, 2, 3);
    } else {
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 4, y + 1 + bob, 9, 7);
      ctx.fillStyle = PALETTE.wood;
      ctx.fillRect(x + 6, y + 3 + bob, 5, 4);
    }

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 1, y + 2 + bob, 13, 4);
    ctx.fillStyle = this.demon ? PALETTE.roofDark : PALETTE.leaf;
    ctx.fillRect(x + 2, y + 1 + bob, 12, 4);
    ctx.fillStyle = this.demon ? PALETTE.red : PALETTE.leafLight;
    ctx.fillRect(x + (this.direction === "left" ? 1 : 3), y + bob, 9, 2);
    ctx.fillStyle = PALETTE.pineDark;
    ctx.fillRect(x + 11, y + 4 + bob, 4, 3);
    if (this.demon) {
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(x + 2, y - 3 + bob, 2, 5);
      ctx.fillRect(x + 13, y - 3 + bob, 2, 5);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 2, y - 4 + bob, 1, 2);
      ctx.fillRect(x + 14, y - 4 + bob, 1, 2);
    }

    ctx.fillStyle = PALETTE.ink;
    if (this.direction === "left") ctx.fillRect(x + 5, y + 6 + bob, 1, 1);
    else if (this.direction === "right") ctx.fillRect(x + 11, y + 6 + bob, 1, 1);
    else if (this.direction === "down") {
      ctx.fillRect(x + 6, y + 6 + bob, 1, 1);
      ctx.fillRect(x + 10, y + 6 + bob, 1, 1);
    }

    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 4 + step, y + 13, 3, 3);
    ctx.fillRect(x + 10 - step, y + 13, 3, 3);

    if (this.attackFrame >= 0) {
      const blade = this.attackHitbox();
      ctx.fillStyle = PALETTE.ink;
      if (this.direction === "up" || this.direction === "down") {
        ctx.fillRect(Math.round(blade.x + 5), Math.round(blade.y), 4, blade.height);
      } else {
        ctx.fillRect(Math.round(blade.x), Math.round(blade.y + 5), blade.width, 4);
      }
      ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.stoneLight;
      if (this.direction === "up" || this.direction === "down") {
        ctx.fillRect(Math.round(blade.x + 6), Math.round(blade.y), 2, blade.height - 2);
      } else {
        ctx.fillRect(Math.round(blade.x), Math.round(blade.y + 6), blade.width - 2, 2);
      }
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 5, y + 8 + bob, 7, 2);
      ctx.fillStyle = PALETTE.white;
      if (this.attackFrame >= 4 && this.attackFrame < 10) {
        ctx.fillRect(x - 2, y + 2, 2, 2);
        ctx.fillRect(x + 16, y + 10, 1, 2);
      }
    }
    ctx.restore();
  }
}
