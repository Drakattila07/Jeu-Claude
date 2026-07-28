export type WaterLevel = 0 | 1 | 2;

export interface DungeonRoomData {
  readonly id: string;
  readonly name: string;
  readonly baseWater: WaterLevel;
  readonly valve?: 0 | 1 | 2 | 3;
  readonly effects: readonly [number, number, number, number];
  readonly feature: string;
}

export const CANAL_ROOMS: readonly DungeonRoomData[] = [
  { id: "gate", name: "La Grille Rouillée", baseWater: 0, valve: 0, effects: [1, 0, 0, 0], feature: "entrée" },
  { id: "cistern", name: "La Citerne", baseWater: 1, effects: [1, -1, 0, 0], feature: "courant" },
  { id: "spillway", name: "Le Déversoir", baseWater: 0, valve: 1, effects: [0, 1, 0, 0], feature: "blocs flottants" },
  { id: "shafts", name: "Les Puits Jumeaux", baseWater: 2, effects: [0, -1, 1, 0], feature: "trous cachés" },
  { id: "leech", name: "La Sangsue de Pierre", baseWater: 0, effects: [0, 0, 1, 0], feature: "mini-boss" },
  { id: "boots", name: "Le Vestiaire Englouti", baseWater: 2, valve: 2, effects: [0, 0, -1, 0], feature: "Bottes de Plomb" },
  { id: "gallery", name: "La Galerie des Flotteurs", baseWater: 1, effects: [0, 0, 1, -1], feature: "caisses flottantes" },
  { id: "locks", name: "Les Trois Écluses", baseWater: 0, valve: 3, effects: [1, 1, -1, 1], feature: "timing" },
  { id: "undertow", name: "Le Contre-Courant", baseWater: 2, effects: [-1, 0, 0, -1], feature: "courants" },
  { id: "heart", name: "Le Cœur du Mécanisme", baseWater: 1, effects: [0, 0, 0, 1], feature: "roue brisée" }
];
