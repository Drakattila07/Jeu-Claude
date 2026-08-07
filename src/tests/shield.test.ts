import { describe, expect, it } from "vitest";
import { Player, PARRY_WINDOW, BLOCK_COST, MAX_STAMINA } from "../entities/Player";
import { Input } from "../core/Input";
import { TileMap } from "../world/TileMap";
import { TileSet, TILE } from "../world/TileSet";
import type { TiledMapData } from "../world/TileMap";

/** Salle vide de 20×20 : le bouclier se juge sans décor autour. */
function emptyMap(): TileMap {
  const size = 20;
  const layer = (tile: number): number[] => new Array<number>(size * size).fill(tile);
  const data: TiledMapData = {
    width: size, height: size, tilewidth: 16, tileheight: 16,
    layers: [
      { name: "ground", width: size, height: size, data: layer(TILE.grass) },
      { name: "terrain", width: size, height: size, data: layer(TILE.empty) },
      { name: "decor_below", width: size, height: size, data: layer(TILE.empty) },
      { name: "decor_above", width: size, height: size, data: layer(TILE.empty) },
    ],
  };
  return new TileMap(data, new TileSet());
}

/** Entrée simulée : on décide image par image si la garde est tenue. */
class FakeInput extends Input {
  guard = false;
  constructor() {
    // On ne branche aucun écouteur : le clavier n'existe pas dans un test.
    super({ addEventListener: () => {} } as unknown as Window);
  }
  override isDown(action: string): boolean { return action === "Guard" && this.guard; }
  override wasPressed(): boolean { return false; }
}

function armedPlayer(): { player: Player; input: FakeInput } {
  const input = new FakeInput();
  const player = new Player(input, emptyMap());
  player.hasShield = true;
  return { player, input };
}

/**
 * Le vecteur passé à `block` est celui du *recul* : il pointe de l'agresseur
 * vers le personnage. Un coup de face repousse donc vers l'arrière.
 *
 * Le personnage regarde vers le bas par défaut : un coup de face vient d'en
 * bas et le repousse vers le haut.
 */
const FROM_FRONT = { x: 0, y: -1 };
const FROM_BEHIND = { x: 0, y: 1 };

describe("bouclier", () => {
  it("ne se lève pas sans rondache", () => {
    const { player, input } = armedPlayer();
    player.hasShield = false;
    input.guard = true;
    player.update();
    expect(player.isGuarding).toBe(false);
    expect(player.block(FROM_FRONT)).toBeNull();
  });

  it("pare parfaitement au premier instant", () => {
    const { player, input } = armedPlayer();
    input.guard = true;
    player.update();
    expect(player.inParryWindow).toBe(true);
    expect(player.block(FROM_FRONT)).toBe("parfait");
    expect(player.canRiposte).toBe(true);
    // Une parade parfaite ne coûte pas d'endurance : c'est sa récompense.
    expect(player.stamina).toBe(MAX_STAMINA);
  });

  it("retombe sur un blocage ordinaire passé la fenêtre", () => {
    const { player, input } = armedPlayer();
    input.guard = true;
    for (let frame = 0; frame <= PARRY_WINDOW; frame += 1) player.update();
    expect(player.inParryWindow).toBe(false);
    expect(player.block(FROM_FRONT)).toBe("bloqué");
    expect(player.canRiposte).toBe(false);
    expect(player.stamina).toBe(MAX_STAMINA - BLOCK_COST);
  });

  it("ne pare pas un coup venu du dos", () => {
    // Sinon la garde protégerait de tout, et se placer ne servirait à rien.
    const { player, input } = armedPlayer();
    input.guard = true;
    player.update();
    expect(player.block(FROM_BEHIND)).toBeNull();
  });

  it("cède quand l'endurance est à sec", () => {
    const { player, input } = armedPlayer();
    input.guard = true;
    for (let frame = 0; frame <= PARRY_WINDOW; frame += 1) player.update();
    player.stamina = 1;
    expect(player.block(FROM_FRONT)).toBeNull();
  });

  it("se baisse dès qu'on lâche la touche", () => {
    const { player, input } = armedPlayer();
    input.guard = true;
    player.update();
    expect(player.isGuarding).toBe(true);
    input.guard = false;
    player.update();
    expect(player.isGuarding).toBe(false);
    expect(player.block(FROM_FRONT)).toBeNull();
  });

  it("rouvre une fenêtre de parade à chaque levée", () => {
    // Garder le bouton enfoncé ne doit pas donner une parade permanente.
    const { player, input } = armedPlayer();
    input.guard = true;
    for (let frame = 0; frame <= PARRY_WINDOW + 5; frame += 1) player.update();
    expect(player.inParryWindow).toBe(false);
    input.guard = false;
    player.update();
    input.guard = true;
    player.update();
    expect(player.inParryWindow).toBe(true);
  });

  it("ralentit la marche tant qu'il est levé", () => {
    const { player, input } = armedPlayer();
    input.guard = true;
    player.update();
    expect(player.isGuarding).toBe(true);
  });

  it("l'ouverture de riposte finit par se refermer", () => {
    const { player, input } = armedPlayer();
    input.guard = true;
    player.update();
    player.block(FROM_FRONT);
    expect(player.canRiposte).toBe(true);
    input.guard = false;
    for (let frame = 0; frame < 60; frame += 1) player.update();
    expect(player.canRiposte).toBe(false);
  });
});

describe("monture", () => {
  it("va plus vite à terre, jamais sur l'eau", () => {
    const { player } = armedPlayer();
    const onFoot = player.speed;
    player.mounted = true;
    expect(player.speed).toBeGreaterThan(onFoot);
    player.setSailing(true);
    expect(player.speed).toBe(onFoot);
  });
});
