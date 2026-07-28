import { PALETTE } from "../data/palette";
import { ITEMS } from "../data/items/core";
import type { Input } from "../core/Input";
import type { Renderer } from "../core/Renderer";
import type { ZoneCoord } from "../core/Camera";
import type { Inventory } from "../systems/Inventory";
import type { QuestSystem } from "../systems/Quest";
import type { MapScreen } from "./MapScreen";

type MenuTab = "sac" | "carte" | "quête";
const TABS: readonly MenuTab[] = ["sac", "carte", "quête"];

export class Menu {
  active = false;
  private tabIndex = 0;
  open(): void { this.active = true; }

  update(input: Input): void {
    if (input.wasPressed("Start") || input.wasPressed("B")) { this.active = false; return; }
    if (input.wasPressed("Left")) this.tabIndex = (this.tabIndex + TABS.length - 1) % TABS.length;
    if (input.wasPressed("Right")) this.tabIndex = (this.tabIndex + 1) % TABS.length;
  }

  draw(renderer: Renderer, inventory: Inventory, map: MapScreen, quests: QuestSystem, current: ZoneCoord): void {
    if (!this.active) return;
    const { ctx } = renderer;
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(12, 27, 232, 184);
    ctx.strokeStyle = PALETTE.sandLight;
    ctx.strokeRect(13.5, 28.5, 229, 181);
    TABS.forEach((tab, index) => {
      renderer.pixelText(tab.toUpperCase(), 52 + index * 76, 35,
        index === this.tabIndex ? PALETTE.yellow : PALETTE.stoneLight, "center");
    });
    const tab = TABS[this.tabIndex];
    if (tab === "carte") {
      map.draw(renderer, current);
    } else if (tab === "quête") {
      const objective = quests.activeObjective();
      renderer.pixelText(objective?.title ?? "AUCUNE QUÊTE", 24, 64, PALETTE.cream);
      const words = objective?.hint.match(/.{1,32}(?:\s|$)/g) ?? ["Explorez librement."];
      words.slice(0, 4).forEach((line, index) =>
        renderer.pixelText(line.trim(), 24, 84 + index * 13, PALETTE.grassLight));
    } else {
      const entries = inventory.snapshot();
      renderer.pixelText("OBJETS", 24, 58, PALETTE.cream);
      if (entries.length === 0) renderer.pixelText("Le sac est vide.", 24, 77, PALETTE.stoneLight);
      entries.slice(0, 9).forEach((entry, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        renderer.pixelText(`${ITEMS[entry.id].name} ×${entry.count}`, 24 + col * 108, 76 + row * 21,
          index === 0 ? PALETTE.yellow : PALETTE.cream);
      });
    }
    renderer.pixelText("← → changer · C fermer", 128, 192, PALETTE.stoneLight, "center");
  }
}
