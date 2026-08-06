import type { Biome } from "./world";
import type { Tide } from "../core/Clock";

export type EnemyBehavior = "leap" | "dive" | "hop" | "wake" | "hunt" | "caster" | "charger";

export interface EnemyDefinition {
  readonly name: string;
  readonly hearts: number;
  readonly speed: number;
  readonly damage: number;
  readonly behavior: EnemyBehavior;
  readonly color: "leaf" | "purple" | "rose" | "stone" | "roof" | "water" | "sand" | "red";
  /** Distance à laquelle la créature remarque le joueur. */
  readonly aggro: number;
  /** Distance à laquelle elle prépare son coup. */
  readonly reach: number;
  /** Frames d'annonce avant la frappe : c'est la fenêtre d'esquive. */
  readonly windup: number;
  /** Rubis lâchés à la mort. */
  readonly bounty: number;
  /** Elle traverse le décor. */
  readonly phasing?: boolean;
  /** Elle tire un projectile au lieu de frapper. */
  readonly ranged?: boolean;
  /** Elle prend la fuite quand il ne lui reste qu'un cœur. */
  readonly skittish?: boolean;
}

export const ENEMY_TYPES = {
  beetle: {
    name: "Coléoptère sauteur", hearts: 2, speed: 0.72, damage: 1, behavior: "leap",
    color: "leaf", aggro: 92, reach: 22, windup: 22, bounty: 3,
  },
  branch_bat: {
    name: "Chauve-souris de branche", hearts: 1, speed: 1.15, damage: 1, behavior: "dive",
    color: "purple", aggro: 128, reach: 20, windup: 14, bounty: 2, phasing: true, skittish: true,
  },
  hop_mushroom: {
    name: "Champignon bondissant", hearts: 2, speed: 0.8, damage: 1, behavior: "hop",
    color: "rose", aggro: 84, reach: 22, windup: 26, bounty: 3,
  },
  gargoyle: {
    name: "Gargouille dormante", hearts: 5, speed: 0.6, damage: 2, behavior: "wake",
    color: "stone", aggro: 64, reach: 26, windup: 34, bounty: 8, phasing: true,
  },
  wolf: {
    name: "Loup des brumes", hearts: 3, speed: 1.05, damage: 1, behavior: "hunt",
    color: "stone", aggro: 150, reach: 24, windup: 18, bounty: 5, skittish: true,
  },
  castle_guard: {
    name: "Garde de Cendre", hearts: 6, speed: 0.86, damage: 2, behavior: "charger",
    color: "roof", aggro: 160, reach: 28, windup: 28, bounty: 10,
  },
  ember_mage: {
    name: "Mage des Braises", hearts: 4, speed: 0.6, damage: 2, behavior: "caster",
    color: "purple", aggro: 190, reach: 150, windup: 40, bounty: 12, ranged: true,
  },
  bog_lurker: {
    name: "Rôdeur des tourbières", hearts: 4, speed: 0.68, damage: 2, behavior: "hunt",
    color: "water", aggro: 110, reach: 24, windup: 24, bounty: 6,
  },
  stone_crab: {
    name: "Crabe de grève", hearts: 3, speed: 0.9, damage: 1, behavior: "charger",
    color: "sand", aggro: 96, reach: 22, windup: 20, bounty: 4,
  },
  frost_wisp: {
    name: "Feu follet de givre", hearts: 2, speed: 0.95, damage: 1, behavior: "caster",
    color: "water", aggro: 150, reach: 130, windup: 46, bounty: 6, ranged: true, phasing: true,
  },
  root_horror: {
    name: "Horreur des racines", hearts: 8, speed: 0.55, damage: 2, behavior: "charger",
    color: "leaf", aggro: 140, reach: 30, windup: 36, bounty: 16,
  },
  // — Le large —
  reef_serpent: {
    name: "Serpent de récif", hearts: 4, speed: 1.1, damage: 2, behavior: "dive",
    color: "water", aggro: 150, reach: 24, windup: 20, bounty: 9, phasing: true,
  },
  gull_raider: {
    name: "Goéland pillard", hearts: 2, speed: 1.3, damage: 1, behavior: "dive",
    color: "sand", aggro: 160, reach: 20, windup: 16, bounty: 5, phasing: true, skittish: true,
  },
  drowned_sailor: {
    name: "Matelot noyé", hearts: 5, speed: 0.62, damage: 2, behavior: "hunt",
    color: "water", aggro: 120, reach: 26, windup: 28, bounty: 11, phasing: true,
  },
  // — Le volcan —
  ember_hound: {
    name: "Molosse de braise", hearts: 5, speed: 1.15, damage: 2, behavior: "charger",
    color: "red", aggro: 170, reach: 26, windup: 22, bounty: 14,
  },
  cinder_wisp: {
    name: "Escarbille", hearts: 3, speed: 1, damage: 2, behavior: "caster",
    color: "red", aggro: 180, reach: 140, windup: 38, bounty: 12, ranged: true, phasing: true,
  },
  // — Le Marcheur : il n'existe qu'entre vingt-deux heures et six heures —
  night_walker: {
    name: "L'Arbre Marcheur", hearts: 9, speed: 0.8, damage: 2, behavior: "charger",
    color: "leaf", aggro: 200, reach: 34, windup: 34, bounty: 20,
  },
  // — Gardiens de Vertepierre —
  green_knight: {
    name: "Chevalier de Vertepierre", hearts: 10, speed: 0.9, damage: 2, behavior: "charger",
    color: "leaf", aggro: 190, reach: 32, windup: 30, bounty: 24,
  },

  // — Bêtes du carnet —

  /**
   * Le Héron d'Encre ne se bat pas : il s'en va. C'est une bête à observer,
   * pas à abattre — la seule du jeu dont l'intérêt est de l'approcher assez
   * près pour l'écrire, sans la faire fuir.
   */
  ink_heron: {
    name: "Héron d'Encre", hearts: 1, speed: 1.4, damage: 0, behavior: "hunt",
    color: "purple", aggro: 0, reach: 0, windup: 60, bounty: 30, skittish: true,
  },
  peat_golem: {
    name: "Golem de tourbe", hearts: 12, speed: 0.5, damage: 3, behavior: "charger",
    color: "water", aggro: 150, reach: 34, windup: 42, bounty: 28,
  },
  moon_jelly: {
    name: "Méduse de lune", hearts: 3, speed: 0.4, damage: 2, behavior: "wake",
    color: "purple", aggro: 70, reach: 26, windup: 30, bounty: 10, phasing: true,
  },
  strand_prowler: {
    name: "Rôdeur de l'estran", hearts: 6, speed: 1, damage: 2, behavior: "hunt",
    color: "sand", aggro: 140, reach: 26, windup: 24, bounty: 15,
  },
} as const satisfies Record<string, EnemyDefinition>;

