import { PALETTE } from "../data/palette";
import { SHOP_STOCK, priceAt, type ShopEntry } from "../data/shop";
import type { Input } from "../core/Input";
import { VIEW_HEIGHT, VIEW_WIDTH, type Renderer } from "../core/Renderer";
import type { Player } from "../entities/Player";
import type { Flags } from "./Flags";
import type { Inventory } from "./Inventory";

/** Lignes de rayon visibles simultanément. */
const VISIBLE_ROWS = 6;

export type PurchaseOutcome =
  | { readonly kind: "bought"; readonly entry: ShopEntry }
  | { readonly kind: "poor"; readonly missing: number }
  | { readonly kind: "full" }
  | { readonly kind: "none" };

export class Shop {
  active = false;
  private cursor = 0;
  private feedback = "";
  private feedbackFrames = 0;
  /**
   * Rayon ouvert. Le magasin ne connaissait que celui du Colporteur : Mira
   * n'aurait jamais pu vendre quoi que ce soit sans dupliquer la classe.
   */
  private catalogue: readonly ShopEntry[] = SHOP_STOCK;
  private title = "LE COLPORTEUR";
  /** Région où l'on marchande : elle décide de l'écart de prix. */
  private zoneId = "";

  constructor(
    private readonly flags: Flags,
    private readonly inventory: Inventory,
    private readonly bought = new Set<string>(),
  ) {}

  /** Rayon visible : les lignes verrouillées ou déjà achetées disparaissent. */
  get stock(): readonly ShopEntry[] {
    return this.catalogue.filter((entry) => {
      if (entry.requires && !this.flags.has(entry.requires)) return false;
      if (entry.once && this.bought.has(entry.id)) return false;
      return true;
    });
  }

  open(catalogue: readonly ShopEntry[] = SHOP_STOCK, title = "LE COLPORTEUR",
    zoneId = ""): void {
    this.active = true;
    this.catalogue = catalogue;
    this.title = title;
    this.zoneId = zoneId;
    this.cursor = 0;
    this.feedback = "";
    this.feedbackFrames = 0;
  }

  /** Prix affiché ici même : un port ne vend pas au tarif d'un hameau. */
  priceOf(entry: ShopEntry): number { return priceAt(entry.price, this.zoneId); }

  close(): void { this.active = false; }

  snapshot(): readonly string[] { return [...this.bought].sort(); }
  restore(entries: readonly string[]): void {
    this.bought.clear();
    for (const entry of entries) this.bought.add(entry);
  }

  /** Retourne l'achat conclu ce frame, s'il y en a un. */
  update(input: Input, player: Player): PurchaseOutcome {
    if (!this.active) return { kind: "none" };
    if (this.feedbackFrames > 0) this.feedbackFrames -= 1;
    const stock = this.stock;
    if (input.wasPressed("B") || input.wasPressed("Start")) {
      this.close();
      return { kind: "none" };
    }
    if (stock.length === 0) return { kind: "none" };
    if (input.wasPressed("Up")) this.cursor = (this.cursor + stock.length - 1) % stock.length;
    if (input.wasPressed("Down")) this.cursor = (this.cursor + 1) % stock.length;
    this.cursor = Math.min(this.cursor, stock.length - 1);
    if (!input.wasPressed("A")) return { kind: "none" };

    const entry = stock[this.cursor]!;
    const price = this.priceOf(entry);
    if (player.rupees < price) {
      const missing = price - player.rupees;
      this.feedback = `Il manque ${missing} rubis.`;
      this.feedbackFrames = 120;
      return { kind: "poor", missing };
    }
    if (entry.item && this.inventory.isFull(entry.item)) {
      this.feedback = "Votre sac déborde déjà.";
      this.feedbackFrames = 120;
      return { kind: "full" };
    }
    player.rupees -= price;
    if (entry.item) this.inventory.add(entry.item);
    if (entry.flag) this.flags.set(entry.flag);
    if (entry.once) this.bought.add(entry.id);
    this.feedback = entry.item ? `${entry.label} acheté !` : entry.note;
    this.feedbackFrames = 150;
    this.cursor = Math.min(this.cursor, Math.max(0, this.stock.length - 1));
    return { kind: "bought", entry };
  }

  /** Première ligne affichée : la fenêtre suit le curseur. */
  private scrollFor(total: number): number {
    if (total <= VISIBLE_ROWS) return 0;
    return Math.max(0, Math.min(total - VISIBLE_ROWS, this.cursor - Math.floor(VISIBLE_ROWS / 2)));
  }

  draw(renderer: Renderer, player: Player): void {
    if (!this.active) return;
    const { ctx } = renderer;
    const stock = this.stock;
    const left = 44;
    const width = VIEW_WIDTH - left * 2;
    const centre = VIEW_WIDTH / 2;
    ctx.save();
    ctx.fillStyle = "rgba(8,10,18,0.86)";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(left, 22, width, VIEW_HEIGHT - 44);
    ctx.strokeStyle = PALETTE.yellow;
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, 22.5, width - 1, VIEW_HEIGHT - 45);
    renderer.pixelText(this.title, centre, 30, PALETTE.yellow, "center");
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(left + 12, 46, 7, 9);
    ctx.fillStyle = PALETTE.leafLight;
    ctx.fillRect(left + 13, 47, 5, 7);
    renderer.pixelText(String(player.rupees), left + 24, 46, PALETTE.cream);

    if (stock.length === 0) {
      renderer.pixelText("Les étals sont vides.", centre, 104, PALETTE.stoneLight, "center");
      renderer.pixelText("C  fermer", centre, VIEW_HEIGHT - 36, PALETTE.stoneDark, "center");
      ctx.restore();
      return;
    }

    const scroll = this.scrollFor(stock.length);
    stock.slice(scroll, scroll + VISIBLE_ROWS).forEach((entry, row) => {
      const index = scroll + row;
      const y = 64 + row * 16;
      const selected = index === this.cursor;
      const price = this.priceOf(entry);
      const affordable = player.rupees >= price;
      if (selected) {
        ctx.fillStyle = PALETTE.pineDark;
        ctx.fillRect(left + 8, y - 3, width - 16, 15);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(left + 8, y - 3, 2, 15);
      }
      renderer.pixelText(entry.label, left + 18, y,
        affordable ? PALETTE.cream : PALETTE.stoneDark);
      renderer.pixelText(String(price), left + width - 16, y,
        affordable ? PALETTE.yellow : PALETTE.stoneDark, "right");
    });
    if (scroll > 0) renderer.pixelText("↑", left + width - 12, 64, PALETTE.stoneDark);
    if (scroll + VISIBLE_ROWS < stock.length) {
      renderer.pixelText("↓", left + width - 12, 64 + (VISIBLE_ROWS - 1) * 16, PALETTE.stoneDark);
    }

    const noteY = VIEW_HEIGHT - 58;
    const current = stock[this.cursor];
    if (current) renderer.pixelText(current.note, left + 12, noteY, PALETTE.grassLight);
    if (this.feedbackFrames > 0) {
      renderer.pixelText(this.feedback, left + 12, noteY + 14, PALETTE.rose);
    }
    renderer.pixelText("↑↓ choisir · X acheter · C fermer", centre, VIEW_HEIGHT - 32,
      PALETTE.stoneLight, "center");
    ctx.restore();
  }
}
