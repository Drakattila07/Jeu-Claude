import { RECIPES } from "../data/recipes";
import { ITEMS, type ItemId } from "../data/items/core";
import type { Inventory } from "./Inventory";

export interface AlchemyResult {
  readonly success: boolean;
  readonly result?: ItemId;
  readonly message: string;
}

export class Alchemy {
  brewFirst(inventory: Inventory): AlchemyResult {
    const recipe = RECIPES.find((candidate) => inventory.hasAll(candidate.ingredients));
    if (recipe) {
      inventory.consume(recipe.ingredients);
      inventory.add(recipe.result);
      return { success: true, result: recipe.result, message: recipe.message };
    }
    const lost = inventory.firstItem();
    if (!lost) return { success: false, message: "Le chaudron bâille. Votre sac est vide." };
    inventory.remove(lost);
    return { success: false, message: `Bloup. ${ITEMS[lost].name} disparaît sans gloire.` };
  }
}
