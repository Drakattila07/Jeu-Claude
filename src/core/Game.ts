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
import { Combat, overlaps } from "../systems/Combat";
import { ENEMY_SPAWNS } from "../data/enemies";
import { Enemy } from "../entities/Enemy";
import { TextBox } from "../ui/TextBox";
import { EventBus } from "./EventBus";
import { Flags } from "../systems/Flags";
import { QuestSystem } from "../systems/Quest";
import { Clock } from "./Clock";
import { Affinity } from "../systems/Affinity";
import { NPCS } from "../data/npcs/core";
import { Npc } from "../entities/Npc";
import { EnvironmentOverlay } from "../ui/EnvironmentOverlay";
import { ZoneVariants } from "../world/ZoneVariants";
import { Inventory } from "../systems/Inventory";
import { Alchemy } from "../systems/Alchemy";

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
  private readonly combat = new Combat();
  private enemies: Enemy[] = [];
  private readonly textBox = new TextBox();
  private readonly events = new EventBus();
  private readonly flags = new Flags();
  private readonly quests = new QuestSystem(this.flags, this.events);
  private readonly clock = new Clock();
  private readonly affinity = new Affinity();
  private npcs: Npc[] = [];
  private readonly environment = new EnvironmentOverlay();
  private readonly variants = new ZoneVariants();
  private readonly inventory = new Inventory();
  private readonly alchemy = new Alchemy();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.player = new Player(this.input, this.map);
    this.loadZoneObjects();
    this.quests.refresh();
    this.inventory.add("bitter_root", 2);
    this.inventory.add("well_water");
    this.inventory.add("apple");
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
    this.combat.update();
    this.clock.update();
    if (this.textBox.active) {
      this.textBox.update(this.input);
      this.input.endFrame();
      return;
    }
    if (!this.transition.active && !this.combat.frozen) {
      this.player.update();
      for (const npc of this.npcs) npc.update();
      for (const enemy of this.enemies) {
        enemy.update();
        if (enemy.active && overlaps(enemy.bounds, {
          x: this.player.position.x + this.player.hitbox.x,
          y: this.player.position.y + this.player.hitbox.y,
          width: this.player.hitbox.width,
          height: this.player.hitbox.height,
        })) {
          const dx = this.player.position.x - enemy.position.x;
          const dy = this.player.position.y - enemy.position.y;
          const length = Math.max(1, Math.hypot(dx, dy));
          if (this.player.takeDamage(enemy.definition.damage, { x: dx / length, y: dy / length })) {
            this.combat.confirmHit(`player:${this.frame}`, enemy.spawn.type === "gargoyle");
          }
        }
      }
      if (this.input.wasPressed("A")) {
        const nearest = this.interactables
          .filter((object) => object.distanceTo(this.player.position) <= 25)
          .sort((a, b) => a.distanceTo(this.player.position) - b.distanceTo(this.player.position))[0];
        const nearestNpc = this.npcs
          .filter((npc) => npc.distanceTo(this.player.position) <= 25)
          .sort((a, b) => a.distanceTo(this.player.position) - b.distanceTo(this.player.position))[0];
        if (nearestNpc && (!nearest || nearestNpc.distanceTo(this.player.position) < nearest.distanceTo(this.player.position))) {
          this.textBox.open(nearestNpc.talk(this.events), nearestNpc.data.name);
          this.affinity.add(nearestNpc.data.id, 1);
          this.quests.notify("talkTo", nearestNpc.data.id, this.frame);
          this.events.publish({ type: "talk", id: nearestNpc.data.id, frame: this.frame });
        } else if (nearest) {
          const result = nearest.data.kind === "cauldron"
            ? this.alchemy.brewFirst(this.inventory)
            : nearest.interact();
          if ("changed" in result && result.changed && nearest.data.kind === "chest") this.player.rupees += 20;
          this.notice = result.message;
          this.noticeFrames = 150;
          this.textBox.open(result.message);
          if ("result" in result && result.result === "eternal_lantern") this.flags.set("lantern");
          this.events.publish({ type: "interact", id: nearest.data.id, frame: this.frame });
        } else if (this.player.startAttack()) {
          this.combat.beginSwing();
        }
      }
      if (this.player.swordActive) {
        const sword = this.player.attackHitbox();
        for (const enemy of this.enemies) {
          if (enemy.active && overlaps(sword, enemy.bounds) && this.combat.confirmHit(enemy.spawn.id,
            enemy.spawn.type === "gargoyle")) {
            const defeated = enemy.hit(1, this.player.position);
            if (defeated) {
              this.player.rupees += 3;
              this.notice = `${enemy.definition.name} vaincu · +3 rubis`;
              this.noticeFrames = 80;
              this.quests.notify("defeat", enemy.spawn.type, this.frame);
            }
          }
        }
        for (const object of this.interactables) {
          if (object.data.kind === "bush" && overlaps(sword, object.bounds())
            && this.combat.confirmHit(object.data.id)) {
            object.interact();
            this.notice = "FSSSH ! Des feuilles tourbillonnent.";
            this.noticeFrames = 90;
          }
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
    this.quests.syncFlags(this.frame);
    if (this.noticeFrames > 0) this.noticeFrames -= 1;
    this.input.endFrame();
  }

  private render(): void {
    const { ctx } = this.renderer;
    this.renderer.clear(PALETTE.grass);
    const shake = this.combat.shakeOffset(this.frame);
    ctx.save();
    ctx.translate(shake.x, shake.y);
    this.map.drawLayer(ctx, "ground");
    this.map.drawLayer(ctx, "terrain");
    this.map.drawLayer(ctx, "decor_below");
    for (const object of this.interactables) object.draw(ctx);
    for (const npc of this.npcs) npc.draw(ctx);
    for (const enemy of this.enemies) enemy.draw(ctx);
    this.player.draw(ctx);
    this.map.drawLayer(ctx, "decor_above");
    ctx.restore();
    const zoneForLight = this.zones.at(this.camera.zone);
    this.environment.draw(ctx, this.frame, this.player.position, {
      night: this.clock.isNight,
      dense: zoneForLight?.id === "lisiere_carrefour" && !this.flags.has("lantern"),
      weather: this.clock.weather,
    });
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(4, 4, 74, 13);
    const zone = this.zones.at(this.camera.zone);
    const variant = zone ? this.variants.resolve(zone.id, {
      flags: new Set(this.flags.snapshot()), isNight: this.clock.isNight,
    }) : "default";
    this.renderer.pixelText(`${zone?.name ?? "VALLÉE INCONNUE"} ${variant === "default" ? "" : variant.toUpperCase()}`,
      8, 6, PALETTE.cream);
    this.renderer.pixelText(
      `${String(this.clock.hour).padStart(2, "0")}:${String(this.clock.minute).padStart(2, "0")} ${this.clock.weather === "rain" ? "PLUIE" : ""}`,
      250, 6, PALETTE.cream, "right");
    if (this.noticeFrames > 0) {
      ctx.fillStyle = PALETTE.night;
      ctx.fillRect(8, 181, 240, 35);
      ctx.strokeStyle = PALETTE.cream;
      ctx.strokeRect(9.5, 182.5, 237, 32);
      this.renderer.pixelText(this.notice.slice(0, 38), 16, 190, PALETTE.cream);
      this.renderer.pixelText(this.notice.slice(38, 76), 16, 202, PALETTE.cream);
    }
    this.textBox.draw(this.renderer);
    this.transition.draw(ctx);
  }

  private loadZoneObjects(): void {
    const zone = this.zones.at(this.camera.zone);
    this.interactables = zone
      ? INTERACTABLES.filter((data) => data.zone === zone.id).map((data) => new Interactable(data, this.objectState))
      : [];
    this.enemies = zone
      ? ENEMY_SPAWNS.filter((data) => data.zone === zone.id).map((data) => new Enemy(data, this.player))
      : [];
    this.npcs = zone
      ? NPCS.filter((npc) => npc.schedule.some((entry) =>
        entry.zone === zone.id && this.clock.hour >= entry.start && this.clock.hour < entry.end))
        .map((data) => new Npc(data, this.map, this.clock))
      : [];
  }
}