export type EnemyType = keyof typeof ENEMY_TYPES;

export interface EnemySpawn {
  readonly id: string;
  readonly zone: string;
  readonly type: EnemyType;
  readonly x: number;
  readonly y: number;
}

/** Rencontres écrites à la main : elles portent la progression du récit. */
export const ENEMY_SPAWNS = [
  { id: "beetle_1", zone: "lisiere_carrefour", type: "beetle", x: 128, y: 192 },
  { id: "beetle_2", zone: "lisiere_carrefour", type: "beetle", x: 368, y: 256 },
  { id: "bat_1", zone: "lisiere_carrefour", type: "branch_bat", x: 352, y: 112 },
  { id: "mushroom_1", zone: "lisiere_carrefour", type: "hop_mushroom", x: 176, y: 96 },
  { id: "gargoyle_1", zone: "marches_ruines", type: "gargoyle", x: 272, y: 176 },
  { id: "wolf_1", zone: "lisiere_sentier", type: "wolf", x: 128, y: 160 },
  { id: "wolf_2", zone: "bosquet_souches", type: "wolf", x: 352, y: 256 },
  { id: "wolf_3", zone: "clairiere_cimes", type: "wolf", x: 144, y: 240 },
  { id: "wolf_4", zone: "lisiere_est", type: "wolf", x: 368, y: 144 },
  { id: "wolf_5", zone: "canopee_dense", type: "wolf", x: 192, y: 288 }
] as const satisfies readonly EnemySpawn[];

/** Salle du trône : 24×14 tuiles, soit 384×224 pixels. */
export const CASTLE_ENEMY_SPAWNS = [
  { id: "castle_guard_west", zone: "castle", type: "castle_guard", x: 96, y: 112 },
  { id: "castle_guard_east", zone: "castle", type: "castle_guard", x: 272, y: 112 },
  { id: "castle_guard_throne", zone: "castle", type: "castle_guard", x: 184, y: 64 },
  { id: "castle_ember_mage", zone: "castle", type: "ember_mage", x: 184, y: 160 },
] as const satisfies readonly EnemySpawn[];

