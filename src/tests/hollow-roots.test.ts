import { describe, expect, it } from "vitest";
import {
  RACINES_CREUSES, createRoomMap, doorKey, doorSpan, entranceOf,
  nearFortressExit, roomAt, roomEntry, roomSpawns, FORTRESS_EXIT,
  ROOM_TILES_Y,
} from "../world/Dungeons";
import { Fortress } from "../systems/Fortress";
import { TileMap } from "../world/TileMap";
import { TileSet, TILE } from "../world/TileSet";
import type { Edge } from "../core/Camera";

const tileSet = new TileSet();
const OPPOSITE: Readonly<Record<Edge, Edge>> = {
  north: "south", south: "north", west: "east", east: "west",
};

function roomMap(x: number, y: number, unlocked: ReadonlySet<string> = new Set()): TileMap {
  const room = roomAt(RACINES_CREUSES, x, y)!;
  return new TileMap(createRoomMap(RACINES_CREUSES, room, unlocked), tileSet);
}

describe("Les Racines Creuses", () => {
  it("relie ses salles dans les deux sens", () => {
    const missing: string[] = [];
    for (const room of RACINES_CREUSES.rooms) {
      for (const link of room.links) {
        const delta = link.edge === "north" ? { x: 0, y: -1 } : link.edge === "south" ? { x: 0, y: 1 }
          : link.edge === "west" ? { x: -1, y: 0 } : { x: 1, y: 0 };
        const other = roomAt(RACINES_CREUSES, room.x + delta.x, room.y + delta.y);
        if (!other) { missing.push(`${room.x},${room.y} → ${link.edge} : salle absente`); continue; }
        const back = other.links.find((candidate) => candidate.edge === OPPOSITE[link.edge]);
        if (!back) missing.push(`${room.x},${room.y} → ${link.edge} : pas de retour`);
        else if (back.locked !== link.locked) {
          missing.push(`${room.x},${room.y} → ${link.edge} : verrou incohérent`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("rend chaque salle atteignable depuis l'entrée", () => {
    const seen = new Set<string>();
    const queue = [entranceOf(RACINES_CREUSES)];
    seen.add(`${queue[0]!.x},${queue[0]!.y}`);
    while (queue.length > 0) {
      const room = queue.pop()!;
      for (const link of room.links) {
        const delta = link.edge === "north" ? { x: 0, y: -1 } : link.edge === "south" ? { x: 0, y: 1 }
          : link.edge === "west" ? { x: -1, y: 0 } : { x: 1, y: 0 };
        const other = roomAt(RACINES_CREUSES, room.x + delta.x, room.y + delta.y);
        if (!other || seen.has(`${other.x},${other.y}`)) continue;
        seen.add(`${other.x},${other.y}`);
        queue.push(other);
      }
    }
    expect(seen.size).toBe(RACINES_CREUSES.rooms.length);
  });

  it("distribue autant de clés que de portes verrouillées", () => {
    const locks = new Set<string>();
    for (const room of RACINES_CREUSES.rooms) {
      for (const link of room.links) {
        if (link.locked) locks.add(doorKey(RACINES_CREUSES, room, link.edge));
      }
    }
    const keys = RACINES_CREUSES.rooms.filter((room) => room.dropsKey).length;
    expect(keys).toBeGreaterThanOrEqual(locks.size);
  });

  it("ferme chaque salle sauf à ses portes", () => {
    const room = roomAt(RACINES_CREUSES, 1, 1)!;
    const map = roomMap(1, 1);
    for (let x = 0; x < map.width; x += 1) {
      const northOpen = room.links.some((link) => link.edge === "north" && !link.locked)
        && doorSpan("north").includes(x);
      expect(map.isSolid(x, 0), `bord nord ${x}`).toBe(!northOpen);
    }
    for (let y = 2; y < map.height - 1; y += 1) {
      const westOpen = room.links.some((link) => link.edge === "west" && !link.locked)
        && doorSpan("west").includes(y);
      expect(map.isSolid(0, y), `bord ouest ${y}`).toBe(!westOpen);
    }
  });

  it("pose une herse tant que la porte de la Gardienne n'est pas ouverte", () => {
    const boss = roomAt(RACINES_CREUSES, 1, 1)!;
    const closed = roomMap(1, 1);
    for (const offset of doorSpan("north")) {
      expect(closed.tileAt("terrain", offset, 0)).toBe(TILE.portcullis);
    }
    const opened = roomMap(1, 1, new Set([doorKey(RACINES_CREUSES, boss, "north")]));
    for (const offset of doorSpan("north")) {
      expect(opened.isSolid(offset, 0)).toBe(false);
    }
  });

  it("garde la porte de sortie dans la salle d'entrée", () => {
    const map = roomMap(0, 2);
    for (const offset of doorSpan("south")) {
      expect(map.tileAt("terrain", offset, ROOM_TILES_Y - 1)).toBe(TILE.door);
    }
    expect(nearFortressExit(FORTRESS_EXIT)).toBe(true);
  });

  it("dépose toujours le personnage sur une case praticable", () => {
    for (const room of RACINES_CREUSES.rooms) {
      const map = roomMap(room.x, room.y);
      for (const edge of [null, "north", "south", "west", "east"] as const) {
        const entry = roomEntry(edge);
        const tileX = Math.floor((entry.x + 3) / 16);
        const tileY = Math.floor((entry.y + 9) / 16);
        expect(map.isSolid(tileX, tileY), `${room.x},${room.y} depuis ${edge}`).toBe(false);
      }
    }
  });

  it("place ses gardes sur des cases libres", () => {
    for (const room of RACINES_CREUSES.rooms) {
      const map = roomMap(room.x, room.y);
      for (const spawn of roomSpawns(RACINES_CREUSES, room)) {
        const tileX = Math.floor(spawn.x / 16);
        const tileY = Math.floor(spawn.y / 16);
        expect(map.isSolid(tileX, tileY), `${spawn.id}`).toBe(false);
      }
    }
  });

  it("ne charge aucun garde dans la salle de la Gardienne : elle se bat seule", () => {
    const boss = RACINES_CREUSES.rooms.find((room) => room.kind === "boss")!;
    expect(boss.guards).toEqual([]);
  });

  it("laisse le Sanctuaire des Semis vide de gardes, pour Liane", () => {
    const room = roomAt(RACINES_CREUSES, 0, 0)!;
    expect(room.guards).toEqual([]);
  });

  it("tient sa progression d'une salle à l'autre, comme Vertepierre", () => {
    const fortress = new Fortress();
    expect(fortress.enter("racines_creuses")).toBe(true);
    expect(fortress.room).toEqual(entranceOf(RACINES_CREUSES));

    const east = fortress.passage("east");
    expect(east?.locked).toBe(false);
    fortress.moveTo(east!.room);
    expect(fortress.isCleared()).toBe(false);
    fortress.markCleared();
    expect(fortress.isCleared()).toBe(true);
  });

  it("retient portes ouvertes et salles nettoyées dans la sauvegarde", () => {
    const fortress = new Fortress();
    fortress.enter("racines_creuses");
    fortress.markCleared();
    fortress.unlock("east");
    const saved = fortress.snapshot();

    const restored = new Fortress();
    restored.restore(saved);
    restored.enter("racines_creuses");
    expect(restored.isCleared()).toBe(true);
    expect(restored.unlockedDoors.size).toBe(saved.unlocked.length);
  });
});
