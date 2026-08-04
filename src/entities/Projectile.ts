import { PALETTE } from "../data/palette";
import { ZONE_HEIGHT, ZONE_WIDTH } from "../core/Renderer";
import type { Rect, Vec2 } from "./Entity";

export type ProjectileKind = "fireball" | "ember" | "frost" | "seed";

/** Qui a tiré : un trait ennemi ne blesse pas un ennemi, et réciproquement. */
export type ProjectileSide = "player" | "foe";

interface ProjectileStyle {
  readonly speed: number;
  readonly life: number;
  readonly radius: number;
  readonly core: string;
  readonly halo: string;
  readonly glow: string;
  readonly damage: number;
}

const STYLES: Readonly<Record<ProjectileKind, ProjectileStyle>> = {
  fireball: { speed: 3.6, life: 110, radius: 5, core: PALETTE.cream, halo: PALETTE.red, glow: "#ff8a3c", damage: 2 },
  ember: { speed: 2.4, life: 150, radius: 4, core: PALETTE.yellow, halo: PALETTE.red, glow: "#ff6a2a", damage: 2 },
  frost: { speed: 2.1, life: 170, radius: 4, core: PALETTE.white, halo: PALETTE.waterLight, glow: "#8fd8ff", damage: 1 },
  seed: { speed: 2.8, life: 120, radius: 3, core: PALETTE.leafLight, halo: PALETTE.leafDark, glow: "#9fe07a", damage: 1 },
};

export class Projectile {
  active = true;
  life: number;
  readonly position: Vec2;
  readonly style: ProjectileStyle;
  private readonly velocity: Vec2;
  private readonly trail: Vec2[] = [];

  constructor(
    origin: Readonly<Vec2>,
    direction: Readonly<Vec2>,
    readonly kind: ProjectileKind,
    readonly side: ProjectileSide,
  ) {
    this.style = STYLES[kind];
    this.position = { x: origin.x, y: origin.y };
    const length = Math.max(0.001, Math.hypot(direction.x, direction.y));
    this.velocity = {
      x: (direction.x / length) * this.style.speed,
      y: (direction.y / length) * this.style.speed,
    };
    this.life = this.style.life;
  }

  get damage(): number { return this.style.damage; }

  get bounds(): Rect {
    const size = this.style.radius * 2;
    return {
      x: this.position.x - this.style.radius,
      y: this.position.y - this.style.radius,
      width: size, height: size,
    };
  }

  update(): void {
    if (!this.active) return;
    this.trail.unshift({ x: this.position.x, y: this.position.y });
    if (this.trail.length > 6) this.trail.pop();
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.life -= 1;
    if (this.life <= 0
      || this.position.x < -8 || this.position.x > ZONE_WIDTH + 8
      || this.position.y < -8 || this.position.y > ZONE_HEIGHT + 8) this.active = false;
  }

  destroy(): void { this.active = false; }

  draw(ctx: CanvasRenderingContext2D, frame: number): void {
    if (!this.active) return;
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const pulse = Math.floor(frame / 4) % 2;
    ctx.save();

    // Traînée : la trajectoire se lit même quand ça va vite.
    for (const [index, point] of this.trail.entries()) {
      ctx.globalAlpha = 0.34 * (1 - index / this.trail.length);
      ctx.fillStyle = this.style.halo;
      const size = Math.max(1, this.style.radius - index);
      ctx.fillRect(Math.round(point.x) - size / 2, Math.round(point.y) - size / 2, size, size);
    }

    ctx.globalAlpha = 0.28;
    ctx.fillStyle = this.style.halo;
    ctx.fillRect(x - this.style.radius - 3, y - this.style.radius - 3,
      this.style.radius * 2 + 6, this.style.radius * 2 + 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.style.halo;
    ctx.fillRect(x - this.style.radius, y - this.style.radius + 1,
      this.style.radius * 2, this.style.radius * 2 - 2);
    ctx.fillRect(x - this.style.radius + 1, y - this.style.radius,
      this.style.radius * 2 - 2, this.style.radius * 2);
    ctx.fillStyle = this.style.core;
    ctx.fillRect(x - 2 + pulse, y - 2, 4 - pulse * 2, 4);
    ctx.restore();
  }
}
