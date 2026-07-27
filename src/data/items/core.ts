export const ITEMS = {
  bitter_root: { name: "Racine amère", stack: 20 },
  well_water: { name: "Eau du puits", stack: 9 },
  violet_mushroom: { name: "Champignon violet", stack: 20 },
  apple: { name: "Pomme", stack: 20 },
  fish_scale: { name: "Écaille de poisson", stack: 20 },
  eye_flower: { name: "Fleur-Œil", stack: 20 },
  candle: { name: "Chandelle", stack: 7 },
  unsent_letter: { name: "Lettre jamais envoyée", stack: 1 },
  red_potion: { name: "Potion rouge", stack: 3 },
  green_potion: { name: "Potion verte", stack: 3 },
  blue_potion: { name: "Potion bleue", stack: 3 },
  eternal_lantern: { name: "Lanterne éternelle", stack: 1 },
  letter_truth: { name: "Secret de la lettre", stack: 1 },
  lead_boots: { name: "Bottes de plomb", stack: 1 }
} as const;

export type ItemId = keyof typeof ITEMS;
