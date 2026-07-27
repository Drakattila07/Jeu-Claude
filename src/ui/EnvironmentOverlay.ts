import { PALETTE } from "../data/palette";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/Renderer";
import type { Weather } from "../core/Clock";
import type { Vec2 } from "../entities/Entity";

export class EnvironmentOverlay {
  draw(
    ctx: CanvasRenderingContext2D,
    frame: number,
    player: Readonly<Vec2>,
    options: { readonly night: boolean; readonly dense: boolean; readonly weather: Weather },
  ): void {
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
  }
}
