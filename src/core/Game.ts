import { PALETTE } from "../data/palette";
import { Input } from "./Input";
import { Renderer } from "./Renderer";
import mapData from "../data/maps/hamlet_well.json";
import { TileMap, type TiledMapData } from "../world/TileMap";
import { TileSet } from "../world/TileSet";
import { Player } from "../entities/Player";
import { Camera } from "./Camera";
import { Transition } from "../ui/Transition";
import { ZoneRegistry } from "../world/Zone";

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
  private readonly map = new TileMap(mapData as TiledMapData, new TileSet());
  private readonly player: Player;
  private readonly camera = new Camera();
  private readonly transition = new Transition();
  private readonly zones = new ZoneRegistry();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.player = new Player(this.input, this.map);
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
    if (!this.transition.active) {
      this.player.update();
      const edge = this.camera.edgeFor(this.player.position);
      if (edge) {
        const destination = this.camera.adjacent(edge);
        if (this.zones.canEnter(destination)) {
          this.transition.start(() => {
            this.camera.zone = destination;
            this.player.position = this.camera.enterPosition(edge, this.player.position);
          });
        } else {
          this.player.position = this.camera.enterPosition(edge, this.player.position);
        }
      }
    }
    this.transition.update();
    this.input.endFrame();
  }

  private render(): void {
    const { ctx } = this.renderer;
    this.renderer.clear(PALETTE.grass);
    this.map.drawLayer(ctx, "ground");
    this.map.drawLayer(ctx, "terrain");
    this.map.drawLayer(ctx, "decor_below");
    this.player.draw(ctx);
    this.map.drawLayer(ctx, "decor_above");
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(4, 4, 74, 13);
    const zone = this.zones.at(this.camera.zone);
    this.renderer.pixelText(zone?.name ?? "VALLÉE INCONNUE", 8, 6, PALETTE.cream);
    this.renderer.pixelText(`F${String(this.frame).padStart(5, "0")}`, 250, 6, PALETTE.cream, "right");
    this.transition.draw(ctx);
  }
}
