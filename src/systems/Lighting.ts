import { VIEW_HEIGHT, VIEW_WIDTH, TILE_SIZE } from "../core/Renderer";
import type { Renderer } from "../core/Renderer";
import type { Camera } from "../core/Camera";
import type { TileMap } from "../world/TileMap";
import type { Weather } from "../core/Clock";
import type { Biome } from "../data/world";

export interface Light {
  /** Position monde. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  /** 0 → éteinte, 1 → pleine puissance. */
  readonly strength?: number;
}

interface Keyframe { readonly minute: number; readonly color: readonly [number, number, number] }

/**
 * Couleur ambiante au fil de la journée. Le jeu se contentait d'un voile noir
 * uniforme dès vingt heures ; on interpole ici une vraie courbe — l'aube
 * rosit, midi blanchit, le crépuscule cuivre, la nuit vire au bleu.
 */
const DAY_CURVE: readonly Keyframe[] = [
  { minute: 0, color: [56, 68, 122] },
  { minute: 4 * 60, color: [62, 74, 130] },
  { minute: 5 * 60 + 30, color: [128, 104, 138] },
  { minute: 6 * 60 + 30, color: [206, 162, 140] },
  { minute: 8 * 60, color: [250, 240, 224] },
  { minute: 12 * 60, color: [255, 252, 244] },
  { minute: 16 * 60, color: [252, 238, 214] },
  { minute: 18 * 60, color: [232, 176, 132] },
  { minute: 19 * 60 + 30, color: [156, 116, 132] },
  { minute: 21 * 60, color: [70, 78, 132] },
  { minute: 24 * 60, color: [56, 68, 122] },
];

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function ambientAt(minuteOfDay: number): readonly [number, number, number] {
  const minute = ((minuteOfDay % 1440) + 1440) % 1440;
  for (let index = 0; index < DAY_CURVE.length - 1; index += 1) {
    const from = DAY_CURVE[index]!;
    const to = DAY_CURVE[index + 1]!;
    if (minute < from.minute || minute > to.minute) continue;
    const span = Math.max(1, to.minute - from.minute);
    const t = (minute - from.minute) / span;
    return [
      lerp(from.color[0], to.color[0], t),
      lerp(from.color[1], to.color[1], t),
      lerp(from.color[2], to.color[2], t),
    ];
  }
  return DAY_CURVE[0]!.color;
}

/** Teinte propre au milieu : la forêt verdit, les sommets bleuissent. */
function biomeTint(biome: Biome | undefined): readonly [number, number, number] {
  switch (biome) {
    case "forest": return [0.93, 1.0, 0.9];
    case "peaks": return [0.93, 0.97, 1.06];
    case "cliffs": return [0.98, 0.97, 1.0];
    case "marsh": return [0.9, 0.98, 0.9];
    case "reeds": return [0.94, 1.0, 0.95];
    case "witch": return [0.95, 0.9, 1.06];
    case "ruins": return [1.0, 0.98, 0.94];
    case "lake": return [0.94, 0.99, 1.05];
    case "canal": return [0.95, 0.97, 1.0];
    case "fields": return [1.04, 1.0, 0.92];
    default: return [1, 1, 1];
  }
}

export interface LightingOptions {
  readonly minuteOfDay: number;
  readonly weather: Weather;
  readonly biome?: Biome;
  /** Un intérieur ne suit pas le soleil : il vit de ses propres foyers. */
  readonly interior: boolean;
  /** Assombrissement supplémentaire, pour les bois très denses. */
  readonly gloom?: number;
}

export class Lighting {
  /** Foyers fixes de la carte, relevés une fois par zone. */
  private staticLights: readonly Light[] = [];
  private mapToken: TileMap | null = null;

