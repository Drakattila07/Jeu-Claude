import { PALETTE } from "../data/palette";
import type { NpcData } from "../data/npcs/core";
import type { Clock } from "../core/Clock";
import type { EventBus } from "../core/EventBus";
import type { TileMap } from "../world/TileMap";
import { findPath, type GridPoint } from "../world/Pathfinding";
import type { Vec2 } from "./Entity";
import { Entity } from "./Entity";

export type NpcActivity = "walk" | "sweep" | "ball";

const SWEEPERS = new Set(["doyen_orme", "sylve", "fermier_a", "fermier_b"]);
const BALL_PLAYERS = new Set(["ryn", "tam"]);

export function npcActivityFor(id: string, frame: number): NpcActivity {
  if (BALL_PLAYERS.has(id)) return "ball";
  if (SWEEPERS.has(id) && frame % 300 >= 170) return "sweep";
  return "walk";
}

function idSeed(id: string): number {
  let value = 0;
  for (const character of id) value = (value * 31 + character.charCodeAt(0)) >>> 0;
  return value;
}

export class Npc extends Entity {
  private path: readonly GridPoint[] = [];
  private pathIndex = 0;
  private frame = 0;
  private talkIndex = 0;
  private direction: "left" | "right" | "up" | "down" = "down";
  private readonly seed: number;

  constructor(readonly data: NpcData, private readonly map: TileMap, private readonly clock: Clock) {
    const schedule = data.schedule.find((entry) => clock.hour >= entry.start && clock.hour < entry.end) ?? data.schedule[0]!;
    super({ x: schedule.x, y: schedule.y }, { x: 3, y: 6, width: 10, height: 10 });
    this.depth = 9;
    this.seed = idSeed(data.id);
  }

  get activity(): NpcActivity {
    return npcActivityFor(this.data.id, this.frame);
  }

  distanceTo(position: Readonly<Vec2>): number {
    return Math.hypot(this.position.x - position.x, this.position.y - position.y);
  }

