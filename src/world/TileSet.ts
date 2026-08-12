import { dither, melange } from "../ui/Dither";
import type { Vec2 } from "../entities/Entity";
import { PALETTE } from "../data/palette";
import { TILE_SIZE } from "../core/Renderer";
import type { TileMap } from "./TileMap";

export type TileKind =
  | "empty" | "grass" | "grass_alt" | "path" | "stone" | "water"
  | "tree_crown" | "tree_trunk" | "roof" | "wall" | "well"
  | "flowers" | "fence" | "bush" | "door" | "sign" | "stairs"
  | "forest_floor" | "mud" | "cliff" | "reeds" | "rubble" | "lilypad"
  | "crop" | "pine_crown" | "stump" | "mushroom" | "deep_water"
  | "bridge" | "moss_stone" | "wildflowers" | "cracked_path"
  | "wood_floor" | "interior_wall" | "rug" | "bed" | "bookshelf"
  | "table" | "fireplace" | "chair" | "window" | "interior_block"
  | "scree" | "snow" | "alpine_grass" | "heather" | "boulder" | "gravel"
  | "cobble" | "dry_grass" | "marsh_grass" | "snow_pine" | "crag"
  // Vocabulaire ajouté avec le nouveau générateur : de quoi habiller une zone
  // quatre fois plus grande sans répéter six motifs en boucle.
  | "tall_grass" | "shore_sand" | "flower_patch" | "log" | "fern" | "pebbles"
  | "snowdrift" | "cattail" | "dock" | "barrel" | "crate" | "hedge"
  | "ruin_column" | "dead_tree" | "lantern_post" | "wheat" | "ice"
  | "vines" | "grave" | "banner" | "arch_top" | "canopy" | "cliff_top"
  | "brazier" | "market_stall" | "haystack" | "chimney" | "shrine_stone"
  // Le large et le volcan.
  | "open_sea" | "swell" | "coral" | "bollard" | "net" | "driftwood" | "palm"
  | "lava" | "basalt" | "ash" | "obsidian" | "lighthouse" | "sea_rock"
  | "hull" | "portcullis"
  // Les Racines Creuses : la seule matière du jeu qui n'existe sous aucun
  // biome de surface.
  | "hollow_floor" | "giant_root" | "glow_spore";

export interface TileProperties {
  readonly kind: TileKind;
  readonly solid?: boolean;
  readonly water?: boolean;
  /**
   * Eau trop profonde pour qu'on y marche. On la franchit en barque : c'est
   * elle qui fait de la mer un obstacle plutôt qu'un décor.
   */
  readonly deep?: boolean;
  /** Une coque peut y passer. */
  readonly sailable?: boolean;
  /** Dégâts infligés au contact, en cœurs. */
  readonly harm?: number;
  readonly slow?: number;
  readonly cuttable?: boolean;
  readonly ledge?: boolean;
  readonly burnable?: boolean;
  /** Lumière émise par la tuile : rayon en pixels et teinte. */
  readonly light?: { readonly radius: number; readonly color: string };
}

const TILES: readonly TileProperties[] = [
  /*  0 */ { kind: "empty" },
  /*  1 */ { kind: "grass" },
  /*  2 */ { kind: "grass_alt" },
  /*  3 */ { kind: "path" },
  /*  4 */ { kind: "stone", solid: true },
  /*  5 */ { kind: "water", water: true, slow: 0.6, sailable: true },
  /*  6 */ { kind: "tree_crown", solid: true, burnable: true },
  /*  7 */ { kind: "tree_trunk", solid: true, burnable: true },
  /*  8 */ { kind: "roof", solid: true, burnable: true },
  /*  9 */ { kind: "wall", solid: true, burnable: true },
  /* 10 */ { kind: "well", solid: true },
  /* 11 */ { kind: "flowers" },
  /* 12 */ { kind: "fence", solid: true, burnable: true },
  /* 13 */ { kind: "bush", solid: true, cuttable: true, burnable: true },
  /* 14 */ { kind: "door", solid: true, burnable: true },
  /* 15 */ { kind: "sign", solid: true, burnable: true },
  /* 16 */ { kind: "stairs", ledge: true },
  /* 17 */ { kind: "forest_floor" },
  /* 18 */ { kind: "mud", slow: 0.82 },
  /* 19 */ { kind: "cliff", solid: true },
  /* 20 */ { kind: "reeds", solid: true },
  /* 21 */ { kind: "rubble", solid: true },
  /* 22 */ { kind: "lilypad", water: true, slow: 0.6, sailable: true },
  /* 23 */ { kind: "crop", burnable: true },
  /* 24 */ { kind: "pine_crown", solid: true, burnable: true },
  /* 25 */ { kind: "stump", solid: true, burnable: true },
  /* 26 */ { kind: "mushroom" },
  // On ne marche plus dans l'eau profonde : c'est ce qui donne un sens à la
  // barque, et au lac une véritable rive.
  /* 27 */ { kind: "deep_water", water: true, deep: true, sailable: true },
  /* 28 */ { kind: "bridge", burnable: true },
  /* 29 */ { kind: "moss_stone", solid: true },
  /* 30 */ { kind: "wildflowers" },
  /* 31 */ { kind: "cracked_path" },
  /* 32 */ { kind: "wood_floor", burnable: true },
  /* 33 */ { kind: "interior_wall", solid: true, burnable: true },
  /* 34 */ { kind: "rug", burnable: true },
  /* 35 */ { kind: "bed", solid: true, burnable: true },
  /* 36 */ { kind: "bookshelf", solid: true, burnable: true },
  /* 37 */ { kind: "table", solid: true, burnable: true },
  /* 38 */ { kind: "fireplace", solid: true, light: { radius: 74, color: "#ffb055" } },
  /* 39 */ { kind: "chair", solid: true, burnable: true },
  /* 40 */ { kind: "window", solid: true, burnable: true, light: { radius: 40, color: "#9fd6e6" } },
  /* 41 */ { kind: "interior_block", solid: true },
  /* 42 */ { kind: "scree", slow: 0.88 },
  /* 43 */ { kind: "snow", slow: 0.8 },
  /* 44 */ { kind: "alpine_grass" },
  /* 45 */ { kind: "heather" },
  /* 46 */ { kind: "boulder", solid: true },
  /* 47 */ { kind: "gravel" },
  /* 48 */ { kind: "cobble" },
  /* 49 */ { kind: "dry_grass" },
  /* 50 */ { kind: "marsh_grass", slow: 0.9 },
  /* 51 */ { kind: "snow_pine", solid: true, burnable: true },
  /* 52 */ { kind: "crag", solid: true },
  /* 53 */ { kind: "tall_grass", cuttable: true, burnable: true, slow: 0.92 },
  /* 54 */ { kind: "shore_sand" },
  /* 55 */ { kind: "flower_patch" },
  /* 56 */ { kind: "log", solid: true, burnable: true },
  /* 57 */ { kind: "fern" },
  /* 58 */ { kind: "pebbles" },
  /* 59 */ { kind: "snowdrift", slow: 0.72 },
  /* 60 */ { kind: "cattail", slow: 0.85 },
  /* 61 */ { kind: "dock", burnable: true },
  /* 62 */ { kind: "barrel", solid: true, burnable: true },
  /* 63 */ { kind: "crate", solid: true, burnable: true },
  /* 64 */ { kind: "hedge", solid: true, cuttable: true, burnable: true },
  /* 65 */ { kind: "ruin_column", solid: true },
  /* 66 */ { kind: "dead_tree", solid: true, burnable: true },
  /* 67 */ { kind: "lantern_post", solid: true, light: { radius: 92, color: "#ffcb76" } },
  /* 68 */ { kind: "wheat", burnable: true, slow: 0.9 },
  /* 69 */ { kind: "ice", slow: 1.12 },
  /* 70 */ { kind: "vines" },
  /* 71 */ { kind: "grave", solid: true },
  /* 72 */ { kind: "banner" },
  /* 73 */ { kind: "arch_top" },
  /* 74 */ { kind: "canopy" },
  /* 75 */ { kind: "cliff_top" },
  /* 76 */ { kind: "brazier", solid: true, light: { radius: 96, color: "#ff9a4a" } },
  /* 77 */ { kind: "market_stall", solid: true, burnable: true },
  /* 78 */ { kind: "haystack", solid: true, burnable: true },
  /* 79 */ { kind: "chimney", solid: true },
  /* 80 */ { kind: "shrine_stone", solid: true, light: { radius: 56, color: "#8fd8ff" } },
  /* 81 */ { kind: "open_sea", water: true, deep: true, sailable: true },
  /* 82 */ { kind: "swell", water: true, deep: true, sailable: true },
  /* 83 */ { kind: "coral", water: true, deep: true },
  /* 84 */ { kind: "bollard", solid: true },
  /* 85 */ { kind: "net" },
  /* 86 */ { kind: "driftwood", solid: true, burnable: true },
  /* 87 */ { kind: "palm", solid: true, burnable: true },
  /* 88 */ { kind: "lava", harm: 2, light: { radius: 90, color: "#ff7028" } },
  /* 89 */ { kind: "basalt", slow: 0.92 },
  /* 90 */ { kind: "ash", slow: 0.82 },
  /* 91 */ { kind: "obsidian", solid: true },
  /* 92 */ { kind: "lighthouse", solid: true, light: { radius: 140, color: "#ffeec2" } },
  /* 93 */ { kind: "sea_rock", solid: true },
  /* 94 */ { kind: "hull", solid: true, burnable: true },
  /* 95 */ { kind: "portcullis", solid: true },
  /* 96 */ { kind: "hollow_floor" },
  /* 97 */ { kind: "giant_root", solid: true },
  /* 98 */ { kind: "glow_spore", light: { radius: 50, color: "#7cffc4" } },
];

