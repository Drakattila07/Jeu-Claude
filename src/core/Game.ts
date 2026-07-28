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
import { Dungeon } from "../systems/Dungeon";
import { HUD } from "../ui/HUD";
import { Menu } from "../ui/Menu";
import { MapScreen } from "../ui/MapScreen";
import { HintSystem } from "../systems/HintSystem";
import { Campaign } from "../systems/Campaign";
import { SideActivities } from "../systems/SideActivities";
import { Fishing } from "../systems/Fishing";
import { MotherTreeBoss } from "../entities/Boss";
import { epilogueLine } from "../data/epilogues";
import { Audio } from "../systems/Audio";
import { Particles } from "../ui/Particles";
import { SaveLoad, type SaveData } from "../systems/SaveLoad";
import { createProceduralMap } from "../world/ZoneMapFactory";
import {
  COTTAGE_ENTRY,
  createCottageMap,
  drawCottageWarmth,
  nearCottageExit,
} from "../world/CottageInterior";

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
  private readonly tileSet = new TileSet();
  private map = new TileMap(mapData as TiledMapData, this.tileSet);
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
  private readonly dungeon = new Dungeon();
  private readonly hud = new HUD();
  private readonly menu = new Menu();
  private readonly mapScreen = new MapScreen();
  private readonly hints = new HintSystem(this.flags, this.quests);
  private readonly campaign = new Campaign(this.flags, this.quests, this.events);
  private readonly sideActivities = new SideActivities(this.flags, this.quests);
  private readonly fishing = new Fishing();
  private boss: MotherTreeBoss | null = null;
  private endingPending = false;
  private readonly audio = new Audio();
  private readonly particles = new Particles();
  private readonly saveLoad = new SaveLoad(window.localStorage);
  private insideCottage = false;
  private exteriorReturnPosition = { x: 128, y: 72 };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.player = new Player(this.input, this.map);
    const saved = this.saveLoad.load(0);
    if (saved) this.restoreSave(saved);
    else {
      this.quests.refresh();
      this.inventory.add("bitter_root", 2);
      this.inventory.add("well_water");
      this.inventory.add("apple");
      this.mapScreen.reveal(this.camera.zone);
    }
    this.loadZoneObjects();
    this.textBox.setBeep(() => this.audio.playSfx("text"));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.loop);
  }

  stop(): void { this.running = false; }

  debugAdvance(frames: number): void {
    for (let index = 0; index < Math.max(0, Math.floor(frames)); index += 1) this.update();
    this.render();
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
    this.particles.update();
    if (this.input.wasPressed("A") || this.input.wasPressed("B") || this.input.wasPressed("Start")) this.audio.unlock();
    const audioZone = this.zones.at(this.camera.zone)?.id ?? "village";
    const mood = audioZone === "boss_arena" ? "boss"
      : audioZone === "canal_entry" ? "dungeon"
        : ["lisiere_carrefour", "bosquet_souches", "clairiere_cimes"].includes(audioZone) ? "forest"
          : "village";
    this.audio.update(this.frame, mood);
    if (this.textBox.active) {
      this.textBox.update(this.input);
      this.input.endFrame();
      return;
    }
    if (this.menu.active) {
      this.menu.update(this.input);
      this.input.endFrame();
      return;
    }
    if (this.input.wasPressed("Start")) {
      this.menu.open();
      this.input.endFrame();
      return;
    }
    if (this.fishing.active) {
      const fishingResult = this.fishing.update(this.input);
      if (fishingResult === "caught") {
        this.player.rupees += 8;
        this.quests.notify("collect", "fish", this.frame);
      }
      this.input.endFrame();
      return;
    }
    if (this.endingPending) {
      if (this.input.wasPressed("A") || this.input.wasPressed("B")) {
        const release = this.input.wasPressed("A");
        this.flags.set(release ? "ending_release" : "ending_root");
        this.quests.notify("choice", "ending", this.frame);
        this.textBox.open(release
          ? "Vous libérez l'Arbre-Mère. Elle se lève et disparaît derrière les Cimes."
          : "Vous enracinez l'Arbre-Mère. L'eau jaillit tandis qu'elle s'endort.");
        this.endingPending = false;
      }
      this.input.endFrame();
      return;
    }
    if (this.input.wasPressed("B") && this.zones.at(this.camera.zone)?.id === "quai_lac") {
      if (this.flags.has("fishing_unlocked")) this.fishing.start(this.clock.day);
      else this.textBox.open("Il vous manque une canne. Nessa en a perdu une dans la Lisière.");
      this.input.endFrame();
      return;
    }
    if (!this.transition.active && !this.combat.frozen) {
      this.player.update();
      for (const npc of this.npcs) npc.update();
      this.boss?.update();
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
        if (this.insideCottage && nearCottageExit(this.player.position)) {
          this.leaveCottage();
          this.input.endFrame();
          return;
        }
        const nearest = this.interactables
          .filter((object) => object.distanceTo(this.player.position) <= 25)
          .sort((a, b) => a.distanceTo(this.player.position) - b.distanceTo(this.player.position))[0];
        const nearestNpc = this.npcs
          .filter((npc) => npc.distanceTo(this.player.position) <= 25)
          .sort((a, b) => a.distanceTo(this.player.position) - b.distanceTo(this.player.position))[0];
        if (nearestNpc && (!nearest || nearestNpc.distanceTo(this.player.position) < nearest.distanceTo(this.player.position))) {
          const postgameLine = this.flags.has("ending_release")
            ? epilogueLine("release", nearestNpc.data.id)
            : this.flags.has("ending_root")
              ? epilogueLine("root", nearestNpc.data.id)
              : null;
          const line = postgameLine ?? (nearestNpc.data.id === "sylve"
            ? this.hints.hint(this.camera.zone)
            : nearestNpc.talk(this.events));
          const campaignLine = nearestNpc.data.id === "bram"
            ? this.campaign.trigger("bram_sword", this.frame)
            : null;
          if (nearestNpc.data.id === "bram") this.audio.playSfx("anvil");
          this.textBox.open(campaignLine ?? line, nearestNpc.data.name);
          this.affinity.add(nearestNpc.data.id, 1);
          this.quests.notify("talkTo", nearestNpc.data.id, this.frame);
          if (nearestNpc.data.id === "nessa" && this.flags.has("rod_found")) {
            this.sideActivities.trigger("lost_rod", this.frame);
            this.quests.notify("talkTo", "nessa", this.frame);
          }
          this.events.publish({ type: "talk", id: nearestNpc.data.id, frame: this.frame });
        } else if (nearest?.data.kind === "door") {
          this.enterCottage();
          this.input.endFrame();
          return;
        } else if (nearest) {
          const result = nearest.data.kind === "cauldron"
            ? this.alchemy.brewFirst(this.inventory)
            : nearest.data.kind === "valve"
              ? { message: this.dungeon.turnValve(0), changed: true }
              : nearest.data.kind === "roots"
                ? { message: nearest.data.text, changed: false }
                : nearest.data.kind === "footprints" && !this.clock.isNight
                  ? { message: "De jour, les empreintes restent immobiles. Revenez la nuit.", changed: false }
              : nearest.interact();
          const campaignMessage = "changed" in result && result.changed
            ? this.campaign.trigger(nearest.data.id, this.frame)
            : null;
          const sideMessage = "changed" in result && result.changed
            ? this.sideActivities.trigger(nearest.data.id, this.frame)
            : null;
          if ("changed" in result && result.changed && nearest.data.kind === "chest") this.player.rupees += 20;
          this.notice = campaignMessage ?? sideMessage ?? result.message;
          this.noticeFrames = 150;
          this.textBox.open(campaignMessage ?? sideMessage ?? result.message);
          if (nearest.data.kind === "cauldron" || nearest.data.kind === "valve") {
            this.audio.playSfx("splash");
            this.particles.emit(nearest.position.x + 8, nearest.position.y + 8,
              nearest.data.kind === "cauldron" ? "smoke" : "bubble");
          }
          if (sideMessage) this.audio.playSfx("secret");
          if ("result" in result && result.result === "eternal_lantern") this.flags.set("lantern");
          this.events.publish({ type: "interact", id: nearest.data.id, frame: this.frame });
          if (nearest.data.kind === "well" && this.flags.has("source_open")) {
            this.saveLoad.save(0, this.createSave());
            this.notice = "La fraîcheur du puits vous soigne. Partie sauvegardée.";
            this.textBox.open(this.notice);
            this.player.hearts = this.player.maxHearts;
          }
        } else if (this.player.startAttack()) {
          this.combat.beginSwing();
          this.audio.playSfx("sword");
        }
      }
      if (this.player.swordActive) {
        const sword = this.player.attackHitbox();
        if (this.boss?.active && overlaps(sword, this.boss.bounds) && this.combat.confirmHit("mother_tree", true)) {
          const defeated = this.boss.hit();
          this.audio.playSfx("hit");
          if (defeated) {
            this.flags.set("boss_defeated");
            this.quests.notify("defeat", "mother_tree", this.frame);
            this.endingPending = true;
            this.textBox.open("L'Arbre-Mère s'agenouille. X : la libérer · C : l'enraciner.");
          }
        }
        for (const enemy of this.enemies) {
          if (enemy.active && overlaps(sword, enemy.bounds) && this.combat.confirmHit(enemy.spawn.id,
            enemy.spawn.type === "gargoyle")) {
            const defeated = enemy.hit(1, this.player.position);
            this.audio.playSfx("hit");
            if (defeated) {
              this.player.rupees += 3;
              this.notice = `${enemy.definition.name} vaincu · +3 rubis`;
              this.noticeFrames = 80;
              this.quests.notify("defeat", enemy.spawn.type, this.frame);
            }
          }
        }
        for (const object of this.interactables) {
          if ((object.data.kind === "bush" || object.data.kind === "roots") && overlaps(sword, object.bounds())
            && this.combat.confirmHit(object.data.id)) {
            const result = object.interact();
            const campaignMessage = result.changed ? this.campaign.trigger(object.data.id, this.frame) : null;
            this.notice = campaignMessage ?? "FSSSH ! Des feuilles tourbillonnent.";
            this.noticeFrames = 90;
            this.particles.emit(object.position.x + 8, object.position.y + 8, "leaf", 12);
            this.audio.playSfx("hit");
          }
        }
      }
      const edge = this.insideCottage ? null : this.camera.edgeFor(this.player.position);
      if (edge) {
        const destination = this.camera.adjacent(edge);
        if (this.zones.canEnter(destination)) {
          this.transition.start(() => {
            this.camera.zone = destination;
            this.player.position = this.camera.enterPosition(edge, this.player.position);
            this.loadZoneObjects();
            this.mapScreen.reveal(this.camera.zone);
          });
        } else {
          this.player.position = this.camera.blockedPosition(edge, this.player.position);
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
    this.map.drawLayer(ctx, "ground", this.frame);
    this.map.drawLayer(ctx, "terrain", this.frame);
    this.map.drawLayer(ctx, "decor_below", this.frame);
    if (this.insideCottage) drawCottageWarmth(ctx, this.frame);
    for (const object of this.interactables) object.draw(ctx);
    for (const npc of this.npcs) npc.draw(ctx);
    for (const enemy of this.enemies) enemy.draw(ctx);
    this.boss?.draw(ctx);
    this.player.draw(ctx);
    this.map.drawLayer(ctx, "decor_above", this.frame);
    this.particles.draw(ctx);
    if (this.zones.at(this.camera.zone)?.id === "canal_entry") this.dungeon.drawWater(ctx);
    ctx.restore();
    const zoneForLight = this.zones.at(this.camera.zone);
    if (!this.insideCottage) {
      this.environment.draw(ctx, this.frame, this.player.position, {
        night: this.clock.isNight,
        dense: zoneForLight?.id === "lisiere_carrefour" && !this.flags.has("lantern"),
        weather: this.clock.weather,
        biome: zoneForLight?.biome,
      });
    }
    const zone = this.zones.at(this.camera.zone);
    const variant = zone ? this.variants.resolve(zone.id, {
      flags: new Set(this.flags.snapshot()), isNight: this.clock.isNight,
    }) : "default";
    this.hud.draw(this.renderer, this.player, this.clock, this.insideCottage
      ? "MAISON DU DOYEN"
      : `${zone?.name ?? "INCONNU"}${variant === "default" ? "" : ` ${variant}`}`);
    if (this.insideCottage && nearCottageExit(this.player.position) && !this.textBox.active) {
      ctx.fillStyle = PALETTE.night;
      ctx.fillRect(96, 188, 64, 17);
      this.renderer.pixelText("X  SORTIR", 128, 191, PALETTE.cream, "center");
    }
    if (this.noticeFrames > 0) {
      ctx.fillStyle = PALETTE.night;
      ctx.fillRect(8, 181, 240, 35);
      ctx.strokeStyle = PALETTE.cream;
      ctx.strokeRect(9.5, 182.5, 237, 32);
      this.renderer.pixelText(this.notice.slice(0, 38), 16, 190, PALETTE.cream);
      this.renderer.pixelText(this.notice.slice(38, 76), 16, 202, PALETTE.cream);
    }
    this.textBox.draw(this.renderer);
    this.menu.draw(this.renderer, this.inventory, this.mapScreen, this.quests, this.camera.zone);
    this.fishing.draw(this.renderer);
    this.transition.draw(ctx);
  }

  private loadZoneObjects(): void {
    const zone = this.zones.at(this.camera.zone);
    if (zone) {
      const nextMap = zone.map === "hamlet_well"
        ? mapData as TiledMapData
        : createProceduralMap(zone);
      this.map = new TileMap(nextMap, this.tileSet);
      this.player.setMap(this.map);
    }
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
    this.boss = zone?.id === "boss_arena" && this.flags.has("mechanism_repaired")
      && !this.flags.has("boss_defeated") ? new MotherTreeBoss(this.player) : null;
  }

  private enterCottage(): void {
    if (this.transition.active || this.insideCottage) return;
    this.exteriorReturnPosition = { x: 128, y: 72 };
    this.transition.start(() => {
      this.insideCottage = true;
      this.map = new TileMap(createCottageMap(), this.tileSet);
      this.player.setMap(this.map);
      this.player.position = { ...COTTAGE_ENTRY };
      this.interactables = [];
      this.enemies = [];
      this.npcs = [];
      this.boss = null;
      this.notice = "Une chaleur de bois et de feu emplit la pièce.";
      this.noticeFrames = 120;
    });
  }

  private leaveCottage(): void {
    if (this.transition.active || !this.insideCottage) return;
    this.transition.start(() => {
      this.insideCottage = false;
      this.loadZoneObjects();
      this.player.position = { ...this.exteriorReturnPosition };
    });
  }

  private createSave(): SaveData {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      frame: this.frame,
      player: {
        x: this.player.position.x, y: this.player.position.y,
        hearts: this.player.hearts, rupees: this.player.rupees,
      },
      zone: { ...this.camera.zone },
      flags: this.flags.snapshot(),
      inventory: this.inventory.snapshot(),
      quests: this.quests.snapshot(),
      explored: this.mapScreen.snapshot(),
      objects: this.objectState.entries(),
      clock: this.clock.snapshot(),
    };
  }

  private restoreSave(data: SaveData): void {
    this.frame = data.frame;
    this.player.position = { x: data.player.x, y: data.player.y };
    this.player.hearts = data.player.hearts;
    this.player.rupees = data.player.rupees;
    this.camera.zone = { ...data.zone };
    this.flags.restore(data.flags);
    this.inventory.restore(data.inventory);
    this.quests.restore(data.quests);
    this.mapScreen.restore(data.explored);
    this.objectState.restore(data.objects);
    this.clock.restore(data.clock);
    this.quests.refresh();
  }
}
