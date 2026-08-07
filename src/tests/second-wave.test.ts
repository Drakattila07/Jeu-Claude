import { describe, expect, it } from "vitest";
import { Clock, DAYS_PER_SEASON } from "../core/Clock";
import { Garden, CROPS, cropBySeed, PLOT_COUNT } from "../systems/Garden";
import { ComboTracker, TECHNIQUES, knownTechniques, nextTechnique } from "../systems/Techniques";
import { CHRONICLE, CHRONICLE_TOTAL } from "../data/chronicle";
import { FESTIVALS, festivalAt, festivalToday } from "../data/festivals";
import { FISH, availableFish, pickFish } from "../data/fish";
import { HERBALIST_STOCK, SHOP_STOCK, priceAt } from "../data/shop";
import { LanternCat, CAT_COOLDOWN } from "../entities/LanternCat";
import { ITEMS } from "../data/items/core";
import { WORLD_ZONES } from "../data/world";
import { ALL_INTERACTABLES } from "../data/interactables";
import { NPCS } from "../data/npcs/core";

describe("saisons", () => {
  it("tourne sur quatre saisons", () => {
    const clock = new Clock();
    const seen = new Set<string>();
    for (let day = 1; day <= DAYS_PER_SEASON * 4; day += 1) {
      clock.day = day;
      seen.add(clock.season);
    }
    expect(seen.size).toBe(4);
  });

  it("revient au printemps après un cycle complet", () => {
    const clock = new Clock();
    clock.day = 1;
    const first = clock.season;
    clock.day = 1 + DAYS_PER_SEASON * 4;
    expect(clock.season).toBe(first);
  });

  it("numérote les jours à l'intérieur de la saison", () => {
    const clock = new Clock();
    clock.day = 1;
    expect(clock.dayOfSeason).toBe(1);
    clock.day = DAYS_PER_SEASON;
    expect(clock.dayOfSeason).toBe(DAYS_PER_SEASON);
    clock.day = DAYS_PER_SEASON + 1;
    expect(clock.dayOfSeason).toBe(1);
  });
});

