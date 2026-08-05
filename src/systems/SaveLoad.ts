import { ITEMS, type ItemId } from "../data/items/core";
import type { QuestRecord } from "./Quest";
import type { FortressSnapshot } from "./Fortress";

export interface SaveData {
  readonly version: 1;
  readonly savedAt: string;
  readonly frame: number;
  readonly player: { readonly x: number; readonly y: number; readonly hearts: number; readonly rupees: number };
  readonly zone: { readonly x: number; readonly y: number };
  readonly flags: readonly string[];
  readonly inventory: readonly { readonly id: ItemId; readonly count: number }[];
  readonly quests: Readonly<Record<string, QuestRecord>>;
  readonly explored: readonly string[];
  readonly objects: readonly [string, boolean][];
  readonly clock: { readonly day: number; readonly hour: number; readonly minute: number };
  readonly checkpoint?: {
    readonly zone: { readonly x: number; readonly y: number };
    readonly x: number; readonly y: number; readonly deaths: number;
  };
  readonly purchases?: readonly string[];
  /**
   * Progression dans une forteresse : portes ouvertes et salles nettoyées.
   * Sans elle, mourir dans un donjon en rouvrait toutes les herses.
   */
  readonly fortress?: FortressSnapshot;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCoord(value: unknown): value is { x: number; y: number } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { x?: unknown; y?: unknown };
  return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export class SaveLoad {
  private readonly prefix = "racines-creuses:slot:";
  constructor(private readonly storage: StorageLike) {}

  save(slot: 0 | 1 | 2, data: SaveData): void {
    this.storage.setItem(`${this.prefix}${slot}`, JSON.stringify(data));
  }

  load(slot: 0 | 1 | 2): SaveData | null {
    const raw = this.storage.getItem(`${this.prefix}${slot}`);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!this.isSaveData(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  erase(slot: 0 | 1 | 2): void { this.storage.removeItem(`${this.prefix}${slot}`); }
  slots(): readonly (SaveData | null)[] { return [this.load(0), this.load(1), this.load(2)]; }

  /**
   * Valide la sauvegarde entière avant de la rendre. Une validation partielle
   * laissait passer des objets tronqués qui faisaient planter le constructeur
   * du jeu — et comme la sauvegarde fautive était rechargée à chaque démarrage,
   * la partie devenait impossible à lancer.
   */
  private isSaveData(value: unknown): value is SaveData {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    if (candidate.version !== 1 || typeof candidate.savedAt !== "string") return false;
    if (!isFiniteNumber(candidate.frame)) return false;
    if (!isCoord(candidate.zone)) return false;

    const player: Record<string, unknown> | null =
      typeof candidate.player === "object" && candidate.player !== null
        ? candidate.player as Record<string, unknown>
        : null;
    if (!player) return false;
    if (!isFiniteNumber(player.x) || !isFiniteNumber(player.y)) return false;
    if (!isFiniteNumber(player.hearts) || !isFiniteNumber(player.rupees)) return false;

    if (!isStringArray(candidate.flags) || !isStringArray(candidate.explored)) return false;

    if (!Array.isArray(candidate.inventory)) return false;
    const inventoryValid = candidate.inventory.every((entry: unknown) => {
      if (typeof entry !== "object" || entry === null) return false;
      const item = entry as { id?: unknown; count?: unknown };
      return typeof item.id === "string" && item.id in ITEMS && isFiniteNumber(item.count);
    });
    if (!inventoryValid) return false;

    if (!Array.isArray(candidate.objects)) return false;
    const objectsValid = candidate.objects.every((entry: unknown) =>
      Array.isArray(entry) && entry.length === 2
      && typeof entry[0] === "string" && typeof entry[1] === "boolean");
    if (!objectsValid) return false;

    if (typeof candidate.quests !== "object" || candidate.quests === null) return false;
    const questsValid = Object.values(candidate.quests as Record<string, unknown>).every((entry) => {
      if (typeof entry !== "object" || entry === null) return false;
      const record = entry as { status?: unknown; step?: unknown; progress?: unknown };
      return (record.status === "locked" || record.status === "active" || record.status === "complete")
        && isFiniteNumber(record.step) && isFiniteNumber(record.progress);
    });
    if (!questsValid) return false;

    const clock = candidate.clock as Record<string, unknown> | undefined;
    if (typeof clock !== "object" || clock === null) return false;
    if (!isFiniteNumber(clock.day) || !isFiniteNumber(clock.hour) || !isFiniteNumber(clock.minute)) return false;

    // Le point de renaissance est optionnel : les sauvegardes d'avant sa mise en
    // place restent chargeables et repartent du puits par défaut.
    if (candidate.checkpoint !== undefined) {
      const checkpoint = candidate.checkpoint as Record<string, unknown> | null;
      if (typeof checkpoint !== "object" || checkpoint === null) return false;
      if (!isCoord(checkpoint.zone) || !isFiniteNumber(checkpoint.x)
        || !isFiniteNumber(checkpoint.y) || !isFiniteNumber(checkpoint.deaths)) return false;
    }
    if (candidate.purchases !== undefined && !isStringArray(candidate.purchases)) return false;
    if (candidate.fortress !== undefined) {
      const fortress = candidate.fortress as Record<string, unknown> | null;
      if (typeof fortress !== "object" || fortress === null) return false;
      if (!isStringArray(fortress.unlocked) || !isStringArray(fortress.cleared)) return false;
    }
    return true;
  }
}
