import type { QuestStepType } from "./quests/core";

export interface SideActivityData {
  readonly id: string;
  readonly quest: string;
  readonly trigger: string;
  readonly event: { readonly type: QuestStepType; readonly target: string; readonly amount?: number };
  readonly setFlags: readonly string[];
  readonly reward: string;
}

export const SIDE_ACTIVITIES: readonly SideActivityData[] = [
  { id: "rod", quest: "canne_perdue", trigger: "lost_rod", event: { type: "flag", target: "rod_found" }, setFlags: ["rod_found"], reward: "Canne retrouvée" },
  { id: "roots", quest: "racines_ameres", trigger: "bitter_roots_bundle", event: { type: "collect", target: "bitter_root", amount: 5 }, setFlags: [], reward: "2 emplacements de potion" },
  { id: "ore", quest: "minerai_lune", trigger: "moon_ore_cache", event: { type: "collect", target: "moon_ore", amount: 3 }, setFlags: [], reward: "Épée +1" },
  { id: "rhyme", quest: "comptine_jumeaux", trigger: "plates_solution", event: { type: "flag", target: "plates_solved" }, setFlags: ["plates_solved"], reward: "Porte-monnaie 500" },
  { id: "candles", quest: "sept_chandelles", trigger: "candle_circle", event: { type: "collect", target: "candle_lit", amount: 7 }, setFlags: [], reward: "Lanterne" },
  { id: "song", quest: "chant_puits", trigger: "willow_stones", event: { type: "flag", target: "well_song_played" }, setFlags: ["well_song_played"], reward: "Zone bonus" },
  { id: "gorm_meal", quest: "repas_gorm", trigger: "gorm_feast", event: { type: "collect", target: "gorm_food", amount: 3 }, setFlags: [], reward: "5 cœurs révélés" },
  { id: "letter", quest: "lettre_jamais_envoyee", trigger: "letter_choice", event: { type: "choice", target: "letter_recipient" }, setFlags: ["letter_resolved"], reward: "Objet unique" },
  { id: "merchant", quest: "colporteur_endette", trigger: "merchant_debt", event: { type: "flag", target: "merchant_debt_paid" }, setFlags: ["merchant_debt_paid"], reward: "Stock rare" },
  { id: "map", quest: "carte_incomplete", trigger: "map_100", event: { type: "collect", target: "zone_mapped", amount: 90 }, setFlags: [], reward: "Carte complète" },
  { id: "statues", quest: "statues_regardent", trigger: "statue_intersection", event: { type: "flag", target: "statue_secret" }, setFlags: ["statue_secret"], reward: "Relique" },
  { id: "stump", quest: "souche_fantome", trigger: "ghost_stump", event: { type: "flag", target: "ghost_stump_trapped" }, setFlags: ["ghost_stump_trapped"], reward: "Cœur + lore" },
  { id: "hull", quest: "barque_de_sarn", trigger: "shipyard_hull", event: { type: "flag", target: "boat" }, setFlags: ["boat"], reward: "Barque de Sarn" },
  { id: "chart", quest: "carte_des_courants", trigger: "lighthouse_lamp", event: { type: "flag", target: "sea_chart" }, setFlags: ["sea_chart"], reward: "Carte des Courants" },
  { id: "scale", quest: "le_dragon", trigger: "dragon_altar", event: { type: "flag", target: "dragon_calmed" }, setFlags: ["dragon_calmed"], reward: "La montagne se tait" }
];
