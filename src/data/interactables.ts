import type { ItemId } from "./items/core";
import type { Requirement } from "../systems/Requirements";
import { CHRONICLE } from "./chronicle";

export type InteractableKind =
  | "well" | "sign" | "door" | "chest" | "pot" | "bush" | "cauldron" | "valve"
  | "roots" | "footprints" | "seal" | "mechanism" | "pickup" | "secret"
  | "offering" | "shrine"
  // L'enclume de Bram, le foyer qu'on allume, le perchoir de Colombin.
  | "anvil" | "campfire" | "dovecote"
  // Les planches du potager, le pupitre de la Bibliothèque, les cairns.
  | "plot" | "lectern" | "cairn";

export interface InteractableData {
  readonly id: string;
  readonly zone: string;
  readonly kind: InteractableKind;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  /** Condition à remplir pour que l'objet réagisse. */
  readonly requires?: Requirement;
  /**
   * Objet remis la première fois qu'on le fouille. Sans ce champ, un coffre ne
   * pouvait rendre que des rubis, et toute quête de collecte devait passer par
   * un déclencheur scénarisé.
   */
  readonly grants?: { readonly item: ItemId; readonly count: number };
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

  // — Port-Marée, la mer et le volcan —

  { id: "shipyard_notice", zone: "port_maree", kind: "sign", x: 208, y: 240,
    text: "CHANTIER NAVAL DE SARN — Bordés, filins, radoub. On ne vend pas la mer." },
  {
    id: "shipyard_hull", zone: "port_maree", kind: "offering", x: 272, y: 304,
    text: "Sarn river les bordés, tend le filin, crache dans ses mains. La barque est à vous.",
    requires: {
      items: [{ item: "hull_plank", count: 2 }, { item: "tar_rope", count: 1 }],
      refusal: "La coque bâille encore. Sarn veut deux bordés de chêne et un filin goudronné.",
    },
  },
  { id: "beached_wreck", zone: "greve_de_maree", kind: "chest", x: 176, y: 224,
    text: "Sous les algues, deux bordés de chêne encore sains.",
    grants: { item: "hull_plank", count: 2 } },
  { id: "rope_locker", zone: "criques", kind: "chest", x: 288, y: 176,
    text: "Un coffre de gabier oublié : un filin goudronné, raide de sel.",
    grants: { item: "tar_rope", count: 1 } },
  {
    id: "lighthouse_lamp", zone: "ile_du_phare", kind: "shrine", x: 240, y: 160,
    text: "La Veuve Hale monte la mèche. Le faisceau balaie la passe, et vous donne la Carte des Courants.",
    requires: {
      flags: ["boat"],
      refusal: "La lampe est froide. On ne relève pas une passe qu'on ne peut pas suivre.",
    },
  },
  { id: "bone_cairn", zone: "ile_des_os", kind: "secret", x: 256, y: 240,
    text: "Un cairn d'os de baleine. Dessous, la bourse d'un capitaine." },
  { id: "fortress_gate", zone: "vertepierre", kind: "door", x: 240, y: 224,
    text: "Franchir la herse de Vertepierre." },
  {
    id: "dragon_altar", zone: "caldeira", kind: "shrine", x: 240, y: 256,
    text: "Vous posez l'écaille sur l'autel. La montagne se tait enfin.",
    requires: {
      items: [{ item: "dragon_scale", count: 1 }],
      refusal: "L'autel attend une écaille. Le dragon la porte encore.",
    },
  },

  // — Les trois nouveaux lieux —

  {
    id: "library_hatch", zone: "grotte_noyee", kind: "door", x: 256, y: 208,
    text: "Descendre dans la Bibliothèque Noyée.",
    requires: {
      items: [{ item: "lead_boots", count: 1 }],
      refusal: "Une trappe sous trois mètres d'eau. On ne descend pas sans lest.",
    },
  },
  {
    id: "orchard_gate", zone: "verger_haut", kind: "door", x: 208, y: 160,
    text: "Pousser la claie du Verger de Nuit.",
    requires: {
      night: true,
      refusal: "La claie est ouverte, mais les branches sont nues. Sœur Aubel disait : après vingt heures.",
    },
  },
  {
    id: "strand_cave_mouth", zone: "greve_de_maree", kind: "door", x: 384, y: 288,
    text: "Entrer dans la Grotte de l'Estran.",
    requires: {
      tide: "basse",
      refusal: "L'entrée est sous l'eau. Il faudrait attendre que la mer se retire.",
    },
  },

  // — Les nouveaux gestes : forger, camper, poster —

