import { describe, expect, it } from "vitest";
import { Npc, npcActivityFor } from "../entities/Npc";
import { routineFor } from "../data/npcs/routines";
import { NPCS } from "../data/npcs/core";
import { Clock } from "../core/Clock";
import { TileMap, type LayerName, type TiledMapData } from "../world/TileMap";
import { TileSet } from "../world/TileSet";

function openMap(): TileMap {
  const names: readonly LayerName[] = ["ground", "terrain", "decor_below", "decor_above"];
  const data: TiledMapData = {
    width: 16, height: 14, tilewidth: 16, tileheight: 16,
    layers: names.map((name) => ({
      name, width: 16, height: 14,
      data: new Array<number>(16 * 14).fill(name === "ground" ? 1 : 0),
    })),
  };
  return new TileMap(data, new TileSet());
}

describe("routines visuelles des PNJ", () => {
  it("attribue un vrai métier et plusieurs étapes à chaque habitant", () => {
    expect(npcActivityFor("nessa", 800)).toBe("fish");
    expect(npcActivityFor("bram", 300)).toBe("forge");
    expect(npcActivityFor("mira", 300)).toBe("gather");
    expect(npcActivityFor("doyen_orme", 800)).toBe("sweep");
    expect(npcActivityFor("fermier_a", 400)).toBe("farm");
  });

  it("fait alterner les jumeaux entre déplacements, ballon et repos", () => {
    expect(npcActivityFor("ryn", 0)).toBe("walk");
    expect(npcActivityFor("ryn", 300)).toBe("ball");
    expect(npcActivityFor("tam", 700)).toBe("rest");
    expect(routineFor("ryn")).toHaveLength(4);
    expect(routineFor("tam")).toHaveLength(4);
  });

  it("fait parcourir plusieurs cases au pêcheur avant son poste", () => {
    const nessa = NPCS.find((npc) => npc.id === "nessa")!;
    const npc = new Npc(nessa, openMap(), new Clock());
    const start = { ...npc.position };
    for (let frame = 0; frame < 100; frame += 1) npc.update();
    expect(Math.hypot(npc.position.x - start.x, npc.position.y - start.y)).toBeGreaterThan(30);
  });

  it("ajoute un garde qui devient hostile après une attaque", () => {
    const guardData = NPCS.find((npc) => npc.id === "garde_ronan")!;
    const guard = new Npc(guardData, openMap(), new Clock());
    expect(guard.isGuard).toBe(true);
    expect(guard.hostile).toBe(false);
    guard.provoke({ x: 120, y: 120 });
    expect(guard.hostile).toBe(true);
    expect(guard.activity).toBe("guard");
  });
});
