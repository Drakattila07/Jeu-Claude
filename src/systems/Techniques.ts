/**
 * Techniques d'épée.
 *
 * Le combat avait deux gestes — frapper et charger — et rien à apprendre. Une
 * technique n'est pas un bonus passif : chacune se déclenche dans une
 * situation précise, et l'on doit se mettre dans cette situation.
 */

export type TechniqueId = "estoc" | "fauche" | "riposte";

export interface Technique {
  readonly id: TechniqueId;
  readonly name: string;
  /** Drapeau posé par Kerdec quand il l'a enseignée. */
  readonly learnedFlag: string;
  /** Ce qu'il faut faire pour la déclencher. */
  readonly trigger: string;
  readonly effect: string;
  /** Rubis exigés par la leçon. */
  readonly price: number;
  readonly lesson: string;
}

export const TECHNIQUES: readonly Technique[] = [
  {
    id: "estoc", name: "L'Estoc", learnedFlag: "tech_estoc",
    trigger: "Frapper au sortir d'une roulade.",
    effect: "La pointe porte : dégâts doublés et allonge accrue.",
    price: 60,
    lesson: "« Une roulade n'est pas une fuite. C'est un élan. Sers-t'en. »",
  },
  {
    id: "fauche", name: "La Fauche", learnedFlag: "tech_fauche",
    trigger: "Frapper trois fois de suite sans être touchée.",
    effect: "Le troisième coup balaie tout autour de vous.",
    price: 140,
    lesson: "« Trois coups. Le premier prévient, le second ment, le troisième compte. »",
  },
  {
    id: "riposte", name: "La Riposte", learnedFlag: "tech_riposte",
    trigger: "Frapper juste après une parade parfaite.",
    effect: "Le coup traverse la garde et fait trois fois mal.",
    price: 260,
    lesson: "« Pare au dernier moment. Le reste vient tout seul, ou tu n'as rien compris. »",
  },
];

export function techniqueById(id: TechniqueId): Technique {
  return TECHNIQUES.find((technique) => technique.id === id)!;
}

export function knownTechniques(hasFlag: (flag: string) => boolean): readonly Technique[] {
  return TECHNIQUES.filter((technique) => hasFlag(technique.learnedFlag));
}

/** Prochaine leçon de Kerdec : il enseigne dans l'ordre, du simple au retors. */
export function nextTechnique(hasFlag: (flag: string) => boolean): Technique | null {
  return TECHNIQUES.find((technique) => !hasFlag(technique.learnedFlag)) ?? null;
}

/**
 * Suite de coups.
 *
 * Trois frappes enchaînées sans encaisser arment la Fauche. Le compteur
 * retombe si l'on tarde : sans cela, trois coups espacés d'une minute
 * vaudraient un enchaînement.
 */
export class ComboTracker {
  private count = 0;
  private lastFrame = -999;
  /** Frames au-delà desquelles l'enchaînement est rompu. */
  private static readonly WINDOW = 90;

  /** Enregistre un coup porté. Rend le rang atteint. */
  strike(frame: number): number {
    if (frame - this.lastFrame > ComboTracker.WINDOW) this.count = 0;
    this.lastFrame = frame;
    this.count += 1;
    return this.count;
  }

  /** Rompt l'enchaînement : on a été touchée, ou l'on a changé de région. */
  break(): void { this.count = 0; }

  get rank(): number { return this.count; }
}
