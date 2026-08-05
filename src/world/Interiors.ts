import type { Vec2 } from "../entities/Entity";
import type { LayerName, TiledLayer, TiledMapData } from "./TileMap";
import { TILE } from "./TileSet";

export type InteriorKind = "cottage" | "hermitage" | "castle" | "tower";

/**
 * Intérieurs entièrement en tuiles.
 *
 * Les pièces étaient auparavant peintes à la main en coordonnées absolues,
 * par-dessus une carte de tuiles quasi vide : rien n'était solide, rien ne
 * recevait la lumière, et la moindre modification de la fenêtre décalait tout
 * le mobilier. Chaque meuble est désormais une tuile comme une autre — donc
 * bloquante, éclairée et déplaçable d'une ligne de code.
 */
/**
 * La pièce tient presque exactement dans la fenêtre : 384×224 pour 384×216.
 * Une salle plus haute obligeait la caméra à défiler, et l'on n'en voyait
 * jamais que le plancher — un intérieur doit se lire d'un seul tableau.
 */
const WIDTH = 24;
const HEIGHT = 14;
const at = (x: number, y: number): number => y * WIDTH + x;

export const INTERIOR_WIDTH = WIDTH;
export const INTERIOR_HEIGHT = HEIGHT;
export const INTERIOR_PIXEL_WIDTH = WIDTH * 16;
export const INTERIOR_PIXEL_HEIGHT = HEIGHT * 16;

/** Seuil de sortie, au bas de la pièce. */
export const INTERIOR_EXIT = { x: WIDTH * 8 - 8, y: (HEIGHT - 2) * 16 } as const;
export const INTERIOR_ENTRY = { x: WIDTH * 8 - 8, y: (HEIGHT - 4) * 16 } as const;

/** Anciens noms, conservés le temps que tout le code bascule. */
export const COTTAGE_EXIT = INTERIOR_EXIT;
export const COTTAGE_ENTRY = INTERIOR_ENTRY;

type Layers = Record<LayerName, number[]>;

function roomLayers(floorTile: number, wallTile: number): Layers {
  const layers: Layers = {
    ground: new Array<number>(WIDTH * HEIGHT).fill(floorTile),
    terrain: new Array<number>(WIDTH * HEIGHT).fill(0),
    decor_below: new Array<number>(WIDTH * HEIGHT).fill(0),
    decor_above: new Array<number>(WIDTH * HEIGHT).fill(0),
  };
  for (let x = 0; x < WIDTH; x += 1) {
    layers.terrain[at(x, 0)] = wallTile;
    layers.terrain[at(x, 1)] = wallTile;
    layers.terrain[at(x, HEIGHT - 1)] = wallTile;
  }
  for (let y = 2; y < HEIGHT - 1; y += 1) {
    layers.terrain[at(0, y)] = wallTile;
    layers.terrain[at(WIDTH - 1, y)] = wallTile;
  }
  const doorX = Math.floor(WIDTH / 2);
  layers.terrain[at(doorX - 1, HEIGHT - 1)] = TILE.door;
  layers.terrain[at(doorX, HEIGHT - 1)] = TILE.door;
  return layers;
}

function put(layers: Layers, layer: LayerName, x: number, y: number, tile: number): void {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  layers[layer][at(x, y)] = tile;
}

function fillRect(layers: Layers, layer: LayerName, left: number, top: number,
  width: number, height: number, tile: number): void {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) put(layers, layer, x, y, tile);
  }
}

function tiled(layers: Layers): TiledMapData {
  const tiledLayers = (Object.keys(layers) as LayerName[]).map((name): TiledLayer => ({
    name, width: WIDTH, height: HEIGHT, data: layers[name],
  }));
  return { width: WIDTH, height: HEIGHT, tilewidth: 16, tileheight: 16, layers: tiledLayers };
}

export function createCottageMap(): TiledMapData {
  const layers = roomLayers(TILE.woodFloor, TILE.interiorWall);
  fillRect(layers, "ground", 8, 5, 8, 6, TILE.rug);
  put(layers, "terrain", 2, 2, TILE.fireplace);
  put(layers, "terrain", 3, 2, TILE.fireplace);
  put(layers, "terrain", 6, 2, TILE.bookshelf);
  put(layers, "terrain", 7, 2, TILE.bookshelf);
  put(layers, "terrain", 11, 2, TILE.window);
  put(layers, "terrain", 12, 2, TILE.window);
  put(layers, "terrain", 19, 2, TILE.bed);
  put(layers, "terrain", 20, 2, TILE.bed);
  put(layers, "terrain", 11, 6, TILE.table);
  put(layers, "terrain", 12, 6, TILE.table);
  put(layers, "terrain", 10, 6, TILE.chair);
  put(layers, "terrain", 13, 6, TILE.chair);
  put(layers, "terrain", 2, 10, TILE.barrel);
  put(layers, "terrain", 3, 10, TILE.crate);
  put(layers, "terrain", 21, 9, TILE.crate);
  put(layers, "decor_below", 5, 11, TILE.flowerPatch);
  put(layers, "decor_below", 18, 11, TILE.flowerPatch);
  return tiled(layers);
}

