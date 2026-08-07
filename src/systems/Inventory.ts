import { ITEMS, type ItemId } from "../data/items/core";

export class Inventory {
  private readonly counts = new Map<ItemId, number>();
  /**
   * Besace doublée : chaque pile monte d'une moitié.
   *
   * On ramassait plus qu'on ne pouvait porter, et le surplus disparaissait
   * sans un mot. Sarn coud un double fond ; le plafond suit.
   */
  private roomy = false;

  setRoomy(active: boolean): void { this.roomy = active; }
  get isRoomy(): boolean { return this.roomy; }

  /** Plafond d'une pile, doublure comprise. */
  capacity(item: ItemId): number {
    const base = ITEMS[item].stack;
    // Un objet unique le reste : doubler une carte marine n'a pas de sens.
    return base <= 1 || !this.roomy ? base : Math.ceil(base * 1.5);
  }

  count(item: ItemId): number { return this.counts.get(item) ?? 0; }
  isFull(item: ItemId): boolean { return this.count(item) >= this.capacity(item); }
  add(item: ItemId, amount = 1): number {
    const next = Math.min(this.capacity(item), this.count(item) + amount);
    this.counts.set(item, next);
    return next;
  }
  remove(item: ItemId, amount = 1): boolean {
    if (this.count(item) < amount) return false;
    const next = this.count(item) - amount;
    if (next === 0) this.counts.delete(item);
    else this.counts.set(item, next);
    return true;
  }
  hasAll(items: readonly { readonly item: ItemId; readonly count: number }[]): boolean {
    return items.every(({ item, count }) => this.count(item) >= count);
  }
  consume(items: readonly { readonly item: ItemId; readonly count: number }[]): boolean {
    if (!this.hasAll(items)) return false;
    for (const ingredient of items) this.remove(ingredient.item, ingredient.count);
    return true;
  }
  firstItem(): ItemId | null { return this.counts.keys().next().value ?? null; }
  snapshot(): readonly { id: ItemId; count: number }[] {
    return [...this.counts.entries()].map(([id, count]) => ({ id, count }));
  }
  restore(entries: readonly { readonly id: ItemId; readonly count: number }[]): void {
    this.counts.clear();
    // Une entrée inconnue (sauvegarde d'une autre version, fichier bricolé) est
    // ignorée plutôt que de faire exploser la restauration entière.
    for (const entry of entries) {
      if (entry && entry.id in ITEMS && Number.isFinite(entry.count) && entry.count > 0) {
        this.add(entry.id, entry.count);
      }
    }
  }
}
