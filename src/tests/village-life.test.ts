import { describe, expect, it } from "vitest";
import { Interactable, ZoneObjectState } from "../entities/Interactable";
import { Clock } from "../core/Clock";
import { WORLD_ZONES } from "../data/world";
import { createZoneMap } from "../world/ZoneMapFactory";
import { TileMap } from "../world/TileMap";
import { TileSet, TILE } from "../world/TileSet";
import { createHouseMap, houseTradeFor, INTERIOR_HEIGHT, INTERIOR_WIDTH } from "../world/Interiors";
import { residentOf } from "../data/npcs/residents";

const tileSet = new TileSet();

function villageMap(id: string): TileMap {
  const zone = WORLD_ZONES.find((candidate) => candidate.id === id)!;
  return new TileMap(createZoneMap(zone), tileSet);
}

describe("objets consommés", () => {
  it("disparaît des interactions une fois tranché", () => {
    // Une racine coupée restait interrogeable et rouvrait sans fin sa
    // réplique sur un emplacement vide : on croyait le jeu bloqué.
    const state = new ZoneObjectState();
    const roots = new Interactable(
      { id: "r", zone: "z", kind: "roots", x: 0, y: 0, text: "Des racines." }, state);
    expect(roots.isPresent).toBe(true);
    roots.interact();
    expect(roots.isSpent).toBe(true);
    expect(roots.isPresent).toBe(false);
  });

  it("garde les objets qui restent en place après usage", () => {
    const state = new ZoneObjectState();
    const chest = new Interactable(
      { id: "c", zone: "z", kind: "chest", x: 0, y: 0, text: "Un coffre." }, state);
    chest.interact();
    expect(chest.isSpent).toBe(true);
    expect(chest.isPresent).toBe(true);
  });
});

describe("attente au puits", () => {
  it("avance jusqu'au moment demandé dans la même journée", () => {
    const clock = new Clock();
    clock.setTime(8, 0);
    const day = clock.day;
    clock.waitUntil("soir");
    expect(clock.hour).toBe(19);
    expect(clock.day).toBe(day);
    expect(clock.isNight).toBe(false);
  });

  it("bascule au lendemain quand le moment est déjà passé", () => {
    const clock = new Clock();
    clock.setTime(20, 0);
    const day = clock.day;
    clock.waitUntil("matin");
    expect(clock.hour).toBe(9);
    expect(clock.day).toBe(day + 1);
  });

  it("mène bien à la nuit, condition de plusieurs secrets", () => {
    const clock = new Clock();
    clock.setTime(12, 0);
    clock.waitUntil("nuit");
    expect(clock.isNight).toBe(true);
  });
});

describe("village habité", () => {
  it("plante un puits sur la place de chaque hameau", () => {
    for (const zone of WORLD_ZONES.filter((candidate) => candidate.biome === "village")) {
      const map = villageMap(zone.id);
      let wells = 0;
      for (let y = 0; y < map.height; y += 1) {
        for (let x = 0; x < map.width; x += 1) {
          if (map.tileAt("terrain", x, y) === TILE.well) wells += 1;
        }
      }
      // La Place du Puits reçoit le sien du contenu narratif, pas du décor.
      const fromContent = zone.id === "place_puits";
      expect(wells > 0 || fromContent, `${zone.id} sans puits`).toBe(true);
    }
  });

  it("bâtit des maisons entières, jamais tranchées par une rue", () => {
    for (const zone of WORLD_ZONES.filter((candidate) => candidate.biome === "village")) {
      const map = villageMap(zone.id);
      let doors = 0;
      for (let y = 1; y < map.height - 1; y += 1) {
        for (let x = 1; x < map.width - 1; x += 1) {
          if (map.tileAt("terrain", x, y) !== TILE.door) continue;
          doors += 1;
          // Une porte suppose un mur de chaque côté et un toit au-dessus :
          // c'est ce qui manquait aux pans de façade laissés par les chemins.
          const left = map.tileAt("terrain", x - 1, y);
          const right = map.tileAt("terrain", x + 1, y);
          const above = map.tileAt("terrain", x, y - 1);
          const walled = (left === TILE.wall || left === TILE.window)
            && (right === TILE.wall || right === TILE.window);
          expect(walled, `${zone.id} porte nue en ${x},${y}`).toBe(true);
          expect(above === TILE.wall || above === TILE.roof,
            `${zone.id} porte sans toit en ${x},${y}`).toBe(true);
          // Et l'on doit pouvoir se planter devant.
          expect(map.isSolid(x, y + 1), `${zone.id} seuil bouché en ${x},${y}`).toBe(false);
        }
      }
      expect(doors, `${zone.id} sans maison`).toBeGreaterThan(0);
    }
  });
});

describe("habitants", () => {
  it("donne à chaque logis un occupant stable", () => {
    const first = residentOf(1234, "house");
    const again = residentOf(1234, "house");
    expect(first).toEqual(again);
    expect(residentOf(9876, "house").id).not.toBe(first.id);
    expect(first.chatter).toHaveLength(4);
    expect(new Set(first.chatter).size).toBe(4);
  });

  it("place l'occupant sur une case praticable de sa pièce", () => {
    for (const seed of [1, 42, 777, 20260, 31337]) {
      const map = new TileMap(createHouseMap(seed), tileSet);
      const resident = residentOf(seed, "house");
      const spot = resident.schedule[0]!;
      const tileX = Math.floor(spot.x / 16);
      const tileY = Math.floor(spot.y / 16);
      expect(tileX).toBeLessThan(INTERIOR_WIDTH - 1);
      expect(tileY).toBeLessThan(INTERIOR_HEIGHT - 1);
      expect(map.isSolid(tileX, tileY), `graine ${seed}`).toBe(false);
    }
  });

  it("meuble chaque métier différemment", () => {
    const trades = new Set([0, 1, 2, 3].map((seed) => houseTradeFor(seed)));
    expect(trades.size).toBe(4);
  });
});
