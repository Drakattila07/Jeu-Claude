import { describe, expect, it } from "vitest";
import { Camera, type Edge } from "../core/Camera";
import { WORLD_COLUMNS, WORLD_ROWS, WORLD_ZONES, isOpenSea } from "../data/world";
import { ZoneRegistry } from "../world/Zone";

describe("navigation entre régions", () => {
  it("boucle sur quatre régions adjacentes", () => {
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
    expect(camera.blockedPosition("west", { x: -9, y: 160 })).toEqual({ x: 0, y: 160 });
    expect(camera.blockedPosition("north", { x: 200, y: -9 })).toEqual({ x: 200, y: 0 });
  });

  it("déclare toute la grille sans trou ni doublon", () => {
    const coordinates = new Set(WORLD_ZONES.map((zone) => `${zone.x},${zone.y}`));
    expect(WORLD_ZONES).toHaveLength(WORLD_COLUMNS * WORLD_ROWS);
    expect(coordinates.size).toBe(WORLD_COLUMNS * WORLD_ROWS);
    for (let y = 0; y < WORLD_ROWS; y += 1) {
      for (let x = 0; x < WORLD_COLUMNS; x += 1) {
        expect(coordinates.has(`${x},${y}`), `région ${x},${y} manquante`).toBe(true);
      }
    }
  });

  it("garde un identifiant unique par région", () => {
    const ids = WORLD_ZONES.map((zone) => zone.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ne classe en haute mer que des régions marines ou volcaniques", () => {
    const openSea = WORLD_ZONES.filter((zone) => isOpenSea(zone));
    expect(openSea.length).toBeGreaterThan(0);
    for (const zone of openSea) {
      expect(zone.biome === "sea" || zone.biome === "volcano",
        `${zone.id} n'est pas une région du large`).toBe(true);
    }
  });
});
