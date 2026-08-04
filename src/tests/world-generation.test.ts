import { describe, expect, it } from "vitest";
import { WORLD_ZONES, type Biome } from "../data/world";
import { INTERACTABLES } from "../data/interactables";
import { createZoneMap } from "../world/ZoneMapFactory";
import { TileMap } from "../world/TileMap";
import { TileSet, TILE } from "../world/TileSet";
import { EDGES, gatewayFor, neighbourOf, oppositeEdge } from "../world/WorldGen";
import { ZONE_TILES_X, ZONE_TILES_Y } from "../core/Renderer";
import type { Edge } from "../core/Camera";

const tileSet = new TileSet();
const cache = new Map<string, TileMap>();

function mapFor(zoneId: string): TileMap {
  const cached = cache.get(zoneId);
  if (cached) return cached;
  const zone = WORLD_ZONES.find((candidate) => candidate.id === zoneId)!;
  const map = new TileMap(createZoneMap(zone), tileSet);
  cache.set(zoneId, map);
  return map;
}

/** Cases ouvertes sur un bord donné, vues depuis l'intérieur de la zone. */
function openingsOn(map: TileMap, edge: Edge): readonly number[] {
  const open: number[] = [];
  if (edge === "west" || edge === "east") {
    const x = edge === "west" ? 0 : map.width - 1;
    for (let y = 0; y < map.height; y += 1) if (!map.isSolid(x, y)) open.push(y);
  } else {
    const y = edge === "north" ? 0 : map.height - 1;
    for (let x = 0; x < map.width; x += 1) if (!map.isSolid(x, y)) open.push(x);
  }
  return open;
}

