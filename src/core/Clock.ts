import { RNG } from "./RNG";

/**
 * Temps qu'il fait.
 *
 * Deux états — beau ou pluie — ne faisaient pas un climat : la brume avale la
 * vue, l'orage frappe, la neige ralentit. Chacun agit sur le jeu, sinon ce ne
 * serait qu'un filtre de plus.
 */
export type Weather = "clear" | "rain" | "fog" | "storm" | "snow";

/** Saison courante. Le cycle fait huit jours : deux par saison. */
export type Season = "printemps" | "été" | "automne" | "hiver";

const SEASONS: readonly Season[] = ["printemps", "été", "automne", "hiver"];
/** Jours de jeu que dure une saison. */
export const DAYS_PER_SEASON = 2;

/** État de la marée. L'estran ne se découvre qu'à basse mer. */
export type Tide = "basse" | "montante" | "haute" | "descendante";

/** Aire des vents : huit rhumbs, ça suffit à barrer. */
export type WindDirection = "N" | "NE" | "E" | "SE" | "S" | "SO" | "O" | "NO";

const WIND_ROSE: readonly WindDirection[] = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

/** Vecteur unitaire d'un rhumb, en repère écran (y vers le bas). */
export const WIND_VECTORS: Readonly<Record<WindDirection, { readonly x: number; readonly y: number }>> = {
  N: { x: 0, y: -1 }, NE: { x: 0.7071, y: -0.7071 },
  E: { x: 1, y: 0 }, SE: { x: 0.7071, y: 0.7071 },
  S: { x: 0, y: 1 }, SO: { x: -0.7071, y: 0.7071 },
  O: { x: -1, y: 0 }, NO: { x: -0.7071, y: -0.7071 },
};

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

  /** Saison courante : elle décide du climat et de ce qui pousse. */
  get season(): Season {
    const index = Math.floor((this.day - 1) / DAYS_PER_SEASON) % SEASONS.length;
    return SEASONS[index]!;
  }

  /** Jour dans la saison, à partir de 1. */
  get dayOfSeason(): number {
    return ((this.day - 1) % DAYS_PER_SEASON) + 1;
  }

  /**
   * Temps du jour, tiré selon la saison.
   *
   * Le tirage était le même toute l'année : trente pour cent de pluie, un
   * point c'est tout. Chaque saison a maintenant son ciel — il neige l'hiver,
   * il orage l'été, la brume monte à l'automne.
   */
  get weather(): Weather {
    const rng = new RNG(this.seed ^ Math.imul(this.day, 0x9e3779b1));
    const roll = rng.next();
    const table: Readonly<Record<Season, readonly (readonly [Weather, number])[]>> = {
      printemps: [["rain", 0.34], ["fog", 0.48], ["storm", 0.54]],
      été: [["storm", 0.16], ["rain", 0.28], ["fog", 0.34]],
      automne: [["fog", 0.30], ["rain", 0.55], ["storm", 0.62]],
      hiver: [["snow", 0.42], ["fog", 0.58], ["rain", 0.64]],
    };
    for (const [weather, threshold] of table[this.season]) {
      if (roll < threshold) return weather;
    }
    return "clear";
  }

  /** Vrai si le ciel bouche la vue : brume, neige, orage. */
  get isMurky(): boolean {
    const weather = this.weather;
    return weather === "fog" || weather === "snow" || weather === "storm";
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

  /**
   * Marée.
   *
   * Deux basses mers par jour, comme dehors. Le cycle dure douze heures et
   * décale d'une heure chaque jour : la grève ne se découvre jamais deux
   * matins de suite au même moment, et il faut donc regarder le ciel plutôt
   * qu'apprendre un horaire par cœur.
   */
  get tide(): Tide {
    const phase = (this.minuteOfDay / 60 + (this.day - 1)) % 12;
    if (phase < 2 || phase >= 11) return "basse";
    if (phase < 5) return "montante";
    if (phase < 8) return "haute";
    return "descendante";
  }

  /** Hauteur d'eau, de 0 (estran nu) à 1 (pleine mer). */
  get tideLevel(): number {
    const phase = (this.minuteOfDay / 60 + (this.day - 1)) % 12;
    return (1 - Math.cos((phase / 12) * Math.PI * 2)) / 2;
  }

  /** Heures à patienter avant la prochaine basse mer. */
  hoursUntilLowTide(): number {
    const phase = (this.minuteOfDay / 60 + (this.day - 1)) % 12;
    if (phase < 2) return 0;
    return Math.max(0, 11 - phase);
  }

  /**
   * Vent du jour. Il tourne de trois heures en trois heures : assez lent pour
   * qu'on puisse en tenir compte, assez vif pour qu'on ne s'y installe pas.
   */
  get wind(): WindDirection {
    const step = Math.floor(this.minuteOfDay / 180);
    const rng = new RNG(this.seed ^ Math.imul(this.day * 8 + step, 0x85ebca6b));
    return WIND_ROSE[rng.int(0, WIND_ROSE.length - 1)]!;
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
