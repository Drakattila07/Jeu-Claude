import { describe, expect, it } from "vitest";
import { Journal, JOURNAL_TOTALS, RANKS } from "../systems/Journal";
import { Campfires, CAMPFIRE_HOURS, CAMPFIRE_WARD } from "../systems/Campfire";
import { PigeonPost, acceptedByPost, replyFor } from "../systems/PigeonPost";
import { TUNES, knownTunes, nextTuneToTeach } from "../systems/Flute";
import { SWORD_TIERS, nextTier, tierAt } from "../systems/Forge";
import { ALL_DREAMS, dreamFor } from "../systems/Dreams";
import { CAMP_RECIPES } from "../data/recipes";
import { ITEMS, ACTIONABLE_ITEMS, isUsable, itemEffect } from "../data/items/core";
import { NPCS } from "../data/npcs/core";
import { WORLD_ZONES } from "../data/world";
import { INTERIOR_NAMES, createInteriorMap } from "../world/Interiors";
import { TileMap } from "../world/TileMap";
import { TileSet } from "../world/TileSet";
import { INTERACTABLES } from "../data/interactables";

describe("carnet de la cartographe", () => {
  it("n'inscrit une ligne qu'une fois", () => {
    const journal = new Journal();
    expect(journal.noteRegion("place_puits", "PLACE", "note", 1)).toBe(true);
    expect(journal.noteRegion("place_puits", "PLACE", "autre", 3)).toBe(false);
    expect(journal.count("regions")).toBe(1);
  });

  it("compte chaque section séparément", () => {
    const journal = new Journal();
    journal.noteRegion("a", "A", "", 1);
    journal.notePerson("b", "B", "", 1);
    journal.noteBeast("wolf", 1);
    journal.noteSecret("c", "C", "", 1);
    expect(journal.count("regions")).toBe(1);
    expect(journal.count("gens")).toBe(1);
    expect(journal.count("betes")).toBe(1);
    expect(journal.count("secrets")).toBe(1);
  });

  it("donne une faiblesse à chaque bête du bestiaire", () => {
    // Un bestiaire qui ne dit rien de plus que le nom ne vaut pas l'écran.
    const journal = new Journal();
    journal.noteBeast("gargoyle", 1);
    const entry = journal.list("betes")[0]!;
    expect(entry.note.length).toBeGreaterThan(20);
    expect(entry.note).not.toBe("Observée trop vite pour en dire plus.");
  });

  it("monte en grade à mesure qu'il se remplit", () => {
    const journal = new Journal();
    expect(journal.rank.title).toBe(RANKS[0]!.title);
    for (const zone of WORLD_ZONES) journal.noteRegion(zone.id, zone.name, "", 1);
    for (const npc of NPCS) journal.notePerson(npc.id, npc.name, "", 1);
    expect(journal.rank.at).toBeGreaterThan(0);
    expect(journal.completion).toBeGreaterThan(0);
    expect(journal.completion).toBeLessThanOrEqual(1);
  });

  it("ne dépasse jamais cent pour cent", () => {
    // Un compteur de section peut recevoir plus d'entrées que son total
    // déclaré (les secrets ne sont pas énumérés) : la barre doit tenir.
    const journal = new Journal();
    for (let index = 0; index < JOURNAL_TOTALS.secrets + 20; index += 1) {
      journal.noteSecret(`s${index}`, "S", "", 1);
    }
    expect(journal.completion).toBeLessThanOrEqual(1);
  });

  it("se sauvegarde et se restaure", () => {
    const journal = new Journal();
    journal.noteRegion("place_puits", "PLACE", "relevée", 2);
    journal.noteBeast("wolf", 3);
    const restored = new Journal();
    restored.restore(journal.snapshot());
    expect(restored.count("regions")).toBe(1);
    expect(restored.has("betes", "wolf")).toBe(true);
    expect(restored.list("regions")[0]!.day).toBe(2);
  });

  it("repart d'un carnet vierge sur une sauvegarde d'avant", () => {
    const journal = new Journal();
    journal.restore(undefined);
    expect(journal.count("regions")).toBe(0);
  });
});

