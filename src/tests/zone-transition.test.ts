import { describe, expect, it } from "vitest";
import { WORLD_ZONES } from "../data/world";
import { createZoneMap } from "../world/ZoneMapFactory";
import { TileMap } from "../world/TileMap";
import { TileSet } from "../world/TileSet";
import { Camera, type Edge } from "../core/Camera";
import { EDGES, gatewayFor, isNavalZone, neighbourOf, oppositeEdge } from "../world/WorldGen";
import { collides, resolveOverlap } from "../world/Collision";
import { ZONE_HEIGHT, ZONE_WIDTH, TILE_SIZE } from "../core/Renderer";

/** Boîte de collision du personnage, reprise de `Player`. */
const HITBOX = { x: 3, y: 9, width: 10, height: 7 };

const tileSet = new TileSet();
const maps = new Map<string, TileMap>();

function mapFor(zoneId: string): TileMap {
  const cached = maps.get(zoneId);
  if (cached) return cached;
  const zone = WORLD_ZONES.find((candidate) => candidate.id === zoneId)!;
  const map = new TileMap(createZoneMap(zone), tileSet);
  maps.set(zoneId, map);
  return map;
}

function solidOf(map: TileMap, naval: boolean) {
  return (x: number, y: number): boolean => map.solidFor(x, y, naval);
}

/** Cases atteignables depuis un point, en quatre directions. */
function flood(map: TileMap, start: { x: number; y: number }, naval: boolean): Set<number> {
  const blocked = solidOf(map, naval);
  const seen = new Set<number>();
  if (blocked(start.x, start.y)) return seen;
  seen.add(start.y * map.width + start.x);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height || blocked(nx, ny)) continue;
      const key = ny * map.width + nx;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/**
 * Toutes les traversées possibles : chaque zone, chaque bord, et plusieurs
 * hauteurs d'arrivée — c'est exactement ce que fait un joueur qui longe une
 * frontière en essayant de passer.
 */
interface Crossing {
  from: string; to: string; edge: Edge;
  entry: { x: number; y: number };
  /** Une côte se franchit à la barque, même en venant de la terre. */
  naval: boolean;
  /** Terre d'un côté, mer de l'autre : on arrive dans une crique. */
  coastal: boolean;
  /** La région d'arrivée se parcourt-elle à la barque ? */
  toNaval: boolean;
}

function crossings(): readonly Crossing[] {
  const result: Crossing[] = [];
  const camera = new Camera();
  for (const zone of WORLD_ZONES) {
    for (const edge of EDGES) {
      const neighbour = neighbourOf(zone, edge);
      if (!neighbour) continue;
      const gateway = gatewayFor(neighbour, oppositeEdge(edge)) ?? undefined;
      const along = edge === "west" || edge === "east" ? ZONE_HEIGHT : ZONE_WIDTH;
      // On teste toute la longueur du bord, pas seulement son milieu.
      for (let step = 1; step < 10; step += 1) {
        const offset = (along * step) / 10;
        const current = edge === "west" || edge === "east"
          ? { x: 0, y: offset }
          : { x: offset, y: 0 };
        result.push({
          from: zone.id, to: neighbour.id, edge,
          entry: camera.enterPosition(edge, current, gateway),
          naval: isNavalZone(zone) || isNavalZone(neighbour),
          coastal: isNavalZone(zone) !== isNavalZone(neighbour),
          toNaval: isNavalZone(neighbour),
        });
      }
    }
  }
  return result;
}

