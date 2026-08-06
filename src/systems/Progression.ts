import type { Flags } from "./Flags";
import type { Player } from "../entities/Player";

/** Cœurs de départ, avant tout gain de quête. */
export const BASE_MAX_HEARTS = 6;
/** Bourse de départ, avant le Porte-monnaie 500. */
export const BASE_RUPEE_CAP = 300;

/**
 * Chaque récompense de quête déclarée dans `QUESTS` posait un drapeau que rien
 * ne lisait. Ce système les traduit en statistiques réelles, à un seul endroit.
 */
export interface Upgrade {
  readonly flag: string;
  readonly label: string;
  readonly hearts?: number;
  readonly sword?: number;
  readonly rupeeCap?: number;
}

export const UPGRADES: readonly Upgrade[] = [
  { flag: "heart_stump", label: "Cœur de la Souche", hearts: 2 },
  { flag: "gorm_friendly", label: "Repas de Gorm", hearts: 2 },
  { flag: "statue_relic", label: "Relique des Statues", hearts: 2 },
  { flag: "sword_plus_1", label: "Épée +1", sword: 1 },
  { flag: "castle_cleared", label: "Château nettoyé", sword: 1 },
  { flag: "wallet_500", label: "Porte-monnaie 500", rupeeCap: 500 },
  // Les trempes de Bram. Passer par des drapeaux plutôt que par un compteur
  // dédié leur donne la sauvegarde et la restauration sans une ligne de plus.
  { flag: "forge_1", label: "Lame Trempée", sword: 1 },
  { flag: "forge_2", label: "Lame de Lune", sword: 1 },
  { flag: "forge_3", label: "Lame des Marges", sword: 1 },
];

/** Drapeaux des paliers de forge, dans l'ordre. */
export const FORGE_FLAGS: readonly string[] = ["forge_1", "forge_2", "forge_3"];

export class Progression {
  constructor(private readonly flags: Flags) {}

  private earned(): readonly Upgrade[] {
    return UPGRADES.filter((upgrade) => this.flags.has(upgrade.flag));
  }

  get maxHearts(): number {
    return this.earned().reduce((total, upgrade) => total + (upgrade.hearts ?? 0), BASE_MAX_HEARTS);
  }

  get swordBonus(): number {
    return this.earned().reduce((total, upgrade) => total + (upgrade.sword ?? 0), 0);
  }

  get rupeeCap(): number {
    return this.earned().reduce((cap, upgrade) => Math.max(cap, upgrade.rupeeCap ?? 0), BASE_RUPEE_CAP);
  }

  /** Palier de forge atteint, de 0 à 3. */
  get swordLevel(): number {
    let level = 0;
    for (const flag of FORGE_FLAGS) {
      if (!this.flags.has(flag)) break;
      level += 1;
    }
    return level;
  }

  /** Nombre d'améliorations obtenues, pour l'écran de quêtes. */
  get earnedCount(): number { return this.earned().length; }

  get earnedLabels(): readonly string[] { return this.earned().map((upgrade) => upgrade.label); }

  /**
   * Applique les gains au joueur. Les cœurs gagnés sont offerts pleins ; la
   * bourse est simplement plafonnée.
   */
  apply(player: Player): void {
    const target = this.maxHearts;
    if (player.maxHearts !== target) {
      const gained = Math.max(0, target - player.maxHearts);
      player.maxHearts = target;
      player.hearts = Math.min(target, player.hearts + gained);
    }
    player.swordBonus = this.swordBonus;
    player.rupees = Math.max(0, Math.min(this.rupeeCap, player.rupees));
  }
}
