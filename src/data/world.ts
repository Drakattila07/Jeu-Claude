export type Biome = "peaks" | "forest" | "village" | "marsh" | "river"
  | "fields" | "ruins" | "lake" | "reeds" | "canal" | "cliffs" | "witch";

export interface WorldZoneData {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly map: "hamlet_well" | "procedural";
  readonly safe: boolean;
  readonly biome: Biome;
}

export const WORLD_ZONES = [
  { id: "cimes_brume_ouest", x: 0, y: 0, name: "CIMES BRUME OUEST", map: "procedural", safe: false, biome: "peaks" },
  { id: "cimes_brume_est", x: 1, y: 0, name: "CIMES BRUME EST", map: "procedural", safe: false, biome: "peaks" },
  { id: "clairiere_cimes", x: 2, y: 0, name: "CLAIRIÈRE DES CIMES", map: "procedural", safe: false, biome: "forest" },
  { id: "canopee_ouest", x: 3, y: 0, name: "CANOPÉE OUEST", map: "procedural", safe: false, biome: "forest" },
  { id: "canopee_est", x: 4, y: 0, name: "CANOPÉE EST", map: "procedural", safe: false, biome: "forest" },
  { id: "marches_hauteurs", x: 5, y: 0, name: "HAUTEURS DES MARCHES", map: "procedural", safe: false, biome: "ruins" },
  { id: "marches_sommet", x: 6, y: 0, name: "RUINES DU SOMMET", map: "procedural", safe: false, biome: "ruins" },
  { id: "boss_arena", x: 7, y: 0, name: "LA CIME ERRANTE", map: "procedural", safe: false, biome: "peaks" },

  { id: "lisiere_ouest", x: 0, y: 1, name: "LISIÈRE OUEST", map: "procedural", safe: false, biome: "forest" },
  { id: "lisiere_sentier", x: 1, y: 1, name: "SENTIER DE LA LISIÈRE", map: "procedural", safe: false, biome: "forest" },
  { id: "bosquet_souches", x: 2, y: 1, name: "BOSQUET DES SOUCHES", map: "procedural", safe: false, biome: "forest" },
  { id: "lisiere_est", x: 3, y: 1, name: "LISIÈRE EST", map: "procedural", safe: false, biome: "forest" },
  { id: "canopee_dense", x: 4, y: 1, name: "CANOPÉE DENSE", map: "procedural", safe: false, biome: "forest" },
  { id: "grand_escalier", x: 5, y: 1, name: "LE GRAND ESCALIER", map: "procedural", safe: false, biome: "ruins" },
  { id: "cour_statues", x: 6, y: 1, name: "COUR DES STATUES", map: "procedural", safe: false, biome: "ruins" },
  { id: "terrasse_vent", x: 7, y: 1, name: "TERRASSE DU VENT", map: "procedural", safe: false, biome: "cliffs" },

  { id: "cabane_iris", x: 0, y: 2, name: "CABANE D'ÎRIS", map: "procedural", safe: true, biome: "witch" },
  { id: "tourbe", x: 1, y: 2, name: "LA TOURBE", map: "procedural", safe: false, biome: "marsh" },
  { id: "lisiere_carrefour", x: 2, y: 2, name: "CARREFOUR CREUX", map: "procedural", safe: false, biome: "forest" },
  { id: "clairiere_champignons", x: 3, y: 2, name: "CLAIRIÈRE DES CHAMPIGNONS", map: "procedural", safe: false, biome: "forest" },
  { id: "riviere_gue", x: 4, y: 2, name: "LE GUÉ", map: "procedural", safe: false, biome: "river" },
  { id: "portail_scelle", x: 5, y: 2, name: "PORTAIL SCELLÉ", map: "procedural", safe: false, biome: "ruins" },
  { id: "marches_ruines", x: 6, y: 2, name: "RUINES BASSES", map: "procedural", safe: false, biome: "ruins" },
  { id: "ermitage_gorm", x: 7, y: 2, name: "ERMITAGE DE GORM", map: "procedural", safe: false, biome: "cliffs" },

  { id: "marais_noir", x: 0, y: 3, name: "MARAIS NOIR", map: "procedural", safe: false, biome: "marsh" },
  { id: "marais_passerelle", x: 1, y: 3, name: "PASSERELLE DU MARAIS", map: "procedural", safe: false, biome: "marsh" },
  { id: "hameau_nord", x: 2, y: 3, name: "HAMEAU NORD", map: "procedural", safe: true, biome: "village" },
  { id: "place_puits", x: 3, y: 3, name: "PLACE DU PUITS", map: "hamlet_well", safe: true, biome: "village" },
  { id: "riviere_pont", x: 4, y: 3, name: "PONT DE LA RIVIÈRE", map: "procedural", safe: true, biome: "river" },
  { id: "champs_ouest", x: 5, y: 3, name: "CHAMPS OUEST", map: "procedural", safe: true, biome: "fields" },
  { id: "champs_est", x: 6, y: 3, name: "CHAMPS EST", map: "procedural", safe: true, biome: "fields" },
  { id: "falaise_est", x: 7, y: 3, name: "FALAISE EST", map: "procedural", safe: false, biome: "cliffs" },

  { id: "lac_rive_ouest", x: 0, y: 4, name: "RIVE OUEST DU LAC", map: "procedural", safe: true, biome: "lake" },
  { id: "ilot_saule", x: 1, y: 4, name: "ÎLOT DU SAULE", map: "procedural", safe: true, biome: "lake" },
  { id: "hameau_sud", x: 2, y: 4, name: "HAMEAU SUD", map: "procedural", safe: true, biome: "village" },
  { id: "quai_lac", x: 3, y: 4, name: "QUAI DU LAC", map: "procedural", safe: true, biome: "lake" },
  { id: "lac_rive_est", x: 4, y: 4, name: "RIVE EST DU LAC", map: "procedural", safe: true, biome: "lake" },
  { id: "grange", x: 5, y: 4, name: "LA GRANGE", map: "procedural", safe: true, biome: "fields" },
  { id: "moulin_brise", x: 6, y: 4, name: "MOULIN BRISÉ", map: "procedural", safe: true, biome: "fields" },
  { id: "falaise_sud", x: 7, y: 4, name: "FALAISE SUD", map: "procedural", safe: false, biome: "cliffs" },

  { id: "lac_profond_ouest", x: 0, y: 5, name: "LAC PROFOND OUEST", map: "procedural", safe: false, biome: "lake" },
  { id: "lac_profond_centre_ouest", x: 1, y: 5, name: "LAC PROFOND", map: "procedural", safe: false, biome: "lake" },
  { id: "lac_centre", x: 2, y: 5, name: "LAC MIROIR CENTRE", map: "procedural", safe: false, biome: "lake" },
  { id: "lac_profond_centre_est", x: 3, y: 5, name: "LAC PROFOND", map: "procedural", safe: false, biome: "lake" },
  { id: "lac_profond_est", x: 4, y: 5, name: "LAC PROFOND EST", map: "procedural", safe: false, biome: "lake" },
  { id: "roseaux_peche", x: 5, y: 5, name: "ROSEAUX DE PÊCHE", map: "procedural", safe: true, biome: "reeds" },
  { id: "canal_vanne_1", x: 6, y: 5, name: "CANAL — VANNE I", map: "procedural", safe: false, biome: "canal" },
  { id: "canal_entry", x: 7, y: 5, name: "ENTRÉE DU CANAL TARI", map: "procedural", safe: false, biome: "canal" },

  { id: "grotte_noyee", x: 0, y: 6, name: "GROTTE NOYÉE", map: "procedural", safe: false, biome: "lake" },
  { id: "lac_fond_ouest", x: 1, y: 6, name: "FOND DU LAC OUEST", map: "procedural", safe: false, biome: "lake" },
  { id: "epave_engloutie", x: 2, y: 6, name: "ÉPAVE ENGLOUTIE", map: "procedural", safe: false, biome: "lake" },
  { id: "lac_fond_est", x: 3, y: 6, name: "FOND DU LAC EST", map: "procedural", safe: false, biome: "lake" },
  { id: "grotte_sud", x: 4, y: 6, name: "GROTTE SUD", map: "procedural", safe: false, biome: "lake" },
  { id: "roseaux_sud", x: 5, y: 6, name: "ROSEAUX SUD", map: "procedural", safe: false, biome: "reeds" },
  { id: "canal_vanne_2", x: 6, y: 6, name: "CANAL — VANNE II", map: "procedural", safe: false, biome: "canal" },
  { id: "canal_profond", x: 7, y: 6, name: "CANAL PROFOND", map: "procedural", safe: false, biome: "canal" }
] as const satisfies readonly WorldZoneData[];