describe("passage d'une zone à l'autre", () => {
  it("ne dépose jamais le personnage dans un obstacle", () => {
    // Le bug d'origine : la carte d'arrivée était générée indépendamment, et
    // le point de dépose tombait parfois en plein tronc. Une fois encastré,
    // aucun mouvement n'était plus possible — la partie était perdue.
    const stuck: string[] = [];
    for (const crossing of crossings()) {
      const map = mapFor(crossing.to);
      const solid = solidOf(map, crossing.naval);
      const freed = resolveOverlap(crossing.entry, HITBOX, solid,
        { width: map.pixelWidth, height: map.pixelHeight });
      if (collides(freed, HITBOX, solid)) {
        stuck.push(`${crossing.from} → ${crossing.to} (${crossing.edge})`);
      }
    }
    expect(stuck).toEqual([]);
  });

  it("dépose le personnage dans la partie praticable de la zone", () => {
    // Être libre ne suffit pas : il faut aussi pouvoir en sortir. Une poche
    // isolée serait une prison silencieuse.
    const isolated: string[] = [];
    for (const crossing of crossings().filter((entry) => !entry.coastal || entry.toNaval)) {
      const map = mapFor(crossing.to);
      const freed = resolveOverlap(crossing.entry, HITBOX, solidOf(map, crossing.naval),
        { width: map.pixelWidth, height: map.pixelHeight });
      const tile = {
        x: Math.floor((freed.x + HITBOX.x) / TILE_SIZE),
        y: Math.floor((freed.y + HITBOX.y) / TILE_SIZE),
      };
      const reachable = flood(map, tile, crossing.naval);
      // La poche doit représenter une vraie part de la zone.
      if (reachable.size < 120) {
        isolated.push(`${crossing.from} → ${crossing.to} (${crossing.edge}) : ${reachable.size} cases`);
      }
    }
    expect(isolated).toEqual([]);
  });

  it("permet de débarquer de chaque crique côtière", () => {
    // Arriver de la mer dépose dans un chenal étroit — c'est voulu. Ce qui
    // compte, c'est qu'on puisse y poser pied à terre et gagner l'intérieur.
    const stranded: string[] = [];
    for (const crossing of crossings().filter((entry) => entry.coastal && !entry.toNaval)) {
      const map = mapFor(crossing.to);
      const freed = resolveOverlap(crossing.entry, HITBOX, solidOf(map, true),
        { width: map.pixelWidth, height: map.pixelHeight });
      const tile = {
        x: Math.floor((freed.x + HITBOX.x) / TILE_SIZE),
        y: Math.floor((freed.y + HITBOX.y) / TILE_SIZE),
      };
      const channel = flood(map, tile, true);
      // Une case du chenal doit toucher une terre praticable, et cette terre
      // doit ouvrir sur une vraie étendue.
      let landed = 0;
      for (const key of channel) {
        const cx = key % map.width;
        const cy = Math.floor(key / map.width);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          if (map.solidFor(cx + dx, cy + dy, false)) continue;
          landed = Math.max(landed, flood(map, { x: cx + dx, y: cy + dy }, false).size);
        }
        if (landed >= 120) break;
      }
      if (landed < 120) {
        stranded.push(`${crossing.from} → ${crossing.to} (${crossing.edge}) : ${landed} cases à terre`);
      }
    }
    expect(stranded).toEqual([]);
  });

  it("garde le point de dépose à l'intérieur de la zone", () => {
    const camera = new Camera();
    for (const edge of EDGES) {
      const entry = camera.enterPosition(edge, { x: 4000, y: -4000 });
      expect(entry.x).toBeGreaterThanOrEqual(0);
      expect(entry.y).toBeGreaterThanOrEqual(0);
      expect(entry.x).toBeLessThan(ZONE_WIDTH);
      expect(entry.y).toBeLessThan(ZONE_HEIGHT);
    }
  });

  it("renvoie le personnage vers l'intérieur au bord du monde", () => {
    const camera = new Camera({ x: 0, y: 0 });
    expect(camera.blockedPosition("west", { x: -9, y: 160 })).toEqual({ x: 0, y: 160 });
    expect(camera.blockedPosition("north", { x: 200, y: -9 })).toEqual({ x: 200, y: 0 });
    expect(camera.adjacent("east")).toEqual({ x: 1, y: 0 });
  });

  it("détecte le franchissement sur les quatre bords", () => {
    const camera = new Camera({ x: 3, y: 3 });
    expect(camera.edgeFor({ x: -12, y: 200 })).toBe("west");
    expect(camera.edgeFor({ x: ZONE_WIDTH - 4, y: 200 })).toBe("east");
    expect(camera.edgeFor({ x: 200, y: -12 })).toBe("north");
    expect(camera.edgeFor({ x: 200, y: ZONE_HEIGHT - 4 })).toBe("south");
    expect(camera.edgeFor({ x: 200, y: 200 })).toBeNull();
  });
});
