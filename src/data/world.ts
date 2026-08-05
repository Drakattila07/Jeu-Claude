export type Biome = "peaks" | "forest" | "village" | "marsh" | "river"
  | "fields" | "ruins" | "lake" | "reeds" | "canal" | "cliffs" | "witch"
  // La vallée débouche désormais sur une mer, et la mer sur un volcan.
  | "sea" | "volcano";

export interface WorldZoneData {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly safe: boolean;
  readonly biome: Biome;
  /**
   * Niveau de menace, de 0 (aucun ennemi) à 3 (hostile). Il gouverne le
   * peuplement automatique : quatre-vingt-dix régions ne pouvaient pas rester
   * vides avec dix ennemis placés à la main.
   */
  readonly danger: 0 | 1 | 2 | 3;
  /**
   * Région de haute mer : on n'y entre qu'une fois la Carte des Courants en
   * main, sans quoi le ressac vous repousse.
   */
  readonly openSea?: true;
}

export const WORLD_ZONES = [
  // — Rangée 0 : les Cimes —
  { id: "cimes_brume_ouest", x: 0, y: 0, name: "CIMES BRUME OUEST", safe: false, biome: "peaks", danger: 3 },
  { id: "cimes_brume_est", x: 1, y: 0, name: "CIMES BRUME EST", safe: false, biome: "peaks", danger: 3 },
  { id: "clairiere_cimes", x: 2, y: 0, name: "CLAIRIÈRE DES CIMES", safe: false, biome: "forest", danger: 2 },
  { id: "canopee_ouest", x: 3, y: 0, name: "CANOPÉE OUEST", safe: false, biome: "forest", danger: 2 },
  { id: "canopee_est", x: 4, y: 0, name: "CANOPÉE EST", safe: false, biome: "forest", danger: 2 },
  { id: "marches_hauteurs", x: 5, y: 0, name: "HAUTEURS DES MARCHES", safe: false, biome: "ruins", danger: 3 },
  { id: "marches_sommet", x: 6, y: 0, name: "RUINES DU SOMMET", safe: false, biome: "ruins", danger: 3 },
  { id: "boss_arena", x: 7, y: 0, name: "LA CIME ERRANTE", safe: false, biome: "peaks", danger: 0 },
  { id: "pics_orageux", x: 8, y: 0, name: "PICS ORAGEUX", safe: false, biome: "peaks", danger: 3 },
  { id: "aiguille_nord", x: 9, y: 0, name: "AIGUILLE DU NORD", safe: false, biome: "peaks", danger: 3 },

  // — Rangée 1 : la Lisière —
  { id: "lisiere_ouest", x: 0, y: 1, name: "LISIÈRE OUEST", safe: false, biome: "forest", danger: 2 },
  { id: "lisiere_sentier", x: 1, y: 1, name: "SENTIER DE LA LISIÈRE", safe: false, biome: "forest", danger: 2 },
  { id: "bosquet_souches", x: 2, y: 1, name: "BOSQUET DES SOUCHES", safe: false, biome: "forest", danger: 2 },
  { id: "lisiere_est", x: 3, y: 1, name: "LISIÈRE EST", safe: false, biome: "forest", danger: 2 },
  { id: "canopee_dense", x: 4, y: 1, name: "CANOPÉE DENSE", safe: false, biome: "forest", danger: 3 },
  { id: "grand_escalier", x: 5, y: 1, name: "LE GRAND ESCALIER", safe: false, biome: "ruins", danger: 2 },
  { id: "cour_statues", x: 6, y: 1, name: "COUR DES STATUES", safe: false, biome: "ruins", danger: 2 },
  { id: "terrasse_vent", x: 7, y: 1, name: "TERRASSE DU VENT", safe: false, biome: "cliffs", danger: 2 },
  { id: "corniche_est", x: 8, y: 1, name: "CORNICHE EST", safe: false, biome: "cliffs", danger: 2 },
  { id: "nid_de_pierre", x: 9, y: 1, name: "NID DE PIERRE", safe: false, biome: "peaks", danger: 3 },

  // — Rangée 2 : le cœur de la vallée —
  { id: "cabane_iris", x: 0, y: 2, name: "TOUR DE LUNE", safe: true, biome: "witch", danger: 0 },
  { id: "tourbe", x: 1, y: 2, name: "LA TOURBE", safe: false, biome: "marsh", danger: 2 },
  { id: "lisiere_carrefour", x: 2, y: 2, name: "CARREFOUR CREUX", safe: false, biome: "forest", danger: 2 },
  { id: "clairiere_champignons", x: 3, y: 2, name: "CLAIRIÈRE DES CHAMPIGNONS", safe: false, biome: "forest", danger: 1 },
  { id: "riviere_gue", x: 4, y: 2, name: "LE GUÉ", safe: false, biome: "river", danger: 1 },
  { id: "portail_scelle", x: 5, y: 2, name: "CHÂTEAU DE CENDRE", safe: false, biome: "ruins", danger: 2 },
  { id: "marches_ruines", x: 6, y: 2, name: "RUINES BASSES", safe: false, biome: "ruins", danger: 2 },
  { id: "ermitage_gorm", x: 7, y: 2, name: "ERMITAGE DE GORM", safe: false, biome: "cliffs", danger: 1 },
  { id: "vertepierre", x: 8, y: 2, name: "FORTERESSE DE VERTEPIERRE", safe: false, biome: "ruins", danger: 2 },
  { id: "remparts_est", x: 9, y: 2, name: "REMPARTS EST", safe: false, biome: "ruins", danger: 3 },

  // — Rangée 3 : le hameau —
  { id: "marais_noir", x: 0, y: 3, name: "MARAIS NOIR", safe: false, biome: "marsh", danger: 3 },
  { id: "marais_passerelle", x: 1, y: 3, name: "PASSERELLE DU MARAIS", safe: false, biome: "marsh", danger: 2 },
  { id: "hameau_nord", x: 2, y: 3, name: "HAMEAU NORD", safe: true, biome: "village", danger: 0 },
  { id: "place_puits", x: 3, y: 3, name: "PLACE DU PUITS", safe: true, biome: "village", danger: 0 },
  { id: "riviere_pont", x: 4, y: 3, name: "PONT DE LA RIVIÈRE", safe: true, biome: "river", danger: 0 },
  { id: "champs_ouest", x: 5, y: 3, name: "CHAMPS OUEST", safe: true, biome: "fields", danger: 1 },
  { id: "champs_est", x: 6, y: 3, name: "CHAMPS EST", safe: true, biome: "fields", danger: 1 },
  { id: "falaise_est", x: 7, y: 3, name: "FALAISE EST", safe: false, biome: "cliffs", danger: 2 },
  { id: "avant_cour", x: 8, y: 3, name: "AVANT-COUR", safe: false, biome: "ruins", danger: 2 },
  { id: "verger_haut", x: 9, y: 3, name: "VERGER HAUT", safe: true, biome: "fields", danger: 1 },

  // — Rangée 4 : le lac —
  { id: "lac_rive_ouest", x: 0, y: 4, name: "RIVE OUEST DU LAC", safe: true, biome: "lake", danger: 1 },
  { id: "ilot_saule", x: 1, y: 4, name: "ÎLOT DU SAULE", safe: true, biome: "lake", danger: 0 },
  { id: "hameau_sud", x: 2, y: 4, name: "HAMEAU SUD", safe: true, biome: "village", danger: 0 },
  { id: "quai_lac", x: 3, y: 4, name: "QUAI DU LAC", safe: true, biome: "lake", danger: 0 },
  { id: "lac_rive_est", x: 4, y: 4, name: "RIVE EST DU LAC", safe: true, biome: "lake", danger: 1 },
  { id: "grange", x: 5, y: 4, name: "LA GRANGE", safe: true, biome: "fields", danger: 1 },
  { id: "moulin_brise", x: 6, y: 4, name: "MOULIN BRISÉ", safe: true, biome: "fields", danger: 1 },
  { id: "falaise_sud", x: 7, y: 4, name: "FALAISE SUD", safe: false, biome: "cliffs", danger: 2 },
  { id: "vergers_est", x: 8, y: 4, name: "VERGERS DE L'EST", safe: true, biome: "fields", danger: 1 },
  { id: "cap_du_phare", x: 9, y: 4, name: "CAP DU PHARE", safe: false, biome: "cliffs", danger: 2 },

  // — Rangée 5 : le lac profond et le canal —
  { id: "lac_profond_ouest", x: 0, y: 5, name: "LAC PROFOND OUEST", safe: false, biome: "lake", danger: 2 },
  { id: "lac_profond_centre_ouest", x: 1, y: 5, name: "LAC PROFOND", safe: false, biome: "lake", danger: 2 },
  { id: "lac_centre", x: 2, y: 5, name: "LAC MIROIR CENTRE", safe: false, biome: "lake", danger: 2 },
  { id: "lac_profond_centre_est", x: 3, y: 5, name: "LAC PROFOND", safe: false, biome: "lake", danger: 2 },
  { id: "lac_profond_est", x: 4, y: 5, name: "LAC PROFOND EST", safe: false, biome: "lake", danger: 2 },
  { id: "roseaux_peche", x: 5, y: 5, name: "ROSEAUX DE PÊCHE", safe: true, biome: "reeds", danger: 1 },
  { id: "canal_vanne_1", x: 6, y: 5, name: "CANAL — VANNE I", safe: false, biome: "canal", danger: 2 },
  { id: "canal_entry", x: 7, y: 5, name: "ENTRÉE DU CANAL TARI", safe: false, biome: "canal", danger: 2 },
  { id: "sente_du_cap", x: 8, y: 5, name: "SENTE DU CAP", safe: false, biome: "cliffs", danger: 2 },
  { id: "criques", x: 9, y: 5, name: "LES CRIQUES", safe: true, biome: "lake", danger: 1 },

  // — Rangée 6 : les fonds et la côte —
  { id: "grotte_noyee", x: 0, y: 6, name: "GROTTE NOYÉE", safe: false, biome: "lake", danger: 3 },
  { id: "lac_fond_ouest", x: 1, y: 6, name: "FOND DU LAC OUEST", safe: false, biome: "lake", danger: 2 },
  { id: "epave_engloutie", x: 2, y: 6, name: "ÉPAVE ENGLOUTIE", safe: false, biome: "lake", danger: 3 },
  { id: "lac_fond_est", x: 3, y: 6, name: "FOND DU LAC EST", safe: false, biome: "lake", danger: 2 },
  { id: "grotte_sud", x: 4, y: 6, name: "GROTTE SUD", safe: false, biome: "lake", danger: 3 },
  { id: "roseaux_sud", x: 5, y: 6, name: "ROSEAUX SUD", safe: false, biome: "reeds", danger: 2 },
  { id: "canal_vanne_2", x: 6, y: 6, name: "CANAL — VANNE II", safe: false, biome: "canal", danger: 3 },
  { id: "canal_profond", x: 7, y: 6, name: "CANAL PROFOND", safe: false, biome: "canal", danger: 3 },
  { id: "greve_de_maree", x: 8, y: 6, name: "GRÈVE DE MARÉE", safe: true, biome: "lake", danger: 0 },
  { id: "port_maree", x: 9, y: 6, name: "PORT-MARÉE", safe: true, biome: "village", danger: 0 },

  // — Rangée 7 : la Basse Mer —
  { id: "mer_du_couchant", x: 0, y: 7, name: "MER DU COUCHANT", safe: false, biome: "sea", danger: 1 },
  { id: "ile_des_os", x: 1, y: 7, name: "ÎLE DES OS", safe: false, biome: "sea", danger: 3 },
  { id: "grande_passe", x: 2, y: 7, name: "LA GRANDE PASSE", safe: false, biome: "sea", danger: 1 },
  { id: "recif_dentele", x: 3, y: 7, name: "RÉCIF DENTELÉ", safe: false, biome: "sea", danger: 2 },
  { id: "mer_basse", x: 4, y: 7, name: "BASSE MER", safe: false, biome: "sea", danger: 1 },
  { id: "ile_du_phare", x: 5, y: 7, name: "ÎLE DU PHARE", safe: true, biome: "sea", danger: 1 },
  { id: "chenal_est", x: 6, y: 7, name: "CHENAL EST", safe: false, biome: "sea", danger: 2 },
  { id: "banc_de_brume", x: 7, y: 7, name: "BANC DE BRUME", safe: false, biome: "sea", danger: 2 },
  { id: "rade_de_maree", x: 8, y: 7, name: "RADE DE MARÉE", safe: true, biome: "sea", danger: 0 },
  { id: "quai_des_carenes", x: 9, y: 7, name: "QUAI DES CARÈNES", safe: true, biome: "sea", danger: 0 },

  // — Rangée 8 : la haute mer, fermée sans la Carte des Courants —
  { id: "abysse_ouest", x: 0, y: 8, name: "ABYSSE OUEST", safe: false, biome: "sea", danger: 3, openSea: true },
  { id: "courant_froid", x: 1, y: 8, name: "COURANT FROID", safe: false, biome: "sea", danger: 2, openSea: true },
  { id: "epave_du_sud", x: 2, y: 8, name: "ÉPAVE DU SUD", safe: false, biome: "sea", danger: 3, openSea: true },
  { id: "haute_mer_centre", x: 3, y: 8, name: "HAUTE MER", safe: false, biome: "sea", danger: 2, openSea: true },
  { id: "courant_noir", x: 4, y: 8, name: "COURANT NOIR", safe: false, biome: "sea", danger: 3, openSea: true },
  { id: "haute_mer_est", x: 5, y: 8, name: "HAUTE MER EST", safe: false, biome: "sea", danger: 2, openSea: true },
  { id: "anneau_de_fumee", x: 6, y: 8, name: "ANNEAU DE FUMÉE", safe: false, biome: "sea", danger: 3, openSea: true },
  { id: "approche_volcan", x: 7, y: 8, name: "APPROCHE DU VOLCAN", safe: false, biome: "volcano", danger: 3, openSea: true },
  { id: "ile_du_volcan", x: 8, y: 8, name: "ÎLE DU VOLCAN", safe: false, biome: "volcano", danger: 3, openSea: true },
  { id: "caldeira", x: 9, y: 8, name: "LA CALDEIRA", safe: false, biome: "volcano", danger: 0, openSea: true }
] as const satisfies readonly WorldZoneData[];

/** Largeur et hauteur de la grille des zones. */
export const WORLD_COLUMNS = 10;
export const WORLD_ROWS = 9;

/** Biomes qu'on ne traverse qu'à la barque. */
export const SAILING_BIOMES: ReadonlySet<Biome> = new Set<Biome>(["sea"]);

/**
 * `as const` fige chaque région dans son type littéral : les entrées qui ne
 * déclarent pas `openSea` n'ont tout simplement pas le champ. Cet accesseur
 * ramène tout le monde au même contrat.
 */
export function isOpenSea(zone: WorldZoneData): boolean {
  return zone.openSea === true;
}
