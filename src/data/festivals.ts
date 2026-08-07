import type { Season } from "../core/Clock";
import type { ItemId } from "./items/core";

/**
 * Fêtes du calendrier.
 *
 * Le jour s'affichait dans l'ATH et ne voulait rien dire : J7 valait J3. Une
 * fête tombe à un jour précis de la saison, change ce qu'on lit dans les
 * villages, et laisse quelque chose — sinon ce serait un message de plus.
 */
export interface Festival {
  readonly id: string;
  readonly name: string;
  readonly season: Season;
  /** Jour de la saison où elle tombe, à partir de 1. */
  readonly dayOfSeason: number;
  /** Région où elle se tient. */
  readonly zone: string;
  readonly announce: string;
  readonly text: string;
  /** Ce qu'on emporte en y passant, une fois. */
  readonly gift: { readonly item: ItemId; readonly count: number };
}

export const FESTIVALS: readonly Festival[] = [
  {
    id: "foire_graines", name: "La Foire aux Graines", season: "printemps", dayOfSeason: 1,
    zone: "place_puits",
    announce: "LA FOIRE AUX GRAINES — la Place est pleine de sacs de toile.",
    text: "Toute la vallée troque ses semences sur la Place. On vous glisse trois "
      + "sachets sans rien demander : « Une cartographe qui sème, ça se raconte. »",
    gift: { item: "bitter_seed", count: 3 },
  },
  {
    id: "fete_lanternes", name: "La Fête des Lanternes", season: "été", dayOfSeason: 2,
    zone: "quai_lac",
    announce: "LA FÊTE DES LANTERNES — le lac porte des lumières jusqu'au large.",
    text: "On pose des lanternes de papier sur l'eau et on les regarde partir. "
      + "Nessa vous en tend une, déjà allumée. « Ne la lâche pas trop tôt. »",
    gift: { item: "candle", count: 4 },
  },
  {
    id: "veillee_moisson", name: "La Veillée des Moissons", season: "automne", dayOfSeason: 1,
    zone: "champs_est",
    announce: "LA VEILLÉE DES MOISSONS — on bat le blé jusqu'à la nuit.",
    text: "Les fléaux frappent en cadence et personne ne compte les heures. "
      + "Alban vous met un bol chaud dans les mains sans vous demander votre avis.",
    gift: { item: "root_stew", count: 2 },
  },
  {
    id: "nuit_longue", name: "La Nuit Longue", season: "hiver", dayOfSeason: 2,
    zone: "hameau_sud",
    announce: "LA NUIT LONGUE — toutes les portes du hameau restent ouvertes.",
    text: "C'est la nuit où l'on ne ferme rien, pour que personne ne dorme dehors. "
      + "Les jumeaux chantent leur comptine en entier, et pour une fois d'accord.",
    gift: { item: "blue_potion", count: 1 },
  },
];

/** La fête du jour dans cette région, s'il y en a une. */
export function festivalAt(zoneId: string, season: Season, dayOfSeason: number): Festival | null {
  return FESTIVALS.find((festival) => festival.zone === zoneId
    && festival.season === season && festival.dayOfSeason === dayOfSeason) ?? null;
}

/** La fête du jour, où qu'elle se tienne : sert à l'annoncer de loin. */
export function festivalToday(season: Season, dayOfSeason: number): Festival | null {
  return FESTIVALS.find((festival) =>
    festival.season === season && festival.dayOfSeason === dayOfSeason) ?? null;
}
