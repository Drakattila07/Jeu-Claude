import type { NpcData } from "./core";
import { INTERIOR_HEIGHT, INTERIOR_WIDTH, houseTradeFor, type HouseTrade } from "../../world/Interiors";

/**
 * Habitants des maisons.
 *
 * Entrer chez les gens et n'y trouver que des meubles est plus froid qu'une
 * porte close. Chaque logis a désormais son occupant, tiré de la graine de la
 * porte : le même seuil rend toujours la même personne, avec le même nom et
 * les mêmes mots. Rien de tout cela n'est écrit à la main — quatre-vingt-dix
 * régions de maisons ne se peuplent pas à la liste.
 */
const FIRST_NAMES: readonly string[] = [
  "Anselme", "Berthe", "Colin", "Dagne", "Émeric", "Fleur", "Gaud", "Hélie",
  "Isaure", "Jonas", "Kerdic", "Lise", "Merlin", "Noé", "Osane", "Perrin",
  "Quenot", "Rozenn", "Servan", "Thibaut", "Ulrique", "Vianne", "Wendel", "Ysoire",
];

const SURNAMES: readonly string[] = [
  "le Tisserand", "des Fossés", "au Grand Pas", "la Cadette", "du Vieux Puits",
  "aux Mains Bleues", "le Taciturne", "de la Combe",
];

const COLORS: readonly NpcData["color"][] = ["roof", "purple", "water", "leaf", "sand", "stone"];

/** Répliques par métier : elles disent le lieu autant que la personne. */
const CHATTER: Readonly<Record<HouseTrade, readonly string[]>> = {
  logis: [
    "Entrez donc, la porte n'a jamais fermé.",
    "Le puits parle à nouveau. On dort mieux.",
    "Mon père disait que la vallée se venge lentement.",
    "Vous avez les bottes d'une qui marche beaucoup.",
    "Si vous montez aux Cimes, couvrez-vous.",
    "On a entendu du bruit vers la Lisière, cette nuit.",
  ],
  atelier: [
    "Attention, l'établi est encore plein d'échardes.",
    "Un outil bien tenu dure trois générations.",
    "Je répare tout, sauf les promesses.",
    "Le bois de la Canopée travaille trop. Trop humide.",
    "Bram m'achète mes manches. Il paie mal.",
    "Revenez quand j'aurai fini ce montant.",
  ],
  auberge: [
    "Un lit vous attend au fond. Servez-vous.",
    "On loge, on nourrit, on écoute. Dans cet ordre.",
    "Les marins de Port-Marée racontent n'importe quoi.",
    "Dormez donc : la nuit ne vaut rien pour marcher.",
    "J'ai vu passer une carte des courants, une fois.",
    "Le premier verre est pour la route, pas pour vous.",
  ],
  echoppe: [
    "Regardez, ne touchez pas. Ou touchez, mais achetez.",
    "Le Colporteur casse mes prix. Il finira noyé.",
    "J'ai eu du minerai de lune. Une fois. Une seule.",
    "Tout ce qui brille ici a coûté cher à quelqu'un.",
    "Les récoltes sont mauvaises, donc mes prix sont bons.",
    "Vous cherchez quelque chose de précis, vous.",
  ],
};

function pick<T>(list: readonly T[], seed: number, shift: number): T {
  return list[Math.abs(seed >> shift) % list.length]!;
}

/** Identifiant stable d'un habitant, dérivé de la graine de sa porte. */
export function residentId(seed: number): string {
  return `resident:${seed >>> 0}`;
}

/**
 * Fabrique l'habitant d'un logis. L'emploi du temps le maintient chez lui à
 * toute heure : c'est une pièce, pas une région, il n'a nulle part où aller.
 */
export function residentOf(seed: number, roomZoneId: string): NpcData {
  const trade = houseTradeFor(seed);
  const first = pick(FIRST_NAMES, seed, 3);
  const surname = pick(SURNAMES, seed, 9);
  const lines = CHATTER[trade];
  const offset = Math.abs(seed >> 5) % lines.length;
  const chatter: [string, string, string, string] = [
    lines[offset]!,
    lines[(offset + 1) % lines.length]!,
    lines[(offset + 2) % lines.length]!,
    lines[(offset + 3) % lines.length]!,
  ];
  // Il se tient dans le tiers haut de la pièce, jamais devant la sortie.
  const x = (4 + (Math.abs(seed >> 7) % (INTERIOR_WIDTH - 9))) * 16;
  const y = (4 + (Math.abs(seed >> 11) % Math.max(1, INTERIOR_HEIGHT - 9))) * 16;
  return {
    id: residentId(seed),
    name: trade === "auberge" ? `${first}, aubergiste`
      : trade === "atelier" ? `${first}, artisan`
        : trade === "echoppe" ? `${first}, marchand` : `${first} ${surname}`,
    color: pick(COLORS, seed, 13),
    schedule: [{ start: 0, end: 24, zone: roomZoneId, x, y }],
    chatter,
  };
}
