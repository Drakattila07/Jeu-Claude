import { PALETTE } from "../data/palette";
import { Input } from "./Input";
import { Renderer, TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from "./Renderer";

export const FIXED_STEP_MS = 1000 / 60;
export const MAX_FRAME_DELTA_MS = 250;

export function consumeAccumulator(accumulatorMs: number, elapsedMs: number): {
  accumulatorMs: number;
  steps: number;
} {
  let remaining = accumulatorMs + Math.min(elapsedMs, MAX_FRAME_DELTA_MS);
  let steps = 0;
  while (remaining + Number.EPSILON >= FIXED_STEP_MS) {
    remaining -= FIXED_STEP_MS;
    steps += 1;
  }
  return { accumulatorMs: remaining, steps };
}

export class Game {
  private readonly renderer: Renderer;
  private readonly input: Input;
  private accumulatorMs = 0;
  private previousTimeMs = 0;
  private running = false;
  private frame = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.loop);
  }

  private readonly loop = (timeMs: number): void => {
    if (!this.running) return;
    const elapsedMs = this.previousTimeMs === 0 ? 0 : timeMs - this.previousTimeMs;
    this.previousTimeMs = timeMs;
    const consumed = consumeAccumulator(this.accumulatorMs, elapsedMs);
    this.accumulatorMs = consumed.accumulatorMs;
    for (let index = 0; index < consumed.steps; index += 1) this.update();
    this.render();
    requestAnimationFrame(this.loop);
  };

  private update(): void {
    this.frame += 1;
    this.input.endFrame();
  }

  private render(): void {
    const { ctx } = this.renderer;
    this.renderer.clear(PALETTE.grass);
    for (let y = 0; y < VIEW_HEIGHT / TILE_SIZE; y += 1) {
      for (let x = 0; x < VIEW_WIDTH / TILE_SIZE; x += 1) {
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.grass : PALETTE.grassDark;
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(72, 92, 112, 40);
    ctx.strokeStyle = PALETTE.sandLight;
    ctx.strokeRect(73.5, 93.5, 109, 37);
    this.renderer.pixelText("LES RACINES CREUSES", 128, 101, PALETTE.cream, "center");
    this.renderer.pixelText(`FRAME ${String(this.frame).padStart(6, "0")}`, 128, 117, PALETTE.grassLight, "center");
  }
}
