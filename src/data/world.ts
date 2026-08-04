export type Biome = "peaks" | "forest" | "village" | "marsh" | "river"
  | "fields" | "ruins" | "lake" | "reeds" | "canal" | "cliffs" | "witch";

export interface WorldZoneData {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly safe: boolean;
  readonly biome: Biome;
  /**
   * Niveau de menace, de 0 (aucun ennemi) à 3 (hostile). Il gouverne le
   * peuplement automatique : cinquante-six régions ne pouvaient pas rester
   * vides avec dix ennemis placés à la main.
   */
  readonly danger: 0 | 1 | 2 | 3;
}

export const WORLD_ZONES = [
  { id: "cimes_brume_ouest", x: 0, y: 0, name: "CIMES BRUME OUEST", safe: false, biome: "peaks", danger: 3 },
  { id: "cimes_brume_est", x: 1, y: 0, name: "CIMES BRUME EST", safe: false, biome: "peaks", danger: 3 },
  { id: "clairiere_cimes", x: 2, y: 0, name: "CLAIRIÈRE DES CIMES", safe: false, biome: "forest", danger: 2 },
  { id: "canopee_ouest", x: 3, y: 0, name: "CANOPÉE OUEST", safe: false, biome: "forest", danger: 2 },
  { id: "canopee_est", x: 4, y: 0, name: "CANOPÉE EST", safe: false, biome: "forest", danger: 2 },
  { id: "marches_hauteurs", x: 5, y: 0, name: "HAUTEURS DES MARCHES", safe: false, biome: "ruins", danger: 3 },
  { id: "marches_sommet", x: 6, y: 0, name: "RUINES DU SOMMET", safe: false, biome: "ruins", danger: 3 },
  { id: "boss_arena", x: 7, y: 0, name: "LA CIME ERRANTE", safe: false, biome: "peaks", danger: 0 },

  { id: "lisiere_ouest", x: 0, y: 1, name: "LISIÈRE OUEST", safe: false, biome: "forest", danger: 2 },
  { id: "lisiere_sentier", x: 1, y: 1, name: "SENTIER DE LA LISIÈRE", safe: false, biome: "forest", danger: 2 },
  { id: "bosquet_souches", x: 2, y: 1, name: "BOSQUET DES SOUCHES", safe: false, biome: "forest", danger: 2 },
  { id: "lisiere_est", x: 3, y: 1, name: "LISIÈRE EST", safe: false, biome: "forest", danger: 2 },
  { id: "canopee_dense", x: 4, y: 1, name: "CANOPÉE DENSE", safe: false, biome: "forest", danger: 3 },
  { id: "grand_escalier", x: 5, y: 1, name: "LE GRAND ESCALIER", safe: false, biome: "ruins", danger: 2 },
  { id: "cour_statues", x: 6, y: 1, name: "COUR DES STATUES", safe: false, biome: "ruins", danger: 2 },
  { id: "terrasse_vent", x: 7, y: 1, name: "TERRASSE DU VENT", safe: false, biome: "cliffs", danger: 2 },

  { id: "cabane_iris", x: 0, y: 2, name: "TOUR DE LUNE", safe: true, biome: "witch", danger: 0 },
  { id: "tourbe", x: 1, y: 2, name: "LA TOURBE", safe: false, biome: "marsh", danger: 2 },
  { id: "lisiere_carrefour", x: 2, y: 2, name: "CARREFOUR CREUX", safe: false, biome: "forest", danger: 2 },
  { id: "clairiere_champignons", x: 3, y: 2, name: "CLAIRIÈRE DES CHAMPIGNONS", safe: false, biome: "forest", danger: 1 },
  { id: "riviere_gue", x: 4, y: 2, name: "LE GUÉ", safe: false, biome: "river", danger: 1 },
  { id: "portail_scelle", x: 5, y: 2, name: "CHÂTEAU DE CENDRE", safe: false, biome: "ruins", danger: 2 },
  { id: "marches_ruines", x: 6, y: 2, name: "RUINES BASSES", safe: false, biome: "ruins", danger: 2 },
  { id: "ermitage_gorm", x: 7, y: 2, name: "ERMITAGE DE GORM", safe: false, biome: "cliffs", danger: 1 },

  { id: "marais_noir", x: 0, y: 3, name: "MARAIS NOIR", safe: false, biome: "marsh", danger: 3 },
  { id: "marais_passerelle", x: 1, y: 3, name: "PASSERELLE DU MARAIS", safe: false, biome: "marsh", danger: 2 },
  { id: "hameau_nord", x: 2, y: 3, name: "HAMEAU NORD", safe: true, biome: "village", danger: 0 },
  { id: "place_puits", x: 3, y: 3, name: "PLACE DU PUITS", safe: true, biome: "village", danger: 0 },
  { id: "riviere_pont", x: 4, y: 3, name: "PONT DE LA RIVIÈRE", safe: true, biome: "river", danger: 0 },
  { id: "champs_ouest", x: 5, y: 3, name: "CHAMPS OUEST", safe: true, biome: "fields", danger: 1 },
  { id: "champs_est", x: 6, y: 3, name: "CHAMPS EST", safe: true, biome: "fields", danger: 1 },
  { id: "falaise_est", x: 7, y: 3, name: "FALAISE EST", safe: false, biome: "cliffs", danger: 2 },

  { id: "lac_rive_ouest", x: 0, y: 4, name: "RIVE OUEST DU LAC", safe: true, biome: "lake", danger: 1 },
  { id: "ilot_saule", x: 1, y: 4, name: "ÎLOT DU SAULE", safe: true, biome: "lake", danger: 0 },
  { id: "hameau_sud", x: 2, y: 4, name: "HAMEAU SUD", safe: true, biome: "village", danger: 0 },
  { id: "quai_lac", x: 3, y: 4, name: "QUAI DU LAC", safe: true, biome: "lake", danger: 0 },
  { id: "lac_rive_est", x: 4, y: 4, name: "RIVE EST DU LAC", safe: true, biome: "lake", danger: 1 },
  { id: "grange", x: 5, y: 4, name: "LA GRANGE", safe: true, biome: "fields", danger: 1 },
  { id: "moulin_brise", x: 6, y: 4, name: "MOULIN BRISÉ", safe: true, biome: "fields", danger: 1 },
  { id: "falaise_sud", x: 7, y: 4, name: "FALAISE SUD", safe: false, biome: "cliffs", danger: 2 },

  { id: "lac_profond_ouest", x: 0, y: 5, name: "LAC PROFOND OUEST", safe: false, biome: "lake", danger: 2 },
  { id: "lac_profond_centre_ouest", x: 1, y: 5, name: "LAC PROFOND", safe: false, biome: "lake", danger: 2 },
  { id: "lac_centre", x: 2, y: 5, name: "LAC MIROIR CENTRE", safe: false, biome: "lake", danger: 2 },
  { id: "lac_profond_centre_est", x: 3, y: 5, name: "LAC PROFOND", safe: false, biome: "lake", danger: 2 },
  { id: "lac_profond_est", x: 4, y: 5, name: "LAC PROFOND EST", safe: false, biome: "lake", danger: 2 },
  { id: "roseaux_peche", x: 5, y: 5, name: "ROSEAUX DE PÊCHE", safe: true, biome: "reeds", danger: 1 },
  { id: "canal_vanne_1", x: 6, y: 5, name: "CANAL — VANNE I", safe: false, biome: "canal", danger: 2 },
  { id: "canal_entry", x: 7, y: 5, name: "ENTRÉE DU CANAL TARI", safe: false, biome: "canal", danger: 2 },

  { id: "grotte_noyee", x: 0, y: 6, name: "GROTTE NOYÉE", safe: false, biome: "lake", danger: 3 },
  { id: "lac_fond_ouest", x: 1, y: 6, name: "FOND DU LAC OUEST", safe: false, biome: "lake", danger: 2 },
  { id: "epave_engloutie", x: 2, y: 6, name: "ÉPAVE ENGLOUTIE", safe: false, biome: "lake", danger: 3 },
  { id: "lac_fond_est", x: 3, y: 6, name: "FOND DU LAC EST", safe: false, biome: "lake", danger: 2 },
  { id: "grotte_sud", x: 4, y: 6, name: "GROTTE SUD", safe: false, biome: "lake", danger: 3 },
  { id: "roseaux_sud", x: 5, y: 6, name: "ROSEAUX SUD", safe: false, biome: "reeds", danger: 2 },
  { id: "canal_vanne_2", x: 6, y: 6, name: "CANAL — VANNE II", safe: false, biome: "canal", danger: 3 },
  { id: "canal_profond", x: 7, y: 6, name: "CANAL PROFOND", safe: false, biome: "canal", danger: 3 }
] as const satisfies readonly WorldZoneData[];

/** Largeur et hauteur de la grille des zones. */
export const WORLD_COLUMNS = 8;
export const WORLD_ROWS = 7;
