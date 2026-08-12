export const EPILOGUES = {
  /**
   * Ce que la vallée dit une fois les Racines Creuses refermées. Il prime sur
   * `release`/`root` : c'est le dernier mot, celui que la Chronique promettait
   * à sa page blanche sans jamais l'écrire.
   */
  hollow: {
    doyen_orme: "Des racines sous la Cime ? J'ai dirigé cette vallée quarante ans sans le savoir.",
    mira: "Liane connaît des herbes que même moi je n'ai jamais vues.",
    bram: "Elle m'a demandé pourquoi le fer chante sous le marteau. Je n'ai pas su répondre.",
    nessa: "Le lac ne dit plus rien de nouveau. C'est reposant, pour changer.",
    ryn: "On l'a vue rire. Une racine, ça rit !", tam: "J'avais raison depuis le début.",
    colporteur: "Une compagne qui pousse des ronces ! Le marché n'est pas prêt.",
    sylve: "Sylve dessine deux arbres qui se tiennent par la main.",
    gorm: "Sous la Cime, hein. Je m'en doutais un peu, à vrai dire.",
    iris: "Le nom du jeu qu'on joue depuis toujours, révélé à la fin. Ça m'amuse.",
    crane: "Encore une racine qui parle. Ce monde ne cessera jamais de m'étonner.",
    fermier_a: "On l'a vue porter l'eau aux jeunes pousses, la nuit.",
    fermier_b: "Sans qu'on le lui demande. C'est bon signe.",
  },
  release: {
    doyen_orme: "Elle est partie. La vallée devra apprendre à ne plus dépendre d'une seule racine.",
    mira: "Les graines qu'elle a laissées germent déjà.",
    bram: "Une promesse fragile vaut mieux qu'une chaîne solide.",
    nessa: "Le lac change, mais il respire.",
    ryn: "Je savais qu'il fallait la libérer.", tam: "C'était mon idée.",
    colporteur: "Un arbre voyageur ! Imagine le marché.",
    sylve: "Sylve dessine un arbre avec des jambes.",
    gorm: "Tu as choisi le risque. C'est donc que tu as compris.",
    iris: "Une dette rendue au vivant. Rare.",
    crane: "Même les arbres partent avant moi.",
    fermier_a: "Nous surveillerons chaque goutte.", fermier_b: "Et chaque pousse."
  },
  root: {
    doyen_orme: "L'eau reviendra toujours. Mais j'entends parfois son rêve sous la pierre.",
    mira: "Ses racines guérissent la vallée. Son silence, moins.",
    bram: "Tu as forgé une paix lourde.",
    nessa: "Le lac est plein. Trop calme, peut-être.",
    ryn: "Je savais qu'il fallait l'enraciner.", tam: "C'était mon idée.",
    colporteur: "L'eau garantie à vie ! Voilà une valeur sûre.",
    sylve: "Sylve pose la main sur le sol et ferme les yeux.",
    gorm: "Le mécanisme tiendra. Le prix aussi.",
    iris: "Tu as choisi la certitude. Elle a toujours faim.",
    crane: "Dormir pour toujours ? Enfin une bonne idée.",
    fermier_a: "Les champs boivent de nouveau.", fermier_b: "Nous n'oublierons pas pourquoi."
  }
} as const;

export type EndingId = keyof typeof EPILOGUES;

export function epilogueLine(ending: EndingId, npcId: string): string | null {
  const lines: Readonly<Record<string, string>> = EPILOGUES[ending];
  return lines[npcId] ?? null;
}
