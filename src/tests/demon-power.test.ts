import { describe, expect, it } from "vitest";
import type { Input } from "../core/Input";
import { CASTLE_ENEMY_SPAWNS } from "../data/enemies";
import { Projectile } from "../entities/Projectile";
import { Player } from "../entities/Player";
import { BurningWorld } from "../world/BurningWorld";
import { TileMap, type LayerName, type TiledMapData } from "../world/TileMap";
import { TileSet } from "../world/TileSet";

function openMap(): TileMap {
  const names: readonly LayerName[] = ["ground", "terrain", "decor_below", "decor_above"];
  const data: TiledMapData = {
    width: 32, height: 28, tilewidth: 16, tileheight: 16,
    layers: names.map((name) => ({
      name, width: 32, height: 28,
      data: new Array<number>(32 * 28).fill(name === "ground" ? 1 : 0),
    })),
  };
  return new TileMap(data, new TileSet());
}

function idleInput(): Input {
  return { isDown: () => false, direction: () => ({ x: 0, y: 0 }) } as unknown as Input;
}

describe("pouvoir du Demi-Démon", () => {
  it("augmente la vitesse, les dégâts et la portée de zone", () => {
    const player = new Player(idleInput(), openMap());
    const humanSpeed = player.speed;
    player.setDemon(true);
    expect(player.speed).toBeGreaterThan(humanSpeed);
    expect(player.attackDamage).toBe(2);
    expect(player.fireRadius).toBeGreaterThan(0);
  });

  it("projette une boule de feu dans la direction visée", () => {
    const fireball = new Projectile({ x: 100, y: 100 }, { x: 1, y: 0 }, "fireball", "player");
    const start = fireball.position.x;
    fireball.update();
    expect(fireball.position.x).toBeGreaterThan(start);
    expect(fireball.active).toBe(true);
    expect(fireball.side).toBe("player");
  });

  it("distingue les traits amis des traits ennemis", () => {
    const hostile = new Projectile({ x: 10, y: 10 }, { x: 0, y: 1 }, "ember", "foe");
    expect(hostile.side).toBe("foe");
    expect(hostile.damage).toBeGreaterThan(0);
  });

  it("mémorise les éléments incendiés sans doublon", () => {
    const burning = new BurningWorld();
    expect(burning.ignite("forest", 4, 5)).toBe(true);
    expect(burning.ignite("forest", 4, 5)).toBe(false);
    expect(burning.count("forest")).toBe(1);
    const tileSet = new TileSet();
    expect(tileSet.properties(6).burnable).toBe(true);
    expect(tileSet.properties(8).burnable).toBe(true);
  });

  it("place quatre défenseurs dans le château", () => {
    expect(CASTLE_ENEMY_SPAWNS).toHaveLength(4);
    expect(CASTLE_ENEMY_SPAWNS.filter((enemy) => enemy.type === "castle_guard")).toHaveLength(3);
  });
});
