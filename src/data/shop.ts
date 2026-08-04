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
