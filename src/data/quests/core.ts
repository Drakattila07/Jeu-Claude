export type QuestStepType = "flag" | "talkTo" | "collect" | "defeat" | "choice";

export interface QuestDefinition {
  readonly id: string;
  readonly title: string;
  readonly giver: string;
  readonly prerequisites: readonly string[];
  readonly steps: readonly {
    readonly id: string;
    readonly type: QuestStepType;
    readonly target: string;
    readonly count?: number;
    readonly hint: string;
  }[];
  readonly rewards: readonly { readonly type: "flag" | "rupees" | "affinity"; readonly id: string; readonly amount?: number }[];
  readonly worldEffects: readonly string[];
}

export const QUESTS = [
  { id: "act1_puits_muet", title: "Le Puits Muet", giver: "doyen_orme", prerequisites: [], steps: [
    { id: "epee", type: "flag", target: "sword_obtained", hint: "Bram forge une lame pour l'expédition." },
    { id: "racines", type: "defeat", target: "source_roots", hint: "La source est bloquée au nord de la Lisière." },
    { id: "vanne", type: "flag", target: "source_open", hint: "Tournez la vieille vanne." }
  ], rewards: [{ type: "flag", id: "act1_complete" }], worldEffects: ["well_restored", "river_flowing"] },
  { id: "act2_marche_nuit", title: "Ce qui Marche la Nuit", giver: "doyen_orme", prerequisites: ["act1_complete"], steps: [
    { id: "observe", type: "flag", target: "walker_seen", hint: "Attendez la nuit dans la Clairière des Cimes." },
    { id: "suivre", type: "flag", target: "walker_followed", hint: "Suivez les empreintes sans courir." }
  ], rewards: [{ type: "flag", id: "gloves_obtained" }], worldEffects: ["stone_steps_open"] },
  { id: "act3_trois_sceaux", title: "Les Trois Sceaux", giver: "iris", prerequisites: ["walker_followed"], steps: [
    { id: "sceaux", type: "collect", target: "seal", count: 3, hint: "Trois épreuves gardent le Canal Tari." },
    { id: "coeur", type: "flag", target: "mechanism_repaired", hint: "Réparez le Cœur du Mécanisme." }
  ], rewards: [{ type: "flag", id: "lead_boots" }], worldEffects: ["lake_high", "mill_running"] },
  { id: "act4_cime_errante", title: "La Cime Errante", giver: "doyen_orme", prerequisites: ["mechanism_repaired"], steps: [
    { id: "boss", type: "defeat", target: "mother_tree", hint: "La grande silhouette attend aux Cimes." },
    { id: "choix", type: "choice", target: "ending", hint: "Libérer ou enraciner l'Arbre-Mère." }
  ], rewards: [{ type: "flag", id: "postgame" }], worldEffects: ["secret_hunt"] },
  { id: "canne_perdue", title: "La Canne Perdue", giver: "nessa", prerequisites: ["act1_complete"], steps: [
    { id: "trouver", type: "flag", target: "rod_found", hint: "Le vent souffle vers l'est." },
    { id: "rendre", type: "talkTo", target: "nessa", hint: "Rapportez la canne à Nessa." }
  ], rewards: [{ type: "flag", id: "fishing_unlocked" }], worldEffects: [] },
  { id: "racines_ameres", title: "Racines Amères", giver: "mira", prerequisites: [], steps: [
    { id: "cueillir", type: "collect", target: "bitter_root", count: 5, hint: "Elles poussent la nuit sous les arbres." }
  ], rewards: [{ type: "flag", id: "potion_slots_2" }], worldEffects: [] },
  { id: "minerai_lune", title: "Minerai de Lune", giver: "bram", prerequisites: ["act1_complete"], steps: [
    { id: "minerai", type: "collect", target: "moon_ore", count: 3, hint: "Les ruines brillent sous la pluie." }
  ], rewards: [{ type: "flag", id: "sword_plus_1" }], worldEffects: [] },
  { id: "comptine_jumeaux", title: "La Comptine des Jumeaux", giver: "ryn_tam", prerequisites: [], steps: [
    { id: "rythme", type: "flag", target: "plates_solved", hint: "Croisez les deux moitiés de la comptine." }
  ], rewards: [{ type: "flag", id: "wallet_500" }], worldEffects: [] },
  { id: "sept_chandelles", title: "Les Sept Chandelles", giver: "iris", prerequisites: [], steps: [
    { id: "flammes", type: "collect", target: "candle_lit", count: 7, hint: "Écoutez l'ordre donné par les habitants." }
  ], rewards: [{ type: "flag", id: "lantern" }], worldEffects: [] },
  { id: "chant_puits", title: "Le Chant du Puits", giver: "doyen_orme", prerequisites: ["act1_complete"], steps: [
    { id: "notes", type: "flag", target: "well_song_played", hint: "Trois notes attendent sur l'Îlot du Saule." }
  ], rewards: [{ type: "flag", id: "bonus_zone" }], worldEffects: [] },
  { id: "repas_gorm", title: "Le Repas de Gorm", giver: "auto", prerequisites: ["walker_followed"], steps: [
    { id: "dons", type: "collect", target: "gorm_food", count: 3, hint: "Même un ermite doit manger." }
  ], rewards: [{ type: "flag", id: "gorm_friendly" }], worldEffects: [] },
  { id: "lettre_jamais_envoyee", title: "La Lettre Jamais Envoyée", giver: "objet", prerequisites: [], steps: [
    { id: "destinataire", type: "choice", target: "letter_recipient", hint: "Un seul habitant attend ces mots." }
  ], rewards: [{ type: "flag", id: "letter_resolved" }], worldEffects: [] },
  { id: "colporteur_endette", title: "Le Colporteur Endetté", giver: "colporteur", prerequisites: [], steps: [
    { id: "dette", type: "flag", target: "merchant_debt_paid", hint: "Il manque 200 rubis." }
  ], rewards: [{ type: "flag", id: "rare_stock" }], worldEffects: [] },
  { id: "carte_incomplete", title: "La Carte Incomplète", giver: "doyen_orme", prerequisites: [], steps: [
    { id: "explorer", type: "collect", target: "zone_mapped", count: 44, hint: "Chaque écran compte." }
  ], rewards: [{ type: "flag", id: "map_complete" }], worldEffects: [] },
  { id: "statues_regardent", title: "Les Statues qui Regardent", giver: "environnement", prerequisites: [], steps: [
    { id: "intersection", type: "flag", target: "statue_secret", hint: "Leurs regards convergent." }
  ], rewards: [{ type: "flag", id: "statue_relic" }], worldEffects: [] },
  { id: "souche_fantome", title: "La Souche Fantôme", giver: "environnement", prerequisites: [], steps: [
    { id: "coincer", type: "flag", target: "ghost_stump_trapped", hint: "Elle bouge quand vous détournez le regard." }
  ], rewards: [{ type: "flag", id: "heart_stump" }], worldEffects: [] }
] as const satisfies readonly QuestDefinition[];
