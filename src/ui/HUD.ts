import { dither } from "./Dither";
import { PALETTE } from "../data/palette";
import { VIEW_WIDTH, VIEW_HEIGHT, type Renderer } from "../core/Renderer";
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

  draw(renderer: Renderer, player: Player, clock: Clock, zoneName: string, objective?: string,
    heading?: { readonly dx: number; readonly dy: number } | null,
    coastal = false, biome?: string): void {
    if (biome === "peaks" || biome === "sea" || biome === "fields") {
       const ctx = renderer.ctx;
       ctx.save();
       ctx.fillStyle = PALETTE.white;
       for (let y = 0; y < 60; y++) {
         const ratio = 0.15 * (1 - y / 60);
         for (let x = 0; x < VIEW_WIDTH; x += 2) {
           if (dither(x, y, ratio)) {
             ctx.fillRect(x, y, 1, 1);
           }
         }
       }
       ctx.restore();
    }

    const { ctx } = renderer;
    ctx.save();
    this.drawHearts(ctx, player);
    this.drawStamina(ctx, player);
    this.drawPurse(renderer, player);
    this.drawClock(renderer, clock);
    this.drawSeason(renderer, player, clock);
    // La marée sur la côte, le vent à la barre : deux informations qui ne
    // servent qu'où elles servent, et qui n'encombrent pas le reste du temps.
    if (coastal) this.drawTide(renderer, clock);
    if (player.sailing) this.drawWind(renderer, clock);

    // Pulsation si 1 coeur
    if (player.hearts === 1) {
      const pulseIntensity = Math.abs(Math.sin(clock.minute * 0.5)) * 0.4;
      ctx.save();
      ctx.strokeStyle = PALETTE.red;
      ctx.lineWidth = 4;
      ctx.globalAlpha = pulseIntensity;
      ctx.strokeRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.restore();
    }


    // Pulsation si 1 coeur
    if (player.hearts === 1) {
       // Using frame would be better but clock.minute changes
      // Actually we have frame from Game but HUD doesn't get frame. Oh wait, we can just use clock.minute?
      // Minute in clock changes every real-time second or so. It's too slow.
      // Let's use Date.now() for the pulse to be safe, or just read player.invulnerabilityFrames but that's only on hit.
      // Let's use Date.now() / 200.
      const pulseIntensity = Math.abs(Math.sin(Date.now() / 200)) * 0.4;
      ctx.save();
      ctx.strokeStyle = PALETTE.red;
      ctx.lineWidth = 4;
      ctx.globalAlpha = pulseIntensity;
      ctx.strokeRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.restore();
    }

    if (player.isDemon) this.drawDemonBadge(renderer);
    if (objective) this.drawObjective(renderer, objective, heading);
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
    if (clock.weather === "rain" || clock.weather === "storm") {
      ctx.fillStyle = clock.weather === "storm" ? PALETTE.stoneDark : PALETTE.stoneLight;
      ctx.fillRect(iconX, 23, 8, 4);
      ctx.fillStyle = clock.weather === "storm" ? PALETTE.yellow : PALETTE.waterLight;
      ctx.fillRect(iconX + 1, 28, 1, 3);
      ctx.fillRect(iconX + 4, 28, 1, 3);
      ctx.fillRect(iconX + 6, 27, 1, 3);
    } else if (clock.weather === "snow") {
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(iconX + 3, 23, 2, 8);
      ctx.fillRect(iconX, 26, 8, 2);
      ctx.fillRect(iconX + 1, 24, 6, 6);
    } else if (clock.weather === "fog") {
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(iconX, 24, 8, 2);
      ctx.fillRect(iconX + 1, 27, 7, 2);
      ctx.fillRect(iconX, 30, 6, 1);
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

  /**
   * La saison, à gauche sous la jauge d'élan.
   *
   * À droite elle recouvrait la bourse : ce coin est déjà pris par l'heure,
   * la marée et le vent.
   */
  private drawSeason(renderer: Renderer, player: Player, clock: Clock): void {
    const { ctx } = renderer;
    const rows = Math.ceil(Math.ceil(player.maxHearts / 2) / 10);
    const y = 8 + rows * 11 + 8;
    const label = clock.season.toUpperCase();
    ctx.fillStyle = "rgba(10,8,16,0.55)";
    ctx.fillRect(7, y, measureText(label) + 8, 11);
    drawText(ctx, label, 11, y + 1, { color: PALETTE.grassLight });
  }

  /** Jauge de marée : hauteur d'eau, état, et l'attente jusqu'au reflux. */
  private drawTide(renderer: Renderer, clock: Clock): void {
    const { ctx } = renderer;
    const tide = clock.tide;
    const label = tide === "basse" ? "MER BASSE"
      : tide === "haute" ? "PLEINE MER"
        : tide === "montante" ? "MONTANTE" : "DESCENDANTE";
    const width = measureText(label) + 22;
    const x = VIEW_WIDTH - width - 8;
    const y = 34;
    ctx.fillStyle = "rgba(10,8,16,0.6)";
    ctx.fillRect(x - 3, y, width + 6, 12);

    // Petite colonne d'eau : le niveau se lit avant le mot.
    const level = clock.tideLevel;
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x + 1, y + 2, 4, 8);
    ctx.fillStyle = tide === "basse" ? PALETTE.sandLight : PALETTE.waterLight;
    const height = Math.max(1, Math.round(level * 8));
    ctx.fillRect(x + 1, y + 10 - height, 4, height);

    drawText(ctx, label, x + 9, y + 1,
      { color: tide === "basse" ? PALETTE.sandLight : PALETTE.stoneLight });
  }

  /** Rose des vents : le rhumb décide si l'on file ou si l'on peine. */
  private drawWind(renderer: Renderer, clock: Clock): void {
    const { ctx } = renderer;
    const label = `VENT ${clock.wind}`;
    const width = measureText(label) + 8;
    const x = VIEW_WIDTH - width - 8;
    const y = 48;
    ctx.fillStyle = "rgba(10,8,16,0.6)";
    ctx.fillRect(x - 3, y, width + 6, 12);
    drawText(ctx, label, x + 2, y + 1, { color: PALETTE.waterLight });
  }

  private drawDemonBadge(renderer: Renderer): void {
    const { ctx } = renderer;
    const label = "DEMI-DÉMON";
    const width = measureText(label);
    ctx.fillStyle = "rgba(58,18,36,0.78)";
    ctx.fillRect(VIEW_WIDTH / 2 - width / 2 - 6, 6, width + 12, 12);
    drawText(ctx, label, VIEW_WIDTH / 2, 7, { color: PALETTE.rose, align: "center" });
  }

  /**
   * Rappel d'objectif, précédé d'une flèche qui montre la direction à prendre.
   * Sans elle, la consigne dit quoi faire mais jamais de quel côté partir.
   */
  private drawObjective(renderer: Renderer, objective: string,
    heading?: { readonly dx: number; readonly dy: number } | null): void {
    const { ctx } = renderer;
    const text = objective.length > 52 ? `${objective.slice(0, 51)}…` : objective;
    const width = measureText(text) + 22;
    ctx.fillStyle = "rgba(10,8,16,0.58)";
    ctx.fillRect(6, 44, width, 13);
    if (heading && (heading.dx !== 0 || heading.dy !== 0)) this.drawCompass(ctx, 13, 50, heading);
    else {
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(11, 48, 4, 4);
    }
    drawText(ctx, text, 22, 45, { color: PALETTE.cream });
  }

  /** Petite flèche de six pixels, orientée vers la région à rejoindre. */
  private drawCompass(ctx: CanvasRenderingContext2D, cx: number, cy: number,
    heading: { readonly dx: number; readonly dy: number }): void {
    const angle = Math.atan2(heading.dy, heading.dx);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = PALETTE.yellow;
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-3, -4);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-3, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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
