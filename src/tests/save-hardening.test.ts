import { describe, expect, it } from "vitest";
import { SaveLoad, type SaveData } from "../systems/SaveLoad";
import { Inventory } from "../systems/Inventory";

function makeStorage() {
  const memory = new Map<string, string>();
  return {
    memory,
    storage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    },
  };
}

const VALID: SaveData = {
  version: 1, savedAt: "2026-07-29", frame: 42,
  player: { x: 10, y: 20, hearts: 6, rupees: 30 }, zone: { x: 3, y: 3 },
  flags: ["source_open"], inventory: [{ id: "apple", count: 2 }],
  quests: { act1_puits_muet: { status: "active", step: 1, progress: 0 } },
  explored: ["3,3"], objects: [["place_puits:well", true]],
  clock: { day: 2, hour: 14, minute: 30 },
  checkpoint: { zone: { x: 3, y: 3 }, x: 120, y: 128, deaths: 1 },
  purchases: ["buy_debt"],
};

describe("robustesse des sauvegardes", () => {
  it("accepte une sauvegarde complète et la rend telle quelle", () => {
    const { storage } = makeStorage();
    const saves = new SaveLoad(storage);
    saves.save(0, VALID);
    const loaded = saves.load(0);
    expect(loaded?.checkpoint?.deaths).toBe(1);
    expect(loaded?.purchases).toEqual(["buy_debt"]);
  });

  it("reste compatible avec les sauvegardes d'avant le point de renaissance", () => {
    const { storage, memory } = makeStorage();
    const legacy = { ...VALID };
    delete (legacy as Record<string, unknown>).checkpoint;
    delete (legacy as Record<string, unknown>).purchases;
    memory.set("racines-creuses:slot:0", JSON.stringify(legacy));
    expect(new SaveLoad(storage).load(0)).not.toBeNull();
  });

  // Ces champs passaient sans contrôle : la partie plantait au démarrage et,
  // la sauvegarde fautive étant rechargée à chaque lancement, restait bloquée.
  const corruptions: readonly [string, unknown][] = [
    ["inventory", undefined],
    ["inventory", [{ id: "objet_inconnu", count: 1 }]],
    ["inventory", "pas un tableau"],
    ["quests", undefined],
    ["quests", { bad: { status: "inventé", step: 0, progress: 0 } }],
    ["clock", undefined],
    ["clock", { day: 1 }],
    ["objects", [["clé", "pas un booléen"]]],
    ["explored", [42]],
    ["flags", "pas un tableau"],
    ["frame", "beaucoup"],
    ["player", { x: 1, y: 2 }],
    ["zone", null],
  ];

  it.each(corruptions)("rejette une sauvegarde dont %s vaut %o", (field, value) => {
    const { storage, memory } = makeStorage();
    const broken: Record<string, unknown> = { ...VALID };
    if (value === undefined) delete broken[field];
    else broken[field] = value;
    memory.set("racines-creuses:slot:0", JSON.stringify(broken));
    expect(new SaveLoad(storage).load(0)).toBeNull();
  });

  it("ignore les objets inconnus au lieu d'exploser à la restauration", () => {
    const inventory = new Inventory();
    const entries = [
      { id: "apple", count: 2 },
      { id: "objet_fantome", count: 3 },
    ] as unknown as readonly { readonly id: "apple"; readonly count: number }[];
    expect(() => inventory.restore(entries)).not.toThrow();
    expect(inventory.count("apple")).toBe(2);
  });
});
