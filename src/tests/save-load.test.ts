import { describe, expect, it } from "vitest";
import { SaveLoad, type SaveData } from "../systems/SaveLoad";

describe("sauvegardes", () => {
  it("isole trois slots et ignore les données corrompues", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    };
    const saves = new SaveLoad(storage);
    const data: SaveData = {
      version: 1, savedAt: "2026-01-01", frame: 1,
      player: { x: 1, y: 2, hearts: 6, rupees: 12 }, zone: { x: 3, y: 3 },
      flags: [], inventory: [], quests: {}, explored: [], objects: [],
      clock: { day: 1, hour: 9, minute: 0 },
    };
    saves.save(1, data);
    expect(saves.load(0)).toBeNull();
    expect(saves.load(1)?.player.rupees).toBe(12);
    memory.set("racines-creuses:slot:2", "{cassé");
    expect(saves.load(2)).toBeNull();
  });
});
