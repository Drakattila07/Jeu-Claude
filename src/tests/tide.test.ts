import { describe, expect, it } from "vitest";
import { Clock } from "../core/Clock";
import { WORLD_ZONES } from "../data/world";
import { createZoneMap, TIDAL_ZONES } from "../world/ZoneMapFactory";
import { TileMap } from "../world/TileMap";
import { TileSet } from "../world/TileSet";

const tileSet = new TileSet();

function walkable(zoneId: string, tideLevel: number): number {
  const zone = WORLD_ZONES.find((candidate) => candidate.id === zoneId)!;
  const map = new TileMap(createZoneMap(zone, tideLevel), tileSet);
  let free = 0;
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) if (!map.isSolid(x, y)) free += 1;
  }
  return free;
}

describe("marée", () => {
  it("passe par ses quatre états dans la journée", () => {
    const clock = new Clock();
    const seen = new Set<string>();
    for (let hour = 0; hour < 24; hour += 1) {
      clock.setTime(hour);
      seen.add(clock.tide);
    }
    expect(seen.size).toBe(4);
  });

  it("ne se répète pas au même moment deux jours de suite", () => {
    // Une marée à heure fixe s'apprend par cœur et cesse d'être une marée.
    const clock = new Clock();
    clock.setTime(8);
    const first = clock.tide;
    clock.day = 4;
    expect(clock.tide).not.toBe(first);
  });

  it("ne retire jamais de sol en se retirant", () => {
    // La garantie qui autorise à regénérer la carte sans revérifier la
    // connexité : la mer basse ne peut qu'ajouter du praticable.
    for (const zoneId of TIDAL_ZONES) {
      expect(walkable(zoneId, 0), `${zoneId} : la mer basse a fermé un passage`)
        .toBeGreaterThanOrEqual(walkable(zoneId, 1));
    }
  });

  it("découvre un estran là où il y a de l'eau guéable", () => {
    // Une rade en pleine mer n'a pas d'estran, et c'est normal : seules les
    // côtes à fond remontant se découvrent.
    const gained = [...TIDAL_ZONES].filter((id) => walkable(id, 0) > walkable(id, 1));
    expect(gained.length).toBeGreaterThanOrEqual(4);
    // La Grève de Marée porte la grotte et les perles : elle doit se découvrir.
    expect(gained, "la Grève de Marée ne se découvre pas").toContain("greve_de_maree");
  });

  it("ne touche pas aux régions sans côte", () => {
    // La marée ne doit pas rendre toute la génération dépendante de l'heure :
    // quatre-vingts régions doivent rester strictement identiques.
    for (const zone of WORLD_ZONES.filter((candidate) => !TIDAL_ZONES.has(candidate.id))) {
      expect(JSON.stringify(createZoneMap(zone, 0)),
        `${zone.id} change avec la marée`).toBe(JSON.stringify(createZoneMap(zone, 1)));
    }
  });

  it("reste déterministe à marée donnée", () => {
    for (const zoneId of TIDAL_ZONES) {
      const zone = WORLD_ZONES.find((candidate) => candidate.id === zoneId)!;
      expect(JSON.stringify(createZoneMap(zone, 0.1)))
        .toBe(JSON.stringify(createZoneMap(zone, 0.1)));
    }
  });

  it("n'ouvre jamais l'estran sur le large", () => {
    // On ne découvre que ce qui borde la terre. Sans cette règle, la frange
    // servait de rivage à la frange suivante et la mer se retirait entièrement.
    const zone = WORLD_ZONES.find((candidate) => candidate.id === "rade_de_maree")!;
    const map = new TileMap(createZoneMap(zone, 0), tileSet);
    let free = 0;
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) if (!map.isSolid(x, y)) free += 1;
    }
    expect(free).toBeLessThan(map.width * map.height * 0.9);
  });

  it("annonce l'attente jusqu'au prochain reflux", () => {
    const clock = new Clock();
    clock.setTime(0);
    // À marée basse, rien à attendre.
    if (clock.tide === "basse") expect(clock.hoursUntilLowTide()).toBe(0);
    else expect(clock.hoursUntilLowTide()).toBeGreaterThan(0);
  });
});

describe("vent", () => {
  it("tourne dans la journée sans changer à chaque minute", () => {
    const clock = new Clock();
    clock.setTime(0);
    const first = clock.wind;
    clock.setTime(1);
    expect(clock.wind).toBe(first);
    const rhumbs = new Set<string>();
    for (let hour = 0; hour < 24; hour += 3) {
      clock.setTime(hour);
      rhumbs.add(clock.wind);
    }
    expect(rhumbs.size).toBeGreaterThan(1);
  });

  it("est le même à la même heure du même jour", () => {
    const a = new Clock();
    const b = new Clock();
    a.setTime(14);
    b.setTime(14);
    expect(a.wind).toBe(b.wind);
  });
});
