import { RNG } from "./RNG";

export type Weather = "clear" | "rain";

/** Frames de simulation par minute de jeu : une journée dure 24 minutes réelles. */
export const FRAMES_PER_GAME_MINUTE = 60;

export class Clock {
  private minutes = 9 * 60;
  private frameRemainder = 0;
  day = 1;
  private readonly seed: number;
  private readonly harvestDays = new Map<string, number>();

  constructor(seed = 0xc0ffee) { this.seed = seed; }

  update(): void {
    this.frameRemainder += 1;
    if (this.frameRemainder < FRAMES_PER_GAME_MINUTE) return;
    this.frameRemainder = 0;
    this.minutes += 1;
    if (this.minutes >= 24 * 60) {
      this.minutes = 0;
      this.day += 1;
    }
  }

  /** Minute écoulée depuis minuit, fraction de frame comprise. */
  get minuteOfDay(): number {
    return this.minutes + this.frameRemainder / FRAMES_PER_GAME_MINUTE;
  }

  get hour(): number { return Math.floor(this.minutes / 60); }
  get minute(): number { return this.minutes % 60; }
  get isNight(): boolean { return this.hour < 6 || this.hour >= 20; }

  /** Libellé court du moment de la journée, pour l'interface. */
  get phase(): "aube" | "matin" | "midi" | "soir" | "nuit" {
    const hour = this.hour;
    if (hour < 5 || hour >= 21) return "nuit";
    if (hour < 8) return "aube";
    if (hour < 12) return "matin";
    if (hour < 18) return "midi";
    return "soir";
  }

  get weather(): Weather {
    const rng = new RNG(this.seed ^ Math.imul(this.day, 0x9e3779b1));
    return rng.next() < 0.3 ? "rain" : "clear";
  }

  weatherHistory(days = 3): readonly Weather[] {
    const current = this.day;
    return Array.from({ length: days }, (_, index) => {
      this.day = Math.max(1, current - index);
      const value = this.weather;
      this.day = current;
      return value;
    });
  }

  canHarvest(resourceId: string, regrowDays: number): boolean {
    return this.day - (this.harvestDays.get(resourceId) ?? -regrowDays) >= regrowDays;
  }

  harvest(resourceId: string): void { this.harvestDays.set(resourceId, this.day); }

  setTime(hour: number, minute = 0): void {
    this.minutes = Math.max(0, Math.min(24 * 60 - 1, hour * 60 + minute));
    this.frameRemainder = 0;
  }

  /** Avance jusqu'au lendemain matin — utilisé par le repos à l'auberge. */
  sleepUntilMorning(): void {
    this.day += 1;
    this.setTime(6, 30);
  }

  /**
   * Attend le prochain moment demandé, en passant au lendemain s'il est déjà
   * derrière nous. Plusieurs secrets n'acceptent que la nuit ou que le jour :
   * sans ce raccourci, il fallait tourner en rond vingt minutes réelles.
   */
  waitUntil(target: "aube" | "matin" | "midi" | "soir" | "nuit"): number {
    const hours: Readonly<Record<typeof target, number>> = {
      aube: 6, matin: 9, midi: 13, soir: 19, nuit: 22,
    };
    const hour = hours[target];
    if (hour * 60 <= this.minutes) this.day += 1;
    this.setTime(hour, 0);
    return hour;
  }

  snapshot(): { readonly day: number; readonly hour: number; readonly minute: number } {
    return { day: this.day, hour: this.hour, minute: this.minute };
  }

  restore(value: { readonly day: number; readonly hour: number; readonly minute: number }): void {
    this.day = Math.max(1, value.day);
    this.setTime(value.hour, value.minute);
  }
}