  update(): void {
    this.frame += 1;
    const schedule = this.data.schedule.find((entry) => this.clock.hour >= entry.start && this.clock.hour < entry.end);
    if (!schedule) return;

    if (this.activity === "sweep") {
      this.velocity = { x: 0, y: 0 };
      return;
    }

    if (this.frame % 120 === 1 || this.pathIndex >= this.path.length) {
      const offsets: readonly (readonly [number, number])[] = this.activity === "ball"
        ? this.data.id === "ryn"
          ? [[0, 0], [1, 0], [0, 1], [-1, 0]]
          : [[0, 0], [-1, 0], [0, -1], [1, 0]]
        : [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [2, 0], [0, 2], [-2, 0]];
      const phase = (Math.floor(this.frame / 120) + this.seed) % offsets.length;
      const [offsetX, offsetY] = offsets[phase]!;
      const target = {
        x: Math.max(1, Math.min(this.map.width - 2, Math.floor(schedule.x / 16) + offsetX)),
        y: Math.max(2, Math.min(this.map.height - 2, Math.floor(schedule.y / 16) + offsetY)),
      };
      if (!this.map.isSolid(target.x, target.y)) {
        this.path = findPath(
          { x: Math.floor(this.position.x / 16), y: Math.floor(this.position.y / 16) },
          target,
          (x, y) => !this.map.isSolid(x, y),
        );
        this.pathIndex = Math.min(1, this.path.length);
      }
    }

    const node = this.path[this.pathIndex];
    if (!node) {
      this.velocity = { x: 0, y: 0 };
      return;
    }
    const targetX = node.x * 16;
    const targetY = node.y * 16;
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    if (distance < 0.7) {
      this.pathIndex += 1;
      this.velocity = { x: 0, y: 0 };
    } else {
      const speed = this.activity === "ball" ? 0.43 : 0.32;
      this.velocity = { x: (dx / distance) * speed, y: (dy / distance) * speed };
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      if (Math.abs(dx) > Math.abs(dy)) this.direction = dx < 0 ? "left" : "right";
      else this.direction = dy < 0 ? "up" : "down";
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
    const walking = Math.abs(this.velocity.x) + Math.abs(this.velocity.y) > 0.05;
    const step = walking ? Math.floor(this.frame / 8) % 2 : 0;
    const bob = walking && Math.floor(this.frame / 8) % 2 === 1 ? -1 : 0;
    const outfit = PALETTE[this.data.color];
    const accent = this.data.color === "sand" ? PALETTE.yellow
      : this.data.color === "water" ? PALETTE.waterLight
        : this.data.color === "stone" ? PALETTE.stoneLight
          : this.data.color === "leaf" ? PALETTE.leafLight
            : this.data.color === "purple" ? PALETTE.rose : PALETTE.sandLight;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 2, y + 14, 12, 2);
    ctx.fillRect(x + 4, y + 16, 8, 1);
    ctx.globalAlpha = 1;

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 3 + step, y + 12, 4, 4);
    ctx.fillRect(x + 9 - step, y + 12, 4, 4);
    ctx.fillRect(x + 2, y + 6 + bob, 12, 8);
    ctx.fillStyle = outfit;
    ctx.fillRect(x + 3, y + 7 + bob, 10, 7);
    ctx.fillStyle = accent;
    ctx.fillRect(x + 4, y + 8 + bob, 2, 5);
    ctx.fillRect(x + 7, y + 8 + bob, 5, 1);

    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 4, y + 1 + bob, 9, 5);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(x + 4, y + 3 + bob, 8, 6);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 5, y + 3 + bob, 5, 2);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 3, y + 1 + bob, 10, 3);
    if ((this.seed & 1) === 0) {
      ctx.fillStyle = accent;
      ctx.fillRect(x + 2, y + bob, 12, 2);
      ctx.fillRect(x + 5, y - 1 + bob, 7, 2);
    }

    ctx.fillStyle = PALETTE.ink;
    if (this.direction === "left") ctx.fillRect(x + 5, y + 6 + bob, 1, 1);
    else if (this.direction === "right") ctx.fillRect(x + 10, y + 6 + bob, 1, 1);
    else if (this.direction !== "up") {
      ctx.fillRect(x + 6, y + 6 + bob, 1, 1);
      ctx.fillRect(x + 10, y + 6 + bob, 1, 1);
    }

    if (this.activity === "sweep") this.drawBroom(ctx, x, y);
    if (this.data.id === "ryn") this.drawBall(ctx);
    ctx.restore();
  }

  private drawBroom(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const swing = Math.floor(this.frame / 12) % 2;
    ctx.fillStyle = PALETTE.woodLight;
    if (swing === 0) {
      ctx.fillRect(x + 13, y + 3, 2, 12);
      ctx.fillRect(x + 12, y + 13, 4, 2);
      ctx.fillStyle = PALETTE.sand;
      ctx.fillRect(x + 10, y + 14, 6, 2);
    } else {
      ctx.fillRect(x + 12, y + 5, 2, 10);
      ctx.fillRect(x + 10, y + 13, 5, 2);
      ctx.fillStyle = PALETTE.sand;
      ctx.fillRect(x + 8, y + 14, 6, 2);
    }
    ctx.fillStyle = PALETTE.sandLight;
    const dustX = x + 17 + swing * 3;
    ctx.fillRect(dustX, y + 13, 1, 1);
    ctx.fillRect(dustX + 3, y + 11, 1, 1);
  }

  private drawBall(ctx: CanvasRenderingContext2D): void {
    const travel = Math.sin(this.frame / 18);
    const ballX = 112 + Math.round(travel * 18);
    const ballY = 112 - Math.round(Math.abs(Math.sin(this.frame / 9)) * 7);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(ballX - 3, 113, 7, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(ballX - 3, ballY - 2, 7, 6);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(ballX - 2, ballY - 3, 5, 6);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(ballX, ballY - 2, 3, 3);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(ballX - 1, ballY - 2, 1, 1);
  }
}
