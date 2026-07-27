import { PALETTE } from "../data/palette";
import type { NpcData } from "../data/npcs/core";
import type { Clock } from "../core/Clock";
import type { EventBus } from "../core/EventBus";
import type { TileMap } from "../world/TileMap";
import { findPath, type GridPoint } from "../world/Pathfinding";
import type { Vec2 } from "./Entity";
import { Entity } from "./Entity";

export class Npc extends Entity {
  private path: readonly GridPoint[] = [];
  private pathIndex = 0;
  private frame = 0;
  private talkIndex = 0;

  constructor(readonly data: NpcData, private readonly map: TileMap, private readonly clock: Clock) {
    const schedule = data.schedule.find((entry) => clock.hour >= entry.start && clock.hour < entry.end) ?? data.schedule[0]!;
    super({ x: schedule.x, y: schedule.y }, { x: 3, y: 6, width: 10, height: 10 });
    this.depth = 9;
  }

  distanceTo(position: Readonly<Vec2>): number {
    return Math.hypot(this.position.x - position.x, this.position.y - position.y);
  }

  update(): void {
    this.frame += 1;
    const schedule = this.data.schedule.find((entry) => this.clock.hour >= entry.start && this.clock.hour < entry.end);
    if (!schedule) return;
    if (this.frame % 120 === 1) {
      this.path = findPath(
        { x: Math.floor(this.position.x / 16), y: Math.floor(this.position.y / 16) },
        { x: Math.floor(schedule.x / 16), y: Math.floor(schedule.y / 16) },
        (x, y) => !this.map.isSolid(x, y),
      );
      this.pathIndex = Math.min(1, this.path.length);
    }
    const node = this.path[this.pathIndex];
    if (!node) return;
    const targetX = node.x * 16;
    const targetY = node.y * 16;
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    if (distance < 1) this.pathIndex += 1;
    else {
      this.position.x += (dx / distance) * 0.35;
      this.position.y += (dy / distance) * 0.35;
    }
  }

  talk(events: EventBus): string {
    const recent = events.history().at(-1);
    if (recent?.type === "player_wet") return "Tu es tout trempé.";
    if (recent?.type === "quest_complete") return "J'ai entendu du bruit jusque d'ici.";
    const line = this.data.chatter[this.talkIndex % this.data.chatter.length]!;
    this.talkIndex += 1;
    return line;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    ctx.save();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 3, y + 14, 10, 2);
    ctx.fillStyle = PALETTE[this.data.color];
    ctx.fillRect(x + 3, y + 7, 10, 8);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(x + 5, y + 3, 7, 7);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 4, y + 1, 9, 4);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 7, y + 6, 1, 1);
    ctx.fillRect(x + 10, y + 6, 1, 1);
    ctx.restore();
  }
}
