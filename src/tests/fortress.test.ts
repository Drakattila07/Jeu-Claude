import { describe, expect, it } from "vitest";
import {
  VERTEPIERRE, createRoomMap, doorKey, doorSpan, entranceOf,
  nearFortressExit, roomAt, roomEntry, roomSpawns, FORTRESS_EXIT,
  ROOM_TILES_X, ROOM_TILES_Y,
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
  const room = roomAt(VERTEPIERRE, x, y)!;
  return new TileMap(createRoomMap(VERTEPIERRE, room, unlocked), tileSet);
}

describe("forteresse de Vertepierre", () => {
  it("relie ses salles dans les deux sens", () => {
    // Une porte déclarée d'un seul côté serait un aller sans retour.
    const missing: string[] = [];
    for (const room of VERTEPIERRE.rooms) {
      for (const link of room.links) {
        const delta = link.edge === "north" ? { x: 0, y: -1 } : link.edge === "south" ? { x: 0, y: 1 }
          : link.edge === "west" ? { x: -1, y: 0 } : { x: 1, y: 0 };
        const other = roomAt(VERTEPIERRE, room.x + delta.x, room.y + delta.y);
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
    const queue = [entranceOf(VERTEPIERRE)];
    seen.add(`${queue[0]!.x},${queue[0]!.y}`);
    while (queue.length > 0) {
      const room = queue.pop()!;
      for (const link of room.links) {
        const delta = link.edge === "north" ? { x: 0, y: -1 } : link.edge === "south" ? { x: 0, y: 1 }
          : link.edge === "west" ? { x: -1, y: 0 } : { x: 1, y: 0 };
        const other = roomAt(VERTEPIERRE, room.x + delta.x, room.y + delta.y);
        if (!other || seen.has(`${other.x},${other.y}`)) continue;
        seen.add(`${other.x},${other.y}`);
        queue.push(other);
      }
    }
    expect(seen.size).toBe(VERTEPIERRE.rooms.length);
  });

  it("distribue autant de clés que de portes verrouillées", () => {
    // Moins de clés que de verrous, et le donjon devient infranchissable.
    const locks = new Set<string>();
    for (const room of VERTEPIERRE.rooms) {
      for (const link of room.links) {
        if (link.locked) locks.add(doorKey(VERTEPIERRE, room, link.edge));
      }
    }
    const keys = VERTEPIERRE.rooms.filter((room) => room.dropsKey).length;
    expect(keys).toBeGreaterThanOrEqual(locks.size);
  });

  it("ferme chaque salle sauf à ses portes", () => {
    const room = roomAt(VERTEPIERRE, 1, 1)!;
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

  it("pose une herse tant que la porte n'est pas ouverte", () => {
    const boss = roomAt(VERTEPIERRE, 1, 0)!;
    const closed = roomMap(1, 0);
    for (const offset of doorSpan("south")) {
      expect(closed.tileAt("terrain", offset, ROOM_TILES_Y - 1)).toBe(TILE.portcullis);
    }
    const opened = roomMap(1, 0, new Set([doorKey(VERTEPIERRE, boss, "south")]));
    for (const offset of doorSpan("south")) {
      expect(opened.isSolid(offset, ROOM_TILES_Y - 1)).toBe(false);
    }
  });

  it("garde la porte de sortie dans la salle d'entrée", () => {
    const map = roomMap(1, 2);
    for (const offset of doorSpan("south")) {
      expect(map.tileAt("terrain", offset, ROOM_TILES_Y - 1)).toBe(TILE.door);
    }
    expect(nearFortressExit(FORTRESS_EXIT)).toBe(true);
    expect(nearFortressExit({ x: FORTRESS_EXIT.x, y: FORTRESS_EXIT.y - 120 })).toBe(false);
  });

  it("dépose toujours le personnage sur une case praticable", () => {
    for (const room of VERTEPIERRE.rooms) {
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
    for (const room of VERTEPIERRE.rooms) {
      const map = roomMap(room.x, room.y);
      for (const spawn of roomSpawns(VERTEPIERRE, room)) {
        const tileX = Math.floor(spawn.x / 16);
        const tileY = Math.floor(spawn.y / 16);
        expect(map.isSolid(tileX, tileY), `${spawn.id}`).toBe(false);
      }
    }
  });

  it("tient sa progression d'une salle à l'autre", () => {
    const fortress = new Fortress();
    expect(fortress.enter("vertepierre")).toBe(true);
    expect(fortress.room).toEqual(entranceOf(VERTEPIERRE));

    const west = fortress.passage("west");
    expect(west?.locked).toBe(false);
    fortress.moveTo(west!.room);
    expect(fortress.isCleared()).toBe(false);
    fortress.markCleared();
    expect(fortress.isCleared()).toBe(true);

    // La salle du trésor sud-est est fermée au nord : il faut une clé.
    fortress.moveTo(roomAt(VERTEPIERRE, 2, 2)!);
    expect(fortress.passage("north")?.locked).toBe(true);
    expect(fortress.unlock("north")).toBe(true);
    expect(fortress.passage("north")?.locked).toBe(false);
  });

  it("retient portes ouvertes et salles nettoyées dans la sauvegarde", () => {
    const fortress = new Fortress();
    fortress.enter("vertepierre");
    fortress.markCleared();
    fortress.unlock("north");
    const saved = fortress.snapshot();

    const restored = new Fortress();
    restored.restore(saved);
    restored.enter("vertepierre");
    expect(restored.isCleared()).toBe(true);
    expect(restored.unlockedDoors.size).toBe(saved.unlocked.length);
  });

  it("donne des salles plus larges que hautes, à la mesure de la fenêtre", () => {
    expect(ROOM_TILES_X * 16).toBeGreaterThanOrEqual(384);
    expect(ROOM_TILES_Y * 16).toBeGreaterThanOrEqual(216);
  });
});
