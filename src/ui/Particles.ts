import { PALETTE } from "../data/palette";

export type ParticleKind =
  | "leaf" | "spark" | "bubble" | "smoke" | "blood" | "dust" | "splash"
  | "heal" | "ember" | "ring";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  gravity: number; fade: boolean;
}

const RECIPES: Readonly<Record<ParticleKind, {
  readonly colors: readonly string[];
  readonly speed: number;
  readonly gravity: number;
  readonly life: number;
  readonly size: number;
  readonly rise: number;
}>> = {
  leaf: { colors: [PALETTE.leafLight, PALETTE.leaf, PALETTE.grassLight], speed: 0.55, gravity: 0.012, life: 34, size: 2, rise: -0.2 },
  spark: { colors: [PALETTE.yellow, PALETTE.cream, PALETTE.white], speed: 1.1, gravity: 0.03, life: 22, size: 2, rise: -0.3 },
  bubble: { colors: [PALETTE.waterLight, PALETTE.white], speed: 0.4, gravity: -0.02, life: 40, size: 2, rise: -0.6 },
  smoke: { colors: [PALETTE.stoneDark, PALETTE.stone, PALETTE.purple], speed: 0.34, gravity: -0.014, life: 52, size: 3, rise: -0.5 },
  blood: { colors: [PALETTE.red, PALETTE.roofDark], speed: 0.95, gravity: 0.08, life: 20, size: 2, rise: -0.4 },
  dust: { colors: [PALETTE.sandLight, PALETTE.sand, PALETTE.stoneLight], speed: 0.5, gravity: 0.005, life: 26, size: 2, rise: -0.1 },
  splash: { colors: [PALETTE.waterLight, PALETTE.white, PALETTE.water], speed: 0.85, gravity: 0.09, life: 18, size: 2, rise: -0.8 },
  heal: { colors: [PALETTE.leafLight, PALETTE.white, PALETTE.cream], speed: 0.4, gravity: -0.03, life: 44, size: 2, rise: -0.7 },
  ember: { colors: [PALETTE.red, PALETTE.yellow, PALETTE.cream], speed: 0.6, gravity: -0.02, life: 36, size: 2, rise: -0.5 },
  ring: { colors: [PALETTE.white, PALETTE.cream], speed: 1.7, gravity: 0, life: 16, size: 2, rise: 0 },
};

export class Particles {
  private readonly items: Particle[] = [];
  /** Au-delà, les plus anciennes cèdent la place : la boucle reste stable. */
  private readonly limit = 320;

  emit(x: number, y: number, kind: ParticleKind, count = 8): void {
    const recipe = RECIPES[kind];
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + (kind === "ring" ? 0 : Math.random() * 0.7);
      const speed = recipe.speed * (kind === "ring" ? 1 : 0.6 + Math.random() * 0.8);
      const life = Math.round(recipe.life * (0.7 + Math.random() * 0.6));
      this.items.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + recipe.rise,
        life, maxLife: life,
        color: recipe.colors[index % recipe.colors.length]!,
        size: recipe.size,
        gravity: recipe.gravity,
        fade: kind !== "blood",
      });
    }
    while (this.items.length > this.limit) this.items.shift();
  }

  /** Jet dirigé : sang d'un coup porté, éclaboussure d'un pas dans l'eau. */
  spray(x: number, y: number, kind: ParticleKind, direction: Readonly<{ x: number; y: number }>,
    count = 6): void {
    const recipe = RECIPES[kind];
    for (let index = 0; index < count; index += 1) {
      const spread = (index / Math.max(1, count - 1) - 0.5) * 1.1;
      const speed = recipe.speed * (0.8 + Math.random() * 0.7);
      const life = Math.round(recipe.life * (0.7 + Math.random() * 0.5));
      this.items.push({
        x, y,
        vx: (direction.x * Math.cos(spread) - direction.y * Math.sin(spread)) * speed,
        vy: (direction.y * Math.cos(spread) + direction.x * Math.sin(spread)) * speed + recipe.rise,
        life, maxLife: life,
        color: recipe.colors[index % recipe.colors.length]!,
        size: recipe.size,
        gravity: recipe.gravity,
        fade: true,
      });
    }
    while (this.items.length > this.limit) this.items.shift();
  }

  update(): void {
    for (const particle of this.items) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += particle.gravity;
      particle.vx *= 0.97;
      particle.life -= 1;
    }
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      if (this.items[index]!.life <= 0) this.items.splice(index, 1);
    }
  }

  clear(): void { this.items.length = 0; }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const particle of this.items) {
      const ratio = particle.life / particle.maxLife;
      ctx.globalAlpha = particle.fade ? Math.min(1, ratio * 1.6) : 1;
      ctx.fillStyle = particle.color;
      const size = Math.max(1, Math.round(particle.size * (0.5 + ratio * 0.5)));
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), size, size);
    }
    ctx.restore();
  }
}