  /** Relit la carte et mémorise les tuiles qui éclairent. */
  bind(map: TileMap): void {
    if (this.mapToken === map) return;
    this.mapToken = map;
    const lights: Light[] = [];
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        for (const layer of ["terrain", "decor_below", "decor_above"] as const) {
          const light = map.tileSet.lightOf(map.tileAt(layer, x, y));
          if (!light) continue;
          lights.push({
            x: x * TILE_SIZE + TILE_SIZE / 2,
            y: y * TILE_SIZE + TILE_SIZE / 2,
            radius: light.radius,
            color: light.color,
          });
        }
      }
    }
    this.staticLights = lights;
  }

  /** Intensité de l'obscurité courante, de 0 (plein jour) à 1 (nuit noire). */
  darkness(options: LightingOptions): number {
    const [r, g, b] = this.ambientColor(options);
    return 1 - (r + g + b) / (3 * 255);
  }

  private ambientColor(options: LightingOptions): readonly [number, number, number] {
    // Un intérieur reste plus sombre que le plein jour, mais pas au point
    // qu'on n'y distingue plus le mobilier hors des halos.
    const base = options.interior ? [178, 158, 148] as const : ambientAt(options.minuteOfDay);
    const tint = biomeTint(options.biome);
    const rain = options.weather === "rain" ? 0.76 : 1;
    const gloom = 1 - Math.min(0.6, options.gloom ?? 0);
    return [
      Math.min(255, base[0] * tint[0] * rain * gloom),
      Math.min(255, base[1] * tint[1] * rain * gloom),
      Math.min(255, base[2] * tint[2] * rain * gloom),
    ];
  }

  /**
   * Compose la lumière sur la scène déjà dessinée.
   *
   * Le tampon est rempli de la couleur ambiante, les sources y ajoutent leur
   * halo, puis le tout multiplie l'image : ce qui n'est éclairé par rien
   * s'assombrit, ce qui l'est retrouve sa couleur — voire déborde un peu.
   */
  draw(renderer: Renderer, camera: Camera, lights: readonly Light[], options: LightingOptions): void {
    const [r, g, b] = this.ambientColor(options);
    const bright = (r + g + b) / 3 > 246;
    const buffer = renderer.lightCtx;

    buffer.globalCompositeOperation = "source-over";
    buffer.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    buffer.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    if (!bright) {
      buffer.globalCompositeOperation = "lighter";
      for (const light of [...this.staticLights, ...lights]) {
        this.paintLight(buffer, camera, light);
      }
    }
    buffer.globalCompositeOperation = "source-over";

    const scene = renderer.ctx;
    scene.save();
    scene.globalCompositeOperation = "multiply";
    scene.drawImage(renderer.lightCanvas, 0, 0);
    // Un souffle additif par-dessus : les flammes débordent légèrement de leur
    // source, ce qui suffit à faire croire à une vraie lueur.
    if (!bright) {
      scene.globalCompositeOperation = "lighter";
      scene.globalAlpha = 0.16;
      scene.drawImage(renderer.lightCanvas, 0, 0);
    }
    scene.restore();
  }

  private paintLight(ctx: CanvasRenderingContext2D, camera: Camera, light: Light): void {
    const strength = light.strength ?? 1;
    if (strength <= 0) return;
    const x = light.x + camera.offsetX;
    const y = light.y + camera.offsetY;
    const radius = light.radius;
    if (x + radius < 0 || x - radius > VIEW_WIDTH || y + radius < 0 || y - radius > VIEW_HEIGHT) return;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const [lr, lg, lb] = hexToRgb(light.color);
    gradient.addColorStop(0, `rgba(${lr},${lg},${lb},${0.95 * strength})`);
    gradient.addColorStop(0.45, `rgba(${lr},${lg},${lb},${0.4 * strength})`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

const RGB_CACHE = new Map<string, readonly [number, number, number]>();

function hexToRgb(color: string): readonly [number, number, number] {
  const cached = RGB_CACHE.get(color);
  if (cached) return cached;
  const value = color.replace("#", "");
  const parsed: readonly [number, number, number] = [
    parseInt(value.slice(0, 2), 16) || 255,
    parseInt(value.slice(2, 4), 16) || 255,
    parseInt(value.slice(4, 6), 16) || 255,
  ];
  RGB_CACHE.set(color, parsed);
  return parsed;
}
