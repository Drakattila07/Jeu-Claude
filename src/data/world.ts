export const WORLD_ZONES = [
  { id: "hameau_nord", x: 2, y: 3, name: "HAMEAU NORD", map: "hamlet_well", safe: true },
  { id: "place_puits", x: 3, y: 3, name: "PLACE DU PUITS", map: "hamlet_well", safe: true },
  { id: "hameau_sud", x: 2, y: 4, name: "HAMEAU SUD", map: "hamlet_well", safe: true },
  { id: "quai_lac", x: 3, y: 4, name: "QUAI DU LAC", map: "hamlet_well", safe: true }
  ,{ id: "lisiere_carrefour", x: 2, y: 2, name: "CARREFOUR CREUX", map: "hamlet_well", safe: false }
  ,{ id: "marches_ruines", x: 3, y: 2, name: "RUINES BASSES", map: "hamlet_well", safe: false }
] as const;

export type WorldZoneData = (typeof WORLD_ZONES)[number];
