import { describe, expect, it } from "vitest";
import { Alchemy } from "../systems/Alchemy";
import { Inventory } from "../systems/Inventory";

describe("chaudron d'Îris", () => {
  it("consomme une recette et ajoute sa potion", () => {
    const inventory = new Inventory();
    inventory.add("bitter_root", 2);
    inventory.add("well_water");
    const result = new Alchemy().brewFirst(inventory);
    expect(result.result).toBe("red_potion");
    expect(inventory.count("bitter_root")).toBe(0);
    expect(inventory.count("red_potion")).toBe(1);
  });

  it("fait bloup avec un objet sans recette", () => {
    const inventory = new Inventory();
    inventory.add("apple");
    expect(new Alchemy().brewFirst(inventory).success).toBe(false);
    expect(inventory.count("apple")).toBe(0);
  });
});
