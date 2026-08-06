import type { Vec2 } from "../entities/Entity";

/**
 * Les feux de camp.
 *
 * Le monde comptait quatre-vingt-dix régions et deux endroits où souffler :
  * le puits et le lit. Un feu s'allume où l'on veut avec le nécessaire à feu,
 * tient jusqu'à l'aube, et fait trois choses qu'aucun autre objet ne faisait
 * ensemble — cuire, laisser passer les heures, et tenir la nuit à distance.
 */

/** Rayon dans lequel les créatures nocturnes n'approchent pas. */
export const CAMPFIRE_WARD = 96;
/** Un feu brûle six heures de jeu. */
export const CAMPFIRE_HOURS = 6;

export interface CampfireState {
  readonly zone: string;
  readonly x: number;
  readonly y: number;
  /** Heure absolue d'extinction, en heures depuis le premier jour. */
  readonly until: number;
}

export class Campfires {
  private fires: CampfireState[] = [];

  /** Heure absolue : c'est ce qui permet à un feu de traverser minuit. */
  static absoluteHour(day: number, hour: number, minute = 0): number {
    return (day - 1) * 24 + hour + minute / 60;
  }

  light(zone: string, position: Readonly<Vec2>, now: number): CampfireState {
    // Un seul feu par région : sinon on tapisse la vallée de braises et la
    // nuit ne veut plus rien dire.
    this.fires = this.fires.filter((fire) => fire.zone !== zone);
    const fire: CampfireState = {
      zone, x: Math.round(position.x), y: Math.round(position.y),
      until: now + CAMPFIRE_HOURS,
    };
    this.fires.push(fire);
    return fire;
  }

  /** Feux encore allumés dans une région. */
  in(zone: string, now: number): readonly CampfireState[] {
    return this.fires.filter((fire) => fire.zone === zone && fire.until > now);
  }

  /** Vrai si un point est sous la garde d'un feu. */
  wards(zone: string, position: Readonly<Vec2>, now: number): boolean {
    return this.in(zone, now).some((fire) =>
      Math.hypot(fire.x - position.x, fire.y - position.y) <= CAMPFIRE_WARD);
  }

  /** Oublie les feux éteints : la liste ne doit pas enfler sur une longue partie. */
  sweep(now: number): void {
    this.fires = this.fires.filter((fire) => fire.until > now);
  }

  get count(): number { return this.fires.length; }

  snapshot(): readonly CampfireState[] { return [...this.fires]; }
  restore(value: readonly CampfireState[] | undefined): void {
    this.fires = value ? [...value] : [];
  }
}
