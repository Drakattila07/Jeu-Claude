import { PALETTE } from "../data/palette";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/Renderer";
import type { Weather } from "../core/Clock";
import type { Biome } from "../data/world";
import type { Vec2 } from "../entities/Entity";

export class EnvironmentOverlay {
  draw(
    ctx: CanvasRenderingContext2D,
    frame: number,
    player: Readonly<Vec2>,
    options: {
      readonly night: boolean;
      readonly dense: boolean;
      readonly weather: Weather;
      readonly biome?: Biome;
    },
  ): void {
    this.drawBiomeAtmosphere(ctx, frame, options.biome);
    if (options.night || options.dense) {
      const radius = options.dense ? 48 : 72;
      const mask = document.createElement("canvas");
      mask.width = VIEW_WIDTH;
      mask.height = VIEW_HEIGHT;
      const maskCtx = mask.getContext("2d");
      if (maskCtx) {
        maskCtx.fillStyle = PALETTE.night;
        maskCtx.globalAlpha = options.dense ? 0.88 : 0.6;
        maskCtx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        maskCtx.globalCompositeOperation = "destination-out";
        const gradient = maskCtx.createRadialGradient(player.x + 8, player.y + 8, 8,
          player.x + 8, player.y + 8, radius);
        gradient.addColorStop(0, "rgba(0,0,0,1)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        maskCtx.fillStyle = gradient;
        maskCtx.globalAlpha = 1;
        maskCtx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        ctx.drawImage(mask, 0, 0);
      }
    }
    if (options.weather === "rain") {
      ctx.save();
      ctx.strokeStyle = PALETTE.waterLight;
      ctx.globalAlpha = 0.75;
      for (let index = 0; index < 36; index += 1) {
        const x = (index * 47 + frame * 3) % (VIEW_WIDTH + 16) - 8;
        const y = (index * 29 + frame * 5) % VIEW_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 7);
        ctx.stroke();
      }
      ctx.restore();
    }
    this.drawVignette(ctx);
  }

  private drawBiomeAtmosphere(ctx: CanvasRenderingContext2D, frame: number, biome?: Biome): void {
    ctx.save();
    if (biome === "lake" || biome === "river" || biome === "canal" || biome === "reeds") {
      ctx.globalAlpha = 0.55;
      for (let index = 0; index < 9; index += 1) {
        const x = (index * 41 + Math.floor(frame / 3)) % VIEW_WIDTH;
        const y = 30 + (index * 29) % 166;
        ctx.fillStyle = PALETTE.waterLight;
        ctx.fillRect(x, y, 4, 1);
        ctx.fillRect(x + 1, y - 1, 2, 1);
      }
    } else if (biome === "forest" || biome === "peaks" || biome === "witch") {
      ctx.globalAlpha = 0.45;
      for (let index = 0; index < 12; index += 1) {
        const drift = Math.floor(frame / (5 + index % 3));
        const x = (index * 37 + drift) % VIEW_WIDTH;
        const y = 26 + (index * 23 + Math.floor(drift / 3)) % 175;
        ctx.fillStyle = index % 3 === 0 ? PALETTE.grassLight : PALETTE.leafLight;
        ctx.fillRect(x, y, index % 2 === 0 ? 2 : 1, 1);
      }
    } else if (biome === "marsh") {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = PALETTE.cream;
      for (let band = 0; band < 4; band += 1) {
        const x = ((frame + band * 67) % 190) - 24;
        ctx.fillRect(x, 62 + band * 37, 72, 2);
        ctx.fillRect(x + 18, 64 + band * 37, 94, 1);
      }
    } else if (biome === "ruins" || biome === "cliffs") {
      ctx.globalAlpha = 0.35;
      for (let index = 0; index < 8; index += 1) {
        const x = (index * 53 + Math.floor(frame / 4)) % VIEW_WIDTH;
        const y = 42 + (index * 31) % 148;
        ctx.fillStyle = PALETTE.stoneLight;
        ctx.fillRect(x, y, 1, 1);
      }
    } else if (biome === "village") {
      // Fumée de cheminée, lente et montante : la place manquait de vie
      // ambiante alors que c'est le lieu où l'on s'attarde le plus.
      ctx.globalAlpha = 0.3;
      for (let index = 0; index < 6; index += 1) {
        const rise = (Math.floor(frame / 6) + index * 47) % 150;
        const x = (index * 61 + 20) % VIEW_WIDTH;
        const y = VIEW_HEIGHT - 20 - rise;
        ctx.fillStyle = index % 2 === 0 ? PALETTE.cream : PALETTE.sandLight;
        ctx.fillRect(x, y, 1, 2);
      }
    } else if (biome === "fields") {
      // Duvet et pollen, chassés à l'horizontale par le vent des champs.
      ctx.globalAlpha = 0.4;
      for (let index = 0; index < 10; index += 1) {
        const x = (index * 43 + frame) % (VIEW_WIDTH + 12);
        const y = 34 + (index * 19) % 158;
        ctx.fillStyle = index % 3 === 0 ? PALETTE.cream : PALETTE.grassLight;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.restore();
  }

  private drawVignette(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 22, 2, VIEW_HEIGHT - 22);
    ctx.fillRect(VIEW_WIDTH - 2, 22, 2, VIEW_HEIGHT - 22);
    ctx.fillRect(0, VIEW_HEIGHT - 2, VIEW_WIDTH, 2);
    ctx.globalAlpha = 0.08;
    ctx.fillRect(2, 22, 2, VIEW_HEIGHT - 24);
    ctx.fillRect(VIEW_WIDTH - 4, 22, 2, VIEW_HEIGHT - 24);
    ctx.restore();
  }
}