describe("feux de camp", () => {
  it("brûle six heures puis s'éteint", () => {
    const fires = new Campfires();
    fires.light("place_puits", { x: 100, y: 100 }, 10);
    expect(fires.in("place_puits", 10).length).toBe(1);
    expect(fires.in("place_puits", 10 + CAMPFIRE_HOURS - 0.1).length).toBe(1);
    expect(fires.in("place_puits", 10 + CAMPFIRE_HOURS).length).toBe(0);
  });

  it("protège dans son rayon et pas au-delà", () => {
    const fires = new Campfires();
    fires.light("z", { x: 100, y: 100 }, 0);
    expect(fires.wards("z", { x: 100 + CAMPFIRE_WARD - 4, y: 100 }, 1)).toBe(true);
    expect(fires.wards("z", { x: 100 + CAMPFIRE_WARD + 20, y: 100 }, 1)).toBe(false);
    expect(fires.wards("autre", { x: 100, y: 100 }, 1)).toBe(false);
  });

  it("n'accepte qu'un feu par région", () => {
    // Sinon on tapisse la vallée de braises et la nuit ne veut plus rien dire.
    const fires = new Campfires();
    fires.light("z", { x: 0, y: 0 }, 0);
    fires.light("z", { x: 200, y: 200 }, 1);
    expect(fires.in("z", 1).length).toBe(1);
  });

  it("traverse minuit", () => {
    // L'heure absolue existe pour ça : un feu allumé à 22 h tient jusqu'à 4 h.
    const now = Campfires.absoluteHour(1, 22);
    const fires = new Campfires();
    fires.light("z", { x: 0, y: 0 }, now);
    expect(fires.in("z", Campfires.absoluteHour(2, 2)).length).toBe(1);
    expect(fires.in("z", Campfires.absoluteHour(2, 5)).length).toBe(0);
  });

  it("oublie les feux éteints", () => {
    const fires = new Campfires();
    fires.light("z", { x: 0, y: 0 }, 0);
    fires.sweep(100);
    expect(fires.count).toBe(0);
  });
});

describe("poste aux pigeons", () => {
  it("ne rend la réponse que le lendemain", () => {
    const post = new PigeonPost();
    expect(post.send("fish_scale", 3)).toBe(true);
    expect(post.collect(3)).toBeNull();
    expect(post.collect(4)).not.toBeNull();
  });

  it("ne rend la réponse qu'une fois", () => {
    const post = new PigeonPost();
    post.send("apple", 1);
    expect(post.collect(2)).not.toBeNull();
    expect(post.collect(2)).toBeNull();
  });

  it("refuse un second envoi tant que le premier vole", () => {
    const post = new PigeonPost();
    expect(post.send("apple", 1)).toBe(true);
    expect(post.send("fish_scale", 1)).toBe(false);
  });

  it("refuse ce dont personne ne veut", () => {
    const post = new PigeonPost();
    expect(post.send("sea_chart", 1)).toBe(false);
    expect(acceptedByPost("sea_chart")).toBe(false);
  });

  it("ne renvoie que des objets qui existent", () => {
    for (const id of Object.keys(ITEMS) as (keyof typeof ITEMS)[]) {
      const reply = replyFor(id);
      if (!reply) continue;
      expect(reply.item in ITEMS, `réponse inconnue pour ${id}`).toBe(true);
      expect(reply.count).toBeGreaterThan(0);
      expect(reply.from.length).toBeGreaterThan(0);
    }
  });

  it("se sauvegarde en vol", () => {
    const post = new PigeonPost();
    post.send("apple", 5);
    const restored = new PigeonPost();
    restored.restore(post.snapshot());
    expect(restored.pending).toBe(true);
    expect(restored.collect(6)).not.toBeNull();
  });
});

describe("flûte de saule", () => {
  it("n'offre que les airs appris", () => {
    const known = new Set<string>();
    expect(knownTunes((flag) => known.has(flag))).toHaveLength(0);
    known.add(TUNES[0]!.learnedFlag);
    expect(knownTunes((flag) => known.has(flag))).toHaveLength(1);
  });

  it("enseigne dans l'ordre, puis n'a plus rien à donner", () => {
    const known = new Set<string>();
    for (const tune of TUNES) {
      const next = nextTuneToTeach((flag) => known.has(flag));
      expect(next?.id).toBe(tune.id);
      known.add(tune.learnedFlag);
    }
    expect(nextTuneToTeach((flag) => known.has(flag))).toBeNull();
  });

  it("donne trois notes et un effet à chaque air", () => {
    for (const tune of TUNES) {
      expect(tune.notes).toHaveLength(3);
      expect(tune.effect.length).toBeGreaterThan(10);
    }
  });
});