  { id: "bram_anvil", zone: "hameau_nord", kind: "anvil", x: 224, y: 160,
    text: "L'enclume de Bram, tiède même la nuit." },
  { id: "colombin_dovecote", zone: "hameau_nord", kind: "dovecote", x: 320, y: 288,
    text: "Le pigeonnier de Colombin. Ça roucoule là-dedans." },
  { id: "wren_stone", zone: "place_puits", kind: "shrine", x: 352, y: 304,
    text: "Une pierre plate où l'on s'assied pour jouer. Wren y a laissé des marques.",
    requires: {
      flags: ["tune_pluie"],
      refusal: "Trois encoches sur la pierre. Il faudrait connaître au moins un air.",
    },
  },
  { id: "willow_flute_gift", zone: "ilot_saule", kind: "pickup", x: 176, y: 208,
    text: "Une flûte de saule, oubliée au pied de l'arbre. Wren la cherchait.",
    grants: { item: "willow_flute", count: 1 } },
  { id: "tinder_kit_chest", zone: "lisiere_sentier", kind: "chest", x: 288, y: 224,
    text: "Un nécessaire à feu dans une boîte de fer-blanc : amadou sec, silex, patience.",
    grants: { item: "tinder_kit", count: 1 } },
  { id: "strand_pearls", zone: "greve_de_maree", kind: "bush", x: 208, y: 336,
    text: "Le sable nu rend deux perles d'estran.",
    requires: {
      tide: "basse",
      refusal: "La mer couvre encore le banc. Rien à ramasser.",
    },
    grants: { item: "tide_pearl", count: 2 } },

  // — Le potager de Sévère : six planches, aux Champs Ouest —
  //   Il était d'abord au Hameau Sud, où ses ancres perçaient une façade :
  //   un carré de légumes a sa place aux champs, pas entre deux maisons.

  { id: "plot_1", zone: "champs_ouest", kind: "plot", x: 128, y: 176, text: "Première planche." },
  { id: "plot_2", zone: "champs_ouest", kind: "plot", x: 176, y: 176, text: "Deuxième planche." },
  { id: "plot_3", zone: "champs_ouest", kind: "plot", x: 224, y: 176, text: "Troisième planche." },
  { id: "plot_4", zone: "champs_ouest", kind: "plot", x: 128, y: 224, text: "Quatrième planche." },
  { id: "plot_5", zone: "champs_ouest", kind: "plot", x: 176, y: 224, text: "Cinquième planche." },
  { id: "plot_6", zone: "champs_ouest", kind: "plot", x: 224, y: 224, text: "Sixième planche." },

  // — Le Cairn des Douze : quatre pierres, une par point cardinal —

  { id: "cairn_nord", zone: "aiguille_nord", kind: "cairn", x: 256, y: 128,
    text: "CAIRN DU NORD — « Compte les feuillets, pas les pas. »" },
  { id: "cairn_sud", zone: "ile_du_phare", kind: "cairn", x: 176, y: 320,
    text: "CAIRN DU SUD — « Douze pages, douze pierres, une seule main pour les tenir. »" },
  { id: "cairn_est", zone: "remparts_est", kind: "cairn", x: 352, y: 224,
    text: "CAIRN DE L'EST — « Ce que tu n'as pas lu, tu ne l'as pas vu. »" },
  {
    id: "cairn_ouest", zone: "marais_noir", kind: "cairn", x: 128, y: 288,
    text: "Les quatre cairns s'accordent. La Chronique est complète, et la vallée vous doit une histoire.",
    requires: {
      items: [{ item: "chronicle_page", count: 12 }],
      refusal: "CAIRN DE L'OUEST — la pierre reste froide. Il manque des feuillets à la Chronique.",
    },
  },

  // — Bouclier, arrosoir, licol, teintures —

  { id: "oak_shield_chest", zone: "cour_statues", kind: "chest", x: 352, y: 288,
    text: "Une rondache de chêne, cerclée de fer, oubliée sous une statue.",
    grants: { item: "oak_shield", count: 1 } },
  { id: "watering_can_pickup", zone: "champs_ouest", kind: "pickup", x: 288, y: 200,
    text: "L'arrosoir de fer-blanc de Sévère, cabossé mais étanche.",
    grants: { item: "watering_can", count: 1 } },
  { id: "mule_bridle_chest", zone: "grange", kind: "chest", x: 288, y: 240,
    text: "Un licol pend à la poutre. Au fond du box, quelque chose souffle.",
    grants: { item: "mule_bridle", count: 1 } },
  { id: "dye_pots_chest", zone: "vergers_est", kind: "chest", x: 176, y: 288,
    text: "Trois pots de teinture : garance, guède, safran.",
    grants: { item: "dye_pot", count: 3 } },
  { id: "satchel_gift", zone: "quai_des_carenes", kind: "chest", x: 240, y: 208,
    text: "Sarn a cousu un double fond dans une vieille besace. Elle est pour vous.",
    grants: { item: "bigger_satchel", count: 1 } },
] as const satisfies readonly InteractableData[];

/**
 * Feuillets de la Chronique, posés d'après leur déclaration.
 *
 * Les écrire un par un dans la liste ci-dessus aurait dupliqué douze fois la
 * même forme, et l'on aurait fini par désaccorder le texte du feuillet et sa
 * position.
 */
export const CHRONICLE_PICKUPS: readonly InteractableData[] = CHRONICLE.map((page) => ({
  id: `chronicle_${page.number}`,
  zone: page.zone,
  kind: "pickup" as const,
  x: page.x,
  y: page.y,
  text: `Feuillet ${page.number} de la Chronique — « ${page.title} »`,
  grants: { item: "chronicle_page" as const, count: 1 },
}));

/** Tous les objets du monde, feuillets compris. */
export const ALL_INTERACTABLES: readonly InteractableData[] = [
  ...INTERACTABLES, ...CHRONICLE_PICKUPS,
];
