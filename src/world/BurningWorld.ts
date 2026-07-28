import { PALETTE } from "../data/palette";

interface FireMark {
  readonly zone: string;
  readonly x: number;
  readonly y: number;
  age: number;
}

export class BurningWorld {
  private readonly marks = new Map<string, FireMark>();

  ignite(zone: string, x: number, y: number): boolean {
    const key = `${zone}:${x},${y}`;
    if (this.marks.has(key)) return false;
    this.marks.set(key, { zone, x, y, age: 0 });
    return true;
  }

  update(): void {
    for (const mark of this.marks.values()) mark.age += 1;
  }

  count(zone?: string): number {
    if (!zone) return this.marks.size;
    return [...this.marks.values()].filter((mark) => mark.zone === zone).length;
  }

  draw(ctx: CanvasRenderingContext2D, zone: string, frame: number): void {
    ctx.save();
    for (const mark of this.marks.values()) {
      if (mark.zone !== zone) continue;
      const px = mark.x * 16;
      const py = mark.y * 16;
      ctx.globalAlpha = 0.58;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(px + 2, py + 9, 12, 6);
      ctx.globalAlpha = 1;
      if (mark.age < 720) {
        const flicker = (Math.floor(frame / 5) + mark.x + mark.y) % 3;
        ctx.fillStyle = PALETTE.red;
        ctx.fillRect(px + 2 + flicker, py + 3, 12 - flicker * 2, 11);
        ctx.fillRect(px + 5, py, 6, 13);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(px + 5 + (flicker & 1), py + 5, 6, 8);
        ctx.fillStyle = PALETTE.cream;
        ctx.fillRect(px + 7, py + 7, 3, 5);
      } else {
        ctx.fillStyle = PALETTE.stoneDark;
        ctx.fillRect(px + 4, py + 5, 3, 3);
        ctx.fillRect(px + 10, py + 2, 2, 4);
      }
    }
    ctx.restore();
  }
}
