import { PALETTE } from "../data/palette";
import type { Renderer } from "../core/Renderer";
import type { Player } from "../entities/Player";
import type { Clock } from "../core/Clock";

export class HUD {
  draw(renderer: Renderer, player: Player, clock: Clock, zoneName: string, objective?: string): void {
    const { ctx } = renderer;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, 256, 22);
    for (let index = 0; index < player.maxHearts / 2; index += 1) {
      const x = 7 + index * 13;
      const units = Math.max(0, Math.min(2, player.hearts - index * 2));
      ctx.fillStyle = units === 0 ? PALETTE.stoneDark : PALETTE.red;
      ctx.fillRect(x + 2, 5, 7, 6);
      ctx.fillRect(x + 3, 11, 5, 3);
      if (units === 1) {
        ctx.fillStyle = PALETTE.stoneDark;
        ctx.fillRect(x + 6, 5, 3, 7);
      }
    }
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(52, 6, 7, 7);
    renderer.pixelText(String(player.rupees).padStart(3, "0"), 62, 5, PALETTE.cream);
    renderer.pixelText(player.isDemon ? "DEMI-DÉMON" : zoneName.slice(0, 16), 128, 5,
      player.isDemon ? PALETTE.rose : PALETTE.grassLight, "center");
    renderer.pixelText(`${clock.weather === "rain" ? "R" : "·"} ${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`,
      249, 5, PALETTE.cream, "right");
    if (objective) {
      ctx.fillStyle = PALETTE.night;
      ctx.globalAlpha = 0.88;
      ctx.fillRect(0, 22, 256, 13);
      ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(4, 26, 4, 4);
      renderer.pixelText(objective.slice(0, 39), 12, 23, PALETTE.cream);
    }
  }
}
