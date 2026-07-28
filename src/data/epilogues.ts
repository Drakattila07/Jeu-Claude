export const EPILOGUES = {
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
