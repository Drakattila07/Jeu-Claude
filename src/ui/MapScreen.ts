import { PALETTE } from "../data/palette";
import type { Renderer } from "../core/Renderer";
import type { ZoneCoord } from "../core/Camera";
import { WORLD_ZONES } from "../data/world";

export class MapScreen {
  private readonly explored = new Set<string>();
  reveal(coord: ZoneCoord): void { this.explored.add(`${coord.x},${coord.y}`); }
  has(coord: ZoneCoord): boolean { return this.explored.has(`${coord.x},${coord.y}`); }
  get exploredCount(): number { return this.explored.size; }
  get completion(): number { return Math.min(100, Math.round((this.explored.size / WORLD_ZONES.length) * 100)); }
  snapshot(): readonly string[] { return [...this.explored].sort(); }
  restore(entries: readonly string[]): void {
    this.explored.clear();
    entries.forEach((value) => this.explored.add(value));
  }

  draw(renderer: Renderer, current: ZoneCoord): void {
    const { ctx } = renderer;
    renderer.pixelText(`CARTE DE LA VALLÉE · ${this.completion}%`, 128, 48, PALETTE.cream, "center");
    const ox = 72;
    const oy = 67;
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const explored = this.has({ x, y });
        ctx.fillStyle = explored ? PALETTE.leaf : PALETTE.pineDark;
        ctx.fillRect(ox + x * 14, oy + y * 14, 11, 11);
        if (explored) {
          ctx.fillStyle = PALETTE.leafLight;
          ctx.fillRect(ox + x * 14 + 2, oy + y * 14 + 2, 3, 3);
        }
      }
    }
    ctx.strokeStyle = PALETTE.yellow;
    ctx.strokeRect(ox + current.x * 14 - 1.5, oy + current.y * 14 - 1.5, 14, 14);
  }
}