describe("météo", () => {
  it("produit chaque ciel au moins une fois sur un mois de jeu", () => {
    // Un climat qui ne sort jamais la neige n'a pas d'hiver.
    const clock = new Clock();
    const seen = new Set<string>();
    for (let day = 1; day <= 60; day += 1) {
      clock.day = day;
      seen.add(clock.weather);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it("ne fait pas neiger en été", () => {
    const clock = new Clock();
    for (let day = 1; day <= 200; day += 1) {
      clock.day = day;
      if (clock.season === "été") expect(clock.weather).not.toBe("snow");
    }
  });

  it("reste le même pour un jour donné", () => {
    const a = new Clock();
    const b = new Clock();
    a.day = 17;
    b.day = 17;
    expect(a.weather).toBe(b.weather);
  });

  it("signale les ciels qui bouchent la vue", () => {
    const clock = new Clock();
    for (let day = 1; day <= 40; day += 1) {
      clock.day = day;
      const murky = clock.weather === "fog" || clock.weather === "snow"
        || clock.weather === "storm";
      expect(clock.isMurky).toBe(murky);
    }
  });
});

describe("potager", () => {
  it("ne pousse pas sans eau, même après le temps voulu", () => {
    // Sinon semer suffirait, et l'arrosoir ne servirait à rien.
    const garden = new Garden();
    const crop = CROPS[0]!;
    garden.sow(0, crop, 1);
    expect(garden.status(0, 1 + crop.days)).not.toBe("mûre");
  });

  it("mûrit une fois arrosée autant de jours qu'il en faut", () => {
    const garden = new Garden();
    const crop = CROPS[0]!;
    garden.sow(0, crop, 1);
    for (let day = 1; day <= crop.days; day += 1) garden.water(0, day);
    expect(garden.status(0, 1 + crop.days)).toBe("mûre");
  });

  it("refuse deux arrosages le même jour", () => {
    const garden = new Garden();
    garden.sow(0, CROPS[0]!, 1);
    expect(garden.water(0, 1)).toBe(true);
    expect(garden.water(0, 1)).toBe(false);
  });

  it("laisse la pluie faire le travail", () => {
    const garden = new Garden();
    garden.sow(0, CROPS[0]!, 1);
    garden.sow(1, CROPS[0]!, 1);
    expect(garden.rainfall(1, "rain")).toBe(2);
    // Deux averses le même jour ne comptent qu'une fois.
    expect(garden.rainfall(1, "rain")).toBe(0);
    expect(garden.rainfall(2, "clear")).toBe(0);
  });

  it("réclame de l'eau quand on l'oublie", () => {
    const garden = new Garden();
    garden.sow(0, CROPS[2]!, 1);
    expect(garden.status(0, 4)).toBe("assoiffée");
  });

  it("donne moins hors de sa saison", () => {
    const crop = CROPS[0]!;
    const plein = new Garden();
    plein.sow(0, crop, 1);
    for (let day = 1; day <= crop.days; day += 1) plein.water(0, day);
    const bonne = plein.harvest(0, 1 + crop.days, crop.season);

    const maigre = new Garden();
    maigre.sow(0, crop, 1);
    for (let day = 1; day <= crop.days; day += 1) maigre.water(0, day);
    const hors = maigre.harvest(0, 1 + crop.days, crop.season === "hiver" ? "été" : "hiver");

    expect(bonne!.count).toBeGreaterThan(hors!.count);
    expect(hors!.count).toBeGreaterThan(0);
  });

  it("libère la planche après la récolte", () => {
    const garden = new Garden();
    const crop = CROPS[1]!;
    garden.sow(0, crop, 1);
    for (let day = 1; day <= crop.days; day += 1) garden.water(0, day);
    garden.harvest(0, 1 + crop.days, crop.season);
    expect(garden.status(0, 9)).toBe("vide");
    expect(garden.freePlot()).toBe(0);
  });

  it("se sauvegarde et se restaure", () => {
    const garden = new Garden();
    garden.sow(2, CROPS[0]!, 5);
    const restored = new Garden();
    restored.restore(garden.snapshot());
    expect(restored.at(2).crop).toBe(CROPS[0]!.id);
    expect(restored.snapshot()).toHaveLength(PLOT_COUNT);
  });

  it("associe chaque graine à sa culture", () => {
    for (const crop of CROPS) {
      expect(cropBySeed(crop.seed)?.id).toBe(crop.id);
      expect(crop.seed in ITEMS).toBe(true);
      expect(crop.harvest in ITEMS).toBe(true);
    }
  });
});

describe("techniques", () => {
  it("s'apprennent dans l'ordre et de plus en plus cher", () => {
    const known = new Set<string>();
    let previous = 0;
    for (const technique of TECHNIQUES) {
      expect(nextTechnique((flag) => known.has(flag))?.id).toBe(technique.id);
      expect(technique.price).toBeGreaterThan(previous);
      previous = technique.price;
      known.add(technique.learnedFlag);
    }
    expect(nextTechnique((flag) => known.has(flag))).toBeNull();
    expect(knownTechniques((flag) => known.has(flag))).toHaveLength(TECHNIQUES.length);
  });

  it("compte trois coups enchaînés", () => {
    const combo = new ComboTracker();
    expect(combo.strike(0)).toBe(1);
    expect(combo.strike(30)).toBe(2);
    expect(combo.strike(60)).toBe(3);
    expect(combo.rank).toBe(3);
  });

  it("rompt l'enchaînement quand on tarde", () => {
    // Trois coups espacés d'une minute ne sont pas un enchaînement.
    const combo = new ComboTracker();
    combo.strike(0);
    combo.strike(200);
    expect(combo.rank).toBe(1);
  });

  it("rompt l'enchaînement quand on le lui demande", () => {
    const combo = new ComboTracker();
    combo.strike(0);
    combo.strike(10);
    combo.break();
    expect(combo.rank).toBe(0);
  });
});

describe("familier", () => {
  it("suit le joueur une fois attaché", () => {
    const target = { x: 300, y: 200 };
    const cat = new LanternCat({ x: 0, y: 0 });
    expect(cat.isFollowing).toBe(false);
    cat.follow(target);
    expect(cat.isFollowing).toBe(true);
    const before = cat.distanceTo(target);
    for (let frame = 0; frame < 120; frame += 1) cat.update();
    expect(cat.distanceTo(target)).toBeLessThan(before);
  });

  it("souffle entre deux flammèches", () => {
    const cat = new LanternCat({ x: 0, y: 0 });
    expect(cat.spark()).toBe(true);
    expect(cat.spark()).toBe(false);
    for (let frame = 0; frame < CAT_COOLDOWN; frame += 1) cat.update();
    expect(cat.spark()).toBe(true);
  });
});

describe("chronique et cairns", () => {
  it("compte douze feuillets, numérotés sans trou", () => {
    expect(CHRONICLE).toHaveLength(CHRONICLE_TOTAL);
    const numbers = CHRONICLE.map((page) => page.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: CHRONICLE_TOTAL }, (_, i) => i + 1));
  });

  it("pose chaque feuillet dans une région qui existe", () => {
    for (const page of CHRONICLE) {
      expect(WORLD_ZONES.some((zone) => zone.id === page.zone),
        `feuillet ${page.number} : ${page.zone}`).toBe(true);
      expect(page.text.length).toBeGreaterThan(40);
    }
  });

  it("ne pose jamais deux feuillets au même endroit", () => {
    const spots = CHRONICLE.map((page) => `${page.zone}:${page.x},${page.y}`);
    expect(new Set(spots).size).toBe(spots.length);
  });

  it("déclare les quatre cairns dans le monde", () => {
    const cairns = ALL_INTERACTABLES.filter((entry) => entry.kind === "cairn");
    expect(cairns).toHaveLength(4);
    for (const cairn of cairns) {
      expect(WORLD_ZONES.some((zone) => zone.id === cairn.zone)).toBe(true);
    }
    // Un seul exige la Chronique complète : les trois autres se contentent de parler.
    expect(cairns.filter((cairn) => cairn.requires !== undefined)).toHaveLength(1);
  });
});

describe("fêtes", () => {
  it("en donne une par saison, dans une région qui existe", () => {
    expect(FESTIVALS).toHaveLength(4);
    const seasons = new Set(FESTIVALS.map((festival) => festival.season));
    expect(seasons.size).toBe(4);
    for (const festival of FESTIVALS) {
      expect(WORLD_ZONES.some((zone) => zone.id === festival.zone),
        festival.zone).toBe(true);
      expect(festival.gift.item in ITEMS).toBe(true);
      expect(festival.dayOfSeason).toBeGreaterThanOrEqual(1);
      expect(festival.dayOfSeason).toBeLessThanOrEqual(DAYS_PER_SEASON);
    }
  });

  it("ne se déclenche qu'au bon endroit et au bon jour", () => {
    const festival = FESTIVALS[0]!;
    expect(festivalAt(festival.zone, festival.season, festival.dayOfSeason)).toBe(festival);
    expect(festivalAt("cimes_brume_ouest", festival.season, festival.dayOfSeason)).toBeNull();
    const otherDay = festival.dayOfSeason === 1 ? DAYS_PER_SEASON : 1;
    expect(festivalAt(festival.zone, festival.season, otherDay)).toBeNull();
  });

  it("tombe forcément un jour du cycle", () => {
    const clock = new Clock();
    const found = new Set<string>();
    for (let day = 1; day <= DAYS_PER_SEASON * 4; day += 1) {
      clock.day = day;
      const festival = festivalToday(clock.season, clock.dayOfSeason);
      if (festival) found.add(festival.id);
    }
    expect(found.size).toBe(FESTIVALS.length);
  });
});

describe("pêche", () => {
  const base = {
    biome: "lake" as const, night: false, season: "printemps" as const,
    weather: "clear" as const, tide: "haute" as const,
  };

  it("propose toujours au moins une espèce", () => {
    for (const biome of ["lake", "river", "sea", "marsh"] as const) {
      expect(availableFish({ ...base, biome }).length).toBeGreaterThan(0);
    }
  });

  it("réserve les espèces nocturnes à la nuit", () => {
    const jour = availableFish(base).map((fish) => fish.id);
    const nuit = availableFish({ ...base, night: true }).map((fish) => fish.id);
    expect(jour).not.toContain("anguille");
    expect(nuit).toContain("anguille");
  });

  it("réserve le bar à la mer basse", () => {
    expect(availableFish(base).map((f) => f.id)).not.toContain("bar");
    expect(availableFish({ ...base, tide: "basse" }).map((f) => f.id)).toContain("bar");
  });

  it("tire toujours une espèce du bon vivier", () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
      const fish = pickFish(base, roll);
      expect(availableFish(base).map((entry) => entry.id)).toContain(fish.id);
    }
  });

  it("donne une note et une valeur à chaque espèce", () => {
    for (const fish of FISH) {
      expect(fish.value).toBeGreaterThan(0);
      expect(fish.weight).toBeGreaterThan(0);
      expect(fish.note.length).toBeGreaterThan(10);
    }
  });

  it("rend les rares plus chers que les communs", () => {
    const commun = FISH.reduce((best, fish) => fish.weight > best.weight ? fish : best);
    const rare = FISH.reduce((best, fish) => fish.weight < best.weight ? fish : best);
    expect(rare.value).toBeGreaterThan(commun.value);
  });
});

