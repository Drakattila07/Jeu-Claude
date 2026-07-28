import { describe, expect, it } from "vitest";
import type { Input } from "../core/Input";
import { CASTLE_ENEMY_SPAWNS } from "../data/enemies";
import { Fireball } from "../entities/Fireball";
import { Player } from "../entities/Player";
import { BurningWorld } from "../world/BurningWorld";
import { TileMap, type LayerName, type TiledMapData } from "../world/TileMap";
import { TileSet } from "../world/TileSet";

function openMap(): TileMap {
  const names: readonly LayerName[] = ["ground", "terrain", "decor_below", "decor_above"];
  const data: TiledMapData = {
    width: 16, height: 14, tilewidth: 16, tileheight: 16,
    layers: names.map((name) => ({
      name, width: 16, height: 14,
      data: new Array<number>(224).fill(name === "ground" ? 1 : 0),
    })),
  };
  return new TileMap(data, new TileSet());
}

describe("pouvoir du Demi-Démon", () => {
  it("augmente la vitesse, les dégâts et la portée de zone", () => {
    const input = { isDown: () => false } as unknown as Input;
    const player = new Player(input, openMap());
    expect(player.speed).toBe(1.5);
    player.setDemon(true);
    expect(player.speed).toBeGreaterThan(2);
    expect(player.attackDamage).toBe(2);
    expect(player.fireRadius).toBe(36);
  });

  it("projette une boule de feu dans la direction du joueur", () => {
    const fireball = new Fireball({ x: 100, y: 100 }, "right");
    const start = fireball.position.x;
    fireball.update();
    expect(fireball.position.x).toBeGreaterThan(start);
    expect(fireball.active).toBe(true);
  });

  it("mémorise les éléments incendiés sans doublon", () => {
    const burning = new BurningWorld();
    expect(burning.ignite("forest", 4, 5)).toBe(true);
    expect(burning.ignite("forest", 4, 5)).toBe(false);
    expect(burning.count("forest")).toBe(1);
    expect(new TileSet().properties(6).burnable).toBe(true);
    expect(new TileSet().properties(8).burnable).toBe(true);
  });

  it("place quatre défenseurs dans le château", () => {
    expect(CASTLE_ENEMY_SPAWNS).toHaveLength(4);
    expect(CASTLE_ENEMY_SPAWNS.filter((enemy) => enemy.type === "castle_guard")).toHaveLength(3);
  });
});
