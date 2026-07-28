import type { Biome, WorldZoneData } from "../data/world";
import type { LayerName, TiledLayer, TiledMapData } from "./TileMap";

const WIDTH = 16;
const HEIGHT = 14;

function index(x: number, y: number): number { return y * WIDTH + x; }
function hash(x: number, y: number, seed: number): number {
  let value = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263) ^ seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

function groundTile(biome: Biome, x: number, y: number, seed: number): number {
  if (biome === "lake" || biome === "canal") {
    return x === 7 || x === 8 || y === 6 || y === 7 ? 3 : 5;
  }
  if (biome === "ruins" || biome === "cliffs" || biome === "peaks") {
    return x === 7 || x === 8 || y === 6 || y === 7 ? 3 : (hash(x, y, seed) % 3 === 0 ? 2 : 1);
  }
  if (biome === "marsh" || biome === "witch") return hash(x, y, seed) % 5 === 0 ? 5 : 2;
  if (biome === "fields") return (x + y) % 3 === 0 ? 3 : 1;
  return hash(x, y, seed) % 4 === 0 ? 2 : 1;
}

function obstacleTile(biome: Biome): number {
  if (biome === "forest" || biome === "peaks") return 6;
  if (biome === "ruins" || biome === "cliffs" || biome === "canal") return 4;
  if (biome === "marsh" || biome === "witch" || biome === "reeds") return 13;
  if (biome === "village" || biome === "fields") return 12;
  return 4;
}

function isExit(x: number, y: number): boolean {
  return ((y === 0 || y === HEIGHT - 1) && x >= 6 && x <= 9)
    || ((x === 0 || x === WIDTH - 1) && y >= 5 && y <= 8);
}

function isMainPath(x: number, y: number): boolean {
  return x === 7 || x === 8 || y === 6 || y === 7;
}

export function createProceduralMap(zone: WorldZoneData): TiledMapData {
  const seed = Math.imul(zone.x + 1, 92821) ^ Math.imul(zone.y + 1, 68917);
  const layers: Record<LayerName, number[]> = {
    ground: Array.from({ length: WIDTH * HEIGHT }, (_, offset) =>
      groundTile(zone.biome, offset % WIDTH, Math.floor(offset / WIDTH), seed)),
    terrain: new Array<number>(WIDTH * HEIGHT).fill(0),
    decor_below: new Array<number>(WIDTH * HEIGHT).fill(0),
    decor_above: new Array<number>(WIDTH * HEIGHT).fill(0),
  };
  const obstacle = obstacleTile(zone.biome);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const edge = x === 0 || x === WIDTH - 1 || y === 0 || y === HEIGHT - 1;
      if (edge && !isExit(x, y)) layers.terrain[index(x, y)] = obstacle;
      if (!edge && !isMainPath(x, y) && hash(x, y, seed) % 23 === 0) {
        layers.terrain[index(x, y)] = obstacle;
      }
      if (!edge && !isMainPath(x, y) && hash(x, y, seed + 71) % 29 === 0) {
        layers.decor_below[index(x, y)] = zone.biome === "forest" ? 11
          : zone.biome === "ruins" ? 4
            : zone.biome === "fields" ? 11
              : zone.biome === "lake" ? 5 : 11;
      }
    }
  }

  if (zone.biome === "forest" || zone.biome === "peaks") {
    for (let x = 1; x < WIDTH - 1; x += 3) {
      if (x < 6 || x > 9) layers.decor_above[index(x, 1)] = 6;
    }
  }
  if (zone.biome === "river") {
    for (let y = 1; y < HEIGHT - 1; y += 1) {
      layers.ground[index(7, y)] = 5;
      layers.ground[index(8, y)] = 5;
    }
    layers.terrain[index(7, 6)] = 3;
    layers.terrain[index(8, 6)] = 3;
    layers.terrain[index(7, 7)] = 3;
    layers.terrain[index(8, 7)] = 3;
  }
  if (zone.biome === "ruins") {
    layers.terrain[index(6, 5)] = 16;
    layers.terrain[index(9, 5)] = 16;
    layers.terrain[index(6, 8)] = 16;
    layers.terrain[index(9, 8)] = 16;
  }

  const tiledLayers = (Object.keys(layers) as LayerName[]).map((name): TiledLayer => ({
    name, width: WIDTH, height: HEIGHT, data: layers[name],
  }));
  return { width: WIDTH, height: HEIGHT, tilewidth: 16, tileheight: 16, layers: tiledLayers };
}
