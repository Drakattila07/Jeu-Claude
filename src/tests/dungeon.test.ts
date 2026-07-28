import { describe, expect, it } from "vitest";
import { Dungeon } from "../systems/Dungeon";

describe("Canal Tari", () => {
  it("propage chaque vanne aux salles adjacentes", () => {
    const dungeon = new Dungeon();
    expect(dungeon.waterLevel(0)).toBe(0);
    dungeon.turnValve(0);
    expect(dungeon.waterLevel(0)).toBe(1);
    expect(dungeon.waterLevel(1)).toBe(2);
  });

  it("accorde les Bottes de Plomb dans la salle 6", () => {
    const dungeon = new Dungeon();
    dungeon.enterRoom(5);
    expect(dungeon.bootsFound).toBe(true);
  });
});
