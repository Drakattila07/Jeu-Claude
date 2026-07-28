import { PALETTE } from "../data/palette";
import { TILE_SIZE } from "../core/Renderer";

export type TileKind =
  | "empty" | "grass" | "grass_alt" | "path" | "stone" | "water"
  | "tree_crown" | "tree_trunk" | "roof" | "wall" | "well"
  | "flowers" | "fence" | "bush" | "door" | "sign" | "stairs"
  | "forest_floor" | "mud" | "cliff" | "reeds" | "rubble" | "lilypad"
  | "crop" | "pine_crown" | "stump" | "mushroom" | "deep_water"
  | "bridge" | "moss_stone" | "wildflowers" | "cracked_path"
  | "wood_floor" | "interior_wall" | "rug" | "bed" | "bookshelf"
  | "table" | "fireplace" | "chair" | "window" | "interior_block";

export interface TileProperties {
  readonly kind: TileKind;
  readonly solid?: boolean;
  readonly water?: boolean;
  readonly slow?: number;
  readonly cuttable?: boolean;
  readonly ledge?: boolean;
  readonly burnable?: boolean;
}

const TILES: readonly TileProperties[] = [
  { kind: "empty" }, { kind: "grass" }, { kind: "grass_alt" },
  { kind: "path" }, { kind: "stone", solid: true }, { kind: "water", water: true, slow: 0.6 },
  { kind: "tree_crown", solid: true, burnable: true }, { kind: "tree_trunk", solid: true, burnable: true },
  { kind: "roof", solid: true, burnable: true }, { kind: "wall", solid: true, burnable: true }, { kind: "well", solid: true },
  { kind: "flowers" }, { kind: "fence", solid: true, burnable: true },
  { kind: "bush", solid: true, cuttable: true, burnable: true },
  { kind: "door", solid: true, burnable: true }, { kind: "sign", solid: true, burnable: true },
  { kind: "stairs", ledge: true },
  { kind: "forest_floor" }, { kind: "mud", slow: 0.82 }, { kind: "cliff", solid: true },
  { kind: "reeds", solid: true }, { kind: "rubble", solid: true }, { kind: "lilypad", water: true, slow: 0.6 },
  { kind: "crop", burnable: true }, { kind: "pine_crown", solid: true, burnable: true },
  { kind: "stump", solid: true, burnable: true },
  { kind: "mushroom" }, { kind: "deep_water", water: true, slow: 0.5 },
  { kind: "bridge", burnable: true },
  { kind: "moss_stone", solid: true }, { kind: "wildflowers" }, { kind: "cracked_path" },
  { kind: "wood_floor", burnable: true }, { kind: "interior_wall", solid: true, burnable: true },
  { kind: "rug", burnable: true },
  { kind: "bed", solid: true, burnable: true }, { kind: "bookshelf", solid: true, burnable: true },
  { kind: "table", solid: true, burnable: true }, { kind: "fireplace", solid: true },
  { kind: "chair", solid: true, burnable: true }, { kind: "window", solid: true, burnable: true },
  { kind: "interior_block", solid: true },
];

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number,
  width: number, height: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, width = 14): void {
  ctx.globalAlpha = 0.28;
  fill(ctx, PALETTE.ink, x + Math.floor((16 - width) / 2), y + 13, width, 3);
  ctx.globalAlpha = 1;
}

export class TileSet {
  properties(id: number): TileProperties {
    return TILES[id] ?? TILES[0]!;
  }

