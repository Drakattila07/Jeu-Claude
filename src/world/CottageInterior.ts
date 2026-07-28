import { PALETTE } from "../data/palette";
import type { Vec2 } from "../entities/Entity";
import type { LayerName, TiledLayer, TiledMapData } from "./TileMap";

export type InteriorKind = "cottage" | "hermitage";

const WIDTH = 16;
const HEIGHT = 14;
const at = (x: number, y: number): number => y * WIDTH + x;

export const COTTAGE_EXIT = { x: 120, y: 176 } as const;
export const COTTAGE_ENTRY = { x: 120, y: 160 } as const;

function roomLayers(floorTile: number, wallTile: number): Record<LayerName, number[]> {
  const layers: Record<LayerName, number[]> = {
    ground: new Array<number>(WIDTH * HEIGHT).fill(floorTile),
    terrain: new Array<number>(WIDTH * HEIGHT).fill(0),
    decor_below: new Array<number>(WIDTH * HEIGHT).fill(0),
    decor_above: new Array<number>(WIDTH * HEIGHT).fill(0),
  };
  for (let x = 0; x < WIDTH; x += 1) {
    layers.terrain[at(x, 0)] = wallTile;
    layers.terrain[at(x, 1)] = wallTile;
    layers.terrain[at(x, 13)] = wallTile;
  }
  for (let y = 2; y < HEIGHT - 1; y += 1) {
    layers.terrain[at(0, y)] = wallTile;
    layers.terrain[at(15, y)] = wallTile;
  }
  layers.terrain[at(7, 12)] = 14;
  layers.terrain[at(8, 12)] = 14;
  return layers;
}

function block(layers: Record<LayerName, number[]>, left: number, top: number,
  width: number, height: number): void {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) layers.terrain[at(x, y)] = 41;
  }
}

function tiled(layers: Record<LayerName, number[]>): TiledMapData {
  const tiledLayers = (Object.keys(layers) as LayerName[]).map((name): TiledLayer => ({
    name, width: WIDTH, height: HEIGHT, data: layers[name],
  }));
  return { width: WIDTH, height: HEIGHT, tilewidth: 16, tileheight: 16, layers: tiledLayers };
}

export function createCottageMap(): TiledMapData {
  const layers = roomLayers(32, 33);
  block(layers, 2, 3, 3, 3);
  block(layers, 11, 2, 3, 3);
  block(layers, 6, 6, 4, 3);
  return tiled(layers);
}

export function createHermitageMap(): TiledMapData {
  const layers = roomLayers(31, 19);
  block(layers, 2, 3, 3, 2);
  block(layers, 10, 3, 4, 2);
  block(layers, 6, 7, 4, 2);
  layers.decor_below[at(3, 8)] = 26;
  return tiled(layers);
}

