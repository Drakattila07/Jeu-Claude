import { PALETTE } from "../data/palette";
import { ZONE_HEIGHT, ZONE_WIDTH } from "../core/Renderer";
import type { Player } from "./Player";
import { Entity, type Rect, type Vec2 } from "./Entity";

/**
 * Le dragon de la Caldeira.
 *
 * Il ne se bat pas comme une créature au sol : tant qu'il vole, l'épée ne
 * l'atteint pas. Le combat consiste donc à survivre à ses passes, puis à
 * frapper vite pendant qu'il reprend souffle, posé sur la roche. Chaque phase
 * raccourcit ce répit.
 */
export type DragonState = "hover" | "breathe" | "dive" | "land" | "roar";

export interface FlameTongue {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  active: boolean;
}

/**
 * Hauteur de croisière du dragon dans l'arène.
 *
 * À 88 il volait au-dessus du cadre : on entrait dans la Caldeira, la jauge
 * s'affichait, et la bête restait invisible. Il tient désormais tout entier
 * dans la fenêtre, cornes comprises, depuis le centre de l'arène.
 */
const ARENA_TOP = 212;

export class Dragon extends Entity {
  maxHearts = 30;
  hearts = 30;
  flashFrames = 0;
  state: DragonState = "roar";
  /** Hauteur de vol : à zéro il est posé, donc vulnérable. */
  altitude = 40;
  readonly flames: FlameTongue[] = [];
  private frame = 0;
  private stateFrames = 0;
  private facing: Vec2 = { x: 0, y: 1 };
  private diveFrom: Vec2 = { x: 0, y: 0 };

  constructor(private readonly target: Player) {
    super({ x: ZONE_WIDTH / 2 - 40, y: ARENA_TOP }, { x: 10, y: 20, width: 60, height: 44 });
    this.depth = 24;
  }

  get phase(): 1 | 2 | 3 {
    if (this.hearts > 20) return 1;
    if (this.hearts > 9) return 2;
    return 3;
  }

  get bounds(): Rect {
    return { x: this.position.x + 10, y: this.position.y + 20, width: 60, height: 44 };
  }

  get healthRatio(): number { return Math.max(0, this.hearts / this.maxHearts); }
  /** Posé au sol : la seule fenêtre où l'épée porte. */
  get isGrounded(): boolean { return this.state === "land" && this.altitude < 6; }

  update(): void {
    if (!this.active) return;
    this.frame += 1;
    this.stateFrames += 1;
    if (this.flashFrames > 0) this.flashFrames -= 1;

    const dx = this.target.position.x + 8 - (this.position.x + 40);
    const dy = this.target.position.y + 8 - (this.position.y + 40);
    const distance = Math.max(1, Math.hypot(dx, dy));
    const toward: Vec2 = { x: dx / distance, y: dy / distance };

    switch (this.state) {
      case "roar":
        this.altitude = Math.min(40, this.altitude + 1.5);
        this.drift(0.4);
        if (this.stateFrames >= 90) this.enter("hover");
        break;

      case "hover": {
        this.altitude = 40;
        this.drift(1 + this.phase * 0.35);
        const wait = this.phase === 1 ? 150 : this.phase === 2 ? 110 : 80;
        if (this.stateFrames < wait) break;
        // Il alterne souffle et piqué, plus vite à mesure qu'il faiblit.
        this.facing = toward;
        const dives = Math.floor(this.frame / 60) % 2 === 1;
        if (dives) this.diveFrom = { x: this.position.x, y: this.position.y };
        this.enter(dives ? "dive" : "breathe");
        break;
      }

      case "breathe": {
        // Trois langues de feu en éventail, tirées après une inspiration.
        if (this.stateFrames === 40) {
          const spread = this.phase === 3 ? 0.6 : 0.35;
          for (let index = -1; index <= 1; index += 1) {
            const angle = Math.atan2(this.facing.y, this.facing.x) + index * spread;
            this.flames.push({
              x: this.position.x + 40, y: this.position.y + 52,
              vx: Math.cos(angle) * 2.4, vy: Math.sin(angle) * 2.4,
              life: 150, active: true,
            });
          }
        }
        if (this.stateFrames >= 70) this.enter(this.phase === 3 ? "dive" : "land");
        break;
      }

      case "dive": {
        // Piqué en cloche : il descend, rase le sol, puis remonte.
        const progress = Math.min(1, this.stateFrames / 64);
        this.altitude = 40 - Math.sin(progress * Math.PI) * 40;
        this.position.x += this.facing.x * 4.4;
        this.position.y += this.facing.y * 2.4;
        this.clampToArena();
        if (this.stateFrames >= 64) this.enter("land");
        break;
      }

      case "land": {
        // Il se pose et souffle. C'est la fenêtre : elle se referme d'autant
        // plus vite que la bête est blessée.
        this.altitude = Math.max(0, this.altitude - 2.4);
        const rest = this.phase === 1 ? 150 : this.phase === 2 ? 120 : 90;
        if (this.stateFrames >= rest) this.enter("hover");
        break;
      }
    }

    for (const flame of this.flames) {
      flame.x += flame.vx;
      flame.y += flame.vy;
      flame.life -= 1;
      if (flame.life <= 0 || flame.x < 0 || flame.x > ZONE_WIDTH
        || flame.y < 0 || flame.y > ZONE_HEIGHT) flame.active = false;
    }
    for (let index = this.flames.length - 1; index >= 0; index -= 1) {
      if (!this.flames[index]!.active) this.flames.splice(index, 1);
    }
    void this.diveFrom;
  }