  draw(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, frame = 0): void {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const kind = this.properties(id).kind;
    const variant = (x * 17 + y * 31) & 3;
    if (kind === "empty") return;
    ctx.save();

    switch (kind) {
      case "grass":
      case "grass_alt": {
        const base = kind === "grass" ? PALETTE.grass : PALETTE.grassDark;
        const light = kind === "grass" ? PALETTE.grassLight : PALETTE.leaf;
        fill(ctx, base, px, py, 16, 16);
        fill(ctx, kind === "grass" ? PALETTE.leafLight : PALETTE.leafDark,
          px + 2 + variant * 3, py + 3 + ((x + y) & 5), 1, 2);
        fill(ctx, light, px + 11 - variant, py + 11, 1, 2);
        if ((x + y) % 5 === 0) {
          fill(ctx, PALETTE.grassDark, px + 5, py + 8, 1, 1);
          fill(ctx, light, px + 6, py + 7, 1, 2);
        }
        break;
      }
      case "forest_floor":
        fill(ctx, PALETTE.pine, px, py, 16, 16);
        fill(ctx, PALETTE.pineDark, px + 1, py + 3 + variant * 2, 4, 1);
        fill(ctx, PALETTE.leafDark, px + 10, py + 2 + variant, 2, 2);
        fill(ctx, PALETTE.wood, px + 6, py + 12, 3, 1);
        fill(ctx, PALETTE.leaf, px + 13, py + 9, 1, 3);
        break;
      case "mud":
        fill(ctx, PALETTE.marsh, px, py, 16, 16);
        fill(ctx, PALETTE.pineDark, px + 2, py + 4, 6, 2);
        fill(ctx, PALETTE.soil, px + 9, py + 11, 5, 2);
        fill(ctx, PALETTE.water, px + 4 + variant, py + 10, 3, 1);
        break;
      case "path":
      case "cracked_path":
        fill(ctx, kind === "path" ? PALETTE.sand : PALETTE.stone, px, py, 16, 16);
        fill(ctx, kind === "path" ? PALETTE.sandDark : PALETTE.stoneDark, px + 2, py + 3, 4, 2);
        fill(ctx, kind === "path" ? PALETTE.sandLight : PALETTE.stoneLight, px + 9, py + 9, 5, 2);
        fill(ctx, kind === "path" ? PALETTE.soil : PALETTE.ink, px + 7, py + 13, 2, 1);
        if (kind === "cracked_path") {
          fill(ctx, PALETTE.stoneDark, px + 6, py + 5, 1, 4);
          fill(ctx, PALETTE.stoneDark, px + 7, py + 8, 3, 1);
        }
        break;
      case "stone":
      case "moss_stone":
        shadow(ctx, px, py);
        fill(ctx, PALETTE.stoneDark, px + 1, py + 4, 14, 10);
        fill(ctx, PALETTE.stone, px + 2, py + 2, 12, 10);
        fill(ctx, PALETTE.stoneLight, px + 4, py + 3, 6, 2);
        fill(ctx, PALETTE.ink, px + 11, py + 9, 3, 2);
        if (kind === "moss_stone") {
          fill(ctx, PALETTE.leafDark, px + 2, py + 8, 5, 4);
          fill(ctx, PALETTE.leaf, px + 4, py + 7, 4, 2);
        }
        break;
      case "cliff":
        fill(ctx, PALETTE.stoneDark, px, py, 16, 16);
        fill(ctx, PALETTE.stone, px + 1, py, 14, 12);
        fill(ctx, PALETTE.stoneLight, px + 2, py + 1, 12, 3);
        fill(ctx, PALETTE.ink, px, py + 13, 16, 3);
        fill(ctx, PALETTE.stoneDark, px + 4, py + 6, 2, 5);
        fill(ctx, PALETTE.stoneDark, px + 10, py + 4, 3, 2);
        break;
      case "rubble":
        shadow(ctx, px, py);
        fill(ctx, PALETTE.stoneDark, px + 1, py + 9, 14, 5);
        fill(ctx, PALETTE.stone, px + 3, py + 4, 6, 7);
        fill(ctx, PALETTE.stoneLight, px + 5, py + 3, 4, 2);
        fill(ctx, PALETTE.stone, px + 10, py + 7, 4, 5);
        fill(ctx, PALETTE.ink, px + 2, py + 12, 4, 2);
        break;
      case "water":
      case "deep_water": {
        const offset = Math.floor(frame / 18 + x * 2 + y) % 8;
        fill(ctx, kind === "water" ? PALETTE.water : PALETTE.deepWater, px, py, 16, 16);
        fill(ctx, kind === "water" ? PALETTE.waterLight : PALETTE.water, px + offset - 4, py + 4, 8, 1);
        fill(ctx, kind === "water" ? PALETTE.deepWater : PALETTE.pineDark, px + 9 - offset / 2, py + 11, 7, 1);
        fill(ctx, PALETTE.waterLight, px + ((offset + 8) % 11), py + 14, 3, 1);
        break;
      }
      case "lilypad":
        fill(ctx, PALETTE.water, px, py, 16, 16);
        fill(ctx, PALETTE.waterLight, px + ((frame / 20 + x) % 8), py + 3, 6, 1);
        fill(ctx, PALETTE.leafDark, px + 3, py + 7, 10, 6);
        fill(ctx, PALETTE.leaf, px + 4, py + 6, 8, 6);
        fill(ctx, PALETTE.water, px + 8, py + 6, 2, 4);
        fill(ctx, PALETTE.white, px + 5, py + 5, 2, 2);
        fill(ctx, PALETTE.rose, px + 6, py + 6, 1, 1);
        break;
      case "bridge":
        fill(ctx, PALETTE.deepWater, px, py, 16, 16);
        fill(ctx, PALETTE.woodDark, px, py + 1, 16, 14);
        for (let plank = 1; plank < 16; plank += 5) {
          fill(ctx, PALETTE.wood, px + plank, py + 2, 4, 12);
          fill(ctx, PALETTE.woodLight, px + plank, py + 3, 3, 1);
        }
        fill(ctx, PALETTE.ink, px, py + 1, 16, 2);
        fill(ctx, PALETTE.ink, px, py + 13, 16, 2);
        break;
      case "tree_crown":
      case "pine_crown":
        shadow(ctx, px, py, 16);
        fill(ctx, PALETTE.pineDark, px, py + 6, 16, 10);
        if (kind === "tree_crown") {
          fill(ctx, PALETTE.leafDark, px + 1, py + 4, 14, 9);
          fill(ctx, PALETTE.leaf, px + 3, py + 1, 10, 10);
          fill(ctx, PALETTE.leafLight, px + 5, py + 2, 5, 3);
          fill(ctx, PALETTE.pineDark, px + 2, py + 11, 4, 3);
          fill(ctx, PALETTE.leafDark, px + 11, py + 8, 4, 5);
        } else {
          fill(ctx, PALETTE.leafDark, px + 6, py, 4, 3);
          fill(ctx, PALETTE.leafDark, px + 4, py + 3, 8, 4);
          fill(ctx, PALETTE.leaf, px + 2, py + 7, 12, 4);
          fill(ctx, PALETTE.pine, px, py + 11, 16, 3);
          fill(ctx, PALETTE.leafLight, px + 7, py + 3, 2, 5);
        }
        break;
      case "tree_trunk":
        fill(ctx, PALETTE.leafDark, px, py, 16, 5);
        shadow(ctx, px, py, 10);
        fill(ctx, PALETTE.woodDark, px + 4, py + 3, 9, 13);
        fill(ctx, PALETTE.wood, px + 6, py + 4, 4, 10);
        fill(ctx, PALETTE.woodLight, px + 7, py + 5, 2, 5);
        fill(ctx, PALETTE.ink, px + 10, py + 7, 2, 5);
        break;
      case "stump":
        shadow(ctx, px, py, 14);
        fill(ctx, PALETTE.woodDark, px + 2, py + 5, 12, 10);
        fill(ctx, PALETTE.wood, px + 3, py + 3, 10, 8);
        fill(ctx, PALETTE.woodLight, px + 5, py + 4, 6, 4);
        fill(ctx, PALETTE.woodDark, px + 7, py + 5, 3, 2);
        fill(ctx, PALETTE.leafDark, px + 1, py + 12, 5, 3);
        break;
      case "roof":
        fill(ctx, PALETTE.roofDark, px, py, 16, 16);
        fill(ctx, PALETTE.ink, px, py + 14, 16, 2);
        for (let row = 1; row < 14; row += 5) {
          fill(ctx, PALETTE.roof, px + 1, py + row, 14, 4);
          fill(ctx, PALETTE.rose, px + 2 + ((row / 5) % 2) * 4, py + row, 5, 1);
          fill(ctx, PALETTE.roofDark, px + 8, py + row + 1, 1, 3);
        }
        break;
      case "wall":
        fill(ctx, PALETTE.stoneDark, px, py, 16, 16);
        fill(ctx, PALETTE.sandLight, px + 1, py, 14, 13);
        fill(ctx, PALETTE.cream, px + 2, py + 1, 5, 2);
        fill(ctx, PALETTE.sandDark, px, py + 12, 16, 4);
        fill(ctx, PALETTE.soil, px + 7, py + 5, 2, 1);
        fill(ctx, PALETTE.sandDark, px + 11, py + 8, 3, 2);
        break;
      case "well":
        shadow(ctx, px, py, 16);
        fill(ctx, PALETTE.woodDark, px + 1, py, 2, 10);
        fill(ctx, PALETTE.woodDark, px + 13, py, 2, 10);
        fill(ctx, PALETTE.roofDark, px + 1, py, 14, 3);
        fill(ctx, PALETTE.roof, px + 3, py, 10, 2);
        fill(ctx, PALETTE.stoneDark, px + 1, py + 7, 14, 8);
        fill(ctx, PALETTE.stone, px + 2, py + 5, 12, 8);
        fill(ctx, PALETTE.ink, px + 4, py + 7, 8, 4);
        fill(ctx, PALETTE.waterLight, px + 5, py + 8, 5, 1);
        fill(ctx, PALETTE.stoneLight, px + 3, py + 5, 9, 2);
        break;
      case "flowers":
      case "wildflowers":
        fill(ctx, PALETTE.leafDark, px + 4, py + 7, 1, 7);
        fill(ctx, PALETTE.leaf, px + 11, py + 5, 1, 8);
        fill(ctx, kind === "flowers" ? PALETTE.white : PALETTE.rose, px + 2, py + 5, 5, 4);
        fill(ctx, kind === "flowers" ? PALETTE.yellow : PALETTE.purple, px + 9, py + 3, 5, 4);
        fill(ctx, PALETTE.yellow, px + 4, py + 6, 1, 1);
        fill(ctx, PALETTE.cream, px + 11, py + 4, 1, 1);
        break;
      case "mushroom":
        fill(ctx, PALETTE.sandLight, px + 7, py + 8, 3, 6);
        fill(ctx, PALETTE.ink, px + 6, py + 13, 5, 2);
        fill(ctx, PALETTE.roofDark, px + 3, py + 4, 11, 6);
        fill(ctx, PALETTE.rose, px + 5, py + 3, 7, 4);
        fill(ctx, PALETTE.cream, px + 6, py + 4, 2, 2);
        break;
      case "crop":
        fill(ctx, PALETTE.soil, px, py, 16, 16);
        fill(ctx, PALETTE.sandDark, px, py + 13, 16, 2);
        for (let stem = 2; stem < 16; stem += 5) {
          fill(ctx, PALETTE.leafDark, px + stem, py + 4, 2, 10);
          fill(ctx, PALETTE.grassLight, px + stem - 1, py + 3 + ((stem + y) % 3), 2, 4);
          fill(ctx, PALETTE.yellow, px + stem + 1, py + 5, 2, 3);
        }
        break;
      case "fence":
        shadow(ctx, px, py, 16);
        fill(ctx, PALETTE.woodDark, px, py + 6, 16, 4);
        fill(ctx, PALETTE.wood, px, py + 6, 16, 2);
        fill(ctx, PALETTE.woodDark, px + 2, py + 2, 4, 14);
        fill(ctx, PALETTE.woodLight, px + 3, py + 3, 2, 9);
        fill(ctx, PALETTE.woodDark, px + 11, py + 2, 4, 14);
        fill(ctx, PALETTE.woodLight, px + 12, py + 3, 2, 9);
        break;
      case "bush":
      case "reeds":
        shadow(ctx, px, py);
        if (kind === "bush") {
          fill(ctx, PALETTE.leafDark, px + 1, py + 6, 14, 9);
          fill(ctx, PALETTE.leaf, px + 2, py + 4, 7, 8);
          fill(ctx, PALETTE.leaf, px + 8, py + 2, 6, 11);
          fill(ctx, PALETTE.leafLight, px + 5, py + 5, 3, 2);
          fill(ctx, PALETTE.pineDark, px + 11, py + 10, 3, 3);
        } else {
          fill(ctx, PALETTE.water, px, py + 11, 16, 5);
          for (let stem = 2; stem < 15; stem += 4) {
            const height = 7 + ((stem + x) % 5);
            fill(ctx, PALETTE.leafDark, px + stem, py + 15 - height, 2, height);
            fill(ctx, PALETTE.leafLight, px + stem + 1, py + 16 - height, 1, 4);
            fill(ctx, PALETTE.soil, px + stem - 1, py + 4, 3, 2);
          }
        }
        break;
      case "door":
        fill(ctx, PALETTE.woodDark, px + 1, py, 14, 16);
        fill(ctx, PALETTE.wood, px + 3, py + 2, 10, 14);
        fill(ctx, PALETTE.woodLight, px + 4, py + 3, 2, 11);
        fill(ctx, PALETTE.ink, px + 11, py + 8, 2, 2);
        fill(ctx, PALETTE.yellow, px + 11, py + 8, 1, 1);
        break;
      case "sign":
        shadow(ctx, px, py);
        fill(ctx, PALETTE.woodDark, px + 7, py + 8, 3, 8);
        fill(ctx, PALETTE.woodDark, px, py + 2, 16, 9);
        fill(ctx, PALETTE.woodLight, px + 1, py + 3, 14, 6);
        fill(ctx, PALETTE.wood, px + 3, py + 5, 8, 1);
        fill(ctx, PALETTE.cream, px + 12, py + 4, 1, 3);
        break;
      case "stairs":
        fill(ctx, PALETTE.stoneDark, px, py, 16, 16);
        for (let step = 1; step < 16; step += 4) {
          fill(ctx, PALETTE.stone, px, py + step, 16, 3);
          fill(ctx, PALETTE.stoneLight, px, py + step, 16, 1);
        }
        break;
      case "wood_floor":
        fill(ctx, PALETTE.wood, px, py, 16, 16);
        fill(ctx, PALETTE.woodLight, px, py + 1, 16, 2);
        fill(ctx, PALETTE.woodDark, px, py + 14, 16, 2);
        fill(ctx, PALETTE.woodDark, px + ((x * 7 + y * 3) % 12), py + 7, 4, 1);
        fill(ctx, PALETTE.soil, px + 15, py, 1, 16);
        break;
      case "interior_wall":
        fill(ctx, PALETTE.woodDark, px, py, 16, 16);
        fill(ctx, PALETTE.sandLight, px + 1, py + 1, 14, 12);
        fill(ctx, PALETTE.cream, px + 2, py + 2, 12, 2);
        fill(ctx, PALETTE.roofDark, px, py + 12, 16, 4);
        fill(ctx, PALETTE.roof, px + 1, py + 12, 14, 2);
        if ((x + y) % 3 === 0) fill(ctx, PALETTE.sandDark, px + 5, py + 6, 2, 2);
        break;
      case "rug":
        fill(ctx, PALETTE.roofDark, px, py, 16, 16);
        fill(ctx, PALETTE.roof, px + 1, py + 1, 14, 14);
        fill(ctx, PALETTE.yellow, px + 3, py + 3, 10, 2);
        fill(ctx, PALETTE.cream, px + 5, py + 6, 6, 5);
        fill(ctx, PALETTE.purple, px + 7, py + 7, 2, 3);
        fill(ctx, PALETTE.yellow, px + 3, py + 12, 10, 2);
        break;
      case "bed":
        shadow(ctx, px, py, 16);
        fill(ctx, PALETTE.woodDark, px + 1, py + 2, 14, 14);
        fill(ctx, PALETTE.cream, px + 2, py + 2, 12, 5);
        fill(ctx, PALETTE.white, px + 3, py + 3, 5, 3);
        fill(ctx, PALETTE.roofDark, px + 2, py + 7, 12, 8);
        fill(ctx, PALETTE.roof, px + 3, py + 8, 10, 5);
        fill(ctx, PALETTE.yellow, px + 4, py + 9, 2, 2);
        break;
      case "bookshelf":
        fill(ctx, PALETTE.woodDark, px, py, 16, 16);
        fill(ctx, PALETTE.wood, px + 2, py + 1, 12, 14);
        for (let shelf = 4; shelf < 15; shelf += 5) {
          fill(ctx, PALETTE.woodLight, px + 2, py + shelf, 12, 2);
        }
        fill(ctx, PALETTE.roof, px + 3, py + 2, 2, 3);
        fill(ctx, PALETTE.leafDark, px + 6, py + 1, 2, 4);
        fill(ctx, PALETTE.purple, px + 9, py + 2, 3, 3);
        fill(ctx, PALETTE.water, px + 3, py + 7, 3, 3);
        fill(ctx, PALETTE.yellow, px + 7, py + 6, 2, 4);
        fill(ctx, PALETTE.cream, px + 10, py + 7, 2, 3);
        break;
      case "table":
        shadow(ctx, px, py, 16);
        fill(ctx, PALETTE.woodDark, px + 1, py + 6, 14, 8);
        fill(ctx, PALETTE.woodLight, px + 2, py + 5, 12, 5);
        fill(ctx, PALETTE.wood, px + 3, py + 7, 10, 2);
        fill(ctx, PALETTE.cream, px + 6, py + 3, 5, 4);
        fill(ctx, PALETTE.yellow, px + 7, py + 3, 3, 2);
        fill(ctx, PALETTE.woodDark, px + 3, py + 12, 3, 4);
        fill(ctx, PALETTE.woodDark, px + 11, py + 12, 3, 4);
        break;
      case "fireplace": {
        const flame = Math.floor(frame / 10) % 2;
        fill(ctx, PALETTE.stoneDark, px, py, 16, 16);
        fill(ctx, PALETTE.stone, px + 1, py + 1, 14, 15);
        fill(ctx, PALETTE.stoneLight, px + 2, py + 2, 12, 3);
        fill(ctx, PALETTE.ink, px + 3, py + 6, 10, 10);
        fill(ctx, PALETTE.woodDark, px + 4, py + 13, 8, 2);
        fill(ctx, PALETTE.red, px + 5 + flame, py + 8, 6 - flame, 6);
        fill(ctx, PALETTE.yellow, px + 7 - flame, py + 9, 3, 4);
        fill(ctx, PALETTE.cream, px + 8, py + 10, 1, 2);
        break;
      }
      case "chair":
        shadow(ctx, px, py, 12);
        fill(ctx, PALETTE.woodDark, px + 4, py + 2, 8, 14);
        fill(ctx, PALETTE.woodLight, px + 5, py + 3, 6, 6);
        fill(ctx, PALETTE.wood, px + 3, py + 9, 10, 4);
        break;
      case "window":
        fill(ctx, PALETTE.woodDark, px, py, 16, 16);
        fill(ctx, PALETTE.water, px + 2, py + 2, 12, 10);
        fill(ctx, PALETTE.waterLight, px + 3, py + 3, 5, 4);
        fill(ctx, PALETTE.cream, px + 3, py + 3, 3, 2);
        fill(ctx, PALETTE.woodLight, px + 7, py + 2, 2, 10);
        fill(ctx, PALETTE.woodLight, px + 2, py + 7, 12, 2);
        fill(ctx, PALETTE.roof, px + 1, py + 12, 14, 3);
        break;
      case "interior_block":
        break;
    }
    ctx.restore();
  }
}
