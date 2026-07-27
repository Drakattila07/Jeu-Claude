export const ENEMY_TYPES = {
  beetle: { name: "Coléoptère sauteur", hearts: 2, speed: 0.45, damage: 1, behavior: "leap", color: "leaf" },
  branch_bat: { name: "Chauve-souris de branche", hearts: 1, speed: 0.8, damage: 1, behavior: "dive", color: "purple" },
  hop_mushroom: { name: "Champignon bondissant", hearts: 2, speed: 0.55, damage: 1, behavior: "hop", color: "rose" },
  gargoyle: { name: "Gargouille dormante", hearts: 4, speed: 0.35, damage: 2, behavior: "wake", color: "stone" }
} as const;

export type EnemyType = keyof typeof ENEMY_TYPES;

export const ENEMY_SPAWNS = [
  { id: "beetle_1", zone: "lisiere_carrefour", type: "beetle", x: 64, y: 96 },
  { id: "beetle_2", zone: "lisiere_carrefour", type: "beetle", x: 184, y: 128 },
  { id: "bat_1", zone: "lisiere_carrefour", type: "branch_bat", x: 176, y: 56 },
  { id: "mushroom_1", zone: "lisiere_carrefour", type: "hop_mushroom", x: 88, y: 48 },
  { id: "gargoyle_1", zone: "marches_ruines", type: "gargoyle", x: 136, y: 88 }
] as const;

export type EnemySpawn = (typeof ENEMY_SPAWNS)[number];
