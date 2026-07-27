export interface GameEvent {
  readonly type: string;
  readonly id: string;
  readonly frame: number;
  readonly payload?: Readonly<Record<string, string | number | boolean>>;
}

type EventListener = (event: GameEvent) => void;

export class EventBus {
  private readonly listeners = new Set<EventListener>();
  private readonly recent: GameEvent[] = [];

  publish(event: GameEvent): void {
    this.recent.push(event);
    if (this.recent.length > 10) this.recent.shift();
    for (const listener of this.listeners) listener(event);
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  history(): readonly GameEvent[] { return [...this.recent]; }
}
