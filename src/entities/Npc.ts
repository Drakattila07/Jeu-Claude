import { PALETTE } from "../data/palette";
import type { NpcData } from "../data/npcs/core";
import type { Clock } from "../core/Clock";
import type { EventBus } from "../core/EventBus";
import type { TileMap } from "../world/TileMap";
import { findPath, type GridPoint } from "../world/Pathfinding";
import { routineStateFor, type NpcActivity } from "../data/npcs/routines";
import { moveOnGrid } from "../world/Collision";
import type { Player } from "./Player";
import type { Vec2 } from "./Entity";
import { Entity } from "./Entity";

export function npcActivityFor(id: string, frame: number): NpcActivity {
  return routineStateFor(id, frame).step.activity;
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
  private routineIndex = -1;
  private angry = false;
  private flashFrames = 0;
  private attackCooldown = 0;

  constructor(
    readonly data: NpcData,
    private readonly map: TileMap,
    private readonly clock: Clock,
    private readonly target?: Player,
  ) {
    const schedule = data.schedule.find((entry) => clock.hour >= entry.start && clock.hour < entry.end) ?? data.schedule[0]!;
    super({ x: schedule.x, y: schedule.y }, { x: 3, y: 6, width: 10, height: 10 });
    this.depth = 9;
    this.seed = idSeed(data.id);
  }

  get activity(): NpcActivity {
    if (this.angry) return "guard";
    if (this.pathIndex < this.path.length) return "walk";
    return npcActivityFor(this.data.id, this.frame);
  }

  get hostile(): boolean { return this.angry; }
  get isGuard(): boolean { return this.data.id === "garde_ronan"; }
  get bounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.position.x + 2, y: this.position.y + 4, width: 12, height: 12 };
  }

  distanceTo(position: Readonly<Vec2>): number {
    return Math.hypot(this.position.x - position.x, this.position.y - position.y);
  }

  update(): void {
    this.frame += 1;
    if (this.flashFrames > 0) this.flashFrames -= 1;
    if (this.attackCooldown > 0) this.attackCooldown -= 1;
    if (this.angry && this.target) {
      this.updateHostile();
      return;
    }
    const schedule = this.data.schedule.find((entry) => this.clock.hour >= entry.start && this.clock.hour < entry.end);
    if (!schedule) return;

    const state = routineStateFor(this.data.id, this.frame);
    if (state.index !== this.routineIndex) {
      this.routineIndex = state.index;
      if (state.step.facing) this.direction = state.step.facing;
      this.planRoute(schedule.x, schedule.y, state.step.offset);
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
    const distance = Math.hypot(dx, dy);
    const speed = 0.58;
    if (distance <= speed) {
      this.position.x = targetX;
      this.position.y = targetY;
      this.pathIndex += 1;
      this.velocity = { x: 0, y: 0 };
    } else {
      this.velocity = { x: (dx / distance) * speed, y: (dy / distance) * speed };
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      if (Math.abs(dx) > Math.abs(dy)) this.direction = dx < 0 ? "left" : "right";
      else this.direction = dy < 0 ? "up" : "down";
    }
  }

  provoke(from: Readonly<Vec2>): void {
    this.angry = true;
    this.flashFrames = 5;
    const dx = this.position.x - from.x;
    const dy = this.position.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.position.x += (dx / length) * 3;
    this.position.y += (dy / length) * 3;
  }

  alert(): void { this.angry = true; }

  tryAttack(): boolean {
    if (!this.angry || !this.target || this.attackCooldown > 0
      || this.distanceTo(this.target.position) > 18) return false;
    this.attackCooldown = this.isGuard ? 38 : 55;
    return true;
  }

  private updateHostile(): void {
    if (!this.target) return;
    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    if (distance <= 14) {
      this.velocity = { x: 0, y: 0 };
      return;
    }
    const speed = this.isGuard ? 0.82 : 0.62;
    this.velocity = { x: (dx / distance) * speed, y: (dy / distance) * speed };
    this.position = moveOnGrid(this.position, this.velocity, this.hitbox,
      (tileX, tileY) => this.map.isSolid(tileX, tileY), 2);
    if (Math.abs(dx) > Math.abs(dy)) this.direction = dx < 0 ? "left" : "right";
    else this.direction = dy < 0 ? "up" : "down";
  }

  private planRoute(homeX: number, homeY: number, offset: readonly [number, number]): void {
    const desired = {
      x: Math.max(1, Math.min(this.map.width - 2, Math.floor(homeX / 16) + offset[0])),
      y: Math.max(2, Math.min(this.map.height - 2, Math.floor(homeY / 16) + offset[1])),
    };
    const start = {
      x: Math.max(0, Math.min(this.map.width - 1, Math.floor(this.position.x / 16))),
      y: Math.max(0, Math.min(this.map.height - 1, Math.floor(this.position.y / 16))),
    };
    const candidates: readonly GridPoint[] = [
      desired,
      { x: desired.x - 1, y: desired.y },
      { x: desired.x + 1, y: desired.y },
      { x: desired.x, y: desired.y - 1 },
      { x: desired.x, y: desired.y + 1 },
    ];
    for (const target of candidates) {
      if (target.x < 1 || target.x >= this.map.width - 1 || target.y < 2 || target.y >= this.map.height - 1
        || this.map.isSolid(target.x, target.y)) continue;
      const route = findPath(start, target, (x, y) => !this.map.isSolid(x, y), this.map.width, this.map.height);
      if (route.length === 0) continue;
      this.path = route;
      this.pathIndex = Math.min(1, route.length);
      return;
    }
    this.path = [];
    this.pathIndex = 0;
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
    const outfit = this.flashFrames > 0 ? PALETTE.white : PALETTE[this.data.color];
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

    const activity = this.activity;
    if (activity !== "walk") this.drawActivity(ctx, x, y, activity);
    if (this.angry) {
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + 6, y - 8, 4, 6);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 7, y - 7, 2, 3);
      ctx.fillRect(x + 7, y - 1, 2, 2);
      ctx.fillStyle = PALETTE.stoneLight;
      const thrust = Math.floor(this.frame / 10) % 2;
      ctx.fillRect(x + 14 + thrust * 2, y + 7, 8, 2);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 11, y + 7, 5 + thrust * 2, 2);
    }
    ctx.restore();
  }

  private drawActivity(ctx: CanvasRenderingContext2D, x: number, y: number, activity: NpcActivity): void {
    if (activity === "sweep") this.drawBroom(ctx, x, y);
    else if (activity === "fish") this.drawFishing(ctx, x, y);
    else if (activity === "forge") this.drawForge(ctx, x, y);
    else if (activity === "gather") this.drawGather(ctx, x, y);
    else if (activity === "sell") this.drawSelling(ctx, x, y);
    else if (activity === "farm") this.drawFarming(ctx, x, y);
    else if (activity === "guard") this.drawGuard(ctx, x, y);
    else if (activity === "brew") this.drawBrewing(ctx, x, y);
    else if (activity === "inspect") this.drawInspect(ctx, x, y);
    else if (activity === "meditate") this.drawMeditate(ctx, x, y);
    else if (activity === "rest") this.drawRest(ctx, x, y);
    else if (activity === "ball" && this.data.id === "ryn") this.drawBall(ctx);
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

  private drawFishing(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const bob = Math.floor(this.frame / 24) % 2;
    ctx.strokeStyle = PALETTE.woodLight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 9);
    ctx.lineTo(x + 21, y + 1);
    ctx.lineTo(x + 30, y + 12 + bob);
    ctx.stroke();
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 29, y + 11 + bob, 2, 2);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(x + 29, y + 13 + bob, 2, 2);
    if (this.frame % 120 > 92) {
      ctx.fillStyle = PALETTE.waterLight;
      ctx.fillRect(x + 26, y + 15, 3, 1);
      ctx.fillRect(x + 32, y + 15, 3, 1);
    }
  }

  private drawForge(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const strike = Math.floor(this.frame / 14) % 2;
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(x + 12, y + (strike ? 5 : 1), 2, 10);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(x + (strike ? 10 : 11), y + (strike ? 12 : 0), 6, 3);
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x + 15, y + 12, 9, 4);
    if (strike) {
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 19, y + 8, 2, 2);
      ctx.fillRect(x + 24, y + 11, 1, 1);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + 21, y + 6, 1, 2);
    }
  }

  private drawGather(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const reach = Math.floor(this.frame / 20) % 2;
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 12, y + 10, 6, 5);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x + 13, y + 9, 4, 5);
    ctx.fillStyle = PALETTE.leafLight;
    ctx.fillRect(x + 16 + reach * 2, y + 6, 2, 7);
    ctx.fillRect(x + 14 + reach * 2, y + 7, 5, 2);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(x + 17 + reach * 2, y + 5, 2, 2);
  }

  private drawSelling(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 12, y + 5, 7, 10);
    ctx.fillStyle = PALETTE.roof;
    ctx.fillRect(x + 13, y + 6, 5, 7);
    ctx.fillStyle = PALETTE.yellow;
    const coinY = y + 7 + Math.floor(this.frame / 18) % 3;
    ctx.fillRect(x + 20, coinY, 3, 3);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 21, coinY, 1, 1);
  }

  private drawFarming(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const hoeDown = Math.floor(this.frame / 18) % 2;
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(x + 13, y + (hoeDown ? 5 : 1), 2, 14);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(x + (hoeDown ? 12 : 10), y + (hoeDown ? 14 : 0), 7, 2);
    if (hoeDown) {
      ctx.fillStyle = PALETTE.soil;
      ctx.fillRect(x + 17, y + 15, 5, 1);
      ctx.fillRect(x + 20, y + 13, 2, 1);
    }
  }

  private drawGuard(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(x + 14, y - 3, 2, 19);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(x + 13, y - 5, 4, 4);
    ctx.fillRect(x + 14, y - 7, 2, 3);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(x + 13, y + 1, 4, 3);
  }

  private drawBrewing(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(x + 14, y + 2, 2, 12);
    ctx.fillStyle = PALETTE.purple;
    const swirl = Math.floor(this.frame / 15) % 3;
    ctx.fillRect(x + 17 + swirl, y + 10, 4, 2);
    ctx.fillStyle = PALETTE.leafLight;
    ctx.fillRect(x + 18, y + 6 - swirl, 2, 2);
    ctx.fillStyle = PALETTE.waterLight;
    ctx.fillRect(x + 22, y + 8 + swirl, 1, 1);
  }

  private drawInspect(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 12, y + 7, 7, 7);
    ctx.fillStyle = PALETTE.sandDark;
    ctx.fillRect(x + 13, y + 8, 5, 1);
    ctx.fillRect(x + 13, y + 11, 4, 1);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 11, y + 6, 2, 9);
    ctx.fillRect(x + 19, y + 6, 2, 9);
  }

  private drawMeditate(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const orbit = Math.floor(this.frame / 18) % 4;
    const positions = [[8, -4], [18, 3], [12, 16], [-1, 7]] as const;
    const [leafX, leafY] = positions[orbit]!;
    ctx.fillStyle = PALETTE.leafLight;
    ctx.fillRect(x + leafX, y + leafY, 3, 2);
    ctx.fillStyle = PALETTE.grassLight;
    ctx.fillRect(x + leafX + 1, y + leafY - 1, 1, 1);
    ctx.fillStyle = PALETTE.waterLight;
    ctx.fillRect(x + 6, y - 3, 1, 1);
    ctx.fillRect(x + 11, y - 5, 1, 1);
  }

  private drawRest(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const rise = Math.floor(this.frame / 30) % 3;
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 14 + rise, y - 2 - rise, 2, 2);
    ctx.fillRect(x + 18 + rise, y - 5 - rise, 3, 2);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 5, y + 6, 2, 1);
    ctx.fillRect(x + 10, y + 6, 2, 1);
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
