import type { ItemId } from "../data/items/core";

/**
 * La poste aux pigeons de Colombin.
 *
 * On confie un objet, le pigeon part, et la réponse arrive le lendemain. Le
 * délai est le sel de l'affaire : un envoi qui revient tout de suite n'est
 * qu'un marchand de plus.
 */

export interface PostalReply {
  /** Objet reçu en retour. */
  readonly item: ItemId;
  readonly count: number;
  readonly from: string;
  readonly text: string;
}

export interface Parcel {
  readonly sent: ItemId;
  readonly day: number;
  readonly reply: PostalReply;
}

/** Ce que chaque destinataire renvoie. L'échange doit valoir le voyage. */
const REPLIES: Partial<Record<ItemId, PostalReply>> = {
  fish_scale: {
    item: "tide_pearl", count: 1, from: "Nessa",
    text: "« Vos écailles étaient trop belles pour l'appât. J'ai troqué contre ça sur la grève. »",
  },
  bitter_root: {
    item: "red_potion", count: 1, from: "Mira",
    text: "« Cinq racines, une potion. Je ne fais pas de cadeau, je fais du travail. »",
  },
  moon_ore: {
    item: "sword_temper", count: 1, from: "Bram",
    text: "« Bon minerai. Passe à l'enclume, j'ai gardé la trempe pour toi. »",
  },
  night_pear: {
    item: "green_potion", count: 1, from: "Sœur Aubel",
    text: "« Les poires de nuit dorment mal en bocal. J'en ai fait ceci. »",
  },
  violet_mushroom: {
    item: "candle", count: 3, from: "Îris",
    text: "« Vos champignons m'ont servi. Je vous rends de la lumière. Nous sommes quittes. »",
  },
  drowned_page: {
    item: "heart_shard", count: 1, from: "La Veuve Hale",
    text: "« Ce feuillet parlait de mon mari. Prenez ceci, je n'en ai plus l'usage. »",
  },
  apple: {
    item: "smoked_fish", count: 2, from: "Gorm",
    text: "« POMME REÇUE. POISSON EN ÉCHANGE. NE M'ÉCRIS PLUS. »",
  },
  tide_pearl: {
    item: "postal_token", count: 3, from: "Le Colporteur",
    text: "« Une perle d'estran ! Rare, authentique, presque légal. Voici de quoi m'écrire encore. »",
  },
};

/** Objets que le pigeon accepte d'emporter. */
export function acceptedByPost(item: ItemId): boolean {
  return REPLIES[item] !== undefined;
}

export function replyFor(item: ItemId): PostalReply | null {
  return REPLIES[item] ?? null;
}

export class PigeonPost {
  private parcel: Parcel | null = null;

  get pending(): boolean { return this.parcel !== null; }
  get sentItem(): ItemId | null { return this.parcel?.sent ?? null; }

  /** Confie un objet. Faux si un envoi est déjà en route ou l'objet refusé. */
  send(item: ItemId, day: number): boolean {
    if (this.parcel !== null) return false;
    const reply = replyFor(item);
    if (!reply) return false;
    this.parcel = { sent: item, day, reply };
    return true;
  }

  /** Réponse arrivée, si le jour a tourné. Elle ne se retire qu'une fois. */
  collect(day: number): PostalReply | null {
    if (this.parcel === null || day <= this.parcel.day) return null;
    const { reply } = this.parcel;
    this.parcel = null;
    return reply;
  }

  /** Ce que Colombin répond quand on l'interroge sans rien lui donner. */
  status(day: number): string {
    if (this.parcel === null) return "« Rien en vol. Confiez-moi quelque chose. »";
    if (day > this.parcel.day) return "« Il est rentré ! Prenez, ça pèse. »";
    return "« Parti ce matin. Repassez demain, il ne vole pas la nuit. »";
  }

  snapshot(): Parcel | null { return this.parcel; }
  restore(value: Parcel | null | undefined): void { this.parcel = value ?? null; }
}
