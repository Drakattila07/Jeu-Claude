import type { ItemId } from "../data/items/core";
import type { Weather } from "../core/Clock";
import type { Flags } from "./Flags";
import type { Inventory } from "./Inventory";

/**
 * Condition d'accès à un objet du monde. Sans elle, tous les déclencheurs
 * d'activités annexes se réduiraient à « appuyer sur X » ; avec elle, chaque
 * secret demande d'apporter, d'attendre ou de comprendre quelque chose.
 */
export interface Requirement {
  /** Objets consommés à la validation. */
  readonly items?: readonly { readonly item: ItemId; readonly count: number }[];
  /** Drapeaux qui doivent tous être posés. */
  readonly flags?: readonly string[];
  /** Nuit obligatoire (empreintes, champignons…). */
  readonly night?: boolean;
  /** Jour obligatoire. */
  readonly day?: boolean;
  /** Météo imposée : le minerai de lune ne brille que sous la pluie. */
  readonly weather?: Weather;
  /** Rubis minimum à détenir (non consommés ici). */
  readonly rupees?: number;
  /** Nombre de zones explorées minimum. */
  readonly explored?: number;
  /** Message affiché quand la condition n'est pas remplie. */
  readonly refusal: string;
}

export interface WorldState {
  readonly isNight: boolean;
  readonly weather: Weather;
  readonly rupees: number;
  readonly explored: number;
}

export type RequirementCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export class Requirements {
  constructor(private readonly flags: Flags, private readonly inventory: Inventory) {}

  /** Vérifie sans rien consommer. */
  check(requirement: Requirement | undefined, world: WorldState): RequirementCheck {
    if (!requirement) return { ok: true };
    if (requirement.flags?.some((flag) => !this.flags.has(flag))) {
      return { ok: false, reason: requirement.refusal };
    }
    if (requirement.night && !world.isNight) return { ok: false, reason: requirement.refusal };
    if (requirement.day && world.isNight) return { ok: false, reason: requirement.refusal };
    if (requirement.weather && world.weather !== requirement.weather) {
      return { ok: false, reason: requirement.refusal };
    }
    if (requirement.rupees !== undefined && world.rupees < requirement.rupees) {
      return { ok: false, reason: requirement.refusal };
    }
    if (requirement.explored !== undefined && world.explored < requirement.explored) {
      return { ok: false, reason: requirement.refusal };
    }
    if (requirement.items && !this.inventory.hasAll(requirement.items)) {
      return { ok: false, reason: requirement.refusal };
    }
    return { ok: true };
  }

  /** Vérifie puis consomme les objets exigés. */
  consume(requirement: Requirement | undefined, world: WorldState): RequirementCheck {
    const result = this.check(requirement, world);
    if (!result.ok) return result;
    if (requirement?.items) this.inventory.consume(requirement.items);
    return { ok: true };
  }
}
