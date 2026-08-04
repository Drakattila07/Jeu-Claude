import { PALETTE } from "../data/palette";
import type { Rect, Vec2 } from "./Entity";

export type PickupKind = "rupee" | "heart" | "stamina";

/**
 * Butin lâché par les créatures. Un ennemi vaincu ne se contentait plus que
 * d'incrémenter un compteur : il laisse désormais quelque chose à ramasser,
 * ce qui donne une raison d'avancer plutôt que de contourner.
 */
export class Pickup {
  active = true;
  private life = 600;
  private readonly birth: number;
  private velocity: Vec2;
  private magnet = false;

  constructor(
    readonly position: Vec2,
    readonly kind: PickupKind,
    readonly amount: number,
    frame = 0,
  ) {
    this.birth = frame;
    const angle = Math.random() * Math.PI * 2;
    this.velocity = { x: Math.cos(angle) * 0.9, y: Math.sin(angle) * 0.9 - 0.6 };
  }

  get bounds(): Rect {
    return { x: this.position.x - 5, y: this.position.y - 5, width: 10, height: 10 };
  }

  /** Vrai quand l'objet va disparaître : il clignote pour prévenir. */
  private get expiring(): boolean { return this.life < 120; }

  update(target: Readonly<Vec2>): void {
    if (!this.active) return;
    this.life -= 1;
    if (this.life <= 0) { this.active = false; return; }

    // Le butin part rejoindre le joueur dès qu'il approche : plus besoin de
    // marcher précisément dessus.
    const dx = target.x + 8 - this.position.x;
    const dy = target.y + 8 - this.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 42) this.magnet = true;
    if (this.magnet && distance > 1) {
      const pull = Math.min(3.4, 60 / Math.max(6, distance));
      this.velocity = { x: (dx / distance) * pull, y: (dy / distance) * pull };
    } else {
      this.velocity = { x: this.velocity.x * 0.9, y: this.velocity.y * 0.9 + 0.05 };
    }
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
  }

  collect(): void { this.active = false; }

  draw(ctx: CanvasRenderingContext2D, frame: number): void {
    if (!this.active) return;
    if (this.expiring && Math.floor(frame / 4) % 2 === 0) return;
    const bob = Math.round(Math.sin((frame - this.birth) / 12) * 1.5);
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y) + bob;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x - 4, Math.round(this.position.y) + 5, 8, 2);
    ctx.globalAlpha = 1;

    if (this.kind === "rupee") {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 4, y - 6, 8, 12);
      ctx.fillStyle = this.amount >= 20 ? PALETTE.purple : this.amount >= 5 ? PALETTE.water : PALETTE.leafLight;
      ctx.fillRect(x - 3, y - 5, 6, 10);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(x - 2, y - 4, 2, 4);
    } else if (this.kind === "heart") {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 5, y - 4, 10, 8);
      ctx.fillRect(x - 3, y + 4, 6, 2);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x - 4, y - 3, 8, 6);
      ctx.fillRect(x - 2, y + 3, 4, 2);
      ctx.fillStyle = PALETTE.rose;
      ctx.fillRect(x - 3, y - 3, 2, 2);
    } else {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 4, y - 5, 8, 10);
      ctx.fillStyle = PALETTE.leafLight;
      ctx.fillRect(x - 3, y - 4, 6, 8);
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(x - 1, y - 3, 2, 5);
    }
    ctx.restore();
  }
}
