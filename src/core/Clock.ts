import { RNG } from "./RNG";

export type Weather = "clear" | "rain";

export class Clock {
  private minuteOfDay = 9 * 60;
  private frameRemainder = 0;
  day = 1;
  private readonly seed: number;
  private readonly harvestDays = new Map<string, number>();

  constructor(seed = 0xc0ffee) { this.seed = seed; }

  update(): void {
    this.frameRemainder += 1;
    if (this.frameRemainder < 60) return;
    this.frameRemainder = 0;
    this.minuteOfDay += 1;
    if (this.minuteOfDay >= 24 * 60) {
      this.minuteOfDay = 0;
      this.day += 1;
    }
  }

  get hour(): number { return Math.floor(this.minuteOfDay / 60); }
  get minute(): number { return this.minuteOfDay % 60; }
  get isNight(): boolean { return this.hour < 6 || this.hour >= 20; }
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
  setTime(hour: number, minute = 0): void { this.minuteOfDay = hour * 60 + minute; }
  snapshot(): { readonly day: number; readonly hour: number; readonly minute: number } {
    return { day: this.day, hour: this.hour, minute: this.minute };
  }
  restore(value: { readonly day: number; readonly hour: number; readonly minute: number }): void {
    this.day = Math.max(1, value.day);
    this.setTime(value.hour, value.minute);
  }
}