function floodFill(map: TileMap, start: { x: number; y: number }): Set<number> {
  const seen = new Set<number>();
  if (map.isSolid(start.x, start.y)) return seen;
  const queue = [start];
  seen.add(start.y * map.width + start.x);
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      if (map.isSolid(nx, ny)) continue;
      const key = ny * map.width + nx;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

describe("génération du monde", () => {
  it("donne à chaque zone la taille attendue", () => {
    const map = mapFor("place_puits");
    expect(map.width).toBe(ZONE_TILES_X);
    expect(map.height).toBe(ZONE_TILES_Y);
  });

  it("aligne chaque passage avec celui de la zone voisine", () => {
    // C'est l'invariant qui rend le monde traversable : deux écrans mitoyens
    // tirent leur ouverture du même bord partagé, donc au même endroit.
    const mismatches: string[] = [];
    for (const zone of WORLD_ZONES) {
      for (const edge of EDGES) {
        const neighbour = neighbourOf(zone, edge);
        if (!neighbour) continue;
        const here = gatewayFor(zone, edge);
        const there = gatewayFor(neighbour, oppositeEdge(edge));
        if (!here || !there) { mismatches.push(`${zone.id}/${edge}: passage manquant`); continue; }
        if (here.start !== there.start || here.end !== there.end) {
          mismatches.push(`${zone.id}/${edge}: ${here.start}-${here.end} ≠ ${there.start}-${there.end}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("ouvre réellement la ceinture à l'emplacement annoncé", () => {
    const closed: string[] = [];
    for (const zone of WORLD_ZONES) {
      const map = mapFor(zone.id);
      for (const edge of EDGES) {
        const gateway = gatewayFor(zone, edge);
        if (!gateway) continue;
        const open = openingsOn(map, edge);
        if (open.length === 0) { closed.push(`${zone.id}/${edge}: mur plein`); continue; }
        const inside = open.filter((offset) => offset >= gateway.start && offset <= gateway.end);
        if (inside.length === 0) closed.push(`${zone.id}/${edge}: ouverture hors passage`);
      }
    }
    expect(closed).toEqual([]);
  });

  it("relie toutes les sorties entre elles dans chaque zone", () => {
    // On ne doit jamais pouvoir entrer dans une région et s'y retrouver
    // enfermé — c'est exactement ce qui bloquait la partie.
    const trapped: string[] = [];
    for (const zone of WORLD_ZONES) {
      const map = mapFor(zone.id);
      const entries: { x: number; y: number }[] = [];
      for (const edge of EDGES) {
        if (!neighbourOf(zone, edge)) continue;
        for (const offset of openingsOn(map, edge)) {
          if (edge === "west") entries.push({ x: 1, y: offset });
          else if (edge === "east") entries.push({ x: map.width - 2, y: offset });
          else if (edge === "north") entries.push({ x: offset, y: 1 });
          else entries.push({ x: offset, y: map.height - 2 });
        }
      }
      const reachable = entries.filter((point) => !map.isSolid(point.x, point.y));
      if (reachable.length === 0) { trapped.push(`${zone.id}: aucune entrée praticable`); continue; }
      const seen = floodFill(map, reachable[0]!);
      const isolated = reachable.filter((point) => !seen.has(point.y * map.width + point.x));
      if (isolated.length > 0) {
        trapped.push(`${zone.id}: ${isolated.length} sortie(s) isolée(s)`);
      }
    }
    expect(trapped).toEqual([]);
  });

  it("laisse assez d'espace praticable pour se déplacer", () => {
    const cramped: string[] = [];
    for (const zone of WORLD_ZONES) {
      const map = mapFor(zone.id);
      let free = 0;
      for (let y = 1; y < map.height - 1; y += 1) {
        for (let x = 1; x < map.width - 1; x += 1) if (!map.isSolid(x, y)) free += 1;
      }
      const ratio = free / ((map.width - 2) * (map.height - 2));
      if (ratio < 0.35) cramped.push(`${zone.id}: ${Math.round(ratio * 100)}% libre`);
    }
    expect(cramped).toEqual([]);
  });

  it("est déterministe : deux générations donnent la même carte", () => {
    const zone = WORLD_ZONES.find((candidate) => candidate.id === "bosquet_souches")!;
    const first = JSON.stringify(createZoneMap(zone));
    const second = JSON.stringify(createZoneMap(zone));
    expect(first).toBe(second);
  });

  it("donne à chaque biome un sol qui lui est propre", () => {
    // `peaks` reprenait tuile pour tuile le sol de `forest`, et `cliffs` celui
    // de `ruins` : les sommets se rendaient en herbe verte.
    const biomes = [...new Set(WORLD_ZONES.map((zone) => zone.biome))];
    const signatures = new Map<string, Biome>();
    const clashes: string[] = [];
    for (const biome of biomes) {
      const zone = WORLD_ZONES.find((candidate) => candidate.biome === biome)!;
      const map = mapFor(zone.id);
      const counts = new Map<number, number>();
      for (let y = 0; y < map.height; y += 1) {
        for (let x = 0; x < map.width; x += 1) {
          const tile = map.tileAt("ground", x, y);
          counts.set(tile, (counts.get(tile) ?? 0) + 1);
        }
      }
      const total = map.width * map.height;
      const signature = [...counts.entries()]
        .filter(([, count]) => count / total >= 0.18)
        .map(([tile]) => tile)
        .sort((a, b) => a - b)
        .join(",");
      const previous = signatures.get(signature);
      if (previous) clashes.push(`${previous} ↔ ${biome}`);
      else signatures.set(signature, biome);
    }
    expect(clashes).toEqual([]);
  });

  it("étage les sommets de la neige vers la pelouse d'altitude", () => {
    const map = mapFor("cimes_brume_ouest");
    const rowHas = (row: number, tile: number): boolean => {
      for (let x = 0; x < map.width; x += 1) if (map.tileAt("ground", x, row) === tile) return true;
      return false;
    };
    expect(rowHas(2, TILE.snow)).toBe(true);
    expect(rowHas(map.height - 3, TILE.alpineGrass)).toBe(true);
    expect(rowHas(map.height - 3, TILE.snow)).toBe(false);
  });

  it("garde les sols praticables et les reliefs bloquants", () => {
    const walkable = [TILE.scree, TILE.snow, TILE.alpineGrass, TILE.heather, TILE.gravel,
      TILE.cobble, TILE.dryGrass, TILE.marshGrass, TILE.shoreSand, TILE.tallGrass,
      TILE.pebbles, TILE.snowdrift, TILE.dock, TILE.wheat];
    for (const id of walkable) expect(tileSet.properties(id).solid).toBeUndefined();
    for (const id of [TILE.boulder, TILE.crag, TILE.snowPine, TILE.hedge, TILE.ruinColumn,
      TILE.deadTree, TILE.log, TILE.barrel, TILE.crate]) {
      expect(tileSet.properties(id).solid).toBe(true);
    }
  });

  it("dresse un lieu remarquable là où le contenu annonce une porte", () => {
    for (const [zoneId, doorId] of [
      ["portail_scelle", "castle_gate"],
      ["cabane_iris", "witch_tower_door"],
      ["ermitage_gorm", "hermitage_door"],
    ] as const) {
      const map = mapFor(zoneId);
      const door = INTERACTABLES.find((entry) => entry.id === doorId)!;
      const tileX = Math.floor(door.x / 16);
      const tileY = Math.floor(door.y / 16);
      expect(map.tileAt("terrain", tileX, tileY)).toBe(TILE.door);
      // On doit pouvoir se planter devant pour l'ouvrir.
      expect(map.isSolid(tileX, tileY + 1)).toBe(false);
    }
  });

  it("dégage l'arène du boss", () => {
    const map = mapFor("boss_arena");
    for (let y = 8; y < map.height - 8; y += 1) {
      for (let x = 8; x < map.width - 8; x += 1) expect(map.isSolid(x, y)).toBe(false);
    }
  });
});
