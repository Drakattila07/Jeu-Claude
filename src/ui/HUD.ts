import { PALETTE } from "../data/palette";
import { VIEW_WIDTH, type Renderer } from "../core/Renderer";
import { MAX_STAMINA, type Player } from "../entities/Player";
import type { Clock } from "../core/Clock";
import { drawText, measureText } from "./Font";

/** Durée d'affichage du cartouche de zone à l'arrivée. */
const TITLE_FRAMES = 150;

/**
 * Interface de jeu.
 *
 * L'ancien bandeau opaque mangeait dix pour cent de l'écran en permanence, et
 * le nom de la région y restait figé. Tout est désormais posé en surimpression
 * dans les angles, et la région s'annonce à l'arrivée avant de s'effacer.
 */
export class HUD {
  private titleFrames = 0;
  private titleText = "";
  private titleSubtitle = "";

  /** Annonce une région : le cartouche s'affiche puis s'efface tout seul. */
  announce(name: string, subtitle = ""): void {
    if (name === this.titleText && this.titleFrames > 0) return;
    this.titleText = name;
    this.titleSubtitle = subtitle;
    this.titleFrames = TITLE_FRAMES;
  }

  update(): void {
    if (this.titleFrames > 0) this.titleFrames -= 1;
  }

  /** Coupe le cartouche : il ne doit jamais chevaucher la jauge d'un gardien. */
  clearAnnouncement(): void { this.titleFrames = 0; }

  draw(renderer: Renderer, player: Player, clock: Clock, zoneName: string, objective?: string): void {
    const { ctx } = renderer;
    ctx.save();
    this.drawHearts(ctx, player);
    this.drawStamina(ctx, player);
    this.drawPurse(renderer, player);
    this.drawClock(renderer, clock);
    if (player.isDemon) this.drawDemonBadge(renderer);
    if (objective) this.drawObjective(renderer, objective);
    this.drawZoneTitle(renderer, zoneName);
    ctx.restore();
  }

  private drawHearts(ctx: CanvasRenderingContext2D, player: Player): void {
    const perRow = 10;
    for (let index = 0; index < Math.ceil(player.maxHearts / 2); index += 1) {
      const x = 8 + (index % perRow) * 11;
      const y = 8 + Math.floor(index / perRow) * 11;
      const units = Math.max(0, Math.min(2, player.hearts - index * 2));
      // Contour sombre systématique : les cœurs restent lisibles sur la neige.
      ctx.fillStyle = "rgba(10,8,16,0.72)";
      ctx.fillRect(x - 1, y - 1, 11, 10);
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(x, y, 9, 6);
      ctx.fillRect(x + 1, y + 6, 7, 2);
      if (units > 0) {
        const width = units === 2 ? 9 : 5;
        ctx.fillStyle = PALETTE.red;
        ctx.fillRect(x, y, width, 6);
        ctx.fillRect(x + 1, y + 6, Math.max(1, width - 2), 2);
        ctx.fillStyle = PALETTE.rose;
        ctx.fillRect(x + 1, y + 1, 2, 2);
      }
    }
  }

  private drawStamina(ctx: CanvasRenderingContext2D, player: Player): void {
    const rows = Math.ceil(Math.ceil(player.maxHearts / 2) / 10);
    const y = 8 + rows * 11 + 1;
    const width = 54;
    const ratio = Math.max(0, Math.min(1, player.stamina / MAX_STAMINA));
    ctx.fillStyle = "rgba(10,8,16,0.72)";
    ctx.fillRect(7, y, width + 2, 5);
    ctx.fillStyle = PALETTE.pineDark;
    ctx.fillRect(8, y + 1, width, 3);
    ctx.fillStyle = ratio > 0.34 ? PALETTE.leafLight : PALETTE.yellow;
    ctx.fillRect(8, y + 1, Math.round(width * ratio), 3);
  }