export function createHermitageMap(): TiledMapData {
  const layers = roomLayers(TILE.crackedPath, TILE.cliff);
  fillRect(layers, "ground", 7, 4, 10, 7, TILE.woodFloor);
  put(layers, "terrain", 20, 2, TILE.fireplace);
  put(layers, "terrain", 21, 2, TILE.fireplace);
  put(layers, "terrain", 2, 2, TILE.bookshelf);
  put(layers, "terrain", 3, 2, TILE.bookshelf);
  put(layers, "terrain", 4, 2, TILE.bookshelf);
  put(layers, "terrain", 9, 2, TILE.window);
  put(layers, "terrain", 14, 2, TILE.window);
  put(layers, "terrain", 10, 6, TILE.table);
  put(layers, "terrain", 11, 6, TILE.table);
  put(layers, "terrain", 12, 6, TILE.table);
  put(layers, "terrain", 11, 8, TILE.chair);
  put(layers, "terrain", 2, 9, TILE.crate);
  put(layers, "terrain", 3, 9, TILE.barrel);
  put(layers, "terrain", 20, 9, TILE.bed);
  put(layers, "decor_below", 6, 11, TILE.mushroom);
  put(layers, "decor_below", 17, 4, TILE.mushroom);
  return tiled(layers);
}

export function createCastleMap(): TiledMapData {
  const layers = roomLayers(TILE.crackedPath, TILE.cliff);
  fillRect(layers, "ground", 10, 2, 4, 11, TILE.rug);
  for (const x of [4, 7, 16, 19]) {
    put(layers, "terrain", x, 4, TILE.ruinColumn);
    put(layers, "terrain", x, 10, TILE.ruinColumn);
    put(layers, "decor_above", x, 3, TILE.archTop);
    put(layers, "decor_above", x, 9, TILE.archTop);
  }
  put(layers, "terrain", 11, 2, TILE.table);
  put(layers, "terrain", 12, 2, TILE.table);
  put(layers, "terrain", 5, 2, TILE.brazier);
  put(layers, "terrain", 18, 2, TILE.brazier);
  put(layers, "terrain", 2, 7, TILE.brazier);
  put(layers, "terrain", 21, 7, TILE.brazier);
  put(layers, "decor_above", 8, 1, TILE.banner);
  put(layers, "decor_above", 15, 1, TILE.banner);
  return tiled(layers);
}

export function createTowerMap(): TiledMapData {
  const layers = roomLayers(TILE.woodFloor, TILE.interiorWall);
  fillRect(layers, "ground", 9, 4, 6, 8, TILE.rug);
  put(layers, "terrain", 2, 2, TILE.bookshelf);
  put(layers, "terrain", 3, 2, TILE.bookshelf);
  put(layers, "terrain", 4, 2, TILE.bookshelf);
  put(layers, "terrain", 19, 2, TILE.bookshelf);
  put(layers, "terrain", 20, 2, TILE.bookshelf);
  put(layers, "terrain", 21, 2, TILE.bookshelf);
  put(layers, "terrain", 11, 2, TILE.window);
  put(layers, "terrain", 12, 2, TILE.window);
  put(layers, "terrain", 11, 5, TILE.fireplace);
  put(layers, "terrain", 12, 5, TILE.fireplace);
  put(layers, "terrain", 4, 7, TILE.shrineStone);
  put(layers, "terrain", 19, 7, TILE.shrineStone);
  put(layers, "terrain", 2, 10, TILE.barrel);
  put(layers, "terrain", 21, 10, TILE.crate);
  put(layers, "decor_below", 7, 9, TILE.mushroom);
  put(layers, "decor_below", 16, 11, TILE.mushroom);
  put(layers, "decor_above", 6, 1, TILE.banner);
  put(layers, "decor_above", 17, 1, TILE.banner);
  return tiled(layers);
}

/**
 * Maison de villageois.
 *
 * Toutes les portes du monde s'ouvrent désormais, et pas seulement les
 * quatre lieux scénarisés : entrer chez les gens est la première chose qu'on
 * essaie dans un village. Chaque logis est meublé à partir de sa graine — la
 * même porte rend toujours la même pièce — et le tirage choisit un métier,
 * qui décide du mobilier.
 */
export type HouseTrade = "logis" | "atelier" | "auberge" | "echoppe";

