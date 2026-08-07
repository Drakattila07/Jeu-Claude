import type { ItemId } from "../data/items/core";
import type { Season, Weather } from "../core/Clock";

/**
 * Le potager du hameau.
 *
 * La vallée s'assèche et l'on passe le jeu à rendre l'eau à ses canaux : il
 * manquait un endroit où voir le résultat pousser. Six planches, une graine
 * par planche, et une récolte qui dépend du temps qu'il a fait — arroser ne
 * sert à rien s'il pleut, et tout s'il ne pleut pas.
 */

export interface Crop {
  readonly id: string;
  readonly name: string;
  readonly seed: ItemId;
  readonly harvest: ItemId;
  /** Jours entre le semis et la récolte, si la plante est arrosée. */
  readonly days: number;
  readonly yield: number;
  /** Saison où elle donne le mieux : ailleurs, la récolte est réduite. */
  readonly season: Season;
  readonly line: string;
}

export const CROPS: readonly Crop[] = [
  {
    id: "racine", name: "Racine amère", seed: "bitter_seed", harvest: "bitter_root",
    days: 2, yield: 4, season: "printemps",
    line: "Les racines sortent de terre en craquant. Amères, comme promis.",
  },
  {
    id: "champignon", name: "Champignon violet", seed: "spore_pouch", harvest: "violet_mushroom",
    days: 1, yield: 3, season: "automne",
    line: "Les chapeaux violets ont poussé dans l'ombre de la planche.",
  },
  {
    id: "fleur", name: "Fleur-Œil", seed: "eye_seed", harvest: "eye_flower",
    days: 3, yield: 3, season: "été",
    line: "Les Fleurs-Œil se tournent vers vous toutes en même temps.",
  },
];

export function cropBySeed(seed: ItemId): Crop | null {
  return CROPS.find((crop) => crop.seed === seed) ?? null;
}

/** Nombre de planches du potager. */
export const PLOT_COUNT = 6;

export interface Plot {
  /** Culture semée, ou rien. */
  readonly crop: string | null;
  /** Jour du semis. */
  readonly sown: number;
  /** Jours d'arrosage cumulés — la pluie compte. */
  readonly watered: number;
  /** Dernier jour arrosé : on n'arrose pas deux fois le même jour. */
  readonly lastWatered: number;
}

const EMPTY: Plot = { crop: null, sown: 0, watered: 0, lastWatered: 0 };

export type PlotStatus = "vide" | "semée" | "assoiffée" | "mûre";

export class Garden {
  private plots: Plot[] = Array.from({ length: PLOT_COUNT }, () => ({ ...EMPTY }));

  at(index: number): Plot { return this.plots[index] ?? { ...EMPTY }; }

  /** Première planche libre, ou -1 si tout est semé. */
  freePlot(): number {
    return this.plots.findIndex((plot) => plot.crop === null);
  }

  sow(index: number, crop: Crop, day: number): boolean {
    const plot = this.plots[index];
    if (!plot || plot.crop !== null) return false;
    this.plots[index] = { crop: crop.id, sown: day, watered: 0, lastWatered: 0 };
    return true;
  }

  /** Arrose. Faux si la planche est vide ou déjà arrosée aujourd'hui. */
  water(index: number, day: number): boolean {
    const plot = this.plots[index];
    if (!plot || plot.crop === null || plot.lastWatered === day) return false;
    this.plots[index] = { ...plot, watered: plot.watered + 1, lastWatered: day };
    return true;
  }

  /**
   * La pluie arrose tout le potager. C'est ce qui rend la météo utile plutôt
   * que décorative : un jour de pluie vous épargne une tournée d'arrosoir.
   */
  rainfall(day: number, weather: Weather): number {
    if (weather !== "rain" && weather !== "storm") return 0;
    let count = 0;
    this.plots = this.plots.map((plot) => {
      if (plot.crop === null || plot.lastWatered === day) return plot;
      count += 1;
      return { ...plot, watered: plot.watered + 1, lastWatered: day };
    });
    return count;
  }

  status(index: number, day: number): PlotStatus {
    const plot = this.plots[index];
    if (!plot || plot.crop === null) return "vide";
    const crop = CROPS.find((candidate) => candidate.id === plot.crop);
    if (!crop) return "vide";
    const age = day - plot.sown;
    if (age >= crop.days && plot.watered >= crop.days) return "mûre";
    // Une planche non arrosée depuis deux jours réclame de l'eau.
    if (day - plot.lastWatered >= 2 && plot.watered < crop.days) return "assoiffée";
    return "semée";
  }

  /**
   * Récolte. Rend l'objet et la quantité, réduite hors saison : une plante
   * pousse partout, mais elle ne donne bien qu'à son heure de l'année.
   */
  harvest(index: number, day: number, season: Season):
  { crop: Crop; count: number } | null {
    if (this.status(index, day) !== "mûre") return null;
    const plot = this.plots[index]!;
    const crop = CROPS.find((candidate) => candidate.id === plot.crop)!;
    this.plots[index] = { ...EMPTY };
    const count = crop.season === season ? crop.yield : Math.max(1, Math.floor(crop.yield / 2));
    return { crop, count };
  }

  snapshot(): readonly Plot[] { return this.plots.map((plot) => ({ ...plot })); }
  restore(value: readonly Plot[] | undefined): void {
    this.plots = Array.from({ length: PLOT_COUNT }, (_, index) =>
      value?.[index] ? { ...value[index]! } : { ...EMPTY });
  }
}
