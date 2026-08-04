import type { Requirement } from "../systems/Requirements";

export type InteractableKind =
  | "well" | "sign" | "door" | "chest" | "pot" | "bush" | "cauldron" | "valve"
  | "roots" | "footprints" | "seal" | "mechanism" | "pickup" | "secret"
  | "offering" | "shrine";

export interface InteractableData {
  readonly id: string;
  readonly zone: string;
  readonly kind: InteractableKind;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  /** Condition à remplir pour que l'objet réagisse. */
  readonly requires?: Requirement;
}

export const INTERACTABLES = [
  { id: "well", zone: "place_puits", kind: "well", x: 256, y: 224, text: "Le seau remonte vide. Il ne reste que de la poussière." },
  { id: "valley_sign", zone: "place_puits", kind: "sign", x: 64, y: 96, text: "VALLÉE DE BRUYÈRE — Flèches : marcher. X : agir. Entrée : sac." },
  { id: "elder_house_door", zone: "place_puits", kind: "door", x: 256, y: 96, text: "Entrer dans la maison du Doyen." },
  { id: "hermitage_door", zone: "ermitage_gorm", kind: "door", x: 352, y: 128, text: "Entrer dans l'ermitage de Gorm." },
  { id: "castle_gate", zone: "portail_scelle", kind: "door", x: 240, y: 160, text: "Franchir les portes du Château de Cendre." },
  { id: "witch_tower_door", zone: "cabane_iris", kind: "door", x: 240, y: 192, text: "Entrer dans la Tour de Lune." },
  { id: "starter_chest", zone: "hameau_nord", kind: "chest", x: 192, y: 256, text: "Vous trouvez 20 rubis !" },
  { id: "south_pot", zone: "hameau_sud", kind: "pot", x: 352, y: 224, text: "Une vieille jarre fêlée." },
  { id: "quay_bush", zone: "quai_lac", kind: "bush", x: 128, y: 192, text: "Un buisson agité par le vent du lac." },
  { id: "iris_cauldron", zone: "lisiere_carrefour", kind: "cauldron", x: 96, y: 224, text: "Le chaudron bouillonne d'impatience." },
  { id: "canal_valve", zone: "canal_entry", kind: "valve", x: 256, y: 224, text: "Une lourde vanne de bronze." },
  { id: "source_roots", zone: "bosquet_souches", kind: "roots", x: 256, y: 128, text: "Des racines épaisses bloquent la vanne." },
  { id: "walker_trace", zone: "clairiere_cimes", kind: "footprints", x: 224, y: 224, text: "D'immenses empreintes quittent la clairière." },
  { id: "seal_a", zone: "marches_ruines", kind: "seal", x: 160, y: 192, text: "Le Sceau du Bloc." },
  { id: "seal_b", zone: "marches_ruines", kind: "seal", x: 256, y: 128, text: "Le Sceau du Regard." },
  { id: "seal_c", zone: "marches_ruines", kind: "seal", x: 352, y: 192, text: "Le Sceau du Rythme." },
  { id: "mechanism_heart", zone: "canal_entry", kind: "mechanism", x: 352, y: 160, text: "La roue centrale attend une impulsion." },
  { id: "lost_rod", zone: "lisiere_carrefour", kind: "pickup", x: 416, y: 288, text: "La canne perdue de Nessa !" },
  { id: "ghost_stump", zone: "bosquet_souches", kind: "secret", x: 128, y: 256, text: "La Souche Fantôme est coincée." },
  { id: "statue_intersection", zone: "marches_ruines", kind: "secret", x: 256, y: 256, text: "Les six regards convergent ici." },

  // — Déclencheurs des activités annexes, jusqu'ici absents du monde —

  {
    id: "bitter_roots_bundle", zone: "bosquet_souches", kind: "offering", x: 384, y: 256,
    text: "Vous liez cinq racines amères en fagot. Mira saura quoi en faire.",
    requires: {
      items: [{ item: "bitter_root", count: 5 }],
      refusal: "Un lien de chanvre pend à la souche. Il faudrait cinq racines amères.",
    },
  },
  {
    id: "moon_ore_cache", zone: "cour_statues", kind: "shrine", x: 128, y: 144,
    text: "La veine s'illumine sous l'averse : trois éclats de Minerai de Lune.",
    requires: {
      weather: "rain",
      refusal: "La roche reste terne. Bram disait qu'elle ne brille que sous la pluie.",
    },
  },
  {
    id: "plates_solution", zone: "hameau_sud", kind: "shrine", x: 288, y: 128,
    text: "Vous frappez les dalles dans l'ordre. La comptine des jumeaux se referme.",
    requires: {
      flags: ["heard_ryn", "heard_tam"],
      refusal: "Six dalles usées. Il vous manque une moitié de la comptine.",
    },
  },
  {
    id: "candle_circle", zone: "marches_hauteurs", kind: "offering", x: 256, y: 192,
    text: "Les sept flammes se lèvent d'un coup. Le cercle tient.",
    requires: {
      items: [{ item: "candle", count: 7 }],
      night: true,
      refusal: "Sept socles vides. Il faut sept chandelles — et la nuit pour les voir.",
    },
  },
  {
    id: "willow_stones", zone: "ilot_saule", kind: "shrine", x: 224, y: 176,
    text: "Trois notes montent du saule et le puits leur répond au loin.",
    requires: {
      flags: ["source_open"],
      refusal: "Les pierres sonnent creux. Le puits doit d'abord retrouver sa voix.",
    },
  },
  {
    id: "gorm_feast", zone: "marches_ruines", kind: "offering", x: 416, y: 192,
    text: "Gorm mange sans un mot, puis vous parle enfin de la Cime.",
    requires: {
      items: [{ item: "apple", count: 3 }],
      refusal: "Gorm lorgne votre sac. Trois pommes le décideraient peut-être.",
    },
  },
  {
    id: "letter_choice", zone: "place_puits", kind: "offering", x: 128, y: 192,
    text: "Vous glissez la lettre sous la bonne porte. Quarante ans plus tard.",
    requires: {
      items: [{ item: "unsent_letter", count: 1 }],
      refusal: "Une fente à courrier, close depuis longtemps. Il faudrait une lettre.",
    },
  },
] as const satisfies readonly InteractableData[];