/** Indices nommés, pour que les générateurs restent lisibles. */
export const TILE = {
  empty: 0, grass: 1, grassAlt: 2, path: 3, stone: 4, water: 5,
  treeCrown: 6, treeTrunk: 7, roof: 8, wall: 9, well: 10, flowers: 11,
  fence: 12, bush: 13, door: 14, sign: 15, stairs: 16, forestFloor: 17,
  mud: 18, cliff: 19, reeds: 20, rubble: 21, lilypad: 22, crop: 23,
  pineCrown: 24, stump: 25, mushroom: 26, deepWater: 27, bridge: 28,
  mossStone: 29, wildflowers: 30, crackedPath: 31, woodFloor: 32,
  interiorWall: 33, rug: 34, bed: 35, bookshelf: 36, table: 37,
  fireplace: 38, chair: 39, window: 40, interiorBlock: 41,
  scree: 42, snow: 43, alpineGrass: 44, heather: 45, boulder: 46, gravel: 47,
  cobble: 48, dryGrass: 49, marshGrass: 50, snowPine: 51, crag: 52,
  tallGrass: 53, shoreSand: 54, flowerPatch: 55, log: 56, fern: 57,
  pebbles: 58, snowdrift: 59, cattail: 60, dock: 61, barrel: 62, crate: 63,
  hedge: 64, ruinColumn: 65, deadTree: 66, lanternPost: 67, wheat: 68,
  ice: 69, vines: 70, grave: 71, banner: 72, archTop: 73, canopy: 74,
  cliffTop: 75, brazier: 76, marketStall: 77, haystack: 78, chimney: 79,
  shrineStone: 80,
  openSea: 81, swell: 82, coral: 83, bollard: 84, net: 85, driftwood: 86,
  palm: 87, lava: 88, basalt: 89, ash: 90, obsidian: 91, lighthouse: 92,
  seaRock: 93, hull: 94, portcullis: 95,
  hollowFloor: 96, giantRoot: 97, glowSpore: 98,
} as const;

/** Tuiles repeintes à chaque image : eau, flammes, herbe qui ondule. */
const ANIMATED = new Set<number>([
  TILE.water, TILE.deepWater, TILE.lilypad, TILE.fireplace, TILE.brazier,
  TILE.tallGrass, TILE.wheat, TILE.cattail, TILE.banner, TILE.shrineStone,
  TILE.lava, TILE.lighthouse, TILE.glowSpore,
]);

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

/** Bruit déterministe propre à une tuile et à un indice de détail. */
function speckNoise(x: number, y: number, index: number, salt: number): number {
  let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 31, 668265263)
    ^ Math.imul(index + 7, 2246822519) ^ salt;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/**
 * Sème des points de détail dans une tuile.
 *
 * Les sols dessinaient deux ou trois rectangles toujours au même endroit de la
 * cellule : à l'écran, on ne voyait plus la matière mais la grille de 16 px.
 * Les grains sont maintenant tirés d'un bruit propre à chaque tuile — aucune
 * cellule ne ressemble à sa voisine, et le sol redevient une surface.
 */
function specks(ctx: CanvasRenderingContext2D, color: string, px: number, py: number,
  x: number, y: number, salt: number, count: number, size = 1): void {
  ctx.fillStyle = color;
  const span = 17 - size;
  for (let index = 0; index < count; index += 1) {
    const sx = Math.floor(speckNoise(x, y, index * 2, salt) * span);
    const sy = Math.floor(speckNoise(x, y, index * 2 + 1, salt) * span);
    ctx.fillRect(px + sx, py + sy, size, size);
  }
}

/** Tache allongée occasionnelle : cailloux, touffes, plaques de mousse. */
function patch(ctx: CanvasRenderingContext2D, color: string, px: number, py: number,
  x: number, y: number, salt: number, chance: number, width = 4, height = 2): void {
  if (speckNoise(x, y, 91, salt) > chance) return;
  const sx = Math.floor(speckNoise(x, y, 92, salt) * (17 - width));
  const sy = Math.floor(speckNoise(x, y, 93, salt) * (17 - height));
  fill(ctx, color, px + sx, py + sy, width, height);
}


function getBiomeFamily(kind: TileKind): number {
  switch (kind) {
    case "grass": case "grass_alt": case "marsh_grass": case "tall_grass": case "alpine_grass": case "dry_grass": return 1;
    case "path": case "cracked_path": case "shore_sand": return 2;
    case "stone": case "moss_stone": case "gravel": case "cobble": case "basalt": case "ash": case "pebbles": return 3;
    case "snow": case "snowdrift": case "ice": return 4;
    default: return 0;
  }
}
function biomeFringeColor(kind: TileKind): string {
  switch (kind) {
    case "grass": case "grass_alt": case "tall_grass": return PALETTE.grass;
    case "marsh_grass": return PALETTE.marsh;
    case "alpine_grass": return PALETTE.grassDark;
    case "dry_grass": return PALETTE.sand;
    case "path": case "cracked_path": return PALETTE.sandDark;
    case "shore_sand": return PALETTE.sandLight;
    case "stone": case "moss_stone": case "cobble": return PALETTE.stone;
    case "gravel": case "pebbles": return PALETTE.stoneDark;
    case "basalt": return PALETTE.night;
    case "ash": return PALETTE.stone;
    case "snow": case "snowdrift": return PALETTE.white;
    case "ice": return "#cdeaf2";
    default: return PALETTE.ink;
  }
}

export class TileSet {
  properties(id: number): TileProperties {
    return TILES[id] ?? TILES[0]!;
  }

  isAnimated(id: number): boolean { return ANIMATED.has(id); }

  /** Lumière propre à une tuile, si elle en émet. */
  lightOf(id: number): TileProperties["light"] { return this.properties(id).light; }

