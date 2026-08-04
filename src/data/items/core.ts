export interface ItemEffect {
  /** Cœurs rendus à la consommation. */
  readonly heal?: number;
  /** Endurance rendue. */
  readonly stamina?: number;
  /** Cœurs maximum gagnés définitivement. */
  readonly maxHearts?: number;
}

export interface ItemDefinition {
  readonly name: string;
  readonly stack: number;
  readonly description: string;
  /** Présent si l'objet se consomme avec la touche « objet ». */
  readonly effect?: ItemEffect;
}

export const ITEMS = {
  bitter_root: {
    name: "Racine amère", stack: 20,
    description: "Amère à pleurer. Mira en fait des cataplasmes.",
    effect: { stamina: 40 },
  },
  well_water: {
    name: "Eau du puits", stack: 9,
    description: "Fraîche et minérale. Elle remet debout.",
    effect: { heal: 1, stamina: 60 },
  },
  violet_mushroom: {
    name: "Champignon violet", stack: 20,
    description: "Pousse là où la lumière n'atteint plus.",
  },
  apple: {
    name: "Pomme", stack: 20,
    description: "Un fruit des vergers du hameau.",
    effect: { heal: 1 },
  },
  fish_scale: { name: "Écaille de poisson", stack: 20, description: "Irisée. Le Colporteur en raffole." },
  eye_flower: { name: "Fleur-Œil", stack: 20, description: "Elle suit du regard qui la cueille." },
  candle: { name: "Chandelle", stack: 7, description: "Sept d'un coup, dit la vieille formule." },
  unsent_letter: { name: "Lettre jamais envoyée", stack: 1, description: "Quarante ans d'encre séchée." },
  red_potion: {
    name: "Potion rouge", stack: 3,
    description: "Referme les plaies d'un coup de gorge.",
    effect: { heal: 6 },
  },
  green_potion: {
    name: "Potion verte", stack: 3,
    description: "Le souffle revient comme après une nuit de sommeil.",
    effect: { stamina: 100 },
  },
  blue_potion: {
    name: "Potion bleue", stack: 3,
    description: "Soigne le corps et l'élan d'un même trait.",
    effect: { heal: 4, stamina: 100 },
  },
  eternal_lantern: {
    name: "Lanterne éternelle", stack: 1,
    description: "Sa flamme ne demande rien et n'obéit à personne.",
  },
  letter_truth: { name: "Secret de la lettre", stack: 1, description: "Ce que personne n'a jamais lu." },
  lead_boots: { name: "Bottes de plomb", stack: 1, description: "On marche au fond sans être emporté." },
  half_demon_skull: {
    name: "Crâne du Demi-Démon", stack: 1,
    description: "Il chauffe contre la paume. Maj le réveille.",
  },
  heart_shard: {
    name: "Éclat de cœur", stack: 4,
    description: "Quatre éclats valent un cœur de plus.",
  },
} as const satisfies Record<string, ItemDefinition>;

export type ItemId = keyof typeof ITEMS;

/**
 * Effet d'un objet, sous une forme large.
 *
 * `as const satisfies` fige chaque entrée dans son type littéral : lire
 * `ITEMS[id].effect.heal` ne compile pas quand une seule entrée de l'union n'a
 * pas ce champ. Cet accesseur ramène tout le monde au même contrat.
 */
export function itemEffect(id: ItemId): ItemEffect | undefined {
  const definition: ItemDefinition = ITEMS[id];
  return definition.effect;
}

/** Objets consommables, dans l'ordre où la touche « objet » les propose. */
export const USABLE_ITEMS: readonly ItemId[] = (Object.keys(ITEMS) as ItemId[])
  .filter((id) => itemEffect(id) !== undefined);
