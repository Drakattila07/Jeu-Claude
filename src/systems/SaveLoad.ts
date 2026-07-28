import type { ItemId } from "../data/items/core";
import type { QuestRecord } from "./Quest";

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
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
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

  private isSaveData(value: unknown): value is SaveData {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<SaveData>;
    return candidate.version === 1 && typeof candidate.savedAt === "string"
      && Array.isArray(candidate.flags) && typeof candidate.player === "object"
      && typeof candidate.zone === "object";
  }
}
