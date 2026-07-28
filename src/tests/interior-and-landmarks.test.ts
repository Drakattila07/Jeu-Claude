import { describe, expect, it } from "vitest";
import {
  createCastleMap,
  createCottageMap,
  createHermitageMap,
  nearCottageExit,
} from "../world/CottageInterior";
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
    expect(room.tileAt("ground", 5, 5)).toBe(32);
    expect(room.tileAt("terrain", 2, 3)).toBe(41);
    expect(room.tileAt("terrain", 12, 3)).toBe(41);
    expect(room.tileAt("terrain", 7, 6)).toBe(41);
    expect(room.isSolid(7, 12)).toBe(true);
    expect(nearCottageExit({ x: 120, y: 176 })).toBe(true);
  });

  it("construit un intérieur distinct pour l'ermitage", () => {
    const room = new TileMap(createHermitageMap(), new TileSet());
    expect(room.tileAt("ground", 5, 5)).toBe(31);
    expect(room.tileAt("terrain", 2, 3)).toBe(41);
    expect(room.tileAt("terrain", 10, 3)).toBe(41);
    expect(room.isSolid(7, 12)).toBe(true);
  });

  it("construit une grande salle de château praticable", () => {
    const room = new TileMap(createCastleMap(), new TileSet());
    expect(room.tileAt("ground", 8, 7)).toBe(31);
    expect(room.isSolid(3, 3)).toBe(true);
    expect(room.isSolid(8, 7)).toBe(false);
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

  it("conserve une arène de sommet dégagée pour le boss", () => {
    const arena = new TileMap(createProceduralMap(zone("boss_arena")), new TileSet());
    for (let y = 4; y <= 9; y += 1) {
      for (let x = 5; x <= 10; x += 1) expect(arena.isSolid(x, y)).toBe(false);
    }
  });

  it("dessine une façade fortifiée et sa porte au Château de Cendre", () => {
    const castle = new TileMap(createProceduralMap(zone("portail_scelle")), new TileSet());
    expect(castle.tileAt("terrain", 3, 3)).toBe(19);
    expect(castle.tileAt("terrain", 7, 5)).toBe(14);
    expect(castle.isSolid(7, 5)).toBe(true);
  });

  it("densifie la forêt avec des arbres sur le sentier et des contreforts rocheux", () => {
    const forest = new TileMap(createProceduralMap(zone("lisiere_sentier")), new TileSet());
    expect([forest.tileAt("terrain", 7, 4), forest.tileAt("terrain", 8, 4)]).toContain(6);
    expect(forest.tileAt("terrain", 2, 2)).toBe(19);
  });
});
