/**
 * La flûte de saule.
 *
 * Trois airs, appris séparément auprès de Wren. Chacun agit sur le monde et
 * non sur le sac : c'est ce qui les distingue d'un objet consommable, et ce
 * qui justifie qu'ils occupent leur propre menu.
 */

export type TuneId = "pluie" | "couchant" | "chat";

export interface Tune {
  readonly id: TuneId;
  readonly name: string;
  /** Drapeau posé par Wren quand elle l'a enseigné. */
  readonly learnedFlag: string;
  /** Les trois notes, pour l'affichage. */
  readonly notes: readonly [string, string, string];
  readonly effect: string;
}

export const TUNES: readonly Tune[] = [
  {
    id: "pluie", name: "Air de Pluie", learnedFlag: "tune_pluie",
    notes: ["la", "ré", "la"],
    effect: "Le ciel se couvre jusqu'au lendemain.",
  },
  {
    id: "couchant", name: "Air du Couchant", learnedFlag: "tune_couchant",
    notes: ["mi", "do", "sol"],
    effect: "Le jour bascule d'un coup vers le soir.",
  },
  {
    id: "chat", name: "Air du Chat", learnedFlag: "tune_chat",
    notes: ["sol", "sol", "ré"],
    effect: "Le Chat-Lanterne vient, où que vous soyez.",
  },
];

export function tuneById(id: TuneId): Tune {
  return TUNES.find((tune) => tune.id === id)!;
}

/** Airs déjà appris, dans l'ordre du carnet. */
export function knownTunes(hasFlag: (flag: string) => boolean): readonly Tune[] {
  return TUNES.filter((tune) => hasFlag(tune.learnedFlag));
}

/**
 * Ordre d'enseignement. Wren donne toujours l'air suivant, jamais au hasard :
 * une baladine qui distribue son répertoire en désordre n'est pas une
 * baladine, c'est une machine à sous.
 */
export function nextTuneToTeach(hasFlag: (flag: string) => boolean): Tune | null {
  return TUNES.find((tune) => !hasFlag(tune.learnedFlag)) ?? null;
}
