export const ENEMY_TYPES = {
  beetle: { name: "Coléoptère sauteur", hearts: 2, speed: 0.45, damage: 1, behavior: "leap", color: "leaf" },
  branch_bat: { name: "Chauve-souris de branche", hearts: 1, speed: 0.8, damage: 1, behavior: "dive", color: "purple" },
  hop_mushroom: { name: "Champignon bondissant", hearts: 2, speed: 0.55, damage: 1, behavior: "hop", color: "rose" },
  gargoyle: { name: "Gargouille dormante", hearts: 4, speed: 0.35, damage: 2, behavior: "wake", color: "stone" },
  wolf: { name: "Loup des brumes", hearts: 3, speed: 0.78, damage: 1, behavior: "hunt", color: "stone" },
  castle_guard: { name: "Garde de Cendre", hearts: 5, speed: 0.62, damage: 1, behavior: "hunt", color: "roof" },
  ember_mage: { name: "Mage des Braises", hearts: 4, speed: 0.48, damage: 2, behavior: "wake", color: "purple" }
} as const;

export type EnemyType = keyof typeof ENEMY_TYPES;

export interface EnemySpawn {
  readonly id: string;
  readonly zone: string;
  readonly type: EnemyType;
  readonly x: number;
  readonly y: number;
}

export const ENEMY_SPAWNS = [
  { id: "beetle_1", zone: "lisiere_carrefour", type: "beetle", x: 64, y: 96 },
  { id: "beetle_2", zone: "lisiere_carrefour", type: "beetle", x: 184, y: 128 },
  { id: "bat_1", zone: "lisiere_carrefour", type: "branch_bat", x: 176, y: 56 },
  { id: "mushroom_1", zone: "lisiere_carrefour", type: "hop_mushroom", x: 88, y: 48 },
  { id: "gargoyle_1", zone: "marches_ruines", type: "gargoyle", x: 136, y: 88 },
  { id: "wolf_1", zone: "lisiere_sentier", type: "wolf", x: 64, y: 80 },
  { id: "wolf_2", zone: "bosquet_souches", type: "wolf", x: 176, y: 128 },
  { id: "wolf_3", zone: "clairiere_cimes", type: "wolf", x: 72, y: 120 },
  { id: "wolf_4", zone: "lisiere_est", type: "wolf", x: 184, y: 72 },
  { id: "wolf_5", zone: "canopee_dense", type: "wolf", x: 96, y: 144 }
] as const satisfies readonly EnemySpawn[];

export const CASTLE_ENEMY_SPAWNS = [
  { id: "castle_guard_west", zone: "castle", type: "castle_guard", x: 64, y: 96 },
  { id: "castle_guard_east", zone: "castle", type: "castle_guard", x: 176, y: 96 },
  { id: "castle_guard_throne", zone: "castle", type: "castle_guard", x: 120, y: 64 },
  { id: "castle_ember_mage", zone: "castle", type: "ember_mage", x: 120, y: 128 },
] as const satisfies readonly EnemySpawn[];
