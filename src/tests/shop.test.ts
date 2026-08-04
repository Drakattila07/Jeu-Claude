import { describe, expect, it } from "vitest";
import { Shop } from "../systems/Shop";
import { Flags } from "../systems/Flags";
import { Inventory } from "../systems/Inventory";
import { Input, type Action } from "../core/Input";
import { Player } from "../entities/Player";
import { TileMap } from "../world/TileMap";
import { TileSet } from "../world/TileSet";
import { createProceduralMap } from "../world/ZoneMapFactory";
import { WORLD_ZONES } from "../data/world";

/** Entrée factice : on injecte directement les touches pressées du frame. */
class FakeInput extends Input {
  private queued = new Set<Action>();
  constructor() { super({ addEventListener: () => undefined } as unknown as Window); }
  press(...actions: Action[]): void { this.queued = new Set(actions); }
  override wasPressed(action: Action): boolean { return this.queued.has(action); }
}

function setup(rupees = 300) {
  const flags = new Flags();
  const inventory = new Inventory();
  const shop = new Shop(flags, inventory);
  const map = new TileMap(createProceduralMap(WORLD_ZONES[27]!), new TileSet());
  const input = new FakeInput();
  const player = new Player(input, map);
  player.rupees = rupees;
  return { flags, inventory, shop, input, player };
}

describe("boutique du Colporteur", () => {
  it("cache le stock rare tant qu'il n'est pas débloqué", () => {
    const { flags, shop } = setup();
    expect(shop.stock.some((entry) => entry.id === "buy_eye")).toBe(false);
    flags.set("rare_stock");
    expect(shop.stock.some((entry) => entry.id === "buy_eye")).toBe(true);
  });

  it("achète, débite la bourse et remplit le sac", () => {
    const { shop, inventory, input, player } = setup(50);
    shop.open();
    input.press("A");
    const outcome = shop.update(input, player);
    expect(outcome.kind).toBe("bought");
    expect(inventory.count("bitter_root")).toBe(1);
    expect(player.rupees).toBe(44);
  });

  it("refuse quand la bourse est trop légère et annonce le manque", () => {
    const { shop, input, player } = setup(3);
    shop.open();
    input.press("A");
    const outcome = shop.update(input, player);
    expect(outcome).toEqual({ kind: "poor", missing: 3 });
    expect(player.rupees).toBe(3);
  });

  it("éponge la dette une seule fois et pose le drapeau", () => {
    const { shop, flags, input, player } = setup(400);
    shop.open();
    const debtIndex = shop.stock.findIndex((entry) => entry.id === "buy_debt");
    for (let step = 0; step < debtIndex; step += 1) {
      input.press("Down");
      shop.update(input, player);
    }
    input.press("A");
    const outcome = shop.update(input, player);
    expect(outcome.kind).toBe("bought");
    expect(flags.has("merchant_debt_paid")).toBe(true);
    expect(player.rupees).toBe(200);
    expect(shop.stock.some((entry) => entry.id === "buy_debt")).toBe(false);
  });

  it("conserve les achats uniques à travers une sauvegarde", () => {
    const { shop } = setup();
    const restored = new Shop(new Flags(), new Inventory());
    restored.restore(["buy_debt"]);
    expect(restored.stock.some((entry) => entry.id === "buy_debt")).toBe(false);
    expect(shop.snapshot()).toEqual([]);
  });

  it("se ferme sur C sans rien acheter", () => {
    const { shop, input, player } = setup();
    shop.open();
    input.press("B");
    expect(shop.update(input, player).kind).toBe("none");
    expect(shop.active).toBe(false);
    expect(player.rupees).toBe(300);
  });
});
