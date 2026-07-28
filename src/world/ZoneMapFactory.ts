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
  if (zone.biome === "peaks") {
    for (const ridgeY of [3, 9]) {
      for (let x = 1; x < WIDTH - 1; x += 1) {
        if (x >= 6 && x <= 9) continue;
        layers.terrain[index(x, ridgeY)] = 19;
        if ((x + ridgeY) % 3 === 0) layers.decor_above[index(x, ridgeY - 1)] = 24;
      }
      layers.decor_below[index(7, ridgeY)] = 16;
      layers.decor_below[index(8, ridgeY)] = 16;
    }
    for (let y = 1; y < HEIGHT - 1; y += 1) {
      const trailX = y < 5 ? 7 : y < 9 ? 8 : 7;
      for (const x of [trailX, trailX + 1]) {
        layers.ground[index(x, y)] = 31;
        layers.terrain[index(x, y)] = 0;
        layers.decor_below[index(x, y)] = 0;
      }
    }
    for (const [x, y] of [[2, 6], [3, 7], [12, 5], [13, 6], [4, 11], [11, 2]] as const) {
      if (!isMainPath(x, y)) layers.terrain[index(x, y)] = 29;
    }
  }
  if (zone.id === "boss_arena") {
    for (let y = 2; y <= 11; y += 1) {
      for (let x = 2; x <= 13; x += 1) {
        layers.ground[index(x, y)] = (x + y) % 3 === 0 ? 31 : 2;
        layers.terrain[index(x, y)] = 0;
        layers.decor_below[index(x, y)] = 0;
        layers.decor_above[index(x, y)] = 0;
      }
    }
    for (const [x, y] of [[2, 2], [13, 2], [2, 11], [13, 11]] as const) {
      layers.terrain[index(x, y)] = 29;
    }
  }
  if (zone.biome === "river") {
    const curve = [7, 7, 6, 5, 5, 6, 7, 8, 9, 10, 9, 8, 8, 8] as const;
    for (let y = 1; y < HEIGHT - 1; y += 1) {
      const center = curve[y]!;
      layers.ground[index(center - 2, y)] = 27;
      layers.ground[index(center - 1, y)] = 5;
      layers.ground[index(center, y)] = 5;
      layers.ground[index(center + 1, y)] = 5;
      layers.ground[index(center + 2, y)] = 27;
      for (let x = center - 2; x <= center + 2; x += 1) {
        layers.terrain[index(x, y)] = 0;
        layers.decor_below[index(x, y)] = 0;
      }
      if (y % 4 === 1) layers.decor_below[index(center + 2, y)] = 22;
    }
    for (let y = 6; y <= 7; y += 1) {
      const center = curve[y]!;
      for (let x = center - 2; x <= center + 2; x += 1) {
        if (zone.id === "riviere_pont") layers.ground[index(x, y)] = 28;
        else {
          layers.ground[index(x, y)] = 5;
          layers.decor_below[index(x, y)] = 16;
        }
      }
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
    for (let y = 3; y <= 10; y += 1) {
      for (let x = 3; x <= 12; x += 1) {
        layers.ground[index(x, y)] = 31;
        layers.terrain[index(x, y)] = 0;
        layers.decor_below[index(x, y)] = 0;
      }
    }
    for (const [x, y] of [[3, 3], [4, 3], [11, 3], [12, 3], [3, 4], [12, 4],
      [3, 8], [12, 8], [3, 9], [4, 9], [11, 9], [12, 9]] as const) {
      layers.terrain[index(x, y)] = 29;
    }
    layers.decor_below[index(5, 4)] = 16;
    layers.decor_below[index(10, 4)] = 16;
    layers.decor_below[index(5, 9)] = 16;
    layers.decor_below[index(10, 9)] = 16;
    if (zone.id === "grand_escalier") {
      for (let y = 3; y <= 10; y += 1) {
        layers.decor_below[index(6, y)] = 16;
        layers.decor_below[index(7, y)] = 16;
        layers.decor_below[index(8, y)] = 16;
        layers.decor_below[index(9, y)] = 16;
      }
    }
    if (zone.id === "cour_statues") {
      for (const [x, y] of [[5, 4], [10, 4], [5, 8], [10, 8], [3, 6], [12, 6]] as const) {
        layers.terrain[index(x, y)] = 29;
      }
    }
  }
  if (zone.biome === "cliffs") {
    for (const ridgeY of [3, 9]) {
      for (let x = 1; x < WIDTH - 1; x += 1) {
        if (x >= 6 && x <= 9) continue;
        layers.terrain[index(x, ridgeY)] = 19;
        if (x % 3 === 1 && ridgeY + 1 < HEIGHT - 1) {
          layers.decor_above[index(x, ridgeY + 1)] = 29;
        }
      }
      layers.decor_below[index(7, ridgeY)] = 16;
      layers.decor_below[index(8, ridgeY)] = 16;
    }
    for (let y = 1; y < HEIGHT - 1; y += 1) {
      const trailX = y < 6 ? 7 : y < 10 ? 8 : 7;
      layers.ground[index(trailX, y)] = 31;
      layers.ground[index(trailX + 1, y)] = 31;
      layers.terrain[index(trailX, y)] = 0;
      layers.terrain[index(trailX + 1, y)] = 0;
    }
  }
  if (zone.id === "ermitage_gorm") {
    for (let y = 1; y <= 6; y += 1) {
      for (let x = 8; x <= 14; x += 1) {
        layers.terrain[index(x, y)] = 0;
        layers.decor_below[index(x, y)] = 0;
        layers.decor_above[index(x, y)] = 0;
      }
    }
    for (let x = 9; x <= 13; x += 1) {
      layers.terrain[index(x, 2)] = 8;
      layers.terrain[index(x, 3)] = 8;
      layers.terrain[index(x, 4)] = 9;
    }
    layers.terrain[index(11, 4)] = 14;
    layers.terrain[index(13, 1)] = 4;
    layers.decor_below[index(9, 5)] = 15;
    layers.decor_below[index(13, 5)] = 25;
    layers.decor_below[index(10, 6)] = 31;
    layers.decor_below[index(11, 6)] = 31;
    layers.decor_below[index(12, 6)] = 31;
    for (let y = 5; y <= 8; y += 1) {
      layers.ground[index(11, y)] = 31;
      layers.ground[index(12, y)] = 31;
    }
    for (const [x, y] of [[2, 4], [3, 4], [2, 5], [4, 8], [3, 9]] as const) {
      layers.terrain[index(x, y)] = 29;
    }
  }

  const tiledLayers = (Object.keys(layers) as LayerName[]).map((name): TiledLayer => ({
    name, width: WIDTH, height: HEIGHT, data: layers[name],
  }));
  return { width: WIDTH, height: HEIGHT, tilewidth: 16, tileheight: 16, layers: tiledLayers };
}
