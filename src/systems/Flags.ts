export class Flags {
  private readonly values = new Set<string>();
  has(flag: string): boolean { return this.values.has(flag); }
  set(flag: string): boolean {
    const changed = !this.values.has(flag);
    this.values.add(flag);
    return changed;
  }
  delete(flag: string): void { this.values.delete(flag); }
  snapshot(): readonly string[] { return [...this.values].sort(); }
  restore(flags: readonly string[]): void {
    this.values.clear();
    for (const flag of flags) this.values.add(flag);
  }
}
