import { PALETTE } from "../data/palette";
import { ITEMS, itemEffect, type ItemId } from "../data/items/core";
import type { Input } from "../core/Input";
import { VIEW_HEIGHT, VIEW_WIDTH, type Renderer } from "../core/Renderer";
import type { ZoneCoord } from "../core/Camera";
import type { Inventory } from "../systems/Inventory";
import type { QuestSystem } from "../systems/Quest";
import type { MapScreen } from "./MapScreen";
import { drawText, wrapText, LINE_HEIGHT } from "./Font";

type MenuTab = "sac" | "quêtes" | "carte" | "aide";
const TABS: readonly MenuTab[] = ["sac", "quêtes", "carte", "aide"];

const CONTROLS: readonly (readonly [string, string])[] = [
  ["Flèches / WASD", "marcher"],
  ["Espace", "épée — maintenir pour charger"],
  ["Maj", "esquive roulée, invincible"],
  ["X", "parler, fouiller, entrer, embarquer"],
  ["X près d'un lit", "dormir jusqu'au matin"],
  ["C", "utiliser le premier remède"],
  ["F", "forme demi-démon"],
  ["Entrée", "sac, quêtes et carte"],
  ["M", "carte de la vallée"],
  ["Manette", "prise en charge"],
];

export class Menu {
  active = false;
  private tabIndex = 0;
  private cursor = 0;
  private useRequest: ItemId | null = null;

  open(tab: MenuTab = "sac"): void {
    this.active = true;
    this.tabIndex = Math.max(0, TABS.indexOf(tab));
    this.cursor = 0;
  }

  close(): void { this.active = false; }

  /** Récupère et efface la demande d'utilisation d'objet. */
  takeUseRequest(): ItemId | null {
    const request = this.useRequest;
    this.useRequest = null;
    return request;
  }

  update(input: Input, inventory?: Inventory): void {
    if (input.wasPressed("Start") || input.wasPressed("Cancel") || input.wasPressed("Map")) {
      this.active = false;
      return;
    }
    if (input.wasPressed("Left")) {
      this.tabIndex = (this.tabIndex + TABS.length - 1) % TABS.length;
      this.cursor = 0;
    }
    if (input.wasPressed("Right")) {
      this.tabIndex = (this.tabIndex + 1) % TABS.length;
      this.cursor = 0;
    }
    if (TABS[this.tabIndex] !== "sac" || !inventory) return;

    const entries = inventory.snapshot();
    if (entries.length === 0) return;
    if (input.wasPressed("Up")) this.cursor = (this.cursor + entries.length - 1) % entries.length;
    if (input.wasPressed("Down")) this.cursor = (this.cursor + 1) % entries.length;
    this.cursor = Math.min(this.cursor, entries.length - 1);
    if (input.wasPressed("A") || input.wasPressed("B")) {
      const selected = entries[this.cursor];
      if (selected && itemEffect(selected.id)) {
        this.useRequest = selected.id;
        this.active = false;
      }
    }
  }

  draw(renderer: Renderer, inventory: Inventory, map: MapScreen, quests: QuestSystem,
    current: ZoneCoord, target?: ZoneCoord | null, targetLabel?: string, frame = 0): void {
    if (!this.active) return;
    const { ctx } = renderer;
    ctx.save();
    ctx.fillStyle = "rgba(8,10,18,0.9)";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(14, 14, VIEW_WIDTH - 28, VIEW_HEIGHT - 28);
    ctx.strokeStyle = PALETTE.sandLight;
    ctx.lineWidth = 1;
    ctx.strokeRect(14.5, 14.5, VIEW_WIDTH - 29, VIEW_HEIGHT - 29);

    const tabWidth = (VIEW_WIDTH - 40) / TABS.length;
    TABS.forEach((tab, index) => {
      const selected = index === this.tabIndex;
      if (selected) {
        ctx.fillStyle = PALETTE.pineDark;
        ctx.fillRect(20 + tabWidth * index, 20, tabWidth - 4, 14);
      }
      drawText(ctx, tab.toUpperCase(), 20 + tabWidth * (index + 0.5) - 2, 22,
        { color: selected ? PALETTE.yellow : PALETTE.stoneLight, align: "center" });
    });

    const tab = TABS[this.tabIndex];
    if (tab === "carte") map.draw(renderer, current, target, targetLabel, frame);
    else if (tab === "quêtes") this.drawQuests(ctx, quests);
    else if (tab === "aide") this.drawHelp(ctx);
    else this.drawBag(ctx, inventory);

    drawText(ctx, "← → onglets · ↑↓ choisir · X utiliser · Entrée fermer",
      VIEW_WIDTH / 2, VIEW_HEIGHT - 26, { color: PALETTE.stoneLight, align: "center" });
    ctx.restore();
  }

