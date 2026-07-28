import { describe, expect, it } from "vitest";
import { MapScreen } from "../ui/MapScreen";

describe("carte", () => {
  it("révèle chaque zone une seule fois et calcule le pourcentage", () => {
    const map = new MapScreen();
    map.reveal({ x: 3, y: 3 });
    map.reveal({ x: 3, y: 3 });
    map.reveal({ x: 2, y: 3 });
    expect(map.exploredCount).toBe(2);
    expect(map.completion).toBe(5);
  });
});
