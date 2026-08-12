import { PALETTE } from "../data/palette";
import type { Vec2 } from "./Entity";

/** Distance à laquelle Liane lance une ronce sur ce qui approche. */
export const COMPANION_REACH = 84;
/** Frames entre deux ronces : elle aide, elle ne fait pas le travail. */
export const COMPANION_COOLDOWN = 84;

/**
 * Liane.
 *
 * Une graine de l'Arbre-Mère restée éveillée sous la Cime, enfermée depuis
 * plus longtemps qu'elle ne saurait dire. Une fois libérée, elle ne retourne
 * ni au perchoir ni à la terre : contrairement au Chat-Lanterne, elle ne
 * s'efface jamais en changeant de région — c'est ce qui fait d'elle une
 * compagne, et non un familier qu'on rappelle.
 */
export class Companion {
  readonly position: Vec2;
  private frame = 0;
  private following: Readonly<Vec2> | null = null;
  private cooldown = 0;
  private banterIndex = 0;

  private static readonly BANTER: readonly string[] = [
    "« Le jour, dehors. Je ne me souvenais plus que c'était si grand. »",
    "« Les racines de la vallée parlent, si on marche assez lentement. »",
    "« L'Arbre-Mère rêvait de nous toutes. Vous étiez juste la seule éveillée. »",
    "« Je n'ai pas de nom depuis longtemps. Liane ira très bien. »",
  ];

  constructor(private anchor: Readonly<Vec2>) {
    this.position = { ...anchor };
  }

  /** L'arrache à son point d'apparition : elle suit, sans jamais s'effacer. */
  follow(target: Readonly<Vec2>): void { this.following = target; }
  get isFollowing(): boolean { return this.following !== null; }
  get ready(): boolean { return this.cooldown <= 0; }

  update(): void {
    this.frame += 1;
    if (this.cooldown > 0) this.cooldown -= 1;
    if (this.following) {
      const wantedX = this.following.x + 24;
      const wantedY = this.following.y - 6;
      this.position.x += (wantedX - this.position.x) * 0.08;
      this.position.y += (wantedY - this.position.y) * 0.08;
      this.position.x += Math.sin(this.frame / 26) * 0.4;
      this.position.y += Math.cos(this.frame / 34) * 0.3;
      return;
    }
    this.position.x = this.anchor.x + Math.sin(this.frame / 44) * 6;
    this.position.y = this.anchor.y + Math.cos(this.frame / 31) * 4;
  }

  /** Lance une ronce si elle est prête. Rend faux si elle souffle encore. */
  spark(): boolean {
    if (this.cooldown > 0) return false;
    this.cooldown = COMPANION_COOLDOWN;
    return true;
  }

  distanceTo(position: Readonly<Vec2>): number {
    return Math.hypot(this.position.x - position.x, this.position.y - position.y);
  }

  /** Bavardage qui tourne, une fois qu'elle a rejoint la route. */
  nextBanter(): string {
    const line = Companion.BANTER[this.banterIndex % Companion.BANTER.length]!;
    this.banterIndex += 1;
    return line;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const bob = Math.floor(this.frame / 12) % 2;
    const sway = Math.floor(this.frame / 18) % 3;

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#7cffc4";
    ctx.fillRect(x - 7, y - 6, 26, 26);
    ctx.globalAlpha = 1;

    // Un petit corps de tiges nouées, feuille en couronne.
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 2, y + 2 - bob, 10, 12);
    ctx.fillRect(x + 3, y - 2 - bob, 8, 6);
    ctx.fillStyle = PALETTE.leafDark;
    ctx.fillRect(x + 3, y + 3 - bob, 8, 10);
    ctx.fillRect(x + 4, y - 1 - bob, 6, 5);
    ctx.fillStyle = PALETTE.leaf;
    ctx.fillRect(x + 4, y + 4 - bob, 6, 7);
    ctx.fillStyle = PALETTE.leafLight;
    ctx.fillRect(x + 5, y, 5, 3);
    // Deux pousses en guise de bras, qui se balancent.
    ctx.fillStyle = PALETTE.leafDark;
    ctx.fillRect(x - sway, y + 5 - bob, 3, 6);
    ctx.fillRect(x + 12 + sway, y + 5 - bob, 3, 6);
    // Yeux, simple lueur.
    ctx.fillStyle = "#7cffc4";
    ctx.fillRect(x + 5, y + 1 - bob, 1, 1);
    ctx.fillRect(x + 8, y + 1 - bob, 1, 1);
    ctx.restore();
  }
}
