import { WORLD_ZONES } from "../data/world";
import { NPCS } from "../data/npcs/core";
import { ENEMY_TYPES, type EnemyType } from "../data/enemies";

/**
 * Le Carnet de la cartographe.
 *
 * Le métier de l'héroïne était une ligne de dialogue et rien d'autre : elle
 * traversait quatre-vingt-dix régions sans jamais rien noter. Le carnet
 * enregistre ce qu'elle a vu — un lieu, une tête, une bête, un secret — et
 * c'est lui qui décerne les titres.
 */

export type JournalSection = "regions" | "gens" | "betes" | "secrets";

export interface JournalEntry {
  readonly id: string;
  readonly title: string;
  /** Ce que la cartographe en a écrit. */
  readonly note: string;
  /** Jour de partie où la ligne a été portée au carnet. */
  readonly day: number;
}

/** Rangs décernés à mesure que le carnet se remplit. */
export interface Rank {
  readonly title: string;
  /** Fraction du carnet à remplir, de 0 à 1. */
  readonly at: number;
  readonly motto: string;
}

export const RANKS: readonly Rank[] = [
  { title: "Apprentie", at: 0, motto: "Un carnet vide et de bonnes chaussures." },
  { title: "Arpenteuse", at: 0.15, motto: "Vous savez déjà où le chemin ment." },
  { title: "Releveuse", at: 0.35, motto: "On commence à vous citer aux veillées." },
  { title: "Cartographe", at: 0.55, motto: "Le titre est mérité. Le travail continue." },
  { title: "Maîtresse des Marges", at: 0.75, motto: "Vos annotations valent la carte." },
  { title: "Mémoire de la Vallée", at: 0.95, motto: "Ce que vous n'avez pas vu n'existe pas." },
];

/** Notes de bestiaire : une faiblesse par bête, écrite comme une observation. */
const BEAST_NOTES: Partial<Record<EnemyType, string>> = {
  beetle: "Saute droit. Un pas de côté suffit ; deux, c'est du gaspillage.",
  branch_bat: "Plonge et repart. Frappez au moment où elle remonte.",
  hop_mushroom: "Annonce son bond en se tassant. Le sol dit tout.",
  gargoyle: "Dort tant qu'on ne court pas. Le pas lent la laisse dormir.",
  wolf: "Chasse en ligne droite et fuit blessé. Ne le poursuivez pas dans la brume.",
  castle_guard: "Charge en aveugle. Sa cuirasse ne couvre pas le dos.",
  ember_mage: "Tire de loin, meurt de près. Fermez la distance pendant l'incantation.",
  bog_lurker: "Lent mais têtu. La tourbe le porte, pas vous.",
  stone_crab: "Ne recule jamais. Contournez plutôt que d'insister.",
  frost_wisp: "Traverse la pierre. Seul le feu la prend au sérieux.",
  root_horror: "Trop lourde pour tourner. Restez dans son dos.",
  reef_serpent: "Suit la houle. Frappez au creux de la vague.",
  gull_raider: "Vole votre bourse et s'enfuit. Abattez-le avant qu'il ne pique.",
  drowned_sailor: "Marche au fond. Le sel l'a rendu sourd aux avertissements.",
  ember_hound: "Court plus vite que vous. Ne fuyez pas : esquivez.",
  cinder_wisp: "Une braise qui vise. La pluie l'affaiblit.",
  night_walker: "N'existe qu'entre vingt-deux heures et six heures. Le jour le dissout.",
  green_knight: "Chevalier jusqu'au bout : il attend que vous soyez prête.",
  ink_heron: "Ne se laisse pas approcher de face. Venez par le vent.",
  peat_golem: "La tourbe se referme sur ses plaies. Il faut frapper vite, pas fort.",
  moon_jelly: "Dérive sans but et brûle au toucher. Elle ne vous poursuit pas.",
  strand_prowler: "Ne sort qu'à marée basse. La mer le remporte en montant.",
};

/** Ce que compte une section quand elle est pleine. */
export const JOURNAL_TOTALS: Readonly<Record<JournalSection, number>> = {
  regions: WORLD_ZONES.length,
  gens: NPCS.length,
  betes: Object.keys(ENEMY_TYPES).length,
  secrets: 12,
};

export class Journal {
  private readonly entries = new Map<JournalSection, Map<string, JournalEntry>>([
    ["regions", new Map()], ["gens", new Map()], ["betes", new Map()], ["secrets", new Map()],
  ]);

  /** Porte une ligne au carnet. Vrai si elle est nouvelle. */
  record(section: JournalSection, id: string, title: string, note: string, day: number): boolean {
    const book = this.entries.get(section)!;
    if (book.has(id)) return false;
    book.set(id, { id, title, note, day });
    return true;
  }

  /** Relève une région traversée. */
  noteRegion(zoneId: string, name: string, note: string, day: number): boolean {
    return this.record("regions", zoneId, name, note, day);
  }

  /** Note une tête rencontrée. */
  notePerson(npcId: string, name: string, note: string, day: number): boolean {
    return this.record("gens", npcId, name, note, day);
  }

  /**
   * Note une bête observée. La faiblesse ne s'écrit qu'une fois la créature
   * vue de près : c'est la récompense du carnet, pas une aide gratuite.
   */
  noteBeast(type: EnemyType, day: number): boolean {
    const definition = ENEMY_TYPES[type];
    const note = BEAST_NOTES[type] ?? "Observée trop vite pour en dire plus.";
    return this.record("betes", type, definition.name, note, day);
  }

  noteSecret(id: string, title: string, note: string, day: number): boolean {
    return this.record("secrets", id, title, note, day);
  }

  has(section: JournalSection, id: string): boolean {
    return this.entries.get(section)!.has(id);
  }

  count(section: JournalSection): number { return this.entries.get(section)!.size; }

  /** Lignes d'une section, de la plus ancienne à la plus récente. */
  list(section: JournalSection): readonly JournalEntry[] {
    return [...this.entries.get(section)!.values()];
  }

  /** Part du carnet remplie, toutes sections confondues. */
  get completion(): number {
    let done = 0;
    let total = 0;
    for (const section of Object.keys(JOURNAL_TOTALS) as JournalSection[]) {
      done += Math.min(this.count(section), JOURNAL_TOTALS[section]);
      total += JOURNAL_TOTALS[section];
    }
    return total === 0 ? 0 : done / total;
  }

  /** Titre courant, décerné par le carnet et non par le récit. */
  get rank(): Rank {
    const filled = this.completion;
    let earned = RANKS[0]!;
    for (const rank of RANKS) if (filled >= rank.at) earned = rank;
    return earned;
  }

  snapshot(): Record<string, JournalEntry[]> {
    const output: Record<string, JournalEntry[]> = {};
    for (const [section, book] of this.entries) output[section] = [...book.values()];
    return output;
  }

  restore(value: Record<string, readonly JournalEntry[]> | undefined): void {
    if (!value) return;
    for (const [section, book] of this.entries) {
      book.clear();
      for (const entry of value[section] ?? []) book.set(entry.id, entry);
    }
  }
}
