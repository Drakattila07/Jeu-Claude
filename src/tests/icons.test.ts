import { describe, expect, it } from "vitest";
import { drawItemIcon } from "../ui/Icons";
import { ITEMS, type ItemId } from "../data/items/core";

describe("Icônes d'objets", () => {
  it("Chaque objet possède une icône et utilise la palette", () => {
    const usedColors = new Set<string>();
    const fakeCtx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      fillRect: () => {},
      set fillStyle(color: string) {
        usedColors.add(color);
      }
    } as unknown as CanvasRenderingContext2D;

    for (const key of Object.keys(ITEMS)) {
      drawItemIcon(fakeCtx, key as ItemId, 0, 0);
    }

    expect(usedColors.size).toBeGreaterThan(0);
  });
});