  private drawPurse(renderer: Renderer, player: Player): void {
    const { ctx } = renderer;
    const label = String(player.rupees);
    const width = measureText(label) + 18;
    const x = VIEW_WIDTH - width - 8;
    ctx.fillStyle = "rgba(10,8,16,0.6)";
    ctx.fillRect(x - 3, 6, width + 6, 12);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 1, 8, 7, 9);
    ctx.fillStyle = PALETTE.leafLight;
    ctx.fillRect(x + 2, 9, 5, 7);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(x + 3, 10, 2, 3);
    drawText(ctx, label, x + 12, 7, { color: PALETTE.cream });
  }

  private drawClock(renderer: Renderer, clock: Clock): void {
    const { ctx } = renderer;
    const time = `J${clock.day}  ${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;
    const width = measureText(time) + 14;
    const x = VIEW_WIDTH - width - 8;
    ctx.fillStyle = "rgba(10,8,16,0.6)";
    ctx.fillRect(x - 3, 20, width + 6, 12);
    const iconX = x + 1;
    if (clock.weather === "rain") {
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(iconX, 23, 8, 4);
      ctx.fillStyle = PALETTE.waterLight;
      ctx.fillRect(iconX + 1, 28, 1, 3);
      ctx.fillRect(iconX + 4, 28, 1, 3);
      ctx.fillRect(iconX + 6, 27, 1, 3);
    } else if (clock.isNight) {
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(iconX + 1, 23, 6, 7);
      ctx.fillStyle = "rgba(10,8,16,0.85)";
      ctx.fillRect(iconX - 1, 22, 5, 8);
    } else {
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(iconX + 2, 24, 5, 5);
      ctx.fillRect(iconX + 3, 23, 3, 7);
      ctx.fillRect(iconX + 1, 25, 7, 3);
    }
    drawText(ctx, time, x + 11, 21, { color: PALETTE.cream });
  }

  private drawDemonBadge(renderer: Renderer): void {
    const { ctx } = renderer;
    const label = "DEMI-DÉMON";
    const width = measureText(label);
    ctx.fillStyle = "rgba(58,18,36,0.78)";
    ctx.fillRect(VIEW_WIDTH / 2 - width / 2 - 6, 6, width + 12, 12);
    drawText(ctx, label, VIEW_WIDTH / 2, 7, { color: PALETTE.rose, align: "center" });
  }

  private drawObjective(renderer: Renderer, objective: string): void {
    const { ctx } = renderer;
    const text = objective.length > 54 ? `${objective.slice(0, 53)}…` : objective;
    const width = measureText(text) + 20;
    ctx.fillStyle = "rgba(10,8,16,0.58)";
    ctx.fillRect(6, 44, width, 13);
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(11, 48, 4, 4);
    drawText(ctx, text, 20, 45, { color: PALETTE.cream });
  }

  private drawZoneTitle(renderer: Renderer, zoneName: string): void {
    if (this.titleFrames <= 0) return;
    const { ctx } = renderer;
    const name = this.titleText || zoneName;
    const fade = this.titleFrames > TITLE_FRAMES - 18
      ? (TITLE_FRAMES - this.titleFrames) / 18
      : Math.min(1, this.titleFrames / 30);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));
    const width = Math.max(measureText(name), measureText(this.titleSubtitle)) + 34;
    const x = VIEW_WIDTH / 2;
    const height = this.titleSubtitle ? 34 : 22;
    ctx.fillStyle = "rgba(10,8,16,0.55)";
    ctx.fillRect(x - width / 2, 66, width, height);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(x - width / 2, 66, width, 1);
    ctx.fillRect(x - width / 2, 65 + height, width, 1);
    drawText(ctx, name, x, 71, {
      color: PALETTE.cream, align: "center", outline: "rgba(10,8,16,0.9)", shadow: null,
    });
    if (this.titleSubtitle) {
      drawText(ctx, this.titleSubtitle, x, 84, { color: PALETTE.grassLight, align: "center" });
    }
    ctx.restore();
  }
}
