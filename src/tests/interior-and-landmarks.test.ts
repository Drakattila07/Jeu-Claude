import { describe, expect, it } from "vitest";
import { createCottageMap, nearCottageExit } from "../world/CottageInterior";
import { TileMap } from "../world/TileMap";
import { TileSet } from "../world/TileSet";
import { createProceduralMap } from "../world/ZoneMapFactory";
import { WORLD_ZONES } from "../data/world";

function zone(id: string) {
  return WORLD_ZONES.find((entry) => entry.id === id)!;
}

describe("maison et lieux remarquables", () => {
  it("rend la porte solide et meuble une salle séparée", () => {
    const tileSet = new TileSet();
    const room = new TileMap(createCottageMap(), tileSet);
    expect(tileSet.properties(14).solid).toBe(true);
    expect(room.tileAt("terrain", 2, 3)).toBe(35);
    expect(room.tileAt("terrain", 12, 3)).toBe(36);
    expect(room.tileAt("terrain", 7, 6)).toBe(37);
    expect(room.tileAt("terrain", 7, 1)).toBe(38);
    expect(room.isSolid(7, 12)).toBe(true);
    expect(nearCottageExit({ x: 120, y: 176 })).toBe(true);
  });

  it("fait réellement serpenter le fleuve", () => {
    const river = new TileMap(createProceduralMap(zone("riviere_gue")), new TileSet());
    const waterCenters = [2, 4, 8, 10].map((y) => {
      for (let x = 1; x < 15; x += 1) if (river.tileAt("ground", x, y) === 5) return x;
      return -1;
    });
    expect(new Set(waterCenters).size).toBeGreaterThan(2);
  });

  it("donne à l'ermitage une maison identifiable au milieu des falaises", () => {
    const hermitage = new TileMap(createProceduralMap(zone("ermitage_gorm")), new TileSet());
    expect(hermitage.tileAt("terrain", 10, 2)).toBe(8);
    expect(hermitage.tileAt("terrain", 10, 4)).toBe(9);
    expect(hermitage.tileAt("terrain", 11, 4)).toBe(14);
    expect(hermitage.tileAt("terrain", 2, 4)).toBe(29);
  });
});
