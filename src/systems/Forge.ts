/**
 * La forge de Bram.
 *
 * Bram réclamait du minerai de lune depuis le premier jour et n'en faisait
 * jamais rien : la quête annexe rendait une « Épée +1 » qui n'existait nulle
 * part. Trois paliers, trois trempes, et des dégâts qu'on sent.
 */

export interface SwordTier {
  readonly level: number;
  readonly name: string;
  /** Dégâts par coup à ce palier. */
  readonly damage: number;
  /** Minerai de lune exigé pour l'atteindre. */
  readonly ore: number;
  readonly rupees: number;
  readonly line: string;
}

export const SWORD_TIERS: readonly SwordTier[] = [
  { level: 0, name: "Épée de la Vallée", damage: 1, ore: 0, rupees: 0,
    line: "Une lame honnête. Elle a fait ce qu'elle a pu." },
  { level: 1, name: "Lame Trempée", damage: 2, ore: 2, rupees: 80,
    line: "Bram la plonge dans l'eau du puits. Elle siffle et se tait." },
  { level: 2, name: "Lame de Lune", damage: 3, ore: 4, rupees: 220,
    line: "Le minerai prend le fil. On dirait qu'elle éclaire un peu." },
  { level: 3, name: "Lame des Marges", damage: 4, ore: 6, rupees: 500,
    line: "Bram recule, essuie ses mains, ne dit rien. C'est son plus grand compliment." },
];

export function tierAt(level: number): SwordTier {
  return SWORD_TIERS[Math.max(0, Math.min(SWORD_TIERS.length - 1, level))]!;
}

/** Palier suivant, ou rien si la lame est au bout de ce que Bram sait faire. */
export function nextTier(level: number): SwordTier | null {
  return SWORD_TIERS.find((tier) => tier.level === level + 1) ?? null;
}
