import { describe, expect, it } from "vitest";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import type { Input } from "../core/Input";
import { TileMap, type TiledMapData } from "../world/TileMap";
import { TileSet } from "../world/TileSet";
import { ZONE_HEIGHT, ZONE_WIDTH } from "../core/Renderer";

const WIDTH = 32;
const HEIGHT = 28;
/** Le mur occupe la colonne 12, soit les x de 192 à 207. */
const WALL_COLUMN = 12;
const WALL_X = WALL_COLUMN * 16;

/** Carte de test : un mur plein sur une colonne, sol libre partout ailleurs. */
function walledMap(): TiledMapData {
  const size = WIDTH * HEIGHT;
  const ground = Array.from({ length: size }, () => 1);
  const terrain = Array.from({ length: size }, (_, index) =>
    index % WIDTH === WALL_COLUMN ? 9 : 0);
  const empty = Array.from({ length: size }, () => 0);
  return {
    width: WIDTH, height: HEIGHT, tilewidth: 16, tileheight: 16,
    layers: [
      { name: "ground", width: WIDTH, height: HEIGHT, data: ground },
      { name: "terrain", width: WIDTH, height: HEIGHT, data: terrain },
      { name: "decor_below", width: WIDTH, height: HEIGHT, data: empty },
      { name: "decor_above", width: WIDTH, height: HEIGHT, data: empty },
    ],
  };
}

function makePlayer(map: TileMap): Player {
  const input = { isDown: () => false, direction: () => ({ x: 0, y: 0 }) } as unknown as Input;
  return new Player(input, map);
}

describe("comportement des créatures", () => {
  it("bloque un marcheur contre le mur au lieu de le traverser", () => {
    const map = new TileMap(walledMap(), new TileSet());
    expect(map.isSolid(WALL_COLUMN, 5)).toBe(true);

    const player = makePlayer(map);
    player.position = { x: WALL_X + 22, y: 160 };
    const enemy = new Enemy(
      { id: "test_wolf", zone: "z", type: "wolf", x: WALL_X - 60, y: 160 }, player, map);

    for (let frame = 0; frame < 300; frame += 1) enemy.update();
    expect(enemy.position.x).toBeGreaterThan(WALL_X - 60); // il a bien avancé…
    expect(enemy.position.x).toBeLessThan(WALL_X);         // …mais le mur l'arrête.
  });

  it("laisse les créatures volantes ignorer le décor", () => {
    const map = new TileMap(walledMap(), new TileSet());
    const player = makePlayer(map);
    player.position = { x: WALL_X + 10, y: 160 };

    // Posée en plein mur, une créature qui traverse y reste ; une créature
    // terrestre est repoussée sur la première case praticable.
    const ghost = new Enemy(
      { id: "ghost", zone: "z", type: "gargoyle", x: WALL_X, y: 160 }, player, map);
    expect(ghost.position.x).toBe(WALL_X);

    const walker = new Enemy(
      { id: "walker", zone: "z", type: "wolf", x: WALL_X, y: 160 }, player, map);
    expect(walker.position.x).not.toBe(WALL_X);
    const tileX = Math.floor((walker.position.x + walker.hitbox.x) / 16);
    expect(map.isSolid(tileX, Math.floor((walker.position.y + walker.hitbox.y) / 16))).toBe(false);
  });

  it("garde les créatures dans les limites de la carte", () => {
    const map = new TileMap(walledMap(), new TileSet());
    const player = makePlayer(map);
    player.position = { x: ZONE_WIDTH - 20, y: ZONE_HEIGHT - 20 };
    const enemy = new Enemy(
      { id: "runner", zone: "z", type: "branch_bat", x: ZONE_WIDTH - 60, y: ZONE_HEIGHT - 60 },
      player, map);

    for (let frame = 0; frame < 600; frame += 1) enemy.update();
    expect(enemy.position.x).toBeLessThanOrEqual(ZONE_WIDTH - 20);
    expect(enemy.position.y).toBeLessThanOrEqual(ZONE_HEIGHT - 20);
    expect(enemy.position.x).toBeGreaterThanOrEqual(4);
    expect(enemy.position.y).toBeGreaterThanOrEqual(4);
  });

  it("aligne la boîte de collision sur la hitbox déclarée", () => {
    const map = new TileMap(walledMap(), new TileSet());
    const player = makePlayer(map);
    const enemy = new Enemy({ id: "b", zone: "z", type: "wolf", x: 64, y: 96 }, player, map);
    expect(enemy.bounds).toEqual({ x: 66, y: 101, width: 12, height: 10 });
  });

  it("annonce son attaque avant de frapper", () => {
    // C'est la fenêtre d'esquive : sans elle, un contact suffisait à blesser
    // sans que rien ne l'ait laissé prévoir.
    const map = new TileMap(walledMap(), new TileSet());
    const player = makePlayer(map);
    player.position = { x: 200, y: 200 };
    const enemy = new Enemy({ id: "c", zone: "z", type: "wolf", x: 210, y: 200 }, player, map);

    let telegraphed = false;
    let struck = false;
    for (let frame = 0; frame < 200; frame += 1) {
      enemy.update();
      if (enemy.isTelegraphing) telegraphed = true;
      if (enemy.takeStrike()) {
        struck = true;
        expect(telegraphed).toBe(true);
        break;
      }
    }
    expect(struck).toBe(true);
  });

  it("interrompt l'annonce quand on la frappe à temps", () => {
    const map = new TileMap(walledMap(), new TileSet());
    const player = makePlayer(map);
    player.position = { x: 200, y: 200 };
    const enemy = new Enemy({ id: "d", zone: "z", type: "gargoyle", x: 212, y: 200 }, player, map);
    for (let frame = 0; frame < 200 && !enemy.isTelegraphing; frame += 1) enemy.update();
    expect(enemy.isTelegraphing).toBe(true);
    enemy.hit(1, player.position);
    expect(enemy.isTelegraphing).toBe(false);
  });

  it("ne naît jamais encastrée dans le décor", () => {
    const map = new TileMap(walledMap(), new TileSet());
    const player = makePlayer(map);
    const enemy = new Enemy(
      { id: "e", zone: "z", type: "wolf", x: WALL_X + 4, y: 160 }, player, map);
    const tileX = Math.floor((enemy.position.x + enemy.hitbox.x) / 16);
    const tileY = Math.floor((enemy.position.y + enemy.hitbox.y) / 16);
    expect(map.isSolid(tileX, tileY)).toBe(false);
  });
});