  private enter(state: DragonState): void {
    this.state = state;
    this.stateFrames = 0;
  }

  private drift(speed: number): void {
    this.position.x += Math.cos(this.frame / 70) * speed;
    this.position.y += Math.sin(this.frame / 52) * speed * 0.5;
    this.clampToArena();
  }

  private clampToArena(): void {
    this.position.x = Math.max(40, Math.min(ZONE_WIDTH - 120, this.position.x));
    this.position.y = Math.max(120, Math.min(ZONE_HEIGHT - 150, this.position.y));
  }

  /** Zones brûlantes du souffle, pour la détection de dégâts. */
  flameBounds(): readonly Rect[] {
    return this.flames.map((flame) => ({
      x: flame.x - 7, y: flame.y - 7, width: 14, height: 14,
    }));
  }

  hit(damage: number): "hurt" | "guarded" | "slain" {
    if (!this.active || this.flashFrames > 0) return "guarded";
    if (!this.isGrounded) {
      this.flashFrames = 3;
      return "guarded";
    }
    this.hearts -= damage;
    this.flashFrames = 6;
    if (this.hearts <= 0) {
      this.active = false;
      return "slain";
    }
    return "hurt";
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const lift = Math.round(this.altitude);
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y) - lift;
    const flap = Math.floor(this.frame / (this.altitude > 4 ? 7 : 24)) % 2;
    const tint = this.flashFrames > 0 ? PALETTE.white : PALETTE.roofDark;
    const belly = this.flashFrames > 0 ? PALETTE.white : PALETTE.roof;

    ctx.save();

    // Ombre au sol : elle dit la hauteur bien mieux qu'un chiffre.
    ctx.globalAlpha = 0.34 - this.altitude * 0.004;
    ctx.fillStyle = PALETTE.ink;
    const shadowWidth = 60 - lift * 0.5;
    ctx.fillRect(Math.round(this.position.x + 40 - shadowWidth / 2),
      Math.round(this.position.y + 62), Math.max(12, shadowWidth), 8);
    ctx.globalAlpha = 1;

    // Ailes.
    const span = flap === 0 ? 30 : 22;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 10 - span, y + 22 - flap * 4, span + 8, 16 + flap * 4);
    ctx.fillRect(x + 62 - 8, y + 22 - flap * 4, span + 8, 16 + flap * 4);
    ctx.fillStyle = tint;
    ctx.fillRect(x + 12 - span, y + 24 - flap * 4, span + 6, 12 + flap * 3);
    ctx.fillRect(x + 62 - 6, y + 24 - flap * 4, span + 6, 12 + flap * 3);
    ctx.fillStyle = PALETTE.purple;
    ctx.fillRect(x + 14 - span, y + 26 - flap * 4, span, 7);
    ctx.fillRect(x + 62 - 4, y + 26 - flap * 4, span, 7);

    // Queue.
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 32, y + 58, 16, 22);
    ctx.fillStyle = tint;
    ctx.fillRect(x + 34, y + 58, 12, 20);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(x + 36, y + 76, 8, 6);

    // Corps.
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 20, y + 18, 40, 46);
    ctx.fillStyle = tint;
    ctx.fillRect(x + 22, y + 20, 36, 42);
    ctx.fillStyle = belly;
    ctx.fillRect(x + 30, y + 34, 20, 26);
    for (let plate = 0; plate < 4; plate += 1) {
      ctx.fillStyle = PALETTE.sandDark;
      ctx.fillRect(x + 32, y + 38 + plate * 6, 16, 3);
    }

    // Cou et tête.
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 30, y + 2, 20, 22);
    ctx.fillStyle = tint;
    ctx.fillRect(x + 32, y + 4, 16, 20);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 26, y - 8, 28, 16);
    ctx.fillStyle = tint;
    ctx.fillRect(x + 28, y - 6, 24, 13);
    // Cornes.
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 28, y - 14, 4, 8);
    ctx.fillRect(x + 48, y - 14, 4, 8);
    // Yeux : ils s'allument quand il prépare son souffle.
    ctx.fillStyle = this.state === "breathe" ? PALETTE.white : PALETTE.yellow;
    ctx.fillRect(x + 31, y - 3, 5, 4);
    ctx.fillRect(x + 45, y - 3, 5, 4);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 33, y - 2, 2, 2);
    ctx.fillRect(x + 47, y - 2, 2, 2);

    if (this.state === "breathe" && this.stateFrames < 40) {
      // Inspiration : la gueule rougeoie avant la salve.
      const glow = Math.min(1, this.stateFrames / 40);
      ctx.globalAlpha = glow;
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + 34, y + 4, 12, 6);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 37, y + 5, 6, 4);
      ctx.globalAlpha = 1;
    }

    if (this.isGrounded) {
      ctx.globalAlpha = 0.2 + Math.sin(this.frame / 7) * 0.1;
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 18, y + 16, 44, 50);
      ctx.globalAlpha = 1;
    }

    for (const flame of this.flames) {
      const fx = Math.round(flame.x);
      const fy = Math.round(flame.y);
      const flicker = Math.floor(this.frame / 4) % 2;
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(fx - 9, fy - 9, 18, 18);
      ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(fx - 6, fy - 5, 12, 10);
      ctx.fillRect(fx - 4, fy - 7, 8, 14);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(fx - 3 + flicker, fy - 3, 6 - flicker * 2, 6);
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(fx - 1, fy - 1, 2, 2);
    }
    ctx.restore();
  }
}
