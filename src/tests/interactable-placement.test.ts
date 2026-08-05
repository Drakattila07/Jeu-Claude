import { describe, expect, it } from "vitest";
import { INTERACTABLES } from "../data/interactables";
import { WORLD_ZONES } from "../data/world";
import { TileMap } from "../world/TileMap";
import { TileSet } from "../world/TileSet";
import { createZoneMap } from "../world/ZoneMapFactory";
import { isNavalZone } from "../world/WorldGen";
import { ZONE_HEIGHT, ZONE_WIDTH, TILE_SIZE } from "../core/Renderer";

const tileSet = new TileSet();
const mapCache = new Map<string, TileMap>();

function mapFor(zoneId: string): TileMap {
  const cached = mapCache.get(zoneId);
  if (cached) return cached;
  const zone = WORLD_ZONES.find((candidate) => candidate.id === zoneId)!;
  const map = new TileMap(createZoneMap(zone), tileSet);
  mapCache.set(zoneId, map);
  return map;
}

/** Le joueur interagit à 34 px : il lui faut une case libre pour approcher. */
function hasFreeNeighbour(map: TileMap, x: number, y: number): boolean {
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (!map.isSolid(tileX + dx, tileY + dy)) return true;
    }
  }
  return false;
}

function firstOpenTile(map: TileMap): { x: number; y: number } | null {
  for (let y = 1; y < map.height - 1; y += 1) {
    for (let x = 1; x < map.width - 1; x += 1) if (!map.isSolid(x, y)) return { x, y };
  }
  return null;
}

function openNeighbour(map: TileMap, x: number, y: number): { x: number; y: number } | null {
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    if (!map.isSolid(x + dx, y + dy)) return { x: x + dx, y: y + dy };
  }
  return null;
}

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

describe("placement des objets du monde", () => {
  it("garde chaque objet dans les limites de sa zone", () => {
    const offscreen = INTERACTABLES.filter((entry) =>
      entry.x < TILE_SIZE || entry.x > ZONE_WIDTH - TILE_SIZE * 2
      || entry.y < TILE_SIZE || entry.y > ZONE_HEIGHT - TILE_SIZE * 2);
    expect(offscreen.map((entry) => `${entry.id} (${entry.x},${entry.y})`)).toEqual([]);
  });

  it("laisse toujours une case libre pour venir interagir", () => {
    // Un déclencheur muré rendrait sa quête définitivement impossible.
    const unreachable = INTERACTABLES.filter((entry) => {
      const map = mapFor(entry.zone);
      // Une porte est pleine par nature : c'est devant elle qu'il faut de la place.
      const y = entry.kind === "door" ? entry.y + TILE_SIZE : entry.y;
      return !hasFreeNeighbour(map, entry.x, y);
    });
    expect(unreachable.map((entry) => `${entry.id}@${entry.zone}`)).toEqual([]);
  });

  it("relie chaque objet au reste de sa zone", () => {
    const isolated: string[] = [];
    for (const entry of INTERACTABLES) {
      const zone = WORLD_ZONES.find((candidate) => candidate.id === entry.zone)!;
      const map = mapFor(entry.zone);
      const tileX = Math.floor(entry.x / TILE_SIZE);
      const tileY = Math.floor(entry.y / TILE_SIZE) + (entry.kind === "door" ? 1 : 0);
      const target = map.isSolid(tileX, tileY)
        ? openNeighbour(map, tileX, tileY)
        : { x: tileX, y: tileY };
      if (!target) { isolated.push(`${entry.id}@${entry.zone} : muré`); continue; }

      if (isNavalZone(zone)) {
        // Sur une île, on n'arrive pas à pied : ce qui compte est que la terre
        // qui porte l'objet touche quelque part une eau navigable, pour qu'on
        // puisse y échouer la barque et finir à pied.
        const island = flood(map, target);
        const beachable = [...island].some((key) => {
          const cx = key % map.width;
          const cy = Math.floor(key / map.width);
          return [[1, 0], [-1, 0], [0, 1], [0, -1]]
            .some(([dx, dy]) => map.isSailable(cx + dx!, cy + dy!));
        });
        if (!beachable) isolated.push(`${entry.id}@${entry.zone} : inaccessible par la mer`);
        continue;
      }

      const start = firstOpenTile(map);
      if (!start) { isolated.push(`${entry.id}: zone entièrement pleine`); continue; }
      const reachable = flood(map, start);
      if (!reachable.has(target.y * map.width + target.x)) {
        isolated.push(`${entry.id}@${entry.zone}`);
      }
    }
    expect(isolated).toEqual([]);
  });

  it("n'empile pas deux objets sur la même case", () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const entry of INTERACTABLES) {
      const key = `${entry.zone}:${Math.floor(entry.x / TILE_SIZE)},${Math.floor(entry.y / TILE_SIZE)}`;
      const previous = seen.get(key);
      if (previous) collisions.push(`${previous} ↔ ${entry.id}`);
      else seen.set(key, entry.id);
    }
    expect(collisions).toEqual([]);
  });

  it("donne un identifiant unique à chaque objet", () => {
    const ids = INTERACTABLES.map((entry) => entry.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
