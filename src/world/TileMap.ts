import { TILE_SIZE } from "../core/Renderer";
import type { Camera } from "../core/Camera";
import type { TileSet } from "./TileSet";

export type LayerName = "ground" | "terrain" | "decor_below" | "decor_above";

export const LAYER_ORDER: readonly LayerName[] = ["ground", "terrain", "decor_below", "decor_above"];

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

interface AnimatedTile { readonly layer: LayerName; readonly x: number; readonly y: number }

/**
 * Une carte de zone et son rendu.
 *
 * Le rendu redessinait chaque tuile de chaque couche à chaque image : une zone
 * de 32×28 en quatre couches, c'est 3 584 tuiles et plusieurs dizaines de
 * milliers d'appels canvas par frame. Les couches fixes sont désormais
 * composées une seule fois dans un tampon hors écran, puis recopiées par
 * rectangle ; seules les tuiles réellement animées (eau, flammes) sont
 * repeintes.
 */
export class TileMap {
  readonly width: number;
  readonly height: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  private readonly byName = new Map<LayerName, TiledLayer>();
  private readonly solidMask: Uint8Array;
  /** Cases qu'une coque peut franchir : l'inverse presque exact du sol. */
  private readonly sailMask: Uint8Array;
  private readonly waterMask: Uint8Array;
  private readonly harmMask: Uint8Array;
  private readonly slowMask: Float32Array;

  private baseCanvas: HTMLCanvasElement | null = null;
  private overCanvas: HTMLCanvasElement | null = null;
  private animated: readonly AnimatedTile[] = [];

  constructor(readonly data: TiledMapData, readonly tileSet: TileSet) {
    this.width = data.width;
    this.height = data.height;
    this.pixelWidth = this.width * TILE_SIZE;
    this.pixelHeight = this.height * TILE_SIZE;
    for (const layer of data.layers) {
      if (layer.data.length !== this.width * this.height) {
        throw new Error(`Couche ${layer.name} invalide: ${layer.data.length} tuiles.`);
      }
      this.byName.set(layer.name, layer);
    }

    const count = this.width * this.height;
    this.solidMask = new Uint8Array(count);
    this.sailMask = new Uint8Array(count);
    this.waterMask = new Uint8Array(count);
    this.harmMask = new Uint8Array(count);
    this.slowMask = new Float32Array(count).fill(1);
    for (let index = 0; index < count; index += 1) {
      const x = index % this.width;
      const y = Math.floor(index / this.width);
      let solid = false;
      let water = false;
      let sailable = false;
      let harm = 0;
      let slow = 1;
      for (const name of LAYER_ORDER) {
        if (name === "decor_above") continue;
        const properties = tileSet.properties(this.tileAt(name, x, y));
        // L'eau profonde bloque la marche autant qu'un rocher : c'est ce qui
        // donne son intérêt à la barque, et une vraie rive au lac.
        if (properties.solid || properties.deep) solid = true;
        if (properties.water) water = true;
        if (properties.sailable) sailable = true;
        // Un obstacle posé sur l'eau (récif, épave) interdit aussi la coque.
        if (properties.solid) sailable = false;
        if (properties.harm) harm = Math.max(harm, properties.harm);
        if (properties.slow !== undefined) slow = Math.min(slow, properties.slow);
      }
      this.solidMask[index] = solid ? 1 : 0;
      this.sailMask[index] = sailable ? 1 : 0;
      this.waterMask[index] = water ? 1 : 0;
      this.harmMask[index] = harm;
      this.slowMask[index] = slow;
    }
  }

  tileAt(layerName: LayerName, x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.byName.get(layerName)?.data[y * this.width + x] ?? 0;
  }

  isSolid(x: number, y: number): boolean {
    // Hors carte = libre, volontairement. Chaque zone porte une ceinture de
    // décor plein percée seulement à ses passages : c'est elle qui contient le
    // joueur. Rendre l'extérieur bloquant l'empêchait de poser le pied sur la
    // dernière colonne, donc de franchir la frontière — le changement de zone
    // ne se déclenchait jamais tout à fait.
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.solidMask[y * this.width + x] === 1;
  }

  /** Obstacle pour une coque : toute la terre ferme, plus les récifs. */
  isSolidForSailing(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.sailMask[y * this.width + x] === 0;
  }

  /** Solidité selon le mode de déplacement courant. */
  solidFor(x: number, y: number, sailing: boolean): boolean {
    return sailing ? this.isSolidForSailing(x, y) : this.isSolid(x, y);
  }