export const HOUSE_TRADES: readonly HouseTrade[] = ["logis", "atelier", "auberge", "echoppe"];

export const HOUSE_LABELS: Readonly<Record<HouseTrade, string>> = {
  logis: "MAISON DU VILLAGE",
  atelier: "ATELIER",
  auberge: "AUBERGE",
  echoppe: "ÉCHOPPE",
};

export function houseTradeFor(seed: number): HouseTrade {
  return HOUSE_TRADES[Math.abs(seed) % HOUSE_TRADES.length]!;
}

export function createHouseMap(seed: number): TiledMapData {
  const trade = houseTradeFor(seed);
  const warm = trade === "auberge" || trade === "logis";
  const layers = roomLayers(TILE.woodFloor, TILE.interiorWall);
  const pick = (offset: number, span: number): number => Math.abs((seed >> offset) % span);

  // Âtre : toujours présent, jamais au même mur.
  const hearthX = 2 + pick(2, 3);
  put(layers, "terrain", hearthX, 2, TILE.fireplace);
  put(layers, "terrain", hearthX + 1, 2, TILE.fireplace);
  put(layers, "terrain", WIDTH - 4 - pick(5, 3), 2, TILE.window);
  put(layers, "terrain", 9 + pick(7, 3), 2, TILE.window);

  if (warm) fillRect(layers, "ground", 8 + pick(3, 3), 5, 7, 5, TILE.rug);

  if (trade === "auberge") {
    // Une auberge, ce sont des lits alignés et de longues tables.
    for (const x of [3, 6, 17, 20]) {
      put(layers, "terrain", x, 4, TILE.bed);
      put(layers, "terrain", x, 9, TILE.bed);
    }
    for (let x = 10; x <= 13; x += 1) put(layers, "terrain", x, 7, TILE.table);
    put(layers, "terrain", 9, 7, TILE.chair);
    put(layers, "terrain", 14, 7, TILE.chair);
    put(layers, "terrain", 2, 11, TILE.barrel);
    put(layers, "terrain", 3, 11, TILE.barrel);
  } else if (trade === "atelier") {
    for (let x = 3; x <= 6; x += 1) put(layers, "terrain", x, 6, TILE.table);
    put(layers, "terrain", 3, 8, TILE.crate);
    put(layers, "terrain", 5, 8, TILE.barrel);
    put(layers, "terrain", 18, 5, TILE.bookshelf);
    put(layers, "terrain", 19, 5, TILE.bookshelf);
    put(layers, "terrain", 20, 9, TILE.bed);
    put(layers, "decor_below", 12, 9, TILE.pebbles);
  } else if (trade === "echoppe") {
    for (let x = 8; x <= 15; x += 1) put(layers, "terrain", x, 5, TILE.table);
    for (const x of [3, 4, 19, 20]) {
      put(layers, "terrain", x, 3, TILE.crate);
      put(layers, "terrain", x, 4, TILE.barrel);
    }
    put(layers, "terrain", 21, 10, TILE.bed);
    put(layers, "decor_below", 11, 9, TILE.flowerPatch);
  } else {
    put(layers, "terrain", 19 + pick(11, 2), 4, TILE.bed);
    put(layers, "terrain", 11, 7, TILE.table);
    put(layers, "terrain", 12, 7, TILE.table);
    put(layers, "terrain", 10, 7, TILE.chair);
    put(layers, "terrain", 13, 7, TILE.chair);
    put(layers, "terrain", 3, 10, TILE.barrel);
    put(layers, "terrain", 20, 10, TILE.crate);
    put(layers, "decor_below", 6, 11, TILE.flowerPatch);
    put(layers, "decor_below", 17, 11, TILE.flowerPatch);
  }

  put(layers, "terrain", 2 + pick(13, 2), 5, TILE.bookshelf);
  return tiled(layers);
}

export function createInteriorMap(kind: InteriorKind): TiledMapData {
  if (kind === "cottage") return createCottageMap();
  if (kind === "hermitage") return createHermitageMap();
  if (kind === "tower") return createTowerMap();
  return createCastleMap();
}

export function nearInteriorExit(position: Readonly<Vec2>): boolean {
  return Math.hypot(position.x - INTERIOR_EXIT.x, position.y - INTERIOR_EXIT.y) <= 34;
}

/** Ancien nom, conservé le temps que tout le code bascule. */
export const nearCottageExit = nearInteriorExit;

export const INTERIOR_NAMES: Readonly<Record<InteriorKind, string>> = {
  cottage: "MAISON DU DOYEN",
  hermitage: "ERMITAGE DE GORM",
  castle: "CHÂTEAU DE CENDRE",
  tower: "TOUR DE LUNE",
};
