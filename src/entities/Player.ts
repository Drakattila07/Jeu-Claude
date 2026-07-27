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
  readonly speed = 1.5;

  constructor(private readonly input: Input, private map: TileMap) {
    super({ x: 120, y: 168 }, { x: 3, y: 7, width: 10, height: 9 });
    this.depth = 10;
  }

  setMap(map: TileMap): void { this.map = map; }

  update(): void {
    let dx = (this.input.isDown("Right") ? 1 : 0) - (this.input.isDown("Left") ? 1 : 0);
    let dy = (this.input.isDown("Down") ? 1 : 0) - (this.input.isDown("Up") ? 1 : 0);
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

  draw(ctx: CanvasRenderingContext2D): void {
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const step = Math.floor(this.walkFrame / 8) % 4;
    ctx.save();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 4, y + 14, 8, 2);
    ctx.fillStyle = PALETTE.pineDark;
    ctx.fillRect(x + 3, y + 6, 10, 8);
    ctx.fillStyle = PALETTE.leaf;
    ctx.fillRect(x + 2, y + 2, 12, 7);
    ctx.fillStyle = PALETTE.leafLight;
    ctx.fillRect(x + (this.direction === "left" ? 1 : 3), y, 9, 4);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(x + 5, y + 5, 6, 5);
    ctx.fillStyle = PALETTE.ink;
    if (this.direction === "left") ctx.fillRect(x + 5, y + 7, 1, 1);
    else if (this.direction === "right") ctx.fillRect(x + 10, y + 7, 1, 1);
    else {
      ctx.fillRect(x + 6, y + 7, 1, 1);
      ctx.fillRect(x + 9, y + 7, 1, 1);
    }
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 4 + (step % 2), y + 13, 3, 3);
    ctx.fillRect(x + 9 - (step % 2), y + 13, 3, 3);
    ctx.restore();
  }
}
