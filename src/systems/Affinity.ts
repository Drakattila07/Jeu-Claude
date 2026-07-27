export class Affinity {
  private readonly scores = new Map<string, number>();
  private readonly seenThresholds = new Set<string>();

  get(npcId: string): number { return this.scores.get(npcId) ?? 0; }
  add(npcId: string, amount: number): readonly number[] {
    const before = this.get(npcId);
    const after = Math.max(0, Math.min(9, before + amount));
    this.scores.set(npcId, after);
    const reached: number[] = [];
    for (const threshold of [3, 6, 9]) {
      const key = `${npcId}:${threshold}`;
      if (before < threshold && after >= threshold && !this.seenThresholds.has(key)) {
        this.seenThresholds.add(key);
        reached.push(threshold);
      }
    }
    return reached;
  }
  snapshot(): Readonly<Record<string, number>> { return Object.fromEntries(this.scores); }
}
