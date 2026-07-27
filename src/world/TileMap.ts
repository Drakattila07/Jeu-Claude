import type { TileSet } from "./TileSet";

export type LayerName = "ground" | "terrain" | "decor_below" | "decor_above";

export interface TiledLayer {
  readonly name: LayerName;
  readonly width: number;
  readonly height: number;
  readonly data: readonly number[];
}

export interface TiledMapData {
  readonly width: number;
  readonly height: number;
  readonly tilewidth: 16;
  readonly tileheight: 16;
  readonly layers: readonly TiledLayer[];
}

export class TileMap {
  readonly width: number;
  readonly height: number;
  private readonly byName = new Map<LayerName, TiledLayer>();

  constructor(readonly data: TiledMapData, readonly tileSet: TileSet) {
    this.width = data.width;
    this.height = data.height;
    for (const layer of data.layers) {
      if (layer.data.length !== this.width * this.height) {
        throw new Error(`Couche ${layer.name} invalide: ${layer.data.length} tuiles.`);
      }
      this.byName.set(layer.name, layer);
    }
  }

  tileAt(layerName: LayerName, x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.byName.get(layerName)?.data[y * this.width + x] ?? 0;
  }

  drawLayer(ctx: CanvasRenderingContext2D, layerName: LayerName): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        this.tileSet.draw(ctx, this.tileAt(layerName, x, y), x, y);
      }
    }
  }

  isSolid(x: number, y: number): boolean {
    return this.tileSet.properties(this.tileAt("terrain", x, y)).solid === true
      || this.tileSet.properties(this.tileAt("decor_below", x, y)).solid === true;
  }
}