describe("commerce", () => {
  it("vend plus cher au port qu'au hameau", () => {
    expect(priceAt(100, "port_maree")).toBeGreaterThan(priceAt(100, "hameau_sud"));
  });

  it("ne descend jamais sous un rubis", () => {
    expect(priceAt(1, "hameau_sud")).toBeGreaterThanOrEqual(1);
  });

  it("laisse le prix intact dans une région sans marché", () => {
    expect(priceAt(50, "cimes_brume_ouest")).toBe(50);
  });

  it("ne met en rayon que des objets qui existent", () => {
    for (const entry of [...SHOP_STOCK, ...HERBALIST_STOCK]) {
      if (entry.item) expect(entry.item in ITEMS, entry.id).toBe(true);
      expect(entry.price).toBeGreaterThan(0);
      expect(entry.note.length).toBeGreaterThan(0);
    }
  });
});

describe("ajouts au monde", () => {
  it("place chaque nouvel objet dans une région qui existe", () => {
    for (const entry of ALL_INTERACTABLES) {
      expect(WORLD_ZONES.some((zone) => zone.id === entry.zone),
        `${entry.id} → ${entry.zone}`).toBe(true);
    }
  });

  it("n'a pas deux objets du même identifiant", () => {
    const ids = ALL_INTERACTABLES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("donne six planches au potager", () => {
    const plots = ALL_INTERACTABLES.filter((entry) => entry.kind === "plot");
    expect(plots).toHaveLength(PLOT_COUNT);
    // Toutes dans la même région : un potager éclaté n'est pas un potager.
    expect(new Set(plots.map((plot) => plot.zone)).size).toBe(1);
  });

  it("donne à chaque nouveau PNJ un emploi du temps cohérent", () => {
    for (const npc of NPCS) {
      expect(npc.schedule.length).toBeGreaterThan(0);
      for (const slot of npc.schedule) {
        expect(WORLD_ZONES.some((zone) => zone.id === slot.zone),
          `${npc.id} → ${slot.zone}`).toBe(true);
        expect(slot.start).toBeLessThan(slot.end);
      }
      expect(new Set(npc.chatter).size).toBe(4);
    }
  });
});