  private drawBag(ctx: CanvasRenderingContext2D, inventory: Inventory): void {
    const entries = inventory.snapshot();
    if (entries.length === 0) {
      drawText(ctx, "Le sac est vide.", VIEW_WIDTH / 2, 96,
        { color: PALETTE.stoneLight, align: "center" });
      drawText(ctx, "Fouillez les buissons et les coffres.", VIEW_WIDTH / 2, 110,
        { color: PALETTE.grassLight, align: "center" });
      return;
    }

    const listTop = 44;
    const rows = Math.min(9, entries.length);
    const scroll = Math.max(0, Math.min(entries.length - rows, this.cursor - 4));
    for (let row = 0; row < rows; row += 1) {
      const index = scroll + row;
      const entry = entries[index]!;
      const definition = ITEMS[entry.id];
      const y = listTop + row * 15;
      const selected = index === this.cursor;
      if (selected) {
        ctx.fillStyle = PALETTE.pineDark;
        ctx.fillRect(24, y - 2, 176, 14);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(24, y - 2, 2, 14);
      }
      drawText(ctx, definition.name, 32, y, { color: selected ? PALETTE.cream : PALETTE.stoneLight });
      drawText(ctx, `×${entry.count}`, 194, y,
        { color: selected ? PALETTE.yellow : PALETTE.stoneDark, align: "right" });
    }

    // Fiche détaillée de l'objet pointé, à droite.
    const selected = entries[this.cursor];
    if (!selected) return;
    const definition = ITEMS[selected.id];
    const panelX = 212;
    ctx.fillStyle = "rgba(16,20,32,0.92)";
    ctx.fillRect(panelX, 42, VIEW_WIDTH - panelX - 22, 128);
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.strokeRect(panelX + 0.5, 42.5, VIEW_WIDTH - panelX - 23, 127);
    drawText(ctx, definition.name, panelX + 10, 50, { color: PALETTE.yellow });
    wrapText(definition.description, VIEW_WIDTH - panelX - 42).slice(0, 5).forEach((line, index) => {
      drawText(ctx, line, panelX + 10, 68 + index * LINE_HEIGHT, { color: PALETTE.cream });
    });
    const effect = itemEffect(selected.id);
    if (effect) {
      const parts: string[] = [];
      if (effect.heal) parts.push(`+${effect.heal} coeurs`);
      if (effect.stamina) parts.push(`+${effect.stamina} élan`);
      drawText(ctx, parts.join("  ·  "), panelX + 10, 134, { color: PALETTE.leafLight });
      drawText(ctx, "X pour consommer", panelX + 10, 148, { color: PALETTE.stoneLight });
    } else {
      drawText(ctx, "Objet de quête", panelX + 10, 134, { color: PALETTE.stoneDark });
    }
  }

  private drawQuests(ctx: CanvasRenderingContext2D, quests: QuestSystem): void {
    const objectives = quests.activeObjectives(4);
    drawText(ctx, "JOURNAL", 28, 42, { color: PALETTE.yellow });
    if (objectives.length === 0) {
      drawText(ctx, "Aucune quête active.", 28, 66, { color: PALETTE.stoneLight });
      drawText(ctx, "La vallée s'explore aussi sans consigne.", 28, 80, { color: PALETTE.grassLight });
      return;
    }
    objectives.forEach((objective, index) => {
      const y = 62 + index * 34;
      ctx.fillStyle = "rgba(16,20,32,0.72)";
      ctx.fillRect(24, y - 4, VIEW_WIDTH - 48, 30);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(24, y - 4, 2, 30);
      drawText(ctx, objective.title, 32, y, { color: PALETTE.cream });
      drawText(ctx, `${objective.step}/${objective.stepCount}`, VIEW_WIDTH - 32, y,
        { color: PALETTE.yellow, align: "right" });
      drawText(ctx, wrapText(objective.hint, VIEW_WIDTH - 90)[0] ?? objective.hint, 38, y + 13,
        { color: PALETTE.grassLight });
      if (objective.targetCount > 1) {
        drawText(ctx, `${objective.progress}/${objective.targetCount}`, VIEW_WIDTH - 32, y + 13,
          { color: PALETTE.stoneLight, align: "right" });
      }
    });
  }

  private drawHelp(ctx: CanvasRenderingContext2D): void {
    drawText(ctx, "COMMANDES", 28, 42, { color: PALETTE.yellow });
    CONTROLS.forEach(([key, label], index) => {
      const y = 62 + index * 15;
      drawText(ctx, key, 32, y, { color: PALETTE.cream });
      drawText(ctx, label, 164, y, { color: PALETTE.grassLight });
    });
  }
}
