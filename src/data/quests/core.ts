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
    { id: "epee", type: "flag", target: "sword_obtained", hint: "Hameau Nord : parlez à Bram avec X." },
    { id: "racines", type: "defeat", target: "source_roots", hint: "Bosquet des Souches : coupez les racines." },
    { id: "vanne", type: "flag", target: "source_open", hint: "Près de la source : actionnez la vieille vanne." }
  ], rewards: [{ type: "flag", id: "act1_complete" }], worldEffects: ["well_restored", "river_flowing"] },
  { id: "act2_marche_nuit", title: "Ce qui Marche la Nuit", giver: "doyen_orme", prerequisites: ["act1_complete"], steps: [
    { id: "observe", type: "flag", target: "walker_seen",
      hint: "Clairière des Cimes, entre 22 h et 6 h : abattez l'Arbre Marcheur." },
    { id: "suivre", type: "flag", target: "walker_followed",
      hint: "Clairière des Cimes : suivez la trouée qu'il a laissée." }
  ], rewards: [{ type: "flag", id: "gloves_obtained" }], worldEffects: ["stone_steps_open"] },
  { id: "act3_trois_sceaux", title: "Les Trois Sceaux", giver: "iris", prerequisites: ["walker_followed"], steps: [
    { id: "sceaux", type: "collect", target: "seal", count: 3, hint: "Ruines Basses : activez les trois Sceaux." },
    { id: "coeur", type: "flag", target: "mechanism_repaired", hint: "Canal Tari : réparez le Cœur du Mécanisme." }
  ], rewards: [{ type: "flag", id: "lead_boots" }], worldEffects: ["lake_high", "mill_running"] },
  { id: "act4_cime_errante", title: "La Cime Errante", giver: "doyen_orme", prerequisites: ["mechanism_repaired"], steps: [
    { id: "boss", type: "defeat", target: "mother_tree", hint: "Cime Errante : affrontez l'Arbre-Mère." },
    { id: "choix", type: "choice", target: "ending", hint: "Devant l'Arbre-Mère : choisissez son destin." }
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
    { id: "explorer", type: "collect", target: "zone_mapped", count: 90, hint: "Cartographiez les 90 régions de la vallée et de la mer." }
  ], rewards: [{ type: "flag", id: "map_complete" }], worldEffects: [] },
  { id: "chateau_cendre", title: "Le Crâne de Cendre", giver: "garde_ronan", prerequisites: ["act1_complete"], steps: [
    { id: "relique", type: "flag", target: "half_demon_skull",
      hint: "Château de Cendre : battez tous les défenseurs." }
  ], rewards: [{ type: "flag", id: "castle_cleared" }], worldEffects: ["demon_relic_found"] },
  { id: "statues_regardent", title: "Les Statues qui Regardent", giver: "environnement", prerequisites: [], steps: [
    { id: "intersection", type: "flag", target: "statue_secret", hint: "Leurs regards convergent." }
  ], rewards: [{ type: "flag", id: "statue_relic" }], worldEffects: [] },
  { id: "souche_fantome", title: "La Souche Fantôme", giver: "environnement", prerequisites: [], steps: [
    { id: "coincer", type: "flag", target: "ghost_stump_trapped", hint: "Elle bouge quand vous détournez le regard." }
  ], rewards: [{ type: "flag", id: "heart_stump" }], worldEffects: [] },
  { id: "barque_de_sarn", title: "La Barque de Sarn", giver: "sarn", prerequisites: ["act1_complete"], steps: [
    { id: "radoub", type: "flag", target: "boat", hint: "Port-Marée : deux bordés de chêne et un filin pour Sarn." }
  ], rewards: [{ type: "flag", id: "boat_ready" }, { type: "rupees", id: "prime", amount: 40 }], worldEffects: [] },
  { id: "carte_des_courants", title: "La Carte des Courants", giver: "veuve_hale", prerequisites: ["boat"], steps: [
    { id: "phare", type: "flag", target: "sea_chart", hint: "Île du Phare : rallumez la lampe de la Veuve Hale." }
  ], rewards: [{ type: "flag", id: "open_sea_known" }], worldEffects: [] },
  { id: "vertepierre", title: "Les Trois Portes de Vertepierre", giver: "gardien_vertepierre", prerequisites: ["act1_complete"], steps: [
    { id: "chevalier", type: "defeat", target: "green_knight", hint: "Vertepierre : le Chevalier garde la dernière salle." }
  ], rewards: [{ type: "flag", id: "sword_plus_2" }], worldEffects: ["fortress_open"] },
  { id: "le_dragon", title: "Ce qui Dort sous la Fumée", giver: "veuve_hale", prerequisites: ["sea_chart"], steps: [
    { id: "dragon", type: "defeat", target: "dragon", hint: "Caldeira : le dragon veille sur le feu." },
    { id: "ecaille", type: "flag", target: "dragon_calmed", hint: "Caldeira : posez l'écaille sur l'autel." }
  ], rewards: [{ type: "flag", id: "dragon_slain" }, { type: "rupees", id: "prime", amount: 120 }], worldEffects: ["volcano_quiet"] },
  { id: "battue_loups", title: "La Battue", giver: "garde_ronan", prerequisites: ["sword_obtained"], steps: [
    { id: "loups", type: "defeat", target: "wolf", count: 5,
      hint: "Cinq loups rôdent des Lisières à la Canopée." }
  ], rewards: [{ type: "flag", id: "wolf_bounty" }, { type: "rupees", id: "prime", amount: 120 }], worldEffects: [] },
  { id: "panier_du_lac", title: "Le Panier du Lac", giver: "nessa", prerequisites: ["fishing_unlocked"], steps: [
    { id: "prises", type: "collect", target: "fish", count: 4,
      hint: "Quai du Lac : quatre poissons pour remplir le panier." }
  ], rewards: [{ type: "rupees", id: "prime", amount: 80 }], worldEffects: [] }
] as const satisfies readonly QuestDefinition[];
