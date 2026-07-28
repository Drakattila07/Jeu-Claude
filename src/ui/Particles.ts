import { PALETTE } from "../data/palette";

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; color: string;
}

export class Particles {
  private readonly items: Particle[] = [];

  emit(x: number, y: number, kind: "leaf" | "spark" | "bubble" | "smoke", count = 8): void {
    const colors = {
      leaf: PALETTE.leafLight, spark: PALETTE.yellow,
      bubble: PALETTE.waterLight, smoke: PALETTE.purple
    } as const;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const speed = 0.35 + (index % 3) * 0.18;
      this.items.push({
        x, y, vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (kind === "bubble" || kind === "smoke" ? 0.5 : 0.1),
        life: 24 + (index % 4) * 6, color: colors[kind],
      });
    }
  }

  update(): void {
    for (const particle of this.items) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.01;
      particle.life -= 1;
    }
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      if (this.items[index]!.life <= 0) this.items.splice(index, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.items) {
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 2, 2);
    }
  }
}
