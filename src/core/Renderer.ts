import { PALETTE } from "../data/palette";

export const VIEW_WIDTH = 256;
export const VIEW_HEIGHT = 224;
export const TILE_SIZE = 16;

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    canvas.width = VIEW_WIDTH;
    canvas.height = VIEW_HEIGHT;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D indisponible.");
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  resize(): void {
    const verticalRoom = window.innerHeight < 560 ? window.innerHeight - 20 : window.innerHeight - 150;
    const horizontalRoom = window.innerWidth - 28;
    const scale = Math.max(1, Math.min(4,
      Math.floor(horizontalRoom / VIEW_WIDTH),
      Math.floor(verticalRoom / VIEW_HEIGHT)));
    document.documentElement.style.setProperty("--scale", String(scale));
  }

  clear(color: string = PALETTE.ink): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  pixelText(text: string, x: number, y: number, color: string = PALETTE.cream, align: CanvasTextAlign = "left"): void {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.font = '10px "Courier New", monospace';
    this.ctx.textAlign = align;
    this.ctx.textBaseline = "top";
    this.ctx.fillText(text, Math.round(x), Math.round(y));
    this.ctx.restore();
  }
}
