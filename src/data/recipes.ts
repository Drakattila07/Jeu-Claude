import type { ItemId } from "./items/core";

export interface Recipe {
  readonly id: string;
  readonly ingredients: readonly { readonly item: ItemId; readonly count: number }[];
  readonly result: ItemId;
  readonly message: string;
}

export const RECIPES: readonly Recipe[] = [
  { id: "potion_red", ingredients: [{ item: "bitter_root", count: 2 }, { item: "well_water", count: 1 }],
    result: "red_potion", message: "Le chaudron rougit : Potion rouge !" },
  { id: "potion_green", ingredients: [{ item: "violet_mushroom", count: 1 }, { item: "apple", count: 1 }],
    result: "green_potion", message: "Une vapeur verte s'enroule autour du flacon." },
  { id: "potion_blue", ingredients: [{ item: "fish_scale", count: 1 }, { item: "eye_flower", count: 1 }],
    result: "blue_potion", message: "Potion bleue : trente secondes sous l'eau." },
  { id: "lantern", ingredients: [{ item: "candle", count: 3 }],
    result: "eternal_lantern", message: "Les trois flammes fusionnent en une lanterne éternelle." },
  { id: "letter", ingredients: [{ item: "unsent_letter", count: 1 }],
    result: "letter_truth", message: "Îris lit la lettre. Elle était destinée au Doyen Orme." }
];
