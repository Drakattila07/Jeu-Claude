import type { Season, Tide, Weather } from "../core/Clock";
import type { Biome } from "./world";

/**
 * Espèces de poissons.
 *
 * La pêche rendait « un poisson-lune, +8 rubis », toujours le même, partout.
 * Chaque espèce dépend maintenant du lieu, de l'heure, de la saison ou du
 * temps qu'il fait : un registre à remplir plutôt qu'un distributeur.
 */
export interface Fish {
  readonly id: string;
  readonly name: string;
  readonly value: number;
  /** Rareté : plus le poids est faible, plus l'espèce est rare. */
  readonly weight: number;
  readonly note: string;
  /** Milieux où elle mord. Vide : partout où l'on pêche. */
  readonly biomes?: readonly Biome[];
  readonly night?: boolean;
  readonly season?: Season;
  readonly weather?: Weather;
  readonly tide?: Tide;
}

export const FISH: readonly Fish[] = [
  {
    id: "lune", name: "Poisson-lune", value: 8, weight: 30,
    note: "Plat, argenté, parfaitement indifférent.",
  },
  {
    id: "gardon", name: "Gardon de vase", value: 4, weight: 30,
    note: "Le premier qui mord, toujours. On finit par le respecter.",
  },
  {
    id: "brochet", name: "Brochet du Miroir", value: 22, weight: 10,
    note: "Il attend sous les nénuphars et ne rate rien.", biomes: ["lake"],
  },
  {
    id: "anguille", name: "Anguille noire", value: 18, weight: 12,
    note: "Elle ne mord que dans le noir, et ne lâche jamais.", night: true,
  },
  {
    id: "truite", name: "Truite de source", value: 14, weight: 14,
    note: "Elle remonte le courant par principe.", biomes: ["river", "canal"],
  },
  {
    id: "carpe_pluie", name: "Carpe des averses", value: 26, weight: 8,
    note: "Elle monte en surface dès qu'il tombe de l'eau.", weather: "rain",
  },
  {
    id: "eperlan", name: "Éperlan d'hiver", value: 20, weight: 10,
    note: "Il sent la neige avant vous.", season: "hiver",
  },
  {
    id: "bar", name: "Bar de l'estran", value: 30, weight: 8,
    note: "Il chasse dans vingt centimètres d'eau qui se retire.",
    biomes: ["sea", "lake"], tide: "basse",
  },
  {
    id: "lanterne", name: "Poisson-lanterne", value: 48, weight: 3,
    note: "On le voit avant de le sentir. C'est déjà trop tard pour lui.",
    biomes: ["sea"], night: true,
  },
  {
    id: "roi", name: "Le Roi du Lac", value: 120, weight: 1,
    note: "Nessa jure l'avoir vu une fois, en 1'an de la sécheresse. Personne ne l'a crue.",
    biomes: ["lake"], season: "été", weather: "storm",
  },
];

export interface FishingContext {
  readonly biome: Biome | undefined;
  readonly night: boolean;
  readonly season: Season;
  readonly weather: Weather;
  readonly tide: Tide;
}

/** Espèces susceptibles de mordre dans ces conditions. */
export function availableFish(context: FishingContext): readonly Fish[] {
  return FISH.filter((fish) => {
    if (fish.biomes && (!context.biome || !fish.biomes.includes(context.biome))) return false;
    if (fish.night !== undefined && fish.night !== context.night) return false;
    if (fish.season !== undefined && fish.season !== context.season) return false;
    if (fish.weather !== undefined && fish.weather !== context.weather) return false;
    if (fish.tide !== undefined && fish.tide !== context.tide) return false;
    return true;
  });
}

/**
 * Tire une espèce parmi celles qui mordent, au poids. `roll` va de 0 à 1 :
 * le tirage reste extérieur, ce qui rend la fonction vérifiable.
 */
export function pickFish(context: FishingContext, roll: number): Fish {
  const pool = availableFish(context);
  if (pool.length === 0) return FISH[0]!;
  const total = pool.reduce((sum, fish) => sum + fish.weight, 0);
  let cursor = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const fish of pool) {
    cursor -= fish.weight;
    if (cursor < 0) return fish;
  }
  return pool[pool.length - 1]!;
}
