export class Clock {
  private minuteOfDay = 9 * 60;
  private frameRemainder = 0;
  day = 1;

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
  setTime(hour: number, minute = 0): void { this.minuteOfDay = hour * 60 + minute; }
}