describe("forge de Bram", () => {
  it("monte en dégâts à chaque palier", () => {
    for (let level = 1; level < SWORD_TIERS.length; level += 1) {
      expect(tierAt(level).damage).toBeGreaterThan(tierAt(level - 1).damage);
    }
  });

  it("coûte de plus en plus cher", () => {
    for (let level = 1; level < SWORD_TIERS.length; level += 1) {
      expect(tierAt(level).ore).toBeGreaterThan(tierAt(level - 1).ore);
      expect(tierAt(level).rupees).toBeGreaterThan(tierAt(level - 1).rupees);
    }
  });

  it("s'arrête au dernier palier", () => {
    expect(nextTier(SWORD_TIERS.length - 1)).toBeNull();
    expect(tierAt(99).level).toBe(SWORD_TIERS.length - 1);
    expect(tierAt(-5).level).toBe(0);
  });
});

describe("rêves", () => {
  it("suit l'avancement de la partie", () => {
    const debut = dreamFor(() => false);
    const fin = dreamFor(() => true);
    expect(debut.title).not.toBe(fin.title);
  });

  it("en trouve toujours un, quel que soit l'état", () => {
    const flags = new Set<string>();
    for (const dream of ALL_DREAMS) {
      expect(dreamFor((flag) => flags.has(flag))).toBeDefined();
      if (dream.until) flags.add(dream.until);
    }
  });
});

describe("objets et lieux ajoutés", () => {
  it("laisse valider la flûte et le nécessaire à feu sans les consommer", () => {
    for (const id of ACTIONABLE_ITEMS) {
      expect(isUsable(id), `${id} refusé par le sac`).toBe(true);
      expect(itemEffect(id), `${id} ne doit pas se consommer`).toBeUndefined();
    }
  });

  it("ne cuisine qu'avec des objets qui existent", () => {
    for (const recipe of CAMP_RECIPES) {
      expect(recipe.result in ITEMS).toBe(true);
      for (const ingredient of recipe.ingredients) {
        expect(ingredient.item in ITEMS, `${recipe.id} : ${ingredient.item}`).toBe(true);
        expect(ingredient.count).toBeGreaterThan(0);
      }
    }
  });

  it("bâtit les trois nouveaux lieux avec une sortie praticable", () => {
    const tileSet = new TileSet();
    for (const kind of ["library", "orchard", "strand_cave"] as const) {
      const map = new TileMap(createInteriorMap(kind), tileSet);
      expect(INTERIOR_NAMES[kind].length).toBeGreaterThan(0);
      let free = 0;
      for (let y = 0; y < map.height; y += 1) {
        for (let x = 0; x < map.width; x += 1) if (!map.isSolid(x, y)) free += 1;
      }
      // Une pièce meublée jusqu'au plafond n'est pas une pièce.
      expect(free, `${kind} trop encombré`).toBeGreaterThan(map.width * map.height * 0.3);
    }
  });

  it("donne une porte à chaque nouveau lieu, et une condition à chacune", () => {
    for (const id of ["library_hatch", "orchard_gate", "strand_cave_mouth"]) {
      const door = INTERACTABLES.find((entry) => entry.id === id);
      expect(door, `porte ${id} absente`).toBeDefined();
      expect(door!.kind).toBe("door");
      // Sans condition, ces lieux ne seraient que trois pièces de plus.
      expect("requires" in door!, `${id} sans condition`).toBe(true);
    }
  });

  it("place chaque nouvel objet dans une région qui existe", () => {
    for (const entry of INTERACTABLES) {
      expect(WORLD_ZONES.some((zone) => zone.id === entry.zone),
        `${entry.id} dans une région inconnue : ${entry.zone}`).toBe(true);
    }
  });
});