  draw(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, frame = 0, map?: TileMap, wind?: Vec2): void {
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
        const dark = kind === "grass" ? PALETTE.grassDark : PALETTE.leafDark;
        fill(ctx, base, px, py, 16, 16);
        specks(ctx, dark, px, py, x, y, 0x11, 5);
        specks(ctx, light, px, py, x, y, 0x22, 4);
        patch(ctx, light, px, py, x, y, 0x33, 0.22, 3, 1);
        patch(ctx, PALETTE.leafLight, px, py, x, y, 0x44, 0.1, 2, 2);
        break;
      }
      case "forest_floor":
        fill(ctx, PALETTE.pine, px, py, 16, 16);
        specks(ctx, PALETTE.pineDark, px, py, x, y, 0x51, 6);
        specks(ctx, PALETTE.leafDark, px, py, x, y, 0x52, 4);
        specks(ctx, PALETTE.leaf, px, py, x, y, 0x53, 2);
        patch(ctx, PALETTE.woodDark, px, py, x, y, 0x54, 0.18, 3, 1);
        patch(ctx, PALETTE.leafDark, px, py, x, y, 0x55, 0.3, 4, 2);
        break;
      case "mud":
        fill(ctx, PALETTE.marsh, px, py, 16, 16);
        specks(ctx, PALETTE.pineDark, px, py, x, y, 0x61, 6);
        specks(ctx, PALETTE.soil, px, py, x, y, 0x62, 4);
        patch(ctx, PALETTE.water, px, py, x, y, 0x63, 0.3, 4, 2);
        patch(ctx, PALETTE.pineDark, px, py, x, y, 0x64, 0.4, 5, 2);
        break;
      case "path":
      case "cracked_path": {
        // Terre battue, pas sable de plage : le chemin partageait sa teinte
        // claire avec les rives et les champs, et toute la vallée virait au
        // beige. On l'assombrit pour qu'un sentier reste un sentier.
        const sandy = kind === "path";
        fill(ctx, sandy ? PALETTE.sandDark : PALETTE.stone, px, py, 16, 16);
        specks(ctx, sandy ? PALETTE.soil : PALETTE.stoneDark, px, py, x, y, 0x71, 7);
        specks(ctx, sandy ? PALETTE.sand : PALETTE.stoneLight, px, py, x, y, 0x72, 5);
        patch(ctx, sandy ? PALETTE.sandLight : PALETTE.ink, px, py, x, y, 0x73, 0.24, 3, 1);
        if (!sandy) patch(ctx, PALETTE.stoneDark, px, py, x, y, 0x74, 0.4, 1, 5);
        // Bordure douce là où le chemin touche autre chose que lui-même.
        if (map) this.drawPathFringe(ctx, map, x, y, px, py, sandy);
        break;
      }
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
      case "crag":
        this.drawRock(ctx, map, x, y, px, py, variant, kind === "crag");
        break;
      case "cliff_top": {
        // Plateau : la roche vue de dessus. Quand une paroi commence juste
        // en dessous, on éclaire le bord — c'est ce liseré qui fait sentir le
        // vide et donne son épaisseur à la marche.
        fill(ctx, PALETTE.stone, px, py, 16, 16);
        specks(ctx, PALETTE.stoneLight, px, py, x, y, 0x311, 6, 2);
        specks(ctx, PALETTE.stoneDark, px, py, x, y, 0x312, 5, 2);
        const brink = map !== undefined
          && this.properties(map.tileAt("terrain", x, y + 1)).kind === "cliff";
        if (brink) {
          fill(ctx, PALETTE.stoneLight, px, py + 13, 16, 2);
          fill(ctx, PALETTE.white, px + 3 + variant, py + 13, 4, 1);
        }
        break;
      }
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
        const deep = kind === "deep_water";
        let dist = map ? map.waterDistAt(x, y) : (deep ? 4 : 2);
        if (dist <= 1) { fill(ctx, PALETTE.waterLight, px, py, 16, 16); }
        else if (dist <= 2) { melange(ctx, PALETTE.water, PALETTE.waterLight, 2 - dist, px, py, 16, 16); }
        else if (dist <= 4) { melange(ctx, PALETTE.deepWater, PALETTE.water, (4 - dist) / 2, px, py, 16, 16); }
        else { fill(ctx, PALETTE.deepWater, px, py, 16, 16); }
        const offset = Math.floor(frame / 18 + x * 2 + y) % 8;
        fill(ctx, deep ? PALETTE.water : PALETTE.waterLight, px + offset - 4, py + 4, 8, 1);
        fill(ctx, deep ? PALETTE.pineDark : PALETTE.deepWater, px + 9 - offset / 2, py + 11, 7, 1);
        fill(ctx, PALETTE.waterLight, px + ((offset + 8) % 11), py + 14, 3, 1);
        if (map) this.drawFoam(ctx, map, x, y, px, py, frame);
        break;
      }
      case "ice":
        fill(ctx, "#a9d8e6", px, py, 16, 16);
        fill(ctx, "#cdeaf2", px + 1, py + 1, 14, 6);
        fill(ctx, "#7fb6cc", px + 2 + variant, py + 9, 8, 2);
        fill(ctx, PALETTE.white, px + 3, py + 2, 5, 1);
        fill(ctx, "#7fb6cc", px + 11, py + 4, 1, 6);
        break;
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
      case "dock":
        fill(ctx, kind === "bridge" ? PALETTE.deepWater : PALETTE.water, px, py, 16, 16);
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
      case "canopy":
        // Feuillage haut, dessiné par-dessus les personnages.
        fill(ctx, PALETTE.leafDark, px, py + 2, 16, 12);
        fill(ctx, PALETTE.leaf, px + 1 + variant, py, 12, 11);
        fill(ctx, PALETTE.leafLight, px + 4, py + 1, 5, 3);
        fill(ctx, PALETTE.pineDark, px + 10, py + 8, 5, 5);
        break;
      case "tree_trunk":
        fill(ctx, PALETTE.leafDark, px, py, 16, 5);
        shadow(ctx, px, py, 10);
        fill(ctx, PALETTE.woodDark, px + 4, py + 3, 9, 13);
        fill(ctx, PALETTE.wood, px + 6, py + 4, 4, 10);
        fill(ctx, PALETTE.woodLight, px + 7, py + 5, 2, 5);
        fill(ctx, PALETTE.ink, px + 10, py + 7, 2, 5);
        break;
      case "dead_tree":
        shadow(ctx, px, py, 12);
        fill(ctx, PALETTE.woodDark, px + 6, py + 2, 4, 14);
        fill(ctx, PALETTE.wood, px + 7, py + 4, 2, 10);
        fill(ctx, PALETTE.woodDark, px + 2, py + 3, 4, 2);
        fill(ctx, PALETTE.woodDark, px + 10, py + 6, 5, 2);
        fill(ctx, PALETTE.woodDark, px + 3, py + 8, 3, 2);
        fill(ctx, PALETTE.ink, px + 8, py + 6, 1, 6);
        break;
      case "log":
        shadow(ctx, px, py, 15);
        fill(ctx, PALETTE.woodDark, px, py + 5, 16, 8);
        fill(ctx, PALETTE.wood, px, py + 6, 16, 5);
        fill(ctx, PALETTE.woodLight, px + 1, py + 6, 14, 1);
        fill(ctx, PALETTE.soil, px + 1, py + 6, 4, 5);
        fill(ctx, PALETTE.leafDark, px + 8, py + 4, 5, 2);
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
        this.drawRoof(ctx, map, x, y, px, py, variant);
        break;
      case "chimney":
        fill(ctx, PALETTE.stoneDark, px + 3, py, 10, 16);
        fill(ctx, PALETTE.stone, px + 4, py + 1, 8, 14);
        fill(ctx, PALETTE.stoneLight, px + 5, py + 2, 3, 2);
        fill(ctx, PALETTE.ink, px + 5, py, 6, 2);
        break;
      case "wall":
        this.drawWall(ctx, map, x, y, px, py, variant);
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
      case "flower_patch": {
        const colors = [PALETTE.rose, PALETTE.yellow, PALETTE.white, PALETTE.purple];
        for (let index = 0; index < 5; index += 1) {
          const fx = px + 1 + ((x * 5 + index * 7) % 13);
          const fy = py + 2 + ((y * 3 + index * 5) % 12);
          fill(ctx, PALETTE.leafDark, fx, fy + 2, 1, 3);
          fill(ctx, colors[(index + variant) % colors.length]!, fx - 1, fy, 3, 2);
        }
        break;
      }
      case "fern":
        fill(ctx, PALETTE.pineDark, px + 7, py + 8, 2, 7);
        for (const [dx, dy, w] of [[2, 6, 5], [9, 5, 5], [3, 10, 4], [9, 9, 4]] as const) {
          fill(ctx, PALETTE.leafDark, px + dx, py + dy, w, 2);
          fill(ctx, PALETTE.leaf, px + dx + 1, py + dy - 1, w - 2, 1);
        }
        break;
      case "tall_grass": {
        const sway = wind ? Math.round(Math.sin((x * wind.x + y * wind.y) * 0.15 + frame * 0.05) * Math.max(1, Math.abs(wind.x) * 1.5)) : (Math.sin((frame + x * 9 + y * 5) / 22) > 0 ? 1 : 0);
        for (let blade = 1; blade < 15; blade += 3) {
          const height = 8 + ((blade + x) % 5);
          fill(ctx, PALETTE.leafDark, px + blade + sway, py + 16 - height, 2, height);
          fill(ctx, PALETTE.leafLight, px + blade + sway, py + 16 - height, 1, 3);
        }
        break;
      }
      case "wheat": {
        const sway = wind ? Math.round(Math.sin((x * wind.x + y * wind.y) * 0.15 + frame * 0.05) * Math.max(1, Math.abs(wind.x) * 1.5)) : (Math.sin((frame + x * 11) / 26) > 0 ? 1 : 0);
        fill(ctx, PALETTE.soil, px, py + 13, 16, 3);
        for (let stem = 1; stem < 15; stem += 4) {
          fill(ctx, PALETTE.sandDark, px + stem + sway, py + 3, 1, 12);
          fill(ctx, PALETTE.sand, px + stem + sway - 1, py + 2, 3, 4);
          fill(ctx, PALETTE.cream, px + stem + sway, py + 2, 1, 2);
        }
        break;
      }
      case "cattail": {
        const sway = wind ? Math.round(Math.sin((x * wind.x + y * wind.y) * 0.15 + frame * 0.05) * Math.max(1, Math.abs(wind.x) * 1.5)) : (Math.sin((frame + y * 13) / 30) > 0 ? 1 : 0);
        fill(ctx, PALETTE.grassDark, px + 7 + sway, py + 4, 1, 12);
        fill(ctx, PALETTE.woodDark, px + 6 + sway, py + 3, 3, 6);
        fill(ctx, PALETTE.wood, px + 7 + sway, py + 3, 1, 4);
        break;
      }
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
      case "haystack":
        shadow(ctx, px, py, 16);
        fill(ctx, PALETTE.sandDark, px + 1, py + 4, 14, 11);
        fill(ctx, PALETTE.sand, px + 2, py + 3, 12, 10);
        fill(ctx, PALETTE.sandLight, px + 4, py + 2, 7, 4);
        fill(ctx, PALETTE.soil, px + 3, py + 9, 10, 1);
        fill(ctx, PALETTE.soil, px + 5, py + 12, 7, 1);
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
      case "hedge":
        shadow(ctx, px, py, 16);
        fill(ctx, PALETTE.pineDark, px, py + 3, 16, 13);
        fill(ctx, PALETTE.leafDark, px, py + 2, 16, 10);
        fill(ctx, PALETTE.leaf, px + 1 + variant, py + 3, 6, 4);
        fill(ctx, PALETTE.leaf, px + 9 - variant, py + 6, 5, 3);
        fill(ctx, PALETTE.leafLight, px + 3, py + 3, 2, 2);
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
      case "stairs": {
        // Volée vue de trois quarts : contremarche sombre, giron clair, et un
        // limon de chaque côté. Les bandes horizontales d'avant se lisaient
        // comme un passage clouté, pas comme une montée.
        fill(ctx, PALETTE.stoneDark, px, py, 16, 16);
        for (let step = 0; step < 4; step += 1) {
          const top = py + step * 4;
          fill(ctx, PALETTE.ink, px + 1, top, 14, 1);
          fill(ctx, PALETTE.stone, px + 1, top + 1, 14, 3);
          fill(ctx, PALETTE.stoneLight, px + 1, top + 1, 14, 1);
          fill(ctx, PALETTE.stoneDark, px + 2 + ((step + x) % 5) * 2, top + 2, 2, 1);
        }
        // Limons : seulement au bord réel de la volée. Les dessiner sur
        // chaque tuile redécoupait l'escalier en colonnes de seize pixels.
        const isStair = (tileX: number): boolean => map !== undefined
          && this.properties(map.tileAt("ground", tileX, y)).kind === "stairs";
        if (!isStair(x - 1)) {
          fill(ctx, PALETTE.stoneDark, px, py, 2, 16);
          fill(ctx, PALETTE.ink, px, py, 1, 16);
        }
        if (!isStair(x + 1)) {
          fill(ctx, PALETTE.stoneDark, px + 14, py, 2, 16);
          fill(ctx, PALETTE.stoneLight, px + 14, py, 1, 16);
        }
        break;
      }
      case "barrel":
        shadow(ctx, px, py, 13);
        fill(ctx, PALETTE.woodDark, px + 2, py + 2, 12, 13);
        fill(ctx, PALETTE.wood, px + 3, py + 3, 10, 11);
        fill(ctx, PALETTE.woodLight, px + 4, py + 4, 2, 8);
        fill(ctx, PALETTE.stoneDark, px + 3, py + 6, 10, 2);
        fill(ctx, PALETTE.stoneDark, px + 3, py + 11, 10, 2);
        break;
      case "crate":
        shadow(ctx, px, py, 14);
        fill(ctx, PALETTE.woodDark, px + 1, py + 3, 14, 12);
        fill(ctx, PALETTE.wood, px + 2, py + 4, 12, 10);
        fill(ctx, PALETTE.woodLight, px + 2, py + 4, 12, 1);
        fill(ctx, PALETTE.woodDark, px + 2, py + 8, 12, 2);
        fill(ctx, PALETTE.woodDark, px + 7, py + 4, 2, 10);
        break;
      case "market_stall":
        fill(ctx, PALETTE.woodDark, px + 1, py + 8, 14, 8);
        fill(ctx, PALETTE.wood, px + 2, py + 9, 12, 6);
        for (let stripe = 0; stripe < 16; stripe += 6) {
          fill(ctx, PALETTE.roof, px + stripe, py + 1, 3, 7);
          fill(ctx, PALETTE.cream, px + stripe + 3, py + 1, 3, 7);
        }
        fill(ctx, PALETTE.ink, px, py + 7, 16, 2);
        fill(ctx, PALETTE.yellow, px + 4, py + 10, 3, 2);
        fill(ctx, PALETTE.leafLight, px + 9, py + 10, 3, 2);
        break;
      case "ruin_column":
        shadow(ctx, px, py, 13);
        fill(ctx, PALETTE.stoneDark, px + 3, py, 10, 16);
        fill(ctx, PALETTE.stone, px + 4, py, 8, 15);
        fill(ctx, PALETTE.stoneLight, px + 5, py + 1, 2, 12);
        fill(ctx, PALETTE.stoneDark, px + 2, py, 12, 3);
        fill(ctx, PALETTE.stoneLight, px + 3, py, 10, 1);
        fill(ctx, PALETTE.leafDark, px + 9, py + 9, 3, 3);
        break;
      case "grave":
        shadow(ctx, px, py, 12);
        fill(ctx, PALETTE.stoneDark, px + 4, py + 3, 8, 12);
        fill(ctx, PALETTE.stone, px + 5, py + 2, 6, 12);
        fill(ctx, PALETTE.stoneLight, px + 6, py + 3, 2, 5);
        fill(ctx, PALETTE.leafDark, px + 3, py + 13, 10, 3);
        break;
      case "lantern_post": {
        shadow(ctx, px, py, 8);
        fill(ctx, PALETTE.woodDark, px + 7, py + 5, 2, 11);
        fill(ctx, PALETTE.ink, px + 4, py, 8, 7);
        fill(ctx, PALETTE.yellow, px + 5, py + 1, 6, 5);
        fill(ctx, PALETTE.white, px + 6, py + 2, 3, 3);
        fill(ctx, PALETTE.woodDark, px + 5, py, 6, 1);
        break;
      }
      case "brazier": {
        const flicker = Math.floor(frame / 7) % 3;
        shadow(ctx, px, py, 12);
        fill(ctx, PALETTE.stoneDark, px + 4, py + 9, 8, 7);
        fill(ctx, PALETTE.stone, px + 3, py + 7, 10, 4);
        fill(ctx, PALETTE.red, px + 5 + (flicker & 1), py + 3, 6 - (flicker & 1), 6);
        fill(ctx, PALETTE.yellow, px + 6, py + 2 + flicker, 4, 5);
        fill(ctx, PALETTE.cream, px + 7, py + 3 + flicker, 2, 2);
        break;
      }
      case "shrine_stone": {
        const pulse = (Math.sin(frame / 24) + 1) / 2;
        shadow(ctx, px, py, 13);
        fill(ctx, PALETTE.stoneDark, px + 3, py + 2, 10, 14);
        fill(ctx, PALETTE.stone, px + 4, py + 1, 8, 14);
        fill(ctx, PALETTE.stoneLight, px + 5, py + 2, 2, 6);
        ctx.globalAlpha = 0.5 + pulse * 0.5;
        fill(ctx, PALETTE.waterLight, px + 6, py + 6, 4, 4);
        fill(ctx, PALETTE.white, px + 7, py + 7, 2, 2);
        ctx.globalAlpha = 1;
        break;
      }
      case "banner": {
        const wave = Math.floor(frame / 12) % 2;
        fill(ctx, PALETTE.woodDark, px + 2, py, 2, 16);
        fill(ctx, PALETTE.roofDark, px + 4, py + 1, 9, 11);
        fill(ctx, PALETTE.roof, px + 5, py + 2 + wave, 7, 8);
        fill(ctx, PALETTE.yellow, px + 7, py + 4 + wave, 3, 3);
        fill(ctx, PALETTE.roofDark, px + 4, py + 12, 3, 2);
        fill(ctx, PALETTE.roofDark, px + 9, py + 12, 3, 2);
        break;
      }
      case "arch_top":
        fill(ctx, PALETTE.stoneDark, px, py, 16, 8);
        fill(ctx, PALETTE.stone, px, py + 1, 16, 6);
        fill(ctx, PALETTE.stoneLight, px + 1, py + 1, 14, 1);
        fill(ctx, PALETTE.ink, px, py + 7, 16, 2);
        break;
      case "vines":
        for (const [vx, vy, h] of [[3, 0, 11], [8, 0, 15], [12, 0, 8]] as const) {
          fill(ctx, PALETTE.leafDark, px + vx, py + vy, 2, h);
          fill(ctx, PALETTE.leaf, px + vx, py + vy + 3, 1, 4);
          fill(ctx, PALETTE.leafLight, px + vx - 1, py + vy + h - 3, 3, 2);
        }
        break;
      case "shore_sand":
        fill(ctx, PALETTE.sand, px, py, 16, 16);
        specks(ctx, PALETTE.sandLight, px, py, x, y, 0xf1, 6, 2);
        specks(ctx, PALETTE.sandDark, px, py, x, y, 0xf2, 5);
        specks(ctx, PALETTE.stoneLight, px, py, x, y, 0xf3, 2);
        break;
      case "pebbles":
        fill(ctx, PALETTE.stone, px, py, 16, 16);
        specks(ctx, PALETTE.stoneDark, px, py, x, y, 0x101, 8, 2);
        specks(ctx, PALETTE.stoneLight, px, py, x, y, 0x102, 6, 2);
        specks(ctx, PALETTE.ink, px, py, x, y, 0x103, 3);
        break;
      case "snowdrift":
        fill(ctx, PALETTE.cream, px, py, 16, 16);
        specks(ctx, PALETTE.white, px, py, x, y, 0x111, 8, 3);
        specks(ctx, PALETTE.stoneLight, px, py, x, y, 0x112, 3);
        patch(ctx, PALETTE.white, px, py, x, y, 0x113, 0.6, 7, 3);
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
        this.drawRug(ctx, map, x, y, px, py);
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

      case "scree":
        // Éboulis : deux valeurs proches, du grain, et surtout aucun motif
        // centré qui redessinerait la grille.
        fill(ctx, PALETTE.stoneDark, px, py, 16, 16);
        specks(ctx, PALETTE.stone, px, py, x, y, 0x81, 7, 2);
        specks(ctx, PALETTE.stone, px, py, x, y, 0x82, 5);
        specks(ctx, PALETTE.stoneLight, px, py, x, y, 0x83, 3);
        patch(ctx, PALETTE.ink, px, py, x, y, 0x84, 0.3, 3, 2);
        break;
      case "snow":
        fill(ctx, PALETTE.white, px, py, 16, 16);
        specks(ctx, PALETTE.cream, px, py, x, y, 0x91, 6, 2);
        specks(ctx, PALETTE.stoneLight, px, py, x, y, 0x92, 3);
        patch(ctx, PALETTE.stoneLight, px, py, x, y, 0x93, 0.22, 5, 1);
        break;
      case "alpine_grass":
        fill(ctx, PALETTE.pineDark, px, py, 16, 16);
        specks(ctx, PALETTE.pine, px, py, x, y, 0xa1, 7, 2);
        specks(ctx, PALETTE.leafDark, px, py, x, y, 0xa2, 5);
        patch(ctx, PALETTE.stone, px, py, x, y, 0xa3, 0.2, 4, 3);
        patch(ctx, PALETTE.leaf, px, py, x, y, 0xa4, 0.18, 2, 2);
        break;
      case "heather":
        fill(ctx, PALETTE.marsh, px, py, 16, 16);
        specks(ctx, PALETTE.pineDark, px, py, x, y, 0xb1, 8, 2);
        specks(ctx, PALETTE.pine, px, py, x, y, 0xb2, 4);
        specks(ctx, PALETTE.purple, px, py, x, y, 0xb3, 4);
        specks(ctx, PALETTE.rose, px, py, x, y, 0xb4, 1);
        break;
      case "boulder":
        shadow(ctx, px, py, 15);
        fill(ctx, PALETTE.ink, px + 2, py + 5, 13, 10);
        fill(ctx, PALETTE.stoneDark, px + 2, py + 4, 12, 10);
        fill(ctx, PALETTE.stone, px + 3, py + 3, 10, 8);
        fill(ctx, PALETTE.stoneLight, px + 4, py + 3, 5, 3);
        fill(ctx, PALETTE.stoneDark, px + 9 - variant, py + 7, 3, 3);
        fill(ctx, PALETTE.ink, px + 5, py + 11, 6, 2);
        break;
      case "snow_pine":
        shadow(ctx, px, py, 16);
        fill(ctx, PALETTE.pineDark, px, py + 6, 16, 10);
        fill(ctx, PALETTE.pineDark, px + 6, py, 4, 3);
        fill(ctx, PALETTE.pine, px + 4, py + 3, 8, 4);
        fill(ctx, PALETTE.pine, px + 2, py + 7, 12, 4);
        fill(ctx, PALETTE.white, px + 6, py, 4, 2);
        fill(ctx, PALETTE.white, px + 4, py + 3, 8, 2);
        fill(ctx, PALETTE.cream, px + 2, py + 7, 12, 2);
        fill(ctx, PALETTE.woodDark, px + 7, py + 12, 3, 4);
        break;
      case "gravel":
        fill(ctx, PALETTE.stone, px, py, 16, 16);
        specks(ctx, PALETTE.stoneLight, px, py, x, y, 0xc1, 7, 2);
        specks(ctx, PALETTE.stoneDark, px, py, x, y, 0xc2, 6);
        specks(ctx, PALETTE.sandDark, px, py, x, y, 0xc3, 2);
        break;
      case "cobble": {
        // Pavage ancien. Le liseré clair systématique dessinait une grille de
        // carrelage neuf sur toute la place ; il ne survient plus que sur une
        // pierre sur trois, et la mousse mange les joints.
        fill(ctx, PALETTE.stoneDark, px, py, 16, 16);
        const shift = (y & 1) === 0 ? 0 : 4;
        for (let row = 0; row < 2; row += 1) {
          for (let col = -1; col < 2; col += 1) {
            const bx = px + shift + col * 8 + 1;
            const by = py + row * 8 + 1;
            const wear = (x * 7 + y * 13 + row * 3 + col) % 5;
            fill(ctx, wear === 0 ? PALETTE.stoneDark : PALETTE.stone, bx, by, 7, 6);
            if (wear === 2) fill(ctx, PALETTE.stoneLight, bx, by, 5, 1);
            if (wear === 4) fill(ctx, PALETTE.leafDark, bx + 1, by + 4, 4, 2);
          }
        }
        break;
      }
      case "dry_grass":
        fill(ctx, PALETTE.sand, px, py, 16, 16);
        specks(ctx, PALETTE.sandDark, px, py, x, y, 0xd1, 7, 2);
        specks(ctx, PALETTE.sandLight, px, py, x, y, 0xd2, 5);
        specks(ctx, PALETTE.grassDark, px, py, x, y, 0xd3, 3);
        patch(ctx, PALETTE.soil, px, py, x, y, 0xd4, 0.2, 3, 1);
        break;
      case "open_sea":
      case "swell": {
        // Le large : houle longue et oblique, calculée en coordonnées monde
        // pour qu'une crête traverse la zone d'un bout à l'autre. Une phase
        // par tuile redécoupait la mer en rayures de seize pixels.
        const deep = kind === "open_sea";
        fill(ctx, deep ? "#123047" : PALETTE.deepWater, px, py, 16, 16);
        for (let column = 0; column < 16; column += 2) {
          const worldX = px + column;
          const crest = Math.round(Math.sin((worldX + py * 0.55) / 21) * 5.5 + 8);
          const second = Math.round(Math.sin((worldX * 0.7 - py * 0.9) / 15) * 4 + 8);
          fill(ctx, PALETTE.deepWater, worldX, py + crest, 2, 2);
          fill(ctx, deep ? PALETTE.water : PALETTE.waterLight, worldX, py + crest, 2, 1);
          if (!deep) fill(ctx, PALETTE.water, worldX, py + second, 2, 1);
        }
        specks(ctx, PALETTE.waterLight, px, py, x, y, 0x2f1, deep ? 1 : 2);
        if (map) this.drawFoam(ctx, map, x, y, px, py, frame);
        break;
      }
      case "coral":
        fill(ctx, PALETTE.deepWater, px, py, 16, 16);
        fill(ctx, PALETTE.roofDark, px + 3, py + 6, 4, 8);
        fill(ctx, PALETTE.roof, px + 4, py + 4, 2, 8);
        fill(ctx, PALETTE.rose, px + 3, py + 3, 4, 3);
        fill(ctx, PALETTE.purple, px + 9, py + 7, 5, 7);
        fill(ctx, PALETTE.rose, px + 10, py + 5, 3, 4);
        fill(ctx, PALETTE.waterLight, px + 8, py + 12, 2, 2);
        break;
      case "sea_rock":
        shadow(ctx, px, py, 14);
        fill(ctx, PALETTE.ink, px + 1, py + 3, 14, 12);
        fill(ctx, PALETTE.stoneDark, px + 2, py + 2, 12, 11);
        fill(ctx, PALETTE.stone, px + 3, py + 2, 9, 7);
        fill(ctx, PALETTE.stoneLight, px + 4, py + 2, 4, 2);
        fill(ctx, PALETTE.leafDark, px + 3, py + 10, 5, 2);
        break;
      case "bollard":
        shadow(ctx, px, py, 9);
        fill(ctx, PALETTE.ink, px + 5, py + 3, 6, 12);
        fill(ctx, PALETTE.woodDark, px + 5, py + 2, 6, 12);
        fill(ctx, PALETTE.wood, px + 6, py + 3, 3, 9);
        fill(ctx, PALETTE.woodLight, px + 4, py + 1, 8, 3);
        fill(ctx, PALETTE.sandDark, px + 4, py + 8, 9, 2);
        break;
      case "net":
        fill(ctx, PALETTE.sandDark, px + 1, py + 4, 14, 1);
        fill(ctx, PALETTE.sandDark, px + 1, py + 9, 14, 1);
        for (let strand = 1; strand < 16; strand += 4) {
          fill(ctx, PALETTE.sandDark, px + strand, py + 3, 1, 8);
        }
        fill(ctx, PALETTE.woodDark, px + 2, py + 11, 12, 2);
        fill(ctx, PALETTE.cream, px + 6, py + 6, 2, 2);
        break;
      case "driftwood":
        shadow(ctx, px, py, 15);
        fill(ctx, PALETTE.stoneDark, px, py + 6, 16, 6);
        fill(ctx, PALETTE.stoneLight, px + 1, py + 6, 14, 2);
        fill(ctx, PALETTE.woodDark, px + 3, py + 4, 3, 3);
        fill(ctx, PALETTE.woodDark, px + 10, py + 3, 4, 4);
        break;
      case "palm":
        shadow(ctx, px, py, 10);
        fill(ctx, PALETTE.woodDark, px + 7, py + 4, 3, 12);
        fill(ctx, PALETTE.wood, px + 8, py + 5, 1, 10);
        for (const [dx, dy] of [[-6, -1], [5, -1], [-4, 3], [4, 3]] as const) {
          fill(ctx, PALETTE.pineDark, px + 8 + dx, py + 2 + dy, 6, 2);
          fill(ctx, PALETTE.leaf, px + 8 + dx, py + 1 + dy, 5, 2);
        }
        fill(ctx, PALETTE.leafLight, px + 5, py, 6, 3);
        fill(ctx, PALETTE.yellow, px + 6, py + 4, 2, 2);
        break;
      case "lava": {
        // Coulée : croûte sombre qui se fend sur de la lumière.
        const pulse = Math.floor(frame / 9) % 3;
        fill(ctx, "#3a1408", px, py, 16, 16);
        specks(ctx, "#ff8a2a", px, py, x, y, 0x201, 6, 3);
        specks(ctx, "#ffd166", px, py, x, y, 0x202, 4, 2);
        fill(ctx, "#ff5a1a", px + 1 + pulse, py + 6, 13 - pulse, 2);
        fill(ctx, "#ffe7a0", px + 4, py + 7, 5 - pulse, 1);
        specks(ctx, "#1c0a06", px, py, x, y, 0x203, 5, 2);
        break;
      }
      case "basalt":
        fill(ctx, "#2b2630", px, py, 16, 16);
        specks(ctx, "#3d3742", px, py, x, y, 0x211, 7, 3);
        specks(ctx, "#544c5a", px, py, x, y, 0x212, 4);
        specks(ctx, "#181419", px, py, x, y, 0x213, 4, 2);
        break;
      case "ash":
        fill(ctx, "#4a4450", px, py, 16, 16);
        specks(ctx, "#5d5666", px, py, x, y, 0x221, 7, 3);
        specks(ctx, "#3a3441", px, py, x, y, 0x222, 5, 2);
        specks(ctx, "#7a6f80", px, py, x, y, 0x223, 3);
        break;
      case "obsidian":
        shadow(ctx, px, py, 14);
        fill(ctx, "#120e18", px + 1, py + 1, 14, 14);
        fill(ctx, "#241b30", px + 2, py + 2, 11, 11);
        fill(ctx, "#3d2b4f", px + 3, py + 3, 5, 6);
        fill(ctx, PALETTE.purple, px + 4, py + 3, 2, 3);
        fill(ctx, "#0a0710", px + 9, py + 8, 4, 5);
        break;
      case "lighthouse": {
        // Tour à bandes, et son faisceau qui tourne.
        const beam = Math.floor(frame / 22) % 4;
        fill(ctx, PALETTE.ink, px + 2, py, 12, 16);
        for (let band = 0; band < 16; band += 4) {
          fill(ctx, band % 8 === 0 ? PALETTE.cream : PALETTE.red, px + 3, py + band, 10, 4);
        }
        fill(ctx, PALETTE.ink, px + 1, py, 14, 4);
        fill(ctx, PALETTE.yellow, px + 4, py + 1, 8, 3);
        ctx.globalAlpha = 0.5;
        fill(ctx, PALETTE.cream, px + (beam - 1) * 7, py - 2, 6, 4);
        ctx.globalAlpha = 1;
        break;
      }
      case "hull":
        shadow(ctx, px, py, 16);
        fill(ctx, PALETTE.ink, px, py + 3, 16, 12);
        fill(ctx, PALETTE.woodDark, px, py + 4, 16, 10);
        for (let plank = 5; plank < 14; plank += 3) {
          fill(ctx, PALETTE.wood, px + 1, py + plank, 14, 2);
        }
        fill(ctx, PALETTE.woodLight, px + 2, py + 4, 12, 1);
        fill(ctx, PALETTE.ink, px + 5, py + 8, 4, 3);
        break;
      case "portcullis":
        fill(ctx, PALETTE.ink, px, py, 16, 16);
        for (let bar = 1; bar < 16; bar += 4) fill(ctx, PALETTE.stoneDark, px + bar, py, 2, 16);
        for (let rail = 2; rail < 16; rail += 6) fill(ctx, PALETTE.stoneDark, px, py + rail, 16, 2);
        fill(ctx, PALETTE.stoneLight, px + 1, py + 2, 1, 12);
        fill(ctx, PALETTE.stoneLight, px + 9, py + 2, 1, 12);
        break;

      case "marsh_grass":
        // La tourbe manquait d'écart de valeur : tout le marais se lisait
        // comme un aplat vert. On creuse les creux et l'on pose des flaques.
        fill(ctx, PALETTE.marsh, px, py, 16, 16);
        patch(ctx, PALETTE.pineDark, px, py, x, y, 0xe5, 0.55, 8, 5);
        specks(ctx, PALETTE.pineDark, px, py, x, y, 0xe1, 6, 2);
        specks(ctx, PALETTE.pine, px, py, x, y, 0xe2, 5, 2);
        specks(ctx, PALETTE.leafDark, px, py, x, y, 0xe3, 4);
        patch(ctx, PALETTE.deepWater, px, py, x, y, 0xe4, 0.3, 5, 3);
        patch(ctx, PALETTE.leaf, px, py, x, y, 0xe6, 0.18, 2, 2);
        break;

      // — Les Racines Creuses —
      case "hollow_floor":
        // Terre de racine, tassée par des siècles de sève : ni herbe ni
        // pavé, la seule matière qui n'appartient à aucun biome de surface.
        fill(ctx, PALETTE.soil, px, py, 16, 16);
        specks(ctx, PALETTE.woodDark, px, py, x, y, 0xf1, 7);
        specks(ctx, PALETTE.pineDark, px, py, x, y, 0xf2, 5);
        patch(ctx, PALETTE.wood, px, py, x, y, 0xf3, 0.22, 5, 1);
        patch(ctx, PALETTE.pineDark, px, py, x, y, 0xf4, 0.16, 3, 3);
        break;
      case "giant_root":
        // Un pilier vivant plutôt qu'une colonne : deux racines torses
        // portent une arche d'écorce, assez large pour barrer un couloir.
        shadow(ctx, px, py, 15);
        fill(ctx, PALETTE.woodDark, px + 1, py, 4, 16);
        fill(ctx, PALETTE.woodDark, px + 11, py, 4, 16);
        fill(ctx, PALETTE.wood, px + 2, py + 1, 2, 14);
        fill(ctx, PALETTE.wood, px + 12, py + 1, 2, 14);
        fill(ctx, PALETTE.woodDark, px + 4, py + 2, 8, 5);
        fill(ctx, PALETTE.woodLight, px + 5, py + 3, 3, 2);
        fill(ctx, PALETTE.leafDark, px, py + 12, 5, 4);
        fill(ctx, PALETTE.leafDark, px + 11, py + 13, 5, 3);
        fill(ctx, PALETTE.ink, px + 6, py + 6, 4, 8);
        break;
      case "glow_spore": {
        // Champignon bioluminescent, pas décoratif seulement : c'est lui qui
        // éclaire les Racines Creuses, faute de torches sous terre.
        const pulse = (Math.sin(frame / 20 + x + y) + 1) / 2;
        fill(ctx, PALETTE.woodDark, px + 6, py + 10, 4, 6);
        fill(ctx, PALETTE.wood, px + 7, py + 11, 2, 5);
        ctx.globalAlpha = 0.5 + pulse * 0.5;
        fill(ctx, "#3fae82", px + 3, py + 4, 10, 8);
        fill(ctx, "#7cffc4", px + 5, py + 5, 6, 5);
        ctx.globalAlpha = 0.7 + pulse * 0.3;
        fill(ctx, PALETTE.white, px + 6, py + 6, 2, 2);
        fill(ctx, PALETTE.white, px + 9, py + 7, 1, 1);
        ctx.globalAlpha = 1;
        break;
      }
    }
    if (map) {
      const family = getBiomeFamily(kind);
      if (family > 0) this.drawBiomeFringe(ctx, map, x, y, px, py, kind);
    }
    ctx.restore();
  }

  /**
   * Écume au contact de la terre. Sans elle, une nappe d'eau se termine par un
   * bord net qui trahit la grille ; avec elle, la rive se lit d'un coup d'œil.
   * Un seul pixel suffit : deux dessinaient un cadre autour de chaque tuile.
   */
  private drawFoam(ctx: CanvasRenderingContext2D, map: TileMap, x: number, y: number,
    px: number, py: number, frame: number): void {
    const land = (tileX: number, tileY: number): boolean =>
      tileX >= 0 && tileY >= 0 && tileX < map.width && tileY < map.height
      && !map.isWater(tileX, tileY);
    const mask = map.neighbourMask(x, y, land);
    if (mask === 0) return;
    const pulse = Math.floor(frame / 24 + x + y) % 2;
    ctx.fillStyle = PALETTE.waterLight;
    if (mask & 1) ctx.fillRect(px, py, 16, 1);
    if (mask & 2) ctx.fillRect(px + 15, py, 1, 16);
    if (mask & 4) ctx.fillRect(px, py + 15, 16, 1);
    if (mask & 8) ctx.fillRect(px, py, 1, 16);
    if (pulse === 0) return;
    ctx.fillStyle = PALETTE.white;
    if (mask & 4) ctx.fillRect(px + 4, py + 14, 4, 1);
    if (mask & 1) ctx.fillRect(px + 9, py + 1, 3, 1);
  }

  /**
   * Liseré du sentier. Un trait plein dessinait un quadrillage sur toute la
   * vallée ; un pixel sur deux donne un bord effrité, bien plus proche d'une
   * terre battue.
   */

  private drawBiomeFringe(ctx: CanvasRenderingContext2D, map: TileMap, x: number, y: number, px: number, py: number, kind: TileKind): void {
    const family = getBiomeFamily(kind);
    if (family === 0) return;
    const upKind = this.properties(map.tileAt("ground", x, y - 1)).kind;
    const rightKind = this.properties(map.tileAt("ground", x + 1, y)).kind;
    const downKind = this.properties(map.tileAt("ground", x, y + 1)).kind;
    const leftKind = this.properties(map.tileAt("ground", x - 1, y)).kind;
    if (getBiomeFamily(upKind) > family) this.paintFringe(ctx, px, py, upKind, "up");
    if (getBiomeFamily(rightKind) > family) this.paintFringe(ctx, px, py, rightKind, "right");
    if (getBiomeFamily(downKind) > family) this.paintFringe(ctx, px, py, downKind, "down");
    if (getBiomeFamily(leftKind) > family) this.paintFringe(ctx, px, py, leftKind, "left");
  }
  private paintFringe(ctx: CanvasRenderingContext2D, px: number, py: number, neighborKind: TileKind, dir: "up" | "right" | "down" | "left"): void {
    ctx.fillStyle = biomeFringeColor(neighborKind);
    const drawPixel = (dx: number, dy: number, ratio: number) => {
       if (dither(px + dx, py + dy, ratio)) ctx.fillRect(px + dx, py + dy, 1, 1);
    };
    if (dir === "up") {
      for (let dy = 0; dy < 4; dy++) { const ratio = 1 - (dy / 4); for (let dx = 0; dx < 16; dx++) drawPixel(dx, dy, ratio); }
    } else if (dir === "right") {
      for (let dx = 12; dx < 16; dx++) { const ratio = (dx - 12) / 3; for (let dy = 0; dy < 16; dy++) drawPixel(dx, dy, ratio); }
    } else if (dir === "down") {
      for (let dy = 12; dy < 16; dy++) { const ratio = (dy - 12) / 3; for (let dx = 0; dx < 16; dx++) drawPixel(dx, dy, ratio); }
    } else if (dir === "left") {
      for (let dx = 0; dx < 4; dx++) { const ratio = 1 - (dx / 4); for (let dy = 0; dy < 16; dy++) drawPixel(dx, dy, ratio); }
    }
  }

  private drawPathFringe(ctx: CanvasRenderingContext2D, map: TileMap, x: number, y: number,
    px: number, py: number, sandy: boolean): void {
    const samePath = (tileX: number, tileY: number): boolean => {
      const kind = this.properties(map.tileAt("ground", tileX, tileY)).kind;
      return kind === "path" || kind === "cracked_path" || kind === "gravel"
        || kind === "cobble" || kind === "dock" || kind === "bridge";
    };
    const mask = map.neighbourMask(x, y, samePath);
    ctx.fillStyle = sandy ? PALETTE.sandDark : PALETTE.stoneDark;
    const dither = (offset: number): boolean => ((offset + x * 5 + y * 3) & 3) !== 0;
    for (let offset = 0; offset < 16; offset += 1) {
      if (!dither(offset)) continue;
      if ((mask & 1) === 0) ctx.fillRect(px + offset, py, 1, 1);
      if ((mask & 4) === 0) ctx.fillRect(px + offset, py + 15, 1, 1);
      if ((mask & 8) === 0) ctx.fillRect(px, py + offset, 1, 1);
      if ((mask & 2) === 0) ctx.fillRect(px + 15, py + offset, 1, 1);
    }
  }

  /**
   * Paroi rocheuse consciente de ses voisines.
   *
   * Une falaise dessinée à l'identique partout donnait un aplat gris : rien
   * ne disait où commençait le relief. On éclaire désormais la lèvre du haut
   * et l'on assombrit le pied — le regard lit une hauteur, pas un carré.
   */
  private drawRock(ctx: CanvasRenderingContext2D, map: TileMap | undefined,
    x: number, y: number, px: number, py: number, variant: number, jagged: boolean): void {
    const sameRock = (tileX: number, tileY: number): boolean => {
      if (!map) return false;
      const kind = this.properties(map.tileAt("terrain", tileX, tileY)).kind;
      return kind === "cliff" || kind === "crag";
    };
    const above = sameRock(x, y - 1);
    const below = sameRock(x, y + 1);
    const left = sameRock(x - 1, y);
    const right = sameRock(x + 1, y);

    fill(ctx, PALETTE.stoneDark, px, py, 16, 16);
    fill(ctx, PALETTE.stone, px, py + 2, 16, 11);
    // Strates : décalées d'une tuile à l'autre pour éviter la rayure continue.
    fill(ctx, PALETTE.stoneDark, px, py + 5 + (variant & 1), 16, 1);
    fill(ctx, PALETTE.stoneDark, px + 2 + variant, py + 9, 12 - variant, 1);
    fill(ctx, PALETTE.ink, px + 3 + variant * 3, py + 4, 1, 5);

    if (!above) {
      // Lèvre supérieure : la surface qu'on verrait de dessus, éclairée.
      if (jagged) {
        const peak = 2 + variant;
        fill(ctx, PALETTE.stoneDark, px + peak, py - 4, 5, 8);
        fill(ctx, PALETTE.stone, px + peak + 1, py - 3, 3, 7);
        fill(ctx, PALETTE.stoneLight, px + peak + 1, py - 3, 2, 4);
        fill(ctx, PALETTE.stoneDark, px + 10 - variant, py - 2, 4, 6);
      }
      fill(ctx, PALETTE.stoneLight, px, py, 16, 2);
      fill(ctx, PALETTE.white, px + 2 + variant, py, 4, 1);
      fill(ctx, PALETTE.stone, px, py + 2, 16, 1);
    } else {
      fill(ctx, PALETTE.stoneDark, px, py, 16, 2);
    }

    if (!below) {
      // Pied de paroi : ombre franche, puis contact avec le sol.
      fill(ctx, PALETTE.ink, px, py + 12, 16, 4);
      fill(ctx, PALETTE.stoneDark, px + 1, py + 12, 14, 2);
      if ((x + y) % 3 === 0) fill(ctx, PALETTE.leafDark, px + 11, py + 11, 4, 2);
    }
    if (!left) fill(ctx, PALETTE.ink, px, py + 2, 1, 12);
    if (!right) fill(ctx, PALETTE.stoneDark, px + 15, py + 2, 1, 12);
  }

  /**
   * Tapis vu comme un seul objet.
   *
   * Chaque tuile dessinait un motif encadré complet : une pièce tapissée de
   * huit cases sur huit devenait un damier de cadres dorés, impossible à lire
   * comme un tapis. Le galon ne court plus que sur le pourtour réel.
   */
  private drawRug(ctx: CanvasRenderingContext2D, map: TileMap | undefined,
    x: number, y: number, px: number, py: number): void {
    const sameRug = (tileX: number, tileY: number): boolean =>
      map !== undefined && this.properties(map.tileAt("ground", tileX, tileY)).kind === "rug";
    const above = sameRug(x, y - 1);
    const below = sameRug(x, y + 1);
    const left = sameRug(x - 1, y);
    const right = sameRug(x + 1, y);

    fill(ctx, PALETTE.roof, px, py, 16, 16);
    // Motif intérieur discret, décalé d'une case à l'autre.
    if (((x + y) & 1) === 0) {
      fill(ctx, PALETTE.roofDark, px + 4, py + 4, 8, 8);
      fill(ctx, PALETTE.roof, px + 6, py + 6, 4, 4);
    } else {
      fill(ctx, PALETTE.roofDark, px + 7, py + 2, 2, 12);
      fill(ctx, PALETTE.roofDark, px + 2, py + 7, 12, 2);
    }

    if (!above) {
      fill(ctx, PALETTE.roofDark, px, py, 16, 3);
      fill(ctx, PALETTE.yellow, px, py + 1, 16, 1);
    }
    if (!below) {
      fill(ctx, PALETTE.roofDark, px, py + 13, 16, 3);
      fill(ctx, PALETTE.yellow, px, py + 14, 16, 1);
    }
    if (!left) {
      fill(ctx, PALETTE.roofDark, px, py, 3, 16);
      fill(ctx, PALETTE.yellow, px + 1, py, 1, 16);
    }
    if (!right) {
      fill(ctx, PALETTE.roofDark, px + 13, py, 3, 16);
      fill(ctx, PALETTE.yellow, px + 14, py, 1, 16);
    }
  }

  /** Vrai si la case voisine appartient au même bâtiment. */
  private isBuilding(map: TileMap | undefined, x: number, y: number): boolean {
    if (!map) return false;
    for (const layer of ["terrain", "decor_above"] as const) {
      const kind = this.properties(map.tileAt(layer, x, y)).kind;
      if (kind === "roof" || kind === "wall" || kind === "door" || kind === "window"
        || kind === "chimney" || kind === "interior_wall") return true;
    }
    return false;
  }

  /**
   * Toiture consciente de ses voisines.
   *
   * Une tuile de toit se dessinait identique partout : un bâtiment de six
   * cases sur cinq n'était qu'un grand rectangle de briques, sans faîtage ni
   * débord. On distingue désormais l'arête, les rampants et l'avant-toit —
   * c'est ce qui fait qu'une maison ressemble à une maison.
   */
  private drawRoof(ctx: CanvasRenderingContext2D, map: TileMap | undefined,
    x: number, y: number, px: number, py: number, variant: number): void {
    const above = this.isBuilding(map, x, y - 1);
    const below = this.isBuilding(map, x, y + 1);
    const left = this.isBuilding(map, x - 1, y);
    const right = this.isBuilding(map, x + 1, y);

    fill(ctx, PALETTE.roofDark, px, py, 16, 16);
    // Rangs de tuiles, décalés d'une ligne à l'autre.
    for (let row = above ? 0 : 3; row < 16; row += 4) {
      fill(ctx, PALETTE.roof, px, py + row, 16, 3);
      for (let shingle = ((row / 4) % 2) * 4; shingle < 16; shingle += 8) {
        fill(ctx, PALETTE.roofDark, px + shingle, py + row, 1, 3);
      }
    }
    if (!above) {
      // Faîtage : une arête claire qui capte la lumière du ciel.
      fill(ctx, PALETTE.ink, px, py, 16, 3);
      fill(ctx, PALETTE.stoneLight, px, py + 1, 16, 1);
      fill(ctx, PALETTE.sandLight, px + 2 + variant, py + 1, 4, 1);
    }
    if (!below) {
      // Avant-toit : le débord et son ombre portée.
      fill(ctx, PALETTE.woodDark, px, py + 12, 16, 2);
      fill(ctx, PALETTE.wood, px, py + 12, 16, 1);
      fill(ctx, PALETTE.ink, px, py + 14, 16, 2);
    }
    if (!left) {
      fill(ctx, PALETTE.roofDark, px, py, 2, 16);
      fill(ctx, PALETTE.ink, px, py, 1, 16);
    }
    if (!right) {
      fill(ctx, PALETTE.roofDark, px + 14, py, 2, 16);
      fill(ctx, PALETTE.ink, px + 15, py, 1, 16);
    }
  }

  /** Façade consciente de ses voisines : linteau, angles et soubassement. */
  private drawWall(ctx: CanvasRenderingContext2D, map: TileMap | undefined,
    x: number, y: number, px: number, py: number, variant: number): void {
    const above = this.isBuilding(map, x, y - 1);
    const below = this.isBuilding(map, x, y + 1);
    const left = this.isBuilding(map, x - 1, y);
    const right = this.isBuilding(map, x + 1, y);

    fill(ctx, PALETTE.sandDark, px, py, 16, 16);
    fill(ctx, PALETTE.sandLight, px + 1, py + 1, 14, 14);
    // Colombage : deux ou trois poutres, jamais aux mêmes places.
    fill(ctx, PALETTE.woodDark, px + 3 + variant * 3, py, 2, 16);
    if (variant % 2 === 0) fill(ctx, PALETTE.woodDark, px + 11, py, 2, 16);
    fill(ctx, PALETTE.cream, px + 2, py + 2, 4, 2);

    if (!above) {
      fill(ctx, PALETTE.woodDark, px, py, 16, 3);
      fill(ctx, PALETTE.wood, px, py + 1, 16, 1);
    }
    if (!below) {
      // Soubassement de pierre : la maison touche le sol au lieu de flotter.
      fill(ctx, PALETTE.stoneDark, px, py + 11, 16, 5);
      fill(ctx, PALETTE.stone, px + 1, py + 11, 14, 3);
      fill(ctx, PALETTE.stoneLight, px + 2, py + 11, 4, 1);
      fill(ctx, PALETTE.ink, px, py + 15, 16, 1);
    }
    if (!left) fill(ctx, PALETTE.woodDark, px, py, 2, 16);
    if (!right) fill(ctx, PALETTE.woodDark, px + 14, py, 2, 16);
  }
}
