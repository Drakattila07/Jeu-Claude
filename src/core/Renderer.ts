import { PALETTE } from "../data/palette";
import { drawText, measureText, type TextAlign } from "../ui/Font";

/**
 * Fenêtre de rendu 16:9. L'ancien format 256×224 tenait d'un écran cathodique
 * et enfermait chaque zone dans un unique tableau fixe ; on passe à un cadre
 * large que la caméra promène dans une carte bien plus grande que lui.
 * 384×216 se multiplie exactement par 5 pour atteindre 1920×1080.
 */
export const VIEW_WIDTH = 384;
export const VIEW_HEIGHT = 216;
export const TILE_SIZE = 16;

/** Dimensions d'une zone, en tuiles puis en pixels monde. */
export const ZONE_TILES_X = 32;
export const ZONE_TILES_Y = 28;
export const ZONE_WIDTH = ZONE_TILES_X * TILE_SIZE;
export const ZONE_HEIGHT = ZONE_TILES_Y * TILE_SIZE;

/**
 * Les zones font exactement le double de l'ancien écran dans les deux axes :
 * toutes les coordonnées de contenu déjà écrites (PNJ, coffres, ennemis)
 * se transposent en les multipliant par ce facteur.
 */
export const LEGACY_SCALE = 2;

/** Convertit une coordonnée héritée du format 256×224 vers la nouvelle zone. */
export function scaleLegacy(value: number): number { return value * LEGACY_SCALE; }

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  /** Tampon de lumière, composé en `multiply` par-dessus la scène. */
  readonly lightCanvas: HTMLCanvasElement;
  readonly lightCtx: CanvasRenderingContext2D;
  /** Tampon de scène, utilisé pour les effets qui relisent l'image. */
  private readonly sceneCanvas: HTMLCanvasElement;
  private scale = 3;

  constructor(readonly canvas: HTMLCanvasElement) {
    canvas.width = VIEW_WIDTH;
    canvas.height = VIEW_HEIGHT;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D indisponible.");
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;

    this.lightCanvas = createBuffer(VIEW_WIDTH, VIEW_HEIGHT);
    const lightContext = this.lightCanvas.getContext("2d");
    if (!lightContext) throw new Error("Tampon de lumière indisponible.");
    this.lightCtx = lightContext;
    this.lightCtx.imageSmoothingEnabled = false;

    this.sceneCanvas = createBuffer(VIEW_WIDTH, VIEW_HEIGHT);

    this.resize = this.resize.bind(this);
    if (typeof window !== "undefined") window.addEventListener("resize", this.resize);
    this.resize();
  }

  /**
   * Choisit le plus grand agrandissement entier qui tient dans la fenêtre.
   * Un facteur entier garde chaque pixel carré ; un facteur fractionnaire
   * ferait baver les contours que toute l'image cherche à garder nets.
   */
  resize(): void {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const compact = window.innerHeight < 620;
    const verticalRoom = window.innerHeight - (compact ? 16 : 132);
    const horizontalRoom = window.innerWidth - 24;
    this.scale = Math.max(1, Math.min(6,
      Math.floor(horizontalRoom / VIEW_WIDTH),
      Math.floor(verticalRoom / VIEW_HEIGHT)));
    document.documentElement.style.setProperty("--scale", String(this.scale));
  }

  clear(color: string = PALETTE.ink): void {
    // Chaque image repart d'une transformation neuve. Un dessin qui oublie un
    // `restore()` ne lève aucune erreur : il décale silencieusement tout ce
    // qui suit, et l'interface finit hors de l'écran. Cette remise à zéro
    // rend la faute visible dans la frame fautive au lieu de l'accumuler
    // jusqu'à ce que le jeu paraisse figé.
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  /** Copie la scène courante dans le tampon de relecture. */
  captureScene(): CanvasRenderingContext2D {
    const context = this.sceneCanvas.getContext("2d")!;
    context.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    context.drawImage(this.canvas, 0, 0);
    return context;
  }

  get scene(): HTMLCanvasElement { return this.sceneCanvas; }

  /** Texte au format bitmap maison — voir `ui/Font`. */
  pixelText(text: string, x: number, y: number, color: string = PALETTE.cream,
    align: TextAlign = "left"): void {
    drawText(this.ctx, text, x, y, { color, align });
  }

  /** Texte de titre : contour sombre, lisible sur n'importe quel fond. */
  titleText(text: string, x: number, y: number, color: string = PALETTE.cream,
    align: TextAlign = "center"): void {
    drawText(this.ctx, text, x, y, { color, align, outline: "rgba(10,8,16,0.9)", shadow: null });
  }

  measure(text: string): number { return measureText(text); }
}

function createBuffer(width: number, height: number): HTMLCanvasElement {
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  // Environnement de test sans DOM : un OffscreenCanvas fait l'affaire.
  return new OffscreenCanvas(width, height) as unknown as HTMLCanvasElement;
}
