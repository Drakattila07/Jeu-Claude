import type { ItemId } from "./items/core";

export interface ShopEntry {
  readonly id: string;
  readonly label: string;
  readonly price: number;
  /** Objet ajouté au sac à l'achat. */
  readonly item?: ItemId;
  /** Drapeau posé à l'achat (déblocages, dette du Colporteur…). */
  readonly flag?: string;
  /** Déclencheur d'activité annexe joué à l'achat. */
  readonly trigger?: string;
  /** Drapeau nécessaire pour que la ligne apparaisse en rayon. */
  readonly requires?: string;
  /** Achat unique : la ligne disparaît une fois payée. */
  readonly once?: boolean;
  readonly note: string;
}

export const SHOP_STOCK: readonly ShopEntry[] = [
  { id: "buy_root", label: "Racine amère", price: 6, item: "bitter_root",
    note: "Amère, mais elle tient au corps." },
  { id: "buy_candle", label: "Chandelle", price: 14, item: "candle",
    note: "Sept d'entre elles ouvrent un cercle." },
  { id: "buy_apple", label: "Pomme", price: 9, item: "apple",
    note: "Un ermite en raffole, paraît-il." },
  { id: "buy_red", label: "Potion rouge", price: 45, item: "red_potion",
    note: "Rend tous les cœurs. À garder pour les Cimes." },
  { id: "buy_debt", label: "Éponger sa dette", price: 200, flag: "merchant_debt_paid",
    trigger: "merchant_debt", once: true,
    note: "Il baisse les yeux. « Vous feriez ça ? »" },
  { id: "buy_eye", label: "Fleur-Œil", price: 60, item: "eye_flower",
    requires: "rare_stock", once: false,
    note: "Stock rare — réservé à ceux qui l'ont sorti d'affaire." },
  { id: "buy_letter", label: "Lettre jamais envoyée", price: 25, item: "unsent_letter",
    requires: "rare_stock", once: true,
    note: "« Elle traînait au fond. Je n'ai jamais su la rendre. »" },
];

/**
 * L'herboristerie de Mira.
 *
 * Mira achetait « ce qui pousse sans permission » depuis le premier jour et
 * ne vendait rien. Son rayon est plus étroit que celui du Colporteur, et
 * moins cher : c'est une herboriste, pas une brocante.
 */
export const HERBALIST_STOCK: readonly ShopEntry[] = [
  { id: "herb_seed_root", label: "Graines de racine", price: 12, item: "bitter_seed",
    note: "« Deux jours de terre, un peu d'eau. Rien de sorcier. »" },
  { id: "herb_seed_spore", label: "Sachet de spores", price: 18, item: "spore_pouch",
    note: "« Ça lève en une nuit. Ne le respire pas. »" },
  { id: "herb_seed_eye", label: "Pépins de Fleur-Œil", price: 34, item: "eye_seed",
    note: "« Trois jours. Et elles vous regarderont pousser. »" },
  { id: "herb_green", label: "Potion verte", price: 30, item: "green_potion",
    note: "« Pour le souffle. Le reste, c'est votre affaire. »" },
  { id: "herb_blue", label: "Potion bleue", price: 70, item: "blue_potion",
    requires: "source_open",
    note: "« Il me faut l'eau du puits. Rouvre la source, on en reparlera. »" },
  { id: "herb_satchel", label: "Doubler la besace", price: 180, flag: "satchel_upgraded",
    once: true,
    note: "« Vous ramassez plus que vous ne portez. Ça se corrige. »" },
];

/**
 * Écart de prix d'un village à l'autre, en pour-cent.
 *
 * Un prix unique dans toute la vallée transformait l'argent en compteur. Un
 * port paie cher ce qui pousse et brade ce qui flotte ; un hameau agricole
 * fait l'inverse. Acheter loin et revendre près devient un métier.
 */
export const PRICE_INDEX: Readonly<Record<string, number>> = {
  place_puits: 1,
  hameau_nord: 0.92,
  hameau_sud: 0.86,
  port_maree: 1.24,
  quai_des_carenes: 1.18,
};

/** Prix affiché dans une région donnée, arrondi au rubis. */
export function priceAt(base: number, zoneId: string): number {
  return Math.max(1, Math.round(base * (PRICE_INDEX[zoneId] ?? 1)));
}
