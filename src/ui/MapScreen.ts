import { PALETTE } from "../data/palette";
import { VIEW_WIDTH, type Renderer } from "../core/Renderer";
import type { ZoneCoord } from "../core/Camera";
import { WORLD_COLUMNS, WORLD_ROWS, WORLD_ZONES, type Biome } from "../data/world";
import { drawText } from "./Font";

/**
 * Sept rangées de vingt-six pixels débordaient de la fenêtre : les deux
 * dernières régions de la vallée n'apparaissaient jamais sur la carte.
 */
const CELL = 16;
const GAP = 2;

/** Couleur d'une région : la carte doit se lire d'un coup d'œil. */
const BIOME_COLOR: Readonly<Record<Biome, string>> = {
  village: PALETTE.roof,
  fields: PALETTE.sand,
  forest: PALETTE.leafDark,
  peaks: PALETTE.white,
  cliffs: PALETTE.stone,
  ruins: PALETTE.stoneDark,
  marsh: PALETTE.marsh,
  reeds: PALETTE.pine,
  lake: PALETTE.water,
  river: PALETTE.waterLight,
  canal: PALETTE.deepWater,
  witch: PALETTE.purple,
  sea: "#173a58",
  volcano: "#4a2418",
};

export class MapScreen {
  private readonly explored = new Set<string>();

  reveal(coord: ZoneCoord): void { this.explored.add(`${coord.x},${coord.y}`); }
  has(coord: ZoneCoord): boolean { return this.explored.has(`${coord.x},${coord.y}`); }
  get exploredCount(): number { return this.explored.size; }
  get completion(): number {
    return Math.min(100, Math.round((this.explored.size / WORLD_ZONES.length) * 100));
  }
  snapshot(): readonly string[] { return [...this.explored].sort(); }
  restore(entries: readonly string[]): void {
    this.explored.clear();
    entries.forEach((value) => this.explored.add(value));
  }

  /**
   * Étoile de destination.
   *
   * Le journal disait quoi faire, jamais où : sur quatre-vingt-dix régions, une
   * consigne sans repère revient à chercher au hasard. L'étoile se dessine à
   * huit branches, contour sombre, pour rester lisible sur n'importe quel
   * biome — et elle bat lentement pour attirer l'œil.
   */
  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number,
    radius: number, frame: number): void {
    const pulse = 1 + Math.sin(frame / 18) * 0.12;
    const outer = radius * pulse;
    const inner = outer * 0.42;
    ctx.beginPath();
    for (let point = 0; point < 8; point += 1) {
      const angle = (point * Math.PI) / 4 - Math.PI / 2;
      const reach = point % 2 === 0 ? outer : inner;
      const px = cx + Math.cos(angle) * reach;
      const py = cy + Math.sin(angle) * reach;
      if (point === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(10,8,16,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.yellow;
    ctx.fill();
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2);
  }

  /** Carte plein cadre du menu. */
  draw(renderer: Renderer, current: ZoneCoord, target?: ZoneCoord | null,
    targetLabel?: string, frame = 0): void {
    const { ctx } = renderer;
    const width = WORLD_COLUMNS * (CELL + GAP) - GAP;
    const height = WORLD_ROWS * (CELL + GAP) - GAP;
    const ox = Math.round((VIEW_WIDTH - width) / 2);
    const oy = 46;
    const here = WORLD_ZONES.find((entry) => entry.x === current.x && entry.y === current.y);

    drawText(ctx, `VALLÉE DE BRUYÈRE · ${this.completion}% relevé`, VIEW_WIDTH / 2, 36,
      { color: PALETTE.cream, align: "center" });

    for (const zone of WORLD_ZONES) {
      const x = ox + zone.x * (CELL + GAP);
      const y = oy + zone.y * (CELL + GAP);
      const known = this.has({ x: zone.x, y: zone.y });
      ctx.fillStyle = known ? BIOME_COLOR[zone.biome] : PALETTE.night;
      ctx.fillRect(x, y, CELL, CELL);
      if (!known) {
        drawText(ctx, "?", x + CELL / 2, y + 3, { color: PALETTE.stoneDark, align: "center" });
        continue;
      }
      if (zone.safe) {
        ctx.fillStyle = PALETTE.leafLight;
        ctx.fillRect(x + 2, y + 2, 3, 3);
      }
      if (zone.danger >= 3) {
        ctx.fillStyle = PALETTE.red;
        ctx.fillRect(x + CELL - 5, y + 2, 3, 3);
      }
    }

    const cx = ox + current.x * (CELL + GAP);
    const cy = oy + current.y * (CELL + GAP);
    ctx.strokeStyle = PALETTE.yellow;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 1.5, cy - 1.5, CELL + 3, CELL + 3);
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(cx + CELL / 2 - 2, cy + CELL / 2 - 2, 4, 4);

    if (target) {
      this.drawStar(ctx,
        ox + target.x * (CELL + GAP) + CELL / 2,
        oy + target.y * (CELL + GAP) + CELL / 2, 8, frame);
    }

    if (here) {
      const label = here.safe ? `${here.name}  ·  refuge`
        : `${here.name}  ·  menace ${"◆".repeat(here.danger)}`;
      drawText(ctx, label, VIEW_WIDTH / 2, oy + height + 6,
        { color: here.safe ? PALETTE.leafLight : PALETTE.yellow, align: "center" });
    }
    if (targetLabel) {
      drawText(ctx, `★  ${targetLabel}`, VIEW_WIDTH / 2, oy + height + 19,
        { color: PALETTE.yellow, align: "center" });
    }
  }

  /**
   * Vignette de coin affichée pendant le jeu : toute la grille et la position
   * courante. De quoi s'orienter sans ouvrir le menu.
   */
  drawMini(ctx: CanvasRenderingContext2D, current: ZoneCoord, x: number, y: number,
    target?: ZoneCoord | null, frame = 0): void {
    const cell = 7;
    ctx.save();
    ctx.fillStyle = "rgba(10,8,16,0.5)";
    ctx.fillRect(x - 2, y - 2, WORLD_COLUMNS * cell + 4, WORLD_ROWS * cell + 4);
    for (const zone of WORLD_ZONES) {
      const known = this.has({ x: zone.x, y: zone.y });
      ctx.fillStyle = known ? BIOME_COLOR[zone.biome] : "rgba(60,66,80,0.45)";
      ctx.fillRect(x + zone.x * cell, y + zone.y * cell, cell - 1, cell - 1);
    }
    const px = x + current.x * cell;
    const py = y + current.y * cell;
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(px, py, cell - 1, 1);
    ctx.fillRect(px, py + cell - 2, cell - 1, 1);
    ctx.fillRect(px, py, 1, cell - 1);
    ctx.fillRect(px + cell - 2, py, 1, cell - 1);
    if (target && (target.x !== current.x || target.y !== current.y)) {
      this.drawStar(ctx, x + target.x * cell + cell / 2 - 0.5,
        y + target.y * cell + cell / 2 - 0.5, 4, frame);
    }
    ctx.restore();
  }
}