export function nearCottageExit(position: Readonly<Vec2>): boolean {
  return Math.hypot(position.x - COTTAGE_EXIT.x, position.y - COTTAGE_EXIT.y) <= 28;
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number,
  width: number, height: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function drawFireplace(ctx: CanvasRenderingContext2D, frame: number, x: number, y: number): void {
  const flicker = Math.floor(frame / 9) % 2;
  rect(ctx, PALETTE.stoneDark, x, y, 48, 34);
  rect(ctx, PALETTE.stone, x + 3, y + 3, 42, 31);
  rect(ctx, PALETTE.stoneLight, x, y, 48, 6);
  rect(ctx, PALETTE.ink, x + 10, y + 11, 28, 23);
  rect(ctx, PALETTE.woodDark, x + 12, y + 28, 24, 4);
  rect(ctx, PALETTE.red, x + 15 + flicker * 2, y + 17, 18 - flicker * 3, 13);
  rect(ctx, PALETTE.yellow, x + 20 - flicker, y + 18, 9, 11);
  rect(ctx, PALETTE.cream, x + 23, y + 21, 4, 6);
}

export function drawCottageInterior(ctx: CanvasRenderingContext2D, frame: number): void {
  ctx.save();

  rect(ctx, PALETTE.roofDark, 78, 91, 100, 70);
  rect(ctx, PALETTE.roof, 82, 95, 92, 62);
  rect(ctx, PALETTE.yellow, 86, 99, 84, 4);
  rect(ctx, PALETTE.yellow, 86, 149, 84, 4);
  for (let x = 91; x < 166; x += 16) {
    rect(ctx, PALETTE.cream, x, 108, 8, 8);
    rect(ctx, PALETTE.purple, x + 2, 110, 4, 4);
    rect(ctx, PALETTE.cream, x + 8, 132, 8, 8);
  }

  rect(ctx, PALETTE.woodDark, 28, 49, 49, 51);
  rect(ctx, PALETTE.woodLight, 32, 53, 41, 43);
  rect(ctx, PALETTE.white, 35, 56, 34, 13);
  rect(ctx, PALETTE.cream, 39, 58, 17, 8);
  rect(ctx, PALETTE.roofDark, 35, 69, 34, 23);
  rect(ctx, PALETTE.roof, 39, 72, 27, 16);
  rect(ctx, PALETTE.yellow, 43, 76, 5, 5);

  rect(ctx, PALETTE.woodDark, 176, 38, 49, 62);
  rect(ctx, PALETTE.wood, 181, 42, 39, 54);
  for (let y = 55; y <= 84; y += 15) rect(ctx, PALETTE.woodLight, 181, y, 39, 4);
  const books = [PALETTE.roof, PALETTE.water, PALETTE.leafDark, PALETTE.purple, PALETTE.yellow];
  for (let shelf = 0; shelf < 3; shelf += 1) {
    for (let book = 0; book < 5; book += 1) {
      rect(ctx, books[(book + shelf) % books.length]!, 184 + book * 7, 45 + shelf * 15,
        5, 9 + ((book + shelf) % 3));
    }
  }

  drawFireplace(ctx, frame, 104, 26);

  rect(ctx, PALETTE.woodDark, 94, 108, 68, 35);
  rect(ctx, PALETTE.woodLight, 98, 104, 60, 28);
  rect(ctx, PALETTE.wood, 102, 109, 52, 18);
  rect(ctx, PALETTE.cream, 117, 102, 23, 9);
  rect(ctx, PALETTE.water, 121, 104, 15, 5);
  rect(ctx, PALETTE.yellow, 125, 103, 7, 3);
  rect(ctx, PALETTE.woodDark, 99, 132, 8, 19);
  rect(ctx, PALETTE.woodDark, 149, 132, 8, 19);

  rect(ctx, PALETTE.woodDark, 73, 113, 15, 27);
  rect(ctx, PALETTE.woodLight, 76, 116, 9, 15);
  rect(ctx, PALETTE.woodDark, 168, 113, 15, 27);
  rect(ctx, PALETTE.woodLight, 171, 116, 9, 15);

  rect(ctx, PALETTE.woodDark, 36, 126, 31, 18);
  rect(ctx, PALETTE.sand, 40, 122, 23, 18);
  rect(ctx, PALETTE.leafDark, 47, 112, 4, 13);
  rect(ctx, PALETTE.leafLight, 39, 112, 12, 7);
  rect(ctx, PALETTE.leaf, 50, 108, 11, 9);

  const pulse = Math.floor(frame / 18) % 2;
  ctx.globalAlpha = pulse === 0 ? 0.06 : 0.09;
  rect(ctx, PALETTE.yellow, 76, 34, 104, 74);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawHermitageInterior(ctx: CanvasRenderingContext2D, frame: number): void {
  ctx.save();
  rect(ctx, PALETTE.purple, 77, 111, 101, 42);
  rect(ctx, PALETTE.roofDark, 82, 115, 91, 34);
  for (let x = 86; x < 170; x += 14) rect(ctx, PALETTE.stoneLight, x, 121, 7, 4);

  rect(ctx, PALETTE.woodDark, 27, 51, 51, 38);
  rect(ctx, PALETTE.stone, 31, 55, 43, 30);
  rect(ctx, PALETTE.cream, 34, 58, 18, 10);
  rect(ctx, PALETTE.wood, 34, 69, 36, 12);

  drawFireplace(ctx, frame, 177, 42);

  rect(ctx, PALETTE.woodDark, 96, 55, 65, 34);
  rect(ctx, PALETTE.wood, 100, 51, 57, 28);
  rect(ctx, PALETTE.stoneLight, 108, 48, 20, 7);
  rect(ctx, PALETTE.yellow, 135, 55, 12, 4);
  rect(ctx, PALETTE.woodLight, 104, 63, 45, 3);
  rect(ctx, PALETTE.woodDark, 101, 79, 8, 17);
  rect(ctx, PALETTE.woodDark, 149, 79, 8, 17);

  rect(ctx, PALETTE.cream, 32, 117, 36, 30);
  rect(ctx, PALETTE.sandDark, 35, 120, 30, 24);
  rect(ctx, PALETTE.ink, 43, 126, 7, 2);
  rect(ctx, PALETTE.ink, 52, 132, 8, 2);
  rect(ctx, PALETTE.red, 39, 137, 5, 4);

  ctx.globalAlpha = 0.07;
  rect(ctx, PALETTE.yellow, 158, 38, 81, 66);
  ctx.globalAlpha = 1;
  ctx.restore();
}
