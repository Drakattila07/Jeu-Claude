import { describe, expect, it } from "vitest";
import { Camera, type Edge } from "../core/Camera";
import { WORLD_ZONES } from "../data/world";
import { ZoneRegistry } from "../world/Zone";

describe("navigation par écran", () => {
  it("boucle sur quatre zones adjacentes", () => {
    const camera = new Camera({ x: 3, y: 3 });
    const registry = new ZoneRegistry();
    const route: readonly Edge[] = ["west", "south", "east", "north"];
    for (const edge of route) {
      const destination = camera.adjacent(edge);
      expect(registry.canEnter(destination)).toBe(true);
      camera.zone = destination;
    }
    expect(camera.zone).toEqual({ x: 3, y: 3 });
  });

  it("bloque un bord extérieur au lieu de téléporter à l'opposé", () => {
    const camera = new Camera({ x: 0, y: 0 });
    expect(camera.blockedPosition("west", { x: -9, y: 80 })).toEqual({ x: 0, y: 80 });
    expect(camera.blockedPosition("north", { x: 96, y: -9 })).toEqual({ x: 96, y: 0 });
  });

  it("déclare toute la grille 8×7 sans doublon", () => {
    const coordinates = new Set(WORLD_ZONES.map((zone) => `${zone.x},${zone.y}`));
    expect(WORLD_ZONES).toHaveLength(56);
    expect(coordinates.size).toBe(56);
  });
});
