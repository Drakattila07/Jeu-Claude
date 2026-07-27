import { ITEMS, type ItemId } from "../data/items/core";

export class Inventory {
  private readonly counts = new Map<ItemId, number>();

  count(item: ItemId): number { return this.counts.get(item) ?? 0; }
  add(item: ItemId, amount = 1): number {
    const next = Math.min(ITEMS[item].stack, this.count(item) + amount);
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
}
