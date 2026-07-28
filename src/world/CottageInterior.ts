import { PALETTE } from "../data/palette";
import type { Vec2 } from "../entities/Entity";
import type { LayerName, TiledLayer, TiledMapData } from "./TileMap";

const WIDTH = 16;
const HEIGHT = 14;
const at = (x: number, y: number): number => y * WIDTH + x;

export const COTTAGE_EXIT = { x: 120, y: 176 } as const;
export const COTTAGE_ENTRY = { x: 120, y: 160 } as const;

export function createCottageMap(): TiledMapData {
  const layers: Record<LayerName, number[]> = {
    ground: new Array<number>(WIDTH * HEIGHT).fill(32),
    terrain: new Array<number>(WIDTH * HEIGHT).fill(0),
    decor_below: new Array<number>(WIDTH * HEIGHT).fill(0),
    decor_above: new Array<number>(WIDTH * HEIGHT).fill(0),
  };

  for (let x = 0; x < WIDTH; x += 1) {
    layers.terrain[at(x, 0)] = 33;
    layers.terrain[at(x, 1)] = 33;
    layers.terrain[at(x, 13)] = 33;
  }
  for (let y = 2; y < HEIGHT - 1; y += 1) {
    layers.terrain[at(0, y)] = 33;
    layers.terrain[at(15, y)] = 33;
  }

  layers.terrain[at(4, 1)] = 40;
  layers.terrain[at(11, 1)] = 40;
  layers.terrain[at(7, 1)] = 38;
  layers.terrain[at(8, 1)] = 38;

  layers.terrain[at(2, 3)] = 35;
  layers.terrain[at(3, 3)] = 35;
  layers.terrain[at(12, 3)] = 36;
  layers.terrain[at(13, 3)] = 36;
  layers.terrain[at(7, 6)] = 37;
  layers.terrain[at(8, 6)] = 37;
  layers.terrain[at(6, 6)] = 39;
  layers.terrain[at(9, 6)] = 39;

  for (let y = 7; y <= 9; y += 1) {
    for (let x = 6; x <= 9; x += 1) layers.decor_below[at(x, y)] = 34;
  }

  layers.terrain[at(7, 12)] = 14;
  layers.terrain[at(8, 12)] = 14;
  layers.decor_below[at(3, 8)] = 11;
  layers.decor_below[at(12, 9)] = 26;

  const tiledLayers = (Object.keys(layers) as LayerName[]).map((name): TiledLayer => ({
    name,
    width: WIDTH,
    height: HEIGHT,
    data: layers[name],
  }));
  return { width: WIDTH, height: HEIGHT, tilewidth: 16, tileheight: 16, layers: tiledLayers };
}

export function nearCottageExit(position: Readonly<Vec2>): boolean {
  return Math.hypot(position.x - COTTAGE_EXIT.x, position.y - COTTAGE_EXIT.y) <= 28;
}

export function drawCottageWarmth(ctx: CanvasRenderingContext2D, frame: number): void {
  ctx.save();
  const pulse = Math.floor(frame / 18) % 2;
  ctx.globalAlpha = pulse === 0 ? 0.07 : 0.1;
  ctx.fillStyle = PALETTE.yellow;
  ctx.fillRect(80, 34, 96, 44);
  ctx.fillRect(96, 78, 64, 24);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(104, 28, 48, 52);
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = PALETTE.yellow;
  const sparkY = 40 - (frame % 28);
  ctx.fillRect(122, sparkY, 1, 2);
  ctx.fillRect(141, 32 + ((frame + 11) % 24), 1, 1);
  ctx.restore();
}
