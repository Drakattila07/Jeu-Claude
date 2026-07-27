import { PALETTE } from "../data/palette";
import { TILE_SIZE } from "../core/Renderer";

export type TileKind =
  | "empty" | "grass" | "grass_alt" | "path" | "stone" | "water"
  | "tree_crown" | "tree_trunk" | "roof" | "wall" | "well"
  | "flowers" | "fence" | "bush" | "door" | "sign" | "stairs";

export interface TileProperties {
  readonly kind: TileKind;
  readonly solid?: boolean;
  readonly water?: boolean;
  readonly slow?: number;
  readonly cuttable?: boolean;
  readonly ledge?: boolean;
}

const TILES: readonly TileProperties[] = [
  { kind: "empty" }, { kind: "grass" }, { kind: "grass_alt" },
  { kind: "path" }, { kind: "stone", solid: true }, { kind: "water", water: true, slow: 0.6 },
  { kind: "tree_crown", solid: true }, { kind: "tree_trunk", solid: true },
  { kind: "roof", solid: true }, { kind: "wall", solid: true }, { kind: "well", solid: true },
  { kind: "flowers" }, { kind: "fence", solid: true }, { kind: "bush", solid: true, cuttable: true },
  { kind: "door" }, { kind: "sign", solid: true }, { kind: "stairs", ledge: true }
];

export class TileSet {
  properties(id: number): TileProperties {
    return TILES[id] ?? TILES[0]!;
  }

  draw(ctx: CanvasRenderingContext2D, id: number, x: number, y: number): void {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const kind = this.properties(id).kind;
    if (kind === "empty") return;
    ctx.save();
    switch (kind) {
      case "grass":
      case "grass_alt":
        ctx.fillStyle = kind === "grass" ? PALETTE.grass : PALETTE.grassDark;
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = kind === "grass" ? PALETTE.grassLight : PALETTE.leaf;
        ctx.fillRect(px + ((x * 5 + y * 3) % 13), py + ((x * 7 + y * 5) % 13), 1, 2);
        break;
      case "path":
        ctx.fillStyle = PALETTE.sand;
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = PALETTE.sandDark;
        ctx.fillRect(px + 3, py + 4, 2, 1);
        ctx.fillRect(px + 11, py + 11, 1, 2);
        ctx.fillStyle = PALETTE.sandLight;
        ctx.fillRect(px + 7, py + 7, 1, 1);
        break;
      case "stone":
        ctx.fillStyle = PALETTE.stoneDark;
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = PALETTE.stone;
        ctx.fillRect(px + 1, py + 1, 14, 12);
        ctx.fillStyle = PALETTE.stoneLight;
        ctx.fillRect(px + 3, py + 2, 7, 2);
        break;
      case "water":
        ctx.fillStyle = PALETTE.water;
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = PALETTE.waterLight;
        ctx.fillRect(px + ((x + y) % 4), py + 5, 7, 1);
        ctx.fillRect(px + 8, py + 12, 5, 1);
        break;
      case "tree_crown":
        ctx.fillStyle = PALETTE.pineDark;
        ctx.fillRect(px, py + 3, 16, 13);
        ctx.fillStyle = PALETTE.leafDark;
        ctx.fillRect(px + 2, py + 1, 12, 13);
        ctx.fillStyle = PALETTE.leaf;
        ctx.fillRect(px + 4, py + 2, 7, 7);
        ctx.fillStyle = PALETTE.leafLight;
        ctx.fillRect(px + 5, py + 3, 3, 2);
        break;
      case "tree_trunk":
        ctx.fillStyle = PALETTE.leafDark;
        ctx.fillRect(px, py, 16, 7);
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(px + 5, py + 5, 7, 11);
        ctx.fillStyle = PALETTE.wood;
        ctx.fillRect(px + 7, py + 5, 2, 9);
        break;
      case "roof":
        ctx.fillStyle = PALETTE.roofDark;
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = PALETTE.roof;
        ctx.fillRect(px + 1, py + 2, 14, 4);
        ctx.fillRect(px + 1, py + 9, 14, 4);
        ctx.fillStyle = PALETTE.rose;
        ctx.fillRect(px + 3, py + 2, 4, 2);
        break;
      case "wall":
        ctx.fillStyle = PALETTE.stoneDark;
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = PALETTE.sandLight;
        ctx.fillRect(px + 1, py, 14, 13);
        ctx.fillStyle = PALETTE.sandDark;
        ctx.fillRect(px, py + 12, 16, 4);
        ctx.fillRect(px + 7, py, 1, 13);
        break;
      case "well":
        ctx.fillStyle = PALETTE.stoneDark;
        ctx.fillRect(px + 1, py + 4, 14, 10);
        ctx.fillStyle = PALETTE.stoneLight;
        ctx.fillRect(px + 3, py + 2, 10, 3);
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(px + 4, py + 6, 8, 5);
        ctx.fillStyle = PALETTE.wood;
        ctx.fillRect(px + 1, py, 2, 8);
        ctx.fillRect(px + 13, py, 2, 8);
        break;
      case "flowers":
        ctx.fillStyle = PALETTE.white;
        ctx.fillRect(px + 4, py + 7, 2, 2);
        ctx.fillRect(px + 11, py + 3, 2, 2);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(px + 5, py + 8, 1, 1);
        break;
      case "fence":
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(px, py + 6, 16, 3);
        ctx.fillStyle = PALETTE.woodLight;
        ctx.fillRect(px + 3, py + 2, 3, 13);
        ctx.fillRect(px + 11, py + 2, 3, 13);
        break;
      case "bush":
        ctx.fillStyle = PALETTE.leafDark;
        ctx.fillRect(px + 1, py + 5, 14, 10);
        ctx.fillStyle = PALETTE.leaf;
        ctx.fillRect(px + 3, py + 3, 5, 8);
        ctx.fillRect(px + 8, py + 2, 5, 9);
        ctx.fillStyle = PALETTE.leafLight;
        ctx.fillRect(px + 5, py + 4, 3, 2);
        break;
      case "door":
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(px + 2, py, 12, 16);
        ctx.fillStyle = PALETTE.wood;
        ctx.fillRect(px + 4, py + 2, 8, 14);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(px + 10, py + 9, 1, 1);
        break;
      case "sign":
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(px + 7, py + 8, 2, 8);
        ctx.fillStyle = PALETTE.woodLight;
        ctx.fillRect(px + 1, py + 2, 14, 8);
        ctx.fillStyle = PALETTE.wood;
        ctx.fillRect(px + 2, py + 3, 12, 5);
        break;
      case "stairs":
        ctx.fillStyle = PALETTE.stone;
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = PALETTE.stoneLight;
        ctx.fillRect(px, py + 3, 16, 2);
        ctx.fillRect(px, py + 9, 16, 2);
        break;
    }
    ctx.restore();
  }
}
