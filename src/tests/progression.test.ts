import { describe, expect, it } from "vitest";
import { Flags } from "../systems/Flags";
import { Progression, BASE_MAX_HEARTS, BASE_RUPEE_CAP } from "../systems/Progression";
import { Player } from "../entities/Player";
import { Input } from "../core/Input";
import { TileMap } from "../world/TileMap";
import { TileSet } from "../world/TileSet";
import { createProceduralMap } from "../world/ZoneMapFactory";
import { WORLD_ZONES } from "../data/world";

function makePlayer(): Player {
  const target = { addEventListener: () => undefined } as unknown as Window;
  const map = new TileMap(createProceduralMap(WORLD_ZONES[27]!), new TileSet());
  return new Player(new Input(target), map);
}

describe("progression et récompenses", () => {
  it("part des valeurs de base sans aucun drapeau", () => {
    const progression = new Progression(new Flags());
    expect(progression.maxHearts).toBe(BASE_MAX_HEARTS);
    expect(progression.swordBonus).toBe(0);
    expect(progression.rupeeCap).toBe(BASE_RUPEE_CAP);
  });

  it("cumule les cœurs des quêtes annexes", () => {
    const flags = new Flags();
    flags.set("heart_stump");
    flags.set("gorm_friendly");
    expect(new Progression(flags).maxHearts).toBe(BASE_MAX_HEARTS + 4);
  });

  it("traduit Épée +1 en dégâts réels", () => {
    const flags = new Flags();
    const player = makePlayer();
    expect(player.attackDamage).toBe(1);
    flags.set("sword_plus_1");
    new Progression(flags).apply(player);
    expect(player.attackDamage).toBe(2);
    player.setDemon(true);
    expect(player.attackDamage).toBe(3);
  });

  it("offre pleins les cœurs gagnés sans dépasser le maximum", () => {
    const flags = new Flags();
    const player = makePlayer();
    player.hearts = 2;
    flags.set("heart_stump");
    new Progression(flags).apply(player);
    expect(player.maxHearts).toBe(BASE_MAX_HEARTS + 2);
    expect(player.hearts).toBe(4);
  });

  it("plafonne la bourse et la relève avec le porte-monnaie 500", () => {
    const flags = new Flags();
    const player = makePlayer();
    player.rupees = 999;
    new Progression(flags).apply(player);
    expect(player.rupees).toBe(BASE_RUPEE_CAP);
    flags.set("wallet_500");
    player.rupees = 999;
    new Progression(flags).apply(player);
    expect(player.rupees).toBe(500);
  });
});
