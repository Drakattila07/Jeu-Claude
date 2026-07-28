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
      const objectives = quests.activeObjectives(3);
      renderer.pixelText("JOURNAL DES QUÊTES", 24, 55, PALETTE.yellow);
      if (objectives.length === 0) {
        renderer.pixelText("Aucune quête active.", 24, 79, PALETTE.stoneLight);
        renderer.pixelText("Explorez la vallée librement.", 24, 94, PALETTE.grassLight);
      }
      objectives.forEach((objective, index) => {
        const y = 73 + index * 39;
        renderer.pixelText(`› ${objective.title.slice(0, 22)}`, 24, y, PALETTE.cream);
        renderer.pixelText(`${objective.step}/${objective.stepCount}`, 229, y, PALETTE.yellow, "right");
        const words = objective.hint.match(/.{1,34}(?:\s|$)/g) ?? [objective.hint];
        renderer.pixelText(words[0]?.trim() ?? "", 31, y + 13, PALETTE.grassLight);
        if (objective.targetCount > 1) {
          renderer.pixelText(`Progression ${objective.progress}/${objective.targetCount}`,
            31, y + 25, PALETTE.stoneLight);
        }
      });
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
