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
  if (isMainPath(x, y)) return biome === "ruins" || biome === "cliffs" ? 31 : 3;
  if (biome === "forest" || biome === "peaks") return hash(x, y, seed) % 5 === 0 ? 2 : 17;
  if (biome === "marsh" || biome === "witch" || biome === "reeds") {
    return hash(x, y, seed) % 7 === 0 ? 5 : 18;
  }
  if (biome === "ruins" || biome === "cliffs" || biome === "canal") {
    return hash(x, y, seed) % 3 === 0 ? 31 : 2;
  }
  if (biome === "fields") return hash(x, y, seed) % 4 === 0 ? 23 : 1;
  if (biome === "lake" || biome === "river") return hash(x, y, seed) % 5 === 0 ? 2 : 1;
  return hash(x, y, seed) % 4 === 0 ? 2 : 1;
}

function obstacleTile(biome: Biome): number {
  if (biome === "forest") return 6;
  if (biome === "peaks") return 24;
  if (biome === "ruins") return 29;
  if (biome === "cliffs" || biome === "canal") return 19;
  if (biome === "marsh" || biome === "reeds" || biome === "lake" || biome === "river") return 20;
  if (biome === "witch") return 25;
  if (biome === "village" || biome === "fields") return 12;
  return 4;
}

function decorTile(biome: Biome, x: number, y: number, seed: number): number {
  const roll = hash(x, y, seed + 71);
  if (biome === "forest" || biome === "peaks") return roll % 3 === 0 ? 26 : 11;
  if (biome === "ruins" || biome === "cliffs") return roll % 2 === 0 ? 21 : 29;
  if (biome === "fields") return roll % 2 === 0 ? 23 : 30;
  if (biome === "lake" || biome === "river") return roll % 2 === 0 ? 22 : 20;
  if (biome === "marsh" || biome === "reeds") return roll % 2 === 0 ? 20 : 26;
  if (biome === "witch") return roll % 2 === 0 ? 26 : 30;
  return roll % 3 === 0 ? 30 : 11;
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
        const decor = decorTile(zone.biome, x, y, seed);
        if (decor === 21 || decor === 29 || decor === 20) layers.terrain[index(x, y)] = decor;
        else layers.decor_below[index(x, y)] = decor;
      }
    }
  }

  if (zone.biome === "forest" || zone.biome === "peaks") {
    for (let x = 1; x < WIDTH - 1; x += 2) {
      if (x < 6 || x > 9) layers.decor_above[index(x, 1)] = zone.biome === "peaks" ? 24 : 6;
    }
  }
  if (zone.biome === "river") {
    for (let y = 1; y < HEIGHT - 1; y += 1) {
      layers.ground[index(6, y)] = 27;
      layers.ground[index(7, y)] = 5;
      layers.ground[index(8, y)] = 5;
      layers.ground[index(9, y)] = 27;
    }
    for (let x = 6; x <= 9; x += 1) {
      layers.ground[index(x, 6)] = 28;
      layers.ground[index(x, 7)] = 28;
    }
  }
  if (zone.biome === "lake") {
    for (let y = 2; y < HEIGHT - 2; y += 1) {
      for (let x = 10; x < WIDTH - 1; x += 1) {
        if (!isMainPath(x, y)) layers.ground[index(x, y)] = (x + y) % 5 === 0 ? 22 : 5;
      }
    }
  }
  if (zone.biome === "canal") {
    for (let y = 2; y < HEIGHT - 2; y += 1) {
      if (y !== 6 && y !== 7) {
        layers.ground[index(3, y)] = 27;
        layers.ground[index(4, y)] = 5;
        layers.ground[index(11, y)] = 5;
        layers.ground[index(12, y)] = 27;
      }
    }
    layers.ground[index(3, 6)] = 28;
    layers.ground[index(4, 6)] = 28;
    layers.ground[index(11, 6)] = 28;
    layers.ground[index(12, 6)] = 28;
    layers.ground[index(3, 7)] = 28;
    layers.ground[index(4, 7)] = 28;
    layers.ground[index(11, 7)] = 28;
    layers.ground[index(12, 7)] = 28;
  }
  if (zone.biome === "ruins") {
    layers.terrain[index(5, 4)] = 29;
    layers.terrain[index(10, 4)] = 29;
    layers.terrain[index(5, 9)] = 21;
    layers.terrain[index(10, 9)] = 21;
    layers.decor_below[index(6, 5)] = 16;
    layers.decor_below[index(9, 5)] = 16;
    layers.decor_below[index(6, 8)] = 16;
    layers.decor_below[index(9, 8)] = 16;
  }

  const tiledLayers = (Object.keys(layers) as LayerName[]).map((name): TiledLayer => ({
    name, width: WIDTH, height: HEIGHT, data: layers[name],
  }));
  return { width: WIDTH, height: HEIGHT, tilewidth: 16, tileheight: 16, layers: tiledLayers };
}
