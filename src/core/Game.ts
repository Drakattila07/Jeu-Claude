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
import { INTERACTABLES } from "../data/interactables";
import { Interactable, ZoneObjectState } from "../entities/Interactable";

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
  private readonly objectState = new ZoneObjectState();
  private interactables: Interactable[] = [];
  private notice = "";
  private noticeFrames = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.player = new Player(this.input, this.map);
    this.loadZoneObjects();
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
      if (this.input.wasPressed("A")) {
        const nearest = this.interactables
          .filter((object) => object.distanceTo(this.player.position) <= 25)
          .sort((a, b) => a.distanceTo(this.player.position) - b.distanceTo(this.player.position))[0];
        if (nearest) {
          const result = nearest.interact();
          if (result.changed && nearest.data.kind === "chest") this.player.rupees += 20;
          this.notice = result.message;
          this.noticeFrames = 150;
        }
      }
      const edge = this.camera.edgeFor(this.player.position);
      if (edge) {
        const destination = this.camera.adjacent(edge);
        if (this.zones.canEnter(destination)) {
          this.transition.start(() => {
            this.camera.zone = destination;
            this.player.position = this.camera.enterPosition(edge, this.player.position);
            this.loadZoneObjects();
          });
        } else {
          this.player.position = this.camera.enterPosition(edge, this.player.position);
        }
      }
    }
    this.transition.update();
    if (this.noticeFrames > 0) this.noticeFrames -= 1;
    this.input.endFrame();
  }

  private render(): void {
    const { ctx } = this.renderer;
    this.renderer.clear(PALETTE.grass);
    this.map.drawLayer(ctx, "ground");
    this.map.drawLayer(ctx, "terrain");
    this.map.drawLayer(ctx, "decor_below");
    for (const object of this.interactables) object.draw(ctx);
    this.player.draw(ctx);
    this.map.drawLayer(ctx, "decor_above");
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(4, 4, 74, 13);
    const zone = this.zones.at(this.camera.zone);
    this.renderer.pixelText(zone?.name ?? "VALLÉE INCONNUE", 8, 6, PALETTE.cream);
    this.renderer.pixelText(`F${String(this.frame).padStart(5, "0")}`, 250, 6, PALETTE.cream, "right");
    if (this.noticeFrames > 0) {
      ctx.fillStyle = PALETTE.night;
      ctx.fillRect(8, 181, 240, 35);
      ctx.strokeStyle = PALETTE.cream;
      ctx.strokeRect(9.5, 182.5, 237, 32);
      this.renderer.pixelText(this.notice.slice(0, 38), 16, 190, PALETTE.cream);
      this.renderer.pixelText(this.notice.slice(38, 76), 16, 202, PALETTE.cream);
    }
    this.transition.draw(ctx);
  }

  private loadZoneObjects(): void {
    const zone = this.zones.at(this.camera.zone);
    this.interactables = zone
      ? INTERACTABLES.filter((data) => data.zone === zone.id).map((data) => new Interactable(data, this.objectState))
      : [];
  }
}