/**
 * Gardiens nocturnes.
 *
 * « La nuit, rejoignez la Clairière des Cimes » ne disait pas quoi y faire :
 * on y arrivait, on ne voyait rien, et l'on repartait. Une créature qui n'y
 * existe qu'entre vingt-deux heures et six heures répond à la question — elle
 * se montre, elle attaque, et l'abattre fait avancer l'histoire.
 */
export interface NightGuardian {
  readonly zone: string;
  readonly type: EnemyType;
  readonly x: number;
  readonly y: number;
  /** Plage d'apparition, minuit compris quand `from` dépasse `to`. */
  readonly from: number;
  readonly to: number;
  /** Déclencheur de campagne joué à sa défaite. */
  readonly trigger: string;
  /** Une fois ce drapeau posé, il ne revient plus. */
  readonly until: string;
  /** Ce qu'on lit en arrivant, tant qu'il rôde. */
  readonly announce: string;
  /**
   * Marée exigée. Le Rôdeur de l'estran n'existe que sur le sable découvert :
   * la mer qui monte le remporte, et c'est tout l'intérêt de la chose.
   */
  readonly tide?: Tide;
  /** Il ne se montre qu'une fois ce drapeau posé. */
  readonly needs?: string;
}

export const NIGHT_GUARDIANS: readonly NightGuardian[] = [
  {
    zone: "clairiere_cimes", type: "night_walker", x: 192, y: 272,
    from: 22, to: 6, trigger: "walker_trace", until: "walker_followed",
    announce: "Quelque chose de haut marche entre les troncs.",
  },
  {
    zone: "tourbe", type: "peat_golem", x: 256, y: 224,
    from: 0, to: 24, trigger: "peat_golem_felled", until: "peat_golem_felled",
    announce: "La tourbe se soulève et prend la forme d'un dos.",
  },
  {
    zone: "banc_de_brume", type: "moon_jelly", x: 240, y: 208,
    from: 20, to: 6, trigger: "moon_jelly_seen", until: "moon_jelly_seen",
    announce: "Une cloche pâle dérive à hauteur de plat-bord.",
  },
  {
    zone: "greve_de_maree", type: "strand_prowler", x: 288, y: 320,
    from: 0, to: 24, tide: "basse", trigger: "strand_prowler_felled",
    until: "strand_prowler_felled",
    announce: "Quelque chose fouille le sable que la mer vient de quitter.",
  },
  {
    zone: "riviere_gue", type: "ink_heron", x: 256, y: 176,
    from: 5, to: 8, trigger: "heron_observed", until: "heron_observed",
    announce: "Un héron noir se tient dans le gué. Il ne vous a pas encore vue.",
  },
];

/**
 * Le gardien d'une région, s'il rôde à cette heure, à cette marée, et qu'il
 * n'est pas encore réglé.
 */
export function nightGuardianFor(zoneId: string, hour: number,
  hasFlag: (flag: string) => boolean, tide?: Tide): NightGuardian | null {
  const guardian = NIGHT_GUARDIANS.find((candidate) => candidate.zone === zoneId);
  if (!guardian || hasFlag(guardian.until)) return null;
  if (guardian.needs !== undefined && !hasFlag(guardian.needs)) return null;
  if (guardian.tide !== undefined && tide !== undefined && guardian.tide !== tide) return null;
  const awake = guardian.from > guardian.to
    ? hour >= guardian.from || hour < guardian.to
    : hour >= guardian.from && hour < guardian.to;
  return awake ? guardian : null;
}

/**
 * Faune propre à chaque milieu. Cinquante-six régions ne pouvaient pas vivre
 * sur dix ennemis posés à la main : le reste du peuplement se déduit du biome
 * et du niveau de menace de la zone.
 */
export const BIOME_FAUNA: Readonly<Record<Biome, readonly EnemyType[]>> = {
  forest: ["beetle", "branch_bat", "hop_mushroom", "wolf"],
  peaks: ["frost_wisp", "wolf", "gargoyle"],
  cliffs: ["gargoyle", "stone_crab", "frost_wisp"],
  ruins: ["gargoyle", "ember_mage", "castle_guard"],
  marsh: ["bog_lurker", "hop_mushroom", "branch_bat"],
  reeds: ["bog_lurker", "stone_crab"],
  lake: ["stone_crab", "bog_lurker"],
  river: ["stone_crab", "beetle"],
  canal: ["bog_lurker", "gargoyle", "ember_mage"],
  fields: ["beetle", "hop_mushroom"],
  witch: ["frost_wisp", "branch_bat"],
  village: [],
  sea: ["reef_serpent", "gull_raider", "drowned_sailor"],
  volcano: ["ember_hound", "cinder_wisp"],
};
