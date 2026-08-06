import type { QuestStepType } from "./quests/core";

export interface CampaignTrigger {
  readonly id: string;
  readonly once: boolean;
  readonly setFlags: readonly string[];
  readonly quest?: { readonly type: QuestStepType; readonly target: string; readonly amount?: number };
  readonly message: string;
}

export const CAMPAIGN_TRIGGERS: readonly CampaignTrigger[] = [
  { id: "bram_sword", once: true, setFlags: ["sword_obtained"], quest: { type: "flag", target: "sword_obtained" },
    message: "Bram vous confie l'Épée du Cartographe." },
  { id: "source_roots", once: true, setFlags: ["source_open"], quest: { type: "defeat", target: "source_roots" },
    message: "Les racines cèdent. La vanne gronde et l'eau repart !" },
  { id: "walker_trace", once: true, setFlags: ["walker_seen", "walker_followed"],
    quest: { type: "flag", target: "walker_seen" }, message: "Les empreintes mènent vers les Marches de Pierre." },
  { id: "walker_follow", once: true, setFlags: ["walker_followed"], quest: { type: "flag", target: "walker_followed" },
    message: "L'Arbre Marcheur ouvre un passage dans les pierres." },
  { id: "seal_a", once: true, setFlags: ["seal_a"], quest: { type: "collect", target: "seal" },
    message: "Premier Sceau : la pierre résonne." },
  { id: "seal_b", once: true, setFlags: ["seal_b"], quest: { type: "collect", target: "seal" },
    message: "Deuxième Sceau : un courant d'air se lève." },
  { id: "seal_c", once: true, setFlags: ["seal_c", "three_seals_open"], quest: { type: "collect", target: "seal" },
    message: "Troisième Sceau : le portail du Canal s'ouvre." },
  { id: "mechanism_heart", once: true, setFlags: ["mechanism_repaired", "lake_high", "mill_running"],
    quest: { type: "flag", target: "mechanism_repaired" }, message: "Le Cœur tourne. Le lac remonte de deux tuiles." },

  // — Les gardiens ajoutés : chacun doit poser son propre drapeau, sinon on
  //   le recroise à chaque visite sans que rien n'avance.
  { id: "peat_golem_felled", once: true, setFlags: ["peat_golem_felled"],
    quest: { type: "defeat", target: "peat_golem" },
    message: "Le golem retourne à la tourbe. Le sol se referme sur lui sans un bruit." },
  { id: "moon_jelly_seen", once: true, setFlags: ["moon_jelly_seen"],
    quest: { type: "defeat", target: "moon_jelly" },
    message: "La cloche pâle se défait en filaments et redescend vers le fond." },
  { id: "strand_prowler_felled", once: true, setFlags: ["strand_prowler_felled"],
    quest: { type: "defeat", target: "strand_prowler" },
    message: "Le rôdeur lâche sa fouille. La mer effacera ses traces en montant." },
  { id: "heron_observed", once: true, setFlags: ["heron_observed"],
    quest: { type: "flag", target: "heron_observed" },
    message: "Le Héron d'Encre s'élève sans hâte. Le croquis, lui, reste." }
];
