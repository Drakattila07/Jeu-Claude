import { describe, expect, it } from "vitest";
import {
  INTERIOR_ENTRY, INTERIOR_EXIT, INTERIOR_HEIGHT, INTERIOR_WIDTH,
  createCastleMap, createCottageMap, createHermitageMap, createTowerMap,
  nearInteriorExit,
} from "../world/Interiors";
import { TileMap } from "../world/TileMap";
import { TileSet, TILE } from "../world/TileSet";

const tileSet = new TileSet();
const ROOMS = [
  ["chaumière", createCottageMap],
  ["ermitage", createHermitageMap],
  ["château", createCastleMap],
  ["tour", createTowerMap],
] as const;

function flood(map: TileMap, start: { x: number; y: number }): Set<number> {
  const seen = new Set<number>([start.y * map.width + start.x]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height || map.isSolid(nx, ny)) continue;
      const key = ny * map.width + nx;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

describe("intérieurs", () => {
  it("ferme chaque pièce sur ses quatre côtés", () => {
    // L'extérieur d'une carte n'est plus bloquant : c'est la ceinture de murs
    // qui contient le joueur, elle doit être complète.
    for (const [name, build] of ROOMS) {
      const map = new TileMap(build(), tileSet);
      for (let x = 0; x < map.width; x += 1) {
        expect(map.isSolid(x, 0), `${name} bord nord ${x}`).toBe(true);
        expect(map.isSolid(x, map.height - 1), `${name} bord sud ${x}`).toBe(true);
      }
      for (let y = 0; y < map.height; y += 1) {
        expect(map.isSolid(0, y), `${name} bord ouest ${y}`).toBe(true);
        expect(map.isSolid(map.width - 1, y), `${name} bord est ${y}`).toBe(true);
      }
    }
  });

  it("place l'entrée sur une case praticable et reliée au mobilier", () => {
    for (const [name, build] of ROOMS) {
      const map = new TileMap(build(), tileSet);
      const tileX = Math.floor(INTERIOR_ENTRY.x / 16);
      const tileY = Math.floor(INTERIOR_ENTRY.y / 16);
      expect(map.isSolid(tileX, tileY), `${name} entrée bloquée`).toBe(false);
      const reachable = flood(map, { x: tileX, y: tileY });
      // Une pièce doit s'explorer : au moins la moitié du sol accessible.
      let free = 0;
      for (let y = 1; y < map.height - 1; y += 1) {
        for (let x = 1; x < map.width - 1; x += 1) if (!map.isSolid(x, y)) free += 1;
      }
      expect(reachable.size / free, `${name} pièce cloisonnée`).toBeGreaterThan(0.9);
    }
  });

  it("meuble chaque pièce avec des objets solides", () => {
    const cottage = new TileMap(createCottageMap(), tileSet);
    expect(cottage.tileAt("terrain", 2, 2)).toBe(TILE.fireplace);
    expect(cottage.isSolid(11, 6)).toBe(true);
    expect(cottage.tileAt("ground", 12, 8)).toBe(TILE.rug);

    const tower = new TileMap(createTowerMap(), tileSet);
    expect(tower.tileAt("terrain", 4, 7)).toBe(TILE.shrineStone);

    const castle = new TileMap(createCastleMap(), tileSet);
    expect(castle.tileAt("terrain", 4, 4)).toBe(TILE.ruinColumn);
    expect(castle.tileAt("decor_above", 8, 1)).toBe(TILE.banner);

    const hermitage = new TileMap(createHermitageMap(), tileSet);
    expect(hermitage.tileAt("terrain", 2, 2)).toBe(TILE.bookshelf);
  });

  it("détecte le seuil de sortie", () => {
    expect(nearInteriorExit(INTERIOR_EXIT)).toBe(true);
    expect(nearInteriorExit({ x: INTERIOR_EXIT.x, y: INTERIOR_EXIT.y - 120 })).toBe(false);
  });

  it("garde des pièces plus grandes que la fenêtre de jeu", () => {
    // La caméra défile aussi à l'intérieur : une pièce plus petite que le
    // cadre laisserait des bandes vides sur les côtés.
    expect(INTERIOR_WIDTH * 16).toBeGreaterThanOrEqual(384);
    expect(INTERIOR_HEIGHT * 16).toBeGreaterThanOrEqual(216);
  });
});
