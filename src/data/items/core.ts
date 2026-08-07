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
  // — La mer —
  hull_plank: {
    name: "Bordé de chêne", stack: 6,
    description: "Une planche cintrée à la vapeur, prête à river.",
  },
  tar_rope: {
    name: "Filin goudronné", stack: 4,
    description: "Il sent le brai chaud. Ça tient par tous les temps.",
  },
  sea_chart: {
    name: "Carte des Courants", stack: 1,
    description: "Le tracé des veines froides. Sans elle, le large vous rend.",
  },
  fortress_key: {
    name: "Clé de Vertepierre", stack: 3,
    description: "Fer vert-de-gris. Une porte, une clé.",
  },
  dragon_scale: {
    name: "Écaille de dragon", stack: 1,
    description: "Encore tiède. Elle pèse le poids d'une main.",
  },

  // — La flûte, le camp, le verger, la poste —

  /**
   * Le minerai de lune existait comme cible de quête sans jamais exister
   * comme objet : on en « ramassait » trois sans rien avoir dans le sac.
   */
  moon_ore: {
    name: "Minerai de lune", stack: 12,
    description: "Il ne brille que sous la pluie. Bram le paie en trempes.",
  },
  willow_flute: {
    name: "Flûte de saule", stack: 1,
    description: "Trois trous, trois airs. Wren jure qu'il n'en faut pas plus.",
  },
  tinder_kit: {
    name: "Nécessaire à feu", stack: 1,
    description: "Amadou, silex, patience. De quoi tenir une nuit dehors.",
  },
  night_pear: {
    name: "Poire de nuit", stack: 12,
    description: "Elle ne mûrit qu'après vingt heures. Sucrée, presque suspecte.",
    effect: { heal: 2 },
  },
  smoked_fish: {
    name: "Poisson fumé", stack: 9,
    description: "Cuit au feu de camp. Tient au corps et au moral.",
    effect: { heal: 3, stamina: 60 },
  },
  root_stew: {
    name: "Ragoût de racines", stack: 6,
    description: "Amer, chaud, réconfortant. Le trio gagnant d'un bivouac.",
    effect: { heal: 2, stamina: 100 },
  },
  heron_sketch: {
    name: "Croquis du Héron", stack: 1,
    description: "Trois traits d'encre. Vous l'avez approché d'assez près.",
  },
  drowned_page: {
    name: "Feuillet noyé", stack: 9,
    description: "L'encre a coulé, le sens tient encore. La Bibliothèque en manque.",
  },
  postal_token: {
    name: "Jeton de poste", stack: 9,
    description: "Colombin le rend contre un envoi. Un pigeon, un jeton.",
  },
  tide_pearl: {
    name: "Perle d'estran", stack: 4,
    description: "Ramassée sur le sable nu. La mer la reprend si on tarde.",
  },
  sword_temper: {
    name: "Trempe de Bram", stack: 3,
    description: "Un certificat de forge. Trois paliers, trois trempes.",
  },

  // — Bouclier, graines, chronique, teintures —

  oak_shield: {
    name: "Rondache de chêne", stack: 1,
    description: "Lourde, honnête. E ou Q pour la lever ; au dernier moment, elle pare.",
  },
  bitter_seed: {
    name: "Graines de racine", stack: 20,
    description: "Amères jusque dans le sachet. Deux jours de terre et d'eau.",
  },
  spore_pouch: {
    name: "Sachet de spores", stack: 20,
    description: "Ça sent la cave. Une nuit suffit à les faire lever.",
  },
  eye_seed: {
    name: "Pépins de Fleur-Œil", stack: 20,
    description: "Ils vous regardent déjà. Trois jours, et ils seront plusieurs.",
  },
  chronicle_page: {
    name: "Feuillet de la Chronique", stack: 12,
    description: "Douze en tout. La Bibliothèque Noyée sait les relier.",
  },
  watering_can: {
    name: "Arrosoir de fer-blanc", stack: 1,
    description: "Cabossé, étanche. Une planche par jour, pas deux.",
  },
  dye_pot: {
    name: "Pot de teinture", stack: 6,
    description: "Garance, guède, safran. Le manteau y passe et n'en revient pas pareil.",
  },
  bigger_satchel: {
    name: "Besace doublée", stack: 1,
    description: "Un double fond cousu par Sarn. Tout y tient deux fois mieux.",
  },
  mule_bridle: {
    name: "Licol du mulet", stack: 1,
    description: "Il s'appelle Grognon. Le nom n'est pas de vous.",
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

/**
 * Objets qui *font* quelque chose sans se consommer.
 *
 * Le sac ne savait qu'avaler : un objet sans `effect` était rangé au rayon
 * « objet de quête » et le menu refusait de le valider. La flûte et le
 * nécessaire à feu ouvrent leur propre liste et ne disparaissent pas.
 */
export const ACTIONABLE_ITEMS: ReadonlySet<ItemId> = new Set<ItemId>([
  "willow_flute", "tinder_kit", "dye_pot",
]);

/** Vrai si le sac doit laisser valider cet objet. */
export function isUsable(id: ItemId): boolean {
  return itemEffect(id) !== undefined || ACTIONABLE_ITEMS.has(id);
}