  isWater(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.waterMask[y * this.width + x] === 1;
  }

  /** Vrai si une coque peut flotter là : sert à embarquer et à accoster. */
  isSailable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.sailMask[y * this.width + x] === 1;
  }

  /** Dégâts du sol — la lave, pour l'instant. */
  harmAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.harmMask[y * this.width + x]!;
  }

  /** Facteur de vitesse du sol : la boue et la neige freinent, l'eau davantage. */
  slowAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 1;
    return this.slowMask[y * this.width + x]!;
  }

  slowAtPixel(px: number, py: number): number {
    return this.slowAt(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
  }

  isBurnable(x: number, y: number): boolean {
    return LAYER_ORDER.some((layer) => this.tileSet.properties(this.tileAt(layer, x, y)).burnable === true);
  }

  /**
   * Masque des voisins partageant une propriété, dans l'ordre N/E/S/O.
   * Sert au raccord des rives et au liseré d'ombre des falaises.
   */
  neighbourMask(x: number, y: number, match: (tileX: number, tileY: number) => boolean): number {
    return (match(x, y - 1) ? 1 : 0)
      | (match(x + 1, y) ? 2 : 0)
      | (match(x, y + 1) ? 4 : 0)
      | (match(x - 1, y) ? 8 : 0);
  }

  /** Dessine les couches situées sous les entités. */
  drawBase(ctx: CanvasRenderingContext2D, camera: Camera, frame: number): void {
    this.ensurePrerender();
    if (this.baseCanvas) ctx.drawImage(this.baseCanvas, 0, 0);
    for (const tile of this.animated) {
      if (tile.layer === "decor_above") continue;
      if (!camera.isVisible(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE, TILE_SIZE)) continue;
      this.tileSet.draw(ctx, this.tileAt(tile.layer, tile.x, tile.y), tile.x, tile.y, frame, this);
    }
  }

  /** Dessine la canopée et tout ce qui passe devant les entités. */
  drawOver(ctx: CanvasRenderingContext2D, camera: Camera, frame: number): void {
    this.ensurePrerender();
    if (this.overCanvas) ctx.drawImage(this.overCanvas, 0, 0);
    for (const tile of this.animated) {
      if (tile.layer !== "decor_above") continue;
      if (!camera.isVisible(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE, TILE_SIZE)) continue;
      this.tileSet.draw(ctx, this.tileAt(tile.layer, tile.x, tile.y), tile.x, tile.y, frame, this);
    }
  }

  /** Rendu ancien format, conservé pour les outils et les tests. */
  drawLayer(ctx: CanvasRenderingContext2D, layerName: LayerName, frame = 0): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        this.tileSet.draw(ctx, this.tileAt(layerName, x, y), x, y, frame, this);
      }
    }
  }

  private ensurePrerender(): void {
    if (this.baseCanvas || typeof document === "undefined") return;
    const animated: AnimatedTile[] = [];
    this.baseCanvas = this.composite(["ground", "terrain", "decor_below"], animated);
    this.overCanvas = this.composite(["decor_above"], animated);
    this.animated = animated;
  }

  private composite(layers: readonly LayerName[], animated: AnimatedTile[]): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = this.pixelWidth;
    canvas.height = this.pixelHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    for (const layer of layers) {
      for (let y = 0; y < this.height; y += 1) {
        for (let x = 0; x < this.width; x += 1) {
          const id = this.tileAt(layer, x, y);
          if (id === 0) continue;
          this.tileSet.draw(ctx, id, x, y, 0, this);
          if (this.tileSet.isAnimated(id)) animated.push({ layer, x, y });
        }
      }
    }
    if (layers.includes("terrain")) this.bakeContactShadows(ctx);
    return canvas;
  }

  /**
   * Ombre de contact sous les reliefs pleins. Un simple dégradé posé au pied
   * des murs et des arbres suffit à décoller le décor du sol — c'est ce qui
   * manquait le plus à l'image d'origine, plate comme une nappe.
   */
  private bakeContactShadows(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#0a0810";
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (!this.isSolid(x, y) || this.isSolid(x, y + 1)) continue;
        const px = x * TILE_SIZE;
        const py = (y + 1) * TILE_SIZE;
        ctx.fillRect(px, py, TILE_SIZE, 3);
        ctx.fillRect(px + 2, py + 3, TILE_SIZE - 4, 2);
      }
    }
    ctx.restore();
  }
}
